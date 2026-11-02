// じゅけんの どだい（2年）⑤「パズルを作ろう！」：いたを しきつめる／タイルの まいすう
// SAPIX 2年「パズルを作ろう！」の テーマに あわせた オリジナルの もんだい。
// パズルは こたえの しきつめかた から つくって いるので、かならず とける。

// おなじ もじ＝1まいの いた、'.'＝ばんの そと
const PUZZLES = [
  ['AAB', 'ACB', 'CCB'],
  ['AABB', 'ACCB', 'DDCC'],
  ['AAAB', 'CDDB', 'CCDB'],
  ['AABBB', 'ACCDB', 'ECCDD'],
  ['ABBC', 'AABC', 'DDEC', 'DEEE'],
  ['.AA.', 'BAAC', 'BBCC', '.DD.'],
  ['AABCC', 'ABBBC', 'DDEFF', 'DEEEF'],
  ['AAAA', 'BCCD', 'BCCD', 'BBDD'],
];
// 2年 前半「パズルであそぼう」：いたが 2〜3まいの ちいさい パズル
const EASY_PUZZLES = [
  ['AB', 'AB'],
  ['AAB', 'ABB'],
  ['ABB', 'AAB'],
  ['AAA', 'BCC', 'BBC'],
  ['AAB', 'CAB', 'CCB'],
  ['AABB', 'AABB'],
];

// チャレンジ：いたが おおい・おおきい
const HARD_PUZZLES = [
  ['AABBB', 'ACCCB', 'DDDCE', 'DFFEE'],
  ['AAABB', 'ACCBB', 'DCCEE', 'DDDEF'],
  ['ABBBC', 'AADCC', 'EEDDC', 'EFFFF'],
  ['AABBB', 'ACCDB', 'ECCDD', 'EFFGD', 'EEFGG'],
];
const PIECE_COLORS = ['#ff8a3d', '#4d96ff', '#3cb46e', '#e2553f', '#9b6bd6', '#f2c230', '#2bb3b1', '#c96f9e'];

// ---------- へいめん パズル：4マス・5マスの いた（テトロミノ・ペントミノ）で かたちを うめる ----------
// かたちを えらんで、その ばで いたの しきつめかたを ランダムに つくる（かならず とける）
const TETROMINOES = { I: ['####'], O: ['##', '##'], T: ['###', '.#.'], L: ['###', '#..'], S: ['.##', '##.'] };
const PENTOMINOES = {
  F: ['.##', '##.', '.#.'], I: ['#####'], L: ['####', '#...'], N: ['##..', '.###'], P: ['##', '##', '#.'], T: ['###', '.#.', '.#.'],
  U: ['#.#', '###'], V: ['#..', '#..', '###'], W: ['#..', '##.', '.##'], X: ['.#.', '###', '.#.'], Y: ['####', '.#..'], Z: ['##.', '.#.', '.##'],
};
// stage：0＝4マスの いた、1＝5マスの いた 4〜5まい、2＝5マスの いた 6〜8まい
const HEIMEN_SHAPES = [
  [
    { name: 'ながしかく', rows: ['####', '####', '####'] },
    { name: 'ましかく', rows: ['####', '####', '####', '####'] },
    { name: 'ほそながい ながしかく', rows: ['######', '######'] },
    { name: 'かいだん', rows: ['##....', '####..', '######'] },
    { name: 'じゅうじ', rows: ['.##.', '####', '####', '.##.'] },
    { name: 'L の じ', rows: ['##..', '##..', '####', '####'] },
    { name: 'やま', rows: ['..##..', '.####.', '######'] },
    { name: 'T の じ', rows: ['######', '######', '..##..', '..##..'] },
  ],
  [
    { name: 'ながしかく', rows: ['#####', '#####', '#####', '#####'] },
    { name: 'ほそながい ながしかく', rows: ['##########', '##########'] },
    { name: 'ましかく', rows: ['#####', '#####', '#####', '#####', '#####'] },
    { name: 'おしろ', rows: ['#.#..', '####.', '#####', '#####', '##.##'] },
    { name: 'かいだん', rows: ['##....', '###...', '####..', '#####.', '######'] },
    { name: 'じゅうじ', rows: ['.###.', '#####', '#####', '#####', '.#.#.'] },
    { name: 'ふね', rows: ['...#....', '...##...', '...###..', '########', '.######.'] },
  ],
  [
    { name: 'ながしかく', rows: ['######', '######', '######', '######', '######'] },
    { name: 'ほそながい ながしかく', rows: ['##########', '##########', '##########'] },
    { name: 'ながしかく', rows: ['#######', '#######', '#######', '#######', '#######'] },
    { name: 'おおきな いえ', rows: ['...##...', '..####..', '.######.', '########', '.######.', '.##..##.'] },
    { name: 'かいだん', rows: ['##......', '#####...', '#######.', '########', '########'] },
    { name: 'ロケット', rows: ['..##..', '.####.', '.####.', '.####.', '.####.', '######', '######'] },
  ],
];

const pzRot = (cells) => normCells(cells.map(([r, c]) => [c, -r]));
function pzOrients(rows) {
  let cells = normCells(rows.flatMap((row, r) => [...row].map((ch, c) => (ch === '#' ? [r, c] : null)).filter(Boolean)));
  const seen = new Set();
  const out = [];
  for (let f = 0; f < 2; f++) {
    for (let k = 0; k < 4; k++) {
      const key = cells.join(' ');
      if (!seen.has(key)) { seen.add(key); out.push(cells); }
      cells = pzRot(cells);
    }
    cells = flipCells(cells);
  }
  return out;
}

// rows（'#'＝うめる マス）を いたで しきつめた こたえ（'A','B',… の rows）。maxUse：おなじ いたを つかえる かず
function tilePolyomino(rows, lib, maxUse) {
  const H = rows.length, W = rows[0].length;
  const grid = rows.map((row) => [...row].map((ch) => (ch === '#' ? '' : '.')));
  const types = Object.keys(lib).map((t) => ({ t, orients: pzOrients(lib[t]), used: 0 }));
  const size = types[0].orients[0].length;
  if ((rows.join('').split('#').length - 1) % size) return null;
  // あいている ところが いたの おおきさで わりきれない かたまりに わかれたら だめ
  const holesOk = () => {
    const seen = grid.map((row) => row.map(() => false));
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (grid[r][c] !== '' || seen[r][c]) continue;
      let n = 0;
      const st = [[r, c]];
      seen[r][c] = true;
      while (st.length) {
        const [y, x] = st.pop();
        n++;
        for (const [y2, x2] of [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]]) {
          if (y2 >= 0 && y2 < H && x2 >= 0 && x2 < W && !seen[y2][x2] && grid[y2][x2] === '') { seen[y2][x2] = true; st.push([y2, x2]); }
        }
      }
      if (n % size) return false;
    }
    return true;
  };
  let letter = 0, steps = 0;
  const go = () => {
    if (++steps > 20000) return false;
    let r0 = -1, c0 = -1;
    outer: for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (grid[r][c] === '') { r0 = r; c0 = c; break outer; }
    if (r0 < 0) return true;
    for (const ty of shuffle(types)) {
      if (ty.used >= maxUse) continue;
      for (const o of shuffle(ty.orients)) {
        // いちばん うえ・ひだりの マスを (r0, c0) に あわせる
        const dr = r0 - o[0][0], dc = c0 - o[0][1];
        const cells = o.map(([r, c]) => [r + dr, c + dc]);
        if (!cells.every(([r, c]) => r >= 0 && r < H && c >= 0 && c < W && grid[r][c] === '')) continue;
        const ch = String.fromCharCode(65 + letter++);
        cells.forEach(([r, c]) => (grid[r][c] = ch));
        ty.used++;
        if (holesOk() && go()) return true;
        ty.used--;
        letter--;
        cells.forEach(([r, c]) => (grid[r][c] = ''));
      }
    }
    return false;
  };
  for (let tries = 0; tries < 10; tries++) {
    steps = 0;
    if (go()) return grid.map((row) => row.join(''));
  }
  return null;
}

function heimenQuestions(stage) {
  const lib = stage === 0 ? TETROMINOES : PENTOMINOES;
  const out = [];
  for (const s of shuffle(HEIMEN_SHAPES[stage])) {
    if (out.length >= 5) break;
    const sol = tilePolyomino(s.rows, lib, stage === 0 ? 2 : 1);
    if (sol) out.push({ kind: 'puzzle', puzzle: sol, label: `「${s.name}」（${stage === 0 ? 4 : 5}マスの いた）` });
  }
  return out;
}

// マスを 0,0 から に そろえて、うえの だん・ひだりから じゅんに ならべる
function normCells(cells) {
  const r0 = Math.min(...cells.map((c) => c[0]));
  const c0 = Math.min(...cells.map((c) => c[1]));
  return cells.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
const rotateCells = (cells) => normCells(cells.map(([r, c]) => [c, -r]));
const flipCells = (cells) => normCells(cells.map(([r, c]) => [r, -c]));

function parsePuzzle(rows) {
  const mask = [];
  const byLetter = {};
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return;
    mask.push(`${r},${c}`);
    (byLetter[ch] = byLetter[ch] || []).push([r, c]);
  }));
  const pieces = Object.values(byLetter).map((cells, i) => {
    let shape = normCells(cells);
    for (let k = rand(0, 3); k > 0; k--) shape = rotateCells(shape); // ばらばらの むきで わたす
    return { id: i, shape, color: PIECE_COLORS[i % PIECE_COLORS.length] };
  });
  return { rows: rows.length, cols: rows[0].length, mask, pieces };
}

UNITS.pazuru = {
  questions(opts = {}) {
    if (opts.heimen !== undefined) return heimenQuestions(opts.heimen);
    if (opts.easy) {
      const qs = shuffle(EASY_PUZZLES).slice(0, 5).map((p) => ({ kind: 'puzzle', puzzle: p, label: `パズル（${p.length}×${p[0].length}）` }));
      qs.push({ kind: 'area', puzzle: EASY_PUZZLES[3], label: `タイルは ${rb('何', 'なん')}まい？` });
      return qs;
    }
    if (opts.hard) {
      const qs = shuffle(HARD_PUZZLES).map((p) => ({ kind: 'puzzle', puzzle: p, label: `パズル（${p.length}×${p[0].length}）` }));
      qs.push({ kind: 'area', puzzle: HARD_PUZZLES[3], label: `タイルは ${rb('何', 'なん')}まい？` });
      return qs;
    }
    const qs = shuffle(PUZZLES).slice(0, 5).map((p) => ({ kind: 'puzzle', puzzle: p, label: `パズル（${p.length}×${p[0].length}）` }));
    for (const p of shuffle(PUZZLES).slice(0, 2)) {
      qs.push({ kind: 'area', puzzle: p, label: `タイルは ${rb('何', 'なん')}まい？` });
    }
    return qs;
  },

  steps(q) {
    if (q.kind === 'area') {
      const n = q.puzzle.join('').replace(/\./g, '').length;
      return [{ kind: 'answer', expected: n, unit: 'まい', prompt: `この ${rb('形', 'かたち')}は ${rb('正方形', 'せいほうけい')}の タイル ${rb('何', 'なん')}まいで できている？` }];
    }
    return [{
      kind: 'puzzle',
      prompt: `いたを ぜんぶ つかって、${rb('形', 'かたち')}を ぴったり うめよう`,
      say: 'いたを ゆびで うごかして、ばんの うえで はなすと ぴたっと はまるよ。タップで まわす',
    }];
  },

  // いたは ゆびで じゆうに うごかせる。ばんの うえで はなすと マスに ぴたっと はまる（まちがった ばしょでも はまる）。
  // ぜんぶの いたが はまって、すきまも かさなりも はみだしも ない ときに せいかい（こたえの しきつめかた いがいでも よい）
  view(box, q, api) {
    const P = parsePuzzle(q.puzzle);
    const view = {};
    const maskSet = new Set(P.mask);
    // いた：shape（いまの むき）、at（はまっている マス {r, c}）、free（ばんの そとの いち。マスの たんい）
    const pieces = P.pieces.map((p) => ({ ...p, at: null, free: null }));
    let last = null;          // さいごに さわった いた（うらがえす ボタン よう）
    let geo = null;           // いまの おおきさ（cell、ばんの いち、トレイの いち）
    let done = false;

    const sizeOf = (shape) => [Math.max(...shape.map((c) => c[0])) + 1, Math.max(...shape.map((c) => c[1])) + 1];
    const cellsOf = (p) => (p.at ? p.shape.map(([r, c]) => [p.at.r + r, p.at.c + c]) : []);

    // ばんの マスごとに、なんまいの いたが のっているか
    function cover() {
      const m = new Map();
      for (const p of pieces) for (const [r, c] of cellsOf(p)) {
        const k = `${r},${c}`;
        m.set(k, (m.get(k) || 0) + 1);
      }
      return m;
    }
    const badCell = (k, m) => !maskSet.has(k) || m.get(k) > 1;

    // トレイ（ばんの よこ・した）に ならべる
    function layoutTray() {
      let x = 0, y = 0, rowH = 0;
      for (const p of pieces) {
        if (p.at || p.free) continue;
        const [h, w] = sizeOf(p.shape);
        if (x + w > geo.trayCols && x > 0) { x = 0; y += rowH + 0.6; rowH = 0; }
        p.free = { x: geo.trayX + x, y: geo.trayY + y };
        x += w + 0.6;
        rowH = Math.max(rowH, h);
      }
    }

    view.draw = () => {
      box.innerHTML = '';
      const cs = getComputedStyle(box);
      const W = (box.clientWidth || 600) - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
      const H = (box.clientHeight || 400) - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0);
      const areaOnly = q.kind === 'area';
      // いちばん おおきく できる マスの おおきさを さがす（ばんの よこ か した に いたを ならべる）
      const pack = (trayCols) => {
        let x = 0, y = 0, rowH = 0, maxW = 0;
        for (const p of pieces) {
          const [h, w] = sizeOf(p.shape);
          if (x + w > trayCols && x > 0) { x = 0; y += rowH + 0.6; rowH = 0; }
          x += w + 0.6;
          maxW = Math.max(maxW, x - 0.6);
          rowH = Math.max(rowH, h);
        }
        return { w: maxW, h: y + rowH };
      };
      let best = null;
      if (areaOnly) {
        const cell = Math.max(28, Math.min(64, (W - 30) / P.cols, (H - 30) / P.rows));
        best = { cell, wide: false, trayCols: 0 };
      } else {
        for (let cell = 72; cell >= 20 && !best; cell -= 2) {
          const cw = Math.floor((W - 20) / cell), ch = (H - 70) / cell; // したの ボタンの ぶんは あける
          for (const wide of [true, false]) {
            const trayCols = wide ? cw - P.cols - 1 : cw;
            if (trayCols < 3) continue;
            const t = pack(trayCols);
            const ok = wide ? Math.max(P.rows, t.h) <= ch : P.rows + 1 + t.h <= ch;
            if (ok && t.w <= trayCols) { best = { cell, wide, trayCols }; break; }
          }
        }
        best = best || { cell: 20, wide: false, trayCols: Math.floor((W - 20) / 20) };
      }
      const { cell, wide } = best;
      const bx = areaOnly ? (W - P.cols * cell) / 2 : 10;
      const by = areaOnly ? (H - P.rows * cell) / 2 : 10;
      geo = {
        cell, bx, by,
        trayX: wide ? P.cols + 1 : 0, trayY: wide ? 0 : P.rows + 1,
        trayCols: best.trayCols,
      };
      const stage = document.createElement('div');
      stage.className = 'pz-stage';
      stage.style.setProperty('--c', `${cell}px`);
      // ばん
      for (let r = 0; r < P.rows; r++) for (let c = 0; c < P.cols; c++) {
        if (!maskSet.has(`${r},${c}`)) continue;
        const d = document.createElement('div');
        d.className = 'pz-slot';
        d.style.left = `${bx + c * cell}px`;
        d.style.top = `${by + r * cell}px`;
        stage.appendChild(d);
      }
      if (!areaOnly) {
        layoutTray();
        const m = cover();
        for (const p of pieces) stage.appendChild(pieceEl(p, m));
        const tools = document.createElement('div');
        tools.className = 'pz-tools2';
        tools.innerHTML = '<button class="small-btn" data-t="flip">↔ うらがえす</button><button class="small-btn" data-t="reset">↩ ぜんぶ もどす</button>';
        tools.querySelector('[data-t=flip]').addEventListener('click', () => {
          if (!last) return api.say('さきに いたを さわってね', true);
          turn(last, flipCells);
        });
        tools.querySelector('[data-t=reset]').addEventListener('click', () => {
          if (api.locked()) return;
          pieces.forEach((p) => { p.at = null; p.free = null; });
          api.tick();
          view.draw();
        });
        stage.appendChild(tools);
      }
      box.appendChild(stage);
    };

    function pieceEl(p, m) {
      const { cell, bx, by } = geo;
      const el = document.createElement('div');
      el.className = 'pz-pc' + (p.at ? ' on' : '') + (last === p ? ' last' : '');
      const x = p.at ? bx + p.at.c * cell : bx + p.free.x * cell;
      const y = p.at ? by + p.at.r * cell : by + p.free.y * cell;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      for (const [r, c] of p.shape) {
        const s = document.createElement('span');
        const k = p.at ? `${p.at.r + r},${p.at.c + c}` : null;
        s.className = 'pz-sq' + (k && badCell(k, m) ? ' bad' : '');
        s.style.left = `${c * cell}px`;
        s.style.top = `${r * cell}px`;
        s.style.background = p.color;
        el.appendChild(s);
      }
      // ゆびで うごかす
      el.addEventListener('pointerdown', (e) => {
        if (api.locked()) return;
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch { /* ゆび いがい */ }
        last = p;
        const start = { x: e.clientX, y: e.clientY, left: x, top: y };
        let moved = false;
        el.classList.add('drag');
        // わくの そとへ いかない ように
        const [ph, pw] = sizeOf(p.shape);
        const lim = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const pos = (ev) => ({
          left: lim(start.left + ev.clientX - start.x, 0, (box.clientWidth || 600) - pw * geo.cell),
          top: lim(start.top + ev.clientY - start.y, 0, (box.clientHeight || 400) - ph * geo.cell),
        });
        const move = (ev) => {
          if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) moved = true;
          const q2 = pos(ev);
          el.style.left = `${q2.left}px`;
          el.style.top = `${q2.top}px`;
        };
        const up = (ev) => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
          if (!moved) return turn(p, rotateCells);        // タップ：まわす
          const q2 = pos(ev);
          drop(p, q2.left, q2.top);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      });
      return el;
    }

    // はなした ところ：いたが すこしでも ばんに かかれば、いちばん ちかい マスに はまる
    function drop(p, left, top) {
      const { cell, bx, by } = geo;
      const c = Math.round((left - bx) / cell), r = Math.round((top - by) / cell);
      const [h, w] = sizeOf(p.shape);
      const overlap = r < P.rows && c < P.cols && r + h > 0 && c + w > 0;
      if (overlap) {
        p.at = { r, c };
        p.free = null;
      } else {
        p.at = null;
        p.free = { x: (left - bx) / cell, y: (top - by) / cell };
      }
      api.tick();
      view.draw();
      check();
    }

    function turn(p, fn) {
      if (api.locked()) return;
      const [h0, w0] = sizeOf(p.shape);
      p.shape = fn(p.shape);
      const [h1, w1] = sizeOf(p.shape);
      // まんなかを なるべく おなじ ところに
      const dr = Math.round((h0 - h1) / 2), dc = Math.round((w0 - w1) / 2);
      if (p.at) p.at = { r: p.at.r + dr, c: p.at.c + dc };
      else if (p.free) p.free = { x: p.free.x + dc, y: p.free.y + dr };
      last = p;
      api.tick();
      view.draw();
      check();
    }

    function check() {
      if (done) return;
      if (!pieces.every((p) => p.at)) return;
      const m = cover();
      const bad = [...m.keys()].some((k) => badCell(k, m));
      const full = P.mask.every((k) => m.get(k) === 1);
      if (!bad && full) {
        done = true;
        api.correct('ぴったり！');
      } else {
        api.say(bad ? 'あかい ところが かさなったり はみだしたり しているよ。うごかして みよう' : 'まだ すきまが あるよ', true);
      }
    }

    view.layout = () => view.draw();
    return view;
  },
};
