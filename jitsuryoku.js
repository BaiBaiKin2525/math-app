// じつりょく テスト：その ひに 5セット おわると ひらく（1にち 1かい）。
//   もんだいは がくねんに あわせて、けいさん と じゅけんの どだい から ランダムに 10もん（はんぶん ずつ）
//   てんすう（1かいめで せいかい 1もん 10てん ＋ はやさ ボーナス）が そのまま ゲームの げんき⚡ に なる
//   あとで にがてな ところを みて だす ように したい ので、1もんずつ きろくする（saveTestResult）
//   ルールは rewards.js の TEST_RULES

const GAME_URL = '../myson-game/';   // おなじ サイトの ゲーム（localStorage を いっしょに つかう）

// がくねんごとの もんだい（LEVELS）。calc：けいさん、juken：じゅけんの どだい・かくど パズル
function testPool(grade) {
  const pick = (ids, re) => LEVELS.filter((l) => ids.includes(l.id) || (re && re.test(l.id)));
  if (grade <= -2) return { calc: pick(['add1', 'add2']), juken: [] };
  if (grade === -1) return { calc: pick(['add1', 'add2', 'sub1']), juken: [] };
  if (grade === 0) return { calc: pick(['add1', 'add2', 'add3', 'sub1', 'sub2']), juken: pick([], /^j1-/) };
  if (grade === 1) return { calc: pick(['add2', 'add3', 'sub1', 'sub2', 'addn1']), juken: pick([], /^j1-/) };
  if (grade === 2) return { calc: pick(['addn1', 'addn2', 'mulmix', 'mul21']), juken: pick([], /^j2a?-/) };
  if (grade === 3) return { calc: pick(['addn2', 'addn3', 'mulmix', 'mul21', 'mul22']), juken: pick([], /^j2a?h-/) };
  return { calc: pick(['addn3', 'mul21', 'mul22']), juken: pick([], /^(j2h|kd)-/) };
}

// ばらばらに count こ（たりなければ くりかえす）
function takeRandom(list, count) {
  if (!list.length) return [];
  const out = [];
  while (out.length < count) out.push(...shuffle(list));
  return out.slice(0, count);
}

function makeTestQuestions(grade) {
  const { calc, juken } = testPool(grade);
  const n = TEST_RULES.questions;
  const nj = juken.length ? Math.floor(n / 2) : 0;
  const made = new Map();   // おなじ レベルが 2かい でても おなじ もんだいに しない
  return shuffle([...takeRandom(calc, n - nj), ...takeRandom(juken, nj)]).map((level) => {
    if (!made.get(level.id) || !made.get(level.id).length) made.set(level.id, shuffle(level.make()));
    const q = made.get(level.id).shift();
    q.testLevel = level;
    return q;
  });
}

function startTest() {
  const p = currentProfile();
  if (!p || !testStatus(p.id).open) return;
  const grade = gradeOf(p.id);
  const questions = makeTestQuestions(grade);
  startLevel(questions[0].testLevel, questions, false, { grade });
}

// ホームの いちばん うえの カード
function testCard() {
  const p = currentProfile();
  const s = testStatus(p.id);
  const card = document.createElement('button');
  card.className = 'test-card' + (s.open ? ' open' : s.done ? ' done' : ' locked');
  let sub;
  if (s.debug) sub = '🛠 デバッグ：いつでも なんかいでも（げんきは おくらない）';
  else if (s.done) sub = `きょうは おわり！ ${s.done.score}てん ⚡+${s.done.score}・また あした`;
  else if (s.open) sub = `⚡ ゲームの げんきが もらえる！ ${TEST_RULES.questions}もん`;
  else sub = `🔒 きょう ${s.need}セット おわると ひらくよ（いま ${Math.min(s.sets, s.need)}/${s.need}）`;
  card.innerHTML = `<span class="t">📝 じつりょく テスト</span><span class="d">${sub}</span>`;
  card.addEventListener('click', () => {
    if (s.open) startTest();
  });
  return card;
}

function finishTest() {
  clearInterval(state.timerId);
  state.countToken++;
  const R = TEST_RULES;
  const p = currentProfile();
  const ms = Date.now() - state.startedAt;
  const total = state.questions.length;
  const rows = state.questions.map((q, i) => {
    const r = state.results[i];
    const ok = !!(r && r.firstOk);
    const sec = R.fastSec[q.testLevel.type] ?? R.fastSec.other;
    return { level: q.testLevel, done: !!r, ok, fast: ok && r.ms <= sec * 1000, ms: r ? r.ms : null };
  });
  const correct = rows.filter((r) => r.ok).length;
  const fast = rows.filter((r) => r.fast).length;
  const score = correct * R.perQuestion + fast * R.fastBonus;
  const debug = isGameUnlimited();
  if (!debug) {
    const date = new Date().toISOString();
    saveTestResult(p.id, { score, correct, fast, total, ms },
      rows.filter((r) => r.done).map((r) => ({ date, level: r.level.id, ok: r.ok, fast: r.fast, ms: r.ms })));
    grantGameStamina(score);
  }
  state.test = null;

  const full = R.questions * (R.perQuestion + R.fastBonus);
  $('result-mark').textContent = correct === total ? '💮' : correct >= total * 0.7 ? '⭐' : '👍';
  $('result-text').innerHTML = `${score}てん！<small>${total}もん ちゅう ${correct}もん せいかい・かかった じかん ${formatTime(ms)}</small>`;
  $('result-wrong').innerHTML = '';
  $('result-points').innerHTML = `
    <div class="earned-total">ゲームの げんき ⚡ +${debug ? 0 : score}</div>
    <ul class="earned-list">
      <li><span>せいかい ${correct}もん × ${R.perQuestion}</span><b>+${correct * R.perQuestion}</b></li>
      <li><span>はやく せいかい ${fast}もん × ${R.fastBonus}</span><b>+${fast * R.fastBonus}</b></li>
    </ul>
    <div class="earned-cap">${debug
      ? '🛠 デバッグちゅう：ゲームの げんきは むせいげん なので おくらないよ'
      : `${full}てん まんてん。また あした ちょうせん しよう！`}</div>
    <a class="big-btn green game-link" href="${GAME_URL}">🌾 ゲームで あそぶ</a>`;
  $('result-extra').innerHTML = `<ol class="test-list">${rows.map((r) =>
    `<li class="${r.ok ? 'ok' : 'ng'}"><b>${r.ok ? '⭕' : r.done ? '✖' : 'ー'}</b>${r.fast ? '<i>⚡</i>' : ''}
      <span>${GROUP_ICONS[r.level.group] || ''} ${r.level.title}</span></li>`).join('')}</ol>`;
  $('retry-wrong').style.display = 'none';
  $('retry-all').style.display = debug ? '' : 'none';
  $('retry-all').onclick = startTest;
  show('result');
}
