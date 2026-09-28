// オフラインで動かすためのキャッシュ。ファイルを変えたら VERSION を上げる。
const VERSION = 'v24';
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
  'app.js',
  'timeattack.js',
  'flatroom.js',
  'pets.js',
  'pet3d.js',
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
