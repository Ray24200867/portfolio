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
// Page transitions use the browser's cross-document View Transitions (see style.css), so there is
// no blank frame between pages. Scrolling into the next page marks the transition as "down" so the
// old page slides up and the new one follows from below; links get a soft crossfade.
function goTo(href, dir) {
  try { dir ? sessionStorage.setItem('navDir', dir) : sessionStorage.removeItem('navDir'); } catch (e) {}
  location.href = href;
}
window.goTo = goTo;
function navDir() { try { return sessionStorage.getItem('navDir'); } catch (e) { return null; } }
window.addEventListener('pageswap', e => { if (e.viewTransition && navDir()) e.viewTransition.types.add(navDir()); });
window.addEventListener('pagereveal', e => {
  const d = navDir();
  if (e.viewTransition && d) e.viewTransition.types.add(d);
  try { sessionStorage.removeItem('navDir'); } catch (err) {}
});

document.addEventListener('DOMContentLoaded', () => {
  // Clearing the direction for normal link clicks
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (a && !a.target) try { sessionStorage.removeItem('navDir'); } catch (err) {}
  }, true);

  setupNextPage();
  setupReveal();
  setupCursor();
});

// Keep scrolling past the bottom → next page in PAGE_ORDER; past the top → previous page.
// Arriving from below ("up") lands at the bottom of the previous page, like scrolling back.
const ARRIVED = navDir();
function setupNextPage() {
  const i = PAGE_ORDER.findIndex(p => p.file === currentFile());
  if (i < 0) return;
  const next = PAGE_ORDER[i + 1], prev = PAGE_ORDER[i - 1];
  if (ARRIVED === 'up') {
    const toBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    toBottom(); requestAnimationFrame(toBottom); window.addEventListener('load', toBottom, { once: true });
  }
  // A small amount of extra scrolling past the edge is needed, so one accidental tick doesn't leave the page
  const NEED = 240; let down = 0, up = 0, gone = false, lastT = 0, touchY = null;
  const atBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
  const atTop = () => window.scrollY <= 2;
  const readyAt = performance.now() + 900; // ignore leftover trackpad momentum right after arriving
  const push = amount => {   // amount > 0 = scrolling down, < 0 = scrolling up
    if (gone || performance.now() < readyAt) return;
    lastT = performance.now();
    if (amount > 0) {
      up = 0;
      if (!next || !atBottom()) { down = 0; return; }
      down += amount;
      if (down >= NEED) { gone = true; goTo(next.file, 'down'); }
    } else {
      down = 0;
      if (!prev || !atTop()) { up = 0; return; }
      up -= amount;
      if (up >= NEED) { gone = true; goTo(prev.file, 'up'); }
    }
  };
  window.addEventListener('wheel', e => push(Math.max(-120, Math.min(e.deltaY, 120))), { passive: true });
  window.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', e => { if (touchY == null) return; const dy = touchY - e.touches[0].clientY; touchY = e.touches[0].clientY; if (dy) push(dy * 2.2); }, { passive: true });
  window.addEventListener('touchend', () => { touchY = null; });
  window.addEventListener('keydown', e => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) push(180);
    if (['ArrowUp', 'PageUp'].includes(e.key)) push(-180);
  });
  // the build-up drains if the visitor stops scrolling
  setInterval(() => { if (!gone && performance.now() - lastT > 350) { down = Math.max(0, down - 40); up = Math.max(0, up - 40); } }, 60);
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
  const c = document.createElement('div'); c.className = 'cursor'; c.innerHTML = '<div class="s"></div>';
  document.body.appendChild(c);
  document.documentElement.classList.add('star-cursor');
  document.addEventListener('mousemove', e => {
    c.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; c.classList.add('on');
    c.classList.toggle('big', !!e.target.closest('a, button, [role="button"], .pf, .book, .folder'));
  });
  document.addEventListener('mouseleave', () => c.classList.remove('on'));
  document.addEventListener('mousedown', () => c.classList.add('down'));
  document.addEventListener('mouseup', () => c.classList.remove('down'));
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
