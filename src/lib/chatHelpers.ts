export function normalizeText(value: string) {
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
        /(?:gaste|gasté|gasto|gastado|compr[eé]|pagu[eé]|pago|me pagaron|ingres[eé]|ingreso|ahorr[eé]|ahorro|prest[eé]|prestamos|prestamo|prestó|le prest[eé]|te prest[eé])/gi,
        "",
      )
      .replace(/\b\d+(?:[.,]\d{3})*(?:[.,]\d+)?\b/g, " ")
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

export function findMentionedAccount(
  accounts: Array<{ id: string; name: string; type: string }>,
  text: string,
) {
  const normalized = normalizeText(text);
  const namedAccount = accounts.find((account) =>
    normalized.includes(normalizeText(account.name)),
  );

  if (namedAccount) return namedAccount;

  if (/\b(?:efectivo|cash)\b/.test(normalized)) {
    return accounts.find((account) =>
      /\b(?:efectivo|cash)\b/.test(normalizeText(account.name)),
    );
  }

  return undefined;
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

export type PendingTransactionDraft = {
  amount: number;
  description: string;
  type: string;
  categoryId?: string;
};

export const pendingTransactionDrafts = new Map<
  string,
  PendingTransactionDraft
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

export function parseFinanceFallback(
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
  const creditTerms = /(credito|crédito|tarjeta|visa|mastercard)/;
  const paymentVerb =
    /(pagu(?:e|é|o)|abon(?:e|é)|cancel(?:e|é)|liquid(?:e|é)|pag(?:o|a))/;
  const isCreditCardPayment = paymentVerb.test(text) && creditTerms.test(text);
  const isCreditCardPurchase =
    /(gast|compr|costo|consum|deuda)/.test(text) &&
    creditTerms.test(text) &&
    !paymentVerb.test(text);
  const isTransactionIntent =
    isCreditCardPayment ||
    isCreditCardPurchase ||
    /(gast|compr|costo|consum|se fue|me pagaron|ingres|deposit|gan|cobr|recib|arriendo)/.test(
      text,
    );
  const mentionsAccount =
    accounts.some((account) => text.includes(normalizeText(account.name))) ||
    /(debito|débito|credito|crédito|tarjeta|visa|mastercard)/.test(text);

  if (isTransactionIntent && accounts.length > 1 && !mentionsAccount) {
    return {
      action: "unknown",
      amount,
      description,
      type: /(gast|compr|costo|consum|deuda|se fue)/.test(text)
        ? "EXPENSE"
        : "INCOME",
      categoryId: matchedCategory?.id,
      reply: "¿En qué cuenta debo registrar este movimiento?",
    };
  }

  if (isCreditCardPayment) {
    return {
      action: "transaction",
      amount,
      description: description || "Pago a tarjeta de crédito",
      type: "INCOME",
      accountId: matchedAccount?.id,
      categoryId: matchedCategory?.id,
    };
  }

  if (isCreditCardPurchase) {
    return {
      action: "transaction",
      amount,
      description,
      type: "EXPENSE",
      accountId: matchedAccount?.id,
      categoryId: matchedCategory?.id,
    };
  }

  if (/(gast|compr|costo|consum|deuda|se fue|se fue)/.test(text)) {
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

export { pendingDebtDrafts };
