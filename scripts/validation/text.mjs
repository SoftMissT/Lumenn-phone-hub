const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function segmenter() {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return new Intl.Segmenter(undefined, { granularity: "grapheme" });
  }
  return null;
}

export function countGraphemes(value) {
  const text = String(value ?? "");
  const seg = segmenter();
  if (!seg) return Array.from(text).length;
  let count = 0;
  for (const _ of seg.segment(text)) count += 1;
  return count;
}

export function truncateGraphemes(value, max) {
  const text = String(value ?? "");
  const limit = Math.max(0, Math.trunc(max));
  if (limit === 0) return "";
  const seg = segmenter();
  if (!seg) return Array.from(text).slice(0, limit).join("");
  let out = "";
  let count = 0;
  for (const part of seg.segment(text)) {
    if (count >= limit) break;
    out += part.segment;
    count += 1;
  }
  return out;
}

export function countLines(value) {
  return String(value ?? "").split(/\r\n|\r|\n/).length;
}

export function truncateLines(value, maxLines) {
  const limit = Math.max(1, Math.trunc(maxLines));
  const lines = String(value ?? "").split(/\r\n|\r|\n/);
  if (lines.length <= limit) return lines.join("\n");
  return lines.slice(0, limit).join("\n");
}

export function sanitizePlainText(value) {
  return String(value ?? "")
    .replace(/\r\n|\r/g, "\n")
    .replace(CONTROL_CHARS, "");
}

export function prepareNotificationText(value, maxGraphemes, maxLines) {
  let text = sanitizePlainText(value);
  if (Number.isFinite(maxLines)) text = truncateLines(text, maxLines);
  if (Number.isFinite(maxGraphemes))
    text = truncateGraphemes(text, maxGraphemes);
  return text;
}
