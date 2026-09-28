// じゅけんの どだい（2年 前半）その1：タイルをはろう／数であそぼう／読んでみよう／どれだけのめるかな？
// SAPIX 2年「2〜7月」の テーマに あわせた オリジナルの もんだい。

// 3D の え（solid3d.js）を つかう ときの きょうつう：make(module, holder) で つくる
function mount3dView(box, make) {
  const view = { three: null, ready: null };
  view.draw = () => {
    if (view.ready) return;
    box.innerHTML = '<div class="net-3d"></div><div class="hint-3d">ゆびで まわして みよう</div>';
    const holder = box.firstChild;
    view.ready = import('./solid3d.js')
      .then((m) => {
        if (box.contains(holder)) view.three = make(m, holder);
      })
      .catch(() => {
        box.innerHTML = '<div class="room-msg">3D を よみこめませんでした</div>';
      });
  };
  view.layout = () => (view.three ? view.three.resize() : view.draw());
  view.dispose = () => {
    if (view.three) view.three.dispose();
    view.three = null;
  };
  return view;
}

// ---------- タイルをはろう ----------
// '#'＝タイル 1まい、a b c d＝はんぶんの タイル（さんかく）、'.'＝なし
const HALF_SHAPES = [
  ['a#b', '###'],
  ['ab', '##', 'cd'],
  ['.a#b.', 'a###b'],
  ['a##b', '####', 'c##d'],
  ['a#', '##', '#d'],
];

function randomPolyomino(n, w = 5, h = 4) {
  const cells = [[rand(0, h - 1), rand(0, w - 1)]];
  const has = (r, c) => cells.some((x) => x[0] === r && x[1] === c);
  while (cells.length < n) {
    const [r, c] = cells[rand(0, cells.length - 1)];
    const [dr, dc] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(0, 3)];
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < h && nc >= 0 && nc < w && !has(nr, nc)) cells.push([nr, nc]);
  }
  return Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => (has(r, c) ? '#' : '.')).join(''));
}

const tileArea = (rows) => rows.join('').replace(/\./g, '').split('').reduce((s, ch) => s + (ch === '#' ? 1 : 0.5), 0);

function shapeHTML(rows, cls = '') {
  const w = Math.max(...rows.map((r) => r.length));
  let html = `<div class="tl-shape ${cls}" style="grid-template-columns:repeat(${w}, var(--t))">`;
  for (const row of rows) for (const ch of row.padEnd(w, '.')) html += `<span class="tl-cell t-${ch === '.' ? 'n' : ch === '#' ? 'f' : ch}"></span>`;
  return `${html}</div>`;
}

UNITS.tile2 = {
  questions(opts = {}) {
    const qs = [];
    for (let i = 0; i < 3; i++) {
      const s = randomPolyomino(rand(opts.hard ? 9 : 5, opts.hard ? 13 : 9));
      qs.push({ kind: 'count', shape: s, label: `タイルは ${rb('何', 'なん')}まい？` });
    }
    for (const s of shuffle(HALF_SHAPES).slice(0, 3)) qs.push({ kind: 'count', shape: s, half: true, label: 'はんぶんの タイル' });
    for (let i = 0; i < 2; i++) {
      const n = rand(6, 9);
      const m = Math.random() < 0.3 ? n : n + (Math.random() < 0.5 ? 1 : -1);
      qs.push({ kind: 'compare', a: randomPolyomino(n), b: randomPolyomino(m), label: 'どちらが ひろい？' });
    }
    return shuffle(qs);
  },
  steps(q) {
    if (q.kind === 'compare') {
      const x = tileArea(q.a);
      const y = tileArea(q.b);
      return [{
        kind: 'choice', options: ['あ', 'い', `${rb('同', 'おな')}じ`], answer: x > y ? 0 : x < y ? 1 : 2,
        prompt: `あ と い、どちらが ${rb('広', 'ひろ')}い？ タイルの ${rb('数', 'かず')}で くらべよう`,
        explain: `あ は ${x}まい、い は ${y}まい`,
      }];
    }
    return [{
      kind: 'answer', expected: tileArea(q.shape), unit: 'まい',
      prompt: q.half ? `さんかくの タイルは 2つで 1まい。${rb('全部', 'ぜんぶ')}で タイル ${rb('何', 'なん')}まい ぶん？` : `この ${rb('形', 'かたち')}は タイル ${rb('何', 'なん')}まい？`,
    }];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      box.innerHTML = q.kind === 'compare'
        ? `<div class="tl-pair"><div class="tl-item"><b>あ</b>${shapeHTML(q.a)}</div><div class="tl-item"><b>い</b>${shapeHTML(q.b)}</div></div>`
        : `<div class="tl-pair">${shapeHTML(q.shape, 'big')}</div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- 数であそぼう ----------
function placeBlocksHTML(n) {
  const h = Math.floor(n / 100);
  const t = Math.floor(n / 10) % 10;
  const o = n % 10;
  const items = (cls, k) => Array.from({ length: k }, () => `<i class="pv-item ${cls} a"></i>`).join('');
  return `<div class="kz-blocks" style="--u:7px;--g:3px"><div>${items('plate', h)}</div><div>${items('bar', t)}</div><div>${items('unit', o)}</div></div>`;
}

function numberLineSVG(start, step, count, mark) {
  const W = 560;
  const x = (v) => 30 + ((v - start) / (step * count)) * (W - 60);
  let s = `<svg class="numline" viewBox="0 0 ${W} 110" width="100%"><line x1="20" y1="60" x2="${W - 10}" y2="60" class="nl-axis"/>`;
  for (let i = 0; i <= count; i++) {
    const v = start + i * step;
    const big = i % 5 === 0;
    s += `<line x1="${x(v)}" y1="${big ? 46 : 52}" x2="${x(v)}" y2="${big ? 74 : 68}" class="nl-tick"/>`;
    if (i === 0 || i === count) s += `<text x="${x(v)}" y="96" class="nl-num">${v}</text>`;
  }
  s += `<text x="${x(mark)}" y="30" class="nl-arrow">▼</text></svg>`;
  return s;
}

UNITS.kazu = {
  questions(opts = {}) {
    const big = opts.hard ? 9999 : 999;
    const qs = [];
    for (let i = 0; i < 2; i++) {
      const n = rand(1, 9) * 100 + rand(0, 9) * 10 + rand(0, 9);
      qs.push({ kind: 'place', n, label: `100・10・1 で ${n}` });
    }
    const r = rand(12, 98) * 10;
    qs.push({ kind: 'tens', n: r, label: `${r} は 10が ${rb('何', 'なん')}こ` });
    for (let i = 0; i < 2; i++) {
      const step = opts.hard ? [5, 20, 50][rand(0, 2)] : [1, 10][rand(0, 1)];
      const start = step === 1 ? rand(1, 9) * 10 : rand(1, 8) * 100;
      const mark = start + rand(1, 9) * step;
      qs.push({ kind: 'line', start, step, mark, label: `${rb('数直線', 'すうちょくせん')}` });
    }
    for (let i = 0; i < 2; i++) {
      const step = [2, 5, 10, 50, 100][rand(0, 4)] * (Math.random() < 0.3 ? -1 : 1);
      const a0 = rand(3, 8) * 100 + (Math.abs(step) < 10 ? rand(0, 9) * 10 : 0);
      const seq = Array.from({ length: 5 }, (_, k) => a0 + k * step);
      qs.push({ kind: 'seq', seq, hole: rand(2, 4), label: seq.join('、') });
    }
    for (let i = 0; i < 2; i++) {
      const a = rand(101, big);
      const d = String(a).split('');
      [d[1], d[2]] = [d[2], d[1]];
      let b = Number(d.join(''));
      if (b === a) b = a + 1;
      qs.push({ kind: 'cmp', a, b, label: `${a} と ${b}` });
    }
    return shuffle(qs);
  },
  steps(q) {
    const 何 = rb('何', 'なん');
    switch (q.kind) {
      case 'place': {
        const h = Math.floor(q.n / 100);
        const t = Math.floor(q.n / 10) % 10;
        const o = q.n % 10;
        return [{ kind: 'answer', expected: q.n, prompt: `100が ${h}こ、10が ${t}こ、1が ${o}こ。${rb('合', 'あ')}わせて いくつ？` }];
      }
      case 'tens':
        return [{ kind: 'answer', expected: q.n / 10, unit: 'こ', prompt: `<b>${q.n}</b> は 10を ${何}こ あつめた ${rb('数', 'かず')}？` }];
      case 'line':
        return [{ kind: 'answer', expected: q.mark, prompt: `▼の ところの ${rb('数', 'かず')}は？ 1めもりは <b>${q.step}</b>` }];
      case 'seq':
        return [{ kind: 'answer', expected: q.seq[q.hole], prompt: `きまりを ${rb('見', 'み')}つけて、□に ${rb('入', 'はい')}る ${rb('数', 'かず')}は？<br>${q.seq.map((v, i) => (i === q.hole ? '□' : v)).join('、')}` }];
      case 'cmp':
        return [{
          kind: 'choice', options: [`${q.a} ＞ ${q.b}`, `${q.a} ＜ ${q.b}`], answer: q.a > q.b ? 0 : 1,
          prompt: `どちらが ${rb('大', 'おお')}きい？ 「＞」の ひらいている ほうが ${rb('大', 'おお')}きいよ`,
        }];
    }
    return [];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      if (q.kind === 'place') box.innerHTML = placeBlocksHTML(q.n);
      else if (q.kind === 'line') box.innerHTML = numberLineSVG(q.start, q.step, 10, q.mark);
      else box.innerHTML = '';
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- 読んでみよう（文しょうだいを よむ） ----------
const YOMU = [
  // [しゅるい, ぶん(a,b,x), 正しい しき, こたえ]
  ['add', (a, b, x) => `${x}${rb('時', 'じ')}に こうえんへ いきました。${rb('赤', 'あか')}い ${rb('花', 'はな')}が ${a}${rb('本', 'ほん')}、${rb('白', 'しろ')}い ${rb('花', 'はな')}が ${b}${rb('本', 'ほん')} さいて いました。${rb('花', 'はな')}は あわせて ${rb('何本', 'なんぼん')}？`],
  ['sub', (a, b, x) => `${x}${rb('年', 'ねん')}${rb('生', 'せい')}の ${a}${rb('人', 'にん')}が あそんで いました。${b}${rb('人', 'にん')} ${rb('帰', 'かえ')}りました。のこりは ${rb('何人', 'なんにん')}？`],
  ['diff', (a, b) => `りんごが ${a}こ、みかんが ${b}こ あります。りんごは みかんより ${rb('何', 'なん')}こ ${rb('多', 'おお')}い？`],
  ['add', (a, b, x) => `バスに ${a}${rb('人', 'にん')} のって います。${x}ばんめの バスていで ${b}${rb('人', 'にん')} のって きました。${rb('何人', 'なんにん')}に なりましたか？`],
  ['back', (a, b) => `あめが ${rb('何', 'なん')}こか ありました。${b}こ ${rb('食', 'た')}べたので、のこりが ${a}こに なりました。はじめに ${rb('何', 'なん')}こ ありましたか？`],
  ['back2', (a, b) => `シールを ${rb('何', 'なん')}まいか もって いました。${b}まい もらったので、${a + b}まいに なりました。はじめに ${rb('何', 'なん')}まい？`],
];

UNITS.yomu = {
  questions() {
    return shuffle(YOMU.concat(YOMU.slice(0, 2))).slice(0, 8).map(([kind, text]) => {
      const a = rand(25, 68);
      const b = rand(8, a - 12);
      const x = rand(2, 5);
      return { kind, a, b, x, text: text(a, b, x), label: text(a, b, x).replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '').slice(0, 24) + '…' };
    });
  },
  steps(q) {
    const { a, b, x } = q;
    const right = { add: `${a} + ${b}`, sub: `${a} − ${b}`, diff: `${a} − ${b}`, back: `${a} + ${b}`, back2: `${a + b} − ${b}` }[q.kind];
    const wrong = { add: [`${a} − ${b}`, `${a} + ${x}`], sub: [`${a} + ${b}`, `${a} − ${x}`], diff: [`${a} + ${b}`, `${b} − ${a}`], back: [`${a} − ${b}`, `${b} − ${a}`], back2: [`${a + b} + ${b}`, `${a} − ${b}`] }[q.kind];
    const answer = { add: a + b, sub: a - b, diff: a - b, back: a + b, back2: a }[q.kind];
    return [
      {
        kind: 'choice', ...mix([right, ...wrong]),
        prompt: `${rb('式', 'しき')}は どれ？`, say: `だいじな ${rb('言葉', 'ことば')}を タップして しるしを つけよう`,
        hint: q.kind.startsWith('back') ? `はじめの ${rb('数', 'かず')}を もとめるよ。${rb('図', 'ず')}に かいて ${rb('考', 'かんが')}えよう` : 'もう いちど よく よもう',
      },
      { kind: 'answer', expected: answer, before: `${right} =`, prompt: `${rb('答', 'こた')}えは？` },
    ];
  },
  view(box, q) {
    const view = { marks: new Set() };
    view.draw = () => {
      box.innerHTML = '';
      const p = document.createElement('div');
      p.className = 'ym-text';
      // ことばを タップすると マーカー（よむ れんしゅう）
      p.innerHTML = q.text.split(/(、|。|？| )/).map((w, i) => (w.trim() && !/^[、。？]$/.test(w) ? `<span class="ym-w${view.marks.has(i) ? ' on' : ''}" data-i="${i}">${w}</span>` : w)).join('');
      p.querySelectorAll('.ym-w').forEach((s) => s.addEventListener('click', () => {
        const i = Number(s.dataset.i);
        if (view.marks.has(i)) view.marks.delete(i);
        else view.marks.add(i);
        view.draw();
      }));
      box.appendChild(p);
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- どれだけのめるかな？（かさ） ----------
function masuHTML(dl) {
  // 1L ますを 10 に くぎって、dL ぶん みずを いれる
  const n = Math.max(1, Math.ceil(dl / 10));
  let html = '<div class="ks-wrap">';
  for (let i = 0; i < n; i++) {
    const f = Math.min(10, dl - i * 10);
    html += `<div class="ks-masu"><div class="ks-water" style="height:${f * 10}%"></div>${'<i></i>'.repeat(9)}<span>1L</span></div>`;
  }
  return `${html}</div>`;
}

UNITS.kasa = {
  questions(opts = {}) {
    const qs = [];
    for (let i = 0; i < 2; i++) {
      const dl = rand(11, opts.hard ? 38 : 28);
      qs.push({ kind: 'read', dl, label: `${rb('水', 'みず')}の かさ` });
    }
    const l = rand(1, 4);
    const d = rand(1, 9);
    qs.push({ kind: 'toDL', l, d, label: `${l}L${d}dL = □dL` });
    const x = rand(12, 48);
    qs.push({ kind: 'toLDL', dl: x, label: `${x}dL = □L□dL` });
    const p = rand(4, 9);
    const r = rand(10 - p, 9);
    qs.push({ kind: 'add', p, r, label: `${p}dL + ${r}dL` });
    qs.push({ kind: 'ml', from: Math.random() < 0.5 ? 'L' : 'dL', label: 'mL' });
    const c1 = rand(1, 2) * 10 + rand(1, 8);
    const c2 = c1 + (Math.random() < 0.5 ? 1 : -1) * rand(1, 3);
    qs.push({ kind: 'cmp', a: c1, b: c2, label: 'どちらが おおい？' });
    return shuffle(qs);
  },
  steps(q) {
    const 何 = rb('何', 'なん');
    const LdL = (v) => (v % 10 ? `${Math.floor(v / 10)}L${v % 10}dL` : `${v / 10}L`);
    switch (q.kind) {
      case 'read':
        return [
          { kind: 'answer', expected: Math.floor(q.dl / 10), unit: 'L', prompt: `1L ますの 1めもりは 1dL。${rb('水', 'みず')}は ${何}L${何}dL？` },
          { kind: 'answer', expected: q.dl % 10, before: `${Math.floor(q.dl / 10)}L`, unit: 'dL', prompt: 'のこりは？' },
        ];
      case 'toDL':
        return [{ kind: 'answer', expected: q.l * 10 + q.d, before: `${q.l}L${q.d}dL =`, unit: 'dL', prompt: `1L は 10dL。${何}dL に なる？` }];
      case 'toLDL':
        return [
          { kind: 'answer', expected: Math.floor(q.dl / 10), before: `${q.dl}dL =`, unit: 'L', prompt: `10dL で 1L。${q.dl}dL は ${何}L${何}dL？` },
          { kind: 'answer', expected: q.dl % 10, before: `${q.dl}dL = ${Math.floor(q.dl / 10)}L`, unit: 'dL', prompt: 'のこりは？' },
        ];
      case 'add': {
        const t = q.p + q.r;
        return [
          { kind: 'answer', expected: Math.floor(t / 10), before: `${q.p}dL + ${q.r}dL =`, unit: 'L', prompt: `あわせると？ 10dL で 1L に なるよ` },
          { kind: 'answer', expected: t % 10, before: `${q.p}dL + ${q.r}dL = ${Math.floor(t / 10)}L`, unit: 'dL', prompt: 'のこりは？' },
        ];
      }
      case 'ml':
        return q.from === 'L'
          ? [{ kind: 'answer', expected: 1000, before: '1L =', unit: 'mL', prompt: `1L は ${何}mL？` }]
          : [{ kind: 'answer', expected: 100, before: '1dL =', unit: 'mL', prompt: `1dL は ${何}mL？（1L ＝ 1000mL、1L ＝ 10dL）` }];
      case 'cmp':
        return [{
          kind: 'choice', options: [LdL(q.a), `${q.b}dL`], answer: q.a > q.b ? 0 : 1,
          prompt: `どちらが ${rb('多', 'おお')}い？ ${rb('同', 'おな')}じ たんいに なおして くらべよう`,
          explain: `${LdL(q.a)} ＝ ${q.a}dL`,
        }];
    }
    return [];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      const dl = q.kind === 'read' ? q.dl : q.kind === 'toDL' ? q.l * 10 + q.d : q.kind === 'toLDL' ? q.dl : q.kind === 'add' ? q.p + q.r : 0;
      box.innerHTML = dl ? masuHTML(dl) : '';
    };
    view.layout = () => view.draw();
    return view;
  },
};
