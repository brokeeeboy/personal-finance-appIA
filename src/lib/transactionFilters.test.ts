import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTransactionWhere } from "./transactionFilters";

test("buildTransactionWhere always scopes to the given user and ignores an invalid type", () => {
  const where = buildTransactionWhere("user-1", { type: "NOT_A_TYPE" });
  assert.equal(where.userId, "user-1");
  assert.equal(where.type, undefined);
});

test("buildTransactionWhere applies account, category, type and search filters", () => {
  const where = buildTransactionWhere("user-1", {
    type: "EXPENSE",
    accountId: "acc-1",
    categoryId: "cat-1",
    q: "  supermercado  ",
  });

  assert.equal(where.type, "EXPENSE");
  assert.equal(where.accountId, "acc-1");
  assert.equal(where.categoryId, "cat-1");
  assert.deepEqual(where.description, {
    contains: "supermercado",
    mode: "insensitive",
  });
});

test("buildTransactionWhere omits the description filter for a blank search", () => {
  const where = buildTransactionWhere("user-1", { q: "   " });
  assert.equal(where.description, undefined);
});

test("buildTransactionWhere builds an inclusive date range, extending 'to' through the end of that day", () => {
  const where = buildTransactionWhere("user-1", {
    from: "2026-03-01",
    to: "2026-03-05",
  });

  const dateFilter = where.date as { gte?: Date; lte?: Date };
  assert.equal(dateFilter.gte?.toISOString().startsWith("2026-03-01"), true);
  assert.equal(dateFilter.lte?.getHours(), 23);
  assert.equal(dateFilter.lte?.getMinutes(), 59);
});

test("buildTransactionWhere ignores invalid dates instead of throwing", () => {
  const where = buildTransactionWhere("user-1", { from: "not-a-date" });
  assert.equal(where.date, undefined);
});
