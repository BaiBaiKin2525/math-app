// 問題の生成。レベルを足すときはここに追加する。

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
const LEVELS = [
  {
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
    title: '3けた', desc: '3けた + 3けた（356 + 278 など）',
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
