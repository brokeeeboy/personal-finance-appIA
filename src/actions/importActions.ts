"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Reglas simples quemadas en código para el MVP (luego se moverían a BD)
const CATEGORY_RULES: Record<string, string> = {
  uber: "Transporte",
  mcdonalds: "Alimentación",
  netflix: "Entretenimiento",
  steam: "Entretenimiento",
  copec: "Servicios", // o Combustible si existiera
  spotify: "Entretenimiento",
  lider: "Alimentación",
  jumbo: "Alimentación",
};

export async function previewCSV(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const file = formData.get("file") as File;
  const accountId = formData.get("accountId") as string;
  if (!file || !accountId) throw new Error("Archivo y cuenta son obligatorios");

  // 1. Obtener categorías del usuario para mapear los IDs
  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
  });

  // 2. Leer el archivo
  const text = await file.text();
  const lines = text.split("\n").filter((line) => line.trim() !== "");

  const previewData = [];

  // Asumimos que la primera línea podría ser el encabezado (fecha,descripcion,monto)
  const startIndex = lines[0].toLowerCase().includes("fecha") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const [dateStr, description, amountStr] = lines[i].split(",");

    if (!dateStr || !description || !amountStr) continue;

    const amount = Math.abs(parseFloat(amountStr.trim()));
    const type = parseFloat(amountStr.trim()) < 0 ? "EXPENSE" : "EXPENSE"; // Asumimos gastos por defecto para MVP

    // 3. Intentar categorizar automáticamente
    let categoryId = null;
    let categoryName = "Sin categoría";
    let isAutoCategorized = false;

    const descLower = description.toLowerCase();

    for (const [keyword, catName] of Object.entries(CATEGORY_RULES)) {
      if (descLower.includes(keyword)) {
        const matchedCat = categories.find(
          (c: { name: string; id: string }) => c.name === catName,
        );
        if (matchedCat) {
          categoryId = matchedCat.id;
          categoryName = matchedCat.name;
          isAutoCategorized = true;
          break;
        }
      }
    }

    // 4. Verificar posibles duplicados en la BD
    const duplicate = await prisma.transaction.findFirst({
      where: {
        userId: session.user.id,
        accountId,
        description: description.trim(),
        amount,
        date: new Date(dateStr.trim()),
      },
    });

    previewData.push({
      id: `temp-${i}`,
      date: dateStr.trim(),
      description: description.trim(),
      amount,
      type,
      categoryId,
      categoryName,
      isAutoCategorized,
      isDuplicate: !!duplicate,
    });
  }

  return previewData;
}

export async function saveImportedTransactions(
  accountId: string,
  transactions: any[],
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const validTransactions = transactions.filter((t) => !t.isDuplicate);
  if (validTransactions.length === 0) return { success: true, count: 0 };

  await prisma.$transaction(async (tx) => {
    // 1. Insertar todas las transacciones
    await tx.transaction.createMany({
      data: validTransactions.map((t) => ({
        userId: session.user.id,
        accountId,
        description: t.description,
        amount: t.amount,
        type: t.type,
        date: new Date(t.date),
        categoryId: t.categoryId,
        isAutoCategorized: t.isAutoCategorized,
      })),
    });

    // 2. Actualizar saldo de la cuenta
    const account = await tx.account.findUnique({ where: { id: accountId } });
    if (account) {
      let balanceChange = 0;
      validTransactions.forEach((t) => {
        if (account.type === "CREDIT") {
          balanceChange += t.type === "EXPENSE" ? t.amount : -t.amount;
        } else {
          balanceChange += t.type === "INCOME" ? t.amount : -t.amount;
        }
      });

      await tx.account.update({
        where: { id: accountId },
        data: { balance: account.balance + balanceChange },
      });
    }
  });

  revalidatePath("/transacciones");
  revalidatePath("/");
  revalidatePath("/cuentas");

  return { success: true, count: validTransactions.length };
}
