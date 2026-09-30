// Scales the fixed 1440px artboard to the window width and keeps the page height in sync.
(function () {
  const MAX_SCALE = 1.35;
  function fit() {
    document.querySelectorAll('.stage').forEach(stage => {
      const board = stage.querySelector('.board');
      const s = Math.min(window.innerWidth / 1440, MAX_SCALE);
      board.style.transform = `scale(${s})`;
      stage.style.height = board.offsetHeight * s + 'px';
      if (s > 1) board.style.marginLeft = (window.innerWidth - 1440 * s) / 2 + 'px';
      else board.style.marginLeft = '0';
    });
  }
  window.fitBoard = fit;
  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', () => {
    fit();
    const ro = new ResizeObserver(fit);
    document.querySelectorAll('.board').forEach(b => ro.observe(b));
  });
})();

// ---------- Site-wide interactions ----------
const PAGE_ORDER = [
  { file: 'index.html', label: 'Home' },
  { file: 'about.html', label: 'About' },
  { file: 'portfolio.html', label: 'Portfolio' },
  { file: 'hobbies.html', label: 'Learn more' },
];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function currentFile() {
  const f = location.pathname.split('/').pop();
  return f === '' ? 'index.html' : f;
}
function labelFor(href) {
  const f = href.split('/').pop().split(/[?#]/)[0] || 'index.html';
  const p = PAGE_ORDER.find(x => x.file === f);
  if (p) return p.label;
  const a = new URLSearchParams(href.split('?')[1] || '').get('a');
  return a ? a[0].toUpperCase() + a.slice(1) : '';
}

// Curtain page transitions
let curtain;
function goTo(href) {
  if (reduceMotion) { location.href = href; return; }
  curtain.querySelector('span').textContent = labelFor(href);
  curtain.classList.remove('lift', 'instant');
  requestAnimationFrame(() => curtain.classList.add('cover'));
  try { sessionStorage.setItem('curtain', labelFor(href)); } catch (e) {}
  setTimeout(() => { location.href = href; }, 470);
}
window.goTo = goTo;

document.addEventListener('DOMContentLoaded', () => {
  curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.innerHTML = '<span hidden></span>';
  document.body.appendChild(curtain);
  let arrived = null; try { arrived = sessionStorage.getItem('curtain'); sessionStorage.removeItem('curtain'); } catch (e) {}
  if (arrived && !reduceMotion) {
    curtain.querySelector('span').textContent = arrived;
    curtain.classList.add('instant', 'cover');
    requestAnimationFrame(() => requestAnimationFrame(() => { curtain.classList.remove('instant'); curtain.classList.add('lift'); curtain.classList.remove('cover'); }));
  }
  // Coming back with the browser Back button: make sure the curtain is not left covering the page
  window.addEventListener('pageshow', e => { if (e.persisted) curtain.className = 'curtain'; });

  // Intercept internal page links
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const href = a.getAttribute('href');
    if (!/\.html(\?|#|$)/.test(href) || /^https?:/.test(href)) return;
    e.preventDefault();
    goTo(href);
  });

  setupNextPage();
  setupReveal();
  setupCursor();
});

// Keep scrolling at the bottom of a page → go to the next page in PAGE_ORDER
function setupNextPage() {
  const i = PAGE_ORDER.findIndex(p => p.file === currentFile());
  if (i < 0 || i === PAGE_ORDER.length - 1) return;
  const next = PAGE_ORDER[i + 1];
  // A small amount of extra scrolling past the bottom is needed, so one accidental tick doesn't leave the page
  const NEED = 240; let acc = 0, gone = false, lastT = 0, touchY = null;
  const atBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
  const push = amount => {
    if (gone) return;
    if (!atBottom()) { acc = 0; return; }
    acc += amount; lastT = performance.now();
    if (acc >= NEED) { gone = true; goTo(next.file); }
  };
  window.addEventListener('wheel', e => { if (e.deltaY > 0) push(Math.min(e.deltaY, 120)); else acc = 0; }, { passive: true });
  window.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', e => { if (touchY == null) return; const dy = touchY - e.touches[0].clientY; touchY = e.touches[0].clientY; if (dy > 0) push(dy * 2.2); }, { passive: true });
  window.addEventListener('touchend', () => { touchY = null; });
  window.addEventListener('keydown', e => { if (['ArrowDown', 'PageDown', ' '].includes(e.key) && atBottom()) push(180); });
  // let the ring drain if the visitor stops scrolling
  setInterval(() => { if (!gone && acc > 0 && performance.now() - lastT > 350) { acc = Math.max(0, acc - 40); } }, 60);
}

// Elements with .reveal fade/slide in when they enter the viewport
function setupReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

// Small ring cursor that grows over clickable things
function setupCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const c = document.createElement('div'); c.className = 'cursor'; document.body.appendChild(c);
  let x = -100, y = -100, cx = x, cy = y;
  document.addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; c.classList.add('on');
    c.classList.toggle('big', !!e.target.closest('a, button, [role="button"], .pf, .book, .folder')); });
  document.addEventListener('mouseleave', () => c.classList.remove('on'));
  document.addEventListener('mousedown', () => c.classList.add('down'));
  document.addEventListener('mouseup', () => c.classList.remove('down'));
  (function loop() { cx += (x - cx) * .25; cy += (y - cy) * .25; c.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); })();
}

// Shared nav markup
function renderNav(active) {
  const links = [
    ['Home', 'index.html'],
    ['About', 'about.html'],
    ['Portfolio', 'portfolio.html'],
    ['Learn more', 'hobbies.html'],
  ];
  return `<nav class="nav">
    <a class="logo" href="index.html">Portfolio</a>
    <div class="links">${links.map(([t, h]) => `<a href="${h}"${t === active ? ' class="active"' : ''}>${t}</a>`).join('')}</div>
  </nav>`;
}
