import test from "node:test";
import assert from "node:assert/strict";

import {
  extractDebtDueDate,
  getDebtReminderPrompt,
  isPositiveDebtConfirmation,
} from "./chatActions";

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
