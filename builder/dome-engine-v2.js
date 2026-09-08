/* ============================================================
   NEBULA DOME ENGINE v2.2
   Pure layout. No DOM, no assets, no state. Returns placements.

   v2.2 adds:
   - SHAPE ABSTRACTION. Round and heart run through ONE code path.
     Everything that used to key off `r / R` now keys off distance to
     the shape outline, so depth falloff, rim relaxation, gap mapping
     and the greenery collar all follow the silhouette. The old heart
     (arc-length ring walk) is gone - it produced a mandala. This is
     phyllotaxis inside a mask.
   - PER-BLOOM OVERRIDES. cfg.overrides = {index: flowerId} lets a user
     place any flower anywhere. Applied last, so a tap always wins over
     palette blending and over accent clusters.
   - ACCENT MODES: cluster | border | half | scatter | ring.
     `scatter` exists because it was explicitly asked for, even though
     `cluster` is what both reference photos actually do.
   - greenery rotation swung OFF radial. Every sprig used to be rotated
     exactly radial, and head_eucalyptus is a narrow tip (aspect 0.589),
     so it presented as a grey thorn. Off-radial rotation costs radial
     reach, so the centre offset is pushed out to compensate.

   Rejected, do not retry:
   - separate evenly-spaced rim collar ring: carved 28 of 58 blooms out
     of the interior and opened a ring-shaped hole (bg 2.06% -> 11.32%).
     Coverage was never the problem, only the outline, so relaxRim()
     only evens ANGLES of blooms already at the edge.
   - uniform head size: at +/-4.5% the phyllotaxis parastichy showed
     through as visible spiral arms. Real rose heads vary 15-20%.
   ============================================================ */
(function (global) {
  'use strict';

  var GOLDEN = 137.507 * Math.PI / 180;   // measured constant, do not change
  var TAU = Math.PI * 2;

  function rng(seed) {
    var a = (seed | 0) || 1;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* cov  = opaque radius / rendered width
     base = size vs a rose
     spin = max random rotation, deg (180 = free) */
  var SPEC = {
    hydrangea:  { cov: 0.44, base: 1.43, spin: 180 },
    rose:       { cov: 0.47, base: 1.00, spin: 180 },
    carnation:  { cov: 0.46, base: 0.91, spin: 180 },
    tulip:      { cov: 0.41, base: 0.87, spin: 24 },
    lily:       { cov: 0.49, base: 1.30, spin: 180 },
    sunflower:  { cov: 0.48, base: 1.12, spin: 180 },
    gerbera:    { cov: 0.47, base: 0.99, spin: 180 },
    ranunculus: { cov: 0.45, base: 0.85, spin: 180 },
    alstro:     { cov: 0.44, base: 0.93, spin: 180 },
    choc:       { cov: 0.44, base: 0.84, spin: 16 },
    knot:       { cov: 0.40, base: 0.62, spin: 180 },
    fan:        { cov: 0.34, base: 0.80, spin: 180 },
    euc:        { cov: 0.30, base: 0.55, spin: 180 }
  };

  function specKey(id) {
    if (!id) return 'rose';
    if (id.indexOf('rose_') === 0) return 'rose';
    if (id.indexOf('carnation_') === 0) return 'carnation';
    if (id.indexOf('tulip_') === 0) return 'tulip';
    if (id === 'hydrangea') return 'hydrangea';
    if (id === 'babys_compact') return 'knot';
    if (id === 'babys_medium') return 'fan';
    if (id === 'lily') return 'lily';
    if (id === 'sunflower') return 'sunflower';
    if (id === 'gerbera_daisy') return 'gerbera';
    if (id === 'ranunculus') return 'ranunculus';
    if (id === 'alstroemeria') return 'alstro';
    if (id === 'babys_breath') return 'knot';
    if (id === 'limonium') return 'fan';
    if (id === 'eucalyptus') return 'euc';
    if (id.indexOf('choc') >= 0) return 'choc';
    return 'rose';
  }
  function spec(id) { return SPEC[specKey(id)] || SPEC.rose; }

  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------- depth curve: measured constants ---------- */
  var DEPTH = {
    sizeNear: 1.06, sizeFar: 0.76,
    brightNear: 1.03, brightFar: 0.77,
    satNear: 1.02, satFar: 0.90,
    blurFar: 0.020,
    ease: 0.85
  };
  function depthOf(t) {
    var c = clamp01(t), e = Math.pow(c, DEPTH.ease);
    return {
      t: c,
      scale: lerp(DEPTH.sizeNear, DEPTH.sizeFar, e),
      bright: lerp(DEPTH.brightNear, DEPTH.brightFar, c),
      sat: lerp(DEPTH.satNear, DEPTH.satFar, c),
      blurF: c * c * DEPTH.blurFar
    };
  }

  /* ---------- unit size from target overlap ---------- */
  function unitFor(N, R, ov, cov, meanScale) {
    var rho = 0.9523 * R / Math.sqrt(N);
    return ((rho / (1 - ov)) / cov) / meanScale;
  }

  /* ============================================================
     SHAPES
     A shape is a closed polygon plus the queries the engine needs:
       inside(x,y)      point in polygon
       dist(x,y)        distance to outline, + inside / - outside
       nearestS(x,y)    arc-length position of the nearest outline pt
       outlineAt(s)     {x,y,nx,ny} with OUTWARD unit normal
       frac             area / area of the R-disc
       inradius         max dist(), i.e. the deepest interior point
     For 'round', dist() = R - r and inradius = R, so every formula
     below collapses back to the v2.1 circular behaviour exactly.
     ============================================================ */
  function buildShape(kind, R, M) {
    // Exact analytic round queries avoid repeated polygon scans on pointer-driven phone layouts.
    if(kind==='round') return {kind:'round',R:R,frac:1,area:Math.PI*R*R,inradius:R,perimeter:TAU*R,
      inside:function(x,y){return x*x+y*y<=R*R;},dist:function(x,y){return R-Math.hypot(x,y);},
      nearestS:function(x,y){return ((Math.atan2(y,x)+TAU)%TAU)*R;},
      outlineAt:function(s){var a=s/R;return {x:Math.cos(a)*R,y:Math.sin(a)*R,nx:Math.cos(a),ny:Math.sin(a)};}};
    M = M || 240;
    var raw = [], i, t;
    if (kind === 'heart') {
      /* classic parametric heart. y is negated because screen y grows
         downward: the cleft must sit at the TOP, the point at bottom. */
      for (i = 0; i < M; i++) {
        t = i / M * TAU;
        var hx = 16 * Math.pow(Math.sin(t), 3) / 17;
        var hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t)
                  - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17;
        raw.push({ x: hx, y: -hy });
      }
    } else {
      for (i = 0; i < M; i++) { t = i / M * TAU; raw.push({ x: Math.cos(t), y: Math.sin(t) }); }
    }

    /* centre on bbox, uniform scale so the larger half-extent == R */
    var mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    for (i = 0; i < raw.length; i++) {
      if (raw[i].x < mnx) mnx = raw[i].x;
      if (raw[i].x > mxx) mxx = raw[i].x;
      if (raw[i].y < mny) mny = raw[i].y;
      if (raw[i].y > mxy) mxy = raw[i].y;
    }
    var ox = (mnx + mxx) / 2, oy = (mny + mxy) / 2;
    var half = Math.max((mxx - mnx) / 2, (mxy - mny) / 2);
    var sc = R / half;
    var P = raw.map(function (p) { return { x: (p.x - ox) * sc, y: (p.y - oy) * sc }; });

    /* signed area -> winding, so outward normals point the right way */
    var sa = 0;
    for (i = 0; i < P.length; i++) {
      var q = P[(i + 1) % P.length];
      sa += P[i].x * q.y - q.x * P[i].y;
    }
    sa /= 2;
    var wind = sa >= 0 ? 1 : -1;
    var area = Math.abs(sa);

    /* edges + cumulative arc length */
    var E = [], cum = [0], per = 0;
    for (i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length];
      var dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy) || 1e-9;
      E.push({
        ax: a.x, ay: a.y, dx: dx, dy: dy, L: L,
        nx: wind * dy / L, ny: -wind * dx / L
      });
      per += L; cum.push(per);
    }

    function inside(x, y) {
      var hit = false;
      for (var j = 0, k = P.length - 1; j < P.length; k = j++) {
        var xi = P[j].x, yi = P[j].y, xj = P[k].x, yj = P[k].y;
        if (((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) hit = !hit;
      }
      return hit;
    }

    /* nearest point on the outline: returns {d, s} */
    function near(x, y) {
      var bd = Infinity, bs = 0;
      for (var j = 0; j < E.length; j++) {
        var e = E[j];
        var tt = ((x - e.ax) * e.dx + (y - e.ay) * e.dy) / (e.L * e.L);
        tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
        var px = e.ax + e.dx * tt, py = e.ay + e.dy * tt;
        var ddx = x - px, ddy = y - py, d2 = ddx * ddx + ddy * ddy;
        if (d2 < bd) { bd = d2; bs = cum[j] + e.L * tt; }
      }
      return { d: Math.sqrt(bd), s: bs };
    }

    function dist(x, y) { var n = near(x, y); return inside(x, y) ? n.d : -n.d; }
    function nearestS(x, y) { return near(x, y).s; }

    function outlineAt(s) {
      var ss = ((s % per) + per) % per;
      var lo = 0, hi = E.length - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid + 1] < ss) lo = mid + 1; else hi = mid; }
      var e = E[lo], tt = (ss - cum[lo]) / e.L;
      return { x: e.ax + e.dx * tt, y: e.ay + e.dy * tt, nx: e.nx, ny: e.ny };
    }

    /* deepest interior point, by coarse grid */
    var inr = 0;
    for (i = 0; i <= 48; i++) {
      for (var j2 = 0; j2 <= 48; j2++) {
        var gx = -R + 2 * R * i / 48, gy = -R + 2 * R * j2 / 48;
        if (!inside(gx, gy)) continue;
        var d = near(gx, gy).d;
        if (d > inr) inr = d;
      }
    }

    return {
      kind: kind, R: R, poly: P, perimeter: per, area: area,
      frac: area / (Math.PI * R * R),
      inradius: inr || R,
      inside: inside, dist: dist, nearestS: nearestS, outlineAt: outlineAt
    };
  }

  /* ---------- phyllotaxis ---------- */
  function spiral(N, R, rand, jitter) {
    var pts = [], i;
    jitter = jitter == null ? 1 : jitter;
    if (N <= 0) return pts;
    for (i = 0; i < N; i++) {
      var r = R * Math.sqrt((i + 0.5) / N);
      var a = i * GOLDEN;
      var cell = R / Math.sqrt(N);
      var jr = (rand() - 0.5) * cell * 0.46 * jitter;
      var ja = (rand() - 0.5) * cell * 0.56 * jitter / Math.max(r, cell * 0.6);
      var rr = Math.max(0, r + jr), aa = a + ja;
      pts.push({ r: rr, a: aa, x: Math.cos(aa) * rr, y: Math.sin(aa) * rr });
    }
    return pts;
  }

  /* ============================================================
     SKELETON
     Phyllotaxis is uniform-density in a disc, so masking it with a
     shape preserves that density inside the shape. Binary-search how
     many disc points are needed to land `want` of them inside.
     ============================================================ */
  function skeleton(want, shape, R, seed, jitter) {
    /* EXACT COUNT, SEED-INVARIANT.
       The previous version binary-searched nDisc for an exact hit on `want`
       and fell back to the nearest miss. ins.length is not monotone in mid
       (each mid rebuilds the spiral with a different cell size), so the
       search was invalid and the head count moved with the seed by up to 3.
       Measured after this change: 0/198 vary by seed, 0/198 miss want. */
    var need = Math.max(3, Math.round(want / Math.max(0.15, shape.frac)));
    var ins = [], all, i, guard = 0;
    while (guard++ < 600) {
      all = spiral(need, R * 1.02, rng(seed), jitter);
      ins = [];
      for (i = 0; i < all.length; i++) {
        if (shape.inside(all[i].x / 1.02, all[i].y / 1.02)) ins.push(all[i]);
      }
      if (ins.length >= want) break;
      need++;
    }
    if (ins.length > want) {
      ins.sort(function (p, q) { return p.r - q.r; });
      ins = ins.slice(0, want);
    }
    return ins;
  }

  /* ============================================================
     RIM RELAXATION - clean the silhouette WITHOUT stealing blooms.
     Evens the arc-length spacing of blooms already near the outline
     and pulls them onto it. Density is never touched.
     ============================================================ */
  function relaxRim(pts, shape, unit, rand, opts) {
    var bandU = opts.bandU == null ? 0.50 : opts.bandU;
    var snapA = opts.snapA == null ? 0.70 : opts.snapA;
    var snapR = opts.snapR == null ? 0.55 : opts.snapR;
    var per = shape.perimeter, outer = [], i;

    for (i = 0; i < pts.length; i++) {
      pts[i].dEdge = shape.dist(pts[i].x, pts[i].y);
      if (pts[i].dEdge < unit * bandU) outer.push(pts[i]);
    }
    var n = outer.length;
    if (n < 5) return 0;

    for (i = 0; i < outer.length; i++) outer[i].s = shape.nearestS(outer[i].x, outer[i].y);
    outer.sort(function (a, b) { return a.s - b.s; });

    var s0 = outer[0].s, inset = unit * 0.02;
    for (i = 0; i < n; i++) {
      var p = outer[i];
      var target = s0 + i / n * per;
      var d = ((target - p.s + per * 1.5) % per) - per * 0.5;   // shortest way round
      var ss = p.s + d * snapA + (rand() - 0.5) * (per / n) * 0.18;
      var o = shape.outlineAt(ss);
      var tx = o.x - o.nx * inset, ty = o.y - o.ny * inset;
      p.x += (tx - p.x) * snapR;
      p.y += (ty - p.y) * snapR;
      p.rim = true;
      p.dEdge = shape.dist(p.x, p.y);
      p.r = Math.sqrt(p.x * p.x + p.y * p.y);
      p.a = Math.atan2(p.y, p.x);
    }
    return n;
  }

  /* ---------- colour patches (Voronoi seeds) + smoothing ---------- */
  function patchAssign(pts, palette, nPatch, rand, shape, R) {
    if (palette.length === 1) { pts.forEach(function (p) { p.id = palette[0]; }); return; }
    var seeds = [], k;
    for (k = 0; k < nPatch; k++) {
      /* keep seeds off dead centre: a lone off-palette bloom at r=0
         reads as a bullseye, which no real florist does */
      var r = R * (0.20 + 0.78 * Math.sqrt((k + 0.42) / nPatch));
      var a = k * GOLDEN + rand() * 0.6;
      var sx = Math.cos(a) * r, sy = Math.sin(a) * r, guard = 0;
      while (!shape.inside(sx, sy) && guard++ < 12) { sx *= 0.82; sy *= 0.82; }
      seeds.push({ x: sx, y: sy, id: palette[k % palette.length], w: 0.82 + rand() * 0.42 });
    }
    pts.forEach(function (p) {
      var best = 1e9, bi = 0;
      for (var j = 0; j < seeds.length; j++) {
        var dx = p.x - seeds[j].x, dy = p.y - seeds[j].y;
        var d = Math.sqrt(dx * dx + dy * dy) / seeds[j].w * (0.88 + rand() * 0.24);
        if (d < best) { best = d; bi = j; }
      }
      p.id = seeds[bi].id; p.patch = bi;
    });

    /* Voronoi boundaries strand single blooms where three patches meet:
       a lone contrasting head reads as a bullseye at the centre and as
       confetti elsewhere. Neither reference dome has ANY isolated
       single - colour always arrives in contiguous patches. So any
       bloom sharing its colour with none of its 5 nearest neighbours is
       flipped to the majority colour among them. */
    for (var pass = 0; pass < 2; pass++) {
      var next = pts.map(function (p) { return p.id; });
      pts.forEach(function (p, i) {
        var near = [], j, q, dx, dy;
        for (j = 0; j < pts.length; j++) {
          if (j === i) continue;
          q = pts[j]; dx = p.x - q.x; dy = p.y - q.y;
          near.push({ d: dx * dx + dy * dy, id: q.id });
        }
        near.sort(function (a, b) { return a.d - b.d; });
        var top = near.slice(0, 5), tally = {}, same = 0, t;
        for (t = 0; t < top.length; t++) {
          tally[top[t].id] = (tally[top[t].id] || 0) + 1;
          if (top[t].id === p.id) same++;
        }
        if (same === 0) {
          var win = p.id, wc = -1;
          Object.keys(tally).forEach(function (key) {
            if (tally[key] > wc) { wc = tally[key]; win = key; }
          });
          next[i] = win;
        }
      });
      pts.forEach(function (p, i) { p.id = next[i]; });
    }
  }

  /* ============================================================
     ACCENTS
     Both reference photos put every accent in ONE contiguous group -
     the red dome's lilies are a single arc riding off-centre. Scattered
     singles read as confetti. `cluster` is therefore the default, but
     the other modes are real options, including `scatter`.
     ============================================================ */
  function placeAccent(pts, id, count, mode, angle, shape, R, rand) {
    if (!count) return [];
    var free = [], i;
    for (i = 0; i < pts.length; i++) if (!pts[i].locked) free.push(pts[i]);
    if (!free.length) return [];
    var taken = [], j;

    function take(p) { p.id = id; p.locked = true; p.accent = true; taken.push(p); }

    if (mode === 'border') {
      /* ride the outline - the classic chocolate border on a heart */
      var band = free.filter(function (p) { return p.dEdge < shape.inradius * 0.42; });
      if (band.length < count) band = free.slice();
      band.forEach(function (p) { p.s = shape.nearestS(p.x, p.y); });
      band.sort(function (a, b) { return a.s - b.s; });
      var step = band.length / count;
      for (i = 0; i < count && i < band.length; i++) take(band[Math.floor(i * step)]);

    } else if (mode === 'half') {
      /* fill one side / one lobe */
      var ux = Math.cos(angle), uy = Math.sin(angle);
      var side = free.map(function (p) { return { p: p, k: p.x * ux + p.y * uy }; })
        .sort(function (a, b) { return b.k - a.k; });
      for (i = 0; i < count && i < side.length; i++) take(side[i].p);

    } else if (mode === 'scatter') {
      /* farthest-point sampling: spread as evenly as possible */
      var start = 0, bestK = -Infinity;
      for (i = 0; i < free.length; i++) {
        var k = free[i].x * Math.cos(angle) + free[i].y * Math.sin(angle);
        if (k > bestK) { bestK = k; start = i; }
      }
      take(free[start]);
      while (taken.length < count) {
        var pick = null, pd = -1;
        for (i = 0; i < free.length; i++) {
          var p = free[i]; if (p.locked) continue;
          var mind = Infinity;
          for (j = 0; j < taken.length; j++) {
            var dx = p.x - taken[j].x, dy = p.y - taken[j].y, d2 = dx * dx + dy * dy;
            if (d2 < mind) mind = d2;
          }
          if (mind > pd) { pd = mind; pick = p; }
        }
        if (!pick) break;
        take(pick);
      }

    } else if (mode === 'ring') {
      var mid = free.filter(function (p) {
        var f = p.dEdge / shape.inradius;
        return f > 0.30 && f < 0.68;
      });
      if (mid.length < count) mid = free.slice();
      mid.forEach(function (p) { p.s = Math.atan2(p.y, p.x); });
      mid.sort(function (a, b) { return a.s - b.s; });
      var st2 = mid.length / count;
      for (i = 0; i < count && i < mid.length; i++) take(mid[Math.floor(i * st2)]);

    } else {
      /* cluster (default) - ride outward so it breaks the outline */
      var cr = R * 0.60;
      var cx = Math.cos(angle) * cr, cy = Math.sin(angle) * cr;
      var guard = 0;
      while (!shape.inside(cx, cy) && guard++ < 12) { cx *= 0.80; cy *= 0.80; }
      var scored = free.map(function (p) {
        var dx = p.x - cx, dy = p.y - cy;
        return { p: p, d: Math.sqrt(dx * dx + dy * dy) * (0.92 + rand() * 0.16) };
      }).sort(function (a, b) { return a.d - b.d; });
      for (i = 0; i < scored.length && taken.length < count; i++) take(scored[i].p);
    }
    return taken;
  }

  /* ============================================================
     GAP MAP - deepest holes first, greedy with suppression.
     Grid sampling inside the shape so it works for any silhouette.
     ============================================================ */
  function gapMap(blooms, shape, R, unit, opts) {
    var out = [], step = unit * 0.17, x, y, i;
    var keepIn = unit * 0.20;
    for (y = -R; y <= R; y += step) {
      for (x = -R; x <= R; x += step) {
        if (shape.dist(x, y) < keepIn) continue;
        var g = 1e9;
        for (i = 0; i < blooms.length; i++) {
          var b = blooms[i], dx = x - b.x, dy = y - b.y;
          var d = Math.sqrt(dx * dx + dy * dy) - b.covR;
          if (d < g) g = d;
          if (g < -unit) break;
        }
        if (g > -unit * 0.02) out.push({ x: x, y: y, r: Math.sqrt(x * x + y * y), gap: g });
      }
    }
    out.sort(function (a, b) { return b.gap - a.gap; });
    var picks = [], sup = unit * (opts.suppress || 0.50);
    for (i = 0; i < out.length && picks.length < (opts.max || 30); i++) {
      var c = out[i], ok = true;
      for (var j = 0; j < picks.length; j++) {
        var ddx = c.x - picks[j].x, ddy = c.y - picks[j].y;
        if (ddx * ddx + ddy * ddy < sup * sup) { ok = false; break; }
      }
      if (ok) picks.push(c);
    }
    return picks;
  }

  /* ============================================================
     GREENERY - 0.55x, BEHIND heads, free, default on.

     head_eucalyptus is a TIP (aspect 0.589), not a full stem, so its
     reach from centre is size/2, not 1.22R. Two coupled constraints:
       - the tip must clear the rim heads, which stop at ~unit*0.36
         past the outline;
       - rotation must sit well OFF radial or the narrow tip points
         straight out and reads as a grey thorn.
     Off-radial rotation costs radial reach (cos of the swing), so the
     centre offset is pushed out to compensate:
       reach = off + 0.275*unit*cos(swing)
     With off=0.26u and swing<=48deg: reach ~= 0.44u > 0.36u. Clear.
     ============================================================ */
  function greenery(shape, unit, rand, opts) {
    var n = opts.count || 8, out = [], i;
    var per = shape.perimeter, off = unit * 0.26;
    for (i = 0; i < n; i++) {
      var s = (i + 0.5) / n * per + (rand() - 0.5) * (per / n) * 0.55;
      var o = shape.outlineAt(s);
      var x = o.x + o.nx * off, y = o.y + o.ny * off;
      var na = Math.atan2(o.ny, o.nx) * 180 / Math.PI;
      var sz = unit * 0.55 * (0.88 + rand() * 0.26);
      out.push({
        kind: 'green', id: 'eucalyptus', rim: true,
        x: x, y: y, r: Math.sqrt(x * x + y * y), size: sz,
        rot: na + 90 + (rand() - 0.5) * 96,
        bright: 0.93 + rand() * 0.12, sat: 1.06, blur: 0, z: 20 + i
      });
    }
    /* a few tucked half-hidden inside the rim, for interior interest */
    var tuck = Math.max(2, Math.round(n * 0.5));
    for (i = 0; i < tuck; i++) {
      var s2 = (i + 0.25) / tuck * per + rand() * (per / tuck) * 0.6;
      var o2 = shape.outlineAt(s2);
      var deep = unit * (0.30 + rand() * 0.55);
      var x2 = o2.x - o2.nx * deep, y2 = o2.y - o2.ny * deep;
      var sz2 = unit * 0.55 * (0.70 + rand() * 0.26);
      out.push({
        kind: 'green', id: 'eucalyptus', tuck: true,
        x: x2, y: y2, r: Math.sqrt(x2 * x2 + y2 * y2), size: sz2,
        rot: rand() * 360,
        bright: 0.88 + rand() * 0.10, sat: 1.04, blur: 0, z: 12 + i
      });
    }
    return out;
  }

  /* interior leaf peeks: behind heads, sitting in the shallow seams */
  function leafPeeks(holes, unit, rand) {
    return holes.map(function (h, i) {
      var a = Math.atan2(h.y, h.x);
      var sz = unit * 0.55 * (0.72 + rand() * 0.28);
      return {
        kind: 'green', id: 'eucalyptus',
        x: h.x, y: h.y, r: h.r, size: sz,
        rot: a * 180 / Math.PI + 90 + (rand() - 0.5) * 120,
        bright: 0.90 + rand() * 0.10, sat: 1.04, blur: 0, z: 40 + i
      };
    });
  }

  /* ============================================================
     BUILD
     cfg.N is the DISC-equivalent bloom count, so head size stays
     identical between shapes at the same size setting; a heart simply
     holds fewer blooms (N * shape.frac).
     ============================================================ */
  function build(cfg) {
    cfg = cfg || {};
    var R = cfg.R || 190;
    var Nd = Math.max(3, cfg.N || 48);
    var seed = cfg.seed || 7;
    var rand = rng(seed + 977);
    var palette = (cfg.palette && cfg.palette.length ? cfg.palette : ['rose_red']).slice(0, 3);
    var ov = cfg.overlap == null ? 0.33 : cfg.overlap;
    var shape = cfg.shape && cfg.shape.inside ? cfg.shape
      : buildShape(cfg.shape || 'round', R, cfg.polyPoints || 240);

    var ms = 0, s;
    for (s = 0; s < 24; s++) ms += depthOf(Math.sqrt((s + 0.5) / 24)).scale;
    ms /= 24;

    var unit = cfg.unit || unitFor(Nd, R, ov, spec(palette[0]).cov, ms);
    var want = cfg.items ? cfg.items.length : Math.max(3, Math.round(Nd * shape.frac));

    /* ---- skeleton, then relax the outline ---- */
    var pts = skeleton(want, shape, R, seed, cfg.jitter);
    var nRim = cfg.rim === false ? 0 : relaxRim(pts, shape, unit, rand, {
      bandU: cfg.rimBand, snapA: cfg.rimSnap, snapR: cfg.rimPull
    });
    var N = pts.length;
    pts.forEach(function (p, i) {
      p.idx = i;
      if (p.dEdge == null) p.dEdge = shape.dist(p.x, p.y);
    });

    /* ---- colour ---- */
    patchAssign(pts, palette,
      cfg.patches || Math.max(palette.length, Math.round(Math.sqrt(N) * 0.9)),
      rand, shape, R);

    /* ---- accents ---- */
    if (cfg.lily) {
      placeAccent(pts, 'lily', cfg.lily, cfg.lilyMode || 'cluster',
        cfg.lilyAngle == null ? -0.25 : cfg.lilyAngle, shape, R, rand);
    }
    if (cfg.choc) {
      placeAccent(pts, '__choc', cfg.choc, cfg.chocMode || 'cluster',
        cfg.chocAngle == null ? 2.45 : cfg.chocAngle, shape, R, rand);
    }

    /* ---- user overrides win over everything ---- */
    if (cfg.overrides) {
      Object.keys(cfg.overrides).forEach(function (k) {
        var p = pts[+k];
        if (p) { p.id = cfg.overrides[k]; p.painted = true; p.accent = false; }
      });
    }

    // Every requested item wins over palette smoothing. No hidden count/species changes.
    if(cfg.items) pts.forEach(function(p,i){p.id=cfg.items[i];p.accent=false;});
    /* ---- resolve heads ---- */
    var blooms = pts.map(function (p) {
      var sp = spec(p.id);
      var d = depthOf(clamp01(1 - p.dEdge / shape.inradius));
      /* real rose heads vary 15-20%; tighter than this and the
         phyllotaxis parastichy shows through as spiral arms */
      var size = unit * d.scale * sp.base * (0.90 + rand() * 0.20);
      return {
        kind: 'head', id: p.id, idx: p.idx,
        accent: !!p.accent, painted: !!p.painted, rim: !!p.rim,
        x: p.x, y: p.y, r: p.r, dEdge: p.dEdge,
        size: size, covR: size * sp.cov,
        rot: (rand() - 0.5) * 2 * sp.spin,
        bright: d.bright * (0.985 + rand() * 0.03),
        sat: d.sat, blur: size * d.blurF, t: d.t
      };
    });

    /* ---- gap map: deep seams -> baby's breath, shallow -> leaf ---- */
    var fill = [], peeks = [];
    if (cfg.fillers !== false) {
      var holes = gapMap(blooms, shape, R, unit, { max: cfg.fillerMax || 30, suppress: 0.50 });
      var deep = holes.filter(function (h) { return h.gap > unit * 0.055; });
      var split = deep.length;
      holes.slice(0, split).forEach(function (h) {
        var sp = SPEC.knot, d = depthOf(clamp01(1 - shape.dist(h.x, h.y) / shape.inradius));
        var want2 = (h.gap + unit * 0.15) / sp.cov;
        var size = clamp(want2, unit * 0.30, unit * 0.45) * d.scale;
        fill.push({
          kind: 'fill', id: 'babys_breath', variant: 'knot',
          x: h.x, y: h.y, r: h.r, size: size, covR: size * sp.cov,
          rot: (rand() - 0.5) * 360,
          bright: d.bright * 1.02, sat: d.sat * 0.96,
          blur: size * d.blurF * 0.6, t: d.t
        });
      });
      if (cfg.greens !== false) peeks = leafPeeks(holes.slice(split), unit, rand);
    }

    var greens = cfg.greens === false ? []
      : greenery(shape, unit, rand, { count: cfg.greenCount || 8 });

    /* ---- paint order: outline first, crown last ---- */
    var stack = blooms.concat(fill).sort(function (a, b) {
      var ka = a.dEdge == null ? shape.dist(a.x, a.y) : a.dEdge;
      var kb = b.dEdge == null ? shape.dist(b.x, b.y) : b.dEdge;
      ka += (a.kind === 'fill' ? unit * 0.06 : 0);
      kb += (b.kind === 'fill' ? unit * 0.06 : 0);
      return ka - kb;
    });
    stack.forEach(function (b, i) { b.z = 100 + i; });

    var far = 0;
    blooms.concat(fill).forEach(function (b) { far = Math.max(far, b.r + b.covR); });
    var farAll = far;
    greens.forEach(function (g) { farAll = Math.max(farAll, g.r + g.size * 0.5); });

    return {
      unit: unit, R: R, N: N, Ndisc: Nd, nRim: nRim, shape: shape,
      items: greens.concat(peeks).concat(stack),
      heads: blooms, fillers: fill, greens: greens, peeks: peeks,
      spread: far / R, spreadAll: farAll / R,
      exposed: exposure(blooms.concat(fill), shape, R),
      greenVisible: greenVisible(greens, blooms.concat(fill))
    };
  }

  /* % of the shape's own area showing background */
  function exposure(items, shape, R) {
    var hit = 0, tot = 0, x, y, step = R / 26, i;
    for (y = -R; y <= R; y += step) {
      for (x = -R; x <= R; x += step) {
        if (!shape.inside(x, y)) continue;
        var cov = false;
        for (i = 0; i < items.length; i++) {
          var dx = x - items[i].x, dy = y - items[i].y;
          if (dx * dx + dy * dy <= items[i].covR * items[i].covR) { cov = true; break; }
        }
        tot++; if (!cov) hit++;
      }
    }
    return tot ? hit / tot : 0;
  }

  /* guard against 2.0's silent bug: is any rim greenery unoccluded? */
  function greenVisible(greens, occluders) {
    var rim = greens.filter(function (g) { return g.rim; });
    if (!rim.length) return 0;
    var seen = 0;
    rim.forEach(function (g) {
      var half = g.size * 0.5, rad = g.rot * Math.PI / 180 - Math.PI / 2;
      var tipX = g.x + Math.cos(rad) * half, tipY = g.y + Math.sin(rad) * half;
      var hidden = false;
      for (var i = 0; i < occluders.length; i++) {
        var o = occluders[i], dx = tipX - o.x, dy = tipY - o.y;
        if (dx * dx + dy * dy <= o.covR * o.covR) { hidden = true; break; }
      }
      if (!hidden) seen++;
    });
    return seen / rim.length;
  }

  global.DomeEngine = {
    build: build, buildShape: buildShape, unitFor: unitFor, depthOf: depthOf, spec: spec, skeleton: skeleton, patchAssign: patchAssign, placeAccent: placeAccent,
    SPEC: SPEC, DEPTH: DEPTH, specKey: specKey,
    GOLDEN_DEG: 137.507, rng: rng,
    exposure: exposure, greenVisible: greenVisible
  };
})(typeof window !== 'undefined' ? window : globalThis);
