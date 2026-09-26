// おおきい かずの たしざん（ひっさん）。くらいごとに タイルを ならべる：
//   いち＝ちいさい しかく、じゅう＝10 のぼう、ひゃく＝100 の いた。
//   10 こ あつまったら となりの くらいへ 1 つ くりあがる（きいろ）。

const PLACE_NAMES = ['いち', 'じゅう', 'ひゃく', 'せん'];
const digitAt = (n, p) => Math.floor(n / 10 ** p) % 10;
const lenOf = (n) => String(n).length;

// くらいごとの けいさん。auto：くりあがり だけで できた くらい（こたえに そのまま かく）
function addColumns(a, b) {
  const n = lenOf(a + b);
  const top = Math.max(lenOf(a), lenOf(b));
  const cols = [];
  let carry = 0;
  for (let p = 0; p < n; p++) {
    const da = p < lenOf(a) ? digitAt(a, p) : 0;
    const db = p < lenOf(b) ? digitAt(b, p) : 0;
    const sum = carry + da + db;
    cols.push({ place: p, da, db, carryIn: carry, sum, auto: p >= top });
    carry = sum >= 10 ? 1 : 0;
  }
  return cols;
}

// タイルの かたち（u＝ちいさい しかくの 1 ぺん）と、1 だんに ならべる かず
const PV_ITEMS = [
  { kind: 'unit', w: 1, h: 1, cap: 5 },
  { kind: 'bar', w: 1, h: 10, cap: 10 },
  { kind: 'plate', w: 10, h: 10, cap: 3 },
  { kind: 'plate', w: 10, h: 10, cap: 3 },
];

// tiles: false なら タイルを ださず、ひっさんを おおきく かく
function createPlaceValueView(box, q, { tiles = true } = {}) {
  const cols = addColumns(q.a, q.b);
  const n = cols.length;
  const view = {
    active: -1,
    done: new Set(),
    written: {},          // くらい → こたえに かいた すうじ
    carried: new Set(),   // くりあがりが とどいた くらい
    gone: {},             // くらい → となりへ いった こすう
    popPlace: -1,
  };

  // くらい p の 2 だん（うえ＝くりあがり＋a、した＝b）
  function rows(p) {
    const c = cols[p];
    const rowA = [];
    const rowB = [];
    if (view.carried.has(p)) rowA.push('k');
    for (let i = 0; i < c.da; i++) rowA.push('a');
    for (let i = 0; i < c.db; i++) rowB.push('b');
    return [rowA, rowB];
  }

  // ばに おさまる いちばん おおきい u を さがす
  function fit(W, H) {
    for (let u = 26; u >= 3; u -= 0.5) {
      const g = Math.max(2, u * 0.3);
      let totalW = 40; // 「+」の れつ
      let maxH = 0;
      const widths = [];
      for (let p = n - 1; p >= 0; p--) {
        const it = PV_ITEMS[p];
        const c = cols[p];
        const nA = c.da + c.carryIn;
        const nB = c.db;
        const perRow = Math.min(it.cap, Math.max(nA, nB, 1));
        const colW = perRow * it.w * u + (perRow - 1) * g + 12; // 12 = わくの すきま（padding）
        const rowH = (k) => Math.max(1, Math.ceil(k / it.cap)) * (it.h * u + g);
        widths.push(Math.max(colW, 60));
        totalW += Math.max(colW, 60) + 28;
        maxH = Math.max(maxH, rowH(nA) + rowH(nB));
      }
      if (totalW <= W && maxH + 90 <= H) return { u, g, widths };
    }
    return { u: 3, g: 2, widths: cols.map(() => 60) };
  }

  view.draw = () => {
    box.innerHTML = '';
    if (!tiles) {
      box.innerHTML = `<div class="hissan-big">${view.hissanHTML()}</div>`;
      return;
    }
    const r = box.getBoundingClientRect();
    const { u, g, widths } = fit(r.width - 30, r.height - 30);
    box.style.setProperty('--u', `${u}px`);
    box.style.setProperty('--g', `${g}px`);

    const grid = document.createElement('div');
    grid.className = 'pv';
    grid.style.gridTemplateColumns = `28px ${widths.map((w) => `${w}px`).join(' ')}`;

    const places = [...Array(n).keys()].reverse();
    const stateCls = (p) => (p === view.active ? ' active' : view.done.has(p) ? ' done' : '');
    const cell = (cls, html) => {
      const d = document.createElement('div');
      d.className = cls;
      if (html !== undefined) d.innerHTML = html;
      grid.appendChild(d);
      return d;
    };

    cell('pv-op');
    for (const p of places) cell(`pv-head${stateCls(p)}`, `${PLACE_NAMES[p]}の くらい`);

    for (const rowIndex of [0, 1]) {
      cell('pv-op', rowIndex === 1 ? '+' : '');
      for (const p of places) {
        const c = cell(`pv-cell${stateCls(p)}${rowIndex === 1 ? ' lower' : ''}`);
        const it = PV_ITEMS[p];
        c.style.maxWidth = `${widths[places.length - 1 - p]}px`;
        const [rowA, rowB] = rows(p);
        const list = rowIndex === 0 ? rowA : rowB;
        const offset = rowIndex === 0 ? 0 : rowA.length; // きえる じゅんばんは うえの だんから
        list.forEach((who, i) => {
          const el = document.createElement('div');
          el.className = `pv-item ${it.kind} ${who}`;
          if (offset + i < (view.gone[p] || 0)) el.classList.add('gone');
          if (who === 'k' && p === view.popPlace) el.classList.add('pop');
          c.appendChild(el);
        });
      }
    }
    box.appendChild(grid);
    view.popPlace = -1;
  };

  view.layout = () => view.draw();

  // くらい p の こたえが でた：ひっさんに かいて、10 こ あれば となりへ くりあげる
  view.resolve = (p) => {
    const c = cols[p];
    view.written[p] = c.sum % 10;
    view.done.add(p);
    if (c.sum >= 10) {
      view.gone[p] = 10;
      view.carried.add(p + 1);
      view.popPlace = p + 1;
      const next = cols[p + 1];
      if (next && next.auto) {
        view.written[p + 1] = next.sum % 10;
        view.done.add(p + 1);
      }
    }
    view.draw();
  };

  // みぎに だす ひっさん
  view.hissanHTML = () => {
    const places = [...Array(n).keys()].reverse();
    const cell = (content, p, extra = '') =>
      `<span class="h-cell${p === view.active ? ' act' : ''}${extra}">${content}</span>`;
    const digitOr = (num, p) => (p < lenOf(num) ? digitAt(num, p) : '');
    let h = `<div class="hissan" style="grid-template-columns: .9em repeat(${n}, 1.15em)">`;
    h += '<span></span>' + places.map((p) => cell(view.carried.has(p) ? '1' : '', p, ' h-carry')).join('');
    h += '<span></span>' + places.map((p) => cell(digitOr(q.a, p), p, ' h-a')).join('');
    h += '<span class="h-op">+</span>' + places.map((p) => cell(digitOr(q.b, p), p, ' h-b')).join('');
    h += '<span class="h-line"></span>' + places.map((p) =>
      cell(view.written[p] ?? (p === view.active ? '?' : ''), p, ' h-ans')).join('');
    return h + '</div>';
  };

  return view;
}
