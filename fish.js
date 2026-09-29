// さかなの おへや：べんきょうで ためた ポイントで メダカ・きんぎょ・ねったいぎょを そだてる。
//   ・えさ：1ぴき 1にち 1こ（アロワナは アロワナの えさ）。5にち もらえないと しんでしまう
//   ・みず：まいにち よごれる（さかなが おおいほど はやい。ろかフィルター・みずくさで おそくなる）
//           みずかえ（カルキぬきを つかう）で きれいに なる。よごれきった まま 3にち たつと しんでしまう
//   ・すいそう：せんめんき（メダカだけ）→ きんぎょばち → しょうがた（エアポンプ・ろかフィルターが ひつよう）
//               → ちゅうがた（ちがう さかなと いっしょに かえる）→ おおがた（ヒーターで ねったいぎょ）→ とくだい（アロワナ）
//   ・そだつ：かってから「べんきょうした ひ」の かずで おおきく なる
//
// ほぞん（localStorage: mathapp.v1.fish.<こどもの id>）
//   tanks  [{ id, type, decor: [{ type, slot }], equip: { pump, filter, heater }, water, dirty, changed }]
//   fish   [{ id, species, tankId, since, size, seed, fedDays, starve, fed, grown }]
//   inv    { flake, big, cond }
//   simDay さいごに 1にちぶん たしかめおわった ひ
//   zukan  { しゅるい: { count, maxSize, first } }
//   graves [{ species, size, cause, date, days }]

const fishKey = (id) => `mathapp.v1.fish.${id}`;

// level：すいそうの おおきさ、cap：はいる かず（メダカ 1、きんぎょ 2 … で かぞえる）、dose：みずかえに つかう カルキぬき
const TANKS = {
  senmenki: { name: 'せんめんき', icon: '🪣', price: 0, level: 0, cap: 3, slots: 1, shape: 'basin', dims: [32, 32, 11], dose: 1,
    desc: 'メダカ だけ。3びき まで' },
  bachi: { name: 'きんぎょばち', icon: '🫙', price: 250, level: 1, cap: 2, slots: 1, shape: 'bowl', dims: [28, 28, 24], dose: 1, plants: true,
    desc: 'みずくさ いり。きんぎょ 1ぴき か メダカ 2ひき' },
  S: { name: 'しょうがた すいそう', icon: '🐠', price: 500, level: 2, cap: 6, slots: 2, shape: 'box', dims: [30, 18, 24], dose: 1,
    desc: 'きんぎょ 3びき か メダカ 6ぴき。エアポンプと ろかフィルターが ひつよう' },
  M: { name: 'ちゅうがた すいそう', icon: '🐠', price: 900, level: 3, cap: 12, slots: 3, shape: 'box', dims: [45, 24, 30], dose: 2, mix: true,
    desc: 'ちがう さかなと いっしょに かえる。ベタ・グッピーも' },
  L: { name: 'おおがた すいそう', icon: '🐠', price: 1500, level: 4, cap: 20, slots: 4, shape: 'box', dims: [60, 30, 36], dose: 3, mix: true,
    desc: 'ヒーターを つけると ねったいぎょも かえる' },
  XL: { name: 'とくだい すいそう', icon: '🐠', price: 3000, level: 5, cap: 40, slots: 5, shape: 'box', dims: [120, 45, 45], dose: 4, mix: true,
    desc: 'アロワナが かえる' },
};
const PUMP_FROM = 2; // しょうがた すいそう から エアポンプ・ろかフィルターが ひつよう

const EQUIPS = {
  pump: { name: 'エアポンプ', icon: '🫧', price: 100, from: 2, desc: 'みずに くうきを おくる。さかなが いきを しやすく なる' },
  filter: { name: 'ろかフィルター', icon: '🌀', price: 150, from: 2, desc: 'みずの よごれを とって、よごれにくく する' },
  heater: { name: 'ヒーター', icon: '🌡️', price: 200, from: 4, desc: 'みずを あたたかく する。ねったいぎょに ひつよう' },
};

const FISH_STARVE = 5;
const DIRTY_DAYS = 3;

// units：すいそうの ばしょを いくつ つかうか、level：ひつような すいそう、size：かった とき → おとな（mm）
// grow：おとなに なるまでの べんきょうした ひ、life：じゅみょう（にち）、kind：おなじ なかま（いっしょに かえる）
const FISH = {
  medaka: {
    name: 'メダカ', icon: '🐟', price: 30, level: 0, units: 1, size: [18, 35], grow: 10, life: 730, kind: 'medaka',
    lives: 'たんぼや おがわ', eats: 'ちいさな むし、ミジンコ',
    text: 'にほんの たんぼや おがわに すむ ちいさな さかな。むれで すいめんの ちかくを およぎます。',
    trivia: 'めが おおきく、あたまの うえの ほうに あるので「めだか」と よばれるように なったと いわれています。',
  },
  himedaka: {
    name: 'ヒメダカ', icon: '🐟', price: 40, level: 0, units: 1, size: [18, 35], grow: 10, life: 730, kind: 'medaka',
    lives: 'ひとが そだてた メダカ', eats: 'ちいさな むし、ミジンコ',
    text: 'からだが オレンジいろの メダカ。ひとが そだてて ふやしました。ふつうの メダカと いっしょに かえます。',
    trivia: 'メダカは たまごを うみます。10にち くらいで あかちゃんが うまれます。',
  },
  kingyo: {
    name: 'きんぎょ', icon: '🐠', price: 80, level: 1, units: 2, size: [40, 150], grow: 30, life: 3650, kind: 'kingyo',
    lives: 'ひとが そだてた さかな（もとは フナ）', eats: 'なんでも たべる',
    text: 'フナを もとに、むかしの ちゅうごくで うまれた さかな。あかや しろの もようが 1ぴきずつ ちがいます。',
    trivia: 'じょうずに そだてると 10ねん いじょう いきる ことも あります。',
  },
  ryukin: {
    name: 'リュウキン', icon: '🐠', price: 200, level: 2, units: 2, size: [40, 120], grow: 30, life: 3650, kind: 'kingyo',
    lives: 'ひとが そだてた きんぎょ', eats: 'なんでも たべる',
    text: 'まるい からだと、ひらひらの ながい おびれが うつくしい きんぎょの なかま。',
    trivia: 'およぐのが ゆっくり。はやい さかなと いっしょだと えさを とられて しまう ことも あります。',
  },
  betta: {
    name: 'ベタ', icon: '🐠', price: 250, level: 3, units: 2, single: true, size: [40, 65], grow: 15, life: 730, kind: 'betta',
    lives: 'タイなどの たんぼや ぬま', eats: 'ちいさな むし',
    text: 'ドレスの ような おおきな ひれの さかな。オスどうしは けんかを するので、1つの すいそうに 1ぴき です。',
    trivia: 'くちから くうきを すうことが できるので、さんその すくない みずでも いきられます。',
  },
  guppy: {
    name: 'グッピー', icon: '🐠', price: 60, level: 3, units: 1, size: [15, 35], grow: 10, life: 365, kind: 'guppy',
    lives: 'みなみアメリカの かわ', eats: 'ちいさな むし、も',
    text: 'オスの おびれが カラフルで きれいな ちいさな さかな。なかまと むれで およぎます。',
    trivia: 'たまごでは なく、あかちゃんを うむ さかなです。',
  },
  neon: {
    name: 'ネオンテトラ', icon: '🐠', price: 50, level: 4, units: 1, tropical: true, size: [15, 35], grow: 10, life: 1095, kind: 'neon',
    lives: 'みなみアメリカの アマゾンがわ', eats: 'ちいさな むし',
    text: 'あおく ひかる せんと、あかい からだが きれいな ねったいぎょ。おおぜいの むれで およぎます。',
    trivia: 'あおい せんは ひかりを はねかえして ひかって みえます。むれで いると ねらわれにくく なります。',
  },
  angel: {
    name: 'エンゼルフィッシュ', icon: '🐠', price: 300, level: 4, units: 3, tropical: true, size: [40, 120], grow: 30, life: 3650, kind: 'angel',
    lives: 'みなみアメリカの アマゾンがわ', eats: 'ちいさな むし、ちいさな さかな',
    text: 'たかく のびた ひれが てんしの はねの ような ねったいぎょ。たての しまもようが あります。',
    trivia: 'ひらたい からだで、みずくさの あいだを すいすい およぎます。',
  },
  arowana: {
    name: 'アロワナ', icon: '🐉', price: 2500, level: 5, units: 12, single: true, tropical: true, food: 'big', size: [150, 900], grow: 90, life: 5475, kind: 'arowana',
    lives: 'みなみアメリカの アマゾンがわ', eats: 'むし、さかな、エビ',
    text: 'ぎんいろの おおきな うろこと、うえを むいた くちの おおきな さかな。とても ふるい じだいから いる なかまです。',
    trivia: 'すいめんから ジャンプして、きの えだに いる むしを たべる ことが あります。',
  },
};

const FISH_FOODS = {
  flake: { name: 'さかなの えさ', short: 'えさ', icon: '🍤', price: 2, for: 'まいにちの えさ（1ぴき 1にち 1こ）' },
  big: { name: 'アロワナの えさ', short: 'アロワナ', icon: '🦐', price: 10, for: 'アロワナの まいにちの えさ' },
  cond: { name: 'カルキぬき（すいしつ ちょうせいざい）', short: 'カルキぬき', icon: '🧴', price: 5, for: 'みずかえに つかう。すいどうの みずの カルキを けす' },
};

const FISH_DECORS = {
  kusa: { name: 'みずくさ', icon: '🌿', price: 40, desc: 'ゆらゆら ゆれる。みずが すこし よごれにくく なる' },
  ishi: { name: 'いし', icon: '🪨', price: 30, desc: 'まるい いしを ならべる' },
  kai: { name: 'かいがら', icon: '🐚', price: 30, desc: 'ホタテと まきがい' },
  ryuboku: { name: 'りゅうぼく', icon: '🪵', price: 80, desc: 'みずに しずめた き の えだ' },
  shiro: { name: 'おしろ', icon: '🏰', price: 150, desc: 'みずの なかの おしろ' },
  fune: { name: 'ちんぼつせん', icon: '🚢', price: 200, desc: 'しずんだ ふね' },
};

const aq = {
  data: null,
  tankId: null,
  selected: null,
  room: null,
  shopTab: 'fish',
};

// ---------- データ ----------

function loadFishData(profileId) {
  const s = readJSON(fishKey(profileId), null);
  if (s) return s;
  // はじめて：せんめんきと メダカ 2ひき、えさ・カルキぬきを プレゼント
  const today = todayKey();
  const data = {
    seq: 2,
    tanks: [newTank('t1', 'senmenki')],
    fish: [newFish('f1', 'medaka', 't1', today), newFish('f2', 'himedaka', 't1', today)],
    inv: { flake: 6, big: 0, cond: 2 },
    simDay: dayBefore(today),
    zukan: {},
    graves: [],
    welcome: true,
  };
  for (const f of data.fish) noteFish(data, f, today);
  return data;
}

function newTank(id, type) {
  return { id, type, decor: [], equip: {}, water: 100, dirty: 0, changed: null };
}

function newFish(id, species, tankId, today) {
  return {
    id, species, tankId, since: today, size: FISH[species].size[0], seed: Math.floor(Math.random() * 1e9) + 1,
    fedDays: [], starve: 0, fed: null, grown: false,
  };
}

function saveFishData() {
  writeJSON(fishKey(currentProfile().id), aq.data);
}

function noteFish(data, f, day) {
  const z = data.zukan[f.species] || (data.zukan[f.species] = { count: 0, maxSize: 0, first: day });
  z.count++;
  z.maxSize = Math.max(z.maxSize, f.size);
}

const fishIn = (tankId, data = aq.data) => data.fish.filter((f) => f.tankId === tankId);
const unitsIn = (tankId, data = aq.data) => fishIn(tankId, data).reduce((n, f) => n + FISH[f.species].units, 0);

// 1にちで どれだけ みずが よごれるか
function waterDecay(tank, list) {
  if (!list.length) return 0;
  const T = TANKS[tank.type];
  const load = list.reduce((n, f) => n + FISH[f.species].units, 0) / T.cap;
  let d = 6 + 22 * load;
  if (tank.equip.filter) d *= 0.35;
  const plants = (T.plants ? 1 : 0) + tank.decor.filter((x) => x.type === 'kusa').length;
  d *= Math.max(0.7, 1 - 0.1 * plants);
  return Math.max(2, Math.round(d));
}

// べんきょうした ひ の かずで おおきく なる
function growFish(data, days) {
  const events = [];
  for (const f of data.fish) {
    const sp = FISH[f.species];
    const n = days.filter((d) => d > f.since).length;
    const ratio = Math.min(1, n / sp.grow);
    const size = Math.round(sp.size[0] + (sp.size[1] - sp.size[0]) * Math.pow(ratio, 0.8));
    if (size > f.size) f.size = size;
    const z = data.zukan[f.species];
    if (z) z.maxSize = Math.max(z.maxSize, f.size);
    if (ratio >= 1 && !f.grown) {
      f.grown = true;
      events.push(`${sp.name}が おとなに なった！ おおきさ ${fishSizeText(f.size)}`);
    }
  }
  return events;
}

function fishDie(data, f, cause, day) {
  const sp = FISH[f.species];
  data.fish = data.fish.filter((x) => x.id !== f.id);
  data.graves.push({ species: f.species, size: f.size, cause, date: day, days: daysBetween(f.since, day) });
  if (cause === 'old') return `${sp.name}は じゅみょうを まっとうしました。たくさん いきたね。ありがとう 🌸`;
  if (cause === 'water') return `${sp.name}は みずが よごれすぎて、しんでしまいました…`;
  return `${sp.name}は えさを ${FISH_STARVE}にち もらえなくて、しんでしまいました…`;
}

// きのう までの 1にち ずつ：みずの よごれ・えさ・じゅみょう
function simulateFishDays(data) {
  const today = todayKey();
  const events = [];
  for (let d = nextDay(data.simDay); d < today; d = nextDay(d)) {
    for (const t of data.tanks) {
      const list = fishIn(t.id, data).filter((f) => f.since <= d);
      t.water = Math.max(0, t.water - waterDecay(t, list));
      if (t.water <= 0 && list.length) t.dirty++;
      else t.dirty = 0;
      if (t.dirty >= DIRTY_DAYS) {
        for (const f of list) events.push(fishDie(data, f, 'water', d));
        t.dirty = 0;
      }
    }
    for (const f of [...data.fish]) {
      if (f.since > d) continue;
      if (daysBetween(f.since, d) >= FISH[f.species].life) {
        events.push(fishDie(data, f, 'old', d));
        continue;
      }
      if (f.fedDays.includes(d)) f.starve = 0;
      else f.starve++;
      if (f.starve >= FISH_STARVE) events.push(fishDie(data, f, 'hunger', d));
    }
  }
  data.simDay = dayBefore(today);
  return events;
}

const fishFood = (f) => FISH[f.species].food || 'flake';
const fishFedToday = (f) => f.fed === todayKey();

function waterState(t) {
  if (t.water >= 70) return { text: 'きれい ✨', cls: 'ok' };
  if (t.water >= 40) return { text: 'すこし よごれてきた', cls: 'ok' };
  if (t.water >= 15) return { text: 'よごれている。みずかえ しよう', cls: 'warn' };
  if (t.water > 0) return { text: '⚠️ とても よごれている！ さかなが くるしそう', cls: 'danger', danger: true };
  if (!fishIn(t.id).length) return { text: 'よごれきっている。みずかえ しよう', cls: 'danger' };
  const left = DIRTY_DAYS - t.dirty;
  return { text: left <= 1 ? '⚠️ よごれきっている！ きょう みずかえ しないと しんでしまう！' : `⚠️ よごれきっている！ あと ${left}にちで しんでしまう`, cls: 'danger', danger: true };
}

function fishMood(f) {
  const t = aq.data.tanks.find((x) => x.id === f.tankId);
  if (t.water < 15) return { text: '⚠️ みずが きたなくて くるしそう…', weak: true, danger: true };
  if (fishFedToday(f)) return { text: 'げんき いっぱい 😊', weak: false };
  if (f.starve >= 2) {
    const left = FISH_STARVE - f.starve;
    return {
      text: left <= 1 ? '⚠️ よわっている！ きょう えさを あげないと しんでしまう！' : `⚠️ よわっている！ あと ${left}にち えさを あげないと しんでしまう`,
      weak: true, danger: true,
    };
  }
  return { text: f.starve === 1 ? 'おなか ぺこぺこ 🍽️' : 'おなかが すいた 🍽️', weak: false };
}

const clampNum = (x, a, b) => Math.max(a, Math.min(b, x));
const fishSizeText = (mm) => (mm >= 100 ? `${Math.round(mm / 10)}cm` : `${mm}mm`);

// すいそうに いれられるか。だめなら わけを かえす
function fitProblem(t, key) {
  const sp = FISH[key];
  const T = TANKS[t.type];
  if (T.level < sp.level) return `${Object.values(TANKS).find((x) => x.level === sp.level).name}より おおきい すいそうが ひつよう`;
  if (T.level >= PUMP_FROM && !(t.equip.pump && t.equip.filter)) return 'エアポンプと ろかフィルターを つけてね';
  if (sp.tropical && !t.equip.heater) return 'ヒーターを つけた すいそうが ひつよう';
  const list = fishIn(t.id);
  if (!T.mix && list.some((f) => FISH[f.species].kind !== sp.kind)) return 'この すいそうでは ちがう なかまと いっしょに かえない';
  if (sp.single && list.some((f) => f.species === key)) return '1つの すいそうに 1ぴき だけ';
  if (unitsIn(t.id) + sp.units > T.cap) return 'すいそうが いっぱい';
  return null;
}

// 3D に わたす かたち
function fishView(f) {
  const t = aq.data.tanks.find((x) => x.id === f.tankId);
  const T = TANKS[t.type];
  // ちいさい さかなも みえる ように すこし おおきめ。すいそうから はみださない
  const cm = f.size / 10;
  const lengthCm = Math.max(3.2, T.dims[0] * 0.12, Math.min(T.dims[0] * 0.42, cm * clampNum(1.6 - (cm - 3) * 0.08, 1, 1.6)));
  return { id: f.id, species: f.species, lengthCm, seed: f.seed, weak: fishMood(f).weak };
}

// ---------- がめん ----------

function openFish() {
  const profile = currentProfile();
  aq.data = loadFishData(profile.id);
  const events = [...growFish(aq.data, studyDayList(profile.id)), ...simulateFishDays(aq.data)];
  saveFishData();
  if (!aq.data.tanks.some((t) => t.id === aq.tankId)) aq.tankId = aq.data.tanks[0].id;
  aq.selected = null;
  $('fish-who').textContent = profile.name;
  show('fish');
  renderFish();
  mountTank();
  if (aq.data.welcome) {
    aq.data.welcome = false;
    saveFishData();
    notice('ようこそ！ せんめんきと メダカ 2ひき、えさ 6こ、カルキぬき 2こ を プレゼント 🎁<br>まいにち えさを あげて、みずが よごれたら みずかえ してね');
  } else if (events.length) {
    notice(events.join('<br><br>'));
  }
}

function closeFish() {
  if (aq.room) aq.room.dispose();
  aq.room = null;
  $('tank3d').querySelectorAll('canvas').forEach((c) => c.remove());
  renderHome();
}

async function mountTank() {
  const box = $('tank3d');
  $('tank-msg').textContent = 'よみこみちゅう…';
  $('tank-msg').style.display = '';
  const onSelect = (id) => {
    aq.selected = id;
    renderFishInfo();
  };
  let reason = '';
  try {
    if (/[?&]flat=1/.test(location.search)) throw new Error('URL の flat=1 で かんたん ひょうじを えらんでいます');
    const mod = await import('./fish3d.js');
    if (!$('fish').classList.contains('active')) return;
    if (aq.room) aq.room.dispose();
    aq.room = mod.createAquarium(box, { onSelect });
    $('tank-msg').style.display = 'none';
    syncTank(true);
    return;
  } catch (e) {
    reason = e && e.message ? e.message : String(e);
  }
  if (!$('fish').classList.contains('active')) return;
  if (!navigator.onLine) {
    $('tank-msg').textContent = '3D を よみこめませんでした。インターネットに つないで ひらきなおしてね';
    return;
  }
  if (aq.room) aq.room.dispose();
  aq.room = createFlatTank(box, { onSelect, reason });
  $('tank-msg').style.display = 'none';
  syncTank(true);
}

const currentTank = () => aq.data.tanks.find((t) => t.id === aq.tankId);

function syncTank(rebuild) {
  if (!aq.room) return;
  const t = currentTank();
  const T = TANKS[t.type];
  if (rebuild) {
    aq.room.setTank({ shape: T.shape, dims: T.dims, level: T.level, slots: T.slots, equip: t.equip, decor: t.decor, plants: !!T.plants });
    aq.room.setWater(t.water, true);
  }
  aq.room.setFish(fishIn(aq.tankId).map(fishView));
  aq.room.select(aq.selected);
}

function switchTank(id) {
  aq.tankId = id;
  aq.selected = null;
  renderFish();
  syncTank(true);
}

function renderFish() {
  $('fish-points').innerHTML = `⭐ <b>${loadWallet(currentProfile().id).points}</b> pt`;
  const tabs = $('tank-tabs');
  tabs.innerHTML = '';
  for (const t of aq.data.tanks) {
    const T = TANKS[t.type];
    const b = document.createElement('button');
    const danger = waterState(t).danger || fishIn(t.id).some((f) => fishMood(f).danger);
    b.className = 'case-tab tank-tab' + (t.id === aq.tankId ? ' active' : '') + (danger ? ' danger' : '');
    b.textContent = `${danger ? '⚠️ ' : ''}${T.name}（${fishIn(t.id).length}ひき）`;
    b.addEventListener('click', () => switchTank(t.id));
    tabs.appendChild(b);
  }
  const inv = aq.data.inv;
  $('finventory').innerHTML = Object.entries(FISH_FOODS)
    .map(([k, f]) => `<span class="inv-item" title="${f.name}">${f.icon} ${f.short} <b>${inv[k] || 0}</b></span>`).join('');
  const t = currentTank();
  $('water-btn').disabled = false;
  $('water-btn').classList.toggle('attention', t.water < 40 && t.changed !== todayKey());
  renderFishInfo();
}

function renderFishInfo() {
  const el = $('fish-info');
  const f = aq.data.fish.find((x) => x.id === aq.selected);
  const t = currentTank();
  const T = TANKS[t.type];
  if (!f) {
    const list = fishIn(t.id);
    const hungry = list.filter((x) => !fishFedToday(x)).length;
    const ws = waterState(t);
    const equip = T.level >= PUMP_FROM
      ? Object.entries(EQUIPS).filter(([, e]) => T.level >= e.from)
        .map(([k, e]) => `<span class="eq ${t.equip[k] ? 'on' : 'off'}">${e.icon} ${e.name} ${t.equip[k] ? '✅' : '—'}</span>`).join('')
      : '';
    const decor = t.decor.map((d) => `${FISH_DECORS[d.type].icon} ${FISH_DECORS[d.type].name}`).join('、');
    el.innerHTML = `
      <div class="info-title">${T.name} <small>${unitsIn(t.id)}/${T.cap}</small></div>
      <div class="water-meter ${ws.cls}">
        <div class="wm-label">💧 みず：${ws.text}</div>
        <div class="wm-bar"><i style="width:${Math.max(3, t.water)}%"></i></div>
      </div>
      ${equip ? `<div class="eq-list">${equip}</div>` : ''}
      ${T.level >= PUMP_FROM && !(t.equip.pump && t.equip.filter) ? '<div class="info-need">おみせの「きぐ」で エアポンプと ろかフィルターを つけると さかなを いれられるよ</div>' : ''}
      <div class="info-sub">${list.length ? 'さかなを タップすると くわしく みられるよ' : 'まだ さかなが いないよ。おみせで かおう'}</div>
      <ul class="case-list">${list.map((x) => {
        const m = fishMood(x);
        return `<li data-id="${x.id}" class="${m.danger ? 'danger' : ''}">${FISH[x.species].icon} ${FISH[x.species].name} <small>${fishSizeText(x.size)}</small></li>`;
      }).join('')}</ul>
      <div class="info-sub">おきもの：${decor || 'なし'}（${t.decor.length}/${T.slots}）</div>
      <div class="info-need">${hungry ? `きょう えさが ほしい さかな：${hungry}ひき` : list.length ? 'きょうの えさは ばっちり！' : ''}
        ${t.changed === todayKey() ? '・きょうは みずかえ した' : ''}</div>`;
    el.querySelectorAll('li[data-id]').forEach((li) => li.addEventListener('click', () => {
      aq.selected = li.dataset.id;
      if (aq.room) aq.room.select(aq.selected);
      renderFishInfo();
    }));
    return;
  }
  const sp = FISH[f.species];
  const mood = fishMood(f);
  const done = studyDayList(currentProfile().id).filter((d) => d > f.since).length;
  const age = daysBetween(f.since, todayKey());
  el.innerHTML = `
    <div class="info-title">${sp.icon} ${sp.name}</div>
    <div class="info-mood${mood.danger ? ' danger' : ''}">${mood.text}</div>
    <div class="info-growth">
      <div>おおきさ：<b>${fishSizeText(f.size)}</b>（おとなで ${fishSizeText(sp.size[1])}）</div>
      <div>${f.grown ? 'もう おとな！' : `おとなまで：あと <b>${Math.max(0, sp.grow - done)}</b>にち べんきょう`}</div>
      <div>かってから ${age}にち（じゅみょう やく ${lifeText(sp.life)}）</div>
    </div>
    <button class="small-btn info-back">← すいそうの いちらん</button>`;
  el.querySelector('.info-back').addEventListener('click', () => {
    aq.selected = null;
    if (aq.room) aq.room.select(null);
    renderFishInfo();
  });
}

// すいそうの さかな ぜんぶに えさ
function feedTank() {
  const missing = {};
  let fed = 0;
  const today = todayKey();
  for (const f of fishIn(aq.tankId)) {
    if (fishFedToday(f)) continue;
    const kind = fishFood(f);
    if ((aq.data.inv[kind] || 0) > 0) {
      aq.data.inv[kind]--;
      f.fed = today;
      if (!f.fedDays.includes(today)) f.fedDays = [...f.fedDays, today].slice(-14);
      f.starve = 0;
      fed++;
    } else {
      missing[kind] = (missing[kind] || 0) + 1;
    }
  }
  saveFishData();
  if (fed && aq.room && aq.room.feed) aq.room.feed(Math.min(40, fed * 3));
  const lacks = Object.entries(missing).map(([k, n]) => `${FISH_FOODS[k].name} ${n}こ`);
  if (lacks.length) toast(`${fed ? `${fed}ひきに あげたよ。` : ''}${lacks.join('、')} が たりない！ おみせで かおう`);
  else if (!fishIn(aq.tankId).length) toast('まだ さかなが いないよ');
  else toast(fed ? `${fed}ひきに えさを あげたよ 😋` : 'きょうの えさは もう あげたよ');
  renderFish();
  syncTank();
}

function changeWater() {
  const t = currentTank();
  const T = TANKS[t.type];
  if (t.changed === todayKey()) {
    toast('きょうは もう みずかえ したよ');
    return;
  }
  if (t.water >= 100) {
    toast('みずは まだ きれいだよ ✨');
    return;
  }
  if ((aq.data.inv.cond || 0) < T.dose) {
    toast(`みずかえには カルキぬきが ${T.dose}こ ひつよう。おみせで かおう`);
    return;
  }
  confirmDialog(`カルキぬきを ${T.dose}こ つかって みずかえ する？`, () => {
    aq.data.inv.cond -= T.dose;
    t.water = 100;
    t.dirty = 0;
    t.changed = todayKey();
    saveFishData();
    if (aq.room) aq.room.setWater(100);
    toast('💧 みずかえ したよ！ ぴかぴか ✨');
    renderFish();
    syncTank();
  }, 'する！');
}

// ---------- おみせ ----------

function openFishShop(tab) {
  if (tab) aq.shopTab = tab;
  const points = loadWallet(currentProfile().id).points;
  $('fshop-points').innerHTML = `⭐ <b>${points}</b> pt`;
  document.querySelectorAll('.fshop-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === aq.shopTab));
  const t = currentTank();
  const T = TANKS[t.type];
  const rows = [];
  if (aq.shopTab === 'fish') {
    for (const [k, sp] of Object.entries(FISH)) {
      const ok = aq.data.tanks.some((x) => !fitProblem(x, k));
      const why = ok ? null : fitProblem(t, k);
      rows.push(shopRow({
        icon: sp.icon, name: sp.name, price: sp.price, points, locked: !ok,
        desc: ok ? `おとなで ${fishSizeText(sp.size[1])}${sp.tropical ? '・ねったいぎょ' : ''}` : `🔒 ${why}`,
        action: `fish:${k}`,
      }));
    }
  } else if (aq.shopTab === 'tank') {
    for (const [k, x] of Object.entries(TANKS)) {
      if (!x.price) continue;
      rows.push(shopRow({ icon: x.icon, name: x.name, price: x.price, points, desc: x.desc, action: `tank:${k}` }));
    }
  } else if (aq.shopTab === 'equip') {
    for (const [k, e] of Object.entries(EQUIPS)) {
      const cant = T.level < e.from;
      const has = !!t.equip[k];
      rows.push(shopRow({
        icon: e.icon, name: e.name, price: e.price, points, locked: cant || has,
        desc: cant ? `🔒 ${T.name}には つけられない` : has ? `✅ ${T.name}に ついている` : `${e.desc}（${T.name}に つけるよ）`,
        action: `equip:${k}`,
      }));
    }
  } else if (aq.shopTab === 'decor') {
    const full = t.decor.length >= T.slots;
    for (const [k, d] of Object.entries(FISH_DECORS)) {
      rows.push(shopRow({
        icon: d.icon, name: d.name, price: d.price, points, locked: full,
        desc: full ? `🔒 ${T.name}には もう おけない` : `${d.desc}（${T.name}に おくよ）`,
        action: `decor:${k}`,
      }));
    }
  } else {
    for (const [k, f] of Object.entries(FISH_FOODS)) {
      rows.push(shopRow({ icon: f.icon, name: `${f.name} ×1`, price: f.price, points, desc: f.for, action: `food:${k}:1` }));
      rows.push(shopRow({ icon: f.icon, name: `${f.name} ×5`, price: f.price * 5, points, desc: `もっている かず：${aq.data.inv[k] || 0}`, action: `food:${k}:5` }));
    }
  }
  $('fshop-list').innerHTML = rows.join('');
  $('fshop-list').querySelectorAll('button[data-action]').forEach((b) => b.addEventListener('click', () => buyFish(b.dataset.action)));
  $('fshop').classList.remove('hidden');
}

function closeFishShop() {
  $('fshop').classList.add('hidden');
}

function buyFish(action) {
  const [kind, key, count] = action.split(':');
  const ask = confirmDialog;
  if (kind === 'food') {
    const n = Number(count);
    if (!spendPoints(FISH_FOODS[key].price * n, `fishfood:${key}`)) return;
    aq.data.inv[key] = (aq.data.inv[key] || 0) + n;
    saveFishData();
    openFishShop();
    renderFish();
    return;
  }
  if (kind === 'tank') {
    const x = TANKS[key];
    ask(`${x.name}を ${x.price}pt で かう？`, () => {
      if (!spendPoints(x.price, `tank:${key}`)) return;
      const id = `t${++aq.data.seq}`;
      aq.data.tanks.push(newTank(id, key));
      saveFishData();
      closeFishShop();
      switchTank(id);
      toast(x.level >= PUMP_FROM ? `${x.name}が とどいた！ エアポンプと ろかフィルターを つけよう` : `${x.name}が とどいた！`);
    });
    return;
  }
  const t = currentTank();
  if (kind === 'equip') {
    const e = EQUIPS[key];
    ask(`${e.name}を ${e.price}pt で かって ${TANKS[t.type].name}に つける？`, () => {
      if (!spendPoints(e.price, `equip:${key}`)) return;
      t.equip[key] = true;
      saveFishData();
      closeFishShop();
      renderFish();
      syncTank(true);
      toast(`${e.name}を つけたよ！`);
    });
    return;
  }
  if (kind === 'decor') {
    const d = FISH_DECORS[key];
    ask(`${d.name}を ${d.price}pt で かう？`, () => {
      const used = new Set(t.decor.map((x) => x.slot));
      const slot = [...Array(TANKS[t.type].slots).keys()].find((i) => !used.has(i));
      if (slot === undefined || !spendPoints(d.price, `fishdecor:${key}`)) return;
      t.decor.push({ type: key, slot });
      saveFishData();
      closeFishShop();
      renderFish();
      syncTank(true);
      toast(`${d.name}を おいたよ！`);
    });
    return;
  }
  const sp = FISH[key];
  // いまの すいそうに はいれば そこ、だめなら はいれる すいそうを さがす
  const target = !fitProblem(t, key) ? t : aq.data.tanks.find((x) => !fitProblem(x, key));
  if (!target) {
    toast(fitProblem(t, key));
    return;
  }
  ask(`${sp.name}を ${sp.price}pt で かう？`, () => {
    if (!spendPoints(sp.price, `fish:${key}`)) return;
    const today = todayKey();
    const id = `f${++aq.data.seq}`;
    const f = newFish(id, key, target.id, today);
    aq.data.fish.push(f);
    noteFish(aq.data, f, today);
    saveFishData();
    closeFishShop();
    aq.tankId = target.id;
    aq.selected = id;
    renderFish();
    syncTank(true);
    toast(`${sp.name}が きた！ ${TANKS[target.type].name}に いるよ`);
  });
}

// ---------- ずかん ----------

function openFishZukan() {
  const z = aq.data.zukan;
  const grid = $('fzukan-grid');
  grid.innerHTML = '';
  for (const [k, sp] of Object.entries(FISH)) {
    const rec = z[k];
    const b = document.createElement('button');
    b.className = 'zukan-card' + (rec ? '' : ' unknown');
    b.innerHTML = rec
      ? `<span class="z-icon">${sp.icon}</span><span class="z-name">${sp.name}</span><span class="z-rec">さいだい ${fishSizeText(rec.maxSize)}</span>`
      : '<span class="z-icon">❔</span><span class="z-name">？？？</span><span class="z-rec">まだ かったことが ない</span>';
    b.addEventListener('click', () => showFishDetail(k));
    grid.appendChild(b);
  }
  $('fzukan-count').textContent = `${Object.keys(z).length} / ${Object.keys(FISH).length} しゅるい`;
  showFishDetail(null);
  $('fzukan').classList.remove('hidden');
}

let fishViewer = null;
function disposeFishViewer() {
  if (fishViewer) fishViewer.dispose();
  fishViewer = null;
}

function showFishDetail(k) {
  disposeFishViewer();
  const el = $('fzukan-detail');
  if (!k) {
    const graves = aq.data.graves.slice().reverse();
    const why = { old: 'じゅみょう', water: 'みずが よごれて', hunger: 'えさが なくて' };
    el.innerHTML = `<div class="info-title">🌸 おもいで</div>
      ${graves.length ? `<ul class="graves">${graves.map((g) => `<li>${FISH[g.species].icon} ${FISH[g.species].name} ${fishSizeText(g.size)}
        <small>${g.date.slice(5).replace('-', '/')}・${why[g.cause]}</small></li>`).join('')}</ul>`
        : '<div class="info-sub">しゅるいを タップすると せつめいが みられるよ</div>'}`;
    return;
  }
  const sp = FISH[k];
  const rec = aq.data.zukan[k];
  if (!rec) {
    el.innerHTML = `<div class="info-title">？？？</div><div class="info-sub">おみせで かうと わかるよ。${sp.price}pt</div>`;
    return;
  }
  const need = Object.values(TANKS).find((x) => x.level === sp.level).name;
  el.innerHTML = `
    <div class="info-title">${sp.icon} ${sp.name}</div>
    <div id="fzukan-3d" class="zukan-3d fish-3d"></div>
    <div class="z-stats"><span>さいだい <b>${fishSizeText(rec.maxSize)}</b></span><span>かった かず <b>${rec.count}</b></span></div>
    <p>${sp.text}</p>
    <dl class="z-facts">
      <dt>おおきさ</dt><dd>おとなで ${fishSizeText(sp.size[1])} くらい</dd>
      <dt>すんでいる ところ</dt><dd>${sp.lives}</dd>
      <dt>たべもの</dt><dd>${sp.eats}</dd>
      <dt>まめちしき</dt><dd>${sp.trivia}</dd>
      <dt>この アプリでは</dt><dd>${need}から かえる${sp.tropical ? '（ヒーターが ひつよう）' : ''}。じゅみょう やく ${lifeText(sp.life)}</dd>
    </dl>
    <button class="small-btn" id="fzukan-back">← おもいで</button>`;
  $('fzukan-back').addEventListener('click', () => showFishDetail(null));
  (async () => {
    try {
      const mod = await import('./fish3d.js');
      const box = $('fzukan-3d');
      if (!box || $('fzukan').classList.contains('hidden')) return;
      disposeFishViewer();
      fishViewer = mod.createFishViewer(box, { species: k });
    } catch {
      const box = $('fzukan-3d');
      if (box) box.remove();
    }
  })();
}

// ---------- かんたん ひょうじ（3D が つかえない とき） ----------

function createFlatTank(container, { onSelect, reason }) {
  const root = document.createElement('div');
  root.className = 'flat-tank';
  root.innerHTML = `<div class="flat-water"></div>
    <div class="flat-reason">かんたん ひょうじ（3D が つかえない タブレット）${reason ? `<small>${reason}</small>` : ''}</div>`;
  container.appendChild(root);
  const water = root.querySelector('.flat-water');
  const items = new Map();
  let selected = null;
  const move = (el) => {
    el.style.left = `${5 + Math.random() * 82}%`;
    el.style.top = `${10 + Math.random() * 75}%`;
    el.classList.toggle('flip', Math.random() < 0.5);
  };
  const timer = setInterval(() => items.forEach((el) => Math.random() < 0.7 && move(el)), 2500);
  const select = (id) => {
    selected = id;
    items.forEach((el, k) => el.classList.toggle('selected', k === id));
  };
  return {
    setTank() {},
    setWater(q) {
      water.style.filter = `sepia(${(1 - q / 100) * 0.8}) hue-rotate(${(1 - q / 100) * -40}deg)`;
    },
    setFish(list) {
      items.forEach((el) => el.remove());
      items.clear();
      for (const p of list) {
        const el = document.createElement('button');
        el.className = `flat-fish${p.weak ? ' weak' : ''}`;
        el.style.fontSize = `${Math.round(16 + Math.min(40, p.lengthCm * 2.5))}px`;
        el.textContent = FISH[p.species].icon;
        el.addEventListener('click', () => {
          select(p.id);
          onSelect(p.id);
        });
        move(el);
        water.appendChild(el);
        items.set(p.id, el);
      }
      select(selected);
    },
    select,
    dispose() {
      clearInterval(timer);
      root.remove();
    },
  };
}

$('fish-back').addEventListener('click', closeFish);
$('ffeed-btn').addEventListener('click', feedTank);
$('water-btn').addEventListener('click', changeWater);
$('fshop-btn').addEventListener('click', () => openFishShop());
$('fzukan-btn').addEventListener('click', openFishZukan);
$('fshop-close').addEventListener('click', closeFishShop);
$('fzukan-close').addEventListener('click', () => {
  disposeFishViewer();
  $('fzukan').classList.add('hidden');
});
document.querySelectorAll('.fshop-tab').forEach((b) => b.addEventListener('click', () => openFishShop(b.dataset.tab)));
