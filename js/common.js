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
