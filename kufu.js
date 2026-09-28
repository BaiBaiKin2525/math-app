// じゅけんの どだい（2年）②「くふうしよう」：けいさんの くふう。
// SAPIX 2年「くふうしよう」の テーマに あわせた オリジナルの もんだい。
//   10・100 の まとまりを つくる／おなじ 数の たしざんを かけざんに／9 に ちかい 数／さくらんぼ けいさん

function kufuQuestions() {
  const qs = [];
  for (let i = 0; i < 3; i++) {
    const a = rand(1, 9);
    let c;
    do c = rand(2, 9); while (c === 10 - a);
    const nums = shuffle([a, 10 - a, c]);
    qs.push({ kind: 'ten', nums, target: 10, label: nums.join(' + ') });
  }
  for (let i = 0; i < 2; i++) {
    const a = rand(11, 89);
    if (a % 10 === 0) { i--; continue; }
    const c = rand(11, 59);
    const nums = shuffle([a, 100 - a, c]);
    qs.push({ kind: 'ten', nums, target: 100, label: nums.join(' + ') });
  }
  for (let i = 0; i < 2; i++) {
    const n = rand(2, 9);
    const k = rand(3, 6);
    qs.push({ kind: 'same', n, k, nums: Array(k).fill(n), label: Array(k).fill(n).join('+') });
  }
  for (let i = 0; i < 2; i++) {
    const a = rand(1, 7) * 10 + 9;
    const b = rand(12, 48);
    qs.push({ kind: 'near9', a, b, nums: [a, b], label: `${a} + ${b}` });
  }
  const x = rand(6, 9);
  const y = rand(11 - x, 9);
  qs.push({ kind: 'split', a: x, b: y, nums: [x, y], label: `${x} + ${y}` });
  return shuffle(qs);
}

// チャレンジ：100 を 2くみ つくる／199・98 など／ひきざんの くふう
function kufuHardQuestions() {
  const qs = [];
  for (let i = 0; i < 3; i++) {
    const a = rand(11, 49);
    let b;
    do b = rand(11, 49); while (b === a || a % 10 === 0 || b % 10 === 0);
    const nums = shuffle([a, 100 - a, b, 100 - b]);
    qs.push({ kind: 'ten4', nums, label: nums.join(' + ') });
  }
  for (const a of shuffle([99, 199, 98, 198, 299]).slice(0, 3)) {
    const b = rand(21, 68);
    qs.push({ kind: 'near', a, b, nums: [a, b], label: `${a} + ${b}` });
  }
  for (let i = 0; i < 3; i++) {
    const b = rand(1, 4) * 10 + 9;
    const a = rand(b + 12, 98);
    qs.push({ kind: 'sub9', a, b, nums: [a, b], label: `${a} − ${b}` });
  }
  return shuffle(qs);
}

function kufuSteps(q) {
  const 数 = rb('数', 'かず');
  const 全部 = rb('全部', 'ぜんぶ');
  switch (q.kind) {
    case 'ten4': {
      const total = q.nums.reduce((s, n) => s + n, 0);
      return [
        { kind: 'pair', target: 100, prompt: `たすと <b>100</b> に なる 2つを タップしよう（2くみ あるよ）` },
        { kind: 'pair', target: 100, prompt: `のこりの 2つも たすと <b>100</b> かな？ タップしよう` },
        { kind: 'answer', expected: total, prompt: `100 と 100 で、${全部}で いくつ？`, note: '100 + 100' },
      ];
    }
    case 'near': {
      const round = Math.ceil(q.a / 100) * 100;
      const d = round - q.a;
      return [
        {
          kind: 'answer', expected: round + q.b,
          prompt: `${q.a} は あと ${d} で ${round}。<b>${round} + ${q.b}</b> は？`,
          note: `${q.a} → <b>${round}</b> と ${rb('考', 'かんが')}える`,
        },
        {
          kind: 'answer', expected: q.a + q.b,
          prompt: `${d} ${rb('多', 'おお')}く たしたので、${d} ひくと？`,
          note: `${round} + ${q.b} = ${round + q.b}　→　${d} ひく`,
        },
      ];
    }
    case 'sub9':
      return [
        {
          kind: 'answer', expected: q.a - (q.b + 1),
          prompt: `${q.b} は ${q.b + 1} より 1 ${rb('少', 'すく')}ない。<b>${q.a} − ${q.b + 1}</b> は？`,
          note: `${q.a} − ${q.b}　→　${q.b} を <b>${q.b + 1}</b> と ${rb('考', 'かんが')}える`,
        },
        {
          kind: 'answer', expected: q.a - q.b,
          prompt: `1 ${rb('多', 'おお')}く ひいたので、1 たすと？`,
          note: `${q.a} − ${q.b + 1} = ${q.a - q.b - 1}　→　1 たす`,
        },
      ];
    case 'ten': {
      const [i, j] = kufuPair(q.nums, q.target);
      const rest = q.nums.find((_, k) => k !== i && k !== j);
      return [
        { kind: 'pair', target: q.target, pair: [i, j], prompt: `たすと <b>${q.target}</b> に なる 2つの ${数}を タップしよう` },
        {
          kind: 'answer', expected: q.target + rest,
          prompt: `${q.target} と ${rest} で、${全部}で いくつ？`,
          note: `${q.nums[i]} + ${q.nums[j]} = <b>${q.target}</b>　→　${q.target} + ${rest}`,
        },
      ];
    }
    case 'same':
      return [
        { kind: 'answer', expected: q.k, prompt: `${q.n} を ${q.k}${rb('回', 'かい')} たすのは、<b>${q.n}×□</b> と ${rb('同', 'おな')}じ。□は？` },
        { kind: 'answer', expected: q.n * q.k, prompt: `<b>${q.n}×${q.k}</b> は？`, note: `${q.nums.join(' + ')} = ${q.n}×${q.k}` },
      ];
    case 'near9':
      return [
        {
          kind: 'answer', expected: q.a + 1 + q.b,
          prompt: `${q.a} は あと 1 で ${q.a + 1}。<b>${q.a + 1} + ${q.b}</b> は？`,
          note: `${q.a} → <b>${q.a + 1}</b> と ${rb('考', 'かんが')}える`,
        },
        {
          kind: 'answer', expected: q.a + q.b,
          prompt: `1 ${rb('多', 'おお')}く たしたので、1 ひくと？`,
          note: `${q.a + 1} + ${q.b} = ${q.a + 1 + q.b}　→　1 ひく`,
        },
      ];
    case 'split':
      return [
        { kind: 'answer', expected: 10 - q.a, prompt: `<b>${q.a}</b> は あと いくつで 10？` },
        {
          kind: 'answer', expected: q.a + q.b,
          prompt: `${q.b} を ${10 - q.a} と ${q.b - (10 - q.a)} に わけて、<b>10 + ${q.b - (10 - q.a)}</b> は？`,
          note: `${q.b} → ${10 - q.a} と ${q.b - (10 - q.a)}（さくらんぼ）`,
        },
      ];
  }
  return [];
}

// たすと target に なる 2つの ばしょ
function kufuPair(nums, target) {
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] + nums[j] === target) return [i, j];
  return [0, 1];
}

// 数の カード（タップして えらぶ）
function createKufuView(box, q, { onTap }) {
  const view = { mode: 'none', selected: new Set(), grouped: [], note: '' };

  view.draw = () => {
    box.innerHTML = '';
    const r = box.getBoundingClientRect();
    const size = Math.max(40, Math.min(96, (r.width - 40) / (q.nums.length * 1.9)));
    const row = document.createElement('div');
    row.className = 'kufu-row';
    row.style.setProperty('--s', `${size}px`);
    q.nums.forEach((n, i) => {
      if (i > 0) {
        const plus = document.createElement('span');
        plus.className = 'kufu-plus';
        plus.textContent = q.kind === 'sub9' ? '−' : '+';
        row.appendChild(plus);
      }
      const chip = document.createElement('button');
      chip.className = 'kufu-chip';
      if (view.selected.has(i)) chip.classList.add('selected');
      // 1くみめは みどり、2くみめは あお
      const g = view.grouped.indexOf(i);
      if (g >= 0) chip.classList.add(g < 2 ? 'grouped' : 'grouped2');
      if (view.mode === 'pair') chip.classList.add('tappable');
      chip.textContent = n;
      chip.dataset.i = i;
      chip.addEventListener('click', () => onTap(i, chip));
      row.appendChild(chip);
    });
    box.appendChild(row);
    if (view.note) {
      const note = document.createElement('div');
      note.className = 'kufu-note';
      note.innerHTML = view.note;
      box.appendChild(note);
    }
  };

  view.layout = () => view.draw();

  view.flash = () => {
    box.querySelectorAll('.kufu-chip.selected').forEach((c) => {
      c.classList.remove('wrong');
      void c.offsetWidth;
      c.classList.add('wrong');
    });
  };

  return view;
}
