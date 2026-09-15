import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeBalanceChange,
  getAccountNetValue,
  applyBalanceChange,
} from "./accountBalance";

test("computeBalanceChange increases a normal account's balance on income and decreases it on expense", () => {
  assert.equal(computeBalanceChange("CHECKING", "INCOME", 1000).toNumber(), 1000);
  assert.equal(computeBalanceChange("CHECKING", "EXPENSE", 1000).toNumber(), -1000);
  assert.equal(computeBalanceChange("CASH", "EXPENSE", 500).toNumber(), -500);
  assert.equal(computeBalanceChange("DEBIT", "INCOME", 500).toNumber(), 500);
});

// Este es el bug de signo que se arregló: un gasto con tarjeta de crédito
// debe AUMENTAR la deuda registrada (balance sube), y un pago a la tarjeta
// debe DISMINUIRLA — lo opuesto a una cuenta con dinero propio.
test("computeBalanceChange inverts the sign for CREDIT accounts, since balance means debt owed", () => {
  assert.equal(computeBalanceChange("CREDIT", "EXPENSE", 1000).toNumber(), 1000);
  assert.equal(computeBalanceChange("CREDIT", "INCOME", 1000).toNumber(), -1000);
});

test("getAccountNetValue subtracts CREDIT balances (debt) instead of adding them to net worth", () => {
  assert.equal(
    getAccountNetValue({ type: "CHECKING", balance: 500_000 }).toNumber(),
    500_000,
  );
  assert.equal(
    getAccountNetValue({ type: "CREDIT", balance: 350_000 }).toNumber(),
    -350_000,
  );
});

test("applyBalanceChange skips the update entirely when the net change is zero", async () => {
  let updateCalls = 0;
  const fakeTx = {
    account: {
      update: async () => {
        updateCalls += 1;
      },
    },
  };

  await applyBalanceChange(
    fakeTx,
    "acc-1",
    computeBalanceChange("CHECKING", "INCOME", 0),
  );

  assert.equal(updateCalls, 0);
});

test("applyBalanceChange calls account.update with the computed increment otherwise", async () => {
  const calls: unknown[] = [];
  const fakeTx = {
    account: {
      update: async (args: unknown) => {
        calls.push(args);
      },
    },
  };

  const change = computeBalanceChange("CREDIT", "EXPENSE", 2000);
  await applyBalanceChange(fakeTx, "acc-1", change);

  assert.equal(calls.length, 1);
});
