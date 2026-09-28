// 画面の切り替え、出題、採点、記録。
// 1もんは いくつかの「ステップ」で すすむ（めもりを えらぶ → こたえる など）。

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HISTORY_KEY = 'mathapp.v1.history';
const MAX_DIGITS = 4;
const OPS = { add: '+', sub: '−', mul: '×', mul2: '×', addn: '+', kukuhyo: '', kufu: '+' };

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

// ぜんいんの きろく（profile：だれの きろくか）
function loadAllHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

// いま やっている こどもの きろく
function loadHistory() {
  const p = currentProfile();
  return loadAllHistory().filter((r) => p && r.profile === p.id);
}

function saveHistory(record) {
  try {
    const p = currentProfile();
    const list = loadAllHistory();
    list.push({ ...record, profile: p ? p.id : null });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-1000)));
    localStorage.setItem(LAST_SAVE_KEY, new Date().toISOString());
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
  'おおきい かずの たしざん': '🧮',
  'かけざん（くく）': '✖️',
  'くく タイムアタック': '⏱️',
  '2けたの かけざん': '🔢',
  'タイルで あそぶ': '🧩',
  'じゅけんの どだい（2年）': '🎓',
};

// ---------- だれが やる？ ----------

function renderWho() {
  clearInterval(state.timerId);
  state.countToken++;
  const root = $('who-list');
  root.innerHTML = '';
  for (const p of loadProfiles()) {
    const wrap = document.createElement('div');
    wrap.className = 'who-card-wrap';
    const card = document.createElement('button');
    card.className = 'who-card';
    card.innerHTML = `<span class="who-icon">${p.icon}</span><span class="who-name">${p.name}</span>
      <span class="who-points">⭐ ${todayStatus(p.id).points}</span>`;
    card.addEventListener('click', () => {
      setCurrentProfile(p.id);
      renderHome();
    });
    const edit = document.createElement('button');
    edit.className = 'who-edit';
    edit.textContent = '✏️ なまえ';
    edit.addEventListener('click', () => {
      const name = prompt('なまえ', p.name);
      if (name) renameProfile(p.id, name);
      renderWho();
    });
    wrap.append(card, edit);
    root.appendChild(wrap);
  }
  show('who');
}

// ホームの うえ：だれか・ポイント・きょうの もくひょう
function renderHomeBar() {
  const p = currentProfile();
  const s = todayStatus(p.id);
  const goal = POINT_RULES.dailyGoalSets;
  const dots = Array.from({ length: goal }, (_, i) => (i < s.day.sets ? '●' : '○')).join('');
  $('home-bar').innerHTML = `
    <button id="who-btn" class="who-chip">${p.icon} ${p.name} <small>こうたい</small></button>
    <div class="today">
      きょうの もくひょう <span class="goal-dots${s.day.goal ? ' done' : ''}">${dots}</span>
      ${s.day.goal ? '<b>たっせい！</b>' : `あと ${goal - s.day.sets} セット`}
      ${s.streak >= 2 ? `<span class="streak">🔥 ${s.streak}にち れんぞく</span>` : ''}
    </div>
    <div class="points-chip">⭐ <b>${s.points}</b> pt</div>
    <button id="pets-btn" class="pets-btn">🐜 むしの おへや</button>`;
  $('who-btn').addEventListener('click', renderWho);
  $('pets-btn').addEventListener('click', openPets);
}

// けっか がめんの ポイント
function renderEarned(result) {
  const el = $('result-points');
  if (!result) {
    el.innerHTML = '';
    return;
  }
  const rows = result.items.map((it) =>
    `<li class="${it.big ? 'big' : ''}"><span>${it.label}</span><b>+${it.n}</b></li>`).join('');
  el.innerHTML = `
    <div class="earned-total">⭐ +${result.got} pt <small>（ぜんぶで ${result.points} pt）</small></div>
    ${rows ? `<ul class="earned-list">${rows}</ul>` : ''}
    ${result.capped ? '<div class="earned-cap">きょうの べんきょう ポイントは じょうげん まで もらったよ。あしたも がんばろう！</div>' : ''}`;
}

// ひらいている 大こうもく（この タブレットの なかだけで おぼえる）
const OPEN_GROUPS_KEY = 'mathapp.v1.openGroups';
function loadOpenGroups() {
  try {
    return JSON.parse(localStorage.getItem(OPEN_GROUPS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveOpenGroups(list) {
  try {
    localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(list));
  } catch {
    // おぼえられなくても うごく
  }
}

function renderHome() {
  if (!currentProfile()) return renderWho();
  if (state.level && UNITS[state.level.type]) disposeView();
  clearInterval(state.timerId);
  state.countToken++;
  renderHomeBar();
  const root = $('level-groups');
  root.innerHTML = '';
  const groups = [...new Set(LEVELS.map((l) => l.group))];
  const open = loadOpenGroups();
  for (const g of groups) {
    // 大こうもくを タップすると 小こうもくが ひらく
    const levels = LEVELS.filter((l) => l.group === g);
    const title = document.createElement('button');
    title.className = 'group-title' + (open.includes(g) ? ' open' : '');
    title.innerHTML = `<span class="gt-name">${GROUP_ICONS[g] || ''} ${levels[0].groupHtml || g}</span>
      <span class="gt-count">${levels.length}</span><span class="gt-arrow">▶</span>`;
    title.addEventListener('click', () => {
      const now = loadOpenGroups();
      saveOpenGroups(now.includes(g) ? now.filter((x) => x !== g) : [...now, g]);
      renderHome();
    });
    root.appendChild(title);
    if (!open.includes(g)) continue;

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
  if (UNITS[type]) return UNITS[type].steps(q);
  const { a, b } = q;
  switch (type) {
    case 'add':
      return [{ kind: 'answer', expected: a + b }];
    case 'sub':
      return [{ kind: 'remove' }, { kind: 'answer', expected: a - b }];
    case 'mul':
      return [{ kind: 'pick-x' }, { kind: 'pick-y' }, { kind: 'answer', expected: a * b }];
    case 'kukuhyo':
      return kukuSteps(q);
    case 'kufu':
      return kufuSteps(q);
    case 'addn':
      // いちの くらいから じゅんに。くりあがりが あれば 「1 + 4 + 3」の ように たす
      return addColumns(a, b).filter((c) => !c.auto).map((c) => ({
        kind: 'answer', expected: c.sum, place: c.place,
        formula: [c.carryIn || null, c.da, c.db].filter((v) => v !== null).join(' + '),
      }));
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
  disposeView();
  box.innerHTML = '';
  box.classList.toggle('hidden', state.hideVisual && canHide(type));
  if (UNITS[type]) {
    state.view = UNITS[type].view(box, q, unitApi);
  } else if (type === 'add' || type === 'sub') {
    state.view = createTileView(box, type, q, { onRemoveDone });
  } else if (type === 'addn') {
    state.view = createPlaceValueView(box, q, { tiles: state.level.tiles !== false });
  } else if (type === 'kukuhyo') {
    state.view = createKukuTable(box, { onTap: kukuTap });
  } else if (type === 'kufu') {
    state.view = createKufuView(box, q, { onTap: kufuTap });
  } else {
    const up = (v) => Math.max(10, Math.min(100, Math.ceil((v + 1) / 10) * 10));
    const size = type === 'mul' ? { xMax: 10, yMax: 10 } : { xMax: up(q.a), yMax: up(q.b) };
    state.view = createBoard(box, { ...size, split: type === 'mul2', onPick });
  }
  state.view.layout();
}

// 3D などを つかう え は つかいおわったら とめる
function disposeView() {
  if (state.view && state.view.dispose) state.view.dispose();
  state.view = null;
}

const hasTiles = () => state.level.tiles !== false;
const canHide = (type) => type === 'add' || type === 'sub' || (type === 'addn' && hasTiles());

// みぎの ひっさん（タイルつきの おおきい かずの たしざん だけ。タイルなしは えの ばしょに おおきく かく）
function renderSide() {
  const view = state.view;
  const show = state.level.type === 'addn' && hasTiles() && view && view.hissanHTML;
  $('side').innerHTML = show ? view.hissanHTML() : '';
}

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
  if (step.place !== undefined) view.active = step.place;
  if (state.level.type === 'kukuhyo') {
    view.mode = step.kind === 'find' ? 'find' : step.markable ? 'mark' : 'none';
    view.found = new Set();
    view.marked = new Set();
    view.reveal = [];
    view.mark = step.mark || [];
    view.hidden = step.hidden || [];
    view.active = step.cell || null;
    view.rows = step.rows || [];
  }
  if (state.level.type === 'kufu') {
    view.mode = step.kind === 'pair' ? 'pair' : 'none';
    view.selected = new Set();
    view.note = step.note || '';
  }
  const unit = UNITS[state.level.type];
  if (unit && unit.enter) unit.enter(view, step, q);
  // タイルを とる あいだは えを かくさない
  $('visual').classList.toggle('hidden',
    state.hideVisual && canHide(state.level.type) && step.kind !== 'remove');

  if (step.kind === 'pick-x') say(`よこの めもりを なぞって 「${q.a}」を えらぼう 👉`);
  else if (step.kind === 'pick-y') say(`たての めもりを なぞって 「${q.b}」を えらぼう 👇`);
  else if (step.kind === 'remove') say(`タイルを タップして ${q.b}こ とろう`);
  else if (step.kind === 'find') say(`${step.targets.length > 1 ? `ぜんぶで ${step.targets.length}か${rb('所', 'しょ')} あるよ` : 'タップしてね'}`);
  else if (step.place !== undefined) say(`${PLACE_NAMES[step.place]}の くらいを たそう`);
  else if (step.region !== undefined) say('ひかっている へやは いくつ？');
  else if (step.total) say('へやを ぜんぶ たすと？');
  else say(step.say || '');

  renderFormula();
  renderKeypad();
  renderSide();
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

// 九九の ひょうの マスを タップした とき
function kukuTap(a, b) {
  const step = curStep();
  const view = state.view;
  const key = `${a}x${b}`;
  if (state.locked || !step) return;
  if (view.mode === 'mark') {
    if (view.marked.has(key)) view.marked.delete(key);
    else view.marked.add(key);
    soundTick();
    view.draw();
    return;
  }
  if (view.mode !== 'find' || view.found.has(key)) return;
  if (step.targets.includes(key)) {
    view.found.add(key);
    beep([[880, 0.08]]);
    view.draw();
    const left = step.targets.length - view.found.size;
    if (left > 0) {
      say(`あたり！ あと ${left}か${rb('所', 'しょ')}`);
      return;
    }
    state.locked = true;
    judge(true);
    soundOk();
    setTimeout(advanceStep, 900);
    return;
  }
  state.mistake = true;
  soundNg();
  view.flash(key);
  say(`${a}×${b} は ${a * b} だよ`, true);
}

// くふうしよう：数の カードを タップした とき（2つ えらんで まとまりを つくる）
function kufuTap(i) {
  const step = curStep();
  const view = state.view;
  if (state.locked || !step || view.mode !== 'pair' || view.grouped.includes(i)) return;
  if (view.selected.has(i)) view.selected.delete(i);
  else view.selected.add(i);
  soundTick();
  view.draw();
  if (view.selected.size < 2) return;
  const q = current();
  const [x, y] = [...view.selected];
  if (q.nums[x] + q.nums[y] === step.target) {
    view.grouped = [x, y];
    view.selected = new Set();
    view.draw();
    state.locked = true;
    judge(true);
    soundOk();
    setTimeout(advanceStep, 900);
    return;
  }
  state.mistake = true;
  soundNg();
  view.flash();
  say(`${q.nums[x]} + ${q.nums[y]} = ${q.nums[x] + q.nums[y]}。${step.target} に なる 2つを さがそう`, true);
  setTimeout(() => {
    view.selected = new Set();
    view.draw();
  }, 500);
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
  if (step && step.prompt) {
    el.classList.remove('long');
    // before：□の まえの しき、unit：□の あとの たんい（cm など）
    const line = step.kind === 'answer'
      ? `<div class="formula-line">${step.before ? `<span>${step.before}</span>` : ''}${box}${step.unit ? `<span class="unit">${step.unit}</span>` : ''}</div>`
      : '';
    el.innerHTML = `<div class="formula-prompt">${step.prompt}</div>${line}`;
    return;
  }
  if (step && step.formula) {
    el.classList.toggle('long', step.formula.length > 8);
    el.innerHTML = `
      <div class="formula-main"><span class="num-a">${q.a}</span> ${OPS[type]} <span class="num-b">${q.b}</span> ＝ ？</div>
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
  // えらぶ もんだい：テンキーの かわりに こたえの ボタン
  const cur = curStep();
  if (cur && cur.kind === 'choice') {
    pad.classList.add('choices');
    cur.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'key choice';
      btn.innerHTML = opt.html || opt;
      btn.dataset.i = i;
      btn.addEventListener('click', () => checkChoice(i, btn));
      pad.appendChild(btn);
    });
    return;
  }
  pad.classList.remove('choices');
  const enabled = cur && cur.kind === 'answer';
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

// ひっさん：くらいの こたえを かいて、10 こ あれば となりへ くりあげる
function resolvePlace(step, isLast) {
  state.view.active = -1;
  state.view.resolve(step.place);
  renderSide();
  const q = current();
  if (isLast) say(`こたえは ${q.a + q.b}`);
  else if (step.expected >= 10) say('10 こ あつまったので となりの くらいへ 1 くりあがり！');
}

// えらぶ もんだいの こたえあわせ（step.answer：せいかいの ばんごう）
async function checkChoice(i, btn) {
  const step = curStep();
  if (state.locked || !step) return;
  const view = state.view;
  const unit = UNITS[state.level.type];
  const isLast = state.stepIndex === state.steps.length - 1;
  if (i === step.answer) {
    state.locked = true;
    btn.classList.add('right');
    judge(true);
    soundOk();
    if (step.explain) say(step.explain);
    if (unit && unit.after) await unit.after(view, step, true);
    await sleep(isLast ? 900 : 700);
    advanceStep();
    return;
  }
  state.attempts++;
  state.mistake = true;
  soundNg();
  btn.classList.add('wrong-choice');
  btn.disabled = true;
  if (state.attempts === 1 && step.options.length > 2) {
    say(step.hint || 'おしい！もういちど かんがえて みよう', true);
    return;
  }
  // こたえを みせる
  judge(false);
  state.locked = true;
  $('keypad').querySelectorAll('.choice').forEach((b, k) => {
    if (k === step.answer) b.classList.add('right');
    b.disabled = true;
  });
  say(step.explain || `${rb('答', 'こた')}えは ${step.options[step.answer].html || step.options[step.answer]}`, true);
  if (unit && unit.after) await unit.after(view, step, false);
  const next = document.createElement('button');
  next.className = 'key next';
  next.textContent = 'つぎへ ▶';
  next.addEventListener('click', () => {
    state.countToken++;
    advanceStep();
  });
  $('keypad').appendChild(next);
}

// ユニット（じゅけんの どだい など）が つかう きのう
const unitApi = {
  step: () => curStep(),
  q: () => current(),
  locked: () => state.locked,
  say,
  tick: () => soundTick(),
  // ボタンいがいの そうさ（タップ・ドラッグ）で せいかい した とき
  correct(msg) {
    state.locked = true;
    judge(true);
    soundOk();
    if (msg) say(msg);
    setTimeout(advanceStep, 900);
  },
  wrong(msg) {
    state.mistake = true;
    soundNg();
    if (msg) say(msg, true);
  },
};

function hintText() {
  const type = state.level.type;
  if (type === 'add') return 'おしい！「がっちゃん」や「かぞえる」で たしかめよう';
  if (type === 'sub') return 'おしい！「かぞえる」で のこりを かぞえよう';
  if (type === 'mul') return 'おしい！「かぞえる」で たしかめよう';
  if (type === 'addn') {
    return hasTiles() ? 'おしい！この くらいの タイルを ぜんぶ かぞえて みよう' : 'おしい！もういちど たして みよう';
  }
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
    const unit = UNITS[state.level.type];
    if (unit && unit.after) {
      judge(true);
      soundOk();
      await unit.after(view, step, true);
      await sleep(isLast ? 850 : 650);
      advanceStep();
      return;
    }
    if (step.region !== undefined) {
      view.answered.add(step.region);
      view.draw();
    }
    if (step.place !== undefined) resolvePlace(step, isLast);
    judge(true);
    soundOk();
    // くりあがりの ときは タイルが となりへ いくのを みせる
    const carried = step.place !== undefined && step.expected >= 10;
    await sleep(isLast ? 850 : carried ? 1600 : 650);
    advanceStep();
    return;
  }

  state.attempts++;
  state.mistake = true; // 1かいでも まちがえたら「1かいめで せいかい」には しない
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
  say(`${rb('答', 'こた')}えは ${step.expected}`, true);
  const unitAfter = UNITS[state.level.type] && UNITS[state.level.type].after;
  if (unitAfter) unitAfter(view, step, false);
  if (step.region !== undefined) {
    view.answered.add(step.region);
    view.draw();
  }
  if (step.place !== undefined) {
    resolvePlace(step, isLast);
    say(`こたえは ${step.expected}`, true);
    return;
  }
  if (step.reveal) {
    view.reveal = step.reveal;
    view.draw();
  }
  if (['add', 'sub', 'mul'].includes(state.level.type)) {
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
  renderSide();
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
  $('result-wrong').innerHTML = wrong.length
    ? 'まちがえた もんだい： ' + wrong.map((r) => r.label || `${r.a} ${op} ${r.b}`).join('、 ')
    : '';
  $('result-extra').innerHTML = '';
  renderEarned(awardSet({ correct, total, full: !state.isRetry }));
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

$('who-add').addEventListener('click', () => {
  addProfile();
  renderWho();
});

// タブレットを きょうだいで つかうので、ひらく たびに「だれが やる？」から
renderWho();
