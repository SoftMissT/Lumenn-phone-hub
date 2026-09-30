import assert from "node:assert";
import {
  countGraphemes,
  countLines,
  sanitizePlainText,
  truncateGraphemes,
  truncateLines
} from "../scripts/validation/text.mjs";
import {
  hasAllowedWallpaperExtension,
  isAllowedWallpaperUrl,
  isForbiddenProtocol
} from "../scripts/validation/urls.mjs";
import { isActorUuid, randomId } from "../scripts/validation/ids.mjs";

console.log("Executando testes: Validation (text/urls/ids)...");

assert.strictEqual(truncateGraphemes("abcdef", 3), "abc");
assert.strictEqual(truncateGraphemes("abc", 0), "");
assert.strictEqual(truncateGraphemes("abc", 99), "abc");
assert.strictEqual(countGraphemes("abc"), 3);
assert.strictEqual(countLines("a\nb\nc"), 3);
assert.strictEqual(countLines("solo"), 1);
assert.strictEqual(truncateLines("a\nb\nc", 2), "a\nb");
assert.strictEqual(sanitizePlainText("a\u0000b\rc"), "ab\nc");

if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
  assert.strictEqual(countGraphemes("👨‍👩‍👧"), 1);
  assert.strictEqual(truncateGraphemes("👨‍👩‍👧x", 1), "👨‍👩‍👧");
}

assert.ok(isAllowedWallpaperUrl("https://example.com/wall.png"));
assert.ok(isAllowedWallpaperUrl("assets/wallpapers/wall.webp"));
assert.ok(isAllowedWallpaperUrl("http://localhost:30000/wall.png"));
assert.ok(!isAllowedWallpaperUrl("javascript:alert(1)"));
assert.ok(!isAllowedWallpaperUrl("data:image/png;base64,AAAA"));
assert.ok(!isAllowedWallpaperUrl("file:///etc/passwd"));
assert.ok(!isAllowedWallpaperUrl("../escape.png"));
assert.ok(!isAllowedWallpaperUrl("/absolute.png"));
assert.ok(isForbiddenProtocol("blob:https://example.com/x"));
assert.ok(hasAllowedWallpaperExtension("a/b.PNG"));
assert.ok(hasAllowedWallpaperExtension("a/b.jpeg?v=1"));
assert.ok(!hasAllowedWallpaperExtension("a/b.svg"));
assert.ok(!hasAllowedWallpaperExtension("a/b.gif"));

assert.ok(isActorUuid("Actor.ABCDEF0123456789"));
assert.ok(!isActorUuid("Actor.short"));
assert.ok(!isActorUuid("Token.ABCDEF0123456789"));
assert.ok(!isActorUuid(null));
assert.strictEqual(randomId(16).length, 16);
assert.match(randomId(16), /^[0-9a-f]{16}$/);

console.log("✅ Validation: todos os testes passaram.");
