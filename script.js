(() => {
  'use strict';
  const root = document.documentElement;
  const theme = document.getElementById('theme');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cells = [...document.querySelectorAll('.cell')];
  const all = document.getElementById('run-all');
  const announcer = document.getElementById('announcer');
  const timers = new Map();
  const motion = document.getElementById('motion');
  let motionPaused = false;
  try { motionPaused = localStorage.getItem('jayati-motion') === 'paused'; } catch (_) {}
  function syncMotion() {
    const paused = motionPaused || reduced.matches;
    document.body.classList.toggle('motion-paused', paused);
    motion.setAttribute('aria-pressed', String(paused));
    motion.textContent = paused ? 'Resume animations' : 'Pause animations';
    motion.disabled = reduced.matches;
    if (reduced.matches) motion.textContent = 'Reduced motion on';
  }
  motion.hidden = false;
  syncMotion();
  motion.addEventListener('click', () => {
    motionPaused = !motionPaused;
    try { localStorage.setItem('jayati-motion', motionPaused ? 'paused' : 'playing'); } catch (_) {}
    syncMotion();
  });
  const dark = () => root.dataset.theme ? root.dataset.theme === 'dark' : systemTheme.matches;
  const syncTheme = () => { theme.setAttribute('aria-pressed', String(dark())); theme.setAttribute('aria-label', dark() ? 'Switch to light mode' : 'Switch to dark mode'); theme.textContent = dark() ? 'Light mode' : 'Dark mode'; };
  try {
    const saved = localStorage.getItem('jayati-theme');
    if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;
  } catch (_) { /* Storage is optional. */ }
  theme.hidden = false;
  syncTheme();
  theme.addEventListener('click', () => {
    root.dataset.theme = dark() ? 'light' : 'dark';
    try { localStorage.setItem('jayati-theme', root.dataset.theme); } catch (_) {}
    syncTheme();
  });
  systemTheme.addEventListener('change', syncTheme);

  const prompts = new Map(cells.map(cell => [cell, cell.querySelector('.prompt').textContent]));
  function finish(cell, announce = false) {
    clearTimeout(timers.get(cell));
    timers.delete(cell);
    cell.classList.remove('waiting', 'running', 'queued');
    cell.querySelector('.prompt').textContent = prompts.get(cell);
    cell.classList.add('revealed');
    cell.classList.remove('replaying');
    void cell.offsetWidth;
    cell.classList.add('replaying');
    cell.removeAttribute('aria-busy');
    cell.querySelector('.run').removeAttribute('aria-disabled');
    if (announce) announcer.textContent = cell.getAttribute('aria-label') + ' output ready.';
  }
  function run(cell, announce = false, delay = 700) {
    if (cell.classList.contains('running')) return Promise.resolve();
    if (reduced.matches || motionPaused) { finish(cell, announce); return Promise.resolve(); }
    cell.classList.add('running', 'queued');
    cell.querySelector('.prompt').textContent = 'In [*]:';
    cell.setAttribute('aria-busy', 'true');
    cell.querySelector('.run').setAttribute('aria-disabled', 'true');
    return new Promise(resolve => timers.set(cell, setTimeout(() => { finish(cell, announce); resolve(); }, delay)));
  }
  let runningAll = false;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function stopAll() {
    runningAll = false;
    cells.forEach(cell => finish(cell));
    all.textContent = '▷ Run all cells';
  }
  async function runAll() {
    if (runningAll) return stopAll();
    if (reduced.matches || motionPaused) { cells.forEach(cell => finish(cell)); announcer.textContent = 'All cell outputs are ready.'; return; }
    runningAll = true;
    all.textContent = '■ Stop';
    cells.forEach(cell => { cell.classList.add('queued'); cell.querySelector('.prompt').textContent = 'In [ ]:'; });
    for (const cell of cells) {
      if (!runningAll) return;
      cell.scrollIntoView({behavior: 'smooth', block: 'start'});
      await wait(900);
      if (!runningAll) return;
      await run(cell, false, 900);
      const words = cell.querySelector('.cell-output').innerText.split(/\s+/).length;
      await wait(Math.min(6000, Math.max(2200, words * 25)));
    }
    runningAll = false;
    all.textContent = '▷ Run all cells';
    announcer.textContent = 'All cell outputs are ready.';
  }
  cells.forEach(cell => {
    const button = cell.querySelector('.run');
    button.hidden = false;
    button.addEventListener('click', () => run(cell, true));
    // Keep every output accessible; animate without collapsing the page.

  });
  cells.forEach(cell => cell.classList.add('revealed'));
  all.hidden = false;
  all.addEventListener('click', runAll);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(({target, isIntersecting}) => {
        target.classList.toggle('in-view', isIntersecting);
      });
    }, {threshold: 0, rootMargin: '0px'});
    cells.forEach(cell => observer.observe(cell));
  } else {
    cells.forEach(cell => cell.classList.add('in-view'));
  }
  // Anchor navigation opens the requested output before the browser scrolls.
  document.querySelectorAll('a[href^="#cell-"]').forEach(link => {
    link.addEventListener('click', () => {
      const cell = document.getElementById(link.hash.slice(1));
      if (cell && !runningAll) finish(cell);
    });
  });
  const target = document.getElementById(location.hash.slice(1));
  if (target && target.classList.contains('cell')) finish(target);
  reduced.addEventListener('change', () => {
    syncMotion();
    if (reduced.matches) {
      runAll();
      document.getElementById('parade').replaceChildren();
    }
  });
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('page-hidden', document.hidden);
  });
  let keys = '';
  let lastKey = 0;
  let celebrating = false;
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key.length !== 1) return;
    if (Date.now() - lastKey > 1800) keys = '';
    lastKey = Date.now();
    keys = (keys + event.key.toLowerCase()).slice(-4);
    if (keys !== 'hire' || celebrating) return;
    keys = '';
    announcer.textContent = 'Mini Jayati says: you found me!';
    if (reduced.matches || motionPaused) return;
    celebrating = true;
    const parade = document.getElementById('parade');
    const messages = ['you found me!', 'thanks for stopping by', 'say hi anytime', 'let’s build something ✨'];
    messages.forEach((text, i) => {
      const runner = document.createElement('div');
      runner.className = 'runner';
      runner.style.animationDelay = `${i * 1.3}s`;
      const cheer = document.createElement('small');
      cheer.textContent = text;
      runner.append(cheer, document.querySelector('.blob.wave').cloneNode(true));
      parade.append(runner);
    });
    setTimeout(() => { parade.replaceChildren(); celebrating = false; }, 14500);
  });
})();
