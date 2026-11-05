import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initScales } from './scales.js';

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Botões: troca de letras uma a uma ---------- */
function splitLetters(text, cls) {
  const row = document.createElement('span');
  row.className = 'btn__row ' + cls;
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.style.setProperty('--i', i);
    s.textContent = ch === ' ' ? ' ' : ch;
    row.appendChild(s);
  });
  return row;
}
$$('[data-split]').forEach((el) => {
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const a = splitLetters(text, 'btn__row--a');
  const b = splitLetters(text, 'btn__row--b');
  a.setAttribute('aria-hidden', 'true');
  b.setAttribute('aria-hidden', 'true');
  el.append(a, b);
});

/* ---------- Botões: efeito magnético (sem re-render, só gsap.quickTo) ---------- */
if (!reduce && window.matchMedia('(hover: hover)').matches) {
  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.28);
      y((e.clientY - (r.top + r.height / 2)) * 0.4);
    });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

/* ---------- Navegação: some ao descer, volta ao subir ---------- */
const nav = $('[data-nav]');
ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate: (self) => {
    nav.classList.toggle('is-scrolled', self.scroll() > 40);
    nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 600);
  },
});
gsap.to('[data-progress]', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });

/* ---------- Hero: balança 3D + abertura em cena ---------- */
const hero = $('[data-hero]');
const sceneState = { p: 0 };
const l1 = $('.hero h1 .line:not(.line--outline) > span');
const l2 = $('.hero h1 .line--outline > span');

function revealCopy(rest) {
  const sweep = { v: -20 };
  l2.style.setProperty('--sx', '-20%');
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .to(l2, { yPercent: 0, duration: 1.3 }, 0)
    .to(sweep, { v: 125, duration: 1.5, ease: 'power2.inOut', onUpdate: () => l2.style.setProperty('--sx', sweep.v + '%') }, 0.25)
    .to(rest, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12 }, 0.35);
}

const scales = initScales($('[data-canvas]'), hero, sceneState, reduce, {
  onImpact: () => { if (!reduce) revealCopy('[data-fade]'); },
});
if (!scales) hero.classList.add('no-webgl');

if (!reduce) {
  gsap.set([l1, l2], { yPercent: 115 });
  gsap.set('[data-fade]', { opacity: 0, y: 24 });
  gsap.set(nav, { opacity: 0 });
  const tl = gsap.timeline({ delay: 0.15, defaults: { ease: 'expo.out' } });
  tl.to(nav, { opacity: 1, duration: 1, ease: 'power2.out' }, scales ? 1.2 : 0);
  if (scales) {
    // linha 1 entra enquanto a balança monta; linha 2 e o resto entram no impacto
    tl.to(l1, { yPercent: 0, duration: 1.5 }, 1.7);
  } else {
    tl.to(l1, { yPercent: 0, duration: 1.5 }, 0);
    tl.add(() => revealCopy('[data-fade]'), 0.2);
  }

  // a rolagem equilibra a balança e afasta o texto
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => { sceneState.p = self.progress; },
  });
  gsap.to('.hero__copy', { yPercent: -14, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
} else {
  gsap.set(l2, { '--sx': -30 });
}

/* ---------- Manifesto: palavras que acendem + selo 3D ---------- */
const mText = $('[data-words]');
(function splitWords(root) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok.trim()) { frag.append(tok); return; }
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = tok;
          frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(root);
})(mText);

const seal = $('[data-seal3d]');
for (let i = 0; i < 20; i++) {
  const e = document.createElement('div');
  e.className = 'seal3d__edge';
  e.style.setProperty('--i', i);
  seal.insertBefore(e, seal.firstChild);
}
if (!reduce) {
  gsap.fromTo($$('.w', mText), { opacity: 0.14 }, {
    opacity: 1,
    ease: 'none',
    stagger: 0.12,
    scrollTrigger: { trigger: '[data-manifesto]', start: 'top 55%', end: 'bottom bottom', scrub: true },
  });
  gsap.fromTo(seal, { rotateY: -40, rotateX: 14 }, {
    rotateY: 500,
    rotateX: -8,
    ease: 'none',
    scrollTrigger: { trigger: '[data-manifesto]', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
  });
} else {
  gsap.set(seal, { rotateY: -24, rotateX: 10 });
}

/* ---------- Áreas: rolagem horizontal fixada ---------- */
const mm = gsap.matchMedia();
mm.add('(min-width: 1001px) and (prefers-reduced-motion: no-preference)', () => {
  const wrap = $('[data-pan]');
  const viewport = $('[data-pan-viewport]');
  const track = $('[data-pan-track]');
  const bar = $('[data-pan-bar]');
  viewport.classList.add('is-pinned');
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: wrap,
      start: 'top top',
      end: () => `+=${dist()}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress})`; },
    },
  });
  return () => { viewport.classList.remove('is-pinned'); bar.style.transform = ''; };
});

/* ---------- Pastas: inclinação 3D que segue o cursor ---------- */
if (!reduce && window.matchMedia('(hover: hover)').matches) {
  $$('[data-tilt]').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(card, { transformPerspective: 900 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 14);
      rx(-(py - 0.5) * 12);
      card.style.setProperty('--mx', px * 100 + '%');
      card.style.setProperty('--px', px.toFixed(3));
      card.style.setProperty('--py', py.toFixed(3));
      card.style.setProperty('--my', py * 100 + '%');
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); card.style.setProperty('--px', 0.5); card.style.setProperty('--py', 0.5); });
  });
}

/* ---------- Entradas por rolagem ---------- */
$$('[data-reveal]').forEach((el) => {
  if (reduce) return;
  gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
});
$$('.pcard').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 80%', once: true, onEnter: () => el.classList.add('is-in') }));
if (!reduce) {
}

/* ---------- Barras de progresso e contadores ---------- */
$$('[data-bar]').forEach((el) => {
  const v = +el.dataset.bar;
  if (reduce) { el.style.setProperty('--w', v); return; }
  const o = { w: 0 };
  gsap.to(o, { w: v, duration: 1.6, ease: 'power3.out', onUpdate: () => el.style.setProperty('--w', o.w), scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
});
$$('[data-count]').forEach((el) => {
  const v = +el.dataset.count;
  if (reduce) return;
  const o = { n: 0 };
  el.textContent = '0';
  gsap.to(o, { n: v, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.n); }, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
});

/* ---------- Alternador Pessoa física / Empresa ---------- */
$$('[data-sw]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.sw;
  $$('[data-sw]').forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); });
  $$('[data-sw-body]').forEach((body) => {
    const show = body.dataset.swBody === k;
    body.hidden = !show;
    if (show && !reduce) gsap.fromTo(body, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
  });
}));

/* ---------- Informativos: lista com prévia fixa ---------- */
(function postIndex() {
  const root = $('[data-index]');
  if (!root) return;
  const items = $$('.index__item', root);
  const imgs = $$('.index__preview img', root);
  const label = $('[data-count-label]', root);
  const set = (i) => {
    items.forEach((el, k) => el.classList.toggle('is-on', k === i));
    imgs.forEach((el, k) => el.classList.toggle('is-on', k === i));
    label.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
  };
  items.forEach((el, i) => {
    el.addEventListener('mouseenter', () => set(i));
    el.addEventListener('focus', () => set(i));
  });
})();

/* ---------- Brilho que segue o cursor ---------- */
if (window.matchMedia('(hover: hover)').matches) {
  $$('[data-spot]').forEach((el) => el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sx', e.clientX - r.left + 'px');
    el.style.setProperty('--sy', e.clientY - r.top + 'px');
  }));
}

/* links de exemplo (#) não rolam a página para o topo */
$$('a[href="#"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

/* ---------- Contato: segurar para assinar ---------- */
(function holdToSign() {
  const form = $('[data-form]');
  const btn = $('[data-hold]');
  const stamp = $('[data-stamp]');
  const reset = $('[data-reset]');
  const DURATION = 1500;
  let raf = 0;
  let start = 0;
  let holding = false;
  let done = false;

  const setP = (v) => btn.style.setProperty('--p', v);

  function validate() {
    let ok = true;
    const nome = $('#f-nome');
    const tel = $('#f-tel');
    const set = (input, msg) => {
      const field = input.closest('.field');
      $('.field__err', field).textContent = msg;
      field.classList.toggle('is-invalid', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) ok = false;
    };
    set(nome, nome.value.trim().length < 3 ? 'Informe seu nome completo.' : '');
    set(tel, tel.value.replace(/\D/g, '').length < 10 ? 'Informe um WhatsApp com DDD.' : '');
    if (!ok) (nome.closest('.is-invalid') ? nome : tel).focus();
    return ok;
  }

  function begin() {
    if (done || holding) return;
    if (!validate()) return;
    holding = true;
    start = performance.now();
    gsap.killTweensOf(btn);
    btn.classList.add('is-holding');
    tick();
  }
  function tick() {
    if (!holding) return;
    const p = Math.min((performance.now() - start) / DURATION, 1);
    setP(p);
    if (p >= 1) { complete(); return; }
    raf = requestAnimationFrame(tick);
  }
  function cancel() {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(raf);
    btn.classList.remove('is-holding');
    gsap.to(btn, { '--p': 0, duration: 0.4, ease: 'power3.out' });
  }
  function complete() {
    holding = false;
    done = true;
    btn.classList.remove('is-holding');
    btn.classList.add('is-done');
    setP(1);
    // Prototipo: aqui entraria o envio real (PHP/e-mail/WhatsApp).
    const data = Object.fromEntries(new FormData(form).entries());
    console.info('Pedido assinado (prototipo):', data);

    const seal = $('.stamp__seal', stamp);
    const msg = $$('.stamp__msg, .stamp__reset', stamp);
    stamp.classList.add('is-on');
    if (reduce) { gsap.set(stamp, { opacity: 1 }); return; }
    gsap.set(seal, { scale: 2.6, rotate: -28, opacity: 0 });
    gsap.set(msg, { y: 20, opacity: 0 });
    gsap.timeline()
      .to(stamp, { opacity: 1, duration: 0.25 })
      .to(seal, { scale: 1, rotate: -8, opacity: 1, duration: 0.32, ease: 'power4.in' })
      .to(form, { x: 7, duration: 0.05, yoyo: true, repeat: 5, ease: 'none' })
      .to(form, { x: 0, duration: 0.1 })
      .to(msg, { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'expo.out' }, '-=0.1');
  }
  function resetForm() {
    done = false;
    form.reset();
    setP(0);
    btn.classList.remove('is-done');
    gsap.to(stamp, { opacity: 0, duration: 0.3, onComplete: () => stamp.classList.remove('is-on') });
  }

  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); begin(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, cancel));
  btn.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin(); }
  });
  btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') cancel(); });
  btn.addEventListener('blur', cancel);
  reset.addEventListener('click', resetForm);
  form.addEventListener('submit', (e) => e.preventDefault());
})();

/* ---------- Recalcula tudo quando fontes e imagens terminam de carregar ---------- */
window.addEventListener('load', () => ScrollTrigger.refresh());
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
