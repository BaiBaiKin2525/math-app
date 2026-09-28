// じゅけんの どだい（2年）⑦「かけ算を考えよう」：かけ算の 文しょうだい
// SAPIX 2年「かけ算を考えよう」の テーマに あわせた オリジナルの もんだい。
// しき えらび → 答え（2だんかいの もんだいは しきを じゅんに）

const ITEMS = [['あめ', '🍬'], ['クッキー', '🍪'], ['いちご', '🍓'], [`ビー${rb('玉', 'だま')}`, '🔵'], ['どんぐり', '🌰']];

UNITS.kakezan = {
  questions(opts = {}) {
    const item = () => ITEMS[rand(0, ITEMS.length - 1)];
    if (opts.hard) {
      // チャレンジ：2つの しきを くみあわせる
      const qs = [];
      for (let i = 0; i < 2; i++) {
        const [name, icon] = item();
        qs.push({ kind: 'twoBox', a: rand(3, 8), b: rand(2, 5), c: rand(3, 8), d: rand(2, 5), name, icon });
      }
      for (let i = 0; i < 2; i++) {
        const [name, icon] = item();
        const a = rand(3, 7);
        const b = rand(4, 8);
        qs.push({ kind: 'short', a, b, have: a * b - rand(3, 9), name, icon });
      }
      for (let i = 0; i < 2; i++) {
        const a = rand(4, 9);
        const b = rand(3, 9);
        qs.push({ kind: 'rows', a, b, total: a * b, icon: '🪑' });
      }
      for (let i = 0; i < 2; i++) qs.push({ kind: 'chain', a: rand(2, 4), b: 2, c: rand(2, 4), icon: '📏' });
      return shuffle(qs).map((q) => ({ ...q, label: KAKE_TEXT[q.kind](q).replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '').slice(0, 26) + '…' }));
    }
    const qs = [];
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
      case 'twoBox':
        return [
          { kind: 'answer', expected: q.a * q.b, before: `${q.a} × ${q.b} =`, prompt: `${text}<br>まず ${q.a}こ${rb('入', 'い')}りの はこは ${何}こ？` },
          { kind: 'answer', expected: q.c * q.d, before: `${q.c} × ${q.d} =`, prompt: `つぎに ${q.c}こ${rb('入', 'い')}りの はこは ${何}こ？` },
          { kind: 'answer', expected: q.a * q.b + q.c * q.d, before: `${q.a * q.b} + ${q.c * q.d} =`, prompt: `${rb('全部', 'ぜんぶ')}で ${何}こ？` },
        ];
      case 'short':
        return [
          { kind: 'answer', expected: q.a * q.b, before: `${q.a} × ${q.b} =`, prompt: `${text}<br>くばるのに ひつような ${rb('数', 'かず')}は？` },
          { kind: 'answer', expected: q.a * q.b - q.have, before: `${q.a * q.b} − ${q.have} =`, prompt: `あと ${何}こ たりない？` },
        ];
      case 'rows':
        return [{
          kind: 'answer', expected: q.b, before: `${q.a} × □ = ${q.total}　□ =`,
          prompt: `${text}<br>${q.a}の だんの ${rb('九九', 'くく')}で ${q.total} に なるのは？`,
        }];
      case 'chain':
        return [
          { kind: 'answer', expected: q.a * q.b, before: `${q.a} × ${q.b} =`, unit: 'cm', prompt: `${text}<br>まず ${rb('青', 'あお')}い テープは？` },
          { kind: 'answer', expected: q.a * q.b * q.c, before: `${q.a * q.b} × ${q.c} =`, unit: 'cm', prompt: `${rb('黄色', 'きいろ')}い テープは？` },
        ];
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
      // チャレンジの え
      if (q.kind === 'twoBox') {
        for (let g = 0; g < q.b; g++) wrap.insertAdjacentHTML('beforeend', `<div class="kz-group"><span class="kz-tag">${q.a}こ${rb('入', 'い')}り</span>${q.icon.repeat(q.a)}</div>`);
        for (let g = 0; g < q.d; g++) wrap.insertAdjacentHTML('beforeend', `<div class="kz-group rest"><span class="kz-tag">${q.c}こ${rb('入', 'い')}り</span>${q.icon.repeat(q.c)}</div>`);
        box.appendChild(wrap);
        return;
      }
      if (q.kind === 'short') {
        for (let g = 0; g < q.b; g++) wrap.insertAdjacentHTML('beforeend', `<div class="kz-group"><span class="kz-tag">${g + 1}${rb('人', 'にん')}め</span>${'⬜'.repeat(q.a)}</div>`);
        wrap.insertAdjacentHTML('beforeend', `<div class="kz-note">もっている：${q.icon} ${q.have}こ</div>`);
        box.appendChild(wrap);
        return;
      }
      if (q.kind === 'rows') {
        wrap.insertAdjacentHTML('beforeend', `<div class="kz-note">${q.icon} ${rb('全部', 'ぜんぶ')}で ${q.total}こ、1れつ ${q.a}こずつ</div>`);
        box.appendChild(wrap);
        return;
      }
      if (q.kind === 'chain') {
        const unitPx = 14;
        const tape = (len, color, name) => `<div class="kz-tape"><span>${name}</span><i style="width:${len * unitPx}px;background:${color}"></i><b>${len === q.a ? `${len}cm` : '？'}</b></div>`;
        wrap.classList.add('col');
        wrap.innerHTML = tape(q.a, '#e2553f', rb('赤', 'あか')) + tape(q.a * q.b, '#4d96ff', rb('青', 'あお')) + tape(q.a * q.b * q.c, '#f2c230', rb('黄色', 'きいろ'));
        box.appendChild(wrap);
        return;
      }
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
  twoBox: (q) => `${q.name}が ${q.a}こ ${rb('入', 'はい')}った はこが ${q.b}こ と、${q.c}こ ${rb('入', 'はい')}った はこが ${q.d}こ あります。${q.name}は ${rb('全部', 'ぜんぶ')}で ${rb('何', 'なん')}こ？`,
  short: (q) => `${q.name}を ${q.a}こずつ ${q.b}${rb('人', 'にん')}に くばりたい。いま ${q.have}こ あります。あと ${rb('何', 'なん')}こ あれば くばれますか？`,
  rows: (q) => `いすが ${q.total}こ あります。1れつに ${q.a}こずつ ならべると、${rb('何', 'なん')}れつに なりますか？`,
  chain: (q) => `${rb('赤', 'あか')}い テープは ${q.a}cm。${rb('青', 'あお')}い テープは ${rb('赤', 'あか')}の ${q.b}ばい、${rb('黄色', 'きいろ')}い テープは ${rb('青', 'あお')}の ${q.c}ばい です。${rb('黄色', 'きいろ')}い テープは ${rb('何', 'なん')}cm？`,
  bag: (q) => `1ふくろに ${q.name}が ${q.a}こ ${rb('入', 'はい')}って います。${q.b}ふくろ では ${rb('何', 'なん')}こ？`,
  row: (q) => `いすが ${q.a}こずつ ${q.b}れつ ならんで います。いすは ${rb('全部', 'ぜんぶ')}で ${rb('何', 'なん')}こ？`,
  times: (q) => `${rb('弟', 'おとうと')}は ${q.name}を ${q.a}こ もって います。${rb('兄', 'あに')}は その ${q.b}ばい もって います。${rb('兄', 'あに')}は ${rb('何', 'なん')}こ？`,
  plus: (q) => `${q.name}を ${q.a}こずつ ${q.b}${rb('人', 'にん')}に くばると、${q.c}こ あまりました。はじめに ${rb('何', 'なん')}こ ありましたか？`,
  minus: (q) => `カードを ${q.a}まいずつ ${q.b}${rb('人', 'にん')}に くばります。カードが ${q.total}まい あると、${rb('何', 'なん')}まい のこりますか？`,
};
