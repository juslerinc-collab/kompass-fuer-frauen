// Übersetzt alle deutschen Texte einmalig mit der Google Cloud Translation API (v2).
// Aufruf:  GOOGLE_TRANSLATE_KEY=... node scripts/translate.mjs [ar ti tr uk] [--force]
// Ohne --force werden nur fehlende Übersetzungen ergänzt (geprüfte Texte bleiben unangetastet).
import { readFile, writeFile } from "node:fs/promises";

const KEY = process.env.GOOGLE_TRANSLATE_KEY;
if (!KEY) { console.error("GOOGLE_TRANSLATE_KEY fehlt."); process.exit(1); }
const args = process.argv.slice(2);
const force = args.includes("--force");
const targets = args.filter((a) => !a.startsWith("--"));
if (!targets.length) targets.push("en", "ar", "ti", "tr", "uk");

const NAMES = { en: "English", ar: "العربية", ti: "ትግርኛ", tr: "Türkçe", uk: "Українська", fa: "فارسی", sq: "Shqip", pt: "Português" };
const MACHINE = "Maschinell aus dem Deutschen übersetzt. Noch nicht geprüft.";
const DATA = new URL("../site/data/", import.meta.url);

async function translate(texts, target) {
  const out = [];
  for (let i = 0; i < texts.length; i += 100) {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${KEY}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: texts.slice(i, i + 100), source: "de", target, format: "text" }),
    });
    if (!res.ok) throw new Error(`${target}: ${res.status} ${await res.text()}`);
    out.push(...(await res.json()).data.translations.map((t) => t.translatedText));
  }
  return out;
}

// Find every { de: "..." } object in a JSON tree.
function collect(node, list = []) {
  if (Array.isArray(node)) node.forEach((n) => collect(n, list));
  else if (node && typeof node === "object") {
    if (typeof node.de === "string") list.push(node);
    else Object.values(node).forEach((n) => collect(n, list));
  }
  return list;
}

for (const file of ["knowledge.json", "help.json", "selfcheck.json"]) {
  const url = new URL(file, DATA);
  const json = JSON.parse(await readFile(url, "utf8"));
  const nodes = collect(json);
  for (const lang of targets) {
    const todo = nodes.filter((n) => force || !n[lang]);
    if (!todo.length) continue;
    const res = await translate(todo.map((n) => n.de), lang);
    todo.forEach((n, i) => (n[lang] = res[i]));
    console.log(`${file}: ${todo.length} Texte → ${lang}`);
  }
  await writeFile(url, JSON.stringify(json, null, 2) + "\n");
}

const uiUrl = new URL("ui.json", DATA);
const ui = JSON.parse(await readFile(uiUrl, "utf8"));
for (const lang of targets) {
  ui[lang] ??= {};
  const keys = Object.keys(ui.de).filter((k) => k !== "langName" && k !== "machine" && ui.de[k] && (force || !ui[lang][k]));
  if (keys.length) {
    const res = await translate(keys.map((k) => ui.de[k]), lang);
    keys.forEach((k, i) => (ui[lang][k] = res[i]));
  }
  ui[lang].langName = NAMES[lang] || lang;
  if (!ui[lang].machine) ui[lang].machine = (await translate([MACHINE], lang))[0];
  console.log(`ui.json: ${keys.length} Texte → ${lang}`);
}
await writeFile(uiUrl, JSON.stringify(ui, null, 2) + "\n");
