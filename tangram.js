// かたち パズル：タングラム（7まいの いたで かげの かたちを うめる）
// いたは ほうがんの マスを 4つに わけた さんかく（1/4 マス）の あつまりと して あつかう。
// どの いたも かどが マスの かどに のる むきで つかう（90° ずつ まわす・うらがえす）。
// かげの かたちは こちらで きめ、こたえは とく ときに さがす（とけない かたちは でない）。

// いたの かたち（かどの ざひょう。y は した むき）。L：おおきい さんかく、M：ちゅうくらいの さんかく、
// S：ちいさい さんかく、Q：ましかく、P：へいこうしへんけい
// A：ましかくが ななめ（7まいで 4×4 の ましかく）、B：ましかくが まっすぐ（A を 45° まわして √2 ばい）
const TG_SETS = {
  A: {
    L: [[0, 0], [4, 0], [2, 2]],
    M: [[0, 0], [2, 0], [0, 2]],
    S: [[0, 0], [2, 0], [1, 1]],
    Q: [[1, 0], [2, 1], [1, 2], [0, 1]],
    P: [[1, 0], [1, 2], [0, 3], [0, 1]],
  },
  B: {
    L: [[0, 0], [4, 0], [0, 4]],
    M: [[0, 0], [4, 0], [2, 2]],
    S: [[0, 0], [2, 0], [0, 2]],
    Q: [[0, 0], [2, 0], [2, 2], [0, 2]],
    P: [[0, 0], [2, 0], [4, 2], [2, 2]],
  },
};
const TG_COLORS = { L: ['#ff8a3d', '#4d96ff'], M: ['#3cb46e'], S: ['#e2553f', '#9b6bd6'], Q: ['#f2c230'], P: ['#2bb3b1'] };
const TG_FULL = 'LLMQSSP';

// かげの かたち：pieces＝つかう いた、polys＝かたち（いくつかの たかっけいを あわせた もの）
const TG_EASY = [
  { name: 'ななめの ましかく', pieces: 'SS', polys: [[[1, 0], [2, 1], [1, 2], [0, 1]]] },
  { name: 'さんかく', pieces: 'SS', polys: [[[0, 0], [2, 0], [0, 2]]] },
  { name: 'へいこうしへんけい', pieces: 'SS', polys: [[[0, 0], [2, 0], [3, 1], [1, 1]]] },
  { name: 'ましかく', pieces: 'SSM', polys: [[[0, 0], [2, 0], [2, 2], [0, 2]]] },
  { name: 'おおきな さんかく', pieces: 'LL', polys: [[[0, 0], [4, 0], [0, 4]]] },
  { name: 'ななめの ましかく', pieces: 'LL', polys: [[[2, 0], [4, 2], [2, 4], [0, 2]]] },
  { name: 'へいこうしへんけい', pieces: 'LL', polys: [[[0, 0], [4, 0], [6, 2], [2, 2]]] },
  { name: 'やま', pieces: 'SSQ', polys: [[[0, 2], [2, 0], [4, 2]]] },
  { name: 'おおきな さんかく', pieces: 'SSQMP', polys: [[[0, 0], [4, 0], [0, 4]]] },
  { name: 'さんかく', set: 'B', pieces: 'SS', polys: [[[0, 0], [4, 0], [2, 2]]] },
  { name: 'ながしかく', set: 'B', pieces: 'SSQ', polys: [[[0, 0], [4, 0], [4, 2], [0, 2]]] },
  { name: 'だいけい', set: 'B', pieces: 'SSQ', polys: [[[2, 0], [4, 0], [6, 2], [0, 2]]] },
  { name: 'おおきな さんかく', set: 'B', pieces: 'SSM', polys: [[[0, 0], [4, 0], [0, 4]]] },
  { name: 'ながしかく', set: 'B', pieces: 'SSP', polys: [[[0, 0], [4, 0], [4, 2], [0, 2]]] },
  { name: 'ふね', set: 'B', pieces: 'MQSS', polys: [[[2, 0], [4, 0], [4, 2], [6, 2], [4, 4], [2, 4], [0, 2], [2, 2]]] },
];
const TG_SHAPES = [
  { name: 'ましかく', polys: [[[0, 0], [4, 0], [4, 4], [0, 4]]] },
  { name: 'おおきな さんかく', polys: [[[0, 4], [4, 0], [8, 4]]] },
  { name: 'ふね', polys: [[[4, 0], [4, 4], [6, 4], [4, 6], [2, 6], [0, 4]]] },
  { name: 'ななめの ながしかく', polys: [[[2, 0], [6, 4], [4, 6], [0, 2]]] },
  { name: 'ながしかく', set: 'B', polys: [[[0, 0], [8, 0], [8, 4], [0, 4]]] },
  { name: 'いえ', set: 'B', polys: [[[0, 4], [4, 0], [8, 4], [6, 4], [6, 8], [2, 8], [2, 4]]] },
  { name: 'やじるし', set: 'B', polys: [[[0, 4], [4, 0], [8, 4], [5, 4], [5, 12], [3, 12], [3, 4]]] },
  { name: 'T の じ', set: 'B', polys: [[[0, 0], [8, 0], [8, 2], [6, 2], [6, 6], [2, 6], [2, 2], [0, 2]]] },
  { name: 'L の じ', set: 'B', polys: [[[0, 0], [4, 0], [4, 4], [8, 4], [8, 6], [0, 6]]] },
  { name: 'ヨット', set: 'B', polys: [[[1, 4], [5, 0], [9, 4], [10, 4], [8, 6], [2, 6], [0, 4]]] },
  { name: 'ちょうちょ', set: 'B', polys: [[[0, 0], [4, 4], [8, 0], [8, 8], [4, 4], [0, 8]]] },
  { name: 'ロケット', set: 'B', polys: [[[4, 0], [6, 2], [6, 6], [8, 8], [0, 8], [2, 6], [2, 2]]] },
  { name: 'ひしがた', set: 'B', polys: [[[4, 0], [8, 4], [4, 8], [0, 4]]] },
  { name: 'コップ', set: 'B', polys: [[[0, 0], [8, 0], [6, 2], [6, 4], [8, 6], [0, 6], [2, 4], [2, 2]]] },
  { name: 'だいけい', set: 'B', polys: [[[2, 0], [6, 0], [10, 4], [-2, 4]]] },
  { name: 'へいこうしへんけい', set: 'B', polys: [[[4, 0], [12, 0], [8, 4], [0, 4]]] },
  { name: 'いす', set: 'B', polys: [[[0, 0], [2, 0], [2, 4], [8, 4], [8, 8], [6, 8], [6, 6], [2, 6], [2, 8], [0, 8]]] },
  { name: 'ねこの かお', set: 'B', polys: [[[0, 0], [2, 2], [6, 2], [8, 0], [8, 4], [6, 6], [2, 6], [0, 4]]] },
  { name: 'じどうしゃ', set: 'B', polys: [[[2, 0], [6, 0], [8, 2], [10, 2], [10, 4], [0, 4], [0, 2]]] },
];

// ---------- 1/4 マス（q：0 うえ・1 みぎ・2 した・3 ひだり） ----------

const TG_CENTER = [[0.5, 1 / 6], [5 / 6, 0.5], [0.5, 5 / 6], [1 / 6, 0.5]];

function tgInside(polys, x, y) {
  let inside = false;
  for (const poly of polys) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

// かたちに はいる 1/4 マスの リスト [x, y, q]
function tgQuarters(polys) {
  const pts = polys.flat();
  const x1 = Math.max(...pts.map((p) => p[0])), y1 = Math.max(...pts.map((p) => p[1]));
  const out = [];
  for (let y = Math.min(...pts.map((p) => p[1])); y < y1; y++) {
    for (let x = Math.min(...pts.map((p) => p[0])); x < x1; x++) {
      for (let q = 0; q < 4; q++) {
        if (tgInside(polys, x + TG_CENTER[q][0], y + TG_CENTER[q][1])) out.push([x, y, q]);
      }
    }
  }
  return out;
}

const tgNorm = (pts) => {
  const x0 = Math.min(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1]));
  return pts.map(([x, y]) => [x - x0, y - y0]);
};
const tgRotate = (pts) => tgNorm(pts.map(([x, y]) => [-y, x]));   // とけいまわりに 90°
const tgFlip = (pts) => tgNorm(pts.map(([x, y]) => [-x, y]));
const tgSize = (pts) => [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];

// いたの むき 8つ（おなじ かたちに なる むきは 1つに まとめる）
function tgOrients(type, set) {
  const seen = new Set();
  const out = [];
  let pts = TG_SETS[set][type];
  for (let f = 0; f < 2; f++) {
    for (let r = 0; r < 4; r++) {
      const qs = tgQuarters([pts]);
      const key = qs.map((q) => q.join(',')).sort().join(' ');
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ pts, qs });
      }
      pts = tgRotate(pts);
    }
    pts = tgFlip(pts);
  }
  return out;
}

// かげを ぴったり うめる おきかたを 1つ さがす（[{ type, pts, x, y }]）。ない ときは null
function tgSolve(polys, pieceStr, set = 'A') {
  const target = new Set(tgQuarters(polys).map((q) => q.join(',')));
  const order = [...target].map((k) => k.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2]);
  const types = [...pieceStr];
  if (types.reduce((s, t) => s + tgQuarters([TG_SETS[set][t]]).length, 0) !== target.size) return null;
  const orients = {};
  for (const t of new Set(types)) orients[t] = tgOrients(t, set);
  const used = new Set();
  const done = new Array(types.length).fill(false);
  const out = [];
  let steps = 0;
  const go = () => {
    if (++steps > 200000) return false;
    const first = order.find((q) => !used.has(q.join(',')));
    if (!first) return true;
    const tried = new Set();
    for (let i = 0; i < types.length; i++) {
      if (done[i] || tried.has(types[i])) continue;
      tried.add(types[i]);
      for (const o of orients[types[i]]) {
        for (const [ax, ay, aq] of o.qs) {
          if (aq !== first[2]) continue;
          const dx = first[0] - ax, dy = first[1] - ay;
          const keys = o.qs.map(([x, y, q]) => `${x + dx},${y + dy},${q}`);
          if (!keys.every((k) => target.has(k) && !used.has(k))) continue;
          keys.forEach((k) => used.add(k));
          done[i] = true;
          out.push({ type: types[i], pts: o.pts, x: dx, y: dy });
          if (go()) return true;
          out.pop();
          done[i] = false;
          keys.forEach((k) => used.delete(k));
        }
      }
    }
    return false;
  };
  return go() ? out : null;
}

if (typeof UNITS !== 'undefined') {
  UNITS.tangram = {
    // stage 0：いた 2〜5まい、1：7まい（いたの せんが みえる）、2：7まい（かげだけ）
    questions({ stage = 1 } = {}) {
      const list = stage === 0 ? TG_EASY : TG_SHAPES;
      return shuffle(list).slice(0, 5).map((s) => ({
        kind: 'tangram', shape: s, hint: stage < 2, label: `タングラム「${s.name}」`,
      }));
    },

    steps(q) {
      return [{
        kind: 'tangram',
        prompt: `いたを ぜんぶ つかって、「${q.shape.name}」の ${rb('形', 'かたち')}を ぴったり うめよう`,
        say: 'いたを ゆびで うごかして、かげの うえで はなすと ぴたっと はまるよ。タップで まわす',
      }];
    },

    view(box, q, api) {
      const shape = q.shape;
      const pieceStr = shape.pieces || TG_FULL;
      const target = new Set(tgQuarters(shape.polys).map((k) => k.join(',')));
      const set = shape.set || 'A';
      const solution = q.hint ? tgSolve(shape.polys, pieceStr, set) : null;
      const pts0 = shape.polys.flat();
      const ox = Math.min(...pts0.map((p) => p[0])), oy = Math.min(...pts0.map((p) => p[1]));
      const polys = shape.polys.map((poly) => poly.map(([x, y]) => [x - ox, y - oy]));
      const [bw, bh] = tgSize(pts0.map(([x, y]) => [x - ox, y - oy]));
      const used = {};
      // いた：pts（いまの むき）、at（ばんの うえの いち）、free（ばんの そとの いち。マスの たんい）
      const pieces = [...pieceStr].map((type, id) => {
        const n = used[type] = (used[type] || 0) + 1;
        let pts = TG_SETS[set][type];
        for (let k = rand(0, 3); k > 0; k--) pts = tgRotate(pts);
        return { id, type, pts, color: TG_COLORS[type][n - 1], at: null, free: null };
      });
      const view = {};
      let last = null;
      let geo = null;
      let done = false;
      const NS = 'http://www.w3.org/2000/svg';

      const quartersOf = (p) => (p.at ? tgQuarters([p.pts]).map(([x, y, qq]) => `${x + p.at.x + ox},${y + p.at.y + oy},${qq}`) : []);
      function cover() {
        const m = new Map();
        for (const p of pieces) for (const k of quartersOf(p)) m.set(k, (m.get(k) || 0) + 1);
        return m;
      }
      const badKey = (k, m) => !target.has(k) || m.get(k) > 1;

      function layoutTray() {
        let x = 0, y = 0, rowH = 0;
        for (const p of pieces) {
          if (p.at || p.free) continue;
          const [w, h] = tgSize(p.pts);
          if (x + w > geo.trayCols && x > 0) { x = 0; y += rowH + 0.5; rowH = 0; }
          p.free = { x: geo.trayX + x, y: geo.trayY + y };
          x += w + 0.5;
          rowH = Math.max(rowH, h);
        }
      }

      const polyAttr = (pts, u) => pts.map(([x, y]) => `${x * u},${y * u}`).join(' ');

      view.draw = () => {
        box.innerHTML = '';
        const cs = getComputedStyle(box);
        const W = (box.clientWidth || 600) - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
        const H = (box.clientHeight || 400) - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0);
        // いちばん おおきく できる 1マスの おおきさ（したの ボタンの ぶんは あける）（ばんの よこ か した に いたを ならべる）
        const pack = (cols) => {
          let x = 0, y = 0, rowH = 0, maxW = 0;
          for (const p of pieces) {
            const [w, h] = tgSize(p.pts);
            if (x + w > cols && x > 0) { x = 0; y += rowH + 0.5; rowH = 0; }
            x += w + 0.5;
            maxW = Math.max(maxW, x - 0.5);
            rowH = Math.max(rowH, h);
          }
          return { w: maxW, h: y + rowH };
        };
        let best = null;
        for (let u = 64; u >= 14 && !best; u -= 2) {
          const cw = (W - 20) / u, ch = (H - 70) / u;
          for (const wide of [true, false]) {
            const trayCols = Math.floor(wide ? cw - bw - 1 : cw);
            if (trayCols < 4) continue;
            const t = pack(trayCols);
            const ok = wide ? Math.max(bh, t.h) <= ch : bh + 1 + t.h <= ch;
            if (ok && t.w <= trayCols && (wide || bw <= cw)) { best = { u, wide, trayCols }; break; }
          }
        }
        best = best || { u: 14, wide: false, trayCols: Math.floor((W - 20) / 14) };
        const { u, wide } = best;
        geo = { u, bx: 10, by: 10, trayX: wide ? bw + 1 : 0, trayY: wide ? 0 : bh + 1, trayCols: best.trayCols };
        layoutTray();

        const stage = document.createElement('div');
        stage.className = 'pz-stage';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'tg-svg');
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        const add = (parent, tag, attrs) => {
          const el = document.createElementNS(NS, tag);
          for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
          parent.appendChild(el);
          return el;
        };
        // かげ
        const board = add(svg, 'g', { transform: `translate(${geo.bx},${geo.by})` });
        for (const poly of polys) add(board, 'polygon', { points: polyAttr(poly, u), class: 'tg-shadow' });
        if (solution) {
          for (const s of solution) {
            add(board, 'polygon', { points: polyAttr(s.pts.map(([x, y]) => [x + s.x - ox, y + s.y - oy]), u), class: 'tg-hint' });
          }
        }
        // いた
        const m = cover();
        const ordered = [...pieces].sort((a, b) => (b.at ? 1 : 0) - (a.at ? 1 : 0) || (a === last) - (b === last));
        for (const p of ordered) svg.appendChild(pieceEl(p, m));
        // かさなり・はみだしは あかく
        const bad = add(svg, 'g', { transform: `translate(${geo.bx - ox * u},${geo.by - oy * u})`, class: 'tg-bad' });
        for (const [k, n] of m) {
          if (!badKey(k, m)) continue;
          const [x, y, qq] = k.split(',').map(Number);
          const c = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
          add(bad, 'polygon', { points: polyAttr([c[qq], c[(qq + 1) % 4], [x + 0.5, y + 0.5]], u) });
        }
        stage.appendChild(svg);
        const tools = document.createElement('div');
        tools.className = 'pz-tools2';
        tools.innerHTML = '<button class="small-btn" data-t="flip">↔ うらがえす</button><button class="small-btn" data-t="reset">↩ ぜんぶ もどす</button>';
        tools.querySelector('[data-t=flip]').addEventListener('click', () => {
          if (!last) return api.say('さきに いたを さわってね', true);
          turn(last, tgFlip);
        });
        tools.querySelector('[data-t=reset]').addEventListener('click', () => {
          if (api.locked()) return;
          pieces.forEach((p) => { p.at = null; p.free = null; });
          api.tick();
          view.draw();
        });
        stage.appendChild(tools);
        box.appendChild(stage);
      };

      function pieceEl(p, m) {
        const { u, bx, by } = geo;
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'tg-pc' + (last === p ? ' last' : ''));
        const x = bx + (p.at ? p.at.x : p.free.x) * u;
        const y = by + (p.at ? p.at.y : p.free.y) * u;
        g.setAttribute('transform', `translate(${x},${y})`);
        const poly = document.createElementNS(NS, 'polygon');
        poly.setAttribute('points', polyAttr(p.pts, u));
        poly.setAttribute('fill', p.color);
        g.appendChild(poly);
        g.addEventListener('pointerdown', (e) => {
          if (api.locked()) return;
          e.preventDefault();
          g.parentNode.appendChild(g); // いちばん うえに（つかむ まえに うごかす。あとだと つかんだ ゆびが はなれる）
          try { g.setPointerCapture(e.pointerId); } catch { /* ゆび いがい */ }
          last = p;
          g.classList.add('drag');
          const start = { x: e.clientX, y: e.clientY, left: x, top: y };
          const [pw, ph] = tgSize(p.pts);
          const lim = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
          const pos = (ev) => ({
            left: lim(start.left + ev.clientX - start.x, 0, (box.clientWidth || 600) - pw * u),
            top: lim(start.top + ev.clientY - start.y, 0, (box.clientHeight || 400) - ph * u),
          });
          let moved = false;
          const move = (ev) => {
            if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) moved = true;
            const q2 = pos(ev);
            g.setAttribute('transform', `translate(${q2.left},${q2.top})`);
          };
          const up = (ev) => {
            g.removeEventListener('pointermove', move);
            g.removeEventListener('pointerup', up);
            g.removeEventListener('pointercancel', up);
            if (!moved) return turn(p, tgRotate);
            const q2 = pos(ev);
            drop(p, q2.left, q2.top);
          };
          g.addEventListener('pointermove', move);
          g.addEventListener('pointerup', up);
          g.addEventListener('pointercancel', up);
        });
        return g;
      }

      // はなした ところ：かげに すこしでも かかれば、いちばん ちかい マスの かどに はまる
      function drop(p, left, top) {
        const { u, bx, by } = geo;
        const x = Math.round((left - bx) / u), y = Math.round((top - by) / u);
        const [w, h] = tgSize(p.pts);
        if (x < bw && y < bh && x + w > 0 && y + h > 0) {
          p.at = { x, y };
          p.free = null;
        } else {
          p.at = null;
          p.free = { x: (left - bx) / u, y: (top - by) / u };
        }
        api.tick();
        view.draw();
        check();
      }

      function turn(p, fn) {
        if (api.locked()) return;
        const [w0, h0] = tgSize(p.pts);
        p.pts = fn(p.pts);
        const [w1, h1] = tgSize(p.pts);
        const dx = Math.round((w0 - w1) / 2), dy = Math.round((h0 - h1) / 2);
        if (p.at) p.at = { x: p.at.x + dx, y: p.at.y + dy };
        else if (p.free) p.free = { x: p.free.x + dx, y: p.free.y + dy };
        last = p;
        api.tick();
        view.draw();
        check();
      }

      function check() {
        if (done || !pieces.every((p) => p.at)) return;
        const m = cover();
        const bad = [...m.keys()].some((k) => badKey(k, m));
        const full = [...target].every((k) => m.get(k) === 1);
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
}

// メニュー：「かたち パズル」（タングラム 3つ ＋ へいめん パズル 3つ）
if (typeof LEVELS !== 'undefined') {
  const group = 'かたち パズル';
  const list = [
    ['tg-1', 'tangram', 'ちいさい タングラム', 'いた 2〜5まい', () => UNITS.tangram.questions({ stage: 0 })],
    ['tg-2', 'tangram', 'タングラム', `7まい・いたの ${rb('線', 'せん')}が みえる`, () => UNITS.tangram.questions({ stage: 1 })],
    ['tg-3', 'tangram', 'タングラム（かげだけ）', '7まい・ヒント なし', () => UNITS.tangram.questions({ stage: 2 })],
    ['hm-1', 'pazuru', '4マスの パズル', 'へいめん パズル・いた 3〜4まい', () => UNITS.pazuru.questions({ heimen: 0 })],
    ['hm-2', 'pazuru', '5マスの パズル', 'へいめん パズル・いた 4〜5まい', () => UNITS.pazuru.questions({ heimen: 1 })],
    ['hm-3', 'pazuru', '5マスの おおきな パズル', 'へいめん パズル・いた 6〜7まい', () => UNITS.pazuru.questions({ heimen: 2 })],
  ];
  const at = LEVELS.findIndex((l) => l.type === 'free');
  LEVELS.splice(at < 0 ? LEVELS.length : at, 0, ...list.map(([id, type, title, desc, make], i) => ({
    id, type, group, title: `${String.fromCharCode(0x2460 + i)} ${title}`, desc, make,
  })));
}

if (typeof module !== 'undefined') module.exports = { TG_SETS, TG_EASY, TG_SHAPES, TG_FULL, tgQuarters, tgSolve };
