import assert from "node:assert";
import {
  ALLOWED_EXTENSIONS,
  detectImageFormat,
  extensionOf,
  isAvifSupported,
  REJECTED_EXTENSIONS,
  sanitizeFilename,
  setAvifSupported,
  validateDimensions,
  validateExtension,
  validateSize,
  validateSourceUrl
} from "../scripts/wallpaper/wallpaper-validator.mjs";

console.log("Executando testes: Wallpaper Validator...");

assert.deepStrictEqual([...ALLOWED_EXTENSIONS], ["png", "jpg", "jpeg", "webp", "avif"]);
assert.ok(REJECTED_EXTENSIONS.includes("svg"));
assert.ok(REJECTED_EXTENSIONS.includes("gif"));

assert.strictEqual(extensionOf("a/b/c.PNG"), "png");
assert.strictEqual(extensionOf("a/b.webp?v=2"), "webp");
assert.strictEqual(extensionOf("noext"), "");

setAvifSupported(false);
assert.strictEqual(isAvifSupported(), false);
assert.strictEqual(validateExtension("w.png").valid, true);
assert.strictEqual(validateExtension("w.jpg").format, "jpeg");
assert.strictEqual(validateExtension("w.jpeg").valid, true);
assert.strictEqual(validateExtension("w.webp").valid, true);
assert.strictEqual(validateExtension("w.avif").valid, false);
assert.strictEqual(validateExtension("w.svg").valid, false);
assert.strictEqual(validateExtension("w.gif").valid, false);
assert.strictEqual(validateExtension("w.bmp").valid, false);
assert.strictEqual(validateExtension("w.tiff").valid, false);
assert.strictEqual(validateExtension("w").valid, false);

setAvifSupported(true);
assert.strictEqual(validateExtension("w.avif").valid, true);
setAvifSupported(false);

assert.strictEqual(validateSize(1024).valid, true);
assert.strictEqual(validateSize(10 * 1024 * 1024).valid, true);
assert.strictEqual(validateSize(10 * 1024 * 1024 + 1).valid, false);
assert.strictEqual(validateSize(0).valid, false);
assert.strictEqual(validateSize("x").valid, false);

assert.strictEqual(validateDimensions(1920, 1080).valid, true);
assert.strictEqual(validateDimensions(8192, 1000).valid, true);
assert.strictEqual(validateDimensions(8193, 1000).valid, false);
assert.strictEqual(validateDimensions(5000, 5000).valid, false);
assert.strictEqual(validateDimensions(0, 10).valid, false);

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const avif = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);
const bogus = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
assert.strictEqual(detectImageFormat(png), "png");
assert.strictEqual(detectImageFormat(jpeg), "jpeg");
assert.strictEqual(detectImageFormat(webp), "webp");
assert.strictEqual(detectImageFormat(avif), "avif");
assert.strictEqual(detectImageFormat(bogus), null);
assert.strictEqual(detectImageFormat(new Uint8Array([1, 2, 3])), null);

assert.strictEqual(validateSourceUrl("https://cdn.example/x.png").valid, true);
assert.strictEqual(validateSourceUrl("assets/wallpapers/x.webp").valid, true);
assert.strictEqual(validateSourceUrl("javascript:alert(1)").valid, false);
assert.strictEqual(validateSourceUrl("data:image/png;base64,AAAA").valid, false);
assert.strictEqual(validateSourceUrl("file:///etc/passwd").valid, false);
assert.strictEqual(validateSourceUrl("../x.png").valid, false);
assert.strictEqual(validateSourceUrl("https://cdn.example/x.svg").valid, false);
assert.strictEqual(validateSourceUrl("https://cdn.example/x.avif").valid, false);
assert.strictEqual(validateSourceUrl("").valid, false);

assert.strictEqual(sanitizeFilename("My Weird Name!.PNG"), "my-weird-name.png");
assert.strictEqual(sanitizeFilename("../../etc/passwd.png"), "etc-passwd.png");
assert.strictEqual(sanitizeFilename("###.png"), "wallpaper.png");

console.log("✅ Wallpaper Validator: todos os testes passaram.");
