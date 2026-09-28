// くく タイムアタック：150 びょうで なんもん せいかい できるか。
//   じゅんばん：1×1 → 1×2 → … → 9×9（おわったら 1×1 に もどる）
//   ランダム：ばらばらに でる

const TA_SECONDS = 150;

const ta = {
  level: null,
  running: false,
  locked: false,
  pos: 0,
  q: null,
  input: '',
  attempts: 0,
  correct: 0,
  wrong: 0,
  endAt: 0,
  timerId: null,
  token: 0,
};

const TA_ORDER = [];
for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) TA_ORDER.push({ a, b });

function startTimeAttack(level) {
  stopTimeAttack();
  ta.level = level;
  ta.correct = 0;
  ta.wrong = 0;
  ta.pos = 0;
  ta.q = null;
  show('ta');
  $('ta-fill').style.width = '100%';
  $('ta-fill').className = 'ta-fill';
  $('ta-time').textContent = TA_SECONDS;
  $('ta-score').textContent = level.mode === 'order' ? 'じゅんばん モード' : 'ランダム モード';
  $('ta-formula').className = 'formula mul';
  $('ta-formula').innerHTML = '<div class="formula-line ta-ready">150びょうで なんもん できるかな？</div>';
  $('ta-start').style.display = '';
  renderTaKeypad(false);
}

async function taCountdown() {
  $('ta-start').style.display = 'none';
  const token = ++ta.token;
  for (const s of ['3', '2', '1']) {
    $('ta-formula').innerHTML = `<div class="formula-line ta-count">${s}</div>`;
    beep([[520, 0.12]]);
    await sleep(700);
    if (token !== ta.token) return;
  }
  beep([[1047, 0.3]]);
  ta.running = true;
  ta.endAt = Date.now() + TA_SECONDS * 1000;
  ta.timerId = setInterval(taTick, 100);
  renderTaKeypad(true);
  taNext();
}

function taTick() {
  const left = Math.max(0, ta.endAt - Date.now());
  const sec = Math.ceil(left / 1000);
  $('ta-time').textContent = sec;
  $('ta-fill').style.width = `${(left / (TA_SECONDS * 1000)) * 100}%`;
  $('ta-fill').className = sec <= 10 ? 'ta-fill danger' : sec <= 30 ? 'ta-fill hurry' : 'ta-fill';
  if (left <= 0) taEnd();
}

function taNext() {
  if (ta.level.mode === 'order') {
    ta.q = TA_ORDER[ta.pos % TA_ORDER.length];
    ta.pos++;
  } else {
    let q;
    do q = { a: rand(1, 9), b: rand(1, 9) };
    while (ta.q && q.a === ta.q.a && q.b === ta.q.b);
    ta.q = q;
  }
  ta.input = '';
  ta.attempts = 0;
  ta.locked = false;
  renderTaFormula();
}

function renderTaFormula(color) {
  const { a, b } = ta.q;
  const style = color ? ` style="color:${color}"` : '';
  $('ta-formula').innerHTML = `
    <div class="formula-line">
      <span class="num-a">${a}</span><span>×</span><span class="num-b">${b}</span><span>=</span>
      <span class="answer-box" id="ta-answer"${style}>${ta.input}</span>
    </div>`;
  $('ta-score').innerHTML = `せいかい <b>${ta.correct}</b>もん`;
}

function renderTaKeypad(enabled) {
  const pad = $('ta-keypad');
  pad.innerHTML = '';
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', 'ok'];
  for (const k of keys) {
    const btn = document.createElement('button');
    btn.className = 'key' + (k === 'del' ? ' del' : k === 'ok' ? ' ok' : '') + (enabled ? '' : ' disabled');
    btn.textContent = k === 'del' ? 'けす' : k === 'ok' ? 'こたえる' : k;
    // タッチで すぐ はんのう させる（click だと れんだが おくれる）
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      taPress(k);
    });
    pad.appendChild(btn);
  }
}

function taPress(k) {
  if (!ta.running || ta.locked) return;
  if (k === 'del') ta.input = ta.input.slice(0, -1);
  else if (k === 'ok') return taCheck();
  else if (ta.input.length < 2) ta.input = (ta.input + k).replace(/^0+(?=\d)/, '');
  $('ta-answer').textContent = ta.input;
  // こたえの けたすう まで うったら じどうで こたえあわせ
  if (k !== 'del' && ta.input.length === String(ta.q.a * ta.q.b).length) taCheck();
}

async function taCheck() {
  if (ta.input === '') return;
  const answer = ta.q.a * ta.q.b;
  if (Number(ta.input) === answer) {
    ta.correct++;
    beep([[1047, 0.08]]);
    taNext();
    return;
  }
  ta.wrong++;
  ta.attempts++;
  soundNg();
  if (ta.attempts === 1) {
    const box = $('ta-answer');
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    ta.input = '';
    box.textContent = '';
    return;
  }
  // 2かい まちがえたら こたえを ちらっと みせて つぎへ
  ta.locked = true;
  ta.input = String(answer);
  renderTaFormula('var(--red)');
  const token = ta.token;
  await sleep(900);
  if (ta.running && token === ta.token) taNext();
}

function stopTimeAttack() {
  ta.running = false;
  ta.token++;
  clearInterval(ta.timerId);
}

// きょうだい ぜんいんの ランキング
function taRanking(levelId) {
  return loadAllHistory()
    .filter((r) => r.level === levelId && r.profile)
    .sort((x, y) => y.correct - x.correct || x.date.localeCompare(y.date))
    .slice(0, 5);
}

function taEnd() {
  const prevBest = bestOf(ta.level.id);
  stopTimeAttack();
  const record = {
    level: ta.level.id, date: new Date().toISOString(),
    correct: ta.correct, wrong: ta.wrong, total: ta.correct, ms: TA_SECONDS * 1000,
  };
  if (ta.level.mode === 'order') record.reached = `${ta.q.a}×${ta.q.b}`;
  saveHistory(record);

  const isBest = !prevBest || ta.correct > prevBest.correct;
  $('result-mark').textContent = isBest && ta.correct > 0 ? '🏆' : '⏱️';
  const reached = ta.level.mode === 'order' ? `・${ta.q.a} × ${ta.q.b} で タイムアップ` : '';
  $('result-text').innerHTML =
    `${ta.correct}もん せいかい！${isBest && ta.correct > 0 ? '<span class="new-record">しんきろく！</span>' : ''}` +
    `<small>まちがい ${ta.wrong}かい${reached}</small>`;
  $('result-wrong').textContent = '';

  const fmt = (iso) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const profiles = Object.fromEntries(loadProfiles().map((p) => [p.id, p]));
  const who = (id) => (profiles[id] ? `${profiles[id].icon} ${profiles[id].name}` : '');
  $('result-extra').innerHTML = `
    <div class="ranking-title">${ta.level.title} ランキング（みんな）</div>
    <ol class="ranking">${taRanking(ta.level.id)
      .map((r) => `<li class="${r.date === record.date ? 'me' : ''}"><b>${r.correct}</b>もん<em>${who(r.profile)}</em><span>${fmt(r.date)}</span></li>`)
      .join('')}</ol>`;
  renderEarned(awardSet({ correct: ta.correct, total: ta.correct + ta.wrong, full: true, level: ta.level, wrong: ta.wrong }));

  $('retry-wrong').style.display = 'none';
  $('retry-all').onclick = () => startTimeAttack(ta.level);
  show('result');
}

$('ta-start').addEventListener('click', taCountdown);
$('ta-quit').addEventListener('click', () => {
  if (ta.running && !confirm('やめて もどる？')) return;
  stopTimeAttack();
  renderHome();
});

document.addEventListener('keydown', (e) => {
  if (!$('ta').classList.contains('active')) return;
  if (/^\d$/.test(e.key)) taPress(e.key);
  else if (e.key === 'Backspace') taPress('del');
  else if (e.key === 'Enter') taPress('ok');
});
