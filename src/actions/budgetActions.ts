"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { budgetInputSchema, parseFormString } from "@/lib/validation";

export async function setBudget(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const parsed = budgetInputSchema.safeParse({
    categoryId: parseFormString(formData.get("categoryId")),
    amount: formData.get("amount"),
    month: formData.get("month"),
    year: formData.get("year"),
  });
  if (!parsed.success) throw new Error("Datos de presupuesto inválidos");
  const { categoryId, amount, month, year } = parsed.data;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
  });
  if (!category) throw new Error("Categoría no encontrada");

  // Un presupuesto por categoría/mes/año: si ya existe, lo actualizamos en
  // vez de duplicarlo (ver @@unique en el schema).
  await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId: session.user.id,
        categoryId,
        month,
        year,
      },
    },
    create: {
      userId: session.user.id,
      categoryId,
      amount: new Prisma.Decimal(amount),
      month,
      year,
    },
    update: {
      amount: new Prisma.Decimal(amount),
    },
  });

  revalidatePath("/presupuestos");
  revalidatePath("/");
}

export async function deleteBudget(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  await prisma.budget.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/presupuestos");
  revalidatePath("/");
}
