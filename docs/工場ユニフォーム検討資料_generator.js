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
const LEGEND = "●＝各社公式サイトに記載あり　▲＝比較サイト等の第三者情報・業界相場　■＝非公開のため要見積";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "";
pres.title = "工場ユニフォーム検討";

function shadow() {
  return { type: "outer", color: "9AA5C0", blur: 8, offset: 2, angle: 90, opacity: 0.35 };
}

function titleBar(slide, kicker, title) {
  slide.background = { color: BG };
  slide.addText(kicker, {
    x: 0.6, y: 0.38, w: 8, h: 0.3, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, bold: true, color: AMBER_D, charSpacing: 1,
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

function legendNote(slide) {
  slide.addText(LEGEND, {
    x: 0.6, y: 6.85, w: 12.1, h: 0.3, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10, color: SLATE,
  });
}

// 3枚のカード（ジャケット／ストラップ共通レイアウト）
function candidateCards(slide, cards) {
  cards.forEach((c, i) => {
    const x = 0.6 + i * 4.12;
    slide.addShape(pres.ShapeType.roundRect, {
      x, y: 1.62, w: 3.85, h: 5.05, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 }, shadow: shadow(),
    });
    slide.addShape(pres.ShapeType.roundRect, {
      x: x + 0.25, y: 1.82, w: 3.35, h: 0.34, rectRadius: 0.17,
      fill: { color: c.color }, line: { width: 0 },
    });
    slide.addText(c.tag, {
      x: x + 0.25, y: 1.82, w: 3.35, h: 0.34, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    slide.addText(c.name, {
      x: x + 0.25, y: 2.28, w: 3.35, h: 0.58, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 14.5, bold: true, color: INK, lineSpacing: 19,
    });
    slide.addText(c.site, {
      x: x + 0.25, y: 2.9, w: 3.35, h: 0.24, isTextBox: true, margin: 0,
      fontFace: "Arial", fontSize: 10, color: SLATE,
    });

    const specs = [["最小ロット", c.lot], ["単価", c.price], ["納期", c.lead]];
    let y = 3.18;
    specs.forEach((sp) => {
      const lines = sp[1].split("\n").length;
      const h = lines * 0.19;
      slide.addText(sp[0], {
        x: x + 0.25, y, w: 0.9, h: 0.24, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 10.5, color: SLATE, valign: "top",
      });
      slide.addText(sp[1], {
        x: x + 1.15, y, w: 2.45, h, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 10.5, bold: true, color: c.color, valign: "top", lineSpacing: 14,
      });
      y += h + 0.12;
    });
    const bulletsY = Math.max(y + 0.12, 4.95);

    slide.addText(c.bullets.map((b, k) => ({
      text: b, options: { bullet: true, breakLine: k !== c.bullets.length - 1 },
    })), {
      x: x + 0.25, y: bulletsY, w: 3.35, h: 6.55 - bulletsY, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: INK, lineSpacing: 15, paraSpaceAfter: 6,
    });
  });
  legendNote(slide);
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
    x: 0.9, y: 5.15, w: 6.4, h: 0.85, rectRadius: 0.08,
    fill: { color: NAVY }, line: { color: "36407A", width: 1 },
  });
  s.addText("候補：ジャケット3案／ストラップ3案　法人向けオリジナル制作サイトを比較\n数値の出所は各ページに ●▲■ で明記（■は要見積）", {
    x: 1.15, y: 5.15, w: 5.9, h: 0.85, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 11, color: WHITE, valign: "middle", lineSpacing: 16,
  });
  s.addText("2026年9月6日／担当：髙山", {
    x: 0.9, y: 6.35, w: 6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: "8C97BE",
  });
  s.addNotes("上司からの指示：新規ジャケット（工場訪問用作業着）とネックストラップについて、コスト感・発注先・納期・イメージ感を確認。候補は法人向けにオリジナル展開している企業をそれぞれ3案ピックアップ。数値は公開情報ベースのため、●＝公式サイト記載、▲＝第三者情報・相場、■＝要見積 で区別している。");
}

// ---------- 2. Summary ----------
{
  const s = pres.addSlide();
  titleBar(s, "SUMMARY", "調査サマリ（結論）");

  const stats = [
    { v: "¥3,000〜20,000", l: "ジャケット1着あたり\n③は実売価格 ●／①②は相場 ▲", c: NAVY },
    { v: "¥137〜244", l: "ストラップ1本あたり（シルク印刷の公開単価）●\nフルカラー昇華の単価は各社非公開 ■", c: "2E5A8C" },
    { v: "2週間〜5ヶ月", l: "納期の幅\n（既製品加工 ● 〜 フルオーダー量産 ▲）", c: AMBER_D },
  ];
  stats.forEach((st, i) => {
    const x = 0.6 + i * 4.12;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.65, w: 3.85, h: 1.8, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 }, shadow: shadow(),
    });
    s.addText(st.v, {
      x: x + 0.25, y: 1.82, w: 3.35, h: 0.6, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 24, bold: true, color: st.c,
    });
    s.addText(st.l, {
      x: x + 0.25, y: 2.48, w: 3.35, h: 0.85, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: SLATE, lineSpacing: 16,
    });
  });

  const points = [
    ["価格差は「どこまでオリジナルにするか」でほぼ決まる", "既製品への社名刺繍なら本体3,000〜8,000円＋刺繍220〜660円（各社サイト記載）。フルオーダーは相場で1着15,000〜18,000円だが、各社とも単価は非公開のため要見積。"],
    ["ネックストラップは現行品と同じフルカラー昇華転写が現実的", "昇華転写は製版不要で版代がかからない業者が多く、1本〜30本から対応する社もある。ただしフルカラーの単価は各社とも非公開で、見積必須。"],
    ["最大のリスクは納期。フルオーダーは着用希望日から逆算が必須", "既製品＋刺繍は約2週間。一方フルオーダーは2〜3ヶ月、小ロットのパターンオーダーは4〜5ヶ月かかる。"],
  ];
  points.forEach((p, i) => {
    const y = 3.78 + i * 1.06;
    numberBadge(s, 0.62, y, String(i + 1), i === 2 ? AMBER : NAVY);
    s.addText(p[0], {
      x: 1.3, y: y - 0.03, w: 11.4, h: 0.32, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 15, bold: true, color: INK,
    });
    s.addText(p[1], {
      x: 1.3, y: y + 0.33, w: 11.4, h: 0.5, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11.5, color: SLATE, lineSpacing: 16,
    });
  });
  legendNote(s);
  s.addNotes("金額はいずれも各社公開情報および業界相場からの目安。●▲■で出所を区別している。正式には同一条件での見積依頼が必要。");
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
    { text: "価格・納期は各社サイトおよび第三者情報からの整理。●▲■で出所を区別し、■は正式見積が必要", options: { bullet: true } },
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
  candidateCards(s, [
    {
      tag: "候補① フルオーダー",
      name: "日本被服工業",
      site: "nihonhifuku.jp",
      color: NAVY,
      lot: "50セット〜 ▲\n※20セット〜の情報もあり",
      price: "サイト非公開 ■\n相場15,000〜18,000円 ▲",
      lead: "約2〜3ヶ月 ▲",
      bullets: [
        "デザイン・素材選定からサンプル、サイズ合わせ、量産まで一貫対応",
        "刺繍・プリント・ワッペンなど加工の選択肢が広い",
        "完全オリジナルで他社と被らない／ブランディング効果が最も高い",
      ],
    },
    {
      tag: "候補② 小ロット・パターンオーダー",
      name: "ユニフォームネット（Bechule）",
      site: "uniform-net.jp",
      color: "2E5A8C",
      lot: "20着〜 ●",
      price: "サイト非公開 ■\n相場10,000〜20,000円 ▲",
      lead: "約4〜5ヶ月 ▲",
      bullets: [
        "100種類以上のパターンをベースに20着から製作可能",
        "サンプルユニフォームは無料。実物を見てからデザインを確定できる",
        "ヒアリング→デザインイラスト作成→サンプル制作まで対応",
      ],
    },
    {
      tag: "候補③ 既製品＋名入れ（一般サイト）",
      name: "ユニフォームネクスト／ワークストリート 他",
      site: "uniformnext.com ほか",
      color: AMBER_D,
      lot: "1着〜 ●",
      price: "本体3,000〜8,000円 ●\n＋刺繍220〜660円 ●",
      lead: "約2週間 ●",
      bullets: [
        "既製ブルゾンに社名刺繍・プリントを1着から加工",
        "刺繍代は個人名220円・ロゴ550円・安全第一660円などが公開されている",
        "現物確認ができ、追加発注・サイズ交換も容易",
      ],
    },
  ]);
  s.addNotes("候補①②は法人向けオリジナル制作会社。候補③は「一般サイトで発注した場合」の比較軸。①の最小ロットは情報が分かれており、公式への確認が必要。");
}

// ---------- 5. Jacket comparison table ----------
{
  const s = pres.addSlide();
  titleBar(s, "JACKET / 比較", "ジャケット3案の比較と向き・不向き");

  const head = ["", "① 日本被服工業\nフルオーダー", "② ユニフォームネット\n小ロットオーダー", "③ 一般サイト\n既製品＋名入れ"];
  const rows = [
    ["最小ロット", "50セット〜 ▲\n（要確認）", "20着〜 ●", "1着〜 ●"],
    ["単価", "15,000〜18,000円 ▲\n（サイト非公開 ■）", "10,000〜20,000円 ▲\n（サイト非公開 ■）", "本体3,000〜8,000円 ●\n＋刺繍220〜660円 ●"],
    ["納期", "2〜3ヶ月 ▲", "4〜5ヶ月 ▲", "約2週間 ●"],
    ["デザイン自由度", "◎ 型・素材から設計", "○ 既存パターンをベースに調整", "△ 既製デザイン＋ロゴのみ"],
    ["サンプル・初期費用", "型代・サンプル代が発生 ▲", "サンプルは無料 ●", "ほぼ不要 ●"],
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
    x: 0.6, y: 1.6, w: 12.1, colW: [2.2, 3.3, 3.3, 3.3],
    rowH: [0.6, 0.55, 0.62, 0.42, 0.45, 0.45, 0.42],
    border: { type: "solid", color: "D6DDEE", pt: 1 },
    margin: 6,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 5.65, w: 12.1, h: 1.0, rectRadius: 0.08,
    fill: { color: "FDF4E4" }, line: { color: "F0DCB8", width: 1 },
  });
  s.addText("読み取り：30名規模なら①②ともロット条件はクリアできるが、納期が2〜5ヶ月かかる。今期中の着用が必要なら③でスタートし、次期に①②へ移行する二段構えが現実的。①②の単価はいずれも公式サイト非公開のため、最終判断は見積待ち。", {
    x: 0.95, y: 5.65, w: 11.4, h: 1.0, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: "8A5A12", valign: "middle", lineSpacing: 18,
  });
  legendNote(s);
}

// ---------- 6. Strap candidates ----------
{
  const s = pres.addSlide();
  titleBar(s, "STRAP / 候補①〜③", "ネックストラップ候補3案");
  candidateCards(s, [
    {
      tag: "候補① 法人・伴走型",
      name: "キラメック（KILAMEK）",
      site: "kilamek-novelty.com",
      color: NAVY,
      lot: "5個〜 ●\n（ノベルティ全般の下限）",
      price: "非公開 ■ 要見積",
      lead: "非公開 ■ 要見積\n※納期交渉可の記載あり ●",
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
      lot: "1本〜 ●",
      price: "100本で244円/本 ●\nポリエステル137円〜 ●\nフルカラー昇華は要見積 ■",
      lead: "通常6〜9営業日 ●\n特急4〜5／最短3営業日 ●",
      bullets: [
        "Web上の自動見積で本数・仕様別の金額をその場で確認できる",
        "単価のほかに基本製作料・糸染代・送料が別途かかる点に注意",
        "50本以上は無料で試作1本を確認できる案内あり",
      ],
    },
    {
      tag: "候補③ 昇華転写に強い専門店",
      name: "KANARY／青山ストラップ 他",
      site: "kanary.jp／ao-strap.com",
      color: AMBER_D,
      lot: "KANARY 30本〜 ●",
      price: "昇華は版代不要 ●\nレイアウト代3,000〜5,000円 ●\n青山：大ロット100円〜 ●",
      lead: "サンプル＋量産で約1ヶ月 ▲",
      bullets: [
        "昇華転写のため製版不要＝版代がかからない",
        "グラデーション・写真・多色デザインを再現しやすい",
        "本数が増えるほど単価が下がるため、まとめ発注向き",
      ],
    },
  ]);
  s.addNotes("ストラップは3社とも本命仕様（フルカラー昇華）の単価が非公開。HOTSTRAPのシルク印刷単価だけが公開されており、他は要見積。");
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
  s.addText("結論：同等品は再現可能。ただし単価は要見積", {
    x: 0.95, y: 5.1, w: 5.3, h: 0.35, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 15, bold: true, color: WHITE,
  });
  s.addText("グラデーションや写真表現は昇華転写の得意領域で、製版が不要なため版代もかからない（KANARYは版代不要・30本〜と明記）。一方でフルカラー昇華の単価は各社とも非公開のため、本数を提示しての見積取得が必須。", {
    x: 0.95, y: 5.55, w: 5.3, h: 1.2, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 11.5, color: ICE, lineSpacing: 18,
  });

  const specs = [
    ["印刷方式", "昇華転写（フルカラー）／シルクスクリーン（1〜6色）", "写真・グラデーションなら昇華一択。単色ロゴのみならシルクが安い"],
    ["素材・幅", "ナイロン／ポリエステル、10・15・20mm ●", "社員証用途は15〜20mmが標準。太いほど印刷が映える"],
    ["パーツ", "ナスカン、長さ調整、安全バックル、リール ●", "工場内での引っ掛かり対策として安全バックルは必須級"],
    ["ロット", "1本〜（HOTSTRAP）／30本〜（KANARY）●", "小ロットでも受けてもらえる。予備分を含めた発注が有利"],
    ["単価", "シルク137〜244円 ●／フルカラー昇華は非公開 ■", "版代は不要でもレイアウト代3,000〜5,000円がかかる場合あり ●"],
  ];
  specs.forEach((sp, i) => {
    const y = 1.62 + i * 1.06;
    s.addShape(pres.ShapeType.roundRect, {
      x: 6.9, y, w: 5.8, h: 0.92, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 },
    });
    s.addText(sp[0], {
      x: 7.1, y: y + 0.12, w: 1.2, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11.5, bold: true, color: AMBER_D,
    });
    s.addText(sp[1], {
      x: 8.3, y: y + 0.1, w: 4.25, h: 0.34, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, bold: true, color: INK,
    });
    s.addText(sp[2], {
      x: 7.1, y: y + 0.48, w: 5.45, h: 0.36, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: SLATE,
    });
  });
  legendNote(s);
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
      good: ["1着から購入でき、社名刺繍も1着から対応 ●", "低価格帯のブルゾンは3,000〜4,000円台、上下で7,000〜8,000円 ●", "納期は加工込みで約2週間、在庫があれば即日出荷も ●"],
      bad: ["デザインは既製品の範囲。他社と被る可能性がある", "刺繍位置・サイズの自由度は限定的", "同一品番が廃番になると翌年に揃わないリスク"],
    },
    {
      t: "ストラップを一般サイトで買う場合",
      c: "2E5A8C",
      sites: "ラクスル／アスクルパプリ／ノベルティ系ECほか",
      good: ["Web完結で単価と納期が即時に分かる ●", "小ロット・短納期に強く、送料無料の設定も多い ●", "テンプレートでのデザイン作成に対応する場合がある ●"],
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
  legendNote(s);
}

// ---------- 9. Cost simulation ----------
{
  const s = pres.addSlide();
  titleBar(s, "COST", "コスト試算（ジャケット30着分）");

  s.addChart(pres.ChartType.bar, [
    {
      name: "ジャケット30着分の概算費用（万円）",
      labels: ["③ 既製品＋名入れ", "② 小ロットオーダー", "① フルオーダー"],
      values: [16.8, 30.0, 45.0],
    },
  ], {
    x: 0.6, y: 1.7, w: 7.0, h: 4.7,
    barDir: "bar",
    chartColors: [NAVY],
    showTitle: true,
    title: "ジャケット30着分の概算（万円）",
    titleColor: NAVY,
    titleFontSize: 13,
    titleFontFace: JP,
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelColor: INK,
    dataLabelFontSize: 12,
    dataLabelFontFace: JP,
    dataLabelFormatCode: '0.0"万円"',
    showLegend: false,
    catAxisLabelColor: INK,
    catAxisLabelFontSize: 11,
    catAxisLabelFontFace: JP,
    valAxisLabelColor: SLATE,
    valAxisLabelFontSize: 10,
    valAxisMaxVal: 60,
    valGridLine: { color: "E4E9F4", size: 1 },
    catGridLine: { style: "none" },
    barGapWidthPct: 60,
  });

  const breakdown = [
    ["① フルオーダー", "15,000円 ▲ ×30着", "約45.0万円＋型代・サンプル代", NAVY],
    ["② 小ロットオーダー", "10,000円 ▲ ×30着（サンプル無料 ●）", "約30.0万円", "2E5A8C"],
    ["③ 既製品＋名入れ", "（本体5,000円＋刺繍600円）● ×30着", "約16.8万円", AMBER_D],
  ];
  breakdown.forEach((b, i) => {
    const y = 1.75 + i * 1.35;
    s.addShape(pres.ShapeType.roundRect, {
      x: 7.9, y, w: 4.8, h: 1.2, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: "DDE3F0", width: 1 },
    });
    s.addText(b[0], {
      x: 8.15, y: y + 0.1, w: 4.3, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 13, bold: true, color: b[3],
    });
    s.addText(b[1], {
      x: 8.15, y: y + 0.42, w: 4.3, h: 0.32, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: SLATE,
    });
    s.addText(b[2], {
      x: 8.15, y: y + 0.78, w: 4.3, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11.5, bold: true, color: INK,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.9, y: 5.8, w: 4.8, h: 1.1, rectRadius: 0.06,
    fill: { color: "FDF4E4" }, line: { color: "F0DCB8", width: 1 },
  });
  s.addText("ストラップは本命のフルカラー昇華の単価が各社非公開のため未算入。仮に300円×50本なら＋1.5万円程度（要見積）。", {
    x: 8.15, y: 5.8, w: 4.3, h: 1.1, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 11, color: "8A5A12", valign: "middle", lineSpacing: 16,
  });
  s.addText("※ ①②の単価は相場値（▲）。送料・型代・サンプル代は別途。", {
    x: 0.6, y: 6.5, w: 7.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10, color: SLATE,
  });
  legendNote(s);
}

// ---------- 10. Schedule ----------
{
  const s = pres.addSlide();
  titleBar(s, "SCHEDULE", "想定スケジュール（発注方式別）");

  // 1ヶ月 = 1.6インチ
  const lanes = [
    {
      name: "③ 既製品＋名入れ",
      color: AMBER,
      total: "計 約2週間〜1ヶ月 ●",
      caption: "商品選定・現物確認 → 刺繍データ入稿 → 加工・納品",
      steps: [0.35, 0.25, 0.4],
    },
    {
      name: "② 小ロットオーダー",
      color: "2E5A8C",
      total: "計 約4〜5ヶ月 ▲",
      caption: "ヒアリング・デザイン → サンプル制作・確認（無料）→ 量産・納品",
      steps: [1.5, 1.5, 1.5],
    },
    {
      name: "① フルオーダー",
      color: NAVY,
      total: "計 約2〜3ヶ月 ▲",
      caption: "仕様・素材決定 → 型・サンプル → 量産・納品",
      steps: [0.8, 1.0, 0.7],
    },
  ];

  const x0 = 3.3;
  const MONTH = 1.55;
  const months = ["発注月", "+1ヶ月", "+2ヶ月", "+3ヶ月", "+4ヶ月", "+5ヶ月"];
  months.forEach((m, i) => {
    s.addText(m, {
      x: x0 + i * MONTH - 0.4, y: 1.75, w: 1.0, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: SLATE, align: "center",
    });
  });

  lanes.forEach((lane, i) => {
    const y = 2.35 + i * 1.42;
    s.addText(lane.name, {
      x: 0.6, y: y - 0.05, w: 2.6, h: 0.35, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 13.5, bold: true, color: lane.color,
    });
    s.addText(lane.total, {
      x: 0.6, y: y + 0.32, w: 2.6, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11, color: SLATE,
    });
    let cx = x0;
    lane.steps.forEach((mo, j) => {
      const w = mo * MONTH - 0.06;
      s.addShape(pres.ShapeType.roundRect, {
        x: cx, y, w, h: 0.52, rectRadius: 0.05,
        fill: { color: lane.color, transparency: j * 22 }, line: { width: 0 },
      });
      cx += mo * MONTH;
    });
    s.addText(lane.caption, {
      x: x0, y: y + 0.6, w: 9.2, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11, color: INK,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 6.35, w: 12.1, h: 0.8, rectRadius: 0.08,
    fill: { color: NAVY }, line: { width: 0 },
  });
  s.addText("納期は「発注確定後」の期間。実際にはこの前に社内での仕様決定・稟議期間が必要なため、着用希望日から逆算して1ヶ月程度の余裕を見込む。", {
    x: 0.95, y: 6.35, w: 11.4, h: 0.8, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 12, color: ICE, valign: "middle",
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
    { text: "短期：ジャケットは③既製品＋社名刺繍で先行導入（約2週間・30着で約17万円）", options: { bullet: true, breakLine: true } },
    { text: "中期：来期に向けて①または②のフルオーダーを並行検討（②はサンプル無料）", options: { bullet: true, breakLine: true } },
    { text: "ストラップは現行と同じ昇華転写で、まず50本・100本の2条件で見積を3社取得", options: { bullet: true } },
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
    ["見積依頼（ジャケット3社）", "日本被服工業／ユニフォームネット／一般サイト1社に同条件で依頼。①は最小ロットも確認", "9月中旬"],
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
      x: 7.75, y: y + 0.16, w: 3.5, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 13, bold: true, color: INK,
    });
    s.addText(a[1], {
      x: 7.75, y: y + 0.5, w: 4.8, h: 0.5, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: SLATE, lineSpacing: 15,
    });
    s.addText(a[2], {
      x: 11.3, y: y + 0.16, w: 1.25, h: 0.3, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 11, bold: true, color: AMBER_D, align: "right",
    });
  });
}

// ---------- 12. Sources ----------
{
  const s = pres.addSlide();
  titleBar(s, "APPENDIX", "数値の出所一覧（●公式サイト ／ ▲第三者情報 ／ ■要見積）");

  const rows = [
    ["最小ロット", "20着〜（ユニフォームネット）", "●", "uniform-net.jp"],
    ["最小ロット", "1本〜（HOTSTRAP）／30本〜（KANARY）／5個〜（キラメック）", "●", "hotstrap.jp ほか"],
    ["最小ロット", "50セット〜（日本被服工業）※20セット〜との情報もあり", "▲", "nihonhifuku.jp／kirumirai.com"],
    ["単価", "刺繍220〜660円、既製ブルゾン3,000〜8,000円", "●", "各作業服通販サイト"],
    ["単価", "ナイロン100本＝244円/本、ポリエステル137円〜、青山 大ロット100円〜", "●", "hotstrap.jp／ao-strap.com"],
    ["単価", "フルオーダー15,000〜18,000円、小ロット10,000〜20,000円", "▲", "kirumirai.com"],
    ["単価", "フルカラー昇華ストラップ、キラメック全般", "■", "各社に見積依頼が必要"],
    ["納期", "既製品＋刺繍 約2週間、HOTSTRAP 3〜9営業日", "●", "各社サイト"],
    ["納期", "フルオーダー2〜3ヶ月、小ロットオーダー4〜5ヶ月", "▲", "nihonhifuku.jp／kirumirai.com"],
  ];

  const markColor = { "●": "2C7A4B", "▲": AMBER_D, "■": "B3453A" };
  const tblRows = [
    ["区分", "内容", "出所", "参照元"].map((h) => ({
      text: h,
      options: { fill: NAVY, color: WHITE, bold: true, fontSize: 11.5, fontFace: JP, valign: "middle" },
    })),
    ...rows.map((r, ri) => r.map((cell, ci) => ({
      text: cell,
      options: {
        fill: ri % 2 === 0 ? WHITE : "F8FAFE",
        color: ci === 0 ? NAVY : (ci === 2 ? markColor[cell] : INK),
        bold: ci === 0 || ci === 2,
        fontSize: 10.5,
        fontFace: ci === 3 ? "Arial" : JP,
        align: ci === 2 ? "center" : "left",
        valign: "middle",
      },
    }))),
  ];

  s.addTable(tblRows, {
    x: 0.6, y: 1.6, w: 12.1, colW: [1.5, 5.8, 0.9, 3.9],
    rowH: 0.45,
    border: { type: "solid", color: "D6DDEE", pt: 1 },
    margin: 6,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.6, y: 6.25, w: 12.1, h: 0.9, rectRadius: 0.08,
    fill: { color: "FDF4E4" }, line: { color: "F0DCB8", width: 1 },
  });
  s.addText("留意事項：●は2026年9月時点で各社サイトに掲載されている数値、▲は比較サイト等の第三者情報・業界相場、■は非公開の項目です。発注判断の前に、各社へ同一条件（数量・仕様・希望納期）での正式見積を依頼してください。", {
    x: 0.95, y: 6.25, w: 11.4, h: 0.9, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 11.5, color: "8A5A12", valign: "middle", lineSpacing: 17,
  });
}

pres.writeFile({ fileName: "工場ユニフォーム検討資料.pptx" }).then((f) => console.log("wrote", f));
