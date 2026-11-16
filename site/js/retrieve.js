// Simple keyword search over the knowledge base.
// Shared by the website (offline search) and the chat worker (context for the AI).

const STOP = new Set(
  ("der die das und oder ein eine einer ich du er sie es wir ihr mein meine mich mir dich dir sein ist bin bist hat habe haben " +
   "nicht nur auch mit von zu zum zur in im an am auf für was wie wer wo wenn dann kann darf muss soll mal noch schon sehr " +
   "the a an and or i you he she it we my me is am are be have has not only also with of to in on at for what how who where if can may must should")
    .split(" ")
);

export function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

// Loose match: same word, or same first 5 letters (catches "kontrolliert" ~ "kontrolle").
function matches(a, b) {
  if (a === b) return true;
  const n = Math.min(5, a.length, b.length);
  return n >= 4 && a.slice(0, n) === b.slice(0, n);
}

function textOf(entry, field) {
  const v = entry[field];
  if (!v) return "";
  return typeof v === "string" ? v : Object.values(v).join(" ");
}

function bodyText(entry) {
  return (entry.body || []).map((p) => Object.values(p.text).join(" ")).join(" ");
}

export function search(knowledge, query, k = 3) {
  const q = tokenize(query);
  if (!q.length) return [];
  const scored = knowledge.entries.map((entry) => {
    const fields = [
      [entry.tags || [], 3],
      [tokenize(textOf(entry, "title")), 2],
      [tokenize(textOf(entry, "summary")), 1.5],
      [tokenize(bodyText(entry)), 1],
    ];
    let score = 0;
    for (const term of q) {
      for (const [tokens, weight] of fields) {
        if (tokens.some((t) => matches(term, t))) score += weight;
      }
    }
    return { entry, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.entry);
}
