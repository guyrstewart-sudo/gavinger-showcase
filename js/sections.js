/* ============================================================
   GAVINGER — chapters 02–07, built from the harvested catalog.
   Created in page order after the dive so ScrollTrigger refresh
   order matches document order.
   ============================================================ */
(function () {
  'use strict';

  var DATA = (window.GAV_DATA && window.GAV_DATA.products) || [];
  if (!DATA.length) return;
  var mm = gsap.matchMedia(); // live contexts — mirrors dive.js so a runtime
                              // preference flip rebuilds instead of stranding state

  function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function hasTag(p, t) { return (p.tags || []).indexOf(t) !== -1; }

  /* ---------- 02 · THE TIMELESS COLLECTION ---------- */
  // Hand-curated hang from the VIDEO frames (what the rail actually shows).
  // Three dials are rainbow-dichroic mirrors in motion — Convergence II,
  // Asanoah II, Windows III — pinned to positions 1 / 7 / 12; all other
  // sibling looks (sunbursts, aliens, warm gothics) separated too:
  // rainbow > gold gothic > ice-blue spike > green lattice > orange rose >
  // silver circuit > rainbow > purple gothic > yellow spike > green circuit >
  // purple web > rainbow
  var RAIL_ORDER = [
    'convergence-ii', 'windows-iv', 'asanoah-ii', 'asanoah-i-1',
    'windows-ii', 'alien-ii', 'asanoah-ii-1', 'windows-1',
    'asanoah-i', 'alien-i', 'convergence-i', 'windows-iii'
  ];
  var clocks = RAIL_ORDER.map(function (h) {
    return DATA.find(function (p) { return p.h === h; });
  }).filter(function (p) { return p && p.im.length; });

  var track = document.getElementById('timeless-track');
  clocks.forEach(function (p, idx) {
    var card = document.createElement('figure');
    card.className = 'clock-card';
    // an image is ALWAYS the visible base — the kinetic video fades in
    // over it once it actually plays (preload=none videos render nothing)
    var media = '<img loading="' + (idx < 4 ? 'eager' : 'lazy') + '" decoding="async" src="' +
      p.im[0].s + '" alt="' + esc(p.t) + ' — hand-painted wall clock">';
    if (p.vi.length) {
      media += '<video class="kinetic" muted loop playsinline preload="metadata" src="' + p.vi[0].v +
        '" aria-hidden="true" tabindex="-1"></video>';
    }
    card.innerHTML =
      '<a class="frame" href="' + p.url + '" target="_blank" rel="noopener" aria-label="View ' + esc(p.t) + ' on gavinger.com">' + media + '</a>' +
      '<figcaption><span class="c-title">' + esc(p.t) + '</span>' +
      '<span class="c-price">' + money(p.p) + '</span></figcaption>';
    track.appendChild(card);
  });

  // start a muted loop and keep trying until the buffer allows it — the
  // clocks must ALREADY be ticking when they scroll into the frame
  function playVid(v) {
    v.dataset.wantPlay = '1';
    v.play().then(function () { v.classList.add('is-playing'); }).catch(function () {});
    if (!v.dataset.retryBound) {
      v.dataset.retryBound = '1';
      v.addEventListener('canplay', function () {
        if (v.dataset.wantPlay === '1' && v.paused) {
          v.play().then(function () { v.classList.add('is-playing'); }).catch(function () {});
        }
      });
    }
  }
  function stopVid(v) {
    v.dataset.wantPlay = '0';
    v.pause(); v.classList.remove('is-playing');
  }

  var pinWrap = document.getElementById('timeless-pin');
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    if (!track.children.length) return;
    gsap.to(track, {
      x: function () { return Math.min(0, pinWrap.clientWidth - track.scrollWidth - 48); },
      ease: 'none',
      scrollTrigger: {
        id: 'timeless',
        trigger: pinWrap,
        pin: true,
        scrub: true,
        start: 'top top',
        // the rail pans FASTER than the page scrolls (0.6:1) — at 1:1 the
        // section held the screen for ~4500px, which is what read as too much
        // dead space. The old +400 tail also kept it pinned after the rail had
        // already stopped moving.
        end: function () {
          return '+=' + Math.max(700, (track.scrollWidth - pinWrap.clientWidth) * 0.6 + 120);
        },
        invalidateOnRefresh: true
      }
    });
    var railVids = Array.prototype.slice.call(track.querySelectorAll('video'));
    // the first cards of the rail start ticking the moment the page settles…
    var warmTimer = setTimeout(function () { railVids.slice(0, 4).forEach(playVid); }, 1200);
    // …the rest wind up while the visitor is still up in the dive
    ScrollTrigger.create({
      trigger: '#timeless',
      start: 'top 600%',
      once: true,
      onEnter: function () { railVids.forEach(playVid); }
    });
    // and everything rests once the section is far behind
    ScrollTrigger.create({
      trigger: '#timeless',
      start: 'top 250%',
      end: 'bottom -150%',
      onLeave: function () { railVids.forEach(stopVid); },
      onEnterBack: function () { railVids.forEach(playVid); }
    });
    return function () {
      clearTimeout(warmTimer);
      railVids.forEach(stopVid);
    };
  });
  mm.add('(prefers-reduced-motion: reduce)', function () {
    // the rail becomes a plain horizontal scroller of stills — no autoplay
    pinWrap.style.height = 'auto';
    pinWrap.style.overflowX = 'auto';
    var vids = track.querySelectorAll('video');
    Array.prototype.forEach.call(vids, function (v) { v.pause(); v.style.display = 'none'; });
    return function () {
      pinWrap.style.height = '';
      pinWrap.style.overflowX = '';
      Array.prototype.forEach.call(vids, function (v) { v.style.display = ''; });
    };
  });

  /* ---------- 03 · FUNKTIONAL FURNITURE ---------- */
  var funk = DATA.filter(function (p) {
    return (hasTag(p, 'Funktional Furniture') || p.ty === 'Furniture') &&
      !hasTag(p, 'wall clock') && p.im.length && p.p >= 600;
  });
  funk.sort(function (a, b) { return b.p - a.p; });
  funk = funk.slice(0, 12);

  var grid = document.getElementById('funk-grid');
  funk.forEach(function (p) {
    var item = document.createElement('figure');
    item.className = 'grid-item';
    var media = '<img loading="lazy" decoding="async" src="' + p.im[0].l + '" alt="' + esc(p.t) + ' — hand-painted funktional furniture">';
    if (p.vi.length) {
      media += '<video class="kinetic" muted loop playsinline preload="metadata" src="' + p.vi[0].v +
        '" aria-hidden="true" tabindex="-1"></video>';
    }
    item.innerHTML =
      '<a class="frame" href="' + p.url + '" target="_blank" rel="noopener" aria-label="View ' + esc(p.t) + ' on gavinger.com">' + media + '</a>' +
      '<figcaption><span class="g-title">' + esc(p.t) + '</span>' +
      '<span class="g-price">' + money(p.p) + '</span></figcaption>';
    grid.appendChild(item);
  });

  mm.add('(prefers-reduced-motion: no-preference)', function () {
    ScrollTrigger.batch('.grid-item', {
      start: 'top 88%',
      once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power2.out', overwrite: true });
      }
    });
    Array.prototype.forEach.call(grid.querySelectorAll('video'), function (v) {
      ScrollTrigger.create({
        trigger: v.closest('.grid-item'),
        start: 'top 180%',       // wind up well before entering the frame
        end: 'bottom -80%',
        onToggle: function (self) {
          if (self.isActive) { playVid(v); } else { stopVid(v); }
        }
      });
    });
    return function () {
      Array.prototype.forEach.call(grid.querySelectorAll('video'), stopVid);
    };
  });
  mm.add('(prefers-reduced-motion: reduce)', function () {
    gsap.set('.grid-item', { opacity: 1, y: 0 }); // no reveal choreography, no autoplay
    var vids = grid.querySelectorAll('video');
    Array.prototype.forEach.call(vids, function (v) { v.pause(); v.style.display = 'none'; });
    return function () {
      Array.prototype.forEach.call(vids, function (v) { v.style.display = ''; });
    };
  });

  /* ---------- 04 · ORIGINALS & PRINTS mosaic ---------- */
  var FLAT_TYPES = ['Original Art', 'Posters, Prints, & Visual Artwork', 'Gonzodiac Prints', 'Deeper Depths', 'Tapestry', 'Sticker'];
  // one tile per artwork (visually-verified duplicates): where the original
  // already stars in the dive, the wall keeps its print; otherwise the wall
  // keeps the original and drops the print
  var MOSAIC_EXCLUDE = [
    'in-our-midst-original-art-on-canvas',            // dive chapter 01 — print stays
    'labyrinth-original-art-on-canvas',               // dive chapter 05 — print stays
    'a-moment-of-transparency-original-art-on-canvas',// dive chapter 06 — print stays
    'primordial-reverie-framed-original-art-on-canvas',// dive chapter 07 — print stays
    'ex-uno-plures',                                  // print — original stays
    'kinetic'                                         // print — original stays
  ];
  var flat = DATA.filter(function (p) {
    return FLAT_TYPES.indexOf(p.ty) !== -1 && p.im.length && MOSAIC_EXCLUDE.indexOf(p.h) === -1;
  });
  // originals first, then series order as harvested
  flat.sort(function (a, b) {
    return (FLAT_TYPES.indexOf(a.ty) - FLAT_TYPES.indexOf(b.ty)) || (b.p - a.p);
  });

  var KIND_LABEL = {
    'Original Art': 'Original',
    'Posters, Prints, & Visual Artwork': 'Print',
    'Gonzodiac Prints': 'Gonzodiac',
    'Deeper Depths': 'Deeper Depths',
    'Tapestry': 'Tapestry',
    'Sticker': 'Sticker'
  };
  var mosaic = document.getElementById('mosaic');
  var tiles = flat.map(function (p) {
    var a = document.createElement('a');
    a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', p.t + ' — view on gavinger.com');
    a.innerHTML =
      '<img loading="lazy" decoding="async" style="aspect-ratio:' + p.im[0].w + '/' + p.im[0].h + '" src="' + p.im[0].s + '" alt="' + esc(p.t) + ' — ' + KIND_LABEL[p.ty] + ' by Gavinger">' +
      '<span class="m-tip">' + esc(p.t) + ' · ' + KIND_LABEL[p.ty] + ' · ' + money(p.p) + '</span>';
    return { el: a, ratio: p.im[0].h / p.im[0].w };
  });

  // balanced masonry: each tile drops into the currently-shortest column,
  // so the wall's bottom edge stays level (CSS columns leave ragged tails)
  function mosaicColCount() {
    var w = window.innerWidth;
    return w > 1100 ? 5 : w > 860 ? 4 : w > 560 ? 3 : 2;
  }
  var lastCols = 0;
  function layoutMosaic() {
    var n = mosaicColCount();
    if (n === lastCols) return;
    lastCols = n;
    mosaic.innerHTML = '';
    var cols = [], heights = [];
    for (var i = 0; i < n; i++) {
      var c = document.createElement('div');
      c.className = 'm-col';
      mosaic.appendChild(c);
      cols.push(c); heights.push(0);
    }
    tiles.forEach(function (t) {
      var k = heights.indexOf(Math.min.apply(null, heights));
      cols[k].appendChild(t.el);
      heights[k] += t.ratio;
    });
  }
  layoutMosaic();
  var mosaicResizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(mosaicResizeTimer);
    mosaicResizeTimer = setTimeout(layoutMosaic, 180);
  });

  /* ---------- reserve heights for late-loading imagery ---------- */
  var extras = (window.GAV_DATA && window.GAV_DATA.extras) || {};
  var bio = document.querySelector('#about-portrait img');
  if (bio && extras.bio) bio.style.aspectRatio = extras.bio.w + '/' + extras.bio.h;
  // belt-and-braces: one refresh once the mosaic's lazy images start landing
  ScrollTrigger.create({
    trigger: '#originals',
    start: 'top 130%',
    once: true,
    onEnter: function () { setTimeout(function () { ScrollTrigger.refresh(); }, 1200); }
  });

  /* ---------- section tracking for __GAV_DEBUG__ ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-section]'), function (sec) {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: function (self) {
        if (self.isActive && window.__GAV_DEBUG__) {
          window.__GAV_DEBUG__.sectionId = sec.getAttribute('data-section');
        }
      }
    });
  });
})();
