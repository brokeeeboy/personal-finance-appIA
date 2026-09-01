"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Corregido a lib/auth
import { revalidatePath } from "next/cache";

export async function processChatMessage(message: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const userId = session.user.id;

  // 1. Obtener el contexto del usuario (sus cuentas, categorías y metas reales)
  const [accounts, categories, goals] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true },
    }),
    prisma.goal.findMany({
      where: { userId },
      select: { id: true, name: true },
    }),
  ]);

  // Si no tiene cuentas, la IA no puede hacer mucho
  if (accounts.length === 0) {
    return {
      reply:
        "Para empezar a registrar movimientos, primero debes crear al menos una cuenta en la sección 'Cuentas'.",
    };
  }

  // 2. Construir el Prompt del Sistema
  const systemPrompt = `
Eres un asistente financiero inteligente. Tu trabajo es interpretar el mensaje del usuario y extraer los datos en formato JSON para ejecutar una acción.
Hoy es ${new Date().toLocaleDateString("es-CL")}.

CUENTAS DEL USUARIO:
${JSON.stringify(accounts)}

CATEGORÍAS DEL USUARIO:
${JSON.stringify(categories)}

METAS DEL USUARIO:
${JSON.stringify(goals)}

REGLAS:
1. Responde ÚNICAMENTE con un objeto JSON válido. Nada de texto antes o después.
2. Identifica la "action": puede ser "transaction", "debt", "goal", o "unknown".
3. Si la acción es "transaction", devuelve: { "action": "transaction", "amount": numero, "description": string, "type": "EXPENSE" o "INCOME", "accountId": string (id exacto de la cuenta), "categoryId": string (id de la categoría más lógica, opcional) }
4. Si la acción es "debt", devuelve: { "action": "debt", "type": "OWE_ME" o "I_OWE", "personName": string, "amount": numero, "description": string }
5. Si la acción es "goal", devuelve: { "action": "goal", "goalId": string (id de la meta), "amount": numero }
6. Si falta información crucial (como el monto o a qué cuenta va) o es una charla normal, devuelve: { "action": "unknown", "reply": "Tu respuesta amigable preguntando qué falta o conversando" }
`;

  // 3. Llamar a la IA (Usando fetch estándar para máxima compatibilidad)
  try {
    const response = await fetch(
      `${process.env.AI_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat", // Cambia si usas otro modelo
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.1, // Baja temperatura para que sea determinista y el JSON no falle
        }),
      },
    );

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    // Extraer el JSON (por si la IA agregó markdown tipo ```json ... ```)
    const jsonStr = aiContent
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    // 4. Ejecutar la acción en la base de datos
    if (parsed.action === "transaction") {
      // Buscar la cuenta para actualizar el saldo
      const account = accounts.find(
        (a: { id: string; type: string }) => a.id === parsed.accountId,
      );
      if (!account) throw new Error("Cuenta no encontrada");

      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId,
            description: parsed.description,
            amount: parsed.amount,
            type: parsed.type,
            date: new Date(),
            accountId: parsed.accountId,
            categoryId: parsed.categoryId || null,
            isAutoCategorized: true,
          },
        });

        let balanceChange =
          parsed.type === "INCOME" ? parsed.amount : -parsed.amount;
        if (account.type === "CREDIT") balanceChange = -balanceChange; // Lógica inversa para tarjetas

        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: balanceChange } },
        });
      });
      revalidatePath("/");
      return {
        reply: `✅ Listo. Registré un ${parsed.type === "EXPENSE" ? "gasto" : "ingreso"} de $${parsed.amount} en ${parsed.description}.`,
      };
    }

    if (parsed.action === "debt") {
      await prisma.debt.create({
        data: {
          userId,
          type: parsed.type,
          personName: parsed.personName,
          amount: parsed.amount,
          description: parsed.description,
          status: "PENDING",
          date: new Date(),
        },
      });
      revalidatePath("/deudas");
      return {
        reply: `✅ Anotado. Registré que ${parsed.type === "OWE_ME" ? `${parsed.personName} te debe` : `le debes a ${parsed.personName}`} $${parsed.amount}.`,
      };
    }

    if (parsed.action === "goal") {
      await prisma.$transaction([
        prisma.goalContribution.create({
          data: { goalId: parsed.goalId, amount: parsed.amount },
        }),
        prisma.goal.update({
          where: { id: parsed.goalId },
          data: { currentAmount: { increment: parsed.amount } },
        }),
      ]);
      revalidatePath("/metas");
      return {
        reply: `✅ ¡Excelente! Aboné $${parsed.amount} a tu meta de ahorro.`,
      };
    }

    if (parsed.action === "unknown") {
      return {
        reply: parsed.reply || "¿Me podrías dar un poco más de detalle?",
      };
    }

    return { reply: "Entendí el mensaje, pero no supe qué acción ejecutar." };
  } catch (error) {
    console.error("Error AI:", error);
    return {
      reply:
        "Hubo un error al procesar tu mensaje. Intenta ser más específico (ej: 'Gasté 5000 en comida pagado con la Visa').",
    };
  }
}
