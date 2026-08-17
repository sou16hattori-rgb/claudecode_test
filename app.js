/* ギャルコーチ — フロント本体 (localStorage + IndexedDB) */

"use strict";

/* ==================== ストレージ ==================== */

const STORE_RECORDS = "dg.records";
const STORE_SETTINGS = "dg.settings";
const STORE_CORRECTIONS = "dg.corrections";

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORE_RECORDS)) || {};
  } catch {
    return {};
  }
}
function saveRecords() {
  localStorage.setItem(STORE_RECORDS, JSON.stringify(records));
}
function loadSettings() {
  try {
    return { goal: 2000, ...(JSON.parse(localStorage.getItem(STORE_SETTINGS)) || {}) };
  } catch {
    return { goal: 2000 };
  }
}
function saveSettings() {
  localStorage.setItem(STORE_SETTINGS, JSON.stringify(settings));
}

/* AI推定のフィードバック(ユーザーの手直しを実測データとして蓄積) */
function loadCorrections() {
  try {
    return JSON.parse(localStorage.getItem(STORE_CORRECTIONS)) || [];
  } catch {
    return [];
  }
}
function saveCorrections() {
  // 直近100件だけ保持
  localStorage.setItem(STORE_CORRECTIONS, JSON.stringify(corrections.slice(-100)));
}
function recordCorrection(ai, final) {
  if (final.kcal == null) return; // カロリー未確定なら記録しない
  corrections.push({ ts: Date.now(), input: ai.input || "", ai, final });
  saveCorrections();
}
/* カロリー推定の精度統計(|実測 - 推定| / 推定) */
function estimateStats() {
  const withKcal = corrections.filter((c) => c.ai.kcal > 0 && c.final.kcal != null);
  if (!withKcal.length) return null;
  const errs = withKcal.map((c) => Math.abs(c.final.kcal - c.ai.kcal) / c.ai.kcal);
  const avgErr = Math.round((errs.reduce((a, b) => a + b, 0) / errs.length) * 100);
  const within = errs.filter((e) => e <= 0.15).length;
  return { used: withKcal.length, avgErr, within };
}
/* 直近の手直しをfew-shot例として渡す(この人の一人前をAIに学ばせる) */
function correctionExamples() {
  return corrections
    .filter((c) => c.input && c.final.kcal != null)
    .slice(-3)
    .map((c) => ({
      input: c.input,
      kcal: c.final.kcal,
      protein_g: c.final.p,
      fat_g: c.final.f,
      carbs_g: c.final.c,
    }));
}

/* 写真は容量が大きいので IndexedDB に保存する */
const photoDB = {
  db: null,
  open() {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);
      const req = indexedDB.open("dg-photos", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("photos");
      req.onsuccess = () => { this.db = req.result; resolve(this.db); };
      req.onerror = () => reject(req.error);
    });
  },
  async put(id, dataUrl) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").put(dataUrl, id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  },
  async get(id) {
    const db = await this.open();
    return new Promise((resolve) => {
      const req = db.transaction("photos").objectStore("photos").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  },
  async del(id) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").delete(id);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  },
};

/* ==================== 状態 ==================== */

const records = loadRecords();   // { "2026-07-10": { meals: [], exercises: [], advice: "" } }
const settings = loadSettings(); // { goal: 2000 }
const corrections = loadCorrections(); // AI推定の手直し履歴

const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth(); // 0-11
let selectedKey = null;           // "2026-07-10"
let editingMealId = null;
let editingExId = null;
let pendingPhoto = null;          // 圧縮済み dataURL (保存前)
let pendingEstimate = null;       // 直近のAI推定値(保存時に手直し差分を記録)

/* ==================== 日付ユーティリティ ==================== */

const DOWS = ["日", "月", "火", "水", "木", "金", "土"];

function keyOf(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function keyOfDate(date) {
  return keyOf(date.getFullYear(), date.getMonth(), date.getDate());
}
function dateOfKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function labelOfKey(key) {
  const d = dateOfKey(key);
  return `${d.getMonth() + 1}月${d.getDate()}日(${DOWS[d.getDay()]})`;
}
function dayRecord(key) {
  return records[key] || { meals: [], exercises: [], advice: "" };
}
function ensureDay(key) {
  if (!records[key]) records[key] = { meals: [], exercises: [], advice: "" };
  return records[key];
}
function mealTotal(key) {
  return dayRecord(key).meals.reduce((s, m) => s + (Number(m.kcal) || 0), 0);
}
function burnTotal(key) {
  return dayRecord(key).exercises.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
}
function hasRecord(key) {
  const r = dayRecord(key);
  return r.meals.length > 0 || r.exercises.length > 0;
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ==================== 要素 ==================== */

const $ = (id) => document.getElementById(id);
const calScreen = $("calScreen");
const dayScreen = $("dayScreen");

/* ==================== カレンダー ==================== */

function renderCalendar() {
  $("calTitle").textContent = `${viewYear}年${viewMonth + 1}月`;
  const grid = $("calGrid");
  grid.innerHTML = "";

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = keyOfDate(today);

  for (let i = 0; i < firstDow; i++) {
    const cell = document.createElement("div");
    cell.className = "day empty";
    grid.appendChild(cell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = keyOf(viewYear, viewMonth, d);
    const cell = document.createElement("button");
    cell.className = "day";
    cell.type = "button";

    const isFuture = key > todayKey;
    if (key === todayKey) cell.classList.add("today");
    if (isFuture) {
      cell.classList.add("future");
      cell.disabled = true;
    }

    let html = `<span class="num">${d}</span>`;
    const rec = dayRecord(key);
    const total = mealTotal(key);
    if (rec.meals.length > 0 && total > 0) {
      const ratio = total / settings.goal;
      if (ratio > 1) cell.classList.add("over");
      const width = Math.min(ratio, 1.2) / 1.2 * 100;
      html += `<span class="kcal-bar"><i style="width:${width}%"></i></span>`;
    }
    const marks = (rec.meals.length ? "🍽" : "") + (rec.exercises.length ? "🏃" : "");
    if (marks) html += `<span class="marks">${marks}</span>`;

    cell.innerHTML = html;
    if (!isFuture) cell.addEventListener("click", () => openDay(key));
    grid.appendChild(cell);
  }
}

$("prevMonth").addEventListener("click", () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
});
$("nextMonth").addEventListener("click", () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
});

/* ==================== サマリー & アバター ==================== */

function lastNDays(n, endDate = today) {
  const keys = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    keys.push(keyOfDate(d));
  }
  return keys; // 新しい順
}

function renderSummary() {
  const keys = lastNDays(7);
  const eaten = keys.map(mealTotal).filter((v) => v > 0);
  const avg = eaten.length ? Math.round(eaten.reduce((a, b) => a + b, 0) / eaten.length) : 0;
  $("statAvg").innerHTML = (avg ? avg.toLocaleString() : "–") + "<small>kcal</small>";

  const exCount = keys.filter((k) => dayRecord(k).exercises.length > 0).length;
  $("statExercise").innerHTML = (exCount || "–") + "<small>回</small>";

  let streak = 0;
  const start = hasRecord(keyOfDate(today)) ? 0 : 1; // 今日未記録なら昨日から数える
  for (let i = start; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (hasRecord(keyOfDate(d))) streak++;
    else break;
  }
  $("statStreak").innerHTML = (streak || "–") + "<small>日</small>";
}

/* ---- なかよし度(レベル & EXP) ----
   記録するほどギャルと仲良くなり、見た目が派手になっていく。
   食事記録 +10 / 運動記録 +25 / 目標カロリー内で1日を終えたら +30 */

const EXP_MEAL = 10;
const EXP_EXERCISE = 25;
const EXP_GOAL_DAY = 30;

const TIERS = [
  { minLv: 15, cls: "tier-5", name: "伝説のギャル" },
  { minLv: 10, cls: "tier-4", name: "カリスマギャル" },
  { minLv: 6,  cls: "tier-3", name: "イケイケギャル" },
  { minLv: 3,  cls: "tier-2", name: "ふつうのギャル" },
  { minLv: 1,  cls: "tier-1", name: "見習いギャル" },
];

function computeExp() {
  let exp = 0;
  const todayKey = keyOfDate(today);
  for (const key of Object.keys(records)) {
    const r = records[key];
    exp += (r.meals?.length || 0) * EXP_MEAL;
    exp += (r.exercises?.length || 0) * EXP_EXERCISE;
    // 目標内ボーナスは「終わった日」だけ(今日はまだ食べる可能性がある)
    const t = mealTotal(key);
    if (key < todayKey && r.meals?.length && t > 0 && t <= settings.goal) {
      exp += EXP_GOAL_DAY;
    }
  }
  return exp;
}

function xpForNext(lv) {
  return 80 + (lv - 1) * 40; // Lv1→2は80、以降+40ずつ
}

function levelFromExp(exp) {
  let lv = 1;
  let rest = exp;
  while (lv < 99 && rest >= xpForNext(lv)) {
    rest -= xpForNext(lv);
    lv++;
  }
  return { lv, into: rest, need: xpForNext(lv) };
}

function tierOf(lv) {
  return TIERS.find((t) => lv >= t.minLv) || TIERS[TIERS.length - 1];
}

/* 直近でギャルがつけた点数(なければ null) */
function latestScore() {
  for (const key of lastNDays(3)) {
    const s = dayRecord(key).score;
    if (typeof s === "number") return s;
  }
  return null;
}

function renderAvatar() {
  const { lv, into, need } = levelFromExp(computeExp());
  const tier = tierOf(lv);

  const gal = $("gal");
  gal.className = "gal"; // 一旦リセット
  gal.classList.add(tier.cls);

  // 直近7日の生活ぶり
  const keys = lastNDays(7);
  const recorded = keys.filter(hasRecord).length;
  const overDays = keys.filter((k) => {
    const t = mealTotal(k);
    return t > 0 && t > settings.goal;
  }).length;
  const exCount = keys.filter((k) => dayRecord(k).exercises.length > 0).length;

  // 体型:食べすぎが続くとぽっちゃり、節制+運動でスリム
  let bodyCls;
  if (overDays >= 4) bodyCls = "body-chubby";
  else if (overDays <= 1 && exCount >= 2 && recorded >= 3) bodyCls = "body-slim";
  else bodyCls = "body-normal";
  gal.classList.add(bodyCls);

  // 表情:ギャルの判定スコア優先。なければ記録状況から推定
  const score = latestScore();
  let mood, msg;
  if (score != null) {
    if (score >= 80) {
      mood = "mood-happy";
      msg = `${score}点!まじ神バランスじゃん✨ その調子でいこ〜`;
    } else if (score >= 60) {
      mood = "mood-smile";
      msg = `${score}点、いい感じじゃん😊 あとちょいで神いける`;
    } else if (score >= 40) {
      mood = "mood-worried";
      msg = `${score}点…うーん、ちょい崩れてるかも🥺 立て直そ`;
    } else {
      mood = "mood-angry";
      msg = `${score}点!?ちょっと〜、さすがに食べすぎじゃん💢`;
    }
  } else if (Object.keys(records).length === 0) {
    // 初回起動はウェルカムムード
    mood = "mood-happy";
    msg = "はじめまして💖 とりあえず今日食べたもの入れてみて!";
  } else if (recorded >= 5 && overDays <= 1) {
    mood = "mood-happy";
    msg = "記録えらすぎ✨ この調子でキープしよ〜";
  } else if (overDays >= 3) {
    mood = "mood-worried";
    msg = "最近食べすぎ続いてるっぽい🥺 今日は軽めにいこ";
  } else if (recorded === 0) {
    mood = "mood-angry";
    msg = "最近サボってるじゃん💢 まずは1食からいこ?";
  } else {
    mood = "mood-smile";
    msg = "記録するとギャルと仲良くなれるよ💅";
  }
  gal.classList.add(mood);

  $("avatarLv").textContent = `Lv ${lv}`;
  $("avatarState").textContent = tier.name;
  $("expFill").style.width = `${Math.min(100, Math.round((into / need) * 100))}%`;
  $("expLabel").textContent = `なかよし度 ${into} / ${need}`;
  $("avatarMsg").textContent = msg;

  // レベルアップ演出
  const lastLv = Number(localStorage.getItem("dg.lastLv") || 0);
  if (lastLv && lv > lastLv) {
    const prevTier = tierOf(lastLv);
    if (prevTier.cls !== tier.cls) {
      toast(`🎉 Lv${lv}! ${tier.name} にランクアップ💖`);
    } else {
      toast(`🎉 なかよし度 Lv${lv} になった✨`);
    }
  }
  localStorage.setItem("dg.lastLv", String(lv));
}

/* ==================== 日詳細 ==================== */

function openDay(key) {
  selectedKey = key;
  renderDay();
  calScreen.hidden = true;
  dayScreen.hidden = false;
  window.scrollTo(0, 0);
}

$("backBtn").addEventListener("click", () => {
  dayScreen.hidden = true;
  calScreen.hidden = false;
  refreshHome();
});

/* カレンダー画面から今日の記録をワンタップで開始 */
function quickAddToday(kind) {
  selectedKey = keyOfDate(today);
  renderDay();
  calScreen.hidden = true;
  dayScreen.hidden = false;
  window.scrollTo(0, 0);
  if (kind === "meal") openMealSheet(null);
  else openExSheet(null);
}
$("quickMealBtn").addEventListener("click", () => quickAddToday("meal"));
$("quickExBtn").addEventListener("click", () => quickAddToday("ex"));

function renderDay() {
  const rec = dayRecord(selectedKey);
  $("detailDate").textContent = labelOfKey(selectedKey);

  const total = mealTotal(selectedKey);
  const burn = burnTotal(selectedKey);
  const p = pfcTotal(selectedKey, "p");
  const f = pfcTotal(selectedKey, "f");
  const c = pfcTotal(selectedKey, "c");
  const pfcLine = (p || f || c)
    ? ` ・ P${Math.round(p)} F${Math.round(f)} C${Math.round(c)}`
    : "";
  $("detailSub").textContent =
    `合計 ${total.toLocaleString()} kcal / 目標 ${settings.goal.toLocaleString()} kcal` +
    (burn ? ` ・ 消費 ${burn.toLocaleString()} kcal` : "") + pfcLine;

  // 食事
  const mealList = $("mealList");
  mealList.innerHTML = "";
  if (rec.meals.length === 0) {
    mealList.innerHTML = `<div class="empty-note">まだ記録がありません。「＋ 追加」から記録しましょう。</div>`;
  }
  const slotEmoji = { 朝食: "🍳", 昼食: "🍜", 夕食: "🍚", 間食: "🍩" };
  for (const meal of rec.meals) {
    const row = document.createElement("button");
    row.className = "meal";
    row.type = "button";
    const pfc = (meal.p != null || meal.f != null || meal.c != null)
      ? `<div class="pfc">P ${fmtG(meal.p)} ・ F ${fmtG(meal.f)} ・ C ${fmtG(meal.c)}</div>`
      : "";
    row.innerHTML = `
      <div class="photo">${slotEmoji[meal.slot] || "🍽"}</div>
      <div class="meta">
        <div class="name">${escapeHtml(meal.slot)}</div>
        <div class="items">${escapeHtml(meal.items)}</div>
        ${pfc}
      </div>
      <div class="kcal">${meal.kcal ? Number(meal.kcal).toLocaleString() : "–"}<small> kcal</small></div>`;
    if (meal.photoId) {
      photoDB.get(meal.photoId).then((dataUrl) => {
        if (dataUrl) {
          row.querySelector(".photo").innerHTML = `<img src="${dataUrl}" alt="${escapeHtml(meal.slot)}の写真" />`;
        }
      });
    }
    row.addEventListener("click", () => openMealSheet(meal.id));
    mealList.appendChild(row);
  }

  // 運動
  const exList = $("exList");
  exList.innerHTML = "";
  if (rec.exercises.length === 0) {
    exList.innerHTML = `<div class="empty-note">まだ記録がありません。</div>`;
  }
  for (const ex of rec.exercises) {
    const row = document.createElement("button");
    row.className = "ex-row";
    row.type = "button";
    const label = `🏃 ${escapeHtml(ex.name)}` + (ex.minutes ? `(${ex.minutes}分)` : "");
    const burnLabel = ex.kcal ? `-${Number(ex.kcal).toLocaleString()} kcal` : "";
    row.innerHTML = `<span>${label}</span><span class="burn">${burnLabel}</span>`;
    row.addEventListener("click", () => openExSheet(ex.id));
    exList.appendChild(row);
  }

  // ギャルの判定
  const badge = $("scoreBadge");
  if (typeof rec.score === "number") {
    badge.hidden = false;
    badge.className = "score" + (rec.score < 40 ? " low" : rec.score < 60 ? " mid" : "");
    $("scoreVal").textContent = rec.score;
  } else {
    badge.hidden = true;
  }
  $("adviceHeadline").hidden = !rec.headline;
  $("adviceHeadline").textContent = rec.headline || "";
  $("adviceText").textContent = rec.advice || "まだ判定してもらってないよ〜";
  updateAdviceUI();
}

function fmtG(v) {
  return v == null ? "–" : `${round1(v)}g`;
}

function pfcTotal(key, macro) {
  return dayRecord(key).meals.reduce((s, m) => s + (Number(m[macro]) || 0), 0);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/* ==================== シート共通 ==================== */

function openSheet(id) { $(id).classList.add("open"); }
function closeSheet(id) { $(id).classList.remove("open"); }

document.querySelectorAll(".overlay").forEach((ov) => {
  ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("open"); });
  ov.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => ov.classList.remove("open"));
  });
});

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

/* ==================== 食事の記録 ==================== */

$("addMealBtn").addEventListener("click", () => openMealSheet(null));

function openMealSheet(mealId) {
  editingMealId = mealId;
  pendingPhoto = null;
  pendingEstimate = null;
  const form = $("mealForm");
  form.reset();
  $("photoPreview").hidden = true;
  $("deleteMealBtn").hidden = !mealId;
  $("mealSheetTitle").textContent = mealId ? "食事の記録を編集" : "食事を記録";

  if (mealId) {
    const meal = dayRecord(selectedKey).meals.find((m) => m.id === mealId);
    if (meal) {
      $("mealSlot").value = meal.slot;
      $("mealItems").value = meal.items;
      $("mealKcal").value = meal.kcal || "";
      $("mealP").value = meal.p ?? "";
      $("mealF").value = meal.f ?? "";
      $("mealC").value = meal.c ?? "";
      if (meal.photoId) {
        photoDB.get(meal.photoId).then((dataUrl) => {
          if (dataUrl) {
            $("photoPreviewImg").src = dataUrl;
            $("photoPreview").hidden = false;
          }
        });
      }
    }
  } else {
    // 時間帯から初期値を推測
    const h = new Date().getHours();
    $("mealSlot").value = h < 10 ? "朝食" : h < 15 ? "昼食" : h < 21 ? "夕食" : "間食";
  }
  openSheet("mealOverlay");
}

$("mealPhoto").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    pendingPhoto = await compressImage(file, 512, 0.7);
    $("photoPreviewImg").src = pendingPhoto;
    $("photoPreview").hidden = false;
  } catch {
    toast("写真の読み込みに失敗しました");
  }
});

function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* AIでカロリー・PFCを推定 */
$("estimateBtn").addEventListener("click", async () => {
  if (!backend.configured()) {
    toast("先に設定(⚙️)でAI連携を登録してください");
    return;
  }
  const text = $("mealItems").value.trim();
  if (!text && !pendingPhoto) {
    toast("食べたものか写真いれて〜🙏");
    return;
  }
  const btn = $("estimateBtn");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "推定中…";
  try {
    const r = await backend.estimate({ text, image: pendingPhoto, examples: correctionExamples() });
    if (r.kcal != null) $("mealKcal").value = Math.round(r.kcal);
    if (r.protein_g != null) $("mealP").value = round1(r.protein_g);
    if (r.fat_g != null) $("mealF").value = round1(r.fat_g);
    if (r.carbs_g != null) $("mealC").value = round1(r.carbs_g);
    if (!text && Array.isArray(r.items) && r.items.length) {
      $("mealItems").value = r.items.join("・").slice(0, 100);
    }
    // AIの提案を控えておき、保存時に手直しされたか比較する
    pendingEstimate = {
      input: $("mealItems").value.trim(),
      kcal: r.kcal != null ? Math.round(r.kcal) : null,
      p: r.protein_g != null ? round1(r.protein_g) : null,
      f: r.fat_g != null ? round1(r.fat_g) : null,
      c: r.carbs_g != null ? round1(r.carbs_g) : null,
    };
    toast("推定したよ〜✨ 違ってたら直して!");
  } catch (err) {
    toast("推定に失敗: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

$("mealForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const rec = ensureDay(selectedKey);
  let meal;
  if (editingMealId) {
    meal = rec.meals.find((m) => m.id === editingMealId);
  } else {
    meal = { id: uid() };
    rec.meals.push(meal);
  }
  meal.slot = $("mealSlot").value;
  meal.items = $("mealItems").value.trim();
  meal.kcal = $("mealKcal").value ? Number($("mealKcal").value) : null;
  meal.p = $("mealP").value ? Number($("mealP").value) : null;
  meal.f = $("mealF").value ? Number($("mealF").value) : null;
  meal.c = $("mealC").value ? Number($("mealC").value) : null;

  if (pendingPhoto) {
    const photoId = meal.photoId || uid();
    await photoDB.put(photoId, pendingPhoto);
    meal.photoId = photoId;
  }

  // AI推定を使っていたら、最終値を実測データとして記録(手直しの有無を問わず)
  if (pendingEstimate) {
    recordCorrection(pendingEstimate, { kcal: meal.kcal, p: meal.p, f: meal.f, c: meal.c });
    pendingEstimate = null;
  }

  saveRecords();
  closeSheet("mealOverlay");
  renderDay();
  toast(`食事を記録した! +${EXP_MEAL} EXP 🍽`);
});

$("deleteMealBtn").addEventListener("click", async () => {
  const rec = ensureDay(selectedKey);
  const meal = rec.meals.find((m) => m.id === editingMealId);
  if (meal && meal.photoId) await photoDB.del(meal.photoId);
  rec.meals = rec.meals.filter((m) => m.id !== editingMealId);
  saveRecords();
  closeSheet("mealOverlay");
  renderDay();
  toast("消しといたよ🗑");
});

/* ==================== 運動の記録 ==================== */

$("addExBtn").addEventListener("click", () => openExSheet(null));

function openExSheet(exId) {
  editingExId = exId;
  const form = $("exForm");
  form.reset();
  $("deleteExBtn").hidden = !exId;
  $("exSheetTitle").textContent = exId ? "運動の記録を編集" : "運動を記録";
  if (exId) {
    const ex = dayRecord(selectedKey).exercises.find((x) => x.id === exId);
    if (ex) {
      $("exName").value = ex.name;
      $("exMinutes").value = ex.minutes || "";
      $("exKcal").value = ex.kcal || "";
    }
  }
  openSheet("exOverlay");
}

$("exForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const rec = ensureDay(selectedKey);
  let ex;
  if (editingExId) {
    ex = rec.exercises.find((x) => x.id === editingExId);
  } else {
    ex = { id: uid() };
    rec.exercises.push(ex);
  }
  ex.name = $("exName").value.trim();
  ex.minutes = $("exMinutes").value ? Number($("exMinutes").value) : null;
  ex.kcal = $("exKcal").value ? Number($("exKcal").value) : null;
  saveRecords();
  closeSheet("exOverlay");
  renderDay();
  toast(`運動を記録した! +${EXP_EXERCISE} EXP 🏃`);
});

$("deleteExBtn").addEventListener("click", () => {
  const rec = ensureDay(selectedKey);
  rec.exercises = rec.exercises.filter((x) => x.id !== editingExId);
  saveRecords();
  closeSheet("exOverlay");
  renderDay();
  toast("消しといたよ🗑");
});

/* ==================== プロンプト生成 ==================== */

/* バックエンドの有無でUIを切り替え */
function updateAdviceUI() {
  const online = backend.configured();
  $("genBtn").textContent = online ? "💖 ギャルに判定してもらう" : "💖 判定用プロンプトを作る";
  $("pasteAdviceBtn").hidden = online; // オンライン時はコピペ不要
  $("estimateBtn").hidden = !online;
  $("estimateHint").hidden = online;
}

$("genBtn").addEventListener("click", async () => {
  if (!backend.configured()) {
    // フォールバック:プロンプトをコピーして手動でAIに投げる
    $("promptBox").textContent = buildPrompt(selectedKey);
    openSheet("promptOverlay");
    return;
  }
  const btn = $("genBtn");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "ギャルが見てる…👀";
  try {
    const r = await backend.advice(buildPrompt(selectedKey));
    const d = ensureDay(selectedKey);
    d.advice = r.advice || r.text || "";
    if (typeof r.score === "number") d.score = Math.max(0, Math.min(100, Math.round(r.score)));
    if (r.headline) d.headline = r.headline;
    saveRecords();
    renderDay();
    refreshHome(); // 点数で表情が変わるので反映
    toast(typeof d.score === "number" ? `ギャルの判定:${d.score}点💖` : "判定が届いたよ💖");
  } catch (err) {
    toast("取得に失敗: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

function dayLine(key) {
  const rec = dayRecord(key);
  const parts = [];
  if (rec.meals.length) {
    for (const m of rec.meals) {
      parts.push(`${m.slot}: ${m.items}${m.kcal ? `(約${m.kcal}kcal)` : ""}`);
    }
    parts.push(`合計 約${mealTotal(key)}kcal`);
  } else {
    parts.push("食事記録なし");
  }
  if (rec.exercises.length) {
    for (const x of rec.exercises) {
      parts.push(`運動: ${x.name}${x.minutes ? ` ${x.minutes}分` : ""}${x.kcal ? `(消費${x.kcal}kcal)` : ""}`);
    }
  } else {
    parts.push("運動なし");
  }
  return parts.join(" / ");
}

function buildPrompt(baseKey) {
  const total = mealTotal(baseKey);
  const remaining = settings.goal - total;
  const hour = new Date().getHours();
  const timeNote = hour < 11 ? "いまは朝" : hour < 16 ? "いまは昼過ぎ" : "いまは夕方〜夜";

  const p = Math.round(pfcTotal(baseKey, "p"));
  const f = Math.round(pfcTotal(baseKey, "f"));
  const c = Math.round(pfcTotal(baseKey, "c"));

  const lines = [];
  lines.push("あなたはギャルの栄養コーチです。ギャル語(「〜じゃん」「まじ」「神」「うける」など)と絵文字を使いつつ、栄養の中身は正確に。下の記録を見て判定してください。");
  lines.push("必ず次の順で答えてください:");
  lines.push("1. 今日のPFCバランスを100点満点で採点(点数と、なぜその点かを一言)");
  lines.push("2. 今日の残りの食事プラン:何をどれくらい食べるか(コンビニで買える具体例つき)");
  lines.push("3. 今日の運動プラン:種類・時間を具体的に。運動済みならストレッチや休養の提案でOK");
  lines.push("4. 最後にギャルらしいひとこと励まし");
  lines.push("");

  const remainLabel = remaining >= 0
    ? `目標まで残り 約${remaining}kcal`
    : `目標を 約${-remaining}kcal オーバー中`;
  lines.push(`【今日ここまで(${labelOfKey(baseKey)}・${timeNote})】${dayLine(baseKey)}`);
  lines.push(`→ ${remainLabel}(1日の目標: ${settings.goal}kcal)`);
  if (p || f || c) {
    lines.push(`→ PFC合計: たんぱく質${p}g / 脂質${f}g / 炭水化物${c}g`);
  }
  lines.push("");

  const base = dateOfKey(baseKey);
  for (let i = 1; i <= 2; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const key = keyOfDate(d);
    lines.push(`【参考:${i === 1 ? "昨日" : "一昨日"}】${dayLine(key)}`);
  }

  lines.push("");
  lines.push("目標: 中長期で無理なく減量したい。極端な制限より続けられる提案を。");
  return lines.join("\n");
}

$("copyPromptBtn").addEventListener("click", async () => {
  const text = $("promptBox").textContent;
  try {
    await navigator.clipboard.writeText(text);
    toast("コピーしました。Claudeに貼り付けてください ✨");
  } catch {
    // クリップボードAPIが使えない環境向けフォールバック
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast("コピーしました ✨");
  }
});

/* ==================== アドバイス保存 ==================== */

$("pasteAdviceBtn").addEventListener("click", () => {
  $("adviceInput").value = dayRecord(selectedKey).advice || "";
  openSheet("adviceOverlay");
});

$("saveAdviceBtn").addEventListener("click", () => {
  const text = $("adviceInput").value.trim();
  const d = ensureDay(selectedKey);
  d.advice = text;
  // 貼り付けた文章に「85点」のような表記があれば点数として拾う
  const m = text.match(/(\d{1,3})\s*点/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 0 && n <= 100) d.score = n;
  }
  saveRecords();
  closeSheet("adviceOverlay");
  renderDay();
  refreshHome();
  if (text) toast("保存したよ📝");
});

/* ==================== 設定 ==================== */

$("settingsBtn").addEventListener("click", () => {
  $("goalInput").value = settings.goal;
  const b = backend.cfg();
  $("backendUrl").value = b.url;
  $("backendToken").value = b.token;

  // AI推定の精度サマリー
  const stats = estimateStats();
  const note = $("accuracyNote");
  if (stats) {
    note.hidden = false;
    note.textContent =
      `AI推定を ${stats.used} 回使用 / 平均誤差 ±${stats.avgErr}%(カロリー)` +
      ` ・ ±15%以内 ${stats.within} 回。手直しは次回の推定に反映されます。`;
  } else {
    note.hidden = true;
  }
  openSheet("settingsOverlay");
});

$("testBackendBtn").addEventListener("click", async () => {
  const url = $("backendUrl").value.trim();
  const token = $("backendToken").value.trim();
  if (!url) { toast("URLを入力してください"); return; }
  backend.save(url, token); // ping前に一時保存
  const btn = $("testBackendBtn");
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "テスト中…";
  try {
    await backend.ping();
    toast("つながったじゃん✅");
  } catch (err) {
    toast("接続失敗: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

$("settingsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  settings.goal = Number($("goalInput").value) || 2000;
  saveSettings();
  backend.save($("backendUrl").value, $("backendToken").value);
  closeSheet("settingsOverlay");
  refreshHome();
  toast("設定セーブしたよ💾");
});

/* ==================== 起動 ==================== */

function refreshHome() {
  renderCalendar();
  renderSummary();
  renderAvatar();
}

refreshHome();
