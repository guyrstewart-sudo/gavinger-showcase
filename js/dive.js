/* ============================================================
   GAVINGER — Fractal Dive engine · "Gallery Nocturne" · auto-play
   The dive is a self-playing film: each chapter dwells on an
   artwork (placard clickable, hover pauses the film), then the
   camera dives into a per-piece focus detail and the next piece
   blooms from beneath. Chapter 10 resolves into chapter 1 and the
   loop wraps seamlessly. The seam windows are exactly where the
   Higgsfield morph clips will slot in later.
     DWELL 0.0–5.5s · DIVE 5.5–9.0s · full loop ≈ 90s
   Reduced motion: a static gallery, never an autoplaying film.
   ============================================================ */
(function () {
  'use strict';

  var CHAIN = window.GAV_CHAIN || [];
  var N = CHAIN.length;
  if (!N) return;

  var SEG = 9;               // seconds per chapter
  var DWELL = 5.5;           // seconds of placard time
  var stage = document.getElementById('dive');
  var layersHost = document.getElementById('dive-layers');
  var cardsHost = document.getElementById('dive-cards');
  var wordmark = document.getElementById('dive-wordmark');
  var railFill = document.getElementById('rail-fill');
  var railGlow = document.getElementById('rail-glow');
  var railCounter = document.getElementById('rail-counter');

  window.__GAV_DEBUG__ = {
    ready: false, mode: 'pending', chainIndex: 0, zoomT: 0,
    scrollY: 0, sectionId: 'dive', pieces: N, diveProgress: 0, paused: false
  };

  /* ---------- DOM build ---------- */
  function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
  function pad(n) { return String(n).padStart(2, '0'); }

  function buildLayer(piece, idx, isClone) {
    var layer = document.createElement('div');
    layer.className = 'dive-layer' + (isClone ? ' is-clone' : '');
    layer.setAttribute('data-i', String(idx));
    var zoom = document.createElement('div');
    zoom.className = 'dive-zoom';
    var img = document.createElement('img');
    img.className = 'dive-art';
    img.alt = piece.t + ' — hand-painted work by Gavin Gerundo';
    img.decoding = 'async';
    if (idx <= 1) { img.src = piece.img; } else { img.setAttribute('data-src', piece.img); }
    zoom.appendChild(img);
    layer.appendChild(zoom);
    layersHost.appendChild(layer);
    return layer;
  }

  function buildCard(piece, idx) {
    var card = document.createElement('article');
    card.className = 'dive-card';
    card.setAttribute('data-i', String(idx));
    card.innerHTML =
      '<p class="eyebrow"><span class="eyebrow-num">' + pad(idx + 1) + ' / ' + pad(N) +
      '</span><span class="eyebrow-dot">&middot;</span><span class="eyebrow-kind">' + piece.kind + '</span></p>' +
      '<h2 class="dive-title">' + piece.title_html + '</h2>' +
      '<p class="dive-line">' + piece.line + '</p>' +
      '<p class="colophon">' + piece.colophon + '</p>' +
      '<div class="dive-meta">' +
      '<a class="pill" href="' + piece.url + '" target="_blank" rel="noopener">View piece <span aria-hidden="true">&rarr;</span></a>' +
      '<span class="dive-price">' + money(piece.price) + (piece.available ? '' : '&ensp;<em>collected</em>') + '</span>' +
      '</div>';
    cardsHost.appendChild(card);
    return card;
  }

  var layers = CHAIN.map(function (p, i) { return buildLayer(p, i, false); });
  layers.push(buildLayer(CHAIN[0], N, true)); // loop clone of chapter 1
  var cards = CHAIN.map(buildCard);

  /* ---------- geometry ---------- */
  function coverMetrics(piece) {
    var vw = window.innerWidth, vh = stage.clientHeight || window.innerHeight;
    var s = Math.max(vw / piece.w, vh / piece.hpx);
    var dw = piece.w * s, dh = piece.hpx * s;
    return { vw: vw, vh: vh, dw: dw, dh: dh, ox: (vw - dw) / 2, oy: (vh - dh) / 2 };
  }
  function targetPoint(piece) {
    var m = coverMetrics(piece);
    return { x: m.ox + piece.cx * m.dw, y: m.oy + piece.cy * m.dh, m: m };
  }
  function zoomScale(piece) {
    var m = coverMetrics(piece);
    return Math.max(2.6, Math.min(9, m.vw / (piece.size * m.dw)));
  }
  function setOrigins() {
    layers.forEach(function (layer, i) {
      var tp = targetPoint(CHAIN[i % N]);
      layer.querySelector('.dive-zoom').style.transformOrigin = tp.x + 'px ' + tp.y + 'px';
    });
  }

  /* ---------- progressive art loading ---------- */
  function hydrate(img) {
    if (img && img.getAttribute('data-src')) {
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    }
  }
  function hydrateAllSoon() {
    var queue = Array.prototype.slice.call(layersHost.querySelectorAll('img[data-src]'));
    (function next() {
      if (!queue.length) return;
      var img = queue.shift();
      hydrate(img);
      if (img.complete) { next(); } else { img.onload = img.onerror = next; }
    })();
  }
  if (document.readyState === 'complete') { setTimeout(hydrateAllSoon, 300); }
  else { window.addEventListener('load', function () { setTimeout(hydrateAllSoon, 300); }); }

  /* ---------- settle-tick counter + card/mask bookkeeping ---------- */
  var lastCounter = -1;
  function tickCounter(idx) {
    if (idx === lastCounter) return;
    lastCounter = idx;
    if (!railCounter) return;
    railCounter.textContent = pad(idx + 1) + ' / ' + pad(N);
    if (!document.body.classList.contains('reduced-motion')) {
      gsap.fromTo(railCounter, { y: 7 }, { y: 0, duration: 0.5, ease: 'back.out(1.2)', overwrite: 'auto' });
    }
  }
  var activeCard = -1;
  function setActiveCard(i) {
    if (i === activeCard) return;
    if (activeCard >= 0 && cards[activeCard]) cards[activeCard].classList.remove('is-active');
    if (i >= 0 && cards[i]) cards[i].classList.add('is-active');
    activeCard = i;
  }
  var maskedLayer = -1;
  function setMaskedLayer(i) {
    if (i === maskedLayer) return;
    if (maskedLayer >= 0 && layers[maskedLayer]) layers[maskedLayer].classList.remove('is-diving');
    if (i >= 0 && layers[i]) layers[i].classList.add('is-diving');
    maskedLayer = i;
  }

  /* ---------- the film ---------- */
  var mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', function () {
    setOrigins();
    window.addEventListener('resize', setOrigins);

    layers.forEach(function (layer, i) {
      gsap.set(layer, { autoAlpha: i === 0 ? 1 : 0, zIndex: layers.length - i });
    });
    gsap.set(wordmark, { autoAlpha: 0 });
    gsap.set(stage, { backgroundColor: CHAIN[0].bg });
    document.documentElement.style.setProperty('--accent', CHAIN[0].accent);

    var tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: 'none' } });

    // wrap reset: every loop iteration starts from a known state.
    // Visually seamless — the clone (piece 1, scale 1) swaps for layer 0
    // showing the identical pixels.
    layers.forEach(function (layer, i) {
      tl.set(layer, { autoAlpha: i === 0 ? 1 : 0 }, 0);
      tl.set(layer.querySelector('.dive-zoom'), { scale: 1, x: 0, y: 0 }, 0);
      tl.set(layer, { '--mr': '150%' }, 0);
    });

    CHAIN.forEach(function (piece, i) {
      var out = layers[i], inc = layers[i + 1];
      var outZoom = out.querySelector('.dive-zoom');
      var incPiece = CHAIN[(i + 1) % N];
      var t0 = i * SEG;

      // DWELL — placard rises, the camera leans in
      tl.fromTo(cards[i], { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out' }, t0 + 0.35);
      tl.to(cards[i], { autoAlpha: 0, y: -24, filter: 'blur(6px)', duration: 0.7, ease: 'power1.in' }, t0 + DWELL - 0.8);
      tl.set(cards[i], { filter: 'blur(0px)' }, t0 + DWELL);
      tl.fromTo(outZoom, { scale: 1, x: 0, y: 0 },
        { scale: 1.04, duration: DWELL, ease: 'sine.inOut' }, t0);

      // DIVE — one continuous camera push into the focus detail
      tl.to(outZoom, {
        scale: function () { return zoomScale(piece); },
        x: function () { var tp = targetPoint(piece); return tp.m.vw / 2 - tp.x; },
        y: function () { var tp = targetPoint(piece); return tp.m.vh / 2 - tp.y; },
        duration: SEG - DWELL,
        ease: 'power2.in'
      }, t0 + DWELL);

      // the room goes dark around the beam
      tl.fromTo(out, {
        '--mr': '150%',
        '--mx': function () { var tp = targetPoint(piece); return (tp.x / tp.m.vw * 100) + '%'; },
        '--my': function () { var tp = targetPoint(piece); return (tp.y / tp.m.vh * 100) + '%'; }
      }, {
        '--mr': '46%', '--mx': '50%', '--my': '50%',
        duration: 2.7, ease: 'power1.in'
      }, t0 + DWELL + 0.4);

      // RESOLVE — the next piece blooms up from beneath
      // (this 1.6s window is where a Higgsfield morph clip will play)
      tl.fromTo(inc, { autoAlpha: 0, scale: 0.92, filter: 'blur(8px)' },
        { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 1.6, ease: 'power1.inOut' }, t0 + SEG - 1.6);
      tl.to(out, { autoAlpha: 0, duration: 0.7, ease: 'power1.in' }, t0 + SEG - 0.7);
      tl.set(out, { '--mr': '150%' }, t0 + SEG);

      // the room re-lights in the incoming piece's color
      tl.to('html', { '--accent': incPiece.accent, duration: 1.1, ease: 'sine.inOut' }, t0 + SEG - 1.4);
      tl.to(stage, { backgroundColor: incPiece.bg, duration: 1.1, ease: 'sine.inOut' }, t0 + SEG - 1.4);

      // etched-glass wordmark pass between rooms
      tl.fromTo(wordmark, { autoAlpha: 0, scale: 0.94, yPercent: 2 },
        { autoAlpha: 0.07, scale: 1.03, yPercent: 0, duration: 1.4, ease: 'sine.out' }, t0 + DWELL + 0.9);
      tl.to(wordmark, { autoAlpha: 0, scale: 1.12, yPercent: -2, duration: 1.6, ease: 'sine.in' }, t0 + DWELL + 2.4);
    });

    /* ---------- playback state + public API ---------- */
    var holdCard = false, holdTab = false;
    function syncPlayState() {
      var shouldPause = holdCard || holdTab;
      if (shouldPause && !tl.paused()) tl.pause();
      if (!shouldPause && tl.paused()) tl.play();
      window.__GAV_DEBUG__.paused = tl.paused();
    }
    // hovering (or keyboard-focusing) a placard holds the film for the click
    cardsHost.addEventListener('pointerenter', function (e) {
      if (e.target.closest && e.target.closest('.dive-card')) { holdCard = true; syncPlayState(); }
    }, true);
    cardsHost.addEventListener('pointerleave', function (e) {
      if (e.target.closest && e.target.closest('.dive-card')) { holdCard = false; syncPlayState(); }
    }, true);
    cardsHost.addEventListener('focusin', function () { holdCard = true; syncPlayState(); });
    cardsHost.addEventListener('focusout', function () { holdCard = false; syncPlayState(); });
    document.addEventListener('visibilitychange', function () {
      holdTab = document.hidden; syncPlayState();
    });

    function seek(i) {
      tl.seek(((i % N) + N) % N * SEG + 0.4);
      holdCard = false; syncPlayState();
    }
    window.GAV_DIVE = {
      timeline: tl,
      seek: seek,
      next: function () { seek(Math.floor(tl.time() / SEG) + 1); },
      prev: function () {
        var t = tl.time(), idx = Math.floor(t / SEG);
        // early in a chapter, "prev" means the previous chapter
        seek(t - idx * SEG < 1.6 ? idx - 1 : idx);
      }
    };
    var prevBtn = document.getElementById('dive-prev');
    var nextBtn = document.getElementById('dive-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { window.GAV_DIVE.prev(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { window.GAV_DIVE.next(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var overlay = document.getElementById('index-overlay');
      if (overlay && !overlay.hidden) return;
      if (e.key === 'ArrowRight') window.GAV_DIVE.next(); else window.GAV_DIVE.prev();
    });

    /* ---------- per-tick bookkeeping ---------- */
    tl.eventCallback('onUpdate', function () {
      var t = tl.time();
      var idx = Math.min(N - 1, Math.floor(t / SEG));
      var zoomT = (t - idx * SEG) / SEG;
      var d = window.__GAV_DEBUG__;
      d.chainIndex = idx;
      d.zoomT = Math.round(zoomT * 1000) / 1000;
      d.diveProgress = Math.round(tl.progress() * 1000) / 1000;
      d.scrollY = window.scrollY;
      if (railFill) railFill.style.transform = 'scaleY(' + (idx + 1) / N + ')';
      if (railGlow) railGlow.style.transform = 'scaleY(' + tl.progress() + ')';
      tickCounter(idx);
      var dwellT = DWELL / SEG;
      setActiveCard(zoomT < dwellT ? idx : -1);
      setMaskedLayer(zoomT >= dwellT ? idx : -1);
      document.dispatchEvent(new CustomEvent('gav:dive', { detail: { index: idx, zoomT: zoomT, progress: tl.progress() } }));
    });

    // the film starts when the entry sequence finishes (failsafe below)
    var started = false;
    function startFilm() { if (!started) { started = true; syncPlayState(); tl.play(0); } }
    document.addEventListener('gav:entry-done', startFilm);
    setTimeout(startFilm, 5000);

    window.__GAV_DEBUG__.mode = 'autoplay';
    window.__GAV_DEBUG__.ready = true;

    return function () {
      window.removeEventListener('resize', setOrigins);
      tl.kill();
      delete window.GAV_DIVE;
    };
  });

  /* ---------- reduced motion: the collection, never the film ---------- */
  mm.add('(prefers-reduced-motion: reduce)', function () {
    document.body.classList.add('reduced-motion');
    document.documentElement.style.setProperty('--accent', CHAIN[0].accent);
    layers.forEach(function (layer, i) {
      hydrate(layer.querySelector('img'));
      gsap.set(layer, { clearProps: 'all' });
      layer.querySelector('.dive-zoom').style.transformOrigin = '';
      layer.classList.remove('is-diving');
      if (i < N) layer.appendChild(cards[i]);
    });
    layers[N].style.display = 'none';
    cards.forEach(function (card) { card.classList.add('is-active'); });
    if (railCounter) railCounter.textContent = '01 / ' + pad(N);
    window.__GAV_DEBUG__.mode = 'static';
    window.__GAV_DEBUG__.ready = true;
    return function () {
      document.body.classList.remove('reduced-motion');
      layers[N].style.display = '';
      cards.forEach(function (card) {
        card.classList.remove('is-active');
        cardsHost.appendChild(card);
      });
      activeCard = -1;
      lastCounter = -1;
      maskedLayer = -1;
    };
  });
})();
