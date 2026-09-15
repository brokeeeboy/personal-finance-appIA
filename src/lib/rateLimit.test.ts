import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "./rateLimit";

test("checkRateLimit allows requests under the limit and blocks once it's reached", () => {
  const key = `test-${Math.random()}`;

  for (let i = 0; i < 3; i++) {
    assert.equal(checkRateLimit(key, 3, 60_000).allowed, true);
  }

  const blocked = checkRateLimit(key, 3, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 0);
});

test("checkRateLimit keeps independent counters per key", () => {
  const keyA = `a-${Math.random()}`;
  const keyB = `b-${Math.random()}`;

  assert.equal(checkRateLimit(keyA, 1, 60_000).allowed, true);
  assert.equal(checkRateLimit(keyA, 1, 60_000).allowed, false);
  assert.equal(checkRateLimit(keyB, 1, 60_000).allowed, true);
});

test("checkRateLimit resets once the window has passed", () => {
  const key = `reset-${Math.random()}`;

  assert.equal(checkRateLimit(key, 1, 10).allowed, true);
  assert.equal(checkRateLimit(key, 1, 10).allowed, false);
});
