// Deterministic stage: window.seek(t) draws the frame at time t (seconds).
// All on screen text comes from content/script.json (window.DATA.script).
// All timing comes from the voiceover timeline (window.DATA.timeline).
(function () {
  const D = window.DATA, S = D.script, TL = D.timeline, LOGO = window.LOGOS;
  const C = { ink: '#343740', muted: '#5e6270', navy: '#323b70', mint: '#a2ffc8', mintInk: '#20321f',
    sky: '#c8daee', mintSoft: '#d8fee5', mist: '#e8ebf2', line: '#bdc1cb', paper: '#ffffff' };
  const stage = document.getElementById('stage');

  // maths
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const P = (t, t0, d) => clamp((t - t0) / d);
  const eo = x => 1 - Math.pow(1 - x, 3);
  const eio = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const back = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const lerp = (a, b, p) => a + (b - a) * p;
  const hex = h => [0, 2, 4].map(i => parseInt(h.slice(1).substr(i, 2), 16));
  const mix = (a, b, p) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * p)).join(',') + ')'; };

  // dom helpers
  function mk(tag, cls, parent, text) {
    const e = document.createElement(tag); if (cls) e.className = cls;
    if (text != null) e.textContent = text; parent.appendChild(e); return e;
  }
  function at(e, x, y) { e.style.left = x + 'px'; e.style.top = y + 'px'; return e; }

  // icons drawn for this project, 64 x 64 grid, line style
  const IC = {
    fund: '<path d="M8 24 L32 10 L56 24 Z"/><path d="M15 29 V48 M25 29 V48 M39 29 V48 M49 29 V48"/><path d="M8 53 H56"/>',
    token: '<circle cx="32" cy="32" r="23" fill="#a2ffc8"/><circle cx="32" cy="32" r="13"/>',
    doc: '<path d="M16 6 H39 L50 17 V58 H16 Z" fill="#ffffff"/><path d="M39 6 V17 H50"/><path d="M23 27 H43 M23 35 H43 M23 43 H35"/>',
    licence: '<rect x="8" y="10" width="48" height="36" rx="4" fill="#ffffff"/><path d="M16 20 H48 M16 28 H38"/><circle cx="40" cy="47" r="7" fill="#ffffff"/><path d="M36 53 L34 60 L40 57 L46 60 L44 53"/>',
    person: '<circle cx="32" cy="21" r="10"/><path d="M13 55 C13 42 21 36 32 36 C43 36 51 42 51 55"/>',
    idcard: '<rect x="6" y="14" width="52" height="36" rx="5"/><circle cx="22" cy="29" r="6"/><path d="M13 43 C13 38 17 36 22 36 C27 36 31 38 31 43"/><path d="M37 25 H51 M37 32 H51 M37 39 H46"/>',
    eligible: '<circle cx="27" cy="21" r="10"/><path d="M8 55 C8 42 16 36 27 36 C31 36 34 37 37 38"/><circle cx="47" cy="47" r="10"/><path d="M42 47 L46 51 L53 43"/>',
    limit: '<path d="M8 32 H40"/><path d="M32 24 L40 32 L32 40"/><path d="M50 16 V48"/>',
    wallet: '<path d="M12 18 L42 9 L45 18"/><rect x="8" y="18" width="48" height="36" rx="5" fill="#ffffff"/><rect x="38" y="30" width="18" height="12" rx="3"/>',
    lock: '<rect x="16" y="28" width="32" height="26" rx="4"/><path d="M22 28 V21 C22 15 26 11 32 11 C38 11 42 15 42 21 V28"/>',
    shield: '<path d="M32 7 L52 15 V30 C52 44 43 52 32 57 C21 52 12 44 12 30 V15 Z" fill="#ffffff"/>',
    shieldok: '<path d="M32 7 L52 15 V30 C52 44 43 52 32 57 C21 52 12 44 12 30 V15 Z" fill="#a2ffc8"/><path d="M22 32 L29 39 L43 24"/>',
    clock: '<circle cx="32" cy="32" r="23" fill="#ffffff"/><path d="M32 19 V32 L41 38"/>',
    cash: '<rect x="5" y="17" width="54" height="30" rx="4" fill="#ffffff"/><circle cx="32" cy="32" r="7"/><path d="M13 25 V39 M51 25 V39"/>',
    rules: '<rect x="13" y="7" width="38" height="50" rx="4" fill="#ffffff"/><path d="M20 21 L23 24 L28 18 M33 21 H44 M20 33 L23 36 L28 30 M33 33 H44 M20 45 L23 48 L28 42 M33 45 H44"/>',
    window: '<rect x="6" y="10" width="52" height="44" rx="5" fill="#ffffff"/><path d="M6 20 H58"/><path d="M14 30 H34 M14 38 H44 M14 46 H28"/>'
  };
  const svg = (name, size, color, sw) => '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '" fill="none" stroke="' +
    (color || C.ink) + '" stroke-width="' + (sw || 2.5) + '" stroke-linecap="round" stroke-linejoin="round">' + IC[name] + '</svg>';
  function icon(parent, name, size, cx, cy, color, sw) {
    const d = mk('div', 'icon', parent); d.innerHTML = svg(name, size, color, sw);
    d.style.width = d.style.height = size + 'px'; return at(d, cx - size / 2, cy - size / 2);
  }
  function tile(parent, name, size, cx, cy) {
    const d = mk('div', 'tile', parent); d.style.width = d.style.height = size + 'px';
    d.innerHTML = svg(name, Math.round(size * 0.62)); return at(d, cx - size / 2, cy - size / 2);
  }
  function badge(parent, kind, size, cx, cy) {
    const d = mk('div', 'badge ' + kind, parent); d.style.width = d.style.height = size + 'px';
    if (kind === 'ok') d.innerHTML = '<svg viewBox="0 0 64 64" width="' + Math.round(size * 0.62) + '" height="' + Math.round(size * 0.62) +
      '" fill="none" stroke="' + C.mintInk + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 33 L27 46 L50 20"/></svg>';
    else if (kind === 'no') d.innerHTML = '<svg viewBox="0 0 64 64" width="' + Math.round(size * 0.46) + '" height="' + Math.round(size * 0.46) +
      '" fill="none" stroke="' + C.muted + '" stroke-width="7" stroke-linecap="round"><path d="M14 14 L50 50 M50 14 L14 50"/></svg>';
    else d.innerHTML = svg('lock', Math.round(size * 0.66));
    if (cx != null) { d.style.position = 'absolute'; at(d, cx - size / 2, cy - size / 2); }
    return d;
  }
  function coin(parent, size) {
    const d = mk('div', 'icon', parent); size = size || 40; d.style.width = d.style.height = size + 'px';
    d.innerHTML = '<svg viewBox="0 0 40 40" width="' + size + '" height="' + size + '"><circle cx="20" cy="20" r="16" fill="' +
      C.mint + '" stroke="' + C.ink + '" stroke-width="3"/></svg>'; d.style.opacity = 0; return d;
  }

  // motion setters
  function show(e, p, o) {
    o = o || {}; const dx = o.dx || 0, dy = o.dy || 0, s0 = o.s0 == null ? 1 : o.s0;
    e.style.opacity = p; e.style.transform = 'translate(' + (1 - p) * dx + 'px,' + (1 - p) * dy + 'px) scale(' + lerp(s0, 1, p) + ')';
  }
  function popIn(e, p) {
    const q = clamp(p); e.style.opacity = clamp(q * 3);
    e.style.transform = 'scale(' + (q <= 0 ? 0.3 : lerp(0.3, 1, back(q))) + ')';
  }

  // timeline
  const SC = TL.scenes, TOTAL = TL.total_seconds, XF = 0.5;
  if (SC.length !== S.scenes.length) throw new Error('timeline and script have different scene counts');
  const IDX = {}; S.scenes.forEach((s, i) => { IDX[s.id] = i; if (SC[i].id !== s.id) throw new Error('scene order mismatch at ' + s.id); });
  const WIN = SC.map((sc, i) => ({
    a: i ? (SC[i - 1].end + sc.start) / 2 : 0,
    b: i < SC.length - 1 ? (sc.end + SC[i + 1].start) / 2 : TOTAL
  }));
  function ts(i, j, phrase, off) {
    const s = SC[i].sentences[j]; let f = 0;
    if (phrase) {
      const k = s.text.indexOf(phrase);
      if (k < 0) throw new Error('anchor "' + phrase + '" not found in: ' + s.text);
      f = k / s.text.length;
    }
    return s.start + f * (s.end - s.start) + (off || 0);
  }
  function sceneAlpha(i, t) {
    const w = WIN[i], last = i === WIN.length - 1;
    const fin = i === 0 ? 1 : eio(P(t, w.a - XF / 2, XF));
    const fout = last ? 1 - eio(P(t, TOTAL - 0.6, 0.6)) : 1 - eio(P(t, w.b - XF / 2, XF));
    return Math.min(fin, fout);
  }

  // shared layouts
  function sceneEl(bg) { const e = mk('div', 'scene', stage); if (bg) e.style.background = bg; return e; }
  function card(el, bg) {
    const c = mk('div', 'card', el); at(c, 1000, 200); c.style.width = '770px'; c.style.height = '640px';
    c.style.background = bg; return c;
  }
  function leftCol(i, el, o) {
    let y = o.pill ? 240 : 250; let pill = null;
    if (o.pill) { pill = at(mk('div', 'pill', el, o.pill), 150, y); y += 76; }
    const h = at(mk('div', 'h2', el, o.heading), 150, y); h.style.width = '790px';
    y += h.offsetHeight + 44;
    const rows = o.items.map(it => {
      const r = at(mk('div', 'row', el), 150, y); r.style.width = '800px';
      badge(r, 'ok', 50); mk('div', 'rowtext', r, it.text); y += r.offsetHeight + 30;
      return { r, it };
    });
    if (y > 880) throw new Error('left column too tall in ' + S.scenes[i].id + ': ' + y);
    return t => {
      const t0 = WIN[i].a;
      if (pill) show(pill, eo(P(t, t0 + 0.1, 0.5)), { dy: 20 });
      show(h, eo(P(t, t0 + 0.2, 0.6)), { dy: 28 });
      rows.forEach(({ r, it }) => show(r, eo(P(t, ts(i, it.a[0], it.a[1], it.a[2]), 0.5)), { dy: 20 }));
    };
  }
  const os = id => S.scenes[IDX[id]].on_screen;

  // scenes
  const B = {};
  B.s01 = i => {
    const el = sceneEl(); const o = os('s01');
    const band = mk('div', 'band', el); band.style.top = '250px'; band.style.height = '560px'; band.style.background = C.sky;
    const fund = icon(el, 'fund', 170, 720, 400);
    const arrow = mk('div', 'icon', el);
    arrow.innerHTML = '<svg width="220" height="40" viewBox="0 0 220 40" fill="none" stroke="' + C.ink +
      '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path class="shaft" d="M10 20 H200"/><path d="M186 8 L202 20 L186 32"/></svg>';
    at(arrow, 850, 380);
    const shaft = arrow.querySelector('.shaft'); shaft.style.strokeDasharray = 190;
    const tok = icon(el, 'token', 170, 1200, 400);
    const h = mk('div', 'h1', el, o[0]); h.style.top = '530px';
    const sub = mk('div', 'sub', el, o[1]); sub.style.top = '660px'; sub.style.padding = '0 140px';
    return t => {
      show(band, eo(P(t, 0, 0.7)), { s0: 0.98 });
      show(fund, eo(P(t, 0.25, 0.6)), { dy: 24 });
      const pa = eio(P(t, 0.9, 0.7)); arrow.style.opacity = clamp(pa * 4); shaft.style.strokeDashoffset = 190 * (1 - pa);
      popIn(tok, P(t, 1.5, 0.6));
      show(h, eo(P(t, 0.5, 0.7)), { dy: 30 });
      show(sub, eo(P(t, 1.1, 0.7)), { dy: 24 });
    };
  };
  B.s02 = i => {
    const el = sceneEl(); const o = os('s02');
    const c = mk('div', 'card', el); at(c, 330, 205); c.style.width = '1260px'; c.style.height = '430px'; c.style.background = C.mintSoft;
    const reg = mk('div', 'tile', c); at(reg, 90, 65); reg.style.width = '420px'; reg.style.height = '300px'; reg.style.display = 'block';
    const rows = [0, 1, 2].map(k => {
      const r = mk('div', 'abs', reg); at(r, 34, 40 + k * 80); r.style.width = '340px'; r.style.height = '48px';
      r.innerHTML = svg('person', 48) + '<div style="position:absolute;left:72px;top:16px;width:250px;height:16px;border-radius:8px;background:' + C.mist + '"></div>';
      return r;
    });
    const arr = mk('div', 'icon', c);
    arr.innerHTML = '<svg width="140" height="40" viewBox="0 0 140 40" fill="none" stroke="' + C.ink +
      '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20 H128"/><path d="M114 8 L130 20 L114 32"/></svg>';
    at(arr, 555, 195);
    const toks = [0, 1, 2].map(k => icon(c, 'token', 110, 800 + k * 150, 255));
    const rules = icon(c, 'rules', 84, 950, 95);
    const ticks = [0, 1, 2].map(k => badge(c, 'ok', 40, 800 + k * 150 + 38, 255 + 38));
    const l0 = mk('div', 'sub', el, o[0]); l0.style.top = '690px'; l0.style.color = C.ink; l0.style.fontWeight = '600';
    const l1 = mk('div', 'sub', el, o[1]); l1.style.top = '760px'; l1.style.color = C.ink; l1.style.fontWeight = '600';
    return t => {
      const t0 = WIN[i].a, s0 = SC[i].sentences[0].start;
      show(c, eo(P(t, t0 + 0.1, 0.6)), { dy: 24 });
      rows.forEach((r, k) => show(r, eo(P(t, t0 + 0.3 + k * 0.12, 0.4)), { dx: -20 }));
      arr.style.opacity = eio(P(t, s0 + 0.4, 0.6));
      toks.forEach((e, k) => popIn(e, P(t, s0 + 0.7 + k * 0.3, 0.5)));
      show(l0, eo(P(t, ts(i, 0, 'ownership'), 0.5)), { dy: 18 });
      popIn(rules, P(t, ts(i, 0, 'lets you program'), 0.5));
      ticks.forEach((e, k) => popIn(e, P(t, ts(i, 0, 'rules of the asset', 0.2) + k * 0.15, 0.4)));
      show(l1, eo(P(t, ts(i, 0, 'lets you program'), 0.5)), { dy: 18 });
    };
  };
  B.s03 = i => {
    const el = sceneEl(); const o = os('s03');
    const L = leftCol(i, el, { pill: o[0], heading: o[1], items: [{ text: o[2], a: [1, null] }, { text: o[3], a: [2, null] }] });
    const c = card(el, C.sky);
    const doc = icon(c, 'doc', 230, 230, 300);
    const ok = badge(c, 'ok', 72, 310, 390);
    const lic = icon(c, 'licence', 150, 560, 210);
    const ok2 = badge(c, 'ok', 52, 615, 255);
    const lic2 = icon(c, 'licence', 150, 560, 450, C.muted);
    lic2.querySelectorAll('rect, path, circle').forEach(p => p.setAttribute('stroke-dasharray', '5 7'));
    const no = badge(c, 'no', 58, 618, 498);
    return t => {
      const t0 = WIN[i].a; L(t);
      show(c, eo(P(t, t0 + 0.15, 0.6)), { dx: 40 });
      show(doc, eo(P(t, t0 + 0.4, 0.6)), { dy: 20 });
      popIn(ok, P(t, ts(i, 1, 'allow'), 0.5));
      show(lic, eo(P(t, ts(i, 2, null), 0.5)), { dy: 20 });
      popIn(ok2, P(t, ts(i, 2, null, 0.3), 0.4));
      const p2 = eo(P(t, ts(i, 2, 'separate'), 0.5)); lic2.style.opacity = 0.6 * p2; lic2.style.transform = 'translateY(' + (1 - p2) * 20 + 'px)';
      popIn(no, P(t, ts(i, 2, 'separate', 0.3), 0.5));
    };
  };
  B.s04 = i => {
    const el = sceneEl(); const o = os('s04');
    const L = leftCol(i, el, { pill: o[0], heading: o[1], items: [{ text: o[2], a: [1, null] }, { text: o[3], a: [1, 'the token is designed'] }] });
    const c = card(el, C.mintSoft);
    const per = icon(c, 'person', 150, 230, 175), bld = icon(c, 'fund', 150, 540, 175);
    const okA = badge(c, 'ok', 58, 295, 240), okB = badge(c, 'ok', 58, 605, 240);
    const ring = mk('div', 'icon', c); at(ring, 235, 320);
    ring.innerHTML = '<svg width="300" height="300" viewBox="0 0 300 300" fill="none"><circle class="f" cx="150" cy="150" r="118" fill="' + C.mint +
      '"/><circle class="r" cx="150" cy="150" r="118" stroke="' + C.ink + '" stroke-width="4"/><circle class="in" cx="150" cy="150" r="66" stroke="' + C.ink + '" stroke-width="4"/></svg>';
    const rf = ring.querySelector('.f'), rr = ring.querySelector('.r'), ri = ring.querySelector('.in');
    const RL = 2 * Math.PI * 118; rr.style.strokeDasharray = RL;
    const chipA = tile(c, 'fund', 92, 160, 470), chipR = tile(c, 'rules', 92, 610, 470);
    return t => {
      const t0 = WIN[i].a; L(t);
      show(c, eo(P(t, t0 + 0.15, 0.6)), { dx: 40 });
      show(per, eo(P(t, t0 + 0.4, 0.5)), { dy: 16 }); show(bld, eo(P(t, t0 + 0.5, 0.5)), { dy: 16 });
      popIn(okA, P(t, ts(i, 1, 'manager'), 0.4)); popIn(okB, P(t, ts(i, 1, 'fund are verified'), 0.4));
      const td = ts(i, 1, 'the token is designed') - 0.3;
      rr.style.strokeDashoffset = RL * (1 - eio(P(t, td, 0.9)));
      rf.style.opacity = eo(P(t, td + 0.8, 0.5)); ri.style.opacity = eo(P(t, td + 0.8, 0.5));
      show(chipA, eo(P(t, td + 1.0, 0.5)), { dx: -30 }); show(chipR, eo(P(t, td + 1.2, 0.5)), { dx: 30 });
    };
  };
  B.s05 = i => {
    const el = sceneEl(); const o = os('s05');
    const L = leftCol(i, el, { pill: o[0], heading: o[1], items: [
      { text: o[2], a: [1, 'Identity checks'] }, { text: o[3], a: [1, 'who may invest'] },
      { text: o[4], a: [1, 'transfer limits'] }, { text: o[5], a: [1, 'enforced automatically'] }] });
    const c = card(el, C.mist);
    const tok = mk('div', 'icon', c); at(tok, 400, 180);
    tok.innerHTML = '<svg width="280" height="280" viewBox="0 0 280 280"><circle cx="140" cy="140" r="124" fill="' + C.mint + '" stroke="' + C.ink +
      '" stroke-width="4"/><circle cx="140" cy="140" r="76" fill="none" stroke="' + C.ink + '" stroke-width="4"/></svg>';
    const chips = ['idcard', 'eligible', 'limit'].map((n, k) => tile(c, n, 104, 150, 150 + k * 170));
    const marks = [0, 1, 2].map(k => {
      const m = mk('div', 'icon', c); m.style.width = m.style.height = '24px'; m.style.borderRadius = '50%'; m.style.background = C.ink;
      const ang = -Math.PI / 2 + (k - 1) * 0.55; return at(m, 540 + Math.cos(ang) * 100 - 12, 320 + Math.sin(ang) * 100 - 12);
    });
    const shield = icon(c, 'shieldok', 124, 540, 540);
    const A = ['Identity checks', 'who may invest', 'transfer limits'];
    return t => {
      const t0 = WIN[i].a; L(t);
      show(c, eo(P(t, t0 + 0.15, 0.6)), { dx: 40 });
      show(tok, eo(P(t, t0 + 0.4, 0.6)), { s0: 0.85 });
      chips.forEach((ch, k) => {
        const ta = ts(i, 1, A[k]), pin = eo(P(t, ta - 0.1, 0.4)), pm = eio(P(t, ta + 0.5, 0.7));
        const x = lerp(150, 540, pm), y = lerp(150 + k * 170, 320, pm);
        at(ch, x - 52, y - 52); ch.style.opacity = pin * (1 - P(t, ta + 1.0, 0.25)); ch.style.transform = 'scale(' + lerp(1, 0.4, pm) + ')';
        popIn(marks[k], P(t, ta + 1.1, 0.4));
      });
      popIn(shield, P(t, ts(i, 1, 'enforced automatically'), 0.6));
    };
  };
  B.s06 = i => {
    const el = sceneEl(); const o = os('s06');
    const L = leftCol(i, el, { pill: o[0], heading: o[1], items: [
      { text: o[2], a: [1, 'verifies their identity'] }, { text: o[3], a: [1, 'gets a digital wallet'] }, { text: o[4], a: [2, null] }] });
    const c = card(el, C.sky);
    const R = [0, 1, 2].map(k => {
      const y = 150 + k * 170;
      const conn = mk('div', 'abs', c); at(conn, 190, y - 2); conn.style.width = '360px'; conn.style.height = '0'; conn.style.borderTop = '4px dashed ' + C.line;
      return { conn, per: icon(c, 'person', 96, 130, y), ok: badge(c, 'ok', 46, 172, y + 36), wal: icon(c, 'wallet', 96, 370, y),
        tok: icon(c, 'token', 88, 600, y), lock: badge(c, 'lock', 50, 642, y + 32) };
    });
    return t => {
      const t0 = WIN[i].a; L(t);
      show(c, eo(P(t, t0 + 0.15, 0.6)), { dx: 40 });
      const tI = ts(i, 1, 'verifies their identity'), tW = ts(i, 1, 'gets a digital wallet'), tN = ts(i, 2, null);
      R.forEach((r, k) => {
        show(r.per, eo(P(t, t0 + 0.4 + k * 0.1, 0.5)), { dx: -20 });
        r.conn.style.opacity = eo(P(t, t0 + 0.6 + k * 0.1, 0.5));
        const pt = eo(P(t, t0 + 0.7 + k * 0.1, 0.5)); r.tok.style.opacity = 0.45 * pt; popIn(r.lock, P(t, t0 + 0.8 + k * 0.1, 0.4));
        popIn(r.ok, P(t, tI + k * 0.25, 0.4));
        show(r.wal, eo(P(t, tW + k * 0.25, 0.5)), { dx: -20 });
        const pu = Math.sin(Math.PI * P(t, tN + k * 0.12, 0.6));
        r.lock.style.transform = 'scale(' + (1 + 0.2 * pu) + ')';
      });
    };
  };
  B.s07 = i => {
    const el = sceneEl(); const o = os('s07');
    const L = leftCol(i, el, { pill: null, heading: o[0], items: [{ text: o[1], a: [0, 'into verified wallets'] }, { text: o[2], a: [1, null] }] });
    const c = card(el, C.mintSoft);
    const plat = tile(c, 'window', 130, 120, 250);
    const line = mk('div', 'abs', c); at(line, 200, 248); line.style.width = '330px'; line.style.height = '4px'; line.style.background = C.ink;
    line.style.transformOrigin = 'left center';
    const nodes = [0, 1, 2, 3].map(k => {
      const n = mk('div', 'abs', c); n.style.width = n.style.height = '20px'; n.style.borderRadius = '50%'; n.style.background = '#ffffff';
      n.style.border = '4px solid ' + C.ink; return at(n, 200 + k * 110 - 10, 250 - 10);
    });
    const WY = [110, 250, 390];
    const wal = WY.map(y => icon(c, 'wallet', 100, 650, y));
    const wok = WY.map(y => badge(c, 'ok', 42, 692, y + 36));
    const toks = WY.map(() => coin(c, 40));
    const reg = mk('div', 'tile', c); at(reg, 80, 480); reg.style.width = '610px'; reg.style.height = '120px'; reg.style.display = 'block';
    const regRows = [0, 1, 2].map(k => {
      const r = mk('div', 'abs', reg); at(r, 26 + k * 196, 28); r.style.width = '180px'; r.style.height = '60px';
      r.innerHTML = '<div style="position:absolute;left:0;top:22px;width:104px;height:16px;border-radius:8px;background:' + C.mist + '"></div>';
      return { r, b: badge(r, 'ok', 44, 138, 30) };
    });
    return t => {
      const t0 = WIN[i].a, s0 = SC[i].sentences[0].start, s1 = SC[i].sentences[1].start; L(t);
      show(c, eo(P(t, t0 + 0.15, 0.6)), { dx: 40 });
      show(plat, eo(P(t, t0 + 0.4, 0.5)), { dy: 16 });
      line.style.transform = 'scaleX(' + eio(P(t, t0 + 0.6, 0.8)) + ')';
      nodes.forEach((n, k) => popIn(n, P(t, t0 + 0.7 + k * 0.15, 0.35)));
      wal.forEach((w, k) => show(w, eo(P(t, t0 + 0.8 + k * 0.1, 0.5)), { dx: 20 }));
      toks.forEach((d, k) => {
        const st = s0 + 0.6 + k * 0.5, p = P(t, st, 1.6); let x, y;
        if (p < 0.7) { const q = eio(p / 0.7); x = lerp(200, 530, q); y = 250; }
        else { const q = eio((p - 0.7) / 0.3); x = lerp(530, 608, q); y = lerp(250, WY[k], q); }
        at(d, x - 20, y - 20); d.style.opacity = (p > 0 && p < 1) ? 1 : 0;
        popIn(wok[k], P(t, st + 1.6, 0.4));
      });
      show(reg, eo(P(t, t0 + 0.8, 0.5)), { dy: 16 });
      regRows.forEach(({ b }, k) => popIn(b, P(t, s1 + 0.3 + k * 0.3, 0.4)));
    };
  };
  B.s08 = i => {
    const el = sceneEl(); const o = os('s08');
    const L = leftCol(i, el, { pill: null, heading: o[0], items: [{ text: o[1], a: [0, 'breaches are rejected'] }, { text: o[2], a: [1, null] }] });
    const c = card(el, C.mist);
    const g1 = mk('div', 'abs', c); at(g1, 185, 298); g1.style.width = '400px'; g1.style.borderTop = '4px dashed ' + C.line;
    const g2 = mk('div', 'abs', c); at(g2, 185, 468); g2.style.width = '400px'; g2.style.borderTop = '4px dashed ' + C.line;
    const wl = icon(c, 'wallet', 110, 120, 300), gate = icon(c, 'shield', 130, 385, 300), wr = icon(c, 'wallet', 110, 650, 300);
    const tokA = coin(c, 40), tokB = coin(c, 40);
    const cash = icon(c, 'cash', 76, 0, 0); cash.style.opacity = 0;
    const no = badge(c, 'no', 56, 440, 248), okG = badge(c, 'ok', 56, 440, 248), clock = icon(c, 'clock', 92, 385, 110);
    const okL = badge(c, 'ok', 44, 165, 342), okR = badge(c, 'ok', 44, 695, 342);
    return t => {
      const t0 = WIN[i].a; L(t);
      show(c, eo(P(t, t0 + 0.15, 0.6)), { dx: 40 });
      [wl, gate, wr].forEach((e, k) => show(e, eo(P(t, t0 + 0.4 + k * 0.12, 0.5)), { dy: 16 }));
      g1.style.opacity = eo(P(t, t0 + 0.6, 0.5));
      const r0 = ts(i, 0, null, 0.4), pr = P(t, r0, 1.2), bk = P(t, ts(i, 0, 'breaches are rejected', 0.5), 0.6);
      let xa = lerp(175, 330, eio(clamp(pr / 0.8))); if (bk > 0) xa = lerp(330, 175, eio(bk));
      at(tokA, xa - 20, 280); tokA.style.opacity = (pr > 0 && bk < 1) ? 1 : 0;
      popIn(no, P(t, ts(i, 0, 'breaches are rejected'), 0.4)); no.style.opacity = (+no.style.opacity) * (1 - P(t, ts(i, 1, null), 0.3));
      g2.style.opacity = eo(P(t, ts(i, 1, null), 0.4));
      const s1 = ts(i, 1, 'transfer and payment', -0.2), pm = eio(P(t, s1, 1.8));
      at(tokB, lerp(175, 595, pm) - 20, 280); tokB.style.opacity = (pm > 0 && pm < 1) ? 1 : 0;
      at(cash, lerp(595, 175, pm) - 38, 468 - 38); cash.style.opacity = (pm > 0 && pm < 1) ? 1 : 0;
      popIn(okG, P(t, s1 + 0.8, 0.4)); okG.style.opacity = (+okG.style.opacity) * (1 - P(t, s1 + 2.2, 0.3));
      popIn(clock, P(t, ts(i, 1, 'in seconds'), 0.5));
      popIn(okL, P(t, s1 + 1.8, 0.4)); popIn(okR, P(t, s1 + 1.8, 0.4));
    };
  };
  B.s09 = i => {
    const el = sceneEl(); const o = os('s09');
    const logos = mk('div', 'logos', el); at(logos, 0, 300);
    logos.innerHTML = '<img alt="" src="' + LOGO.tokeniser + '" style="height:62px;width:' + Math.round(62 * LOGO.tokeniserRatio) +
      'px"><div class="vdiv"></div><img alt="" src="' + LOGO.redbelly + '" style="height:96px;width:' + Math.round(96 * LOGO.redbellyRatio) + 'px">';
    const l0 = mk('div', 'sub', el, o[0]); l0.style.top = '470px'; l0.style.fontSize = '60px'; l0.style.fontWeight = '700'; l0.style.color = C.ink;
    const l1 = mk('div', 'sub', el, o[1]); l1.style.top = '565px';
    const l2 = mk('div', 'centerrow', el); l2.style.top = '650px'; badge(l2, 'ok', 48); mk('div', 'rowtext', l2, o[2]);
    const l3 = mk('div', 'sub', el, o[3]); l3.style.top = '770px'; l3.style.color = C.navy; l3.style.fontWeight = '600';
    return t => {
      const t0 = WIN[i].a;
      show(logos, eo(P(t, t0 + 0.2, 0.7)), { dy: 20 });
      show(l0, eo(P(t, ts(i, 0, null), 0.6)), { dy: 20 });
      show(l1, eo(P(t, ts(i, 0, "Australia's"), 0.6)), { dy: 20 });
      show(l2, eo(P(t, ts(i, 0, 'where transactions'), 0.6)), { dy: 20 });
      show(l3, eo(P(t, SC[i].end + 0.3, 0.6)), { dy: 16 });
    };
  };

  // stage tracker
  function tracker() {
    const T = S.globals.tracker, NX = [450, 790, 1130, 1470], NY = 96, NR = 22;
    const root = mk('div', 'abs', stage); root.style.left = '0'; root.style.top = '0'; root.style.width = '1920px'; root.style.height = '200px';
    const segs = [0, 1, 2].map(k => {
      const bg = mk('div', 'abs', root); at(bg, NX[k] + NR + 10, NY - 2); bg.style.width = (NX[k + 1] - NX[k] - 2 * NR - 20) + 'px';
      bg.style.height = '4px'; bg.style.background = C.line; bg.style.borderRadius = '2px';
      const fg = mk('div', 'abs', bg); fg.style.left = '0'; fg.style.top = '0'; fg.style.height = '4px'; fg.style.width = '100%';
      fg.style.background = C.ink; fg.style.transformOrigin = 'left center'; fg.style.borderRadius = '2px'; return fg;
    });
    const nodes = T.labels.map((lab, k) => {
      const n = mk('div', 'node', root, String(k + 1)); at(n, NX[k] - NR, NY - NR);
      const l = mk('div', 'nodelabel', root, lab); at(l, NX[k] - 150, NY + NR + 12); return { n, l };
    });
    const first = IDX[T.shown_in[0]], lastShown = IDX[T.shown_in[T.shown_in.length - 1]];
    const stageScene = T.labels.map(lab => S.scenes.findIndex(s => s.on_screen.indexOf(lab) >= 0));
    if (stageScene.some(x => x < 0)) throw new Error('tracker label missing from scene on_screen text');
    const tIn = ts(first, 0, 'in 4 stages', -0.3);
    return t => {
      const vis = eo(P(t, tIn, 0.6)) * (1 - eio(P(t, WIN[lastShown].b - XF / 2, XF)));
      root.style.opacity = vis; if (vis <= 0.001) return;
      nodes.forEach(({ n, l }, k) => {
        const sIdx = stageScene[k];
        const pa = eo(P(t, WIN[sIdx].a - 0.2, 0.5));
        const pd = k < 3 ? eo(P(t, WIN[stageScene[k + 1]].a - 0.2, 0.5)) : 0;
        n.style.background = pd > 0 ? mix(C.mint, C.ink, pd) : mix(C.paper, C.mint, pa);
        n.style.borderColor = mix(C.line, C.ink, pa);
        n.style.color = pd > 0 ? mix(C.mintInk, C.paper, pd) : mix(C.muted, C.mintInk, pa);
        n.style.transform = 'scale(' + (1 + 0.14 * Math.sin(Math.PI * pa)) + ')';
        l.style.color = mix(C.muted, C.ink, pa * (1 - pd));
        if (k < 3) segs[k].style.transform = 'scaleX(' + pd + ')';
      });
    };
  }

  // build after fonts load, then expose seek
  const ups = [], els = [];
  document.fonts.ready.then(() => {
    S.scenes.forEach((s, i) => {
      if (!B[s.id]) throw new Error('no layout for scene ' + s.id);
      ups.push(B[s.id](i)); els.push(stage.lastElementChild);
    });
    const trk = tracker();
    window.seek = t => {
      for (let i = 0; i < ups.length; i++) {
        const a = sceneAlpha(i, t); els[i].style.opacity = a; els[i].style.visibility = a > 0.001 ? 'visible' : 'hidden';
        if (a > 0.001) ups[i](t);
      }
      trk(t);
    };
    window.TOTAL = TOTAL; window.READY = true;
  }).catch(e => { window.ERROR = String(e); });
})();
