// 問題の生成。レベルを足すときはここに追加する。

// ユニットの とうろく：UNITS[type] = { questions(), steps(q), view(box, q, api), enter?(view, step, q), after?(view, step, ok) }
const UNITS = {};

// ふりがなつきの かんじ（よみながら おぼえる）
const rb = (kanji, yomi) => `<ruby>${kanji}<rt>${yomi}</rt></ruby>`;

function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 同じ問題が続かないように count 問つくる
function generate(count, make) {
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 500) {
    const p = make();
    const prev = out[out.length - 1];
    if (prev && prev.a === p.a && prev.b === p.b) continue;
    out.push(p);
  }
  return out;
}

// 一の位が 0 でない 2けたの数（20 や 30 だと へやが わかれないため）
function twoDigit(min, max) {
  let n;
  do n = rand(min, max); while (n % 10 === 0);
  return n;
}

const QUESTIONS_PER_SET = 10;

// type: add / sub / mul（くく）/ mul2（2けた）/ free（じゆうに あそぶ）
// じゅけんの どだい（2年 前半）の たんげん：[type, title, desc, make(opts)]
const J2A_UNITS = [

    ['tile2', 'タイルを はろう', 'タイル <ruby>何<rt>なん</rt></ruby>まい？・どちらが <ruby>広<rt>ひろ</rt></ruby>い？', (o) => UNITS.tile2.questions(o)],
    ['kazu', '<ruby>数<rt>かず</rt></ruby>で あそぼう', '100・10・1、<ruby>数直線<rt>すうちょくせん</rt></ruby>、<ruby>数<rt>かず</rt></ruby>の ならび', (o) => UNITS.kazu.questions(o)],
    ['yomu', '<ruby>読<rt>よ</rt></ruby>んで みよう', '<ruby>文<rt>ぶん</rt></ruby>しょうだいを よく <ruby>読<rt>よ</rt></ruby>む', (o) => UNITS.yomu.questions(o)],
    ['hako', 'はこの <ruby>形<rt>かたち</rt></ruby>', '<ruby>面<rt>めん</rt></ruby>・<ruby>辺<rt>へん</rt></ruby>・ちょう<ruby>点<rt>てん</rt></ruby>（3D）', (o) => UNITS.hako.questions(o)],
    ['tokei', '<ruby>時計<rt>とけい</rt></ruby>で あそぼう', '<ruby>時計<rt>とけい</rt></ruby>を <ruby>読<rt>よ</rt></ruby>む・あわせる・<ruby>午前<rt>ごぜん</rt></ruby> <ruby>午後<rt>ごご</rt></ruby>', (o) => UNITS.tokei.questions(o)],
    ['monosashi', 'ものさしで あそぼう', '<ruby>線<rt>せん</rt></ruby>を ひく・cm で はかる', (o) => UNITS.monosashi.questions(o)],
    ['pazuru', 'パズルで あそぼう', 'ちいさい パズル', (o) => (o.hard ? UNITS.pazuru.questions() : UNITS.pazuru.questions({ easy: true }))],
    ['kasa', 'どれだけ のめるかな？', 'L・dL・mL（かさ）', (o) => UNITS.kasa.questions(o)],
    ['kakeimi', 'かけ<ruby>算<rt>ざん</rt></ruby>って <ruby>何<rt>なん</rt></ruby>だ？', '1つ<ruby>分<rt>ぶん</rt></ruby> × いくつ<ruby>分<rt>ぶん</rt></ruby>', (o) => UNITS.kakeimi.questions(o)],
    ['shiki', 'どんな しきを <ruby>立<rt>た</rt></ruby>てるかな？', '○の <ruby>数<rt>かず</rt></ruby>を <ruby>式<rt>しき</rt></ruby>に する', (o) => UNITS.shiki.questions(o)],
    ['block', 'ブロックで あそぼう', 'つみ<ruby>木<rt>き</rt></ruby>は <ruby>何<rt>なん</rt></ruby>こ？（3D）', (o) => UNITS.block.questions(o)],
];
const J2A_HARD_DESC = {
  tile2: 'はんぶんタイルが おおい・<ruby>何<rt>なん</rt></ruby>まい <ruby>広<rt>ひろ</rt></ruby>い？',
  kazu: '4けた・1めもり 5 20 50',
  yomu: '2だんかいの <ruby>文<rt>ぶん</rt></ruby>しょうだい',
  hako: 'ひごの <ruby>長<rt>なが</rt></ruby>さ・<ruby>正方形<rt>せいほうけい</rt></ruby>の <ruby>面<rt>めん</rt></ruby>',
  tokei: '1<ruby>分<rt>ぷん</rt></ruby>ずつ・<ruby>時<rt>じ</rt></ruby>を またぐ',
  monosashi: 'mm まで・2<ruby>本<rt>ほん</rt></ruby>を つなぐ',
  pazuru: 'いた 3〜6まい',
  kasa: 'かさの ひきざん・mL',
  kakeimi: 'かけ<ruby>算<rt>ざん</rt></ruby>の きまり',
  shiki: 'わくの ○・2か<ruby>所<rt>しょ</rt></ruby> かけた <ruby>形<rt>かたち</rt></ruby>',
  block: '3だん・かくれた つみ<ruby>木<rt>き</rt></ruby>',
};

const LEVELS = [  {
    id: 'add1', type: 'add', group: 'たしざん',
    title: 'たしざん ①', desc: '＋1 を おぼえよう',
    make: () => generate(QUESTIONS_PER_SET, () => ({ a: rand(1, 9), b: 1 })),
  },
  {
    id: 'add2', type: 'add', group: 'たしざん',
    title: 'たしざん ②', desc: 'こたえが 10 まで',
    make: () => generate(QUESTIONS_PER_SET, () => {
      const a = rand(1, 9);
      return { a, b: rand(1, 10 - a) };
    }),
  },
  {
    id: 'add3', type: 'add', group: 'たしざん',
    title: 'たしざん ③', desc: 'くりあがり（10 を こえる）',
    make: () => generate(QUESTIONS_PER_SET, () => {
      const a = rand(2, 9);
      return { a, b: rand(11 - a, 9) };
    }),
  },
  {
    id: 'sub1', type: 'sub', group: 'ひきざん',
    title: 'ひきざん ①', desc: '10 までの ひきざん',
    make: () => generate(QUESTIONS_PER_SET, () => {
      const a = rand(2, 10);
      return { a, b: rand(1, a - 1) };
    }),
  },
  {
    id: 'sub2', type: 'sub', group: 'ひきざん',
    title: 'ひきざん ②', desc: 'くりさがり（10 の ぼうを ばらす）',
    make: () => generate(QUESTIONS_PER_SET, () => {
      const a = rand(11, 18);
      return { a, b: rand(a - 9, 9) };
    }),
  },
  {
    id: 'addn1', type: 'addn', group: 'おおきい かずの たしざん',
    title: '2けた ①', desc: 'くりあがり 1かい（38 + 45 など）',
    make: () => generate(QUESTIONS_PER_SET, () => {
      const oa = rand(1, 9);
      const ob = rand(10 - oa, 9);          // いちの くらいで くりあがる
      const ta = rand(1, 7);
      const tb = rand(1, 8 - ta);           // じゅうの くらいは くりあがらない
      return { a: ta * 10 + oa, b: tb * 10 + ob };
    }),
  },
  {
    id: 'addn2', type: 'addn', group: 'おおきい かずの たしざん',
    title: '2けた ②', desc: 'こたえが 100 を こえる（58 + 67 など）',
    make: () => generate(QUESTIONS_PER_SET, () => {
      let a, b;
      do {
        a = rand(11, 99);
        b = rand(11, 99);
      } while (a + b < 100 || a % 10 === 0 || b % 10 === 0);
      return { a, b };
    }),
  },
  {
    id: 'addn3', type: 'addn', group: 'おおきい かずの たしざん',
    title: '3けた', desc: '3けた + 3けた（356 + 278 など）', tiles: false, // ひっさん だけ
    make: () => generate(QUESTIONS_PER_SET, () => {
      let a, b;
      do {
        a = rand(101, 499);
        b = rand(101, 499);
      } while (a % 10 + b % 10 < 10 && Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10 < 10);
      return { a, b };                      // どこかで かならず くりあがる。こたえは 999 まで
    }),
  },
  // かけざん：1〜9 のだん（1〜9 をばらばらの順で 9 もん）
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    id: `mul${n}`, type: 'mul', group: 'かけざん（くく）',
    title: `${n} のだん`, desc: `${n} × 1 〜 ${n} × 9`,
    make: () => shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).map((b) => ({ a: n, b })),
  })),
  {
    id: 'mulmix', type: 'mul', group: 'かけざん（くく）',
    title: 'くく ばらばら', desc: 'ぜんぶの だん から',
    make: () => generate(QUESTIONS_PER_SET, () => ({ a: rand(2, 9), b: rand(1, 9) })),
  },
  {
    id: 'ta-order', type: 'ta', mode: 'order', group: 'くく タイムアタック',
    title: 'じゅんばん', desc: '1×1 から じゅんに。150びょう',
  },
  {
    id: 'ta-random', type: 'ta', mode: 'random', group: 'くく タイムアタック',
    title: 'ランダム', desc: 'ばらばらに でる。150びょう',
  },
  {
    id: 'mul21', type: 'mul2', group: '2けたの かけざん',
    title: '2けた × 1けた', desc: '23 × 4 など。2つの へやに わける',
    make: () => generate(QUESTIONS_PER_SET, () => ({ a: twoDigit(11, 39), b: rand(2, 9) })),
  },
  {
    id: 'mul22', type: 'mul2', group: '2けたの かけざん',
    title: '2けた × 2けた', desc: '23 × 14 など。4つの へやに わける',
    make: () => generate(QUESTIONS_PER_SET, () => ({ a: twoDigit(11, 29), b: twoDigit(11, 29) })),
  },
  // じゅけんの どだい（2年 前半）：SAPIX 2年「2〜7月・夏期」の じゅんばんに あわせる
  ...J2A_UNITS.map(([type, title, desc, make], i) => ({
    id: `j2a-${type}`, type, group: 'じゅけんの どだい（2年 前半）',
    groupHtml: '<ruby>受験<rt>じゅけん</rt></ruby>の <ruby>土台<rt>どだい</rt></ruby>（2<ruby>年<rt>ねん</rt></ruby> <ruby>前半<rt>ぜんはん</rt></ruby>）',
    title: `${'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀ'[i]} ${title}`, desc, make: () => make({}),
  })),
  // チャレンジ（2年 前半）
  ...J2A_UNITS.map(([type, title, , make], i) => ({
    id: `j2ah-${type}`, type, group: 'じゅけんの どだい 前半 チャレンジ（2年）',
    groupHtml: '<ruby>受験<rt>じゅけん</rt></ruby>の <ruby>土台<rt>どだい</rt></ruby> <ruby>前半<rt>ぜんはん</rt></ruby> チャレンジ（2<ruby>年<rt>ねん</rt></ruby>）',
    title: `${'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀ'[i]}★ ${title}`, desc: J2A_HARD_DESC[type], make: () => make({ hard: true }),
  })),
  // じゅけんの どだい（2年 後半）：SAPIX 2年「9〜1月」の じゅんばんに あわせる
  {
    id: 'j2-kuku', type: 'kukuhyo', group: 'じゅけんの どだい（2年 後半）',
    groupHtml: '<ruby>受験<rt>じゅけん</rt></ruby>の <ruby>土台<rt>どだい</rt></ruby>（2<ruby>年<rt>ねん</rt></ruby> <ruby>後半<rt>こうはん</rt></ruby>）',
    title: '① <ruby>九九<rt>くく</rt></ruby>を さがそう', desc: '<ruby>九九<rt>くく</rt></ruby>の <ruby>表<rt>ひょう</rt></ruby>の きまりを <ruby>見<rt>み</rt></ruby>つける',
    make: () => kukuQuestions(),
  },
  {
    id: 'j2-kufu', type: 'kufu', group: 'じゅけんの どだい（2年 後半）',
    title: '② くふうしよう', desc: '<ruby>計算<rt>けいさん</rt></ruby>の くふう（10の まとまり など）',
    make: () => kufuQuestions(),
  },
  {
    id: 'j2-nagasa', type: 'nagasa', group: 'じゅけんの どだい（2年 後半）',
    title: '③ <ruby>長<rt>なが</rt></ruby>さを はかろう', desc: 'ものさしで はかる・cm mm m',
    make: () => UNITS.nagasa.questions(),
  },
  {
    id: 'j2-junjo', type: 'junjo', group: 'じゅけんの どだい（2年 後半）',
    title: '④ じゅんじょよく <ruby>考<rt>かんが</rt></ruby>える', desc: 'もれなく <ruby>書<rt>か</rt></ruby>き<ruby>出<rt>だ</rt></ruby>す（<ruby>何通<rt>なんとお</rt></ruby>り？）',
    make: () => UNITS.junjo.questions(),
  },
  {
    id: 'j2-pazuru', type: 'pazuru', group: 'じゅけんの どだい（2年 後半）',
    title: '⑤ パズルを <ruby>作<rt>つく</rt></ruby>ろう！', desc: 'いたを しきつめる',
    make: () => UNITS.pazuru.questions(),
  },
  {
    id: 'j2-suiri', type: 'suiri', group: 'じゅけんの どだい（2年 後半）',
    title: '⑥ すいりしよう', desc: 'ヒントから <ruby>答<rt>こた</rt></ruby>えを きめる',
    make: () => UNITS.suiri.questions(),
  },
  {
    id: 'j2-kakezan', type: 'kakezan', group: 'じゅけんの どだい（2年 後半）',
    title: '⑦ かけ<ruby>算<rt>ざん</rt></ruby>を <ruby>考<rt>かんが</rt></ruby>えよう', desc: 'かけ<ruby>算<rt>ざん</rt></ruby>の <ruby>文<rt>ぶん</rt></ruby>しょうだい',
    make: () => UNITS.kakezan.questions(),
  },
  {
    id: 'j2-tenkai', type: 'tenkai', group: 'じゅけんの どだい（2年 後半）',
    title: '⑧ <ruby>立方体<rt>りっぽうたい</rt></ruby>の てんかい<ruby>図<rt>ず</rt></ruby>', desc: '<ruby>組<rt>く</rt></ruby>み<ruby>立<rt>た</rt></ruby>てると どうなる？（3D）',
    make: () => UNITS.tenkai.questions(),
  },
  // じゅけんの どだい チャレンジ（2年）：おなじ 単元の むずかしい もんだい
  ...[
    ['kukuhyo', '① <ruby>九九<rt>くく</rt></ruby>を さがそう', 'だんを かくす・3つの だん', () => kukuHardQuestions()],
    ['kufu', '② くふうしよう', '100を 2くみ・199+46・52−19', () => kufuHardQuestions()],
    ['nagasa', '③ <ruby>長<rt>なが</rt></ruby>さを はかろう', 'うごかない ものさし・ひきざん', () => UNITS.nagasa.questions({ hard: true })],
    ['junjo', '④ じゅんじょよく <ruby>考<rt>かんが</rt></ruby>える', 'おなじ カード・3つ えらぶ', () => UNITS.junjo.questions({ hard: true })],
    ['pazuru', '⑤ パズルを <ruby>作<rt>つく</rt></ruby>ろう！', '5×5 の おおきな パズル', () => UNITS.pazuru.questions({ hard: true })],
    ['suiri', '⑥ すいりしよう', '4<ruby>人<rt>にん</rt></ruby>×4つ・5ひきの じゅん', () => UNITS.suiri.questions({ hard: true })],
    ['kakezan', '⑦ かけ<ruby>算<rt>ざん</rt></ruby>を <ruby>考<rt>かんが</rt></ruby>えよう', '2つの しきを くみあわせる', () => UNITS.kakezan.questions({ hard: true })],
    ['tenkai', '⑧ <ruby>立方体<rt>りっぽうたい</rt></ruby>の てんかい<ruby>図<rt>ず</rt></ruby>', 'サイコロ（むかいあう <ruby>面<rt>めん</rt></ruby>の <ruby>和<rt>わ</rt></ruby>は 7）', () => UNITS.tenkai.questions({ hard: true })],
  ].map(([type, title, desc, make]) => ({
    id: `j2h-${type}`, type, group: 'じゅけんの どだい 後半 チャレンジ（2年）',
    groupHtml: '<ruby>受験<rt>じゅけん</rt></ruby>の <ruby>土台<rt>どだい</rt></ruby> <ruby>後半<rt>こうはん</rt></ruby> チャレンジ（2<ruby>年<rt>ねん</rt></ruby>）',
    title: title.replace(/^(\S)/, '$1★'), desc, make,
  })),
  {
    id: 'free9', type: 'free', group: 'タイルで あそぶ',
    title: 'タイル くくひょう', desc: 'めもりを うごかして みよう',
    xMax: 10, yMax: 10, split: false,
  },
  {
    id: 'free30', type: 'free', group: 'タイルで あそぶ',
    title: 'タイル 2けた', desc: '30 × 30 まで。へやに わかれる',
    xMax: 30, yMax: 30, split: true,
  },
];
