// かくど パズル（4年〜）：図形の 性質（わざ）を えらんで、つぎつぎに 角度を 見つけて「？」に たどりつく。
// 「つぎの 一手」を えらぶ → つかう 角を 図で タップ → 計算して 角度を 入れる、を くりかえす。
// わざの 考え方は 中学受験の 角度の 定番（一直線・対頂角・三角形の内角の和・外角（スリッパ）・同位角・錯角・
// 二等辺三角形・正三角形・正方形）。問題と 図は この アプリの オリジナルで、角度は 毎回 かわる。

const KD = {
  // わざ：name（ボタン）、rule（せつめい）、icon（小さな 図）
  tech: {
    line: { name: `${rb('一直線', 'いっちょくせん')}`, rule: `${rb('一直線', 'いっちょくせん')}の ${rb('角', 'かく')}は 180°` },
    round: { name: `${rb('一周', 'いっしゅう')}`, rule: `${rb('点', 'てん')}の まわり ${rb('一周', 'いっしゅう')}は 360°` },
    vertical: { name: `${rb('対頂角', 'たいちょうかく')}`, rule: `2${rb('本', 'ほん')}の ${rb('直線', 'ちょくせん')}が ${rb('交', 'まじ')}わると、${rb('向', 'む')}かい${rb('合', 'あ')}う ${rb('角', 'かく')}は ${rb('等', 'ひと')}しい` },
    triangle: { name: `${rb('三角形', 'さんかくけい')}の ${rb('内角', 'ないかく')}の${rb('和', 'わ')}`, rule: `${rb('三角形', 'さんかくけい')}の 3つの ${rb('角', 'かく')}を たすと 180°` },
    slipper: { name: 'スリッパ（<ruby>外角<rt>がいかく</rt></ruby>）', rule: `${rb('三角形', 'さんかくけい')}の ${rb('外', 'そと')}の ${rb('角', 'かく')}は、となりに ない 2つの ${rb('角', 'かく')}の ${rb('和', 'わ')}` },
    corresponding: { name: `${rb('同位角', 'どういかく')}`, rule: `${rb('平行', 'へいこう')}な ${rb('線', 'せん')}では、おなじ ${rb('位置', 'いち')}の ${rb('角', 'かく')}は ${rb('等', 'ひと')}しい` },
    alternate: { name: `${rb('錯角', 'さっかく')}`, rule: `${rb('平行', 'へいこう')}な ${rb('線', 'せん')}では、Z の ${rb('形', 'かたち')}の ${rb('角', 'かく')}は ${rb('等', 'ひと')}しい` },
    isosceles: { name: `${rb('二等辺三角形', 'にとうへんさんかくけい')}`, rule: `${rb('二等辺三角形', 'にとうへんさんかくけい')}は ${rb('底角', 'ていかく')}（${rb('下', 'した')}の 2つの ${rb('角', 'かく')}）が ${rb('等', 'ひと')}しい` },
    equilateral: { name: `${rb('正三角形', 'せいさんかくけい')}`, rule: `${rb('正三角形', 'せいさんかくけい')}の ${rb('角', 'かく')}は どれも 60°` },
    square: { name: `${rb('正方形', 'せいほうけい')}`, rule: `${rb('正方形', 'せいほうけい')}の ${rb('角', 'かく')}は どれも 90°（${rb('直角', 'ちょっかく')}）` },
  },
};

// 小さな わざの 図（ボタン・ルートに つかう）
const KD_ICON = {
  line: '<path d="M3 20h26M16 20l7-13" /><path d="M20 20a4 4 0 0 0-1.7-3.3" class="a"/>',
  round: '<path d="M16 16l12-4M16 16l-9 10M16 16l-2-12" /><circle cx="16" cy="16" r="5" class="a"/>',
  vertical: '<path d="M4 6l24 20M4 26L28 6" /><path d="M10 11a7 7 0 0 0 0 10M22 11a7 7 0 0 1 0 10" class="a"/>',
  triangle: '<path d="M4 26h24L13 6z" /><path d="M8 26a4 4 0 0 0-1.6-3.7M24 26a4 4 0 0 1 1.6-3.7M11.3 9.6a4 4 0 0 0 4 .3" class="a"/>',
  slipper: '<path d="M3 26h27M5 26L14 7l9 19" /><path d="M27 26a4 4 0 0 0-2.4-3.9" class="a"/>',
  corresponding: '<path d="M2 11h28M2 23h28M21 4L11 30" /><path d="M23 11a4 4 0 0 0-2-3.5M18.6 23a4 4 0 0 0-2-3.5" class="a"/>',
  alternate: '<path d="M2 11h28M2 23h28M21 4L11 30" /><path d="M14.6 11a4 4 0 0 0 1.8 3.4M17.4 23a4 4 0 0 0-1.8-3.4" class="a"/>',
  isosceles: '<path d="M5 26h22L16 5z" /><path d="M9.6 15.4l2.4 1.4M22.4 15.4l-2.4 1.4" /><path d="M9 26a4 4 0 0 0-1.7-3.5M23 26a4 4 0 0 1 1.7-3.5" class="a"/>',
  equilateral: '<path d="M4 26h24L16 5z" /><path d="M9.2 15.2l2.5 1.4M22.8 15.2l-2.5 1.4M16 24.5v3" />',
  square: '<path d="M6 6h20v20H6z" /><path d="M6 21h5v5" class="a"/>',
};
const kdIcon = (t) => `<svg class="kd-icon" viewBox="0 0 32 32">${KD_ICON[t]}</svg>`;

// ---------- 図を つくる どうぐ（y は 下むき。角度は ふつうの 数学の むき＝反時計まわり） ----------
const kdDir = (deg) => [Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)];
const kdAdd = (p, deg, len) => {
  const [dx, dy] = kdDir(deg);
  return [p[0] + dx * len, p[1] + dy * len];
};
const kdAng = (from, to) => ((Math.atan2(-(to[1] - from[1]), to[0] - from[0]) * 180) / Math.PI + 360) % 360;
// 角：v（頂点）、a → b（反時計まわり）
const kdAngle = (v, a, b, val, state = 'hidden') => ({ v, a, b, val, state });
const pick = (list) => list[rand(0, list.length - 1)];
const r5 = (lo, hi) => rand(lo / 5, hi / 5) * 5;

// 底辺の 左右の 角が A・B の 三角形（底辺は 横）。高さ・はばに あわせて 大きさを きめる
function kdTriangle(A, B, { left = 50, right = 350, base = 250, maxH = 200 } = {}) {
  const ta = Math.tan((A * Math.PI) / 180);
  const tb = Math.tan((B * Math.PI) / 180);
  const x = tb / (ta + tb);                 // 底辺 1 の とき
  const h = x * ta;
  const L = Math.min(right - left, maxH / h);
  const x0 = left + (right - left - L) / 2;
  return { P1: [x0, base], P2: [x0 + L, base], C: [x0 + x * L, base - h * L] };
}

// ---------- もんだいの かたち ----------
// 返す もの：segs（線）、angles（角）、ticks（おなじ 長さの しるし）、par（平行の しるし）、route（一手ずつ）、target
const KD_MAKE = {
  // 一直線：180 − a
  line1() {
    const a = r5(30, 150);
    const O = [200, 210], L = [30, 210], R = [370, 210], P = kdAdd(O, a, 150);
    return {
      segs: [[L, R], [O, P]],
      angles: { g: kdAngle(O, R, P, a, 'given'), x: kdAngle(O, P, L, 180 - a, 'target') },
      route: [{ tech: 'line', uses: ['g'], result: 'x', formula: `180 − ${a}` }],
    };
  },
  // 一直線（3つに わかれる）：180 − a − b
  line2() {
    const a = r5(30, 80), b = r5(30, 150 - a);
    const O = [200, 220], L = [30, 220], R = [370, 220];
    const P1 = kdAdd(O, a, 150), P2 = kdAdd(O, a + b, 150);
    return {
      segs: [[L, R], [O, P1], [O, P2]],
      angles: {
        g1: kdAngle(O, R, P1, a, 'given'), g2: kdAngle(O, P1, P2, b, 'given'),
        x: kdAngle(O, P2, L, 180 - a - b, 'target'),
      },
      route: [{ tech: 'line', uses: ['g1', 'g2'], result: 'x', formula: `180 − ${a} − ${b}` }],
    };
  },
  // 一周：360 − a − b
  round() {
    let a, b;
    do { a = r5(70, 170); b = r5(70, 170); } while (360 - a - b < 50 || 360 - a - b > 170);
    const O = [200, 150], d0 = r5(0, 60);
    const R0 = kdAdd(O, d0, 120), R1 = kdAdd(O, d0 + a, 120), R2 = kdAdd(O, d0 + a + b, 120);
    return {
      segs: [[O, R0], [O, R1], [O, R2]],
      angles: {
        g1: kdAngle(O, R0, R1, a, 'given'), g2: kdAngle(O, R1, R2, b, 'given'),
        x: kdAngle(O, R2, R0, 360 - a - b, 'target'),
      },
      route: [{ tech: 'round', uses: ['g1', 'g2'], result: 'x', formula: `360 − ${a} − ${b}` }],
    };
  },
  // 対頂角
  vertical() {
    const a = r5(35, 145), al = r5(5, 35);
    const O = [200, 150];
    // 図から はみださない 長さ
    const r = [al, al + a, al + 180, al + a + 180].map((d) => kdAdd(O, d, Math.min(165, 135 / Math.max(0.01, Math.abs(Math.sin((d * Math.PI) / 180))))));
    const flip = rand(0, 1);
    return {
      segs: [[r[0], r[2]], [r[1], r[3]]],
      angles: {
        g: flip ? kdAngle(O, r[2], r[3], a, 'given') : kdAngle(O, r[0], r[1], a, 'given'),
        x: flip ? kdAngle(O, r[0], r[1], a, 'target') : kdAngle(O, r[2], r[3], a, 'target'),
      },
      route: [{ tech: 'vertical', uses: ['g'], result: 'x', formula: '' }],
    };
  },
  // 三角形の 内角の和（どの 角を 聞くかは ランダム）
  triangle() {
    const A = r5(35, 85), B = r5(35, 145 - A), C = 180 - A - B;
    const { P1, P2, C: T } = kdTriangle(A, B);
    const all = [kdAngle(P1, P2, T, A), kdAngle(P2, T, P1, B), kdAngle(T, P1, P2, C)];
    const t = rand(0, 2);
    const angles = {};
    const ids = [];
    all.forEach((an, i) => {
      if (i === t) angles.x = { ...an, state: 'target' };
      else { angles[`g${i}`] = { ...an, state: 'given' }; ids.push(`g${i}`); }
    });
    return {
      segs: [[P1, P2], [P2, T], [T, P1]], angles,
      route: [{ tech: 'triangle', uses: ids, result: 'x', formula: `180 − ${angles[ids[0]].val} − ${angles[ids[1]].val}` }],
    };
  },
  // スリッパ（外角）：A + C
  slipper() {
    const A = r5(30, 75), C = r5(35, 120 - A);
    const B = 180 - A - C;
    const { P1, P2, C: T } = kdTriangle(A, B, { left: 30, right: 300 });
    const E = [P2[0] + 80, P2[1]];
    return {
      segs: [[P1, E], [P2, T], [T, P1]],
      angles: {
        gA: kdAngle(P1, P2, T, A, 'given'), gC: kdAngle(T, P1, P2, C, 'given'),
        x: kdAngle(P2, E, T, A + C, 'target'),
      },
      route: [{ tech: 'slipper', uses: ['gA', 'gC'], result: 'x', formula: `${A} + ${C}` }],
    };
  },
  // 平行線：同位角 / 錯角
  parallel(kind = pick(['corresponding', 'alternate'])) {
    const t = pick([r5(40, 75), r5(105, 140)]);
    const dx = 55 / Math.tan((t * Math.PI) / 180);
    const T1 = [200 + dx, 95], T2 = [200 - dx, 205];
    const U = kdAdd(T1, t, 70), D = kdAdd(T2, t + 180, 70);
    const L1 = [30, 95], R1 = [370, 95], L2 = [30, 205], R2 = [370, 205];
    let g, x;
    if (kind === 'corresponding') {
      g = kdAngle(T1, R1, U, t, 'given');
      x = kdAngle(T2, R2, T1, t, 'target');
    } else {
      g = kdAngle(T1, L1, T2, t, 'given');
      x = kdAngle(T2, R2, T1, t, 'target');
    }
    return {
      segs: [[L1, R1], [L2, R2], [U, D]], par: [[L1, R1], [L2, R2]],
      angles: { g, x },
      route: [{ tech: kind, uses: ['g'], result: 'x', formula: '' }],
    };
  },
  // 二等辺三角形：頂角から 底角（(180 − t) ÷ 2）
  isosceles() {
    const b = r5(30, 75), t = 180 - 2 * b;
    const { P1, P2, C } = kdTriangle(b, b, { left: 70, right: 330 });
    const right = rand(0, 1);
    return {
      segs: [[P1, P2], [P2, C], [C, P1]], ticks: [[C, P1, 1], [C, P2, 1]],
      angles: {
        g: kdAngle(C, P1, P2, t, 'given'),
        x: right ? kdAngle(P2, C, P1, b, 'target') : kdAngle(P1, P2, C, b, 'target'),
      },
      route: [{ tech: 'isosceles', uses: ['g'], result: 'x', formula: `(180 − ${t}) ÷ 2` }],
    };
  },
  // 正三角形：60°
  equilateral() {
    const { P1, P2, C } = kdTriangle(60, 60, { left: 80, right: 320 });
    const which = rand(0, 2);
    const all = [kdAngle(P1, P2, C, 60), kdAngle(P2, C, P1, 60), kdAngle(C, P1, P2, 60)];
    return {
      segs: [[P1, P2], [P2, C], [C, P1]], ticks: [[P1, P2, 2], [P2, C, 2], [C, P1, 2]],
      angles: { x: { ...all[which], state: 'target' } },
      route: [{ tech: 'equilateral', uses: [], result: 'x', formula: '' }],
    };
  },
  // 正方形の 角を 線で わける：90 − a
  square() {
    const a = r5(20, 45);
    const TL = [110, 40], BL = [110, 260], BR = [330, 260], TR = [330, 40];
    const E = [110 + 220 * Math.tan((a * Math.PI) / 180), 260];
    return {
      segs: [[TL, BL], [BL, BR], [BR, TR], [TR, TL], [TL, E]], ticks: [[TL, BL, 1], [BL, BR, 1], [BR, TR, 1], [TR, TL, 1]],
      angles: { g: kdAngle(TL, BL, E, a, 'given'), x: kdAngle(TL, E, TR, 90 - a, 'target') },
      route: [{ tech: 'square', uses: ['g'], result: 'x', formula: `90 − ${a}` }],
    };
  },

  // ---- 2手 ----
  // 三角形 → 対頂角（X の 形）
  triVertical() {
    const A = r5(40, 75), B = r5(40, 140 - A), C = 180 - A - B;
    const { P1, P2, C: T } = kdTriangle(A, B, { base: 270, maxH: 150 });
    const Q1 = kdAdd(T, A, 70), Q2 = kdAdd(T, 180 - B, 70);
    return {
      segs: [[P1, P2], [P1, Q1], [P2, Q2]],
      angles: {
        gA: kdAngle(P1, P2, T, A, 'given'), gB: kdAngle(P2, T, P1, B, 'given'),
        y: kdAngle(T, P1, P2, C), x: kdAngle(T, Q1, Q2, C, 'target'),
      },
      route: [
        { tech: 'triangle', uses: ['gA', 'gB'], result: 'y', formula: `180 − ${A} − ${B}` },
        { tech: 'vertical', uses: ['y'], result: 'x', formula: '' },
      ],
    };
  },
  // 一直線 → 三角形（外の 角から 中の 角）
  lineTri() {
    const A = r5(35, 75), B = r5(40, 140 - A), C = 180 - A - B;
    const { P1, P2, C: T } = kdTriangle(A, B, { left: 30, right: 300 });
    const E = [P2[0] + 80, P2[1]];
    return {
      segs: [[P1, E], [P2, T], [T, P1]],
      angles: {
        gA: kdAngle(P1, P2, T, A, 'given'), ge: kdAngle(P2, E, T, 180 - B, 'given'),
        y: kdAngle(P2, T, P1, B), x: kdAngle(T, P1, P2, C, 'target'),
      },
      route: [
        { tech: 'line', uses: ['ge'], result: 'y', formula: `180 − ${180 - B}` },
        { tech: 'triangle', uses: ['gA', 'y'], result: 'x', formula: `180 − ${A} − ${B}` },
      ],
    };
  },
  // 錯角 → 三角形（平行線の あいだの 三角形）
  altTri() {
    const al = r5(40, 70), b = r5(40, 70), c = 180 - al - b;
    const H = 150;
    const w1 = H / Math.tan((al * Math.PI) / 180), w2 = H / Math.tan((b * Math.PI) / 180);
    const Tx = 200 + (w1 - w2) / 2;
    const T = [Tx, 70], P1 = [Tx - w1, 220], P2 = [Tx + w2, 220];
    const L1 = [20, 70], R1 = [380, 70], L2 = [20, 220], R2 = [380, 220];
    return {
      segs: [[L1, R1], [L2, R2], [T, P1], [T, P2]], par: [[L1, R1], [L2, R2]],
      angles: {
        g: kdAngle(T, L1, P1, al, 'given'), gb: kdAngle(P2, T, P1, b, 'given'),
        y: kdAngle(P1, P2, T, al), x: kdAngle(T, P1, P2, c, 'target'),
      },
      route: [
        { tech: 'alternate', uses: ['g'], result: 'y', formula: '' },
        { tech: 'triangle', uses: ['y', 'gb'], result: 'x', formula: `180 − ${al} − ${b}` },
      ],
    };
  },
  // 二等辺三角形 → 三角形（底角から 頂角）
  isoTri() {
    const b = r5(35, 75), t = 180 - 2 * b;
    const { P1, P2, C } = kdTriangle(b, b, { left: 70, right: 330 });
    return {
      segs: [[P1, P2], [P2, C], [C, P1]], ticks: [[C, P1, 1], [C, P2, 1]],
      angles: { g: kdAngle(P1, P2, C, b, 'given'), y: kdAngle(P2, C, P1, b), x: kdAngle(C, P1, P2, t, 'target') },
      route: [
        { tech: 'isosceles', uses: ['g'], result: 'y', formula: '' },
        { tech: 'triangle', uses: ['g', 'y'], result: 'x', formula: `180 − ${b} − ${b}` },
      ],
    };
  },
  // 正三角形 → 三角形（正三角形の 中に 線）
  equiTri() {
    const a = r5(15, 45);
    const { P1, P2, C } = kdTriangle(60, 60, { left: 60, right: 340 });
    // C から 底辺の 点 D へ。∠P1 C D = a
    const d = kdAng(C, P1) + a;            // C から D への むき
    const t = (P1[1] - C[1]) / kdDir(d)[1];
    const D = kdAdd(C, d, t);
    return {
      segs: [[P1, P2], [P2, C], [C, P1], [C, D]], ticks: [[P1, P2, 2, 0.82], [P2, C, 2], [C, P1, 2]],
      angles: { g: kdAngle(C, P1, D, a, 'given'), y: kdAngle(P1, P2, C, 60), x: kdAngle(D, C, P1, 120 - a, 'target') },
      route: [
        { tech: 'equilateral', uses: [], result: 'y', formula: '' },
        { tech: 'triangle', uses: ['g', 'y'], result: 'x', formula: `180 − ${a} − 60` },
      ],
    };
  },
  // 正方形 → 三角形
  squareTri() {
    const a = r5(20, 45);
    const TL = [110, 40], BL = [110, 260], BR = [330, 260], TR = [330, 40];
    const E = [110 + 220 * Math.tan((a * Math.PI) / 180), 260];
    return {
      segs: [[TL, BL], [BL, BR], [BR, TR], [TR, TL], [TL, E]], ticks: [[TL, BL, 1], [BL, BR, 1], [BR, TR, 1], [TR, TL, 1]],
      angles: { g: kdAngle(TL, BL, E, a, 'given'), y: kdAngle(BL, E, TL, 90), x: kdAngle(E, TL, BL, 90 - a, 'target') },
      route: [
        { tech: 'square', uses: [], result: 'y', formula: '' },
        { tech: 'triangle', uses: ['g', 'y'], result: 'x', formula: `180 − ${a} − 90` },
      ],
    };
  },

  // ---- 3手 ----
  // 対頂角 → 一直線 → 三角形
  vertLineTri() {
    const A = r5(35, 70), B = r5(40, 135 - A), C = 180 - A - B;
    const { P1, P2, C: T } = kdTriangle(A, B, { left: 30, right: 300, base: 270, maxH: 150 });
    const Q1 = kdAdd(T, A, 70), Q2 = kdAdd(T, 180 - B, 70), E = [P2[0] + 80, P2[1]];
    return {
      segs: [[P1, E], [P1, Q1], [P2, Q2]],
      angles: {
        gv: kdAngle(T, Q1, Q2, C, 'given'), ge: kdAngle(P2, E, T, 180 - B, 'given'),
        y: kdAngle(T, P1, P2, C), z: kdAngle(P2, T, P1, B), x: kdAngle(P1, P2, T, A, 'target'),
      },
      route: [
        { tech: 'vertical', uses: ['gv'], result: 'y', formula: '' },
        { tech: 'line', uses: ['ge'], result: 'z', formula: `180 − ${180 - B}` },
        { tech: 'triangle', uses: ['y', 'z'], result: 'x', formula: `180 − ${C} − ${B}` },
      ],
    };
  },
  // 一直線 → 二等辺三角形 → 三角形
  lineIsoTri() {
    const b = r5(40, 75), t = 180 - 2 * b;
    const { P1, P2, C } = kdTriangle(b, b, { left: 40, right: 300 });
    const E = [P2[0] + 80, P2[1]];
    return {
      segs: [[P1, E], [P2, C], [C, P1]], ticks: [[C, P1, 1], [C, P2, 1]],
      angles: {
        ge: kdAngle(P2, E, C, 180 - b, 'given'),
        y: kdAngle(P2, C, P1, b), z: kdAngle(P1, P2, C, b), x: kdAngle(C, P1, P2, t, 'target'),
      },
      route: [
        { tech: 'line', uses: ['ge'], result: 'y', formula: `180 − ${180 - b}` },
        { tech: 'isosceles', uses: ['y'], result: 'z', formula: '' },
        { tech: 'triangle', uses: ['y', 'z'], result: 'x', formula: `180 − ${b} − ${b}` },
      ],
    };
  },
  // 同位角 → 一直線 → 三角形（平行線を またぐ 三角形）
  corrLineTri() {
    const t = r5(50, 75), bb = r5(40, 140 - t);
    const inner = 180 - t;
    const H = 175, base = 255;
    const P1 = [70, base];
    const T1 = kdAdd(P1, t, H / Math.sin((t * Math.PI) / 180));   // 上の 線との 交わり
    const T = kdAdd(P1, t, (H * 0.62) / Math.sin((t * Math.PI) / 180));
    const P2 = [T[0] + (base - T[1]) / Math.tan((bb * Math.PI) / 180), base];
    const L1 = [20, T1[1]], R1 = [380, T1[1]], L2 = [20, base], R2 = [380, base];
    const U = kdAdd(T1, t, 45);
    return {
      segs: [[L1, R1], [L2, R2], [P1, U], [T, P2]], par: [[L1, R1], [L2, R2]],
      angles: {
        g: kdAngle(T1, U, L1, inner, 'given'), gb: kdAngle(P2, T, P1, bb, 'given'),
        y: kdAngle(P1, T1, L2, inner), z: kdAngle(P1, P2, T, t), x: kdAngle(T, P1, P2, 180 - t - bb, 'target'),
      },
      route: [
        { tech: 'corresponding', uses: ['g'], result: 'y', formula: '' },
        { tech: 'line', uses: ['y'], result: 'z', formula: `180 − ${inner}` },
        { tech: 'triangle', uses: ['z', 'gb'], result: 'x', formula: `180 − ${t} − ${bb}` },
      ],
    };
  },
};

// ステージ：[タイトル, せつめい, つくりかた, もんだいの かず, このステージまでに ならう わざ]
const KD_STAGES = [
  ['一直線・一周', '180°・360° を つかう', () => [...Array(3)].map(() => pick(['line1', 'line2'])).concat(['round', 'line1', 'round', 'line2']), ['line', 'round', 'vertical', 'triangle']],
  ['対頂角', '向かい合う 角は 等しい', () => ['vertical', 'vertical', 'vertical', 'line1', 'vertical', 'line2'], ['line', 'round', 'vertical', 'triangle']],
  ['三角形の 内角の和', '3つ たすと 180°', () => ['triangle', 'triangle', 'triangle', 'triangle', 'vertical', 'triangle'], ['line', 'round', 'vertical', 'triangle']],
  ['スリッパ', '外の 角 ＝ となりに ない 2つの 和', () => ['slipper', 'slipper', 'triangle', 'slipper', 'slipper', 'line1'], ['line', 'vertical', 'triangle', 'slipper']],
  ['平行線', '同位角・錯角', () => ['parallel', 'parallel', 'parallel', 'parallel', 'parallel', 'parallel'], ['line', 'vertical', 'triangle', 'corresponding', 'alternate']],
  ['とくべつな 形', '二等辺三角形・正三角形・正方形', () => ['isosceles', 'isosceles', 'equilateral', 'square', 'square', 'isosceles'], ['line', 'triangle', 'isosceles', 'equilateral', 'square']],
  ['2手で とこう', 'わざを 2つ つなぐ', () => ['triVertical', 'lineTri', 'altTri', 'isoTri', 'equiTri', 'squareTri'], null],
  ['3手 チャレンジ', 'わざを 3つ つなぐ', () => ['vertLineTri', 'lineIsoTri', 'corrLineTri', 'vertLineTri', 'lineIsoTri', 'corrLineTri'], null],
];
const KD_ALL = Object.keys(KD.tech);
UNITS.kakudo = {
  questions({ stage = 0 } = {}) {
    const [, , plan, techs] = KD_STAGES[stage];
    return shuffle(plan()).map((kind, i) => {
      const fig = KD_MAKE[kind]();
      return { kind, stage, techs: techs || KD_ALL, ...fig, label: `かくど ${stage + 1}-${i + 1}` };
    });
  },

  steps(q) {
    const steps = [];
    const n = q.route.length;
    q.route.forEach((m, k) => {
      const others = shuffle(q.techs.filter((t) => t !== m.tech)).slice(0, 3);
      const opts = shuffle([m.tech, ...others]);
      const head = n > 1 ? `${k + 1}${rb('手', 'て')}め：` : '';
      steps.push({
        kind: 'choice', move: k,
        prompt: `${head}「？」に ${rb('近', 'ちか')}づく つぎの ${rb('一手', 'いって')}は どの わざ？`,
        options: opts.map((t) => ({ html: `${kdIcon(t)}<span>${KD.tech[t].name}</span>` })),
        answer: opts.indexOf(m.tech),
        explain: `${KD.tech[m.tech].name}！ ${KD.tech[m.tech].rule}`,
        hint: `その わざでは まだ ${rb('角', 'かく')}が わからないよ。${rb('図', 'ず')}を よく ${rb('見', 'み')}てみよう`,
      });
      if (m.uses.length) {
        steps.push({
          kind: 'kdpick', move: k,
          prompt: `${KD.tech[m.tech].name}で つかう ${rb('角', 'かく')}を ${m.uses.length}つ タップしよう`,
          say: `${rb('角', 'かく')}を タップ（${m.uses.length}つ）`,
        });
      }
      const val = q.angles[m.result].val;
      steps.push({
        kind: 'answer', move: k, expected: val, unit: '°',
        before: m.formula ? `${m.formula} =` : '',
        prompt: m.result === 'x' ? `「？」は ${rb('何', 'なん')}${rb('度', 'ど')}？` : `□の ${rb('角', 'かく')}は ${rb('何', 'なん')}${rb('度', 'ど')}？`,
      });
    });
    return steps;
  },

  view(box, q, api) {
    const view = { q, mode: 'none', selected: new Set(), known: new Set(), cur: null, move: 0 };
    for (const [id, an] of Object.entries(q.angles)) if (an.state === 'given') view.known.add(id);
    const svgNS = 'http://www.w3.org/2000/svg';

    const arcPath = (an, r, fill) => {
      const t0 = kdAng(an.v, an.a);
      let sweep = (kdAng(an.v, an.b) - t0 + 360) % 360;
      const p0 = kdAdd(an.v, t0, r);
      const p1 = kdAdd(an.v, t0 + sweep, r);
      const big = sweep > 180 ? 1 : 0;
      const arc = `A${r} ${r} 0 ${big} 0 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
      return fill ? `M${an.v[0]} ${an.v[1]} L${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${arc} Z` : `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${arc}`;
    };
    const mid = (an) => kdAng(an.v, an.a) + ((kdAng(an.v, an.b) - kdAng(an.v, an.a) + 360) % 360) / 2;
    // 角の 大きさに あわせて 弧の 半径（小さい 角は 大きく、ラベルが はみださない）
    const radius = (an) => (an.val < 40 ? 44 : an.val < 70 ? 34 : 28);

    view.layout = () => {};
    view.draw = () => {
      box.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'kd-wrap';
      // ルート：わざの マス（おわった わざ／いま／🔒）
      const route = q.route.map((m, k) => {
        if (k < view.move) return `<span class="kd-slot done">${kdIcon(m.tech)}</span>`;
        if (k === view.move && view.techShown) return `<span class="kd-slot now">${kdIcon(m.tech)}</span>`;
        return `<span class="kd-slot ${k === view.move ? 'now' : ''}">🔒</span>`;
      }).join('<span class="kd-arrow">→</span>');
      wrap.innerHTML = `<div class="kd-route">${route}<span class="kd-arrow">→</span><span class="kd-goal">？</span></div>`;
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 400 300');
      svg.setAttribute('class', 'kd-svg');
      let html = '';
      // 角の いろ（線の 下）
      for (const [id, an] of Object.entries(q.angles)) {
        const r = radius(an);
        const isKnown = view.known.has(id);
        const cls = id === view.cur ? 'cur' : view.selected.has(id) ? 'sel' : an.state === 'target' && !isKnown ? 'target' : isKnown ? (an.state === 'given' ? 'given' : 'found') : null;
        if (!cls) continue;
        html += `<path class="kd-wedge ${cls}" d="${arcPath(an, r, true)}"/><path class="kd-arc ${cls}" d="${arcPath(an, r, false)}"/>`;
      }
      // 線
      for (const [p, s] of q.segs) html += `<line class="kd-seg" x1="${p[0]}" y1="${p[1]}" x2="${s[0]}" y2="${s[1]}"/>`;
      // おなじ 長さの しるし
      for (const [p, s, n, at = 0.5] of q.ticks || []) {
        const m = [p[0] + (s[0] - p[0]) * at, p[1] + (s[1] - p[1]) * at];
        const d = kdAng(p, s);
        for (let i = 0; i < n; i++) {
          const c = kdAdd(m, d, (i - (n - 1) / 2) * 6);
          const a = kdAdd(c, d + 90, 7), b = kdAdd(c, d - 90, 7);
          html += `<line class="kd-tick" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
        }
      }
      // 平行の しるし（＞）
      for (const [p, s] of q.par || []) {
        const m = [(p[0] + s[0]) / 2 + 120, (p[1] + s[1]) / 2];
        html += `<path class="kd-par" d="M${m[0] - 6} ${m[1] - 6} L${m[0] + 2} ${m[1]} L${m[0] - 6} ${m[1] + 6}"/>`;
      }
      // ラベル と タップの はんい
      for (const [id, an] of Object.entries(q.angles)) {
        const r = radius(an);
        const isKnown = view.known.has(id);
        const text = isKnown ? `${an.val}°` : an.state === 'target' ? '？' : id === view.cur ? '□' : '';
        const lp = kdAdd(an.v, mid(an), r + (an.val < 40 ? 16 : 19));
        if (text) html += `<text class="kd-label ${an.state === 'target' && !isKnown ? 'target' : ''} ${id === view.cur ? 'cur' : ''}" x="${lp[0].toFixed(1)}" y="${lp[1].toFixed(1)}">${text}</text>`;
        html += `<path class="kd-hit" data-id="${id}" d="${arcPath(an, Math.max(r + 22, 52), true)}"/>`;
      }
      svg.innerHTML = html;
      wrap.appendChild(svg);
      box.appendChild(wrap);
      svg.querySelectorAll('.kd-hit').forEach((el) => el.addEventListener('click', () => tap(el.dataset.id)));
    };

    function tap(id) {
      const step = api.step();
      if (view.mode !== 'pick' || api.locked() || !step || step.kind !== 'kdpick') return;
      const need = q.route[step.move].uses;
      if (view.selected.has(id)) return;
      if (!view.known.has(id)) {
        api.wrong(`その ${rb('角', 'かく')}は まだ わからないよ。${rb('度', 'ど')}が ${rb('書', 'か')}いてある ${rb('角', 'かく')}を えらぼう`);
        return;
      }
      if (!need.includes(id)) {
        api.wrong(`その ${rb('角', 'かく')}は この わざでは つかわないよ`);
        return;
      }
      view.selected.add(id);
      api.tick();
      view.draw();
      if (need.every((u) => view.selected.has(u))) {
        view.mode = 'none';
        api.correct('いいね！ つぎは 計算だ');
      }
    }
    view.tap = tap;
    return view;
  },

  enter(view, step, q) {
    view.move = step.move;
    view.techShown = step.kind !== 'choice';
    view.mode = step.kind === 'kdpick' ? 'pick' : 'none';
    if (step.kind === 'choice') view.selected = new Set();
    // 計算の ときは もとめる 角を □ で しめす
    view.cur = step.kind === 'answer' && q.route[step.move].result !== 'x' ? q.route[step.move].result : null;
  },

  // 計算が おわったら その 角を わかった 角に する（まちがえて 答えを 見た ときも）
  after(view, step) {
    if (step.kind !== 'answer') return;
    view.known.add(view.q.route[step.move].result);
    view.cur = null;
    view.selected = new Set();
    view.draw();
  },
};

// ホームの ステージ（タイルで あそぶ の まえに 入れる）
{
  const titles = [
    `${rb('一直線', 'いっちょくせん')}・${rb('一周', 'いっしゅう')}`, rb('対頂角', 'たいちょうかく'),
    `${rb('三角形', 'さんかくけい')}の ${rb('内角', 'ないかく')}の${rb('和', 'わ')}`, 'スリッパ（<ruby>外角<rt>がいかく</rt></ruby>）',
    `${rb('平行線', 'へいこうせん')}`, `とくべつな ${rb('形', 'かたち')}`, `2${rb('手', 'て')}で とこう`, `3${rb('手', 'て')} チャレンジ`,
  ];
  const descs = [
    '180°・360° を つかう', `${rb('向', 'む')}かい${rb('合', 'あ')}う ${rb('角', 'かく')}は ${rb('等', 'ひと')}しい`,
    '3つ たすと 180°', `${rb('外', 'そと')}の ${rb('角', 'かく')}＝となりに ない 2つの ${rb('和', 'わ')}`,
    `${rb('同位角', 'どういかく')}・${rb('錯角', 'さっかく')}`, `${rb('二等辺三角形', 'にとうへんさんかくけい')}・${rb('正三角形', 'せいさんかくけい')}・${rb('正方形', 'せいほうけい')}`,
    'わざを 2つ つなぐ', 'わざを 3つ つなぐ',
  ];
  const at = LEVELS.findIndex((l) => l.type === 'free');
  LEVELS.splice(at < 0 ? LEVELS.length : at, 0, ...KD_STAGES.map((_, i) => ({
    id: `kd-${i + 1}`, type: 'kakudo', group: 'かくど パズル（4年〜）',
    groupHtml: `${rb('角度', 'かくど')} パズル（4${rb('年', 'ねん')}〜）`,
    title: `${String.fromCharCode(0x2460 + i)} ${titles[i]}`, desc: descs[i],
    make: () => UNITS.kakudo.questions({ stage: i }),
  })));
}
