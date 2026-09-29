// さかなの おへやの 3D（three.js）。すいそうの なかを さかなが およぐ。
//   ゆびで ドラッグ：まわす／ピンチ：ズーム／タップ：さかなを えらぶ
// たんい は cm。さかなは ながさ 1（はなさき z=0.5、うしろが おびれ）で つくって、おおきさに あわせて かくだいする。
// からだの くねり・ひれの ゆらぎ・みずくさの ゆれは シェーダーで つける（ふるい タブレットでも かるく うごく）。

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js/+esm';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, envMapIntensity: 0.7, ...opts });
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// a → b で 0 → 1 に なめらかに（a > b でも よい）
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// おなじ たねから おなじ もようを つくる らんすう
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// いくつかの かたちを 1つに まとめる（かく かずを へらして かるく する）
function mergeGeos(list) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  let off = 0;
  for (const g of list) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    }
    if (g.index) for (let k = 0; k < g.index.count; k++) idx.push(g.index.getX(k) + off);
    else for (let k = 0; k < p.count; k++) idx.push(k + off);
    off += p.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

// まるい もの（め・じゃり）を いちと おおきさを きめて おく
function placed(geo, pos, scale, rot) {
  const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(rot || new THREE.Euler()), scale);
  return geo.clone().applyMatrix4(m);
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

// ---------- テクスチャ（キャンバスで つくる。1かいだけ） ----------

let TEX = null;
function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textures() {
  if (TEX) return TEX;
  const r = rng(11);
  // うろこ：あたまがわの うろこが おびれがわの うろこに かさなる（ひだりから じゅんに かく）
  const scale = canvasTexture(128, 128, (x, w, h) => {
    x.fillStyle = '#d2d2d2';
    x.fillRect(0, 0, w, h);
    const s = 16;
    for (let col = -1; col <= w / s + 1; col++) {
      for (let row = -1; row <= (h / s) * 2 + 1; row++) {
        const cx = col * s + (row % 2 ? s / 2 : 0);
        const cy = (row * s) / 2;
        const g = x.createRadialGradient(cx + s * 0.18, cy, 0, cx + s * 0.1, cy, s * 0.64);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.75, '#f6f6f6');
        g.addColorStop(1, '#c6c6c6');
        x.fillStyle = g;
        x.beginPath();
        x.arc(cx, cy, s * 0.64, 0, Math.PI * 2);
        x.fill();
      }
    }
  });
  // ひれ：ねもとは こく、さきは すける。すじ（ひれすじ）が はいる
  const fin = canvasTexture(64, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0.55)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(70,50,40,0.25)';
    for (let i = 0; i < 8; i++) x.fillRect(((i + 0.5) * w) / 8 - 0.7, 0, 1.4, h);
  });
  // みなそこに ゆれる ひかりの もよう（コースティクス）
  const caustic = canvasTexture(128, 128, (x, w, h) => {
    const img = x.createImageData(w, h);
    const pts = Array.from({ length: 18 }, () => [r() * w, r() * h]);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        let f1 = 1e9;
        let f2 = 1e9;
        for (const [qx, qy] of pts) {
          let dx = Math.abs(px - qx);
          dx = Math.min(dx, w - dx);
          let dy = Math.abs(py - qy);
          dy = Math.min(dy, h - dy);
          const d = dx * dx + dy * dy;
          if (d < f1) {
            f2 = f1;
            f1 = d;
          } else if (d < f2) f2 = d;
        }
        const v = Math.sqrt(f2) - Math.sqrt(f1);
        const c = Math.pow(Math.max(0, 1 - v / 6), 2.4) * 255;
        const i = (py * w + px) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
        img.data[i + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
  }, false);
  // すいめんの なみ（ほうせん マップ）
  const waterN = canvasTexture(128, 128, (x, w, h) => {
    const img = x.createImageData(w, h);
    const waves = [[1, 2, 0.5], [3, -1, 0.3], [-2, 3, 0.25], [5, 4, 0.12], [-6, 1, 0.1]];
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        let nx = 0;
        let ny = 0;
        for (const [a, b, amp] of waves) {
          const c = Math.cos(2 * Math.PI * ((a * px) / w + (b * py) / h)) * amp;
          nx += c * a;
          ny += c * b;
        }
        const vx = -nx * 0.22;
        const vy = -ny * 0.22;
        const l = Math.hypot(vx, vy, 1);
        const i = (py * w + px) * 4;
        img.data[i] = (vx / l * 0.5 + 0.5) * 255;
        img.data[i + 1] = (vy / l * 0.5 + 0.5) * 255;
        img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
  }, false);
  // すいそうの うしろの スクリーン
  const back = canvasTexture(4, 128, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2d7fa6');
    g.addColorStop(0.6, '#15506e');
    g.addColorStop(1, '#0c3348');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  });
  // もくめ
  const wood = canvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#c39465';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const y = r() * h;
      x.strokeStyle = `rgba(${90 + r() * 30},${55 + r() * 20},${30},${0.08 + r() * 0.14})`;
      x.lineWidth = 0.6 + r() * 1.8;
      x.beginPath();
      for (let px = 0; px <= w; px += 8) x.lineTo(px, y + Math.sin(px * 0.03 + i) * 2.5);
      x.stroke();
    }
    x.fillStyle = 'rgba(60,35,20,0.35)';
    for (let y = 0; y < h; y += 64) x.fillRect(0, y, w, 2);
  });
  // じゃりの つぶつぶ
  const grit = canvasTexture(128, 128, (x, w, h) => {
    x.fillStyle = '#7d6d58';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const v = 90 + r() * 120;
      x.fillStyle = `rgb(${v + 20},${v + 5},${v - 20})`;
      x.beginPath();
      x.arc(r() * w, r() * h, 0.8 + r() * 2.2, 0, Math.PI * 2);
      x.fill();
    }
  });
  const shadow = canvasTexture(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  });
  const marker = canvasTexture(64, 64, (x) => {
    x.fillStyle = '#ff8a3d';
    x.strokeStyle = '#ffffff';
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(8, 10);
    x.lineTo(56, 10);
    x.lineTo(32, 54);
    x.closePath();
    x.stroke();
    x.fill();
  });
  const glow = canvasTexture(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,190,120,1)');
    g.addColorStop(0.3, 'rgba(255,120,40,0.5)');
    g.addColorStop(1, 'rgba(255,80,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  });
  TEX = { scale, fin, caustic, waterN, back, wood, grit, shadow, marker, glow };
  return TEX;
}

// ---------- さかなの かたち ----------
//  h：からだの たかさ（はんぶん）、wr：はば の わりあい、peak：いちばん たかい ところ（0 おびれがわ → 1 はなさき）
//  k：あたまの まるさ（ちいさいほど まるい）、ped：おびれの ねもとの ふとさ、flat：せなかの たいらさ
//  zT：からだが おわる ところ（ここから うしろが おびれ）
//  back / belly：せなか・おなかの いろ、scale：うろこの かず（ながさ・まわり）
//  swim：speed（1びょうに からだ なんこぶん）、depth（すむ ふかさ 0 そこ 〜 1 すいめん）
const LOOK = {
  medaka: {
    h: 0.1, wr: 0.62, peak: 0.52, k: 0.6, ped: 0.38, flat: 0.32, zT: -0.3,
    back: 0x7a7650, belly: 0xe6e2cf, cs: [0.2, 0.62], line: 0x3f3d2c, gill: 0.78, rough: 0.4, metal: 0.15, scale: [4, 2],
    eye: 0.044, eyeT: 0.87, eyeA: 0.95, iris: 0xc6dbe6,
    fin: { color: 0xb8b090, tip: 0xe0dccb, opacity: 0.5, dorsal: { t: [0.1, 0.24], h: 0.08 }, anal: { t: [0.08, 0.5], h: 0.075, sweep: 0.2 },
      tail: { len: 0.2, span: 0.1, kind: 'round' }, pect: 0.08, pelvic: 0.045 },
    amp: 0.07, swim: { speed: 1.4, depth: [0.6, 0.97], school: 'medaka', dart: true },
  },
  kingyo: {
    h: 0.155, wr: 0.62, peak: 0.52, k: 0.55, ped: 0.3, flat: -0.05, zT: -0.27,
    back: 0xd63a12, belly: 0xf39052, cs: [0.3, 0.85], patch: 0xf5efe2, gill: 0.76, rough: 0.3, metal: 0.25, scale: [3.2, 2],
    eye: 0.044, eyeT: 0.86, eyeA: 1.1, iris: 0xe6c070,
    fin: { color: 0xe0501c, tip: 0xffa060, opacity: 0.72, dorsal: { t: [0.34, 0.68], h: 0.13, sweep: 0.3 }, anal: { t: [0.16, 0.3], h: 0.07 },
      tail: { len: 0.3, span: 0.2, kind: 'fork', fork: 0.5, droop: 0.02 }, pect: 0.1, pelvic: 0.07 },
    amp: 0.06, swim: { speed: 0.8, depth: [0.1, 0.85], forage: true },
  },
  ryukin: {
    h: 0.2, wr: 0.62, peak: 0.55, k: 0.55, ped: 0.26, flat: -0.22, zT: -0.1,
    back: 0xe0381a, belly: 0xf6e8dc, cs: [0.35, 0.85], patch: 0xf8f3ea, gill: 0.74, rough: 0.28, metal: 0.25, scale: [3, 2],
    eye: 0.046, eyeT: 0.86, eyeA: 1.2, iris: 0xe6c070,
    fin: { color: 0xe84a22, tip: 0xff9a78, opacity: 0.7, dorsal: { t: [0.3, 0.72], h: 0.24, sweep: 0.4 }, anal: { t: [0.1, 0.24], h: 0.12, sweep: 0.5 },
      tail: { len: 0.44, span: 0.26, kind: 'fork', fork: 0.42, droop: 0.12, split: 0.09 }, pect: 0.11, pelvic: 0.09 },
    amp: 0.045, flutter: 0.035, swim: { speed: 0.55, depth: [0.2, 0.85], hover: true },
  },
  betta: {
    h: 0.11, wr: 0.55, peak: 0.55, k: 0.65, ped: 0.55, flat: 0.08, zT: -0.1,
    back: 0x1a2a8c, belly: 0x4a1c70, cs: [0.3, 0.9], gill: 0.76, rough: 0.25, metal: 0.35, irid: 0.8, scale: [3.5, 2],
    eye: 0.045, eyeT: 0.87, eyeA: 1.2, iris: 0xd0a040,
    fin: { color: 0x2544c4, tip: 0xd01e48, opacity: 0.82, dorsal: { t: [0.05, 0.42], h: 0.22, sweep: 0.7 }, anal: { t: [0.0, 0.62], h: 0.3, sweep: 0.6 },
      tail: { len: 0.46, span: 0.34, kind: 'round', droop: 0.05 }, pect: 0.07, pelvic: 0.15 },
    amp: 0.04, flutter: 0.05, swim: { speed: 0.5, depth: [0.4, 0.93], hover: true },
  },
  guppy: {
    h: 0.1, wr: 0.55, peak: 0.62, k: 0.65, ped: 0.5, flat: 0.12, zT: -0.18,
    back: 0x8d978f, belly: 0xe2e8e2, cs: [0.25, 0.7], spots: [0xff7a18, 0x2a6aff, 0x111111], gill: 0.78, rough: 0.3, metal: 0.3, irid: 0.4, scale: [4, 2],
    eye: 0.044, eyeT: 0.87, eyeA: 1.05, iris: 0xd8d8c8,
    fin: { color: 0xff8a26, tip: 0x3a5cff, opacity: 0.85, dorsal: { t: [0.2, 0.38], h: 0.1, sweep: 0.6 }, anal: { t: [0.26, 0.34], h: 0.05 },
      tail: { len: 0.38, span: 0.3, kind: 'fan' }, pect: 0.07 },
    amp: 0.06, flutter: 0.03, swim: { speed: 1.3, depth: [0.3, 0.92], school: 'guppy' },
  },
  neon: {
    h: 0.12, wr: 0.52, peak: 0.52, k: 0.75, ped: 0.35, flat: 0.02, zT: -0.3,
    back: 0x646f58, belly: 0xf0f0ec, cs: [0.3, 0.6], stripe: 0x1ec8ff, red: 0xe41e28, gill: 0.8, rough: 0.25, metal: 0.3, irid: 0.5, scale: [4, 2],
    eye: 0.05, eyeT: 0.86, eyeA: 1.0, iris: 0x7ab0d0,
    fin: { color: 0xdfe6e6, tip: 0xf4f8f8, opacity: 0.3, dorsal: { t: [0.36, 0.48], h: 0.1 }, anal: { t: [0.12, 0.36], h: 0.07 },
      tail: { len: 0.22, span: 0.14, kind: 'fork', fork: 0.55 }, pect: 0.06 },
    amp: 0.07, swim: { speed: 1.5, depth: [0.3, 0.75], school: 'neon' },
  },
  angel: {
    h: 0.3, wr: 0.28, peak: 0.52, k: 0.6, ped: 0.3, flat: 0, zT: -0.22,
    back: 0xcfcdc2, belly: 0xefeee6, cs: [0.2, 0.7], bars: [0.28, 0.56, 0.84], gill: 0.76, rough: 0.3, metal: 0.4, irid: 0.3, scale: [3.5, 2],
    eye: 0.05, eyeT: 0.86, eyeA: 1.25, iris: 0xc03020,
    fin: { color: 0xd4d2c8, tip: 0xf5f5f0, opacity: 0.6, dorsal: { t: [0.1, 0.56], h: 0.5, sweep: 1.1, shape: 'long' }, anal: { t: [0.1, 0.56], h: 0.52, sweep: 1.0, shape: 'long' },
      tail: { len: 0.22, span: 0.24, kind: 'lyre' }, pect: 0.07, pelvic: 0.42 },
    amp: 0.03, flutter: 0.03, swim: { speed: 0.5, depth: [0.3, 0.8], hover: true },
  },
  arowana: {
    h: 0.085, wr: 0.6, peak: 0.5, k: 0.45, ped: 0.45, flat: 0.55, zT: -0.36,
    back: 0x7f8f96, belly: 0xefe6e4, cs: [0.15, 0.7], gill: 0.8, rough: 0.25, metal: 0.55, scale: [2.6, 1], bump: 1.6,
    eye: 0.03, eyeT: 0.89, eyeA: 0.9, iris: 0xd0b060, barbel: true,
    fin: { color: 0x8c948f, tip: 0xc8b28e, opacity: 0.8, dorsal: { t: [0.04, 0.3], h: 0.07, sweep: 0.6 }, anal: { t: [0.02, 0.4], h: 0.085, sweep: 0.6 },
      tail: { len: 0.14, span: 0.08, kind: 'round' }, pect: 0.07, pelvic: 0.04 },
    amp: 0.045, swim: { speed: 0.35, depth: [0.62, 0.96], cruise: true },
  },
};
LOOK.himedaka = {
  ...LOOK.medaka, back: 0xe98d34, belly: 0xfbe6c4, line: 0xc06a20, iris: 0xd8e4ea,
  fin: { ...LOOK.medaka.fin, color: 0xf0ae68, tip: 0xfbe2c4 },
};

const TAIL_PROFILE = {
  fork: (m, tl) => 1 - tl.fork * Math.pow(m, 1.2),
  lyre: (m) => 1 - 0.55 * Math.pow(m, 0.6),
  fan: (m) => 0.86 + 0.14 * m,
  round: (m) => 0.7 + 0.3 * Math.pow(m, 0.7),
};

// からだの いろ・もよう（t：0 おびれがわ → 1 はなさき、s：0 せなか → 1 おなか）
function paintFn(L, r) {
  const back = new THREE.Color(L.back);
  const belly = new THREE.Color(L.belly);
  const tmp = new THREE.Color();
  const blobs = [];
  if (L.patch && r() > 0.3) {
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) blobs.push({ t: r(), s: r() * 0.9, rad: 0.08 + r() * 0.13 });
  }
  const spots = [];
  if (L.spots) {
    for (let i = 0; i < 8; i++) spots.push({ t: r() * 0.45, s: 0.15 + r() * 0.65, rad: 0.05 + r() * 0.05, c: new THREE.Color(L.spots[i % L.spots.length]) });
  }
  return (t, s, out) => {
    out.copy(back).lerp(belly, smooth(L.cs[0], L.cs[1], s));
    if (blobs.length) {
      let v = 0;
      for (const b of blobs) v = Math.max(v, Math.exp(-((t - b.t) ** 2 + ((s - b.s) * 0.8) ** 2) / (b.rad * b.rad)));
      out.lerp(tmp.set(L.patch), smooth(0.35, 0.62, v));
    }
    for (const b of spots) {
      const d = ((t - b.t) ** 2 + ((s - b.s) * 0.7) ** 2) / (b.rad * b.rad);
      if (d < 1) out.lerp(b.c, smooth(1, 0.35, d));
    }
    if (L.line) out.lerp(tmp.set(L.line), 0.55 * smooth(0.05, 0.015, Math.abs(s - 0.47)) * smooth(0.04, 0.15, t) * smooth(0.9, 0.75, t));
    if (L.stripe) out.lerp(tmp.set(L.stripe), smooth(0.07, 0.025, Math.abs(s - 0.36)) * smooth(0.18, 0.3, t) * smooth(0.95, 0.84, t));
    if (L.red) out.lerp(tmp.set(L.red), 0.95 * smooth(0.42, 0.5, s) * smooth(0.92, 0.78, s) * smooth(0.6, 0.45, t));
    if (L.bars) for (const bt of L.bars) out.lerp(tmp.set(0x1b1b1b), 0.88 * smooth(0.034, 0.018, Math.abs(t - bt)));
    if (L.gill) out.multiplyScalar(1 - 0.3 * smooth(0.013, 0.004, Math.abs(t - L.gill)) * smooth(0.1, 0.25, s) * smooth(0.92, 0.78, s));
    return out;
  };
}

// およぐ ときに からだを くねらせる（ひれは さきが ひらひら）
function bend(mat, U, fin) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `uniform float uPhase;\nuniform float uAmp;\nuniform float uTurn;\nuniform float uTime;\nuniform float uFlutter;\n${sh.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float bz = clamp(0.62 - position.z, 0.0, 2.0);
      transformed.x += (uAmp * sin(uPhase - bz * 5.0) + uTurn) * bz * bz;
      ${fin ? 'transformed.x += uFlutter * uv.y * uv.y * sin(uTime * 4.0 + position.z * 16.0 + position.y * 11.0);' : ''}`,
    );
  };
  mat.customProgramCacheKey = () => (fin ? 'fish-fin' : 'fish-body');
  return mat;
}

function buildFish(species, seed = 1) {
  const L = LOOK[species] || LOOK.medaka;
  const T = textures();
  const r = rng(seed);
  const U = { uPhase: { value: r() * 6 }, uAmp: { value: L.amp }, uTurn: { value: 0 }, uTime: { value: 0 }, uFlutter: { value: L.flutter ?? 0.018 } };
  const e = Math.log(0.5) / Math.log(L.peak);
  const shape = (t) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, e))), L.k);
  const H = (t) => {
    const q = L.ped * (1 - t) ** 2;
    return L.h * (q + (1 - q) * shape(t));
  };
  const Wd = (t) => H(t) * L.wr;
  const Yc = (t) => -L.flat * H(t);
  const Z = (t) => L.zT + t * (0.5 - L.zT);
  const top = (t) => Yc(t) + H(t);
  const bot = (t) => Yc(t) - H(t);
  const paint = paintFn(L, r);
  const g = new THREE.Group();

  // からだ：わぎりを ならべた かたち。うろこ・いろは ちょうてんごとに
  const N = 44;
  const M = 28;
  const ts = [0];
  for (let i = 0; i <= N; i++) ts.push(1 - Math.pow(1 - i / N, 1.25));
  const pos = [];
  const uv = [];
  const cols = [];
  const idx = [];
  const c = new THREE.Color();
  ts.forEach((t, i) => {
    const h = i === 0 ? 0 : H(t);
    const w = i === 0 ? 0 : Wd(t);
    for (let j = 0; j <= M; j++) {
      const a = (j / M) * Math.PI * 2;
      pos.push(w * Math.sin(a), Yc(t) + h * Math.cos(a), Z(t));
      uv.push(t * L.scale[0], (j / M) * L.scale[1] * 2);
      paint(t, (1 - Math.cos(a)) / 2, c);
      cols.push(c.r, c.g, c.b);
    }
  });
  for (let i = 0; i < ts.length - 1; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j;
      const b = a + M + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // せなかの つなぎめを なめらかに
  const nrm = geo.attributes.normal;
  const nv = new THREE.Vector3();
  for (let i = 0; i < ts.length; i++) {
    const a = i * (M + 1);
    const b = a + M;
    nv.set(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, nv.x, nv.y, nv.z);
    nrm.setXYZ(b, nv.x, nv.y, nv.z);
  }
  const bodyMat = bend(new THREE.MeshPhysicalMaterial({
    vertexColors: true, map: T.scale, bumpMap: T.scale, bumpScale: L.bump ?? 0.6,
    roughness: L.rough ?? 0.35, metalness: L.metal ?? 0.15, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 1,
    iridescence: L.irid ?? 0, iridescenceIOR: 1.5, iridescenceThicknessRange: [200, 600],
  }), U, false);
  const body = new THREE.Mesh(geo, bodyMat);
  g.add(body);

  // ひれ：ぜんぶ 1つの かたちに まとめる（ねもと base(s) から さき edge(s) へ。uv.y＝ねもと 0 → さき 1）
  const finCol = new THREE.Color(L.fin.color);
  const tipCol = new THREE.Color(L.fin.tip ?? L.fin.color);
  const fp = [];
  const fu = [];
  const fc = [];
  const fi = [];
  const addFin = (base, edge, curve, n = 14, m = 7, rays = 1.5) => {
    const off = fp.length / 3;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const b = base(s);
      const ed = edge(s);
      const cv = curve ? curve(s) : [0, 0, 0];
      for (let j = 0; j <= m; j++) {
        const q = j / m;
        fp.push(lerp(b[0], ed[0], q) + cv[0] * q * q, lerp(b[1], ed[1], q) + cv[1] * q * q, lerp(b[2], ed[2], q) + cv[2] * q * q);
        fu.push(s * rays, q);
        c.copy(finCol).lerp(tipCol, q);
        fc.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        const a = off + i * (m + 1) + j;
        const b = a + m + 1;
        fi.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  };
  const finShape = (s, sh) => (sh === 'long'
    ? Math.pow(Math.sin(Math.PI * (0.02 + s * 0.98)), 0.35) * (0.5 + 0.5 * s)
    : Math.pow(Math.sin(Math.PI * s), 0.5) * (0.6 + 0.4 * s));
  const F = L.fin;
  if (F.dorsal) {
    const d = F.dorsal;
    addFin(
      (s) => { const tt = lerp(d.t[0], d.t[1], s); return [0, top(tt) - 0.004, Z(tt)]; },
      (s) => { const tt = lerp(d.t[0], d.t[1], s); const f = finShape(s, d.shape) * d.h; return [0, top(tt) + f, Z(tt) - f * (d.sweep ?? 0.35)]; },
    );
  }
  if (F.anal) {
    const d = F.anal;
    addFin(
      (s) => { const tt = lerp(d.t[0], d.t[1], s); return [0, bot(tt) + 0.004, Z(tt)]; },
      (s) => { const tt = lerp(d.t[0], d.t[1], s); const f = finShape(s, d.shape) * d.h; return [0, bot(tt) - f, Z(tt) - f * (d.sweep ?? 0.35)]; },
    );
  }
  const tl = F.tail;
  const prof = TAIL_PROFILE[tl.kind] || TAIL_PROFILE.round;
  for (const side of tl.split ? [1, -1] : [0]) {
    addFin(
      (s) => [0, lerp(bot(0.03), top(0.03), s), Z(0.03)],
      (s) => [0, Yc(0) + lerp(-tl.span, tl.span, s), L.zT - tl.len * prof(Math.sin(Math.PI * s), tl)],
      () => [side * (tl.split || 0), -(tl.droop || 0), 0], 18, 9, 2.5,
    );
  }
  // むなびれ（えらの うしろ）・はらびれ
  if (F.pect) {
    const tp = 0.74;
    const a = 1.95;
    const ps = F.pect;
    for (const side of [1, -1]) {
      const bx = side * Wd(tp) * Math.sin(a);
      const by = Yc(tp) + H(tp) * Math.cos(a);
      addFin(
        (s) => [bx, by + lerp(-0.012, 0.012, s), Z(tp) - s * 0.01],
        (s) => [bx + side * ps * 0.45, by - ps * 0.3 + lerp(-0.25, 0.25, s) * ps, Z(tp) - ps * (0.7 + 0.3 * Math.sin(Math.PI * s))],
        null, 6, 5, 1,
      );
    }
  }
  if (F.pelvic) {
    const tp = 0.5;
    const ps = F.pelvic;
    const long = ps > 0.12;
    for (const side of [1, -1]) {
      const a = 2.7;
      const bx = side * Wd(tp) * Math.sin(a);
      const by = Yc(tp) + H(tp) * Math.cos(a);
      addFin(
        (s) => [bx, by, Z(tp) - s * 0.03],
        (s) => [bx + side * 0.02, by - ps * (long ? 1 : 0.6) * (1 - 0.6 * s), Z(tp) - ps * (long ? 0.35 : 0.7) - s * 0.03],
        null, 4, long ? 8 : 4, 1,
      );
    }
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  fgeo.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2));
  fgeo.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
  fgeo.setIndex(fi);
  fgeo.computeVertexNormals();
  const finMat = bend(new THREE.MeshStandardMaterial({
    vertexColors: true, map: T.fin, transparent: true, opacity: F.opacity, side: THREE.DoubleSide, depthWrite: false,
    roughness: 0.45, metalness: 0.05, envMapIntensity: 0.8,
  }), U, true);
  const fins = new THREE.Mesh(fgeo, finMat);
  fins.renderOrder = 2;
  g.add(fins);

  // め（きんぞくの ような こうさい と、つやつやの くろめ）・くち
  const sphere = new THREE.SphereGeometry(1, 18, 12);
  const irisParts = [];
  const darkParts = [];
  const er = L.eye;
  for (const side of [1, -1]) {
    const p = V(side * Wd(L.eyeT) * Math.sin(L.eyeA), Yc(L.eyeT) + H(L.eyeT) * Math.cos(L.eyeA), Z(L.eyeT));
    irisParts.push(placed(sphere, p.clone().add(V(-side * er * 0.14, 0, 0)), V(er * 0.32, er, er)));
    darkParts.push(placed(sphere, p.clone().add(V(side * er * 0.04, 0, 0.002)), V(er * 0.28, er * 0.58, er * 0.58)));
  }
  darkParts.push(placed(sphere, V(0, Yc(0.99) + 0.004, 0.498), V(0.014, 0.007, 0.01)));
  if (L.barbel) {
    // アロワナ：うえむきの おおきな くち と、あごの ひげ
    const seam = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 5);
    const a0 = V(0, top(0.995), 0.5);
    const a1 = V(0, Yc(0.9) - H(0.9) * 0.4, 0.44);
    for (const side of [1, -1]) {
      const s0 = a0.clone().add(V(side * 0.004, 0, 0));
      const s1 = a1.clone().add(V(side * Wd(0.9) * 0.7, 0, 0));
      const mid = s0.clone().add(s1).multiplyScalar(0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), s1.clone().sub(s0).normalize());
      darkParts.push(seam.clone().applyMatrix4(new THREE.Matrix4().compose(mid, q, V(1, s0.distanceTo(s1), 1))));
      const b0 = V(side * 0.006, bot(0.97) + 0.004, 0.485);
      const b1 = V(side * 0.014, bot(0.97) + 0.03, 0.56);
      const bm = b0.clone().add(b1).multiplyScalar(0.5);
      const bq = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b1.clone().sub(b0).normalize());
      darkParts.push(new THREE.CylinderGeometry(0.0015, 0.004, 1, 5).applyMatrix4(new THREE.Matrix4().compose(bm, bq, V(1, b0.distanceTo(b1), 1))));
    }
  }
  const iris = new THREE.Mesh(mergeGeos(irisParts), new THREE.MeshStandardMaterial({ color: L.iris, roughness: 0.25, metalness: 0.75, envMapIntensity: 1.3 }));
  const dark = new THREE.Mesh(mergeGeos(darkParts), new THREE.MeshPhysicalMaterial({ color: 0x060606, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }));
  g.add(iris, dark);
  sphere.dispose();
  return { group: g, U, L, body };
}

// ---------- すいそうの なかの もの ----------

// みずくさの ゆれ（インスタンスごとに ずらす）
function swayMat(mat, U) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = `uniform float uTime;\n${sh.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec3 ip = vec3(0.0);
      #ifdef USE_INSTANCING
        ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #endif
      float yy = position.y * position.y;
      transformed.x += sin(uTime * 1.1 + ip.x * 0.35 + ip.z * 0.25 + position.y * 1.8) * yy * 0.13;
      transformed.z += cos(uTime * 0.9 + ip.x * 0.2 + position.y * 1.4) * yy * 0.06;`,
    );
  };
  mat.customProgramCacheKey = () => 'sway';
  return mat;
}

// バリスネリア（ほそながい リボンの みずくさ）
function vallis(n, height, radius, U, r) {
  const geo = new THREE.PlaneGeometry(0.07, 1, 1, 12);
  geo.translate(0, 0.5, 0);
  const p = geo.attributes.position;
  const cols = [];
  const lo = new THREE.Color(0x24591f);
  const hi = new THREE.Color(0x86c451);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) * (1 - Math.pow(y, 3) * 0.75));
    p.setZ(i, Math.sin(y * 3) * 0.02);
    c.copy(lo).lerp(hi, y);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const mat = swayMat(std(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 0.55 }), U);
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * radius;
    const h = height * (0.55 + 0.5 * r());
    m.compose(V(Math.cos(a) * d, 0, Math.sin(a) * d),
      new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.3, r() * Math.PI, (r() - 0.5) * 0.3)), V(h, h, h));
    mesh.setMatrixAt(i, m);
  }
  return mesh;
}

// くきに はっぱが ならぶ みずくさ（アナカリス）。くきごとに すこし ゆれる
function stemPlant(nStems, height, radius, r) {
  const g = new THREE.Group();
  const stemMat = std(0x3f7a30, { roughness: 0.7 });
  const leafGeo = new THREE.PlaneGeometry(0.3, 1.1);
  leafGeo.translate(0, 0.55, 0);
  const leafMat = std(0x4f9a38, { side: THREE.DoubleSide, roughness: 0.55 });
  const q = new THREE.Quaternion();
  const m = new THREE.Matrix4();
  for (let s = 0; s < nStems; s++) {
    const sg = new THREE.Group();
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * radius;
    sg.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    const h = height * (0.6 + 0.45 * r());
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, h, 5), stemMat);
    stem.position.y = h / 2;
    sg.add(stem);
    const nodes = Math.max(6, Math.round(h / 0.7));
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, nodes * 4);
    let k = 0;
    for (let i = 0; i < nodes; i++) {
      const y = ((i + 0.6) / nodes) * h;
      const sz = 0.7 + 0.5 * Math.sin((i / nodes) * Math.PI) - (i / nodes) * 0.4;
      for (let j = 0; j < 4; j++) {
        q.setFromEuler(new THREE.Euler(0.95, (j / 4) * Math.PI * 2 + i * 0.5, 0, 'YXZ'));
        m.compose(V(0, y, 0), q, V(sz, sz, sz));
        leaves.setMatrixAt(k++, m);
      }
    }
    sg.add(leaves);
    sg.userData.phase = r() * 6;
    g.add(sg);
  }
  g.userData.stems = g.children;
  return g;
}

function rockGeo(r) {
  const geo = new THREE.SphereGeometry(1, 14, 10);
  const p = geo.attributes.position;
  const s = [r() * 6, r() * 6, r() * 6];
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.2 * Math.sin(v.x * 2.3 + s[0]) * Math.sin(v.y * 2.1 + s[1]) * Math.sin(v.z * 2.7 + s[2]) + 0.06 * Math.sin(v.x * 7 + v.z * 5);
    v.multiplyScalar(n);
    v.y = Math.max(v.y, -0.3);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// ふとさが かわる まがった つつ（りゅうぼく・まきがい）
function taper(material, points, r0, r1, seg = 16, radial = 8) {
  const path = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(path, seg, 1, radial, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    path.getPointAt(i / seg, c);
    const rr = r0 + (r1 - r0) * (i / seg);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(rr).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

// おきもの（ねもとが じめん。k：すいそうの おおきさで かわる ばいりつ、depth：みずの ふかさ）
const DECOR_3D = {
  kusa({ depth, k, U, r }) {
    const g = new THREE.Group();
    g.add(vallis(16, depth * 0.85, 1.6 * k, U, r));
    const st = stemPlant(4, depth * 0.62, 1.4 * k, r);
    st.position.x = 2.2 * k;
    g.add(st);
    g.userData.stems = st.userData.stems;
    return g;
  },
  ishi({ k, r }) {
    const g = new THREE.Group();
    const cols = [0x8a8780, 0x6f6a62, 0x9d968a];
    [[0, 0, 2.6], [2.6, 0.8, 1.7], [-2.2, 1, 1.4], [0.8, -1.8, 1.0]].forEach(([x, z, s], i) => {
      const m = new THREE.Mesh(rockGeo(r), std(cols[i % 3], { roughness: 0.85 }));
      m.scale.set(s * k, s * k * (0.6 + r() * 0.3), s * k * (0.8 + r() * 0.3));
      m.rotation.y = r() * 6;
      m.position.set(x * k, 0, z * k);
      g.add(m);
    });
    return g;
  },
  ryuboku({ k }) {
    const g = new THREE.Group();
    const bark = std(0x5a4030, { roughness: 0.9 });
    g.add(taper(bark, [V(-6, 0.3, 0.5), V(-2, 1.2, 0), V(2, 2.6, -0.4), V(5, 4.8, 0.3)], 0.9, 0.3));
    g.add(taper(bark, [V(-1.5, 1.3, 0.1), V(-2.4, 4.5, 0.8), V(-3.8, 7.5, 0.3)], 0.5, 0.12));
    g.add(taper(bark, [V(2, 2.6, -0.4), V(3.8, 3.8, -1.6), V(6.2, 4.6, -2.2)], 0.4, 0.1));
    g.add(taper(bark, [V(-4, 0.8, 0.3), V(-6.5, 2.2, 1.5), V(-8, 2.4, 2.8)], 0.35, 0.1));
    g.scale.setScalar(k);
    return g;
  },
  kai({ k, r }) {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 24, 8, 0, Math.PI, 0, Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const rib = 1 + 0.07 * Math.abs(Math.sin(Math.atan2(z, x) * 11));
      p.setXYZ(i, x * rib, p.getY(i) * 0.4, z * rib);
    }
    geo.computeVertexNormals();
    const shell = std(0xf2d6c4, { roughness: 0.45, side: THREE.DoubleSide });
    [[0, 0, 1.4, 0.3], [2.2, 1.2, 1, 2]].forEach(([x, z, s, ry]) => {
      const m = new THREE.Mesh(geo, shell);
      m.scale.setScalar(s * k);
      m.rotation.y = ry;
      m.position.set(x * k, 0.05, z * k);
      g.add(m);
    });
    // まきがい
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = i * 0.55;
      const rr = 0.9 * (1 - i / 26);
      pts.push(V(Math.cos(a) * rr, 0.5 + i * 0.1, Math.sin(a) * rr));
    }
    const conch = taper(std(0xe8c9a0, { roughness: 0.4 }), pts, 0.7, 0.05, 40, 10);
    conch.rotation.z = 1.35;
    conch.scale.setScalar(k);
    conch.position.set(-2 * k, 0.6 * k, 0.8 * k);
    g.add(conch);
    g.rotation.y = r() * 6;
    return g;
  },
  shiro({ k }) {
    const g = new THREE.Group();
    const stone = std(0x9a8e7a, { roughness: 0.9 });
    const roof = std(0xa6402c, { roughness: 0.6 });
    const dark = std(0x1c140e, { roughness: 1 });
    const main = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 4), stone);
    main.position.y = 2.5;
    g.add(main);
    for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 7, 12), stone);
      tw.position.set(x, 3.5, z);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 12), roof);
      cone.position.set(x, 8.3, z);
      g.add(tw, cone);
    }
    for (let i = 0; i < 5; i++) {
      for (const z of [-1.8, 1.8]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), stone);
        b.position.set(-1.8 + i * 0.9, 5.35, z);
        g.add(b);
      }
    }
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16, 1, false, 0, Math.PI), dark);
    door.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    door.position.set(0, 1.9, 2.02);
    const doorLow = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.9, 0.3), dark);
    doorLow.position.set(0, 0.95, 2.02);
    g.add(door, doorLow);
    for (const x of [-3, 3]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.2), dark);
      w.position.set(x, 5, 2.2);
      g.add(w);
    }
    g.scale.setScalar(k * 0.9);
    return g;
  },
  fune({ k }) {
    const g = new THREE.Group();
    const wood = std(0x6a4a2e, { roughness: 0.85 });
    const dark = std(0x1a120c, { roughness: 1 });
    const s = new THREE.Shape();
    s.moveTo(-7, 1.5);
    s.lineTo(7, 1.8);
    s.quadraticCurveTo(7.4, 0, 5, -1.6);
    s.lineTo(-5, -1.6);
    s.quadraticCurveTo(-7.2, -1, -7, 1.5);
    const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 3.4, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 2 }), wood);
    hull.position.z = -1.7;
    g.add(hull);
    for (const x of [-3, 0, 3]) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 10), dark);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(x, 0.4, 2.05);
      g.add(hole);
    }
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), wood);
    cabin.position.set(-4.5, 2.8, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 5.5, 8), wood);
    mast.position.set(1.5, 4, 0);
    mast.rotation.z = -0.35;
    g.add(cabin, mast);
    g.rotation.set(0, 0.35, 0.22);
    g.position.y = 0.6 * k;
    g.scale.setScalar(k * 0.75);
    const wrap = new THREE.Group();
    wrap.add(g);
    return wrap;
  },
};

// あわ（エアポンプ・フィルターの ふきだし）
function bubbleSystem(count, origin, topY, spread, size) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.02, metalness: 0.2, envMapIntensity: 2, depthWrite: false });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), mat, count);
  mesh.renderOrder = 3;
  const st = Array.from({ length: count }, (_, i) => ({ y: origin.y + (i / count) * (topY - origin.y), sp: 6 + Math.random() * 5, ph: Math.random() * 6, s: size * (0.5 + Math.random() * 0.8) }));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const update = (dt, t) => {
    st.forEach((b, i) => {
      b.y += b.sp * dt;
      if (b.y > topY) b.y = origin.y;
      const rise = (b.y - origin.y) / Math.max(1, topY - origin.y);
      const x = origin.x + Math.sin(t * 3 + b.ph) * spread * (0.3 + rise);
      const z = origin.z + Math.cos(t * 2.6 + b.ph) * spread * 0.6 * (0.3 + rise);
      const s = b.s * (0.7 + rise * 0.6);
      m.compose(V(x, b.y, z), q, V(s, s, s));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0, 0);
  return { mesh, update };
}

// じゃり（つぶを たくさん ならべる）
function pebbles(count, place, colors, size, r, shiny = false) {
  const mat = shiny
    ? new THREE.MeshPhysicalMaterial({ roughness: 0.1, clearcoat: 1, envMapIntensity: 1.2 })
    : std(0xffffff, { roughness: 0.85 });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), mat, count);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const p = place(r);
    const s = size * (0.55 + r() * 0.7);
    m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), V(s * (0.9 + r() * 0.4), s * (0.6 + r() * 0.3), s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(colors[Math.floor(r() * colors.length)]).multiplyScalar(0.8 + r() * 0.35));
  }
  return mesh;
}

// ---------- すいそう ----------
// どれも { group, region, floorY, waterTop, waterMat, surfaceMat, caustics, slotPos(i, n) } を かえす
// region：さかなが およげる ところ

function waterMaterials(T, repeat) {
  const waterMat = new THREE.MeshBasicMaterial({ color: 0x7cc8f0, transparent: true, opacity: 0.1, depthWrite: false });
  const n = T.waterN.clone();
  n.needsUpdate = true;
  n.repeat.set(repeat, repeat);
  const surfaceMat = new THREE.MeshStandardMaterial({
    color: 0xd6f2ff, transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0.1, normalMap: n,
    envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
  });
  return { waterMat, surfaceMat };
}

function causticLayer(T, geo, repeat, y) {
  const list = [];
  for (let i = 0; i < 2; i++) {
    const tex = T.caustic.clone();
    tex.needsUpdate = true;
    tex.repeat.set(repeat * (i ? 1.3 : 1), repeat * (i ? 1.3 : 1));
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x9fdcff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y + i * 0.02;
    mesh.renderOrder = 1;
    list.push(mesh);
  }
  return list;
}

function buildBoxTank(dims, level, r, slots = 1) {
  const T = textures();
  const [w, d, h] = dims;
  const g = new THREE.Group();
  // きの だい
  const wood = T.wood.clone();
  wood.needsUpdate = true;
  wood.repeat.set((w + 8) / 40, 0.5);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 8, 3, d + 8), std(0xffffff, { map: wood, roughness: 0.6 }));
  top.position.y = -1.5;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(w + 6, 40, d + 6), std(0x5c3f28, { roughness: 0.8 }));
  cab.position.y = -23;
  g.add(top, cab);
  // うしろの スクリーン
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: T.back }));
  back.position.set(0, h / 2, -d / 2 - 0.2);
  g.add(back);
  // じゃり：おくが たかい
  const gh = 1.8 + level * 0.4;
  const floorY = (x, z) => gh * (1 - (z / d) * 0.9) + Math.sin(x * 0.4) * 0.15;
  const gravel = new THREE.BoxGeometry(w - 0.8, 1, d - 0.8, 16, 1, 8);
  const gp = gravel.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const z = gp.getZ(i);
    gp.setY(i, gp.getY(i) > 0 ? floorY(x, z) : 0.05);
  }
  gravel.computeVertexNormals();
  const grit = T.grit.clone();
  grit.needsUpdate = true;
  grit.repeat.set(w / 10, d / 10);
  g.add(new THREE.Mesh(gravel, std(0xffffff, { map: grit, roughness: 0.95 })));
  const area = w * d;
  const size = clamp(Math.sqrt(area / 2600) * 0.9, 0.45, 1.1);
  g.add(pebbles(Math.min(2600, Math.round(area / (size * size * 2.2))), (rr) => {
    const x = (rr() - 0.5) * (w - 1.4);
    const z = (rr() - 0.5) * (d - 1.4);
    return V(x, floorY(x, z) - size * 0.2, z);
  }, [0xb09c7c, 0x857560, 0x6a625a, 0xc4b69c, 0x4f4842], size, r));
  // みず
  const wt = h - 2.2;
  const { waterMat, surfaceMat } = waterMaterials(T, w / 18);
  const vol = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, wt - 0.4, d - 0.6), waterMat);
  vol.position.y = (wt - 0.4) / 2 + 0.2;
  vol.renderOrder = 3;
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, d - 0.6), surfaceMat);
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = wt;
  surf.renderOrder = 4;
  g.add(vol, surf);
  const cgeo = new THREE.PlaneGeometry(w - 1, d - 1, 8, 4);
  cgeo.rotateX(-Math.PI / 2);
  const cp = cgeo.attributes.position;
  for (let i = 0; i < cp.count; i++) cp.setY(i, floorY(cp.getX(i), cp.getZ(i)) + 0.35);
  const caustics = causticLayer(T, cgeo, w / 14, 0);
  caustics.forEach((m) => g.add(m));
  // ガラスと わく
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhysicalMaterial({
    color: 0xeaf6ff, transparent: true, opacity: 0.12, roughness: 0.03, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide,
  }));
  glass.position.y = h / 2;
  glass.renderOrder = 5;
  g.add(glass);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: 0x9cc6d8 }));
  edges.position.y = h / 2;
  g.add(edges);
  const frame = std(0x1b1e21, { roughness: 0.4 });
  for (const y of [0.4, h - 0.4]) {
    for (const [fw, fd, x, z] of [[w + 0.4, 0.8, 0, d / 2], [w + 0.4, 0.8, 0, -d / 2], [0.8, d, w / 2, 0], [0.8, d, -w / 2, 0]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.8, fd), frame);
      b.position.set(x, y, z);
      g.add(b);
    }
  }
  // ライト（ふたの うえ）
  const lampBody = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 1.2, 6), std(0x2a2d31, { roughness: 0.35, metalness: 0.4 }));
  lampBody.position.set(0, h + 1.8, -d * 0.1);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, 4), new THREE.MeshBasicMaterial({ color: 0xf4fbff }));
  led.rotation.x = Math.PI / 2;
  led.position.set(0, h + 1.18, -d * 0.1);
  g.add(lampBody, led);
  for (const x of [-w * 0.43, w * 0.43]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 5), std(0x2a2d31, { roughness: 0.4 }));
    leg.position.set(x, h + 0.6, -d * 0.1);
    g.add(leg);
  }
  const region = { kind: 'box', xMin: -w / 2 + 0.8, xMax: w / 2 - 0.8, zMin: -d / 2 + 0.8, zMax: d / 2 - 0.8, yMin: gh * 1.9 + 0.3, yMax: wt };
  return {
    group: g, region, floorY, waterTop: wt, waterMat, surfaceMat, caustics, dims,
    slotPos: (i, n) => V(-w / 2 + (i + 0.5) * (w / n), 0, -d / 2 + Math.min(d * 0.3, 7)),
    scale: clamp(Math.min(h / 24, w / slots / 12), 0.6, 2.2),
    equipAt: { pump: V(-w / 2 + 2.5, 0, -d / 2 + 2.5), filter: V(w / 2 - 6, 0, -d / 2), heater: V(-w * 0.15, 0, -d / 2 + 1.4) },
    size: [w, d, h],
  };
}

function buildBasin(dims, r) {
  const T = textures();
  const [D, , h] = dims;
  const R = D / 2;
  const rb = R * 0.74;
  const rAt = (y) => lerp(rb, R, y / h);
  const g = new THREE.Group();
  // えんがわの いたの ゆか
  const wood = T.wood.clone();
  wood.needsUpdate = true;
  wood.repeat.set(3, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(D * 4, D * 4), std(0xffffff, { map: wood, roughness: 0.75 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  g.add(floor);
  // せんめんき（プラスチック）
  const pts = [
    [0, 0], [rb + 0.35, 0], [R + 0.35, h], [R + 1.2, h + 0.15], [R + 1.45, h + 0.7], [R + 0.8, h + 1.0], [R, h + 0.55],
    [rAt(h * 0.5), h * 0.5], [rb, 0.55], [0, 0.55],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const basin = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshPhysicalMaterial({ color: 0x74b9e2, roughness: 0.42, clearcoat: 0.35, envMapIntensity: 0.8, side: THREE.DoubleSide }));
  g.add(basin);
  // あかだまつち
  const gy = 1.4;
  const base = new THREE.Mesh(new THREE.CircleGeometry(rAt(gy), 40), std(0x3a2418, { roughness: 1 }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = gy - 0.35;
  g.add(base);
  g.add(pebbles(1100, (rr) => {
    const a = rr() * Math.PI * 2;
    const d = Math.sqrt(rr()) * (rAt(gy) - 0.4);
    return V(Math.cos(a) * d, gy - 0.4 + rr() * 0.2, Math.sin(a) * d);
  }, [0x5a3420, 0x4a2a1a, 0x6a3e24, 0x3a2216], 0.36, r));
  const floorY = () => gy;
  const wt = h * 0.8;
  const { waterMat, surfaceMat } = waterMaterials(T, 1.5);
  const vol = new THREE.Mesh(new THREE.CylinderGeometry(rAt(wt) - 0.1, rAt(0.6) - 0.1, wt - 0.75, 48), waterMat);
  vol.position.y = (wt - 0.75) / 2 + 0.6;
  vol.renderOrder = 3;
  const surf = new THREE.Mesh(new THREE.CircleGeometry(rAt(wt) - 0.05, 48), surfaceMat);
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = wt;
  surf.renderOrder = 4;
  g.add(vol, surf);
  const cgeo = new THREE.CircleGeometry(rAt(gy) - 0.3, 32);
  cgeo.rotateX(-Math.PI / 2);
  const caustics = causticLayer(T, cgeo, 1.8, gy + 0.3);
  caustics.forEach((m) => g.add(m));
  const region = { kind: 'round', rAt: (y) => rAt(y) - 0.6, yMin: gy + 0.4, yMax: wt };
  return {
    group: g, region, floorY, waterTop: wt, waterMat, surfaceMat, caustics, dims,
    slotPos: () => V(-R * 0.35, gy - 0.3, -R * 0.3),
    scale: 0.7, equipAt: {}, size: [D, D, h],
  };
}

function buildBowl(dims, r) {
  const T = textures();
  const [D, , H] = dims;
  const R = D / 2;
  const cy = R * 0.9;
  const rAt = (y) => {
    const q = (y - cy) / R;
    return R * Math.sqrt(Math.max(0, 1 - q * q));
  };
  const g = new THREE.Group();
  // まるい テーブル
  const wood = T.wood.clone();
  wood.needsUpdate = true;
  wood.repeat.set(2, 2);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.9, R * 1.9, 2, 48), std(0xffffff, { map: wood, roughness: 0.55 }));
  table.position.y = -1;
  g.add(table);
  const doily = new THREE.Mesh(new THREE.CircleGeometry(R * 0.85, 40), std(0xf6f1e8, { roughness: 1 }));
  doily.rotation.x = -Math.PI / 2;
  doily.position.y = 0.02;
  g.add(doily);
  // きんぎょばち（ガラス。ふちが ひらく）
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const y = (i / 30) * H;
    pts.push(new THREE.Vector2(Math.max(0.01, rAt(y)), y));
  }
  const rt = rAt(H);
  pts.push(new THREE.Vector2(rt * 1.08, H + 0.8), new THREE.Vector2(rt * 1.2, H + 1.4));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshPhysicalMaterial({
    color: 0xeef8ff, transparent: true, opacity: 0.16, roughness: 0.02, envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide,
  }));
  glass.renderOrder = 5;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rt * 1.2, 0.18, 8, 64), new THREE.MeshPhysicalMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.5, roughness: 0.05 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = H + 1.4;
  g.add(glass, rim);
  // いろの ついた ガラスの じゃり
  const gy = 2.6;
  g.add(pebbles(260, (rr) => {
    const y = rr() * gy;
    const a = rr() * Math.PI * 2;
    const d = Math.sqrt(rr()) * Math.max(0.5, rAt(y) - 0.8);
    return V(Math.cos(a) * d, y, Math.sin(a) * d);
  }, [0x3a86c8, 0x58b36a, 0xf2f2f2, 0x7fd0e8, 0xe8c04a], 0.75, r, true));
  const floorY = () => gy;
  const wt = cy + R * 0.5;
  const { waterMat, surfaceMat } = waterMaterials(T, 1.2);
  const wpts = [];
  for (let i = 0; i <= 24; i++) {
    const y = 0.3 + (i / 24) * (wt - 0.35);
    wpts.push(new THREE.Vector2(Math.max(0.01, rAt(y) - 0.12), y));
  }
  const vol = new THREE.Mesh(new THREE.LatheGeometry(wpts, 48), waterMat);
  vol.renderOrder = 3;
  const surf = new THREE.Mesh(new THREE.CircleGeometry(rAt(wt) - 0.12, 48), surfaceMat);
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = wt;
  surf.renderOrder = 4;
  g.add(vol, surf);
  const cgeo = new THREE.CircleGeometry(rAt(gy) - 0.4, 32);
  cgeo.rotateX(-Math.PI / 2);
  const caustics = causticLayer(T, cgeo, 1.4, gy + 0.2);
  caustics.forEach((m) => g.add(m));
  const region = { kind: 'sphere', cy, R: R - 0.9, yMin: gy + 0.6, yMax: wt };
  return {
    group: g, region, floorY, waterTop: wt, waterMat, surfaceMat, caustics, dims,
    slotPos: () => V(R * 0.25, gy - 0.2, -R * 0.3),
    scale: 0.8, equipAt: {}, size: [D, D, H],
  };
}

// さかなが いける ところ
function makeRegion(spec) {
  const radiusAt = (y) => (spec.kind === 'round' ? spec.rAt(y) : Math.sqrt(Math.max(0, spec.R ** 2 - (y - spec.cy) ** 2)));
  const yRange = (m) => {
    const y0 = spec.yMin + m * 0.5;
    const y1 = spec.yMax - m * 0.5;
    return y0 < y1 ? [y0, y1] : [(spec.yMin + spec.yMax) / 2, (spec.yMin + spec.yMax) / 2];
  };
  const span = (a, b, m) => (a + m < b - m ? [a + m, b - m] : [(a + b) / 2, (a + b) / 2]);
  return {
    ...spec,
    // はみだしたら もどす。もどしたら true
    clamp(p, m) {
      let hit = false;
      const [y0, y1] = yRange(m * 0.6);
      if (p.y < y0) { p.y = y0; hit = true; }
      if (p.y > y1) { p.y = y1; hit = true; }
      if (spec.kind === 'box') {
        const [x0, x1] = span(spec.xMin, spec.xMax, m);
        const [z0, z1] = span(spec.zMin, spec.zMax, m);
        if (p.x < x0 || p.x > x1 || p.z < z0 || p.z > z1) hit = true;
        p.x = clamp(p.x, x0, x1);
        p.z = clamp(p.z, z0, z1);
      } else {
        const rr = Math.max(0.3, radiusAt(p.y) - m);
        const d = Math.hypot(p.x, p.z);
        if (d > rr) {
          p.x *= rr / d;
          p.z *= rr / d;
          hit = true;
        }
      }
      return hit;
    },
    random(d0, d1, m) {
      const [y0, y1] = yRange(m * 0.6);
      const y = lerp(y0, y1, lerp(d0, d1, Math.random()));
      if (spec.kind === 'box') {
        const [x0, x1] = span(spec.xMin, spec.xMax, m);
        const [z0, z1] = span(spec.zMin, spec.zMax, m);
        return V(lerp(x0, x1, Math.random()), y, lerp(z0, z1, Math.random()));
      }
      const rr = Math.max(0, radiusAt(y) - m) * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      return V(Math.cos(a) * rr, y, Math.sin(a) * rr);
    },
  };
}

// ---------- きぐ ----------

function buildPump(tank, U) {
  const g = new THREE.Group();
  const at = tank.equipAt.pump;
  const [w, d, h] = tank.size;
  const fy = tank.floorY(at.x, at.z);
  const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 1.4, 14), std(0x9a9da0, { roughness: 1 }));
  stone.position.set(at.x, fy + 0.5, at.z);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    V(at.x, fy + 1.2, at.z), V(at.x - 0.6, h * 0.6, -d / 2 + 0.8), V(at.x - 0.6, h + 0.6, -d / 2 + 0.6),
    V(at.x - 0.6, h + 1.2, -d / 2 - 1.2), V(-w / 2 - 2.5, 2.4, -d / 2 - 2.2),
  ]), 40, 0.22, 6), std(0xd8e8e0, { transparent: true, opacity: 0.7, roughness: 0.2 }));
  const box = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 2.6), std(0x3b6ea5, { roughness: 0.35 }));
  box.position.set(-w / 2 - 2.5, 1.2, -d / 2 - 2.2);
  g.add(stone, tube, box);
  const bub = bubbleSystem(28, V(at.x, fy + 1.3, at.z), tank.waterTop - 0.1, 0.5, 0.22);
  g.add(bub.mesh);
  return { group: g, update: bub.update };
}

function buildFilter(tank) {
  const g = new THREE.Group();
  const at = tank.equipAt.filter;
  const [, d, h] = tank.size;
  const body = std(0x30343a, { roughness: 0.35, metalness: 0.2 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 5), body);
  box.position.set(at.x, h - 4.5, -d / 2 - 2.8);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.8, 5.4), std(0x4a5058, { roughness: 0.3 }));
  lid.position.set(at.x, h + 1.8, -d / 2 - 2.8);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 3), body);
  lip.position.set(at.x + 1, h - 0.6, -d / 2 + 1.1);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, h - 5, 12), std(0x2a2e33, { roughness: 0.4 }));
  pipe.position.set(at.x - 2.5, (h - 5) / 2 + 4, -d / 2 + 1.2);
  const strainer = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 3, 12), std(0x1f2226, { roughness: 0.8 }));
  strainer.position.set(at.x - 2.5, 4, -d / 2 + 1.2);
  g.add(box, lid, lip, pipe, strainer);
  // おちる みず
  const fallTex = textures().waterN.clone();
  fallTex.needsUpdate = true;
  fallTex.repeat.set(0.5, 2);
  const fallH = h - 0.9 - tank.waterTop;
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(4.2, Math.max(0.4, fallH) + 0.4), new THREE.MeshStandardMaterial({
    color: 0xe8f7ff, transparent: true, opacity: 0.5, roughness: 0.05, normalMap: fallTex, envMapIntensity: 2, depthWrite: false, side: THREE.DoubleSide,
  }));
  fall.position.set(at.x + 1, tank.waterTop + fallH / 2, -d / 2 + 2.65);
  fall.renderOrder = 4;
  g.add(fall);
  const bub = bubbleSystem(14, V(at.x + 1, tank.waterTop - 3, -d / 2 + 2.8), tank.waterTop - 0.1, 1.2, 0.16);
  g.add(bub.mesh);
  return { group: g, update: (dt, t) => { bub.update(dt, t); fallTex.offset.y = -t * 1.5; } };
}

function buildHeater(tank) {
  const g = new THREE.Group();
  const T = textures();
  const at = tank.equipAt.heater;
  const len = Math.min(tank.waterTop * 0.65, 24);
  const y0 = tank.floorY(at.x, at.z) + 2;
  const pivot = new THREE.Group();
  pivot.position.set(at.x, y0, at.z);
  pivot.rotation.z = -0.35;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, len, 16), new THREE.MeshPhysicalMaterial({
    color: 0xe8f6ff, transparent: true, opacity: 0.35, roughness: 0.02, envMapIntensity: 2, depthWrite: false,
  }));
  glass.position.y = len / 2;
  glass.renderOrder = 4;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, len * 0.8, 10), std(0x3a2a20, { roughness: 0.6 }));
  core.position.y = len * 0.45;
  const coilMat = std(0x8a4a20, { emissive: 0xff5a10, emissiveIntensity: 0.6, roughness: 0.5 });
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 6, 20), coilMat);
  const coils = [];
  for (let i = 0; i < 6; i++) {
    const c = coil.clone();
    c.rotation.x = Math.PI / 2;
    c.position.y = len * 0.12 + i * 0.5;
    coils.push(c);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.4, 16), std(0x1d1f22, { roughness: 0.4 }));
  cap.position.y = len + 1;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff7a20 }));
  lamp.position.set(0, len + 1.4, 0.9);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(2.4, 2.4, 1);
  glow.position.copy(lamp.position);
  for (const y of [len * 0.25, len * 0.75]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 0.5, 12), std(0xeef4f0, { transparent: true, opacity: 0.8 }));
    cup.rotation.x = Math.PI / 2;
    cup.position.set(0, y, -1);
    pivot.add(cup);
  }
  pivot.add(glass, core, ...coils, cap, lamp, glow);
  g.add(pivot);
  return { group: g, update: (dt, t) => { glow.material.opacity = 0.55 + 0.45 * Math.sin(t * 2); coilMat.emissiveIntensity = 0.45 + 0.25 * Math.sin(t * 2); } };
}

// ---------- ずかん よう：1ぴきを くるくる まわして みせる ----------

export function createFishViewer(container, { species, seed = 3 }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x4a5a6a, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(2, 5, 3);
  scene.add(sun);
  const model = buildFish(species, seed);
  const turn = new THREE.Group();
  const bb = new THREE.Box3().setFromObject(model.group);
  const size = bb.getSize(new THREE.Vector3()).length();
  model.group.position.sub(bb.getCenter(new THREE.Vector3()));
  turn.add(model.group);
  scene.add(turn);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 50);
  camera.position.set(size * 1.6, size * 0.45, size * 1.6);
  camera.lookAt(0, 0, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2;
  renderer.domElement.addEventListener('pointerdown', () => (controls.autoRotate = false));
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  const clock = new THREE.Clock();
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    model.U.uPhase.value += dt * 5;
    model.U.uAmp.value = model.L.amp * 0.6;
    model.U.uTime.value = clock.elapsedTime;
    controls.update();
    renderer.render(scene, camera);
  };
  loop();
  return {
    snapshot: () => {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/jpeg', 0.85);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      disposeTree(scene);
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// ---------- へや ----------

export function createAquarium(container, { onSelect }) {
  const T = textures();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x5a4a3a, 0.75));
  const lamp = new THREE.DirectionalLight(0xffffff, 1.7);
  lamp.position.set(6, 60, 16);
  scene.add(lamp);
  const fill = new THREE.DirectionalLight(0xcfe6ff, 0.35);
  fill.position.set(-10, 12, 60);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 1200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = 1.5;

  const envU = { uTime: { value: 0 } }; // みずくさの ゆれ
  let tank = null;
  let region = null;
  let spec = null;
  let equip = [];
  let stems = [];
  const actors = new Map();
  const schools = new Map();
  let flakes = [];
  let selected = null;
  let water = { q: 100, shown: 100 };
  const rnd = rng(Date.now() % 100000);

  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.marker, depthTest: false, transparent: true }));
  marker.renderOrder = 10;
  marker.visible = false;
  scene.add(marker);
  const shadowMat = new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, opacity: 0.8 });
  const flakeGeo = new THREE.BoxGeometry(0.4, 0.05, 0.32);
  const flakeMats = [std(0xd8702a, { roughness: 0.8 }), std(0xa8502a, { roughness: 0.8 }), std(0xe8b048, { roughness: 0.8 })];

  // spec：{ shape: 'basin'|'bowl'|'box', dims, level, slots, equip: { pump, filter, heater }, decor: [{ type, slot }], plants }
  function setTank(s) {
    for (const id of [...actors.keys()]) removeActor(id);
    for (const f of flakes) scene.remove(f.mesh);
    flakes = [];
    if (tank) {
      scene.remove(tank.group);
      disposeTree(tank.group);
    }
    spec = s;
    const r = rng(1234);
    tank = s.shape === 'basin' ? buildBasin(s.dims, r) : s.shape === 'bowl' ? buildBowl(s.dims, r) : buildBoxTank(s.dims, s.level, r, s.slots);
    region = makeRegion(tank.region);
    const depth = tank.waterTop - tank.floorY(0, 0);
    stems = [];
    equip = [];
    // きんぎょばちには はじめから みずくさ
    if (s.plants) {
      const p = stemPlant(5, depth * 0.8, 1.6, r);
      p.position.set(-tank.size[0] * 0.12, tank.floorY(0, 0) - 0.4, -tank.size[1] * 0.12);
      tank.group.add(p);
      stems.push(...p.userData.stems);
      const v = vallis(8, depth * 0.7, 1.2, envU, r);
      v.position.set(tank.size[0] * 0.14, tank.floorY(0, 0) - 0.3, -tank.size[1] * 0.18);
      tank.group.add(v);
    }
    for (const d of s.decor || []) {
      const build = DECOR_3D[d.type];
      if (!build) continue;
      const k = tank.scale;
      const obj = build({ depth, k, U: envU, r: rng(77 + d.slot * 13) });
      const p = tank.slotPos(d.slot, s.slots);
      obj.position.set(p.x, s.shape === 'box' ? tank.floorY(p.x, p.z) - 0.3 : p.y, p.z);
      tank.group.add(obj);
      if (obj.userData.stems) stems.push(...obj.userData.stems);
    }
    if (s.shape === 'box') {
      if (s.equip?.pump) equip.push(buildPump(tank, envU));
      if (s.equip?.filter) equip.push(buildFilter(tank));
      if (s.equip?.heater) equip.push(buildHeater(tank));
      for (const e of equip) tank.group.add(e.group);
    }
    scene.add(tank.group);
    applyWater(true);
    fitCamera();
  }

  // ななめ まえから ぜんたいが みえる ように
  function fitCamera() {
    if (!tank) return;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const [w, d, h] = tank.size;
    let dist;
    if (spec.shape === 'basin') {
      dist = Math.max((w * 0.6) / (tanV * camera.aspect), (w * 0.5) / tanV);
      camera.position.set(0, dist * 0.84, dist * 0.55);
      controls.target.set(0, 4, 1);
    } else if (spec.shape === 'bowl') {
      dist = Math.max((w * 0.75) / (tanV * camera.aspect), (h * 0.72) / tanV) + w * 0.3;
      camera.position.set(0, h * 0.62 + dist * 0.2, dist);
      controls.target.set(0, h * 0.45, 0);
    } else {
      dist = Math.max((w * 0.6) / (tanV * camera.aspect), (h * 0.74) / tanV) + d * 0.5;
      camera.position.set(0, h * 0.55 + dist * 0.14, dist);
      controls.target.set(0, h * 0.47, 0);
    }
    controls.minDistance = dist * 0.3;
    controls.maxDistance = dist * 1.6;
    controls.update();
  }

  // みずの よごれ：0（まっくろ）〜 100（きれい）
  const clean = { tint: new THREE.Color(0x7cc8f0), surf: new THREE.Color(0xd6f2ff) };
  const dirty = { tint: new THREE.Color(0x66743a), surf: new THREE.Color(0x98a060) };
  function applyWater(now) {
    if (now) water.shown = water.q;
    if (!tank) return;
    const f = Math.pow(1 - water.shown / 100, 1.2);
    tank.waterMat.color.copy(clean.tint).lerp(dirty.tint, f);
    tank.waterMat.opacity = 0.1 + f * 0.42;
    tank.surfaceMat.color.copy(clean.surf).lerp(dirty.surf, f);
    tank.surfaceMat.opacity = 0.14 + f * 0.45;
    for (const c of tank.caustics) c.material.opacity = 0.14 * (1 - f);
  }
  function setWater(q, now) {
    water.q = q;
    if (now) applyWater(true);
  }

  // ---------- さかな ----------

  const keyOf = (p) => `${p.lengthCm.toFixed(1)}/${p.weak}`;

  function addActor(p) {
    const model = buildFish(p.species, p.seed || 1);
    const g = model.group;
    const L = model.L;
    const len = p.lengthCm;
    g.rotation.order = 'YXZ';
    g.scale.setScalar(len);
    g.position.copy(region.random(L.swim.depth[0], L.swim.depth[1], len * 0.6));
    const yaw = Math.random() * Math.PI * 2;
    g.rotation.y = yaw;
    g.traverse((o) => (o.userData.fishId = p.id));
    scene.add(g);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.5, len * 0.9), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = 1;
    scene.add(shadow);
    const off = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5) * 0.5, (Math.random() - 0.5)).multiplyScalar(len * 3);
    actors.set(p.id, {
      pet: p, model, g, len, L, shadow, yaw, pitch: 0, roll: 0, cur: 0, yawRate: 0, burst: 0, pause: 0, timer: 0, phase: Math.random() * 6,
      target: region.random(L.swim.depth[0], L.swim.depth[1], len * 0.6), offset: off, key: keyOf(p),
    });
  }

  function removeActor(id) {
    const a = actors.get(id);
    if (!a) return;
    scene.remove(a.g);
    scene.remove(a.shadow);
    disposeTree(a.g);
    a.shadow.geometry.dispose();
    actors.delete(id);
    if (selected === id) select(null);
  }

  // list：[{ id, species, lengthCm, seed, weak }]。かわった さかなだけ つくりなおす
  function setFish(list) {
    const ids = new Set(list.map((p) => p.id));
    for (const id of [...actors.keys()]) if (!ids.has(id)) removeActor(id);
    for (const p of list) {
      const a = actors.get(p.id);
      if (a && a.key === keyOf(p)) continue;
      const keep = a ? a.g.position.clone() : null;
      if (a) removeActor(p.id);
      addActor(p);
      if (keep) actors.get(p.id).g.position.copy(keep);
    }
  }

  function select(id) {
    selected = id;
    marker.visible = !!(id && actors.get(id));
  }

  // えさ：すいめんに うかんで、ゆっくり しずむ
  function feed(n) {
    if (!region) return;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(flakeGeo, flakeMats[i % flakeMats.length]);
      const p = region.random(1, 1, 1.2);
      p.y = tank.waterTop - 0.08;
      mesh.position.copy(p);
      mesh.rotation.set(Math.random(), Math.random() * 6, Math.random());
      const s = tank.size[0] > 70 ? 2.2 : 1;
      mesh.scale.setScalar(s);
      scene.add(mesh);
      flakes.push({ mesh, float: 1 + Math.random() * 2.5, ph: Math.random() * 6, life: 30, eaten: false });
    }
  }

  function updateFlakes(dt, t) {
    for (const f of flakes) {
      f.life -= dt;
      const p = f.mesh.position;
      const floor = tank.floorY(p.x, p.z) + 0.15;
      if (f.float > 0) {
        f.float -= dt;
        p.y = tank.waterTop - 0.08 + Math.sin(t * 3 + f.ph) * 0.03;
      } else if (p.y > floor) {
        p.y = Math.max(floor, p.y - dt * 0.9);
        p.x += Math.sin(t * 2 + f.ph) * dt * 0.3;
        f.mesh.rotation.z += dt * 0.8;
      }
    }
    const gone = flakes.filter((f) => f.eaten || f.life <= 0);
    for (const f of gone) scene.remove(f.mesh);
    if (gone.length) flakes = flakes.filter((f) => !f.eaten && f.life > 0);
  }

  const tmp = new THREE.Vector3();
  const goal = new THREE.Vector3();
  const sep = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const mouth = new THREE.Vector3();

  function schoolTarget(a) {
    const key = a.L.swim.school;
    let s = schools.get(key);
    if (!s) {
      s = { target: region.random(a.L.swim.depth[0], a.L.swim.depth[1], a.len * 2), timer: 4 };
      schools.set(key, s);
    }
    return s;
  }

  function step(a, dt, t) {
    const S = a.L.swim;
    const g = a.g;
    const base = S.speed * a.len * (a.pet.weak ? 0.35 : 1);
    mouth.set(Math.sin(a.yaw) * a.len * 0.5, 0, Math.cos(a.yaw) * a.len * 0.5).add(g.position);
    // えさが あれば いちばん ちかい えさへ
    let food = null;
    let best = Infinity;
    for (const f of flakes) {
      const d = f.mesh.position.distanceToSquared(mouth);
      if (d < best) {
        best = d;
        food = f;
      }
    }
    let target;
    let hurry = 1;
    if (food && !a.pet.weak) {
      target = food.mesh.position;
      hurry = 1.6;
      if (Math.sqrt(best) < Math.max(0.6, a.len * 0.3)) food.eaten = true;
    } else if (S.school) {
      const sc = schoolTarget(a);
      target = goal.copy(sc.target).add(a.offset);
      region.clamp(target, a.len * 0.6);
    } else {
      a.timer -= dt;
      if (a.timer <= 0 || g.position.distanceTo(a.target) < a.len * 0.8) {
        if (S.hover && Math.random() < 0.5) a.pause = 1 + Math.random() * 3;
        const low = S.forage && Math.random() < 0.35;
        a.target = region.random(low ? 0 : S.depth[0], low ? 0.1 : S.depth[1], a.len * 0.6);
        a.timer = 3 + Math.random() * 5;
      }
      target = a.target;
    }
    // ほかの さかなに ぶつからない
    sep.set(0, 0, 0);
    for (const b of actors.values()) {
      if (b === a) continue;
      tmp.subVectors(g.position, b.g.position);
      const lim = (a.len + b.len) * 0.42;
      const dd = tmp.length();
      if (dd < lim && dd > 1e-4) sep.addScaledVector(tmp, (lim - dd) / (lim * dd));
    }
    dir.subVectors(target, g.position);
    const dist = dir.length();
    if (dist > 1e-4) dir.multiplyScalar(1 / dist);
    dir.addScaledVector(sep, 1.4);
    const want = Math.atan2(dir.x, dir.z);
    let diff = want - a.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = S.cruise ? 0.9 : 2.4;
    const rate = clamp(diff * 2.5, -turn, turn);
    a.yawRate += (rate - a.yawRate) * Math.min(1, dt * 5);
    a.yaw += a.yawRate * dt;
    const maxPitch = S.cruise ? 0.18 : 0.5;
    const wantPitch = clamp(Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -maxPitch, maxPitch);
    a.pitch += (wantPitch - a.pitch) * Math.min(1, dt * 2);
    // はやさ
    if (S.dart && !food && Math.random() < dt * 0.25) a.burst = 0.4 + Math.random() * 0.4;
    let v = base * hurry;
    if (a.burst > 0) {
      a.burst -= dt;
      v *= 2.4;
    }
    if (a.pause > 0) {
      a.pause -= dt;
      v *= 0.06;
    }
    if (!food && dist < a.len * 1.2) v *= 0.45;
    if (Math.abs(diff) > 1.3) v *= 0.55;
    a.cur += (v - a.cur) * Math.min(1, dt * 2.5);
    const cp = Math.cos(a.pitch);
    g.position.x += Math.sin(a.yaw) * cp * a.cur * dt;
    g.position.z += Math.cos(a.yaw) * cp * a.cur * dt;
    g.position.y += Math.sin(a.pitch) * a.cur * dt;
    if (region.clamp(g.position, a.len * 0.5)) {
      if (!S.school) a.timer = 0;
      else if (Math.random() < dt * 2) schoolTarget(a).timer = 0;
    }
    a.roll += ((a.pet.weak ? 0.5 : 0) - a.yawRate * 0.08 - a.roll) * Math.min(1, dt * 3);
    g.rotation.set(-a.pitch, a.yaw, a.roll);
    // からだの くねり
    const U = a.model.U;
    const effort = Math.min(1.6, a.cur / Math.max(0.01, S.speed * a.len));
    U.uPhase.value += dt * (3 + 8 * effort);
    U.uAmp.value = a.L.amp * (0.3 + 0.7 * Math.min(1.3, effort));
    U.uTurn.value += (clamp(-a.yawRate * 0.035, -0.08, 0.08) - U.uTurn.value) * Math.min(1, dt * 4);
    U.uTime.value = t + a.phase;
    // かげ
    const fy = tank.floorY(g.position.x, g.position.z);
    const hgt = g.position.y - fy;
    a.shadow.position.set(g.position.x, fy + 0.08, g.position.z);
    a.shadow.rotation.z = a.yaw;
    const sc = 1 + hgt * 0.06;
    a.shadow.scale.set(sc, sc, sc);
    a.shadow.visible = spec.shape !== 'bowl';
  }

  function stepSchools(dt) {
    for (const [key, s] of schools) {
      s.timer -= dt;
      const members = [...actors.values()].filter((a) => a.L.swim.school === key);
      if (!members.length) {
        schools.delete(key);
        continue;
      }
      const lead = members[0];
      if (s.timer <= 0 || lead.g.position.distanceTo(s.target) < lead.len * 2) {
        s.target = region.random(lead.L.swim.depth[0], lead.L.swim.depth[1], lead.len * 2);
        s.timer = 4 + Math.random() * 4;
      }
    }
  }

  // タップ（ドラッグでは ない とき）で さかなを えらぶ
  const ray = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
    const rc = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1), camera);
    const hits = ray.intersectObjects([...actors.values()].map((a) => a.model.body), false);
    const id = hits.length ? hits[0].object.userData.fishId : null;
    select(id);
    onSelect(id);
  });

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitCamera();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  function tick(dt, t) {
    envU.uTime.value = t;
    if (!tank) return;
    stepSchools(dt);
    for (const a of actors.values()) step(a, dt, t);
    updateFlakes(dt, t);
    for (const e of equip) e.update(dt, t);
    for (const s of stems) {
      s.rotation.z = Math.sin(t * 0.8 + s.userData.phase) * 0.05;
      s.rotation.x = Math.cos(t * 0.6 + s.userData.phase) * 0.03;
    }
    // みずが だんだん きれいに（または よごれて）みえる
    if (Math.abs(water.shown - water.q) > 0.5) {
      water.shown += (water.q - water.shown) * Math.min(1, dt * 1.5);
      applyWater(false);
    }
    const n = tank.surfaceMat.normalMap;
    n.offset.set(t * 0.012, t * 0.008);
    tank.caustics[0].material.map.offset.set(t * 0.02, t * 0.013);
    tank.caustics[1].material.map.offset.set(-t * 0.015, t * 0.018);
    const s = selected && actors.get(selected);
    if (s) {
      const sz = Math.max(1.4, s.len * 0.35);
      marker.scale.set(sz, sz, 1);
      marker.position.copy(s.g.position).add(V(0, s.len * 0.45 + sz * 0.6 + Math.sin(t * 4) * 0.2, 0));
    }
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    tick(dt, clock.elapsedTime);
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    disposeTree(scene);
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  // たしかめ よう
  let fakeT = 0;
  const advance = (seconds) => {
    for (let i = 0; i < seconds / 0.05; i++) {
      fakeT += 0.05;
      tick(0.05, fakeT);
    }
  };
  const debug = () => [...actors.values()].map((a) => ({
    id: a.pet.id, x: Math.round(a.g.position.x * 10) / 10, y: Math.round(a.g.position.y * 10) / 10, z: Math.round(a.g.position.z * 10) / 10,
  }));
  const lookAt = (id, dist = 2.5, dirv = [1, 0.4, 1.2]) => {
    const a = actors.get(id);
    if (!a) return;
    controls.target.copy(a.g.position);
    camera.position.copy(a.g.position).add(V(...dirv).normalize().multiplyScalar(a.len * dist));
    controls.minDistance = 0.5;
    controls.update();
  };
  const snapshot = () => {
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/jpeg', 0.85);
  };

  return { setTank, setFish, setWater, feed, select, dispose, advance, debug, lookAt, snapshot, fitCamera };
}
