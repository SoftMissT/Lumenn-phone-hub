import assert from "node:assert";
import { computeWorldClock, normalizeClockSettings } from "../scripts/time/world-clock.mjs";

console.log("Executando testes: World Clock...");

const normalized = normalizeClockSettings({ timezone: "  UTC  ", displayYear: "2077", era: "Era X" });
assert.deepStrictEqual(normalized, { timezone: "UTC", displayYear: 2077, era: "Era X" });
assert.deepStrictEqual(normalizeClockSettings({ displayYear: -5 }), { timezone: "", displayYear: 0, era: "" });
assert.deepStrictEqual(normalizeClockSettings({ displayYear: "abc" }), { timezone: "", displayYear: 0, era: "" });
assert.deepStrictEqual(normalizeClockSettings(), { timezone: "", displayYear: 0, era: "" });
assert.strictEqual(normalizeClockSettings({ era: "x".repeat(99) }).era.length, 32);

const instant = new Date("2026-09-29T15:30:00Z");

const realYear = computeWorldClock(instant, { timezone: "UTC", displayYear: 0 }, "en-US");
assert.strictEqual(realYear.year, 2026);
assert.strictEqual(realYear.realYear, 2026);
assert.strictEqual(realYear.hasNarrativeYear, false);
assert.strictEqual(realYear.time, "15:30");
assert.strictEqual(realYear.day, 29);
assert.strictEqual(realYear.month, 9);
assert.strictEqual(realYear.timezone, "UTC");
assert.strictEqual(realYear.timezoneFellBack, false);

const narrative = computeWorldClock(instant, { timezone: "UTC", displayYear: 2077, era: "AC" }, "en-US");
assert.strictEqual(narrative.year, 2077);
assert.strictEqual(narrative.realYear, 2026);
assert.strictEqual(narrative.hasNarrativeYear, true);
assert.strictEqual(narrative.era, "AC");

const feb29 = computeWorldClock(new Date("2024-02-29T12:00:00Z"), { timezone: "UTC", displayYear: 2077 }, "en-US");
assert.deepStrictEqual([feb29.day, feb29.month, feb29.year, feb29.realYear], [29, 2, 2077, 2024]);

const fellBack = computeWorldClock(instant, { timezone: "Nope/Nowhere" }, "en-US");
assert.strictEqual(fellBack.timezoneFellBack, true);
assert.strictEqual(fellBack.timezoneRequested, "Nope/Nowhere");

const utc = computeWorldClock(instant, { timezone: "UTC" }, "en-US");
const saoPaulo = computeWorldClock(instant, { timezone: "America/Sao_Paulo" }, "en-US");
assert.strictEqual(utc.time, "15:30");
assert.strictEqual(saoPaulo.time, "12:30");
assert.notStrictEqual(utc.time, saoPaulo.time);

console.log("✅ World Clock: todos os testes passaram.");
