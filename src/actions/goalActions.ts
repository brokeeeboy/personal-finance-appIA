"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Corregido a lib/auth
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { goalInputSchema, parseFormString } from "@/lib/validation";

export async function createGoal(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const parsed = goalInputSchema.safeParse({
    name: parseFormString(formData.get("name")),
    targetAmount: formData.get("targetAmount"),
    targetDate: parseFormString(formData.get("targetDate")) || undefined,
    initialAmount: formData.get("initialAmount") || 0,
  });
  if (!parsed.success) throw new Error("Datos de meta inválidos");
  const { name, targetAmount, targetDate, initialAmount } = parsed.data;

  await prisma.goal.create({
    data: {
      userId: session.user.id,
      name,
      targetAmount: new Prisma.Decimal(targetAmount),
      currentAmount: new Prisma.Decimal(initialAmount),
      targetDate: targetDate ?? null,
      ...(initialAmount > 0 && {
        contributions: {
          create: { amount: new Prisma.Decimal(initialAmount) },
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

  const goalId = parseFormString(formData.get("goalId"));
  const amount = Number(formData.get("amount"));
  if (!goalId || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Datos de aporte inválidos");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Crear el registro de la contribución
    await tx.goalContribution.create({
      data: { goalId, amount: new Prisma.Decimal(amount) },
    });

    const goal = await tx.goal.findFirst({
      where: { id: goalId, userId: session.user.id },
    });
    if (!goal) throw new Error("Meta no encontrada");
    await tx.goal.update({
      where: { id: goalId },
      data: { currentAmount: { increment: new Prisma.Decimal(amount) } },
    });
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
