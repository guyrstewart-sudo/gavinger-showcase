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
  // Hand-curated hang: no two same-series or similar-palette dials adjacent
  // (rainbow > red star > gold gothic > blue spike > orange rose > silver
  //  circuit > green star > purple rose > yellow spike > purple web >
  //  rainbow rose > green circuit)
  var RAIL_ORDER = [
    'convergence-ii', 'asanoah-ii-1', 'windows-iv', 'asanoah-ii',
    'windows-ii', 'alien-ii', 'asanoah-i-1', 'windows-1',
    'asanoah-i', 'convergence-i', 'windows-iii', 'alien-i'
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
      media += '<video class="kinetic" muted loop playsinline preload="none" src="' + p.vi[0].v +
        '" aria-hidden="true" tabindex="-1"></video>';
    }
    card.innerHTML =
      '<a class="frame" href="' + p.url + '" target="_blank" rel="noopener" aria-label="View ' + esc(p.t) + ' on gavinger.com">' + media + '</a>' +
      '<figcaption><span class="c-title">' + esc(p.t) + '</span>' +
      '<span class="c-price">' + money(p.p) + '</span></figcaption>';
    track.appendChild(card);
  });

  var pinWrap = document.getElementById('timeless-pin');
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    if (!track.children.length) return;
    var scrollTween = gsap.to(track, {
      x: function () { return Math.min(0, pinWrap.clientWidth - track.scrollWidth - 48); },
      ease: 'none',
      scrollTrigger: {
        id: 'timeless',
        trigger: pinWrap,
        pin: true,
        scrub: true,
        start: 'top top',
        end: function () { return '+=' + Math.max(1200, track.scrollWidth - pinWrap.clientWidth + 400); },
        invalidateOnRefresh: true
      }
    });
    // play only the clocks that are actually passing through the frame
    Array.prototype.forEach.call(track.querySelectorAll('video'), function (v) {
      ScrollTrigger.create({
        trigger: v.closest('.clock-card'),
        containerAnimation: scrollTween,
        start: 'left 110%',
        end: 'right -10%',
        onToggle: function (self) {
          if (self.isActive) { v.classList.add('is-playing'); v.play().catch(function () {}); }
          else { v.pause(); v.classList.remove('is-playing'); }
        }
      });
    });
    return function () {
      Array.prototype.forEach.call(track.querySelectorAll('video'), function (v) {
        v.pause(); v.classList.remove('is-playing');
      });
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
      media += '<video class="kinetic" muted loop playsinline preload="none" src="' + p.vi[0].v +
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
        start: 'top 95%',
        end: 'bottom 5%',
        onToggle: function (self) {
          if (self.isActive) { v.classList.add('is-playing'); v.play().catch(function () {}); }
          else { v.pause(); v.classList.remove('is-playing'); }
        }
      });
    });
    return function () {
      Array.prototype.forEach.call(grid.querySelectorAll('video'), function (v) {
        v.pause(); v.classList.remove('is-playing');
      });
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
  var flat = DATA.filter(function (p) { return FLAT_TYPES.indexOf(p.ty) !== -1 && p.im.length; });
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
