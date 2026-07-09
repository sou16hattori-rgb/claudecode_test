"use strict";

/*
 * 株式売買記録アプリ ローカルサーバー
 *
 * 使い方:  node server.js  →  http://localhost:3456 を開く
 *
 * 役割:
 *  1. フロントエンド（index.html など）の配信
 *  2. /api/quote?code=7203 で Yahoo! Finance の公開チャートAPIから
 *     現在値と直近1年の1株配当実績を取得して返す
 *     （ブラウザから直接は CORS で取得できないためサーバー経由にする）
 *
 * 依存パッケージなし。Node.js 18 以上が必要（組み込み fetch を使用）。
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3456;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// 取得結果は6時間キャッシュ（Yahoo側への負荷を抑える）
const quoteCache = new Map(); // code -> {data, at}
const CACHE_MS = 6 * 60 * 60 * 1000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function fetchQuote(code) {
  const cached = quoteCache.get(code);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  // チャートAPI: 現在値・銘柄名・配当イベント（過去1年）が認証なしで取れる
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(code)}.T` +
    `?range=1y&interval=1mo&events=div`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Yahoo Finance が ${res.status} を返しました`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    throw new Error(json?.chart?.error?.description || "銘柄が見つかりません");
  }

  const meta = result.meta || {};
  // 直近1年の配当イベントを合算 → 年間1株配当（実績）
  const divEvents = result.events && result.events.dividends;
  let dps = null;
  if (divEvents) {
    const oneYearAgo = Date.now() / 1000 - 366 * 24 * 3600;
    let sum = 0;
    let count = 0;
    for (const key of Object.keys(divEvents)) {
      const ev = divEvents[key];
      if (ev && ev.date >= oneYearAgo && typeof ev.amount === "number") {
        sum += ev.amount;
        count++;
      }
    }
    if (count > 0) dps = sum;
  }

  const data = {
    code,
    name: meta.longName || meta.shortName || null,
    price: typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null,
    dps, // 直近1年の合計配当（円/株）。無配または未取得時は null
    currency: meta.currency || "JPY",
  };
  quoteCache.set(code, { data, at: Date.now() });
  return data;
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/ping") {
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === "/api/quote") {
    const code = (url.searchParams.get("code") || "").trim().toUpperCase();
    if (!/^[0-9A-Z]{4,5}$/.test(code)) {
      return sendJson(res, 400, { error: "銘柄コードの形式が不正です" });
    }
    try {
      const data = await fetchQuote(code);
      return sendJson(res, 200, data);
    } catch (e) {
      return sendJson(res, 502, { error: e.message });
    }
  }

  // 静的ファイル配信
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = path.normalize(path.join(ROOT, filePath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not Found");
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log(`株式売買記録アプリを起動しました: http://localhost:${PORT}`);
  console.log("終了するには Ctrl+C を押してください。");
});
