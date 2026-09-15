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

// Fechas en el mensaje (ej. "12/09/2026", "2026-09-12", "12 de septiembre")
// no deben confundirse con el monto de la transacción, así que se eliminan
// del texto antes de buscar números que representen plata.
const DATE_MENTION_PATTERNS = [
  /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  /\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi,
];

function stripDateMentions(message: string) {
  return DATE_MENTION_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, " "),
    message,
  );
}

function extractAmount(message: string) {
  const textWithoutDates = stripDateMentions(message);
  const matches = [
    ...textWithoutDates.matchAll(
      /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)(?:\s*(mil|lucas?|k|millones?))?/gi,
    ),
  ];
  if (matches.length === 0) return 0;

  const amounts = matches
    .map((match) => {
      const base = parseCurrencyNumber(match[1]);
      const unit = normalizeText(match[2] ?? "");
      if (
        unit === "mil" ||
        unit === "lucas" ||
        unit === "luca" ||
        unit === "k"
      ) {
        return base * 1_000;
      }
      if (unit === "millon" || unit === "millones") return base * 1_000_000;
      return base;
    })
    .filter((amount) => amount > 0);

  // Si ningún número válido quedó tras filtrar ceros/negativos, no inventamos
  // un monto (antes esto podía devolver -Infinity con Math.max de un array vacío).
  return amounts.length > 0 ? Math.max(...amounts) : 0;
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

export interface AccountLike {
  id: string;
  name: string;
  type: string;
}

interface AccountTypeRule {
  pattern: RegExp;
  matches: (account: AccountLike) => boolean;
}

// Antes existían dos funciones separadas con listas de palabras clave
// distintas: una decidía SI el mensaje mencionaba una cuenta (y sí
// reconocía "tarjeta"/"debito"/"credito") y otra decidía A CUÁL cuenta se
// refería (y solo sabía reconocer "efectivo"). Resultado real: el bot
// preguntaba "¿en qué cuenta?", el usuario contestaba "con la tarjeta" y el
// bot no lo entendía, repitiendo la misma pregunta en loop. Ahora hay una
// sola fuente de verdad para ambas cosas.
const ACCOUNT_TYPE_RULES: AccountTypeRule[] = [
  {
    pattern: /\b(debito|débito)\b/,
    matches: (account) =>
      account.type === "DEBIT" ||
      account.type === "CHECKING" ||
      normalizeText(account.name).includes("debito"),
  },
  {
    pattern: /\b(visa|mastercard|credito|crédito|tarjeta)\b/,
    matches: (account) =>
      account.type === "CREDIT" ||
      normalizeText(account.name).includes("visa") ||
      normalizeText(account.name).includes("mastercard") ||
      normalizeText(account.name).includes("credito"),
  },
  {
    pattern: /\b(e?fectivo|cash|plata en mano)\b/,
    matches: (account) =>
      account.type === "CASH" ||
      normalizeText(account.name).includes("efectivo"),
  },
];

/**
 * Resuelve a qué cuenta se refiere un mensaje. Si el mensaje solo da una
 * pista genérica (p. ej. "tarjeta") y el usuario tiene más de una cuenta de
 * ese tipo, no adivina cuál: devuelve `ambiguous: true` para que quien
 * llama pida el nombre exacto en vez de registrar el movimiento en la
 * cuenta equivocada en silencio.
 */
export function resolveAccountMention(
  accounts: AccountLike[],
  text: string,
): { account?: AccountLike; ambiguous: boolean } {
  const normalized = normalizeText(text);

  const namedAccount = accounts.find((account) =>
    normalized.includes(normalizeText(account.name)),
  );
  if (namedAccount) return { account: namedAccount, ambiguous: false };

  for (const rule of ACCOUNT_TYPE_RULES) {
    if (!rule.pattern.test(normalized)) continue;
    const candidates = accounts.filter(rule.matches);
    if (candidates.length === 1) {
      return { account: candidates[0], ambiguous: false };
    }
    if (candidates.length > 1) {
      return { ambiguous: true };
    }
  }

  return { ambiguous: false };
}

export function findMentionedAccount(
  accounts: AccountLike[],
  text: string,
) {
  return resolveAccountMention(accounts, text).account;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
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

// Los nombres de categorías reales de un usuario ("Alimentación",
// "Entretenimiento") casi nunca calzan letra por letra con la clave interna
// ("comida", "ocio"), así que cada clave necesita sus propios alias.
const CATEGORY_NAME_ALIASES: Record<string, string[]> = {
  comida: ["comida", "alimentacion", "alimenticio", "alimentos"],
  transporte: ["transporte", "movilizacion"],
  hogar: ["hogar", "casa", "vivienda", "arriendo"],
  salud: ["salud", "medico", "farmacia"],
  ocio: ["ocio", "entretenimiento", "diversion"],
  compras: ["compras", "ropa", "vestuario"],
  ingresos: ["ingresos", "ingreso", "sueldo", "remuneracion"],
};

function matchCategory(
  categories: Array<{ id: string; name: string }>,
  text: string,
) {
  const normalized = normalizeText(text);

  for (const [key, terms] of Object.entries(CATEGORY_KEYWORDS)) {
    // Antes se evaluaba "¿alguna categoría del usuario matchea?" con un OR que
    // no dependía de la categoría (terms.some(...) es igual para todas), así
    // que `find` siempre devolvía la primera categoría de la lista apenas
    // aparecía cualquier palabra clave, sin importar el rubro real.
    const messageMentionsCategory =
      terms.some((term) => normalized.includes(term)) ||
      normalized.includes(key);
    if (!messageMentionsCategory) continue;

    const aliases = CATEGORY_NAME_ALIASES[key] ?? [key];
    const category = categories.find((candidate) =>
      aliases.some((alias) => normalizeText(candidate.name).includes(alias)),
    );
    if (category) return category;
  }

  // Sin coincidencia real no adivinamos: mejor dejar la transacción sin
  // categoría (el usuario la puede asignar después) que categorizarla mal
  // silenciosamente con la primera categoría de la lista.
  return undefined;
}

function matchGoal(goals: Array<{ id: string; name: string }>, text: string) {
  const normalized = normalizeText(text);

  // Antes solo se comparaba con la primera palabra del mensaje (a menudo un
  // verbo como "ahorre") y, si eso fallaba, se buscaba literalmente
  // "vacaciones" o "meta" DENTRO DEL NOMBRE de la meta -no en el mensaje-,
  // lo que casi nunca reflejaba lo que el usuario realmente escribió.
  const directMatch = goals.find((goal) =>
    normalized.includes(normalizeText(goal.name)),
  );
  if (directMatch) return directMatch;

  const words = normalized.split(/\s+/).filter((word) => word.length > 3);
  // Sin coincidencia, devolvemos undefined: a diferencia de la categoría,
  // aportar plata a la meta equivocada es un error financiero real, así que
  // quien llama debe preguntar en vez de que esta función adivine.
  return goals.find((goal) => {
    const goalName = normalizeText(goal.name);
    return words.some((word) => goalName.includes(word));
  });
}

function extractPersonName(message: string) {
  const normalized = message.trim();
  const match = normalized.match(
    /(?:a|al|la|para)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ'\- ]+)/i,
  );
  if (match?.[1]) return match[1].trim();

  return "persona";
}

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
  const accountResolution = resolveAccountMention(accounts, text);
  const matchedAccount =
    accountResolution.account ??
    (accounts.length === 1 ? accounts[0] : undefined);
  const matchedCategory = matchCategory(categories, text);
  const matchedGoal = matchGoal(goals, text);
  const creditTerms = /(credito|crédito|tarjeta|visa|mastercard)/;
  const paymentVerb =
    /(pagu(?:e|é|o)|abon(?:e|é)|cancel(?:e|é)|liquid(?:e|é)|pag(?:o|a))/;
  const isCreditCardPayment = paymentVerb.test(text) && creditTerms.test(text);
  const isCreditCardPurchase =
    /(gast|compr|costo|consum|deuda)/.test(text) &&
    creditTerms.test(text) &&
    !paymentVerb.test(text);
  const isExpenseIntent =
    /(gast|compr|pagu|costo|consum|salio|salieron|se fue|se me fue|deuda)/.test(
      text,
    );
  const isTransactionIntent =
    isExpenseIntent ||
    isCreditCardPayment ||
    isCreditCardPurchase ||
    /(me pagaron|ingres|deposit|entro|entraron|gan|cobr|recib|arriendo)/.test(
      text,
    );
  if (isTransactionIntent && accounts.length > 1 && !matchedAccount) {
    return {
      action: "unknown",
      amount,
      description,
      type: isExpenseIntent ? "EXPENSE" : "INCOME",
      categoryId: matchedCategory?.id,
      reply: accountResolution.ambiguous
        ? "Tienes más de una cuenta de ese tipo. ¿Me dices el nombre exacto de la cuenta?"
        : "¿En qué cuenta debo registrar este movimiento?",
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

  if (isExpenseIntent) {
    return {
      action: "transaction",
      amount,
      description,
      type: "EXPENSE",
      accountId: matchedAccount?.id,
      categoryId: matchedCategory?.id,
    };
  }

  if (
    /(me pagaron|ingres|deposit|entro|entraron|gan|cobr|recib|arriendo)/.test(
      text,
    )
  ) {
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
    if (goals.length === 0) {
      return {
        action: "unknown",
        reply:
          "Aún no tienes ninguna meta de ahorro creada. Crea una en la sección 'Metas' y te ayudo a aportarle.",
      };
    }

    if (!matchedGoal && goals.length > 1) {
      return {
        action: "unknown",
        amount,
        reply: "¿A cuál de tus metas quieres aportar?",
      };
    }

    return {
      action: "goal",
      goalId: (matchedGoal ?? goals[0]).id,
      amount,
    };
  }

  return {
    action: "unknown",
    reply:
      "¿Quieres registrar un gasto, un ingreso, una deuda o un aporte a una meta?",
  };
}
