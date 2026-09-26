// むしの おへや：べんきょうで ためた ポイントで むし・ケース・えさを かって そだてる。
//   ・えさ：1ぴき 1にち 1こ。むしが ふえるほど ポイントが いる（さなぎは たべない）
//   ・そだつ：ようちゅう → さなぎ → せいちゅう。「べんきょうした ひ」（1セット いじょう おわった ひ）で すすむ
//   ・おおきさ：ようちゅうの あいだに きんしエキス・ロイヤルゼリーを あげると おおきく なる
//   ・えさを わすれても しなない（げんきが なくなる だけ）
//
// ほぞん（localStorage: mathapp.v1.pets.<こどもの id>）
//   cases [{ id, type }]
//   pets  [{ id, species, caseId, stage, stageStart, growth, size, lastFed, fed: { day, kinds } }]
//   inv   { jelly, leaf, mat, kinshi, royal }

const petsKey = (id) => `mathapp.v1.pets.${id}`;

// dims：よこ・おくゆき・たかさ（cm）
const CASES = {
  starter: { name: 'はじめの ケース', price: 0, size: 0, capacity: 6, dims: [24, 16, 14] },
  S: { name: 'しいくケース（小）', price: 200, size: 1, capacity: 3, dims: [32, 20, 20] },
  M: { name: 'しいくケース（中）', price: 400, size: 2, capacity: 4, dims: [42, 26, 26] },
  L: { name: 'しいくケース（大）', price: 800, size: 3, capacity: 5, dims: [56, 32, 32] },
};

// larva / pupa：ようちゅう・さなぎで すごす「べんきょうした ひ」の かず
// size：せいちゅうの おおきさ（mm）の はんい。caseSize：ひつような ケース
const SPECIES = {
  ant: { name: 'アリ', icon: '🐜', price: 20, caseSize: 0, food: 'jelly', size: [8, 8] },
  dango: { name: 'ダンゴムシ', icon: '🪨', price: 40, caseSize: 0, food: 'leaf', size: [12, 12] },
  kanabun: { name: 'カナブン', icon: '🪲', price: 100, caseSize: 1, larva: 5, pupa: 2, size: [22, 30] },
  kokuwa: { name: 'コクワガタ', icon: '🪲', price: 150, caseSize: 1, larva: 6, pupa: 2, size: [20, 54] },
  nokogiri: { name: 'ノコギリクワガタ', icon: '🪲', price: 300, caseSize: 2, larva: 8, pupa: 3, size: [26, 75] },
  kabuto: { name: 'カブトムシ', icon: '🪲', price: 300, caseSize: 2, larva: 8, pupa: 3, size: [32, 85] },
  miyama: { name: 'ミヤマクワガタ', icon: '🪲', price: 600, caseSize: 3, larva: 10, pupa: 3, size: [32, 79] },
  ookuwa: { name: 'オオクワガタ', icon: '🪲', price: 1000, caseSize: 3, larva: 12, pupa: 4, size: [30, 80] },
};

// boost：ようちゅうに あげると そだちが ふえる（1にち 1かいずつ）
const FOODS = {
  jelly: { name: 'こんちゅうゼリー', short: 'ゼリー', icon: '🍯', price: 3, for: 'せいちゅう・アリ の まいにちの えさ' },
  leaf: { name: 'おちば', short: 'おちば', icon: '🍂', price: 2, for: 'ダンゴムシ の まいにちの えさ' },
  mat: { name: 'ようちゅうマット', short: 'マット', icon: '🟫', price: 3, for: 'ようちゅう の まいにちの えさ' },
  kinshi: { name: 'きんしエキス', short: 'きんし', icon: '🍄', price: 15, for: 'ようちゅうが おおきく そだつ', boost: 2 },
  royal: { name: 'ロイヤルゼリー', short: 'ロイヤル', icon: '👑', price: 30, for: 'ようちゅうが もっと おおきく そだつ', boost: 4 },
};
const GROWTH_MAX_PER_DAY = 7; // マット 1 ＋ きんし 2 ＋ ロイヤル 4
const STAGE_NAMES = { larva: 'ようちゅう', pupa: 'さなぎ', adult: 'せいちゅう' };

const pets = {
  data: null,
  caseId: null,
  selected: null,
  room: null,        // 3D（よみこめなければ null）
  roomLoading: false,
  shopTab: 'bug',
};

// ---------- データ ----------

function loadPetData(profileId) {
  const s = readJSON(petsKey(profileId), null);
  if (s) return s;
  // はじめて：ケースと アリ 1ぴき と ゼリー 3こ を プレゼント
  const today = todayKey();
  return {
    seq: 1,
    cases: [{ id: 'c1', type: 'starter' }],
    pets: [{ id: 'pet1', species: 'ant', caseId: 'c1', stage: 'adult', stageStart: today, growth: 0, size: 8, lastFed: null, fed: null }],
    inv: { jelly: 3, leaf: 0, mat: 0, kinshi: 0, royal: 0 },
    welcome: true,
  };
}

function savePetData() {
  writeJSON(petsKey(currentProfile().id), pets.data);
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
        events.push(`${sp.name}が さなぎに なった！`);
      } else if (p.stage === 'pupa' && after.length >= sp.pupa) {
        p.stage = 'adult';
        p.stageStart = after[sp.pupa - 1];
        events.push(`${sp.name}が せいちゅうに なった！ おおきさ ${p.size}mm`);
      } else break;
    }
  }
  return events;
}

function foodFor(p) {
  if (p.stage === 'pupa') return null;
  if (p.stage === 'larva') return 'mat';
  return SPECIES[p.species].food || 'jelly';
}

const fedToday = (p, kind) => p.fed && p.fed.day === todayKey() && p.fed.kinds.includes(kind);

function markFed(p, kind) {
  const today = todayKey();
  if (!p.fed || p.fed.day !== today) p.fed = { day: today, kinds: [] };
  p.fed.kinds.push(kind);
  if (kind === foodFor(p)) {
    p.lastFed = today;
    if (p.stage === 'larva') p.growth += 1;
  } else if (FOODS[kind].boost) {
    p.growth += FOODS[kind].boost;
  }
}

function moodOf(p) {
  if (p.stage === 'pupa') return { text: 'じっと している', hungry: false };
  const today = todayKey();
  if (fedToday(p, foodFor(p))) return { text: 'げんき いっぱい 😊', hungry: false };
  if (p.lastFed === dayBefore(today) || p.stageStart === today || (!p.lastFed && p.stageStart === dayBefore(today))) {
    return { text: 'おなかが すいた 🍽️', hungry: false };
  }
  return { text: 'げんきが ない… えさを あげてね', hungry: true };
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
  return { id: p.id, species: p.species, stage: p.stage, lengthCm, sizeRatio, hungry: moodOf(p).hungry };
}

// ---------- がめん ----------

function openPets() {
  const profile = currentProfile();
  pets.data = loadPetData(profile.id);
  const events = processGrowth(pets.data, studyDayList(profile.id));
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
    toast('ようこそ！ アリを 1ぴき と ゼリーを プレゼント 🎁');
  } else if (events.length) {
    toast(events.join('<br>'));
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
  try {
    const mod = await import('./pet3d.js');
    if (!$('pets').classList.contains('active')) return;
    if (pets.room) pets.room.dispose();
    pets.room = mod.createInsectRoom(box, {
      onSelect: (id) => {
        pets.selected = id;
        renderPetInfo();
      },
    });
    $('room-msg').style.display = 'none';
    syncRoom();
  } catch (e) {
    $('room-msg').textContent = '3D を よみこめませんでした。インターネットに つないで ひらきなおしてね';
  }
}

function currentCase() {
  return pets.data.cases.find((c) => c.id === pets.caseId);
}

const petsIn = (caseId) => pets.data.pets.filter((p) => p.caseId === caseId);

function syncRoom() {
  if (!pets.room) return;
  pets.room.setCase(CASES[currentCase().type].dims);
  pets.room.setPets(petsIn(pets.caseId).map(view3d));
  pets.room.select(pets.selected);
}

function renderPets() {
  $('pets-points').innerHTML = `⭐ <b>${loadWallet(currentProfile().id).points}</b> pt`;
  const tabs = $('case-tabs');
  tabs.innerHTML = '';
  for (const c of pets.data.cases) {
    const def = CASES[c.type];
    const b = document.createElement('button');
    b.className = 'case-tab' + (c.id === pets.caseId ? ' active' : '');
    b.textContent = `${def.name}（${petsIn(c.id).length}/${def.capacity}）`;
    b.addEventListener('click', () => {
      pets.caseId = c.id;
      pets.selected = null;
      renderPets();
      syncRoom();
    });
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
    const list = petsIn(pets.caseId);
    const needs = list.filter((x) => foodFor(x) && !fedToday(x, foodFor(x))).length;
    el.innerHTML = `
      <div class="info-title">${CASES[currentCase().type].name}</div>
      <div class="info-sub">${list.length ? 'むしを タップすると くわしく みられるよ' : 'まだ むしが いないよ。おみせで かおう'}</div>
      <ul class="case-list">${list.map((x) => {
        const sp = SPECIES[x.species];
        return `<li data-id="${x.id}">${sp.icon} ${sp.name} <small>${STAGE_NAMES[x.stage]}</small></li>`;
      }).join('')}</ul>
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
    <div class="info-mood">${mood.text}</div>
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
      pets.data.cases.push({ id, type: key });
      pets.caseId = id;
      savePetData();
      closeShop();
      renderPets();
      syncRoom();
      toast(`${c.name}が とどいた！`);
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
    pets.data.pets.push({
      id, species: key, caseId: target.id, stage: sp.larva ? 'larva' : 'adult', stageStart: today,
      growth: 0, size: sp.larva ? null : sp.size[0], lastFed: null, fed: null,
    });
    pets.caseId = target.id;
    pets.selected = id;
    savePetData();
    closeShop();
    renderPets();
    syncRoom();
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

$('pets-back').addEventListener('click', closePets);
$('feed-btn').addEventListener('click', feedCase);
$('shop-btn').addEventListener('click', () => openShop());
$('shop-close').addEventListener('click', closeShop);
document.querySelectorAll('.shop-tab').forEach((b) => b.addEventListener('click', () => openShop(b.dataset.tab)));
