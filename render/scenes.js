// Renders 3D das imagens do site (Three.js). Cada cena vira uma imagem em img/.
// Uso: veja render/run.js
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const q = new URLSearchParams(location.search);
const NAME = q.get('scene');
const W = +q.get('w') || 1200;
const H = +q.get('h') || 1500;

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const range = (a, b) => a + rnd() * (b - a);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function gradTex(stops) {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 8, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function setup({ bg, fog, near = 12, far = 46, env = 0.5, exposure = 1.1, fov = 40 }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = gradTex(bg);
  if (fog) scene.fog = new THREE.Fog(fog, near, far);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = env;
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 200);
  return { renderer, scene, camera };
}

function sun(scene, color, intensity, pos, { shadow = true, size = 12, tgt = [0, 0, 0] } = {}) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(...pos);
  l.target.position.set(...tgt);
  scene.add(l, l.target);
  if (shadow) {
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    const c = l.shadow.camera;
    c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.5; c.far = 80;
    l.shadow.bias = -0.0004;
    l.shadow.radius = 5;
  }
  return l;
}

const mat = (o) => new THREE.MeshStandardMaterial(o);
const SEAL = 0xe5432d;
function mesh(geo, m, { cast = true, receive = true } = {}) {
  const x = new THREE.Mesh(geo, m);
  x.castShadow = cast; x.receiveShadow = receive;
  return x;
}

/* ---------- texturas ---------- */
function windowTextures(cols, rows, lit) {
  const mk = (emissive) => {
    const c = document.createElement('canvas');
    c.width = cols * 16; c.height = rows * 16;
    const g = c.getContext('2d');
    g.fillStyle = emissive ? '#000' : '#b4c2d0';
    g.fillRect(0, 0, c.width, c.height);
    let s = 11;
    const r2 = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const on = r2() < lit;
      if (emissive) {
        if (on) { g.fillStyle = r2() < 0.7 ? '#ffffff' : '#f2f7fb'; g.fillRect(x * 16 + 3, y * 16 + 3, 10, 9); }
      } else {
        g.fillStyle = on ? '#8fa3b8' : '#a3b3c4';
        g.fillRect(x * 16 + 3, y * 16 + 3, 10, 9);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  return [mk(false), mk(true)];
}

/* ---------- cidade / skyline ---------- */
function towers(kind) {
  const wide = kind === 'wide';
  const { renderer, scene, camera } = setup({
    bg: [[0, '#8fa9c4'], [0.5, '#d5dfe8'], [1, '#f7f1e8']],
    fog: '#dde3e9', near: wide ? 20 : 8, far: wide ? 70 : 38, env: 0.35, exposure: 0.95, fov: wide ? 34 : 52,
  });
  const [map, em] = windowTextures(6, 22, 0.42);
  const ground = mesh(new THREE.PlaneGeometry(200, 200), mat({ color: 0xcfd3d6, roughness: 0.7, metalness: 0.0 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  for (let i = -9; i <= 9; i++) for (let j = -14; j <= 1; j++) {
    if (rnd() < 0.18) continue;
    const w = range(1, 1.9), d = range(1, 1.9);
    const center = 1 - Math.min(1, Math.abs(i) / 9);
    const h = range(3, 8) + center * range(4, 13) + (wide ? (-j) * 0.25 : 0);
    const m = mat({ color: 0xe3e8ed, metalness: 0.1, roughness: 0.45, map: map.clone(), emissive: 0xffffff, emissiveMap: em.clone(), emissiveIntensity: 0.0 });
    m.map.repeat.set(Math.max(1, Math.round(w * 2)) / 6 * 2, h / 3.4 / 22 * 4); m.map.needsUpdate = true;
    m.emissiveMap.repeat.copy(m.map.repeat); m.emissiveMap.needsUpdate = true;
    const t = mesh(new THREE.BoxGeometry(w, h, d), m);
    t.position.set(i * 2.3 + range(-0.3, 0.3), h / 2, j * 2.6 + range(-0.3, 0.3));
    scene.add(t);
    if (rnd() < 0.35) {
      const top = mesh(new THREE.BoxGeometry(w * 0.6, h * 0.12, d * 0.6), mat({ color: 0x8f99a3, metalness: 0.4, roughness: 0.4 }));
      top.position.set(t.position.x, h + h * 0.06, t.position.z);
      scene.add(top);
    }
  }
  scene.add(new THREE.HemisphereLight(0x6a86b8, 0x201a24, 0.8));
  sun(scene, 0xff9060, 3.2, [-14, 5, -30], { shadow: false });
  if (wide) { camera.position.set(0, 2.4, 24); camera.lookAt(0, 6, -10); }
  else { camera.position.set(1.2, 1.4, 13); camera.lookAt(0.5, 9, -6); }
  return { renderer, scene, camera };
}

/* ---------- casa ---------- */
function house() {
  const { renderer, scene, camera } = setup({ bg: [[0, '#f6f3ee'], [1, '#d9d4ca']], fog: '#e7e3dc', near: 14, far: 40, env: 0.7, exposure: 0.95, fov: 36 });
  const floor = mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.4, 96), mat({ color: 0xdcd7ce, roughness: 0.6, metalness: 0.0 }));
  floor.position.y = -0.2;
  scene.add(floor);
  const lawn = mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.12, 96), mat({ color: 0xbfc8bb, roughness: 0.85 }));
  lawn.position.y = 0.06;
  scene.add(lawn);
  const body = mesh(new THREE.BoxGeometry(3.2, 1.9, 2.4), mat({ color: 0xdfe3e8, roughness: 0.55 }));
  body.position.y = 1.1;
  scene.add(body);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.95, 0); roofShape.lineTo(1.95, 0); roofShape.lineTo(0, 1.35); roofShape.closePath();
  const roof = mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 2.9, bevelEnabled: false }), mat({ color: SEAL, roughness: 0.4, metalness: 0.15 }));
  roof.position.set(0, 2.05, -1.45);
  scene.add(roof);
  const chim = mesh(new THREE.BoxGeometry(0.34, 0.9, 0.34), mat({ color: 0x252d36, roughness: 0.6 }));
  chim.position.set(0.9, 3.0, 0.2);
  scene.add(chim);
  const door = mesh(new THREE.BoxGeometry(0.62, 1.15, 0.1), mat({ color: 0x1b222a, roughness: 0.5 }));
  door.position.set(0, 0.7, 1.22);
  scene.add(door);
  const warm = mat({ color: 0x222, emissive: 0xffb36b, emissiveIntensity: 2.2 });
  [[-1.05, 1.3], [1.05, 1.3]].forEach(([x, y]) => {
    const w = mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), warm, { cast: false });
    w.position.set(x, y, 1.2);
    scene.add(w);
  });
  for (let i = 0; i < 4; i++) {
    const a = [[-3.2, 1.6], [3.3, 1.2], [2.7, -2.2], [-2.6, -2.4]][i];
    const trunk = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.5, 12), mat({ color: 0x1a2027 }));
    trunk.position.set(a[0], 0.4, a[1]);
    const crown = mesh(new THREE.ConeGeometry(0.5, 1.4, 20), mat({ color: 0x4a5866, roughness: 0.7 }));
    crown.position.set(a[0], 1.3, a[1]);
    scene.add(trunk, crown);
  }
  scene.add(new THREE.HemisphereLight(0x8fa3c0, 0x1a1d22, 0.7));
  sun(scene, 0xffd9b0, 3.4, [-7, 9, 6], { size: 9 });
  const rim = new THREE.PointLight(SEAL, 90, 24, 2); rim.position.set(6, 3, -5); scene.add(rim);
  const glow = new THREE.PointLight(0xffb36b, 14, 8, 2); glow.position.set(0, 1.3, 2.6); scene.add(glow);
  camera.position.set(7.2, 5.2, 9.5); camera.lookAt(0, 1.4, 0);
  return { renderer, scene, camera };
}

/* ---------- engrenagem ---------- */
function gearShape(R, teeth, th) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const phase = i % 4;
    const r = phase === 1 || phase === 2 ? R + th : R;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, R * 0.28, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}
function gear() {
  const { renderer, scene, camera } = setup({ bg: [[0, '#f6f3ee'], [1, '#d9d4ca']], fog: '#e7e3dc', near: 14, far: 38, env: 1.0, exposure: 0.95, fov: 34 });
  const floor = mesh(new THREE.PlaneGeometry(60, 60), mat({ color: 0xdedad2, roughness: 0.5, metalness: 0.0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.4;
  scene.add(floor);
  const mk = (R, teeth, th, color, metal, rough) => {
    const g = new THREE.ExtrudeGeometry(gearShape(R, teeth, th), { depth: 0.6, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 24 });
    return mesh(g, mat({ color, metalness: metal, roughness: rough }));
  };
  const big = mk(2.2, 16, 0.38, 0xa2acb8, 1, 0.28);
  big.position.set(-1.4, 0.2, 0); big.rotation.z = 0.12;
  const small = mk(1.25, 9, 0.34, SEAL, 0.35, 0.38);
  small.position.set(1.65, 1.55, 0); small.rotation.z = 0.3;
  const ring = mesh(new THREE.TorusGeometry(2.9, 0.05, 12, 96), mat({ color: 0x1d242c, metalness: 0.9, roughness: 0.35 }));
  ring.position.set(-1.4, 0.2, -0.3);
  scene.add(big, small, ring);
  [big, small].forEach((g) => {
    const hub = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.9, 32), mat({ color: 0x1a2027, metalness: 1, roughness: 0.3 }));
    hub.rotation.x = Math.PI / 2; hub.position.copy(g.position); hub.position.z += 0.3;
    scene.add(hub);
  });
  scene.add(new THREE.HemisphereLight(0x9fb1c8, 0x14181d, 0.5));
  sun(scene, 0xe8f0ff, 3.0, [-6, 8, 9], { size: 8 });
  const rim = new THREE.PointLight(SEAL, 110, 26, 2); rim.position.set(6, 3, -4); scene.add(rim);
  camera.position.set(1.5, 1.2, 17); camera.lookAt(-0.1, 1.0, 0);
  return { renderer, scene, camera };
}

/* ---------- martelo ---------- */
function woodTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3a2a22'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(${20 + rnd() * 40},${12 + rnd() * 24},${8 + rnd() * 16},${0.25 + rnd() * 0.4})`;
    g.lineWidth = 1 + rnd() * 3;
    g.beginPath(); g.moveTo(0, rnd() * 256); g.bezierCurveTo(170, rnd() * 256, 340, rnd() * 256, 512, rnd() * 256); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function gavel() {
  const { renderer, scene, camera } = setup({ bg: [[0, '#f6f3ee'], [1, '#d9d4ca']], fog: '#e7e3dc', near: 12, far: 34, env: 0.6, exposure: 0.95, fov: 34 });
  const wood = woodTex();
  const table = mesh(new THREE.PlaneGeometry(60, 60), mat({ color: 0xffffff, map: wood, roughness: 0.42, metalness: 0.1 }));
  table.rotation.x = -Math.PI / 2; wood.repeat.set(3, 3);
  scene.add(table);
  const block = mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.42, 64), mat({ color: 0xffffff, map: wood, roughness: 0.38 }));
  block.position.set(1.0, 0.21, 0);
  scene.add(block);
  const g = new THREE.Group();
  const head = mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.9, 64), mat({ color: 0xffffff, map: wood, roughness: 0.35 }));
  head.rotation.z = Math.PI / 2;
  const bandL = mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.18, 64), mat({ color: 0x9aa4b0, metalness: 1, roughness: 0.25 }));
  bandL.rotation.z = Math.PI / 2; bandL.position.x = -0.78;
  const bandR = bandL.clone(); bandR.position.x = 0.78;
  const handle = mesh(new THREE.CylinderGeometry(0.11, 0.15, 3.6, 32), mat({ color: 0xffffff, map: wood, roughness: 0.4 }));
  handle.rotation.x = Math.PI / 2; handle.position.z = 2.0;
  g.add(head, bandL, bandR, handle);
  g.position.set(1.0, 1.28, 0); g.rotation.set(0, -0.55, 0.12);
  scene.add(g);
  for (let i = 0; i < 9; i++) {
    const s = mesh(new THREE.BoxGeometry(3, 0.025, 4), mat({ color: 0xcfd5db, roughness: 0.9 }));
    s.position.set(-3.6 + rnd() * 0.4, 0.015 + i * 0.027, -0.8 + rnd() * 0.4); s.rotation.y = rnd() * 0.5 - 0.25;
    scene.add(s);
  }
  scene.add(new THREE.HemisphereLight(0x8fa0b8, 0x181210, 0.5));
  sun(scene, 0xffc79a, 3.4, [-6, 8, 5], { size: 9 });
  const rim = new THREE.PointLight(SEAL, 40, 22, 2); rim.position.set(5, 2, -4); scene.add(rim);
  camera.position.set(-2.6, 5.2, 11.5); camera.lookAt(0.0, 0.7, 0.3);
  return { renderer, scene, camera };
}

/* ---------- processos + lacre ---------- */
function paperTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 700;
  const g = c.getContext('2d');
  g.fillStyle = '#d4d9de'; g.fillRect(0, 0, 512, 700);
  g.fillStyle = '#4b5662'; g.fillRect(56, 60, 240, 16);
  g.fillStyle = '#7d8995';
  for (let y = 110; y < 620; y += 24) g.fillRect(56, y, 320 + rnd() * 100, 8);
  g.fillStyle = '#4b5662'; g.fillRect(56, 640, 150, 5);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sealTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#C1A16B'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#9E7D4D'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(128, 128, 84, 0, 7); g.stroke();
  g.fillStyle = '#9E7D4D'; g.font = '800 130px "Arial Narrow", Arial'; g.textAlign = 'center'; g.fillText('M', 128, 170);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function docs() {
  const { renderer, scene, camera } = setup({ bg: [[0, '#0b0f14'], [1, '#1a212a']], fog: '#10151b', near: 12, far: 34, env: 0.7, exposure: 0.95, fov: 32 });
  const table = mesh(new THREE.PlaneGeometry(60, 60), mat({ color: 0x8a6b4f, roughness: 0.4, metalness: 0.1 }));
  table.rotation.x = -Math.PI / 2;
  scene.add(table);
  const pt = paperTex();
  for (let i = 0; i < 22; i++) {
    const top = i === 21;
    const s = mesh(new THREE.BoxGeometry(3, 0.03, 4.1), mat({ color: top ? 0xffffff : 0xc7cdd3, map: top ? pt : null, roughness: 0.9 }));
    s.position.set(rnd() * 0.12 - 0.06, 0.016 + i * 0.032, rnd() * 0.12 - 0.06);
    s.rotation.y = top ? -0.14 : (rnd() - 0.5) * 0.12;
    scene.add(s);
  }
  const y = 0.016 + 21 * 0.032 + 0.05;
  const seal = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.1, 64), mat({ color: 0xffffff, map: sealTex(), roughness: 0.35, metalness: 0.15, emissive: 0x2a0a05 }));
  seal.position.set(0.85, y, 1.35);
  const edge = mesh(new THREE.TorusGeometry(0.5, 0.06, 16, 64), mat({ color: 0xc93a25, roughness: 0.4 }));
  edge.rotation.x = Math.PI / 2; edge.position.set(0.85, y - 0.02, 1.35);
  scene.add(seal, edge);
  for (const sx of [-1, 1]) {
    const rib = mesh(new THREE.BoxGeometry(0.2, 0.03, 1.1), mat({ color: 0xb83320, roughness: 0.5 }));
    rib.position.set(0.85 + sx * 0.25, y - 0.04, 2.1); rib.rotation.y = sx * 0.25;
    scene.add(rib);
  }
  const pen = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.0, 24), mat({ color: 0x10151b, metalness: 0.8, roughness: 0.25 }));
  const tip = mesh(new THREE.ConeGeometry(0.06, 0.34, 24), mat({ color: 0xa9b3bf, metalness: 1, roughness: 0.2 }));
  tip.position.y = -1.67; tip.rotation.z = Math.PI;
  const clip = mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), mat({ color: 0xa9b3bf, metalness: 1, roughness: 0.2 }));
  clip.position.set(0.075, 0.9, 0);
  pen.add(body, tip, clip);
  pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.45;
  pen.position.set(-0.5, 0.9, 1.3);
  scene.add(pen);
  scene.add(new THREE.HemisphereLight(0x9fb1c8, 0x14181d, 0.55));
  sun(scene, 0xffe6cc, 3.4, [-5, 9, 6], { size: 7 });
  const rim = new THREE.PointLight(SEAL, 70, 22, 2); rim.position.set(5, 2, -3); scene.add(rim);
  camera.position.set(-3.2, 7.2, 8.8); camera.lookAt(0.2, 0.5, 0.4);
  return { renderer, scene, camera };
}

/* ---------- colunas do fórum ---------- */
function fluted(R, h) {
  const seg = 96, rings = 2;
  const pos = [], idx = [];
  for (let r = 0; r <= rings; r++) {
    const y = (r / rings) * h;
    const taper = 1 - 0.1 * (r / rings);
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const flute = 1 - 0.045 * Math.pow(Math.abs(Math.sin(a * 10)), 0.6);
      pos.push(Math.cos(a) * R * taper * flute, y, Math.sin(a) * R * taper * flute);
    }
  }
  for (let r = 0; r < rings; r++) for (let i = 0; i < seg; i++) {
    const a = r * (seg + 1) + i, b = a + seg + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function columns() {
  const { renderer, scene, camera } = setup({ bg: [[0, '#eef1f4'], [0.6, '#f4f1ec'], [1, '#e6dfd4']], fog: '#ebe8e2', near: 14, far: 52, env: 0.3, exposure: 0.95, fov: 36 });
  const stone = mat({ color: 0xd8d3c9, roughness: 0.8, metalness: 0.0 });
  const floor = mesh(new THREE.PlaneGeometry(160, 160), mat({ color: 0xd3cec5, roughness: 0.45, metalness: 0.0 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  for (let s = 0; s < 4; s++) {
    const st = mesh(new THREE.BoxGeometry(24 - s * 0.6, 0.28, 8 - s * 0.9), stone);
    st.position.set(0, 0.14 + s * 0.28, 1.5 - s * 0.45);
    scene.add(st);
  }
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x = -10.5 + i * 3;
    const col = mesh(fluted(0.7, 8), stone);
    col.position.set(x, 1.12, 0);
    const base = mesh(new THREE.CylinderGeometry(0.88, 0.95, 0.3, 48), stone); base.position.set(x, 1.27, 0);
    const cap = mesh(new THREE.CylinderGeometry(0.95, 0.66, 0.4, 48), stone); cap.position.set(x, 9.3, 0);
    const abacus = mesh(new THREE.BoxGeometry(2.0, 0.3, 2.0), stone); abacus.position.set(x, 9.65, 0);
    scene.add(col, base, cap, abacus);
  }
  const arch = mesh(new THREE.BoxGeometry(26, 1.1, 2.6), stone); arch.position.set(0, 10.4, 0);
  const frieze = mesh(new THREE.BoxGeometry(26.4, 0.4, 2.8), stone); frieze.position.set(0, 11.15, 0);
  const wall = mesh(new THREE.BoxGeometry(30, 12, 0.6), mat({ color: 0xe9e5de, roughness: 0.9 })); wall.position.set(0, 7, -3.2);
  scene.add(arch, frieze, wall);
  scene.add(new THREE.HemisphereLight(0x7f93b3, 0x1a1514, 0.45));
  sun(scene, 0xfff3e2, 2.2, [14, 9, 14], { size: 22, tgt: [0, 4, 0] });
  const rim = new THREE.PointLight(SEAL, 140, 40, 2); rim.position.set(-14, 3, 6); scene.add(rim);
  camera.position.set(-6, 2.2, 22); camera.lookAt(1, 6.2, 0);
  return { renderer, scene, camera };
}

/* ---------- parede de livros ---------- */
function books() {
  const { renderer, scene, camera } = setup({ bg: [[0, '#0b0f14'], [1, '#141a21']], fog: '#0f141a', near: 14, far: 40, env: 0.5, exposure: 0.95, fov: 32 });
  const back = mesh(new THREE.PlaneGeometry(40, 30), mat({ color: 0xece7de, roughness: 0.9 }));
  back.position.z = -0.4; scene.add(back);
  const wood = mat({ color: 0x7a5c43, roughness: 0.55, metalness: 0.1 });
  const palette = [0x2b3440, 0x1c232b, 0x3a4452, 0x4a5563, 0x222a33, 0x5b6775, 0x30394a, SEAL, 0x8a95a1, 0xc8ced5];
  const rows = 5, shelfH = 2.0, W = 11;
  for (let r = 0; r <= rows; r++) {
    const plank = mesh(new THREE.BoxGeometry(W + 0.6, 0.12, 1.4), wood);
    plank.position.set(0, r * shelfH - 0.06, 0.3); scene.add(plank);
  }
  for (const sx of [-1, 1]) {
    const side = mesh(new THREE.BoxGeometry(0.2, rows * shelfH, 1.4), wood);
    side.position.set(sx * (W / 2 + 0.2), (rows * shelfH) / 2 - 0.06, 0.3); scene.add(side);
  }
  for (let r = 0; r < rows; r++) {
    let x = -W / 2 + 0.1;
    while (x < W / 2 - 0.4) {
      const w = range(0.22, 0.5), h = range(1.15, 1.8), d = range(0.8, 1.1);
      const c = rnd() < 0.07 ? SEAL : pick(palette.filter((p) => p !== SEAL));
      const b = mesh(new THREE.BoxGeometry(w, h, d), mat({ color: c, roughness: 0.6, metalness: 0.1 }));
      const lean = rnd() < 0.06 ? 0.18 : 0;
      b.position.set(x + w / 2, r * shelfH + h / 2, 0.45); b.rotation.z = lean;
      scene.add(b);
      const band = mesh(new THREE.BoxGeometry(w + 0.01, 0.06, d + 0.01), mat({ color: 0xc8ced5, roughness: 0.4, metalness: 0.6 }), { cast: false });
      band.position.set(b.position.x, b.position.y + h * 0.25, b.position.z); band.rotation.z = lean; scene.add(band);
      x += w + (lean ? 0.35 : 0.01);
    }
  }
  scene.add(new THREE.HemisphereLight(0x8aa0c0, 0x1a1512, 0.7));
  sun(scene, 0xffd9b0, 3.0, [-6, 14, 12], { size: 14, tgt: [0, 5, 0] });
  for (let r = 0; r < rows; r++) {
    const p = new THREE.PointLight(0xffb36b, 16, 6, 2); p.position.set(0, r * shelfH + 1.9, 1.3); scene.add(p);
  }
  const rim = new THREE.PointLight(SEAL, 50, 30, 2); rim.position.set(8, 4, 3); scene.add(rim);
  camera.position.set(2.2, 5.6, 22); camera.lookAt(0, 4.9, 0);
  return { renderer, scene, camera };
}

/* ---------- mapa 3D ---------- */
function map() {
  const { renderer, scene, camera } = setup({ bg: [[0, '#0a0e13'], [1, '#141a21']], fog: '#0b1015', near: 12, far: 46, env: 0.4, exposure: 0.95, fov: 38 });
  const ground = mesh(new THREE.PlaneGeometry(120, 120), mat({ color: 0xe6e2da, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const cell = 1.5;
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xc2bdb3 });
  for (let i = -30; i <= 30; i++) for (let j = -22; j <= 12; j++) {
    if (rnd() < 0.1) continue;
    const dist = Math.hypot(i, j * 1.2) / 30;
    const h = range(0.08, 0.32) + (rnd() < 0.1 ? (1 - dist) * range(0.3, 1.5) : 0);
    const w = cell * range(0.4, 0.62), d = cell * range(0.4, 0.62);
    const b = mesh(new THREE.BoxGeometry(w, h, d), mat({ color: rnd() < 0.5 ? 0xc9c5bc : 0xd8d4cb, roughness: 0.7, metalness: 0.2 }), { cast: false });
    b.position.set(i * cell, h / 2, j * cell);
    scene.add(b);
  }
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xe5432d });
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xe5432d, transparent: true, opacity: 0.18, depthWrite: false });
  const road = (pts, r) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0.45, p[1])));
    const t1 = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, r * 1.5, 8, false), glowMat);
    const t2 = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, r * 5, 8, false), haloMat);
    scene.add(t1, t2);
  };
  road([[-30, -4], [-14, -2], [-4, -2.5], [4, -1], [16, -4], [32, -8]], 0.1);
  road([[-6, -24], [-5, -12], [-3.5, -4], [-4, 4], [-8, 14]], 0.09);
  road([[22, 10], [10, 2], [2, -2], [-8, -9], [-22, -14]], 0.07);
  for (let k = -12; k <= 12; k += 3) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 60), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(k * cell * 1.3, 0.03, 0); scene.add(l);
    const l2 = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.05), lineMat); l2.rotation.x = -Math.PI / 2; l2.position.set(0, 0.03, k * cell * 1.0); scene.add(l2);
  }
  scene.add(new THREE.HemisphereLight(0x6f86a8, 0x151218, 0.7));
  sun(scene, 0xc9d8ff, 1.6, [-8, 12, 6], { shadow: false });
  camera.position.set(0.5, 14, 9.5); camera.lookAt(0, 0, -2.5);
  return { renderer, scene, camera };
}

const builders = {
  towers: () => towers('tall'),
  skyline: () => towers('wide'),
  house, gear, gavel, docs, columns, books, map,
};

const { renderer, scene, camera } = builders[NAME]();
renderer.render(scene, camera);
window.__done = true;
