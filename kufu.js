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

function kufuSteps(q) {
  const 数 = rb('数', 'かず');
  const 全部 = rb('全部', 'ぜんぶ');
  switch (q.kind) {
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
        plus.textContent = '+';
        row.appendChild(plus);
      }
      const chip = document.createElement('button');
      chip.className = 'kufu-chip';
      if (view.selected.has(i)) chip.classList.add('selected');
      if (view.grouped.includes(i)) chip.classList.add('grouped');
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
