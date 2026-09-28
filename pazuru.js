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
const PIECE_COLORS = ['#ff8a3d', '#4d96ff', '#3cb46e', '#e2553f', '#9b6bd6', '#f2c230'];

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
  questions() {
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
      say: `いたを えらんで、● の マスを おきたい ところに タップ`,
    }];
  },

  view(box, q, api) {
    const P = parsePuzzle(q.puzzle);
    const view = { selected: null, placed: {}, shapes: {} };
    P.pieces.forEach((p) => (view.shapes[p.id] = p.shape));
    const occupied = () => {
      const m = {};
      for (const [id, cells] of Object.entries(view.placed)) for (const k of cells) m[k] = Number(id);
      return m;
    };

    view.draw = () => {
      box.innerHTML = '';
      const r = box.getBoundingClientRect();
      const areaOnly = q.kind === 'area';
      const cell = Math.max(28, Math.min(64, (r.width - 40) / (P.cols + (areaOnly ? 1 : 5)), (r.height - 40) / (P.rows + 1)));
      const wrap = document.createElement('div');
      wrap.className = 'pz-wrap';
      wrap.style.setProperty('--c', `${cell}px`);
      // ばん
      const board = document.createElement('div');
      board.className = 'pz-board';
      board.style.gridTemplateColumns = `repeat(${P.cols}, var(--c))`;
      const occ = occupied();
      for (let rr = 0; rr < P.rows; rr++) {
        for (let cc = 0; cc < P.cols; cc++) {
          const key = `${rr},${cc}`;
          const d = document.createElement('button');
          const inMask = P.mask.includes(key);
          d.className = 'pz-cell' + (inMask ? '' : ' out');
          if (occ[key] !== undefined) {
            d.style.background = P.pieces[occ[key]].color;
            d.classList.add('filled');
          }
          if (inMask && !areaOnly) d.addEventListener('click', () => tapBoard(rr, cc));
          board.appendChild(d);
        }
      }
      wrap.appendChild(board);
      // いたの おきば
      if (!areaOnly) {
        const tray = document.createElement('div');
        tray.className = 'pz-tray';
        for (const p of P.pieces) {
          if (view.placed[p.id]) continue;
          const shape = view.shapes[p.id];
          const h = Math.max(...shape.map((c) => c[0])) + 1;
          const w = Math.max(...shape.map((c) => c[1])) + 1;
          const pc = document.createElement('button');
          pc.className = 'pz-piece' + (view.selected === p.id ? ' selected' : '');
          pc.style.gridTemplateColumns = `repeat(${w}, calc(var(--c) * .55))`;
          for (let rr = 0; rr < h; rr++) {
            for (let cc = 0; cc < w; cc++) {
              const s = document.createElement('span');
              const k = shape.findIndex((c) => c[0] === rr && c[1] === cc);
              if (k >= 0) {
                s.style.background = p.color;
                if (k === 0) s.className = 'anchor'; // ここを タップした マスに おく
              } else s.className = 'empty';
              pc.appendChild(s);
            }
          }
          pc.addEventListener('click', () => {
            view.selected = view.selected === p.id ? null : p.id;
            api.tick();
            view.draw();
          });
          tray.appendChild(pc);
        }
        const tools = document.createElement('div');
        tools.className = 'pz-tools';
        tools.innerHTML = '<button class="small-btn" data-t="rot">🔄 まわす</button><button class="small-btn" data-t="flip">↔ うらがえす</button>';
        tools.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
          if (view.selected === null) return api.say('さきに いたを えらんでね', true);
          view.shapes[view.selected] = b.dataset.t === 'rot' ? rotateCells(view.shapes[view.selected]) : flipCells(view.shapes[view.selected]);
          api.tick();
          view.draw();
        }));
        tray.appendChild(tools);
        wrap.appendChild(tray);
      }
      box.appendChild(wrap);
    };

    function tapBoard(r, c) {
      if (api.locked()) return;
      const occ = occupied();
      const key = `${r},${c}`;
      // おいてある いたを タップ → もどす
      if (view.selected === null) {
        if (occ[key] !== undefined) {
          delete view.placed[occ[key]];
          api.tick();
          view.draw();
        }
        return;
      }
      const shape = view.shapes[view.selected];
      const [ar, ac] = shape[0];
      const cells = shape.map(([sr, sc]) => `${r + sr - ar},${c + sc - ac}`);
      const fits = cells.every((k) => P.mask.includes(k) && occ[k] === undefined);
      if (!fits) {
        api.say('そこには はいらないよ。まわしたり うらがえしたり してみよう', true);
        return;
      }
      view.placed[view.selected] = cells;
      view.selected = null;
      api.tick();
      view.draw();
      if (Object.keys(view.placed).length === P.pieces.length) api.correct('ぴったり！');
    }

    view.layout = () => view.draw();
    return view;
  },
};
