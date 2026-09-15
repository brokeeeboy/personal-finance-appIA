"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parseFormString, transactionInputSchema } from "@/lib/validation";
import { applyBalanceChange, computeBalanceChange } from "@/lib/accountBalance";

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

    const change = computeBalanceChange(account.type, type, amount);
    await applyBalanceChange(tx, accountId, change);
  });

  revalidatePath("/transacciones");
  revalidatePath("/");
}

export async function updateTransaction(id: string, formData: FormData) {
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
    const existing = await tx.transaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) throw new Error("Transacción no encontrada");

    const newAccount = await tx.account.findFirst({
      where: { id: accountId, userId: session.user.id },
    });
    if (!newAccount) throw new Error("Cuenta no encontrada");
    if (categoryId) {
      const category = await tx.category.findFirst({
        where: { id: categoryId, userId: session.user.id },
      });
      if (!category) throw new Error("Categoría no encontrada");
    }

    // 1. Revertir el efecto de la transacción original en su cuenta original
    if (existing.accountId === accountId) {
      // Misma cuenta: revertimos el monto viejo y aplicamos el nuevo en un solo paso
      const oldAccount = newAccount;
      const revert = computeBalanceChange(
        oldAccount.type,
        existing.type as "INCOME" | "EXPENSE",
        existing.amount,
      ).negated();
      const apply = computeBalanceChange(oldAccount.type, type, amount);
      await applyBalanceChange(tx, accountId, revert.plus(apply));
    } else {
      const oldAccount = await tx.account.findFirst({
        where: { id: existing.accountId, userId: session.user.id },
      });
      if (!oldAccount) throw new Error("Cuenta original no encontrada");
      const revert = computeBalanceChange(
        oldAccount.type,
        existing.type as "INCOME" | "EXPENSE",
        existing.amount,
      ).negated();
      await applyBalanceChange(tx, existing.accountId, revert);

      const apply = computeBalanceChange(newAccount.type, type, amount);
      await applyBalanceChange(tx, accountId, apply);
    }

    // 2. Guardar los nuevos datos de la transacción
    await tx.transaction.update({
      where: { id },
      data: {
        description,
        amount: new Prisma.Decimal(amount),
        type,
        date,
        accountId,
        categoryId: categoryId || null,
      },
    });
  });

  revalidatePath("/transacciones");
  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!transaction) throw new Error("Transacción no encontrada");

    const account = await tx.account.findFirst({
      where: { id: transaction.accountId, userId: session.user.id },
    });
    if (!account) throw new Error("Cuenta no encontrada");

    await tx.transaction.delete({ where: { id } });

    const revert = computeBalanceChange(
      account.type,
      transaction.type as "INCOME" | "EXPENSE",
      transaction.amount,
    ).negated();
    await applyBalanceChange(tx, transaction.accountId, revert);
  });

  revalidatePath("/transacciones");
  revalidatePath("/");
}
