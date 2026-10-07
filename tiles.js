// たしざん・ひきざんの タイル。タイルは 下から つみ、10 こで 1 本の「10 のぼう」になる。
//   たしざん：「がっちゃん」で あわせると、10 こ そろった ところが ぼうに なる（くりあがり）
//   ひきざん：「がっちゃん」で まとめて とる（タップで 1こずつ とっても よい）。ぼうから とると ぼうが ばらばらに なる（くりさがり）

function createTileView(box, type, q, { onRemoveDone }) {
  const total = type === 'add' ? q.a + q.b : q.a;
  const view = {
    merged: false,   // たしざん：あわせた か
    broken: false,   // ひきざん：10 のぼうを ばらした か
    locked: true,    // ひきざん：タップで とれない とき true
    removed: new Set(),
    lit: new Map(),  // タイル番号 → かぞえた 数
  };

  const range = (from, to) => Array.from({ length: to - from }, (_, i) => from + i);

  // 1 れつ（たてに 10 こ まで）ずつ タイル番号を わける
  function columns() {
    if (type === 'add' && !view.merged) return [range(0, q.a), '+', range(q.a, total)];
    const cols = [];
    for (let i = 0; i < total; i += 10) cols.push(range(i, Math.min(i + 10, total)));
    return cols;
  }

  function tileColor(id) {
    if (type === 'sub') return 'c';
    return id < q.a ? 'a' : 'b';
  }

  function tap(id) {
    if (view.locked) return;
    if (view.removed.has(id)) {
      view.removed.delete(id);
    } else if (view.removed.size < q.b) {
      if (id < 10 && total >= 10) view.broken = true; // ぼうから とったら ばらばらに
      view.removed.add(id);
    }
    soundTick();
    view.draw();
    if (view.removed.size === q.b) {
      view.locked = true;
      onRemoveDone();
    }
  }

  view.draw = (pop) => {
    box.innerHTML = '';
    const cols = columns();
    const r = box.getBoundingClientRect();
    const size = Math.max(16, Math.min(52, (r.height - 110) / 10.6, (r.width - 40) / (cols.length * 2)));
    box.style.setProperty('--tile', `${size}px`);

    const wrap = document.createElement('div');
    wrap.className = 'tiles';
    for (const col of cols) {
      if (col === '+') {
        const op = document.createElement('div');
        op.className = 'tile-op';
        op.textContent = '+';
        wrap.appendChild(op);
        continue;
      }
      const isBar = col.length === 10 && !view.broken;
      const colWrap = document.createElement('div');
      colWrap.className = 'tcol-wrap';
      const colEl = document.createElement('div');
      colEl.className = 'tcol' + (isBar ? ' bar' : '');
      for (let i = 0; i < 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        const id = col[i];
        if (id !== undefined) {
          const t = document.createElement('div');
          t.className = `tile ${tileColor(id)}`;
          if (view.removed.has(id)) t.classList.add('removed');
          if (view.lit.has(id)) {
            t.classList.add('lit');
            t.textContent = view.lit.get(id);
          }
          if (pop && id >= q.a) t.classList.add('pop');
          if (type === 'sub') t.addEventListener('click', () => tap(id));
          slot.appendChild(t);
        }
        colEl.appendChild(slot);
      }
      const label = document.createElement('div');
      label.className = 'tcol-label';
      label.textContent = isBar ? '10' : col.filter((id) => !view.removed.has(id)).length;
      colWrap.append(colEl, label);
      wrap.appendChild(colWrap);
    }
    box.appendChild(wrap);

    const cap = document.createElement('div');
    cap.className = 'visual-caption';
    cap.innerHTML = caption();
    box.appendChild(cap);
  };

  function caption() {
    if (type === 'add') {
      if (!view.merged) return `<b class="a">■ ${q.a}こ</b> と <b class="b">■ ${q.b}こ</b>`;
      return total >= 10 ? '10 の ぼうが できた！' : 'あわせたよ';
    }
    if (view.removed.size < q.b) return `${q.a}こ から <b class="a">${q.b}こ</b> とろう（${view.removed.size} / ${q.b}）。「がっちゃん」で まとめて とれるよ`;
    return 'のこりは いくつ？';
  }

  view.layout = () => view.draw();

  view.merge = async () => {
    if (type === 'sub') {
      // ひきざん：のこりの ぶんを ばらの タイルから じゅんに まとめて とる（たりなければ 10 の ぼうを ばらす）
      if (view.locked) return;
      view.locked = true;
      const ids = range(0, total).reverse().filter((id) => !view.removed.has(id)).slice(0, q.b - view.removed.size);
      for (const id of ids) {
        if (id < 10 && total >= 10) view.broken = true;
        view.removed.add(id);
        view.draw();
        soundTick();
        await sleep(110);
      }
      onRemoveDone();
      return;
    }
    if (type !== 'add' || view.merged) return;
    view.merged = true;
    view.draw(true);
  };

  // のこっている タイルを 1 こずつ かぞえる。とちゅうで やめたら null
  view.count = async (alive) => {
    view.merge();
    view.lit.clear();
    const ids = range(0, total).filter((id) => !view.removed.has(id));
    for (let i = 0; i < ids.length; i++) {
      if (!alive()) return null;
      view.lit.set(ids[i], i + 1);
      view.draw();
      soundTick();
      await sleep(380);
    }
    return alive() ? ids.length : null;
  };

  return view;
}
