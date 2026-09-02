"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Corregido para usar lib/auth
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { debtInputSchema, parseFormString } from "@/lib/validation";

export async function createDebt(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const parsed = debtInputSchema.safeParse({
    type: parseFormString(formData.get("type")),
    personName: parseFormString(formData.get("personName")),
    description: parseFormString(formData.get("description")) || undefined,
    amount: formData.get("amount"),
    dueDate: parseFormString(formData.get("dueDate")) || undefined,
  });
  if (!parsed.success) throw new Error("Datos de deuda inválidos");
  const { type, personName, description, amount, dueDate } = parsed.data;

  await prisma.debt.create({
    data: {
      userId: session.user.id,
      type,
      personName,
      description,
      amount: new Prisma.Decimal(amount),
      status: "PENDING",
      dueDate: dueDate ?? null,
    },
  });

  revalidatePath("/deudas");
  revalidatePath("/");
}

export async function toggleDebtStatus(id: string, currentStatus: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  await prisma.debt.update({
    where: { id, userId: session.user.id },
    data: { status: currentStatus === "PENDING" ? "PAID" : "PENDING" },
  });

  revalidatePath("/deudas");
}

export async function deleteDebt(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  await prisma.debt.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/deudas");
}
