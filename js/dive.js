/* ============================================================
   GAVINGER — Fractal Dive engine · "Gallery Nocturne"
   One pinned stage; scroll scrubs a master timeline through the
   10-piece chain. Per chapter (normalized 0–1):
     A  DWELL   0.00–0.40  art drifts 1→1.03, wall placard rises
     B  DIVE    0.40–0.85  camera pushes into the focus detail;
                           a radial mask swallows the periphery
     C  RESOLVE 0.85–1.00  the next piece blooms up from beneath,
                           accent re-lights the room, wordmark pass
   Chapter 10 resolves back into chapter 1 — the loop.
   All geometry is function-based + invalidateOnRefresh.
   ============================================================ */
(function () {
  'use strict';

  var CHAIN = window.GAV_CHAIN || [];
  var N = CHAIN.length;
  if (!N) return;

  var SEG_VH = 2.5;        // scroll-viewports of travel per chapter
  var stage = document.getElementById('dive');
  var layersHost = document.getElementById('dive-layers');
  var cardsHost = document.getElementById('dive-cards');
  var wordmark = document.getElementById('dive-wordmark');
  var railFill = document.getElementById('rail-fill');
  var railGlow = document.getElementById('rail-glow');
  var railCounter = document.getElementById('rail-counter');

  window.__GAV_DEBUG__ = {
    ready: false, mode: 'pending', chainIndex: 0, zoomT: 0,
    scrollY: 0, sectionId: 'dive', pieces: N, diveProgress: 0
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

  // iOS URL-bar collapse fires innerHeight resizes mid-pin; the stage is
  // sized in svh, so ignore those and measure the stage itself.
  ScrollTrigger.config({ ignoreMobileResize: true });

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

  /* ---------- settle-tick counter ---------- */
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

  /* ---------- card + debug bookkeeping ---------- */
  var activeCard = -1;
  function setActiveCard(i) {
    if (i === activeCard) return;
    if (activeCard >= 0 && cards[activeCard]) cards[activeCard].classList.remove('is-active');
    if (i >= 0 && cards[i]) cards[i].classList.add('is-active');
    activeCard = i;
  }
  // the mask only exists while a layer is actually diving — an idle
  // full-viewport mask surface is pure compositor waste
  var maskedLayer = -1;
  function setMaskedLayer(i) {
    if (i === maskedLayer) return;
    if (maskedLayer >= 0 && layers[maskedLayer]) layers[maskedLayer].classList.remove('is-diving');
    if (i >= 0 && layers[i]) layers[i].classList.add('is-diving');
    maskedLayer = i;
  }
  function onDiveUpdate(self) {
    var p = self.progress;
    var idx = Math.min(N - 1, Math.floor(p * N));
    var zoomT = p * N - idx;
    var d = window.__GAV_DEBUG__;
    if (self.isActive) d.sectionId = 'dive';
    d.chainIndex = idx;
    d.zoomT = Math.round(zoomT * 1000) / 1000;
    d.diveProgress = Math.round(p * 1000) / 1000;
    d.scrollY = window.scrollY;
    if (railFill) railFill.style.transform = 'scaleY(' + (idx + 1) / N + ')';   // snapped per chapter
    if (railGlow) railGlow.style.transform = 'scaleY(' + p + ')';               // continuous scrub glow
    tickCounter(idx);
    setActiveCard(zoomT < 0.42 ? idx : -1);
    setMaskedLayer(zoomT >= 0.42 ? idx : -1);
    document.dispatchEvent(new CustomEvent('gav:dive', { detail: { index: idx, zoomT: zoomT, progress: p } }));
  }

  /* ---------- master timeline ---------- */
  var mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', function () {
    setOrigins();
    ScrollTrigger.addEventListener('refreshInit', setOrigins);

    // stacking: earlier chapters sit ABOVE later ones — the incoming
    // piece blooms up from beneath the outgoing detail.
    layers.forEach(function (layer, i) {
      gsap.set(layer, { autoAlpha: i === 0 ? 1 : 0, zIndex: layers.length - i });
    });
    gsap.set(wordmark, { autoAlpha: 0 });
    gsap.set(stage, { backgroundColor: CHAIN[0].bg });
    document.documentElement.style.setProperty('--accent', CHAIN[0].accent);

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        id: 'dive',
        trigger: stage,
        start: 'top top',
        end: function () { return '+=' + Math.round(N * (stage.clientHeight || window.innerHeight) * SEG_VH); },
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: onDiveUpdate
      }
    });

    CHAIN.forEach(function (piece, i) {
      var out = layers[i], inc = layers[i + 1];
      var outZoom = out.querySelector('.dive-zoom');
      var incPiece = CHAIN[(i + 1) % N];
      var t0 = i;

      // A · DWELL — placard rises, art leans in
      tl.fromTo(cards[i], { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.07, ease: 'power1.out' }, t0 + 0.03);
      tl.to(cards[i], { autoAlpha: 0, y: -24, filter: 'blur(6px)', duration: 0.07, ease: 'power1.in' }, t0 + 0.35);
      tl.set(cards[i], { filter: 'blur(0px)' }, t0 + 0.43);
      tl.fromTo(outZoom, { scale: 1, x: 0, y: 0 }, { scale: 1.03, duration: 0.4 }, t0);

      // B · DIVE — one continuous camera push into the focus detail
      tl.to(outZoom, {
        scale: function () { return zoomScale(piece); },
        x: function () { var tp = targetPoint(piece); return tp.m.vw / 2 - tp.x; },
        y: function () { var tp = targetPoint(piece); return tp.m.vh / 2 - tp.y; },
        duration: 0.6
      }, t0 + 0.4);

      // the room goes dark around the beam
      tl.fromTo(out, {
        '--mr': '150%',
        '--mx': function () { var tp = targetPoint(piece); return (tp.x / tp.m.vw * 100) + '%'; },
        '--my': function () { var tp = targetPoint(piece); return (tp.y / tp.m.vh * 100) + '%'; }
      }, {
        '--mr': '46%', '--mx': '50%', '--my': '50%',
        duration: 0.43, ease: 'power1.in'
      }, t0 + 0.45);

      // C · RESOLVE — next piece blooms up from beneath
      tl.fromTo(inc, { autoAlpha: 0, scale: 0.92, filter: 'blur(8px)' },
        { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.18, ease: 'power1.inOut' }, t0 + 0.82);
      tl.to(out, { autoAlpha: 0, duration: 0.08, ease: 'power1.in' }, t0 + 0.92);
      tl.set(out, { '--mr': '150%' }, t0 + 1);

      // the room re-lights in the incoming piece's color
      tl.to('html', { '--accent': incPiece.accent, duration: 0.12 }, t0 + 0.85);
      tl.to(stage, { backgroundColor: incPiece.bg, duration: 0.12 }, t0 + 0.85);

      // etched-glass wordmark pass between rooms
      tl.fromTo(wordmark, { autoAlpha: 0, scale: 0.94, yPercent: 2 },
        { autoAlpha: 0.07, scale: 1.03, yPercent: 0, duration: 0.17, ease: 'sine.out' }, t0 + 0.55);
      tl.to(wordmark, { autoAlpha: 0, scale: 1.12, yPercent: -2, duration: 0.23, ease: 'sine.in' }, t0 + 0.72);
    });

    window.__GAV_DEBUG__.mode = 'dive';
    window.__GAV_DEBUG__.ready = true;

    return function () { ScrollTrigger.removeEventListener('refreshInit', setOrigins); };
  });

  /* ---------- reduced motion: the collection, never the dive ---------- */
  mm.add('(prefers-reduced-motion: reduce)', function () {
    document.body.classList.add('reduced-motion');
    document.documentElement.style.setProperty('--accent', CHAIN[0].accent);
    layers.forEach(function (layer, i) {
      hydrate(layer.querySelector('img'));
      gsap.set(layer, { clearProps: 'all' });
      layer.querySelector('.dive-zoom').style.transformOrigin = '';
      layer.classList.remove('is-diving');
      // each placard sits with its artwork, not in a separate stack below
      if (i < N) layer.appendChild(cards[i]);
    });
    layers[N].style.display = 'none'; // the loop clone would read as a duplicate
    cards.forEach(function (card) { card.classList.add('is-active'); });
    if (railCounter) railCounter.textContent = '01 / ' + pad(N);
    window.__GAV_DEBUG__.mode = 'static';
    window.__GAV_DEBUG__.ready = true;
    return function () {
      document.body.classList.remove('reduced-motion');
      layers[N].style.display = '';
      cards.forEach(function (card) {
        card.classList.remove('is-active');
        cardsHost.appendChild(card); // restore original card stack + order
      });
      activeCard = -1;
      lastCounter = -1;
      maskedLayer = -1;
    };
  });
})();
