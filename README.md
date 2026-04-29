# 株価変動ニュース分析アプリ

日経225構成銘柄から前日比±N%以上の大きく動いた銘柄をスクリーニングし、関連ニュースをもとにClaude AIが変動要因を詳細解説するStreamlitアプリです。

## 機能

- 日経225全銘柄の株価データをリアルタイム取得（yfinance）
- 変動率の閾値・方向（上昇/下落）でスクリーニング
- Google Newsから関連ニュースを自動収集
- Claude AIによる詳細分析レポート生成
  - 株価変動の主因
  - セクター・業界動向
  - マクロ・市場環境の影響
  - 今後の注目ポイント

## ローカル実行

### 1. 依存関係インストール

```bash
pip install -r requirements.txt
```

### 2. APIキー設定

`.streamlit/secrets.toml.example` をコピーして `secrets.toml` を作成し、APIキーを入力してください。

```bash
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# secrets.toml を編集して ANTHROPIC_API_KEY を設定
```

または環境変数で指定:

```bash
export ANTHROPIC_API_KEY="sk-ant-xxxxx"
```

### 3. 起動

```bash
streamlit run app.py
```

ブラウザで `http://localhost:8501` が開きます。

## Streamlit Cloud へのデプロイ

1. このリポジトリを自分のGitHubアカウントにフォーク（またはそのまま使用）
2. [share.streamlit.io](https://share.streamlit.io) にアクセスしてGitHubでログイン
3. "New app" → リポジトリ・ブランチ・`app.py` を選択
4. "Advanced settings" → Secrets に以下を追加:

```toml
ANTHROPIC_API_KEY = "sk-ant-xxxxxxxxxx"
```

5. "Deploy!" をクリック

## 使い方

1. サイドバーでスクリーニング閾値（デフォルト: ±5%）と方向を設定
2. 「スクリーニング実行」ボタンをクリック（初回は1〜2分かかります）
3. 結果テーブルから銘柄を選択
4. ニュース一覧を確認後、「AIによる詳細分析を実行」をクリック

## 注意事項

- 株価データはyfinanceを通じてYahoo Financeから取得します（遅延あり）
- 本アプリの分析結果は投資助言ではありません
- Claude APIの利用にはAnthropic APIキーが必要です

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | Streamlit |
| 株価データ | yfinance |
| ニュース取得 | Google News RSS / feedparser |
| AI分析 | Claude claude-sonnet-4-6 (Anthropic) |
| 対象銘柄 | 日経225構成銘柄 |
