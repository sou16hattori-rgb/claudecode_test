const pptxgen = require("pptxgenjs");

const NAVY = "1E2761";
const NAVY_D = "141B45";
const ICE = "CADCFC";
const SLATE = "5A6483";
const AMBER = "E39B2E";
const AMBER_D = "B0730F";
const BG = "F4F6FB";
const WHITE = "FFFFFF";
const INK = "1B2233";

const JP = "Meiryo";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "";
pres.title = "工場ユニフォーム検討";

const W = 13.3;

function shadow() {
  return { type: "outer", color: "9AA5C0", blur: 8, offset: 2, angle: 90, opacity: 0.35 };
}

// ---------- common parts ----------
function titleBar(slide, kicker, title) {
  slide.background = { color: BG };
  slide.addText(kicker, {
    x: 0.6, y: 0.38, w: 8, h: 0.3, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, bold: true, color: AMBER, charSpacing: 1,
  });
  slide.addText(title, {
    x: 0.6, y: 0.68, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 30, bold: true, color: NAVY,
  });
}

function numberBadge(slide, x, y, label, color) {
  slide.addShape(pres.ShapeType.ellipse, {
    x, y, w: 0.5, h: 0.5, fill: { color }, line: { color, width: 0 },
  });
  slide.addText(label, {
    x, y, w: 0.5, h: 0.5, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 15, bold: true, color: WHITE, align: "center", valign: "middle",
  });
}

// ---------- 1. Title ----------
{
  const s = pres.addSlide();
  s.background = { color: NAVY_D };
  s.addShape(pres.ShapeType.ellipse, {
    x: 9.4, y: -1.6, w: 6.2, h: 6.2, fill: { color: NAVY, transparency: 25 }, line: { width: 0 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 11.0, y: 3.6, w: 3.4, h: 3.4, fill: { color: AMBER, transparency: 70 }, line: { width: 0 },
  });
  s.addText("UNIFORM RENEWAL / 2026", {
    x: 0.9, y: 1.85, w: 8, h: 0.35, isTextBox: true, margin: 0,
    fontFace: "Arial", fontSize: 13, bold: true, color: AMBER, charSpacing: 2,
  });
  s.addText("工場ユニフォーム検討", {
    x: 0.9, y: 2.3, w: 9.5, h: 1.0, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 44, bold: true, color: WHITE,
  });
  s.addText("新規ジャケット（工場訪問時の作業着）とネックストラップ\nコスト感・発注先・納期・イメージ感の確認", {
    x: 0.9, y: 3.45, w: 9.0, h: 1.0, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 16, color: ICE, lineSpacing: 26,
  });
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.9, y: 5.15, w: 5.6, h: 0.85, rectRadius: 0.08,
    fill: { color: NAVY }, line: { color: "36407A", width: 1 },
  });
  s.addText("候補：ジャケット3案／ストラップ3案　法人向けオリジナル制作サイトを比較", {
    x: 1.15, y: 5.15, w: 5.1, h: 0.85, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 11.5, color: WHITE, valign: "middle",
  });
  s.addText("2026年9月6日／担当：髙山", {
    x: 0.9, y: 6.35, w: 6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: "8C97BE",
  });
  s.addNotes("上司からの指示：新規ジャケット（工場訪問用作業着）とネックストラップについて、コスト感・発注先・納期・イメージ感を確認。候補は法人向けにオリジナル展開している企業をそれぞれ3案ピックアップ。");
}

// ---------- 2. Summary ----------
{
  const s = pres.addSlide();
  titleBar(s, "SUMMARY", "調査サマリ（結論）");

  const stats = [
    { v: "¥3,600〜18,000", l: "ジャケット1着あたり\n（既製品＋刺繍〜フルオーダー）", c: NAVY },
    { v: "¥137〜244", l: "ストラップ1本あたり\n（HOTSTRAP公表単価・税込）", c: "2E5A8C" },
    { v: "2週間〜8ヶ月", l: "納期の幅\n（既製品加工〜フルオーダー量産）", c: AMBER_D },
  ];
  stats.forEach((st, i) => {
    const x = 0.6 + i * 4.12;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.65, w: 3.85, h: 1.75, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 }, shadow: shadow(),
    });
    s.addText(st.v, {
      x: x + 0.25, y: 1.85, w: 3.35, h: 0.65, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 26, bold: true, color: st.c,
    });
    s.addText(st.l, {
      x: x + 0.25, y: 2.55, w: 3.35, h: 0.75, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11.5, color: SLATE, lineSpacing: 17,
    });
  });

  const points = [
    ["価格差は「どこまでオリジナルにするか」でほぼ決まる", "フルオーダーは1着15,000〜18,000円（KIRUMIRAI調査）。既製ブルゾン3,000〜4,000円台＋社名刺繍220〜660円なら1着4,000円前後から。"],
    ["ネックストラップはフルカラー昇華が1本から発注できる", "HOTSTRAPはフルカラー昇華232円〜／シルク137円〜（税込）、1本から。KANARY・青山ストラップは30本〜。"],
    ["納期はフルオーダーが最大の制約。平均4〜5ヶ月、海外縫製なら6〜8ヶ月", "国内生産で3〜4ヶ月、色にこだわり染色工程が入るとさらに+2ヶ月。既製品＋刺繍なら約2週間。"],
  ];
  points.forEach((p, i) => {
    const y = 3.75 + i * 1.06;
    numberBadge(s, 0.62, y, String(i + 1), i === 2 ? AMBER : NAVY);
    s.addText(p[0], {
      x: 1.3, y: y - 0.03, w: 11.4, h: 0.32, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 15, bold: true, color: INK,
    });
    s.addText(p[1], {
      x: 1.3, y: y + 0.33, w: 11.4, h: 0.5, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 12, color: SLATE, lineSpacing: 17,
    });
  });
  s.addNotes("数値の出典と確度は「数値の出典と確度」ページを参照。公表されていない項目は要見積。");
}

// ---------- 3. Premises ----------
{
  const s = pres.addSlide();
  titleBar(s, "PREMISE", "検討の前提と、先に決めたい5項目");

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.6, w: 6.1, h: 4.9, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 }, shadow: shadow(),
  });
  s.addText("本資料の前提", {
    x: 0.95, y: 1.85, w: 5.4, h: 0.35, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 17, bold: true, color: NAVY,
  });
  s.addText([
    { text: "想定人数は30名／1人あたりジャケット1着＋ストラップ1本で試算", options: { bullet: true, breakLine: true } },
    { text: "用途は「工場訪問時の作業着」。常時着用の現場作業服ではなく、来客・視察対応も想定", options: { bullet: true, breakLine: true } },
    { text: "ストラップは現行品（フルカラー昇華・両面プリント）と同等のイメージを踏襲", options: { bullet: true, breakLine: true } },
    { text: "価格・納期は各社サイトおよび業界相場の公開情報ベースの目安。正式見積は別途取得", options: { bullet: true } },
  ], {
    x: 0.95, y: 2.35, w: 5.4, h: 2.2, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: INK, lineSpacing: 19, paraSpaceAfter: 8,
  });
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.95, y: 5.05, w: 5.4, h: 1.3, rectRadius: 0.06,
    fill: { color: "FDF4E4" }, line: { color: "F0DCB8", width: 1 },
  });
  s.addText("見積依頼時に必ず伝える情報\n数量／サイズ展開／希望納期／ロゴデータ形式（ai・eps）／予算上限", {
    x: 1.2, y: 5.15, w: 5.0, h: 1.1, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: "8A5A12", lineSpacing: 19,
  });

  const asks = [
    ["数量", "何名分か（サイズ別内訳も）。ロットで単価が大きく変わる"],
    ["着用開始時期", "いつから着たいか。フルオーダー可否の分岐点"],
    ["予算上限", "1着いくらまで許容か（3案の選択に直結）"],
    ["デザイン方針", "自社カラー・ロゴ位置。フルオーダーか既製品ベースか"],
    ["支給範囲", "ジャケットのみか、パンツ・インナーも含むか"],
  ];
  asks.forEach((a, i) => {
    const y = 1.6 + i * 0.99;
    s.addShape(pres.ShapeType.roundRect, {
      x: 7.0, y, w: 5.7, h: 0.85, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 },
    });
    numberBadge(s, 7.2, y + 0.18, String(i + 1), NAVY);
    s.addText(a[0], {
      x: 7.85, y: y + 0.1, w: 4.6, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 13.5, bold: true, color: INK,
    });
    s.addText(a[1], {
      x: 7.85, y: y + 0.42, w: 4.7, h: 0.32, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11, color: SLATE,
    });
  });
}

// ---------- 4. Jacket candidates ----------
{
  const s = pres.addSlide();
  titleBar(s, "JACKET / 候補①〜③", "ジャケット（工場訪問用作業着）候補3案");

  const cards = [
    {
      tag: "候補① フルオーダー",
      name: "日本被服工業",
      site: "nihonhifuku.jp",
      color: NAVY,
      lot: "要問合せ（相場は国内100着〜）",
      price: "15,000〜18,000円/着（相場）",
      lead: "要問合せ（相場4〜5ヶ月）",
      bullets: [
        "デザイン・素材選定からサンプル、サイズ合わせ、量産まで一貫対応",
        "刺繍・プリント・ワッペンなど加工の選択肢が広い",
        "ロット・納期・価格は自社サイトに明示がなく、見積で確定させる必要あり",
      ],
    },
    {
      tag: "候補② 小ロット・パターンオーダー",
      name: "ユニフォームネット（Bechule）",
      site: "uniform-net.jp",
      color: "2E5A8C",
      lot: "20着〜（サイトに明記）",
      price: "公表なし（要見積）",
      lead: "国内3〜4ヶ月／海外6〜8ヶ月",
      bullets: [
        "ヒアリング→デザインイラスト作成→サンプル制作まで対応",
        "小ロット専用パターンオーダーの最小ロットをサイトで明示している",
        "納期は生産地で大きく変わる。サンプルのやり直しを含めると約1年の記載も",
      ],
    },
    {
      tag: "候補③ 既製品＋名入れ（一般サイト）",
      name: "ユニフォームネクスト／ワークキング 他",
      site: "uniformnext.com ほか",
      color: AMBER,
      lot: "1着〜",
      price: "本体3,000〜8,000円＋刺繍220〜660円",
      lead: "約2週間（在庫品）",
      bullets: [
        "既製ブルゾンに社名刺繍・プリントを1着から加工",
        "低価格帯ブルゾンは3,000〜4,000円台、上下で7,000〜8,000円（2025年秋時点）",
        "現物確認ができ、追加発注・サイズ交換も容易",
      ],
    },
  ];

  cards.forEach((c, i) => {
    const x = 0.6 + i * 4.12;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.62, w: 3.85, h: 5.0, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 }, shadow: shadow(),
    });
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.25, y: 1.85, w: 3.35, h: 0.34, rectRadius: 0.17,
      fill: { color: c.color }, line: { width: 0 },
    });
    s.addText(c.tag, {
      x: x + 0.25, y: 1.85, w: 3.35, h: 0.34, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    s.addText(c.name, {
      x: x + 0.25, y: 2.32, w: 3.35, h: 0.6, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 15, bold: true, color: INK, lineSpacing: 20,
    });
    s.addText(c.site, {
      x: x + 0.25, y: 2.94, w: 3.35, h: 0.25, isTextBox: true, margin: 0,
      fontFace: "Arial", fontSize: 10, color: SLATE,
    });

    const specs = [["最小ロット", c.lot], ["単価目安", c.price], ["納期目安", c.lead]];
    specs.forEach((sp, j) => {
      const y = 3.3 + j * 0.56;
      s.addText(sp[0], {
        x: x + 0.25, y, w: 1.15, h: 0.45, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 10.5, color: SLATE, valign: "middle",
      });
      s.addText(sp[1], {
        x: x + 1.4, y, w: 2.2, h: 0.45, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 10.5, bold: true, color: c.color, valign: "middle", lineSpacing: 14,
      });
    });

    s.addText(c.bullets.map((b, k) => ({
      text: b, options: { bullet: true, breakLine: k !== c.bullets.length - 1 },
    })), {
      x: x + 0.25, y: 5.05, w: 3.35, h: 1.4, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: INK, lineSpacing: 15, paraSpaceAfter: 6,
    });
  });
  s.addNotes("①の50セット・2〜3ヶ月という数値は一次調査のメモにあったもので、公開サイト上では確認できていない。見積で確定させる。");
}

// ---------- 5. Jacket comparison table ----------
{
  const s = pres.addSlide();
  titleBar(s, "JACKET / 比較", "ジャケット3案の比較（数値の出所つき）");

  const head = ["", "① 日本被服工業\nフルオーダー", "② ユニフォームネット\n小ロットオーダー", "③ 一般サイト\n既製品＋名入れ"];
  const rows = [
    ["最小ロット", "要問合せ\n（相場：国内100着〜）", "20着〜\n（サイトに明記）", "1着〜\n（サイトに明記）"],
    ["単価目安", "15,000〜18,000円\n（第三者調査の相場）", "公表なし\n（要見積）", "本体3,000〜8,000円\n＋刺繍220〜660円"],
    ["納期目安", "要問合せ\n（相場：4〜5ヶ月）", "国内3〜4ヶ月\n海外6〜8ヶ月", "約2週間\n（在庫品）"],
    ["デザイン自由度", "◎ 型・素材から設計", "○ 既存型をベースに調整", "△ 既製デザイン＋ロゴのみ"],
    ["初期費用", "型代・サンプル代が発生", "サンプル代が発生", "ほぼ不要"],
    ["向くケース", "全社刷新・長期運用", "少人数でも独自性を出したい", "早く・安く始めたい"],
  ];

  const tblRows = [
    head.map((h, i) => ({
      text: h,
      options: {
        fill: i === 0 ? NAVY_D : NAVY, color: WHITE, bold: true, fontSize: 11.5,
        fontFace: JP, align: "center", valign: "middle",
      },
    })),
    ...rows.map((r, ri) => r.map((cell, ci) => ({
      text: cell,
      options: {
        fill: ci === 0 ? "E9EDF7" : (ri % 2 === 0 ? WHITE : "F8FAFE"),
        color: ci === 0 ? NAVY : INK,
        bold: ci === 0,
        fontSize: 10.5,
        fontFace: JP,
        align: ci === 0 ? "left" : "center",
        valign: "middle",
      },
    }))),
  ];

  s.addTable(tblRows, {
    x: 0.6, y: 1.62, w: 12.1, colW: [2.2, 3.3, 3.3, 3.3],
    rowH: [0.6, 0.62, 0.62, 0.62, 0.42, 0.42, 0.42],
    border: { type: "solid", color: "D6DDEE", pt: 1 },
    margin: 6,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 5.85, w: 12.1, h: 1.05, rectRadius: 0.08,
    fill: { color: "FDF4E4" }, line: { color: "F0DCB8", width: 1 },
  });
  s.addText("読み取り：サイトに数値が明記されているのは②の「20着〜」と③のみ。①は価格・ロット・納期とも非公開のため見積が必須。今期中の着用が必要なら③で先行し、次期に①②を検討する二段構えが現実的。", {
    x: 0.95, y: 5.85, w: 11.4, h: 1.05, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: "8A5A12", valign: "middle", lineSpacing: 19,
  });
}

// ---------- 6. Strap candidates ----------
{
  const s = pres.addSlide();
  titleBar(s, "STRAP / 候補①〜③", "ネックストラップ候補3案");

  const cards = [
    {
      tag: "候補① 法人・伴走型",
      name: "キラメック（KILAMEK）",
      site: "kilamek-novelty.com",
      color: NAVY,
      lot: "サイト全体で5個〜\n（ストラップ個別は要確認）",
      price: "公表なし（要見積）",
      lead: "公表なし（納期交渉可の記載）",
      bullets: [
        "BtoB専門。専任担当と相談しながら素材・印刷・パーツを選定",
        "完成データが手元になくてもデザイン面を相談できる点が他社との差",
        "同社は作業服・刺繍加工も扱うため、ジャケットと窓口をまとめられる",
      ],
    },
    {
      tag: "候補② スピード・自動見積",
      name: "HOTSTRAP（ホットストラップ）",
      site: "hotstrap.jp",
      color: "2E5A8C",
      lot: "1本〜",
      price: "昇華フルカラー232円〜／シルク137円〜（税込）\n10mmナイロン100本＝244円/本",
      lead: "通常6〜9営業日／特急4〜5営業日",
      bullets: [
        "Web上の自動見積で本数・仕様別の金額とPDF見積書をその場で取得できる",
        "ナイロン10/15/20mm、ポリエステル、合皮、プレミアムなど選択肢が広い",
        "3案の中で唯一、単価・納期がサイト上で数値として確認できる",
      ],
    },
    {
      tag: "候補③ 昇華転写に強い専門店",
      name: "KANARY／青山ストラップ",
      site: "kanary.jp／ao-strap.com",
      color: AMBER,
      lot: "KANARY：昇華は30本〜\n青山：30〜5,000本の枠",
      price: "青山：大ロットで100円〜\nKANARY：サイトに価格表あり（金具別）",
      lead: "青山：量産開始から14日目出荷",
      bullets: [
        "昇華転写のため製版不要＝版代がかからない",
        "グラデーション・写真・多色デザインを再現しやすい",
        "本数が増えるほど単価が下がるため、まとめ発注向き",
      ],
    },
  ];

  cards.forEach((c, i) => {
    const x = 0.6 + i * 4.12;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.62, w: 3.85, h: 5.0, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 }, shadow: shadow(),
    });
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.25, y: 1.85, w: 3.35, h: 0.34, rectRadius: 0.17,
      fill: { color: c.color }, line: { width: 0 },
    });
    s.addText(c.tag, {
      x: x + 0.25, y: 1.85, w: 3.35, h: 0.34, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    s.addText(c.name, {
      x: x + 0.25, y: 2.32, w: 3.35, h: 0.6, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 15, bold: true, color: INK, lineSpacing: 20,
    });
    s.addText(c.site, {
      x: x + 0.25, y: 2.94, w: 3.35, h: 0.25, isTextBox: true, margin: 0,
      fontFace: "Arial", fontSize: 10, color: SLATE,
    });

    const specs = [["最小ロット", c.lot], ["単価目安", c.price], ["納期目安", c.lead]];
    specs.forEach((sp, j) => {
      const y = 3.28 + j * 0.6;
      s.addText(sp[0], {
        x: x + 0.25, y, w: 1.15, h: 0.5, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 10.5, color: SLATE, valign: "middle",
      });
      s.addText(sp[1], {
        x: x + 1.4, y, w: 2.2, h: 0.5, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 9.5, bold: true, color: c.color, valign: "middle", lineSpacing: 13,
      });
    });

    s.addText(c.bullets.map((b, k) => ({
      text: b, options: { bullet: true, breakLine: k !== c.bullets.length - 1 },
    })), {
      x: x + 0.25, y: 5.15, w: 3.35, h: 1.35, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: INK, lineSpacing: 15, paraSpaceAfter: 6,
    });
  });
}

// ---------- 7. Strap image / spec ----------
{
  const s = pres.addSlide();
  titleBar(s, "STRAP / イメージ感", "ストラップのイメージ感と仕様の考え方");

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.62, w: 6.0, h: 3.05, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 }, shadow: shadow(),
  });
  s.addText("現行ストラップから引き継ぐ要素", {
    x: 0.95, y: 1.85, w: 5.3, h: 0.35, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 16, bold: true, color: NAVY,
  });
  s.addText([
    { text: "印刷：フルカラー昇華転写（ブルー〜パープルのグラデーション）", options: { bullet: true, breakLine: true } },
    { text: "文言：「考え抜く。未来のために。／Think Deeply for the Future.」を両面に配置", options: { bullet: true, breakLine: true } },
    { text: "幅：15〜20mm相当。長さ調整パーツ＋安全パーツ（着脱バックル）付き", options: { bullet: true, breakLine: true } },
    { text: "金具：ナスカン（回転式）。社員証ケースとの組み合わせを想定", options: { bullet: true } },
  ], {
    x: 0.95, y: 2.35, w: 5.3, h: 2.1, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: INK, lineSpacing: 19, paraSpaceAfter: 8,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 4.9, w: 6.0, h: 2.0, rectRadius: 0.08,
    fill: { color: NAVY }, line: { width: 0 },
  });
  s.addText("結論：同等品は十分に再現可能", {
    x: 0.95, y: 5.1, w: 5.3, h: 0.35, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 15, bold: true, color: WHITE,
  });
  s.addText("グラデーションや写真表現は昇華転写の得意領域で、製版が不要なため版代もかからないケースが多い。デザインデータ（ai／eps）さえ用意できれば、50〜100本規模から現行品と同等の仕上がりが狙える。", {
    x: 0.95, y: 5.55, w: 5.3, h: 1.2, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: ICE, lineSpacing: 19,
  });

  const specs = [
    ["印刷方式", "昇華転写（フルカラー）／シルクスクリーン（1〜6色）", "写真・グラデーションなら昇華一択。単色ロゴのみならシルクが安い"],
    ["素材・幅", "ナイロン／ポリエステル、10・15・20mm", "社員証用途は15〜20mmが標準。太いほど印刷が映える"],
    ["パーツ", "ナスカン、長さ調整、安全バックル、リール", "工場内での引っ掛かり対策として安全バックルは必須級"],
    ["ロット・単価", "50〜100本〜／250〜650円", "本数を増やすほど単価は下がる。予備分を含めた発注が有利"],
    ["データ", "ai／eps（アウトライン化）", "データがない場合はキラメックのようなデザイン相談可の業者を選ぶ"],
  ];
  specs.forEach((sp, i) => {
    const y = 1.62 + i * 1.06;
    s.addShape(pres.ShapeType.roundRect, {
      x: 6.9, y, w: 5.8, h: 0.92, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 },
    });
    s.addText(sp[0], {
      x: 7.1, y: y + 0.12, w: 1.4, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11.5, bold: true, color: AMBER,
    });
    s.addText(sp[1], {
      x: 8.45, y: y + 0.1, w: 4.1, h: 0.34, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11, bold: true, color: INK,
    });
    s.addText(sp[2], {
      x: 7.1, y: y + 0.48, w: 5.45, h: 0.36, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: SLATE,
    });
  });
}

// ---------- 8. General sites ----------
{
  const s = pres.addSlide();
  titleBar(s, "BENCHMARK", "「一般サイトで発注したらどうなるか」の検証");

  const cols = [
    {
      t: "ジャケットを一般サイトで買う場合",
      c: NAVY,
      sites: "ユニフォームネクスト／ワークストリート／ワークキング／ユニフォームタウン",
      good: ["1着から購入でき、社名刺繍も1着から対応", "本体3,000〜4,000円台のブルゾンも選べる（上下で7,000〜8,000円）", "納期は加工込みで約2週間、在庫があれば即日出荷も"],
      bad: ["デザインは既製品の範囲。他社と被る可能性がある", "刺繍位置・サイズの自由度は限定的", "同一品番が廃番になると翌年に揃わないリスク"],
    },
    {
      t: "ストラップを一般サイトで買う場合",
      c: "2E5A8C",
      sites: "ラクスル／アスクルパプリ／ノベルティ系ECほか",
      good: ["Web完結で単価と納期が即時に分かる", "小ロット・短納期に強く、送料無料の設定も多い", "テンプレートでのデザイン作成に対応する場合がある"],
      bad: ["原則、入稿データ（ai／eps）の用意が前提", "細かなパーツ指定・色合わせの相談はしづらい", "仕上がりの事前確認（試作）が有料または不可の場合がある"],
    },
  ];

  cols.forEach((col, i) => {
    const x = 0.6 + i * 6.2;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.62, w: 5.9, h: 5.0, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 }, shadow: shadow(),
    });
    s.addText(col.t, {
      x: x + 0.3, y: 1.85, w: 5.3, h: 0.35, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 16, bold: true, color: col.c,
    });
    s.addText(col.sites, {
      x: x + 0.3, y: 2.25, w: 5.3, h: 0.5, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: SLATE, lineSpacing: 15,
    });
    s.addText("メリット", {
      x: x + 0.3, y: 2.85, w: 5.3, h: 0.28, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 12, bold: true, color: "2C7A4B",
    });
    s.addText(col.good.map((g, k) => ({ text: g, options: { bullet: true, breakLine: k !== col.good.length - 1 } })), {
      x: x + 0.3, y: 3.18, w: 5.3, h: 1.35, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11, color: INK, lineSpacing: 16, paraSpaceAfter: 6,
    });
    s.addText("デメリット・注意点", {
      x: x + 0.3, y: 4.65, w: 5.3, h: 0.28, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 12, bold: true, color: "B3453A",
    });
    s.addText(col.bad.map((g, k) => ({ text: g, options: { bullet: true, breakLine: k !== col.bad.length - 1 } })), {
      x: x + 0.3, y: 4.98, w: 5.3, h: 1.4, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11, color: INK, lineSpacing: 16, paraSpaceAfter: 6,
    });
  });
}

// ---------- 9. Cost simulation ----------
{
  const s = pres.addSlide();
  titleBar(s, "COST", "コスト試算（30名分：ジャケット1着＋ストラップ1本）");

  s.addChart(pres.ChartType.bar, [
    {
      name: "下限（万円）",
      labels: ["③ 既製品＋名入れ", "② 小ロットオーダー", "① フルオーダー"],
      values: [11.9, 31.2, 46.2],
    },
    {
      name: "上限（万円）",
      labels: ["③ 既製品＋名入れ", "② 小ロットオーダー", "① フルオーダー"],
      values: [26.9, 46.2, 55.2],
    },
  ], {
    x: 0.6, y: 1.7, w: 7.0, h: 4.9,
    barDir: "bar",
    chartColors: [NAVY, "8E9CC4"],
    showTitle: true,
    title: "パターン別の概算総額（万円・幅で表示）",
    titleColor: NAVY,
    titleFontSize: 13,
    titleFontFace: JP,
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelColor: INK,
    dataLabelFontSize: 10,
    dataLabelFontFace: JP,
    showLegend: true,
    legendPos: "b",
    legendColor: SLATE,
    legendFontFace: JP,
    legendFontSize: 10,
    catAxisLabelColor: INK,
    catAxisLabelFontSize: 11,
    catAxisLabelFontFace: JP,
    valAxisLabelColor: SLATE,
    valAxisLabelFontSize: 10,
    valAxisMaxVal: 60,
    valGridLine: { color: "E4E9F4", size: 1 },
    catGridLine: { style: "none" },
    barGapWidthPct: 40,
  });

  const breakdown = [
    ["① フルオーダー", "ジャケット15,000〜18,000円×30＝45.0〜54.0万円\nストラップ232円×50本＝1.2万円", "約46〜55万円＋型代・サンプル代", NAVY],
    ["② 小ロットオーダー", "ジャケット10,000〜15,000円×30＝30.0〜45.0万円\n※単価は非公開のため仮置き", "約31〜46万円＋サンプル代", "2E5A8C"],
    ["③ 既製品＋名入れ", "（本体3,000〜8,000円＋刺繍600円）×30＝10.8〜25.8万円\nストラップ232円×50本＝1.2万円", "約12〜27万円", AMBER_D],
  ];
  breakdown.forEach((b, i) => {
    const y = 1.75 + i * 1.6;
    s.addShape(pres.ShapeType.roundRect, {
      x: 7.9, y, w: 4.8, h: 1.42, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 },
    });
    s.addText(b[0], {
      x: 8.15, y: y + 0.08, w: 4.3, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 13, bold: true, color: b[3],
    });
    s.addText(b[1], {
      x: 8.15, y: y + 0.4, w: 4.4, h: 0.6, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 9.5, color: SLATE, lineSpacing: 14,
    });
    s.addText(b[2], {
      x: 8.15, y: y + 1.03, w: 4.3, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11.5, bold: true, color: INK,
    });
  });
  s.addText("※ ストラップはHOTSTRAPの昇華フルカラー232円/本（税込）で50本発注した場合。②の単価は非公開のため相場からの仮置き。送料・型代・サンプル代は別途。", {
    x: 7.9, y: 6.5, w: 4.8, h: 0.6, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 9, color: SLATE, lineSpacing: 13,
  });
}

// ---------- 10. Schedule ----------
{
  const s = pres.addSlide();
  titleBar(s, "SCHEDULE", "想定スケジュール（発注方式別）");

  const lanes = [
    { name: "③ 既製品＋名入れ", color: AMBER, steps: [["商品選定・現物確認", 1.9], ["データ入稿", 1.4], ["加工・納品", 1.9]] },
    { name: "② 小ロットオーダー（国内）", color: "2E5A8C", steps: [["ヒアリング・デザイン", 2.6], ["サンプル制作・確認", 3.0], ["量産・納品", 3.4]] },
    { name: "① フルオーダー", color: NAVY, steps: [["仕様・素材決定", 2.3], ["型・サンプル", 3.1], ["量産・納品", 3.6]] },
  ];

  const x0 = 3.3;
  lanes.forEach((lane, i) => {
    const y = 2.35 + i * 1.35;
    s.addText(lane.name, {
      x: 0.6, y: y - 0.02, w: 2.6, h: 0.6, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 12.5, bold: true, color: lane.color, valign: "middle",
    });
    let cx = x0;
    lane.steps.forEach((st, j) => {
      s.addShape(pres.ShapeType.roundRect, {
        x: cx, y, w: st[1], h: 0.58, rectRadius: 0.06,
        fill: { color: lane.color, transparency: j * 22 }, line: { width: 0 },
      });
      s.addText(st[0], {
        x: cx, y, w: st[1], h: 0.58, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 9.5, bold: true, color: WHITE, align: "center", valign: "middle",
      });
      cx += st[1] + 0.1;
    });
  });

  const months = ["発注月", "+1ヶ月", "+2ヶ月", "+3ヶ月", "+4ヶ月", "+5ヶ月"];
  months.forEach((m, i) => {
    s.addText(m, {
      x: x0 + i * 1.6, y: 1.8, w: 1.6, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: SLATE, align: "center",
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 6.05, w: 12.1, h: 1.0, rectRadius: 0.08,
    fill: { color: NAVY }, line: { width: 0 },
  });
  s.addText("納期は「発注確定後」の期間。海外縫製の場合は6〜8ヶ月、染色工程が入るとさらに+2ヶ月。社内での仕様決定・稟議期間も別途必要なため、着用希望日から1ヶ月以上の余裕を見込む。", {
    x: 0.95, y: 6.05, w: 11.4, h: 1.0, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: ICE, valign: "middle", lineSpacing: 18,
  });
}

// ---------- 11. Recommendation & next actions ----------
{
  const s = pres.addSlide();
  titleBar(s, "NEXT ACTION", "推奨案と次のアクション");

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 1.62, w: 6.0, h: 2.55, rectRadius: 0.08,
    fill: { color: NAVY }, line: { width: 0 }, shadow: shadow(),
  });
  s.addText("推奨：二段構え", {
    x: 0.95, y: 1.85, w: 5.3, h: 0.4, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 18, bold: true, color: WHITE,
  });
  s.addText([
    { text: "短期：ジャケットは③既製品＋社名刺繍で先行導入（約2週間・30名で約17万円）", options: { bullet: true, breakLine: true } },
    { text: "中期：来期に向けて①または②のフルオーダーを並行検討（サンプルまで進める）", options: { bullet: true, breakLine: true } },
    { text: "ストラップは現行と同じ昇華転写で、まず50〜100本の見積を3社取得", options: { bullet: true } },
  ], {
    x: 0.95, y: 2.35, w: 5.3, h: 1.65, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: ICE, lineSpacing: 19, paraSpaceAfter: 8,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 4.35, w: 6.0, h: 2.3, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 }, shadow: shadow(),
  });
  s.addText("上長に判断いただきたい点", {
    x: 0.95, y: 4.55, w: 5.3, h: 0.35, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 15, bold: true, color: NAVY,
  });
  s.addText([
    { text: "着用開始の目標時期（＝フルオーダー可否の分岐）", options: { bullet: true, breakLine: true } },
    { text: "1着あたりの予算上限", options: { bullet: true, breakLine: true } },
    { text: "デザインは既存ロゴ流用か、新規制作か", options: { bullet: true } },
  ], {
    x: 0.95, y: 5.0, w: 5.3, h: 1.4, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: INK, lineSpacing: 19, paraSpaceAfter: 8,
  });

  const actions = [
    ["見積依頼（ジャケット3社）", "日本被服工業／ユニフォームネット／一般サイト1社に同条件で依頼", "9月中旬"],
    ["見積依頼（ストラップ3社）", "キラメック／HOTSTRAP／昇華専門店に50・100本の2条件で依頼", "9月中旬"],
    ["サンプル取り寄せ", "既製ブルゾンの現物と、ストラップの試作を確認", "9月下旬"],
    ["社内比較・方針決定", "見積を並べて短期／中期の方針を確定", "10月上旬"],
  ];
  actions.forEach((a, i) => {
    const y = 1.62 + i * 1.28;
    s.addShape(pres.ShapeType.roundRect, {
      x: 6.9, y, w: 5.8, h: 1.12, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 },
    });
    numberBadge(s, 7.1, y + 0.3, String(i + 1), i < 2 ? AMBER : NAVY);
    s.addText(a[0], {
      x: 7.75, y: y + 0.16, w: 3.6, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 13, bold: true, color: INK,
    });
    s.addText(a[1], {
      x: 7.75, y: y + 0.5, w: 4.8, h: 0.5, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: SLATE, lineSpacing: 15,
    });
    s.addText(a[2], {
      x: 11.35, y: y + 0.16, w: 1.2, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11, bold: true, color: AMBER, align: "right",
    });
  });
}

// ---------- 12. Sources ----------
{
  const s = pres.addSlide();
  titleBar(s, "EVIDENCE", "数値の出典と確度（ここが確定・ここは要見積）");

  const rows = [
    ["JK：最小ロット", "20着〜", "uniform-net.jp/products/small-lot（小ロット専用パターンオーダー）", "A", "2E7D5B"],
    ["JK：納期", "国内3〜4ヶ月／海外6〜8ヶ月", "uniform-net.jp/faq ＋ kirumirai.com/information/kikan.html", "B", "B0730F"],
    ["JK：単価（フルオーダー）", "15,000〜18,000円/着", "kirumirai.com/information/price_full_order.html", "B", "B0730F"],
    ["JK：ロット相場", "国内100着〜／海外300着〜", "nihonhifuku.jp/columns/work-clothes-order-lot-size ＋ kirumirai.com/information/lot.html", "B", "B0730F"],
    ["JK：既製品＋刺繍", "本体3,000〜8,000円／刺繍220〜660円", "work-king.shop/blog/workwear_low_price ＋ 作業服各社の刺繍加工ページ", "A", "2E7D5B"],
    ["JK：日本被服工業の条件", "50セット〜・2〜3ヶ月", "掲載ページを特定できず（一次調査メモの数値）→ 要見積", "C", "B3453A"],
    ["ST：ロット・単価", "1本〜／昇華232円〜・シルク137円〜／10mm100本＝244円", "hotstrap.jp/fullcolor.php ＋ hotstrap.jp/nylon ＋ /order/fullcolor", "A", "2E7D5B"],
    ["ST：納期", "通常6〜9営業日／特急4〜5営業日", "hotstrap.jp/nylon（納期案内）", "A", "2E7D5B"],
    ["ST：昇華専門店", "KANARY 30本〜／青山 30〜5,000本・14日目出荷・100円〜", "kanary.jp/.../shoka_neck_price.html ＋ ao-strap.com/largeorder.html", "B", "B0730F"],
    ["ST：キラメックの条件", "サイト全体で5個〜のみ", "kilamek-novelty.com（ロット・単価・納期の明示なし）→ 要見積", "C", "B3453A"],
  ];

  const tblRows = [
    ["項目", "数値", "掲載ページ（確認先）", "確度"].map((h) => ({
      text: h,
      options: { fill: NAVY, color: WHITE, bold: true, fontSize: 11.5, fontFace: JP, valign: "middle" },
    })),
    ...rows.map((r, ri) => [
      { text: r[0], options: { fill: ri % 2 === 0 ? WHITE : "F8FAFE", color: NAVY, bold: true, fontSize: 9.5, fontFace: JP, valign: "middle" } },
      { text: r[1], options: { fill: ri % 2 === 0 ? WHITE : "F8FAFE", color: INK, fontSize: 9.5, fontFace: JP, valign: "middle" } },
      { text: r[2], options: { fill: ri % 2 === 0 ? WHITE : "F8FAFE", color: SLATE, fontSize: 9, fontFace: JP, valign: "middle" } },
      { text: r[3], options: { fill: ri % 2 === 0 ? WHITE : "F8FAFE", color: r[4], bold: true, fontSize: 12, fontFace: JP, align: "center", valign: "middle" } },
    ]),
  ];

  s.addTable(tblRows, {
    x: 0.6, y: 1.55, w: 12.1, colW: [2.5, 3.4, 5.3, 0.9],
    rowH: 0.4,
    border: { type: "solid", color: "D6DDEE", pt: 1 },
    margin: 5,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 6.55, w: 12.1, h: 0.55, rectRadius: 0.08,
    fill: { color: "FDF4E4" }, line: { color: "F0DCB8", width: 1 },
  });
  s.addText("A＝発注先サイトの該当ページに数値の記載あり／B＝業界メディア・各社コラムに記載の相場値／C＝掲載ページを特定できず＝見積で確定させる項目", {
    x: 0.95, y: 6.55, w: 11.4, h: 0.55, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10.5, color: "8A5A12", valign: "middle",
  });
}

{
  const s = pres.addSlide();
  titleBar(s, "APPENDIX", "参照した情報源と留意事項");

  const rows = [
    ["ジャケット", "日本被服工業", "オリジナル作業着オーダー制作／発注ロット・価格相場コラム", "nihonhifuku.jp"],
    ["ジャケット", "ユニフォームネット", "小ロット専用パターンオーダー（20着〜）／納期に関するFAQ", "uniform-net.jp"],
    ["ジャケット", "KIRUMIRAI", "フルオーダー作業着の最小ロット・価格・製作期間の調査記事", "kirumirai.com"],
    ["ジャケット", "ワークキング／作業服各社", "既製ブルゾンの価格帯、社名刺繍の加工料金", "work-king.shop ほか"],
    ["ストラップ", "キラメック（キラメックノベルティ）", "法人向けオリジナルグッズ、小ロット5個〜の案内", "kilamek-novelty.com"],
    ["ストラップ", "HOTSTRAP", "ナイロン／フルカラー昇華の単価・納期、自動見積", "hotstrap.jp"],
    ["ストラップ", "KANARY／青山ストラップ", "昇華転写ネックストラップの価格ページ、量産日数", "kanary.jp／ao-strap.com"],
  ];

  const tblRows = [
    ["区分", "サイト・企業", "参照内容", "ドメイン"].map((h) => ({
      text: h,
      options: { fill: NAVY, color: WHITE, bold: true, fontSize: 11.5, fontFace: JP, valign: "middle" },
    })),
    ...rows.map((r, ri) => r.map((cell, ci) => ({
      text: cell,
      options: {
        fill: ri % 2 === 0 ? WHITE : "F8FAFE",
        color: ci === 0 ? NAVY : INK,
        bold: ci === 0,
        fontSize: 10.5,
        fontFace: ci === 3 ? "Arial" : JP,
        valign: "middle",
      },
    }))),
  ];

  s.addTable(tblRows, {
    x: 0.6, y: 1.65, w: 12.1, colW: [1.3, 3.6, 4.7, 2.5],
    rowH: 0.52,
    border: { type: "solid", color: "D6DDEE", pt: 1 },
    margin: 6,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 5.95, w: 12.1, h: 1.0, rectRadius: 0.08,
    fill: { color: "FDF4E4" }, line: { color: "F0DCB8", width: 1 },
  });
  s.addText("留意事項：本資料の数値は2026年9月時点で各社サイト・業界メディアに公開されている情報を整理したものです。ページの記載は改定されることがあり、また非公開の項目（①の価格・ロット・納期、②の単価、キラメックの条件）は見積でのみ確定します。発注判断の前に、各社へ同一条件での正式見積を依頼してください。", {
    x: 0.95, y: 5.95, w: 11.4, h: 1.0, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 11.5, color: "8A5A12", valign: "middle", lineSpacing: 18,
  });
}


pres.writeFile({ fileName: "工場ユニフォーム検討資料.pptx" }).then((f) => console.log("wrote", f));
