"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parseFormString, transactionInputSchema } from "@/lib/validation";

export async function createTransaction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const parsed = transactionInputSchema.safeParse({
    description: parseFormString(formData.get("description")),
    amount: formData.get("amount"),
    type: parseFormString(formData.get("type")),
    date: formData.get("date"),
    accountId: parseFormString(formData.get("accountId")),
    categoryId: parseFormString(formData.get("categoryId")) || undefined,
  });
  if (!parsed.success) throw new Error("Datos de transacción inválidos");
  const { description, amount, type, date, accountId, categoryId } =
    parsed.data;

  await prisma.$transaction(async (tx) => {
    // 1. Crear transacción
    await tx.transaction.create({
      data: {
        userId: session.user.id,
        description,
        amount: new Prisma.Decimal(amount),
        type,
        date,
        accountId,
        categoryId: categoryId || null,
      },
    });

    // 2. Actualizar saldo de la cuenta
    const account = await tx.account.findFirst({
      where: { id: accountId, userId: session.user.id },
    });
    if (!account) throw new Error("Cuenta no encontrada");
    if (categoryId) {
      const category = await tx.category.findFirst({
        where: { id: categoryId, userId: session.user.id },
      });
      if (!category) throw new Error("Categoría no encontrada");
    }
    const balanceChange = type === "INCOME" ? amount : -amount;
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceChange } },
    });
  });

  revalidatePath("/transacciones");
  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  await prisma.$transaction(async (tx) => {
    // 1. Obtener transacción para saber el monto a revertir
    const transaction = await tx.transaction.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!transaction) throw new Error("Transacción no encontrada");

    // 2. Eliminar transacción
    await tx.transaction.delete({ where: { id } });

    // 3. Restaurar saldo de la cuenta
    const balanceChange =
      transaction.type === "INCOME"
        ? transaction.amount.negated()
        : transaction.amount;
    await tx.account.update({
      where: { id: transaction.accountId, userId: session.user.id },
      data: { balance: { increment: balanceChange } },
    });
  });

  revalidatePath("/transacciones");
  revalidatePath("/");
}
