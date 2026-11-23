// Investment Strategy Lab · navegación de la presentación (sin dependencias, funciona abriendo index.html)
(() => {
  const stage = document.getElementById('stage');
  const slides = [...document.querySelectorAll('.slide')];
  const bar = document.getElementById('bar');
  const counter = document.getElementById('counter');
  const controls = document.getElementById('controls');
  const pad = n => String(n).padStart(2, '0');
  let i = 0;

  // Escala el lienzo 1600×900 para que quepa entero en la ventana (16:9, sin scroll)
  const fit = () => {
    const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  };
  window.addEventListener('resize', fit);
  fit();

  // Animaciones ligeras: contador de números y barras de E1
  const countUp = el => {
    const to = +el.dataset.to, t0 = performance.now(), d = 900;
    const tick = t => { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const bars = [...document.querySelectorAll('#bars .bar')];
  const max = Math.max(...bars.map(b => +b.dataset.v));
  bars.forEach(b => { if (+b.dataset.v < 1000) b.classList.add('low'); });
  const growBars = on => bars.forEach((b, k) => {
    const fill = b.querySelector('i');
    fill.style.transitionDelay = on ? `${0.15 + k * 0.08}s` : '0s';
    fill.style.width = on ? `${Math.max(0.6, (+b.dataset.v / max) * 100)}%` : '0';
  });

  const show = n => {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
    bar.style.width = `${((i + 1) / slides.length) * 100}%`;
    counter.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
    slides[i].querySelectorAll('.countup').forEach(countUp);
    growBars(slides[i].contains(bars[0]));
    if (history.replaceState) history.replaceState(null, '', `#${i + 1}`);
  };

  const fullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  };

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); show(i + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); show(i - 1); }
    else if (k === 'Home') { e.preventDefault(); show(0); }
    else if (k === 'End') { e.preventDefault(); show(slides.length - 1); }
    else if (k === 'f' || k === 'F') { e.preventDefault(); fullscreen(); }
  });
  document.getElementById('prev').onclick = () => show(i - 1);
  document.getElementById('next').onclick = () => show(i + 1);
  document.getElementById('home').onclick = () => show(0);
  document.getElementById('fs').onclick = fullscreen;
  // Los botones no deben quedarse con el foco (la barra espaciadora volvería a pulsarlos)
  controls.querySelectorAll('button').forEach(b => b.addEventListener('mouseup', () => b.blur()));

  // Controles discretos: se ocultan tras 2,5 s sin mover el ratón
  let idle;
  const wake = () => {
    controls.classList.remove('hide'); document.body.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(() => { if (!controls.matches(':hover')) { controls.classList.add('hide'); document.body.classList.add('idle'); } }, 2500);
  };
  document.addEventListener('mousemove', wake);
  wake();

  // Carrusel de capturas reales (slide 3)
  const figs = [...document.querySelectorAll('#carousel figure')];
  const dots = [...document.querySelectorAll('#carousel .dots i')];
  let c = 0;
  setInterval(() => {
    if (!slides[i].contains(figs[0])) return;
    figs[c].classList.remove('on'); dots[c].classList.remove('on');
    c = (c + 1) % figs.length;
    figs[c].classList.add('on'); dots[c].classList.add('on');
  }, 3200);

  const start = parseInt(location.hash.slice(1), 10);
  show(Number.isFinite(start) ? start - 1 : 0);
})();
