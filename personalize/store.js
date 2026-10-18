"use strict";
const API = window.STORE_API;
const ETSY = window.STORE_MODE === "etsy";             // preview here, buy "Personalized with name" on Etsy
const $ = (s) => document.querySelector(s);
let catalog = [], chosen = null, level = "";
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿĀ-ž][A-Za-zÀ-ÖØ-öø-ÿĀ-ž' .-]{0,19}$/;

async function loadCatalog() {
  try { if (ETSY) throw new Error("static"); catalog = await (await fetch(API + "/api/catalog")).json(); }
  catch (e) { catalog = await (await fetch("catalog.json")).json(); }          // the API is down: still show the books
  const want = new URLSearchParams(location.search).get("book");
  chosen = catalog.find((b) => String(b.id) === want) || null;
  renderBooks(); drawCover();
  if (new URLSearchParams(location.search).get("cancelled")) showError("Payment cancelled. Nothing was charged.");
}

const coverUrl = (b) => b.cover.startsWith("api/") ? `${API}/${b.cover}` : b.cover;   // live covers come from the API

function renderBooks() {
  const list = catalog.filter((b) => !level || String(b.level) === level);
  const box = $("#books"); box.innerHTML = "";
  $("#books-empty").hidden = list.length > 0;
  list.forEach((b, i) => {
    const el = document.createElement("button");
    el.type = "button"; el.className = "book"; el.setAttribute("role", "radio");
    el.setAttribute("aria-checked", chosen && chosen.id === b.id ? "true" : "false");
    el.tabIndex = (chosen ? chosen.id === b.id : i === 0) ? 0 : -1;
    const img = document.createElement("img"); img.src = coverUrl(b); img.alt = ""; img.loading = "lazy";
    const t = document.createElement("div"); t.className = "t";
    const badge = document.createElement("span"); badge.className = "badge"; badge.textContent = `Level ${b.level || "-"}`;
    const meta = document.createElement("span"); meta.className = "muted"; meta.style.fontSize = "var(--text-xs)";
    meta.textContent = ` ${Number(b.pages) || ""} pages${b.story ? " · story" : ""}`;
    el.append(img, t, " ", badge, meta);                                        // text only: catalog data never becomes HTML
    el.querySelector(".t").textContent = b.title;
    el.addEventListener("click", () => choose(b));
    el.addEventListener("keydown", (e) => {
      const btns = [...box.querySelectorAll(".book")], k = btns.indexOf(el);
      if (["ArrowRight", "ArrowDown"].includes(e.key)) { e.preventDefault(); btns[(k + 1) % btns.length].focus(); }
      if (["ArrowLeft", "ArrowUp"].includes(e.key)) { e.preventDefault(); btns[(k - 1 + btns.length) % btns.length].focus(); }
    });
    box.appendChild(el);
  });
}

function choose(b) {
  chosen = b; renderBooks(); drawCover();
  $("#chosen").textContent = "Book: " + b.title;
  const sheet = coverUrl(b).replace(/\.jpg$/, "-pages.jpg");
  (ETSY ? fetch(sheet, { method: "HEAD" }) : fetch(sheet)).then((r) => { $("#allpages").hidden = !r.ok; $("#allpages").href = sheet; }).catch(() => {});
  history.replaceState(null, "", "?book=" + b.id);
  if (window.innerWidth < 760) $("#make").scrollIntoView({ behavior: "smooth" });
}

const coverImg = new Image(); let coverFor = null;
function drawCover() {
  const c = $("#cover"), d = c.getContext("2d"), name = $("#name").value.trim();
  d.fillStyle = "#FFFFFF"; d.fillRect(0, 0, c.width, c.height);
  if (!chosen) { d.fillStyle = "#5A5146"; d.font = "600 40px Fredoka, sans-serif"; d.textAlign = "center";
    d.fillText("Pick a book to see it here", c.width / 2, c.height / 2); return; }
  if (coverFor !== chosen.cover) { coverFor = chosen.cover; coverImg.onload = drawCover; coverImg.crossOrigin = "anonymous"; coverImg.src = coverUrl(chosen); return; }
  if (!coverImg.complete) return;
  const s = Math.max(c.width / coverImg.width, c.height / coverImg.height);
  d.drawImage(coverImg, (c.width - coverImg.width * s) / 2, (c.height - coverImg.height * s) / 2, coverImg.width * s, coverImg.height * s);
  const text = "Made for " + (name || "______"); let size = Math.round(c.width * 0.075);
  d.font = `700 ${size}px Poppins, Fredoka, sans-serif`;
  while (d.measureText(text).width > c.width * 0.78 && size > 24) { size -= 2; d.font = `700 ${size}px Poppins, Fredoka, sans-serif`; }
  const tw = d.measureText(text).width, y0 = c.height * 0.855, h = size * 1.7, x0 = (c.width - tw) / 2 - c.width * 0.06;
  d.fillStyle = "#C8432F"; d.strokeStyle = "#111111"; d.lineWidth = c.width * 0.008;
  d.beginPath(); d.roundRect(x0, y0, tw + c.width * 0.12, h, h / 2); d.fill(); d.stroke();
  d.fillStyle = "#FFFFFF"; d.textAlign = "left"; d.textBaseline = "middle"; d.fillText(text, (c.width - tw) / 2, y0 + h / 2);
  $("#cover").setAttribute("aria-label", `Cover preview: ${chosen.title}, made for ${name || "your child"}`);
}

function validName() {
  const v = $("#name").value.trim().replace(/\s+/g, " ");
  $("#count").textContent = `${v.length}/20`;
  const ok = !v || NAME_RE.test(v);
  $("#name-field").classList.toggle("error", !ok); $("#name").setAttribute("aria-invalid", ok ? "false" : "true");
  $("#name-msg").textContent = ok ? "Letters only, up to 20." : "Please use letters only (like Ava or Mary-Kate).";
  return ok && v.length > 0;
}

function showError(msg) { const e = $("#err"); e.textContent = msg; e.hidden = !msg; }

$("#name").addEventListener("input", () => { validName(); drawCover(); });
$("#levels").addEventListener("click", (e) => {
  const b = e.target.closest(".chip"); if (!b) return;
  level = b.dataset.level; document.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  renderBooks();
});
$("#form").addEventListener("submit", async (e) => {
  e.preventDefault(); showError("");
  if (!chosen) { showError("Pick a book first."); $("#pick").scrollIntoView({ behavior: "smooth" }); return; }
  if (!validName()) { $("#name").focus(); if (!$("#name").value.trim()) showError("Type your child's first name."); return; }
  if (ETSY) {                                                                   // hand over to Etsy with the name ready
    const name = $("#name").value.trim().replace(/\s+/g, " ");
    try { await navigator.clipboard.writeText(name); } catch (e) {}
    $("#handoff-name").textContent = name; $("#handoff").hidden = false;
    $("#handoff-link").href = chosen.etsy; window.open(chosen.etsy, "_blank", "noopener");
    $("#handoff").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const btn = $("#buy"), label = btn.innerHTML;
  btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Opening secure checkout…';
  try {
    const r = await fetch(API + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book_id: chosen.id, child_name: $("#name").value.trim(), marketing_ok: $("#news").checked }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || "Something went wrong.");
    location.href = j.checkout_url;
  } catch (err) {
    showError(err.message === "Failed to fetch" ? "We can't reach the shop right now. Please try again in a minute." : err.message);
    btn.disabled = false; btn.removeAttribute("aria-busy"); btn.innerHTML = label;
  }
});
if (window.STORE_TEST) {                                                       // test deploy: say so on every visit
  const b = document.createElement("div"); b.className = "notice"; b.setAttribute("role", "status");
  b.style.cssText = "border-radius:0;text-align:center;border-left:0;border-right:0";
  b.textContent = "Test mode: no real money is taken. Pay with Stripe's test card 4242 4242 4242 4242.";
  document.body.prepend(b);
}
loadCatalog();
if (!ETSY) fetch(API + "/api/price").then((r) => r.json()).then((p) => {                 // the price shown = the price charged
  $("#price").textContent = new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency.toUpperCase() }).format(p.cents / 100);
}).catch(() => {});
