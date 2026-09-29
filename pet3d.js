// むしの おへやの 3D（three.js）。しいくケースの なかを むしが あるきまわる。
//   ゆびで ドラッグ：まわす／ピンチ：ズーム／タップ：むしを えらぶ（ダンゴムシは まるくなる）
// たんい は cm。むしの モデルは からだの ながさ 1 で つくって、おおきさに あわせて かくだいする。

// import map を つかわない（ふるい iPad の Safari・Chrome は import map に たいおう していない）。
// jsDelivr の +esm は OrbitControls などの なかの 'three' も おなじ URL に かきかえて くれる
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js/+esm';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js/+esm';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, envMapIntensity: 0.6, ...opts });

// つやつやの からだ（こうちゅうの はね など）
const shiny = (color, opts = {}) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.42, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.5, ...opts,
});

function ellipsoid(material, sx, sy, sz, pos, seg = 24) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.65))), material);
  m.scale.set(sx, sy, sz);
  if (pos) m.position.copy(pos);
  return m;
}

// a から b へ のびる つつ
function rod(material, a, b, r1, r2 = r1) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, dir.length(), 8), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  return m;
}

function cone(material, a, b, r) {
  return rod(material, a, b, r, 0.001);
}

// ふとさが だんだん かわる まがった つつ（つの・おおあご）。r0：ねもと、r1：さき
function taper(material, points, r0, r1, seg = 20, radial = 10) {
  const path = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(path, seg, 1, radial, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    path.getPointAt(i / seg, c);
    const r = r0 + (r1 - r0) * Math.pow(i / seg, 0.9);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, material));
  g.add(ellipsoid(material, r0, r0, r0, points[0], 12)); // ねもとの ふた
  g.userData.path = path;
  return g;
}

// だえんたいの ひょうめんに そった せん（はねの すじ・あわせめ）
function surfaceLine(material, e, x, from, to, r = 0.004) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const z = from + (to - from) * (i / 12);
    const q = 1 - (x / e.sx) ** 2 - ((z - e.cz) / e.sz) ** 2;
    if (q <= 0) continue;
    pts.push(V(x, e.cy + e.sy * Math.sqrt(q) + 0.002, z));
  }
  return pts.length > 2 ? taper(material, pts, r, r, 16, 5) : new THREE.Group();
}

// こんちゅうの あし：つけね（きせつ）→ もも（たいせつ）→ すね（けいせつ・とげ）→ あしさき（ふせつ・つめ）
function buildLeg(mat, s, { len, hipY, fwd, thick, spines = 0, flat = 1 }) {
  const pivot = new THREE.Group();
  const coxa = V(s * len * 0.1, -hipY * 0.12, fwd * 0.05);
  const knee = V(s * len * 0.42, len * 0.07, fwd * 0.35);
  const ankle = V(s * len * 0.8, -hipY + len * 0.07, fwd * 0.8);
  const toe = V(s * len * 0.97, -hipY + 0.005, fwd * 1.02 + len * 0.03);
  pivot.add(rod(mat, V(0, 0, 0), coxa, thick * 1.4, thick * 1.2));
  pivot.add(ellipsoid(mat, thick * 1.2, thick * 1.2, thick * 1.2, coxa, 10));
  pivot.add(rod(mat, coxa, knee, thick * 1.2, thick));
  pivot.add(ellipsoid(mat, thick, thick, thick, knee, 10));
  const tibia = rod(mat, knee, ankle, thick * 0.8, thick * 1.05);
  tibia.scale.x = flat; // こうちゅうの すねは ひらたい
  pivot.add(tibia);
  for (let i = 1; i <= spines; i++) {
    const p = knee.clone().lerp(ankle, 0.25 + (0.7 * i) / (spines + 1));
    pivot.add(cone(mat, p, p.clone().add(V(s * len * 0.07, len * 0.015, fwd * 0.04)), thick * 0.35));
  }
  for (let i = 1; i <= 4; i++) {
    const p = ankle.clone().lerp(toe, i / 4.4);
    pivot.add(ellipsoid(mat, thick * 0.34, thick * 0.3, thick * 0.5, p, 8));
  }
  for (const c of [-1, 1]) {
    pivot.add(cone(mat, toe, toe.clone().add(V(s * len * 0.03 + c * len * 0.025, -len * 0.01, len * 0.04)), thick * 0.22));
  }
  return pivot;
}

// あしを ぜんぶ つける。pivot を まわして あるく（3ぼんずつ こうたいに うごく）
function addLegs(group, mat, { hips, side, len, hipY, thick, spread = [0.3, 0, -0.35], spines = [0], flat = 1, lens }) {
  const legs = [];
  hips.forEach((z, i) => {
    for (const s of [-1, 1]) {
      const L = lens ? lens[Math.min(i, lens.length - 1)] : len;
      const pivot = buildLeg(mat, s, {
        len: L, hipY, thick, flat,
        fwd: L * spread[Math.min(i, spread.length - 1)],
        spines: spines[Math.min(i, spines.length - 1)],
      });
      pivot.position.set(s * side, hipY, z);
      pivot.userData = { side: s, phase: (i + (s > 0 ? 1 : 0)) % 2 ? Math.PI : 0 };
      group.add(pivot);
      legs.push(pivot);
    }
  });
  return legs;
}

// しょっかく。pivot を ゆらす
function antennaPivot(parent, base) {
  const p = new THREE.Group();
  p.position.copy(base);
  parent.add(p);
  return p;
}

// ---------- むしの モデル ----------

function buildAnt() {
  const g = new THREE.Group();
  const body = shiny(0x1e1310, { roughness: 0.35, clearcoat: 0.8 });
  const limb = std(0x2b1c16, { roughness: 0.5 });
  const eye = shiny(0x050505, { roughness: 0.1 });
  // はら（しまもよう）
  const gz = -0.31;
  g.add(ellipsoid(body, 0.18, 0.15, 0.23, V(0, 0.25, gz)));
  const band = std(0x3a2620, { roughness: 0.4 });
  for (const dz of [0.08, -0.02, -0.11]) {
    const q = Math.sqrt(1 - (dz / 0.23) ** 2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 28), band);
    ring.scale.set(0.18 * q + 0.002, 0.15 * q + 0.002, 1);
    ring.position.set(0, 0.25, gz + dz);
    g.add(ring);
  }
  g.add(ellipsoid(body, 0.04, 0.07, 0.04, V(0, 0.25, -0.06)));   // こしの ふし
  g.add(ellipsoid(body, 0.08, 0.075, 0.12, V(0, 0.23, 0.06)));   // むね
  g.add(ellipsoid(body, 0.07, 0.07, 0.07, V(0, 0.27, 0.16)));
  const head = new THREE.Group();
  head.position.set(0, 0.27, 0.33);
  g.add(head);
  head.add(ellipsoid(body, 0.12, 0.1, 0.12, V(0, 0, 0)));
  for (const s of [-1, 1]) {
    head.add(ellipsoid(eye, 0.03, 0.035, 0.03, V(s * 0.1, 0.03, 0.03), 12));
    head.add(taper(limb, [V(s * 0.04, -0.04, 0.1), V(s * 0.06, -0.05, 0.16), V(s * 0.01, -0.05, 0.2)], 0.018, 0.004));
  }
  const antennae = [];
  for (const s of [-1, 1]) {
    const a = antennaPivot(head, V(s * 0.05, 0.05, 0.09));
    a.add(rod(limb, V(0, 0, 0), V(s * 0.09, 0.08, 0.08), 0.011));       // ねもと（まがる まえ）
    for (let i = 1; i <= 8; i++) {                                         // まがった さき
      const t = i / 8;
      a.add(ellipsoid(limb, 0.012, 0.012, 0.016, V(s * (0.09 + 0.06 * t), 0.08 - 0.09 * t, 0.08 + 0.16 * t), 8));
    }
    antennae.push(a);
  }
  const legs = addLegs(g, limb, { hips: [0.12, 0.07, 0.02], side: 0.06, len: 0.5, hipY: 0.2, thick: 0.014, spread: [0.45, 0.05, -0.45] });
  const anim = (t) => antennae.forEach((a, i) => (a.rotation.x = Math.sin(t * 7 + i * 2) * 0.25));
  return { group: g, legs, anim };
}

function buildDango() {
  const g = new THREE.Group();
  const shell = shiny(0x44484f, { roughness: 0.45, clearcoat: 0.5 });
  const rim = std(0x6a6f76, { roughness: 0.5 });
  const pale = std(0xa89f92, { roughness: 0.6 });
  const body = new THREE.Group();
  // よろいの ような いた（あたまの つぎに 7まい ＋ おしりの ちいさい いた）
  const plates = [0.3, 0.32, 0.34, 0.345, 0.34, 0.33, 0.3, 0.24, 0.2, 0.16, 0.12];
  plates.forEach((w, i) => {
    const z = 0.36 - i * 0.075;
    const h = 0.18 * (0.55 + 0.45 * Math.sin(((i + 1) / (plates.length + 1)) * Math.PI));
    const plate = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    plate.scale.set(w, h, 0.07);
    plate.position.set(0, 0.03, z);
    body.add(plate);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(1, 0.018, 6, 24, Math.PI), rim);
    edge.scale.set(w, h, 0.3);
    edge.position.set(0, 0.03, z - 0.05);
    body.add(edge);
  });
  const head = ellipsoid(shell, 0.13, 0.08, 0.07, V(0, 0.05, 0.43));
  body.add(head);
  const eye = shiny(0x0a0a0a, { roughness: 0.1 });
  for (const s of [-1, 1]) body.add(ellipsoid(eye, 0.02, 0.02, 0.02, V(s * 0.1, 0.08, 0.45), 8));
  const antennae = [];
  for (const s of [-1, 1]) {
    const a = antennaPivot(body, V(s * 0.06, 0.06, 0.48));
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      a.add(ellipsoid(pale, 0.012, 0.012, 0.02, V(s * 0.1 * t, 0.02 * Math.sin(t * 3), 0.12 * t), 8));
    }
    antennae.push(a);
  }
  // しっぽの ちいさな つの
  for (const s of [-1, 1]) body.add(cone(rim, V(s * 0.06, 0.03, -0.42), V(s * 0.09, 0.02, -0.5), 0.02));
  g.add(body);
  const legs = addLegs(g, pale, {
    hips: [0.3, 0.2, 0.1, 0, -0.1, -0.2, -0.3], side: 0.13, len: 0.22, hipY: 0.05, thick: 0.009, spread: [0.15, 0.05, 0, 0, -0.05, -0.1, -0.15],
  });
  // まるまった とき
  const ball = new THREE.Group();
  ball.add(ellipsoid(shell, 0.3, 0.3, 0.3, V(0, 0.3, 0)));
  for (let i = -4; i <= 4; i++) {
    const zz = i * 0.065;
    const r = Math.sqrt(0.09 - zz * zz) + 0.004;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 32), rim);
    ring.position.set(0, 0.3, zz);
    ball.add(ring);
  }
  ball.visible = false;
  g.add(ball);
  const anim = (t) => antennae.forEach((a, i) => (a.rotation.y = Math.sin(t * 3 + i * 1.7) * 0.3));
  return { group: g, legs, body, ball, anim };
}

// こうちゅうの いろ：light＝ひかりが あたる うえの いろ、dark＝ふちの くらい いろ
const BEETLE_STYLE = {
  kabuto: { light: 0x5e2412, dark: 0x100403, leg: 0x2c120a, rough: 0.28 },
  kanabun: { light: 0x3f8a46, dark: 0x0c2e16, leg: 0x1a2a1a, rough: 0.25, metal: true },
  kokuwa: { light: 0x302620, dark: 0x080605, leg: 0x1a1411, rough: 0.35, jaw: 0.6, head: 0.17, tooth: 'small', striae: true },
  nokogiri: { light: 0x5a220c, dark: 0x120503, leg: 0x2c1208, rough: 0.28, jaw: 1.05, head: 0.21, tooth: 'saw', curve: 0.9 },
  miyama: { light: 0x5a4527, dark: 0x1a1209, leg: 0x2c2012, rough: 0.55, jaw: 1.0, head: 0.24, tooth: 'fork', ears: true, hairy: true },
  ookuwa: { light: 0x2a2a30, dark: 0x040404, leg: 0x141414, rough: 0.3, jaw: 0.8, head: 0.22, tooth: 'big', thick: true, striae: true, curve: 0.6 },
};

// うえが あかるく、ふち・おなかがわが くらく なる だえんたい（しゃしんの ような つや）
function shadedEllipsoid(mat, sx, sy, sz, pos, st, seg = 40, box = 1) {
  const geo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
  const p = geo.attributes.position;
  const unit = p.array.slice(); // いろを きめる ための もとの むき
  const light = new THREE.Color(st.light);
  const dark = new THREE.Color(st.dark);
  const col = [];
  for (let i = 0; i < p.count; i++) {
    const x = unit[i * 3];
    const y = unit[i * 3 + 1];
    const z = unit[i * 3 + 2];
    // box < 1 で かどの まるい はこに ちかづく
    if (box !== 1) {
      const f = (v) => Math.sign(v) * Math.pow(Math.abs(v), box);
      p.setXYZ(i, f(x), f(y), f(z));
    }
    const t = Math.min(1, Math.max(0, 0.3 + 0.7 * y + 0.12 * z - 0.2 * Math.abs(x)));
    const c = dark.clone().lerp(light, Math.pow(t, 1.3));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (box !== 1) geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.copy(pos);
  return m;
}

// こうちゅうの ながい あし：つけね → もも（うえに まがる）→ すね（とげ）→ 5つの ふせつ → かぎづめ
function beetleLeg(mat, s, { len, hipY, fwd, thick, spines }) {
  const pivot = new THREE.Group();
  const coxa = V(s * len * 0.07, -hipY * 0.1, fwd * 0.03);
  const knee = V(s * len * 0.4, len * 0.13, fwd * 0.3);
  const ankle = V(s * len * 0.74, -hipY + len * 0.06, fwd * 0.72);
  const toe = V(s * len * 1.02, -hipY + 0.004, fwd * 1.05 + len * 0.06);
  pivot.add(ellipsoid(mat, thick * 1.4, thick * 1.2, thick * 1.4, V(0, 0, 0), 10));
  pivot.add(rod(mat, V(0, 0, 0), coxa, thick * 1.3, thick * 1.2));
  const femur = rod(mat, coxa, knee, thick * 1.35, thick * 1.05);
  femur.scale.z = 0.75; // ひらたい もも
  pivot.add(femur);
  pivot.add(ellipsoid(mat, thick * 0.95, thick * 0.95, thick * 0.95, knee, 10));
  pivot.add(rod(mat, knee, ankle, thick * 0.75, thick * 1.1));
  // すねの そとがわの とげ
  for (let i = 1; i <= spines; i++) {
    const q = knee.clone().lerp(ankle, 0.3 + (0.65 * i) / (spines + 1));
    pivot.add(cone(mat, q, q.clone().add(V(s * len * 0.06, len * 0.02, len * 0.02)), thick * 0.32));
  }
  // すねの さきの 2ほんの けづめ
  for (const c of [-1, 1]) pivot.add(cone(mat, ankle, ankle.clone().add(V(s * len * 0.02, -len * 0.03, c * len * 0.04)), thick * 0.3));
  // ふせつ（5つの ふし。さきほど ほそい）
  let prev = ankle;
  for (let i = 1; i <= 5; i++) {
    const q = ankle.clone().lerp(toe, i / 5);
    q.y += Math.sin((i / 5) * Math.PI) * len * 0.02;
    const r = thick * (0.55 - i * 0.05);
    pivot.add(rod(mat, prev, q, r * 1.1, r * 0.8));
    pivot.add(ellipsoid(mat, r, r, r, q, 8));
    prev = q;
  }
  // かぎづめ
  const dir = new THREE.Vector3().subVectors(toe, ankle).normalize();
  for (const c of [-1, 1]) {
    const side = V(-dir.z, 0, dir.x).multiplyScalar(c * len * 0.025);
    pivot.add(taper(mat, [toe, toe.clone().addScaledVector(dir, len * 0.04).add(side).add(V(0, 0.002, 0)), toe.clone().addScaledVector(dir, len * 0.06).add(side).add(V(0, -len * 0.025, 0))], thick * 0.28, thick * 0.05, 6, 6));
  }
  return pivot;
}

function beetleLegs(g, mat, { hips, side, lens, hipY, thick, spread, spines }) {
  const legs = [];
  hips.forEach((z, i) => {
    for (const s of [-1, 1]) {
      const L = lens[i];
      const pivot = beetleLeg(mat, s, { len: L, hipY, thick, fwd: L * spread[i], spines: spines[i] });
      pivot.position.set(s * side, hipY, z);
      pivot.userData = { side: s, phase: (i + (s > 0 ? 1 : 0)) % 2 ? Math.PI : 0 };
      g.add(pivot);
      legs.push(pivot);
    }
  });
  return legs;
}

// sizeRatio：0（ちいさい）〜 1（おおきい）。おおきい こほど つの・あごが ながい
function buildBeetle(species, sizeRatio) {
  const st = BEETLE_STYLE[species];
  const g = new THREE.Group();
  const shell = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: st.rough,
    metalness: st.metal ? 0.55 : 0.05,
    clearcoat: st.hairy ? 0.2 : 1,
    clearcoatRoughness: 0.12,
    sheen: st.hairy ? 0.35 : 0,
    sheenColor: 0xb89048,
    envMapIntensity: 0.9,
  });
  const legMat = shiny(st.leg, { roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.8 });
  const dark = shiny(0x120a07, { roughness: 0.4 });
  const under = std(0x1a100b, { roughness: 0.5 });
  const eye = shiny(0x050505, { roughness: 0.05, envMapIntensity: 1 });
  const k = 0.55 + 0.7 * sizeRatio;
  const isKabuto = species === 'kabuto' || species === 'kanabun';
  const head = new THREE.Group();
  const antennae = [];
  const jaws = [];
  let legs;

  if (isKabuto) {
    // ---- カブトムシ・カナブン：たかく もりあがった まるい からだ ----
    const kana = species === 'kanabun';
    const e = { sx: kana ? 0.26 : 0.28, sy: kana ? 0.16 : 0.19, sz: 0.44, cy: 0.23, cz: -0.18 };
    g.add(shadedEllipsoid(shell, e.sx, e.sy, e.sz, V(0, e.cy, e.cz), st, 48, 0.82));
    g.add(surfaceLine(dark, e, 0, 0.18, -0.52, 0.004));
    g.add(ellipsoid(under, 0.25, 0.1, 0.36, V(0, 0.13, -0.15)));
    g.add(ellipsoid(dark, 0.13, 0.1, 0.07, V(0, 0.25, 0.1)));                           // くびれ
    g.add(shadedEllipsoid(shell, kana ? 0.2 : 0.25, kana ? 0.13 : 0.16, kana ? 0.13 : 0.17, V(0, kana ? 0.24 : 0.25, 0.28), st, 40, 0.85)); // むね
    head.position.set(0, 0.15, 0.45);
    g.add(head);
    head.add(shadedEllipsoid(shell, 0.12, 0.07, 0.11, V(0, 0, 0), st, 24));
    for (const s of [-1, 1]) head.add(ellipsoid(eye, 0.03, 0.03, 0.03, V(s * 0.1, 0.02, 0.03), 14));
    for (const s of [-1, 1]) {
      const a = antennaPivot(head, V(s * 0.09, 0, 0.08));
      a.add(rod(legMat, V(0, 0, 0), V(s * 0.05, -0.01, 0.06), 0.008));
      for (let i = -1; i <= 1; i++) {
        const plate = ellipsoid(legMat, 0.006, 0.02, 0.035, V(s * 0.06, -0.01 + i * 0.015, 0.09), 8);
        plate.rotation.x = i * 0.3;
        a.add(plate);
      }
      antennae.push(a);
    }
    if (species === 'kabuto') {
      const horn = new THREE.MeshPhysicalMaterial({ color: 0x2a0f07, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.9 });
      // あたまの つの：まえに のびて おおきく うえに そり、さきが 2かい わかれる
      const P = (y, z) => V(0, y * k, z * k);
      const pts = [V(0, 0.03, 0.08), P(0.06, 0.24), P(0.16, 0.38), P(0.33, 0.47), P(0.5, 0.46)];
      head.add(taper(horn, pts, 0.075, 0.034, 28));
      const tip = pts[pts.length - 1];
      for (const s of [-1, 1]) {
        const mid = tip.clone().add(V(s * 0.05, 0.06, -0.02));
        head.add(taper(horn, [tip, tip.clone().add(V(s * 0.025, 0.03, 0)), mid], 0.032, 0.02, 8, 8));
        for (const t of [-1, 1]) {
          head.add(taper(horn, [mid, mid.clone().add(V(s * 0.02 + t * 0.012, 0.035, -0.01 + t * 0.012)), mid.clone().add(V(s * 0.03 + t * 0.025, 0.06, -0.02 + t * 0.02))], 0.02, 0.004, 8, 6));
        }
      }
      // むねの つの：みじかく まえに つきでて さきが ふたまた
      const tb = V(0, 0.42, 0.3);
      const tt = V(0, 0.45 + 0.02 * k, 0.4 + 0.07 * k);
      g.add(taper(horn, [tb, V(0, 0.45, 0.35), tt], 0.045, 0.02, 12));
      for (const s of [-1, 1]) g.add(taper(horn, [tt, tt.clone().add(V(s * 0.02, 0.004, 0.025))], 0.015, 0.003, 6, 6));
    }
    legs = beetleLegs(g, legMat, {
      hips: [0.25, 0.08, -0.07], side: 0.16, lens: kana ? [0.46, 0.44, 0.48] : [0.62, 0.52, 0.58],
      hipY: 0.17, thick: kana ? 0.022 : 0.028, spread: [0.55, 0.05, -0.55], spines: [4, 2, 2],
    });
  } else {
    // ---- クワガタ：ほそながい はね、はばの ひろい むね、おおきな あたまと おおあご ----
    const e = { sx: 0.25, sy: 0.15, sz: 0.42, cy: 0.22, cz: -0.22 };
    g.add(shadedEllipsoid(shell, e.sx, e.sy, e.sz, V(0, e.cy, e.cz), st, 48, 0.8));
    g.add(surfaceLine(dark, e, 0, 0.14, -0.6, 0.004));
    if (st.striae) for (const x of [-0.15, -0.08, 0.08, 0.15]) g.add(surfaceLine(dark, e, x, 0.1, -0.55, 0.0022));
    g.add(ellipsoid(under, 0.22, 0.08, 0.38, V(0, 0.13, -0.2)));
    g.add(ellipsoid(dark, 0.11, 0.07, 0.05, V(0, 0.22, 0.22)));                         // くびれ
    // むね：はねと おなじくらい はばひろく、かどが ある
    g.add(shadedEllipsoid(shell, 0.26, 0.11, 0.13, V(0, 0.23, 0.33), st, 40, 0.7));
    for (const s of [-1, 1]) g.add(shadedEllipsoid(shell, 0.05, 0.08, 0.1, V(s * 0.24, 0.22, 0.35), st, 16));
    // あたま：おおきくて はばひろい
    const hw = st.head * (0.8 + 0.3 * sizeRatio);
    head.position.set(0, 0.2, 0.53);
    g.add(head);
    head.add(shadedEllipsoid(shell, hw, 0.075, 0.12, V(0, 0, 0), st, 32, 0.72));
    if (st.ears) for (const s of [-1, 1]) head.add(shadedEllipsoid(shell, 0.06, 0.06, 0.08, V(s * hw * 0.9, 0.015, -0.03), st, 16));
    for (const s of [-1, 1]) head.add(ellipsoid(eye, 0.03, 0.028, 0.03, V(s * hw * 0.88, 0.01, 0.06), 14));
    // しょっかく：ながい ねもとで まがって、さきが くし
    for (const s of [-1, 1]) {
      const a = antennaPivot(head, V(s * hw * 0.7, 0.01, 0.1));
      a.add(rod(legMat, V(0, 0, 0), V(s * 0.14, 0.02, 0.04), 0.008));
      a.add(rod(legMat, V(s * 0.14, 0.02, 0.04), V(s * 0.19, 0.02, 0.12), 0.006));
      for (let i = 0; i < 4; i++) a.add(ellipsoid(legMat, 0.006, 0.018, 0.012, V(s * (0.19 + i * 0.011), 0.02, 0.12 + i * 0.006), 8));
      antennae.push(a);
    }
    // おおあご
    const jawMat = new THREE.MeshPhysicalMaterial({ color: st.light, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.9 });
    jawMat.color.lerp(new THREE.Color(st.dark), 0.45);
    const L = st.jaw * k;
    const r0 = st.thick ? 0.058 : 0.045;
    const bend = st.curve || 0.3;
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * hw * 0.55, -0.005, 0.1);
      head.add(pivot);
      const pts = [
        V(0, 0, 0),
        V(s * 0.06, 0.01, 0.12 * L),
        V(s * 0.05, 0.02 - 0.02 * bend, 0.26 * L),
        V(-s * 0.05 * bend, 0.015 - 0.03 * bend, 0.36 * L),
      ];
      const jaw = taper(jawMat, pts, r0, 0.006, 28);
      pivot.add(jaw);
      const path = jaw.userData.path;
      const tooth = (u, size, up = 0) => {
        const q = path.getPointAt(u);
        pivot.add(cone(jawMat, q, q.clone().add(V(-s * size, up, size * 0.3)), size * 0.35));
      };
      if (st.tooth === 'saw') for (let i = 0; i < 8; i++) tooth(0.22 + i * 0.075, 0.028);
      if (st.tooth === 'big') tooth(0.4, 0.065, 0.01);
      if (st.tooth === 'small') tooth(0.68, 0.035);
      if (st.tooth === 'fork') {
        for (const u of [0.35, 0.5, 0.62]) tooth(u, 0.028);
        const q = path.getPointAt(0.92);
        pivot.add(cone(jawMat, q, q.clone().add(V(0, 0.06, 0.02)), 0.016));
      }
      jaws.push({ pivot, s });
    }
    legs = beetleLegs(g, legMat, {
      hips: [0.3, 0.1, -0.08], side: 0.15, lens: [0.62, 0.56, 0.62],
      hipY: 0.16, thick: 0.024, spread: [0.6, 0.05, -0.6], spines: [3, 1, 1],
    });
  }

  const phase = Math.random() * 10;
  const anim = (t) => {
    antennae.forEach((a, i) => {
      a.rotation.y = Math.sin(t * 2.2 + phase + i * 2) * 0.18;
      a.rotation.x = Math.sin(t * 1.3 + phase + i) * 0.1;
    });
    // クワガタは ときどき おおあごを ひらく
    const open = Math.max(0, Math.sin(t * 0.8 + phase) - 0.6) * 0.9;
    for (const j of jaws) j.pivot.rotation.y = j.s * open;
    head.rotation.x = Math.sin(t * 0.6 + phase) * 0.05;
  };
  return { group: g, legs, anim };
}

function buildLarva() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  // C のかたちの 1ぽんの からだ。おしりは ふとくて くろっぽい（つちを たべて いるので）
  const R = 0.3;
  const A = Math.PI * 1.42;
  const at = (u) => V(Math.cos(u * A) * R, 0.13, -Math.sin(u * A) * R);
  const radius = (u) => (u < 0.22 ? 0.155 - u * 0.06 : 0.142 - (u - 0.22) * 0.04);
  const pts = [];
  for (let i = 0; i <= 24; i++) pts.push(at(i / 24));
  const path = new THREE.CatmullRomCurve3(pts);
  const seg = 72;
  const radial = 18;
  const geo = new THREE.TubeGeometry(path, seg, 1, radial, false);
  const pos = geo.attributes.position;
  const colors = [];
  const cream = new THREE.Color(0xe6d7b4);
  const gray = new THREE.Color(0x8a857a);
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    path.getPointAt(u, c);
    // ふしの くびれ
    const crease = 1 - 0.07 * Math.pow(Math.abs(Math.cos(u * 11 * Math.PI)), 12);
    const tip = Math.sqrt(Math.sin(Math.min(1, u / 0.05) * Math.PI / 2)); // おしりの さきは まるく とじる
    const r = radius(u) * crease * Math.max(0.02, tip);
    const col = gray.clone().lerp(cream, Math.min(1, Math.max(0, (u - 0.12) / 0.14)));
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
      colors.push(col.r, col.g, col.b);
    }
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const skin = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.55, sheen: 0.2, sheenColor: 0xffffff, clearcoat: 0.2, envMapIntensity: 0.45,
  });
  body.add(new THREE.Mesh(geo, skin));
  // きもん（いきを する あな）
  const spot = std(0xb06428, { roughness: 0.5 });
  for (let i = 1; i <= 9; i++) {
    const u = i / 11;
    const p = at(u);
    const out = V(Math.cos(u * A), 0, -Math.sin(u * A));
    body.add(ellipsoid(spot, 0.016, 0.02, 0.012, p.clone().addScaledVector(out, radius(u) * 0.93).add(V(0, 0.045, 0)), 8));
  }
  // あたま・あご・ちいさな あし 6ぽん
  const headMat = shiny(0xa85a1c, { roughness: 0.35 });
  const dark = shiny(0x1a0e08, { roughness: 0.35 });
  const ha = A + 0.28;
  const hc = V(Math.cos(ha) * R, 0.13, -Math.sin(ha) * R);
  const head = ellipsoid(headMat, 0.11, 0.1, 0.09, hc);
  head.rotation.y = ha;
  body.add(head);
  const fwd = V(-Math.sin(ha), 0, -Math.cos(ha));
  const side = V(Math.cos(ha), 0, -Math.sin(ha));
  for (const s of [-1, 1]) {
    const b = hc.clone().addScaledVector(fwd, 0.07).addScaledVector(side, s * 0.04).add(V(0, -0.03, 0));
    body.add(cone(dark, b, b.clone().addScaledVector(fwd, 0.05).addScaledVector(side, -s * 0.02).add(V(0, -0.02, 0)), 0.02));
  }
  for (const u of [0.86, 0.91, 0.96]) {
    const inward = V(-Math.cos(u * A), 0, Math.sin(u * A));
    const base = at(u).addScaledVector(inward, radius(u) * 0.7);
    for (const dy of [-0.06, 0.06]) {
      body.add(rod(headMat, base.clone().add(V(0, dy * 0.6, 0)), base.clone().addScaledVector(inward, 0.07).add(V(0, dy - 0.03, 0)), 0.011, 0.006));
    }
  }
  // いきを して すこし ふくらむ
  const anim = (t) => {
    body.scale.y = 1 + Math.sin(t * 2) * 0.03;
    body.scale.x = 1 - Math.sin(t * 2) * 0.015;
  };
  return { group: g, legs: [], anim };
}

function buildPupa(species) {
  const g = new THREE.Group();
  const room = new THREE.Mesh(new THREE.CircleGeometry(1, 28), std(0x2e1a0e));
  room.rotation.x = -Math.PI / 2;
  room.scale.set(0.34, 0.6, 1);
  room.position.y = 0.01;
  g.add(room);
  const skin = shiny(0xb4682a, { roughness: 0.35, clearcoat: 0.7 });
  const fold = shiny(0x9a5522, { roughness: 0.4 });
  // おなか（ふしが ならぶ）
  for (let i = 0; i < 6; i++) {
    const w = 0.2 - i * 0.022;
    g.add(ellipsoid(skin, w, w * 0.78, 0.06, V(0, 0.13, -0.04 - i * 0.065)));
  }
  g.add(ellipsoid(skin, 0.22, 0.16, 0.2, V(0, 0.15, 0.1)));        // むね
  g.add(ellipsoid(skin, 0.12, 0.1, 0.1, V(0, 0.14, 0.3)));         // あたま
  for (const s of [-1, 1]) {
    const pad = ellipsoid(fold, 0.05, 0.08, 0.2, V(s * 0.17, 0.12, 0.0));    // たたまれた はね
    pad.rotation.y = s * 0.15;
    g.add(pad);
    for (const [z0, z1] of [[0.22, 0.05], [0.17, -0.02], [0.12, -0.1]]) {   // たたまれた あし
      g.add(rod(fold, V(s * 0.09, 0.03, z0), V(s * 0.05, 0.03, z1), 0.018, 0.012));
    }
  }
  if (species === 'kabuto') {
    g.add(taper(fold, [V(0, 0.17, 0.36), V(0, 0.19, 0.46), V(0, 0.23, 0.53), V(0, 0.29, 0.57)], 0.035, 0.018, 16));
  } else if (BEETLE_STYLE[species] && BEETLE_STYLE[species].jaw) {
    for (const s of [-1, 1]) g.add(taper(fold, [V(s * 0.05, 0.12, 0.36), V(s * 0.07, 0.12, 0.46), V(s * 0.03, 0.12, 0.54)], 0.035, 0.012, 10));
  }
  return { group: g, legs: [] };
}

// ---------- Blender で つくった むし（models/bug_*.glb） ----------
// よみこめた しゅるいは そちらを つかう。まだ・よめない ときは プログラムで つくった むし
// larva・pupa は どの こうちゅうの ようちゅう・さなぎにも つかう
const BUG_NAMES = ['kabuto', 'kanabun', 'kokuwa', 'nokogiri', 'miyama', 'ookuwa', 'ant', 'dango', 'larva', 'pupa'];
const BUGS = {};
// ケースの なかの もの（blender/props.py）：まるた・おちば・とまりぎ
const CASE_PROPS = ['log', 'leaves', 'perch'];
const PROPS = {};
const bugListeners = new Set();

// Blender の ものの コピー。うすい はっぱは ぬきで かく
function propClone(name) {
  const src = PROPS[name];
  if (!src) return null;
  const g = src.clone(true);
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material.transparent || o.name.includes('leaf')) {
      o.material = o.material.clone();
      Object.assign(o.material, { transparent: false, alphaTest: 0.5, side: THREE.DoubleSide });
    }
  });
  return g;
}
let bugsLoading = null;

export function loadBugs() {
  if (!bugsLoading) {
    bugsLoading = (async () => {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm'),
        import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/meshopt_decoder.module.js/+esm'),
      ]);
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      await Promise.all([
        ...BUG_NAMES.map((n) => loader.loadAsync(`models/bug_${n}.glb`)
          .then((g) => { BUGS[n] = bakeMeshes(g.scene); })
          .catch((e) => console.warn(`bug_${n}.glb を よみこめませんでした`, e))),
        ...CASE_PROPS.map((n) => loader.loadAsync(`models/prop_${n}.glb`)
          .then((g) => { PROPS[n] = bakeMeshes(g.scene); })
          .catch((e) => console.warn(`prop_${n}.glb を よみこめませんでした`, e))),
      ]);
      bugListeners.forEach((fn) => fn());
    })().catch((e) => console.warn('むしの モデルを よみこめませんでした', e));
  }
  return bugsLoading;
}

// かるく する ときに かたちが ちいさな かずに まとめられ、いちと おおきさが メッシュに ついている。
// それを かたちに もどして、メッシュの いちは 0 に する（あし などの ふしの いちは おやの から が もっている）
function bakeMeshes(root) {
  root.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.matrix;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const src = o.geometry.attributes;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(src.position.count * 3);
    for (let i = 0; i < src.position.count; i++) {
      v.fromBufferAttribute(src.position, i).applyMatrix4(m);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (src.normal) {
      const nor = new Float32Array(src.normal.count * 3);
      for (let i = 0; i < src.normal.count; i++) {
        v.fromBufferAttribute(src.normal, i).applyMatrix3(nm).normalize();
        nor.set([v.x, v.y, v.z], i * 3);
      }
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    }
    if (src.uv) {
      const uv = new Float32Array(src.uv.count * 2);
      for (let i = 0; i < src.uv.count; i++) uv.set([src.uv.getX(i), src.uv.getY(i)], i * 2);
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    if (o.geometry.index) geo.setIndex(o.geometry.index.clone());
    if (!src.normal) geo.computeVertexNormals();
    o.geometry.dispose();
    o.geometry = geo;
    o.position.set(0, 0, 0);
    o.quaternion.identity();
    o.scale.set(1, 1, 1);
    o.material.envMapIntensity = 0.6; // うつりこみが つよいと くろい からが はいいろに みえる
  });
  return root;
}

// Blender の こうちゅう：あし・しょっかく・あご・つのの ふしを さがして うごかす
function buildBugModel(species, sizeRatio) {
  const g = BUGS[species].clone(true);
  const legs = [];
  const antennae = [];
  const jaws = [];
  let head = null;
  let body = null;
  let ball = null;
  const k = 0.55 + 0.7 * sizeRatio; // おおきい こほど つの・あごが ながい
  g.traverse((o) => {
    const leg = o.name.match(/^leg_(\d)_([LR])$/);
    const jaw = o.name.match(/^jaw_([LR])$/);
    if (leg) {
      const side = leg[2] === 'L' ? 1 : -1;
      o.userData = { side, phase: (Number(leg[1]) + (side > 0 ? 1 : 0)) % 2 ? Math.PI : 0 };
      legs.push(o);
    } else if (/^ant_[LR]$/.test(o.name)) {
      antennae.push(o);
    } else if (jaw) {
      o.scale.setScalar(k);
      jaws.push({ pivot: o, s: jaw[1] === 'L' ? 1 : -1 });
    } else if (o.name === 'horn') {
      o.scale.setScalar(k);
    } else if (o.name === 'head') {
      head = o;
    } else if (o.name === 'body') {
      body = o;             // ダンゴムシ：あるく ときの からだ
    } else if (o.name === 'ball') {
      ball = o;             // ダンゴムシ：まるまった ところ
      o.visible = false;
    }
  });
  const phase = Math.random() * 10;
  const anim = (t) => {
    antennae.forEach((a, i) => {
      a.rotation.y = Math.sin(t * 2.2 + phase + i * 2) * 0.18;
      a.rotation.x = Math.sin(t * 1.3 + phase + i) * 0.1;
    });
    const open = Math.max(0, Math.sin(t * 0.8 + phase) - 0.6) * 0.9;
    for (const j of jaws) j.pivot.rotation.y = j.s * open;
    if (head) head.rotation.x = Math.sin(t * 0.6 + phase) * 0.05;
  };
  return { group: g, legs, body, ball, anim };
}

// Blender の ようちゅう：body を すこし ふくらませて いきを する
function buildLarvaModel() {
  const g = BUGS.larva.clone(true);
  const body = g.getObjectByName('body') || g;
  const anim = (t) => {
    body.scale.y = 1 + Math.sin(t * 2) * 0.03;
    body.scale.x = 1 - Math.sin(t * 2) * 0.015;
  };
  return { group: g, legs: [], anim };
}

// Blender の さなぎ：カブトは つの、クワガタは あごを だす
function buildPupaModel(species) {
  const g = BUGS.pupa.clone(true);
  const horn = g.getObjectByName('pupa_horn');
  const jaws = g.getObjectByName('pupa_jaws');
  if (horn) horn.visible = species === 'kabuto';
  if (jaws) jaws.visible = species !== 'kabuto' && !!(BEETLE_STYLE[species] && BEETLE_STYLE[species].jaw);
  return { group: g, legs: [] };
}

// Blender の モデルが よみこめて いるか
function hasModel(p) {
  if (p.stage === 'larva') return !!BUGS.larva;
  if (p.stage === 'pupa') return !!BUGS.pupa;
  return !!BUGS[p.species];
}

function buildModel(p) {
  if (p.stage === 'larva') return BUGS.larva ? buildLarvaModel() : buildLarva();
  if (p.stage === 'pupa') return BUGS.pupa ? buildPupaModel(p.species) : buildPupa(p.species);
  if (BUGS[p.species]) return buildBugModel(p.species, p.sizeRatio ?? 0.5);
  if (p.species === 'ant') return buildAnt();
  if (p.species === 'dango') return buildDango();
  return buildBeetle(p.species, p.sizeRatio ?? 0.5);
}

// ずかん よう：1ぴきを くるくる まわして みせる
export function createModelViewer(container, { species, stage = 'adult', sizeRatio = 0.7 }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  const model = buildModel({ species, stage, sizeRatio });
  const box = new THREE.Box3().setFromObject(model.group);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const turn = new THREE.Group();
  model.group.position.sub(center);
  turn.add(model.group);
  scene.add(turn);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 50);
  camera.position.set(size * 1.25, size * 0.75, size * 1.4);
  camera.lookAt(0, 0, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.5;
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
    if (model.anim) model.anim(clock.getElapsedTime());
    controls.update();
    renderer.render(scene, camera);
  };
  loop();
  return {
    renderOnce: () => renderer.render(scene, camera),
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
// ---------- ケース ----------

// つちの あつさ（cm）。ようちゅう・さなぎは つちの なかの ガラスぎわに いて、よこから みえる
export const SOIL = 9;

// ---------- マット・つくえの がぞう（キャンバスで 1かいだけ つくる） ----------
let CASE_TEX = null;
function heightToNormal(hx, W, strength) {
  const src = hx.getImageData(0, 0, W, W).data;
  const hAt = (x, y) => src[(((y + W) % W) * W + ((x + W) % W)) * 4] / 255;
  const c = document.createElement('canvas');
  c.width = c.height = W;
  const cx = c.getContext('2d');
  const img = cx.createImageData(W, W);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * strength;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * W + x) * 4;
      img.data[i] = (-dx / l * 0.5 + 0.5) * 255;
      img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function caseTextures() {
  if (CASE_TEX) return CASE_TEX;
  const W = 256;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = c.height = W;
    return [c, c.getContext('2d')];
  };
  // マット：くさった きの こまかい せんいと、あかるい きの かけら
  const [mc, mx] = mk();
  const [, hx] = mk();
  mx.fillStyle = '#3f2616';
  mx.fillRect(0, 0, W, W);
  hx.fillStyle = '#606060';
  hx.fillRect(0, 0, W, W);
  const fib = ['#6b4428', '#3a2212', '#7a5234', '#2c1a0e', '#8a6240', '#50301a'];
  const each = (fn) => {
    for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) fn(ox, oy);
  };
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * W;
    const y = Math.random() * W;
    const a = Math.random() * Math.PI * 2;
    const L = 2 + Math.random() * 6;
    const col = fib[Math.floor(Math.random() * fib.length)];
    const hv = 60 + Math.random() * 150;
    const lw = 0.6 + Math.random() * 1.4;
    each((ox, oy) => {
      for (const [ctx, style] of [[mx, col], [hx, `rgb(${hv | 0},${hv | 0},${hv | 0})`]]) {
        ctx.strokeStyle = style;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.quadraticCurveTo(x + ox + Math.cos(a + 0.6) * L * 0.5, y + oy + Math.sin(a + 0.6) * L * 0.5, x + ox + Math.cos(a) * L, y + oy + Math.sin(a) * L);
        ctx.stroke();
      }
    });
  }
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * W;
    const y = Math.random() * W;
    const a = Math.random() * Math.PI;
    const L = 3 + Math.random() * 5;
    const col = ['#b08a5a', '#9a7448', '#c49c68'][i % 3];
    each((ox, oy) => {
      for (const [ctx, style] of [[mx, col], [hx, '#e0e0e0']]) {
        ctx.save();
        ctx.translate(x + ox, y + oy);
        ctx.rotate(a);
        ctx.fillStyle = style;
        ctx.fillRect(-L / 2, -0.9, L, 1.8);
        ctx.restore();
      }
    });
  }
  const mat = new THREE.CanvasTexture(mc);
  mat.wrapS = mat.wrapT = THREE.RepeatWrapping;
  mat.colorSpace = THREE.SRGBColorSpace;
  // つくえの もくめ
  const [wc, wx] = mk();
  wx.fillStyle = '#d8bf98';
  wx.fillRect(0, 0, W, W);
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * W;
    wx.strokeStyle = `rgba(${130 + Math.random() * 30},${95 + Math.random() * 20},60,${0.1 + Math.random() * 0.15})`;
    wx.lineWidth = 0.6 + Math.random() * 2;
    wx.beginPath();
    for (let x = 0; x <= W; x += 8) wx.lineTo(x, y + Math.sin(x * 0.03 + i) * 3);
    wx.stroke();
  }
  const wood = new THREE.CanvasTexture(wc);
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.colorSpace = THREE.SRGBColorSpace;
  CASE_TEX = { mat, matN: heightToNormal(hx, W, 3.5), wood };
  return CASE_TEX;
}

const tex = (t, rx, ry) => {
  const c = t.clone();
  c.needsUpdate = true;
  c.repeat.set(rx, ry);
  return c;
};

function buildCase(dims) {
  const [w, d, h] = dims;
  const T = caseTextures();
  const g = new THREE.Group();
  // つくえ
  const table = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std(0xffffff, { map: tex(T.wood, 10, 10), roughness: 0.75 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -SOIL - 0.3;
  g.add(table);
  // マット：うえは ふんわり でこぼこ、ガラスぎわが すこし たかい
  const topGeo = new THREE.PlaneGeometry(w - 0.3, d - 0.3, Math.ceil(w / 1.2), Math.ceil(d / 1.2));
  topGeo.rotateX(-Math.PI / 2);
  const tp = topGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i);
    const z = tp.getZ(i);
    const edge = Math.max(Math.abs(x) / (w / 2), Math.abs(z) / (d / 2));
    const bump = Math.sin(x * 0.9) * Math.sin(z * 1.1) * 0.12 + Math.sin(x * 2.3 + z * 1.7) * 0.06;
    tp.setY(i, bump + Math.max(0, edge - 0.85) * 3);
  }
  topGeo.computeVertexNormals();
  const topMat = std(0xffffff, { map: tex(T.mat, w / 9, d / 9), normalMap: tex(T.matN, w / 9, d / 9), roughness: 1, envMapIntensity: 0.3 });
  g.add(new THREE.Mesh(topGeo, topMat));
  // つちの よこの めんは すこし すけて、なかの ようちゅうが みえる（うしろは すけない）
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xb09080, map: tex(T.mat, w / 9, SOIL / 9), roughness: 1, transparent: true, opacity: 0.72, depthWrite: false });
  const backMat = std(0x9a8070, { map: tex(T.mat, w / 9, SOIL / 9), roughness: 1 });
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  // めんの じゅんばん：+x, -x, うえ, した, まえ, うしろ
  // うえの めんの ふちが もりあがる ぶん（0.5）だけ たかく する
  const soil = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, SOIL + 0.5, d - 0.3), [sideMat, sideMat, hidden, hidden, sideMat, backMat]);
  soil.position.y = -SOIL / 2 + 0.25;
  soil.renderOrder = 1;
  g.add(soil);
  // きの かけら
  const chips = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12, 0.35), std(0xffffff, { roughness: 0.9 }), Math.round((w * d) / 14));
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  for (let i = 0; i < chips.count; i++) {
    const s = 0.4 + Math.random() * 0.8;
    m.compose(V((Math.random() - 0.5) * (w - 1), 0.12, (Math.random() - 0.5) * (d - 1)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4)), V(s, s, s));
    chips.setMatrixAt(i, m);
    chips.setColorAt(i, c.set([0xa07a4a, 0x7a5634, 0xc09a68][i % 3]));
  }
  g.add(chips);
  // ケース：かどの まるい すける プラスチック
  const glassH = h - 3 + SOIL;
  const shell = new RoundedBoxGeometry(w + 0.4, glassH, d + 0.4, 3, Math.min(1.2, w * 0.04));
  for (const [side, op, order] of [[THREE.BackSide, 0.08, 2], [THREE.FrontSide, 0.1, 6]]) {
    const gl = new THREE.Mesh(shell, new THREE.MeshPhysicalMaterial({
      color: 0xe8f6ff, transparent: true, opacity: op, roughness: 0.04, envMapIntensity: 1.5, depthWrite: false, side,
    }));
    gl.position.y = glassH / 2 - SOIL;
    gl.renderOrder = order;
    g.add(gl);
  }
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.4, glassH, d + 0.4)), new THREE.LineBasicMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.6 }));
  edges.position.y = glassH / 2 - SOIL;
  g.add(edges);
  // ふた：まるい みどりの ふちと とって（うえから のぞける ように まんなかは あけて おく）
  const frame = new THREE.MeshPhysicalMaterial({ color: 0x2f8a55, roughness: 0.35, clearcoat: 0.5, envMapIntensity: 0.8 });
  const top = h - 3 + 0.4;
  for (const [fw, fd, x, z] of [[w + 1.2, 1.6, 0, d / 2], [w + 1.2, 1.6, 0, -d / 2], [1.6, d + 1.2, w / 2, 0], [1.6, d + 1.2, -w / 2, 0]]) {
    const bar = new THREE.Mesh(new RoundedBoxGeometry(fw, 1.0, fd, 2, 0.35), frame);
    bar.position.set(x, top, z);
    g.add(bar);
  }
  const handle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    V(-w * 0.28, top + 0.4, d / 2 - 0.2), V(-w * 0.22, top + 1.4, d / 2 + 0.1), V(0, top + 1.8, d / 2 + 0.2), V(w * 0.22, top + 1.4, d / 2 + 0.1), V(w * 0.28, top + 0.4, d / 2 - 0.2),
  ]), 30, 0.35, 8), frame);
  g.add(handle);
  // まるた（ごつごつした きの かわ・きりくちの としわ）。まえに よこむきに おく
  const logR = w * 0.029;
  const dir = V(Math.cos(0.5), 0, -Math.sin(0.5));
  const logPos = V(-w * 0.1, logR * 0.75, d * 0.26); // おきものは おくに ならべるので、まるたは てまえ
  const logModel = propClone('log');
  if (logModel) {
    logModel.scale.setScalar(w * 0.4);
    logModel.rotation.y = 0.5;
    logModel.position.copy(logPos);
    g.add(logModel);
  } else {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR, w * 0.4, 12), std(0x6b4a2e, { roughness: 0.9 }));
    log.rotation.z = Math.PI / 2;
    log.rotation.y = 0.5;
    log.position.copy(logPos);
    g.add(log);
  }
  // むしが まるたを のりこえる ための かたち（じくの りょうはし・はんけい・たかさ）
  const logShape = {
    a: logPos.clone().addScaledVector(dir, -w * 0.2),
    b: logPos.clone().addScaledVector(dir, w * 0.2),
    r: logR,
    y: logPos.y,
  };
  // おちば
  const leafCount = PROPS.leaves ? PROPS.leaves.children.filter((o) => o.isMesh).length : 0;
  for (let i = 0; i < 7; i++) {
    let l;
    if (leafCount) {
      l = propClone('leaves');
      l.children.forEach((o, k) => (o.visible = k === i % leafCount));
      l.scale.setScalar(w * (0.08 + Math.random() * 0.04));
      l.rotation.y = Math.random() * 6.28;
    } else {
      l = new THREE.Mesh(new THREE.CircleGeometry(1, 12), std(0x8a6a2a, { roughness: 0.8, side: THREE.DoubleSide }));
      l.scale.set(w * 0.03, w * 0.05, 1);
      l.rotation.set(-Math.PI / 2, 0, i * 1.1);
    }
    l.position.set((Math.random() - 0.5) * w * 0.8, 0.05 + i * 0.01, (Math.random() - 0.5) * d * 0.8);
    g.add(l);
  }
  return { group: g, log: logShape, fallback: !logModel };
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
  const path = [V(0, 0, 4), V(0, 1, 0.7), V(0.5, 6, 1.4), V(0.95, 10.4, 2.5)];
  const model = propClone('perch');
  if (model) return { group: model, path, speed: [1, 0.6, 0.6, 0.6], stay: 3.5 };
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

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  // まわりの けしきが からだに うつりこむ（つやつや）
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.3);
  sun.position.set(8, 20, 12);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = 1.35;

  let caseGroup = null;
  let lastCaseArgs = null;
  let caseFallback = false;
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
  // ふちが ぼやけた かげ
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false });

  // decor：[{ type, slot }]、slots：おける かず
  function setCase(dims, decor = [], slots = 2) {
    lastCaseArgs = [dims, decor, slots];
    if (caseGroup) scene.remove(caseGroup);
    const built = buildCase(dims);
    caseFallback = built.fallback;
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
    const byWidth = (w * 0.55) / (tanV * camera.aspect);
    const byHeight = ((h + SOIL) * 0.6 + d * 0.27) / tanV;
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


  const keyOf = (p) => `${p.stage}/${p.lengthCm.toFixed(2)}/${p.weak}/${p.sleeping}`;

  function addActor(p) {
    const model = buildModel(p);
    const g = model.group;
    const len = p.lengthCm;
    g.rotation.order = 'YXZ';
    g.scale.setScalar(len);
    g.position.copy(randomSpot());
    g.rotation.y = Math.random() * Math.PI * 2;
    // ようちゅう・さなぎ・とうみんちゅうは つちの なか、まえの ガラスぎわ（よこから みえる）
    const [cw, cd] = caseDims;
    const underX = (Math.random() * 2 - 1) * (cw / 2 - len);
    // からだ ぜんぶが つちの なかに おさまる ふかさ
    const half = (p.stage === 'pupa' ? 0.55 : 0.45) * len;
    const top = -half - 0.3;
    const bottom = -SOIL + half + 0.2;
    const underY = bottom < top ? bottom + Math.random() * (top - bottom) : -SOIL / 2;
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
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.9, len * 1.1), shadowMat);
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

  const onBugs = () => {
    if (caseFallback && lastCaseArgs) setCase(...lastCaseArgs);
    for (const a of [...actors.values()]) {
      if (!hasModel(a.pet)) continue;
      const pos = a.g.position.clone();
      const rotY = a.g.rotation.y;
      const p = a.pet;
      removeActor(p.id);
      addActor(p);
      const b = actors.get(p.id);
      b.g.position.copy(pos);
      if (b.walker) b.g.rotation.y = rotY;
    }
    select(selected);
  };
  bugListeners.add(onBugs);
  loadBugs();

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
    if (a.model.anim && !a.pet.sleeping) a.model.anim(t);
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
        // ほかの むしが いたら よけて すすむ。ずっと ふさがれて いたら いきさきを かえる
        const av = avoidance(a);
        const want = Math.atan2(dx / dist + av.x * 1.8, dz / dist + av.z * 1.8);
        if (av.blocked) {
          a.blocked = (a.blocked || 0) + dt;
          if (a.blocked > 1.5) {
            a.target = randomSpot();
            a.blocked = 0;
          }
        } else {
          a.blocked = 0;
        }
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
    a.shadow.rotation.z = g.rotation.y;
  }

  // ---------- むしどうしが かさならない ----------
  // じめんを あるいている むし（おきもので あそんでいる・つちの なかの むしは のぞく）
  const onGround = (a) => a.walker && !a.play && a.g.visible;
  const bodyR = (a) => a.len * 0.33;

  // まわりの むしから はなれる むき。まえが ふさがって いれば blocked
  function avoidance(a) {
    let x = 0;
    let z = 0;
    let blocked = false;
    const fx = Math.sin(a.g.rotation.y);
    const fz = Math.cos(a.g.rotation.y);
    for (const b of actors.values()) {
      if (b === a || !onGround(b)) continue;
      const dx = a.g.position.x - b.g.position.x;
      const dz = a.g.position.z - b.g.position.z;
      const d = Math.hypot(dx, dz) || 0.001;
      const near = (bodyR(a) + bodyR(b)) * 1.7;
      if (d > near) continue;
      const k = (near - d) / near;
      x += (dx / d) * k;
      z += (dz / d) * k;
      if (d < (bodyR(a) + bodyR(b)) * 1.15 && -(dx * fx + dz * fz) / d > 0.5) blocked = true;
    }
    return { x, z, blocked };
  }

  // かさなって いたら おしあって はなす（はんぶんずつ）
  function separateAll() {
    const list = [...actors.values()].filter(onGround);
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i].g.position;
          const b = list[j].g.position;
          const dx = a.x - b.x;
          const dz = a.z - b.z;
          const min = bodyR(list[i]) + bodyR(list[j]);
          const d = Math.hypot(dx, dz);
          if (d >= min) continue;
          const ux = d > 1e-4 ? dx / d : Math.random() - 0.5;
          const uz = d > 1e-4 ? dz / d : Math.random() - 0.5;
          const push = (min - d) / 2;
          a.x += ux * push;
          a.z += uz * push;
          b.x -= ux * push;
          b.z -= uz * push;
        }
      }
    }
    for (const a of list) {
      const p = a.g.position;
      p.x = Math.max(-bounds.x, Math.min(bounds.x, p.x));
      p.z = Math.max(-bounds.z, Math.min(bounds.z, p.z));
      followGround(a);
    }
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (const a of actors.values()) step(a, dt, t);
    separateAll();
    const s = selected && actors.get(selected);
    if (s) ring.position.set(s.g.position.x, Math.max(0.04, s.g.position.y), s.g.position.z);
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  function dispose() {
    bugListeners.delete(onBugs);
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  // たしかめ よう：いま なにを しているか
  const minGap = () => {
    const list = [...actors.values()].filter(onGround);
    let worst = Infinity;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const d = list[i].g.position.distanceTo(list[j].g.position) - bodyR(list[i]) - bodyR(list[j]);
        worst = Math.min(worst, d);
      }
    }
    return worst;
  };
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
      separateAll();
    }
  };

  // たしかめ よう：カメラを むしの ちかくに よせる
  const lookAt = (id, dist = 3, dir = [1, 0.7, 1.2]) => {
    const a = actors.get(id);
    if (!a) return;
    const p = a.g.position.clone();
    controls.target.copy(p);
    camera.position.copy(p).add(V(...dir).normalize().multiplyScalar(a.len * dist));
    controls.minDistance = 0.5;
    controls.update();
  };

  // たしかめ よう：いまの がめんを がぞうに
  const snapshot = () => {
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/jpeg', 0.85);
  };

  return { setCase, setPets, select, dispose, debug, advance, lookAt, snapshot, minGap };
}
