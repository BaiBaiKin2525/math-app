// 画面の切り替え、出題、採点、記録。
// 1もんは いくつかの「ステップ」で すすむ（めもりを えらぶ → こたえる など）。

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HISTORY_KEY = 'mathapp.v1.history';
const MAX_DIGITS = 4;
const OPS = { add: '+', sub: '−', mul: '×', mul2: '×' };

const state = {
  level: null,
  questions: [],
  index: 0,
  steps: [],
  stepIndex: 0,
  input: '',
  attempts: 0,       // いまの ステップで まちがえた かいすう
  mistake: false,    // この もんだいで 1かいでも まちがえたか
  results: [],       // { a, b, firstOk }
  isRetry: false,
  startedAt: 0,
  timerId: null,
  countToken: 0,     // 「かぞえる」アニメを止めるための番号
  locked: false,     // ⭕ を出している間は入力させない
  hideVisual: false,
  view: null,        // タイル（createTileView）か タイルばん（createBoard）
};

// ---------- 記録（タブレットの中に保存） ----------

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(record) {
  try {
    const list = loadHistory();
    list.push(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-500)));
  } catch {
    // 保存できなくてもアプリは動かす
  }
}

function bestOf(levelId) {
  const list = loadHistory().filter((r) => r.level === levelId);
  if (!list.length) return null;
  return list.reduce((best, r) =>
    r.correct > best.correct || (r.correct === best.correct && r.ms < best.ms) ? r : best);
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------- おと ----------

let audio = null;
function beep(notes) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    let t = audio.currentTime;
    for (const [freq, dur, type] of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur * 0.8;
    }
  } catch {
    // 音が出せない環境では何もしない
  }
}
const soundOk = () => beep([[784, 0.12], [1047, 0.25]]);
const soundNg = () => beep([[220, 0.25, 'triangle']]);
const soundTick = () => beep([[660, 0.05]]);

// ---------- 画面 ----------

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

const GROUP_ICONS = {
  'たしざん': '➕',
  'ひきざん': '➖',
  'かけざん（くく）': '✖️',
  'くく タイムアタック': '⏱️',
  '2けたの かけざん': '🔢',
  'タイルで あそぶ': '🧩',
};

function renderHome() {
  clearInterval(state.timerId);
  state.countToken++;
  const root = $('level-groups');
  root.innerHTML = '';
  const groups = [...new Set(LEVELS.map((l) => l.group))];
  for (const g of groups) {
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = `${GROUP_ICONS[g] || ''} ${g}`;
    root.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'level-grid';
    for (const level of LEVELS.filter((l) => l.group === g)) {
      const best = level.type === 'free' ? null : bestOf(level.id);
      let bestText = '';
      if (best) {
        bestText = level.type === 'ta'
          ? `さいこう ${best.correct}もん`
          : `さいこう ${best.correct}/${best.total}・${formatTime(best.ms)}`;
      }
      const card = document.createElement('button');
      card.className = `level-card ${level.type}`;
      card.innerHTML = `
        <span class="t">${level.title}</span>
        <span class="d">${level.desc}</span>
        <span class="best">${bestText}</span>`;
      card.addEventListener('click', () => {
        if (level.type === 'free') startFree(level);
        else if (level.type === 'ta') startTimeAttack(level);
        else startLevel(level, level.make(), false);
      });
      grid.appendChild(card);
    }
    root.appendChild(grid);
  }
  show('home');
}

// ---------- もんだいの ステップ ----------

function buildSteps(type, q) {
  const { a, b } = q;
  switch (type) {
    case 'add':
      return [{ kind: 'answer', expected: a + b }];
    case 'sub':
      return [{ kind: 'remove' }, { kind: 'answer', expected: a - b }];
    case 'mul':
      return [{ kind: 'pick-x' }, { kind: 'pick-y' }, { kind: 'answer', expected: a * b }];
    case 'mul2': {
      const regions = splitRegions(a, b);
      return [
        { kind: 'pick-x' },
        { kind: 'pick-y' },
        ...regions.map((r, i) => ({
          kind: 'answer', expected: r.w * r.h, region: i, formula: `${r.w} × ${r.h}`,
        })),
        {
          kind: 'answer', expected: a * b, total: true,
          formula: regions.map((r) => r.w * r.h).join(' + '),
        },
      ];
    }
  }
  return [];
}

function current() {
  return state.questions[state.index];
}

function curStep() {
  return state.steps[state.stepIndex];
}

function startLevel(level, questions, isRetry) {
  Object.assign(state, {
    level, questions, isRetry,
    index: 0, results: [], startedAt: Date.now(),
  });
  $('quiz').classList.remove('free-mode');
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    $('timer').textContent = formatTime(Date.now() - state.startedAt);
  }, 500);
  $('timer').textContent = '0:00';
  show('quiz');
  showQuestion();
}

function showQuestion() {
  const type = state.level.type;
  state.steps = buildSteps(type, current());
  state.stepIndex = 0;
  state.mistake = false;
  state.countToken++;
  renderProgress();
  setupTools(type);
  state.input = '';
  renderFormula();
  renderKeypad();          // テンキーを 置いてから、のこりの 広さで タイルを ならべる
  mountVisual();
  enterStep();
}

function mountVisual() {
  const box = $('visual');
  const type = state.level.type;
  const q = current();
  box.innerHTML = '';
  box.classList.toggle('hidden', state.hideVisual && canHide(type));
  if (type === 'add' || type === 'sub') {
    state.view = createTileView(box, type, q, { onRemoveDone });
  } else {
    const up = (v) => Math.max(10, Math.min(100, Math.ceil((v + 1) / 10) * 10));
    const size = type === 'mul' ? { xMax: 10, yMax: 10 } : { xMax: up(q.a), yMax: up(q.b) };
    state.view = createBoard(box, { ...size, split: type === 'mul2', onPick });
  }
  state.view.layout();
}

const canHide = (type) => type === 'add' || type === 'sub';

function setupTools(type) {
  $('count-btn').style.display = ['add', 'sub', 'mul'].includes(type) ? '' : 'none';
  $('merge-btn').style.display = type === 'add' ? '' : 'none';
  $('hide-btn').style.display = canHide(type) ? '' : 'none';
  updateHideBtn();
}

function updateHideBtn() {
  $('hide-btn').textContent = state.hideVisual ? '👀 えを みせる' : '🙈 えを かくす';
}

function enterStep() {
  const step = curStep();
  const q = current();
  const view = state.view;
  state.input = '';
  state.attempts = 0;
  state.locked = false;

  if ('mode' in view) {
    view.mode = step.kind === 'pick-x' || step.kind === 'pick-y' ? step.kind : 'none';
    view.activeRegion = step.region ?? -1;
  }
  if (step.kind === 'remove') view.locked = false;
  // タイルを とる あいだは えを かくさない
  $('visual').classList.toggle('hidden',
    state.hideVisual && canHide(state.level.type) && step.kind !== 'remove');

  if (step.kind === 'pick-x') say(`よこの めもりを なぞって 「${q.a}」を えらぼう 👉`);
  else if (step.kind === 'pick-y') say(`たての めもりを なぞって 「${q.b}」を えらぼう 👇`);
  else if (step.kind === 'remove') say(`タイルを タップして ${q.b}こ とろう`);
  else if (step.region !== undefined) say('ひかっている へやは いくつ？');
  else if (step.total) say('へやを ぜんぶ たすと？');
  else say('');

  renderFormula();
  renderKeypad();
  view.draw();
}

function advanceStep() {
  state.stepIndex++;
  if (state.stepIndex < state.steps.length) enterStep();
  else finishQuestion();
}

function finishQuestion() {
  state.results[state.index] = { ...current(), firstOk: !state.mistake };
  goNext();
}

function goNext() {
  if (state.index + 1 < state.questions.length) {
    state.index++;
    showQuestion();
  } else {
    finish();
  }
}

// めもりを えらんだ とき（タイルばんから よばれる）
function onPick(axis, value) {
  const q = current();
  const view = state.view;
  const expected = axis === 'x' ? q.a : q.b;
  if (value === expected) {
    if (axis === 'x') view.x = value;
    else view.y = value;
    view.px = 0;
    view.py = 0;
    beep([[880, 0.1]]);
    advanceStep();
    return;
  }
  if (axis === 'x') view.px = 0;
  else view.py = 0;
  view.draw();
  soundNg();
  say(`${value} じゃ なくて ${expected} だよ。もういちど`, true);
}

// ひきざんで タイルを とりおわった とき
async function onRemoveDone() {
  await sleep(400);
  advanceStep();
}

function renderProgress() {
  const root = $('progress');
  root.innerHTML = '';
  state.questions.forEach((_, i) => {
    const s = document.createElement('span');
    const r = state.results[i];
    if (r) s.className = r.firstOk ? 'ok' : 'ng';
    else if (i === state.index) s.className = 'now';
    root.appendChild(s);
  });
}

function renderFormula(answerColor) {
  const q = current();
  const type = state.level.type;
  const step = curStep();
  const style = answerColor ? ` style="color:${answerColor}"` : '';
  const box = `<span class="answer-box" id="answer-box"${style}>${step && step.kind === 'answer' ? state.input : ''}</span>`;
  const el = $('formula');
  el.className = `formula ${type}`;
  if (step && step.formula) {
    el.classList.toggle('long', step.formula.length > 8);
    el.innerHTML = `
      <div class="formula-main">${q.a} × ${q.b} ＝ ？</div>
      <div class="formula-line"><span>${step.formula}</span><span>=</span>${box}</div>`;
  } else {
    el.innerHTML = `
      <div class="formula-line">
        <span class="num-a">${q.a}</span><span>${OPS[type]}</span><span class="num-b">${q.b}</span><span>=</span>${box}
      </div>`;
  }
}

function say(html, hint) {
  $('message').innerHTML = html;
  $('message').className = hint ? 'message hint' : 'message';
}

// ---------- かぞえる ----------

async function countAlong() {
  const token = ++state.countToken;
  const alive = () => token === state.countToken;
  const type = state.level.type;
  const view = state.view;
  if (state.hideVisual) {
    state.hideVisual = false;
    $('visual').classList.remove('hidden');
    updateHideBtn();
  }
  if (type === 'mul') {
    if (!view.x || !view.y) return say('さきに めもりを えらんでね', true);
    if (await view.countRows(alive)) say(`${view.x}こずつ ${view.y}れつで ${view.x * view.y}こ`);
    return;
  }
  const n = await view.count(alive);
  if (n === null) return;
  const beforeRemove = type === 'sub' && curStep().kind === 'remove';
  say(type === 'add' || beforeRemove ? `ぜんぶで ${n}こ` : `のこりは ${n}こ`);
}

// ---------- テンキー ----------

function renderKeypad(showNext) {
  const pad = $('keypad');
  pad.innerHTML = '';
  if (showNext) {
    const next = document.createElement('button');
    next.className = 'key next';
    next.textContent = 'つぎへ ▶';
    next.addEventListener('click', () => {
      state.countToken++;
      advanceStep();
    });
    pad.appendChild(next);
    return;
  }
  const enabled = curStep() && curStep().kind === 'answer';
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', 'ok'];
  for (const k of keys) {
    const btn = document.createElement('button');
    btn.className = 'key' + (k === 'del' ? ' del' : k === 'ok' ? ' ok' : '') + (enabled ? '' : ' disabled');
    btn.textContent = k === 'del' ? 'けす' : k === 'ok' ? 'こたえる' : k;
    btn.addEventListener('click', () => pressKey(k));
    pad.appendChild(btn);
  }
}

function pressKey(k) {
  const step = curStep();
  if (state.locked || !step || step.kind !== 'answer') return;
  if (k === 'del') state.input = state.input.slice(0, -1);
  else if (k === 'ok') return checkAnswer();
  else if (state.input.length < MAX_DIGITS) state.input = (state.input + k).replace(/^0+(?=\d)/, '');
  $('answer-box').textContent = state.input;
}

function judge(ok) {
  const el = $('judge');
  el.textContent = ok ? '⭕' : '✖';
  el.className = `judge ${ok ? 'ok' : 'ng'}`;
  void el.offsetWidth; // アニメを最初から
  el.classList.add('show');
}

function hintText() {
  const type = state.level.type;
  if (type === 'add') return 'おしい！「がっちゃん」や「かぞえる」で たしかめよう';
  if (type === 'sub') return 'おしい！「かぞえる」で のこりを かぞえよう';
  if (type === 'mul') return 'おしい！「かぞえる」で たしかめよう';
  const step = curStep();
  if (step.total) return 'おしい！へやの かずを じゅんに たしてみよう';
  return 'おしい！10 の まとまりが いくつ あるかな？';
}

async function checkAnswer() {
  if (state.input === '') return;
  const step = curStep();
  const view = state.view;
  const isLast = state.stepIndex === state.steps.length - 1;

  if (Number(state.input) === step.expected) {
    state.locked = true;
    if (step.region !== undefined) {
      view.answered.add(step.region);
      view.draw();
    }
    judge(true);
    soundOk();
    await sleep(isLast ? 850 : 650);
    advanceStep();
    return;
  }

  state.attempts++;
  soundNg();
  if (state.attempts === 1) {
    const box = $('answer-box');
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    state.input = '';
    box.textContent = '';
    say(hintText(), true);
    return;
  }

  // 2かいまちがえたら こたえを みせる
  judge(false);
  state.locked = true;
  state.mistake = true;
  state.input = String(step.expected);
  renderFormula('var(--red)');
  renderKeypad(true);
  say(`こたえは ${step.expected}`, true);
  if (step.region !== undefined) {
    view.answered.add(step.region);
    view.draw();
  }
  if (state.level.type !== 'mul2') {
    await sleep(700);
    countAlong();
  }
}

// ---------- タイルで あそぶ（じゆう） ----------

function startFree(level) {
  clearInterval(state.timerId);
  state.countToken++;
  state.level = level;
  $('quiz').classList.add('free-mode');
  show('quiz');
  setupTools('free');
  $('keypad').innerHTML = '';
  const box = $('visual');
  box.innerHTML = '';
  box.classList.remove('hidden');
  state.view = createBoard(box, {
    xMax: level.xMax, yMax: level.yMax, split: level.split, onChange: updateFree,
  });
  state.view.mode = 'free';
  state.view.showAllValues = true;
  state.view.layout();
  updateFree();
}

function updateFree() {
  const { x, y } = state.view;
  const el = $('formula');
  el.className = 'formula mul';
  if (!x || !y) {
    el.innerHTML = '<div class="formula-line">? × ? ＝ ?</div>';
    say('ばんを タップしたり なぞったり してみよう');
    return;
  }
  el.innerHTML = `<div class="formula-line"><span class="num-a">${x}</span><span>×</span><span class="num-b">${y}</span><span>=</span><span>${x * y}</span></div>`;
  const regions = state.level.split ? splitRegions(x, y) : [];
  if (regions.length > 1) {
    const lines = regions.map((r) => `${r.w} × ${r.h} ＝ ${r.w * r.h}`);
    say(`<div class="free-split">(${partsOf(x).join(' + ')}) × (${partsOf(y).join(' + ')})<br>${lines.join('<br>')}<br>ぜんぶで ${x * y}</div>`);
  } else {
    say(`${x}こずつ ${y}れつで ${x * y}こ`);
  }
}

// ---------- けっか ----------

function finish() {
  clearInterval(state.timerId);
  state.countToken++;
  const ms = Date.now() - state.startedAt;
  const total = state.questions.length;
  const correct = state.results.filter((r) => r.firstOk).length;
  const wrong = state.results.filter((r) => !r.firstOk);

  if (!state.isRetry) {
    saveHistory({ level: state.level.id, date: new Date().toISOString(), correct, total, ms });
  }

  $('result-mark').textContent = correct === total ? '💮' : correct >= total * 0.7 ? '⭐' : '👍';
  $('result-text').innerHTML = `${total}もん ちゅう ${correct}もん せいかい！<small>かかった じかん ${formatTime(ms)}</small>`;
  const op = OPS[state.level.type];
  $('result-wrong').textContent = wrong.length
    ? 'まちがえた もんだい： ' + wrong.map((r) => `${r.a} ${op} ${r.b}`).join('、 ')
    : '';
  $('result-extra').innerHTML = '';
  $('retry-wrong').style.display = wrong.length ? '' : 'none';
  $('retry-wrong').onclick = () =>
    startLevel(state.level, shuffle(wrong.map(({ a, b }) => ({ a, b }))), true);
  $('retry-all').onclick = () => startLevel(state.level, state.level.make(), false);
  show('result');
}

// ---------- はじめる ----------

$('count-btn').addEventListener('click', countAlong);
$('merge-btn').addEventListener('click', () => {
  state.countToken++;
  state.view.merge();
});
$('hide-btn').addEventListener('click', () => {
  state.hideVisual = !state.hideVisual;
  state.countToken++;
  $('visual').classList.toggle('hidden', state.hideVisual);
  updateHideBtn();
});
$('quit').addEventListener('click', () => {
  if (!$('quiz').classList.contains('free-mode') && !confirm('やめて もどる？')) return;
  renderHome();
});
$('go-home').addEventListener('click', renderHome);

// えの わくの おおきさが かわったら（むきを かえた、メッセージが 2ぎょうに なった など）ならべなおす
let lastBox = '';
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  const key = `${Math.round(width)}x${Math.round(height)}`;
  if (key === lastBox || !state.view || !$('quiz').classList.contains('active')) return;
  lastBox = key;
  requestAnimationFrame(() => state.view.layout());
}).observe($('visual'));

// パソコンで試すとき用：キーボードでも入力できる
document.addEventListener('keydown', (e) => {
  if (!$('quiz').classList.contains('active')) return;
  if (/^\d$/.test(e.key)) pressKey(e.key);
  else if (e.key === 'Backspace') pressKey('del');
  else if (e.key === 'Enter') pressKey('ok');
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

renderHome();
