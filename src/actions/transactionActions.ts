"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createTransaction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string;
  const dateStr = formData.get("date") as string;
  const accountId = formData.get("accountId") as string;
  const categoryId = formData.get("categoryId") as string;

  await prisma.$transaction(async (tx) => {
    // 1. Crear transacción
    await tx.transaction.create({
      data: {
        userId: session.user.id,
        description,
        amount,
        type,
        date: new Date(dateStr),
        accountId,
        categoryId: categoryId || null,
      },
    });

    // 2. Actualizar saldo de la cuenta
    const account = await tx.account.findUnique({ where: { id: accountId } });
    if (account) {
      const balanceChange = type === "INCOME" ? amount : -amount;
      await tx.account.update({
        where: { id: accountId },
        data: { balance: account.balance + balanceChange },
      });
    }
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
    const account = await tx.account.findUnique({
      where: { id: transaction.accountId },
    });
    if (account) {
      const balanceChange =
        transaction.type === "INCOME"
          ? -transaction.amount
          : transaction.amount;
      await tx.account.update({
        where: { id: transaction.accountId },
        data: { balance: account.balance + balanceChange },
      });
    }
  });

  revalidatePath("/transacciones");
  revalidatePath("/");
}
