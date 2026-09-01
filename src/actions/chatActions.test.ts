import test from "node:test";
import assert from "node:assert/strict";

import {
  extractDebtDueDate,
  getDebtReminderPrompt,
  isPositiveDebtConfirmation,
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
