import { $, esc, t, header } from "./common.js?v=rtl2pg1";

header("ai");
$("#sub").textContent = t("aiSub");
$("#note").textContent = t("aiNote");
$("#m").placeholder = t("aiPh");
$("#send").textContent = t("send");
$("#ex").innerHTML = t("ex").map((x) => `<button type="button">${esc(x)}</button>`).join("");
$("#ex").addEventListener("click", (e) => e.target.closest("button") && ask(e.target.textContent));

const KEY = "nl:chat";
let hist = [];
try {
  hist = JSON.parse(sessionStorage.getItem(KEY) || "[]");
} catch {}

const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
const isAr = (s) => /[\u0600-\u06FF]/.test(s) && !/[a-zəğıöüçşа-я]/i.test(s.replace(/::[a-z/]+::/g, ""));

// Nibras AI cavab işarələri: ::tafsir X:: … ::/tafsir::, ::tl::, ::src::, ::tv::, ::note::, ::sug:: (::sl::, ::sb:: ad | sorğu), ::ctx:: (gizli)
export function render(text, links = [], sources = []) {
  let bi = 0;
  const out = [];
  let blk = null;
  let sug = null;
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<div dir="auto">${para.map(inline).join("<br>")}</div>`);
    para = [];
  };
  for (const raw of String(text || "").split("\n")) {
    const l = raw.trimEnd();
    let m;
    if ((m = l.match(/^::tafsir\s+(\S+)::$/))) {
      flush();
      blk = { tl: "", body: [], src: [], tv: [] };
      continue;
    }
    if (l === "::/tafsir::" && blk) {
      const ln = links[bi++];
      const open = ln && ln.book ? `<a class="openb" dir="auto" href="/kitab/${encodeURIComponent(ln.book)}?p=${Number(ln.p) || 1}${ln.q ? "&q=" + encodeURIComponent(ln.q) : ""}">📖 ${esc(t("openInBook"))}</a>` : "";
      out.push(`<div class="blk">${blk.tl ? `<div class="tl">${esc(blk.tl)}</div>` : ""}<div class="bx">${blk.body.map((x) => `<p>${esc(x)}</p>`).join("")}</div>${blk.tv.map((x) => `<div class="tv" dir="auto">${esc(x)}</div>`).join("")}${blk.src.map((x) => `<div class="sr">${esc(x)}</div>`).join("")}${open}</div>`);
      blk = null;
      continue;
    }
    if (l === "::sug::") {
      flush();
      sug = [];
      continue;
    }
    if (l === "::/sug::" && sug) {
      out.push(`<div class="sug">${sug.join("")}</div>`);
      sug = null;
      continue;
    }
    if ((m = l.match(/^::(\w+)::\s?(.*)$/))) {
      const [, k, v] = m;
      if (sug && k === "sl") sug.push(`<span class="sl">${esc(v)}</span>`);
      else if (sug && k === "sb") {
        const [lbl, q] = v.split(" | ");
        sug.push(`<button type="button" data-q="${esc(q || lbl)}" dir="auto">${esc(lbl)}</button>`);
      } else if (blk && k === "tl") blk.tl = v;
      else if (blk && k === "src") blk.src.push(v);
      else if (blk && k === "tv") blk.tv.push(v);
      else if (k === "note") {
        flush();
        out.push(`<div class="note" dir="auto">${esc(v)}</div>`);
      }
      continue; // ::ctx:: və digər xidməti sətirlər göstərilmir
    }
    if (blk) {
      if (l.trim()) blk.body.push(l);
    } else if (sug) {
    } else if (!l.trim()) flush();
    else para.push(l);
  }
  flush();
  // AI cavabı kitabxana çıxarışlarına əsaslanıbsa: mənbələr və «Kitabda aç» linkləri
  if (sources && sources.length)
    out.push(`<div class="srcs"><div class="sl">${esc(t("aiSources"))}</div>${sources.map((x) => `<a class="openb" dir="auto" href="/kitab/${encodeURIComponent(x.book)}?p=${Number(x.p) || 1}${x.q ? "&q=" + encodeURIComponent(x.q) : ""}">📖 ${esc(x.title || "")} · ${esc(x.ref || "")}</a>`).join("")}</div>`);
  return out.join("");
}

function add(role, text, scroll = true, links = [], sources = []) {
  const d = document.createElement("div");
  d.className = "msg" + (role === "user" ? " me" : "");
  d.innerHTML = `<div class="bub" dir="auto">${role === "user" ? esc(text) : render(text, links, sources)}</div>`;
  $("#log").append(d);
  if (scroll) d.scrollIntoView({ block: "end", behavior: "smooth" });
  return d;
}
$("#log").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-q]");
  if (b) ask(b.dataset.q);
});

let busy = false;
async function ask(q) {
  q = String(q || "").trim();
  if (!q || busy) return;
  busy = true;
  $("#ex").classList.add("hidden");
  add("user", q);
  const wait = add("assistant", "");
  wait.querySelector(".bub").innerHTML = `<span class="dots muted">${esc(t("loading").replace(/…$/, ""))}</span>`;
  let reply = t("aiErr");
  let links = [];
  let sources = [];
  try {
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, messages: hist.slice(-12).map(({ role, text }) => ({ role, text })) }) });
    const j = await r.json();
    if (j && j.reply) reply = j.reply;
    if (j && Array.isArray(j.links)) links = j.links;
    if (j && Array.isArray(j.sources)) sources = j.sources;
  } catch {}
  wait.querySelector(".bub").innerHTML = render(reply, links, sources);
  hist.push({ role: "user", text: q }, { role: "assistant", text: reply, links, sources });
  hist = hist.slice(-20);
  sessionStorage.setItem(KEY, JSON.stringify(hist));
  busy = false;
}
$("#f").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#m").value;
  $("#m").value = "";
  ask(v);
});
$("#m").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("#f").requestSubmit();
  }
});
for (const m of hist) add(m.role, m.text, false, m.links || [], m.sources || []);
if (hist.length) $("#ex").classList.add("hidden");
