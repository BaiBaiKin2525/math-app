// じゅけんの どだい（2年）⑥「すいりしよう」：ヒントから こたえを きめる
// SAPIX 2年「すいりしよう」の テーマに あわせた オリジナルの もんだい。
// ヒントは まいかい つくりなおし、こたえが 1とおりに きまる ことを ぜんぶ ためして たしかめる。

const PEOPLE = ['たろう', 'はなこ', 'けんた', 'ゆい'];
const SUIRI_FRUITS = [['りんご', '🍎'], ['バナナ', '🍌'], ['ぶどう', '🍇'], ['みかん', '🍊']];
const ANIMALS = [['うさぎ', '🐰'], ['かめ', '🐢'], ['いぬ', '🐶'], ['ねこ', '🐱'], ['りす', '🐿️']];

function permutations(n) {
  if (n === 1) return [[0]];
  const out = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

// ヒントを たしていき、こたえが 1とおりに なったら おわり
function pickClues(all, candidates, truth) {
  const clues = [];
  let alive = candidates;
  for (const cl of shuffle(all)) {
    const next = alive.filter(cl.test);
    if (next.length === alive.length) continue; // やくに たたない ヒントは つかわない
    clues.push(cl);
    alive = next;
    if (alive.length === 1) break;
  }
  return alive.length === 1 && String(alive[0]) === String(truth) ? clues : null;
}

// n：ひとと くだものの かず（3 か 4）
function gridQuestion(n = 3) {
  const people = shuffle(PEOPLE).slice(0, n);
  const fruits = shuffle(SUIRI_FRUITS).slice(0, n);
  const truth = shuffle([...Array(n).keys()]); // truth[ひと] = くだもの
  const all = [];
  for (let i = 0; i < n; i++) {
    for (let f = 0; f < n; f++) {
      if (truth[i] === f) all.push({ text: `${people[i]}は ${fruits[f][0]}が すき`, test: (p) => p[i] === f, pos: true });
      else all.push({ text: `${people[i]}は ${fruits[f][0]}が すき では ない`, test: (p) => p[i] !== f });
    }
  }
  // 「すき」を いきなり いわない ヒントを おおめに
  let clues = null;
  for (let tries = 0; !clues && tries < 50; tries++) clues = pickClues(all.filter((c) => !c.pos || Math.random() < 0.3), permutations(n), truth);
  const f = rand(0, n - 1);
  // ぜんていを はっきり かく（1人 1つ、おなじ くだものは 1人だけ）
  const premise = `${n}${rb('人', 'にん')}は それぞれ ちがう くだものが すき（1${rb('人', 'にん')} 1つ。おなじ くだものを すきな ${rb('人', 'ひと')}は いない）`;
  return { kind: 'grid', people, fruits, truth, premise, clues: clues.map((c) => c.text), ask: f, label: `だれが ${fruits[f][0]}？` };
}

function orderQuestion(n = Math.random() < 0.5 ? 3 : 4) {
  const animals = shuffle(ANIMALS).slice(0, n);
  const truth = shuffle([...Array(n).keys()]); // truth[じゅんい] = どうぶつ（0 が いちばん はやい）
  const rank = (p, a) => p.indexOf(a);
  const all = [];
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      if (x !== y && rank(truth, x) < rank(truth, y)) {
        all.push({ text: `${animals[x][0]}は ${animals[y][0]}より はやい`, test: (p) => rank(p, x) < rank(p, y) });
      }
    }
  }
  let clues = null;
  for (let tries = 0; !clues && tries < 50; tries++) clues = pickClues(all, permutations(n), truth);
  const premise = `おなじ はやさの どうぶつは いない`;
  return { kind: 'order', animals, truth, premise, clues: clues.map((c) => c.text), label: `はやい じゅん（${n}ひき）` };
}

UNITS.suiri = {
  questions(opts = {}) {
    // チャレンジ：4にん×4つ、5ひきの じゅんばん
    if (opts.hard) return shuffle([gridQuestion(4), gridQuestion(4), gridQuestion(4), orderQuestion(5), orderQuestion(5), orderQuestion(4)]);
    return shuffle([gridQuestion(), gridQuestion(), gridQuestion(), orderQuestion(), orderQuestion(), orderQuestion()]);
  },

  steps(q) {
    const 何 = rb('何', 'なに');
    if (q.kind === 'grid') {
      const fruit = q.fruits[q.ask];
      const who = q.truth.indexOf(q.ask);
      const other = (q.ask + 1) % q.fruits.length;
      return [
        {
          kind: 'choice', options: q.people, answer: who,
          prompt: `ヒントを よんで、${fruit[1]} <b>${fruit[0]}</b>が すきなのは だれ？`,
          say: `${rb('表', 'ひょう')}の マスを タップすると ○ × が かけるよ`,
          hint: `${rb('表', 'ひょう')}に × を つけて、のこった ところを さがそう`,
        },
        {
          kind: 'choice', options: q.people, answer: q.truth.indexOf(other),
          prompt: `では、${q.fruits[other][1]} <b>${q.fruits[other][0]}</b>が すきなのは？`,
        },
      ];
    }
    const names = q.animals.map((a) => `${a[1]} ${a[0]}`);
    return [
      { kind: 'choice', options: names, answer: q.truth[0], prompt: `ヒントを よんで、いちばん <b>はやい</b>のは だれ？`, say: 'ヒントを つなげて ならべて みよう' },
      { kind: 'choice', options: names, answer: q.truth[q.truth.length - 1], prompt: `いちばん <b>おそい</b>のは だれ？` },
    ];
  },

  view(box, q) {
    const view = { marks: {} };
    view.draw = () => {
      box.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'sr-wrap';
      const many = q.clues.length > 4 || (q.fruits && q.fruits.length > 3);
      wrap.classList.toggle('many', many);
      wrap.innerHTML = `<div class="sr-premise">${q.premise || ''}</div><div class="sr-title">ヒント</div><ol class="sr-clues">${q.clues.map((c) => `<li>${c}</li>`).join('')}</ol>`;
      if (q.kind === 'grid') {
        const t = document.createElement('div');
        t.className = 'sr-grid';
        t.style.gridTemplateColumns = `auto repeat(${q.fruits.length}, ${many ? 50 : 64}px)`;
        t.innerHTML = `<span></span>${q.fruits.map((f) => `<span class="sr-head">${f[1]}<br>${f[0]}</span>`).join('')}`;
        q.people.forEach((p, i) => {
          t.insertAdjacentHTML('beforeend', `<span class="sr-head">${p}</span>`);
          q.fruits.forEach((_, f) => {
            const key = `${i},${f}`;
            const b = document.createElement('button');
            b.className = 'sr-cell';
            b.textContent = view.marks[key] || '';
            // タップで ○ → × → から
            b.addEventListener('click', () => {
              view.marks[key] = { '': '×', '×': '○', '○': '' }[view.marks[key] || ''];
              view.draw();
            });
            t.appendChild(b);
          });
        });
        wrap.appendChild(t);
      }
      box.appendChild(wrap);
    };
    view.layout = () => view.draw();
    return view;
  },
};
