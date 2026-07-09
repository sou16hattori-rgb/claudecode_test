"use strict";

/* ================================================================
 * 株式売買記録アプリ
 *  - 取引（買い/売り）の記録: 目的・投資期間・損切ライン付き
 *  - 移動平均法による実現損益の自動計算
 *  - 配当金の記録と月次損益通算
 *  - 銘柄コード → 銘柄名の自動表示（stocks.js の東証マスタ）
 *  - server.js 経由で現在値・1株配当（直近1年実績）を自動取得
 * ================================================================ */

const STORAGE_KEY = "kabuTrackerV1";

let state = {
  trades: [],     // {id, date, side, code, name, shares, price, fee, purpose, horizon, stopLoss, memo}
  dividends: [],  // {id, date, code, name, amount, memo}
  quotes: {},     // code -> {price, dps, name, updatedAt}
};

let serverAvailable = false;
let editingTradeId = null;

/* ---------------- 永続化 ---------------- */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      state.trades = d.trades || [];
      state.dividends = d.dividends || [];
      state.quotes = d.quotes || {};
    }
  } catch (e) {
    console.error("データの読み込みに失敗:", e);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------------- 共通ユーティリティ ---------------- */

function fmtYen(v, { sign = false, dash = false } = {}) {
  if (v == null || Number.isNaN(v)) return dash ? "−" : "";
  const s = Math.round(v).toLocaleString("ja-JP");
  if (sign && v > 0) return "+" + s;
  return s;
}

function fmtPrice(v) {
  if (v == null || Number.isNaN(v)) return "−";
  return v.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}

function plClass(v) {
  if (v > 0) return "pl-pos";
  if (v < 0) return "pl-neg";
  return "";
}

function normalizeCode(raw) {
  // 全角英数字 → 半角、大文字化
  return (raw || "")
    .trim()
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toUpperCase();
}

function lookupStock(code) {
  if (typeof STOCK_MASTER !== "undefined" && STOCK_MASTER[code]) {
    const [name, market, industry] = STOCK_MASTER[code];
    return { name, market, industry };
  }
  if (state.quotes[code] && state.quotes[code].name) {
    return { name: state.quotes[code].name, market: "", industry: "" };
  }
  return null;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- 損益計算（移動平均法） ---------------- */

/**
 * 取引を日付順に処理し、
 *  - positions: 現在の保有状況 code -> {shares, avgCost, lastBuy}
 *  - realizedByTrade: 売り取引id -> 実現損益
 * を返す。売却時の実現損益 = 受渡金額(株数×単価−手数料) − 平均取得単価×株数
 */
function computeAll() {
  const trades = [...state.trades].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );
  const positions = {}; // code -> {shares, totalCost, lastBuy}
  const realizedByTrade = {};

  for (const t of trades) {
    const p = (positions[t.code] ||= { shares: 0, totalCost: 0, lastBuy: null });
    if (t.side === "buy") {
      p.shares += t.shares;
      p.totalCost += t.shares * t.price + (t.fee || 0);
      p.lastBuy = t;
    } else {
      const avg = p.shares > 0 ? p.totalCost / p.shares : 0;
      const sellShares = Math.min(t.shares, p.shares);
      const oversold = t.shares > p.shares;
      const proceeds = t.shares * t.price - (t.fee || 0);
      // 保有超過分は取得原価0として扱う（データ入力漏れの可能性を警告）
      realizedByTrade[t.id] = {
        pl: proceeds - avg * sellShares,
        oversold,
      };
      p.shares -= sellShares;
      p.totalCost -= avg * sellShares;
      if (p.shares === 0) p.totalCost = 0;
    }
  }
  return { positions, realizedByTrade };
}

/** 指定日時点の保有株数（配当の自動計算用） */
function sharesHeldAt(code, dateStr) {
  let shares = 0;
  const trades = [...state.trades]
    .filter((t) => t.code === code && t.date <= dateStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const t of trades) {
    shares += t.side === "buy" ? t.shares : -t.shares;
  }
  return Math.max(0, shares);
}

/** 月次サマリー: "YYYY-MM" -> {realized, dividend} */
function monthlySummary() {
  const { realizedByTrade } = computeAll();
  const months = {};
  const get = (ym) => (months[ym] ||= { realized: 0, dividend: 0 });

  for (const t of state.trades) {
    if (t.side === "sell" && realizedByTrade[t.id]) {
      get(t.date.slice(0, 7)).realized += realizedByTrade[t.id].pl;
    }
  }
  for (const d of state.dividends) {
    get(d.date.slice(0, 7)).dividend += d.amount;
  }
  return months;
}

/* ---------------- サーバーAPI（現在値・配当の自動取得） ---------------- */

async function checkServer() {
  try {
    const res = await fetch("api/ping", { cache: "no-store" });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
  document.getElementById("offline-notice").hidden = serverAvailable;
}

async function fetchQuote(code) {
  if (!serverAvailable) return null;
  try {
    const res = await fetch(`api/quote?code=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const q = await res.json();
    if (q.error) return null;
    state.quotes[code] = {
      price: q.price ?? null,
      dps: q.dps ?? null,
      name: q.name || (state.quotes[code] && state.quotes[code].name) || "",
      updatedAt: new Date().toISOString(),
    };
    save();
    return state.quotes[code];
  } catch {
    return null;
  }
}

/* ---------------- 銘柄コード入力の自動補完 ---------------- */

function bindCodeLookup(codeInput, nameInput, infoEl) {
  const update = async () => {
    const code = normalizeCode(codeInput.value);
    codeInput.value = code;
    if (code.length < 4) {
      if (infoEl) infoEl.innerHTML = "";
      return;
    }
    const hit = lookupStock(code);
    if (hit) {
      nameInput.value = hit.name;
      if (infoEl) {
        const extra = [hit.market, hit.industry].filter(Boolean).join("・");
        infoEl.innerHTML = `<span class="found">✓ ${esc(hit.name)}</span>${extra ? ` <span>（${esc(extra)}）</span>` : ""}`;
      }
    } else {
      if (infoEl) infoEl.innerHTML = `<span class="notfound">マスタに見つかりません（銘柄名を手入力できます）</span>`;
    }
    // サーバーがあれば現在値・配当も取得して表示
    if (serverAvailable && infoEl) {
      const q = state.quotes[code] || (await fetchQuote(code));
      if (q && (q.price != null || q.dps != null)) {
        if (!nameInput.value && q.name) nameInput.value = q.name;
        const parts = [];
        if (q.price != null) parts.push(`現在値 ${fmtPrice(q.price)}円`);
        if (q.dps != null) parts.push(`1株配当(年) ${fmtPrice(q.dps)}円`);
        infoEl.innerHTML += ` <span>｜ ${parts.join("・")}</span>`;
      }
    }
  };
  codeInput.addEventListener("input", () => {
    const code = normalizeCode(codeInput.value);
    if (code.length >= 4) update();
    else if (infoEl) infoEl.innerHTML = "";
  });
  codeInput.addEventListener("blur", update);
}

/* ---------------- タブ切替 ---------------- */

function initTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      renderAll();
    });
  });
}

/* ---------------- 取引フォーム ---------------- */

function currentSide() {
  return document.querySelector('input[name="side"]:checked').value;
}

function updateBuyOnlyFields() {
  const isBuy = currentSide() === "buy";
  document.querySelectorAll(".buy-only").forEach((el) => {
    el.style.display = isBuy ? "" : "none";
  });
}

function resetTradeForm() {
  editingTradeId = null;
  const form = document.getElementById("trade-form");
  form.reset();
  document.getElementById("t-date").value = todayStr();
  document.getElementById("t-stockinfo").innerHTML = "";
  document.getElementById("trade-form-title").textContent = "取引を記録";
  document.getElementById("trade-submit").textContent = "記録する";
  document.getElementById("trade-cancel").hidden = true;
  updateBuyOnlyFields();
}

function initTradeForm() {
  document.querySelectorAll('input[name="side"]').forEach((r) =>
    r.addEventListener("change", updateBuyOnlyFields)
  );

  bindCodeLookup(
    document.getElementById("t-code"),
    document.getElementById("t-name"),
    document.getElementById("t-stockinfo")
  );

  document.getElementById("trade-cancel").addEventListener("click", resetTradeForm);

  document.getElementById("trade-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const side = currentSide();
    const code = normalizeCode(document.getElementById("t-code").value);
    const trade = {
      id: editingTradeId || uid(),
      date: document.getElementById("t-date").value,
      side,
      code,
      name: document.getElementById("t-name").value.trim() || (lookupStock(code)?.name ?? code),
      shares: Number(document.getElementById("t-shares").value),
      price: Number(document.getElementById("t-price").value),
      fee: Number(document.getElementById("t-fee").value) || 0,
      purpose: side === "buy" ? document.getElementById("t-purpose").value.trim() : "",
      horizon: side === "buy" ? document.getElementById("t-horizon").value : "",
      stopLoss: side === "buy" && document.getElementById("t-stoploss").value !== ""
        ? Number(document.getElementById("t-stoploss").value) : null,
      memo: document.getElementById("t-memo").value.trim(),
    };

    if (editingTradeId) {
      const i = state.trades.findIndex((t) => t.id === editingTradeId);
      if (i >= 0) state.trades[i] = trade;
    } else {
      state.trades.push(trade);
    }
    save();
    resetTradeForm();
    renderAll();
    if (serverAvailable && !state.quotes[code]) fetchQuote(code).then(renderAll);
  });

  resetTradeForm();
}

function editTrade(id) {
  const t = state.trades.find((x) => x.id === id);
  if (!t) return;
  editingTradeId = id;
  document.querySelector(`input[name="side"][value="${t.side}"]`).checked = true;
  document.getElementById("t-date").value = t.date;
  document.getElementById("t-code").value = t.code;
  document.getElementById("t-name").value = t.name;
  document.getElementById("t-shares").value = t.shares;
  document.getElementById("t-price").value = t.price;
  document.getElementById("t-fee").value = t.fee;
  document.getElementById("t-purpose").value = t.purpose || "";
  document.getElementById("t-horizon").value = t.horizon || "短期";
  document.getElementById("t-stoploss").value = t.stopLoss ?? "";
  document.getElementById("t-memo").value = t.memo || "";
  document.getElementById("trade-form-title").textContent = "取引を編集";
  document.getElementById("trade-submit").textContent = "更新する";
  document.getElementById("trade-cancel").hidden = false;
  updateBuyOnlyFields();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteTrade(id) {
  const t = state.trades.find((x) => x.id === id);
  if (!t) return;
  if (!confirm(`${t.date} ${t.name} の${t.side === "buy" ? "買い" : "売り"}取引を削除しますか？`)) return;
  state.trades = state.trades.filter((x) => x.id !== id);
  save();
  renderAll();
}

/* ---------------- 取引一覧の描画 ---------------- */

function renderTrades() {
  const { realizedByTrade } = computeAll();
  const tbody = document.querySelector("#trades-table tbody");
  const trades = [...state.trades].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );
  document.getElementById("trades-empty").hidden = trades.length > 0;

  tbody.innerHTML = trades.map((t) => {
    const r = t.side === "sell" ? realizedByTrade[t.id] : null;
    const plCell = r
      ? `<td class="num ${plClass(r.pl)}">${fmtYen(r.pl, { sign: true })}${r.oversold ? ' <span class="badge alert" title="保有株数を超える売却です。買い取引の記録漏れがないか確認してください">株数超過</span>' : ""}</td>`
      : '<td class="num">−</td>';
    const purposeMemo = [t.purpose, t.memo].filter(Boolean).join(" / ");
    return `<tr>
      <td>${esc(t.date)}</td>
      <td><span class="badge ${t.side}">${t.side === "buy" ? "買い" : "売り"}</span></td>
      <td>${esc(t.code)}</td>
      <td>${esc(t.name)}</td>
      <td class="num">${fmtYen(t.shares)}</td>
      <td class="num">${fmtPrice(t.price)}</td>
      <td class="num">${fmtYen(t.fee)}</td>
      ${plCell}
      <td>${esc(t.horizon || "−")}</td>
      <td class="num">${t.stopLoss != null ? fmtPrice(t.stopLoss) : "−"}</td>
      <td>${esc(purposeMemo || "−")}</td>
      <td>
        <button class="btn ghost small" onclick="editTrade('${t.id}')">編集</button>
        <button class="btn ghost small" onclick="deleteTrade('${t.id}')">削除</button>
      </td>
    </tr>`;
  }).join("");
}

/* ---------------- 保有銘柄の描画 ---------------- */

function renderPortfolio() {
  const { positions } = computeAll();
  const tbody = document.querySelector("#portfolio-table tbody");
  const held = Object.entries(positions)
    .filter(([, p]) => p.shares > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  document.getElementById("portfolio-empty").hidden = held.length > 0;

  tbody.innerHTML = held.map(([code, p]) => {
    const stock = lookupStock(code);
    const name = (p.lastBuy && p.lastBuy.name) || (stock && stock.name) || code;
    const avg = p.totalCost / p.shares;
    const q = state.quotes[code] || {};
    const price = q.price ?? null;
    const dps = q.dps ?? null;
    const evalPl = price != null ? (price - avg) * p.shares : null;
    const stopLoss = p.lastBuy ? p.lastBuy.stopLoss : null;
    const hit = price != null && stopLoss != null && price <= stopLoss;
    const annualDiv = dps != null ? dps * p.shares : null;

    return `<tr class="${hit ? "stoploss-hit" : ""}">
      <td>${esc(code)}</td>
      <td>${esc(name)}</td>
      <td class="num">${fmtYen(p.shares)}</td>
      <td class="num">${fmtPrice(avg)}</td>
      <td class="num">${fmtYen(p.totalCost)}</td>
      <td class="num">${price != null ? fmtPrice(price) : "−"}</td>
      <td class="num ${evalPl != null ? plClass(evalPl) : ""}">${evalPl != null ? fmtYen(evalPl, { sign: true }) : "−"}</td>
      <td class="num">${stopLoss != null ? fmtPrice(stopLoss) : "−"}</td>
      <td>${hit ? '<span class="badge alert">⚠ 損切ライン到達</span>' : (price != null && stopLoss != null ? '<span class="badge">OK</span>' : "−")}</td>
      <td class="num">${dps != null ? fmtPrice(dps) : "−"}</td>
      <td class="num">${annualDiv != null ? fmtYen(annualDiv) : "−"}</td>
      <td>${esc((p.lastBuy && p.lastBuy.horizon) || "−")}</td>
      <td>${esc((p.lastBuy && p.lastBuy.purpose) || "−")}</td>
      <td><button class="btn ghost small" onclick="refreshQuote('${esc(code)}', this)" ${serverAvailable ? "" : "disabled title='node server.js で起動すると使えます'"}>更新</button></td>
    </tr>`;
  }).join("");
}

async function refreshQuote(code, btn) {
  if (btn) { btn.disabled = true; btn.textContent = "..."; }
  await fetchQuote(code);
  renderAll();
}

async function refreshAllQuotes() {
  const btn = document.getElementById("btn-refresh-all");
  const { positions } = computeAll();
  const codes = Object.entries(positions).filter(([, p]) => p.shares > 0).map(([c]) => c);
  if (!serverAvailable) {
    alert("自動取得には node server.js での起動が必要です。");
    return;
  }
  btn.disabled = true;
  btn.textContent = "取得中...";
  for (const code of codes) {
    await fetchQuote(code);
  }
  btn.disabled = false;
  btn.textContent = "現在値・配当を一括更新";
  renderAll();
}

/* ---------------- 配当金 ---------------- */

function initDividendForm() {
  document.getElementById("d-date").value = todayStr();
  bindCodeLookup(
    document.getElementById("d-code"),
    document.getElementById("d-name"),
    null
  );

  document.getElementById("btn-div-auto").addEventListener("click", async () => {
    const code = normalizeCode(document.getElementById("d-code").value);
    const date = document.getElementById("d-date").value || todayStr();
    if (!code) { alert("先に銘柄コードを入力してください。"); return; }

    const shares = sharesHeldAt(code, date);
    if (shares === 0) {
      alert("その日付時点でこの銘柄の保有株数が0株です。取引履歴を確認してください。");
      return;
    }
    let q = state.quotes[code];
    if ((!q || q.dps == null) && serverAvailable) q = await fetchQuote(code);
    if (!q || q.dps == null) {
      alert("1株配当を取得できませんでした。node server.js での起動が必要です（または受取額を手入力してください）。");
      return;
    }
    // 日本株は年2回配当が一般的なため、1回分 = 年間配当の半分を既定とする
    const half = q.dps / 2;
    const amount = Math.round(half * shares);
    document.getElementById("d-amount").value = amount;
    document.getElementById("d-memo").value =
      `自動計算: ${fmtPrice(half)}円/株(年間${fmtPrice(q.dps)}円の半期分) × ${shares}株`;
  });

  document.getElementById("div-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = normalizeCode(document.getElementById("d-code").value);
    state.dividends.push({
      id: uid(),
      date: document.getElementById("d-date").value,
      code,
      name: document.getElementById("d-name").value.trim() || (lookupStock(code)?.name ?? code),
      amount: Number(document.getElementById("d-amount").value),
      memo: document.getElementById("d-memo").value.trim(),
    });
    save();
    e.target.reset();
    document.getElementById("d-date").value = todayStr();
    renderAll();
  });
}

function deleteDividend(id) {
  const d = state.dividends.find((x) => x.id === id);
  if (!d) return;
  if (!confirm(`${d.date} ${d.name} の配当記録（${fmtYen(d.amount)}円）を削除しますか？`)) return;
  state.dividends = state.dividends.filter((x) => x.id !== id);
  save();
  renderAll();
}

function renderDividends() {
  const tbody = document.querySelector("#div-table tbody");
  const list = [...state.dividends].sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById("div-empty").hidden = list.length > 0;
  tbody.innerHTML = list.map((d) => `<tr>
    <td>${esc(d.date)}</td>
    <td>${esc(d.code)}</td>
    <td>${esc(d.name)}</td>
    <td class="num pl-pos">${fmtYen(d.amount)}</td>
    <td>${esc(d.memo || "−")}</td>
    <td><button class="btn ghost small" onclick="deleteDividend('${d.id}')">削除</button></td>
  </tr>`).join("");
}

/* ---------------- 月次損益 ---------------- */

function availableYears() {
  const years = new Set();
  for (const t of state.trades) years.add(t.date.slice(0, 4));
  for (const d of state.dividends) years.add(d.date.slice(0, 4));
  if (years.size === 0) years.add(String(new Date().getFullYear()));
  return [...years].sort().reverse();
}

function renderMonthly() {
  const sel = document.getElementById("year-select");
  const years = availableYears();
  const prev = sel.value;
  sel.innerHTML = years.map((y) => `<option value="${y}">${y}年</option>`).join("");
  sel.value = years.includes(prev) ? prev : years[0];
  const year = sel.value;

  const months = monthlySummary();
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, "0")}`;
    const v = months[ym] || { realized: 0, dividend: 0 };
    rows.push({ month: m, ym, realized: v.realized, dividend: v.dividend, total: v.realized + v.dividend });
  }

  // 年間サマリータイル
  const yearRealized = rows.reduce((s, r) => s + r.realized, 0);
  const yearDiv = rows.reduce((s, r) => s + r.dividend, 0);
  const yearTotal = yearRealized + yearDiv;
  document.getElementById("year-stats").innerHTML = `
    <div class="stat-tile"><div class="stat-label">年間実現損益</div><div class="stat-value ${plClass(yearRealized)}">${fmtYen(yearRealized, { sign: true })}円</div></div>
    <div class="stat-tile"><div class="stat-label">年間配当金</div><div class="stat-value ${plClass(yearDiv)}">${fmtYen(yearDiv, { sign: true })}円</div></div>
    <div class="stat-tile"><div class="stat-label">年間合計（損益通算）</div><div class="stat-value ${plClass(yearTotal)}">${fmtYen(yearTotal, { sign: true })}円</div></div>
  `;

  // 月次テーブル（累計付き）
  let cum = 0;
  const tbody = document.querySelector("#monthly-table tbody");
  tbody.innerHTML = rows.map((r) => {
    cum += r.total;
    return `<tr>
      <td>${r.month}月</td>
      <td class="num ${plClass(r.realized)}">${fmtYen(r.realized, { sign: true })}</td>
      <td class="num ${plClass(r.dividend)}">${fmtYen(r.dividend, { sign: true })}</td>
      <td class="num ${plClass(r.total)}">${fmtYen(r.total, { sign: true })}</td>
      <td class="num ${plClass(cum)}">${fmtYen(cum, { sign: true })}</td>
    </tr>`;
  }).join("");

  renderChart(rows);
}

/* 月別合計損益の縦棒グラフ（SVG、正=青/負=赤のダイバージング） */
function renderChart(rows) {
  const W = 760, H = 260;
  const PAD = { top: 16, right: 12, bottom: 28, left: 64 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.total)));
  // 目盛りをきりのよい値に
  const step = niceStep(maxAbs);
  const limit = Math.ceil(maxAbs / step) * step;

  const y = (v) => PAD.top + plotH / 2 - (v / limit) * (plotH / 2);
  const baselineY = y(0);
  const slotW = plotW / 12;
  const barW = Math.min(36, slotW * 0.6);

  let grid = "";
  for (let v = -limit; v <= limit; v += step) {
    const yy = y(v);
    grid += `<line class="${v === 0 ? "baseline" : "gridline"}" x1="${PAD.left}" y1="${yy}" x2="${W - PAD.right}" y2="${yy}"/>`;
    grid += `<text class="axis-label" x="${PAD.left - 8}" y="${yy + 4}" text-anchor="end">${fmtYen(v)}</text>`;
  }

  let bars = "", hits = "", labels = "";
  rows.forEach((r, i) => {
    const cx = PAD.left + slotW * i + slotW / 2;
    labels += `<text class="axis-label" x="${cx}" y="${H - 8}" text-anchor="middle">${r.month}月</text>`;
    if (r.total !== 0) {
      const vy = y(r.total);
      const top = Math.min(vy, baselineY);
      const h = Math.abs(vy - baselineY);
      const rx = Math.min(4, h);
      const x0 = cx - barW / 2;
      // 値側の端のみ4px角丸、基線側は直角
      const d = r.total > 0
        ? `M${x0},${baselineY} L${x0},${top + rx} Q${x0},${top} ${x0 + rx},${top} L${x0 + barW - rx},${top} Q${x0 + barW},${top} ${x0 + barW},${top + rx} L${x0 + barW},${baselineY} Z`
        : `M${x0},${baselineY} L${x0},${top + h - rx} Q${x0},${top + h} ${x0 + rx},${top + h} L${x0 + barW - rx},${top + h} Q${x0 + barW},${top + h} ${x0 + barW},${top + h - rx} L${x0 + barW},${baselineY} Z`;
      bars += `<path class="${r.total > 0 ? "bar-pos" : "bar-neg"}" d="${d}"/>`;
    }
    hits += `<rect class="hit" data-i="${i}" x="${PAD.left + slotW * i}" y="${PAD.top}" width="${slotW}" height="${plotH}"/>`;
  });

  const chart = document.getElementById("chart");
  chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="月別合計損益の棒グラフ">${grid}${bars}${labels}${hits}</svg>`;

  // ホバーツールチップ
  const tooltip = document.getElementById("chart-tooltip");
  chart.querySelectorAll(".hit").forEach((rect) => {
    rect.addEventListener("mousemove", (e) => {
      const r = rows[Number(rect.dataset.i)];
      tooltip.innerHTML = `
        <div class="tt-title">${r.ym.replace("-", "年")}月</div>
        <div class="tt-row"><span>実現損益</span><span class="${plClass(r.realized)}">${fmtYen(r.realized, { sign: true })}円</span></div>
        <div class="tt-row"><span>配当金</span><span class="${plClass(r.dividend)}">${fmtYen(r.dividend, { sign: true })}円</span></div>
        <div class="tt-row"><span>合計</span><span class="${plClass(r.total)}">${fmtYen(r.total, { sign: true })}円</span></div>`;
      tooltip.hidden = false;
      const area = chart.parentElement.getBoundingClientRect();
      let tx = e.clientX - area.left + 14;
      const ty = e.clientY - area.top + 14;
      if (tx + 170 > area.width) tx -= 190;
      tooltip.style.left = tx + "px";
      tooltip.style.top = ty + "px";
    });
    rect.addEventListener("mouseleave", () => { tooltip.hidden = true; });
  });
}

function niceStep(maxAbs) {
  const raw = maxAbs / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) {
    if (raw <= m * mag) return m * mag;
  }
  return 10 * mag;
}

/* ---------------- エクスポート / インポート ---------------- */

function initImportExport() {
  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kabu-tracker-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("btn-import").addEventListener("click", () =>
    document.getElementById("import-file").click()
  );
  document.getElementById("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!Array.isArray(d.trades)) throw new Error("形式が不正です");
        if (!confirm(`取引${d.trades.length}件・配当${(d.dividends || []).length}件を読み込み、現在のデータを置き換えます。よろしいですか？`)) return;
        state.trades = d.trades;
        state.dividends = d.dividends || [];
        state.quotes = d.quotes || {};
        save();
        renderAll();
      } catch (err) {
        alert("読み込みに失敗しました: " + err.message);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });
}

/* ---------------- 全体描画・初期化 ---------------- */

function renderAll() {
  renderTrades();
  renderPortfolio();
  renderDividends();
  renderMonthly();
}

document.addEventListener("DOMContentLoaded", async () => {
  load();
  initTabs();
  initTradeForm();
  initDividendForm();
  initImportExport();
  document.getElementById("year-select").addEventListener("change", renderMonthly);
  document.getElementById("btn-refresh-all").addEventListener("click", refreshAllQuotes);
  renderAll();
  await checkServer();
  renderAll();
});
