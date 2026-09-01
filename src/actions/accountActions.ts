"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createAccount(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const bankName = formData.get("bankName") as string;
  const balance = parseFloat(formData.get("balance") as string) || 0;
  const lastFour = formData.get("lastFour") as string | null;
  const creditLimit = formData.get("creditLimit")
    ? parseFloat(formData.get("creditLimit") as string)
    : null;
  const billingDay = formData.get("billingDay")
    ? Number(formData.get("billingDay"))
    : null;
  const paymentDay = formData.get("paymentDay")
    ? Number(formData.get("paymentDay"))
    : null;

  await prisma.account.create({
    data: {
      userId: session.user.id,
      name,
      type,
      bankName,
      balance,
      lastFour: lastFour ? lastFour.slice(0, 4) : null,
      creditLimit,
      billingDay: type === "CREDIT" ? billingDay : null,
      paymentDay: type === "CREDIT" ? paymentDay : null,
    },
  });

  // Esto le dice a Next.js que recargue los datos de esta ruta
  revalidatePath("/cuentas");
  revalidatePath("/"); // También actualizamos el dashboard
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
