// じゅけんの どだい（2年 前半）その2：はこの形／ブロックであそぼう／時計であそぼう／ものさしであそぼう
// SAPIX 2年「2〜7月・夏期」の テーマに あわせた オリジナルの もんだい。

// ---------- はこの形 ----------
const EDGE_COLORS = ['#e2553f', '#4d96ff', '#3cb46e'];
const EDGE_NAMES = () => [rb('赤', 'あか'), rb('青', 'あお'), rb('緑', 'みどり')];

UNITS.hako = {
  questions(opts = {}) {
    const dims = () => {
      const ls = shuffle([3, 4, 5, 6, 8, 10]).slice(0, 3);
      return Math.random() < 0.25 ? [ls[0], ls[0], ls[0]] : ls;
    };
    const qs = [
      { kind: 'faces', dims: dims(), label: `${rb('面', 'めん')}の ${rb('数', 'かず')}` },
      { kind: 'edges', dims: dims(), label: `${rb('辺', 'へん')}の ${rb('数', 'かず')}` },
      { kind: 'verts', dims: dims(), label: `ちょう${rb('点', 'てん')}の ${rb('数', 'かず')}` },
      { kind: 'same', dims: shuffle([3, 5, 8]), label: `${rb('同', 'おな')}じ ${rb('長', 'なが')}さの ${rb('辺', 'へん')}` },
      { kind: 'stick', dims: shuffle([4, 6, 9]), which: rand(0, 2), label: `ひごの ${rb('数', 'かず')}` },
      { kind: 'clay', dims: dims(), label: `ねんど${rb('玉', 'だま')}` },
    ];
    if (opts.hard) qs.push({ kind: 'total', dims: shuffle([3, 5, 7]), label: `ひごの ${rb('長', 'なが')}さの ${rb('合計', 'ごうけい')}` });
    return shuffle(qs);
  },
  steps(q) {
    const 何 = rb('何', 'なん');
    const 辺 = rb('辺', 'へん');
    const [w, h, d] = q.dims;
    const lens = EDGE_NAMES().map((n, i) => `${n}＝${q.dims[i]}cm`).join('、');
    switch (q.kind) {
      case 'faces': return [{ kind: 'answer', expected: 6, unit: 'こ', prompt: `はこの ${rb('面', 'めん')}は ${何}こ？ まわして かぞえよう` }];
      case 'edges': return [{ kind: 'answer', expected: 12, unit: `${rb('本', 'ほん')}`, prompt: `はこの ${辺}（まっすぐな ぼうの ところ）は ${何}${rb('本', 'ぼん')}？` }];
      case 'verts': return [{ kind: 'answer', expected: 8, unit: 'こ', prompt: `ちょう${rb('点', 'てん')}（かど）は ${何}こ？` }];
      case 'same': return [{ kind: 'answer', expected: 4, unit: `${rb('本', 'ほん')}`, prompt: `${lens}。${rb('同', 'おな')}じ ${rb('長', 'なが')}さの ${辺}は ${何}${rb('本', 'ぼん')}ずつ？` }];
      case 'stick': return [{ kind: 'answer', expected: 4, unit: `${rb('本', 'ほん')}`, prompt: `ひごで はこの ${rb('形', 'かたち')}を つくります（${lens}）。<b>${q.dims[q.which]}cm</b>の ひごは ${何}${rb('本', 'ぼん')} いる？` }];
      case 'clay': return [{ kind: 'answer', expected: 8, unit: 'こ', prompt: `ひごを つなぐ ねんど${rb('玉', 'だま')}は ${何}こ いる？` }];
      case 'total': return [
        { kind: 'answer', expected: 4 * (w + h + d), unit: 'cm', prompt: `${lens}。ひごの ${rb('長', 'なが')}さを ${rb('全部', 'ぜんぶ')} たすと ${何}cm？<small>（${rb('同', 'おな')}じ ${rb('長', 'なが')}さが 4${rb('本', 'ほん')}ずつ）</small>` },
      ];
    }
    return [];
  },
  view(box, q) {
    return mount3dView(box, (m, holder) => m.createBoxView(holder, { dims: [q.dims[0], q.dims[1], q.dims[2]], colors: EDGE_COLORS }));
  },
};

// ---------- ブロックであそぼう（つみ木） ----------
function randomHeights(rows, cols, max) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => rand(0, max)));
}

UNITS.block = {
  questions(opts = {}) {
    const qs = [];
    const size = opts.hard ? [3, 3, 3] : [2, 3, 2];
    for (let i = 0; i < 5; i++) {
      let hts;
      do hts = randomHeights(size[0], size[1], size[2]); while (hts.flat().reduce((s, n) => s + n, 0) < 4);
      qs.push({ kind: 'count', heights: hts, label: `つみ${rb('木', 'き')}は ${rb('何', 'なん')}こ？` });
    }
    const full = randomHeights(2, 2, 2);
    qs.push({ kind: 'fill', heights: full, label: 'あと なんこで 立方体？' });
    return qs;
  },
  steps(q) {
    const n = q.heights.flat().reduce((s, x) => s + x, 0);
    if (q.kind === 'fill') {
      return [
        { kind: 'answer', expected: n, unit: 'こ', prompt: `つみ${rb('木', 'き')}は ${rb('何', 'なん')}こ？ まわして うしろも たしかめよう` },
        { kind: 'answer', expected: 8 - n, unit: 'こ', prompt: `2だん×2×2 の ${rb('立方体', 'りっぽうたい')}（8こ）に するには、あと ${rb('何', 'なん')}こ？` },
      ];
    }
    return [{ kind: 'answer', expected: n, unit: 'こ', prompt: `つみ${rb('木', 'き')}は ${rb('全部', 'ぜんぶ')}で ${rb('何', 'なん')}こ？ かくれている ものも あるよ。まわして たしかめよう` }];
  },
  view(box, q) {
    return mount3dView(box, (m, holder) => m.createBlocksView(holder, { heights: q.heights }));
  },
};

// ---------- 時計であそぼう（ごうくんの1日） ----------
const 時 = () => rb('時', 'じ');
const 分 = () => rb('分', 'ふん');
const fmtTime = (h, m) => `${h}${時()}${m ? `${m}${分()}` : ''}`;

function clockSVG(h, m, { draggable = false } = {}) {
  let s = '<svg class="clock" viewBox="-110 -110 220 220">';
  s += '<circle r="100" class="ck-face"/>';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r1 = i % 5 === 0 ? 84 : 90;
    s += `<line x1="${Math.sin(a) * r1}" y1="${-Math.cos(a) * r1}" x2="${Math.sin(a) * 96}" y2="${-Math.cos(a) * 96}" class="ck-tick${i % 5 === 0 ? ' big' : ''}"/>`;
  }
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    s += `<text x="${Math.sin(a) * 70}" y="${-Math.cos(a) * 70}" class="ck-num">${i}</text>`;
  }
  const ha = (((h % 12) + m / 60) / 12) * 360;
  const ma = (m / 60) * 360;
  s += `<line x1="0" y1="0" x2="0" y2="-50" class="ck-hour" transform="rotate(${ha})"/>`;
  s += `<line x1="0" y1="0" x2="0" y2="-80" class="ck-min${draggable ? ' drag' : ''}" transform="rotate(${ma})"/>`;
  s += '<circle r="5" class="ck-pin"/></svg>';
  return s;
}

UNITS.tokei = {
  questions(opts = {}) {
    const step = opts.hard ? 1 : 5;
    const t = () => ({ h: rand(1, 12), m: rand(0, Math.floor(59 / step)) * step });
    const qs = [];
    for (let i = 0; i < 2; i++) qs.push({ kind: 'read', ...t(), label: `${rb('時計', 'とけい')}を よむ` });
    for (let i = 0; i < 2; i++) qs.push({ kind: 'set', h: rand(1, 12), m: rand(0, 11) * 5, label: `${rb('時計', 'とけい')}を あわせる` });
    const s = { h: rand(1, 10), m: rand(0, 5) * 5 };
    qs.push({ kind: 'after', ...s, add: [15, 20, 30, 40, 45][rand(0, 4)] + (opts.hard ? 60 : 0), label: `${rb('何分', 'なんぷん')}${rb('後', 'ご')}` });
    const a = { h: rand(1, 10), m: rand(0, 5) * 5 };
    qs.push({ kind: 'dur', ...a, len: rand(2, 11) * 5, label: `${rb('何分間', 'なんぷんかん')}` });
    const wake = rand(6, 8);
    const sleep = rand(8, 10);
    qs.push({ kind: 'ampm', wake, sleep, label: `${rb('午前', 'ごぜん')}と ${rb('午後', 'ごご')}` });
    qs.push({ kind: 'day', label: `1${rb('日', 'にち')}は ${rb('何時間', 'なんじかん')}` });
    return shuffle(qs);
  },
  steps(q) {
    const 何 = rb('何', 'なん');
    const toHM = (mins) => ({ h: ((Math.floor(mins / 60) + 11) % 12) + 1, m: mins % 60 });
    switch (q.kind) {
      case 'read':
        return [
          { kind: 'answer', expected: q.h, unit: 時(), prompt: `${rb('時計', 'とけい')}は ${何}${時()}${何}${分()}？ みじかい ${rb('針', 'はり')}は「${時()}」、ながい ${rb('針', 'はり')}は「${分()}」` },
          { kind: 'answer', expected: q.m, before: `${q.h}${時()}`, unit: 分(), prompt: `ながい ${rb('針', 'はり')}を よもう（1めもり ＝ 1${分()}）` },
        ];
      case 'set':
        return [{ kind: 'set', target: { h: q.h, m: q.m }, prompt: `ながい ${rb('針', 'はり')}を ゆびで うごかして <b>${fmtTime(q.h, q.m)}</b> に あわせよう`, say: 'あわせたら「できた！」を おしてね' }];
      case 'after': {
        const r = toHM(q.h * 60 + q.m + q.add);
        return [
          { kind: 'answer', expected: r.h, unit: 時(), prompt: `いま ${fmtTime(q.h, q.m)}。<b>${q.add >= 60 ? `1${rb('時間', 'じかん')}${q.add - 60 ? `${q.add - 60}${分()}` : ''}` : `${q.add}${分()}`}${rb('後', 'ご')}</b>は ${何}${時()}${何}${分()}？` },
          { kind: 'answer', expected: r.m, before: `${r.h}${時()}`, unit: 分(), prompt: 'のこりは？' },
        ];
      }
      case 'dur': {
        const e = toHM(q.h * 60 + q.m + q.len);
        return [{ kind: 'answer', expected: q.len, unit: `${分()}${rb('間', 'かん')}`, prompt: `${fmtTime(q.h, q.m)} から ${fmtTime(e.h, e.m)} まで ${何}${分()}${rb('間', 'かん')}？`, clock2: e }];
      }
      case 'ampm':
        return [{
          kind: 'answer', expected: 12 - q.wake + q.sleep, unit: `${rb('時間', 'じかん')}`,
          prompt: `ごうくんは ${rb('午前', 'ごぜん')}${q.wake}${時()}に おきて、${rb('午後', 'ごご')}${q.sleep}${時()}に ねました。おきていたのは ${何}${rb('時間', 'じかん')}？<small>（${rb('午前', 'ごぜん')}は 12${rb('時間', 'じかん')}、${rb('午後', 'ごご')}も 12${rb('時間', 'じかん')}）</small>`,
        }];
      case 'day':
        return [
          { kind: 'answer', expected: 24, unit: `${rb('時間', 'じかん')}`, prompt: `1${rb('日', 'にち')}は ${何}${rb('時間', 'じかん')}？` },
          { kind: 'answer', expected: 60, unit: 分(), prompt: `1${rb('時間', 'じかん')}は ${何}${分()}？` },
        ];
    }
    return [];
  },
  view(box, q, api) {
    const view = { h: 12, m: 0 };
    view.draw = () => {
      const step = api.step();
      if (q.kind === 'set') {
        box.innerHTML = `<div class="ck-wrap">${clockSVG(view.h, view.m, { draggable: true })}<button class="big-btn orange ck-ok">できた！</button></div>`;
        const svg = box.querySelector('svg');
        const setFrom = (e) => {
          const r = svg.getBoundingClientRect();
          const x = e.clientX - (r.left + r.width / 2);
          const y = e.clientY - (r.top + r.height / 2);
          let deg = (Math.atan2(x, -y) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          const m = (Math.round(deg / 30) * 5) % 60;
          // ながい はりが 12 を こえたら じかんも すすむ
          if (view.m >= 45 && m <= 15) view.h = (view.h % 12) + 1;
          else if (view.m <= 15 && m >= 45) view.h = ((view.h + 10) % 12) + 1;
          view.m = m;
          // はりだけ うごかす（えを かきなおすと ドラッグが とぎれる）
          svg.querySelector('.ck-min').setAttribute('transform', `rotate(${(m / 60) * 360})`);
          svg.querySelector('.ck-hour').setAttribute('transform', `rotate(${(((view.h % 12) + m / 60) / 12) * 360})`);
        };
        let dragging = false;
        svg.addEventListener('pointerdown', (e) => {
          dragging = true;
          svg.setPointerCapture(e.pointerId);
          setFrom(e);
        });
        svg.addEventListener('pointermove', (e) => dragging && setFrom(e));
        svg.addEventListener('pointerup', () => (dragging = false));
        box.querySelector('.ck-ok').addEventListener('click', () => {
          if (api.locked()) return;
          const t = step.target;
          if (view.h === t.h && view.m === t.m) api.correct(`${fmtTime(t.h, t.m)}！`);
          else api.wrong(`いまは ${fmtTime(view.h, view.m)}。ながい ${rb('針', 'はり')}を まわすと みじかい ${rb('針', 'はり')}も うごくよ`);
        });
        return;
      }
      if (q.kind === 'ampm' || q.kind === 'day') {
        box.innerHTML = `<div class="ck-day"><div class="ck-band am">${rb('午前', 'ごぜん')} 0${時()}〜12${時()}</div><div class="ck-band pm">${rb('午後', 'ごご')} 0${時()}〜12${時()}</div></div>`;
        return;
      }
      const two = step && step.clock2;
      box.innerHTML = `<div class="ck-wrap">${clockSVG(q.h, q.m)}${two ? `<span class="ck-arrow">→</span>${clockSVG(two.h, two.m)}` : ''}</div>`;
    };
    view.layout = () => view.draw();
    return view;
  },
};

// ---------- ものさしであそぼう ----------
UNITS.monosashi = {
  questions(opts = {}) {
    const qs = [];
    for (let i = 0; i < 3; i++) {
      const cm = rand(3, 13);
      qs.push({ kind: 'draw', mm: opts.hard ? cm * 10 + rand(1, 9) : cm * 10, label: `${rb('線', 'せん')}を ひく` });
    }
    for (let i = 0; i < 2; i++) qs.push({ kind: 'read', len: rand(3, 14) * 10, label: `cm で はかる` });
    const a = rand(5, 14);
    let b;
    do b = rand(3, 13); while (b === a);
    qs.push({ kind: 'cmp', a: a * 10, b: b * 10, label: 'どちらが ながい？' });
    return shuffle(qs);
  },
  steps(q) {
    const 長 = rb('長', 'なが');
    switch (q.kind) {
      case 'draw':
        return [{ kind: 'draw', mm: q.mm, prompt: `ものさしの 0 から ゆびで なぞって、<b>${cmmm(q.mm)}</b> の ${rb('線', 'せん')}を ひこう`, say: 'ゆびを はなすと しらべるよ' }];
      case 'read':
        return [{ kind: 'answer', expected: q.len / 10, unit: 'cm', prompt: `${rb('色', 'いろ')}の ぼうの ${長}さは ${rb('何', 'なん')}cm？` }];
      case 'cmp': {
        const longer = q.a > q.b ? 0 : 1;
        return [
          { kind: 'choice', options: ['あ', 'い'], answer: longer, prompt: `あ と い、どちらが ${長}い？` },
          { kind: 'answer', expected: Math.abs(q.a - q.b) / 10, unit: 'cm', prompt: `${rb('何', 'なん')}cm ${長}い？` },
        ];
      }
    }
    return [];
  },
  view(box, q, api) {
    if (q.kind === 'read') return rulerView(box, { bars: [{ start: 0, len: q.len, color: '#3cb46e' }], draggable: false, shift: 0 });
    if (q.kind === 'cmp') return rulerView(box, { bars: [{ start: 0, len: q.a, color: '#ff8a3d' }, { start: 0, len: q.b, color: '#4d96ff' }], draggable: false, shift: 0 });
    // せんを ひく：ものさしの うえを なぞる
    const view = { end: 0 };
    view.draw = () => {
      box.innerHTML = '';
      const r = box.getBoundingClientRect();
      const W = Math.max(300, r.width - 30);
      const px = (W - 40) / (RULER_MM + 20);
      const left = 20 + 10 * px;
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', W);
      svg.setAttribute('height', 170);
      svg.classList.add('ruler-svg');
      let s = `<rect x="${left - 10 * px}" y="70" width="${(RULER_MM + 20) * px}" height="70" rx="6" class="ruler-body"/>`;
      for (let mm = 0; mm <= RULER_MM; mm++) {
        const x = left + mm * px;
        const h = mm % 10 === 0 ? 26 : mm % 5 === 0 ? 18 : 10;
        s += `<line x1="${x}" y1="70" x2="${x}" y2="${70 + h}" class="ruler-tick"/>`;
        if (mm % 10 === 0) s += `<text x="${x}" y="116" class="ruler-num">${mm / 10}</text>`;
      }
      s += `<line x1="${left}" y1="56" x2="${left + view.end * px}" y2="56" class="draw-line"/>`;
      s += `<circle cx="${left}" cy="56" r="5" class="draw-dot"/>`;
      s += `<text x="${left + view.end * px}" y="36" class="draw-len">${view.end ? cmmm(Math.round(view.end)) : ''}</text>`;
      svg.innerHTML = s;
      box.appendChild(svg);
      let drawing = false;
      const toMM = (e) => Math.max(0, Math.min(RULER_MM, (e.clientX - svg.getBoundingClientRect().left - left) / px));
      const follow = (e) => {
        view.end = toMM(e);
        const line = svg.querySelector('.draw-line');
        line.setAttribute('x2', left + view.end * px);
        const t = svg.querySelector('.draw-len');
        if (t) {
          t.setAttribute('x', left + view.end * px);
          t.textContent = cmmm(Math.round(view.end));
        }
      };
      svg.addEventListener('pointerdown', (e) => {
        if (api.locked()) return;
        drawing = true;
        svg.setPointerCapture(e.pointerId);
        follow(e);
      });
      svg.addEventListener('pointermove', (e) => drawing && follow(e));
      svg.addEventListener('pointerup', () => {
        if (!drawing) return;
        drawing = false;
        view.end = Math.round(view.end);
        view.draw();
        const target = api.step().mm;
        if (Math.abs(view.end - target) <= 1) api.correct(`${cmmm(target)}！ ぴったり`);
        else api.wrong(`${cmmm(view.end)} だったよ。もう いちど`);
      });
    };
    view.layout = () => view.draw();
    return view;
  },
};
