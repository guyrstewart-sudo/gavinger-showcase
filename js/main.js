/* ============================================================
   GAVINGER — chrome: entry sequence, flashlight cursor, INDEX
   overlay, progress-rail ticks, loop pill, workshop clock.
   ============================================================ */
(function () {
  'use strict';

  var CHAIN = window.GAV_CHAIN || [];
  var N = CHAIN.length;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- entry: the dark before the room ---------- */
  var entry = document.getElementById('entry');
  function killEntry() {
    if (entry && !entry.classList.contains('gone')) {
      entry.classList.add('gone');
      document.documentElement.style.overflow = '';
      document.dispatchEvent(new CustomEvent('gav:entry-done')); // the film starts here
    }
  }
  if (reduced) {
    gsap.to(entry, { autoAlpha: 0, duration: 0.6, delay: 0.3, onComplete: killEntry });
  } else {
    var spokes = entry.querySelectorAll('#entry-rosette line, #entry-rosette circle');
    spokes.forEach(function (el) {
      var len = (el.getTotalLength && el.getTotalLength()) || 80;
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
    });
    var eTl = gsap.timeline();
    eTl.to(spokes, { strokeDashoffset: 0, duration: 0.9, stagger: 0.03, ease: 'power1.inOut' })
       .to('#entry-rosette', { autoAlpha: 0, y: -14, duration: 0.4, ease: 'sine.in' }, '+=0.1')
       .fromTo('#entry-wordmark', { autoAlpha: 0, letterSpacing: '0.3em' },
         { autoAlpha: 1, letterSpacing: '0.18em', duration: 1.0, ease: 'power2.out' }, '<0.1')
       .to(entry, { autoAlpha: 0, duration: 1.2, ease: 'sine.inOut', onComplete: killEntry }, '+=0.35');
  }
  setTimeout(killEntry, 4500); // failsafe — never trap the visitor in the dark

  /* ---------- flashlight cursor (pointer:fine only) ---------- */
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (window.matchMedia('(pointer: fine)').matches && !reduced) {
    document.body.classList.add('cursor-on');
    var cursor = document.getElementById('cursor');
    var xTo = gsap.quickTo(cursor, 'x', { duration: 0.28, ease: 'power3' });
    var yTo = gsap.quickTo(cursor, 'y', { duration: 0.28, ease: 'power3' });
    window.addEventListener('mousemove', function (e) {
      if (reduceMq.matches) return; // live guard — preference can flip mid-session
      xTo(e.clientX); yTo(e.clientY);
    });
    reduceMq.addEventListener('change', function (e) {
      document.body.classList.toggle('cursor-on', !e.matches);
    });
    document.addEventListener('mouseover', function (e) {
      var overArt = !!(e.target.closest && e.target.closest('.dive-layer, .frame, #mosaic a, #mural-figure'));
      document.body.classList.toggle('cursor-art', overArt);
    });
    document.addEventListener('gav:dive', function (e) {
      document.body.classList.toggle('cursor-dive', e.detail.zoomT > 0.61);
    });
  }

  /* ---------- progress rail: ticks + hover title ---------- */
  var ticksHost = document.getElementById('rail-ticks');
  var railTitle = document.getElementById('rail-title');
  if (ticksHost) {
    for (var i = 0; i < N; i++) {
      var tick = document.createElement('span');
      tick.style.top = (i / N * 100) + '%';
      ticksHost.appendChild(tick);
    }
  }
  document.addEventListener('gav:dive', function (e) {
    if (railTitle && CHAIN[e.detail.index]) railTitle.textContent = CHAIN[e.detail.index].t;
  });

  /* ---------- INDEX overlay — exhibition checklist ---------- */
  var overlay = document.getElementById('index-overlay');
  var list = document.getElementById('index-list');
  var openBtn = document.getElementById('index-open');
  var closeBtn = document.getElementById('index-close');

  CHAIN.forEach(function (p, i) {
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML =
      '<span class="ix-num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="ix-title">' + p.t + '</span>' +
      '<span class="ix-meta">' + p.kind + ' · $' + Number(p.price).toLocaleString('en-US') + '</span>';
    btn.addEventListener('click', function () { closeIndex(); scrubToChapter(i); });
    li.appendChild(btn);
    list.appendChild(li);
  });

  function scrubToChapter(i) {
    if (window.GAV_DIVE) {
      window.scrollTo(0, 0);          // the film plays in the stage at the top
      window.GAV_DIVE.seek(i);
    } else {
      // reduced motion: chapters are in normal flow
      var layer = document.querySelector('.dive-layer[data-i="' + i + '"]');
      if (layer) layer.scrollIntoView();
    }
  }
  var INERT_TARGETS = ['main', '#site-head', '#rail'].map(function (s) { return document.querySelector(s); });
  function setBackgroundInert(on) {
    INERT_TARGETS.forEach(function (el) {
      if (!el) return;
      try { el.inert = on; } catch (err) { /* pre-inert browsers */ }
      if (on) { el.setAttribute('aria-hidden', 'true'); } else { el.removeAttribute('aria-hidden'); }
    });
  }
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    var focusables = overlay.querySelectorAll('button, a[href]');
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openIndex() {
    overlay.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    setBackgroundInert(true);
    overlay.addEventListener('keydown', trapFocus);
    closeBtn.focus();
  }
  function closeIndex() {
    overlay.hidden = true;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    setBackgroundInert(false);
    overlay.removeEventListener('keydown', trapFocus);
    openBtn.focus();
  }
  openBtn.addEventListener('click', openIndex);
  closeBtn.addEventListener('click', closeIndex);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) closeIndex();
  });

  /* ---------- hint fades once the visitor scrolls on ---------- */
  var hint = document.getElementById('dive-hint');
  window.addEventListener('scroll', function () {
    if (hint) hint.style.display = window.scrollY > 40 ? 'none' : '';
  }, { passive: true });

  /* ---------- the workshop keeps its own time ---------- */
  var clockEl = document.getElementById('clock-time');
  function tickClock() {
    var d = new Date();
    clockEl.textContent =
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0');
  }
  if (clockEl) { tickClock(); setInterval(tickClock, 1000); }
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
