/* ハビットギルド — バックエンド(中継サーバー)連携 */

"use strict";

const DG_BACKEND_KEY = "dg.backend";

const backend = {
  cfg() {
    try {
      return JSON.parse(localStorage.getItem(DG_BACKEND_KEY)) || { url: "", token: "" };
    } catch {
      return { url: "", token: "" };
    }
  },
  save(url, token) {
    localStorage.setItem(DG_BACKEND_KEY, JSON.stringify({ url: url.trim(), token: token.trim() }));
  },
  configured() {
    return !!this.cfg().url;
  },
  async call(payload, { timeout = 30000 } = {}) {
    const { url, token } = this.cfg();
    if (!url) throw new Error("未設定");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-app-token": token },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        let msg = `エラー ${res.status}`;
        try {
          const e = await res.json();
          if (e && e.error) msg += `: ${e.error}`;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      return await res.json();
    } catch (err) {
      if (err.name === "AbortError") throw new Error("タイムアウトしました");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },
  ping() {
    return this.call({ action: "ping" }, { timeout: 10000 });
  },
  estimate({ text, image }) {
    return this.call({ action: "estimate", text, image });
  },
  advice(prompt) {
    return this.call({ action: "advice", prompt });
  },
};
