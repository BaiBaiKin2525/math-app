// とくべつ かだい「かっこ（ ）の けいさん」：たしざん・ひきざんの かっこ
//   📖 せつめい：けいさんの じゅんばん・かっこは さきに・かっこは ひとまとまり・かっこで こたえが かわる …
//   けいさん：かっこの なかから じゅんに（1だんずつ こたえる）→ こたえ だけ → かっこを どこに つける？
//   ぶんしょうだい：おはなしを よんで しきを えらぶ → けいさん。チャレンジは「しきに あう おはなし」も
// しきは '10-(3+2)' の ような もじれつで もつ（- は ひきざん）。けいさんの とちゅうは kkSteps で つくる

// ---------- しきの どうぐ ----------

function kkTokens(s) {
  const out = [];
  const re = /\d+|[+\-()]/g;
  let m;
  while ((m = re.exec(s))) out.push({ t: m[0], i: m.index });
  return out;
}

function kkEval(s) {
  const tk = kkTokens(s).map((x) => x.t);
  let p = 0;
  const term = () => {
    const t = tk[p++];
    if (t !== '(') return Number(t);
    const v = expr();
    p++; // ')'
    return v;
  };
  const expr = () => {
    let v = term();
    while (tk[p] === '+' || tk[p] === '-') {
      const op = tk[p++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  return expr();
}

const kkCalc = (x, op, y) => (op === '+' ? Number(x) + Number(y) : Number(x) - Number(y));

// つぎに けいさんする ところ：かっこの なか（いちばん うちがわ）→ なければ ひだりから
function kkNext(s) {
  let m = /\((\d+)([+-])(\d+)\)/.exec(s);
  if (m) return { at: m.index, len: m[0].length, sub: m[1] + m[2] + m[3], val: kkCalc(m[1], m[2], m[3]), paren: true };
  m = /\((\d+)([+-])(\d+)/.exec(s);   // かっこの なかに しきが 2つ いじょう：なかを ひだりから
  if (m) return { at: m.index + 1, len: m[0].length - 1, sub: m[1] + m[2] + m[3], val: kkCalc(m[1], m[2], m[3]), paren: true };
  m = /^(\d+)([+-])(\d+)/.exec(s);
  return { at: 0, len: m[0].length, sub: m[0], val: kkCalc(m[1], m[2], m[3]), paren: false };
}

// けいさんの とちゅう：[{ from, to, at, len, sub, val, paren }]
function kkSteps(s) {
  const out = [];
  while (!/^\d+$/.test(s)) {
    const n = kkNext(s);
    const to = s.slice(0, n.at) + n.val + s.slice(n.at + n.len);
    out.push({ ...n, from: s, to });
    s = to;
  }
  return out;
}

// とちゅうも こたえも 1〜max（マイナスや 0 に ならない）
function kkOk(s, max) {
  while (!/^\d+$/.test(s)) {
    const n = kkNext(s);
    if (n.val < 1 || n.val > max) return false;   // マイナスに なると もじれつで あつかえない ので ここで とめる
    s = s.slice(0, n.at) + n.val + s.slice(n.at + n.len);
  }
  return true;
}

// もじ だけ（けっか がめん・ヒント）
const kkText = (s) => s.replace(/-/g, ' − ').replace(/\+/g, ' + ').replace(/\(/g, '(').replace(/\)/g, ')');

// え：かっこは いろつき、at〜len は きいろく ひからせる（いま けいさんする ところ）
function kkHtml(s, at = -1, len = 0) {
  let h = '';
  for (const { t, i } of kkTokens(s)) {
    if (i === at) h += '<span class="kk-hi">';
    if (t === '(') h += '<span class="kk-g"><span class="kk-p">(</span>';
    else if (t === ')') h += '<span class="kk-p">)</span></span>';
    else if (t === '+' || t === '-') h += `<span class="kk-o">${t === '+' ? '+' : '−'}</span>`;
    else h += `<span class="kk-n">${t}</span>`;
    if (at >= 0 && i + t.length === at + len) h += '</span>';
  }
  return `<span class="kk-e">${h}</span>`;
}

// けいさんの とちゅうを したへ ならべる（done：おわった だんの かず、hi：いまの ところを ひからせる）
function kkBoard(expr, done, hi = true) {
  const st = kkSteps(expr);
  const lines = [];
  const mark = (k) => (hi && st[k] ? [st[k].at, st[k].len] : [-1, 0]);
  lines.push(`<div class="kk-line">${kkHtml(expr, ...mark(done === 0 ? 0 : -1))}</div>`);
  for (let j = 0; j < done && j < st.length; j++) {
    const last = j === st.length - 1;
    const now = j + 1 === done;
    lines.push(`<div class="kk-line${last ? ' final' : ''}"><span class="kk-eq">=</span>${kkHtml(st[j].to, ...(now ? mark(j + 1) : [-1, 0]))}</div>`);
  }
  if (done < st.length) lines.push('<div class="kk-line pending"><span class="kk-eq">=</span>？</div>');
  return `<div class="kk-board">${lines.join('')}</div>`;
}

// しきの なかの a b c d を かずに
const kkSub = (form, n) => form.replace(/[a-d]/g, (ch) => n[ch]);

// ---------- もんだいの ステップ ----------

// かっこの なかから 1だんずつ こたえる
function kkCalcSteps(expr, opts = {}) {
  const st = kkSteps(expr);
  return st.map((r, i) => {
    const last = i === st.length - 1;
    let say;
    if (r.paren) say = i === 0 ? 'まず <b>かっこの なか</b>を けいさん しよう' : 'つぎの <b>かっこの なか</b>を けいさん しよう';
    else if (last) say = st.some((x) => x.paren) ? 'かっこが きえたね。さいごの けいさん！' : 'さいごの けいさん！';
    else if (!/\(/.test(expr)) say = '<b>ひだりから</b> じゅんに';
    else say = 'かっこの そとは <b>ひだりから</b> じゅんに';
    const hint = r.paren
      ? `${kkText(r.sub)} を さきに けいさん するよ`
      : `ひかって いる ${kkText(r.sub)} を けいさん しよう`;
    return {
      kind: 'answer', expected: r.val, before: `${kkText(r.sub)} =`,
      // うえは もとの しき（さいしょ だけ ひからせる）。とちゅうは したの え で みせる
      prompt: `${opts.story ? `<div class="kk-story-sm">${opts.story}</div>` : ''}<div class="kk-expr">${i === 0 ? kkHtml(r.from, r.at, r.len) : kkHtml(expr)}</div>`,
      unit: last ? opts.unit : undefined,
      say, hint,
      view: { top: opts.top, expr, done: i },
    };
  });
}

// こたえ だけ（あたまの なかで）
function kkOneStep(expr) {
  const st = kkSteps(expr);
  return [{
    kind: 'answer', expected: kkEval(expr),
    prompt: `<div class="kk-expr">${kkHtml(expr)}<span class="kk-o">=</span></div>`,
    say: 'かっこの なかから あたまの なかで けいさん しよう',
    hint: st[0].paren ? `まず かっこの なか ${kkText(st[0].sub)} は いくつ？` : 'ひだりから じゅんに けいさん しよう',
    view: { expr, done: 0, hide: true },
    showAll: true,
  }];
}

// まちがいの せんたくし：こたえが ちがう ものから 2つ（おなじ こたえ どうしも さける）
function kkChoices(correct, pool, n = 2) {
  const right = kkEval(correct);
  const used = new Set([right]);
  const picks = [];
  for (const f of shuffle(pool)) {
    if (f === correct) continue;
    const v = kkEval(f);
    if (used.has(v)) continue;
    used.add(v);
    picks.push(f);
    if (picks.length === n) break;
  }
  const list = shuffle([correct, ...picks]);
  return { list, answer: list.indexOf(correct) };
}

// ---------- けいさんの もんだい ----------

// となりあう かずが おなじ（7 − 7・(4 + 4) など）
function kkSamePair(e) {
  const nums = kkTokens(e).filter((x) => /\d/.test(x.t)).map((x) => x.t);
  return nums.some((v, i) => i > 0 && v === nums[i - 1]);
}

// form の a b c d に 1〜max の かずを いれて、とちゅうも こたえも 1〜max に なる ものを つくる
function kkMake(form, max, lo = 1) {
  for (let t = 0; t < 2000; t++) {
    const hi = max <= 20 ? max - 2 : max - 10;
    const n = { a: rand(lo, hi), b: rand(lo, Math.min(hi, max <= 20 ? 9 : 60)), c: rand(lo, Math.min(hi, max <= 20 ? 9 : 40)), d: rand(lo, Math.min(hi, max <= 20 ? 9 : 30)) };
    const e = kkSub(form, n);
    if (kkSamePair(e) && Math.random() < 0.8) continue;   // 7 − 7 など おなじ かず どうしは すくなめに
    if (kkOk(e, max)) return e;
  }
  return kkSub(form, { a: 9, b: 3, c: 2, d: 1 });
}

// かっこが あると こたえが かわる かたち を おおめに
const KK_FORMS_1 = ['a-(b+c)', 'a-(b+c)', 'a-(b-c)', 'a-(b-c)', 'a+(b-c)', '(a-b)+c', '(a+b)-c', 'a+(b+c)'];
const KK_FORMS_2 = ['(a+b)-(c+d)', '(a-b)+(c-d)', '(a+b)-(c-d)', '(a-b)-(c-d)', '(a+b)+(c-d)', 'a-(b+c)-d', 'a-(b-c)+d', '(a-b)-(c+d)'];

function kkCalcSet(forms, count, max, lo) {
  const out = [];
  const bag = [];
  while (out.length < count) {
    if (!bag.length) bag.push(...shuffle(forms));
    const e = kkMake(bag.pop(), max, lo);
    if (out.some((q) => q.expr === e)) continue;
    out.push({ kind: 'calc', expr: e, label: kkText(e) });
  }
  return out;
}

// かっこを どこに つける？  x ○ y ○ z = N
function kkWhereQuestion() {
  const ops = Math.random() < 0.7 ? shuffle([['-', '+'], ['-', '-']])[0] : shuffle([['+', '-'], ['+', '+']])[0];
  for (let t = 0; t < 2000; t++) {
    const x = rand(8, 20), y = rand(2, 9), z = rand(1, 8);
    const A = `(${x}${ops[0]}${y})${ops[1]}${z}`;
    const B = `${x}${ops[0]}(${y}${ops[1]}${z})`;
    if (!kkOk(A, 30) || !kkOk(B, 30)) continue;
    const vA = kkEval(A), vB = kkEval(B);
    const same = vA === vB;
    const pickA = Math.random() < 0.5;
    const target = same ? vA : pickA ? vA : vB;
    return { kind: 'where', plain: `${x}${ops[0]}${y}${ops[1]}${z}`, A, B, vA, vB, same, target, label: `${kkText(`${x}${ops[0]}${y}${ops[1]}${z}`)} = ${target}` };
  }
  return null;
}

// ---------- ぶんしょうだい ----------

const KK_THINGS = [['あめ', '🍬'], ['クッキー', '🍪'], ['どんぐり', '🌰'], [`ビー${rb('玉', 'だま')}`, '🔵'], ['いちご', '🍓']];
const r10 = (lo, hi) => rand(lo / 10, hi / 10) * 10;

// form：ただしい しき、pool：まちがいの せんたくし、why：せいかい した あとの せつめい
const KK_STORIES = {
  give2: {
    form: 'a-(b+c)', unit: 'こ', pool: ['a-b+c', 'a+(b+c)', '(a+b)-c', 'a+b+c'],
    nums: () => ({ a: rand(11, 20), b: rand(2, 5), c: rand(2, 5) }),
    text: (n, it) => `${it[0]}が ${n.a}こ あります。いもうとに ${n.b}こ、おとうとに ${n.c}こ あげました。のこりは ${rb('何', 'なん')}こ？`,
    short: (n) => `${n.a}こ ある あめを、いもうとに ${n.b}こ、おとうとに ${n.c}こ あげた。のこりは？`,
    cards: (n, it) => [[it[1], 'はじめ', n.a], ['👧', 'いもうと', n.b], ['👦', 'おとうと', n.c]],
    why: (n) => `あげた かずを まとめると (${n.b} + ${n.c})こ。それを まとめて ひくよ`,
  },
  eat2: {
    form: 'a-(b+c)', unit: 'こ', pool: ['a-b+c', 'a+(b+c)', 'a+b-c'],
    nums: () => ({ a: rand(12, 20), b: rand(2, 6), c: rand(2, 6) }),
    text: (n) => `いちごが ${n.a}こ あります。わたしが ${n.b}こ、おにいさんが ${n.c}こ たべました。のこりは ${rb('何', 'なん')}こ？`,
    cards: (n) => [['🍓', 'はじめ', n.a], ['🙋', 'わたし', n.b], ['🧒', 'おにいさん', n.c]],
    why: (n) => `たべた かずは ふたりで (${n.b} + ${n.c})こ。まとめて ひくよ`,
  },
  pages: {
    form: 'a-(b+c)', unit: 'ページ', pool: ['a-b+c', 'a+(b+c)', 'a-(b-c)'],
    nums: () => ({ a: rand(14, 20), b: rand(3, 6), c: rand(2, 6) }),
    text: (n) => `${n.a}ページの えほんが あります。きのう ${n.b}ページ、きょう ${n.c}ページ ${rb('読', 'よ')}みました。のこりは ${rb('何', 'なん')}ページ？`,
    cards: (n) => [['📖', 'ぜんぶ', n.a], ['🌙', 'きのう', n.b], ['☀️', 'きょう', n.c]],
    why: (n) => `よんだ ページは (${n.b} + ${n.c})。ぜんぶから まとめて ひくよ`,
  },
  bus: {
    form: 'a-b+c', unit: 'にん', pool: ['a-(b+c)', 'a+b-c', 'a+(b+c)'],
    nums: () => ({ a: rand(10, 18), b: rand(2, 7), c: rand(2, 7) }),
    text: (n) => `バスに ${n.a}${rb('人', 'にん')} のって います。バスていで ${n.b}${rb('人', 'にん')} おりて、${n.c}${rb('人', 'にん')} のって きました。いま ${rb('何人', 'なんにん')}？`,
    short: (n) => `バスに ${n.a}${rb('人', 'にん')}。${n.b}${rb('人', 'にん')} おりて、${n.c}${rb('人', 'にん')} のった。いま ${rb('何人', 'なんにん')}？`,
    cards: (n) => [['🚌', 'はじめ', n.a], ['⬇️', 'おりた', n.b], ['⬆️', 'のった', n.c]],
    why: (n) => `おりた ${n.b}${rb('人', 'にん')}を ひいて、のった ${n.c}${rb('人', 'にん')}を たす。じゅんばん どおり だから かっこは いらないね`,
  },
  birds: {
    form: 'a-b+c', unit: 'わ', pool: ['a-(b+c)', 'a+b-c', 'a+(b+c)'],
    nums: () => ({ a: rand(9, 16), b: rand(2, 7), c: rand(2, 7) }),
    text: (n) => `こうえんに はとが ${n.a}わ いました。${n.b}わ とんで いって、${n.c}わ とんで きました。いま ${rb('何', 'なん')}わ？`,
    cards: (n) => [['🕊️', 'はじめ', n.a], ['↗️', 'いった', n.b], ['↘️', 'きた', n.c]],
    why: (n) => `いった ${n.b}わを ひいて、きた ${n.c}わを たす。じゅんばん どおり だから かっこは いらないね`,
  },
  getUse: {
    form: '(a+b)-c', unit: 'まい', pool: ['a-(b+c)', 'a-b+c', 'a+(b+c)'],
    nums: () => ({ a: rand(5, 12), b: rand(3, 8), c: rand(2, 9) }),
    text: (n) => `シールを ${n.a}まい もって います。おねえさんから ${n.b}まい もらって、その あと ${n.c}まい つかいました。いま ${rb('何', 'なん')}まい？`,
    short: (n) => `シールが ${n.a}まい。${n.b}まい もらって、${n.c}まい つかった。いま ${rb('何', 'なん')}まい？`,
    cards: (n) => [['⭐', 'はじめ', n.a], ['🎁', 'もらった', n.b], ['✂️', 'つかった', n.c]],
    why: (n) => `まず もらって (${n.a} + ${n.b})まい。そこから ${n.c}まい ひくよ`,
  },
  add2: {
    form: 'a+(b+c)', unit: 'こ', pool: ['a-(b+c)', 'a+b-c', 'a-b+c'],
    nums: () => ({ a: rand(4, 10), b: rand(2, 6), c: rand(2, 5) }),
    text: (n, it) => `${it[0]}を ${n.a}こ もって います。おとうさんから ${n.b}こ、おかあさんから ${n.c}こ もらいました。${rb('全部', 'ぜんぶ')}で ${rb('何', 'なん')}こ？`,
    short: (n) => `${n.a}こ もって いて、おとうさんから ${n.b}こ、おかあさんから ${n.c}こ もらった。${rb('全部', 'ぜんぶ')}で？`,
    cards: (n, it) => [[it[1], 'はじめ', n.a], ['👨', 'おとうさん', n.b], ['👩', 'おかあさん', n.c]],
    why: (n) => `もらった かずを まとめて (${n.b} + ${n.c})こ。それを たすよ`,
  },
  // ---- チャレンジ ----
  buy2: {
    form: 'a-(b+c)', unit: 'えん', pool: ['a-b+c', 'a+(b+c)', 'a-(b-c)'],
    nums: () => { const b = r10(30, 90), c = r10(20, 70); return { a: Math.min(200, r10(b + c + 10, b + c + 80)), b, c }; },
    text: (n) => `${n.a}${rb('円', 'えん')} もって います。${n.b}${rb('円', 'えん')}の ノートと ${n.c}${rb('円', 'えん')}の えんぴつを かいました。のこりは ${rb('何円', 'なんえん')}？`,
    cards: (n) => [['👛', 'もって いる', n.a], ['📓', 'ノート', n.b], ['✏️', 'えんぴつ', n.c]],
    why: (n) => `つかった おかねは (${n.b} + ${n.c})${rb('円', 'えん')}。まとめて ひくよ`,
  },
  discount: {
    form: 'a-(b-c)', unit: 'えん', pool: ['a-(b+c)', 'a+(b-c)', 'a-b', 'a+b-c'],
    nums: () => ({ a: r10(150, 200), b: r10(80, 140), c: r10(10, 40) }),
    text: (n) => `${n.a}${rb('円', 'えん')} もって います。${n.b}${rb('円', 'えん')}の ジュースが、きょうは ${n.c}${rb('円', 'えん')} やすく なって いました。ジュースを 1${rb('本', 'ぽん')} かうと、のこりは ${rb('何円', 'なんえん')}？`,
    cards: (n) => [['👛', 'もって いる', n.a], ['🧃', 'ジュース', n.b], ['🏷️', 'やすく なる', n.c]],
    why: (n) => `ジュースの ねだんは (${n.b} − ${n.c})${rb('円', 'えん')}。それを まとめて ひくよ`,
  },
  less: {
    form: 'a+(a-b)', unit: 'こ', pool: ['a+(a+b)', 'a-b', 'a+b'],
    nums: () => ({ a: rand(15, 45), b: rand(3, 12) }),
    text: (n) => `たろうさんは どんぐりを ${n.a}こ ひろいました。はなこさんは たろうさんより ${n.b}こ すくなく ひろいました。ふたり あわせて ${rb('何', 'なん')}こ？`,
    cards: (n) => [['👦', 'たろう', n.a], ['👧', 'はなこは すくない', n.b]],
    why: (n) => `はなこさんは (${n.a} − ${n.b})こ。たろうさんの ${n.a}こと あわせるよ`,
  },
  more: {
    form: 'a+(a+b)', unit: 'まい', pool: ['a+(a-b)', 'a+b', 'a+a'],
    nums: () => ({ a: rand(12, 40), b: rand(3, 15) }),
    text: (n) => `${rb('赤', 'あか')}い いろがみが ${n.a}まい あります。${rb('青', 'あお')}い いろがみは ${rb('赤', 'あか')}より ${n.b}まい おおいです。あわせて ${rb('何', 'なん')}まい？`,
    cards: (n) => [['🟥', 'あか', n.a], ['🟦', 'あおは おおい', n.b]],
    why: (n) => `${rb('青', 'あお')}は (${n.a} + ${n.b})まい。${rb('赤', 'あか')}の ${n.a}まいと あわせるよ`,
  },
  pages2: {
    form: 'a-(b+c)', unit: 'ページ', pool: ['a-b+c', 'a+(b+c)', 'a-(b-c)'],
    nums: () => ({ a: rand(60, 99), b: rand(12, 30), c: rand(10, 28) }),
    text: (n) => `${n.a}ページの ${rb('本', 'ほん')}が あります。きのう ${n.b}ページ、きょう ${n.c}ページ ${rb('読', 'よ')}みました。のこりは ${rb('何', 'なん')}ページ？`,
    cards: (n) => [['📚', 'ぜんぶ', n.a], ['🌙', 'きのう', n.b], ['☀️', 'きょう', n.c]],
    why: (n) => `よんだ ページは (${n.b} + ${n.c})。まとめて ひくよ`,
  },
  cards: {
    form: 'a-b+c', unit: 'まい', pool: ['a-(b+c)', 'a+b-c', 'a+(b+c)'],
    nums: () => ({ a: rand(30, 60), b: rand(8, 25), c: rand(8, 25) }),
    text: (n) => `カードを ${n.a}まい もって いました。ともだちに ${n.b}まい あげて、べつの ともだちから ${n.c}まい もらいました。いま ${rb('何', 'なん')}まい？`,
    cards: (n) => [['🃏', 'はじめ', n.a], ['📤', 'あげた', n.b], ['📥', 'もらった', n.c]],
    why: (n) => `あげた ${n.b}まいを ひいて、もらった ${n.c}まいを たす。じゅんばん どおり だから かっこは いらないね`,
  },
  train: {
    form: 'a+b-c', unit: 'にん', pool: ['a-(b+c)', 'a+(b+c)', 'a-b+c'],
    nums: () => ({ a: rand(25, 50), b: rand(8, 25), c: rand(8, 25) }),
    text: (n) => `でんしゃに ${n.a}${rb('人', 'にん')} のって います。えきで ${n.b}${rb('人', 'にん')} のって きて、${n.c}${rb('人', 'にん')} おりました。いま ${rb('何人', 'なんにん')}？`,
    cards: (n) => [['🚃', 'はじめ', n.a], ['⬆️', 'のった', n.b], ['⬇️', 'おりた', n.c]],
    why: (n) => `のった ${n.b}${rb('人', 'にん')}を たして、おりた ${n.c}${rb('人', 'にん')}を ひく。じゅんばん どおり だから かっこは いらないね`,
  },
};

function kkStoryQuestion(key) {
  const s = KK_STORIES[key];
  for (let t = 0; t < 500; t++) {
    const n = s.nums();
    const expr = kkSub(s.form, n);
    if (!kkOk(expr, 300)) continue;
    const choice = kkChoices(expr, s.pool.map((f) => kkSub(f, n)));
    if (choice.list.length < 3) continue;
    const it = KK_THINGS[rand(0, KK_THINGS.length - 1)];
    const plain = s.text(n, it).replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '');
    return { kind: 'story', key, n, it, expr, choice, label: plain.slice(0, 24) + '…' };
  }
  return null;
}

// しきに あう おはなしは どれ？（3つの おはなしは おなじ かずで、こたえが ちがう しき）
function kkReverseQuestion() {
  const keys = ['give2', 'bus', 'getUse', 'add2'];
  for (let t = 0; t < 500; t++) {
    const a = rand(10, 18), b = rand(2, 7), c = rand(2, 7);
    const n = { a, b, c };
    const picks = shuffle(keys).slice(0, 3);
    const exprs = picks.map((k) => kkSub(KK_STORIES[k].form, n));
    const vals = exprs.map(kkEval);
    if (new Set(vals).size < 3 || !exprs.every((e) => kkOk(e, 40))) continue;
    return { kind: 'reverse', n, keys: picks, expr: exprs[0], order: shuffle([0, 1, 2]), label: `${kkText(exprs[0])} の おはなし` };
  }
  return null;
}

function kkStorySteps(q) {
  const s = KK_STORIES[q.key];
  const text = s.text(q.n, q.it);
  const top = kkCards(s.cards(q.n, q.it));
  return [
    {
      kind: 'choice', prompt: `${text}<br><small>${rb('式', 'しき')}は どれ？</small>`,
      options: q.choice.list.map((e) => ({ html: kkHtml(e) })), answer: q.choice.answer,
      say: 'おはなしの じゅんばんを よく よもう',
      hint: 'どれと どれを さきに まとめるか かんがえよう',
      explain: s.why(q.n),
      view: { top, note: 'おはなしの かず' },
      afterView: { top, expr: q.expr, done: 0, hi: false },
      waitNext: true,
    },
    ...kkCalcSteps(q.expr, { unit: s.unit, top, story: text }),
  ];
}

function kkReverseSteps(q) {
  const stories = q.order.map((i) => q.keys[i]);
  const options = stories.map((k) => ({ html: `<span class="kk-story">${(KK_STORIES[k].short || KK_STORIES[k].text)(q.n, ['あめ', '🍬'])}</span>` }));
  return [
    {
      kind: 'choice',
      prompt: `<div class="kk-expr">${kkHtml(q.expr)}</div><small>この ${rb('式', 'しき')}に あう おはなしは どれ？</small>`,
      options, answer: q.order.indexOf(0),
      say: 'それぞれの おはなしを しきに して くらべよう',
      hint: 'かっこの なかは「まとめて」かんがえる ところだよ',
      explain: KK_STORIES[q.keys[0]].why(q.n),
      view: { html: kkNote('おはなしを 1つずつ しきに して、<br>うえの しきと おなじ ものを さがそう') },
      afterView: { expr: q.expr, done: 99, hi: false },
      waitNext: true,
    },
    ...kkCalcSteps(q.expr),
  ];
}

function kkWhereSteps(q) {
  const [A, B] = [q.A, q.B];
  // 「どちらでも」が ある ので、せんたくしは「〜 だけ」に する（りょうほう あう ときに かたほうを えらんでも まちがいに ならない ように）
  const opts = [{ html: `${kkHtml(A)} <small>だけ</small>` }, { html: `${kkHtml(B)} <small>だけ</small>` }, { html: `どちらでも ${q.target}` }];
  const answer = q.same ? 2 : q.target === q.vA ? 0 : 1;
  const both = `<div class="kk-two"><div>${kkBoard(A, 99, false)}</div><div>${kkBoard(B, 99, false)}</div></div>`;
  const explain = q.same
    ? `どちらに つけても ${q.target}！ たして ひく ときや たすだけの ときは かわらないよ`
    : `${kkText(A)} = ${q.vA}、${kkText(B)} = ${q.vB}。ひきざんの あとの かっこで こたえが かわるよ`;
  const other = answer === 0 ? B : A;
  return [
    {
      kind: 'choice',
      prompt: `<div class="kk-expr">${kkHtml(q.plain)}<span class="kk-o">=</span><span class="kk-n">${q.target}</span></div><small>どこに かっこを つけると こたえが ${q.target} に なる？</small>`,
      options: opts, answer,
      say: 'かっこを つけて、それぞれ けいさん して みよう',
      hint: 'ひとつずつ かっこの なかから けいさん して たしかめよう',
      explain,
      view: { html: `<div class="kk-note">かっこの つけかたは 2とおり<div class="kk-two"><div class="kk-line">${kkHtml(A)}</div><div class="kk-line">${kkHtml(B)}</div></div></div>` },
      afterView: { html: both },
      waitNext: true,
    },
    q.same
      ? {
        kind: 'answer', expected: kkEval(q.plain), prompt: `<div class="kk-expr">${kkHtml(q.plain)}<span class="kk-o">=</span></div><small>かっこを つけずに ひだりから けいさん すると？</small>`,
        say: 'ひだりから じゅんに', hint: 'ひだりから じゅんに けいさん しよう',
        view: { html: both },
      }
      : {
        kind: 'answer', expected: kkEval(other), prompt: `<div class="kk-expr">${kkHtml(other)}<span class="kk-o">=</span></div><small>もう ひとつの つけかた だと いくつ？</small>`,
        say: 'かっこの なかから', hint: 'かっこの なかから けいさん しよう',
        view: { html: both },
      },
  ];
}

// おはなしの かず（カード）
function kkCards(list) {
  return `<div class="kk-cards">${list.map(([icon, label, n]) => `<div class="kk-card"><span class="kk-ci">${icon}</span><span>${label}</span><b>${n}</b></div>`).join('')}</div>`;
}

// ---------- 📖 せつめい ----------

const kkIcons = (icon, n, cls = '') => Array.from({ length: n }, () => `<span class="${cls}">${icon}</span>`).join('');
const kkNote = (html) => `<div class="kk-note">${html}</div>`;

function kkLessons() {
  const r = (lo, hi) => rand(lo, hi);
  // 1. ひだりから じゅんに
  const c1 = (() => { const b = r(3, 6), c = r(2, 5); return `${r(b + 4, 15)}-${b}+${c}`; })();
  // 2. かっこは さきに
  const c2 = (() => { const b = r(2, 5), c = r(1, 4); return `${r(b + c + 2, 15)}-(${b}+${c})`; })();
  // 3. ひとまとまり
  const c3 = { a: r(11, 15), b: r(3, 5), c: r(2, 4) };
  // 4. こたえが かわる
  const c4 = { a: r(12, 18), b: r(4, 6), c: r(2, 3) };
  // 6. ひきざんの かっこの ひみつ
  const c6 = { a: r(15, 20), b: r(6, 9), c: r(2, 4) };
  // 7. まとめ
  const c7 = (() => { for (;;) { const e = kkMake('(a+b)-(c-d)', 20); if (kkSteps(e).length === 3) return e; } })();

  return [
    {
      kind: 'lesson', label: '① ひだりから じゅんに',
      steps: [
        {
          kind: 'info', prompt: `<div class="kk-expr">${kkHtml('10-3+2')}</div>`,
          say: '① けいさんの じゅんばん',
          view: { html: kkNote('かっこが ない ときは、<b>ひだりから じゅんばんに</b> けいさん するよ。') + kkBoard('10-3+2', 2) },
        },
        ...kkCalcSteps(c1).map((s, i) => (i === 0 ? { ...s, say: 'やって みよう！ ひだりから じゅんに' } : s)),
      ],
    },
    {
      kind: 'lesson', label: '② かっこは さきに',
      steps: [
        {
          kind: 'info', prompt: `<div class="kk-expr">${kkHtml('10-(3+2)')}</div>`,
          say: '② かっこ（ ）が でて きたら？',
          view: { html: kkNote('<span class="kk-p">( )</span> は「<b>ここを さきに けいさん してね</b>」の しるし。') + kkBoard('10-(3+2)', 0) },
        },
        {
          kind: 'info', prompt: `<div class="kk-expr">${kkHtml('10-(3+2)')}</div>`,
          say: 'かっこの なかが 1つの かずに なると かっこは きえる',
          view: { html: kkNote(`まず ${kkHtml('(3+2)')} を けいさんして <b>5</b>。<br>かっこの なかが 1つの かずに なったら、かっこは きえるよ。`) + kkBoard('10-(3+2)', 2) },
        },
        ...kkCalcSteps(c2).map((s, i) => (i === 0 ? { ...s, say: 'やって みよう！ まず <b>かっこの なか</b>' } : s)),
      ],
    },
    {
      kind: 'lesson', label: '③ かっこは ひとまとまり',
      steps: [
        {
          kind: 'info', prompt: `あめが ${c3.a}こ あります。いもうとに ${c3.b}こ、おとうとに ${c3.c}こ あげました。のこりは ${rb('何', 'なん')}こ？`,
          say: '③ かっこは「ひとまとまり」',
          view: { html: `<div class="kk-icons">${kkIcons('🍬', c3.a - c3.b - c3.c)}<span class="kk-bag small">${kkIcons('🍬', c3.b)}<i>👧 ${c3.b}</i></span><span class="kk-bag small blue">${kkIcons('🍬', c3.c)}<i>👦 ${c3.c}</i></span></div>` },
        },
        {
          kind: 'info', prompt: `<div class="kk-expr">${kkHtml(`${c3.a}-(${c3.b}+${c3.c})`)}</div>`,
          say: 'あげた ぶんを ふくろに まとめると…',
          view: {
            html: `<div class="kk-icons">${kkIcons('🍬', c3.a - c3.b - c3.c)}<span class="kk-bag">${kkIcons('🍬', c3.b + c3.c, 'kk-gone')}<i>あげた ぶん ${kkHtml(`(${c3.b}+${c3.c})`)}</i></span></div>`
              + kkNote(`あげた かずを まとめて ${kkHtml(`(${c3.b}+${c3.c})`)}。<br>かっこは かずを <b>ひとまとまりに する ふくろ</b> みたいな もの。`),
          },
        },
        (() => {
          const a = r(12, 16), b = r(3, 5), c = r(2, 4);
          const ch = kkChoices(`${a}-(${b}+${c})`, [`${a}-${b}+${c}`, `${a}+(${b}+${c})`]);
          return {
            kind: 'choice', prompt: `クッキーが ${a}こ。ぼくが ${b}こ、ともだちが ${c}こ たべました。<br>たべた かずを <b>まとめて</b> ひく ${rb('式', 'しき')}は どれ？`,
            options: ch.list.map((e) => ({ html: kkHtml(e) })), answer: ch.answer,
            say: 'たべた かずを ふくろに まとめよう',
            hint: `たべた かずを まとめると (${b} + ${c})`,
            explain: `たべた かずは (${b} + ${c})こ。それを まとめて ひくよ`,
            view: { html: `<div class="kk-icons">${kkIcons('🍪', a)}</div>` },
            afterView: { html: `<div class="kk-icons">${kkIcons('🍪', a - b - c)}<span class="kk-bag">${kkIcons('🍪', b + c, 'kk-gone')}<i>${kkHtml(`(${b}+${c})`)}</i></span></div>` + kkBoard(`${a}-(${b}+${c})`, 99, false) },
            waitNext: true,
          };
        })(),
      ],
    },
    {
      kind: 'lesson', label: '④ かっこで こたえが かわる',
      steps: [
        {
          kind: 'info', prompt: `<div class="kk-expr">${kkHtml('10-3+2')} と ${kkHtml('10-(3+2)')}</div>`,
          say: '④ おなじ かず なのに…？',
          view: { html: `<div class="kk-two"><div>${kkBoard('10-3+2', 2, false)}</div><div>${kkBoard('10-(3+2)', 2, false)}</div></div>` + kkNote('かっこが あるか ないかで <b>こたえが ちがう！</b>') },
        },
        {
          kind: 'info', prompt: `<div class="kk-expr">${kkHtml('10-(3+2)')}</div>`,
          say: 'ひく かずが ちがうんだね',
          view: {
            html: `<div class="kk-two"><div class="kk-col"><div class="kk-line">${kkHtml('10-3+2')}</div><div class="kk-icons small">${kkIcons('🟧', 7)}${kkIcons('🟧', 3, 'kk-gone')}${kkIcons('🟦', 2, 'kk-new')}</div><small>3 を ひいて、2 を <b>たす</b></small></div>`
              + `<div class="kk-col"><div class="kk-line">${kkHtml('10-(3+2)')}</div><div class="kk-icons small">${kkIcons('🟧', 5)}${kkIcons('🟧', 5, 'kk-gone')}</div><small>3 も 2 も <b>ひく</b></small></div></div>`,
          },
        },
        {
          kind: 'choice', prompt: `<div class="kk-expr">${kkHtml(`${c4.a}-${c4.b}+${c4.c}`)} と ${kkHtml(`${c4.a}-(${c4.b}+${c4.c})`)}</div><small>こたえが <b>ちいさい</b> のは どっち？</small>`,
          options: [{ html: kkHtml(`${c4.a}-${c4.b}+${c4.c}`) }, { html: kkHtml(`${c4.a}-(${c4.b}+${c4.c})`) }, { html: 'おなじ' }], answer: 1,
          say: 'どちらも けいさん して くらべよう',
          hint: `かっこの ほうは ${c4.b} も ${c4.c} も ひくよ`,
          explain: `${kkText(`${c4.a}-${c4.b}+${c4.c}`)} = ${c4.a - c4.b + c4.c}、${kkText(`${c4.a}-(${c4.b}+${c4.c})`)} = ${c4.a - c4.b - c4.c}`,
          view: { html: kkNote('けいさん して くらべて みよう') },
          afterView: { html: `<div class="kk-two"><div>${kkBoard(`${c4.a}-${c4.b}+${c4.c}`, 99, false)}</div><div>${kkBoard(`${c4.a}-(${c4.b}+${c4.c})`, 99, false)}</div></div>` },
          waitNext: true,
        },
      ],
    },
    {
      kind: 'lesson', label: '⑤ たしざん だけ なら おなじ',
      steps: [
        {
          kind: 'info', prompt: `<div class="kk-expr">${kkHtml('4+(3+2)')} と ${kkHtml('(4+3)+2')}</div>`,
          say: '⑤ たしざん だけの ときは？',
          view: { html: `<div class="kk-two"><div>${kkBoard('4+(3+2)', 2, false)}</div><div>${kkBoard('(4+3)+2', 2, false)}</div></div>` + kkNote('<b>たしざん だけ</b>の ときは、どこに かっこを つけても こたえは おなじ。<br>ふえる かずは ぜんぶ おなじ だからね。') },
        },
        (() => {
          const a = r(5, 9), b = r(2, 6), c = r(3, 7);
          return {
            kind: 'choice', prompt: `<div class="kk-expr">${kkHtml(`${a}+(${b}+${c})`)} と ${kkHtml(`(${a}+${b})+${c}`)}</div><small>こたえが おおきい のは どっち？</small>`,
            options: [{ html: kkHtml(`${a}+(${b}+${c})`) }, { html: kkHtml(`(${a}+${b})+${c}`) }, { html: 'おなじ' }], answer: 2,
            say: 'けいさん して みても いいよ',
            hint: 'たしざん だけの ときは どう だったかな？',
            explain: `どちらも ${a + b + c}。たしざん だけ なら おなじ！`,
            view: { html: kkNote('どっちかな？') },
            afterView: { html: `<div class="kk-two"><div>${kkBoard(`${a}+(${b}+${c})`, 99, false)}</div><div>${kkBoard(`(${a}+${b})+${c}`, 99, false)}</div></div>` },
            waitNext: true,
          };
        })(),
      ],
    },
    {
      kind: 'lesson', label: '⑥ ひきざんの かっこの ひみつ',
      steps: [
        {
          kind: 'info', prompt: `<div class="kk-expr">${kkHtml('10-(3+2)')} = ${kkHtml('10-3-2')}</div>`,
          say: '⑥ ひみつ その1',
          view: { html: `<div class="kk-two"><div>${kkBoard('10-(3+2)', 2, false)}</div><div>${kkBoard('10-3-2', 2, false)}</div></div>` + kkNote('「(3 + 2) を ひく」は「3 を ひいて、2 も ひく」と おなじ。') },
        },
        {
          kind: 'info', prompt: `<div class="kk-expr">${kkHtml('10-(5-2)')} = ${kkHtml('10-5+2')}</div>`,
          say: '⑥ ひみつ その2',
          view: {
            html: `<div class="kk-icons small">${kkIcons('🟧', 5)}${kkIcons('🟧', 2, 'kk-back')}${kkIcons('🟧', 3, 'kk-gone')}</div>`
              + kkNote('「(5 − 2) を ひく」は「5 こ とって、とりすぎた <b>2 こ を かえす</b>」と おなじ。<br>だから 10 − (5 − 2) = 10 − 5 <b>+</b> 2 = 7'),
          },
        },
        (() => {
          const { a, b, c } = c6;
          const right = `${a}-${b}+${c}`;
          const ch = kkChoices(right, [`${a}-${b}-${c}`, `${a}+${b}-${c}`]);
          return {
            kind: 'choice', prompt: `<div class="kk-expr">${kkHtml(`${a}-(${b}-${c})`)}</div><small>と おなじ こたえに なる ${rb('式', 'しき')}は どれ？</small>`,
            options: ch.list.map((e) => ({ html: kkHtml(e) })), answer: ch.answer,
            say: 'とりすぎた ぶんは かえすんだったね',
            hint: `${b} こ とって、とりすぎた ${c} こ を かえすよ`,
            explain: `${kkText(`${a}-(${b}-${c})`)} = ${kkText(right)} = ${a - b + c}`,
            view: { html: kkNote('ひみつ その2 を つかおう') },
            afterView: { html: `<div class="kk-two"><div>${kkBoard(`${a}-(${b}-${c})`, 99, false)}</div><div>${kkBoard(right, 99, false)}</div></div>` },
            waitNext: true,
          };
        })(),
      ],
    },
    {
      kind: 'lesson', label: '⑦ まとめ',
      steps: [
        {
          kind: 'info', prompt: '<b>かっこの けいさん</b>の しかた',
          say: '⑦ まとめ',
          view: { html: kkNote(`<ol class="kk-rules"><li><span class="kk-p">( )</span> を さがす</li><li><b>かっこの なか</b>を さきに けいさんして、1つの かずに する</li><li>のこりは <b>ひだりから</b> じゅんばんに</li></ol>`) + kkBoard('(7+5)-(6-2)', 3) },
        },
        ...kkCalcSteps(c7).map((s, i) => (i === 0 ? { ...s, say: 'さいごの もんだい！ かっこを さがそう' } : s)),
      ],
    },
  ];
}

// ---------- ユニット ----------

const KAKKO_UNIT = {
  steps(q) {
    if (q.kind === 'lesson') return q.steps;
    if (q.kind === 'where') return kkWhereSteps(q);
    if (q.kind === 'story') return kkStorySteps(q);
    if (q.kind === 'reverse') return kkReverseSteps(q);
    if (q.oneStep) return kkOneStep(q.expr);
    return kkCalcSteps(q.expr);
  },

  view(box) {
    const view = { spec: {} };
    view.draw = () => {
      const s = view.spec || {};
      let html = s.top || '';
      if (s.html) html += s.html;
      if (s.expr && !s.hide) html += kkBoard(s.expr, s.done || 0, s.hi !== false);
      if (s.note && !s.html) html += `<div class="kk-hint-note">${s.note}</div>`;
      box.innerHTML = `<div class="kk-wrap">${html}</div>`;
    };
    view.layout = () => view.draw();
    return view;
  },

  enter(view, step) {
    view.spec = { ...(step.view || {}) };
  },

  after(view, step) {
    if (step.afterView) view.spec = { ...step.afterView };
    else if (step.view && step.view.expr) {
      const total = kkSteps(step.view.expr).length;
      view.spec = { ...step.view, hide: false, hi: false, done: step.showAll ? total : (step.view.done || 0) + 1 };
    }
    view.draw();
  },
};

UNITS.kakkoex = KAKKO_UNIT;
UNITS.kakko = KAKKO_UNIT;

// ---------- ホームの いちばん うえ（とくべつ かだい） ----------

const KK_GROUP = 'とくべつ かだい：かっこ（ ）の けいさん';
LEVELS.unshift(
  {
    id: 'kk-ex', type: 'kakkoex', group: KK_GROUP, special: true,
    title: '📖 かっこって なに？', desc: 'せつめい：かっこは さきに・ひとまとまり・こたえが かわる',
    make: () => kkLessons(),
  },
  {
    id: 'kk-1', type: 'kakko', group: KK_GROUP, special: true,
    title: '① かっこの なかから', desc: '20 までの かず。1だんずつ けいさん',
    make: () => kkCalcSet(KK_FORMS_1, QUESTIONS_PER_SET, 20),
  },
  {
    id: 'kk-2', type: 'kakko', group: KK_GROUP, special: true,
    title: '② おおきい かず', desc: '100 までの かず（45 − (18 + 7) など）',
    make: () => kkCalcSet(KK_FORMS_1, QUESTIONS_PER_SET, 100, 5),
  },
  {
    id: 'kk-3', type: 'kakko', group: KK_GROUP, special: true,
    title: '③ かっこが 2つ', desc: '(12 + 6) − (9 − 4) など',
    make: () => kkCalcSet(KK_FORMS_2, 8, 30),
  },
  {
    id: 'kk-4', type: 'kakko', group: KK_GROUP, special: true,
    title: '④ こたえ だけ', desc: 'あたまの なかで けいさん（ごちゃまぜ）',
    make: () => shuffle([...kkCalcSet(KK_FORMS_1, 6, 20), ...kkCalcSet(KK_FORMS_1, 2, 50, 5), ...kkCalcSet(KK_FORMS_2, 2, 20)])
      .map((q) => ({ ...q, oneStep: true })),
  },
  {
    id: 'kk-5', type: 'kakko', group: KK_GROUP, special: true,
    title: '⑤ かっこを どこに つける？', desc: 'こたえが あう ように かっこを つける',
    make: () => Array.from({ length: 8 }, kkWhereQuestion).filter(Boolean),
  },
  {
    id: 'kk-6', type: 'kakko', group: KK_GROUP, special: true,
    title: '⑥ ぶんしょうだい', desc: 'おはなしに あう しきを えらぶ → けいさん',
    make: () => shuffle(['give2', 'eat2', 'pages', 'bus', 'birds', 'getUse', 'add2', shuffle(['give2', 'bus', 'getUse'])[0]])
      .map(kkStoryQuestion).filter(Boolean),
  },
  {
    id: 'kk-7', type: 'kakko', group: KK_GROUP, special: true,
    title: '⑦ ぶんしょうだい チャレンジ', desc: 'おかね・「より すくない」・しきに あう おはなし',
    make: () => shuffle([
      ...shuffle(['buy2', 'discount', 'less', 'more', 'pages2', 'cards', 'train']).slice(0, 6).map(kkStoryQuestion),
      kkReverseQuestion(), kkReverseQuestion(),
    ]).filter(Boolean),
  },
);
