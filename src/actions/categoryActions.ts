"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { categoryInputSchema, parseFormString } from "@/lib/validation";

export async function createCategory(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const parsed = categoryInputSchema.safeParse({
    name: parseFormString(formData.get("name")),
    color: parseFormString(formData.get("color")) || undefined,
  });
  if (!parsed.success) throw new Error("Datos de categoría inválidos");
  const { name, color } = parsed.data;

  const existing = await prisma.category.findFirst({
    where: { userId: session.user.id, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw new Error("Ya tienes una categoría con ese nombre");

  await prisma.category.create({
    data: {
      userId: session.user.id,
      name,
      color: color || null,
    },
  });

  revalidatePath("/categorias");
  revalidatePath("/transacciones");
}

export async function updateCategory(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const parsed = categoryInputSchema.safeParse({
    name: parseFormString(formData.get("name")),
    color: parseFormString(formData.get("color")) || undefined,
  });
  if (!parsed.success) throw new Error("Datos de categoría inválidos");
  const { name, color } = parsed.data;

  const duplicate = await prisma.category.findFirst({
    where: {
      userId: session.user.id,
      name: { equals: name, mode: "insensitive" },
      NOT: { id },
    },
  });
  if (duplicate) throw new Error("Ya tienes una categoría con ese nombre");

  await prisma.category.update({
    where: { id, userId: session.user.id },
    data: { name, color: color || null },
  });

  revalidatePath("/categorias");
  revalidatePath("/transacciones");
  revalidatePath("/");
}

export async function deleteCategory(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  // Las transacciones que usaban esta categoría quedan sin categoría
  // (onDelete: SetNull en el schema) y las reglas asociadas se eliminan.
  await prisma.category.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/categorias");
  revalidatePath("/transacciones");
}
