// むしの おへや：べんきょうで ためた ポイントで むし・ケース・えさ・おきものを かって そだてる。
//   ・えさ：1ぴき 1にち 1こ。むしが ふえるほど ポイントが いる（さなぎ・とうみんちゅうは たべない）
//   ・5にち えさを もらえないと よわって しんでしまう（2にちめから「よわっている」と でる）
//   ・そだつ：ようちゅう → さなぎ → せいちゅう。「べんきょうした ひ」（1セット いじょう おわった ひ）で すすむ
//   ・おおきさ：ようちゅうの あいだに きんしエキス・ロイヤルゼリーを あげると おおきく なる
//   ・じゅみょう：せいちゅうに なってから（カブトムシ 3かげつ、クワガタ 2ねん など）
//   ・とうみん：クワガタの せいちゅうは 12がつ15にち 〜 よくとしの 6がつ1にち まで ねている
//
// ほぞん（localStorage: mathapp.v1.pets.<こどもの id>）
//   cases  [{ id, type, decor: [{ type, slot }] }]
//   pets   [{ id, species, caseId, stage, stageStart, growth, size, adultSince, fedDays: [ひづけ], starve, fed: { day, kinds } }]
//   inv    { jelly, leaf, mat, kinshi, royal }
//   simDay さいごに 1にちぶん たしかめおわった ひ（はらぺこ・じゅみょう）
//   zukan  { しゅるい: { count, raised, maxSize, first } }
//   graves [{ species, size, stage, cause, date, days }]

const petsKey = (id) => `mathapp.v1.pets.${id}`;

// dims：よこ・おくゆき・たかさ（cm）、slots：おきものを おける かず
const CASES = {
  starter: { name: 'はじめの ケース', price: 0, size: 0, capacity: 6, slots: 2, dims: [24, 16, 14] },
  S: { name: 'しいくケース（小）', price: 200, size: 1, capacity: 3, slots: 2, dims: [32, 20, 20] },
  M: { name: 'しいくケース（中）', price: 400, size: 2, capacity: 4, slots: 3, dims: [42, 26, 26] },
  L: { name: 'しいくケース（大）', price: 800, size: 3, capacity: 5, slots: 4, dims: [56, 32, 32] },
};

const STARVE_DAYS = 5;
const WAKE = { month: 6, day: 1 };    // とうみんから おきる ひ
const SLEEP = { month: 12, day: 15 }; // とうみんを はじめる ひ

// larva / pupa：ようちゅう・さなぎで すごす「べんきょうした ひ」の かず
// size：せいちゅうの おおきさ（mm）、life：せいちゅうの じゅみょう（にち）、caseSize：ひつような ケース
const SPECIES = {
  ant: {
    name: 'アリ', icon: '🐜', price: 20, caseSize: 0, food: 'jelly', size: [8, 8], life: 365,
    lives: 'じめんの した（す）', eats: 'あまい みつ、ちいさな むし',
    text: 'じめんの したに すを つくり、じょおうアリを ちゅうしんに おおぜいで くらしています。はたらきアリは みんな メスです。',
    trivia: 'えさを みつけると においの みちしるべを つけて、なかまに ばしょを おしえます。',
  },
  dango: {
    name: 'ダンゴムシ', icon: '🪨', price: 40, caseSize: 0, food: 'leaf', size: [12, 12], life: 730,
    lives: 'おちばや いしの した', eats: 'おちば',
    text: 'さわると まるく なって みを まもります。じつは こんちゅうでは なく、エビや カニの なかまです。あしは 14ほん あります。',
    trivia: 'おちばを たべて、ふんが つちに かえります。もりの おそうじやさんです。',
  },
  kanabun: {
    name: 'カナブン', icon: '🪲', price: 100, caseSize: 1, larva: 5, pupa: 2, size: [22, 30], life: 60,
    lives: 'ぞうきばやし', eats: 'きの しる（じゅえき）、くだもの',
    text: 'なつに クヌギなどの じゅえきに あつまる、みどりや ちゃいろに ひかる こうちゅうです。',
    trivia: 'かたい はねを とじた まま、すきまから うしろばねを だして とぶことが できます。',
  },
  kokuwa: {
    name: 'コクワガタ', icon: '🪲', price: 150, caseSize: 1, larva: 6, pupa: 2, size: [20, 54], life: 730, kuwagata: true,
    lives: 'にほんじゅうの ぞうきばやし', eats: 'じゅえき',
    text: 'にほんで いちばん よく みつかる、こがたの クワガタです。',
    trivia: 'せいちゅうで ふゆを こして、なんねんも いきることが あります。',
  },
  nokogiri: {
    name: 'ノコギリクワガタ', icon: '🪲', price: 300, caseSize: 2, larva: 8, pupa: 3, size: [26, 75], life: 730, kuwagata: true,
    lives: 'ひくい やまや ぞうきばやし', eats: 'じゅえき',
    text: 'おおあごの うちがわが ノコギリの ように ギザギザしています。',
    trivia: 'おおきな オスほど、おおあごが おおきく まがります。',
  },
  kabuto: {
    name: 'カブトムシ', icon: '🪲', price: 300, caseSize: 2, larva: 8, pupa: 3, size: [32, 85], life: 90,
    lives: 'ぞうきばやし', eats: 'じゅえき（ようちゅうは ふようど）',
    text: 'にほんで にんきの おおきな こうちゅう。オスの りっぱな つのは、けんかの ときに あいてを もちあげて なげとばすのに つかいます。',
    trivia: 'ようちゅうは くさった はっぱや きが まざった つち（ふようど）を たべて おおきく なります。',
  },
  miyama: {
    name: 'ミヤマクワガタ', icon: '🪲', price: 600, caseSize: 3, larva: 10, pupa: 3, size: [32, 79], life: 730, kuwagata: true,
    lives: 'やまの すずしい もり', eats: 'じゅえき',
    text: 'あたまの よこに「みみ」の ような でっぱりが ある クワガタです。',
    trivia: 'からだに こまかい きんいろの けが はえています。あつさが にがてです。',
  },
  ookuwa: {
    name: 'オオクワガタ', icon: '🪲', price: 1000, caseSize: 3, larva: 12, pupa: 4, size: [30, 80], life: 730, kuwagata: true,
    lives: 'ふるい きが おおい ぞうきばやし', eats: 'じゅえき',
    text: 'くろく ひかる、ふとい おおあごの クワガタ。「くろい ダイヤ」と よばれる ことも あります。',
    trivia: 'しぜんの なかでは かずが すくなく、みつけるのが とても むずかしい クワガタです。',
  },
};

// boost：ようちゅうに あげると そだちが ふえる（1にち 1かいずつ）
const FOODS = {
  jelly: { name: 'こんちゅうゼリー', short: 'ゼリー', icon: '🍯', price: 3, for: 'せいちゅう・アリ の まいにちの えさ' },
  leaf: { name: 'おちば', short: 'おちば', icon: '🍂', price: 2, for: 'ダンゴムシ の まいにちの えさ' },
  mat: { name: 'ようちゅうマット', short: 'マット', icon: '🟫', price: 3, for: 'ようちゅう の まいにちの えさ' },
  kinshi: { name: 'きんしエキス', short: 'きんし', icon: '🍄', price: 15, for: 'ようちゅうが おおきく そだつ', boost: 2 },
  royal: { name: 'ロイヤルゼリー', short: 'ロイヤル', icon: '👑', price: 30, for: 'ようちゅうが もっと おおきく そだつ', boost: 4 },
};

// おきもの：むしが あそびに いく（うごきは pet3d.js）
const DECORS = {
  perch: { name: 'とまりぎ', icon: '🌿', price: 60, desc: 'てっぺんまで のぼって ひとやすみ' },
  slide: { name: 'すべりだい', icon: '🛝', price: 150, desc: 'はしごを のぼって すべりおりる' },
  swing: { name: 'ブランコ', icon: '🎠', price: 200, desc: 'のって ゆらゆら' },
  house: { name: 'きのこの おうち', icon: '🍄', price: 250, desc: 'なかに はいって かくれんぼ' },
};

const GROWTH_MAX_PER_DAY = 7; // マット 1 ＋ きんし 2 ＋ ロイヤル 4
const STAGE_NAMES = { larva: 'ようちゅう', pupa: 'さなぎ', adult: 'せいちゅう' };

const pets = {
  data: null,
  caseId: null,
  selected: null,
  room: null, // 3D（よみこめなければ null）
  shopTab: 'bug',
};

// ---------- ひづけ ----------

function nextDay(key) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return todayKey(d);
}

function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
}

function isWinter(key) {
  const [, m, d] = key.split('-').map(Number);
  const md = m * 100 + d;
  return md >= SLEEP.month * 100 + SLEEP.day || md < WAKE.month * 100 + WAKE.day;
}

// クワガタの せいちゅうは ふゆの あいだ ねむる
const isSleeping = (p, key = todayKey()) => !!SPECIES[p.species].kuwagata && p.stage === 'adult' && isWinter(key);

// ---------- データ ----------

function loadPetData(profileId) {
  const s = readJSON(petsKey(profileId), null);
  if (s) return migrate(s);
  // はじめて：ケースと アリ 1ぴき と ゼリー 3こ を プレゼント
  const today = todayKey();
  const data = {
    seq: 1,
    cases: [{ id: 'c1', type: 'starter', decor: [] }],
    pets: [newPet('pet1', 'ant', 'c1', today)],
    inv: { jelly: 3, leaf: 0, mat: 0, kinshi: 0, royal: 0 },
    simDay: dayBefore(today),
    zukan: {},
    graves: [],
    welcome: true,
  };
  noteOwned(data, 'ant', today);
  noteAdult(data, data.pets[0], false);
  return data;
}

// まえの バージョンの データを いまの かたちに
function migrate(s) {
  s.zukan = s.zukan || {};
  s.graves = s.graves || [];
  s.simDay = s.simDay || dayBefore(todayKey());
  for (const c of s.cases) c.decor = c.decor || [];
  for (const p of s.pets) {
    if (!p.fedDays) p.fedDays = p.lastFed ? [p.lastFed] : [];
    if (p.starve === undefined) p.starve = 0;
    if (p.stage === 'adult' && !p.adultSince) p.adultSince = p.stageStart;
    if (!s.zukan[p.species]) noteOwned(s, p.species, p.stageStart);
    if (p.stage === 'adult') noteAdult(s, p, false);
    delete p.lastFed;
  }
  return s;
}

function newPet(id, species, caseId, today) {
  const sp = SPECIES[species];
  return {
    id, species, caseId, stage: sp.larva ? 'larva' : 'adult', stageStart: today,
    growth: 0, size: sp.larva ? null : sp.size[0], adultSince: sp.larva ? null : today,
    fedDays: [], starve: 0, fed: null,
  };
}

function savePetData() {
  writeJSON(petsKey(currentProfile().id), pets.data);
}

// ずかんに きろく
function noteOwned(data, species, day) {
  const z = data.zukan[species] || (data.zukan[species] = { count: 0, raised: 0, maxSize: 0, first: day });
  z.count++;
}

function noteAdult(data, p, raised) {
  const z = data.zukan[p.species];
  if (raised) z.raised++;
  z.maxSize = Math.max(z.maxSize || 0, p.size || 0);
}

// 1セット いじょう おわった ひ（ふるい じゅん）
function studyDayList(profileId) {
  const w = loadWallet(profileId);
  return Object.keys(w.days).filter((k) => w.days[k].sets > 0).sort();
}

function sizeFromGrowth(sp, growth) {
  const ratio = Math.min(1, growth / (sp.larva * GROWTH_MAX_PER_DAY));
  return Math.round(sp.size[0] + (sp.size[1] - sp.size[0]) * Math.pow(ratio, 0.8));
}

// べんきょうした ひ の かずで ようちゅう → さなぎ → せいちゅう に すすめる
function processGrowth(data, days) {
  const events = [];
  for (const p of data.pets) {
    const sp = SPECIES[p.species];
    for (let guard = 0; guard < 3; guard++) {
      const after = days.filter((d) => d > p.stageStart);
      if (p.stage === 'larva' && after.length >= sp.larva) {
        p.stage = 'pupa';
        p.stageStart = after[sp.larva - 1];
        p.size = sizeFromGrowth(sp, p.growth);
        p.starve = 0;
        events.push(`${sp.name}が さなぎに なった！`);
      } else if (p.stage === 'pupa' && after.length >= sp.pupa) {
        p.stage = 'adult';
        p.stageStart = after[sp.pupa - 1];
        p.adultSince = p.stageStart;
        p.starve = 0;
        noteAdult(data, p, true);
        events.push(`${sp.name}が せいちゅうに なった！ おおきさ ${p.size}mm`);
      } else break;
    }
  }
  return events;
}

function die(data, p, cause, day) {
  const sp = SPECIES[p.species];
  data.pets = data.pets.filter((x) => x.id !== p.id);
  data.graves.push({
    species: p.species, size: p.size, stage: p.stage, cause, date: day,
    days: p.adultSince ? daysBetween(p.adultSince, day) : 0,
  });
  return cause === 'old'
    ? `${sp.name}は じゅみょうを まっとうしました。たくさん いきたね。ありがとう 🌸`
    : `${sp.name}は えさを ${STARVE_DAYS}にち もらえなくて、よわって しんでしまいました…`;
}

// きのう までの 1にち ずつを たしかめる：えさを もらえなかった ひ・じゅみょう
function simulateDays(data) {
  const today = todayKey();
  const events = [];
  for (let d = nextDay(data.simDay); d < today; d = nextDay(d)) {
    for (const p of [...data.pets]) {
      if (p.stageStart > d) continue; // まだ いなかった
      if (p.stage === 'adult' && p.adultSince && daysBetween(p.adultSince, d) >= SPECIES[p.species].life) {
        events.push(die(data, p, 'old', d));
        continue;
      }
      if (p.stage === 'pupa' || isSleeping(p, d)) continue;
      if (p.fedDays.includes(d)) p.starve = 0;
      else p.starve++;
      if (p.starve >= STARVE_DAYS) events.push(die(data, p, 'hunger', d));
    }
  }
  data.simDay = dayBefore(today);
  return events;
}

function foodFor(p) {
  if (p.stage === 'pupa' || isSleeping(p)) return null;
  if (p.stage === 'larva') return 'mat';
  return SPECIES[p.species].food || 'jelly';
}

const fedToday = (p, kind) => p.fed && p.fed.day === todayKey() && p.fed.kinds.includes(kind);

function markFed(p, kind) {
  const today = todayKey();
  if (!p.fed || p.fed.day !== today) p.fed = { day: today, kinds: [] };
  p.fed.kinds.push(kind);
  if (kind === foodFor(p)) {
    if (!p.fedDays.includes(today)) p.fedDays = [...p.fedDays, today].slice(-14);
    p.starve = 0;
    if (p.stage === 'larva') p.growth += 1;
  } else if (FOODS[kind].boost) {
    p.growth += FOODS[kind].boost;
  }
}

function moodOf(p) {
  if (p.stage === 'pupa') return { text: 'じっと している', weak: false };
  if (isSleeping(p)) return { text: `とうみん ちゅう 💤（${WAKE.month}がつ${WAKE.day}にちに おきるよ）`, weak: false, sleeping: true };
  if (fedToday(p, foodFor(p))) return { text: 'げんき いっぱい 😊', weak: false };
  if (p.starve >= 2) {
    const left = STARVE_DAYS - p.starve;
    return {
      text: left <= 1 ? '⚠️ よわっている！ きょう えさを あげないと しんでしまう！' : `⚠️ よわっている！ あと ${left}にち えさを あげないと しんでしまう`,
      weak: true, danger: true,
    };
  }
  return { text: p.starve === 1 ? 'おなか ぺこぺこ 🍽️' : 'おなかが すいた 🍽️', weak: false };
}

// 3D に わたす かたち
function view3d(p) {
  const sp = SPECIES[p.species];
  let mm = p.size || sp.size[0];
  let sizeRatio = sp.size[1] > sp.size[0] ? (mm - sp.size[0]) / (sp.size[1] - sp.size[0]) : 0.5;
  if (p.stage === 'larva') {
    const done = studyDayList(currentProfile().id).filter((d) => d > p.stageStart).length;
    const soFar = p.growth / Math.max(1, (done + 1) * GROWTH_MAX_PER_DAY);
    mm = sp.size[1] * 0.55 * (0.45 + 0.55 * Math.min(1, (done + 1) / sp.larva)) * (0.75 + 0.5 * Math.min(1, soFar));
    sizeRatio = 0.5;
  } else if (p.stage === 'pupa') {
    mm *= 0.8;
  }
  // ちいさい むしも みえる ように すこし おおきめに かく
  const lengthCm = Math.max(2.2, Math.min(12, (mm / 10) * 1.3));
  const mood = moodOf(p);
  return { id: p.id, species: p.species, stage: p.stage, lengthCm, sizeRatio, weak: mood.weak, sleeping: !!mood.sleeping };
}

// ---------- がめん ----------

function openPets() {
  const profile = currentProfile();
  pets.data = loadPetData(profile.id);
  const events = [...processGrowth(pets.data, studyDayList(profile.id)), ...simulateDays(pets.data)];
  savePetData();
  if (!pets.data.cases.some((c) => c.id === pets.caseId)) pets.caseId = pets.data.cases[0].id;
  pets.selected = null;
  $('pets-who').textContent = profile.name;
  show('pets');
  renderPets();
  mountRoom();
  if (pets.data.welcome) {
    pets.data.welcome = false;
    savePetData();
    notice('ようこそ！ アリを 1ぴき と ゼリーを 3こ プレゼント 🎁<br>まいにち えさを あげてね');
  } else if (events.length) {
    notice(events.join('<br><br>'));
  }
}

function closePets() {
  if (pets.room) pets.room.dispose();
  pets.room = null;
  $('room3d').querySelectorAll('canvas').forEach((c) => c.remove());
  renderHome();
}

async function mountRoom() {
  const box = $('room3d');
  $('room-msg').textContent = 'よみこみちゅう…';
  $('room-msg').style.display = '';
  const onSelect = (id) => {
    pets.selected = id;
    renderPetInfo();
  };
  let reason = '';
  try {
    if (/[?&]flat=1/.test(location.search)) throw new Error('URL の flat=1 で かんたん ひょうじを えらんでいます');
    const mod = await import('./pet3d.js');
    if (!$('pets').classList.contains('active')) return;
    if (pets.room) pets.room.dispose();
    pets.room = mod.createInsectRoom(box, { onSelect });
    $('room-msg').style.display = 'none';
    syncRoom(true);
    return;
  } catch (e) {
    reason = e && e.message ? e.message : String(e);
  }
  if (!$('pets').classList.contains('active')) return;
  // はじめての よみこみで インターネットに つながっていない ときは つないでもらう
  if (!navigator.onLine) {
    $('room-msg').textContent = '3D を よみこめませんでした。インターネットに つないで ひらきなおしてね';
    return;
  }
  // 3D に たいおう していない ブラウザ：かんたん ひょうじで そだてられる ように する
  if (pets.room) pets.room.dispose();
  pets.room = createFlatRoom(box, { onSelect, reason });
  $('room-msg').style.display = 'none';
  syncRoom(true);
}

function currentCase() {
  return pets.data.cases.find((c) => c.id === pets.caseId);
}

const petsIn = (caseId) => pets.data.pets.filter((p) => p.caseId === caseId);

// rebuild：ケース（おきもの）も つくりなおす
function syncRoom(rebuild) {
  if (!pets.room) return;
  const c = currentCase();
  if (rebuild) pets.room.setCase(CASES[c.type].dims, c.decor, CASES[c.type].slots);
  pets.room.setPets(petsIn(pets.caseId).map(view3d));
  pets.room.select(pets.selected);
}

function switchCase(id) {
  pets.caseId = id;
  pets.selected = null;
  renderPets();
  syncRoom(true);
}

function renderPets() {
  $('pets-points').innerHTML = `⭐ <b>${loadWallet(currentProfile().id).points}</b> pt`;
  const tabs = $('case-tabs');
  tabs.innerHTML = '';
  for (const c of pets.data.cases) {
    const def = CASES[c.type];
    const b = document.createElement('button');
    const danger = petsIn(c.id).some((p) => moodOf(p).danger);
    b.className = 'case-tab' + (c.id === pets.caseId ? ' active' : '') + (danger ? ' danger' : '');
    b.textContent = `${danger ? '⚠️ ' : ''}${def.name}（${petsIn(c.id).length}/${def.capacity}）`;
    b.addEventListener('click', () => switchCase(c.id));
    tabs.appendChild(b);
  }
  const inv = pets.data.inv;
  $('inventory').innerHTML = Object.entries(FOODS)
    .map(([k, f]) => `<span class="inv-item" title="${f.name}">${f.icon} ${f.short} <b>${inv[k] || 0}</b></span>`).join('');
  renderPetInfo();
}

function renderPetInfo() {
  const el = $('pet-info');
  const p = pets.data.pets.find((x) => x.id === pets.selected);
  if (!p) {
    const c = currentCase();
    const list = petsIn(pets.caseId);
    const needs = list.filter((x) => foodFor(x) && !fedToday(x, foodFor(x))).length;
    const decor = c.decor.map((d) => `${DECORS[d.type].icon} ${DECORS[d.type].name}`).join('、');
    el.innerHTML = `
      <div class="info-title">${CASES[c.type].name}</div>
      <div class="info-sub">${list.length ? 'むしを タップすると くわしく みられるよ' : 'まだ むしが いないよ。おみせで かおう'}</div>
      <ul class="case-list">${list.map((x) => {
        const sp = SPECIES[x.species];
        const m = moodOf(x);
        return `<li data-id="${x.id}" class="${m.danger ? 'danger' : ''}">${sp.icon} ${sp.name} <small>${m.sleeping ? '💤' : STAGE_NAMES[x.stage]}</small></li>`;
      }).join('')}</ul>
      <div class="info-sub">おきもの：${decor || 'なし'}（${c.decor.length}/${CASES[c.type].slots}）</div>
      <div class="info-need">${needs ? `きょう えさが ほしい むし：${needs}ひき` : list.length ? 'きょうの えさは ばっちり！' : ''}</div>`;
    el.querySelectorAll('li[data-id]').forEach((li) => li.addEventListener('click', () => {
      pets.selected = li.dataset.id;
      if (pets.room) pets.room.select(pets.selected);
      renderPetInfo();
    }));
    return;
  }
  const sp = SPECIES[p.species];
  const mood = moodOf(p);
  let growth = '';
  if (p.stage === 'larva' || p.stage === 'pupa') {
    const done = studyDayList(currentProfile().id).filter((d) => d > p.stageStart).length;
    const need = p.stage === 'larva' ? sp.larva : sp.pupa;
    const next = p.stage === 'larva' ? 'さなぎ' : 'せいちゅう';
    growth += `<div>${next}まで：あと <b>${need - done}</b>にち べんきょう</div>`;
  }
  if (p.stage === 'larva') {
    // これまでの ひかずで どれだけ よく そだてたか（まいにち ぜんぶ あげると ★5）
    const done = studyDayList(currentProfile().id).filter((d) => d > p.stageStart).length;
    const pace = p.growth / ((done + 1) * GROWTH_MAX_PER_DAY);
    const stars = Math.max(p.growth > 0 ? 1 : 0, Math.round(Math.min(1, pace) * 5));
    growth += `<div>そだちぐあい：<span class="stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span></div>`;
  } else {
    growth += `<div>おおきさ：<b>${p.size}</b>mm${sp.size[1] > sp.size[0] ? `（${sp.size[0]}〜${sp.size[1]}mm）` : ''}</div>`;
  }
  if (p.stage === 'adult' && p.adultSince) {
    growth += `<div>せいちゅうに なって ${daysBetween(p.adultSince, todayKey())}にち（じゅみょう やく ${lifeText(sp.life)}）</div>`;
  }
  const specials = p.stage === 'larva'
    ? ['kinshi', 'royal'].map((k) => {
      const f = FOODS[k];
      const given = fedToday(p, k);
      const have = pets.data.inv[k] || 0;
      return `<button class="special-btn" data-kind="${k}" ${given || !have ? 'disabled' : ''}>
        ${f.icon} ${f.name}を あげる <small>${given ? '（きょうは あげた）' : `のこり ${have}`}</small></button>`;
    }).join('')
    : '';
  el.innerHTML = `
    <div class="info-title">${sp.name} <small>${STAGE_NAMES[p.stage]}</small></div>
    <div class="info-mood${mood.danger ? ' danger' : ''}">${mood.text}</div>
    <div class="info-growth">${growth}</div>
    ${specials}
    <button class="small-btn info-back">← ケースの いちらん</button>`;
  el.querySelectorAll('.special-btn').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.kind;
    pets.data.inv[k]--;
    markFed(p, k);
    savePetData();
    toast(`${FOODS[k].name}を あげた！ おおきく なあれ`);
    renderPets();
    syncRoom();
  }));
  el.querySelector('.info-back').addEventListener('click', () => {
    pets.selected = null;
    if (pets.room) pets.room.select(null);
    renderPetInfo();
  });
}

function lifeText(days) {
  if (days >= 365) return `${Math.round(days / 365)}ねん`;
  return `${Math.round(days / 30)}かげつ`;
}

// ケースの むし ぜんぶに まいにちの えさを あげる
function feedCase() {
  const missing = {};
  let fed = 0;
  for (const p of petsIn(pets.caseId)) {
    const kind = foodFor(p);
    if (!kind || fedToday(p, kind)) continue;
    if ((pets.data.inv[kind] || 0) > 0) {
      pets.data.inv[kind]--;
      markFed(p, kind);
      fed++;
    } else {
      missing[kind] = (missing[kind] || 0) + 1;
    }
  }
  savePetData();
  const lacks = Object.entries(missing).map(([k, n]) => `${FOODS[k].name} ${n}こ`);
  if (lacks.length) toast(`${fed ? `${fed}ひきに あげたよ。` : ''}${lacks.join('、')} が たりない！ おみせで かおう`);
  else toast(fed ? `${fed}ひきに えさを あげたよ 😋` : 'きょうの えさは もう あげたよ');
  renderPets();
  syncRoom();
}

function toast(html) {
  const t = $('toast');
  t.innerHTML = html;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
}

// だいじな おしらせ（そだった・しんでしまった）は とじるまで だす
function notice(html) {
  $('notice-text').innerHTML = html;
  $('notice').classList.remove('hidden');
}

// ---------- おみせ ----------

function openShop(tab) {
  if (tab) pets.shopTab = tab;
  const points = loadWallet(currentProfile().id).points;
  $('shop-points').innerHTML = `⭐ <b>${points}</b> pt`;
  document.querySelectorAll('.shop-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === pets.shopTab));
  const maxCase = Math.max(...pets.data.cases.map((c) => CASES[c.type].size));
  const rows = [];
  if (pets.shopTab === 'bug') {
    for (const [k, sp] of Object.entries(SPECIES)) {
      const locked = sp.caseSize > maxCase;
      const caseName = Object.values(CASES).find((c) => c.size === sp.caseSize).name;
      rows.push(shopRow({
        icon: sp.icon, name: `${sp.name}${sp.larva ? '（ようちゅう）' : ''}`, price: sp.price, points,
        desc: locked ? `🔒 ${caseName}が ひつよう`
          : sp.larva ? `${sp.larva + sp.pupa}にち べんきょうすると せいちゅうに。${sp.size[0]}〜${sp.size[1]}mm` : 'すぐ ケースで あそべる',
        locked, action: `bug:${k}`,
      }));
    }
  } else if (pets.shopTab === 'case') {
    for (const [k, c] of Object.entries(CASES)) {
      if (!c.price) continue;
      const names = Object.values(SPECIES).filter((s) => s.caseSize === c.size).map((s) => s.name).join('・');
      rows.push(shopRow({ icon: '🏠', name: c.name, price: c.price, points, desc: `${c.capacity}ひき まで。${names} が かえる`, action: `case:${k}` }));
    }
  } else if (pets.shopTab === 'decor') {
    const c = currentCase();
    const full = c.decor.length >= CASES[c.type].slots;
    for (const [k, d] of Object.entries(DECORS)) {
      rows.push(shopRow({
        icon: d.icon, name: d.name, price: d.price, points, locked: full,
        desc: full ? `🔒 ${CASES[c.type].name}には もう おけない` : `${d.desc}（${CASES[c.type].name}に おくよ）`,
        action: `decor:${k}`,
      }));
    }
  } else {
    for (const [k, f] of Object.entries(FOODS)) {
      rows.push(shopRow({ icon: f.icon, name: `${f.name} ×1`, price: f.price, points, desc: f.for, action: `food:${k}:1` }));
      rows.push(shopRow({ icon: f.icon, name: `${f.name} ×5`, price: f.price * 5, points, desc: `もっている かず：${pets.data.inv[k] || 0}`, action: `food:${k}:5` }));
    }
  }
  $('shop-list').innerHTML = rows.join('');
  $('shop-list').querySelectorAll('button[data-action]').forEach((b) =>
    b.addEventListener('click', () => buy(b.dataset.action)));
  $('shop').classList.remove('hidden');
}

function shopRow({ icon, name, price, points, desc, locked, action }) {
  const short = price > points;
  return `<div class="shop-row${locked ? ' locked' : ''}">
    <span class="shop-icon">${icon}</span>
    <span class="shop-name">${name}<small>${desc}</small></span>
    <button class="shop-buy" data-action="${action}" ${locked || short ? 'disabled' : ''}>
      ${price}pt${short && !locked ? `<small>あと ${price - points}</small>` : ''}</button>
  </div>`;
}

function buy(action) {
  const [kind, key, count] = action.split(':');
  if (kind === 'food') {
    const n = Number(count);
    if (!spendPoints(FOODS[key].price * n, `food:${key}`)) return;
    pets.data.inv[key] = (pets.data.inv[key] || 0) + n;
    savePetData();
    openShop();
    renderPets();
    return;
  }
  if (kind === 'case') {
    const c = CASES[key];
    confirmDialog(`${c.name}を ${c.price}pt で かう？`, () => {
      if (!spendPoints(c.price, `case:${key}`)) return;
      const id = `c${++pets.data.seq}`;
      pets.data.cases.push({ id, type: key, decor: [] });
      savePetData();
      closeShop();
      switchCase(id);
      toast(`${c.name}が とどいた！`);
    });
    return;
  }
  if (kind === 'decor') {
    const d = DECORS[key];
    const c = currentCase();
    confirmDialog(`${d.name}を ${d.price}pt で かう？`, () => {
      const used = new Set(c.decor.map((x) => x.slot));
      const slot = [...Array(CASES[c.type].slots).keys()].find((i) => !used.has(i));
      if (slot === undefined || !spendPoints(d.price, `decor:${key}`)) return;
      c.decor.push({ type: key, slot });
      savePetData();
      closeShop();
      renderPets();
      syncRoom(true);
      toast(`${d.name}を おいたよ！ むしが あそびに くるかな`);
    });
    return;
  }
  const sp = SPECIES[key];
  // いまの ケースに はいれば そこ、だめなら はいれる ケースを さがす
  const fits = (c) => CASES[c.type].size >= sp.caseSize && petsIn(c.id).length < CASES[c.type].capacity;
  const target = fits(currentCase()) ? currentCase() : pets.data.cases.find(fits);
  if (!target) {
    toast('はいれる ケースが ないよ。ケースを かおう');
    return;
  }
  confirmDialog(`${sp.name}${sp.larva ? 'の ようちゅう' : ''}を ${sp.price}pt で かう？`, () => {
    if (!spendPoints(sp.price, `bug:${key}`)) return;
    const today = todayKey();
    const id = `pet${++pets.data.seq}`;
    pets.data.pets.push(newPet(id, key, target.id, today));
    noteOwned(pets.data, key, today);
    if (!sp.larva) noteAdult(pets.data, pets.data.pets[pets.data.pets.length - 1], false);
    savePetData();
    closeShop();
    pets.caseId = target.id;
    pets.selected = id;
    renderPets();
    syncRoom(true);
    toast(`${sp.name}が きた！ ${CASES[target.type].name}に いるよ`);
  });
}

function closeShop() {
  $('shop').classList.add('hidden');
}

function confirmDialog(text, onYes) {
  $('confirm-text').textContent = text;
  $('confirm').classList.remove('hidden');
  $('confirm-yes').onclick = () => {
    $('confirm').classList.add('hidden');
    onYes();
  };
  $('confirm-no').onclick = () => $('confirm').classList.add('hidden');
}

// ---------- ずかん ----------

function openZukan() {
  const z = pets.data.zukan;
  const grid = $('zukan-grid');
  grid.innerHTML = '';
  for (const [k, sp] of Object.entries(SPECIES)) {
    const rec = z[k];
    const b = document.createElement('button');
    b.className = 'zukan-card' + (rec ? '' : ' unknown');
    b.innerHTML = rec
      ? `<span class="z-icon">${sp.icon}</span><span class="z-name">${sp.name}</span>
         <span class="z-rec">${rec.maxSize ? `さいだい ${rec.maxSize}mm` : 'まだ ようちゅう'}</span>`
      : '<span class="z-icon">❔</span><span class="z-name">？？？</span><span class="z-rec">まだ かったことが ない</span>';
    b.addEventListener('click', () => showZukanDetail(k));
    grid.appendChild(b);
  }
  const found = Object.keys(z).length;
  $('zukan-count').textContent = `${found} / ${Object.keys(SPECIES).length} しゅるい`;
  showZukanDetail(null);
  $('zukan').classList.remove('hidden');
}

function showZukanDetail(k) {
  const el = $('zukan-detail');
  if (!k) {
    const graves = pets.data.graves.slice().reverse();
    el.innerHTML = `<div class="info-title">🌸 おもいで</div>
      ${graves.length ? `<ul class="graves">${graves.map((g) => {
        const sp = SPECIES[g.species];
        return `<li>${sp.icon} ${sp.name}${g.size && g.stage === 'adult' ? ` ${g.size}mm` : ''}
          <small>${g.date.slice(5).replace('-', '/')}・${g.cause === 'old' ? 'じゅみょう' : 'えさが なくて'}</small></li>`;
      }).join('')}</ul>` : '<div class="info-sub">しゅるいを タップすると せつめいが みられるよ</div>'}`;
    return;
  }
  const sp = SPECIES[k];
  const rec = pets.data.zukan[k];
  if (!rec) {
    el.innerHTML = `<div class="info-title">？？？</div><div class="info-sub">おみせで かうと わかるよ。${sp.price}pt</div>`;
    return;
  }
  el.innerHTML = `
    <div class="info-title">${sp.icon} ${sp.name}</div>
    <div class="z-stats">
      <span>さいだい <b>${rec.maxSize || '—'}</b>mm</span>
      <span>かった かず <b>${rec.count}</b></span>
      ${sp.larva ? `<span>せいちゅうまで そだてた <b>${rec.raised}</b></span>` : ''}
    </div>
    <p>${sp.text}</p>
    <dl class="z-facts">
      <dt>おおきさ</dt><dd>${sp.size[0] === sp.size[1] ? `やく ${sp.size[0]}mm` : `${sp.size[0]}〜${sp.size[1]}mm`}</dd>
      <dt>すんでいる ところ</dt><dd>${sp.lives}</dd>
      <dt>たべもの</dt><dd>${sp.eats}</dd>
      <dt>まめちしき</dt><dd>${sp.trivia}</dd>
      <dt>この アプリでは</dt><dd>せいちゅうの じゅみょう やく ${lifeText(sp.life)}${sp.kuwagata ? `。${SLEEP.month}がつ${SLEEP.day}にち〜${WAKE.month}がつ${WAKE.day}にちは とうみん` : ''}</dd>
    </dl>
    <button class="small-btn" id="zukan-back">← おもいで</button>`;
  $('zukan-back').addEventListener('click', () => showZukanDetail(null));
}

$('pets-back').addEventListener('click', closePets);
$('feed-btn').addEventListener('click', feedCase);
$('shop-btn').addEventListener('click', () => openShop());
$('zukan-btn').addEventListener('click', openZukan);
$('zukan-close').addEventListener('click', () => $('zukan').classList.add('hidden'));
$('shop-close').addEventListener('click', closeShop);
$('notice-ok').addEventListener('click', () => $('notice').classList.add('hidden'));
document.querySelectorAll('.shop-tab').forEach((b) => b.addEventListener('click', () => openShop(b.dataset.tab)));
