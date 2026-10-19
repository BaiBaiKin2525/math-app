// こども（プロフィール）と ポイント。
// ポイントは こどもごとの「さいふ」に たまる。あとで つくる ペットの おみせは この さいふから つかう。
//
// さいふ（localStorage: mathapp.v1.wallet.<こどもの id>）
//   points      いま つかえる ポイント
//   earnedTotal これまでに もらった ごうけい
//   spentTotal  これまでに つかった ごうけい
//   days        { 'YYYY-MM-DD': { earned: べんきょうで もらった ポイント, sets: おわった セット, goal: もくひょう たっせい,
//                                  levels: その ひ に やった もんだいの id（きょう はじめて ボーナス） } }
//   streak      { last: さいごに もくひょうを たっせいした ひ, count: れんぞく にっすう }
//   log         [{ date, amount, reason }]（あたらしい 300 けん）

const LAST_SAVE_KEY = 'mathapp.v1.lastSave'; // さいごに ほぞんした じこく（ほごしゃ がめんで たしかめる）
const PROFILES_KEY = 'mathapp.v1.profiles';
const CURRENT_KEY = 'mathapp.v1.current';
const walletKey = (id) => `mathapp.v1.wallet.${id}`;
// こどもは 3にんで きまり（ふやせない）。キャラクター（icon）も きまり。なまえ だけ かえられる
//   firstGradeYear：小学1年に なる ねんど。ここから いまの がくねんを だす（4がつに 1つ あがる）
const CHILDREN = [
  { id: 'p1', name: 'こども 1', icon: '🦊', firstGradeYear: 2025 },   // 2026ねんど 小2
  { id: 'p2', name: 'こども 2', icon: '🐰', firstGradeYear: 2027 },   // 2026ねんど 年長
  { id: 'p3', name: 'こども 3', icon: '🐻', firstGradeYear: 2031 },   // 2026ねんど 2さいの とし
];

// ポイントの ルール。かえる ときは ここだけ
const POINT_RULES = {
  dailyCap: 250,        // べんきょうで もらえる 1にちの じょうげん
  dailyGoalSets: 3,     // まいにちの もくひょう（セット）
  dailyGoalBonus: 20,   // もくひょう たっせい（じょうげんの そと）
  streakPerDay: 2,      // れんぞく ボーナス ＝ にっすう × 2（2にちめから、じょうげんの そと）
  streakMax: 14,
  firstOfDay: 5,        // その ひ はじめて やる もんだい（しゅるいごと）。いろいろな もんだいを やって ほしい
};

// もんだいの むずかしさで かわる ポイント
//   per：1もん せいかい（1かいめで）、perfect：ぜんもん せいかい ボーナス、net：せいかい − まちがい
function pointRuleFor(level) {
  const id = level.id;
  if (id === 'ta-random') return { net: true, perfect: 0, name: 'せいかい − まちがい' };
  if (id === 'ta-order' || id === 'ta-reverse') return { per: 1, perfect: 0 };
  if (/^j\da?h-/.test(id)) return { per: 3, perfect: 10 };           // じゅけんの どだい チャレンジ
  if (/^j\d/.test(id)) return { per: 2, perfect: 10 };                // じゅけんの どだい（1年・2年）
  return { per: 2, perfect: 5 };                                       // たしざん・ひきざん・くく・おおきい かず など
}

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(LAST_SAVE_KEY, new Date().toISOString());
  } catch {
    // 保存できなくてもアプリは動かす
  }
}

// ---------- こども ----------

// ほぞん してある なまえ だけ のこして、いつも CHILDREN の 3にんに する
function loadProfiles() {
  const saved = readJSON(PROFILES_KEY, null);
  const old = Array.isArray(saved) ? saved : [];
  const list = CHILDREN.map((k) => {
    const s = old.find((p) => p && p.id === k.id);
    return { id: k.id, name: (s && s.name) || k.name, icon: k.icon };
  });
  if (JSON.stringify(list) !== JSON.stringify(old)) writeJSON(PROFILES_KEY, list);
  return list;
}

// がくねん：1〜6 は 小学、0 は 年長、-1 年中、-2 年少、それより したは その とし なる さい − 6
function gradeOf(id, d = new Date()) {
  const kid = CHILDREN.find((k) => k.id === id);
  if (!kid) return 2;
  const schoolYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return schoolYear - kid.firstGradeYear + 1;
}

function gradeLabel(g) {
  if (g >= 1) return `小${g}`;
  return { 0: '年長', [-1]: '年中', [-2]: '年少' }[g] || `${g + 6}さいの とし`;
}

function saveProfiles(list) {
  writeJSON(PROFILES_KEY, list);
}

function currentProfile() {
  const id = readJSON(CURRENT_KEY, null);
  return loadProfiles().find((p) => p.id === id) || null;
}

function setCurrentProfile(id) {
  writeJSON(CURRENT_KEY, id);
}

function renameProfile(id, name) {
  const list = loadProfiles();
  const p = list.find((x) => x.id === id);
  if (p && name.trim()) p.name = name.trim().slice(0, 10);
  saveProfiles(list);
}

// ---------- さいふ ----------

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayBefore(key) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function loadWallet(id) {
  const w = readJSON(walletKey(id), null) || {};
  return {
    points: 0, earnedTotal: 0, spentTotal: 0, days: {}, streak: { last: null, count: 0 }, log: [],
    ...w,
  };
}

function saveWallet(id, w) {
  w.log = w.log.slice(-300);
  writeJSON(walletKey(id), w);
}

// きょうの ようす（ホームに だす）
function todayStatus(id) {
  const w = loadWallet(id);
  const key = todayKey();
  const day = w.days[key] || { earned: 0, sets: 0, goal: false };
  // きのうか きょう たっせいしていれば れんぞくが つづいている
  const alive = w.streak.last === key || w.streak.last === dayBefore(key);
  return { points: w.points, day, streak: alive ? w.streak.count : 0 };
}

// セットが おわった ときに よぶ。もらった ポイントの うちわけを かえす
//   correct：1かいめで せいかいした かず、total：もんだいの かず
//   full：ふつうの セットを さいごまで やった（まちがえた もんだいの やりなおしは false）
//   level：どの もんだいか（むずかしさで ポイントが かわる）、wrong：まちがえた かず（タイムアタック）
function awardSet({ correct, total, full, level, wrong = 0 }) {
  const profile = currentProfile();
  if (!profile) return null;
  const R = POINT_RULES;
  const w = loadWallet(profile.id);
  const key = todayKey();
  const day = w.days[key] || (w.days[key] = { earned: 0, sets: 0, goal: false });
  const items = [];

  // べんきょうの ポイント（1にちの じょうげん まで）
  let study = 0;
  let wanted = 0;
  const addStudy = (label, n) => {
    wanted += n;
    const got = Math.min(n, Math.max(0, R.dailyCap - day.earned - study));
    if (got > 0) {
      study += got;
      items.push({ label, n: got });
    }
  };
  const rule = pointRuleFor(level);
  if (rule.net) addStudy(`せいかい ${correct} − まちがい ${wrong}`, Math.max(0, correct - wrong));
  else addStudy(`せいかい ${correct}もん × ${rule.per}`, correct * rule.per);
  if (full && rule.perfect && total > 0 && correct === total) addStudy('ぜんもん せいかい', rule.perfect);
  // きょう はじめて やる もんだい（しゅるいごと）
  day.levels = day.levels || [];
  if (full && level && !day.levels.includes(level.id)) {
    day.levels.push(level.id);
    addStudy('きょう はじめての もんだい', R.firstOfDay);
  }
  day.earned += study;
  if (full) day.sets++;

  // まいにちの もくひょうと れんぞく（じょうげんの そと）
  let bonus = 0;
  if (!day.goal && day.sets >= R.dailyGoalSets) {
    day.goal = true;
    items.push({ label: 'きょうの もくひょう たっせい！', n: R.dailyGoalBonus, big: true });
    bonus += R.dailyGoalBonus;
    const count = w.streak.last === dayBefore(key) ? w.streak.count + 1 : 1;
    w.streak = { last: key, count };
    if (count >= 2) {
      const s = Math.min(count * R.streakPerDay, R.streakMax);
      items.push({ label: `${count}にち れんぞく！`, n: s, big: true });
      bonus += s;
    }
  }

  const got = study + bonus;
  w.points += got;
  w.earnedTotal += got;
  if (got) w.log.push({ date: new Date().toISOString(), amount: got, reason: 'study' });
  saveWallet(profile.id, w);
  return { items, got, points: w.points, capped: study < wanted, day };
}

// ---------- じつりょく テスト → ゲームの でんち ----------
// テストの ルール。かえる ときは ここだけ
const TEST_RULES = {
  unlockSets: 5,       // その ひに 5セット おわると ひらく（1にち 1かい）
  questions: 10,
  perQuestion: 10,     // 1かいめで せいかい 1もん 10てん（10もんで 100てん）
  fastBonus: 5,        // はやく せいかい できた もんだい 1つに +5（さいだい +50）
  // はやさ ボーナスの めやす（びょう）。もんだいの しゅるい（type）ごと、ない ものは other
  fastSec: { add: 15, sub: 20, mul: 10, addn: 40, mul2: 60, other: 60 },
};

// テストの きろく（localStorage: mathapp.v1.test.<こどもの id>）
//   days     { 'YYYY-MM-DD': { score, correct, fast, total, ms } }
//   answers  [{ date, level, ok, fast, ms }]（あたらしい 1000 もん。あとで にがてな ところを しらべる）
const testKey = (id) => `mathapp.v1.test.${id}`;

function loadTestLog(id) {
  const t = readJSON(testKey(id), null) || {};
  return { days: {}, answers: [], ...t };
}

function saveTestResult(id, result, answers) {
  const t = loadTestLog(id);
  t.days[todayKey()] = result;
  t.answers = [...t.answers, ...answers].slice(-1000);
  writeJSON(testKey(id), t);
}

// きょうの テスト：sets（おわった セット）、open（いま できる）、done（きょうの けっか）
function testStatus(id) {
  const day = loadWallet(id).days[todayKey()] || { sets: 0 };
  const done = loadTestLog(id).days[todayKey()] || null;
  const debug = isGameUnlimited();
  return { sets: day.sets, need: TEST_RULES.unlockSets, done, debug, open: debug || (!done && day.sets >= TEST_RULES.unlockSets) };
}

// 実力テストが おわったら よぶ。score（てんすう）が そのまま ゲームの でんちに なる
//   ゲーム（myson-game）は この キーを よむ だけ。とりこんだ id を ゲームの セーブで おぼえる ので、ここは ついか だけ
function grantGameStamina(score, reason = 'じつりょくテスト') {
  const profile = currentProfile();
  if (!profile) return;
  const key = `mathapp.v1.game.grants.${profile.id}`;
  const list = readJSON(key, []);
  const arr = Array.isArray(list) ? list : [];
  arr.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, // かぶらない id
    date: new Date().toISOString(),
    amount: Math.max(0, Math.floor(score)),
    reason,
  });
  writeJSON(key, arr.slice(-200));
}

// ---------- デバッグ（ゲームの でんち むせいげん） ----------
// 保護者メニューで あいことば「claude」を 入れると オン（この端末だけ）。
// ゲームは この キーを よんで でんちを へらさない。テストは いつでも なんかいでも できるが、でんちは おくらず きろくも しない
const GAME_UNLIMITED_KEY = 'mathapp.v1.game.unlimited';
const GAME_DEBUG_WORD = 'claude';

function isGameUnlimited() {
  return readJSON(GAME_UNLIMITED_KEY, false) === true;
}

function setGameUnlimited(on) {
  writeJSON(GAME_UNLIMITED_KEY, !!on);
}

// ---------- 大人モード ----------
// パスワードを入れると、この端末では ポイントを減らさずに お店で買える（ためた ポイントは そのまま）。
// パスワードは そのまま書かずに SHA-256 の ハッシュで くらべる
const ADULT_KEY = 'mathapp.v1.adult';
const ADULT_HASH = 'c857d09db23e6822e3600bc06ad8d58f92ed62bc8efd81c753f77048662cb97d';

function isAdultMode() {
  return readJSON(ADULT_KEY, false) === true;
}

// 正しければ 大人モードに して true。この開き方で ハッシュが 使えない ときは null
async function tryAdultPassword(pw) {
  if (!(window.crypto && crypto.subtle)) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw.trim()));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex !== ADULT_HASH) return false;
  writeJSON(ADULT_KEY, true);
  return true;
}

function endAdultMode() {
  writeJSON(ADULT_KEY, false);
}

// 買える ポイント（大人モードは むげん）と、画面に出す かず
const usablePoints = (id) => (isAdultMode() ? Infinity : loadWallet(id).points);
const pointsText = (n) => (isAdultMode() ? '∞' : n);

// ペットの おみせ など から つかう。たりなければ false
function spendPoints(amount, reason) {
  const profile = currentProfile();
  if (!profile || amount <= 0) return false;
  if (isAdultMode()) return true;
  const w = loadWallet(profile.id);
  if (w.points < amount) return false;
  w.points -= amount;
  w.spentTotal += amount;
  w.log.push({ date: new Date().toISOString(), amount: -amount, reason });
  saveWallet(profile.id, w);
  return true;
}
