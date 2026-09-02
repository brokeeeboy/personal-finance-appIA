"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parse } from "csv-parse/sync";

type ImportedTransaction = {
  id?: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId?: string | null;
  isAutoCategorized?: boolean;
  isDuplicate?: boolean;
  categoryName?: string;
};

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
  if (file.size > 5_000_000 || !file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("El archivo CSV debe pesar menos de 5 MB");
  }
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id },
    select: { id: true },
  });
  if (!account) throw new Error("Cuenta no encontrada");

  // 1. Obtener categorías del usuario para mapear los IDs
  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
  });

  // 2. Leer el archivo
  const text = await file.text();
  const rows = parse(text, {
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];
  const startIndex = rows[0]?.[0]?.toLowerCase().includes("fecha") ? 1 : 0;
  const previewData: ImportedTransaction[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const [dateStr, description, amountStr] = rows[i];

    if (!dateStr || !description || !amountStr) continue;

    const rawAmount = Number(
      amountStr.trim().replace(/\./g, "").replace(",", "."),
    );
    if (
      !Number.isFinite(rawAmount) ||
      rawAmount === 0 ||
      Number.isNaN(new Date(dateStr.trim()).getTime())
    )
      continue;
    const amount = Math.abs(rawAmount);
    const type = rawAmount < 0 ? "EXPENSE" : "INCOME";

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
  transactions: ImportedTransaction[],
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");
  if (!Array.isArray(transactions) || transactions.length > 10_000) {
    throw new Error("Importación inválida");
  }
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id },
  });
  if (!account) throw new Error("Cuenta no encontrada");

  const validTransactions = transactions.filter((t) => !t.isDuplicate);
  if (validTransactions.length === 0) return { success: true, count: 0 };

  const categoryIds = validTransactions
    .map((transaction) => transaction.categoryId)
    .filter((id): id is string => Boolean(id));
  const ownedCategories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, userId: session.user.id },
    select: { id: true },
  });
  const ownedCategoryIds = new Set(
    ownedCategories.map((category) => category.id),
  );
  const sanitizedTransactions = validTransactions.map((transaction) => ({
    ...transaction,
    categoryId:
      transaction.categoryId && ownedCategoryIds.has(transaction.categoryId)
        ? transaction.categoryId
        : null,
  }));

  await prisma.$transaction(async (tx) => {
    // 1. Insertar todas las transacciones
    await tx.transaction.createMany({
      data: sanitizedTransactions.map((t) => ({
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
    let balanceChange = 0;
    sanitizedTransactions.forEach((t) => {
      const change = t.type === "INCOME" ? t.amount : -t.amount;
      balanceChange += account.type === "CREDIT" ? -change : change;
    });
    await tx.account.update({
      where: { id: accountId, userId: session.user.id },
      data: { balance: { increment: balanceChange } },
    });
  });

  revalidatePath("/transacciones");
  revalidatePath("/");
  revalidatePath("/cuentas");

  return { success: true, count: validTransactions.length };
}
