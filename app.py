import os
import urllib.parse
from datetime import datetime

import anthropic
import feedparser
import pandas as pd
import streamlit as st
import yfinance as yf

from nikkei225 import NIKKEI225

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="株価変動ニュース分析",
    page_icon="📈",
    layout="wide",
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_api_key() -> str:
    """Retrieve Anthropic API key from Streamlit secrets or environment."""
    try:
        return st.secrets["ANTHROPIC_API_KEY"]
    except Exception:
        return os.getenv("ANTHROPIC_API_KEY", "")


@st.cache_data(ttl=300, show_spinner=False)
def fetch_stock_data() -> pd.DataFrame:
    """Download 5-day OHLCV data for all Nikkei 225 stocks and compute daily change."""
    tickers = [f"{code}.T" for code in NIKKEI225]
    raw = yf.download(tickers, period="5d", auto_adjust=True, progress=False)

    if raw.empty:
        return pd.DataFrame()

    close = raw["Close"]
    if isinstance(close, pd.Series):
        close = close.to_frame()

    # Use the two most recent trading days
    close = close.dropna(how="all").tail(2)
    if len(close) < 2:
        return pd.DataFrame()

    prev_close = close.iloc[-2]
    last_close = close.iloc[-1]
    change_pct = ((last_close - prev_close) / prev_close * 100).round(2)

    volume_raw = raw["Volume"]
    if isinstance(volume_raw, pd.Series):
        volume_raw = volume_raw.to_frame()
    last_volume = volume_raw.iloc[-1]

    open_raw = raw["Open"]
    if isinstance(open_raw, pd.Series):
        open_raw = open_raw.to_frame()
    last_open = open_raw.iloc[-1]

    records = []
    for code, name in NIKKEI225.items():
        ticker = f"{code}.T"
        if ticker not in change_pct.index:
            continue
        chg = change_pct.get(ticker, float("nan"))
        if pd.isna(chg):
            continue
        records.append(
            {
                "コード": code,
                "銘柄名": name,
                "変動率(%)": chg,
                "終値(円)": round(float(last_close.get(ticker, 0)), 0),
                "始値(円)": round(float(last_open.get(ticker, 0)), 0),
                "出来高": int(last_volume.get(ticker, 0)),
            }
        )

    return pd.DataFrame(records)


@st.cache_data(ttl=600, show_spinner=False)
def fetch_news(company_name: str, ticker_code: str) -> list[dict]:
    """Fetch related news from Google News RSS."""
    query = urllib.parse.quote(f"{company_name} 株")
    url = (
        f"https://news.google.com/rss/search"
        f"?q={query}&hl=ja&gl=JP&ceid=JP:ja"
    )
    feed = feedparser.parse(url)
    articles = []
    for entry in feed.entries[:8]:
        articles.append(
            {
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
                "summary": entry.get("summary", ""),
            }
        )
    return articles


def analyze_with_claude(
    client: anthropic.Anthropic,
    code: str,
    name: str,
    change_pct: float,
    open_price: float,
    close_price: float,
    volume: int,
    news_articles: list[dict],
) -> str:
    """Use Claude to produce a detailed analysis of the stock movement."""
    direction = "上昇" if change_pct >= 0 else "下落"

    news_text = ""
    for i, a in enumerate(news_articles, 1):
        news_text += f"{i}. {a['title']}\n   {a['summary'][:200]}\n\n"

    if not news_text:
        news_text = "関連ニュースは見つかりませんでした。"

    prompt = f"""あなたは日本株式市場の専門アナリストです。以下の情報をもとに、株価変動要因を詳細に分析してください。

## 対象銘柄
- 銘柄名: {name}（証券コード: {code}）
- 本日の変動率: {change_pct:+.2f}%（{direction}）
- 始値: {open_price:,.0f}円 → 終値: {close_price:,.0f}円
- 出来高: {volume:,}株

## 関連ニュース（直近）
{news_text}

## 分析してほしい観点
1. **株価変動の主因** – 上記ニュースと株価変動の具体的な関連性
2. **セクター・業界動向** – 同業他社・セクター全体への波及効果
3. **マクロ・市場環境** – 為替・金利・地政学リスクなど外部要因
4. **今後の注目ポイント** – 投資家が次に見るべき指標・イベント・リスク

日本語で、投資家が実際に意思決定に使える水準で詳しく回答してください。"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1800,
        system="あなたは日本の株式市場に精通したシニアアナリストです。データに基づいた客観的で詳細な分析を行います。",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


# ── UI ────────────────────────────────────────────────────────────────────────

def main():
    st.title("📈 株価変動ニュース分析")
    st.caption("日経225構成銘柄から前日比±N%以上の銘柄をスクリーニングし、AIが変動要因を詳細解説します。")

    # ── Sidebar ──────────────────────────────────────────────────────────────
    with st.sidebar:
        st.header("設定")
        threshold = st.slider(
            "スクリーニング閾値 (%)",
            min_value=1.0,
            max_value=15.0,
            value=5.0,
            step=0.5,
            help="この値以上（絶対値）の変動率を持つ銘柄を抽出します",
        )
        direction_filter = st.radio(
            "方向フィルター",
            ["すべて", "上昇のみ", "下落のみ"],
            index=0,
        )
        run_btn = st.button("🔍 スクリーニング実行", use_container_width=True, type="primary")

        st.divider()
        api_key = get_api_key()
        if not api_key:
            st.warning("Claude APIキーが設定されていません。\n\n`.streamlit/secrets.toml` に `ANTHROPIC_API_KEY` を設定してください。")
        else:
            st.success("Claude API: 接続済み")

        st.divider()
        st.caption(f"データ取得時刻: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    # ── Session state ─────────────────────────────────────────────────────────
    if "df_movers" not in st.session_state:
        st.session_state.df_movers = None
    if "selected_code" not in st.session_state:
        st.session_state.selected_code = None

    # ── Run screening ─────────────────────────────────────────────────────────
    if run_btn:
        with st.spinner("株価データを取得中... (初回は1〜2分かかる場合があります)"):
            df_all = fetch_stock_data()

        if df_all.empty:
            st.error("株価データの取得に失敗しました。しばらく待ってから再試行してください。")
            return

        # Apply filters
        df = df_all[df_all["変動率(%)"].abs() >= threshold].copy()
        if direction_filter == "上昇のみ":
            df = df[df["変動率(%)"] > 0]
        elif direction_filter == "下落のみ":
            df = df[df["変動率(%)"] < 0]

        df = df.sort_values("変動率(%)", key=abs, ascending=False).reset_index(drop=True)
        st.session_state.df_movers = df
        st.session_state.selected_code = None

    # ── Display results ───────────────────────────────────────────────────────
    df_movers = st.session_state.df_movers

    if df_movers is None:
        st.info("サイドバーの「スクリーニング実行」ボタンを押してください。")
        return

    if df_movers.empty:
        st.warning(f"閾値 ±{threshold}% 以上の変動銘柄は見つかりませんでした。閾値を下げてみてください。")
        return

    st.subheader(f"スクリーニング結果: {len(df_movers)} 銘柄")

    # Color-code the change column
    def highlight_change(val):
        color = "#d4edda" if val > 0 else "#f8d7da"
        return f"background-color: {color}"

    styled = (
        df_movers.style
        .map(highlight_change, subset=["変動率(%)"])
        .format({"変動率(%)": "{:+.2f}%", "終値(円)": "{:,.0f}", "始値(円)": "{:,.0f}", "出来高": "{:,}"})
    )
    st.dataframe(styled, use_container_width=True, hide_index=True)

    # ── Stock selector ────────────────────────────────────────────────────────
    st.divider()
    st.subheader("詳細分析")

    options = [f"{row['コード']} {row['銘柄名']}  ({row['変動率(%)']:+.2f}%)" for _, row in df_movers.iterrows()]
    selected_label = st.selectbox("分析する銘柄を選択", ["── 銘柄を選択してください ──"] + options)

    if selected_label == "── 銘柄を選択してください ──":
        return

    selected_code = selected_label.split()[0]
    row = df_movers[df_movers["コード"] == selected_code].iloc[0]

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("変動率", f"{row['変動率(%)']:+.2f}%")
    col2.metric("終値", f"¥{row['終値(円)']:,.0f}")
    col3.metric("始値", f"¥{row['始値(円)']:,.0f}")
    col4.metric("出来高", f"{row['出来高']:,}")

    # ── News ──────────────────────────────────────────────────────────────────
    with st.expander("📰 関連ニュース", expanded=True):
        with st.spinner("ニュースを取得中..."):
            articles = fetch_news(row["銘柄名"], row["コード"])
        if not articles:
            st.info("関連ニュースが見つかりませんでした。")
        else:
            for a in articles:
                st.markdown(f"**[{a['title']}]({a['link']})**")
                if a["published"]:
                    st.caption(a["published"])
                if a["summary"]:
                    st.write(a["summary"][:300] + ("..." if len(a["summary"]) > 300 else ""))
                st.divider()

    # ── AI Analysis ───────────────────────────────────────────────────────────
    if not api_key:
        st.warning("AI分析にはClaude APIキーが必要です。サイドバーの案内を確認してください。")
        return

    analyze_btn = st.button("🤖 AIによる詳細分析を実行", type="primary")
    if analyze_btn:
        with st.spinner("Claudeが分析中..."):
            try:
                client = anthropic.Anthropic(api_key=api_key)
                analysis = analyze_with_claude(
                    client=client,
                    code=row["コード"],
                    name=row["銘柄名"],
                    change_pct=float(row["変動率(%)"]),
                    open_price=float(row["始値(円)"]),
                    close_price=float(row["終値(円)"]),
                    volume=int(row["出来高"]),
                    news_articles=articles,
                )
                st.subheader("AI分析レポート")
                st.markdown(analysis)
            except anthropic.AuthenticationError:
                st.error("APIキーが無効です。正しいANTHROPIC_API_KEYを設定してください。")
            except Exception as e:
                st.error(f"分析中にエラーが発生しました: {e}")


if __name__ == "__main__":
    main()
