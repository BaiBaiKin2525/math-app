// むしの おへやの 3D（three.js）。しいくケースの なかを むしが あるきまわる。
//   ゆびで ドラッグ：まわす／ピンチ：ズーム／タップ：むしを えらぶ（ダンゴムシは まるくなる）
// たんい は cm。むしの モデルは からだの ながさ 1 で つくって、おおきさに あわせて かくだいする。

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opts });

function ellipsoid(material, sx, sy, sz, pos) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material);
  m.scale.set(sx, sy, sz);
  if (pos) m.position.copy(pos);
  return m;
}

// a から b へ のびる つつ（あし・しょっかく）
function rod(material, a, b, r1, r2 = r1) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, dir.length(), 6), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  return m;
}

// まがった つの・おおあご
function curve(material, points, radius) {
  const path = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(path, 16, radius, 6, false), material);
}

function cone(material, a, b, r) {
  return rod(material, a, b, r, 0.002);
}

// 6 ぽん（または 14 ほん）の あし。pivot を まわして あるく
function addLegs(group, material, { hips, side, len, hipY, thick, spread = [0.25, 0, -0.3] }) {
  const legs = [];
  hips.forEach((z, i) => {
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * side, hipY, z);
      const knee = V(s * len * 0.45, len * 0.12, len * spread[Math.min(i, spread.length - 1)] * 0.4);
      const foot = V(s * len * 0.85, -hipY, len * spread[Math.min(i, spread.length - 1)]);
      pivot.add(rod(material, V(0, 0, 0), knee, thick));
      pivot.add(rod(material, knee, foot, thick, thick * 0.6));
      pivot.userData = { side: s, phase: (i + (s > 0 ? 1 : 0)) % 2 ? Math.PI : 0 };
      group.add(pivot);
      legs.push(pivot);
    }
  });
  return legs;
}

// ---------- むしの モデル ----------

function buildAnt() {
  const g = new THREE.Group();
  const body = std(0x1f1512, { roughness: 0.35 });
  g.add(ellipsoid(body, 0.17, 0.14, 0.22, V(0, 0.22, -0.26)));
  g.add(ellipsoid(body, 0.05, 0.06, 0.05, V(0, 0.2, -0.05)));
  g.add(ellipsoid(body, 0.08, 0.08, 0.16, V(0, 0.22, 0.06)));
  g.add(ellipsoid(body, 0.12, 0.1, 0.12, V(0, 0.24, 0.3)));
  for (const s of [-1, 1]) {
    g.add(rod(body, V(s * 0.05, 0.3, 0.38), V(s * 0.12, 0.38, 0.46), 0.012));
    g.add(rod(body, V(s * 0.12, 0.38, 0.46), V(s * 0.18, 0.3, 0.6), 0.01));
  }
  const legs = addLegs(g, body, { hips: [0.12, 0.06, 0.0], side: 0.06, len: 0.55, hipY: 0.2, thick: 0.014, spread: [0.35, 0, -0.35] });
  return { group: g, legs };
}

function buildDango() {
  const g = new THREE.Group();
  const shell = std(0x5b5f66, { roughness: 0.45 });
  const body = new THREE.Group();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = 0.33 * Math.sin(0.35 + t * 2.4) + 0.05;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    seg.scale.set(w, 0.22 * (0.7 + 0.3 * Math.sin(t * Math.PI)), 0.075);
    seg.position.set(0, 0.03, 0.42 - t * 0.84);
    body.add(seg);
  }
  const pale = std(0xcfc6b8);
  for (const s of [-1, 1]) body.add(rod(pale, V(s * 0.05, 0.06, 0.45), V(s * 0.14, 0.08, 0.58), 0.012));
  g.add(body);
  const legs = addLegs(g, pale, { hips: [0.3, 0.2, 0.1, 0, -0.1, -0.2, -0.3], side: 0.12, len: 0.2, hipY: 0.05, thick: 0.01, spread: [0.1] });
  // まるまった とき
  const ball = new THREE.Group();
  ball.add(ellipsoid(shell, 0.3, 0.3, 0.3, V(0, 0.3, 0)));
  const ringMat = std(0x44474d, { roughness: 0.5 });
  for (let i = -2; i <= 2; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(0.09 - (i * 0.1) ** 2) + 0.003, 0.008, 6, 32), ringMat);
    r.position.set(0, 0.3, i * 0.1);
    ball.add(r);
  }
  ball.visible = false;
  g.add(ball);
  return { group: g, legs, body, ball };
}

const BEETLE_STYLE = {
  kabuto: { color: 0x3a1d12, gloss: 0.35 },
  kokuwa: { color: 0x1a1411, gloss: 0.3, jaw: 0.55 },
  nokogiri: { color: 0x5e2a10, gloss: 0.3, jaw: 1.0, teeth: true },
  miyama: { color: 0x4f3d22, gloss: 0.55, jaw: 0.9, ears: true },
  ookuwa: { color: 0x0c0c0c, gloss: 0.25, jaw: 0.75, thick: true },
  kanabun: { color: 0x2d6e3c, gloss: 0.25, metal: 0.6 },
};

// sizeRatio：0（ちいさい）〜 1（おおきい）。おおきい こほど つの・あごが ながい
function buildBeetle(species, sizeRatio) {
  const st = BEETLE_STYLE[species];
  const g = new THREE.Group();
  const shell = std(st.color, { roughness: st.gloss, metalness: st.metal || 0.15 });
  const dark = std(0x120c09, { roughness: 0.5 });
  g.add(ellipsoid(shell, 0.3, 0.17, 0.36, V(0, 0.25, -0.14)));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.62), dark).translateY(0.415).translateZ(-0.14));
  g.add(ellipsoid(shell, species === 'kanabun' ? 0.27 : 0.26, 0.14, 0.16, V(0, 0.25, 0.26)));
  g.add(ellipsoid(shell, 0.15, 0.09, 0.11, V(0, 0.21, 0.42)));
  for (const s of [-1, 1]) g.add(rod(dark, V(s * 0.1, 0.22, 0.5), V(s * 0.2, 0.26, 0.58), 0.012));

  const k = 0.55 + 0.7 * sizeRatio;
  if (species === 'kabuto') {
    const horn = std(0x2a140c, { roughness: 0.3 });
    const tip = V(0, 0.3 + 0.35 * k, 0.55 + 0.32 * k);
    g.add(curve(horn, [V(0, 0.2, 0.5), V(0, 0.24, 0.5 + 0.18 * k), V(0, 0.3 + 0.2 * k, 0.55 + 0.3 * k), tip], 0.04));
    g.add(cone(horn, tip, tip.clone().add(V(0.06, 0.1, 0.02)), 0.028));
    g.add(cone(horn, tip, tip.clone().add(V(-0.06, 0.1, 0.02)), 0.028));
    g.add(cone(horn, V(0, 0.36, 0.3), V(0, 0.4 + 0.05 * k, 0.42 + 0.1 * k), 0.035));
  } else if (st.jaw) {
    const jaw = std(st.color, { roughness: 0.3, metalness: 0.15 });
    const L = st.jaw * k;
    const r = st.thick ? 0.045 : 0.032;
    for (const s of [-1, 1]) {
      const pts = [V(s * 0.08, 0.21, 0.48), V(s * 0.17, 0.22, 0.5 + 0.18 * L), V(s * 0.16, 0.23, 0.5 + 0.34 * L), V(s * 0.05, 0.22, 0.5 + 0.44 * L)];
      g.add(curve(jaw, pts, r));
      if (st.teeth) for (let i = 1; i <= 3; i++) {
        const p = new THREE.CatmullRomCurve3(pts).getPoint(0.25 * i);
        g.add(cone(jaw, p, p.clone().add(V(-s * 0.05, 0, 0.01)), 0.012));
      }
    }
    if (st.ears) for (const s of [-1, 1]) g.add(ellipsoid(shell, 0.05, 0.05, 0.05, V(s * 0.15, 0.25, 0.44)));
  }
  const legs = addLegs(g, dark, { hips: [0.26, 0.1, -0.06], side: 0.2, len: 0.42, hipY: 0.2, thick: 0.026 });
  return { group: g, legs };
}

function buildLarva() {
  const g = new THREE.Group();
  const skin = std(0xf1e8d2, { roughness: 0.55 });
  const c = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.13, 12, 28, Math.PI * 1.5), skin);
  c.rotation.x = Math.PI / 2;
  c.position.y = 0.1;
  g.add(c);
  const head = std(0xc0772a, { roughness: 0.4 });
  g.add(ellipsoid(head, 0.12, 0.11, 0.11, V(0, 0.12, -0.3)));
  const lines = std(0xd8ccb0);
  for (let i = 1; i < 6; i++) {
    const a = (Math.PI * 1.5 * i) / 6;
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.006, 4, 16), lines);
    r.position.set(Math.cos(a) * 0.3, 0.1, -Math.sin(a) * 0.3);
    r.rotation.y = a;
    g.add(r);
  }
  return { group: g, legs: [] };
}

function buildPupa(species) {
  const g = new THREE.Group();
  const room = new THREE.Mesh(new THREE.CircleGeometry(1, 24), std(0x2e1a0e));
  room.rotation.x = -Math.PI / 2;
  room.scale.set(0.34, 0.55, 1);
  room.position.y = 0.01;
  g.add(room);
  const skin = std(0xc98a4a, { roughness: 0.35 });
  g.add(ellipsoid(skin, 0.22, 0.15, 0.42, V(0, 0.14, 0)));
  if (species === 'kabuto') g.add(cone(skin, V(0, 0.2, 0.28), V(0, 0.24, 0.62), 0.05));
  else if (species !== 'kanabun' && BEETLE_STYLE[species]) {
    for (const s of [-1, 1]) g.add(cone(skin, V(s * 0.06, 0.14, 0.36), V(s * 0.04, 0.15, 0.56), 0.035));
  }
  return { group: g, legs: [] };
}

// ---------- ケース ----------

// つちの あつさ（cm）。ようちゅう・さなぎは つちの なかの ガラスぎわに いて、よこから みえる
export const SOIL = 9;

function buildCase(dims) {
  const [w, d, h] = dims;
  const g = new THREE.Group();
  const table = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std(0xe6d5b8, { roughness: 0.9 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -SOIL - 0.01;
  g.add(table);
  // つちの よこの めんは すこし すけて、なかの ようちゅうが みえる
  const soilTop = std(0x5a3920, { roughness: 1 });
  const soilSide = new THREE.MeshStandardMaterial({ color: 0x3e2412, roughness: 1, transparent: true, opacity: 0.62, depthWrite: false });
  const soilBack = std(0x2e1a0c, { roughness: 1 });
  // めんの じゅんばん：+x, -x, うえ, した, まえ, うしろ（うしろは すけない）
  const soil = new THREE.Mesh(new THREE.BoxGeometry(w, SOIL, d), [soilSide, soilSide, soilTop, soilTop, soilSide, soilBack]);
  soil.position.y = -SOIL / 2;
  soil.renderOrder = 1;
  g.add(soil);
  const glassH = h - 3 + SOIL;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(w, glassH, d),
    new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.12, roughness: 0.1, depthWrite: false, side: THREE.BackSide }),
  );
  glass.position.y = glassH / 2 - SOIL;
  g.add(glass);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, glassH, d)), new THREE.LineBasicMaterial({ color: 0x8fb4c8 }));
  edges.position.copy(glass.position);
  g.add(edges);
  // ふたは ふちだけ（うえから のぞける ように）
  const frame = std(0x2f7d4f, { roughness: 0.5 });
  const top = h - 3 + 0.4;
  for (const [fw, fd, x, z] of [[w + 0.6, 1.2, 0, d / 2], [w + 0.6, 1.2, 0, -d / 2], [1.2, d, w / 2, 0], [1.2, d, -w / 2, 0]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.8, fd), frame);
    bar.position.set(x, top, z);
    g.add(bar);
  }
  // とまりぎ と おちば
  const bark = std(0x6b4a2e, { roughness: 0.9 });
  const logR = w * 0.029;
  const log = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR, w * 0.4, 12), bark);
  log.rotation.z = Math.PI / 2;
  log.rotation.y = 0.5;
  log.position.set(-w * 0.1, logR * 0.75, d * 0.26); // おきものは おくに ならべるので、まるたは てまえ
  g.add(log);
  log.updateMatrixWorld(true);
  // むしが まるたを のりこえる ための かたち（じくの りょうはし・はんけい・たかさ）
  const logShape = {
    a: log.localToWorld(V(0, w * 0.2, 0)),
    b: log.localToWorld(V(0, -w * 0.2, 0)),
    r: logR,
    y: log.position.y,
  };
  const leaf = std(0x8a6a2a, { roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(1, 12), leaf);
    l.scale.set(w * 0.03, w * 0.05, 1);
    l.rotation.set(-Math.PI / 2, 0, i * 1.1);
    l.position.set((Math.random() - 0.5) * w * 0.8, 0.03 + i * 0.005, (Math.random() - 0.5) * d * 0.8);
    g.add(l);
  }
  return { group: g, log: logShape };
}

// (x, z) の じめんの たかさ。まるたの うえなら まるたの ひょうめん
function groundHeight(log, x, z) {
  if (!log) return 0;
  const ax = log.b.x - log.a.x;
  const az = log.b.z - log.a.z;
  const t = ((x - log.a.x) * ax + (z - log.a.z) * az) / (ax * ax + az * az);
  if (t < 0 || t > 1) return 0;
  const dist = Math.hypot(x - (log.a.x + ax * t), z - (log.a.z + az * t));
  if (dist >= log.r) return 0;
  return Math.max(0, log.y + Math.sqrt(log.r * log.r - dist * dist));
}

// ---------- おきもの（むしが あそぶ） ----------
// どれも はば 14・おくゆき 8 くらいで つくり、ケースに あわせて ちぢめる。
// path：むしが たどる みち（おきものの なかの ざひょう）。speed：その くかんの はやさの ばいりつ
//   stay：さいごで まって もどる／ride：ブランコに のる／hide：おうちに かくれる

function buildPerch() {
  const g = new THREE.Group();
  const bark = std(0x7a5634, { roughness: 0.9 });
  g.add(rod(bark, V(0, 0, 0), V(1, 11, 2.5), 0.6, 0.35));
  g.add(rod(bark, V(0.5, 6, 1.2), V(3.2, 8.2, 1.5), 0.3, 0.2));
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 1, 12), bark);
  stump.position.y = 0.5;
  g.add(stump);
  const leaf = std(0x4f9a4a, { side: THREE.DoubleSide });
  for (const [x, y, z] of [[3.3, 8.4, 1.5], [1.1, 11.2, 2.6]]) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(1, 10), leaf);
    l.scale.set(1, 1.8, 1);
    l.position.set(x, y, z);
    l.rotation.set(-1, 0.4, 0);
    g.add(l);
  }
  return { group: g, path: [V(0, 0, 4), V(0, 1, 0.7), V(0.5, 6, 1.4), V(0.95, 10.4, 2.5)], speed: [1, 0.6, 0.6, 0.6], stay: 3.5 };
}

function buildSlide() {
  const g = new THREE.Group();
  const red = std(0xe2553f, { roughness: 0.45 });
  const yellow = std(0xf2c230, { roughness: 0.45 });
  for (const x of [-5.8, -4.2]) g.add(rod(red, V(x, 0, 0), V(x, 8.6, 0), 0.25));
  for (let y = 1.2; y < 8.5; y += 1.4) g.add(rod(yellow, V(-5.8, y, 0), V(-4.2, y, 0), 0.15));
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 2.6), red);
  deck.position.set(-4.3, 8.2, 0);
  g.add(deck);
  const len = Math.hypot(8.2, 7.8);
  const slope = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 2.6), yellow);
  slope.position.set(1.3, 4.3, 0);
  slope.rotation.z = -Math.atan2(7.8, 8.2);
  g.add(slope);
  for (const z of [-1.4, 1.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.6, 0.2), red);
    rail.position.set(1.3, 4.7, z);
    rail.rotation.z = slope.rotation.z;
    g.add(rail);
  }
  return {
    group: g,
    path: [V(-5, 0, 3.5), V(-5, 0, 0.5), V(-5, 8.5, 0.5), V(-3, 8.5, 0), V(5.2, 0.6, 0), V(7.5, 0, 1.5)],
    speed: [1, 1, 0.5, 0.7, 3.5, 1.5],
  };
}

function buildSwing() {
  const g = new THREE.Group();
  const blue = std(0x3f7fd9, { roughness: 0.45 });
  for (const x of [-4.5, 4.5]) {
    g.add(rod(blue, V(x, 0, -2), V(x, 10, 0), 0.25));
    g.add(rod(blue, V(x, 0, 2), V(x, 10, 0), 0.25));
  }
  g.add(rod(blue, V(-4.5, 10, 0), V(4.5, 10, 0), 0.3));
  const pivot = new THREE.Group();
  pivot.position.set(0, 10, 0);
  const rope = std(0xd9c9a3);
  for (const x of [-1.5, 1.5]) pivot.add(rod(rope, V(x, 0, 0), V(x, -6, 0), 0.08));
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 2.2), std(0xf2c230));
  seat.position.y = -6;
  pivot.add(seat);
  g.add(pivot);
  return { group: g, path: [V(0, 0, 4.5), V(0, 0, 2), V(0, 4.2, 0)], speed: [1, 1, 1.5], ride: 5, pivot, seat, exit: [V(0, 0, 3)] };
}

function buildHouse() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 5, 16), std(0xf3ead8));
  stem.position.y = 2.5;
  g.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd9443a, { roughness: 0.5 }));
  cap.position.y = 4.6;
  cap.scale.y = 0.8;
  g.add(cap);
  const dot = std(0xffffff);
  for (const [a, b] of [[0.4, 0.5], [1.9, 0.8], [3.2, 0.4], [4.5, 0.9], [5.6, 0.6]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), dot);
    s.position.set(Math.cos(a) * 4.6 * Math.sin(b), 4.6 + 3.7 * Math.cos(b), Math.sin(a) * 4.6 * Math.sin(b));
    g.add(s);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.3), std(0x5a3920));
  door.position.set(0, 1.4, 2.35);
  g.add(door);
  return { group: g, path: [V(0, 0, 5.5), V(0, 0, 2.6), V(0, 0, 0.5)], speed: [1, 1, 0.8], hide: 4 };
}

const DECOR_BUILDERS = { perch: buildPerch, slide: buildSlide, swing: buildSwing, house: buildHouse };

// ---------- へや ----------

export function createInsectRoom(container, { onSelect }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(8, 20, 12);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = 1.35;

  let caseGroup = null;
  let caseDims = null;
  let bounds = { x: 10, z: 6 };
  let decors = [];
  let logShape = null;
  const actors = new Map();
  let selected = null;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 32), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.9 }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false });

  // decor：[{ type, slot }]、slots：おける かず
  function setCase(dims, decor = [], slots = 2) {
    if (caseGroup) scene.remove(caseGroup);
    const built = buildCase(dims);
    caseGroup = built.group;
    logShape = built.log;
    scene.add(caseGroup);
    const [w, d, h] = dims;
    bounds = { x: w / 2 - 2.5, z: d / 2 - 2.5 };
    caseDims = dims;
    // おきものは ケースの おくに よこ ならび
    const k = Math.min((w / slots) / 16, (h - 3) / 13);
    decors = decor.map(({ type, slot }) => {
      const build = DECOR_BUILDERS[type];
      if (!build) return null;
      const def = build();
      def.group.scale.setScalar(k);
      def.group.position.set(-w / 2 + (slot + 0.5) * (w / slots), 0, -d / 2 + 6 * k);
      caseGroup.add(def.group);
      caseGroup.updateMatrixWorld(true);
      const toWorld = (p) => def.group.localToWorld(p.clone());
      return { ...def, type, k, busy: null, world: def.path.map(toWorld), exitWorld: (def.exit || []).map(toWorld) };
    }).filter(Boolean);
    for (const a of actors.values()) stopPlay(a);
    fitCamera();
  }

  // ななめ うえから ケース ぜんたいが みえる きょりに する（がめんの たてよこ ひで かわる）
  function fitCamera() {
    if (!caseDims) return;
    const [w, d, h] = caseDims;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byWidth = (w * 0.6) / (tanV * camera.aspect);
    const byHeight = ((h + SOIL) * 0.7 + d * 0.3) / tanV;
    const dist = Math.max(byWidth, byHeight);
    // すこし ひくめから：つちの なかの ようちゅうも みえる
    camera.position.set(0, dist * 0.42, dist * 0.9);
    controls.target.set(0, -SOIL * 0.3, 0);
    controls.minDistance = dist * 0.3;
    controls.maxDistance = dist * 1.5;
    controls.update();
  }

  function randomSpot() {
    return V((Math.random() * 2 - 1) * bounds.x, 0, (Math.random() * 2 - 1) * bounds.z * 0.4 + bounds.z * 0.45);
  }

  function build(p) {
    if (p.stage === 'larva') return buildLarva();
    if (p.stage === 'pupa') return buildPupa(p.species);
    if (p.species === 'ant') return buildAnt();
    if (p.species === 'dango') return buildDango();
    return buildBeetle(p.species, p.sizeRatio ?? 0.5);
  }

  const keyOf = (p) => `${p.stage}/${p.lengthCm.toFixed(2)}/${p.weak}/${p.sleeping}`;

  function addActor(p) {
    const model = build(p);
    const g = model.group;
    const len = p.lengthCm;
    g.rotation.order = 'YXZ';
    g.scale.setScalar(len);
    g.position.copy(randomSpot());
    g.rotation.y = Math.random() * Math.PI * 2;
    // ようちゅう・さなぎ・とうみんちゅうは つちの なか、まえの ガラスぎわ（よこから みえる）
    const [cw, cd] = caseDims;
    const underX = (Math.random() * 2 - 1) * (cw / 2 - len);
    const underY = -SOIL * (0.3 + Math.random() * 0.35);
    if (p.stage === 'larva') {
      g.rotation.order = 'XYZ';
      g.rotation.set(Math.PI / 2, 0, 0); // C のかたちを ガラスに むける
      g.position.set(underX, underY, cd / 2 - 0.25 * len);
    } else if (p.stage === 'pupa') {
      g.rotation.order = 'XYZ';
      g.rotation.set(Math.PI / 2, Math.PI, 0); // あたまを うえに、ガラスの ほうを むいた さなぎ
      g.position.set(underX, underY, cd / 2 - 0.32 * len);
    } else if (p.sleeping) {
      g.rotation.y = Math.PI / 2;
      g.position.set(underX, -SOIL * 0.35, cd / 2 - 0.35 * len);
    }
    g.traverse((o) => (o.userData.petId = p.id));
    scene.add(g);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(len * 0.45, 20), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    scene.add(shadow);
    const walker = p.stage === 'adult' && !p.sleeping;
    const speed = (p.species === 'ant' ? 5 : p.species === 'dango' ? 1.6 : 2.4) * (p.weak ? 0.4 : 1);
    actors.set(p.id, {
      pet: p, model, g, shadow, walker, speed, len,
      target: randomSpot(), rest: Math.random() * 2, phase: Math.random() * 10, rolled: 0,
      play: null, key: keyOf(p),
    });
  }

  function removeActor(id) {
    const a = actors.get(id);
    if (!a) return;
    stopPlay(a);
    scene.remove(a.g);
    scene.remove(a.shadow);
    actors.delete(id);
    if (selected === id) select(null);
  }

  // ケースに いる むしの リストを わたす。かわった むしだけ つくりなおす
  function setPets(list) {
    const ids = new Set(list.map((p) => p.id));
    for (const id of [...actors.keys()]) if (!ids.has(id)) removeActor(id);
    for (const p of list) {
      const a = actors.get(p.id);
      if (a && a.key !== keyOf(p)) {
        const keep = a.g.position.clone();
        removeActor(p.id);
        addActor(p);
        const b = actors.get(p.id);
        b.g.position.x = keep.x;
        b.g.position.z = keep.z;
      } else if (!a) {
        addActor(p);
      }
    }
  }

  function select(id) {
    selected = id;
    const a = id && actors.get(id);
    ring.visible = !!a;
    if (a) {
      ring.scale.setScalar(a.len * 0.7);
      if (a.pet.species === 'dango' && a.walker && !a.play) a.rolled = 3; // タップで まるくなる
    }
  }

  // タップ（ドラッグでは ない とき）で むしを えらぶ
  const ray = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(V(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, 0), camera);
    const hits = ray.intersectObjects([...actors.values()].filter((a) => a.g.visible).map((a) => a.g), true);
    const id = hits.length ? hits[0].object.userData.petId : null;
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

  // ---------- うごき ----------

  function animateLegs(a, dist) {
    a.phase += (dist / a.len) * 9;
    for (const l of a.model.legs) {
      const s = Math.sin(a.phase + l.userData.phase);
      l.rotation.y = s * 0.35;
      l.rotation.z = l.userData.side * Math.max(0, Math.cos(a.phase + l.userData.phase)) * 0.25;
    }
  }

  // p に むかって すすむ。ついたら true。のぼりは からだを かたむける
  // じめんを あるく：まるたの うえでは たかさを あわせ、さかに そって からだを かたむける
  function followGround(a) {
    const g = a.g;
    const fx = Math.sin(g.rotation.y) * a.len * 0.35;
    const fz = Math.cos(g.rotation.y) * a.len * 0.35;
    const hHere = groundHeight(logShape, g.position.x, g.position.z);
    const hFront = groundHeight(logShape, g.position.x + fx, g.position.z + fz);
    const hBack = groundHeight(logShape, g.position.x - fx, g.position.z - fz);
    g.position.y = Math.max(hHere, (hFront + hBack) / 2);
    const want = -Math.atan2(hFront - hBack, a.len * 0.7);
    g.rotation.x += (want - g.rotation.x) * 0.3;
  }

  // じめんの うえの p に むかって あるく（まるたは のりこえる）。ついたら true
  function walkTo(a, p, speed, dt) {
    const g = a.g;
    const dx = p.x - g.position.x;
    const dz = p.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    const v = speed * dt;
    if (dist <= v || dist < 0.05) {
      g.position.x = p.x;
      g.position.z = p.z;
      followGround(a);
      return true;
    }
    g.rotation.y = Math.atan2(dx, dz);
    g.position.x += (dx / dist) * v;
    g.position.z += (dz / dist) * v;
    followGround(a);
    animateLegs(a, v);
    return false;
  }

  function moveTo(a, p, speed, dt) {
    const g = a.g;
    const d = new THREE.Vector3().subVectors(p, g.position);
    const dist = d.length();
    const v = speed * dt;
    if (dist <= v || dist < 0.05) {
      g.position.copy(p);
      return true;
    }
    const flat = Math.hypot(d.x, d.z);
    if (flat > 0.01) g.rotation.y = Math.atan2(d.x, d.z);
    g.rotation.x = -Math.atan2(d.y, Math.max(flat, 0.001)) * (flat > 0.01 ? 1 : 0.9);
    g.position.addScaledVector(d, v / dist);
    animateLegs(a, v);
    return false;
  }

  function stopPlay(a) {
    if (!a.play) return;
    a.play.decor.busy = null;
    a.play = null;
    a.g.visible = true;
    a.g.rotation.x = 0;
    a.g.rotation.z = 0;
    followGround(a);
  }

  // じめん（または まるたの うえ）に いる か
  const g0 = (a) => a.g.position.y <= groundHeight(logShape, a.g.position.x, a.g.position.z) + 0.05;

  // あいている おきものを えらんで あそびに いく
  function startPlay(a) {
    const free = decors.filter((d) => !d.busy);
    if (!free.length || a.pet.weak) return false;
    const decor = free[Math.floor(Math.random() * free.length)];
    decor.busy = a.pet.id;
    a.play = { decor, route: decor.world.slice(), idx: 0, speed: decor.speed.slice(), phase: 'go', timer: 0 };
    return true;
  }

  function stepPlay(a, dt, t) {
    const pl = a.play;
    const d = pl.decor;
    if (pl.phase === 'go' || pl.phase === 'back') {
      const target = pl.route[pl.idx];
      const mult = pl.speed[pl.idx] ?? 1;
      // じめんの うえ どうしの いどう（おきものへの いきかえり）は まるたを のりこえて あるく
      const onGround = target.y < 0.01 && g0(a) && pl.idx === (pl.phase === 'go' ? 0 : pl.route.length - 1);
      if ((onGround ? walkTo : moveTo)(a, target, a.speed * mult, dt)) {
        pl.idx++;
        if (pl.idx >= pl.route.length) {
          if (pl.phase === 'back') return stopPlay(a);
          if (d.stay) { pl.phase = 'stay'; pl.timer = d.stay; }
          else if (d.ride) { pl.phase = 'ride'; pl.timer = d.ride; }
          else if (d.hide) { pl.phase = 'hide'; pl.timer = d.hide; a.g.visible = false; }
          else stopPlay(a); // すべりだいは すべりおりたら おわり
        }
      }
    } else if (pl.phase === 'stay') {
      pl.timer -= dt;
      a.model.legs.forEach((l) => (l.rotation.y *= 0.9));
      if (pl.timer <= 0) goBack(a, d.world.slice().reverse(), d.speed.slice().reverse());
    } else if (pl.phase === 'ride') {
      pl.timer -= dt;
      d.pivot.rotation.x = Math.sin(t * 2.4) * 0.55 * Math.min(1, pl.timer, d.ride - pl.timer);
      d.seat.updateMatrixWorld(true);
      a.g.position.copy(d.seat.localToWorld(V(0, 0.2, 0)));
      a.g.rotation.x = d.pivot.rotation.x;
      a.g.rotation.y = 0;
      if (pl.timer <= 0) {
        d.pivot.rotation.x = 0;
        goBack(a, d.exitWorld, [1.5]);
      }
    } else if (pl.phase === 'hide') {
      pl.timer -= dt;
      if (pl.timer <= 0) {
        a.g.visible = true;
        goBack(a, d.world.slice().reverse(), d.speed.slice().reverse());
      }
    }
  }

  function goBack(a, route, speed) {
    a.play.phase = 'back';
    a.play.route = route;
    a.play.speed = speed;
    a.play.idx = 0;
  }

  function step(a, dt, t) {
    const g = a.g;
    if (!a.walker) {
      // ようちゅうは くねくね、さなぎは ときどき ぴくっ、とうみんは じっと
      if (a.pet.stage === 'larva') g.rotation.y += Math.sin(t * 1.5 + a.phase) * 0.004;
      else if (a.pet.stage === 'pupa') g.rotation.z = Math.sin(t * 9) * 0.03 * (Math.sin(t * 0.7 + a.phase) > 0.93 ? 1 : 0);
    } else if (a.play) {
      stepPlay(a, dt, t);
    } else if (a.rolled > 0) {
      a.rolled -= dt;
      a.model.body.visible = false;
      a.model.ball.visible = true;
      a.model.legs.forEach((l) => (l.visible = false));
      if (a.rolled <= 0) {
        a.model.body.visible = true;
        a.model.ball.visible = false;
        a.model.legs.forEach((l) => (l.visible = true));
      }
    } else if (a.rest > 0) {
      a.rest -= dt;
      a.model.legs.forEach((l) => (l.rotation.y *= 0.9));
    } else {
      const dx = a.target.x - g.position.x;
      const dz = a.target.z - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < a.len * 0.5) {
        if (!(decors.length && Math.random() < 0.4 && startPlay(a))) {
          a.target = randomSpot();
          a.rest = Math.random() < 0.5 ? 0.5 + Math.random() * 2.5 : 0;
        }
      } else {
        const want = Math.atan2(dx, dz);
        let diff = want - g.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        g.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), dt * 2.5);
        const v = a.speed * dt * (Math.abs(diff) > 1 ? 0.3 : 1);
        g.position.x += Math.sin(g.rotation.y) * v;
        g.position.z += Math.cos(g.rotation.y) * v;
        followGround(a);
        animateLegs(a, v);
      }
    }
    a.shadow.visible = g.visible && g.position.y > -0.5 && g.position.y < 1;
    if (a.shadow.visible) a.shadow.position.y = groundHeight(logShape, g.position.x, g.position.z) + 0.02;
    a.shadow.position.x = g.position.x;
    a.shadow.position.z = g.position.z;
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (const a of actors.values()) step(a, dt, t);
    const s = selected && actors.get(selected);
    if (s) ring.position.set(s.g.position.x, Math.max(0.04, s.g.position.y), s.g.position.z);
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  // たしかめ よう：いま なにを しているか
  const debug = () => [...actors.values()].map((a) => ({
    id: a.pet.id, play: a.play ? `${a.play.decor.type}:${a.play.phase}` : null,
    y: Math.round(a.g.position.y * 10) / 10, visible: a.g.visible,
  }));

  // たしかめ よう：がめんが かくれていても じかんを すすめる
  let fakeT = 0;
  const advance = (seconds) => {
    for (let i = 0; i < seconds / 0.05; i++) {
      fakeT += 0.05;
      for (const a of actors.values()) step(a, 0.05, fakeT);
    }
  };

  return { setCase, setPets, select, dispose, debug, advance };
}
