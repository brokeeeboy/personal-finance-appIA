"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getFinancialContext } from "@/lib/financialContext";
import {
  parseFinanceFallback,
  extractDebtDueDate,
  getDebtReminderPrompt,
  isPositiveDebtConfirmation,
  findMentionedAccount,
  pendingDebtDrafts,
  pendingTransactionDrafts,
} from "@/lib/chatHelpers";

export type ChatHistoryMessage = {
  role: "user" | "ai";
  text: string;
};

type ParsedAction = {
  action: string;
  amount?: number;
  description?: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  personName?: string;
  askForDueDate?: boolean;
  dueDate?: string;
  goalId?: string;
  reply?: string;
};

async function executeParsedAction(
  parsed: ParsedAction,
  userId: string,
  accounts: Array<{ id: string; name: string; type: string }>,
) {
  if (parsed.action === "transaction") {
    if (
      typeof parsed.amount !== "number" ||
      typeof parsed.description !== "string" ||
      typeof parsed.type !== "string"
    ) {
      return {
        reply: "¿Qué monto, descripción y tipo de movimiento debo registrar?",
      };
    }
    const amount = parsed.amount;
    const description = parsed.description;
    const type = parsed.type;

    const account =
      accounts.find((item) => item.id === parsed.accountId) ?? accounts[0];
    if (!account) throw new Error("Cuenta no encontrada");

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId,
          description,
          amount,
          type,
          date: new Date(),
          accountId: account.id,
          categoryId: parsed.categoryId || null,
          isAutoCategorized: true,
        },
      });

      let balanceChange = type === "INCOME" ? amount : -amount;
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
      if (
        parsed.personName &&
        typeof parsed.amount === "number" &&
        parsed.amount > 0 &&
        typeof parsed.type === "string"
      ) {
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

    if (
      typeof parsed.type !== "string" ||
      typeof parsed.personName !== "string" ||
      typeof parsed.amount !== "number"
    ) {
      return { reply: "¿A quién corresponde la deuda y cuál es el monto?" };
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
    if (
      typeof parsed.goalId !== "string" ||
      typeof parsed.amount !== "number"
    ) {
      return { reply: "¿A qué meta y por qué monto quieres hacer el aporte?" };
    }

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

export async function processChatMessage(
  message: string,
  history: ChatHistoryMessage[] = [],
) {
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

  const financialContext = await getFinancialContext(userId);
  const { accounts, categories, goals } = financialContext;

  if (accounts.length === 0) {
    return {
      reply:
        "Para empezar a registrar movimientos, primero debes crear al menos una cuenta en la sección 'Cuentas'.",
    };
  }

  const pendingTransaction = pendingTransactionDrafts.get(userId);
  if (pendingTransaction) {
    const account = findMentionedAccount(accounts, message);
    if (account) {
      pendingTransactionDrafts.delete(userId);
      return await executeParsedAction(
        { action: "transaction", ...pendingTransaction, accountId: account.id },
        userId,
        accounts,
      );
    }

    return { reply: "¿En qué cuenta debo registrar este movimiento?" };
  }

  const fallback = parseFinanceFallback(message, accounts, categories, goals);

  if (
    fallback.action === "unknown" &&
    fallback.reply === "¿En qué cuenta debo registrar este movimiento?" &&
    typeof fallback.amount === "number" &&
    typeof fallback.description === "string" &&
    typeof fallback.type === "string"
  ) {
    pendingTransactionDrafts.set(userId, {
      amount: fallback.amount,
      description: fallback.description,
      type: fallback.type,
      categoryId: fallback.categoryId,
    });

    return { reply: fallback.reply };
  }

  try {
    const apiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL;

    if (!apiKey || !aiBaseUrl) {
      return await executeParsedAction(fallback, userId, accounts);
    }

    const systemPrompt = `
Eres un asistente financiero inteligente. Tu trabajo es interpretar el mensaje del usuario y extraer los datos en formato JSON para ejecutar una acción.
Hoy es ${new Date().toLocaleDateString("es-CL")}.

CONTEXTO FINANCIERO ACTUAL DEL USUARIO:
${JSON.stringify(financialContext)}

HISTORIAL RECIENTE DE LA CONVERSACIÓN:
${JSON.stringify(history.slice(-8))}

REGLAS:
1. Responde ÚNICAMENTE con un objeto JSON válido. Nada de texto antes o después.
2. Identifica la "action": puede ser "transaction", "debt", "goal", o "unknown".
3. Usa el historial para resolver referencias como "esa cuenta", "lo anterior" o "también". No inventes datos ni IDs.
4. Si la acción es "transaction", devuelve: { "action": "transaction", "amount": numero, "description": string, "type": "EXPENSE" o "INCOME", "accountId": string (id exacto de la cuenta), "categoryId": string (id de la categoría más lógica, opcional) }
  - Si hay más de una cuenta posible y el usuario no especificó cuál, devuelve unknown y pregunta cuál cuenta usar.
  - Para responder preguntas sobre gastos, ingresos, saldos o movimientos, usa recentTransactions y summary; no inventes cifras.
5. Si la acción es "debt":
   - Si el usuario no dio una fecha de pago, devuelve: { "action": "debt", "type": "OWE_ME" o "I_OWE", "personName": string, "amount": numero, "description": string, "askForDueDate": true, "reply": "¿Para cuándo vence ese pago? Te lo guardo con fecha y te recordaré un día antes." }
   - Si sí dio la fecha, devuelve: { "action": "debt", "type": "OWE_ME" o "I_OWE", "personName": string, "amount": numero, "description": string, "dueDate": "ISO string" }
6. Si la acción es "goal", devuelve: { "action": "goal", "goalId": string (id de la meta), "amount": numero }
7. Si falta información crucial (como el monto, la cuenta o la meta), si hay ambigüedad o es una charla normal, devuelve: { "action": "unknown", "reply": "Una pregunta breve y amable para obtener exactamente el dato que falta" }.
8. También puedes responder preguntas financieras usando el contexto, pero siempre devuelve action "unknown" y escribe la respuesta en reply; nunca inventes datos.
9. Nunca ejecutes ni confirmes una operación si todavía necesitas una aclaración.
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
          ...history.slice(-8).map((item) => ({
            role:
              item.role === "ai" ? ("assistant" as const) : ("user" as const),
            content: item.text,
          })),
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

    let parsed: ParsedAction;
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
