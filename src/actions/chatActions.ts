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
  resolveAccountMention,
} from "@/lib/chatHelpers";
import { aiActionSchema, pendingActionPayloadSchema } from "@/lib/validation";
import { applyBalanceChange, computeBalanceChange } from "@/lib/accountBalance";
import { checkRateLimit } from "@/lib/rateLimit";
import type { Prisma } from "@prisma/client";

const CHAT_MESSAGE_LIMIT = 20;
const CHAT_MESSAGE_WINDOW_MS = 60 * 1000;

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

function fallbackResponse(
  reason: string,
  fallback: ParsedAction,
  userId: string,
  accounts: Array<{ id: string; name: string; type: string }>,
) {
  console.warn(`[chat] fallback reason=${reason}`);
  return executeParsedAction(fallback, userId, accounts).then((result) => ({
    ...result,
    usedFallback: true,
  }));
}

const PENDING_ACTION_TTL_MS = 30 * 60 * 1000;

async function savePendingAction(
  userId: string,
  type: "DEBT" | "TRANSACTION",
  payload: Record<string, unknown>,
) {
  await prisma.pendingAction.deleteMany({ where: { userId } });
  await prisma.pendingAction.create({
    data: {
      userId,
      type,
      payload: payload as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS),
    },
  });
}

async function getPendingAction(userId: string) {
  const now = new Date();
  await prisma.pendingAction.deleteMany({
    where: { userId, expiresAt: { lte: now } },
  });
  return prisma.pendingAction.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

function isAccountSelection(message: string) {
  return /\b(?:e?fectivo|cash|plata en mano|cuenta|tarjeta|debito|débito|credito|crédito)\b/i.test(
    message,
  );
}

function hasPendingTransaction(parsed: ParsedAction) {
  if (
    parsed.action === "unknown" &&
    typeof parsed.amount === "number" &&
    parsed.amount > 0 &&
    typeof parsed.description === "string" &&
    typeof parsed.type === "string"
  ) {
    return true;
  }

  return false;
}

// El parser determinista (parseFinanceFallback) arma el objeto de acción a
// mano y no pasaba por aiActionSchema como sí lo hace la respuesta de la IA.
// Si algún día produce datos con forma inesperada (p. ej. un monto no
// numérico), esto evita que la acción llegue "cruda" hasta Prisma y explote
// con un error 500 en vez de responder algo razonable al usuario.
function sanitizeFallbackAction(candidate: unknown): ParsedAction {
  const result = aiActionSchema.safeParse(candidate);
  if (result.success) return result.data;
  return {
    action: "unknown",
    reply: "No logré entender bien ese mensaje, ¿me lo puedes explicar de otra forma?",
  };
}

function normalizeParsedAction(parsed: ParsedAction): ParsedAction {
  const normalizedType = parsed.type?.toUpperCase();
  const typeAliases: Record<string, string> = {
    GASTO: "EXPENSE",
    GASTOS: "EXPENSE",
    EGRESO: "EXPENSE",
    EGRESOS: "EXPENSE",
    INGRESO: "INCOME",
    INGRESOS: "INCOME",
    ENTRADA: "INCOME",
    ENTRADAS: "INCOME",
    ME_DEBEN: "OWE_ME",
  };

  return {
    ...parsed,
    type: normalizedType
      ? (typeAliases[normalizedType] ?? normalizedType)
      : undefined,
  };
}

async function executeParsedAction(
  parsed: ParsedAction,
  userId: string,
  accounts: Array<{ id: string; name: string; type: string }>,
) {
  if (parsed.action === "transaction") {
    if (
      typeof parsed.amount !== "number" ||
      typeof parsed.description !== "string" ||
      (parsed.type !== "INCOME" && parsed.type !== "EXPENSE")
    ) {
      return {
        reply: "¿Qué monto, descripción y tipo de movimiento debo registrar?",
      };
    }
    const amount = parsed.amount;
    const description = parsed.description;
    const type = parsed.type;

    const account = accounts.find((item) => item.id === parsed.accountId);
    if (!account) throw new Error("Cuenta no encontrada");
    if (parsed.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parsed.categoryId, userId },
      });
      if (!category) throw new Error("Categoría no encontrada");
    }

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

      const change = computeBalanceChange(account.type, type, amount);
      await applyBalanceChange(tx, account.id, change);
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
        await savePendingAction(userId, "DEBT", {
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

    const goal = await prisma.goal.findFirst({
      where: { id: parsed.goalId, userId },
      select: { id: true },
    });
    if (!goal) return { reply: "Meta no encontrada." };
    await prisma.$transaction([
      prisma.goalContribution.create({
        data: { goalId: goal.id, amount: parsed.amount },
      }),
      prisma.goal.update({
        where: { id: goal.id },
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

  if (message.trim().length === 0 || message.length > 500) {
    return { reply: "Escribe un mensaje de hasta 500 caracteres." };
  }

  const rateLimit = checkRateLimit(
    `chat:${userId}`,
    CHAT_MESSAGE_LIMIT,
    CHAT_MESSAGE_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    const seconds = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000));
    return {
      reply: `Estás escribiendo muy rápido. Espera ${seconds} segundo${seconds === 1 ? "" : "s"} y vuelve a intentar.`,
    };
  }

  const pendingAction = await getPendingAction(userId);
  const draftResult =
    pendingAction?.type === "DEBT"
      ? pendingActionPayloadSchema.safeParse(pendingAction.payload)
      : null;
  const draft = draftResult?.success ? draftResult.data : null;
  if (pendingAction && !draft) {
    await prisma.pendingAction.delete({ where: { id: pendingAction.id } });
  }
  if (draft && draft.personName) {
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

      await prisma.pendingAction.delete({ where: { id: pendingAction!.id } });
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
    .then((debts) =>
      getDebtReminderPrompt(
        debts.map((debt) => ({ ...debt, amount: Number(debt.amount) })),
      ),
    );

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

  const transactionAction =
    pendingAction?.type === "TRANSACTION"
      ? pendingAction
      : await getPendingAction(userId);
  const transactionResult =
    transactionAction?.type === "TRANSACTION"
      ? pendingActionPayloadSchema.safeParse(transactionAction.payload)
      : null;
  const pendingTransaction = transactionResult?.success
    ? transactionResult.data
    : null;
  if (pendingTransaction) {
    const resolution = resolveAccountMention(accounts, message);
    if (resolution.account) {
      await prisma.pendingAction.delete({
        where: { id: transactionAction!.id },
      });
      return await executeParsedAction(
        {
          action: "transaction",
          ...pendingTransaction,
          accountId: resolution.account.id,
        },
        userId,
        accounts,
      );
    }

    return {
      reply: resolution.ambiguous
        ? "Tienes más de una cuenta de ese tipo. ¿Me dices el nombre exacto de la cuenta?"
        : "¿En qué cuenta debo registrar este movimiento?",
    };
  }

  if (isAccountSelection(message)) {
    const resolution = resolveAccountMention(accounts, message);
    const previousUserMessage = [...history]
      .reverse()
      .find((item) => item.role === "user")?.text;

    if (resolution.ambiguous) {
      return {
        reply:
          "Tienes más de una cuenta de ese tipo. ¿Me dices el nombre exacto de la cuenta?",
      };
    }

    if (resolution.account && previousUserMessage) {
      const previousAction = sanitizeFallbackAction(
        parseFinanceFallback(
          previousUserMessage,
          [resolution.account],
          categories,
          goals,
        ),
      );
      if (previousAction.action === "transaction") {
        return await executeParsedAction(
          { ...previousAction, accountId: resolution.account.id },
          userId,
          accounts,
        );
      }
    }
  }

  const fallback = sanitizeFallbackAction(
    parseFinanceFallback(message, accounts, categories, goals),
  );

  try {
    const apiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL;

    if (!apiKey || !aiBaseUrl) {
      if (hasPendingTransaction(fallback)) {
        await savePendingAction(userId, "TRANSACTION", {
          amount: fallback.amount,
          description: fallback.description,
          type: fallback.type,
          categoryId: fallback.categoryId,
        });
      }
      return await fallbackResponse("no_api_key", fallback, userId, accounts);
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
  - "accountId" tiene que ser el id EXACTO de una cuenta que aparece en "accounts" del contexto. Nunca inventes un id ni mezcles el id de una cuenta con el nombre de otra.
  - Si el usuario menciona un tipo genérico de cuenta ("la tarjeta", "la débito", "efectivo") y hay MÁS DE UNA cuenta de ese mismo tipo en "accounts", NO elijas una al azar: devuelve "unknown" y pregunta cuál específicamente (usa los nombres reales de esas cuentas en la pregunta, ej: "¿Con la Visa Platinum o la Mastercard Black?").
  - Si no hay ninguna categoría que calce claramente con la descripción, omite "categoryId" en vez de adivinar una al azar — es preferible dejar la transacción sin categoría que ponerle una incorrecta.
  - Para responder preguntas sobre gastos, ingresos, saldos o movimientos, usa recentTransactions y summary; no inventes cifras.
5. Si la acción es "debt":
   - Si el usuario no dio una fecha de pago, devuelve: { "action": "debt", "type": "OWE_ME" o "I_OWE", "personName": string, "amount": numero, "description": string, "askForDueDate": true, "reply": "¿Para cuándo vence ese pago? Te lo guardo con fecha y te recordaré un día antes." }
   - Si sí dio la fecha, devuelve: { "action": "debt", "type": "OWE_ME" o "I_OWE", "personName": string, "amount": numero, "description": string, "dueDate": "ISO string" }
6. Si la acción es "goal", devuelve: { "action": "goal", "goalId": string (id de la meta), "amount": numero }
   - Si hay más de una meta y el usuario no nombró ninguna explícitamente (ni en este mensaje ni antes en el historial), devuelve "unknown" y pregunta a cuál meta aportar — abonar a la meta equivocada es un error real, no un detalle menor.
   - Si solo existe una meta, úsala directamente sin preguntar.
7. Si falta información crucial (como el monto o la cuenta), si hay ambigüedad genuina o es una charla normal, devuelve: { "action": "unknown", "reply": "Una pregunta breve y amable para obtener exactamente el dato que falta" }.
8. También puedes responder preguntas financieras usando el contexto, pero siempre devuelve action "unknown" y escribe la respuesta en reply; nunca inventes datos.
9. Nunca ejecutes ni confirmes una operación si todavía necesitas una aclaración.
10. Si el usuario corrige un dato que acabas de registrar o preguntar ("no, fueron 5000", "era en la Visa, no en la débito"), trátalo como una corrección del último movimiento del historial, no como un movimiento nuevo separado.

INTERPRETACIÓN DEL LENGUAJE:
- Acepta mayúsculas, tildes omitidas, errores menores, modismos y frases incompletas.
- “gasté”, “pagué”, “compré”, “se me fueron”, “salió de mi cuenta” o “consumí” significan un gasto.
- “me pagaron”, “recibí”, “entró”, “me depositaron”, “cobré” o “gané” significan un ingreso.
- “guardé”, “aparté”, “puse para mi meta” o “quiero ahorrar” significan un aporte a una meta.
- “le presté”, “presté”, “me debe”, “le debo” o “quedó debiendo” significan una deuda.
- “efectivo”, “cash”, “plata en mano” o una cuenta cuyo tipo sea CASH identifican esa cuenta.
- Si el mensaje solo entrega un dato que faltaba, usa el historial para completar la operación.
- Ejemplos: “salieron 3 lucas en comida” = gasto 3000; “me entraron 50 mil” = ingreso 50000; “pagué el uber con la débito” = gasto en la cuenta de débito.

EJEMPLOS DE AMBIGÜEDAD QUE NO DEBES ADIVINAR:
- Usuario tiene dos cuentas CREDIT ("Visa Platinum", "Mastercard Black") y escribe "gasté 5000 con la tarjeta" → { "action": "unknown", "reply": "Tienes la Visa Platinum y la Mastercard Black, ¿con cuál fue?" }
- Usuario tiene varias metas y escribe "ahorré 20000" sin nombrar ninguna → { "action": "unknown", "reply": "¿A cuál de tus metas quieres aportar?" }
`;

    const requestBody = JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map((item) => ({
          role: item.role === "ai" ? ("assistant" as const) : ("user" as const),
          content: item.text,
        })),
        { role: "user", content: message },
      ],
      temperature: 0.1,
    });
    let response: Response | undefined;
    let lastFailure: "timeout" | "http_error" | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      try {
        response = await fetch(
          `${aiBaseUrl.replace(/\/$/, "")}/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: requestBody,
            signal: controller.signal,
          },
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          lastFailure = "timeout";
          if (attempt === 0) continue;
          return await fallbackResponse("timeout", fallback, userId, accounts);
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
      if (response.ok) break;
      lastFailure = "http_error";
      if (response.status < 500 || attempt === 1) {
        return await fallbackResponse("http_error", fallback, userId, accounts);
      }
    }

    if (!response?.ok) {
      return await fallbackResponse(
        lastFailure ?? "http_error",
        fallback,
        userId,
        accounts,
      );
    }

    const data = await response.json();
    const aiContent = data?.choices?.[0]?.message?.content;

    if (!aiContent) {
      return await fallbackResponse("invalid_json", fallback, userId, accounts);
    }

    const jsonStr = String(aiContent)
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed: ParsedAction;
    try {
      const candidate = aiActionSchema.parse(JSON.parse(jsonStr));
      parsed = normalizeParsedAction(candidate);
    } catch (error) {
      const reason = (() => {
        try {
          aiActionSchema.parse(JSON.parse(jsonStr));
          return "invalid_json";
        } catch (schemaError) {
          return schemaError instanceof Error && schemaError.name === "ZodError"
            ? "schema_validation_failed"
            : "invalid_json";
        }
      })();
      void error;
      return await fallbackResponse(reason, fallback, userId, accounts);
    }

    if (hasPendingTransaction(parsed)) {
      await savePendingAction(userId, "TRANSACTION", {
        amount: parsed.amount,
        description: parsed.description,
        type: parsed.type,
        categoryId: parsed.categoryId,
      });
    }

    return await executeParsedAction(parsed, userId, accounts);
  } catch (error) {
    console.error(
      "Error en proveedor de IA:",
      error instanceof Error ? error.name : "unknown",
    );
    return await fallbackResponse("http_error", fallback, userId, accounts);
  }
}
