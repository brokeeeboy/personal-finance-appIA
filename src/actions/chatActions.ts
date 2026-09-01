"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  parseFinanceFallback,
  extractDebtDueDate,
  getDebtReminderPrompt,
  isPositiveDebtConfirmation,
  pendingDebtDrafts,
} from "@/lib/chatHelpers";

async function executeParsedAction(
  parsed: any,
  userId: string,
  accounts: Array<{ id: string; name: string; type: string }>,
) {
  if (parsed.action === "transaction") {
    const account =
      accounts.find((item) => item.id === parsed.accountId) ?? accounts[0];
    if (!account) throw new Error("Cuenta no encontrada");

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId,
          description: parsed.description,
          amount: parsed.amount,
          type: parsed.type,
          date: new Date(),
          accountId: account.id,
          categoryId: parsed.categoryId || null,
          isAutoCategorized: true,
        },
      });

      let balanceChange =
        parsed.type === "INCOME" ? parsed.amount : -parsed.amount;
      if (account.type === "CREDIT") balanceChange = -balanceChange;

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
    if (parsed.askForDueDate || !parsed.dueDate) {
      if (parsed.personName && parsed.amount > 0) {
        pendingDebtDrafts.set(userId, {
          type: parsed.type,
          personName: parsed.personName,
          amount: parsed.amount,
          description: parsed.description || "Deuda",
        });
      }

      return {
        reply:
          parsed.reply ||
          "¿Para cuándo vence ese pago? Te lo guardo con fecha y te recordaré un día antes.",
      };
    }

    await prisma.debt.create({
      data: {
        userId,
        type: parsed.type,
        personName: parsed.personName,
        amount: parsed.amount,
        description: parsed.description,
        status: "PENDING",
        date: new Date(),
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      },
    });

    pendingDebtDrafts.delete(userId);
    revalidatePath("/deudas");
    return {
      reply: `✅ Anotado. Registré que ${parsed.type === "OWE_ME" ? `${parsed.personName} te debe` : `le debes a ${parsed.personName}`} $${parsed.amount}${parsed.dueDate ? ` y vence el ${new Date(parsed.dueDate).toLocaleDateString("es-CL")}` : ""}.`,
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
}

export async function processChatMessage(message: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autorizado");

  const userId = session.user.id;

  const draft = pendingDebtDrafts.get(userId);
  if (draft) {
    const dueDate = extractDebtDueDate(message);
    if (dueDate) {
      await prisma.debt.create({
        data: {
          userId,
          type: draft.type,
          personName: draft.personName,
          amount: draft.amount,
          description: draft.description,
          status: "PENDING",
          date: new Date(),
          dueDate,
        },
      });

      pendingDebtDrafts.delete(userId);
      revalidatePath("/deudas");
      return {
        reply: `✅ Anotado. Registré que ${draft.type === "OWE_ME" ? `${draft.personName} te debe` : `le debes a ${draft.personName}`} $${draft.amount} y vence el ${dueDate.toLocaleDateString("es-CL")}.`,
      };
    }
  }

  const debtReminder = await prisma.debt
    .findMany({
      where: { userId, status: "PENDING", dueDate: { not: null } },
      select: {
        id: true,
        personName: true,
        amount: true,
        status: true,
        dueDate: true,
      },
    })
    .then((debts) => getDebtReminderPrompt(debts));

  if (debtReminder && isPositiveDebtConfirmation(message)) {
    const upcomingDebt = await prisma.debt.findFirst({
      where: { userId, status: "PENDING", dueDate: { not: null } },
      orderBy: { dueDate: "asc" },
    });

    if (upcomingDebt) {
      await prisma.debt.update({
        where: { id: upcomingDebt.id },
        data: { status: "PAID" },
      });
      revalidatePath("/deudas");
      return {
        reply: `✅ Perfecto. Marqué la deuda de ${upcomingDebt.personName} como pagada.`,
      };
    }
  }

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

  if (accounts.length === 0) {
    return {
      reply:
        "Para empezar a registrar movimientos, primero debes crear al menos una cuenta en la sección 'Cuentas'.",
    };
  }

  const fallback = parseFinanceFallback(message, accounts, categories, goals);

  try {
    const apiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL;

    if (!apiKey || !aiBaseUrl) {
      return await executeParsedAction(fallback, userId, accounts);
    }

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
4. Si la acción es "debt":
   - Si el usuario no dio una fecha de pago, devuelve: { "action": "debt", "type": "OWE_ME" o "I_OWE", "personName": string, "amount": numero, "description": string, "askForDueDate": true, "reply": "¿Para cuándo vence ese pago? Te lo guardo con fecha y te recordaré un día antes." }
   - Si sí dio la fecha, devuelve: { "action": "debt", "type": "OWE_ME" o "I_OWE", "personName": string, "amount": numero, "description": string, "dueDate": "ISO string" }
5. Si la acción es "goal", devuelve: { "action": "goal", "goalId": string (id de la meta), "amount": numero }
6. Si falta información crucial (como el monto o a qué cuenta va) o es una charla normal, devuelve: { "action": "unknown", "reply": "Tu respuesta amigable preguntando qué falta o conversando" }
`;

    const response = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("AI request failed:", response.status, response.statusText);
      return await executeParsedAction(fallback, userId, accounts);
    }

    const data = await response.json();
    const aiContent = data?.choices?.[0]?.message?.content;

    if (!aiContent) {
      return await executeParsedAction(fallback, userId, accounts);
    }

    const jsonStr = String(aiContent)
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return await executeParsedAction(fallback, userId, accounts);
    }

    return await executeParsedAction(parsed, userId, accounts);
  } catch (error) {
    console.error("Error AI:", error);
    return await executeParsedAction(fallback, userId, accounts);
  }
}
