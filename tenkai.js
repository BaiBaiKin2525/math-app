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

UNITS.tenkai = {
  questions() {
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
    if (q.kind === 'isNet') {
      return [{
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
      kind: 'choice',
      options: opts.map((ci) => ({ html: `<span class="color-dot" style="background:${NET_COLORS[ci].color}"></span>${NET_COLORS[ci].name}` })),
      answer: opts.indexOf(oppColor),
      prompt: `★の ${面}と むかいあう ${面}は ${rb('何色', 'なにいろ')}？`,
      say: `むかいあう ${面}は となりどうしには ならないよ`,
      explain: `${NET_COLORS[oppColor].name}！ ${rb('組', 'く')}み${rb('立', 'た')}てて たしかめよう`,
    }];
  },

  view(box, q) {
    const view = { three: null };
    const colors = q.kind === 'opposite' ? q.cells.map((_, i) => NET_COLORS[q.colors[i]].color) : q.cells.map(() => '#ffd9a8');
    const marks = q.kind === 'opposite' ? [q.mark] : [];
    const { parent } = foldNet(q.cells);
    view.draw = () => {
      if (view.three || view.ready) return;
      box.innerHTML = '<div class="net-3d"></div>';
      const holder = box.firstChild;
      view.ready = import('./net3d.js')
        .then((m) => {
          if (!box.contains(holder)) return;
          view.three = m.createNetView(holder, { cells: q.cells, parent, colors, marks });
        })
        .catch(() => {
          // 3D が つかえない ときは ひらいた ずだけ
          box.innerHTML = netFlatHTML(q.cells, colors, marks);
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
    view.fold = async () => {
      await view.ready;
      if (view.three) await view.three.fold(1, 1800);
    };
    return view;
  },

  // こたえた あとに くみたてて みせる
  after(view) {
    return view.fold();
  },
};

function netFlatHTML(cells, colors, marks) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  let html = `<div class="net-flat" style="grid-template-columns:repeat(${w}, 56px)">`;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = cells.findIndex((c) => c[0] === x && c[1] === y);
      html += i < 0 ? '<span></span>' : `<span class="net-face" style="background:${colors[i]}">${marks.includes(i) ? '★' : ''}</span>`;
    }
  }
  return `${html}</div>`;
}
