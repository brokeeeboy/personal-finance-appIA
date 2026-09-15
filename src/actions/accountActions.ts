"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { accountInputSchema, parseFormString } from "@/lib/validation";

export async function createAccount(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const parsed = accountInputSchema.safeParse({
    name: parseFormString(formData.get("name")),
    type: parseFormString(formData.get("type")),
    bankName: parseFormString(formData.get("bankName")) || undefined,
    balance: formData.get("balance") || 0,
    lastFour: parseFormString(formData.get("lastFour")) || undefined,
    creditLimit: formData.get("creditLimit") || undefined,
    billingDay: formData.get("billingDay") || undefined,
    paymentDay: formData.get("paymentDay") || undefined,
  });
  if (!parsed.success) throw new Error("Datos de cuenta inválidos");
  const {
    name,
    type,
    bankName,
    balance,
    lastFour,
    creditLimit,
    billingDay,
    paymentDay,
  } = parsed.data;

  await prisma.account.create({
    data: {
      userId: session.user.id,
      name,
      type,
      bankName,
      balance: new Prisma.Decimal(balance),
      lastFour: lastFour || null,
      creditLimit:
        creditLimit === undefined ? null : new Prisma.Decimal(creditLimit),
      billingDay: type === "CREDIT" ? (billingDay ?? null) : null,
      paymentDay: type === "CREDIT" ? (paymentDay ?? null) : null,
    },
  });

  // Esto le dice a Next.js que recargue los datos de esta ruta
  revalidatePath("/cuentas");
  revalidatePath("/"); // También actualizamos el dashboard
}

// No se permite cambiar `type` una vez creada la cuenta: el signo con el que
// se interpretan sus transacciones pasadas depende de si es CREDIT o no
// (ver src/lib/accountBalance.ts), así que cambiarlo dejaría el historial
// con un significado distinto al que tenía cuando se registró.
export async function updateAccount(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const existing = await prisma.account.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) throw new Error("Cuenta no encontrada");

  const parsed = accountInputSchema.safeParse({
    name: parseFormString(formData.get("name")),
    type: existing.type,
    bankName: parseFormString(formData.get("bankName")) || undefined,
    balance: formData.get("balance") || 0,
    lastFour: parseFormString(formData.get("lastFour")) || undefined,
    creditLimit: formData.get("creditLimit") || undefined,
    billingDay: formData.get("billingDay") || undefined,
    paymentDay: formData.get("paymentDay") || undefined,
  });
  if (!parsed.success) throw new Error("Datos de cuenta inválidos");
  const { name, bankName, balance, lastFour, creditLimit, billingDay, paymentDay } =
    parsed.data;

  await prisma.account.update({
    where: { id },
    data: {
      name,
      bankName: bankName || null,
      balance: new Prisma.Decimal(balance),
      lastFour: lastFour || null,
      creditLimit:
        creditLimit === undefined ? null : new Prisma.Decimal(creditLimit),
      billingDay: existing.type === "CREDIT" ? (billingDay ?? null) : null,
      paymentDay: existing.type === "CREDIT" ? (paymentDay ?? null) : null,
    },
  });

  revalidatePath("/cuentas");
  revalidatePath("/");
}

export async function deleteAccount(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  // Verificamos que la cuenta pertenezca al usuario antes de borrarla
  await prisma.account.deleteMany({
    where: {
      id: id,
      userId: session.user.id,
    },
  });

  revalidatePath("/cuentas");
  revalidatePath("/");
}
