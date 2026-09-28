// じゅけんの どだい（1年）その1：4〜7月・夏期
// SAPIX 1年の たんげん名の じゅんばんと テーマに あわせた オリジナルの もんだい。
// 1年生むけに ひらがなを おおく、かんじは すこしだけ（ふりがなつき）。

const 何1 = () => rb('何', 'なん');
const BALL = '⚽';
const SNACKS = ['🍪', '🍬', '🍩', '🍙'];
const KIDS = ['たろう', 'はなこ', 'けんた', 'ゆい'];

// ---------- ボールつかみゲーム（10 までの 数の あわせ・わけ） ----------
UNITS.ball = {
  questions() {
    const qs = [];
    for (let i = 0; i < 4; i++) {
      const total = rand(5, 10);
      qs.push({ kind: 'split', total, right: rand(1, total - 1), label: `${total}の わけかた` });
    }
    for (let i = 0; i < 3; i++) {
      const r = rand(1, 6);
      qs.push({ kind: 'join', right: r, left: rand(1, 10 - r), label: 'あわせて いくつ' });
    }
    return shuffle(qs);
  },
  steps(q) {
    if (q.kind === 'split') {
      return [{ kind: 'answer', expected: q.total - q.right, unit: 'こ', prompt: `ボールを りょうてで <b>${q.total}こ</b> つかみました。みぎてに ${q.right}こ。ひだりてには ${何1()}こ？` }];
    }
    return [{ kind: 'answer', expected: q.right + q.left, unit: 'こ', prompt: `みぎてに ${q.right}こ、ひだりてに ${q.left}こ。あわせて ${何1()}こ？` }];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      const hand = (n, hidden, name) => `<div class="bl-hand"><div class="bl-balls">${hidden ? '<span class="bl-q">？</span>' : BALL.repeat(n)}</div><span>${name}</span></div>`;
      box.innerHTML = q.kind === 'split'
        ? `<div class="bl-wrap">${hand(0, true, 'ひだりて')}${hand(q.right, false, 'みぎて')}</div>`
        : `<div class="bl-wrap">${hand(q.left, false, 'ひだりて')}${hand(q.right, false, 'みぎて')}</div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- タイルならべ ----------
UNITS.narabe = {
  questions() {
    const qs = [];
    for (let i = 0; i < 3; i++) qs.push({ kind: 'count', n: rand(3, 10), label: 'タイルは なんまい' });
    for (let i = 0; i < 3; i++) qs.push({ kind: 'toTen', n: rand(2, 9), label: 'あと なんまいで 10' });
    return shuffle(qs);
  },
  steps(q) {
    if (q.kind === 'count') return [{ kind: 'answer', expected: q.n, unit: 'まい', prompt: `タイルは ${何1()}まい？` }];
    return [{ kind: 'answer', expected: 10 - q.n, unit: 'まい', prompt: `タイルは ${q.n}まい。あと ${何1()}まいで <b>10</b>まいに なる？` }];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      // 10 の わく（5×2）に ならべる
      let html = '<div class="nr-frame">';
      for (let i = 0; i < 10; i++) html += `<span class="${i < q.n ? 'on' : ''}"></span>`;
      box.innerHTML = `${html}</div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- どれがながい？（ますの かずで くらべる） ----------
UNITS.nagai = {
  questions() {
    return Array.from({ length: 6 }, () => {
      const lens = shuffle([3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3);
      return { kind: 'tape', lens, label: 'どれが ながい' };
    });
  },
  steps(q) {
    const max = Math.max(...q.lens);
    const min = Math.min(...q.lens);
    return [
      { kind: 'choice', options: ['あ', 'い', 'う'], answer: q.lens.indexOf(max), prompt: 'いちばん ながい テープは どれ？ ますの かずで くらべよう' },
      { kind: 'answer', expected: max - min, unit: 'ます', prompt: `いちばん ながい テープは、いちばん みじかい テープより ${何1()}ます ながい？` },
    ];
  },
  view(box, q) {
    const view = {};
    const colors = ['#ff8a3d', '#4d96ff', '#3cb46e'];
    view.draw = () => {
      box.innerHTML = `<div class="ng-wrap">${q.lens.map((n, i) => `<div class="ng-row"><b>${'あいう'[i]}</b><div class="ng-tape" style="--n:${n};background:${colors[i]}"></div></div>`).join('')}</div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- わける（おかしをわけよう・みんなでわけよう・シールをわけよう） ----------
// おさらを タップすると 1こ くばる。おさらの なかを タップすると もどる。
function createShareView(box, q, api) {
  const view = { plates: Array(q.people).fill(0) };
  view.draw = () => {
    const left = q.n - view.plates.reduce((s, x) => s + x, 0);
    box.innerHTML = `
      <div class="wk-wrap">
        <div class="wk-pile">${q.icon.repeat(left) || '<small>ぜんぶ くばったよ</small>'}<span class="wk-left">のこり ${left}こ</span></div>
        <div class="wk-plates">${view.plates.map((n, i) => `
          <button class="wk-plate" data-i="${i}"><span class="wk-name">${KIDS[i]}</span><span class="wk-items">${q.icon.repeat(n)}</span><b>${n}</b></button>`).join('')}
        </div>
        <button class="big-btn orange wk-ok">できた！</button>
      </div>`;
    box.querySelectorAll('.wk-plate').forEach((b) => b.addEventListener('click', (e) => {
      if (api.locked() || api.step().kind !== 'share') return;
      const i = Number(b.dataset.i);
      // おさらの なかの おかしを タップ → もどす
      if (e.target.closest('.wk-items') && view.plates[i] > 0) view.plates[i]--;
      else if (left > 0) view.plates[i]++;
      api.tick();
      view.draw();
    }));
    box.querySelector('.wk-ok').addEventListener('click', () => {
      if (api.locked() || api.step().kind !== 'share') return;
      if (left > 0) return api.say(`まだ ${left}こ のこって いるよ`, true);
      const p = view.plates;
      const ok = q.diff ? p[0] === p[1] + q.diff : p.every((x) => x === p[0]);
      if (ok) api.correct('できた！');
      else api.wrong(q.diff ? `${KIDS[0]}は ${KIDS[1]}より ${q.diff}こ おおく するよ` : 'みんな おなじ かずに なって いるかな？');
    });
  };
  view.layout = () => view.draw();
  return view;
}

function shareUnit(make) {
  return {
    questions: make,
    steps(q) {
      const who = q.people === 2 ? `${KIDS[0]}と ${KIDS[1]}` : `${q.people}${rb('人', 'にん')}`;
      if (q.diff) {
        return [
          { kind: 'share', prompt: `${q.icon} ${q.n}まいを ${who}で わけます。<b>${KIDS[0]}が ${q.diff}まい おおく</b> なるように くばろう`, say: 'おさらを タップすると 1まい くばるよ' },
          { kind: 'answer', expected: (q.n + q.diff) / 2, unit: 'まい', prompt: `${KIDS[0]}は ${何1()}まい？` },
        ];
      }
      return [
        { kind: 'share', prompt: `${q.icon} ${q.n}こを ${who}で <b>おなじ かずずつ</b> わけよう`, say: 'おさらを タップすると 1こ くばるよ' },
        { kind: 'answer', expected: q.n / q.people, unit: 'こ', prompt: `1${rb('人', 'り')} ${何1()}こに なった？` },
      ];
    },
    view: createShareView,
  };
}

UNITS.okashi = shareUnit(() => Array.from({ length: 5 }, () => {
  const k = rand(2, 6);
  return { kind: 'share', n: k * 2, people: 2, icon: SNACKS[rand(0, 3)], label: `${k * 2}こを 2${rb('人', 'にん')}で` };
}));
UNITS.minna = shareUnit(() => Array.from({ length: 5 }, () => {
  const p = rand(3, 4);
  const k = rand(2, 3);
  return { kind: 'share', n: p * k, people: p, icon: SNACKS[rand(0, 3)], label: `${p * k}こを ${p}${rb('人', 'にん')}で` };
}));
UNITS.seal = shareUnit(() => Array.from({ length: 5 }, () => {
  const d = rand(1, 4);
  const b = rand(2, 5);
  return { kind: 'share', n: b * 2 + d, diff: d, people: 2, icon: '⭐', label: `${d}まい おおく` };
}));

// ---------- どうぶつつみき（3D） ----------
UNITS.doubutsu = {
  questions() {
    return Array.from({ length: 5 }, () => {
      let h;
      do h = randomHeights(2, 2, 2); while (h.flat().reduce((s, x) => s + x, 0) < 3);
      return { kind: 'count', heights: h, label: 'つみきは なんこ' };
    });
  },
  steps(q) {
    return [{ kind: 'answer', expected: q.heights.flat().reduce((s, x) => s + x, 0), unit: 'こ', prompt: `つみきは ${何1()}こ？ ゆびで まわして うしろも みよう` }];
  },
  view(box, q) {
    return mount3dView(box, (m, holder) => m.createBlocksView(holder, { heights: q.heights }));
  },
};

// ---------- ゲームをしよう（さいころ・すごろく） ----------
function diceHTML(n) {
  const pos = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[n];
  return `<div class="dice">${Array.from({ length: 9 }, (_, i) => `<span class="${pos.includes(i + 1) ? 'pip' : ''}${n === 1 ? ' red' : ''}"></span>`).join('')}</div>`;
}

UNITS.game = {
  questions() {
    const qs = [];
    for (let i = 0; i < 4; i++) qs.push({ kind: 'dice', a: rand(1, 6), b: rand(1, 6), label: 'さいころの め' });
    for (let i = 0; i < 3; i++) qs.push({ kind: 'sugoroku', at: rand(1, 9), go: rand(1, 6), label: 'すごろく' });
    return shuffle(qs);
  },
  steps(q) {
    if (q.kind === 'dice') return [{ kind: 'answer', expected: q.a + q.b, prompt: `さいころ 2つの めを たすと いくつ？` }];
    return [{ kind: 'answer', expected: q.at + q.go, unit: 'ばん', prompt: `いま <b>${q.at}ばん</b>の ますに いるよ。さいころで ${q.go}が でた。${何1()}ばんの ますに すすむ？` }];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      if (q.kind === 'dice') {
        box.innerHTML = `<div class="dice-wrap">${diceHTML(q.a)}<span>＋</span>${diceHTML(q.b)}</div>`;
        return;
      }
      let html = '<div class="sg-track">';
      for (let i = 1; i <= 16; i++) html += `<span class="${i === q.at ? 'here' : ''}">${i}${i === q.at ? '<i>🐰</i>' : ''}</span>`;
      box.innerHTML = `${html}</div><div class="dice-wrap small">${diceHTML(q.go)}</div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- タイルあそび（4まいで できた かたち） ----------
UNITS.tileasobi = {
  questions() {
    const qs = [];
    for (let i = 0; i < 4; i++) {
      const n = 4;
      const shapes = [randomPolyomino(n, 4, 3), randomPolyomino(n + 1, 4, 3), randomPolyomino(n - 1, 4, 3)];
      qs.push({ kind: 'pick', n, shapes, label: `${n}まいで できた かたち` });
    }
    for (let i = 0; i < 2; i++) qs.push({ kind: 'count', shape: randomPolyomino(rand(5, 8), 4, 3), label: 'タイルは なんまい' });
    return shuffle(qs);
  },
  steps(q) {
    if (q.kind === 'count') return [{ kind: 'answer', expected: tileArea(q.shape), unit: 'まい', prompt: `この かたちは タイル ${何1()}まい？` }];
    const opts = shuffle([0, 1, 2]);
    return [{
      kind: 'choice', options: opts.map((i) => ({ html: shapeHTML(q.shapes[i], 'opt') })), answer: opts.indexOf(0),
      prompt: `タイル <b>${q.n}まい</b>で できて いる かたちは どれ？`,
    }];
  },
  view(box) {
    const view = { draw: () => (box.innerHTML = '<div class="room-msg">みぎの なかから えらんでね</div>'), layout: () => view.draw() };
    return view;
  },
};

// ---------- おってきろう（ひらくと どんな かたち？） ----------
function mirrorRows(half) {
  return half.map((r) => [...r].reverse().join('') + r);
}

UNITS.otte = {
  questions() {
    return Array.from({ length: 5 }, () => {
      let half;
      do {
        half = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => (Math.random() < 0.55 ? '#' : '.')).join(''));
      } while (!half.some((r) => r !== [...r].reverse().join('')) || !half.every((r) => r[0] === '#'));
      return { kind: 'open', half, label: 'ひらくと どんな かたち' };
    });
  },
  steps(q) {
    const right = mirrorRows(q.half);
    const same = q.half.map((r) => r + r);                    // うつしただけ（まちがい）
    // 1マスだけ ちがう もの（まちがい）
    const changed = [...q.half];
    const row = [...changed[1]];
    row[2] = row[2] === '#' ? '.' : '#';
    changed[1] = row.join('');
    const other = mirrorRows(changed);
    const opts = shuffle([right, same, other]);
    return [{
      kind: 'choice', options: opts.map((s) => ({ html: shapeHTML(s, 'opt') })), answer: opts.indexOf(right),
      prompt: 'かみを ふたつに おって、いろの ところを きりとりました。ひらくと どんな かたち？',
      say: 'おりめで かがみの ように うつるよ',
    }];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      box.innerHTML = `<div class="ot-wrap">${shapeHTML(q.half.map((r) => [...r].reverse().join('')), 'big')}<div class="ot-fold">おりめ</div></div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- けいさんロボット ----------
UNITS.robot = {
  questions() {
    const qs = [];
    for (let i = 0; i < 4; i++) {
      const op = Math.random() < 0.6 ? '+' : '−';
      const k = rand(1, 5);
      const x = op === '+' ? rand(1, 10 - k) : rand(k + 1, 10);
      qs.push({ kind: 'fwd', op, k, x, label: `${op}${k} ロボット` });
    }
    for (let i = 0; i < 3; i++) {
      const k = rand(1, 5);
      const y = rand(k + 1, 10);
      qs.push({ kind: 'back', op: '+', k, y, label: `+${k} ロボット（ぎゃく）` });
    }
    return shuffle(qs);
  },
  steps(q) {
    if (q.kind === 'fwd') {
      return [{ kind: 'answer', expected: q.op === '+' ? q.x + q.k : q.x - q.k, prompt: `「<b>${q.op}${q.k}</b> ロボット」に ${q.x} を いれると、${何1()}が でて くる？` }];
    }
    return [{ kind: 'answer', expected: q.y - q.k, prompt: `「<b>+${q.k}</b> ロボット」から ${q.y} が でて きた。${何1()}を いれた？` }];
  },
  view(box, q) {
    const view = {};
    view.draw = () => {
      const inV = q.kind === 'fwd' ? q.x : '？';
      const outV = q.kind === 'fwd' ? '？' : q.y;
      box.innerHTML = `<div class="rb-wrap"><div class="rb-box">${inV}</div><span>→</span><div class="rb-robot">🤖<b>${q.op}${q.k}</b></div><span>→</span><div class="rb-box">${outV}</div></div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};
