/**
 * ギャルコーチ — 中継サーバー (Cloudflare Worker)
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
const MODEL = "claude-haiku-4-5";
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
      const message = String(err && err.message || err);
      console.error("gal-coach-api error:", message);
      return json({ error: message }, 502, cors);
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

  let instruction =
    "あなたは管理栄養士です。日本の一般的な一人前を基準に、食事のカロリー(kcal)とPFC" +
    "(たんぱく質・脂質・炭水化物、グラム)を推定してください。写真がある場合は写っている量から" +
    "見積もり、items に推定した品目を日本語で入れてください。推定はあくまで目安で構いません。";

  // このユーザーの過去の実測補正をfew-shot例として与え、一人前の感覚を合わせる
  if (Array.isArray(body.examples) && body.examples.length) {
    const lines = body.examples
      .filter((e) => e && e.input && e.kcal != null)
      .map((e) => `・「${e.input}」→ 実際は ${e.kcal}kcal, P${e.protein_g ?? "?"} F${e.fat_g ?? "?"} C${e.carbs_g ?? "?"}`)
      .join("\n");
    if (lines) {
      instruction +=
        "\n\nこのユーザーの過去の実測データ(あなたの推定より優先して一人前の感覚を合わせること):\n" + lines;
    }
  }

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

/* -------- ギャルコーチの判定(点数 + アドバイス) -------- */

async function advice(body, env) {
  const prompt = (body.prompt || "").trim();
  if (!prompt) throw new Error("prompt is empty");

  const schema = {
    type: "object",
    properties: {
      score: { type: "integer" },
      headline: { type: "string" },
      advice: { type: "string" },
    },
    required: ["score", "headline", "advice"],
    additionalProperties: false,
  };

  const result = await callClaude(env, {
    max_tokens: 700,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema } },
    system:
      "あなたは日本のギャルの栄養コーチ。親友みたいな距離感で、ギャル語(「〜じゃん」「まじで」「〜すぎ」" +
      "「神」「うける」「それな」「ガチ」など)と絵文字を自然に使って話す。ただし栄養の中身は管理栄養士レベルに正確に。\n\n" +
      "【最重要】あなたの役割はまず“褒めること”。ユーザーが自分を責めずに続けられるようにするのが仕事。\n" +
      "・どんな記録でも必ず良かった点を具体的に見つけて、そこから話し始める" +
      "(記録をつけたこと自体、たんぱく質が取れてる、野菜がある、前日より改善した、運動した、など何かしら必ずある)。\n" +
      "・食べすぎた日でも決して責めない。「ダメ」「最悪」「太る」のような否定・不安を煽る言葉は使わない。\n" +
      "・改善点は“もっと良くなる提案”として前向きに伝える(「〜はやめて」ではなく「〜足すと完璧」の言い方)。\n" +
      "・体型や見た目を否定する発言は絶対にしない。\n\n" +
      "score: その日のPFCバランスと食べ方を0〜100点で採点。たんぱく質が足りてれば加点、脂質・糖質に偏ってたら減点、" +
      "総カロリーが目標を大きく超えていたら減点。記録が少なすぎて判断できない場合は50点前後。" +
      "点数自体は正直につけるが、伝え方は必ず前向きに。\n" +
      "headline: ギャルの第一声を25字以内で。必ず褒め言葉にする(例:「たんぱく質やば神じゃん✨」" +
      "「記録continueしてるのまじえらい🥺」)。低い点数でも褒めから入ること。\n" +
      "advice: 3〜5文。まず良かった点を具体的に褒める、次に今日の残りの食事プラン(コンビニで買える具体例つき)、" +
      "今日の運動プラン(種類と時間)、最後に背中を押す一言。マークダウン記号や箇条書き記号は使わず、話し言葉で。",
    messages: [{ role: "user", content: prompt }],
  });

  const parsed = JSON.parse(firstText(result));
  return {
    score: parsed.score,
    headline: String(parsed.headline || "").trim(),
    advice: String(parsed.advice || "").trim(),
  };
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
