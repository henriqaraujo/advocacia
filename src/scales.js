// Balança da justiça em WebGL (Three.js), com abertura cinematográfica.
// Tudo procedural: sem modelos externos.
//
// Sequência de abertura (aprox. 3,2 s):
//   degraus sobem > coluna cresce > capitel e anéis caem > travessa cai no eixo >
//   pratos descem nas correntes > processos e a prova caem no prato esquerdo >
//   IMPACTO: a travessa balança, onda vermelha, tremor de câmera, flash de luz.
import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const SEAL = 0xe5432d;

function paperTexture(variant) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 352;
  const g = c.getContext('2d');
  g.fillStyle = '#e9edf1';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#6b7783';
  g.fillRect(28, 32, 120 + variant * 14, 10);
  g.fillStyle = '#9aa5b0';
  let y = 66;
  let seed = variant * 7 + 3;
  while (y < 300) {
    seed = (seed * 9301 + 49297) % 233280;
    g.fillRect(28, y, 150 + (seed / 233280) * 78, 5);
    y += 15;
  }
  if (variant % 2 === 0) {
    g.strokeStyle = '#C1A16B';
    g.lineWidth = 4;
    g.beginPath(); g.arc(196, 292, 24, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(196, 292, 15, 0, Math.PI * 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rod(a, b, radius, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

function beamTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}

export function initScales(canvas, host, state, reduce, hooks = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;

  const small = window.innerWidth < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 14, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const cam = { x: 0, y: 0.4, z: 12.5 };

  const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
  key.position.set(-4, 7, 6);
  scene.add(key);
  const rim = new THREE.PointLight(SEAL, 90, 24, 2);
  rim.position.set(6, 3, -4);
  scene.add(rim);
  const rim2 = new THREE.PointLight(0x9fb6d6, 60, 24, 2);
  rim2.position.set(-6, 2, -3);
  scene.add(rim2);

  // Materiais
  const steel = new THREE.MeshStandardMaterial({ color: 0xaeb7c2, metalness: 1, roughness: 0.3 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2b3440, metalness: 0.9, roughness: 0.38 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xcfcac1, metalness: 0.05, roughness: 0.7 });
  const sealMat = new THREE.MeshStandardMaterial({ color: SEAL, metalness: 0.15, roughness: 0.35, emissive: 0x3a0d06 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xd6dbe0, roughness: 0.9, metalness: 0 });

  const rig = new THREE.Group();
  scene.add(rig);

  // ---------- Base em degraus + coluna ----------
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.26, 3.4), stone);
  step1.position.y = -3.1;
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.22, 2.7), stone);
  step2.position.y = -2.86;
  const step3 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 2.0), darkSteel);
  step3.position.y = -2.65;
  const colGeo = new THREE.CylinderGeometry(0.19, 0.26, 5.4, 48);
  colGeo.translate(0, 2.7, 0); // origem na base, para a coluna "crescer"
  const column = new THREE.Mesh(colGeo, steel);
  column.position.y = -2.55;
  const ringBase = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 12, 48), steel);
  ringBase.rotation.x = Math.PI / 2;
  ringBase.position.y = -2.4;
  const ringMid = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 12, 48), steel);
  ringMid.rotation.x = Math.PI / 2;
  ringMid.position.y = 0.2;
  const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.24, 0.28, 48), darkSteel);
  capital.position.y = 2.95;
  rig.add(step1, step2, step3, column, ringBase, ringMid, capital);

  // ---------- Travessa (pivô) com pratos ----------
  const pivot = new THREE.Group();
  pivot.position.y = 3.2;
  rig.add(pivot);

  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.1, 0.16), steel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 40), darkSteel);
  hub.rotation.x = Math.PI / 2;
  const gem = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), sealMat);
  gem.position.z = 0.18;
  pivot.add(beam, hub, gem);

  const bowlPts = [
    [0, 0.0], [0.4, 0.01], [0.8, 0.08], [1.05, 0.2], [1.18, 0.34], [1.2, 0.38],
    [1.14, 0.38], [1.0, 0.26], [0.75, 0.14], [0.4, 0.08], [0, 0.07],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bowlGeo = new THREE.LatheGeometry(bowlPts, 64);
  const bowlMat = steel.clone();
  bowlMat.side = THREE.DoubleSide;

  function makePan(side) {
    const g = new THREE.Group();
    g.position.set(side * 2.8, 0, 0);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), steel));
    const drop = -2.35;
    const chains = new THREE.Group(); // estica a partir do gancho
    const hang = new THREE.Group();   // prato e conteudo, descem com as correntes
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.y = drop;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.17, 0.025, 8, 64), steel);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = drop + 0.37;
    hang.add(bowl, lip);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const end = new THREE.Vector3(Math.cos(a) * 1.16, drop + 0.37, Math.sin(a) * 1.16);
      chains.add(rod(new THREE.Vector3(0, -0.05, 0), end, 0.014, steel));
    }
    g.add(chains, hang);
    return { g, chains, hang, drop, s: 1 };
  }
  const left = makePan(-1);
  const right = makePan(1);
  pivot.add(left.g, right.g);
  const applyPan = (p) => {
    p.chains.scale.y = p.s;
    p.hang.position.y = p.drop * (p.s - 1);
  };

  // Esquerda: pilha de provas e um bloco selado. Direita: contrapeso.
  const sheets = [];
  for (let i = 0; i < 6; i++) {
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.035, 1.35), paperMat);
    sheet.position.set(i % 2 ? 0.03 : -0.03, left.drop + 0.1 + i * 0.037, 0);
    sheet.rotation.y = (i - 3) * 0.07;
    left.hang.add(sheet);
    sheets.push(sheet);
  }
  const proof = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), sealMat);
  proof.position.set(0.05, left.drop + 0.1 + 6 * 0.037 + 0.19, 0);
  proof.rotation.y = 0.5;
  left.hang.add(proof);

  const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.5, 40), darkSteel);
  weight.position.y = right.drop + 0.34;
  const weightTop = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 10, 24), steel);
  weightTop.position.y = right.drop + 0.62;
  weightTop.rotation.x = Math.PI / 2;
  right.hang.add(weight, weightTop);

  // ---------- Folhas de processo flutuando ----------
  const textures = [0, 1, 2, 3].map(paperTexture);
  const pages = [];
  const pageGeo = new THREE.PlaneGeometry(0.9, 1.24);
  const count = small ? 16 : 30;
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(pageGeo, new THREE.MeshStandardMaterial({
      map: textures[i % 4], side: THREE.DoubleSide, roughness: 0.95, metalness: 0, transparent: true, opacity: 0.85,
    }));
    const base = new THREE.Vector3((Math.random() - 0.35) * 18, (Math.random() - 0.5) * 11, -7 + Math.random() * 9);
    m.position.copy(base);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    const s = 0.6 + Math.random() * 0.8;
    m.scale.setScalar(s);
    scene.add(m);
    pages.push({
      m, base, s,
      phase: Math.random() * 6.28,
      speed: 0.25 + Math.random() * 0.4,
      rx: (Math.random() - 0.5) * 0.25,
      ry: (Math.random() - 0.5) * 0.25,
      off: new THREE.Vector3(),
      spin: 0,
    });
  }

  // ---------- Feixe de luz de janela + poeira ----------
  const beamLen = 22;
  const beamGeo = new THREE.ConeGeometry(2.6, beamLen, 40, 1, true);
  beamGeo.translate(0, -beamLen / 2, 0); // ápice na origem, abre para baixo
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xe8c98f, transparent: true, opacity: 0, alphaMap: beamTexture(),
    side: THREE.DoubleSide, depthWrite: false,
  });
  const lightBeam = new THREE.Mesh(beamGeo, beamMat);
  const apex = new THREE.Vector3(-8, 11, -2);
  lightBeam.position.copy(apex);
  lightBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(7, -12, 1.5).normalize());
  scene.add(lightBeam);

  const dustN = small ? 120 : 280;
  const dustPos = new Float32Array(dustN * 3);
  const dustSpd = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (Math.random() - 0.3) * 18;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    dustPos[i * 3 + 2] = -5 + Math.random() * 9;
    dustSpd[i] = 0.08 + Math.random() * 0.22;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0x9a8466, size: 0.05, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ---------- Onda de impacto ----------
  const ringMat = new THREE.MeshBasicMaterial({ color: SEAL, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), ringMat);
  shock.rotation.x = -Math.PI / 2;
  shock.visible = false;
  rig.add(shock);

  // ---------- Layout responsivo ----------
  function layout() {
    const a = camera.aspect;
    if (a > 1.2) {
      rig.position.set(a > 1.9 ? 5.2 : 4.7, -0.2, 0);
      rig.scale.setScalar(0.86);
      cam.z = 12.8;
    } else {
      rig.position.set(0, 2.5, 0);
      rig.scale.setScalar(0.4);
      cam.z = 13.5;
    }
  }
  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    layout();
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- Mouse ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) {
    window.addEventListener('pointermove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // ---------- Estado da abertura ----------
  const intro = { dolly: reduce ? 0 : 1, burst: reduce ? 1 : 0, beam: reduce ? 1 : 0, dust: reduce ? 1 : 0, shake: 0 };
  const beamSpring = { v: 0, x: reduce ? 0.12 : 0.2 };
  const v3 = new THREE.Vector3();

  function impact() {
    beamSpring.v += 5.5;
    intro.shake = 1;
    shock.visible = true;
    shock.position.set(-2.55, 0.55, 0);
    gsap.fromTo(shock.scale, { x: 0.2, y: 0.2, z: 0.2 }, { x: 9, y: 9, z: 9, duration: 1.3, ease: 'expo.out', onComplete: () => { shock.visible = false; } });
    gsap.fromTo(ringMat, { opacity: 0.9 }, { opacity: 0, duration: 1.3, ease: 'power2.out' });
    gsap.fromTo(rim, { intensity: 420 }, { intensity: 90, duration: 1.6, ease: 'power3.out' });
    gsap.to(intro, { shake: 0, duration: 0.9, ease: 'power2.out' });
    hooks.onImpact && hooks.onImpact();
  }

  let timeline = null;
  if (!reduce) {
    const T = gsap.timeline({ defaults: { ease: 'expo.out' } });
    timeline = T;
    // degraus
    [step1, step2, step3].forEach((m, i) => {
      const y = m.position.y;
      m.position.y = y - 7;
      T.to(m.position, { y, duration: 1.1, ease: 'power4.out' }, i * 0.12);
    });
    // coluna
    column.scale.y = 0.001;
    T.to(column.scale, { y: 1, duration: 1.2, ease: 'power3.out' }, 0.35);
    [ringBase, ringMid].forEach((r, i) => {
      r.scale.setScalar(0.001);
      T.to(r.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(2)' }, 0.9 + i * 0.25);
    });
    const capY = capital.position.y;
    capital.position.y = capY + 8;
    T.to(capital.position, { y: capY, duration: 1.0, ease: 'bounce.out' }, 1.2);
    // travessa cai no eixo
    pivot.position.y = 3.2 + 8;
    T.to(pivot.position, { y: 3.2, duration: 1.0, ease: 'back.out(1.6)' }, 1.45);
    // pratos descem nas correntes
    [left, right].forEach((p, i) => {
      p.s = 0.06;
      applyPan(p);
      T.to(p, { s: 1, duration: 1.2, ease: 'elastic.out(1,0.55)', onUpdate: () => applyPan(p) }, 1.9 + i * 0.12);
    });
    // processos caem no prato esquerdo, depois a prova (impacto)
    sheets.forEach((s, i) => {
      const y = s.position.y;
      s.position.y = y + 7;
      s.visible = false;
      T.set(s, { visible: true }, 2.35 + i * 0.07);
      T.to(s.position, { y, duration: 0.55, ease: 'bounce.out' }, 2.35 + i * 0.07);
    });
    const py = proof.position.y;
    proof.position.y = py + 8;
    proof.visible = false;
    T.set(proof, { visible: true }, 2.85);
    T.to(proof.position, { y: py, duration: 0.5, ease: 'power3.in' }, 2.85);
    T.call(impact, null, 3.35);
    // peças do pano de fundo
    T.to(intro, { burst: 1, duration: 2.4, ease: 'power3.out' }, 0.5);
    T.to(intro, { dolly: 0, duration: 3.4, ease: 'power3.inOut' }, 0);
    T.to(intro, { beam: 1, duration: 1.8, ease: 'power2.out' }, 1.2);
    T.to(intro, { dust: 1, duration: 2, ease: 'power1.out' }, 0.8);
    hooks.duration = T.duration();
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

  let last = performance.now();
  let t = 0;
  const ndc = new THREE.Vector3();
  function frame() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    // mola física da travessa: o peso da prova (esquerda) equilibra conforme a rolagem
    const target = THREE.MathUtils.lerp(0.2, 0.0, state.p) + Math.sin(t * 0.7) * 0.012 - mouse.x * 0.02;
    beamSpring.v += (target - beamSpring.x) * 22 * dt;
    beamSpring.v *= Math.pow(0.04, dt);
    beamSpring.x += beamSpring.v * dt * 4;
    pivot.rotation.z = beamSpring.x;
    left.g.rotation.z = -beamSpring.x;
    right.g.rotation.z = -beamSpring.x;

    // câmera: dolly de abertura + paralaxe + tremor do impacto
    const d = intro.dolly;
    const sh = intro.shake * 0.12;
    rig.rotation.y = Math.sin(t * 0.25) * 0.22 + mouse.x * 0.28 + state.p * 0.9 + d * 1.15;
    camera.position.set(
      cam.x + mouse.x * 0.35 + (Math.random() - 0.5) * sh,
      cam.y - mouse.y * 0.25 - state.p * 0.6 - d * 1.2 + (Math.random() - 0.5) * sh,
      cam.z - state.p * 1.6 - d * 5.5,
    );
    camera.lookAt(rig.position.x * 0.55, rig.position.y + 0.4 + d * 0.8, 0);
    camera.updateMatrixWorld();

    // feixe de luz e poeira
    const flick = 0.92 + Math.sin(t * 1.7) * 0.05 + Math.sin(t * 5.3) * 0.02;
    beamMat.opacity = 0.11 * intro.beam * flick * (1 - state.p * 0.8);
    dustMat.opacity = 0.5 * intro.dust;
    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < dustN; i++) {
      arr[i * 3 + 1] += dustSpd[i] * dt;
      arr[i * 3] += Math.sin(t * 0.4 + i) * 0.002;
      if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = -6;
    }
    dustGeo.attributes.position.needsUpdate = true;

    // folhas: explodem do centro, flutuam e desviam do cursor
    const mx = mouse.tx, my = -mouse.ty;
    const b = intro.burst;
    for (const p of pages) {
      const tx = p.base.x + Math.cos(t * p.speed * 0.6 + p.phase) * 0.25;
      const ty = p.base.y + Math.sin(t * p.speed + p.phase) * 0.45;
      // repulsão: projeta a folha na tela e compara com o cursor
      ndc.set(tx, ty, p.base.z).project(camera);
      const dx = ndc.x - mx, dy = ndc.y - my;
      const dist = Math.hypot(dx, dy) || 1;
      const R = 0.3;
      let px = 0, py = 0;
      if (!reduce && dist < R) {
        const f = Math.pow(1 - dist / R, 2) * 2.2;
        px = (dx / dist) * f; py = (dy / dist) * f;
        p.spin += f * dt * 3;
      }
      p.off.x += (px - p.off.x) * 0.08;
      p.off.y += (py - p.off.y) * 0.08;
      p.spin *= 0.96;
      const e = b * b * (3 - 2 * b);
      p.m.position.set(
        THREE.MathUtils.lerp(0, tx + p.off.x, e),
        THREE.MathUtils.lerp(0, ty + p.off.y, e),
        THREE.MathUtils.lerp(0.5, p.base.z, e),
      );
      p.m.scale.setScalar(p.s * (0.2 + 0.8 * e));
      p.m.material.opacity = 0.85 * Math.min(1, b * 1.6);
      p.m.rotation.x += (p.rx + p.spin) * dt;
      p.m.rotation.y += (p.ry + p.spin * 0.6) * dt;
    }
    renderer.render(scene, camera);
  }

  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) { last = performance.now(); return; }
    frame();
  }

  if (reduce) {
    frame();
    window.addEventListener('resize', frame);
  } else {
    raf = requestAnimationFrame(loop);
  }

  return { renderOnce: frame, timeline, dispose: () => cancelAnimationFrame(raf) };
}
