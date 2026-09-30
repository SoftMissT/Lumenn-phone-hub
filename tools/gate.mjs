#!/usr/bin/env node
// Gate único: sintaxe, JSON, paridade i18n, CSS/HBS balanceados, testes.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FALHA: ${msg}`);
};

function walk(dir, ext, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, ext, out);
    else if (path.endsWith(ext)) out.push(path);
  }
  return out;
}

console.log("1/5 sintaxe");
const sources = [
  ...walk(join(root, "scripts"), ".mjs"),
  ...walk(join(root, "tests"), ".mjs"),
];
for (const file of sources) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    fail(`${file}\n${error.stderr}`);
  }
}
console.log(`  ${sources.length} arquivos`);

console.log("2/5 JSON");
for (const rel of ["module.json", "lang/en.json", "lang/pt-BR.json"]) {
  try {
    JSON.parse(readFileSync(join(root, rel), "utf8"));
    console.log(`  ok: ${rel}`);
  } catch (error) {
    fail(`${rel}: ${error.message}`);
  }
}

console.log("3/5 i18n");
const flat = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flat(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
const pt = new Set(
  flat(JSON.parse(readFileSync(join(root, "lang/pt-BR.json"), "utf8"))),
);
const en = new Set(
  flat(JSON.parse(readFileSync(join(root, "lang/en.json"), "utf8"))),
);
for (const key of pt) if (!en.has(key)) fail(`só em pt-BR: ${key}`);
for (const key of en) if (!pt.has(key)) fail(`só em en: ${key}`);
console.log(`  ${pt.size} chaves`);

console.log("4/5 CSS/HBS");
const css = readFileSync(join(root, "styles/lumenn-phone.css"), "utf8");
const opens = (css.match(/\{/g) ?? []).length;
const closes = (css.match(/\}/g) ?? []).length;
if (opens !== closes) fail(`CSS ${opens} abre / ${closes} fecha`);
for (const file of walk(join(root, "templates"), ".hbs")) {
  const src = readFileSync(file, "utf8");
  const o = (src.match(/\{\{#(if|each|unless|with)[^}]*\}\}/g) ?? []).length;
  const c = (src.match(/\{\{\/(if|each|unless|with)\}\}/g) ?? []).length;
  if (o !== c) fail(`${file} ${o} abre / ${c} fecha`);
}
console.log("  ok");

console.log("5/5 testes");
try {
  execFileSync(process.execPath, ["--test"], { stdio: "inherit", cwd: root });
} catch {
  failures += 1;
}

console.log(failures === 0 ? "\nGATE VERDE" : `\nGATE VERMELHO (${failures})`);
process.exit(failures === 0 ? 0 : 1);
