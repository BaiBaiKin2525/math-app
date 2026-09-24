// かけざんの タイルばん（SVG）。
//   よこの めもり＝1つぶんの かず、たての めもり＝いくつぶん。えらぶと ながしかくの タイルが できる。
//   2けたは 10 の くぎりで へやに わけて（20×10、3×10、20×4、3×4）べつべつに けいさんする。

const SVG_NS = 'http://www.w3.org/2000/svg';

// 23 → [20, 3]
function partsOf(n) {
  return [Math.floor(n / 10) * 10, n % 10].filter((v) => v > 0);
}

// 23 × 14 → 20×10、3×10、20×4、3×4 の へや（上の だんから じゅんに）
function splitRegions(a, b) {
  const regions = [];
  let y0 = 0;
  for (const h of partsOf(b)) {
    let x0 = 0;
    for (const w of partsOf(a)) {
      regions.push({ x0, y0, w, h });
      x0 += w;
    }
    y0 += h;
  }
  return regions;
}

// 100 の いた／よこの 10 のぼう／たての 10 のぼう／ばら で いろを かえる
function regionClass(r) {
  if (r.w >= 10 && r.h >= 10) return 'r-plate';
  if (r.w >= 10) return 'r-barx';
  if (r.h >= 10) return 'r-bary';
  return 'r-unit';
}

function createBoard(box, { xMax, yMax, split, onPick, onChange }) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('board');
  box.appendChild(svg);

  const b = {
    x: 0, y: 0,          // きまった めもり
    px: 0, py: 0,        // なぞっている とちゅうの めもり
    mode: 'none',        // none / pick-x / pick-y / free
    activeRegion: -1,
    answered: new Set(), // こたえた へや
    showAllValues: false,
    litRows: 0,
  };
  let g = null;
  let dragging = false;

  b.layout = () => {
    svg.setAttribute('width', 0);
    svg.setAttribute('height', 0);
    const r = box.getBoundingClientRect();
    const W = Math.max(160, r.width - 24);
    const H = Math.max(120, r.height - 24);
    const AX = 38;                  // めもりの おびの はば
    const RS = split ? 10 : 50;     // みぎに れつの ごうけいを かく はば
    const u = Math.min((W - AX - RS) / xMax, (H - AX - 6) / yMax);
    g = { W, H, AX, u, ox: AX + (W - AX - RS - u * xMax) / 2, oy: AX };
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    b.draw();
  };

  const n = (v) => Math.round(v * 10) / 10;
  const rect = (x, y, w, h, cls, extra = '') =>
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" class="${cls}" ${extra}/>`;
  const line = (x1, y1, x2, y2, cls) =>
    `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" class="${cls}"/>`;
  const text = (x, y, s, cls, size) =>
    `<text x="${n(x)}" y="${n(y)}" class="${cls}" font-size="${n(size)}">${s}</text>`;

  function labelStep(max) {
    if (max <= 10) return 1;
    return g.u >= 16 ? 5 : 10;
  }

  b.draw = () => {
    if (!g) return;
    const { u, ox, oy, AX } = g;
    const X = b.mode === 'pick-x' && b.px ? b.px : b.x;
    const Y = b.mode === 'pick-y' && b.py ? b.py : b.y;
    const bw = u * xMax;
    const bh = u * yMax;
    const s = [];

    // めもりの おび（いま えらぶ ほうが ひかる）
    s.push(rect(ox, oy - AX + 3, bw, AX - 6, b.mode === 'pick-x' ? 'axis active' : 'axis', 'rx="8"'));
    s.push(rect(ox - AX + 3, oy, AX - 6, bh, b.mode === 'pick-y' ? 'axis active' : 'axis', 'rx="8"'));
    if (X) s.push(rect(ox, oy - AX + 3, X * u, AX - 6, 'axis-sel', 'rx="8"'));
    if (Y) s.push(rect(ox - AX + 3, oy, AX - 6, Y * u, 'axis-sel', 'rx="8"'));

    const fs = Math.min(17, AX * 0.45);
    const sx = labelStep(xMax);
    for (let i = 1; i <= xMax; i++) {
      if (i % sx === 0 || sx === 1) s.push(text(ox + (i - 0.5) * u, oy - AX / 2, i, 'tick', fs));
    }
    const sy = labelStep(yMax);
    for (let j = 1; j <= yMax; j++) {
      if (j % sy === 0 || sy === 1) s.push(text(ox - AX / 2, oy + (j - 0.5) * u, j, 'tick', fs));
    }

    // ばんの マス
    s.push(rect(ox, oy, bw, bh, 'board-bg'));
    for (let i = 0; i <= xMax; i++) s.push(line(ox + i * u, oy, ox + i * u, oy + bh, i % 10 === 0 ? 'grid ten' : 'grid'));
    for (let j = 0; j <= yMax; j++) s.push(line(ox, oy + j * u, ox + bw, oy + j * u, j % 10 === 0 ? 'grid ten' : 'grid'));

    // タイル
    const rows = X ? (Y || 1) : 0; // よこだけ きまったら「1つぶん」の 1 れつを みせる
    const regions = split && X && Y ? splitRegions(X, Y) : null;
    if (regions && regions.length > 1) {
      regions.forEach((r, i) => {
        const dim = b.activeRegion >= 0 && i !== b.activeRegion && !b.answered.has(i);
        s.push(rect(ox + r.x0 * u, oy + r.y0 * u, r.w * u, r.h * u, `btile ${regionClass(r)}${dim ? ' dim' : ''}`));
      });
    } else if (rows) {
      for (let r = 0; r < rows; r++) {
        const cls = r < b.litRows ? 'btile lit' : r % 2 ? 'btile alt' : 'btile';
        s.push(rect(ox, oy + r * u, X * u, u, cls));
      }
    }
    // タイルの すじ（10 ごとに ふとく ＝ 10 のぼう・100 の いた）
    if (rows) {
      if (u >= 6) {
        for (let i = 1; i < X; i++) if (i % 10) s.push(line(ox + i * u, oy, ox + i * u, oy + rows * u, 'tline'));
        for (let j = 1; j < rows; j++) if (j % 10) s.push(line(ox, oy + j * u, ox + X * u, oy + j * u, 'tline'));
      }
      for (let i = 10; i < X; i += 10) s.push(line(ox + i * u, oy, ox + i * u, oy + rows * u, 'tline ten'));
      for (let j = 10; j < rows; j += 10) s.push(line(ox, oy + j * u, ox + X * u, oy + j * u, 'tline ten'));
      s.push(rect(ox, oy, X * u, rows * u, 'tile-outline'));
    }

    // へやの なまえと こたえ
    if (regions && regions.length > 1) {
      regions.forEach((r, i) => {
        const cx = ox + (r.x0 + r.w / 2) * u;
        const cy = oy + (r.y0 + r.h / 2) * u;
        const pw = r.w * u;
        const ph = r.h * u;
        const size = Math.max(11, Math.min(26, pw / 4.2, ph / 2.4));
        const showValue = b.showAllValues || b.answered.has(i);
        if (i === b.activeRegion) s.push(rect(ox + r.x0 * u, oy + r.y0 * u, pw, ph, 'region-active'));
        s.push(text(cx, showValue ? cy - size * 0.55 : cy, `${r.w}×${r.h}`, 'region-label', size));
        if (showValue) s.push(text(cx, cy + size * 0.6, `=${r.w * r.h}`, 'region-value', size));
      });
    }

    // れつごとの ごうけい（「かぞえる」）
    for (let r = 0; r < b.litRows && r < rows; r++) {
      s.push(text(ox + X * u + 8, oy + (r + 0.5) * u, X * (r + 1), 'rowsum', Math.min(u * 0.7, 22)));
    }

    // いまの めもりの かず（ふきだし）
    const bubble = (cx, cy, v) => {
      const w = String(v).length > 1 ? AX * 1.05 : AX * 0.8;
      return rect(cx - w / 2, cy - AX * 0.4, w, AX * 0.8, 'bubble', 'rx="10"') + text(cx, cy, v, 'bubble-text', AX * 0.5);
    };
    if (X) s.push(bubble(ox + (X - 0.5) * u, oy - AX / 2, X));
    if (Y) s.push(bubble(ox - AX / 2, oy + (Y - 0.5) * u, Y));

    svg.innerHTML = s.join('');
  };

  // ---------- なぞって えらぶ ----------

  function cellAt(e) {
    const r = svg.getBoundingClientRect();
    const cx = Math.ceil((e.clientX - r.left - g.ox) / g.u);
    const cy = Math.ceil((e.clientY - r.top - g.oy) / g.u);
    return [Math.min(xMax, Math.max(1, cx)), Math.min(yMax, Math.max(1, cy))];
  }

  function move(e) {
    const [cx, cy] = cellAt(e);
    let changed = false;
    if (b.mode === 'pick-x' && b.px !== cx) { b.px = cx; changed = true; }
    if (b.mode === 'pick-y' && b.py !== cy) { b.py = cy; changed = true; }
    if (b.mode === 'free' && (b.x !== cx || b.y !== cy)) {
      b.x = cx;
      b.y = cy;
      changed = true;
      if (onChange) onChange();
    }
    if (changed) {
      soundTick();
      b.draw();
    }
  }

  svg.addEventListener('pointerdown', (e) => {
    if (b.mode === 'none' || !g) return;
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    move(e);
  });
  svg.addEventListener('pointermove', (e) => {
    if (dragging) move(e);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (b.mode === 'pick-x' && b.px) onPick('x', b.px);
    else if (b.mode === 'pick-y' && b.py) onPick('y', b.py);
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  // れつごとに ひからせて 2, 4, 6 … と たしていく
  b.countRows = async (alive) => {
    b.litRows = 0;
    for (let r = 1; r <= b.y; r++) {
      if (!alive()) return false;
      b.litRows = r;
      b.draw();
      soundTick();
      await sleep(600);
    }
    return alive();
  };

  return b;
}
