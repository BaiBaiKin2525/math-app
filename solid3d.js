// はこの形・ブロックの 3D（three.js）。ゆびで まわして たしかめる。

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js/+esm';

function baseScene(container, dist) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a70, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.3);
  sun.position.set(4, 8, 6);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(dist * 0.8, dist * 0.7, dist);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;
  controls.addEventListener('start', () => (controls.autoRotate = false));
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
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  };
  loop();
  return {
    scene, camera, controls, resize,
    snapshot: () => {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/jpeg', 0.85);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// はこ（直方体）。dims：[よこ, たかさ, おくゆき]（cm）、辺は 長さごとに いろを かえる
export function createBoxView(container, { dims, colors }) {
  const [w, h, d] = dims;
  const s = 3 / Math.max(w, h, d);
  const base = baseScene(container, 6.5);
  const g = new THREE.Group();
  g.scale.setScalar(s);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0xf6e7c8, transparent: true, opacity: 0.75, roughness: 0.7 }),
  );
  g.add(box);
  // 辺：おなじ 長さの 辺は おなじ いろ
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const edge = (a, b, color) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06 / s, 0.06 / s, dir.length(), 8), new THREE.MeshStandardMaterial({ color }));
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    g.add(m);
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const y of [-hh, hh]) for (const z of [-hd, hd]) edge(V(-hw, y, z), V(hw, y, z), colors[0]);
  for (const x of [-hw, hw]) for (const z of [-hd, hd]) edge(V(x, -hh, z), V(x, hh, z), colors[1]);
  for (const x of [-hw, hw]) for (const y of [-hh, hh]) edge(V(x, y, -hd), V(x, y, hd), colors[2]);
  // ちょう点（ねんど玉）
  for (const x of [-hw, hw]) for (const y of [-hh, hh]) for (const z of [-hd, hd]) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13 / s, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8a7a70 }));
    ball.position.set(x, y, z);
    g.add(ball);
  }
  base.scene.add(g);
  return base;
}

// つみ木。heights[z][x]＝その ばしょの だんの かず
export function createBlocksView(container, { heights }) {
  const rows = heights.length;
  const cols = heights[0].length;
  const top = Math.max(...heights.flat());
  const base = baseScene(container, Math.max(rows, cols, top) * 2.4);
  const g = new THREE.Group();
  const palette = [0xff8a3d, 0x4d96ff, 0x3cb46e, 0xf2c230];
  const geo = new THREE.BoxGeometry(0.97, 0.97, 0.97);
  const edges = new THREE.EdgesGeometry(geo);
  heights.forEach((row, z) => row.forEach((n, x) => {
    for (let y = 0; y < n; y++) {
      const cube = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: palette[y % palette.length], roughness: 0.6 }));
      cube.position.set(x - (cols - 1) / 2, y + 0.5, z - (rows - 1) / 2);
      cube.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x3a2e2a })));
      g.add(cube);
    }
  }));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(cols + 1.5, rows + 1.5), new THREE.MeshStandardMaterial({ color: 0xe9dcc6 }));
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  base.scene.add(g);
  base.controls.target.set(0, top / 2, 0);
  base.controls.update();
  return base;
}
