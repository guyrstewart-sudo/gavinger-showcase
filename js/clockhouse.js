/* ============================================================
   GAVINGER — THE CASE
   Arrival at the closed grandfather clock, the doors opening into
   the site, and the film running overhead while the collection
   scrolls underneath it.

   Replaces main.js + dive.js on this page. sections.js still builds
   chapters 02–07 from data.js.
   ============================================================ */
(function () {
  'use strict';

  var CHAIN = window.GAV_CHAIN || [];
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the case door, measured off the film's own first frame
     (assets/render/v3/checks-rot/first.png, 3840x2160) */
  var DOOR = { l: 0.372, r: 0.607, t: 0.198 };
  var IMG  = { w: 3840, h: 2160 };
  var FOCUS_Y = 0.38;                    /* the photo's vertical framing */

  /* where each chain piece arrives in the rotated film (seconds).
     Piece 1, the Midnight clock, is not in this cut — its chapter was
     the handheld workshop footage, removed 2026-07-28. */
  var FILM_AT = { 0: 141.24, 2: 0, 3: 16.96, 4: 33.18, 5: 51.20,
                  6: 64.19, 7: 83.42, 8: 100.35, 9: 114.68 };

  var entry   = document.getElementById('case-entry');
  var stage   = document.getElementById('case-stage');
  var photo   = document.getElementById('case-photo');
  var doorway = document.getElementById('case-doorway');
  var dl      = document.getElementById('door-left');
  var dr      = document.getElementById('door-right');
  var call    = document.getElementById('case-call');
  var reel    = document.getElementById('reel');
  var video   = document.getElementById('reel-video');

  /* ------------------------------------------------------------
     1 · registration — the leaves must sit ON the photo exactly,
     so the case looks shut until it isn't. Both are positioned
     from the same cover-fit numbers rather than trusting CSS to
     agree with the maths.
     ------------------------------------------------------------ */
  function fitCase() {
    var W = window.innerWidth, H = window.innerHeight;
    var s = Math.max(W / IMG.w, H / IMG.h);
    var dw = IMG.w * s, dh = IMG.h * s;
    var x = (W - dw) / 2;
    var y = (H - dh) * FOCUS_Y;

    photo.style.backgroundSize = dw + 'px ' + dh + 'px';
    photo.style.backgroundPosition = x + 'px ' + y + 'px';

    var left = DOOR.l * W, right = DOOR.r * W, top = DOOR.t * H;
    var mid = (left + right) / 2;

    doorway.style.left = left + 'px';
    doorway.style.width = (right - left) + 'px';
    doorway.style.top = top + 'px';

    [[dl, left], [dr, mid]].forEach(function (pair) {
      var el = pair[0], x0 = pair[1];
      el.style.left = x0 + 'px';
      el.style.width = (mid - left) + 'px';
      el.style.top = top + 'px';
      el.style.backgroundSize = dw + 'px ' + dh + 'px';
      el.style.backgroundPosition = (x - x0) + 'px ' + (y - top) + 'px';
    });
  }

  /* ------------------------------------------------------------
     2 · the film
     ------------------------------------------------------------ */
  var SRC = window.matchMedia('(max-width: 820px)').matches
    ? 'media/trial/film-720.mp4'
    : 'media/trial/film-1080.mp4';
  var armed = false;

  function armFilm() {
    if (armed) return;
    armed = true;
    video.src = SRC;
    video.load();
  }
  function playFilm() {
    armFilm();
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* a paused film is not a broken one */ });
  }
  function whenPlayable(cb) {
    if (video.readyState >= 3) { cb(); return; }
    var done = false;
    function go() { if (done) return; done = true; cb(); }
    video.addEventListener('canplay', go, { once: true });
    setTimeout(go, 2600);                 // never hold the door shut on a slow pipe
  }

  /* ------------------------------------------------------------
     3 · opening the case
     ------------------------------------------------------------ */
  function goInside() {
    document.body.classList.remove('case-closed');
    document.body.classList.add('inside');
    if (entry) entry.classList.add('gone');
    document.documentElement.style.overflow = '';
    ScrollTrigger.refresh();
    document.dispatchEvent(new CustomEvent('gav:inside'));
  }

  var opened = false, pushed = false;
  var doorsTl = null, pushTl = null;

  function hideEntry() { if (entry) entry.classList.add('gone'); }

  /* phase 2 — walk through the open doorway. The room is lit BEFORE the
     entry fades, so the film is already running when it is revealed;
     fading first and lighting after would show a black hole. */
  function pushThrough() {
    if (pushed) return;
    pushed = true;
    goInside();
    pushTl = gsap.timeline({ onComplete: hideEntry })
      .to(stage, { scale: 7.4, duration: 1.5, ease: 'power2.in' }, 0)
      .to(entry, { autoAlpha: 0, duration: 0.9, ease: 'sine.inOut' }, 0.55);
    return pushTl;
  }

  function openCase() {
    if (opened) return;
    opened = true;
    entry.classList.add('opening');
    playFilm();

    if (reduced) { goInside(); hideEntry(); return; }

    var shades = entry.querySelectorAll('.case-door .shade');
    var glow = entry.querySelector('#case-doorway .glow');

    /* failsafe — never leave anyone standing at a shut door. If the animation
       clock never runs (throttled tab, a webview with no rAF, GSAP failing to
       load) the timelines never advance, so force the end state on a timer.
       Same principle as the old entry overlay's 4.5s escape hatch. */
    setTimeout(function () { pushThrough(); goInside(); hideEntry(); }, 6000);

    doorsTl = gsap.timeline();
    doorsTl.to(call, { autoAlpha: 0, y: 14, duration: 0.4, ease: 'sine.in' }, 0)
      /* the leaves swing — the far edge lifts toward the room */
      .to(dl, { rotateY: -108, duration: 1.5, ease: 'power2.inOut' }, 0.18)
      .to(dr, { rotateY: 108, duration: 1.5, ease: 'power2.inOut' }, 0.18)
      .to(shades, { opacity: 1, duration: 1.5, ease: 'power1.in' }, 0.18)
      /* light spills out of the open case */
      .to(glow, { opacity: 1, duration: 1.1, ease: 'sine.out' }, 0.55)
      /* the doorway only opens onto something once the film can play */
      .call(function () { whenPlayable(pushThrough); }, null, 1.35);
  }

  if (reduced) {
    /* reduced motion never gets an autoplaying film or a swinging weight —
       the case is simply already open. */
    if (entry) entry.classList.add('gone');
    document.body.classList.remove('case-closed');
    document.body.classList.add('inside');
    opened = true;
  } else {
    fitCase();
    window.addEventListener('resize', function () { if (!opened) fitCase(); }, { passive: true });
    call.addEventListener('click', openCase);
    document.addEventListener('keydown', function (e) {
      if (!opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCase(); }
    });
    /* never trap a visitor at a shut door */
    setTimeout(function () { if (!opened) call.focus(); }, 900);
  }

  /* ------------------------------------------------------------
     4 · the film recedes into the case as you start reading
     ------------------------------------------------------------ */
  var TALL = 0.92, DOCK = 0.46;
  if (window.matchMedia('(max-width: 700px)').matches) { TALL = 0.74; DOCK = 0.34; }

  function sizeReel() {
    if (reduced) return;
    var vh = window.innerHeight;
    var tall = vh * TALL, dock = vh * DOCK;
    var p = Math.min(1, Math.max(0, window.scrollY / (vh * 0.8)));
    var e = p * p * (3 - 2 * p);                  // smoothstep
    reel.style.height = (tall + (dock - tall) * e) + 'px';
  }
  window.addEventListener('scroll', sizeReel, { passive: true });
  window.addEventListener('resize', sizeReel, { passive: true });
  sizeReel();

  /* ------------------------------------------------------------
     5 · film controls
     ------------------------------------------------------------ */
  var toggle = document.getElementById('reel-toggle');
  var full = document.getElementById('reel-full');

  function syncToggle() {
    var paused = video.paused;
    toggle.textContent = paused ? 'Play' : 'Pause';
    toggle.setAttribute('aria-label', paused ? 'Play the film' : 'Pause the film');
  }
  toggle.addEventListener('click', function () {
    if (video.paused) playFilm(); else video.pause();
    syncToggle();
  });
  video.addEventListener('play', syncToggle);
  video.addEventListener('pause', syncToggle);
  syncToggle();

  full.addEventListener('click', function () {
    armFilm();
    var go = video.requestFullscreen || video.webkitRequestFullscreen || video.webkitEnterFullscreen;
    if (go) { go.call(video); playFilm(); }
  });

  /* a film nobody is looking at should not burn a battery */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (!video.paused) { video.pause(); video.dataset.autopaused = '1'; } }
    else if (video.dataset.autopaused === '1') { delete video.dataset.autopaused; playFilm(); }
  });

  /* ------------------------------------------------------------
     6 · flashlight cursor (pointer:fine only)
     ------------------------------------------------------------ */
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (window.matchMedia('(pointer: fine)').matches && !reduced) {
    document.body.classList.add('cursor-on');
    var cursor = document.getElementById('cursor');
    var xTo = gsap.quickTo(cursor, 'x', { duration: 0.28, ease: 'power3' });
    var yTo = gsap.quickTo(cursor, 'y', { duration: 0.28, ease: 'power3' });
    window.addEventListener('mousemove', function (e) {
      if (reduceMq.matches) return;
      xTo(e.clientX); yTo(e.clientY);
    });
    reduceMq.addEventListener('change', function (e) {
      document.body.classList.toggle('cursor-on', !e.matches);
    });
    document.addEventListener('mouseover', function (e) {
      var overArt = !!(e.target.closest && e.target.closest('#reel, .frame, #mosaic a, #mural-figure'));
      document.body.classList.toggle('cursor-art', overArt);
    });
  }

  /* ------------------------------------------------------------
     7 · INDEX — every row is a moment in the film
     ------------------------------------------------------------ */
  var overlay = document.getElementById('index-overlay');
  var list = document.getElementById('index-list');
  var openBtn = document.getElementById('index-open');
  var closeBtn = document.getElementById('index-close');

  CHAIN.forEach(function (p, i) {
    var at = FILM_AT[i];
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML =
      '<span class="ix-num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="ix-title">' + p.t + '</span>' +
      '<span class="ix-meta">' + p.kind + ' · $' + Number(p.price).toLocaleString('en-US') + '</span>';
    if (at === undefined) {
      btn.disabled = true;
      btn.title = 'Not in this cut of the film';
    } else {
      btn.addEventListener('click', function () { closeIndex(); seekFilm(at); });
    }
    li.appendChild(btn);
    list.appendChild(li);
  });

  function seekFilm(t) {
    window.scrollTo(0, 0);
    armFilm();
    function jump() { try { video.currentTime = t; } catch (e) {} playFilm(); }
    if (video.readyState >= 1) jump();
    else video.addEventListener('loadedmetadata', jump, { once: true });
  }

  var INERT_TARGETS = ['#case-body', '#site-head', '#reel'].map(function (s) { return document.querySelector(s); });
  function setBackgroundInert(on) {
    INERT_TARGETS.forEach(function (el) {
      if (!el) return;
      try { el.inert = on; } catch (err) { /* pre-inert browsers */ }
      if (on) { el.setAttribute('aria-hidden', 'true'); } else { el.removeAttribute('aria-hidden'); }
    });
  }
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    var focusables = overlay.querySelectorAll('button:not([disabled]), a[href]');
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

  /* ------------------------------------------------------------
     8 · the workshop keeps its own time
     ------------------------------------------------------------ */
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

  /* debug hook — the preview browser never composites, so the opening has to be
     verifiable by scrubbing rather than by watching it: GAV_CASE.doors.time(1.2) */
  window.GAV_CASE = {
    open: openCase, seek: seekFilm, video: video, fit: fitCase,
    get doors() { return doorsTl; }, get push() { return pushTl; },
    pushThrough: pushThrough
  };
})();
