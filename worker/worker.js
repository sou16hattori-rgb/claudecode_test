/**
 * ハビットギルド — 中継サーバー (Cloudflare Worker)
 *
 * アプリ(フロント)から呼ばれ、Anthropic Claude API に中継する。
 * APIキーはこの Worker の環境変数(Secret)にだけ置き、フロントには絶対に置かない。
 *
 * 必要な環境変数:
 *   ANTHROPIC_API_KEY  … Anthropic のАПIキー (Secret として登録)
 *   APP_TOKEN          … 自分で決める合言葉。フロントの「アクセストークン」と一致させる
 *   ALLOWED_ORIGIN     … (任意) 許可するオリジン。未設定なら "*"
 *
 * デプロイ手順は同じフォルダの README.md を参照。
 */

// 使うモデル。Sonnetレベルで十分との方針。コスト重視なら "claude-haiku-4-5" に変更可。
const MODEL = "claude-sonnet-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, x-app-token",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405, cors);
    }

    // 合言葉チェック(APP_TOKEN が設定されているときのみ)
    if (env.APP_TOKEN) {
      const token = request.headers.get("x-app-token") || "";
      if (token !== env.APP_TOKEN) {
        return json({ error: "unauthorized" }, 401, cors);
      }
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400, cors);
    }

    try {
      if (body.action === "estimate") {
        return json(await estimate(body, env), 200, cors);
      }
      if (body.action === "advice") {
        return json(await advice(body, env), 200, cors);
      }
      if (body.action === "ping") {
        return json({ ok: true }, 200, cors);
      }
      return json({ error: "unknown action" }, 400, cors);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 502, cors);
    }
  },
};

/* -------- 食事のカロリー/PFC推定 -------- */

async function estimate(body, env) {
  const schema = {
    type: "object",
    properties: {
      items: { type: "array", items: { type: "string" } },
      kcal: { type: "integer" },
      protein_g: { type: "number" },
      fat_g: { type: "number" },
      carbs_g: { type: "number" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["kcal", "protein_g", "fat_g", "carbs_g"],
    additionalProperties: false,
  };

  const instruction =
    "あなたは管理栄養士です。日本の一般的な一人前を基準に、食事のカロリー(kcal)とPFC" +
    "(たんぱく質・脂質・炭水化物、グラム)を推定してください。写真がある場合は写っている量から" +
    "見積もり、items に推定した品目を日本語で入れてください。推定はあくまで目安で構いません。";

  const content = [];
  if (body.image) {
    const { media_type, data } = parseDataUrl(body.image);
    content.push({ type: "image", source: { type: "base64", media_type, data } });
  }
  const textHint = (body.text || "").trim();
  content.push({
    type: "text",
    text: instruction + (textHint ? `\n\n食べたもの: ${textHint}` : "\n\n写真の内容を推定してください。"),
  });

  const result = await callClaude(env, {
    max_tokens: 400,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content }],
  });

  const text = firstText(result);
  return JSON.parse(text);
}

/* -------- 今日のアドバイス -------- */

async function advice(body, env) {
  const prompt = (body.prompt || "").trim();
  if (!prompt) throw new Error("prompt is empty");

  const result = await callClaude(env, {
    max_tokens: 500,
    thinking: { type: "disabled" },
    system:
      "あなたは親身な栄養コーチです。記録をもとに、実行しやすい具体的なアドバイスを3〜5行で。" +
      "専門的すぎず、前向きな一言を必ず添えてください。マークダウンの見出しや箇条書き記号は使わない。",
    messages: [{ role: "user", content: prompt }],
  });

  return { text: firstText(result).trim() };
}

/* -------- 共通 -------- */

async function callClaude(env, payload) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({ model: MODEL, ...payload }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

function firstText(message) {
  const block = (message.content || []).find((b) => b.type === "text");
  if (!block) throw new Error("no text in response");
  return block.text;
}

function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) throw new Error("invalid image data");
  return { media_type: m[1], data: m[2] };
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
