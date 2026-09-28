// じゅけんの どだい（2年 前半）その3：かけ算って何だ？／きみはどんなしきを立てるかな？
// SAPIX 2年「夏期」の テーマに あわせた オリジナルの もんだい。

const KK_ICONS = ['🍎', '🐟', '🌸', '⭐', '🍩'];

// ---------- かけ算って何だ？ ----------
UNITS.kakeimi = {
  questions() {
    const qs = [];
    for (let i = 0; i < 3; i++) qs.push({ kind: 'groups', a: rand(2, 6), b: rand(2, 5), icon: KK_ICONS[rand(0, 4)], label: '1つ分と いくつ分' });
    for (let i = 0; i < 2; i++) qs.push({ kind: 'toAdd', a: rand(2, 9), b: rand(3, 5), label: 'かけ算を たし算で' });
    for (let i = 0; i < 2; i++) qs.push({ kind: 'plusOne', a: rand(2, 9), b: rand(2, 8), label: 'かける数が 1 ふえると' });
    qs.push({ kind: 'array', a: rand(3, 7), b: rand(2, 5), icon: '🟠', label: 'ならんだ ○' });
    return shuffle(qs);
  },
  steps(q) {
    const 何 = rb('何', 'なん');
    const 数 = rb('数', 'かず');
    switch (q.kind) {
      case 'groups':
        return [
          { kind: 'answer', expected: q.a, unit: 'こ', prompt: `1つの さらに ${q.icon}は ${何}こ？（1つ${rb('分', 'ぶん')}の ${数}）` },
          { kind: 'answer', expected: q.b, unit: `つ${rb('分', 'ぶん')}`, prompt: `さらは ${何}まい？（いくつ${rb('分', 'ぶん')}）` },
          { kind: 'answer', expected: q.a * q.b, before: `${q.a} × ${q.b} =`, prompt: `1つ${rb('分', 'ぶん')}の ${数} × いくつ${rb('分', 'ぶん')} ＝ ${rb('全部', 'ぜんぶ')}の ${数}` },
        ];
      case 'toAdd':
        return [{
          kind: 'choice', ...mix([Array(q.b).fill(q.a).join(' + '), `${q.a} + ${q.b}`, Array(q.b + 1).fill(q.a).join(' + ')]),
          prompt: `<b>${q.a} × ${q.b}</b> を たし算で かくと どれ？`, explain: `${q.a} を ${q.b}${rb('回', 'かい')} たす`,
        }];
      case 'plusOne':
        return [
          { kind: 'answer', expected: q.a * q.b, before: `${q.a} × ${q.b} =`, prompt: `まず ${q.a} × ${q.b} は？` },
          { kind: 'answer', expected: q.a, prompt: `${q.a} × ${q.b + 1} は ${q.a} × ${q.b} より いくつ ${rb('大', 'おお')}きい？<small>（かける ${数}が 1 ふえると…）</small>` },
        ];
      case 'array':
        return [
          { kind: 'choice', ...mix([`${q.a} × ${q.b}`, `${q.a} + ${q.b}`, `${q.a} × ${q.b + 1}`]), prompt: `よこに ${q.a}こずつ、たてに ${q.b}れつ。${rb('式', 'しき')}は？` },
          { kind: 'answer', expected: q.a * q.b, before: `${q.a} × ${q.b} =`, prompt: `○は ${rb('全部', 'ぜんぶ')}で ${何}こ？` },
        ];
    }
    return [];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      if (q.kind === 'groups') {
        box.innerHTML = `<div class="kz-wrap">${Array.from({ length: q.b }, () => `<div class="km-plate">${q.icon.repeat(q.a)}</div>`).join('')}</div>`;
      } else if (q.kind === 'array') {
        box.innerHTML = `<div class="km-array" style="grid-template-columns:repeat(${q.a}, 1fr)">${q.icon.repeat(q.a * q.b).match(/./gu).map((c) => `<span>${c}</span>`).join('')}</div>`;
      } else if (q.kind === 'plusOne') {
        const row = (n, hl) => `<div class="km-row${hl ? ' hl' : ''}">${'●'.repeat(q.a)}</div>`;
        box.innerHTML = `<div class="km-rows">${Array.from({ length: q.b + 1 }, (_, i) => row(q.a, i === q.b)).join('')}</div>`;
      } else {
        box.innerHTML = '';
      }
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- きみはどんなしきを立てるかな？ ----------
// ○の ならびを ながしかくに わけて かぞえる
function dotShape(kind) {
  if (kind === 'L') {
    const W = rand(4, 7);
    const H = rand(3, 5);
    const w = rand(1, W - 2);
    const h = rand(1, H - 2);
    // みぎうえが かけた ながしかく
    const cells = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (!(r < h && c >= W - w)) cells.push([r, c]);
    return {
      kind, W, H, cells, total: W * H - w * h,
      right: [`${W} × ${H} − ${w} × ${h}`, `${W - w} × ${h} + ${W} × ${H - h}`][rand(0, 1)],
      wrong: [`${W} × ${H}`, `${W} × ${H} − ${w} + ${h}`],
    };
  }
  const a = rand(2, 5);
  const b = rand(2, 4);
  const c = rand(2, 5);
  const d = rand(2, 4);
  const cells = [];
  for (let r = 0; r < b; r++) for (let x = 0; x < a; x++) cells.push([r, x]);
  for (let r = 0; r < d; r++) for (let x = 0; x < c; x++) cells.push([r, a + 1 + x]);
  return {
    kind, W: a + 1 + c, H: Math.max(b, d), cells, total: a * b + c * d,
    right: `${a} × ${b} + ${c} × ${d}`,
    wrong: [`${a} × ${b} × ${c} × ${d}`, `${a + c} × ${b + d}`],
  };
}

UNITS.shiki = {
  questions() {
    return shuffle(['L', 'L', 'L', 'two', 'two', 'L']).map((k) => ({ ...dotShape(k), label: '○の かず' }));
  },
  steps(q) {
    return [
      {
        kind: 'choice', ...mix([q.right, ...q.wrong]),
        prompt: `○の ${rb('数', 'かず')}を もとめる ${rb('式', 'しき')}は どれ？ ながしかくに わけたり、たりない ところを ひいたり しよう`,
        hint: `${rb('式', 'しき')}の ながしかくを ${rb('図', 'ず')}の なかに さがそう`,
      },
      { kind: 'answer', expected: q.total, before: `${q.right} =`, prompt: `○は ${rb('全部', 'ぜんぶ')}で ${rb('何', 'なん')}こ？` },
    ];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      let html = `<div class="sk-grid" style="grid-template-columns:repeat(${q.W}, 30px)">`;
      for (let r = 0; r < q.H; r++) for (let c = 0; c < q.W; c++) html += q.cells.some((x) => x[0] === r && x[1] === c) ? '<span class="sk-dot"></span>' : '<span></span>';
      box.innerHTML = `${html}</div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};
