// ほごしゃ メニュー：きろくが タブレットに のこっているかの たしかめと、バックアップ・もどす。
// きろくは ぜんぶ localStorage の「mathapp.」で はじまる キーに ある。

const SINCE_KEY = 'mathapp.v1.since';           // この ブラウザで はじめて つかった じこく
const LAST_BACKUP_KEY = 'mathapp.v1.lastBackup';
const DATA_PREFIX = 'mathapp.';
const BACKUP_APP = 'sansu-renshu';

function storageWorks() {
  try {
    localStorage.setItem('mathapp.test', '1');
    localStorage.removeItem('mathapp.test');
    return true;
  } catch {
    return false;
  }
}

// きろくが きえると ここも あたらしい じこくに なる → いつ きえたか わかる
function markSince() {
  try {
    if (!localStorage.getItem(SINCE_KEY)) localStorage.setItem(SINCE_KEY, new Date().toISOString());
  } catch {
    // ほぞん できない ブラウザ
  }
}

// ブラウザに「この サイトの データは けさないで」と おねがいする（できない ブラウザも ある）
async function askPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch {
    // たいおう していない
  }
  return false;
}

function collectData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(DATA_PREFIX) && k !== 'mathapp.test') data[k] = localStorage.getItem(k);
  }
  return { app: BACKUP_APP, v: 1, at: new Date().toISOString(), data };
}

// にほんごを ふくむ もじれつを base64 に
const toBase64 = (s) => btoa(unescape(encodeURIComponent(s)));
const fromBase64 = (s) => decodeURIComponent(escape(atob(s.replace(/\s+/g, ''))));

function restoreData(obj) {
  if (!obj || obj.app !== BACKUP_APP || !obj.data) throw new Error('この アプリの バックアップでは ありません');
  for (const k of Object.keys(localStorage)) if (k.startsWith(DATA_PREFIX)) localStorage.removeItem(k);
  for (const [k, v] of Object.entries(obj.data)) localStorage.setItem(k, v);
}

const fmtDate = (iso) => {
  if (!iso) return 'なし';
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

async function openSettings() {
  const works = storageWorks();
  let persisted = '非対応';
  try {
    if (navigator.storage && navigator.storage.persisted) persisted = (await navigator.storage.persisted()) ? '有効' : '無効';
  } catch {
    // そのまま 非対応
  }
  let usage = '不明';
  try {
    if (navigator.storage && navigator.storage.estimate) usage = `${Math.round((await navigator.storage.estimate()).usage / 1024)} KB`;
  } catch {
    // そのまま 不明
  }
  const get = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  $('settings-body').innerHTML = `
    <section class="set-block">
      <h3>記録の保存の状態</h3>
      <dl class="set-facts">
        <dt>このブラウザに保存</dt><dd>${works ? '✅ できる' : '❌ できない（記録は残りません）'}</dd>
        <dt>消えにくくする設定</dt><dd>${persisted}</dd>
        <dt>使いはじめた日時</dt><dd>${fmtDate(get(SINCE_KEY))}</dd>
        <dt>最後に保存した日時</dt><dd>${fmtDate(get(LAST_SAVE_KEY))}</dd>
        <dt>最後のバックアップ</dt><dd>${fmtDate(get(LAST_BACKUP_KEY))}</dd>
        <dt>保存している量</dt><dd>${usage}</dd>
        <dt>開き方</dt><dd>${standalone ? 'ホーム画面のアイコンから' : 'ブラウザから'}</dd>
      </dl>
      <p class="set-note">「使いはじめた日時」が、実際に使いはじめた日より新しくなっていたら、その日時に記録が消えています。</p>
      <details><summary>ブラウザの情報</summary><code class="set-ua">${navigator.userAgent}</code></details>
    </section>
    <section class="set-block">
      <h3>バックアップ（記録を取っておく）</h3>
      <div class="set-buttons">
        <button id="backup-file" class="big-btn blue">📄 ファイルに保存</button>
        <button id="backup-code" class="big-btn gray">🔤 コードを表示</button>
      </div>
      <textarea id="backup-out" class="set-code" readonly hidden></textarea>
      <button id="backup-copy" class="small-btn" hidden>コピー</button>
    </section>
    <section class="set-block">
      <h3>もどす（いまの記録は上書きされます）</h3>
      <div class="set-buttons">
        <label class="big-btn orange set-file">📂 ファイルから もどす<input id="restore-file" type="file" accept=".json,application/json" hidden></label>
      </div>
      <textarea id="restore-in" class="set-code" placeholder="ここにコードを貼りつけて「コードから もどす」"></textarea>
      <button id="restore-code" class="small-btn">コードから もどす</button>
    </section>`;

  $('backup-file').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(collectData())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sansu-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  });
  $('backup-code').addEventListener('click', () => {
    $('backup-out').value = toBase64(JSON.stringify(collectData()));
    $('backup-out').hidden = false;
    $('backup-copy').hidden = false;
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  });
  $('backup-copy').addEventListener('click', async () => {
    const box = $('backup-out');
    try {
      await navigator.clipboard.writeText(box.value);
    } catch {
      box.select();
      document.execCommand('copy');
    }
    $('backup-copy').textContent = 'コピーしました';
  });
  const restore = (obj) => {
    if (!confirm(`${fmtDate(obj.at)} のバックアップに もどします。いまの記録は上書きされます。よろしいですか？`)) return;
    restoreData(obj);
    alert('もどしました。アプリを開きなおします。');
    location.reload();
  };
  $('restore-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        restore(JSON.parse(reader.result));
      } catch (err) {
        alert(`もどせませんでした：${err.message}`);
      }
    };
    reader.readAsText(file);
  });
  $('restore-code').addEventListener('click', () => {
    try {
      restore(JSON.parse(fromBase64($('restore-in').value)));
    } catch (err) {
      alert(`もどせませんでした：${err.message}`);
    }
  });
  $('settings').classList.remove('hidden');
}

$('settings-btn').addEventListener('click', openSettings);
$('settings-close').addEventListener('click', () => $('settings').classList.add('hidden'));

markSince();
askPersist();
if (!storageWorks()) $('storage-warning').hidden = false;
