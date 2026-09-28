// じゅけんの どだい（1年）その2：9〜1月
// SAPIX 1年の たんげん名の じゅんばんと テーマに あわせた オリジナルの もんだい。

// ---------- ビンゴゲーム（こたえの マスを タップして 1れつ そろえる） ----------
const BINGO_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function bingoQuestion() {
  const nums = shuffle([...Array(17).keys()].map((i) => i + 2)).slice(0, 9); // 2〜18 の ちがう 数
  const line = BINGO_LINES[rand(0, 7)];
  const calcs = line.map((cell) => {
    const n = nums[cell];
    const a = rand(Math.max(1, n - 9), Math.min(9, n - 1));
    return { a, b: n - a, n };
  });
  return { kind: 'bingo', nums, line, calcs, label: 'ビンゴ' };
}

UNITS.bingo = {
  questions() {
    return Array.from({ length: 4 }, bingoQuestion);
  },
  steps(q) {
    return q.calcs.map((c, i) => ({
      kind: 'tapnum', target: c.n,
      prompt: `<b>${c.a} + ${c.b}</b> の こたえの マスを タップ！（${i + 1}/3）`,
      say: i === 0 ? '3つ ぜんぶ あたると ビンゴ！' : '',
    }));
  },
  view(box, q, api) {
    const view = { stamped: new Set() };
    view.draw = () => {
      box.innerHTML = `<div class="bg-board">${q.nums.map((n, i) => `<button class="bg-cell${view.stamped.has(i) ? ' on' : ''}" data-i="${i}">${n}</button>`).join('')}</div>`;
      box.querySelectorAll('.bg-cell').forEach((b) => b.addEventListener('click', () => {
        if (api.locked()) return;
        const i = Number(b.dataset.i);
        const step = api.step();
        if (q.nums[i] === step.target) {
          view.stamped.add(i);
          view.draw();
          const bingo = BINGO_LINES.some((l) => l.every((c) => view.stamped.has(c)));
          api.correct(bingo ? '🎉 ビンゴ！' : 'あたり！');
        } else {
          api.wrong(`${q.nums[i]} じゃ ないよ。もういちど けいさん しよう`);
        }
      }));
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- はこをつくろう（3D） ----------
UNITS.hako1 = {
  questions() {
    return shuffle([
      { kind: 'faces', dims: shuffle([4, 6, 9]), label: 'めんの かず' },
      { kind: 'pairs', dims: shuffle([4, 6, 9]), label: 'おなじ かたちの めん' },
      { kind: 'cube', dims: [5, 5, 5], label: 'さいころの かたち' },
      { kind: 'faces', dims: [5, 5, 5], label: 'めんの かず' },
      { kind: 'pairs', dims: shuffle([3, 5, 8]), label: 'おなじ かたちの めん' },
    ]);
  },
  steps(q) {
    const 面 = rb('面', 'めん');
    if (q.kind === 'faces') return [{ kind: 'answer', expected: 6, unit: 'こ', prompt: `はこの ${面}は ${何1()}こ？ ゆびで まわして かぞえよう` }];
    if (q.kind === 'cube') return [{ kind: 'choice', options: ['ぜんぶ おなじ かたち', 'ちがう かたちが ある'], answer: 0, prompt: `さいころの かたちの はこ。${面}の かたちは？` }];
    return [{ kind: 'answer', expected: 2, unit: 'こずつ', prompt: `この はこを つくるには、おなじ かたちの ${面}が ${何1()}こずつ いる？<small>（むかいあう ${面}が おなじ かたち）</small>` }];
  },
  view(box, q) {
    return mount3dView(box, (m, holder) => m.createBoxView(holder, { dims: q.dims, colors: EDGE_COLORS }));
  },
};

// ---------- スタンプラリー（10こで 1まい） ----------
UNITS.stamp = {
  questions() {
    const qs = [];
    for (let i = 0; i < 4; i++) qs.push({ kind: 'count', n: rand(12, 58), label: 'スタンプは なんこ' });
    // ちょうど いっぱい（10の まとまりだけ）に ならない かず
    for (let i = 0; i < 2; i++) qs.push({ kind: 'more', n: rand(2, 4) * 10 + rand(1, 9), label: 'あと なんこで いっぱい' });
    return shuffle(qs);
  },
  steps(q) {
    const tens = Math.floor(q.n / 10);
    if (q.kind === 'more') {
      return [{ kind: 'answer', expected: (tens + 1) * 10 - q.n, unit: 'こ', prompt: `スタンプは ${q.n}こ。いま つかって いる カードは あと ${何1()}こで いっぱい？` }];
    }
    return [
      { kind: 'answer', expected: tens, unit: 'まい', prompt: `1まいの カードに スタンプが 10こ。いっぱいの カードは ${何1()}まい？` },
      { kind: 'answer', expected: q.n, unit: 'こ', prompt: `スタンプは ぜんぶで ${何1()}こ？（10が ${tens}つと ${q.n % 10}）` },
    ];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      const cards = Math.ceil(q.n / 10);
      let html = '<div class="st-wrap">';
      for (let c = 0; c < cards; c++) {
        html += '<div class="st-card">';
        for (let i = 0; i < 10; i++) html += `<span>${c * 10 + i < q.n ? '🌸' : ''}</span>`;
        html += '</div>';
      }
      box.innerHTML = `${html}</div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- とけいであそぼう（なんじ・なんじはん） ----------
UNITS.tokei1 = {
  questions() {
    const qs = [];
    for (let i = 0; i < 3; i++) qs.push({ kind: 'read', h: rand(1, 12), m: 0, label: 'なんじ' });
    for (let i = 0; i < 2; i++) qs.push({ kind: 'read', h: rand(1, 12), m: 30, label: 'なんじはん' });
    for (let i = 0; i < 2; i++) qs.push({ kind: 'set', h: rand(1, 12), m: [0, 30][rand(0, 1)], label: 'とけいを あわせる' });
    return shuffle(qs);
  },
  steps(q) {
    const 時 = rb('時', 'じ');
    if (q.kind === 'set') {
      return [{ kind: 'set', target: { h: q.h, m: q.m }, prompt: `ながい はりを うごかして <b>${q.h}${時}${q.m ? 'はん' : ''}</b> に しよう`, say: 'あわせたら「できた！」を おしてね' }];
    }
    return [{
      kind: 'answer', expected: q.h, unit: q.m ? `${時}はん` : 時,
      prompt: q.m ? `ながい はりが 6。${何1()}${時}はん？` : `ながい はりが 12 の とき、みじかい はりが さす ${rb('数', 'かず')}が「${時}」。${何1()}${時}？`,
    }];
  },
  view(box, q, api) {
    return UNITS.tokei.view(box, q, api);
  },
};

// ---------- うらないゲーム（ヒントから じゅんばんを あてる） ----------
UNITS.uranai = {
  questions() {
    return Array.from({ length: 5 }, () => orderQuestion(3));
  },
  steps(q) {
    return [UNITS.suiri.steps(q)[0]];
  },
  view(box, q, api) {
    return UNITS.suiri.view(box, q, api);
  },
};

// ---------- どれにしようかな？（くみあわせを ぜんぶ みつける） ----------
const SWEETS = [['🍰', 'ケーキ'], ['🍮', 'プリン'], ['🍪', 'クッキー']];
const DRINKS = [['🥛', 'ぎゅうにゅう'], ['🧃', 'ジュース'], ['🍵', 'おちゃ']];

UNITS.dore = {
  questions() {
    return Array.from({ length: 4 }, () => {
      const a = shuffle(SWEETS).slice(0, rand(2, 3));
      const b = shuffle(DRINKS).slice(0, 2);
      return { kind: 'combo', a, b, label: 'おやつの えらびかた' };
    });
  },
  steps(q) {
    return [
      { kind: 'combo', prompt: `おかしを 1つと のみものを 1つ えらびます。えらびかたを ぜんぶ みつけよう`, say: 'おかし → のみもの の じゅんに タップ' },
      { kind: 'answer', expected: q.a.length * q.b.length, unit: 'とおり', prompt: `ぜんぶで ${何1()}とおり？` },
    ];
  },
  view(box, q, api) {
    const view = { pick: null, found: [] };
    view.draw = () => {
      const row = (list, cls) => list.map((x, i) => `<button class="dr-item ${cls}${cls === 'a' && view.pick === i ? ' on' : ''}" data-i="${i}">${x[0]}<small>${x[1]}</small></button>`).join('');
      box.innerHTML = `<div class="dr-wrap">
        <div class="dr-row">${row(q.a, 'a')}</div><div class="dr-row">${row(q.b, 'b')}</div>
        <div class="dr-found">${view.found.map((k) => `<span>${q.a[k[0]][0]}${q.b[k[1]][0]}</span>`).join('')}</div></div>`;
      box.querySelectorAll('.dr-item.a').forEach((b) => b.addEventListener('click', () => {
        if (api.step().kind !== 'combo') return;
        view.pick = Number(b.dataset.i);
        api.tick();
        view.draw();
      }));
      box.querySelectorAll('.dr-item.b').forEach((b) => b.addEventListener('click', () => {
        if (api.locked() || api.step().kind !== 'combo') return;
        if (view.pick === null) return api.say('さきに おかしを えらんでね', true);
        const k = [view.pick, Number(b.dataset.i)];
        view.pick = null;
        if (view.found.some((f) => f[0] === k[0] && f[1] === k[1])) api.say('それは もう みつけたよ', true);
        else view.found.push(k);
        view.draw();
        if (view.found.length === q.a.length * q.b.length) api.correct('ぜんぶ みつけた！');
      }));
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- どれがおもいかな？（シーソーで くらべる） ----------
const FRUIT3 = [['🍎', 'りんご'], ['🍊', 'みかん'], ['🍓', 'いちご'], ['🍌', 'バナナ']];

UNITS.omoi = {
  questions() {
    const qs = [];
    for (let i = 0; i < 3; i++) {
      const items = shuffle(FRUIT3).slice(0, 3);
      qs.push({ kind: 'order', items, label: 'いちばん おもいのは' }); // items[0] が いちばん おもい
    }
    for (let i = 0; i < 3; i++) {
      const [x, y] = shuffle(FRUIT3).slice(0, 2);
      const a = rand(4, 9);
      const b = rand(2, a - 1);
      qs.push({ kind: 'blocks', x, y, a, b, label: 'つみき なんこぶん' });
    }
    return shuffle(qs);
  },
  steps(q) {
    if (q.kind === 'order') {
      const opts = shuffle([0, 1, 2]);
      return [{
        kind: 'choice', options: opts.map((i) => `${q.items[i][0]} ${q.items[i][1]}`), answer: opts.indexOf(0),
        prompt: 'シーソーを 2かい しました。いちばん おもいのは どれ？<small>（おなじ おもさの ものは ない）</small>',
      }];
    }
    return [{ kind: 'answer', expected: q.a - q.b, unit: 'こぶん', prompt: `${q.x[1]}は つみき ${q.a}こ、${q.y[1]}は つみき ${q.b}こと つりあいました。${q.x[1]}は つみき ${何1()}こぶん おもい？` }];
  },
  view(box, q) {
    const view = {};
    // おもい ほうが したに さがる シーソー
    const seesaw = (heavy, light) => `<div class="om-saw"><div class="om-bar"><span class="om-l">${heavy}</span><span class="om-r">${light}</span></div><div class="om-base">▲</div></div>`;
    view.draw = () => {
      if (q.kind === 'order') {
        const [h, m, l] = q.items;
        box.innerHTML = `<div class="om-wrap">${seesaw(h[0], m[0])}${seesaw(m[0], l[0])}</div>`;
      } else {
        box.innerHTML = `<div class="om-wrap"><div class="om-eq">${q.x[0]} ＝ ${'🟫'.repeat(q.a)}</div><div class="om-eq">${q.y[0]} ＝ ${'🟫'.repeat(q.b)}</div></div>`;
      }
    };
    view.layout = () => view.draw();
    return view;
  },
};
