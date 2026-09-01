"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseCurrencyNumber(value: string) {
  const cleaned = value
    .replace(/[$\s]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  if (!cleaned) return 0;

  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

function extractAmount(message: string) {
  const matches = [...message.matchAll(/\d+(?:[.,]\d{3})*(?:[.,]\d+)?/g)];
  if (matches.length === 0) return 0;

  const amounts = matches.map((match) => parseCurrencyNumber(match[0]));
  return Math.max(...amounts.filter((amount) => amount > 0));
}

function cleanDescription(message: string) {
  return (
    message
      .replace(
        /(?:gasté|gasto|gastado|compré|compré|compré|pagué|pago|me pagaron|ingresé|ingreso|ahorré|ahorro|presté|prestamos|prestamo|prestó|le presté|te presté)/gi,
        "",
      )
      .replace(
        /\b(?:con|por|en|de|mi|tu|a|al|la|el|para|hoy|ayer|hace|pago|pagando|con la|con el)\b/gi,
        " ",
      )
      .replace(/\s+/g, " ")
      .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
      .trim() || "Movimiento financiero"
  );
}

function matchAccount(
  accounts: Array<{ id: string; name: string; type: string }>,
  text: string,
) {
  const normalized = normalizeText(text);

  const ranked = [...accounts].sort((a, b) => {
    const aMatch = normalizeText(a.name).includes(normalized) ? 1 : 0;
    const bMatch = normalizeText(b.name).includes(normalized) ? 1 : 0;
    return bMatch - aMatch;
  });

  if (normalized.includes("debito") || normalized.includes("débito")) {
    const debitAccount = accounts.find(
      (account) =>
        normalizeText(account.name).includes("debito") ||
        normalizeText(account.name).includes("debito"),
    );
    if (debitAccount) return debitAccount;
  }

  if (
    normalized.includes("visa") ||
    normalized.includes("mastercard") ||
    normalized.includes("credito") ||
    normalized.includes("crédito")
  ) {
    const creditAccount = accounts.find(
      (account) =>
        normalizeText(account.name).includes("visa") ||
        normalizeText(account.name).includes("mastercard") ||
        normalizeText(account.name).includes("credito") ||
        normalizeText(account.name).includes("crédito"),
    );
    if (creditAccount) return creditAccount;
  }

  return ranked[0] ?? accounts[0];
}

function matchCategory(
  categories: Array<{ id: string; name: string }>,
  text: string,
) {
  const normalized = normalizeText(text);

  const keywords: Record<string, string[]> = {
    comida: [
      "almuerzo",
      "desayuno",
      "cena",
      "comida",
      "restaurante",
      "supermercado",
      "mercado",
      "delivery",
    ],
    transporte: [
      "micro",
      "bus",
      "uber",
      "taxi",
      "auto",
      "bencina",
      "gasolina",
      "transporte",
    ],
    hogar: [
      "casa",
      "arriendo",
      "luz",
      "agua",
      "internet",
      "servicios",
      "telefono",
    ],
    salud: ["farmacia", "medico", "consulta", "salud"],
    ocio: ["cine", "pelicula", "entretenimiento", "juegos", "ocio"],
    compras: ["ropa", "compra", "tienda", "compras"],
    ingresos: ["sueldo", "arriendo", "venta", "ingreso", "pago"],
  };

  for (const [categoryName, terms] of Object.entries(keywords)) {
    const categoryMatch = categories.find(
      (category) =>
        normalizeText(category.name).includes(categoryName) ||
        terms.some((term) => normalized.includes(term)),
    );

    if (categoryMatch) return categoryMatch;
  }

  return categories[0];
}

function matchGoal(goals: Array<{ id: string; name: string }>, text: string) {
  const normalized = normalizeText(text);

  const goalMatch = goals.find(
    (goal) =>
      normalizeText(goal.name).includes(normalized.split(" ")[0]) ||
      normalizeText(goal.name).includes("vacaciones") ||
      normalizeText(goal.name).includes("meta"),
  );

  return goalMatch ?? goals[0];
}

function extractPersonName(message: string) {
  const normalized = message.trim();
  const match = normalized.match(
    /(?:a|al|la|para)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ'\- ]+)/i,
  );
  if (match?.[1]) return match[1].trim();

  return "persona";
}

const pendingDebtDrafts = new Map<
  string,
  {
    type: string;
    personName: string;
    amount: number;
    description: string;
  }
>();

function getMonthNumber(value: string) {
  const monthMap: Record<string, number> = {
    enero: 0,
    feb: 1,
    febrero: 1,
    mar: 2,
    marzo: 2,
    abr: 3,
    abril: 3,
    may: 4,
    mayo: 4,
    jun: 5,
    junio: 5,
    jul: 6,
    julio: 6,
    ago: 7,
    agosto: 7,
    sep: 8,
    septiembre: 8,
    oct: 9,
    octubre: 9,
    nov: 10,
    noviembre: 10,
    dic: 11,
    diciembre: 11,
  };

  return monthMap[normalizeText(value)] ?? -1;
}

export function extractDebtDueDate(message: string): Date | null {
  const text = message.toLowerCase();
  const now = new Date();

  if (/(hoy|today)/.test(text)) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (/(mañana|tomorrow)/.test(text)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    if (day && month && year) {
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }

  const slashMatch = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    if (day && month && year) {
      const normalizedYear = year < 100 ? 2000 + year : year;
      const date = new Date(normalizedYear, month - 1, day);
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }

  const monthMatch = text.match(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
  );
  if (monthMatch) {
    const day = Number(monthMatch[1]);
    const month = getMonthNumber(monthMatch[2]);
    const year = now.getFullYear();

    if (day && month >= 0) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }

  const monthNameMatch = text.match(
    /(el\s+)?(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
  );
  if (monthNameMatch) {
    const day = Number(monthNameMatch[2]);
    const month = getMonthNumber(monthNameMatch[3]);
    const year = now.getFullYear();

    if (day && month >= 0) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }

  return null;
}

export function isPositiveDebtConfirmation(message: string) {
  const text = normalizeText(message);
  return /(si|sí|ya|pagué|pague|pagada|pagado|cancelé|cancele|cancelado|listo|confirmo|hecho)/.test(
    text,
  );
}

export function getDebtReminderPrompt(
  debts: Array<{
    id: string;
    personName: string;
    amount: number;
    status: string;
    dueDate: Date | string | null;
  }>,
  now = new Date(),
) {
  const upcomingDebts = debts
    .filter(
      (debt) =>
        debt.status === "PENDING" &&
        debt.dueDate &&
        new Date(debt.dueDate).getTime() >= now.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate as Date).getTime() -
        new Date(b.dueDate as Date).getTime(),
    );

  if (upcomingDebts.length === 0) return null;

  const nextDebt = upcomingDebts[0];
  const dueDate = new Date(nextDebt.dueDate as Date);
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return `Recordatorio: la deuda de ${nextDebt.personName} por $${nextDebt.amount} vence ${diffDays === 0 ? "hoy" : "mañana"}. ¿Ya la pagaste?`;
  }

  return null;
}

function parseFinanceFallback(
  message: string,
  accounts: Array<{ id: string; name: string; type: string }>,
  categories: Array<{ id: string; name: string }>,
  goals: Array<{ id: string; name: string }>,
) {
  const text = normalizeText(message);
  const amount = extractAmount(message);

  if (!text || !amount) {
    return {
      action: "unknown",
      reply:
        "No pude detectar un monto o la acción en tu mensaje. Intenta algo como: 'Gasté 8500 en el almuerzo de hoy'.",
    };
  }

  const description = cleanDescription(message);
  const matchedAccount = matchAccount(accounts, text) ?? accounts[0];
  const matchedCategory = matchCategory(categories, text) ?? categories[0];
  const matchedGoal = matchGoal(goals, text) ?? goals[0];

  if (/(gast|compr|pagu|costo|consum|deuda|se fue|se fue)/.test(text)) {
    return {
      action: "transaction",
      amount,
      description,
      type: "EXPENSE",
      accountId: matchedAccount?.id,
      categoryId: matchedCategory?.id,
    };
  }

  if (/(me pagaron|ingres|deposit|gan|cobr|recib|arriendo)/.test(text)) {
    return {
      action: "transaction",
      amount,
      description,
      type: "INCOME",
      accountId: matchedAccount?.id,
      categoryId: matchedCategory?.id,
    };
  }

  if (
    /(prest|prestamos|prestamo|debe|debemos|te debo|te debe|le debes|le debo)/.test(
      text,
    )
  ) {
    const dueDate = extractDebtDueDate(message);
    if (!dueDate) {
      return {
        action: "debt",
        type: /(?:te debe|le debes|le debo|debemos)/.test(text)
          ? "OWE_ME"
          : "I_OWE",
        personName: extractPersonName(message),
        amount,
        description,
        askForDueDate: true,
        reply:
          "¿Para cuándo vence ese pago? Te lo guardo con fecha y te recordaré un día antes.",
      };
    }

    return {
      action: "debt",
      type: /(?:te debe|le debes|le debo|debemos)/.test(text)
        ? "OWE_ME"
        : "I_OWE",
      personName: extractPersonName(message),
      amount,
      description,
      dueDate: dueDate.toISOString(),
    };
  }

  if (/(ahorr|meta|aport|abon)/.test(text)) {
    return {
      action: "goal",
      goalId: matchedGoal?.id,
      amount,
    };
  }

  return {
    action: "unknown",
    reply:
      "¿Quieres registrar un gasto, un ingreso, una deuda o un aporte a una meta?",
  };
}

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
