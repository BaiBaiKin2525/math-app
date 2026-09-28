// 立方体の てんかい図を 3D で おりたたむ（three.js）。
// 1まい目の 面を うえに して、となりの 面を 90° ずつ おく（−Z）へ おる（いんさつ面が そとがわ）。

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js/+esm';

function faceTexture(color, label) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = color;
  x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(0,0,0,0.55)';
  x.lineWidth = 6;
  x.strokeRect(3, 3, 122, 122);
  if (label) {
    // ★ は しろ、サイコロの 数は こい いろ
    x.fillStyle = label === '★' ? '#fff' : label === '？' ? '#e2553f' : '#3a2e2a';
    x.font = 'bold 84px sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(label, 64, 70);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// cells：[[x, y]]（y は した むき）、parent：{ "x,y": { from, dx, dy } }
export function createNetView(container, { cells, parent, colors, labels }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x999999, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(2, -3, 6);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  // ゆびで さわったら じどうで まわるのを やめる
  controls.addEventListener('start', () => (controls.autoRotate = false));

  const key = (c) => `${c[0]},${c[1]}`;
  const hinges = []; // { pivot, axis, sign }
  const faces = {};
  const makeFace = (i) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ map: faceTexture(colors[i], labels[i]), side: THREE.DoubleSide, roughness: 0.6 });
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.98), mat));
    return g;
  };
  // 1まい目（そこ）。てんかい図の まんなかが がめんの まんなかに くるように ずらす
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const root = new THREE.Group();
  root.position.set(cells[0][0] - (w - 1) / 2, -(cells[0][1] - (h - 1) / 2), 0);
  scene.add(root);
  faces[key(cells[0])] = root;
  root.add(makeFace(0).children[0]);
  // おやから じゅんに つける（parent は おりたたみの じゅんばん）
  const pending = cells.slice(1).map((c, k) => ({ c, i: k + 1 }));
  while (pending.length) {
    const idx = pending.findIndex((p) => faces[parent[key(p.c)].from]);
    const { c, i } = pending.splice(idx, 1)[0];
    const { from, dx, dy } = parent[key(c)];
    const dir = new THREE.Vector3(dx, -dy, 0); // マスの した＝がめんの した
    const pivot = new THREE.Group();
    pivot.position.copy(dir).multiplyScalar(0.5);
    faces[from].add(pivot);
    const face = makeFace(i);
    face.position.copy(dir).multiplyScalar(0.5);
    pivot.add(face);
    faces[key(c)] = face;
    // おく（−Z）に おる：かみの てんかい図と おなじく、いんさつした 面が そとがわに くる
    if (dx === 1) hinges.push({ pivot, axis: 'y', sign: 1 });
    else if (dx === -1) hinges.push({ pivot, axis: 'y', sign: -1 });
    else if (dy === 1) hinges.push({ pivot, axis: 'x', sign: 1 });
    else hinges.push({ pivot, axis: 'x', sign: -1 });
  }

  const size = Math.max(w, h);
  // ひらいた とき：てんかい図の まんなか／くみたてた とき：立方体の まんなか に カメラを むける
  const flatTarget = new THREE.Vector3(0, 0, 0);
  const cubeTarget = root.position.clone().add(new THREE.Vector3(0, 0, -0.5));
  const flatOffset = new THREE.Vector3(0, -size * 1.1, size * 1.9);
  const cubeOffset = new THREE.Vector3(1.6, -2.4, 2.6);
  camera.position.copy(flatTarget).add(flatOffset);
  controls.target.copy(flatTarget);
  controls.update();

  let t = 0;
  const setT = (v) => {
    t = v;
    for (const hg of hinges) hg.pivot.rotation[hg.axis] = hg.sign * (Math.PI / 2) * t;
    controls.target.lerpVectors(flatTarget, cubeTarget, t);
    camera.position.copy(controls.target).add(new THREE.Vector3().lerpVectors(flatOffset, cubeOffset, t));
    controls.update();
  };

  const resize = () => {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return;
    renderer.setSize(cw, ch);
    camera.aspect = cw / ch;
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

  // target まで ms かけて おる
  const fold = (target, ms) => new Promise((resolve) => {
    const from = t;
    const start = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - start) / ms);
      setT(from + (target - from) * (1 - Math.cos(k * Math.PI)) / 2);
      if (k < 1) setTimeout(tick, 16);
      else {
        // くみたてたら ゆっくり まわして ぜんぶの 面を みせる
        controls.autoRotate = target === 1;
        controls.autoRotateSpeed = 2;
        resolve();
      }
    };
    tick();
  });

  return {
    fold,
    setT,
    resize,
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
