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
    const t = r5(50, 75), bb = r5(40, 125 - t);
    const inner = 180 - t;
    const H = 175, base = 255;
    const P1 = [70, base];
    const T1 = kdAdd(P1, t, H / Math.sin((t * Math.PI) / 180));   // 上の 線との 交わり
    const T = kdAdd(P1, t, (H * 0.72) / Math.sin((t * Math.PI) / 180));
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

// ---------- ふえた わざ（中学受験の 定番の 形） ----------
Object.assign(KD.tech, {
  quad: { name: `${rb('四角形', 'しかくけい')}の ${rb('内角', 'ないかく')}の${rb('和', 'わ')}`, rule: `${rb('四角形', 'しかくけい')}の 4つの ${rb('角', 'かく')}を たすと 360°` },
  regular: { name: `${rb('正多角形', 'せいたかくけい')}`, rule: `${rb('正多角形', 'せいたかくけい')}の 1つの ${rb('角', 'かく')}は 180×（${rb('辺', 'へん')}の ${rb('数', 'かず')}−2）÷ ${rb('辺', 'へん')}の ${rb('数', 'かず')}（${rb('正五角形', 'せいごかくけい')} 108°・${rb('正六角形', 'せいろっかくけい')} 120°・${rb('正八角形', 'せいはっかくけい')} 135°）` },
  zigzag: { name: `くの${rb('字', 'じ')}（${rb('平行線', 'へいこうせん')}）`, rule: `${rb('平行線', 'へいこうせん')}の あいだで ${rb('折', 'お')}れた ${rb('角', 'かく')}は、${rb('上', 'うえ')}と ${rb('下', 'した')}の ${rb('角', 'かく')}の ${rb('和', 'わ')}` },
  boomerang: { name: 'ブーメラン', rule: `へこんだ ${rb('角', 'かく')}は、${rb('先', 'さき')}の 3つの ${rb('角', 'かく')}の ${rb('和', 'わ')}` },
  ribbon: { name: `ちょうちょ${rb('形', 'がた')}`, rule: `${rb('対頂角', 'たいちょうかく')}を はさむ 2つの ${rb('三角形', 'さんかくけい')}は、のこりの 2つの ${rb('角', 'かく')}の ${rb('和', 'わ')}が ${rb('等', 'ひと')}しい` },
  fold: { name: `${rb('折', 'お')}りかえし`, rule: `${rb('折', 'お')}りかえすと、${rb('折', 'お')}り${rb('目', 'め')}の ${rb('両側', 'りょうがわ')}の ${rb('角', 'かく')}は ${rb('等', 'ひと')}しい` },
  ruler: { name: `${rb('三角定規', 'さんかくじょうぎ')}`, rule: `${rb('三角定規', 'さんかくじょうぎ')}の ${rb('角', 'かく')}は 30°・60°・90° と 45°・45°・90°` },
});
Object.assign(KD_ICON, {
  quad: '<path d="M5 25l4-17 18 3-3 14z" /><path d="M9 21a4 4 0 0 0-3.5-2" class="a"/>',
  regular: '<path d="M16 4l11 8-4 14H9L5 12z" /><path d="M12 26a4 4 0 0 0-2.6-3.6" class="a"/>',
  zigzag: '<path d="M2 7h28M2 25h28M10 7l12 9-12 9" /><path d="M19 13.8a4 4 0 0 0 0 4.4" class="a"/>',
  boomerang: '<path d="M16 4L5 27l11-9 11 9z" /><path d="M13 20.4a4 4 0 0 0 6 0" class="a"/>',
  ribbon: '<path d="M5 6v20L27 6v20z" /><path d="M8 9a4 4 0 0 0 0 3M24 9a4 4 0 0 1 0 3" class="a"/>',
  fold: '<path d="M3 24h26M12 24L20 6M12 24L4 10" stroke-dasharray="0" /><path d="M16 24a4 4 0 0 0-2.2-3.6" class="a"/>',
  ruler: '<path d="M4 27h22L4 8z" /><path d="M4 22h5v5" class="a"/>',
});

// 2つの 線の むきを くらべて、反時計まわりで val に なる じゅんに ならべる
function kdA(v, p, q, val, state = 'hidden') {
  const sw = (kdAng(v, q) - kdAng(v, p) + 360) % 360;
  return Math.abs(sw - val) < 1.5 ? kdAngle(v, p, q, val, state) : kdAngle(v, q, p, val, state);
}
// 2本の 半直線（点 p から むき dp、点 q から むき dq）の 交わる 点
function kdCross(p, dp, q, dq) {
  const [ax, ay] = kdDir(dp), [bx, by] = kdDir(dq);
  const det = ax * -by - -bx * ay;
  if (Math.abs(det) < 1e-9) return null;
  const rx = q[0] - p[0], ry = q[1] - p[1];
  const t = (rx * -by - -bx * ry) / det;
  const s = (ax * ry - ay * rx) / det;
  return t > 0 && s > 0 ? [p[0] + ax * t, p[1] + ay * t] : null;
}
const kdPoly = (n, cx, cy, r, rot = 0) => [...Array(n)].map((_, i) => kdAdd([cx, cy], rot + 90 + (360 * i) / n, r));

Object.assign(KD_MAKE, {
  // 四角形の 内角の和：3つから のこりの 1つ
  quad() {
    for (;;) {
      const A = r5(55, 125), B = r5(55, 125), C = r5(55, 125), D = 360 - A - B - C;
      if (D < 55 || D > 140) continue;
      const P1 = [0, 0], P2 = [200, 0];
      const P3 = kdAdd(P2, 180 - B, rand(110, 190));
      const P4 = kdCross(P1, A, P3, 360 - B - C);
      if (!P4) continue;
      const pts = [P1, P2, P3, P4];
      // 短すぎる 辺が ない（角の ラベルが かさならない）
      if (pts.some((p, i) => Math.hypot(p[0] - pts[(i + 1) % 4][0], p[1] - pts[(i + 1) % 4][1]) < 90)) continue;
      const all = [kdA(P1, P2, P4, A), kdA(P2, P3, P1, B), kdA(P3, P4, P2, C), kdA(P4, P1, P3, D)];
      if (all.some((an) => Math.abs((kdAng(an.v, an.b) - kdAng(an.v, an.a) + 360) % 360 - an.val) > 1)) continue;
      const t = rand(0, 3);
      const angles = {}, ids = [];
      all.forEach((an, i) => {
        if (i === t) angles.x = { ...an, state: 'target' };
        else { angles[`g${i}`] = { ...an, state: 'given' }; ids.push(`g${i}`); }
      });
      return {
        segs: pts.map((p, i) => [p, pts[(i + 1) % 4]]), angles,
        route: [{ tech: 'quad', uses: ids, result: 'x', formula: `360 − ${ids.map((k) => angles[k].val).join(' − ')}` }],
      };
    }
  },
  // 正多角形の 1つの 角
  regular() {
    const n = pick([5, 6, 8]);
    const pts = kdPoly(n, 200, 150, 120);
    const i = rand(0, n - 1);
    const val = (180 * (n - 2)) / n;
    return {
      segs: pts.map((p, k) => [p, pts[(k + 1) % n]]), ticks: pts.map((p, k) => [p, pts[(k + 1) % n], 1]),
      angles: { x: kdA(pts[i], pts[(i + 1) % n], pts[(i + n - 1) % n], val, 'target') },
      route: [{ tech: 'regular', uses: [], result: 'x', formula: `180 × ${n - 2} ÷ ${n}` }],
    };
  },
  // くの字：平行線の あいだで 折れた 線。x ＝ a ＋ b
  zigzag() {
    const a = r5(25, 70), b = r5(25, 70);
    const top = 60, bot = 240;
    const P = [rand(70, 130), top];
    // 折れる 点 B：P から むき −a、Q から むき b（上むき）で とどく
    const by = top + (bot - top) * (Math.tan((a * Math.PI) / 180) / (Math.tan((a * Math.PI) / 180) + Math.tan((b * Math.PI) / 180)));
    const B = [P[0] + (by - top) / Math.tan((a * Math.PI) / 180), by];
    const Q = [B[0] - (bot - by) / Math.tan((b * Math.PI) / 180), bot];
    const R1 = [380, top], L1 = [20, top], R2 = [380, bot], L2 = [20, bot];
    return {
      segs: [[L1, R1], [L2, R2], [P, B], [B, Q]], par: [[L1, R1], [L2, R2]],
      angles: { g1: kdA(P, R1, B, a, 'given'), g2: kdA(Q, R2, B, b, 'given'), x: kdA(B, P, Q, a + b, 'target') },
      route: [{ tech: 'zigzag', uses: ['g1', 'g2'], result: 'x', formula: `${a} + ${b}` }],
    };
  },
  // ブーメラン：x ＝ t ＋ p ＋ q
  boomerang() {
    for (;;) {
      const A = r5(45, 75), B = r5(45, 75), t = 180 - A - B;
      const p = r5(15, A - 15), q = r5(15, B - 15);
      if (t + p + q > 165 || t < 30) continue;
      const { P1, P2, C: T } = kdTriangle(A, B, { maxH: 230 });
      const D = kdCross(P1, A - p, P2, 180 - (B - q));
      if (!D) continue;
      return {
        segs: [[T, P1], [T, P2], [P1, D], [P2, D]],
        angles: {
          gt: kdA(T, P1, P2, t, 'given'), gp: kdA(P1, D, T, p, 'given'), gq: kdA(P2, T, D, q, 'given'),
          x: kdA(D, P1, P2, t + p + q, 'target'),
        },
        route: [{ tech: 'boomerang', uses: ['gt', 'gp', 'gq'], result: 'x', formula: `${t} + ${p} + ${q}` }],
      };
    }
  },
  // ちょうちょ形：a ＋ b ＝ c ＋ x
  ribbon() {
    for (;;) {
      const v = r5(40, 90), s = 180 - v;
      const a = r5(30, s - 30), c = r5(30, s - 30);
      if (a === c) continue;
      const b = s - a, d = s - c;
      const X = [200, 150], th = r5(140, 170);
      const A = kdAdd(X, th, 130), B = kdAdd(X, th + v, (130 * Math.sin((a * Math.PI) / 180)) / Math.sin((b * Math.PI) / 180));
      const C = kdAdd(X, th + 180, 120), D = kdAdd(X, th + v + 180, (120 * Math.sin((c * Math.PI) / 180)) / Math.sin((d * Math.PI) / 180));
      const far = [A, B, C, D].some((p) => Math.hypot(p[0] - 200, p[1] - 150) > 260);
      if (far) continue;
      return {
        meta: { A, B, C, D, X, c },
        segs: [[A, B], [C, D], [A, C], [B, D]],
        angles: {
          ga: kdA(A, B, X, a, 'given'), gb: kdA(B, X, A, b, 'given'), gc: kdA(C, D, X, c, 'given'),
          x: kdA(D, X, C, d, 'target'),
        },
        route: [{ tech: 'ribbon', uses: ['ga', 'gb', 'gc'], result: 'x', formula: `${a} + ${b} − ${c}` }],
      };
    }
  },
  // 折りかえし：紙の 角を 折り目 OK で 折る。点線＝折る まえ、色つき＝折った ところ
  fold1() { return kdFold(false); },
  fold2() { return kdFold(true); },
  // 四角形 → 一直線（外の 角）
  quadLine() {
    const f = KD_MAKE.quad();
    const ids = Object.keys(f.angles).filter((k) => k !== 'x');
    const x = f.angles.x;
    // x の 頂点で、となりの 辺を のばす
    const v = x.v, a = x.a;
    const ext = kdAdd(v, kdAng(a, v), 80);
    f.segs.push([v, ext]);
    const y = { ...x, state: 'hidden' };
    const out = kdA(v, ext, x.b, 180 - x.val, 'target');
    f.angles = { ...Object.fromEntries(ids.map((k) => [k, f.angles[k]])), y, x: out };
    f.route = [
      { tech: 'quad', uses: ids, result: 'y', formula: f.route[0].formula },
      { tech: 'line', uses: ['y'], result: 'x', formula: `180 − ${x.val}` },
    ];
    return f;
  },
  // 正多角形 → 二等辺三角形（対角線）
  polyIso() {
    const n = pick([5, 6]);
    const pts = kdPoly(n, 200, 150, 125);
    const val = (180 * (n - 2)) / n;
    const [A, B, C] = [pts[0], pts[1], pts[2]];
    return {
      segs: [...pts.map((p, k) => [p, pts[(k + 1) % n]]), [A, C]], ticks: pts.map((p, k) => [p, pts[(k + 1) % n], 1]),
      angles: { y: kdA(B, C, A, val), x: kdA(A, B, C, (180 - val) / 2, 'target') },
      route: [
        { tech: 'regular', uses: [], result: 'y', formula: `180 × ${n - 2} ÷ ${n}` },
        { tech: 'isosceles', uses: ['y'], result: 'x', formula: `(180 − ${val}) ÷ 2` },
      ],
    };
  },
  // 三角定規 2まい → 三角形
  rulers() {
    const s = pick([30, 60]);
    const L = [40, 250], M = [250, 250], N = [40, 40];        // 45°の 三角定規（M が 45°）
    // 30°・60°の 三角定規（S2 が s°）。高さが 入る ように 底辺の 長さを きめる
    const b = Math.min(260, 220 / Math.tan((s * Math.PI) / 180));
    const S2 = [110, 250], R = [110 + b, 250];
    const T2 = [R[0], 250 - b * Math.tan((s * Math.PI) / 180)];
    const X = kdCross(M, 135, S2, s);
    return {
      segs: [[L, M], [M, N], [N, L], [S2, R], [R, T2], [T2, S2]], rights: [[L, M, N], [R, S2, T2]],
      angles: { y: kdA(M, X, S2, 45), z: kdA(S2, M, X, s), x: kdA(X, S2, M, 135 - s, 'target') },
      route: [
        { tech: 'ruler', uses: [], result: 'y', formula: '' },
        { tech: 'ruler', uses: [], result: 'z', formula: '' },
        { tech: 'triangle', uses: ['y', 'z'], result: 'x', formula: `180 − 45 − ${s}` },
      ],
    };
  },
  // AB＝BC＝CD（等しい 辺が つながる）：4手
  isoChain() {
    const a = pick([15, 20, 25]);
    const A = [0, 0], s = 100;
    const B = kdAdd(A, a, s);
    const C = [2 * s * Math.cos((a * Math.PI) / 180), 0];
    const D = kdAdd(A, a, s + 2 * s * Math.cos((2 * a * Math.PI) / 180));
    const E = [C[0] + 90, 0], Fp = kdAdd(D, a, 40);
    return {
      segs: [[A, E], [A, Fp], [B, C], [C, D]], ticks: [[A, B, 1], [B, C, 1], [C, D, 1]],
      angles: {
        g: kdA(A, C, B, a, 'given'), y1: kdA(C, B, A, a), y2: kdA(B, C, D, 2 * a), y3: kdA(D, C, B, 2 * a),
        x: kdA(C, E, D, 3 * a, 'target'),
      },
      route: [
        { tech: 'isosceles', uses: ['g'], result: 'y1', formula: '' },
        { tech: 'slipper', uses: ['g', 'y1'], result: 'y2', formula: `${a} + ${a}` },
        { tech: 'isosceles', uses: ['y2'], result: 'y3', formula: '' },
        { tech: 'slipper', uses: ['g', 'y3'], result: 'x', formula: `${a} + ${2 * a}` },
      ],
    };
  },
  // ちょうちょ形 → 一直線（外の 角から）
  ribbonLine() {
    const f = KD_MAKE.ribbon();
    const { C, D, X, c } = f.meta;
    const E = kdAdd(C, kdAng(D, C), 70);                      // D → C を のばす
    f.segs.push([C, E]);
    f.angles = { ga: f.angles.ga, gb: f.angles.gb, ge: kdA(C, E, X, 180 - c, 'given'), gc: { ...f.angles.gc, state: 'hidden' }, x: f.angles.x };
    f.route = [
      { tech: 'line', uses: ['ge'], result: 'gc', formula: `180 − ${180 - c}` },
      { ...f.route[0] },
    ];
    return f;
  },
});

function kdFold(two) {
  const a = r5(25, 60);
  const O = [150, 230], L = [20, 230];
  const t = 170;
  const K = kdAdd(O, a, t);                                   // 折り目の はし
  const R0b = [O[0] + t * Math.cos((a * Math.PI) / 180), O[1]];   // 折る まえの 紙の 角
  const F = kdAdd(O, 2 * a, t * Math.cos((a * Math.PI) / 180));     // その 角が 折って うつる ところ
  const fig = {
    segs: [[L, O], [O, K], [K, F], [O, F]], dashed: [[O, R0b], [R0b, K]], fills: [[O, K, F]],
    angles: { g: kdA(O, R0b, K, a, 'given'), y: kdA(O, K, F, a), x: kdA(O, F, L, 180 - 2 * a, 'target') },
    route: [
      { tech: 'fold', uses: ['g'], result: 'y', formula: '' },
      { tech: 'line', uses: ['g', 'y'], result: 'x', formula: `180 − ${a} − ${a}` },
    ],
  };
  if (!two) {
    fig.angles = { g: fig.angles.g, x: { ...fig.angles.y, state: 'target' } };
    fig.route = [{ tech: 'fold', uses: ['g'], result: 'x', formula: '' }];
  }
  return fig;
}

// ---------- 図を まわす・うらがえす（おなじ 形でも 見た目が かわる） ----------
function kdPlace(fig) {
  const pts = new Set();
  const add = (p) => p && pts.add(p);
  for (const s of [...fig.segs, ...(fig.dashed || []), ...(fig.par || [])]) { add(s[0]); add(s[1]); }
  for (const t of fig.ticks || []) { add(t[0]); add(t[1]); }
  for (const f of fig.fills || []) f.forEach(add);
  for (const r of fig.rights || []) r.forEach(add);
  for (const an of Object.values(fig.angles)) { add(an.v); add(an.a); add(an.b); }
  const rot = Math.random() < 0.35 ? 0 : (Math.random() * 2 - 1) * (fig.par ? 15 : 35);
  const mirror = Math.random() < 0.5;
  const c = Math.cos((rot * Math.PI) / 180), s = Math.sin((rot * Math.PI) / 180);
  for (const p of pts) {
    let [x, y] = p;
    if (mirror) x = -x;
    p[0] = x * c - y * s;
    p[1] = x * s + y * c;
  }
  if (mirror) for (const an of Object.values(fig.angles)) [an.a, an.b] = [an.b, an.a];
  // 線と 角の 頂点が おさまる ように 大きさと いちを あわせる
  const box = [];
  for (const sg of [...fig.segs, ...(fig.dashed || [])]) box.push(sg[0], sg[1]);
  for (const an of Object.values(fig.angles)) box.push(an.v);
  const xs = box.map((p) => p[0]), ys = box.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min(340 / Math.max(1, x1 - x0), 240 / Math.max(1, y1 - y0), 1.6);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (const p of pts) {
    p[0] = 200 + (p[0] - cx) * k;
    p[1] = 150 + (p[1] - cy) * k;
  }
  return fig;
}

// ---------- むずかしい 問題（入試レベル） ----------
KD.tech.diff = { name: `${rb('角', 'かく')}の ひき${rb('算', 'ざん')}`, rule: `${rb('大', 'おお')}きい ${rb('角', 'かく')}から ${rb('中', 'なか')}の ${rb('角', 'かく')}を ひくと、のこりの ${rb('角', 'かく')}` };
KD_ICON.diff = '<path d="M5 27h24M5 27L27 7M5 27L17 5" /><path d="M13 27a8 8 0 0 0-1.4-4.6" class="a"/><path d="M10 21.5a8 8 0 0 0-.6-3.3" />';

// 2本の 線の あいだの 角（0〜180）
function kdBetween(v, p, q) {
  const d = Math.abs(kdAng(v, p) - kdAng(v, q)) % 360;
  return d > 180 ? 360 - d : d;
}

Object.assign(KD_MAKE, {
  // 正方形の 中の 二等辺三角形（BE＝BC）・正三角形：∠EAD を もとめる
  squareIso() {
    const g = pick([20, 30, 40, 50, 60, 60, 70]);
    const eq = g === 60;
    const s = 200;
    const B = [0, 0], C = [s, 0], A = [0, -s], D = [s, -s];
    const E = kdAdd(B, g, s);
    const segs = [[A, B], [B, C], [C, D], [D, A], [B, E], [A, E]];
    if (eq) segs.push([C, E]);
    const ticks = [[A, B, 1], [B, C, 1], [C, D, 1], [D, A, 1], [B, E, 1]];
    if (eq) ticks.push([C, E, 1]);
    const angles = {
      b90: kdA(B, A, C, 90, 'given'), a90: kdA(A, B, D, 90, 'given'),
      ebc: kdA(B, E, C, g, eq ? 'hidden' : 'given'),
      abe: kdA(B, A, E, 90 - g), bae: kdA(A, B, E, (90 + g) / 2),
      x: kdA(A, E, D, (90 - g) / 2, 'target'),
    };
    const route = [
      { tech: 'diff', uses: ['b90', 'ebc'], result: 'abe', formula: `90 − ${g}` },
      { tech: 'isosceles', uses: ['abe'], result: 'bae', formula: `(180 − ${90 - g}) ÷ 2` },
      { tech: 'diff', uses: ['a90', 'bae'], result: 'x', formula: `90 − ${(90 + g) / 2}` },
    ];
    if (eq) route.unshift({ tech: 'equilateral', uses: [], result: 'ebc', formula: '' });
    return { segs, ticks, rights: [[B, A, C], [A, B, D]], angles, route };
  },
  // 正五角形の 中に 正三角形・正方形（BC＝CF の 二等辺三角形）
  pentaIn(long = false) {
    const sq = Math.random() < 0.4;
    const P = kdPoly(5, 0, 0, 150);
    const [A, B, C, D, E] = P;
    const s = Math.hypot(D[0] - C[0], D[1] - C[1]);
    const dCD = kdAng(C, D);
    const inner = sq ? 90 : 60;
    const F = kdAdd(C, dCD + inner, s);
    const segs = P.map((p, k) => [p, P[(k + 1) % 5]]);
    const ticks = P.map((p, k) => [p, P[(k + 1) % 5], 1]);
    if (sq) {
      const G = kdAdd(D, dCD + 90, s);
      segs.push([C, F], [F, G], [G, D]);
      ticks.push([C, F, 1], [F, G, 1], [G, D, 1]);
    } else {
      segs.push([C, F], [F, D]);
      ticks.push([C, F, 1], [F, D, 1]);
    }
    segs.push([B, F]);
    const bcf = 108 - inner, base = (180 - bcf) / 2;
    const angles = {
      bcd: kdA(C, B, D, 108), fcd: kdA(C, F, D, inner), bcf: kdA(C, B, F, bcf),
      cbf: kdA(B, C, F, base, long ? 'hidden' : 'target'),
    };
    const route = [
      { tech: 'regular', uses: [], result: 'bcd', formula: '180 × 3 ÷ 5' },
      { tech: sq ? 'square' : 'equilateral', uses: [], result: 'fcd', formula: '' },
      { tech: 'diff', uses: ['bcd', 'fcd'], result: 'bcf', formula: `108 − ${inner}` },
      { tech: 'isosceles', uses: ['bcf'], result: long ? 'cbf' : 'x', formula: `(180 − ${bcf}) ÷ 2` },
    ];
    if (long) {
      // さらに ∠ABF ＝ 108 − ∠CBF
      angles.abc = kdA(B, A, C, 108);
      angles.x = kdA(B, A, F, 108 - base, 'target');
      route.push({ tech: 'regular', uses: [], result: 'abc', formula: '180 × 3 ÷ 5' });
      route.push({ tech: 'diff', uses: ['abc', 'cbf'], result: 'x', formula: `108 − ${base}` });
    } else {
      angles.x = { ...angles.cbf, state: 'target' };
      delete angles.cbf;
    }
    void E;
    return { segs, ticks, rights: sq ? [[C, D, F]] : [], angles, route };
  },
  pentaInLong() { return KD_MAKE.pentaIn(true); },
  // 星形（五芒星）：4つの さきの 角から のこりの 1つ
  star(line = false) {
    for (let guard = 0; guard < 500; guard++) {
      // 円の 上の 5点。弧の 大きさ（20°きざみ）で さきの 角（弧の 半分）が きまる
      const arcs = [];
      let left = 360;
      for (let i = 0; i < 4; i++) { const a = rand(3, 6) * 20; arcs.push(a); left -= a; }
      if (left < 60 || left > 120) continue;
      arcs.push(left);
      const phi = [90];
      for (let i = 0; i < 4; i++) phi.push(phi[i] + arcs[i]);
      const V = phi.map((p) => kdAdd([0, 0], p, 150));
      const edges = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]];
      const tipVal = (i) => {
        const nb = edges.filter((e) => e.includes(i)).map((e) => (e[0] === i ? e[1] : e[0]));
        return { nb, val: Math.round(kdBetween(V[i], V[nb[0]], V[nb[1]])) };
      };
      const tips = V.map((_, i) => tipVal(i));
      if (tips.some((t) => t.val < 25 || t.val % 5)) continue;
      // ？ は V0。V0 から 出る 2本の 辺で、いちばん V0 に ちかい 交わりの 点 P・Q
      const inter = (p1, p2, p3, p4) => {
        const d1 = [p2[0] - p1[0], p2[1] - p1[1]], d2 = [p4[0] - p3[0], p4[1] - p3[1]];
        const den = d1[0] * d2[1] - d1[1] * d2[0];
        if (Math.abs(den) < 1e-9) return null;
        const t = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / den;
        const u = ((p3[0] - p1[0]) * d1[1] - (p3[1] - p1[1]) * d1[0]) / den;
        return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6 ? { t, p: [p1[0] + d1[0] * t, p1[1] + d1[1] * t] } : null;
      };
      const near = (j) => edges.filter((e) => !e.includes(0) && !e.includes(j)).map((e) => inter(V[0], V[j], V[e[0]], V[e[1]])).filter(Boolean).sort((a, b) => a.t - b.t)[0];
      const [j1, j2] = tips[0].nb;
      const P = near(j1), Q = near(j2);
      if (!P || !Q) continue;
      // P の 角（三角形 V0PQ の 中）
      const angP = Math.round(kdBetween(P.p, V[0], Q.p));
      const angQ = 180 - tips[0].val - angP;
      // どの 2つの さきの 角の 和か
      const others = [1, 2, 3, 4];
      const pairs = [];
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) pairs.push([others[a], others[b]]);
      const pp = pairs.find(([a, b]) => tips[a].val + tips[b].val === angP);
      const qq = pp && pairs.find(([a, b]) => !pp.includes(a) && !pp.includes(b) && tips[a].val + tips[b].val === angQ);
      if (!pp || !qq) continue;
      const angles = {};
      for (let i = 1; i <= 4; i++) angles[`t${i}`] = kdA(V[i], V[tips[i].nb[0]], V[tips[i].nb[1]], tips[i].val, 'given');
      angles.p = kdA(P.p, V[0], Q.p, angP);
      angles.q = kdA(Q.p, V[0], P.p, angQ);
      angles.x = kdA(V[0], V[j1], V[j2], tips[0].val, 'target');
      const route = [
        { tech: 'slipper', uses: pp.map((i) => `t${i}`), result: 'p', formula: `${tips[pp[0]].val} + ${tips[pp[1]].val}` },
        { tech: 'slipper', uses: qq.map((i) => `t${i}`), result: 'q', formula: `${tips[qq[0]].val} + ${tips[qq[1]].val}` },
        { tech: 'triangle', uses: ['p', 'q'], result: 'x', formula: `180 − ${angP} − ${angQ}` },
      ];
      const segs = edges.map(([a, b]) => [V[a], V[b]]);
      if (line) {
        // ひとつの さきの 角を、辺を のばした 外の 角で しめす
        const k = pp[0];
        const [n0, n1] = tips[k].nb;
        const ext = kdAdd(V[k], kdAng(V[n0], V[k]), 60);
        segs.push([V[k], ext]);
        angles[`e${k}`] = kdA(V[k], ext, V[n1], 180 - tips[k].val, 'given');
        angles[`t${k}`] = { ...angles[`t${k}`], state: 'hidden' };
        route.unshift({ tech: 'line', uses: [`e${k}`], result: `t${k}`, formula: `180 − ${180 - tips[k].val}` });
      }
      return { segs, angles, route };
    }
    return KD_MAKE.vertLineTri();
  },
  starLine() { return KD_MAKE.star(true); },
  // AB＝BC＝CD＝DE：6手
  isoChain5() {
    const a = pick([15, 20]);
    const s = 100, rad = (d) => (d * Math.PI) / 180;
    const A = [0, 0];
    const B = kdAdd(A, a, s);
    const C = [2 * s * Math.cos(rad(a)), 0];
    const D = kdAdd(A, a, s + 2 * s * Math.cos(rad(2 * a)));
    const E = [C[0] + 2 * s * Math.cos(rad(3 * a)), 0];
    const G = [E[0] + 60, 0], F = kdAdd(D, a, 50);
    return {
      segs: [[A, G], [A, F], [B, C], [C, D], [D, E]], ticks: [[A, B, 1], [B, C, 1], [C, D, 1], [D, E, 1]],
      angles: {
        g: kdA(A, C, B, a, 'given'), y1: kdA(C, B, A, a), y2: kdA(B, C, D, 2 * a), y3: kdA(D, C, B, 2 * a),
        y4: kdA(C, E, D, 3 * a), y5: kdA(E, D, C, 3 * a), x: kdA(D, F, E, 4 * a, 'target'),
      },
      route: [
        { tech: 'isosceles', uses: ['g'], result: 'y1', formula: '' },
        { tech: 'slipper', uses: ['g', 'y1'], result: 'y2', formula: `${a} + ${a}` },
        { tech: 'isosceles', uses: ['y2'], result: 'y3', formula: '' },
        { tech: 'slipper', uses: ['g', 'y3'], result: 'y4', formula: `${a} + ${2 * a}` },
        { tech: 'isosceles', uses: ['y4'], result: 'y5', formula: '' },
        { tech: 'slipper', uses: ['g', 'y5'], result: 'x', formula: `${a} + ${3 * a}` },
      ],
    };
  },
});

// ステージ：[もんだいの かたちの なかま, このステージの わざ（えらぶ ボタンに でる）]
// 8もん。なかまを じゅんばんに まぜて、おなじ かたちが つづかない ように する
const KD_STAGES = [
  [['line1', 'line2', 'round', 'vertical'], ['line', 'round', 'vertical', 'triangle']],
  [['triangle', 'quad', 'triangle', 'quad'], ['line', 'vertical', 'triangle', 'quad']],
  [['slipper', 'boomerang'], ['line', 'triangle', 'slipper', 'boomerang', 'quad']],
  [['parallelC', 'parallelA', 'zigzag'], ['line', 'vertical', 'corresponding', 'alternate', 'zigzag']],
  [['isosceles', 'equilateral', 'square', 'regular'], ['triangle', 'isosceles', 'equilateral', 'square', 'regular']],
  [['ribbon', 'fold1'], ['vertical', 'triangle', 'ribbon', 'fold', 'line']],
  [['triVertical', 'lineTri', 'altTri', 'isoTri', 'equiTri', 'squareTri', 'quadLine', 'polyIso', 'fold2', 'ribbonLine'], null],
  [['vertLineTri', 'lineIsoTri', 'corrLineTri', 'rulers'], null],
  [['isoChain', 'vertLineTri', 'isoChain', 'lineIsoTri', 'rulers', 'corrLineTri'], null],
  // むずかしい（式は 出ない。じぶんで 計算する）
  [['squareIso', 'pentaIn', 'star', 'isoChain', 'squareIso', 'pentaIn', 'star'], null, true],
  [['isoChain5', 'pentaInLong', 'starLine', 'squareIso', 'isoChain5', 'pentaInLong', 'starLine'], null, true],
];
KD_MAKE.parallelC = () => KD_MAKE.parallel('corresponding');
KD_MAKE.parallelA = () => KD_MAKE.parallel('alternate');
const KD_ALL = Object.keys(KD.tech);
UNITS.kakudo = {
  questions({ stage = 0 } = {}) {
    const [pool, techs, hard] = KD_STAGES[stage];
    // なかまを まぜた 列を くりかえして 8もん（となりに おなじ かたちが こない）
    const kinds = [];
    while (kinds.length < 8) {
      const round = shuffle(pool);
      if (kinds.length && round[0] === kinds[kinds.length - 1]) round.push(round.shift());
      kinds.push(...round);
    }
    return kinds.slice(0, 8).map((kind, i) => {
      const fig = kdPlace(KD_MAKE[kind]());
      return { kind, stage, hard: !!hard, techs: techs || KD_ALL, ...fig, label: `かくど ${stage + 1}-${i + 1}` };
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
        before: m.formula && !q.hard ? `${m.formula} =` : '',
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
    const baseR = (an) => (an.val < 40 ? 44 : an.val < 70 ? 34 : 28);
    // おなじ 頂点に 見える 角が いくつも ある ときは、大きい 角ほど 弧を 大きく（ラベルが かさならない）
    let rank = new Map();
    const radius = (an) => rank.get(an) || baseR(an);

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
      // 見えている 角を 頂点ごとに ならべて、小さい じゅんに 内がわから
      rank = new Map();
      const shown = Object.entries(q.angles).filter(([id, an]) => view.known.has(id) || an.state === 'target' || id === view.cur || view.selected.has(id)).map(([, an]) => an);
      // 頂点ごとに 小さい 角から じゅんに、まえの 弧より 26 そとがわへ
      const groups = new Map();
      for (const an of shown) {
        const key = `${Math.round(an.v[0])},${Math.round(an.v[1])}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(an);
      }
      for (const list of groups.values()) {
        list.sort((a, b) => a.val - b.val);
        let r = 0;
        for (const an of list) {
          r = r ? Math.max(baseR(an), r + 26) : baseR(an);
          rank.set(an, r);
        }
      }
      // 角の いろ（線の 下）
      for (const [id, an] of Object.entries(q.angles)) {
        const r = radius(an);
        const isKnown = view.known.has(id);
        const cls = id === view.cur ? 'cur' : view.selected.has(id) ? 'sel' : an.state === 'target' && !isKnown ? 'target' : isKnown ? (an.state === 'given' ? 'given' : 'found') : null;
        if (!cls) continue;
        html += `<path class="kd-wedge ${cls}" d="${arcPath(an, r, true)}"/><path class="kd-arc ${cls}" d="${arcPath(an, r, false)}"/>`;
      }
      // 折った ところの いろ
      for (const f of q.fills || []) html += `<path class="kd-fill" d="M${f.map((p) => p.join(' ')).join(' L')} Z"/>`;
      // 直角の しるし
      for (const [v, p, r] of q.rights || []) {
        const d1 = kdAng(v, p), d2 = kdAng(v, r);
        const a = kdAdd(v, d1, 13), c = kdAdd(a, d2, 13), b = kdAdd(v, d2, 13);
        html += `<path class="kd-right" d="M${a.join(' ')} L${c.join(' ')} L${b.join(' ')}"/>`;
      }
      // 線（点線は 折る まえの ところ）
      for (const [p, s] of q.dashed || []) html += `<line class="kd-seg dash" x1="${p[0]}" y1="${p[1]}" x2="${s[0]}" y2="${s[1]}"/>`;
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
        const d = kdAng(p, s);
        const m = [p[0] + (s[0] - p[0]) * 0.85, p[1] + (s[1] - p[1]) * 0.85];
        const tip = kdAdd(m, d, 4), l = kdAdd(m, d + 145, 9), r = kdAdd(m, d - 145, 9);
        html += `<path class="kd-par" d="M${l[0]} ${l[1]} L${tip[0]} ${tip[1]} L${r[0]} ${r[1]}"/>`;
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
    `${rb('一直線', 'いっちょくせん')}・${rb('一周', 'いっしゅう')}・${rb('対頂角', 'たいちょうかく')}`,
    `${rb('三角形', 'さんかくけい')}・${rb('四角形', 'しかくけい')}`, 'スリッパ・ブーメラン',
    `${rb('平行線', 'へいこうせん')}`, `とくべつな ${rb('形', 'かたち')}`, `ちょうちょ${rb('形', 'がた')}・${rb('折', 'お')}りかえし`,
    `2${rb('手', 'て')}で とこう`, `3${rb('手', 'て')}で とこう`, `4${rb('手', 'て')} チャレンジ`,
    `むずかしい ${rb('問題', 'もんだい')}`, `${rb('入試', 'にゅうし')}レベル`,
  ];
  const descs = [
    `180°・360°・${rb('向', 'む')}かい${rb('合', 'あ')}う ${rb('角', 'かく')}`,
    `${rb('内角', 'ないかく')}の ${rb('和', 'わ')}は 180°・360°`, `${rb('外角', 'がいかく')}・へこんだ ${rb('角', 'かく')}`,
    `${rb('同位角', 'どういかく')}・${rb('錯角', 'さっかく')}・くの${rb('字', 'じ')}`, `${rb('二等辺三角形', 'にとうへんさんかくけい')}・${rb('正三角形', 'せいさんかくけい')}・${rb('正方形', 'せいほうけい')}・${rb('正多角形', 'せいたかくけい')}`,
    `${rb('対頂角', 'たいちょうかく')}の ${rb('利用', 'りよう')}・${rb('折', 'お')}り${rb('目', 'め')}`,
    'わざを 2つ つなぐ', 'わざを 3つ つなぐ（三角定規も）', 'AB＝BC＝CD など',
    `${rb('星形', 'ほしがた')}・${rb('正五角形', 'せいごかくけい')}と ${rb('正三角形', 'せいさんかくけい')}・${rb('正方形', 'せいほうけい')}の ${rb('中', 'なか')}（${rb('式', 'しき')}なし）`,
    `5〜6${rb('手', 'て')}・AB＝BC＝CD＝DE（${rb('式', 'しき')}なし）`,
  ];
  const at = LEVELS.findIndex((l) => l.type === 'free');
  LEVELS.splice(at < 0 ? LEVELS.length : at, 0, ...KD_STAGES.map((_, i) => ({
    id: `kd-${i + 1}`, type: 'kakudo', group: 'かくど パズル（4年〜）',
    groupHtml: `${rb('角度', 'かくど')} パズル（4${rb('年', 'ねん')}〜）`,
    title: `${String.fromCharCode(0x2460 + i)} ${titles[i]}`, desc: descs[i],
    make: () => UNITS.kakudo.questions({ stage: i }),
  })));
}
