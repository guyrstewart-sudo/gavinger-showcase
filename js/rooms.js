/* ============================================================
   GAVINGER — THE ROOMS
   Gavin's six tabs. The film stays pinned overhead; the tabs swap
   the room underneath it, so the reel never stops and never reloads.

   Rooms are built from the harvested catalog (data.js) using the
   same card classes as the scrolling site, so style.css already
   dresses them. Two rooms — Scenic Design and Graphic Design —
   have no catalogued work yet and carry an honest empty state
   rather than invented content.
   ============================================================ */
(function () {
  'use strict';

  var DATA = (window.GAV_DATA && window.GAV_DATA.products) || [];
  function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function hasTag(p, t) { return (p.tags || []).indexOf(t) !== -1; }

  /* ---------- Furniture — everything Gavin builds and paints ---------- */
  var furniture = DATA.filter(function (p) {
    return (p.ty === 'Furniture' || hasTag(p, 'Funktional Furniture')) && p.im.length;
  }).sort(function (a, b) { return b.p - a.p; });

  /* ---------- Paintings — the flat work, originals first ---------- */
  var FLAT = ['Original Art', 'Deeper Depths', 'Posters, Prints, & Visual Artwork',
              'Gonzodiac Prints', 'Tapestry'];
  var KIND = {
    'Original Art': 'Original',
    'Deeper Depths': 'Deeper Depths',
    'Posters, Prints, & Visual Artwork': 'Print',
    'Gonzodiac Prints': 'Gonzodiac',
    'Tapestry': 'Tapestry'
  };
  var paintings = DATA.filter(function (p) {
    return FLAT.indexOf(p.ty) !== -1 && p.im.length;
  }).sort(function (a, b) {
    return (FLAT.indexOf(a.ty) - FLAT.indexOf(b.ty)) || (b.p - a.p);
  });

  /* ---------- builders ---------- */
  function card(p, alt) {
    var item = document.createElement('figure');
    item.className = 'grid-item';
    var media = '<img loading="lazy" decoding="async" src="' + p.im[0].l +
      '" alt="' + esc(p.t) + ' — ' + alt + '">';
    if (p.vi.length) {
      media += '<video class="kinetic" muted loop playsinline preload="none" src="' +
        p.vi[0].v + '" aria-hidden="true" tabindex="-1"></video>';
    }
    item.innerHTML =
      '<a class="frame" href="' + p.url + '" target="_blank" rel="noopener" aria-label="View ' +
      esc(p.t) + ' on gavinger.com">' + media + '</a>' +
      '<figcaption><span class="g-title">' + esc(p.t) + '</span>' +
      '<span class="g-price">' + money(p.p) + '</span></figcaption>';
    return item;
  }

  var fgrid = document.getElementById('room-furniture-grid');
  if (fgrid) {
    furniture.forEach(function (p) { fgrid.appendChild(card(p, 'hand-painted funktional furniture by Gavinger')); });
    var fc = document.getElementById('room-furniture-count');
    if (fc) fc.textContent = furniture.length + ' pieces';
  }

  /* the paintings wall: balanced masonry — each tile drops into the
     currently-shortest column so the bottom edge stays level */
  var wall = document.getElementById('room-paintings-wall');
  var tiles = paintings.map(function (p) {
    var a = document.createElement('a');
    a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', p.t + ' — view on gavinger.com');
    a.innerHTML =
      '<img loading="lazy" decoding="async" style="aspect-ratio:' + p.im[0].w + '/' + p.im[0].h +
      '" src="' + p.im[0].s + '" alt="' + esc(p.t) + ' — ' + KIND[p.ty] + ' by Gavinger">' +
      '<span class="m-tip">' + esc(p.t) + ' · ' + KIND[p.ty] + ' · ' + money(p.p) + '</span>';
    return { el: a, ratio: p.im[0].h / p.im[0].w };
  });
  function colCount() {
    var w = window.innerWidth;
    return w > 1100 ? 5 : w > 860 ? 4 : w > 560 ? 3 : 2;
  }
  var lastCols = 0;
  function layoutWall() {
    if (!wall) return;
    var n = colCount();
    if (n === lastCols) return;
    lastCols = n;
    wall.innerHTML = '';
    var cols = [], heights = [];
    for (var i = 0; i < n; i++) {
      var c = document.createElement('div');
      c.className = 'm-col';
      wall.appendChild(c);
      cols.push(c); heights.push(0);
    }
    tiles.forEach(function (t) {
      var k = heights.indexOf(Math.min.apply(null, heights));
      cols[k].appendChild(t.el);
      heights[k] += t.ratio;
    });
  }
  layoutWall();
  var wallTimer;
  window.addEventListener('resize', function () {
    clearTimeout(wallTimer);
    wallTimer = setTimeout(layoutWall, 180);
  });
  var pc = document.getElementById('room-paintings-count');
  if (pc) pc.textContent = paintings.length + ' works';

  /* ------------------------------------------------------------
     the tab controller
     ------------------------------------------------------------ */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#room-tabs [role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });

  function show(i, focusTab) {
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (panels[k]) panels[k].hidden = !on;
    });
    if (focusTab) tabs[i].focus();
    /* the film stays where it is — only the room changes. Send the reader
       to the top of the new room, not the top of the document, so the
       reel does not jump back to full height. */
    var reel = document.getElementById('reel');
    var top = reel ? reel.getBoundingClientRect().height : 0;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'auto' });
    var id = tabs[i].dataset.room;
    if (id && location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
    document.dispatchEvent(new CustomEvent('gav:room', { detail: { room: id, index: i } }));
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(i); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); show((i + d + tabs.length) % tabs.length, true); }
      else if (e.key === 'Home') { e.preventDefault(); show(0, true); }
      else if (e.key === 'End') { e.preventDefault(); show(tabs.length - 1, true); }
    });
  });

  /* deep links: /clockhouse.html#paintings opens that room */
  function hashIndex() {
    var want = location.hash.slice(1);
    return tabs.findIndex(function (t) { return t.dataset.room === want; });
  }
  show(Math.max(0, hashIndex()));
  window.addEventListener('hashchange', function () {
    /* an unrelated hash — #reel from the brand link — must not throw the
       visitor back to the first room */
    var i = hashIndex();
    if (i >= 0) show(i);
  });

  window.GAV_ROOMS = { show: show, tabs: tabs, counts: { furniture: furniture.length, paintings: paintings.length } };
})();
