import assert from "node:assert";
import {
  browserTimezone,
  getZonedParts,
  isLeapYear,
  isValidTimezone,
  resolveTimezone
} from "../scripts/time/timezone.mjs";

console.log("Executando testes: Timezone...");

assert.strictEqual(isValidTimezone("America/Sao_Paulo"), true);
assert.strictEqual(isValidTimezone("UTC"), true);
assert.strictEqual(isValidTimezone("Asia/Kolkata"), true);
assert.strictEqual(isValidTimezone("Nope/Nowhere"), false);
assert.strictEqual(isValidTimezone(""), false);
assert.strictEqual(isValidTimezone(null), false);

const valid = resolveTimezone("Asia/Kolkata");
assert.strictEqual(valid.fellBack, false);
assert.strictEqual(valid.timezone, "Asia/Kolkata");

const invalid = resolveTimezone("Nope/Nowhere");
assert.strictEqual(invalid.fellBack, true);
assert.strictEqual(isValidTimezone(invalid.timezone), true);

const unset = resolveTimezone("");
assert.strictEqual(unset.fellBack, false);
assert.strictEqual(unset.timezone, browserTimezone());

const beforeDst = getZonedParts(new Date("2026-03-08T06:59:00Z"), "America/New_York");
assert.deepStrictEqual([beforeDst.hour, beforeDst.minute], [1, 59]);
const afterDst = getZonedParts(new Date("2026-03-08T07:00:00Z"), "America/New_York");
assert.deepStrictEqual([afterDst.hour, afterDst.minute], [3, 0]);

const kolkata = getZonedParts(new Date("2026-01-01T00:00:00Z"), "Asia/Kolkata");
assert.deepStrictEqual([kolkata.hour, kolkata.minute, kolkata.day], [5, 30, 1]);

const leap = getZonedParts(new Date("2024-02-29T12:00:00Z"), "UTC");
assert.deepStrictEqual([leap.year, leap.month, leap.day], [2024, 2, 29]);

assert.strictEqual(isLeapYear(2024), true);
assert.strictEqual(isLeapYear(2100), false);
assert.strictEqual(isLeapYear(2000), true);
assert.strictEqual(isLeapYear(2077), false);

console.log("✅ Timezone: todos os testes passaram.");
