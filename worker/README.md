# 中継サーバー(Cloudflare Worker)のデプロイ手順

このフォルダは、ギャルコーチのアプリから Claude API を安全に呼ぶための
「中継サーバー」です。APIキーはここ(Cloudflare)にだけ保管し、アプリ本体には置きません。

> ⚠️ `wrangler.toml` の Worker 名 `habit-guild-api` は**変更しないでください**。
> すでにデプロイ済みの Worker にAPIキーなどのシークレットが紐づいているため、
> 名前を変えると別の Worker が新規作成され、シークレットが無い状態になります
> (アプリ名だけが変わり、Worker名は当時のまま、という状態です)。

```
スマホのアプリ  →  この中継サーバー(Cloudflare Worker)  →  Claude API
                    ANTHROPIC_API_KEY はここだけに保管
```

## 事前に用意するもの

1. **Anthropic APIキー**
   - https://console.anthropic.com/ で登録し、API Keys からキーを発行
   - 「Billing」で最低 $5 チャージ(この使い方なら1年以上持ちます)
2. **Cloudflare の無料アカウント**
   - https://dash.cloudflare.com/sign-up

## デプロイ(コマンドで行う方法)

パソコンにNode.jsが入っていれば、以下だけで完了します。

```sh
# 1. このフォルダに移動
cd worker

# 2. Cloudflareにログイン(ブラウザが開きます)
npx wrangler login

# 3. シークレット(秘密の値)を登録
npx wrangler secret put ANTHROPIC_API_KEY
#   → Anthropicのキーを貼り付けてEnter
npx wrangler secret put APP_TOKEN
#   → アプリと共有する「合言葉」を自分で決めて入力(例: myguild-2026 など)

# 4. デプロイ
npx wrangler deploy
```

デプロイに成功すると、次のようなURLが表示されます:

```
https://habit-guild-api.<あなたの名前>.workers.dev
```

## アプリ側の設定

1. アプリを開き、右上の ⚙️(設定)をタップ
2. 「AI連携」の欄に入力
   - **中継サーバーのURL**: 上で表示された `https://....workers.dev`
   - **アクセストークン**: 手順3で決めた合言葉(APP_TOKEN と同じもの)
3. 「接続テスト」を押して OK が出れば完了
4. 「保存する」

これで、食事入力画面の「✨ AIで推定」と、アプリ内アドバイスが使えるようになります。

## 環境変数(まとめ)

| 名前 | 必須 | 説明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic のAPIキー。`wrangler secret put` で登録 |
| `APP_TOKEN` | 推奨 | アプリと共有する合言葉。第三者に無断で使われないための鍵 |
| `ALLOWED_ORIGIN` | 任意 | 許可するサイトのURL。指定するとより安全(例: `https://sou16hattori-rgb.github.io`)。`wrangler.toml` の `[vars]` に記載 |

## コストの目安

- モデルは Sonnet(`claude-sonnet-5`)。1回のアドバイスや推定でおよそ2〜3円。
- もっと安くしたい場合は `worker.js` の `MODEL` を `"claude-haiku-4-5"` に変更。
- Cloudflare Workers の無料枠は1日10万リクエストまで。個人利用なら十分。
