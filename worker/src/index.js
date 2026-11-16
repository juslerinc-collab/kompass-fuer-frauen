// Kompass chat worker.
// - Hides the AI behind a server, so no key is ever in the browser.
// - Answers only from the knowledge base, with sources.
// - Stores nothing: no logs of questions or answers, no cookies.

import knowledge from "../../site/data/knowledge.json" with { type: "json" };
import help from "../../site/data/help.json" with { type: "json" };
import { answerQuestion, parseRequest } from "./chat.js";

const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

function allowedOrigin(origin, env) {
  if (!origin) return null;
  const list = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.includes(origin)) return origin;
  if (env.ALLOW_LOCALHOST === "true" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function json(data, status, origin) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env, ctx, deps = {}) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const okOrigin = allowedOrigin(origin, env);

    // A browser on a foreign site may not use the chat.
    if (origin && !okOrigin) return json({ error: "origin_not_allowed" }, 403, null);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": okOrigin || "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
          vary: "Origin",
        },
      });
    }

    if (url.pathname === "/health" && request.method === "GET") return json({ ok: true }, 200, okOrigin);
    if (url.pathname !== "/chat") return json({ error: "not_found" }, 404, okOrigin);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, okOrigin);

    // Simple abuse protection. The counter key is never stored or logged.
    if (env.RATE_LIMITER) {
      const key = request.headers.get("cf-connecting-ip") || "anon";
      const { success } = await env.RATE_LIMITER.limit({ key });
      if (!success) return json({ error: "too_many_requests" }, 429, okOrigin);
    }

    if (Number(request.headers.get("content-length") || 0) > 16_000) return json({ error: "too_large" }, 413, okOrigin);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad_json" }, 400, okOrigin);
    }
    const parsed = parseRequest(body);
    if (parsed.error) return json({ error: parsed.error }, 400, okOrigin);

    try {
      const result = await answerQuestion(parsed, {
        ai: env.AI,
        knowledge: deps.knowledge || knowledge,
        help: deps.help || help,
        model: env.MODEL || DEFAULT_MODEL,
      });
      return json(result, 200, okOrigin);
    } catch {
      // Deliberately no details: the error could contain the question.
      return json({ error: "ai_unavailable" }, 502, okOrigin);
    }
  },
};
