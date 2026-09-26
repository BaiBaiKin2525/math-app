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

function buildCase(dims) {
  const [w, d, h] = dims;
  const g = new THREE.Group();
  const table = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std(0xe6d5b8, { roughness: 0.9 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -3.01;
  g.add(table);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), std(0x5a3920, { roughness: 1 }));
  soil.position.y = -1.5;
  g.add(soil);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.12, roughness: 0.1, depthWrite: false, side: THREE.BackSide }),
  );
  glass.position.y = h / 2 - 3;
  g.add(glass);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: 0x8fb4c8 }));
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
  const log = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.025, w * 0.029, w * 0.55, 10), bark);
  log.rotation.z = Math.PI / 2;
  log.rotation.y = 0.5;
  log.position.set(w * 0.05, 1.0, -d * 0.18);
  g.add(log);
  const leaf = std(0x8a6a2a, { roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(1, 12), leaf);
    l.scale.set(w * 0.03, w * 0.05, 1);
    l.rotation.set(-Math.PI / 2, 0, i * 1.1);
    l.position.set((Math.random() - 0.5) * w * 0.8, 0.03 + i * 0.005, (Math.random() - 0.5) * d * 0.8);
    g.add(l);
  }
  return g;
}

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
  let bounds = { x: 10, z: 6 };
  const actors = new Map();
  let selected = null;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 32), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.9 }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false });

  function setCase(dims) {
    if (caseGroup) scene.remove(caseGroup);
    caseGroup = buildCase(dims);
    scene.add(caseGroup);
    const [w, d] = dims;
    bounds = { x: w / 2 - 2.5, z: d / 2 - 2.5 };
    caseDims = dims;
    fitCamera();
  }

  // ななめ うえから ケース ぜんたいが みえる きょりに する（がめんの たてよこ ひで かわる）
  let caseDims = null;
  function fitCamera() {
    if (!caseDims) return;
    const [w, d, h] = caseDims;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byWidth = (w * 0.6) / (tanV * camera.aspect);
    const byHeight = (h * 0.75 + d * 0.3) / tanV;
    const dist = Math.max(byWidth, byHeight);
    camera.position.set(0, dist * 0.55, dist * 0.85);
    controls.target.set(0, 0, 0);
    controls.minDistance = dist * 0.3;
    controls.maxDistance = dist * 1.5;
    controls.update();
  }

  function randomSpot() {
    return V((Math.random() * 2 - 1) * bounds.x, 0, (Math.random() * 2 - 1) * bounds.z);
  }

  function build(p) {
    if (p.stage === 'larva') return buildLarva();
    if (p.stage === 'pupa') return buildPupa(p.species);
    if (p.species === 'ant') return buildAnt();
    if (p.species === 'dango') return buildDango();
    return buildBeetle(p.species, p.sizeRatio ?? 0.5);
  }

  function addActor(p) {
    const model = build(p);
    const g = model.group;
    const len = p.lengthCm;
    g.scale.setScalar(len);
    g.position.copy(randomSpot());
    g.rotation.y = Math.random() * Math.PI * 2;
    if (p.stage === 'larva') g.position.y = -0.06 * len; // すこし つちに もぐっている
    g.traverse((o) => (o.userData.petId = p.id));
    scene.add(g);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(len * 0.45, 20), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    scene.add(shadow);
    const walker = p.stage === 'adult';
    const speed = (p.species === 'ant' ? 5 : p.species === 'dango' ? 1.6 : 2.4) * (p.hungry ? 0.4 : 1);
    actors.set(p.id, {
      pet: p, model, g, shadow, walker, speed, len,
      target: randomSpot(), rest: Math.random() * 2, phase: Math.random() * 10, rolled: 0,
      key: `${p.stage}/${p.lengthCm.toFixed(2)}/${p.hungry}`,
    });
  }

  function removeActor(id) {
    const a = actors.get(id);
    if (!a) return;
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
      const key = `${p.stage}/${p.lengthCm.toFixed(2)}/${p.hungry}`;
      if (a && a.key !== key) {
        const keep = a.g.position.clone();
        removeActor(p.id);
        addActor(p);
        actors.get(p.id).g.position.x = keep.x;
        actors.get(p.id).g.position.z = keep.z;
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
      if (a.pet.species === 'dango' && a.walker) a.rolled = 3; // タップで まるくなる
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
    const hits = ray.intersectObjects([...actors.values()].map((a) => a.g), true);
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

  const clock = new THREE.Clock();
  let raf = 0;
  function step(a, dt, t) {
    const g = a.g;
    if (!a.walker) {
      // ようちゅうは くねくね、さなぎは ときどき ぴくっ
      if (a.pet.stage === 'larva') g.rotation.y += Math.sin(t * 1.5 + a.phase) * 0.004;
      else g.rotation.z = Math.sin(t * 9) * 0.03 * (Math.sin(t * 0.7 + a.phase) > 0.93 ? 1 : 0);
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
        a.target = randomSpot();
        a.rest = Math.random() < 0.5 ? 0.5 + Math.random() * 2.5 : 0;
      } else {
        const want = Math.atan2(dx, dz);
        let diff = want - g.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        g.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), dt * 2.5);
        const v = a.speed * dt * (Math.abs(diff) > 1 ? 0.3 : 1);
        g.position.x += Math.sin(g.rotation.y) * v;
        g.position.z += Math.cos(g.rotation.y) * v;
        a.phase += (v / a.len) * 9;
        for (const l of a.model.legs) {
          const s = Math.sin(a.phase + l.userData.phase);
          l.rotation.y = s * 0.35;
          l.rotation.z = l.userData.side * Math.max(0, Math.cos(a.phase + l.userData.phase)) * 0.25;
        }
      }
    }
    a.shadow.position.x = g.position.x;
    a.shadow.position.z = g.position.z;
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (const a of actors.values()) step(a, dt, t);
    const s = selected && actors.get(selected);
    if (s) ring.position.set(s.g.position.x, 0.04, s.g.position.z);
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

  return { setCase, setPets, select, dispose };
}
