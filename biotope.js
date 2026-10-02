// ビオトープ：べんきょうで ためた ポイントで、カエル・カメ・オオサンショウウオを たまごから そだてる。
//   ・ぜんぶ たまごから。「べんきょうした ひ」の かずで つぎの すがたに かわる（たまご → … → おとな）
//   ・えさ：すがたに よって ちがう（オタマジャクシは ゆでた ほうれんそう、カエルは コオロギ など）。
//           たまごの あいだは いらない。5にち もらえないと しんでしまう
//   ・ばしょ：1つの 大きな ビオトープを ポイントで すこしずつ ひろげる
//     しっち（はじめから・カエル）→ 大きな いけ（カメ）・もりと もくどう → わき水と すいしゃ（オオサンショウウオ）
//   ・え は 3D（bio3d.js、Blender の models/bio_*.glb）。つかえない ときは SVG の 2D
//
// ほぞん（localStorage: mathapp.v1.bio.<こどもの id>）
//   areas   ['wet', 'pond', ...]（ひろげた ところ）
//   animals [{ id, species, since, stage, stageStart, fedDays, starve, fed, seed }]
//   inv     { kusa, mushi, kame, sakana }
//   simDay・zukan { しゅるい: { count, raised, first } }・graves・welcome

const bioKey = (id) => `mathapp.v1.bio.${id}`;
const BIO_STARVE = 5;

// ひろげる ところ：cap（ふえる かず）、allow（すめる いきもの）、need（さきに ひろげる ところ）
const BIO_AREAS = {
  wet: { name: 'しっち', icon: '🌾', price: 0, cap: 6, allow: ['kaeru'], desc: 'あさい みずたまりと ヨシ・アヤメ。カエルが そだつ' },
  pond: { name: '大きな いけ', icon: '🪷', price: 800, cap: 6, allow: ['kame'], desc: 'スイレンと まるた、すなはまの ある いけ。カメが すめる' },
  forest: { name: 'もりと もくどう', icon: '🌳', price: 600, cap: 3, allow: [], desc: 'おくに 大きな き、しっちに もくどう。いきものが ふえる' },
  stream: { name: 'わき水と すいしゃ', icon: '🏞️', price: 2500, cap: 3, allow: ['sansho'], need: 'pond', desc: 'つめたい わき水の せせらぎと すいしゃ、いわの す。オオサンショウウオの ばしょ' },
};
const bioCap = (data = bio.data) => data.areas.reduce((n, k) => n + BIO_AREAS[k].cap, 0);
const needArea = (species) => Object.keys(BIO_AREAS).find((k) => BIO_AREAS[k].allow.includes(species));

// えさ
const BIO_FOODS = {
  kusa: { name: 'ゆでた ほうれんそう', short: 'ほうれんそう', icon: '🥬', price: 2, for: 'オタマジャクシの えさ' },
  mushi: { name: 'コオロギ', short: 'コオロギ', icon: '🦗', price: 3, for: 'カエルの えさ' },
  kame: { name: 'カメの えさ', short: 'カメのえさ', icon: '🟤', price: 3, for: 'カメの えさ' },
  sakana: { name: 'こざかな', short: 'こざかな', icon: '🐟', price: 8, for: 'オオサンショウウオの えさ' },
};

// いきもの：stages（days＝つぎに なるまでの べんきょうした ひ、where＝いる ところ、food＝えさ、mm＝おおきさ、s＝えの おおきさ）
const BIO = {
  kaeru: {
    name: 'アマガエル', icon: '🐸', price: 60, life: 1800,
    lives: 'たんぼ・いけ・にわの きの うえ', eats: 'オタマジャクシは みずくさや かれは、カエルは ちいさな むし',
    text: 'みどりいろの ちいさな カエル。ゆびの さきが まるく すいつくので、かべや はっぱにも のぼれます。',
    trivia: 'あめが ふりそうに なると「ゲッゲッ」と よく なくので「あまガエル」と よばれます。からだの いろを まわりに あわせて かえられます。',
    stages: [
      { key: 'egg', name: 'たまご', days: 2, where: 'eggW', food: null, mm: 2, s: 1 },
      { key: 'tadpole', name: 'オタマジャクシ', days: 4, where: 'water', food: 'kusa', mm: 15, s: 0.8 },
      { key: 'legs', name: 'あしが はえた オタマジャクシ', days: 3, where: 'water', food: 'kusa', mm: 30, s: 1.05 },
      { key: 'froglet', name: 'こガエル', days: 3, where: 'land', food: 'mushi', mm: 12, s: 0.65 },
      { key: 'adult', name: 'カエル', where: 'land', food: 'mushi', mm: 35, s: 1 },
    ],
  },
  kame: {
    name: 'クサガメ', icon: '🐢', price: 400, life: 10950,
    lives: 'いけ・かわ・たんぼの みずの ある ところ', eats: 'みずくさ、むし、ちいさな さかな、エビ',
    text: 'にほんの いけや かわで よく みる カメ。あかちゃんは「ゼニガメ」と よばれ、こうらに 3ぼんの すじが あります。',
    trivia: 'ひなたぼっこで からだを あたためます。たまごは りくの つちの なかに うみ、すなの あたたかさで かえります。',
    stages: [
      { key: 'egg', name: 'たまご', days: 4, where: 'eggL', food: null, mm: 35, s: 1 },
      { key: 'baby', name: 'ゼニガメ（あかちゃん）', days: 6, where: 'amphi', food: 'kame', mm: 30, s: 0.6 },
      { key: 'young', name: 'こどもの カメ', days: 8, where: 'amphi', food: 'kame', mm: 90, s: 0.85 },
      { key: 'adult', name: 'おとなの カメ', where: 'amphi', food: 'kame', mm: 200, s: 1.15 },
    ],
  },
  sansho: {
    name: 'オオサンショウウオ', icon: '🦎', price: 3000, life: 36500,
    lives: 'にほんの やまの きれいな かわ（ちゅうごく ちほう・きんき ちほう など）', eats: 'さかな、サワガニ、カエル',
    text: 'せかいで いちばん おおきい りょうせいるい。おとなは 1m を こえる ことも あります。「いきている かせき」と よばれます。',
    trivia: 'くにの「とくべつ てんねん きねんぶつ」で、ほんとうは かっては いけません。この アプリでは ほごセンターで たまごから そだてる おてつだいを します。',
    stages: [
      { key: 'egg', name: 'たまご', days: 5, where: 'eggW', food: null, mm: 7, s: 1 },
      { key: 'larva', name: 'ようせい（えらが ある）', days: 8, where: 'bottom', food: 'sakana', mm: 30, s: 0.55 },
      { key: 'child', name: 'こども', days: 12, where: 'bottom', food: 'sakana', mm: 200, s: 0.85 },
      { key: 'adult', name: 'おとな', where: 'bottom', food: 'sakana', mm: 700, s: 1.25 },
    ],
  },
};

const bio = { data: null, selected: null, scene: null, shopTab: 'egg' };

// ---------- データ ----------

function loadBioData(profileId) {
  const s = readJSON(bioKey(profileId), null);
  if (s) {
    // まえの かたち（たらい・いけ・せせらぎ の 3つの ばしょ）から
    if (!s.areas) {
      const set = new Set(['wet']);
      for (const p of s.places || []) {
        if (p.type === 'ike') set.add('pond');
        if (p.type === 'sawa') { set.add('pond'); set.add('stream'); }
      }
      s.areas = [...set];
      delete s.places;
    }
    return s;
  }
  const today = todayKey();
  const data = {
    seq: 2, areas: ['wet'],
    animals: [newAnimal('a1', 'kaeru', today), newAnimal('a2', 'kaeru', today)],
    inv: { kusa: 6, mushi: 4, kame: 0, sakana: 0 },
    simDay: dayBefore(today), zukan: {}, graves: [], welcome: true,
  };
  for (const a of data.animals) noteBio(data, a.species, today);
  return data;
}

function newAnimal(id, species, today) {
  return { id, species, since: today, stage: 0, stageStart: today, fedDays: [], starve: 0, fed: null, seed: Math.floor(Math.random() * 1e9) };
}

function saveBioData() {
  writeJSON(bioKey(currentProfile().id), bio.data);
}

function noteBio(data, species, day) {
  const z = data.zukan[species] || (data.zukan[species] = { count: 0, raised: 0, first: day });
  z.count++;
}


const stageOf = (a) => BIO[a.species].stages[a.stage];
const bioFedToday = (a) => a.fed === todayKey();

// べんきょうした ひ の かずで つぎの すがたへ
function growBio(data, days) {
  const events = [];
  for (const a of data.animals) {
    const sp = BIO[a.species];
    for (;;) {
      const st = sp.stages[a.stage];
      if (!st.days) break;
      const after = days.filter((d) => d > a.stageStart);
      if (after.length < st.days) break;
      a.stage++;
      a.stageStart = after[st.days - 1];
      a.starve = 0;
      const next = sp.stages[a.stage];
      events.push(`${sp.icon} ${sp.name}の ${st.name}が「${next.name}」に なった！`);
      if (!next.days) {
        const z = data.zukan[a.species];
        if (z) z.raised++;
      }
    }
  }
  return events;
}

function bioDie(data, a, cause, day) {
  const sp = BIO[a.species];
  data.animals = data.animals.filter((x) => x.id !== a.id);
  data.graves.push({ species: a.species, stage: a.stage, cause, date: day, days: daysBetween(a.since, day) });
  if (cause === 'old') return `${sp.name}は じゅみょうを まっとうしました。ありがとう 🌸`;
  return `${sp.name}（${stageOf(a).name}）は えさを ${BIO_STARVE}にち もらえなくて、しんでしまいました…`;
}

// きのう までの 1にち ずつ：えさ・じゅみょう
function simulateBioDays(data) {
  const today = todayKey();
  const events = [];
  for (let d = nextDay(data.simDay); d < today; d = nextDay(d)) {
    for (const a of [...data.animals]) {
      if (a.since > d) continue;
      if (daysBetween(a.since, d) >= BIO[a.species].life) {
        events.push(bioDie(data, a, 'old', d));
        continue;
      }
      if (!stageOf(a).food || a.stageStart > d) continue;   // たまごの あいだは たべない
      if (a.fedDays.includes(d)) a.starve = 0;
      else a.starve++;
      if (a.starve >= BIO_STARVE) events.push(bioDie(data, a, 'hunger', d));
    }
  }
  data.simDay = dayBefore(today);
  return events;
}

function bioMood(a) {
  const st = stageOf(a);
  if (!st.food) return { text: st.key === 'egg' ? 'もうすぐ かえるかな… 🥚' : 'しずかに ねている', weak: false };
  if (bioFedToday(a)) return { text: 'げんき いっぱい 😊', weak: false };
  if (a.starve >= 2) {
    const left = BIO_STARVE - a.starve;
    return { text: left <= 1 ? '⚠️ よわっている！ きょう えさを あげないと しんでしまう！' : `⚠️ よわっている！ あと ${left}にち えさを あげないと しんでしまう`, weak: true, danger: true };
  }
  return { text: a.starve === 1 ? 'おなか ぺこぺこ 🍽️' : 'おなかが すいた 🍽️', weak: false };
}

const bioSizeText = (mm) => (mm >= 100 ? `${Math.round(mm / 10)}cm` : `${mm}mm`);

// ---------- がめん ----------

function openBio() {
  const profile = currentProfile();
  bio.data = loadBioData(profile.id);
  const events = [...growBio(bio.data, studyDayList(profile.id)), ...simulateBioDays(bio.data)];
  saveBioData();
  bio.selected = null;
  $('bio-who').textContent = profile.name;
  show('bio');
  renderBio();
  mountBioScene();
  if (bio.data.welcome) {
    bio.data.welcome = false;
    saveBioData();
    notice('ようこそ ビオトープへ！ しっちと アマガエルの たまご 2つ、ほうれんそう 6こ、コオロギ 4こ を プレゼント 🎁<br>べんきょうした ひが ふえると、たまごが オタマジャクシ → カエルへと そだつよ。<br>ポイントで いけや せせらぎを ひろげると、カメや オオサンショウウオも そだてられるよ');
  } else if (events.length) {
    notice(events.join('<br><br>'));
  }
}

function closeBio() {
  setExpanded('bio', false);
  if (bio.scene) bio.scene.dispose();
  bio.scene = null;
  $('bio-view').querySelectorAll('canvas, svg').forEach((c) => c.remove());
  renderHome();
}

const sceneAnimals = () => bio.data.animals.map((a) => ({ id: a.id, species: a.species, stage: a.stage, key: stageOf(a).key }));

// 3D（bio3d.js）。つかえない ときは SVG の 2D
async function mountBioScene() {
  if (bio.scene) bio.scene.dispose();
  bio.scene = null;
  const box = $('bio-view');
  $('bio-msg').textContent = 'よみこみちゅう…';
  $('bio-msg').style.display = '';
  const onSelect = (id) => {
    bio.selected = id;
    renderBioInfo();
  };
  try {
    if (/[?&]flat=1/.test(location.search)) throw new Error('flat');
    const mod = await import('./bio3d.js');
    if (!$('bio').classList.contains('active')) return;
    const sc = mod.createBiotope(box, { onSelect });
    bio.scene = sc;
    sc.setAreas(bio.data.areas);
    sc.setAnimals(sceneAnimals());
    await Promise.race([sc.ready, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 15000))]);
    $('bio-msg').style.display = 'none';
    return;
  } catch (e) {
    if (bio.scene) bio.scene.dispose();
    bio.scene = null;
  }
  if (!$('bio').classList.contains('active')) return;
  $('bio-msg').style.display = 'none';
  const flat = createBioScene(box, bio.data.areas.includes('stream') ? 'sawa' : bio.data.areas.includes('pond') ? 'ike' : 'tarai', onSelect);
  bio.scene = { ...flat, flat: true, setAreas() {}, overview() {} };
  bio.scene.setAnimals(bio.data.animals);
}

function syncBioScene() {
  if (!bio.scene) return;
  bio.scene.setAreas(bio.data.areas);
  bio.scene.setAnimals(bio.scene.flat ? bio.data.animals : sceneAnimals());
}

function renderBio() {
  $('bio-points').innerHTML = `⭐ <b>${pointsText(loadWallet(currentProfile().id).points)}</b> pt`;
  // ひろげた ところ（まだの ところは 🔒）
  $('place-tabs').innerHTML = Object.entries(BIO_AREAS).map(([k, A]) =>
    `<span class="case-tab area-chip${bio.data.areas.includes(k) ? ' active' : ' locked'}">${bio.data.areas.includes(k) ? A.icon : '🔒'} ${A.name}</span>`).join('');
  $('binventory').innerHTML = Object.entries(BIO_FOODS)
    .map(([k, f]) => `<span class="inv-item" title="${f.name}">${f.icon} ${f.short} <b>${bio.data.inv[k] || 0}</b></span>`).join('');
  renderBioInfo();
}

function renderBioInfo() {
  const el = $('bio-info');
  const a = bio.data.animals.find((x) => x.id === bio.selected);
  if (!a) {
    const list = bio.data.animals;
    const hungry = list.filter((x) => stageOf(x).food && !bioFedToday(x)).length;
    const next = Object.entries(BIO_AREAS).find(([k]) => !bio.data.areas.includes(k));
    el.innerHTML = `
      <div class="info-title">🐸 ビオトープ <small>${list.length}/${bioCap()}ひき</small></div>
      <div class="info-sub">${bio.data.areas.map((k) => BIO_AREAS[k].name).join('・')}</div>
      ${next ? `<div class="info-need">つぎは おみせの「ひろげる」で ${next[1].icon} ${next[1].name}（${next[1].price}pt）</div>` : ''}
      <div class="info-sub">${list.length ? 'いきものを タップすると くわしく みられるよ' : 'まだ だれも いないよ。おみせで たまごを かおう'}</div>
      <ul class="case-list">${list.map((x) => {
        const m = bioMood(x);
        return `<li data-id="${x.id}" class="${m.danger ? 'danger' : ''}">${BIO[x.species].icon} ${BIO[x.species].name} <small>${stageOf(x).name}</small></li>`;
      }).join('')}</ul>
      <div class="info-need">${hungry ? `きょう えさが ほしい いきもの：${hungry}ひき` : list.length ? 'きょうの えさは ばっちり！' : ''}</div>`;
    el.querySelectorAll('li[data-id]').forEach((li) => li.addEventListener('click', () => {
      bio.selected = li.dataset.id;
      if (bio.scene) bio.scene.select(bio.selected);
      renderBioInfo();
    }));
    return;
  }
  const sp = BIO[a.species];
  const st = stageOf(a);
  const mood = bioMood(a);
  const done = studyDayList(currentProfile().id).filter((d) => d > a.stageStart).length;
  const next = sp.stages[a.stage + 1];
  const chain = sp.stages.map((s, i) => `<span class="bio-step ${i < a.stage ? 'done' : i === a.stage ? 'now' : ''}">${s.name}</span>`).join('<i>→</i>');
  el.innerHTML = `
    <div class="info-title">${sp.icon} ${sp.name}</div>
    <div class="info-mood${mood.danger ? ' danger' : ''}">${mood.text}</div>
    <div class="bio-chain">${chain}</div>
    <div class="info-growth">
      <div>いまの すがた：<b>${st.name}</b>（${bioSizeText(st.mm)}くらい）</div>
      <div>${next ? `あと <b>${Math.max(0, st.days - done)}</b>にち べんきょうすると「${next.name}」に！` : 'もう りっぱな おとな！'}</div>
      <div>${st.food ? `えさ：${BIO_FOODS[st.food].icon} ${BIO_FOODS[st.food].name}` : 'えさ：まだ いらない'}</div>
      <div>そだてはじめて ${daysBetween(a.since, todayKey())}にち</div>
    </div>
    <button class="small-btn info-back">← いちらん</button>`;
  el.querySelector('.info-back').addEventListener('click', () => {
    bio.selected = null;
    if (bio.scene) { bio.scene.select(null); bio.scene.overview(); }
    renderBioInfo();
  });
}

function feedBio() {
  const missing = {};
  let fed = 0, eggs = 0;
  const today = todayKey();
  for (const a of bio.data.animals) {
    const kind = stageOf(a).food;
    if (!kind) { eggs++; continue; }
    if (bioFedToday(a)) continue;
    if ((bio.data.inv[kind] || 0) > 0) {
      bio.data.inv[kind]--;
      a.fed = today;
      if (!a.fedDays.includes(today)) a.fedDays = [...a.fedDays, today].slice(-14);
      a.starve = 0;
      fed++;
    } else {
      missing[kind] = (missing[kind] || 0) + 1;
    }
  }
  saveBioData();
  if (fed && bio.scene) bio.scene.feed();
  const lacks = Object.entries(missing).map(([k, n]) => `${BIO_FOODS[k].name} ${n}こ`);
  if (lacks.length) toast(`${fed ? `${fed}ひきに あげたよ。` : ''}${lacks.join('、')} が たりない！ おみせで かおう`);
  else if (!bio.data.animals.length) toast('まだ だれも いないよ');
  else if (!fed && eggs && eggs === bio.data.animals.length) toast('たまごは まだ えさを たべないよ 🥚');
  else toast(fed ? `${fed}ひきに えさを あげたよ 😋` : 'きょうの えさは もう あげたよ');
  renderBio();
}

// ---------- おみせ ----------

function openBioShop(tab) {
  if (tab) bio.shopTab = tab;
  const points = usablePoints(currentProfile().id);
  $('bshop-points').innerHTML = `⭐ <b>${pointsText(points)}</b> pt`;
  document.querySelectorAll('.bshop-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === bio.shopTab));
  const rows = [];
  if (bio.shopTab === 'egg') {
    const full = bio.data.animals.length >= bioCap();
    for (const [k, sp] of Object.entries(BIO)) {
      const area = needArea(k);
      const ok = bio.data.areas.includes(area);
      rows.push(shopRow({
        icon: sp.icon, name: `${sp.name}の たまご`, price: sp.price, points, locked: !ok || full,
        desc: !ok ? `🔒「${BIO_AREAS[area].name}」を ひろげると かえる` : full ? `🔒 いっぱい（${bioCap()}ひき）。ばしょを ひろげよう` : `${sp.stages.map((st) => st.name).join(' → ')}`,
        action: `egg:${k}`,
      }));
    }
  } else if (bio.shopTab === 'place') {
    for (const [k, A] of Object.entries(BIO_AREAS)) {
      if (!A.price) continue;
      const has = bio.data.areas.includes(k);
      const needs = A.need && !bio.data.areas.includes(A.need);
      rows.push(shopRow({
        icon: A.icon, name: A.name, price: A.price, points, locked: has || needs,
        desc: has ? '✅ もう ひろげた' : needs ? `🔒 さきに「${BIO_AREAS[A.need].name}」を ひろげよう` : `${A.desc}（+${A.cap}ひき）`,
        action: `place:${k}`,
      }));
    }
  } else {
    for (const [k, f] of Object.entries(BIO_FOODS)) {
      rows.push(shopRow({ icon: f.icon, name: `${f.name} ×1`, price: f.price, points, desc: f.for, action: `food:${k}:1` }));
      rows.push(shopRow({ icon: f.icon, name: `${f.name} ×5`, price: f.price * 5, points, desc: `もっている かず：${bio.data.inv[k] || 0}`, action: `food:${k}:5` }));
    }
  }
  $('bshop-list').innerHTML = rows.join('');
  $('bshop-list').querySelectorAll('button[data-action]').forEach((b) => b.addEventListener('click', () => buyBio(b.dataset.action)));
  $('bshop').classList.remove('hidden');
}

function buyBio(action) {
  const [kind, key, count] = action.split(':');
  if (kind === 'food') {
    const n = Number(count);
    if (!spendPoints(BIO_FOODS[key].price * n, `biofood:${key}`)) return;
    bio.data.inv[key] = (bio.data.inv[key] || 0) + n;
    saveBioData();
    openBioShop();
    renderBio();
    return;
  }
  if (kind === 'place') {
    const A = BIO_AREAS[key];
    confirmDialog(`${A.name}を ${A.price}pt で ひろげる？`, () => {
      if (!spendPoints(A.price, `bioarea:${key}`)) return;
      bio.data.areas.push(key);
      saveBioData();
      $('bshop').classList.add('hidden');
      renderBio();
      syncBioScene();
      toast(`${A.icon} ${A.name}が できた！`);
    }, 'ひろげる！');
    return;
  }
  const sp = BIO[key];
  if (!bio.data.areas.includes(needArea(key)) || bio.data.animals.length >= bioCap()) {
    toast('いまは いれられないよ。ばしょを ひろげよう');
    return;
  }
  confirmDialog(`${sp.name}の たまごを ${sp.price}pt で かう？`, () => {
    if (!spendPoints(sp.price, `bio:${key}`)) return;
    const today = todayKey();
    const id = `a${++bio.data.seq}`;
    bio.data.animals.push(newAnimal(id, key, today));
    noteBio(bio.data, key, today);
    saveBioData();
    $('bshop').classList.add('hidden');
    bio.selected = id;
    renderBio();
    syncBioScene();
    if (bio.scene) bio.scene.select(id);
    toast(`${sp.name}の たまごが きた！`);
  });
}

// ---------- ずかん ----------

function openBioZukan() {
  const z = bio.data.zukan;
  const grid = $('bzukan-grid');
  grid.innerHTML = '';
  for (const [k, sp] of Object.entries(BIO)) {
    const rec = z[k];
    const b = document.createElement('button');
    b.className = 'zukan-card' + (rec ? '' : ' unknown');
    b.innerHTML = rec
      ? `<span class="z-icon">${sp.icon}</span><span class="z-name">${sp.name}</span><span class="z-rec">おとなまで ${rec.raised}ひき</span>`
      : '<span class="z-icon">❔</span><span class="z-name">？？？</span><span class="z-rec">まだ そだてたことが ない</span>';
    b.addEventListener('click', () => showBioDetail(k));
    grid.appendChild(b);
  }
  $('bzukan-count').textContent = `${Object.keys(z).length} / ${Object.keys(BIO).length} しゅるい`;
  showBioDetail(null);
  $('bzukan').classList.remove('hidden');
}

function showBioDetail(k) {
  const el = $('bzukan-detail');
  if (!k) {
    const graves = bio.data.graves.slice().reverse();
    el.innerHTML = `<div class="info-title">🌸 おもいで</div>
      ${graves.length ? `<ul class="graves">${graves.map((g) => `<li>${BIO[g.species].icon} ${BIO[g.species].name}（${BIO[g.species].stages[g.stage].name}）
        <small>${g.date.slice(5).replace('-', '/')}・${g.cause === 'old' ? 'じゅみょう' : 'えさが なくて'}</small></li>`).join('')}</ul>`
        : '<div class="info-sub">しゅるいを タップすると せつめいが みられるよ</div>'}`;
    return;
  }
  const sp = BIO[k];
  const rec = bio.data.zukan[k];
  if (!rec) {
    el.innerHTML = `<div class="info-title">？？？</div><div class="info-sub">おみせで たまごを かうと わかるよ。${sp.price}pt</div>`;
    return;
  }
  const pics = sp.stages.map((s) => `<div class="bio-pic"><svg viewBox="-60 -40 120 80">${bioDraw(k, s.key, 0, 0)}</svg><span>${s.name}</span></div>`).join('');
  const P = BIO_AREAS[needArea(k)];
  el.innerHTML = `
    <div class="info-title">${sp.icon} ${sp.name}</div>
    <div class="bio-pics">${pics}</div>
    <div class="z-stats"><span>そだてた かず <b>${rec.count}</b></span><span>おとなまで <b>${rec.raised}</b></span></div>
    <p>${sp.text}</p>
    <dl class="z-facts">
      <dt>おおきさ</dt><dd>おとなで ${bioSizeText(sp.stages[sp.stages.length - 1].mm)} くらい</dd>
      <dt>すんでいる ところ</dt><dd>${sp.lives}</dd>
      <dt>たべもの</dt><dd>${sp.eats}</dd>
      <dt>まめちしき</dt><dd>${sp.trivia}</dd>
      <dt>この アプリでは</dt><dd>「${P.name}」で そだつ。おとなまで べんきょうした ひ ${sp.stages.reduce((n, s) => n + (s.days || 0), 0)}にち</dd>
    </dl>
    <button class="small-btn" id="bzukan-back">← おもいで</button>`;
  $('bzukan-back').addEventListener('click', () => showBioDetail(null));
}

// ---------- え（SVG） ----------
// いきものの え：まんなか（0,0）、みぎむき。t は うごきの じかん（しっぽ・あし）
function bioDraw(species, key, t = 0, sel = 0) {
  const w = Math.sin(t * 9) * 0.5;
  if (species === 'kaeru') {
    if (key === 'egg') {
      let s = '<ellipse rx="26" ry="16" fill="#dff1e8" fill-opacity=".75" stroke="#b8d9c8"/>';
      for (const [x, y] of [[-14, -5], [-4, -8], [7, -6], [16, -2], [-10, 5], [1, 3], [12, 7], [-18, 3], [4, 10]]) s += `<circle cx="${x}" cy="${y}" r="3.6" fill="#f4fbf6" stroke="#cfe5d8"/><circle cx="${x}" cy="${y}" r="1.7" fill="#2e2a24"/>`;
      return s;
    }
    if (key === 'tadpole' || key === 'legs') {
      const legs = key === 'legs' ? `<path d="M-6 6 l-7 7 M-2 7 l-3 9" stroke="#4a4436" stroke-width="2.6" stroke-linecap="round"/>` : '';
      return `${legs}<path d="M-8 0 Q-22 ${w * 10} -36 ${w * -6}" stroke="#4a4436" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M-10 -3 Q-24 ${w * 10 - 4} -38 ${w * -6 - 3} L-38 ${w * -6 + 3} Q-24 ${w * 10 + 4} -10 3z" fill="#7c735e" fill-opacity=".6"/>
        <ellipse rx="12" ry="9" fill="#3b372d"/><circle cx="6" cy="-3" r="2" fill="#d8cfa8"/>`;
    }
    // こガエル・カエル（アマガエル）
    const tail = key === 'froglet' ? '<path d="M-14 4 q-7 2 -10 6" stroke="#6fb84c" stroke-width="3" stroke-linecap="round" fill="none"/>' : '';
    return `${tail}<ellipse cx="-8" cy="8" rx="11" ry="6" fill="#5fae3e"/><ellipse cx="-12" cy="13" rx="9" ry="3" fill="#4c9a32"/>
      <ellipse rx="17" ry="12" fill="#77c94f"/><ellipse cx="10" cy="-3" rx="11" ry="9" fill="#7ed356"/>
      <path d="M6 2 q8 4 14 1" stroke="#2f5d1c" stroke-width="1.5" fill="none"/>
      <path d="M2 9 l6 6 M-2 10 l2 7" stroke="#5fae3e" stroke-width="3" stroke-linecap="round"/>
      <circle cx="9" cy="-11" r="4.6" fill="#7ed356"/><circle cx="10" cy="-11.5" r="2.6" fill="#1b1a16"/><circle cx="10.8" cy="-12.3" r=".9" fill="#fff"/>
      <path d="M-4 -6 q8 -3 16 0" stroke="#9be07a" stroke-width="2" fill="none" opacity=".7"/>`;
  }
  if (species === 'kame') {
    if (key === 'egg') {
      return `<ellipse cx="0" cy="8" rx="30" ry="8" fill="#b89a6a" opacity=".5"/>
        <ellipse cx="-12" cy="2" rx="9" ry="12" fill="#fbf6ec" stroke="#e2d6bf"/><ellipse cx="6" cy="0" rx="9" ry="12" fill="#fffaf0" stroke="#e2d6bf"/>
        <ellipse cx="18" cy="5" rx="8" ry="11" fill="#f6efe1" stroke="#e2d6bf"/>`;
    }
    const legA = Math.sin(t * 6) * 3;
    const lines = key === 'baby' ? '<path d="M-14 -2 q14 -6 28 0 M-12 3 q12 -4 24 0" stroke="#d8c46a" stroke-width="1.6" fill="none"/>' : '';
    return `<path d="M14 ${4 + legA} l7 6 M-14 ${4 - legA} l-7 6 M12 ${-4 - legA} l6 -5 M-13 ${-4 + legA} l-6 -5" stroke="#5d6b3a" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M-20 2 l-7 2" stroke="#5d6b3a" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="25" cy="0" rx="8" ry="6" fill="#6a7a42"/><path d="M22 -3 q6 -1 10 2 M22 3 q6 1 10 -2" stroke="#e3d36a" stroke-width="1.2" fill="none"/>
      <circle cx="28" cy="-2" r="1.3" fill="#111"/>
      <ellipse rx="22" ry="17" fill="#5b5236"/><ellipse rx="19" ry="14" fill="#6e6440"/>
      <path d="M-8 -12 l0 24 M8 -12 l0 24 M-19 0 h38" stroke="#4a4229" stroke-width="1.4"/>
      ${lines}`;
  }
  // オオサンショウウオ
  if (key === 'egg') {
    let s = `<path d="M-48 6 C-30 -16 -10 18 10 -4 S40 -14 50 6" stroke="#e7e0c8" stroke-width="2" fill="none"/>`;
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const x = -48 + u * 98, y = 6 + Math.sin(u * Math.PI * 2.4) * -10;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#f3efe0" fill-opacity=".85" stroke="#d6cfb5"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="#e8c46a"/>`;
    }
    return s;
  }
  const larva = key === 'larva';
  const sw = Math.sin(t * 3) * 4;
  const gills = larva ? '<path d="M14 -6 l5 -8 M16 -5 l7 -6 M14 6 l5 8 M16 5 l7 6" stroke="#d98a6e" stroke-width="2.2" stroke-linecap="round"/>' : '';
  const spots = larva ? '' : [[-18, -4], [-6, 5], [4, -6], [-28, 3], [12, 3], [-12, -7]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="#3e3424" opacity=".55"/>`).join('');
  return `<path d="M-30 0 Q-44 ${sw} -54 ${-sw}" stroke="#6b5a3e" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M-12 7 l-4 8 M-12 -7 l-4 -8 M10 7 l3 8 M10 -7 l3 -8" stroke="#6b5a3e" stroke-width="4.5" stroke-linecap="round"/>
    ${gills}
    <ellipse cx="-6" rx="28" ry="10" fill="#7a6747"/><ellipse cx="18" rx="13" ry="11" fill="#806c4b"/>
    <path d="M-30 -1 q20 -6 54 -1" stroke="#9b8660" stroke-width="2" fill="none" opacity=".6"/>
    ${spots}<circle cx="24" cy="-5" r="1.5" fill="#1b1712"/><circle cx="24" cy="5" r="1.5" fill="#1b1712"/>
    <path d="M29 -6 q4 6 0 12" stroke="#4d4030" stroke-width="1.4" fill="none"/>`;
}

// ばしょの え と、みずの なか・りくの はんい
const BIO_SCENES = {
  tarai: {
    bg: `<rect width="800" height="460" fill="#cfe8c4"/><rect y="0" width="800" height="120" fill="#e9f5ff"/>
      <path d="M0 120 Q200 100 400 118 T800 112 V160 H0z" fill="#b9dca8"/>
      ${[60, 140, 690, 740, 610].map((x, i) => `<path d="M${x} 150 q-6 -30 -2 -48 M${x + 6} 150 q2 -34 10 -50 M${x + 12} 150 q8 -26 18 -36" stroke="#5f9e47" stroke-width="4" fill="none" stroke-linecap="round" class="sway s${i % 3}"/>`).join('')}
      <ellipse cx="400" cy="300" rx="345" ry="150" fill="#7d8a93"/><ellipse cx="400" cy="292" rx="330" ry="138" fill="#9aa6ae"/>
      <ellipse cx="400" cy="300" rx="305" ry="118" fill="#4f8fa8"/><ellipse cx="400" cy="300" rx="305" ry="118" fill="url(#bio-water)"/>
      <ellipse cx="560" cy="268" rx="70" ry="28" fill="#8f8c84"/><ellipse cx="556" cy="260" rx="62" ry="22" fill="#a7a49b"/>
      <ellipse cx="240" cy="330" rx="40" ry="14" fill="#5f9e47" opacity=".9"/><path d="M240 330 l30 -8" stroke="#4f8fa8" stroke-width="3"/>
      <ellipse cx="320" cy="250" rx="30" ry="11" fill="#6aae52" opacity=".9"/>`,
    water: { kind: 'ellipse', cx: 400, cy: 305, rx: 270, ry: 95 },
    land: [{ cx: 556, cy: 258, rx: 48, ry: 14 }, { cx: 240, cy: 328, rx: 26, ry: 8 }, { cx: 320, cy: 248, rx: 18, ry: 6 }],
    eggL: [{ cx: 556, cy: 258, rx: 30, ry: 8 }],
  },
  ike: {
    bg: `<rect width="800" height="460" fill="#cde8bf"/><rect width="800" height="110" fill="#e9f5ff"/>
      <path d="M0 110 Q300 90 520 112 T800 100 V170 H0z" fill="#b6d9a2"/>
      <path d="M560 170 Q640 150 800 160 V460 H520 Q470 360 560 170z" fill="#d6c294"/>
      ${[600, 660, 720, 760].map((x, i) => `<path d="M${x} 210 q-6 -30 -2 -44 M${x + 6} 210 q2 -30 10 -46" stroke="#5f9e47" stroke-width="4" fill="none" stroke-linecap="round" class="sway s${i % 3}"/>`).join('')}
      <path d="M40 200 Q200 150 470 180 Q560 210 540 330 Q520 430 300 440 Q80 440 40 330z" fill="#3f7f99"/>
      <path d="M40 200 Q200 150 470 180 Q560 210 540 330 Q520 430 300 440 Q80 440 40 330z" fill="url(#bio-water)"/>
      <ellipse cx="300" cy="270" rx="70" ry="26" fill="#857f72"/><ellipse cx="296" cy="262" rx="60" ry="20" fill="#a29c8e"/>
      <ellipse cx="150" cy="330" rx="34" ry="12" fill="#5f9e47"/><ellipse cx="420" cy="380" rx="30" ry="11" fill="#6aae52"/>
      <circle cx="152" cy="324" r="7" fill="#f6b6c8"/>`,
    water: { kind: 'poly', pts: [[70, 215], [200, 175], [460, 195], [525, 330], [470, 415], [300, 425], [90, 410], [60, 320]] },
    land: [{ cx: 680, cy: 300, rx: 90, ry: 90 }, { cx: 296, cy: 262, rx: 46, ry: 12 }, { cx: 150, cy: 328, rx: 22, ry: 7 }, { cx: 420, cy: 378, rx: 20, ry: 7 }],
    eggL: [{ cx: 690, cy: 380, rx: 60, ry: 30 }],
  },
  sawa: {
    bg: `<rect width="800" height="460" fill="#a9c99b"/><rect width="800" height="90" fill="#dbeee2"/>
      <path d="M0 90 Q200 70 400 92 T800 80 V140 H0z" fill="#8fb884"/>
      <path d="M0 210 Q250 150 520 190 T800 170 V330 Q560 380 300 350 T0 400z" fill="#2f6f86"/>
      <path d="M0 210 Q250 150 520 190 T800 170 V330 Q560 380 300 350 T0 400z" fill="url(#bio-water)"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path class="flow f${i % 3}" d="M${-60 + i * 150} ${250 + (i % 3) * 30} q40 -8 80 0" stroke="#cfeaf3" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`).join('')}
      ${[[180, 300, 50], [470, 250, 40], [640, 300, 46], [330, 330, 34]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.5}" fill="#6f7368"/><ellipse cx="${x - 4}" cy="${y - 6}" rx="${r * 0.85}" ry="${r * 0.38}" fill="#8b8f83"/>`).join('')}
      <path d="M0 400 Q300 350 560 380 T800 330 V460 H0z" fill="#7d9a6e"/>`,
    water: { kind: 'poly', pts: [[10, 230], [250, 180], [520, 210], [790, 195], [790, 320], [560, 360], [300, 335], [10, 380]] },
    land: [{ cx: 400, cy: 420, rx: 300, ry: 25 }],
    eggL: [{ cx: 400, cy: 420, rx: 200, ry: 20 }],
  },
};

function createBioScene(box, type, onSelect) {
  const S = BIO_SCENES[type];
  box.querySelectorAll('svg').forEach((s) => s.remove());
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 800 460');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('class', 'bio-svg');
  svg.innerHTML = `<defs>
      <linearGradient id="bio-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd6e6" stop-opacity=".45"/><stop offset="1" stop-color="#1d4f63" stop-opacity=".55"/></linearGradient>
    </defs>${S.bg}<g class="bio-ripples"></g><g class="bio-animals"></g><g class="bio-food"></g>`;
  box.prepend(svg);
  const layer = svg.querySelector('.bio-animals');
  const foodLayer = svg.querySelector('.bio-food');
  const actors = new Map();
  let selected = null;
  let raf = 0;

  const inEllipse = (e, x, y) => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 <= 1;
  const inPoly = (pts, x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const inWater = (x, y) => (S.water.kind === 'ellipse' ? inEllipse(S.water, x, y) : inPoly(S.water.pts, x, y));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pointIn = (test, box2) => {
    for (let i = 0; i < 200; i++) {
      const x = rnd(box2[0], box2[2]), y = rnd(box2[1], box2[3]);
      if (test(x, y)) return [x, y];
    }
    return [400, 300];
  };
  const waterPt = () => pointIn(inWater, [0, 150, 800, 460]);
  const bottomPt = () => { const [x, y] = waterPt(); return [x, y]; };
  const landPt = () => {
    const e = S.land[Math.floor(Math.random() * S.land.length)];
    return pointIn((x, y) => inEllipse(e, x, y) && !(e.rx > 60 && inWater(x, y)), [e.cx - e.rx, e.cy - e.ry, e.cx + e.rx, e.cy + e.ry]);
  };
  const eggLPt = () => { const e = S.eggL[0]; return pointIn((x, y) => inEllipse(e, x, y), [e.cx - e.rx, e.cy - e.ry, e.cx + e.rx, e.cy + e.ry]); };
  // みずの ふちに ちかい ところ（カエル・サンショウウオの たまご）
  const eggWPt = () => {
    for (let i = 0; i < 300; i++) {
      const [x, y] = waterPt();
      if (!inWater(x + 40, y) || !inWater(x - 40, y) || !inWater(x, y + 25)) return [x, y];
    }
    return waterPt();
  };

  function spawn(a) {
    const st = stageOf(a);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'bio-actor');
    g.dataset.id = a.id;
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(a.id);
      api.select(a.id);
    });
    layer.appendChild(g);
    const where = st.where;
    const start = where === 'eggL' ? eggLPt() : where === 'eggW' ? eggWPt() : where === 'land' ? landPt() : where === 'amphi' ? (Math.random() < 0.5 ? landPt() : waterPt()) : waterPt();
    const act = { a, st, g, x: start[0], y: start[1], tx: start[0], ty: start[1], dir: Math.random() < 0.5 ? 1 : -1, wait: Math.random() * 3, phase: Math.random() * 10, mode: inWater(start[0], start[1]) ? 'water' : 'land', hop: 0 };
    actors.set(a.id, act);
  }

  function pickTarget(act) {
    const w = act.st.where;
    if (w === 'eggW' || w === 'eggL') return;
    if (w === 'land') {
      [act.tx, act.ty] = landPt();
      act.hop = 1;           // ぴょんと とぶ
      act.hx = act.x; act.hy = act.y;
      return;
    }
    if (w === 'amphi') {
      // カメ：ときどき りくや いわで ひなたぼっこ
      const toLand = act.mode === 'water' ? Math.random() < 0.35 : Math.random() < 0.3;
      [act.tx, act.ty] = toLand ? landPt() : waterPt();
      return;
    }
    [act.tx, act.ty] = w === 'bottom' ? bottomPt() : waterPt();
  }

  let last = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    step(now);
  }
  function step(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const t = now / 1000;
    for (const act of actors.values()) {
      const w = act.st.where;
      const speed = { water: 45, bottom: 14, amphi: 22, land: 0 }[w] ?? 0;
      let lift = 0;
      if (w === 'land') {
        if (act.hop > 0) {
          act.hop -= dt * 1.6;
          const k = 1 - Math.max(0, act.hop);
          act.x = act.hx + (act.tx - act.hx) * k;
          act.y = act.hy + (act.ty - act.hy) * k;
          lift = Math.sin(k * Math.PI) * 30;
          if (act.hop <= 0) act.wait = 2 + Math.random() * 5;
        } else if ((act.wait -= dt) <= 0) {
          pickTarget(act);
          act.dir = act.tx >= act.x ? 1 : -1;
        }
      } else if (speed) {
        const dx = act.tx - act.x, dy = act.ty - act.y, d = Math.hypot(dx, dy);
        if (d < 4) {
          if ((act.wait -= dt) <= 0) {
            pickTarget(act);
            act.wait = w === 'amphi' && !inWater(act.tx, act.ty) ? 4 + Math.random() * 6 : Math.random() * 1.5;
          }
        } else {
          const sp2 = speed * (w === 'water' ? 0.7 + 0.5 * Math.abs(Math.sin(t * 2 + act.phase)) : 1);
          act.x += (dx / d) * sp2 * dt;
          act.y += (dy / d) * sp2 * dt;
          if (Math.abs(dx) > 2) act.dir = dx > 0 ? 1 : -1;
        }
        act.mode = inWater(act.x, act.y) ? 'water' : 'land';
      }
      const bob = w === 'eggW' ? Math.sin(t * 1.5 + act.phase) * 1.5 : 0;
      const sc = act.st.s * 1.6 * (selected === act.a.id ? 1.08 : 1);   // え は すこし おおきめに
      // みずの なかは すこし うすく（みずごしに みえる）
      const under = act.mode === 'water' && w !== 'eggW' && w !== 'land';
      act.g.setAttribute('transform', `translate(${act.x.toFixed(1)} ${(act.y - lift + bob).toFixed(1)}) scale(${(sc * act.dir).toFixed(3)} ${sc.toFixed(3)})`);
      act.g.setAttribute('opacity', under ? (w === 'bottom' ? 0.85 : 0.92) : 1);
      const moving = w === 'land' ? act.hop > 0 : true;
      act.g.innerHTML = (selected === act.a.id ? '<ellipse rx="40" ry="26" fill="none" stroke="#ffd447" stroke-width="3" stroke-dasharray="6 5"/>' : '')
        + bioDraw(act.a.species, act.st.key, moving ? t + act.phase : act.phase, 0);
    }
  }
  raf = requestAnimationFrame(loop);

  const api = {
    setAnimals(list) {
      const ids = new Set(list.map((a) => a.id));
      for (const [id, act] of actors) if (!ids.has(id) || act.st !== stageOf(act.a)) { act.g.remove(); actors.delete(id); }
      for (const a of list) {
        const act = actors.get(a.id);
        if (act) act.a = a;
        else spawn(a);
      }
      step(performance.now());   // すぐに 1かい かく
    },
    select(id) { selected = id; },
    // えさを まく：ほうれんそう・コオロギ などが すこし みえて きえる
    feed() {
      for (let i = 0; i < 6; i++) {
        const [x, y] = waterPt();
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4);
        c.setAttribute('class', 'bio-crumb');
        foodLayer.appendChild(c);
        setTimeout(() => c.remove(), 2500);
      }
    },
    dispose() {
      cancelAnimationFrame(raf);
      svg.remove();
    },
  };
  svg.addEventListener('click', () => { onSelect(null); api.select(null); });
  return api;
}

$('bio-back').addEventListener('click', closeBio);
$('bfeed-btn').addEventListener('click', feedBio);
$('bshop-btn').addEventListener('click', () => openBioShop());
$('bzukan-btn').addEventListener('click', openBioZukan);
$('bshop-close').addEventListener('click', () => $('bshop').classList.add('hidden'));
$('bzukan-close').addEventListener('click', () => $('bzukan').classList.add('hidden'));
document.querySelectorAll('.bshop-tab').forEach((b) => b.addEventListener('click', () => openBioShop(b.dataset.tab)));
