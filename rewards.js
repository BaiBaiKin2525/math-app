// こども（プロフィール）と ポイント。
// ポイントは こどもごとの「さいふ」に たまる。あとで つくる ペットの おみせは この さいふから つかう。
//
// さいふ（localStorage: mathapp.v1.wallet.<こどもの id>）
//   points      いま つかえる ポイント
//   earnedTotal これまでに もらった ごうけい
//   spentTotal  これまでに つかった ごうけい
//   days        { 'YYYY-MM-DD': { earned: べんきょうで もらった ポイント, sets: おわった セット, goal: もくひょう たっせい } }
//   streak      { last: さいごに もくひょうを たっせいした ひ, count: れんぞく にっすう }
//   log         [{ date, amount, reason }]（あたらしい 300 けん）

const PROFILES_KEY = 'mathapp.v1.profiles';
const CURRENT_KEY = 'mathapp.v1.current';
const walletKey = (id) => `mathapp.v1.wallet.${id}`;
const PROFILE_ICONS = ['🦊', '🐰', '🐻', '🐼'];

// ポイントの ルール。かえる ときは ここだけ
const POINT_RULES = {
  perCorrect: 1,        // 1もん せいかい（1かいめで）
  finishSet: 5,         // セットを さいごまで
  perfect: 5,           // ぜんもん せいかい
  dailyCap: 150,        // べんきょうで もらえる 1にちの じょうげん
  dailyGoalSets: 3,     // まいにちの もくひょう（セット）
  dailyGoalBonus: 20,   // もくひょう たっせい（じょうげんの そと）
  streakPerDay: 2,      // れんぞく ボーナス ＝ にっすう × 2（2にちめから、じょうげんの そと）
  streakMax: 14,
};

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
  } catch {
    // 保存できなくてもアプリは動かす
  }
}

// ---------- こども ----------

function loadProfiles() {
  let list = readJSON(PROFILES_KEY, null);
  if (!Array.isArray(list) || !list.length) {
    list = [
      { id: 'p1', name: 'こども 1', icon: PROFILE_ICONS[0] },
      { id: 'p2', name: 'こども 2', icon: PROFILE_ICONS[1] },
    ];
    writeJSON(PROFILES_KEY, list);
  }
  return list;
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

function addProfile() {
  const list = loadProfiles();
  let n = list.length + 1;
  while (list.some((p) => p.id === `p${n}`)) n++;
  list.push({ id: `p${n}`, name: `こども ${n}`, icon: PROFILE_ICONS[(n - 1) % PROFILE_ICONS.length] });
  saveProfiles(list);
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
function awardSet({ correct, total, full }) {
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
  addStudy('せいかい', correct * R.perCorrect);
  if (full) addStudy('さいごまで できた', R.finishSet);
  if (full && total > 0 && correct === total) addStudy('ぜんもん せいかい', R.perfect);
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

// ペットの おみせ など から つかう。たりなければ false
function spendPoints(amount, reason) {
  const profile = currentProfile();
  if (!profile || amount <= 0) return false;
  const w = loadWallet(profile.id);
  if (w.points < amount) return false;
  w.points -= amount;
  w.spentTotal += amount;
  w.log.push({ date: new Date().toISOString(), amount: -amount, reason });
  saveWallet(profile.id, w);
  return true;
}
