import test from "node:test";
import assert from "node:assert/strict";

import {
  extractDebtDueDate,
  getDebtReminderPrompt,
  isPositiveDebtConfirmation,
  findMentionedAccount,
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
