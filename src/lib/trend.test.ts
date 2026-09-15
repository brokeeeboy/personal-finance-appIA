import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyTrend } from "./trend";

test("buildMonthlyTrend fills every requested month, even with no transactions", () => {
  const reference = new Date(2026, 5, 15); // 15 jun 2026
  const result = buildMonthlyTrend([], 3, reference);

  assert.deepEqual(
    result.map((p) => p.month),
    ["abr", "may", "jun"],
  );
  assert.ok(result.every((p) => p.income === 0 && p.expense === 0));
});

test("buildMonthlyTrend sums income and expense per month and ignores out-of-range transactions", () => {
  const reference = new Date(2026, 5, 15); // jun 2026
  const transactions = [
    { amount: 1000, type: "INCOME", date: new Date(2026, 4, 1) }, // may
    { amount: 300, type: "EXPENSE", date: new Date(2026, 4, 10) }, // may
    { amount: 500, type: "EXPENSE", date: new Date(2026, 5, 2) }, // jun
    { amount: 999, type: "INCOME", date: new Date(2025, 0, 1) }, // fuera de rango
  ];

  const result = buildMonthlyTrend(transactions, 2, reference);

  assert.deepEqual(result, [
    { month: "may", income: 1000, expense: 300 },
    { month: "jun", income: 0, expense: 500 },
  ]);
});
