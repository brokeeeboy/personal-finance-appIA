import test from "node:test";
import assert from "node:assert/strict";

import {
  extractDebtDueDate,
  getDebtReminderPrompt,
  isPositiveDebtConfirmation,
  findMentionedAccount,
  resolveAccountMention,
  parseFinanceFallback,
} from "../lib/chatHelpers";

test("extractDebtDueDate parses a date from a debt message", () => {
  const result = extractDebtDueDate(
    "le presté 15000 a José y lo pago el 12/09/2026",
  );
  assert.ok(result);
  assert.equal(result?.getDate(), 12);
  assert.equal(result?.getMonth(), 8);
  assert.equal(result?.getFullYear(), 2026);
});

test("extractDebtDueDate parses ISO dates too", () => {
  const result = extractDebtDueDate(
    "le presté 15000 a José y lo pago el 2026-09-12",
  );
  assert.ok(result);
  assert.equal(result?.getDate(), 12);
  assert.equal(result?.getMonth(), 8);
  assert.equal(result?.getFullYear(), 2026);
});

test("getDebtReminderPrompt returns a reminder for a debt due tomorrow", () => {
  const today = new Date("2026-09-01T12:00:00");
  const result = getDebtReminderPrompt(
    [
      {
        id: "1",
        personName: "José",
        amount: 15000,
        status: "PENDING",
        dueDate: new Date("2026-09-02T00:00:00"),
      },
    ],
    today,
  );

  assert.ok(result);
  assert.match(result ?? "", /José/i);
});

test("isPositiveDebtConfirmation matches payment confirmations", () => {
  assert.equal(isPositiveDebtConfirmation("si, ya lo pagué"), true);
  assert.equal(isPositiveDebtConfirmation("todavía no"), false);
});

test("parseFinanceFallback treats paying a credit card as a credit payment, not an expense", () => {
  const result = parseFinanceFallback(
    "pague 20000 credito",
    [{ id: "acc-1", name: "Visa Platinum", type: "CREDIT" }],
    [{ id: "cat-1", name: "Servicios" }],
    [],
  );

  assert.equal(result.action, "transaction");
  assert.equal(result.type, "INCOME");
  assert.equal(result.accountId, "acc-1");
  assert.equal(result.amount, 20000);
});

test("parseFinanceFallback treats a purchase with a credit card as an expense", () => {
  const result = parseFinanceFallback(
    "compré 25000 con la tarjeta de crédito",
    [{ id: "acc-1", name: "Visa Platinum", type: "CREDIT" }],
    [{ id: "cat-1", name: "Compras" }],
    [],
  );

  assert.equal(result.action, "transaction");
  assert.equal(result.type, "EXPENSE");
  assert.equal(result.accountId, "acc-1");
  assert.equal(result.amount, 25000);
});

test("parseFinanceFallback keeps transaction details while asking for an account", () => {
  const result = parseFinanceFallback(
    "gaste 800 en sushi",
    [
      { id: "cash-1", name: "Efectivo", type: "CHECKING" },
      { id: "card-1", name: "Visa", type: "CREDIT" },
    ],
    [{ id: "cat-1", name: "Comida" }],
    [],
  );

  assert.equal(result.action, "unknown");
  assert.equal(result.amount, 800);
  assert.equal(result.type, "EXPENSE");
  assert.equal(result.description, "sushi");
  assert.equal(result.reply, "¿En qué cuenta debo registrar este movimiento?");
});

test("findMentionedAccount recognizes cash accounts and common spelling variants", () => {
  const accounts = [
    { id: "cash-1", name: "Billetera", type: "CASH" },
    { id: "checking-1", name: "Cuenta Corriente", type: "CHECKING" },
  ];

  assert.equal(findMentionedAccount(accounts, "EFECTIVO")?.id, "cash-1");
  assert.equal(findMentionedAccount(accounts, "fectivo")?.id, "cash-1");
});

// Regresión: antes findMentionedAccount solo reconocía "efectivo" y nada
// más, aunque el bot sí le preguntaba "¿en qué cuenta?" a cualquier mensaje
// que mencionara "tarjeta" o "débito". El usuario contestaba "con la
// tarjeta" y el bot no lo entendía, repitiendo la pregunta en loop.
test("findMentionedAccount recognizes a single matching card by keyword, not just cash", () => {
  const accounts = [
    { id: "checking-1", name: "Cuenta Corriente", type: "CHECKING" },
    { id: "credit-1", name: "Visa Platinum", type: "CREDIT" },
  ];

  assert.equal(findMentionedAccount(accounts, "con la tarjeta")?.id, "credit-1");
  assert.equal(findMentionedAccount(accounts, "con la debito")?.id, "checking-1");
});

test("resolveAccountMention flags ambiguity instead of silently picking the first matching card", () => {
  const accounts = [
    { id: "credit-1", name: "Visa Platinum", type: "CREDIT" },
    { id: "credit-2", name: "Mastercard Black", type: "CREDIT" },
  ];

  const result = resolveAccountMention(accounts, "pagué con la tarjeta");
  assert.equal(result.account, undefined);
  assert.equal(result.ambiguous, true);
});

test("parseFinanceFallback asks which card specifically when more than one matches the same generic mention", () => {
  const accounts = [
    { id: "credit-1", name: "Visa Platinum", type: "CREDIT" },
    { id: "credit-2", name: "Mastercard Black", type: "CREDIT" },
  ];

  const result = parseFinanceFallback(
    "gasté 5000 con la tarjeta",
    accounts,
    [],
    [],
  );

  assert.equal(result.action, "unknown");
  assert.match(result.reply ?? "", /más de una cuenta/i);
});

test("parseFinanceFallback can recover a bare expense once an account is selected", () => {
  const account = { id: "cash-1", name: "Efectivo", type: "CASH" };
  const result = parseFinanceFallback("GASTE 3000", [account], [], []);

  assert.equal(result.action, "transaction");
  assert.equal(result.amount, 3000);
  assert.equal(result.type, "EXPENSE");
  assert.equal(result.accountId, account.id);
});

test("parseFinanceFallback understands colloquial amounts and expense phrases", () => {
  const account = { id: "cash-1", name: "Efectivo", type: "CASH" };

  const result = parseFinanceFallback(
    "se me fueron 3 lucas en completos",
    [account],
    [],
    [],
  );

  assert.equal(result.action, "transaction");
  assert.equal(result.amount, 3000);
  assert.equal(result.type, "EXPENSE");
});

test("parseFinanceFallback understands colloquial income phrases", () => {
  const account = {
    id: "checking-1",
    name: "Cuenta Corriente",
    type: "CHECKING",
  };

  const result = parseFinanceFallback(
    "me entraron 50 mil del trabajo",
    [account],
    [],
    [],
  );

  assert.equal(result.action, "transaction");
  assert.equal(result.amount, 50000);
  assert.equal(result.type, "INCOME");
});

test("parseFinanceFallback assigns the category that actually matches the message, not always the first one", () => {
  const account = { id: "acc-1", name: "Efectivo", type: "CASH" };
  // "Alimentación" va primero en la lista a propósito: antes cualquier
  // palabra clave reconocida (aunque fuera de otro rubro) devolvía siempre
  // la primera categoría del usuario.
  const categories = [
    { id: "cat-food", name: "Alimentación" },
    { id: "cat-transport", name: "Transporte" },
  ];

  const result = parseFinanceFallback(
    "gasté 5000 en el uber",
    [account],
    categories,
    [],
  );

  assert.equal(result.action, "transaction");
  assert.equal(result.categoryId, "cat-transport");
});

test("parseFinanceFallback matches the account named in the message instead of defaulting to the first one", () => {
  const accounts = [
    { id: "acc-afp", name: "AFP Cuenta", type: "CHECKING" },
    { id: "acc-bci", name: "Cuenta BCI", type: "CHECKING" },
  ];

  const result = parseFinanceFallback(
    "gasté 5000 en el supermercado con mi cuenta bci",
    accounts,
    [],
    [],
  );

  assert.equal(result.action, "transaction");
  assert.equal(result.accountId, "acc-bci");
});

test("parseFinanceFallback does not confuse a date mentioned in the message with the amount", () => {
  const account = { id: "acc-1", name: "Efectivo", type: "CASH" };

  const result = parseFinanceFallback(
    "gasté 800 en el almuerzo el 2026-09-12",
    [account],
    [],
    [],
  );

  assert.equal(result.action, "transaction");
  assert.equal(result.amount, 800);
});

test("parseFinanceFallback contributes to the goal actually named in the message", () => {
  const account = { id: "acc-1", name: "Efectivo", type: "CASH" };
  const goals = [
    { id: "goal-vacation", name: "Vacaciones" },
    { id: "goal-car", name: "Auto nuevo" },
  ];

  const result = parseFinanceFallback(
    "ahorré 100000 para el auto",
    [account],
    [],
    goals,
  );

  assert.equal(result.action, "goal");
  assert.equal(result.goalId, "goal-car");
});

test("parseFinanceFallback reports no amount instead of computing -Infinity for a zero amount", () => {
  const account = { id: "acc-1", name: "Efectivo", type: "CASH" };
  const result = parseFinanceFallback("gasté 0 en nada", [account], [], []);

  assert.equal(result.action, "unknown");
  assert.equal("amount" in result, false);
});

// Regresión: antes, si ninguna palabra clave calzaba con una categoría del
// usuario, igual se asignaba la primera categoría de la lista en silencio
// (podía "categorizar" un gasto de Netflix como "Salud" solo porque era la
// primera categoría alfabéticamente). Ahora se deja sin categoría.
test("parseFinanceFallback leaves the category empty instead of guessing when nothing matches", () => {
  const account = { id: "acc-1", name: "Efectivo", type: "CASH" };
  const categories = [
    { id: "cat-a", name: "Alimentación" },
    { id: "cat-b", name: "Zapatería" },
  ];

  const result = parseFinanceFallback(
    "gasté 5000 en xyzxyz",
    [account],
    categories,
    [],
  );

  assert.equal(result.action, "transaction");
  assert.equal(result.categoryId, undefined);
});

// Regresión: antes, con varias metas y ningún nombre mencionado, se le
// abonaba plata a la primera meta de la lista sin preguntar — un error
// financiero real, no solo una etiqueta mal puesta.
test("parseFinanceFallback asks which goal when there is more than one and none is named", () => {
  const account = { id: "acc-1", name: "Efectivo", type: "CASH" };
  const goals = [
    { id: "goal-vacation", name: "Vacaciones" },
    { id: "goal-car", name: "Auto nuevo" },
  ];

  const result = parseFinanceFallback(
    "ahorré 100000",
    [account],
    [],
    goals,
  );

  assert.equal(result.action, "unknown");
  assert.match(result.reply ?? "", /cuál de tus metas/i);
});

test("parseFinanceFallback contributes to the only goal without asking when there is no ambiguity", () => {
  const account = { id: "acc-1", name: "Efectivo", type: "CASH" };
  const goals = [{ id: "goal-vacation", name: "Vacaciones" }];

  const result = parseFinanceFallback(
    "ahorré 100000",
    [account],
    [],
    goals,
  );

  assert.equal(result.action, "goal");
  assert.equal(result.goalId, "goal-vacation");
});
