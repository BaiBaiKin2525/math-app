// じゅけんの どだい（2年）④「じゅんじょよく考える」：もれなく かさならず 書き出す（場合の数の 入り口）
// SAPIX 2年「じゅんじょよく考える」の テーマに あわせた オリジナルの もんだい。

const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍊'];

// カードで できる ならべかた（0 は さいしょに おけない）
function arrangements(cards, k) {
  const out = new Set();
  const walk = (used, cur) => {
    if (cur.length === k) {
      if (cur[0] !== 0) out.add(cur.join(''));
      return;
    }
    cards.forEach((c, i) => {
      if (!used.has(i)) walk(new Set([...used, i]), [...cur, c]);
    });
  };
  walk(new Set(), []);
  return [...out].sort();
}

// えらびかた（じゅんばんは かんけい ない）
function combos(items, k) {
  const out = [];
  const walk = (start, cur) => {
    if (cur.length === k) return out.push(cur.join(''));
    for (let i = start; i < items.length; i++) walk(i + 1, [...cur, items[i]]);
  };
  walk(0, []);
  return out;
}

UNITS.junjo = {
  questions() {
    return shuffle([
      { kind: 'perm', cards: [1, 2, 3], k: 3, label: `1・2・3 で 3けたの ${rb('数', 'かず')}` },
      { kind: 'perm', cards: shuffle([2, 5, 7]), k: 2, label: `3まいで 2けたの ${rb('数', 'かず')}` },
      { kind: 'perm', cards: [0, rand(1, 4), rand(5, 9)], k: 2, label: `0 の ある カードで 2けた` },
      { kind: 'perm', cards: [1, 3, 5, 7], k: 2, label: `4まいで 2けたの ${rb('数', 'かず')}` },
      { kind: 'comb', items: shuffle(FRUITS).slice(0, 4), k: 2, label: `4つから 2つ えらぶ` },
      { kind: 'comb', items: shuffle(FRUITS).slice(0, 3), k: 2, label: `3つから 2つ えらぶ` },
    ]);
  },

  steps(q) {
    const all = q.kind === 'perm' ? arrangements(q.cards, q.k) : combos(q.items, q.k);
    const 全部 = rb('全部', 'ぜんぶ');
    const 何通 = `${rb('何', 'なん')}${rb('通', 'とお')}り`;
    const make = q.kind === 'perm'
      ? `カードを ならべて ${q.k}けたの ${rb('数', 'かず')}を ${全部} つくろう${q.cards.includes(0) ? `（0 は いちばん ${rb('上', 'うえ')}の くらいに おけない）` : ''}`
      : `${q.items.join(' ')} から ${q.k}つ えらぶ えらび${rb('方', 'かた')}を ${全部} ${rb('見', 'み')}つけよう（じゅんばんが ちがっても ${rb('同', 'おな')}じ）`;
    return [
      { kind: 'build', all, prompt: make, say: 'じゅんじょよく さがすと もれが ないよ' },
      { kind: 'answer', expected: all.length, unit: `${rb('通', 'とお')}り`, prompt: `${全部}で ${何通}？` },
    ];
  },

  view(box, q, api) {
    const view = { slots: [], found: [], mode: 'none' };
    const pieces = q.kind === 'perm' ? q.cards : q.items;
    const keyOf = (idxs) => {
      if (q.kind === 'perm') return idxs.map((i) => pieces[i]).join('');
      return idxs.map((i) => pieces[i]).sort((x, y) => pieces.indexOf(x) - pieces.indexOf(y)).join('');
    };

    view.draw = () => {
      box.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'jj-wrap';
      // カード
      const cards = document.createElement('div');
      cards.className = 'jj-cards';
      pieces.forEach((p, i) => {
        const c = document.createElement('button');
        c.className = 'jj-card' + (view.slots.includes(i) ? ' used' : '') + (q.kind === 'comb' ? ' fruit' : '');
        c.textContent = p;
        c.disabled = view.mode !== 'build' || view.slots.includes(i);
        c.addEventListener('click', () => pick(i));
        cards.appendChild(c);
      });
      wrap.appendChild(cards);
      // ならべる ばしょ
      if (view.mode === 'build') {
        const slots = document.createElement('div');
        slots.className = 'jj-slots';
        for (let s = 0; s < q.k; s++) {
          const sl = document.createElement('button');
          sl.className = 'jj-slot';
          sl.textContent = view.slots[s] !== undefined ? pieces[view.slots[s]] : '';
          sl.addEventListener('click', () => {
            view.slots = view.slots.slice(0, s);
            view.draw();
          });
          slots.appendChild(sl);
        }
        const hint = document.createElement('button');
        hint.className = 'small-btn jj-hint';
        hint.textContent = '💡 ヒント';
        hint.addEventListener('click', giveHint);
        slots.appendChild(hint);
        wrap.appendChild(slots);
      }
      // 見つけた もの（さいしょの 数ごとに ならべる → じゅんじょよく）
      const list = document.createElement('div');
      list.className = 'jj-found';
      const groups = {};
      for (const f of view.found) (groups[[...f][0]] = groups[[...f][0]] || []).push(f);
      const order = q.kind === 'perm' ? [...new Set(pieces)].sort().map(String) : pieces;
      for (const head of order) {
        if (!groups[head]) continue;
        const row = document.createElement('div');
        row.className = 'jj-row';
        row.innerHTML = groups[head].sort().map((f) => `<span class="jj-item">${f}</span>`).join('');
        list.appendChild(row);
      }
      wrap.appendChild(list);
      box.appendChild(wrap);
    };

    function pick(i) {
      if (view.mode !== 'build' || api.locked()) return;
      view.slots = [...view.slots, i];
      api.tick();
      if (view.slots.length < q.k) return view.draw();
      const key = keyOf(view.slots);
      view.slots = [];
      const step = api.step();
      if (q.kind === 'perm' && key[0] === '0') {
        api.wrong('0 は いちばん うえの くらいに おけないよ');
      } else if (view.found.includes(key)) {
        api.say(`${key} は もう つくったよ`, true);
      } else if (step.all.includes(key)) {
        view.found.push(key);
        const left = step.all.length - view.found.length;
        if (left === 0) {
          view.draw();
          api.correct(`${rb('全部', 'ぜんぶ')} ${rb('見', 'み')}つけた！`);
          return;
        }
        api.say(`${key}！ まだ あるかな？（いま ${view.found.length}こ）`);
      }
      view.draw();
    }

    // まだ 見つけていない ものを 1つ おしえる（まちがい あつかい）
    function giveHint() {
      const step = api.step();
      const miss = step.all.find((a) => !view.found.includes(a));
      if (!miss) return;
      api.wrong(`「${miss}」が まだ ないよ`);
      view.found.push(miss);
      view.draw();
      if (view.found.length === step.all.length) api.correct();
    }

    view.layout = () => view.draw();
    return view;
  },

  enter(view, step) {
    view.mode = step.kind;
    view.slots = [];
    if (step.kind === 'build') view.found = [];
  },
};
