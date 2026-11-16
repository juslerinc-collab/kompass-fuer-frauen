import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { detectEmergency } from "../src/emergency.js";
import { renumberCitations, parseRequest, findEntries } from "../src/chat.js";
import knowledge from "../../site/data/knowledge.json" with { type: "json" };

// Fake Workers AI: records calls, answers with a canned reply.
function fakeAI({ reply = "Das ist Kontrolle [1]. Hilfe gibt es bei der Opferhilfe [3].", failEmbed = false, failChat = false } = {}) {
  const calls = [];
  return {
    calls,
    async run(model, input) {
      calls.push({ model, input });
      if (model.includes("bge")) {
        if (failEmbed) throw new Error("embed down");
        // tiny bag-of-letters vector, good enough to be deterministic
        return { data: input.text.map((t) => Array.from({ length: 26 }, (_, i) => (t.toLowerCase().split(String.fromCharCode(97 + i)).length - 1) + 0.01)) };
      }
      if (failChat) throw new Error("model down");
      return { response: reply };
    },
  };
}

const env = (ai, extra = {}) => ({ AI: ai, ALLOWED_ORIGINS: "https://kompass.example", ALLOW_LOCALHOST: "true", ...extra });
const post = (body, origin = "https://kompass.example") =>
  new Request("https://w.example/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("answers with renumbered sources, entries and CORS header", async () => {
  const ai = fakeAI();
  const res = await worker.fetch(post({ question: "Er kontrolliert mein Handy", lang: "de" }), env(ai));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), "https://kompass.example");
  const data = await res.json();
  assert.ok(data.entries.includes("kontrolle"), `entries: ${data.entries}`);
  assert.match(data.answer, /\[1\]/);
  assert.equal(data.sources.length, (data.answer.match(/\[\d\]/g) || []).filter((v, i, a) => a.indexOf(v) === i).length);
  for (const s of data.sources) assert.match(s.url, /^https:\/\//);
  assert.equal(data.emergency, false);

  const chat = ai.calls.find((c) => !c.model.includes("bge"));
  const system = chat.input.messages[0].content;
  assert.match(system, /ONLY with facts/);
  assert.match(system, /Kontrolle ist eine Form von Gewalt/);
  assert.match(system, /Write in German/);
});

test("drops citation markers that point to no source", () => {
  const r = renumberCitations("A [2]. B [9]. C [2][1].", [{ title: "x", url: "u1" }, { title: "y", url: "u2" }]);
  assert.equal(r.answer, "A [1]. B. C [1][2].");
  assert.deepEqual(r.sources.map((s) => s.url), ["u2", "u1"]);
});

test("emergency words set the flag and prefix the answer in the right language", async () => {
  const res = await worker.fetch(post({ question: "He threatens to kill me with a knife", lang: "en" }), env(fakeAI()));
  const data = await res.json();
  assert.equal(data.emergency, true);
  assert.match(data.answer, /^If you are in danger right now: call the police on 117/);
});

test("emergency detection across languages, no false alarm on normal questions", () => {
  assert.equal(detectEmergency("Er hat gedroht, mich umzubringen").danger, true);
  assert.equal(detectEmergency("Er will mich umbringen").danger, true);
  assert.equal(detectEmergency("زوجي يضربني").danger, true);
  assert.equal(detectEmergency("Kocam beni dövüyor").danger, true);
  assert.equal(detectEmergency("Він погрожує мені").danger, true);
  assert.equal(detectEmergency("Ich denke an Suizid").selfHarm, true);
  assert.equal(detectEmergency("Darf er mein Geld nehmen?").danger, false);
  assert.equal(detectEmergency("What are my rights with my residence permit?").danger, false);
  assert.equal(detectEmergency("Is this a white lie?").danger, false);
});

test("keyword search still works when embeddings fail", async () => {
  const entries = await findEntries(fakeAI({ failEmbed: true }), knowledge, "Aufenthaltsbewilligung Trennung");
  assert.ok(entries.some((e) => e.id === "aufenthalt"), entries.map((e) => e.id).join());
});

test("model failure returns 502 without details", async () => {
  const res = await worker.fetch(post({ question: "Hilfe beim Geld", lang: "de" }), env(fakeAI({ failChat: true })));
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: "ai_unavailable" });
});

test("rejects foreign origins, bad json, empty questions and wrong routes", async () => {
  const ai = fakeAI();
  assert.equal((await worker.fetch(post({ question: "x" }, "https://evil.example"), env(ai))).status, 403);
  assert.equal((await worker.fetch(post("{nope"), env(ai))).status, 400);
  assert.equal((await worker.fetch(post({ question: "   " }), env(ai))).status, 400);
  assert.equal((await worker.fetch(new Request("https://w.example/chat"), env(ai))).status, 405);
  assert.equal((await worker.fetch(new Request("https://w.example/x"), env(ai))).status, 404);
  const pre = await worker.fetch(new Request("https://w.example/chat", { method: "OPTIONS", headers: { origin: "http://localhost:8000" } }), env(ai));
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-origin"), "http://localhost:8000");
});

test("rate limit answers 429", async () => {
  const res = await worker.fetch(post({ question: "Geld" }), env(fakeAI(), { RATE_LIMITER: { limit: async () => ({ success: false }) } }));
  assert.equal(res.status, 429);
});

test("parseRequest trims, caps and cleans input", () => {
  const r = parseRequest({ question: "x".repeat(900), lang: "xx", history: [{ role: "system", content: "evil" }, ...Array(10).fill({ role: "user", content: "hi" })] });
  assert.equal(r.question.length, 600);
  assert.equal(r.lang, "de");
  assert.equal(r.history.length, 6);
  assert.ok(r.history.every((m) => m.role !== "system"));
});
