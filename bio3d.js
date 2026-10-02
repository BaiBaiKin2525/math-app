// ビオトープの 3D（three.js）。いけ・しっち・せせらぎ を ポイントで すこしずつ ひろげて、いきものが くらす。
// じめん・もの・いきもの は Blender で つくった models/bio_*.glb（blender/biotope.py）
// へいめんず の かずは blender/biotope.py と おなじ（x −8〜8、z −5.5 おく〜5.5 てまえ）
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js/+esm';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- へいめんず ----------
const POND = { c: [2.0, -0.5], r: [4.2, 2.8] };
const WET = { c: [-4.3, 2.4], r: [3.4, 2.4] };
const STREAM = [[-6.8, -4.2], [-4.8, -3.4], [-2.6, -2.9], [-0.6, -2.1]];
const SAND = [6.2, 0.6];
const DEN = [-0.55, -1.75];
const LOG = { c: [2.7, -0.2], ang: -20, len: 1.8 };
const WATER = 0.0;
const WATER_WET = 0.06;
const ell = (x, z, e) => Math.hypot((x - e.c[0]) / e.r[0], (z - e.c[1]) / e.r[1]);
function segDist(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return best;
}

// ---------- モデル ----------
const GLB = {};
let loading = null;
export function loadBioModels() {
  if (!loading) {
    loading = (async () => {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm'),
        import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/meshopt_decoder.module.js/+esm'),
      ]);
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      await Promise.all(['terrain', 'props', 'animals'].map((n) => loader.loadAsync(`models/bio_${n}.glb`).then((g) => { GLB[n] = bake(g.scene); })));
    })();
  }
  return loading;
}

// かるく する ときに メッシュに ついた いち・おおきさを かたちに もどす（から の いちは のこす）
function bake(root) {
  root.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.matrix;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const src = o.geometry.attributes;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(src.position.count * 3);
    for (let i = 0; i < src.position.count; i++) pos.set(v.fromBufferAttribute(src.position, i).applyMatrix4(m).toArray(), i * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (src.normal) {
      const nor = new Float32Array(src.normal.count * 3);
      for (let i = 0; i < src.normal.count; i++) nor.set(v.fromBufferAttribute(src.normal, i).applyMatrix3(nm).normalize().toArray(), i * 3);
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    }
    if (src.uv) {
      const uv = new Float32Array(src.uv.count * 2);
      for (let i = 0; i < src.uv.count; i++) uv.set([src.uv.getX(i), src.uv.getY(i)], i * 2);
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    if (o.geometry.index) geo.setIndex(o.geometry.index.clone());
    if (!src.normal) geo.computeVertexNormals();
    o.geometry = geo;
    o.position.set(0, 0, 0);
    o.quaternion.identity();
    o.scale.set(1, 1, 1);
  });
  return root;
}

// みずめん：ゆれる さざなみ（キャンバスの ノイズを ずらす）
function waterNormalTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  const h = (x, y) => Math.sin(x * 0.2) * Math.cos(y * 0.17) + Math.sin((x + y) * 0.11) * 0.6 + Math.sin(x * 0.05 - y * 0.08) * 0.8;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
    const n = new THREE.Vector3(-dx * 0.6, -dy * 0.6, 1).normalize();
    const i = (y * 128 + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255;
    img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
    img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 7);
  return t;
}

// いきもの：すがたごとの モデルと おおきさ
const LOOKS = {
  // ほんとうより ずっと おおきく（けしきの なかで みえる ように）
  kaeru: { egg: ['kaeru_egg', 1.6], tadpole: ['kaeru_tadpole', 2.0], legs: ['kaeru_legs', 2.2], froglet: ['kaeru_adult', 1.1], adult: ['kaeru_adult', 2.0] },
  kame: { egg: ['kame_egg', 1.8], baby: ['kame', 0.65], young: ['kame', 1.05], adult: ['kame', 1.55] },
  sansho: { egg: ['sansho_egg', 1.5], larva: ['sansho_larva', 0.9], child: ['sansho_adult', 0.95], adult: ['sansho_adult', 1.8] },
};

export function createBiotope(container, { onSelect }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfe6f2);
  scene.fog = new THREE.Fog(0xcfe6f2, 18, 40);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x5a6a3a, 0.75));
  const sun = new THREE.DirectionalLight(0xfff3dd, 1.6);
  sun.position.set(-6, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 1, far: 40 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);
  camera.position.set(0, 9.5, 13);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0.3);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minDistance = 1.2;
  controls.maxDistance = 30;
  controls.enablePan = true;
  controls.update();

  const world = new THREE.Group();
  scene.add(world);
  const animalsLayer = new THREE.Group();
  scene.add(animalsLayer);
  let areas = new Set(['wet']);
  let heights = null;
  let wheel = null;
  const parts = {};          // なまえ → もの
  const decor = { wet: new THREE.Group(), pond: new THREE.Group(), stream: new THREE.Group(), forest: new THREE.Group(), signs: new THREE.Group() };
  Object.values(decor).forEach((g) => world.add(g));
  const waterMats = [];
  const actors = new Map();
  let selected = null;
  let ring = null;
  let fly = null;            // カメラを いきものへ よせる うごき

  // じめんの たかさ：terrain の てんを あみめに ならべて、あいだは まぜる
  function buildHeights(mesh) {
    const NX = 193, NZ = 133;
    const h = new Float32Array(NX * NZ).fill(0.15);
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ix = Math.round(((x + 8) / 16) * (NX - 1)), iz = Math.round(((z + 5.5) / 11) * (NZ - 1));
      if (ix >= 0 && ix < NX && iz >= 0 && iz < NZ) h[iz * NX + ix] = y;
    }
    return (x, z) => {
      const fx = Math.max(0, Math.min(NX - 1.001, ((x + 8) / 16) * (NX - 1)));
      const fz = Math.max(0, Math.min(NZ - 1.001, ((z + 5.5) / 11) * (NZ - 1)));
      const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
      const a = h[iz * NX + ix], b = h[iz * NX + ix + 1], c = h[(iz + 1) * NX + ix], d = h[(iz + 1) * NX + ix + 1];
      return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
    };
  }
  const H = (x, z) => (heights ? heights(x, z) : 0.15);

  // ばしょの しらべ
  const inPond = (x, z) => areas.has('pond') && ell(x, z, POND) < 0.92 && H(x, z) < WATER - 0.06;
  const inStream = (x, z) => areas.has('stream') && segDist(x, z, STREAM) < 0.5 && H(x, z) < WATER - 0.05;
  const inPuddle = (x, z) => ell(x, z, WET) < 1.05 && H(x, z) < WATER_WET - 0.015;
  const onWetLand = (x, z) => ell(x, z, WET) < 1.15 && H(x, z) >= WATER_WET + 0.005;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const find = (test, box, tries = 400) => {
    for (let i = 0; i < tries; i++) {
      const x = rnd(box[0], box[2]), z = rnd(box[1], box[3]);
      if (test(x, z)) return [x, z];
    }
    return null;
  };
  const WETBOX = [WET.c[0] - WET.r[0], WET.c[1] - WET.r[1], WET.c[0] + WET.r[0], WET.c[1] + WET.r[1]];
  const PONDBOX = [POND.c[0] - POND.r[0], POND.c[1] - POND.r[1], POND.c[0] + POND.r[0], POND.c[1] + POND.r[1]];

  // ---------- けしき ----------
  function setupWorld() {
    const terrain = GLB.terrain.clone(true);
    terrain.traverse((o) => {
      if (!o.isMesh) return;
      parts[o.name] = o;
      if (o.name.startsWith('water')) {
        const wet = o.name === 'water_wet';
        const m = new THREE.MeshStandardMaterial({
          color: wet ? 0x52683c : 0x2f7385, transparent: true, opacity: wet ? 0.62 : 0.6, roughness: 0.08, metalness: 0.0,
          normalMap: waterNormalTexture(), normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 0.7, depthWrite: false,
        });
        o.material = m;
        o.renderOrder = 2;
        waterMats.push(m);
      } else {
        o.receiveShadow = true;
      }
    });
    world.add(terrain);
    heights = buildHeights(parts.terrain);
    const props = GLB.props.clone(true);
    props.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      if (o.name) parts[o.name] = o;
    });
    // ならべる もの は もとの ものを かくして、コピーを おく
    const templ = (name) => {
      const g = new THREE.Group();
      props.children.filter((c) => c.name === name || c.name.startsWith(`${name}_`)).forEach((c) => g.add(c.clone(true)));
      return g;
    };
    const T = {
      tree0: templ('tree0'), tree1: templ('tree1'), reed: templ('reed'), iris: templ('iris'),
      lily: templ('lily'), lily_flower: templ('lily_flower'), rock0: templ('rock0'), rock1: templ('rock1'), sign: templ('sign'),
    };
    ['tree0', 'tree1', 'reed', 'iris', 'lily', 'lily_flower', 'rock0', 'rock1', 'sign'].forEach((n) => props.children.filter((c) => c.name === n || c.name.startsWith(`${n}_`)).forEach((c) => (c.visible = false)));
    world.add(props);
    wheel = parts.wheel_pivot;
    // きまった ばしょに おく（たね つきで まいかい おなじ）
    let seed = 7;
    const rr = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const place = (group, t, x, z, s = 1, yOff = 0) => {
      const o = t.clone(true);
      o.position.set(x, H(x, z) + yOff, z);
      o.rotation.y = rr() * Math.PI * 2;
      o.scale.setScalar(s);
      group.add(o);
      return o;
    };
    // しっち：あし・アヤメ
    for (let i = 0; i < 18; i++) {
      const p = (() => { for (let k = 0; k < 200; k++) { const x = WETBOX[0] + rr() * (WETBOX[2] - WETBOX[0]), z = WETBOX[1] + rr() * (WETBOX[3] - WETBOX[1]); const e = ell(x, z, WET); if (e < 1.1 && e > 0.3 && Math.abs(H(x, z) - WATER_WET) < 0.05) return [x, z]; } return null; })();
      if (p) place(decor.wet, i % 4 === 0 ? T.iris : T.reed, p[0], p[1], 0.8 + rr() * 0.6);
    }
    // いけ：きしの あし・アヤメ、スイレン、すなはま の いし
    for (let i = 0; i < 12; i++) {
      const a = -2.6 + rr() * 2.8;                         // おく〜みぎの きし
      const d = 1.0 + rr() * 0.08;
      const x = POND.c[0] + Math.cos(a) * POND.r[0] * d, z = POND.c[1] + Math.sin(a) * POND.r[1] * d;
      place(decor.pond, i % 3 === 0 ? T.iris : T.reed, x, z, 0.8 + rr() * 0.5);
    }
    for (let i = 0; i < 11; i++) {
      const a = rr() * Math.PI * 2, d = 0.35 + rr() * 0.5;
      const x = POND.c[0] + Math.cos(a) * POND.r[0] * d, z = POND.c[1] + Math.sin(a) * POND.r[1] * d;
      if (Math.hypot(x - LOG.c[0], z - LOG.c[1]) < 1.1) continue;
      const lp = T.lily.clone(true);
      lp.position.set(x, WATER + 0.01, z);
      lp.rotation.y = rr() * Math.PI * 2;
      lp.scale.setScalar(0.8 + rr() * 0.6);
      decor.pond.add(lp);
      if (i % 3 === 0) {
        const fl = T.lily_flower.clone(true);
        fl.position.set(x + 0.08, WATER + 0.01, z + 0.05);
        decor.pond.add(fl);
      }
    }
    for (const [x, z] of [[6.9, 1.4], [5.6, 1.5], [7.1, -0.2]]) place(decor.pond, rr() < 0.5 ? T.rock0 : T.rock1, x, z, 0.8 + rr() * 0.5, -0.02);
    // せせらぎ：へりの あし
    for (const [x, z] of [[-6.0, -3.2], [-3.6, -2.5], [-1.6, -3.3], [-5.2, -4.6]]) place(decor.stream, T.reed, x, z, 0.9);
    // もり：おくの 大きな き
    for (const [x, z, t] of [[-6.6, -4.9, 0], [-3.0, -4.9, 1], [0.6, -4.8, 0], [3.8, -4.9, 1], [6.7, -4.6, 0], [7.2, -1.8, 1], [-7.2, -1.4, 1]]) place(decor.forest, t ? T.tree1 : T.tree0, x, z, 0.9 + rr() * 0.3, -0.05);
    // まだ ひろげて いない ところの かんばん
    for (const [area, x, z] of [['pond', 2.0, -0.4], ['stream', -3.6, -3.1], ['forest', 0.0, -4.4]]) {
      const s = T.sign.clone(true);
      s.position.set(x, Math.max(H(x, z), 0.13), z);      // いけの くぼみの うえは ふたの たかさ
      s.rotation.y = 0.2;
      s.userData.area = area;
      decor.signs.add(s);
    }
    applyAreas();
  }

  function applyAreas() {
    const has = (a) => areas.has(a);
    const vis = (name, on) => { if (parts[name]) parts[name].visible = on; };
    vis('water_pond', has('pond'));
    vis('cover_pond', !has('pond'));
    vis('world_log', has('pond'));
    vis('water_stream', has('stream'));
    vis('cover_stream', !has('stream'));
    ['world_wheel', 'world_den', 'world_spring', 'world_streamrocks'].forEach((n) => vis(n, has('stream')));
    vis('world_boardwalk', has('forest'));
    vis('world_boardwalk_posts', has('forest'));
    decor.pond.visible = has('pond');
    decor.stream.visible = has('stream');
    decor.forest.visible = has('forest');
    decor.signs.children.forEach((s) => (s.visible = !has(s.userData.area)));
  }

  // ---------- いきもの ----------
  const where = { egg: 'egg', tadpole: 'swimWet', legs: 'swimWet', froglet: 'hop', adult: 'hop', baby: 'turtle', young: 'turtle', larva: 'deep', child: 'deep' };
  function behavior(species, key) {
    if (key === 'egg') return 'egg';
    if (species === 'kame') return 'turtle';
    if (species === 'sansho') return 'deep';
    return where[key];
  }
  // すむ ところの なかの 1てん
  function spot(species, key) {
    const b = behavior(species, key);
    if (b === 'egg') {
      if (species === 'kame') return find((x, z) => Math.hypot(x - SAND[0], z - SAND[1]) < 0.8, [SAND[0] - 1, SAND[1] - 1, SAND[0] + 1, SAND[1] + 1]) || [SAND[0], SAND[1]];
      if (species === 'sansho') return [DEN[0] + rnd(-0.15, 0.15), DEN[1] + 0.05];
      return find(inPuddle, WETBOX) || [WET.c[0], WET.c[1]];
    }
    if (b === 'swimWet') return find((x, z) => inPuddle(x, z) || (inPond(x, z) && ell(x, z, POND) > 0.65), areas.has('pond') ? [-7.5, -3.5, 6.5, 5] : WETBOX);
    if (b === 'hop') {
      const r = Math.random();
      if (areas.has('pond') && r < 0.25) {
        const lily = decor.pond.children.filter((c) => c.position.y < WATER + 0.05);
        if (lily.length) { const l = lily[Math.floor(Math.random() * lily.length)]; return [l.position.x, l.position.z, WATER + 0.015]; }
      }
      return find(onWetLand, WETBOX) || [WET.c[0], WET.c[1] - 2];
    }
    if (b === 'turtle') {
      const r = Math.random();
      if (r < 0.2) { const t = rnd(-0.6, 0.6); const a = (LOG.ang * Math.PI) / 180; return [LOG.c[0] + Math.cos(a) * t, LOG.c[1] - Math.sin(a) * t, WATER + 0.2]; }
      if (r < 0.35) return find((x, z) => Math.hypot(x - SAND[0], z - SAND[1]) < 1.0 && H(x, z) > WATER, [SAND[0] - 1.2, SAND[1] - 1.2, SAND[0] + 1.2, SAND[1] + 1.2]) || [SAND[0], SAND[1]];
      return find(inPond, PONDBOX) || [POND.c[0], POND.c[1]];
    }
    // オオサンショウウオ：せせらぎ と いけの ふかい ところ（いりぐち ちかく）
    return find((x, z) => inStream(x, z) || (inPond(x, z) && ell(x, z, POND) < 0.75 && x < 2.5), [-7, -4.5, 3, 1]) || [DEN[0], DEN[1] + 0.3];
  }
  function yAt(species, key, x, z, given) {
    if (given !== undefined) return given;
    const b = behavior(species, key);
    const h = H(x, z);
    if (b === 'egg') return species === 'kaeru' ? WATER_WET - 0.035 : h;
    if (b === 'swimWet') return (inPuddle(x, z) ? WATER_WET : WATER) - 0.04;
    if (b === 'turtle') return inPond(x, z) ? WATER - 0.09 : h;
    if (b === 'deep') return Math.max(h + 0.01, h);
    return Math.max(h, inPuddle(x, z) ? WATER_WET : -9);
  }

  function makeAnimal(a) {
    const [name, s] = LOOKS[a.species][a.key];
    const src = GLB.animals.children.find((c) => c.name === name);
    const g = new THREE.Group();
    const m = src.clone(true);
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      // たまごの ゼリーは すける
      if (/jelly|string/.test(o.name)) {
        o.material = o.material.clone();
        Object.assign(o.material, { transparent: true, opacity: 0.55, depthWrite: false });
      }
    });
    g.add(m);
    g.scale.setScalar(s);
    g.userData.petId = a.id;
    const tail = m.getObjectByName('tail');
    const p = spot(a.species, a.key) || [0, 0];
    g.position.set(p[0], yAt(a.species, a.key, p[0], p[1], p[2]), p[1]);
    g.rotation.y = Math.random() * Math.PI * 2;
    animalsLayer.add(g);
    return { a, g, tail, b: behavior(a.species, a.key), from: g.position.clone(), to: g.position.clone(), t: 1, wait: Math.random() * 3, phase: Math.random() * 10, hop: 0 };
  }

  function next(act) {
    const p = spot(act.a.species, act.a.key);
    if (!p) return;
    // カエルは ちかくへ ぴょん
    if (act.b === 'hop' && Math.hypot(p[0] - act.g.position.x, p[1] - act.g.position.z) > 1.6) {
      const dx = p[0] - act.g.position.x, dz = p[1] - act.g.position.z, d = Math.hypot(dx, dz);
      const k = 1.2 / d;
      const x = act.g.position.x + dx * k, z = act.g.position.z + dz * k;
      if (onWetLand(x, z)) { p[0] = x; p[1] = z; p[2] = undefined; }
    }
    act.from.copy(act.g.position);
    act.to.set(p[0], yAt(act.a.species, act.a.key, p[0], p[1], p[2]), p[1]);
    const dist = act.from.distanceTo(act.to);
    const speed = { swimWet: 0.35, hop: 1.6, turtle: 0.22, deep: 0.12 }[act.b] || 0.2;
    act.dur = Math.max(0.6, dist / speed);
    act.t = 0;
    act.yaw = Math.atan2(act.to.x - act.from.x, act.to.z - act.from.z);
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function step(dt, t) {
    for (const act of actors.values()) {
      const g = act.g;
      if (act.b === 'egg') {
        if (act.a.species === 'kaeru') g.position.y = WATER_WET - 0.035 + Math.sin(t * 1.2 + act.phase) * 0.005;
        continue;
      }
      if (act.t >= 1) {
        if ((act.wait -= dt) <= 0) {
          next(act);
          act.wait = act.b === 'hop' ? rnd(2, 6) : act.b === 'turtle' ? rnd(1, 7) : rnd(0.3, 2.5);
        }
      } else {
        act.t = Math.min(1, act.t + dt / act.dur);
        const k = act.b === 'hop' ? act.t : act.t * act.t * (3 - 2 * act.t);
        g.position.lerpVectors(act.from, act.to, k);
        if (act.b === 'hop') g.position.y += Math.sin(Math.PI * act.t) * 0.35;
        else if (act.b !== 'egg') g.position.y = act.from.y + (act.to.y - act.from.y) * k;
        // むきを すこしずつ かえる
        let dy = act.yaw - g.rotation.y;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        g.rotation.y += dy * Math.min(1, dt * (act.b === 'hop' ? 12 : 3));
      }
      const moving = act.t < 1;
      if (act.tail) act.tail.rotation.y = Math.sin(t * (moving ? 10 : 3) + act.phase) * (moving ? 0.5 : 0.15);
      if (act.b === 'swimWet' || act.b === 'deep') g.rotation.z = Math.sin(t * 4 + act.phase) * 0.04;
    }
    if (wheel) wheel.rotation.z -= dt * 0.6;
    for (const m of waterMats) { m.normalMap.offset.x = (t * 0.012) % 1; m.normalMap.offset.y = (t * 0.007) % 1; }
    if (ring) {
      const act = actors.get(selected);
      ring.visible = !!act;
      if (act) { ring.position.set(act.g.position.x, act.g.position.y + 0.02, act.g.position.z); ring.scale.setScalar(0.25 + 0.25 * act.g.scale.x); ring.rotation.z = t; }
    }
    if (fly) {
      fly.t = Math.min(1, fly.t + dt * 1.5);
      const k = fly.t * fly.t * (3 - 2 * fly.t);
      controls.target.lerpVectors(fly.t0, fly.t1, k);
      camera.position.lerpVectors(fly.c0, fly.c1, k);
      if (fly.t >= 1) fly = null;
    }
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    step(dt, clock.elapsedTime);
    controls.update();
    renderer.render(scene, camera);
  }

  // タップで えらぶ
  const ray = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    // ちいさい いきもの も えらびやすい ように、ちかくを とおった いきものを えらぶ
    let best = null, bd = 1e9;
    for (const act of actors.values()) {
      const c = act.g.position.clone().add(V(0, 0.08, 0));
      const d = ray.ray.distanceSqToPoint(c);
      const lim = (0.25 + 0.25 * act.g.scale.x) ** 2;
      if (d < lim && d < bd) { bd = d; best = act.a.id; }
    }
    if (best || !e.shiftKey) {
      api.select(best);
      onSelect(best);
    }
  });

  // ぜんたいが はいる カメラの いち（よこ 17・おくゆき 12 が おさまる きょり）
  function homeView() {
    const vf = (camera.fov * Math.PI) / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const d = Math.max(8.6 / Math.tan(hf / 2), 7.5 / Math.tan(vf / 2)) * 0.95;
    const dir = V(0, 0.62, 0.78).normalize();
    return { target: V(0, 0, 0.4), pos: V(0, 0, 0.4).add(dir.multiplyScalar(d)) };
  }
  let userMoved = false;
  controls.addEventListener('start', () => (userMoved = true));
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!userMoved && !selected) {
      const hv = homeView();
      camera.position.copy(hv.pos);
      controls.target.copy(hv.target);
      controls.update();
    }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const api = {
    ready: loadBioModels().then(() => {
      setupWorld();
      ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffd447 }));
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      scene.add(ring);
      api.setAnimals(api._pending || []);
    }),
    setAreas(list) {
      areas = new Set(list);
      if (heights) applyAreas();
    },
    // list：[{ id, species, key }]
    setAnimals(list) {
      api._pending = list;
      if (!GLB.animals || !heights) return;
      const ids = new Set(list.map((a) => a.id));
      for (const [id, act] of actors) if (!ids.has(id) || list.find((a) => a.id === id).key !== act.a.key) { animalsLayer.remove(act.g); actors.delete(id); }
      for (const a of list) if (!actors.has(a.id)) actors.set(a.id, makeAnimal(a));
    },
    select(id) {
      selected = id;
      const act = actors.get(id);
      if (act) {
        // その いきものへ カメラを よせる
        const t1 = act.g.position.clone();
        const dir = camera.position.clone().sub(controls.target).normalize();
        const dist = 1.6 + 1.4 * act.g.scale.x;
        fly = { t: 0, t0: controls.target.clone(), t1, c0: camera.position.clone(), c1: t1.clone().add(dir.multiplyScalar(dist)) };
      }
    },
    overview() {
      const hv = homeView();
      fly = { t: 0, t0: controls.target.clone(), t1: hv.target, c0: camera.position.clone(), c1: hv.pos };
    },
    feed() {
      // みずに えさが ういて しずむ
      const geo = new THREE.SphereGeometry(0.025, 6, 4);
      const mat = new THREE.MeshStandardMaterial({ color: 0x6aa84f });
      for (const act of [...actors.values()].slice(0, 12)) {
        for (let i = 0; i < 3; i++) {
          const m = new THREE.Mesh(geo, mat);
          m.position.copy(act.g.position).add(V(rnd(-0.3, 0.3), 0.15, rnd(-0.3, 0.3)));
          scene.add(m);
          const y0 = m.position.y;
          const t0 = performance.now();
          const tick = () => {
            const k = (performance.now() - t0) / 2500;
            m.position.y = y0 - k * 0.2;
            if (k < 1) requestAnimationFrame(tick);
            else scene.remove(m);
          };
          requestAnimationFrame(tick);
        }
      }
    },
    // たしかめ よう
    advance(sec) { for (let i = 0; i < sec / 0.05; i++) step(0.05, i * 0.05); },
    snapshot() { controls.update(); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', 0.85); },
    view(pos, target) { camera.position.set(...pos); controls.target.set(...target); controls.update(); },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
  loop();
  return api;
}
