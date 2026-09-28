// じゅけんの どだい（2年）⑧「立方体のてんかい図」：くみたてると 立方体に なる？ むかいあう 面は？
// SAPIX 2年「立方体のてんかい図」の テーマに あわせた オリジナルの もんだい。
// てんかい図は まいかい ランダムに つくり、おりたたんだ ときの 面の むきを けいさんして はんていする。

const NET_COLORS = [
  { name: rb('赤', 'あか'), color: '#e2553f' },
  { name: rb('青', 'あお'), color: '#4d96ff' },
  { name: rb('黄色', 'きいろ'), color: '#f2c230' },
  { name: rb('緑', 'みどり'), color: '#3cb46e' },
  { name: rb('茶色', 'ちゃいろ'), color: '#9a6a3a' },
  { name: 'むらさき', color: '#9b6bd6' },
];

// 6この マスが つながった かたちを ランダムに つくる
function randomHexomino() {
  const cells = [[0, 0]];
  const has = (x, y) => cells.some((c) => c[0] === x && c[1] === y);
  while (cells.length < 6) {
    const [x, y] = cells[rand(0, cells.length - 1)];
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(0, 3)];
    if (!has(x + dx, y + dy)) cells.push([x + dx, y + dy]);
  }
  const x0 = Math.min(...cells.map((c) => c[0]));
  const y0 = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - x0, y - y0]);
}

// おりたたむ：1まい目を そこに して、となりの 面を じゅんに 90° おる。
// 面ごとに n（そとむき）、u（マスの みぎ）、w（マスの した）の むきを もつ
function foldNet(cells) {
  const key = (c) => `${c[0]},${c[1]}`;
  const neg = (v) => v.map((x) => -x);
  const frames = { [key(cells[0])]: { n: [0, 0, -1], u: [1, 0, 0], w: [0, -1, 0] } };
  const parent = {};
  const queue = [cells[0]];
  while (queue.length) {
    const c = queue.shift();
    const f = frames[key(c)];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nb = [c[0] + dx, c[1] + dy];
      const k = key(nb);
      if (!cells.some((x) => key(x) === k) || frames[k]) continue;
      let fr;
      if (dx === 1) fr = { n: f.u, u: neg(f.n), w: f.w };
      else if (dx === -1) fr = { n: neg(f.u), u: f.n, w: f.w };
      else if (dy === 1) fr = { n: f.w, w: neg(f.n), u: f.u };
      else fr = { n: neg(f.w), w: f.n, u: f.u };
      frames[k] = fr;
      parent[k] = { from: key(c), dx, dy };
      queue.push(nb);
    }
  }
  const normals = cells.map((c) => frames[key(c)].n.join(','));
  const valid = new Set(normals).size === 6;
  return { valid, normals, parent };
}

function netQuestion(wantValid) {
  for (;;) {
    const cells = randomHexomino();
    if (foldNet(cells).valid === wantValid) return cells;
  }
}

// サイコロ：むかいあう 面の たしざんが 7 に なるように 1〜6 を おく
function diceNumbers(cells) {
  const { normals } = foldNet(cells);
  const nums = Array(6).fill(0);
  const pairs = shuffle([[1, 6], [2, 5], [3, 4]]);
  let k = 0;
  normals.forEach((n, i) => {
    if (nums[i]) return;
    const j = normals.findIndex((m) => m === n.split(',').map((x) => String(-Number(x))).join(','));
    const [x, y] = Math.random() < 0.5 ? pairs[k] : [...pairs[k]].reverse();
    nums[i] = x;
    nums[j] = y;
    k++;
  });
  return nums;
}

UNITS.tenkai = {
  questions(opts = {}) {
    if (opts.hard) {
      // チャレンジ：サイコロの てんかい図（むかいあう 面の 和は 7）
      const qs = [];
      for (const v of shuffle([true, false, false])) {
        qs.push({ kind: 'isNet', cells: netQuestion(v), valid: v, label: `${rb('立方体', 'りっぽうたい')}に なる？` });
      }
      for (let i = 0; i < 3; i++) {
        const cells = netQuestion(true);
        qs.push({ kind: 'dice', cells, nums: diceNumbers(cells), hide: rand(0, 5), label: 'サイコロの ？' });
      }
      for (let i = 0; i < 2; i++) {
        const cells = netQuestion(true);
        qs.push({ kind: 'opposite', cells, colors: shuffle([...NET_COLORS.keys()]), mark: rand(0, 5), label: `むかいあう ${rb('面', 'めん')}` });
      }
      return shuffle(qs);
    }
    const qs = [];
    for (const v of shuffle([true, true, false, false])) {
      qs.push({ kind: 'isNet', cells: netQuestion(v), valid: v, label: `${rb('立方体', 'りっぽうたい')}に なる？` });
    }
    for (let i = 0; i < 4; i++) {
      const cells = netQuestion(true);
      const colors = shuffle([...NET_COLORS.keys()]);
      qs.push({ kind: 'opposite', cells, colors, mark: rand(0, 5), label: `むかいあう ${rb('面', 'めん')}` });
    }
    return shuffle(qs);
  },

  steps(q) {
    const 面 = rb('面', 'めん');
    if (q.kind === 'dice') {
      return [{
        kind: 'answer', expected: q.nums[q.hide], waitNext: true,
        prompt: `サイコロは むかいあう ${面}の ${rb('数', 'かず')}を たすと <b>7</b>。？に ${rb('入', 'はい')}る ${rb('数', 'かず')}は？`,
        say: `？と むかいあう ${面}を さがそう`,
      }];
    }
    if (q.kind === 'isNet') {
      return [{
        waitNext: true,
        kind: 'choice', options: ['⭕ なる', '✖ ならない'], answer: q.valid ? 0 : 1,
        prompt: `この ${rb('展開図', 'てんかいず')}を ${rb('組', 'く')}み${rb('立', 'た')}てると、${rb('立方体', 'りっぽうたい')}に なる？`,
        say: `あたまの なかで おって みよう。${rb('答', 'こた')}えたら ${rb('組', 'く')}み${rb('立', 'た')}てて みせるよ`,
        explain: q.valid ? `なるよ！ 6つの ${面}が ぜんぶ ちがう ところに くる` : `ならない。かさなる ${面}が できて、あく ${面}が できる`,
      }];
    }
    const { normals } = foldNet(q.cells);
    const opp = normals.findIndex((n) => n === normals[q.mark].split(',').map((x) => String(-Number(x))).join(','));
    const oppColor = q.colors[opp];
    const others = shuffle(q.colors.filter((c, i) => i !== q.mark && i !== opp)).slice(0, 3);
    const opts = shuffle([oppColor, ...others]);
    return [{
      kind: 'choice', waitNext: true,
      options: opts.map((ci) => ({ html: `<span class="color-dot" style="background:${NET_COLORS[ci].color}"></span>${NET_COLORS[ci].name}` })),
      answer: opts.indexOf(oppColor),
      prompt: `★の ${面}と むかいあう ${面}は ${rb('何色', 'なにいろ')}？`,
      say: `むかいあう ${面}は となりどうしには ならないよ`,
      explain: `${NET_COLORS[oppColor].name}！ ${rb('組', 'く')}み${rb('立', 'た')}てて たしかめよう`,
    }];
  },

  view(box, q) {
    const view = { three: null };
    const colors = q.kind === 'opposite' ? q.cells.map((_, i) => NET_COLORS[q.colors[i]].color)
      : q.kind === 'dice' ? q.cells.map(() => '#fbf7ef') : q.cells.map(() => '#ffd9a8');
    // 面に かく もじ：★ や サイコロの 数
    const labels = q.kind === 'opposite' ? q.cells.map((_, i) => (i === q.mark ? '★' : ''))
      : q.kind === 'dice' ? q.nums.map((n, i) => (i === q.hide ? '？' : String(n))) : q.cells.map(() => '');
    const { parent } = foldNet(q.cells);
    view.draw = () => {
      if (view.three || view.ready) return;
      box.innerHTML = '<div class="net-3d"></div>';
      const holder = box.firstChild;
      view.ready = import('./net3d.js')
        .then((m) => {
          if (!box.contains(holder)) return;
          view.three = m.createNetView(holder, { cells: q.cells, parent, colors, labels });
        })
        .catch(() => {
          // 3D が つかえない ときは ひらいた ずだけ
          box.innerHTML = netFlatHTML(q.cells, colors, labels);
        });
    };
    view.layout = () => {
      if (view.three) view.three.resize();
      else view.draw();
    };
    view.dispose = () => {
      if (view.three) view.three.dispose();
      view.three = null;
    };
    // ひらく／くみたてる ボタン
    view.showTools = () => {
      if (box.querySelector('.net-tools')) return;
      const tools = document.createElement('div');
      tools.className = 'net-tools';
      tools.innerHTML = '<button class="small-btn" data-t="0">📂 ひらく</button><button class="small-btn" data-t="1">📦 くみたてる</button>';
      tools.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => view.three && view.three.fold(Number(b.dataset.t), 1200)));
      box.appendChild(tools);
    };
    view.fold = async () => {
      await view.ready;
      if (view.three) await view.three.fold(1, 1800);
    };
    return view;
  },

  // こたえた あとに くみたてて みせる → ゆびで まわして たしかめる
  async after(view, step, ok) {
    await view.fold();
    if (!view.three) return;
    view.showTools();
    if (ok) unitApi.say(`ゆびで まわして たしかめよう。できたら「つぎへ」`);
  },
};

function netFlatHTML(cells, colors, labels) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  let html = `<div class="net-flat" style="grid-template-columns:repeat(${w}, 56px)">`;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = cells.findIndex((c) => c[0] === x && c[1] === y);
      html += i < 0 ? '<span></span>' : `<span class="net-face" style="background:${colors[i]}">${labels[i]}</span>`;
    }
  }
  return `${html}</div>`;
}
