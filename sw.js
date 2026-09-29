// オフラインで動かすためのキャッシュ。ファイルを変えたら VERSION を上げる。
const VERSION = 'v36';
const FILES = [
  './',
  'index.html',
  'style.css',
  'rewards.js',
  'problems.js',
  'tiles.js',
  'board.js',
  'placevalue.js',
  'kukuhyo.js',
  'kufu.js',
  'nagasa.js',
  'junjo.js',
  'pazuru.js',
  'suiri.js',
  'kakezan.js',
  'tenkai.js',
  'net3d.js',
  'solid3d.js',
  'zenhan1.js',
  'zenhan2.js',
  'zenhan3.js',
  'ichinen1.js',
  'ichinen2.js',
  'app.js',
  'timeattack.js',
  'flatroom.js',
  'pets.js',
  'pet3d.js',
  'fish.js',
  'fish3d.js',
  'models/medaka.glb',
  'models/himedaka.glb',
  'models/wakin_1.glb',
  'models/wakin_2.glb',
  'models/wakin_3.glb',
  'models/ryukin_1.glb',
  'models/ryukin_2.glb',
  'models/pinpon_1.glb',
  'models/pinpon_2.glb',
  'models/demekin_1.glb',
  'models/tancho_1.glb',
  'models/betta_1.glb',
  'models/betta_2.glb',
  'models/guppy_1.glb',
  'models/guppy_2.glb',
  'models/neon_1.glb',
  'models/angel_1.glb',
  'models/arowana_1.glb',
  'models/prop_vallis.glb',
  'models/prop_sword.glb',
  'models/prop_cabomba.glb',
  'models/prop_rocks.glb',
  'models/prop_driftwood.glb',
  'models/prop_shells.glb',
  'models/prop_castle.glb',
  'models/prop_ship.glb',
  'models/prop_filter.glb',
  'models/prop_heater.glb',
  'models/prop_airpump.glb',
  'models/prop_airstone.glb',
  'models/bug_kabuto.glb',
  'models/bug_kanabun.glb',
  'models/bug_kokuwa.glb',
  'models/bug_nokogiri.glb',
  'models/bug_miyama.glb',
  'models/bug_ookuwa.glb',
  'settings.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ネットにつながるときは最新を取りにいき、つながらないときはキャッシュを使う
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // cache: 'no-cache'：ブラウザの キャッシュに ふるい ファイルが あっても かならず サーバーに たしかめる
  //（あたらしい app.js と ふるい timeattack.js が まざらない ように）
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
