"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!name || !email || !password) {
    throw new Error("Completa nombre, correo y contraseña.");
  }

  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("Ya existe un usuario con ese correo.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "USER",
    },
  });

  revalidatePath("/admin");
}

export async function deleteUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Falta el ID del usuario.");
  }

  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!userToDelete) {
    throw new Error("El usuario no existe.");
  }

  if (userToDelete.role === "ADMIN" || userToDelete.id === session.user.id) {
    throw new Error("No puedes eliminar este usuario.");
  }

  await prisma.user.delete({
    where: { id },
  });

  revalidatePath("/admin");
}
