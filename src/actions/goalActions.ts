"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Corregido a lib/auth
import { revalidatePath } from "next/cache";

export async function createGoal(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const name = formData.get("name") as string;
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const targetDateStr = formData.get("targetDate") as string;
  const initialAmount =
    parseFloat(formData.get("initialAmount") as string) || 0;

  await prisma.goal.create({
    data: {
      userId: session.user.id,
      name,
      targetAmount,
      currentAmount: initialAmount,
      targetDate: targetDateStr ? new Date(targetDateStr) : null,
      ...(initialAmount > 0 && {
        contributions: {
          create: { amount: initialAmount },
        },
      }),
    },
  });

  revalidatePath("/metas");
  revalidatePath("/");
}

export async function addContribution(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const goalId = formData.get("goalId") as string;
  const amount = parseFloat(formData.get("amount") as string);

  await prisma.$transaction(async (tx) => {
    // 1. Crear el registro de la contribución
    await tx.goalContribution.create({
      data: { goalId, amount },
    });

    // 2. Actualizar el monto actual de la meta
    const goal = await tx.goal.findUnique({ where: { id: goalId } });
    if (goal) {
      await tx.goal.update({
        where: { id: goalId },
        data: { currentAmount: goal.currentAmount + amount },
      });
    }
  });

  revalidatePath("/metas");
}

export async function deleteGoal(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  await prisma.goal.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/metas");
}
