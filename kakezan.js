// じゅけんの どだい（2年）⑦「かけ算を考えよう」：かけ算の 文しょうだい
// SAPIX 2年「かけ算を考えよう」の テーマに あわせた オリジナルの もんだい。
// しき えらび → 答え（2だんかいの もんだいは しきを じゅんに）

const ITEMS = [['あめ', '🍬'], ['クッキー', '🍪'], ['いちご', '🍓'], [`ビー${rb('玉', 'だま')}`, '🔵'], ['どんぐり', '🌰']];

UNITS.kakezan = {
  questions() {
    const qs = [];
    const item = () => ITEMS[rand(0, ITEMS.length - 1)];
    for (let i = 0; i < 3; i++) {
      const [name, icon] = item();
      qs.push({ kind: 'bag', a: rand(2, 9), b: rand(2, 6), name, icon });
    }
    for (let i = 0; i < 2; i++) qs.push({ kind: 'row', a: rand(3, 8), b: rand(2, 5), icon: '🪑' });
    for (let i = 0; i < 2; i++) {
      const [name, icon] = item();
      qs.push({ kind: 'times', a: rand(2, 6), b: rand(2, 5), name, icon });
    }
    {
      const [name, icon] = item();
      qs.push({ kind: 'plus', a: rand(3, 6), b: rand(3, 5), c: rand(1, 4), name, icon });
    }
    {
      const a = rand(2, 5);
      const b = rand(3, 6);
      qs.push({ kind: 'minus', a, b, total: a * b + rand(2, 8), icon: '🎴' });
    }
    return shuffle(qs).map((q) => ({ ...q, label: KAKE_TEXT[q.kind](q).replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '').slice(0, 26) + '…' }));
  },

  steps(q) {
    const text = KAKE_TEXT[q.kind](q);
    const 式 = `${rb('式', 'しき')}は どれ？`;
    const 何 = rb('何', 'なん');
    // しきの えらびかた：まちがいの せんたくしは たしざん・ちがう かず
    const choose = (a, b, extra) => ({
      kind: 'choice', prompt: `${text}<br>${式}`,
      ...mix([`${a} × ${b}`, `${a} + ${b}`, extra]),
      hint: `「${a}こずつ」が「${b}つ ぶん」だよ`,
    });
    switch (q.kind) {
      case 'bag':
      case 'row':
      case 'times':
        return [
          choose(q.a, q.b, `${q.a} × ${q.b + 1}`),
          { kind: 'answer', expected: q.a * q.b, before: `${q.a} × ${q.b} =`, prompt: `${text}<br>${rb('答', 'こた')}えは？` },
        ];
      case 'plus':
        return [
          choose(q.a, q.b, `${q.a} × ${q.b + q.c}`),
          { kind: 'answer', expected: q.a * q.b, before: `${q.a} × ${q.b} =`, prompt: `まず くばった ${rb('数', 'かず')}は？` },
          { kind: 'answer', expected: q.a * q.b + q.c, before: `${q.a * q.b} + ${q.c} =`, prompt: `あまりを たして、はじめに あったのは ${何}こ？` },
        ];
      case 'minus':
        return [
          choose(q.a, q.b, `${q.total} × ${q.a}`),
          { kind: 'answer', expected: q.a * q.b, before: `${q.a} × ${q.b} =`, prompt: `くばる カードは ${rb('全部', 'ぜんぶ')}で ${何}まい？` },
          { kind: 'answer', expected: q.total - q.a * q.b, before: `${q.total} − ${q.a * q.b} =`, prompt: `のこりは ${何}まい？` },
        ];
    }
    return [];
  },

  // え：まとまり（ふくろ・れつ）ごとに ならべる
  view(box, q) {
    const view = {};
    view.draw = () => {
      box.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'kz-wrap';
      const groups = q.kind === 'minus' ? q.b : q.b;
      for (let g = 0; g < groups; g++) {
        const grp = document.createElement('div');
        grp.className = `kz-group ${q.kind}`;
        grp.textContent = q.icon.repeat(q.a);
        const tag = document.createElement('span');
        tag.className = 'kz-tag';
        tag.textContent = q.kind === 'row' ? `${g + 1}れつめ` : q.kind === 'times' ? `${g + 1}ばい` : `${g + 1}`;
        grp.prepend(tag);
        wrap.appendChild(grp);
      }
      if (q.kind === 'plus') wrap.insertAdjacentHTML('beforeend', `<div class="kz-group rest"><span class="kz-tag">あまり</span>${q.icon.repeat(q.c)}</div>`);
      box.appendChild(wrap);
    };
    view.layout = () => view.draw();
    return view;
  },
};

// せいかいを まぜた せんたくし { options, answer }
function mix(list) {
  const opts = shuffle(list);
  return { options: opts, answer: opts.indexOf(list[0]) };
}

const KAKE_TEXT = {
  bag: (q) => `1ふくろに ${q.name}が ${q.a}こ ${rb('入', 'はい')}って います。${q.b}ふくろ では ${rb('何', 'なん')}こ？`,
  row: (q) => `いすが ${q.a}こずつ ${q.b}れつ ならんで います。いすは ${rb('全部', 'ぜんぶ')}で ${rb('何', 'なん')}こ？`,
  times: (q) => `${rb('弟', 'おとうと')}は ${q.name}を ${q.a}こ もって います。${rb('兄', 'あに')}は その ${q.b}ばい もって います。${rb('兄', 'あに')}は ${rb('何', 'なん')}こ？`,
  plus: (q) => `${q.name}を ${q.a}こずつ ${q.b}${rb('人', 'にん')}に くばると、${q.c}こ あまりました。はじめに ${rb('何', 'なん')}こ ありましたか？`,
  minus: (q) => `カードを ${q.a}まいずつ ${q.b}${rb('人', 'にん')}に くばります。カードが ${q.total}まい あると、${rb('何', 'なん')}まい のこりますか？`,
};
