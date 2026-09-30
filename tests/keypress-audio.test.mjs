import assert from "node:assert";
import {
  isPhoneSoundEnabled,
  playKeypressSound,
  preloadKeypressAudio
} from "../scripts/ui/keypress-audio.mjs";

console.log("Executando testes: Keypress Audio (smoke sem Foundry)...");

assert.strictEqual(isPhoneSoundEnabled(), true);
assert.strictEqual(await preloadKeypressAudio(), false);
assert.strictEqual(await playKeypressSound(), false);
assert.strictEqual(await playKeypressSound(), false);

console.log("✅ Keypress Audio: fallback silencioso sem Foundry confirmado.");
