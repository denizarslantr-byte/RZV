// Piano Deri V6.1 — Ortak Yardımcılar

function checkApiConfig() {
  return API_URL && !API_URL.includes("BURAYA_APPS_SCRIPT");
}

function showApiWarning(id = "apiWarning") {
  const el = document.getElementById(id);
  if (!el) return;
  if (!checkApiConfig()) {
    el.innerHTML = "⚠️ API_URL ayarlanmamış. config/config.js dosyasına Apps Script Web App URL yazılmalı.";
    el.style.display = "block";
  } else {
    el.style.display = "none";
  }
}

function buildQS(action, params = {}) {
  return new URLSearchParams({ action, key: API_KEY, ...params });
}

async function apiGet(action, params = {}) {
  const r = await fetch(`${API_URL}?${buildQS(action, params)}`);
  const result = await r.json();
  if (result && Array.isArray(result.data)) return result.data;
  if (result && result.success !== undefined) return result;
  return result || [];
}

async function apiPost(action, body) {
  const r = await fetch(`${API_URL}?${buildQS(action)}`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return await r.json();
}

// ── Tarih yardımcıları ─────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// YYYY-MM-DD → GG/AA/YYYY (görüntüleme için)
function fmtDate(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const p = s.split("-");
  if (p.length !== 3) return s;
  return p[2] + "/" + p[1] + "/" + p[0];
}

// GG/AA/YYYY → YYYY-MM-DD (input[type=date] için)
function unFmtDate(display) {
  if (!display) return "";
  if (display.includes("-")) return display; // zaten ISO
  const p = display.split("/");
  if (p.length !== 3) return display;
  return p[2] + "-" + p[1] + "-" + p[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function monthStart(dateStr) {
  return dateStr.slice(0, 8) + "01";
}

function statusLabel(s) {
  const m = { PENDING:"Bekliyor", IN_STORE:"İçeride", EXITED:"Çıktı", CANCELLED:"İptal", UPDATED:"Güncellendi" };
  return m[s] || s || "Bekliyor";
}

// Personel adının sadece ilk kelimesini döner (merkez ekran için)
function firstName(fullName) {
  if (!fullName) return "";
  return String(fullName).trim().split(" ")[0];
}

function showToast(msg, type = "ok") {
  let el = document.getElementById("__toast__");
  if (!el) {
    el = document.createElement("div");
    el.id = "__toast__";
    Object.assign(el.style, {
      position:"fixed", bottom:"24px", left:"50%", transform:"translateX(-50%)",
      padding:"11px 26px", borderRadius:"999px", fontWeight:"700", fontSize:"14px",
      transition:"opacity .4s", zIndex:"9999", pointerEvents:"none", whiteSpace:"nowrap"
    });
    document.body.appendChild(el);
  }
  el.innerText = msg;
  if (type === "ok") {
    el.style.background = "rgba(20,83,45,.95)";
    el.style.color = "#bbf7d0";
    el.style.border = "1px solid rgba(34,197,94,.5)";
  } else {
    el.style.background = "rgba(127,29,29,.95)";
    el.style.color = "#fca5a5";
    el.style.border = "1px solid rgba(248,113,113,.5)";
  }
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = "0"; }, 3200);
}

function exportCSV(headers, rows, filename) {
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// Uyruk listesi (D.xlsx'ten)
const NATION_LIST = [
  "ALBANYA","ALMAN","ARNAVUT","AVRUPA","AZERİ","BELARUS","BOSNA","BULGARİSTAN",
  "ÇEK","ÇERKES","ÇEÇEN","ÇİN","DAGİSTAN","ERMENİSTAN","ESTONYA","FRANSA",
  "GÜRCÜ","İNGİLİZ","IRAK","İSVİÇRE","İRAN","JAPON","KAFKAS","KAZAK","KIRGIZ",
  "KORE","KÜRT","LEHİSTAN","LİTVANYA","MOLDOVYA","ÖZBEK","POLONYA","ROMANYA",
  "RUS","SIRBISTAN","SLOVAK","TACİK","TATAR","TÜRKMEN","TÜRK","UKRAİN"
];

function nationOptions(selected = "") {
  return NATION_LIST.map(n => `<option value="${n}"${n===selected?" selected":""}>${n}</option>`).join("");
}
