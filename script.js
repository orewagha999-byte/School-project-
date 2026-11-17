"use strict";

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const STOP = new Set(("a an the and or but if of to in on at by for with from as is are was were be been being it its this " +
  "that these those he she they we you his her their our your not no so than then there here which who what when where why how " +
  "can could should would may might will do does did have has had into about over under also very more most such other some any " +
  "each during without while after before between because use used uses using").split(" "));
const S = { sents: [], f: {}, cards: [], ci: 0, flip: false, quiz: [], qi: 0, pts: 0 };

const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
};
const h = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};
const shuffle = a => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const say = m => { $("#msg").textContent = m || ""; };
const has = (s, k) => new RegExp("\\b" + k + "\\b", "i").test(s);

/* ---------- text analysis ---------- */
function clean(t) {
  return t.split(/\n+/)
    .map(l => l.trim().replace(/^[-*•]\s+/, ""))
    .filter(Boolean)
    .map(l => (/[.!?:]$/.test(l) ? l : l + "."))
    .join(" ");
}
function sentences(t) {
  return (clean(t).replace(/\s+/g, " ").match(/[^.!?]+(?:[.!?]+|$)/g) || [])
    .map(s => s.trim())
    .filter(s => s.split(" ").length >= 5);
}
function words(t) {
  return (t.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []).filter(w => !STOP.has(w));
}
function freq(t) {
  const f = {};
  words(t).forEach(w => { f[w] = (f[w] || 0) + 1; });
  return f;
}
const keywords = n => Object.entries(S.f).sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);
function score(s) {
  const w = words(s);
  return w.length ? w.reduce((a, x) => a + (S.f[x] || 0), 0) / Math.sqrt(w.length) : 0;
}

/* ---------- summary ---------- */
function marked(li, text, keys) {
  if (!keys.length) { li.textContent = text; return; }
  const parts = text.split(new RegExp("\\b(" + keys.join("|") + ")\\b", "i"));
  parts.forEach((p, i) => li.append(i % 2 ? h("mark", null, p) : document.createTextNode(p)));
}
function renderSummary() {
  const n = +$("#len").value;
  $("#lenv").textContent = n;
  const keys = keywords(8);
  const top = S.sents.map((s, i) => ({ s, i, v: score(s) }))
    .sort((a, b) => b.v - a.v).slice(0, n).sort((a, b) => a.i - b.i);
  $("#sumList").replaceChildren(...top.map(x => { const li = h("li"); marked(li, x.s, keys); return li; }));
  $("#keys").replaceChildren(...keywords(10).map(k => h("span", "chip", k)));
}

/* ---------- flashcards ---------- */
function makeCards() {
  const re = /^(?:an?|the)?\s*([A-Za-z][\w\s-]{2,40}?)\s+(?:is|are|means|refers to|is defined as)\s+.{15,}$/i;
  const c = [];
  S.sents.forEach(s => {
    const m = s.replace(/[.!?]+$/, "").match(re);
    if (m && words(m[1]).length) c.push({ q: "Define: " + m[1].trim(), a: s });
  });
  for (const k of keywords(12)) {
    if (c.length >= 8) break;
    if (c.some(x => x.q.toLowerCase().includes(k))) continue;
    const best = S.sents.filter(s => has(s, k)).sort((a, b) => score(b) - score(a))[0];
    if (best && !c.some(x => x.a === best)) c.push({ q: "What do your notes say about " + k + "?", a: best });
  }
  return c.slice(0, 15);
}
function renderCard() {
  const box = $("#fc");
  if (!S.cards.length) {
    $("#fcSide").textContent = "No flashcards yet";
    $("#fcText").textContent = "Add more notes with clear statements, then make study material again.";
    $("#fcCount").textContent = "";
    return;
  }
  const c = S.cards[S.ci];
  box.classList.toggle("back", S.flip);
  $("#fcSide").textContent = S.flip ? "Answer. Tap to go back." : "Question. Tap to reveal the answer.";
  $("#fcText").textContent = S.flip ? c.a : c.q;
  $("#fcCount").textContent = (S.ci + 1) + " of " + S.cards.length;
}
function moveCard(d) {
  if (!S.cards.length) return;
  S.ci = (S.ci + d + S.cards.length) % S.cards.length;
  S.flip = false;
  renderCard();
}

/* ---------- quiz ---------- */
function makeQuiz() {
  const pool = keywords(40).filter(w => w.length > 3);
  const ranked = [...S.sents].filter(s => s.length < 260).sort((a, b) => score(b) - score(a));
  const out = [], used = new Set();
  for (const s of ranked) {
    const ans = words(s).filter(w => w.length > 3).sort((a, b) => S.f[b] - S.f[a]).find(w => !used.has(w));
    if (!ans) continue;
    const others = shuffle(pool.filter(w => w !== ans && !has(s, w))).slice(0, 3);
    if (others.length < 3) continue;
    used.add(ans);
    out.push({ q: s.replace(new RegExp("\\b" + ans + "\\b", "i"), "_____"), a: ans, opts: shuffle([ans, ...others]) });
    if (out.length >= 8) break;
  }
  return out;
}
function renderQuiz() {
  const box = $("#quizBox");
  box.replaceChildren();
  if (!S.quiz.length) {
    box.append(h("p", "muted", "Not enough distinct terms to build a quiz. Add more notes and try again."));
    return;
  }
  if (S.qi >= S.quiz.length) {
    const again = h("button", "primary", "Retake quiz");
    again.onclick = () => { S.quiz = makeQuiz(); S.qi = 0; S.pts = 0; renderQuiz(); };
    box.append(
      h("h3", null, "You scored " + S.pts + " out of " + S.quiz.length),
      h("p", "muted", S.pts === S.quiz.length ? "Perfect score." : "Read the summary and flip through the flashcards, then try again."),
      again
    );
    return;
  }
  const q = S.quiz[S.qi];
  const next = h("button", "primary", S.qi === S.quiz.length - 1 ? "See my score" : "Next question");
  next.hidden = true;
  next.onclick = () => { S.qi++; renderQuiz(); };
  box.append(h("p", "muted", "Question " + (S.qi + 1) + " of " + S.quiz.length + ". Pick the missing word."), h("p", "q", q.q));
  q.opts.forEach(o => {
    const b = h("button", "opt", o);
    b.onclick = () => {
      if (o === q.a) S.pts++; else b.classList.add("wrong");
      box.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (x.textContent === q.a) x.classList.add("right"); });
      next.hidden = false;
      next.focus();
    };
    box.append(b);
  });
  box.append(next);
}

/* ---------- tabs and flow ---------- */
function show(name) {
  document.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === name));
  document.querySelectorAll(".panel").forEach(p => { p.hidden = p.id !== name; });
}
function generate() {
  const t = $("#notes").value.trim();
  S.sents = sentences(t);
  if (S.sents.length < 3) {
    say("Add at least 3 full sentences so there is enough to study.");
    return;
  }
  say("");
  S.f = freq(t);
  const len = $("#len");
  len.max = Math.min(8, S.sents.length);
  len.value = Math.min(4, len.max);
  S.cards = makeCards(); S.ci = 0; S.flip = false;
  S.quiz = makeQuiz(); S.qi = 0; S.pts = 0;
  renderSummary(); renderCard(); renderQuiz();
  $("#results").hidden = false;
  show("summary");
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

const SAMPLE = "Photosynthesis is the process plants use to turn sunlight into chemical energy. " +
  "Chlorophyll is the green pigment that absorbs light inside the chloroplasts of plant cells. " +
  "During photosynthesis, plants take in carbon dioxide from the air and water from the soil. " +
  "The light reactions happen in the thylakoid membranes and produce oxygen, ATP and NADPH. " +
  "The Calvin cycle uses ATP and NADPH to build glucose from carbon dioxide. " +
  "Glucose is a sugar that plants use for energy and for building cellulose. " +
  "Stomata are tiny pores on leaves that let carbon dioxide enter and oxygen leave. " +
  "Oxygen released by plants is the gas most animals need to breathe. " +
  "Without photosynthesis, there would be almost no food chains on Earth. " +
  "Plants with more chlorophyll and more light usually photosynthesize faster.";

function onInput() {
  const n = ($("#notes").value.match(/\S+/g) || []).length;
  $("#count").textContent = n + (n === 1 ? " word" : " words");
  store.set("sb-notes", $("#notes").value);
}

$("#go").onclick = generate;
$("#notes").oninput = onInput;
$("#sample").onclick = () => { $("#notes").value = SAMPLE; onInput(); say(""); };
$("#clear").onclick = () => { $("#notes").value = ""; onInput(); $("#results").hidden = true; say(""); $("#notes").focus(); };
$("#file").onchange = e => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  if (f.size > 500000) { say("That file is too large. Use a text file under 500 KB."); return; }
  const r = new FileReader();
  r.onload = () => { $("#notes").value = r.result; onInput(); say(""); };
  r.onerror = () => say("Could not read that file. Try a .txt or .md file.");
  r.readAsText(f);
};
document.querySelectorAll("[data-tab]").forEach(b => { b.onclick = () => show(b.dataset.tab); });
$("#len").oninput = renderSummary;
$("#fc").onclick = () => { if (S.cards.length) { S.flip = !S.flip; renderCard(); } };
$("#prev").onclick = () => moveCard(-1);
$("#next").onclick = () => moveCard(1);
$("#shuf").onclick = () => { S.cards = shuffle(S.cards); S.ci = 0; S.flip = false; renderCard(); };
$("#theme").onclick = () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  store.set("sb-theme", document.documentElement.dataset.theme);
};

/* restore saved state */
const savedTheme = store.get("sb-theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
$("#notes").value = store.get("sb-notes") || "";
onInput();
