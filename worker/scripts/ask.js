// Ask the deployed (or local) chat worker a question from the terminal.
// Usage: node scripts/ask.js https://kompass-chat.<you>.workers.dev "Darf er mein Geld nehmen?" [lang]
const [base, question, lang = "de"] = process.argv.slice(2);
if (!base || !question) {
  console.error('Usage: node scripts/ask.js <worker-url> "<question>" [lang]');
  process.exit(1);
}
const res = await fetch(`${base.replace(/\/$/, "")}/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question, lang }),
});
const data = await res.json();
if (!res.ok) { console.error(res.status, data); process.exit(1); }
console.log(`\n${data.emergency ? "🚨 NOTFALL-HINWEIS\n" : ""}${data.answer}\n`);
data.sources.forEach((s, i) => console.log(`[${i + 1}] ${s.title}\n    ${s.url}`));
console.log(`\nMehr dazu: ${data.entries.join(", ")}`);
