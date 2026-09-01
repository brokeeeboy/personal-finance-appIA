"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Corregido para usar lib/auth
import { revalidatePath } from "next/cache";

export async function createDebt(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const type = formData.get("type") as string;
  const personName = formData.get("personName") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const dueDateStr = formData.get("dueDate") as string;

  await prisma.debt.create({
    data: {
      userId: session.user.id,
      type,
      personName,
      description,
      amount,
      status: "PENDING",
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
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
