import { search } from "./retrieve.js";

const EXIT_URL = "https://www.meteoschweiz.admin.ch/";
const RTL = new Set(["ar", "fa", "he", "ur"]);
const cfg = window.KOMPASS_CONFIG || {};

const [ui, kb, help, check] = await Promise.all(
  ["data/ui.json", "data/knowledge.json", "data/help.json", "data/selfcheck.json"].map((u) => fetch(u).then((r) => r.json()))
);

const langs = Object.keys(ui);
let lang = pickLang();
const main = document.getElementById("main");

// ---------- helpers ----------
function pickLang() {
  const wanted = (navigator.language || "de").slice(0, 2);
  return langs.includes(wanted) ? wanted : "de";
}
const t = (key) => ui[lang][key] ?? ui.de[key] ?? key;
const L = (obj) => (obj ? obj[lang] ?? obj.de : "");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const entryById = (id) => kb.entries.find((e) => e.id === id);
const tel = (n) => `tel:${n.replace(/\s/g, "")}`;

// ---------- quick exit ----------
function exitNow() {
  main.innerHTML = "";
  location.replace(EXIT_URL);
}
document.getElementById("exit").addEventListener("click", exitNow);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") exitNow(); });

// ---------- language ----------
const langBar = document.getElementById("langs");
langBar.innerHTML = langs
  .map((l) => `<button type="button" data-lang="${l}" lang="${l}" dir="${RTL.has(l) ? "rtl" : "ltr"}">${esc(ui[l].langName)}</button>`)
  .join("");
langBar.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (!b) return;
  lang = b.dataset.lang;
  applyLang();
  render();
});

function applyLang() {
  langBar.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.has(lang) ? "rtl" : "ltr";
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  document.getElementById("exit").setAttribute("aria-label", t("exit"));
  // One thin banner on top: prototype notice, plus machine-translation notice where it applies.
  const contentMissing = lang !== "de" && !kb.entries.every((e) => e.title?.[lang]);
  document.getElementById("banner").textContent = [t("prototype"), ui[lang].machine, contentMissing ? ui[lang].contentNote : ""].filter(Boolean).join(" ");
  // Right rail: emergency numbers, always on screen.
  document.getElementById("railSos").innerHTML =
    `<span class="rail-label">${esc(t("emergency"))}</span>` +
    help.emergency.map((e) => `<a href="${tel(e.number)}" title="${esc(L(e.label))}"><b>${e.number}</b><small>${esc(L(e.label).split(",")[0])}</small></a>`).join("");
  document.getElementById("emergency").innerHTML =
    `${esc(t("emergency"))}: ` +
    help.emergency.map((e) => `<a href="${tel(e.number)}"><b>${e.number}</b></a> ${esc(L(e.label))}`).join(" · ");
}

// ---------- icons + illustration (own drawings, no BIF artwork) ----------
const ICON = {
  arrow: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  back: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`,
  search: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.2 15.2 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.6a1 1 0 01-.25 1z"/></svg>`,
  house: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 23L24 8l18 15M11 19v21h26V19"/><path d="M20 40V29h8v11"/></svg>`,
};

// Line-art plants in the BIF manner: black stems, grey leaves, one accent flower. Generated, deterministic.
function illustration() {
  const ink = "#1d1d1b", leaf = "#c9c9c9", acc = "var(--accent)";
  let out = "";
  const stem = (x0, x1, top, bend, leaves, side = 1) => {
    const cx = (x0 + x1) / 2 + bend;
    out += `<path d="M${x0} 300 Q${cx} ${(300 + top) / 2} ${x1} ${top}" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    for (let i = 1; i <= leaves; i++) {
      const tt = i / (leaves + 1);
      const x = (1 - tt) ** 2 * x0 + 2 * (1 - tt) * tt * cx + tt * tt * x1;
      const y = (1 - tt) ** 2 * 300 + 2 * (1 - tt) * tt * ((300 + top) / 2) + tt * tt * top;
      const dir = (i % 2 ? 1 : -1) * side, len = 30 - tt * 12, ang = dir * (38 + tt * 12);
      out += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang})"><path d="M0 0 C${len * .35} ${-len * .45} ${len * .9} ${-len * .35} ${len * 1.3} 0 C${len * .9} ${len * .35} ${len * .35} ${len * .45} 0 0Z" fill="${leaf}" stroke="${ink}" stroke-width="2"/><path d="M0 0 L${len * 1.1} 0" stroke="${ink}" stroke-width="1.6"/></g>`;
    }
    return [x1, top];
  };
  const umbel = ([x, y], r) => {
    for (let a = -160; a <= -20; a += 20) {
      const rad = (a * Math.PI) / 180, ex = x + Math.cos(rad) * r, ey = y + Math.sin(rad) * r;
      out += `<path d="M${x} ${y} L${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${ink}" stroke-width="1.8"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="4" fill="${ink}"/>`;
    }
  };
  const bloom = ([x, y], r, fill) => {
    for (let a = 0; a < 360; a += 30) out += `<ellipse cx="${x}" cy="${y - r}" rx="${r * .38}" ry="${r}" fill="${fill}" transform="rotate(${a} ${x} ${y})"/>`;
    out += `<circle cx="${x}" cy="${y}" r="${r * .45}" fill="${ink}"/>`;
  };
  stem(120, 92, 150, -30, 4);
  umbel(stem(200, 214, 70, 26, 5, -1), 30);
  bloom(stem(262, 276, 120, -20, 3), 26, acc);
  stem(330, 352, 96, 18, 5);
  umbel(stem(410, 430, 54, -24, 6, -1), 34);
  bloom(stem(470, 488, 170, 16, 2), 18, leaf);
  return `<svg viewBox="40 20 500 280" role="img" aria-label="">${out}</svg>`;
}

// ---------- shared renderers ----------
const groupLabel = (g) => ui[lang]["group_" + g] ?? ui.de["group_" + g] ?? g;

function entryRows(entries) {
  return `<ul class="list">${entries
    .map((e) => `<li><a href="#thema-${e.id}"><span class="title">${esc(L(e.title))}</span><span class="sum">${esc(L(e.summary))}</span></a></li>`)
    .join("")}</ul>`;
}

function serviceRow(s) {
  const disc = s.id === "142" ? `<span class="big142">142</span>` : s.id === "frauenhaus" ? ICON.house : ICON.phone;
  return `<li class="service">
    <span class="disc">${disc}</span>
    <div>
      <h3>${esc(L(s.name))}</h3>
      <p>${esc(L(s.what))}</p>
      ${s.phone ? `<a class="phone" href="${tel(s.phone)}">${esc(t("call"))} ${esc(s.phone)}</a>` : ""}
      ${s.url ? `<a class="more" href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(L(s.urlLabel) || s.url)}</a>` : ""}
    </div>
  </li>`;
}
const serviceList = (list) => `<ul class="services">${list.map(serviceRow).join("")}</ul>`;

function servicesFor(entryIds) {
  const ids = new Set(entryIds);
  return help.services.filter((s) => s.id === "142" || (s.tags || []).some((tag) => ids.has(tag)));
}

// ---------- views ----------
const HINTS = ["kontrolle", "geld", "psychisch", "aufenthalt"];
const hintText = (i) => (ui[lang].hints || ui.de.hints)[i];

// Home ask field: cycle the examples through the placeholder ("e.g. …") so they read as ideas.
let hintTimer = 0;
function startHintCycle() {
  clearInterval(hintTimer);
  const input = document.getElementById("homeAskInput");
  if (!input || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  const show = () => { input.placeholder = `${t("eg")} ${hintText(i)}`; i = (i + 1) % HINTS.length; };
  hintTimer = setInterval(() => {
    if (!document.body.contains(input)) return clearInterval(hintTimer);
    if (document.activeElement === input || input.value) return;
    show();
  }, 3200);
}
const POPULAR = ["kontrolle", "geld", "aufenthalt", "zwangsheirat"];

function askForm(id, placeholder) {
  return `<form class="ask" id="${id}" autocomplete="off" role="search">
    <span class="ask-icon">${ICON.search}</span>
    <input name="q" id="${id}Input" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" maxlength="600">
    <button class="btn" type="submit">${esc(t("send"))}</button>
  </form>`;
}

function viewHome() {
  const popular = POPULAR.map(entryById).filter(Boolean);
  return `
  <section class="hero">
    <div class="illu" aria-hidden="true">${illustration()}</div>
    <div class="wrap hero-inner">
      <h1 class="enter">${esc(t("heroTitle"))}<span>${esc(t("heroSub"))}</span></h1>
      <div class="enter enter-2 hero-ask">${askForm("homeAsk", t("askPlaceholder"))}
        <ul class="hints">${HINTS.map((id, i) => `<li><a href="#thema-${id}">${esc(hintText(i))}</a></li>`).join("")}</ul>
      </div>
      <div class="quick enter enter-3">
        <a class="btn btn-line" href="#check">${esc(t("quickCheck"))} <span class="mins">${esc(t("minutes"))}</span></a>
        <a class="textlink" href="#themen">${esc(t("quickRights"))} ${ICON.arrow}</a>
      </div>
    </div>
  </section>
  <section class="popular">
    <div class="wrap narrow">
      <h2 class="group-label">${esc(t("popular"))}</h2>
      ${entryRows(popular)}
      <p class="more-link"><a class="textlink" href="#themen">${esc(t("allTopics"))} ${ICON.arrow}</a></p>
    </div>
  </section>`;
}

function viewTopics() {
  const groups = [...new Set(kb.entries.map((e) => e.group))];
  return `<div class="wrap narrow article"><h1>${esc(t("topics"))}</h1>${groups
    .map((g) => `<h2 class="group-label">${esc(groupLabel(g))}</h2>${entryRows(kb.entries.filter((e) => e.group === g))}`)
    .join("")}</div>`;
}

function viewEntry(id) {
  const e = entryById(id);
  if (!e) return viewHome();
  // Number the sources in the order they are first cited.
  const order = [];
  e.body.forEach((p) => p.src.forEach((s) => { if (!order.includes(s)) order.push(s); }));
  const paras = e.body
    .map((p) => {
      const refs = p.src.map((s) => `<a href="#" data-src="${s}" aria-label="${esc(t("sources"))} ${order.indexOf(s) + 1}">[${order.indexOf(s) + 1}]</a>`).join("");
      return `<p>${esc(L(p.text))}<sup>${refs}</sup></p>`;
    })
    .join("");
  const srcList = order
    .map((s) => { const src = kb.sources[s]; return src ? `<li id="src-${s}"><a href="${src.url}" target="_blank" rel="noopener noreferrer">${esc(src.title)}</a></li>` : ""; })
    .join("");
  return `
  <article class="wrap narrow article">
    <a class="back" href="#themen">${ICON.back} ${esc(t("topics"))}</a>
    <h1>${esc(L(e.title))}</h1>
    <p class="lead">${esc(L(e.summary))}</p>
    ${paras}
    <div class="sources"><strong>${esc(t("sources"))}</strong><ol>${srcList}</ol></div>
    <h2 class="group-label">${esc(t("helpTitle"))}</h2>
    ${serviceList(servicesFor([e.id]))}
  </article>`;
}

function viewHelp() {
  return `<div class="wrap narrow article"><h1>${esc(t("helpTitle"))}</h1><p>${esc(t("helpText"))}</p>${serviceList(help.services)}</div>`;
}

// ----- self-check (state lives only in memory) -----
let answers = [];
function viewCheck() {
  const qs = check.questions;
  const i = answers.length;
  if (i >= qs.length) return viewResult();
  const q = qs[i];
  return `
  <div class="wrap narrow check">
  <h1>${esc(t("checkTitle"))}</h1>
  ${i === 0 ? `<p>${esc(t("checkIntro"))}</p>` : ""}
  <div class="step">${i + 1} ${esc(t("of"))} ${qs.length}</div>
  <div class="progress"><div style="width:${(i / qs.length) * 100}%"></div></div>
  <div class="question">${esc(L(q.text))}</div>
  <div class="answers">
    <button class="btn btn-line" data-a="yes">${esc(t("yes"))}</button>
    <button class="btn btn-line" data-a="sometimes">${esc(t("sometimes"))}</button>
    <button class="btn btn-line" data-a="no">${esc(t("no"))}</button>
  </div>
  ${i > 0 ? `<p style="margin-top:1.5rem"><a class="back" href="#" data-undo>${ICON.back} ${esc(t("back"))}</a></p>` : ""}
  </div>`;
}

function urgentBox(title = t("urgentTitle"), text = t("urgentText")) {
  return `<div class="urgent"><h3>${esc(title)}</h3><p>${esc(text)}</p>
     <div class="actions"><a class="btn" href="tel:142">142</a><a class="btn" href="tel:117">117</a><a class="btn" href="tel:144">144</a></div></div>`;
}

function viewResult() {
  const hit = check.questions.filter((q, i) => answers[i] !== "no");
  const urgent = hit.some((q) => q.urgent);
  const ids = [...new Set(hit.flatMap((q) => q.leadsTo))];
  if (hit.length) ids.push(...check.always.filter((a) => !ids.includes(a)));
  const entries = ids.map(entryById).filter(Boolean);
  return `
  <div class="wrap narrow check">
  <h1>${esc(hit.length ? t("resultTitle") : t("checkTitle"))}</h1>
  ${urgent ? urgentBox() : ""}
  <p>${esc(hit.length ? t("resultText") : t("resultNone"))}</p>
  ${entries.length ? entryRows(entries) : ""}
  <h2 class="group-label">${esc(t("helpTitle"))}</h2>
  ${serviceList(servicesFor(hit.length ? ids : ["opferhilfe"]))}
  <p style="margin-top:1.5rem"><button class="btn btn-line" data-restart>${esc(t("restart"))}</button></p>
  </div>`;
}

// ----- ask (AI chat if configured, else offline search) -----
const chatLog = []; // in memory only (rendered HTML)
const chatHistory = []; // in memory only, sent to the worker for follow-up questions
function viewAsk() {
  const examples = ui[lang].examples || ui.de.examples || [];
  return `
  <div class="wrap narrow ask-page">
  <h1>${esc(t("askTitle"))}</h1>
  <p>${esc(t("askIntro"))}</p>
  <div class="chat" id="chat">${chatLog.join("")}</div>
  ${chatLog.length ? "" : `<div class="chips">${examples.map((x) => `<button class="chip" data-q="${esc(x)}">${esc(x)}</button>`).join("")}</div>`}
  ${askForm("askForm", t("askPlaceholder"))}
  </div>`;
}

function sourcesHtml(sources) {
  if (!sources?.length) return "";
  return `<div class="sources"><strong>${esc(t("sources"))}</strong><ol>${sources
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`)
    .join("")}</ol></div>`;
}

function offlineAnswer(question, prefix) {
  const hits = search(kb, question, 3);
  if (!hits.length) return `<div class="bubble">${esc(t("noResult"))}</div>`;
  return `<div class="bubble"><p>${esc(prefix)}</p>${entryRows(hits)}</div>`;
}

function formatAnswer(text) {
  // Escape, keep paragraphs, turn [1] into superscript citations.
  return esc(text)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>").replace(/\[(\d+)\]/g, "<sup>[$1]</sup>")}</p>`)
    .join("");
}

async function ask(question) {
  question = question.trim();
  if (!question) return;
  chatLog.push(`<div class="bubble me">${esc(question)}</div>`);
  render();
  const chat = document.getElementById("chat");
  const wait = document.createElement("div");
  wait.className = "bubble";
  wait.textContent = t("thinking");
  chat.appendChild(wait);

  let html;
  if (cfg.chatUrl) {
    try {
      const res = await fetch(cfg.chatUrl.replace(/\/$/, "") + "/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: question.slice(0, 600), lang, history: chatHistory.slice(-6) }),
        referrerPolicy: "no-referrer",
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      if (data.answer) {
        chatHistory.push({ role: "user", content: question }, { role: "assistant", content: data.answer });
        const more = (data.entries || []).map(entryById).filter(Boolean);
        html =
          (data.emergency ? urgentBox(t("dangerTitle"), t("dangerText")) : "") +
          `<div class="bubble">${formatAnswer(data.answer)}${sourcesHtml(data.sources)}` +
          (more.length ? entryRows(more) : "") +
          `<div class="note">${esc(t("aiNote"))}</div></div>`;
      } else {
        html = offlineAnswer(question, t("searchMode"));
      }
    } catch {
      html = offlineAnswer(question, t("aiError"));
    }
  } else {
    html = offlineAnswer(question, t("searchMode"));
  }
  chatLog.push(html);
  render();
  document.getElementById("askFormInput")?.focus();
}

// ---------- router ----------
function render() {
  const route = location.hash.replace(/^#\/?/, "");
  const page = route.startsWith("thema-") ? "thema" : route;
  const views = { check: viewCheck, frage: viewAsk, hilfe: viewHelp, themen: viewTopics, thema: () => viewEntry(route.slice(6)) };
  main.innerHTML = (views[page] || viewHome)();
  startHintCycle();
  document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${page || "start"}`));
}

main.addEventListener("click", (e) => {
  const sc = e.target.closest("[data-scroll]");
  if (sc) { e.preventDefault(); document.getElementById(sc.dataset.scroll)?.scrollIntoView({ behavior: "smooth" }); return; }
  const a = e.target.closest("[data-a]");
  if (a) { answers.push(a.dataset.a); render(); window.scrollTo(0, 0); return; }
  const src = e.target.closest("[data-src]");
  if (src) { e.preventDefault(); document.getElementById("src-" + src.dataset.src)?.scrollIntoView({ block: "center" }); return; }
  if (e.target.closest("[data-undo]")) { e.preventDefault(); answers.pop(); render(); return; }
  if (e.target.closest("[data-restart]")) { answers = []; render(); return; }
  const chip = e.target.closest("[data-q]");
  if (chip) ask(chip.dataset.q);
});
main.addEventListener("submit", (e) => {
  if (e.target.id !== "askForm" && e.target.id !== "homeAsk") return;
  e.preventDefault();
  const q = e.target.q.value;
  if (e.target.id === "homeAsk") {
    if (!q.trim()) return;
    window.history.pushState(null, "", "#frage");
    window.scrollTo(0, 0);
  }
  ask(q);
});
window.addEventListener("hashchange", () => {
  if (location.hash === "#check") answers = answers.length >= check.questions.length ? [] : answers;
  render();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});

// ---------- menu ----------
const menu = document.getElementById("menu"), burger = document.getElementById("burger");
const setMenu = (open) => { menu.hidden = !open; burger.setAttribute("aria-expanded", String(open)); document.body.style.overflow = open ? "hidden" : ""; };
burger.addEventListener("click", () => setMenu(true));
document.getElementById("menuClose").addEventListener("click", () => setMenu(false));
menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });

applyLang();
render();
