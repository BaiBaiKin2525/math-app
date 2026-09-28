// じゅけんの どだい（2年）①「九九をさがそう」：九九の ひょうから きまりを 見つける。
// SAPIX 2年「九九をさがそう」の テーマに あわせた オリジナルの もんだい。

// こたえが n に なる 九九（["2x6", "3x4", ...]）
function kukuPairs(n) {
  const out = [];
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (a * b === n) out.push(`${a}x${b}`);
  return out;
}

// チャレンジ：だんの 数を かくす、3つの だんの たしざん、一の くらいが 0 の 答え
function kukuHardQuestions() {
  const qs = [];
  for (const n of shuffle([12, 18, 24]).slice(0, 2)) qs.push({ kind: 'find', n, label: `${rb('答', 'こた')}えが ${n}` });
  for (const d of shuffle([3, 4, 6, 7, 8, 9]).slice(0, 2)) qs.push({ kind: 'whichrow', d, label: `${rb('何', 'なん')}の だん？` });
  // たすと 9 いかに なる 3つの だん
  const [a, b, c] = [[1, 2, 3], [1, 2, 4], [1, 2, 5], [1, 2, 6], [1, 3, 4], [1, 3, 5], [2, 3, 4]][rand(0, 6)];
  qs.push({ kind: 'dansum3', a, b, c, label: `${a}・${b}・${c}の だん` });
  qs.push({ kind: 'ones0', label: `一の${rb('位', 'くらい')}が 0` });
  qs.push({ kind: 'count', n: 36, label: `${rb('答', 'こた')}えが 36 の ${rb('九九', 'くく')}` });
  const cells = [];
  while (cells.length < 5) {
    const x = `${rand(3, 9)}x${rand(3, 9)}`;
    if (!cells.includes(x)) cells.push(x);
  }
  qs.push({ kind: 'fill', cells, label: 'あなうめ（5こ）' });
  qs.push({ kind: 'swap', a: 8, b: rand(3, 7), label: `${rb('入', 'い')}れかえ` });
  return shuffle(qs);
}

function kukuQuestions() {
  const qs = [];
  for (const n of shuffle([6, 8, 12, 16, 18, 24]).slice(0, 3)) {
    qs.push({ kind: 'find', n, label: `${rb('答', 'こた')}えが ${n}` });
  }
  for (let i = 0; i < 2; i++) {
    const cells = [];
    while (cells.length < 3) {
      const c = `${rand(2, 9)}x${rand(2, 9)}`;
      if (!cells.includes(c)) cells.push(c);
    }
    qs.push({ kind: 'fill', cells, label: 'あなうめ' });
  }
  for (let i = 0; i < 2; i++) {
    let a;
    let b;
    do {
      a = rand(2, 9);
      b = rand(2, 9);
    } while (a === b);
    qs.push({ kind: 'swap', a, b, label: `${a}×${b} の ${rb('入', 'い')}れかえ` });
  }
  const d = rand(2, 9);
  qs.push({ kind: 'step', d, label: `${d}の だんの ふえ${rb('方', 'かた')}` });
  const x = rand(2, 5);
  const y = rand(2, 9 - x);
  qs.push({ kind: 'dansum', a: x, b: y, label: `${x}の だん と ${y}の だん` });
  const n = [12, 16, 18, 24, 36][rand(0, 4)];
  qs.push({ kind: 'count', n, label: `${rb('答', 'こた')}えが ${n} の ${rb('九九', 'くく')}` });
  return shuffle(qs);
}

function kukuSteps(q) {
  const 答 = rb('答', 'こた');
  switch (q.kind) {
    case 'whichrow':
      return [{
        kind: 'answer', expected: q.d, rows: [q.d], hideHeads: true,
        prompt: `たての ${rb('数', 'かず')}が かくれて いるよ。ひかっている だんは ${rb('何', 'なん')}の だん？`,
      }];
    case 'dansum3':
      return [{
        kind: 'answer', expected: q.a + q.b + q.c, rows: [q.a, q.b, q.c],
        prompt: `<b>${q.a}の だん</b>・<b>${q.b}の だん</b>・<b>${q.c}の だん</b>を たてに たすと、${rb('何', 'なん')}の だん？`,
      }];
    case 'ones0': {
      const list = [];
      for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if ((a * b) % 10 === 0) list.push(`${a}x${b}`);
      return [{
        kind: 'answer', expected: list.length, markable: true, reveal: list,
        prompt: `${答}えの 一の${rb('位', 'くらい')}が <b>0</b> に なる ${rb('九九', 'くく')}は ${rb('何', 'なん')}こ？<small>（${rb('表', 'ひょう')}に しるしを つけて かぞえよう）</small>`,
      }];
    }
    case 'find':
      return [{ kind: 'find', targets: kukuPairs(q.n), prompt: `${答}えが <b>${q.n}</b> に なる ところを ぜんぶ ${rb('見', 'み')}つけよう` }];
    case 'swap':
      return [{
        kind: 'find', targets: [`${q.b}x${q.a}`], mark: [`${q.a}x${q.b}`],
        prompt: `<b>${q.a}×${q.b}</b> の ${rb('数', 'かず')}を ${rb('入', 'い')}れかえた ところは どこ？ ${答}えは ${rb('同', 'おな')}じ かな？`,
      }];
    case 'fill':
      return q.cells.map((c, i) => {
        const [a, b] = c.split('x').map(Number);
        return {
          kind: 'answer', expected: a * b, cell: c, hidden: q.cells.slice(i),
          prompt: `ひかっている ？に ${rb('入', 'はい')}る ${rb('数', 'かず')}は？`,
        };
      });
    case 'step':
      return [
        { kind: 'answer', expected: q.d, rows: [q.d], prompt: `<b>${q.d}の だん</b>は いくつずつ ふえる？` },
        { kind: 'answer', expected: q.d * 10, rows: [q.d], prompt: `${rb('表', 'ひょう')}の つづき：<b>${q.d}×10</b> は？` },
      ];
    case 'dansum':
      return [{
        kind: 'answer', expected: q.a + q.b, rows: [q.a, q.b],
        prompt: `<b>${q.a}の だん</b>と <b>${q.b}の だん</b>を たてに たすと、${rb('何', 'なん')}の だんに なる？`,
      }];
    case 'count':
      return [{
        kind: 'answer', expected: kukuPairs(q.n).length, markable: true, reveal: kukuPairs(q.n),
        prompt: `${答}えが <b>${q.n}</b> に なる ${rb('九九', 'くく')}は ${rb('何', 'なん')}こ ある？<small>（${rb('表', 'ひょう')}を タップして しるしを つけても いいよ）</small>`,
      }];
  }
  return [];
}

// 九九の ひょう（たて＝かけられる数、よこ＝かける数）
function createKukuTable(box, { onTap }) {
  const view = {
    mode: 'none',        // find：さがす／mark：しるしを つける／none
    found: new Set(),
    marked: new Set(),
    mark: [],            // オレンジで しめす マス
    hidden: [],          // ？に する マス
    active: null,        // いま こたえる マス
    rows: [],            // ひからせる だん
    reveal: [],          // こたえを みせる ときに ひからせる マス
  };

  view.draw = () => {
    box.innerHTML = '';
    const r = box.getBoundingClientRect();
    const cell = Math.max(24, Math.min(58, (r.width - 30) / 10.3, (r.height - 30) / 10.3));
    const t = document.createElement('div');
    t.className = 'kuku-table';
    t.style.setProperty('--c', `${cell}px`);
    const add = (cls, text, onClick) => {
      const d = document.createElement(onClick ? 'button' : 'div');
      d.className = cls;
      d.textContent = text;
      if (onClick) d.addEventListener('click', onClick);
      t.appendChild(d);
      return d;
    };
    add('kk-corner', '×');
    for (let b = 1; b <= 9; b++) add('kk-head', b);
    for (let a = 1; a <= 9; a++) {
      add(`kk-head${view.rows.includes(a) ? ' row-on' : ''}`, view.hideHeads ? '？' : a);
      for (let b = 1; b <= 9; b++) {
        const key = `${a}x${b}`;
        const hidden = view.hidden.includes(key);
        let cls = 'kk-cell';
        if (view.rows.includes(a)) cls += ' row-on';
        if (view.found.has(key) || view.reveal.includes(key)) cls += ' found';
        if (view.marked.has(key)) cls += ' marked';
        if (view.mark.includes(key)) cls += ' mark';
        if (key === view.active) cls += ' active';
        const el = add(cls, hidden ? '？' : a * b, () => onTap(a, b, el));
        el.dataset.key = key;
      }
    }
    box.appendChild(t);
  };

  view.layout = () => view.draw();

  // まちがえた マスを ゆらす
  view.flash = (key) => {
    const el = box.querySelector(`[data-key="${key}"]`);
    if (!el) return;
    el.classList.remove('wrong');
    void el.offsetWidth;
    el.classList.add('wrong');
  };

  return view;
}
