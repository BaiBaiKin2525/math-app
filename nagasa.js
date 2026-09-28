// じゅけんの どだい（2年）③「長さをはかろう」
// SAPIX 2年「長さをはかろう」の テーマに あわせた オリジナルの もんだい。
//   ものさしを ずらして はかる／cm と mm・m と cm の いいかえ／長さの たしざん

const RULER_MM = 150;
const BAR_COLORS = ['#ff8a3d', '#4d96ff', '#3cb46e', '#e2553f', '#9b6bd6'];
const cmmm = (mm) => (mm % 10 ? `${Math.floor(mm / 10)}cm${mm % 10}mm` : `${mm / 10}cm`);

UNITS.nagasa = {
  questions(opts = {}) {
    if (opts.hard) {
      // チャレンジ：ものさしは うごかせない（はしが 0 では ない）、ひきざん、0 の はいる m・cm
      const qs = [];
      for (let i = 0; i < 3; i++) {
        const len = rand(22, 95);
        qs.push({ kind: 'measureFixed', len, start: rand(12, 145 - len), color: BAR_COLORS[i], label: `うごかない ものさし（${cmmm(len)}）` });
      }
      for (let i = 0; i < 3; i++) {
        const x = rand(6, 13) * 10 + rand(0, 5);
        const y = rand(2, Math.floor(x / 10) - 2) * 10 + rand((x % 10) + 1, 9);
        qs.push({ kind: 'sub', x, y, label: `${cmmm(x)} − ${cmmm(y)}` });
      }
      const c = rand(1, 3) * 100 + rand(1, 9);
      qs.push({ kind: 'toCM', cm: c, label: `${Math.floor(c / 100)}m${c % 100}cm = □cm` });
      const m1 = rand(3, 5) * 100 + rand(1, 4) * 10;
      const m2 = rand(1, 2) * 100 + rand(5, 9) * 10;
      qs.push({ kind: 'msub', x: m1, y: m2, cm: m1, label: `${Math.floor(m1 / 100)}m${m1 % 100}cm − ${Math.floor(m2 / 100)}m${m2 % 100}cm` });
      return shuffle(qs);
    }
    const qs = [];
    for (let i = 0; i < 4; i++) {
      const len = rand(25, 125);
      qs.push({ kind: 'measure', len, start: rand(8, 145 - len), shift: rand(-30, 30) || 12, color: BAR_COLORS[i % 5], label: `${rb('長', 'なが')}さを はかる（${cmmm(len)}）` });
    }
    const a = rand(2, 9) * 10 + rand(1, 9);
    qs.push({ kind: 'toMM', mm: a, label: `${cmmm(a)} = □mm` });
    const b = rand(2, 12) * 10 + rand(1, 9);
    qs.push({ kind: 'toCMMM', mm: b, label: `${b}mm = □cm□mm` });
    const c = rand(1, 3) * 100 + rand(1, 9) * 10;
    qs.push({ kind: 'toCM', cm: c, label: `${Math.floor(c / 100)}m${c % 100}cm = □cm` });
    const d = rand(1, 4) * 100 + rand(5, 95);
    qs.push({ kind: 'toMCM', cm: d, label: `${d}cm = □m□cm` });
    for (let i = 0; i < 2; i++) {
      const x = rand(2, 6) * 10 + rand(4, 9);
      const y = rand(2, 6) * 10 + rand(10 - (x % 10), 9);
      qs.push({ kind: 'add', x, y, label: `${cmmm(x)} + ${cmmm(y)}` });
    }
    return shuffle(qs);
  },

  steps(q) {
    const 長 = rb('長', 'なが');
    const 何 = rb('何', 'なん');
    switch (q.kind) {
      case 'measure':
        return [
          {
            kind: 'answer', expected: Math.floor(q.len / 10), unit: 'cm',
            prompt: `ものさしを ゆびで ずらして、${rb('色', 'いろ')}の ぼうの ${長}さを はかろう。${何}cm${何}mm？`,
            say: 'ものさしの 0 を ぼうの はしに あわせよう',
          },
          { kind: 'answer', expected: q.len % 10, before: `${Math.floor(q.len / 10)}cm`, unit: 'mm', prompt: `のこりは ${何}mm？` },
        ];
      case 'measureFixed': {
        const s = q.start;
        return [
          {
            kind: 'answer', expected: Math.floor(q.len / 10), unit: 'cm',
            prompt: `ものさしは うごかせないよ。ぼうの はしが 0 では ない。${長}さは ${何}cm${何}mm？`,
            say: `はじまりと おわりの めもりを よんで、ちがいを ${rb('考', 'かんが')}えよう（はじまりは ${cmmm(s)}）`,
          },
          { kind: 'answer', expected: q.len % 10, before: `${Math.floor(q.len / 10)}cm`, unit: 'mm', prompt: `のこりは ${何}mm？` },
        ];
      }
      case 'sub': {
        const t = q.x - q.y;
        return [
          {
            kind: 'answer', expected: Math.floor(t / 10), before: `${cmmm(q.x)} − ${cmmm(q.y)} =`, unit: 'cm',
            prompt: `${長}い ぼうと みじかい ぼうの ちがいは？ mm が ひけない ときは 1cm を 10mm に しよう`,
          },
          { kind: 'answer', expected: t % 10, before: `${cmmm(q.x)} − ${cmmm(q.y)} = ${Math.floor(t / 10)}cm`, unit: 'mm', prompt: 'のこりは？' },
        ];
      }
      case 'msub': {
        const t = q.x - q.y;
        const f = (v) => `${Math.floor(v / 100)}m${v % 100}cm`;
        return [
          { kind: 'answer', expected: Math.floor(t / 100), before: `${f(q.x)} − ${f(q.y)} =`, unit: 'm', prompt: `cm が ひけない ときは 1m を 100cm に しよう` },
          { kind: 'answer', expected: t % 100, before: `${f(q.x)} − ${f(q.y)} = ${Math.floor(t / 100)}m`, unit: 'cm', prompt: 'のこりは？' },
        ];
      }
      case 'toMM':
        return [{ kind: 'answer', expected: q.mm, before: `${cmmm(q.mm)} =`, unit: 'mm', prompt: `1cm は 10mm。${何}mm に なる？` }];
      case 'toCMMM':
        return [
          { kind: 'answer', expected: Math.floor(q.mm / 10), before: `${q.mm}mm =`, unit: 'cm', prompt: `10mm で 1cm。${q.mm}mm は ${何}cm${何}mm？` },
          { kind: 'answer', expected: q.mm % 10, before: `${q.mm}mm = ${Math.floor(q.mm / 10)}cm`, unit: 'mm', prompt: 'のこりは？' },
        ];
      case 'toCM':
        return [{ kind: 'answer', expected: q.cm, before: `${Math.floor(q.cm / 100)}m${q.cm % 100}cm =`, unit: 'cm', prompt: `1m は 100cm。${何}cm に なる？` }];
      case 'toMCM':
        return [
          { kind: 'answer', expected: Math.floor(q.cm / 100), before: `${q.cm}cm =`, unit: 'm', prompt: `100cm で 1m。${q.cm}cm は ${何}m${何}cm？` },
          { kind: 'answer', expected: q.cm % 100, before: `${q.cm}cm = ${Math.floor(q.cm / 100)}m`, unit: 'cm', prompt: 'のこりは？' },
        ];
      case 'add': {
        const t = q.x + q.y;
        return [
          {
            kind: 'answer', expected: Math.floor(t / 10), before: `${cmmm(q.x)} + ${cmmm(q.y)} =`, unit: 'cm',
            prompt: `2本の ぼうを つなげた ${長}さは？ mm どうしを たして 10mm を こえたら 1cm に なるよ`,
          },
          { kind: 'answer', expected: t % 10, before: `${cmmm(q.x)} + ${cmmm(q.y)} = ${Math.floor(t / 10)}cm`, unit: 'mm', prompt: 'のこりは？' },
        ];
      }
    }
    return [];
  },

  view(box, q) {
    if (q.kind === 'toCM' || q.kind === 'toMCM' || q.kind === 'msub') return meterView(box, q);
    let bars;
    if (q.kind === 'measure' || q.kind === 'measureFixed') bars = [{ start: q.start, len: q.len, color: q.color }];
    else if (q.kind === 'sub') bars = [{ start: 0, len: q.x, color: '#ff8a3d' }, { start: 0, len: q.y, color: '#4d96ff' }];
    else if (q.kind === 'add') bars = [{ start: 0, len: q.x, color: '#ff8a3d' }, { start: q.x, len: q.y, color: '#4d96ff' }];
    else bars = [{ start: 0, len: q.mm, color: '#3cb46e' }];
    // はかる もんだいは ものさしが ずれている ところから（ゆびで うごかす）
    return rulerView(box, { bars, draggable: q.kind === 'measure', shift: q.kind === 'measure' ? q.start + q.shift : 0 });
  },
};

// ものさし（SVG）。bars：[{ start, len, color }]（mm）
function rulerView(box, { bars, draggable, shift }) {
  const view = { rulerMM: shift }; // ものさしの 0 が ある ばしょ（mm）
  const NS = 'http://www.w3.org/2000/svg';
  let svg;
  let g;
  let px = 3;
  let left = 20;

  view.draw = () => {
    box.innerHTML = '';
    const r = box.getBoundingClientRect();
    const W = Math.max(300, r.width - 30);
    px = (W - 40) / (RULER_MM + 20);
    left = 20 + 10 * px;
    const H = Math.min(260, 120 + bars.length * 40);
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.classList.add('ruler-svg');
    let s = '';
    bars.forEach((b, i) => {
      const x = left + b.start * px;
      const y = 20 + i * 10;
      const w = b.len * px;
      // えんぴつ の ような ぼう（さきは とがる）
      s += `<rect x="${x}" y="${y}" width="${Math.max(0, w - 14)}" height="26" rx="4" fill="${b.color}"/>`;
      s += `<polygon points="${x + w - 14},${y} ${x + w},${y + 13} ${x + w - 14},${y + 26}" fill="#f3d9b1"/>`;
      s += `<line x1="${x}" y1="${y + 30}" x2="${x}" y2="${H}" class="ruler-guide"/>`;
      s += `<line x1="${x + w}" y1="${y + 30}" x2="${x + w}" y2="${H}" class="ruler-guide"/>`;
    });
    svg.innerHTML = s;
    g = document.createElementNS(NS, 'g');
    g.classList.add('ruler-g');
    if (draggable) g.classList.add('draggable');
    const top = 40 + bars.length * 10 + 26;
    let t = `<rect x="-${10 * px}" y="${top}" width="${(RULER_MM + 20) * px}" height="70" rx="6" class="ruler-body"/>`;
    for (let mm = 0; mm <= RULER_MM; mm++) {
      const x = mm * px;
      const h = mm % 10 === 0 ? 26 : mm % 5 === 0 ? 18 : 10;
      t += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + h}" class="ruler-tick"/>`;
      if (mm % 10 === 0) t += `<text x="${x}" y="${top + 46}" class="ruler-num">${mm / 10}</text>`;
    }
    t += `<text x="${(RULER_MM + 6) * px}" y="${top + 62}" class="ruler-unit">cm</text>`;
    g.innerHTML = t;
    svg.appendChild(g);
    box.appendChild(svg);
    place();
    if (draggable) {
      let startX = null;
      let startMM = 0;
      g.addEventListener('pointerdown', (e) => {
        startX = e.clientX;
        startMM = view.rulerMM;
        g.setPointerCapture(e.pointerId);
      });
      g.addEventListener('pointermove', (e) => {
        if (startX === null) return;
        view.rulerMM = startMM + (e.clientX - startX) / px;
        place();
      });
      const end = () => {
        if (startX === null) return;
        startX = null;
        // 1mm ずつに そろえる
        view.rulerMM = Math.round(view.rulerMM);
        place();
      };
      g.addEventListener('pointerup', end);
      g.addEventListener('pointercancel', end);
    }
  };

  function place() {
    g.setAttribute('transform', `translate(${left + view.rulerMM * px}, 0)`);
  }

  view.layout = () => view.draw();
  return view;
}

// 1m の ものさし（100cm ずつの まとまり）
function meterView(box, q) {
  const view = {};
  view.draw = () => {
    box.innerHTML = '';
    const m = Math.floor(q.cm / 100);
    const rest = q.cm % 100;
    const wrap = document.createElement('div');
    wrap.className = 'meter-wrap';
    let html = '';
    for (let i = 0; i < m; i++) html += '<div class="meter-bar full"><span>1m = 100cm</span></div>';
    html += `<div class="meter-bar part" style="width:${rest}%"><span>${rest}cm</span></div>`;
    wrap.innerHTML = html;
    box.appendChild(wrap);
  };
  view.layout = () => view.draw();
  return view;
}
