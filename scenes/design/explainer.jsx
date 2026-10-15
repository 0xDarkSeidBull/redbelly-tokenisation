// explainer.jsx, "From fund to token". One continuous world, one camera, one hero token.
// All on-screen words come from window.TK_DATA (generated verbatim from script.json).
// All timing comes from the voice timeline, mapped onto the section cues.
(function () {
const { useComposition, useTimeline, CompositionStage, Easing, useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakRadio } = window;
const DATA = window.TK_DATA;
// Words inside the illustrations come from ui_text in script.json; a missing key stops the render.
const UIX = (id, k) => { const sc = DATA.script.scenes.find(x => x.id === id); const v = sc && sc.ui ? sc.ui[k] : undefined; if (v == null) throw new Error('missing ui_text ' + id + '.' + k); return v; };
const OS = DATA.script.scenes.map(s => s.on_screen);
const TRK = DATA.script.tracker;
const VS = DATA.voice.scenes;
const TOTAL = DATA.voice.total;

const C = { ink: '#343740', muted: '#5e6270', navy: '#323b70', mint: '#a2ffc8', mintInk: '#20321f', sky: '#c8daee', mintSoft: '#d8fee5', mist: '#e8ebf2', line: '#bdc1cb', card2: '#3e424d', onDark: '#c9cdd8' };
const FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";
const ORDER = ['Intro', 'Meaning', 'Legal', 'Onboarding', 'Compliance', 'Register', 'Issuance', 'Transfers', 'Close'];
// World layout: each station is a 1920x1080 frame placed in one big plane.
const ST = { Intro: [0, 0], Meaning: [0, 1440], Legal: [2300, 1440], Onboarding: [4600, 1440], Compliance: [6900, 1440], Register: [9200, 1440], Issuance: [9200, 2880], Transfers: [9200, 4320], Close: [9200, 5760] };
const DARK = [[-4000, -4000, 8000, 5260], [8000, 2700, 5000, 1440], [8000, 5580, 5000, 4000]];
const BAND = { Meaning: [C.sky, 210, 790], Legal: [C.mintSoft, 250, 930], Onboarding: [C.sky, 250, 930], Compliance: [C.mintSoft, 250, 930], Register: [C.sky, 250, 930], Transfers: [C.mintSoft, 250, 930] };
const A0 = VS.map((s, i) => (i === 0 ? 0 : (VS[i - 1].end + s.start) / 2));
const SH = '0 1px 2px rgba(52,55,64,0.06), 0 10px 28px rgba(52,55,64,0.08), 0 36px 72px rgba(50,59,112,0.10)';
const SH_DK = '0 2px 6px rgba(0,0,0,0.22), 0 30px 70px rgba(0,0,0,0.38)';

const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const D2R = Math.PI / 180;
// The three motion curves. Every move in the piece goes through one of them.
const MOTION = {
  enter: u => Easing.easeOutCubic(cl(u)),
  draw: u => Easing.easeInOutCubic(cl(u)),
  pop: u => { const c = cl(u); return c <= 0 ? 0 : c >= 1 ? 1 : Easing.easeOutBack(c); },
};
const at = (T, t0, d = 0.6, kind = 'enter') => MOTION[kind]((T - t0) / d);
const fade = (p, dx = 0, dy = 0, s0 = 1) => ({ opacity: cl(p), transform: `translate(${(1 - p) * dx}px,${(1 - p) * dy}px) scale(${lerp(s0, 1, p)})` });
const bez = (a, b, c, d, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t * t * t * d[i]); };
const lerpC = (A, B, p) => A.map((v, i) => v + (B[i] - v) * cl(p));
const rgba = A => `rgba(${Math.round(A[0])},${Math.round(A[1])},${Math.round(A[2])},${(+A[3]).toFixed(3)})`;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, p) => rgba([...lerpC(hex(a), hex(b), p), 1]);
const bump = (T, t0, amp) => { const d = T - t0; return d < 0 || d > 1.2 ? 0 : amp * Math.exp(-7 * d) * Math.sin(16 * d); };
const shake = (T, t0) => { const d = T - t0; return d < 0 || d > 0.8 ? 0 : 14 * Math.exp(-6 * d) * Math.sin(42 * d); };
const arcD = (cx, cy, R, a0, a1) => { const P = a => [cx + R * Math.cos(a * D2R), cy + R * Math.sin(a * D2R)]; const [x0, y0] = P(a0), [x1, y1] = P(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
const hexD = (cx, cy, R) => 'M' + [0, 1, 2, 3, 4, 5].map(i => { const a = (-90 + 60 * i) * D2R; return `${(cx + R * Math.cos(a)).toFixed(2)} ${(cy + R * Math.sin(a)).toFixed(2)}`; }).join('L') + 'Z';

function darkAt(x, y) {
  let m = 0;
  for (const [rx, ry, rw, rh] of DARK) {
    const s = 160;
    const f = cl((x - rx) / s + 0.5) * cl((rx + rw - x) / s + 0.5) * cl((y - ry) / s + 0.5) * cl((ry + rh - y) / s + 0.5);
    if (f > m) m = f;
  }
  return m;
}

// Word timing: the moment a phrase is spoken, as a fraction through its sentence, mapped onto the section cue.
function makeW(CUES) {
  return (si, sj, phrase, off = 0) => {
    const s = VS[si].sentences[sj];
    let f = 0;
    if (phrase) { const k = s.text.indexOf(phrase); f = k < 0 ? 0 : k / s.text.length; }
    return CUES[ORDER[si]] + (s.start + f * (s.end - s.start) - A0[si]) + off;
  };
}

// ── Icons, drawn for this piece on a 64 grid ─────────────────────────────
const IC = {
  person: <><circle cx="32" cy="22" r="10" /><path d="M13 54c0-11 8.5-17 19-17s19 6 19 17" /></>,
  fund: <><path d="M8 24 32 10l24 14Z" /><path d="M11 29h42M16 34v14M26 34v14M38 34v14M48 34v14M12 48h40M9 54h46" /></>,
  doc: <><path d="M17 7h22l10 10v40H17Z" /><path d="M39 7v10h10M24 28h18M24 36h18M24 44h12" /></>,
  seal: <><circle cx="32" cy="25" r="14" /><circle cx="32" cy="25" r="7" /><path d="M25 37l-4 19 7-4 4 6 4-6 7 4-4-19" /></>,
  idcard: <><rect x="6" y="14" width="52" height="36" rx="6" /><circle cx="22" cy="29" r="6" /><path d="M13 43c0-5 4-7 9-7s9 2 9 7M38 26h13M38 33h13M38 40h8" /></>,
  wallet: <><path d="M14 20 40 11l4 9" /><rect x="8" y="20" width="48" height="34" rx="6" /><path d="M56 31H43a6 6 0 0 0 0 12h13" /></>,
  key: <><circle cx="21" cy="32" r="9" /><path d="M30 32h24M47 32v8M53 32v6" /></>,
  shield: <path d="M32 7l20 8v15c0 14-9 22-20 27-11-5-20-13-20-27V15Z" />,
  shieldok: <><path d="M32 7l20 8v15c0 14-9 22-20 27-11-5-20-13-20-27V15Z" /><path d="M23 32l7 7 12-13" /></>,
  rules: <><rect x="14" y="8" width="36" height="48" rx="5" /><path d="M21 22l3 3 5-6M34 22h10M21 34l3 3 5-6M34 34h10M21 46l3 3 5-6M34 46h10" /></>,
  pie: <><circle cx="32" cy="32" r="22" /><path d="M32 10v22l19 11" /></>,
  eligible: <><circle cx="26" cy="21" r="9" /><path d="M9 53c0-11 7-17 17-17 3.5 0 6.5.7 9 2" /><circle cx="46" cy="46" r="10" /><path d="M41 46l4 4 6-8" /></>,
  limit: <path d="M8 32h30M30 24l8 8-8 8M48 14v36" />,
  cash: <><rect x="6" y="18" width="52" height="30" rx="5" /><circle cx="32" cy="33" r="7" /><path d="M14 26v14M50 26v14" /></>,
  ledger: <><rect x="8" y="12" width="48" height="40" rx="6" /><path d="M8 24h48M8 36h48M24 12v40" /></>,
  plus: <path d="M32 18v28M18 32h28" />,
  check: <path d="M16 33l11 11 21-23" />,
  cross: <path d="M21 21l22 22M43 21 21 43" />,
};
function Ico({ n, s = 48, c = C.ink, w = 2.6, style }) {
  return <svg viewBox="0 0 64 64" width={s} height={s} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none', overflow: 'visible', ...style }}>{IC[n]}</svg>;
}
function LockIco({ s = 28, c = C.ink, w = 3, open = 0 }) {
  return (
    <svg viewBox="0 0 64 64" width={s} height={s} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', overflow: 'visible', flex: 'none' }}>
      <rect x="15" y="29" width="34" height="25" rx="5" />
      <path d="M22 29v-8c0-6 4.5-10 10-10s10 4 10 10v8" transform={`translate(0 ${-7 * open}) rotate(${-25 * open} 42 29)`} />
      <path d="M32 39v6" />
    </svg>
  );
}

// ── Building blocks ──────────────────────────────────────────────────────
function Frame({ n, children }) {
  return <div style={{ position: 'absolute', left: ST[n][0], top: ST[n][1], width: 1920, height: 1080 }}>{children}</div>;
}
function Band({ n }) {
  const [c, y0, y1] = BAND[n];
  return <div style={{ position: 'absolute', left: 0, top: y0, width: 1920, height: y1 - y0, background: c }} />;
}
function Box({ x, y, w, h, style, children }) {
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, ...style }}>{children}</div>;
}
function Card({ x, y, w, h, r = 28, dark, style, children }) {
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, boxSizing: 'border-box', background: dark ? C.card2 : '#ffffff', border: dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(52,55,64,0.06)', boxShadow: dark ? SH_DK : SH, ...style }}>{children}</div>;
}
function Label({ x, y, text, size = 18, weight = 600, c = C.ink, w, align, style }) {
  return <div style={{ position: 'absolute', left: x, top: y, width: w, textAlign: align, fontFamily: 'Montserrat, sans-serif', fontSize: size, fontWeight: weight, color: c, lineHeight: 1.2, whiteSpace: 'nowrap', ...style }}>{text}</div>;
}
function Bar({ x, y, w, h = 14, c = C.mist, style }) {
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: h / 2, background: c, ...style }} />;
}
function Tile({ x, y, s = 56, r = 16, bg = C.mist, border, children, style }) {
  return <div style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: r, background: bg, border, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>{children}</div>;
}
function Badge({ kind = 'ok', s = 48, p = 1, style }) {
  if (p <= 0.001) return null;
  const bg = kind === 'ok' ? C.mint : kind === 'no' ? C.ink : '#ffffff';
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', background: bg, flex: 'none', boxSizing: 'border-box', border: kind === 'lock' ? `2.5px solid ${C.ink}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: cl(p * 3), transform: `scale(${p})`, boxShadow: '0 4px 12px rgba(32,50,31,0.12)', ...style }}>
      {kind === 'ok' && <Ico n="check" s={s * 0.6} c={C.mintInk} w={7} />}
      {kind === 'no' && <Ico n="cross" s={s * 0.5} c="#ffffff" w={7} />}
      {kind === 'lock' && <LockIco s={s * 0.56} c={C.ink} w={4.5} />}
    </div>
  );
}
function Status({ x, y, s = 44, p, kind = 'ok', dark }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: s, height: s }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2.5px dashed ${dark ? 'rgba(255,255,255,0.3)' : 'rgba(52,55,64,0.25)'}`, boxSizing: 'border-box', opacity: 1 - cl(p * 2) }} />
      <div style={{ position: 'absolute', inset: 0 }}><Badge kind={kind} s={s} p={p} /></div>
    </div>
  );
}
function MiniCoin({ s = 30, p = 1 }) {
  if (p <= 0.001) return null;
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', background: 'radial-gradient(circle at 34% 30%, #effff6 0%, #a2ffc8 52%, #4fc78a 100%)', boxShadow: 'inset 0 0 0 1.5px rgba(22,84,52,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${p})`, opacity: cl(p * 3) }}>
      <div style={{ width: s * 0.5, height: s * 0.5, borderRadius: '50%', boxShadow: 'inset 0 0 0 1.5px rgba(22,84,52,0.3)' }} />
    </div>
  );
}
function Ripple({ x, y, p, r0 = 40, r1 = 140, color = '50,59,112', a = 0.5, w = 4 }) {
  if (!(p > 0 && p < 1)) return null;
  const r = lerp(r0, r1, MOTION.enter(p));
  return <div style={{ position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', border: `${w}px solid rgba(${color},${(a * (1 - p)).toFixed(3)})`, boxSizing: 'border-box', pointerEvents: 'none' }} />;
}

// Left text column used by the stage scenes and the issuance/transfer scenes.
function StageCopy({ T, dark, pill, pillAt, heading, headingAt, rows, top = 250, bottom = 930, headSize = 84 }) {
  return (
    <div style={{ position: 'absolute', left: 150, top, width: 760, height: bottom - top, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {pill ? (
        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px 10px 18px', borderRadius: 999, background: C.navy, color: '#ffffff', fontWeight: 600, fontSize: 26, lineHeight: 1.15, marginBottom: 26, ...fade(at(T, pillAt, 0.55), 0, 16) }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: C.mint }} />{pill}
        </div>
      ) : null}
      <div style={{ fontWeight: 700, fontSize: headSize, lineHeight: 1.04, letterSpacing: '-0.02em', color: dark ? '#ffffff' : C.ink, textWrap: 'balance', ...fade(at(T, headingAt, 0.7), 0, 26) }}>{heading}</div>
      {rows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 44 }}>
          {rows.map((r, i) => <CopyRow key={i} T={T} dark={dark} {...r} />)}
        </div>
      ) : null}
    </div>
  );
}
function CopyRow({ T, dark, text, t, badgeAt, kind = 'ok' }) {
  const pb = at(T, badgeAt, 0.5, 'pop');
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, ...fade(at(T, t, 0.6), -18, 0) }}>
      <div style={{ position: 'relative', width: 50, height: 50, flex: 'none', marginTop: -2 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2.5px solid ${dark ? 'rgba(255,255,255,0.28)' : 'rgba(52,55,64,0.2)'}`, boxSizing: 'border-box', opacity: 1 - cl(pb) }} />
        <div style={{ position: 'absolute', inset: 0 }}><Badge kind={kind} s={50} p={pb} /></div>
      </div>
      <div style={{ fontWeight: 500, fontSize: 36, lineHeight: 1.28, color: dark ? '#eef0f4' : C.ink, textWrap: 'pretty' }}>{text}</div>
    </div>
  );
}

// ── The hero: a 3D mint token, projected from a real disc orientation ────
function Token({ x, y, r, yaw = 18, pitch = 10, roll = 0, th = 0.22, op = 1, dk = 0, uid }) {
  if (!(r > 0.5) || op <= 0.002) return null;
  const a = pitch * D2R, b = yaw * D2R;
  const nx = Math.cos(a) * Math.sin(b), ny = Math.sin(a), nz = Math.cos(a) * Math.cos(b);
  const sp = Math.hypot(nx, ny);
  const alpha = sp > 1e-5 ? Math.atan2(ny, nx) / D2R : 0;
  const s = nz >= 0 ? 1 : -1, az = Math.max(Math.abs(nz), 0.004);
  const off = (th * r * sp) / 2, fx = s * off, hx = -s * off, rx = r * az;
  const rot = alpha + roll;
  const cr = Math.cos(-rot * D2R), sr = Math.sin(-rot * D2R);
  const lx = -0.55 * cr + 0.83 * sr, ly = -0.55 * sr - 0.83 * cr;
  const bright = cl(s * (nx * -0.42 + ny * -0.62 + nz * 0.66));
  const glint = Math.pow(bright, 3);
  const f0 = mixHex(C.mint, '#ffffff', 0.25 + 0.5 * bright), f1 = mixHex(C.mint, '#ffffff', 0.15 * bright), f2 = mixHex(C.mint, '#36b374', 0.62 - 0.3 * bright);
  const lit = ly < 0;
  const V = 1.75 * r, u = k => `url(#${uid + k})`;
  const reeds = [];
  if (off > 0.6) for (let i = 0; i < 20; i++) {
    const be = -Math.PI / 2 + (Math.PI * (i + 0.5)) / 20, yy = r * Math.sin(be), ex = -s * rx * Math.cos(be);
    reeds.push(<line key={i} x1={hx + ex} y1={yy} x2={fx + ex} y2={yy} stroke="rgba(16,72,44,0.2)" strokeWidth={Math.max(0.7, 0.012 * r)} />);
  }
  const e1 = 0.022 * r;
  const ring = (rho, dx, dy, stroke, w, fill, k) => <ellipse key={k} cx={fx + dx * az} cy={dy} rx={rx * rho} ry={r * rho} fill={fill || 'none'} stroke={stroke} strokeWidth={w} />;
  return (
    <svg viewBox={`${-V} ${-V} ${2 * V} ${2 * V}`} style={{ position: 'absolute', left: x - V, top: y - V, width: 2 * V, height: 2 * V, overflow: 'visible', opacity: op, pointerEvents: 'none' }}>
      <defs>
        <radialGradient id={uid + 'hl'}><stop offset="0" stopColor="#ffffff" stopOpacity={0.9 * (1 - dk)} /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
        <radialGradient id={uid + 'hd'}><stop offset="0" stopColor={C.mint} stopOpacity={0.3 * dk} /><stop offset="1" stopColor={C.mint} stopOpacity="0" /></radialGradient>
        <radialGradient id={uid + 'sh'}><stop offset="0" stopColor="#1e2436" stopOpacity={0.26 * (1 - 0.6 * dk)} /><stop offset="1" stopColor="#1e2436" stopOpacity="0" /></radialGradient>
        <linearGradient id={uid + 'f'} gradientUnits="userSpaceOnUse" x1={fx + lx * rx} y1={ly * r} x2={fx - lx * rx} y2={-ly * r}>
          <stop offset="0" stopColor={f0} /><stop offset="0.55" stopColor={f1} /><stop offset="1" stopColor={f2} />
        </linearGradient>
        <linearGradient id={uid + 'c'} gradientUnits="userSpaceOnUse" x1={fx + lx * rx * 0.5} y1={ly * r * 0.5} x2={fx - lx * rx * 0.5} y2={-ly * r * 0.5}>
          <stop offset="0" stopColor={mixHex(C.mint, '#ffffff', 0.55 + 0.3 * bright)} /><stop offset="1" stopColor={mixHex(C.mint, '#45bf80', 0.35)} />
        </linearGradient>
        <linearGradient id={uid + 'r'} gradientUnits="userSpaceOnUse" x1="0" y1={lit ? -r : r} x2="0" y2={lit ? r : -r}>
          <stop offset="0" stopColor="#9af3c2" /><stop offset="0.45" stopColor="#5fd29a" /><stop offset="1" stopColor="#2a8f5c" />
        </linearGradient>
        <radialGradient id={uid + 'g'}><stop offset="0" stopColor="#ffffff" stopOpacity={0.8 * glint} /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
      </defs>
      <circle r={1.7 * r} fill={u('hd')} />
      <circle r={1.55 * r} fill={u('hl')} />
      <ellipse cx="0" cy={1.3 * r} rx={0.85 * r} ry={0.15 * r} fill={u('sh')} />
      <g transform={`rotate(${rot})`}>
        <ellipse cx={hx} cy="0" rx={rx} ry={r} fill={u('r')} stroke="rgba(16,60,38,0.35)" strokeWidth="1.2" />
        <rect x={Math.min(hx, fx)} y={-r} width={Math.abs(fx - hx)} height={2 * r} fill={u('r')} />
        <line x1={hx} y1={-r} x2={fx} y2={-r} stroke="rgba(16,60,38,0.35)" strokeWidth="1.2" />
        <line x1={hx} y1={r} x2={fx} y2={r} stroke="rgba(16,60,38,0.35)" strokeWidth="1.2" />
        {reeds}
        <ellipse cx={fx} cy="0" rx={rx} ry={r} fill={u('f')} />
        {ring(0.85, -lx * e1, -ly * e1, 'rgba(22,84,52,0.32)', 0.034 * r, null, 'a')}
        {ring(0.85, lx * e1, ly * e1, 'rgba(255,255,255,0.7)', 0.022 * r, null, 'b')}
        {ring(0.5, 0, 0, 'none', 0, u('c'), 'c')}
        {ring(0.5, -lx * e1, -ly * e1, 'rgba(22,84,52,0.3)', 0.03 * r, null, 'd')}
        {ring(0.5, lx * e1, ly * e1, 'rgba(255,255,255,0.75)', 0.018 * r, null, 'e')}
        {ring(0.27, 0, 0, 'rgba(22,84,52,0.24)', 0.03 * r, null, 'f')}
        <ellipse cx={fx + lx * 0.34 * rx} cy={ly * 0.34 * r} rx={0.56 * rx} ry={0.42 * r} fill={u('g')} />
        <ellipse cx={fx} cy="0" rx={rx} ry={r} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={0.016 * r} />
      </g>
    </svg>
  );
}

// ── Stage tracker (screen space) ─────────────────────────────────────────
const TL_LT = { cont: [255, 255, 255, 0.97], border: [52, 55, 64, 0.08], fut: [255, 255, 255, 1], futB: [189, 193, 203, 1], futN: [94, 98, 112, 1], lab: [94, 98, 112, 1], labOn: [52, 55, 64, 1], done: [50, 59, 112, 1], doneN: [255, 255, 255, 1], conn: [223, 226, 232, 1], connF: [50, 59, 112, 1] };
const TL_DK = { cont: [255, 255, 255, 0.07], border: [255, 255, 255, 0.14], fut: [255, 255, 255, 0], futB: [255, 255, 255, 0.35], futN: [255, 255, 255, 0.78], lab: [201, 205, 216, 1], labOn: [255, 255, 255, 1], done: [255, 255, 255, 1], doneN: [52, 55, 64, 1], conn: [255, 255, 255, 0.18], connF: [255, 255, 255, 0.9] };
function Tracker({ T, W, CUES, dk }) {
  const tIn = W(0, 0, 'in 4 stages', -0.35), tOut = CUES.Transfers - 0.4;
  const pin = at(T, tIn, 0.7), pout = at(T, tOut, 0.6, 'draw');
  if (pin <= 0.001 || pout >= 0.999) return null;
  const act = [2, 3, 4, 5].map(i => W(i, 0, null, -0.1));
  const allDone = CUES.Issuance - 0.2;
  const M = k => lerpC(TL_LT[k], TL_DK[k], dk);
  const MINT = [162, 255, 200, 1], MINK = [32, 50, 31, 1];
  return (
    <div style={{ position: 'absolute', left: 0, top: 40, width: 1920, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity: pin * (1 - pout), transform: `translateY(${(1 - pin) * -24 - pout * 40}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 84, padding: '0 32px', borderRadius: 999, boxSizing: 'border-box', background: rgba(M('cont')), border: `1px solid ${rgba(M('border'))}`, boxShadow: `0 12px 34px rgba(52,55,64,${(0.1 * (1 - dk)).toFixed(3)})`, transform: `scale(${lerp(0.94, 1, pin)})` }}>
        {TRK.map((lab, k) => {
          const pa = at(T, act[k], 0.5), pd = at(T, k < 3 ? act[k + 1] : allDone, 0.5);
          const ps = at(T, tIn + 0.2 + 0.13 * k, 0.45);
          const fill = lerpC(lerpC(M('fut'), MINT, pa), M('done'), pd);
          const bord = lerpC(lerpC(M('futB'), MINT, pa), M('done'), pd);
          const num = lerpC(lerpC(M('futN'), MINK, pa), M('doneN'), pd);
          const glow = pa * (1 - pd), pulse = Math.sin(Math.PI * cl((T - act[k]) / 0.7));
          const pc = k < 3 ? at(T, act[k + 1] - 0.15, 0.6, 'draw') : 0;
          const pcIn = at(T, tIn + 0.3 + 0.13 * k, 0.5, 'draw');
          return (
            <React.Fragment key={k}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...fade(ps, 0, 10) }}>
                <div style={{ width: 46, height: 46, borderRadius: 23, boxSizing: 'border-box', border: `2.5px solid ${rgba(bord)}`, background: rgba(fill), color: rgba(num), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, lineHeight: 1, boxShadow: `0 0 0 ${(7 + 5 * pulse).toFixed(2)}px rgba(162,255,200,${(0.38 * glow).toFixed(3)})`, transform: `scale(${1 + 0.12 * pulse * glow})` }}>{k + 1}</div>
                <div style={{ fontWeight: 600, fontSize: 24, lineHeight: 1, color: rgba(lerpC(M('lab'), M('labOn'), pa)), whiteSpace: 'nowrap' }}>{lab}</div>
              </div>
              {k < 3 ? (
                <div style={{ width: 56, height: 3, margin: '0 22px', borderRadius: 2, background: rgba(M('conn')), overflow: 'hidden', transform: `scaleX(${pcIn})`, transformOrigin: 'left center' }}>
                  <div style={{ width: '100%', height: '100%', background: rgba(M('connF')), transform: `scaleX(${pc})`, transformOrigin: 'left center' }} />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Stations ─────────────────────────────────────────────────────────────
const FUND_PATHS = ['M8 24 32 10l24 14Z', 'M11 29h42', 'M16 34v14', 'M26 34v14', 'M38 34v14', 'M48 34v14', 'M12 48h40', 'M9 54h46'];
function sIntro({ T, W }) {
  const os = OS[0];
  const tb = W(0, 0, 'becomes a token', -0.2), tSub = W(0, 0, 'on Redbelly Network', -0.3);
  const draw = at(T, 0.5, 1.7, 'draw'), out = at(T, tb, 0.5);
  return {
    back: (
      <Frame n="Intro">
        <Box x={0} y={600} w={1920} h={300} style={{ background: C.navy }} />
        <svg viewBox="0 0 64 64" width="250" height="250" fill="none" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 835, top: 285, overflow: 'visible', opacity: 1 - out, transform: `scale(${1 - 0.55 * out})` }}>
          {FUND_PATHS.map((d, i) => { const q = cl(draw * 1.6 - i * 0.08); return <path key={i} d={d} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - q} opacity={q > 0.001 ? 1 : 0} />; })}
        </svg>
        <Ripple x={960} y={410} p={cl((T - tb - 0.3) / 1.2)} r0={110} r1={300} color="162,255,200" a={0.55} w={3} />
        <Ripple x={960} y={410} p={cl((T - tb - 0.55) / 1.4)} r0={110} r1={430} color="162,255,200" a={0.35} w={2} />
        <div style={{ position: 'absolute', left: 0, top: 616, width: 1920, textAlign: 'center', fontWeight: 700, fontSize: 116, lineHeight: 1.04, letterSpacing: '-0.02em', color: '#ffffff', ...fade(at(T, 0.3, 0.9), 0, 34) }}>{os[0]}</div>
        <div style={{ position: 'absolute', left: 310, top: 770, width: 1300, textAlign: 'center', fontWeight: 500, fontSize: 40, lineHeight: 1.3, color: C.onDark, textWrap: 'balance', ...fade(at(T, tSub, 0.8), 0, 24) }}>{os[1]}</div>
      </Frame>
    ),
  };
}

const SLOTS = [1060, 1340, 1620], SLOT_Y = 500, SLOT_R = 80, ROWS2 = [432, 544, 656];
function meaningTimes(W) {
  const tE = W(1, 0, 'as digital tokens', -0.15), tR = W(1, 0, 'lets you program', 0), tC = W(1, 0, 'the rules of the asset', -0.1);
  return { tE, tR, tC, arr: k => tE + 0.22 * k + 0.7, click: k => tC + 0.18 * k + 0.4 };
}
function sMeaning({ T, W, CUES }) {
  const os = OS[1], a = CUES.Meaning, m = meaningTimes(W);
  const back = (
    <Frame n="Meaning">
      <Band n="Meaning" />
      <Card x={200} y={270} w={520} h={460} style={fade(at(T, a + 0.3, 0.8), -30, 0)}>
        <Tile x={28} y={26} s={52} r={14}><Ico n="ledger" s={30} /></Tile>
        <Label x={96} y={27} text={UIX('s02', 'reg_title')} size={21} weight={700} c={C.ink} />
        <Label x={96} y={56} text={UIX('s02', 'reg_sub')} size={15} weight={500} c={C.muted} />
        <Box x={28} y={100} w={464} h={1.5} style={{ background: '#eef0f5' }} />
        {ROWS2.map((cy, k) => {
          const t0 = m.tE + 0.22 * k;
          const hl = cl((T - t0) / 0.25) * (1 - cl((T - t0 - 0.6) / 0.5));
          return (
            <div key={k} style={{ position: 'absolute', left: 14, top: cy - 270 - 46, width: 492, height: 92, borderRadius: 18, background: `rgba(162,255,200,${(0.45 * hl).toFixed(3)})`, ...fade(at(T, a + 0.55 + 0.14 * k, 0.6), 0, 16) }}>
              <Tile x={14} y={16} s={60} r={30}><Ico n="person" s={36} /></Tile>
              <Label x={94} y={21} text={UIX('s02', 'row_' + (k + 1))} size={20} weight={600} c={C.ink} />
              <Label x={94} y={51} text={UIX('s02', 'row_sub')} size={15} weight={500} c={C.muted} />
              <div style={{ position: 'absolute', left: 378, top: 29, padding: '5px 16px', borderRadius: 14, background: C.mintSoft, color: C.mintInk, fontFamily: 'Montserrat, sans-serif', fontSize: 15, fontWeight: 600 }}>{UIX('s02', 'row_pill')}</div>
            </div>
          );
        })}
      </Card>
      {[0, 2].map(k => {
        const pr = at(T, m.arr(k) - 0.05, 0.55, 'pop');
        return <Token key={k} uid={'m2' + k} x={SLOTS[k]} y={SLOT_Y + 4 * Math.sin(1.7 * T + k)} r={SLOT_R * pr * (1 + bump(T, m.click(k), -0.07))} yaw={18 + 16 * Math.sin(1.05 * T + 0.6 + 1.3 * k)} pitch={10 + 4 * Math.sin(0.83 * T + k)} dk={0} />;
      })}
      <div style={{ position: 'absolute', left: 0, top: 836, width: 1920, textAlign: 'center', fontWeight: 700, fontSize: 54, lineHeight: 1.15, letterSpacing: '-0.01em', color: C.ink, ...fade(at(T, W(1, 0, 'records ownership', -0.15), 0.7), 0, 22) }}>{os[0]}</div>
      <div style={{ position: 'absolute', left: 0, top: 912, width: 1920, textAlign: 'center', fontWeight: 700, fontSize: 54, lineHeight: 1.15, letterSpacing: '-0.01em', color: C.ink, ...fade(at(T, m.tR - 0.1, 0.7), 0, 22) }}>{os[1]}</div>
    </Frame>
  );
  const front = (
    <Frame n="Meaning">
      {ROWS2.map((cy, k) => {
        const e = at(T, m.tE + 0.22 * k, 0.7, 'draw');
        if (!(e > 0 && e < 1)) return null;
        const p = bez([258, cy], [520, cy - 170], [SLOTS[k] - 170, 330], [SLOTS[k], SLOT_Y], e);
        return <div key={k} style={{ position: 'absolute', left: p[0] - 16, top: p[1] - 16 }}><MiniCoin s={32} /></div>;
      })}
      {[0, 1, 2].map(k => {
        const pA = at(T, m.tR + 0.12 * k, 0.5), pD = at(T, m.click(k) - 0.4, 0.4, 'draw');
        if (pA <= 0.001 || pD >= 0.999) return null;
        const x = SLOTS[k], y = lerp(312, SLOT_Y, pD), s = lerp(1, 0.2, pD);
        return (
          <div key={k} style={{ position: 'absolute', left: x - 40, top: y - 48, width: 80, height: 96, borderRadius: 14, background: '#ffffff', boxShadow: SH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pA * (1 - cl((pD - 0.75) / 0.25)), transform: `translateY(${(1 - pA) * -16}px) scale(${s})` }}>
            <Ico n="rules" s={48} c={C.navy} />
          </div>
        );
      })}
      {[0, 1, 2].map(k => <Ripple key={k} x={SLOTS[k]} y={SLOT_Y} p={cl((T - m.click(k)) / 0.6)} r0={82} r1={132} a={0.4} w={3} />)}
    </Frame>
  );
  return { back, front };
}

function legalTimes(W) { return { tS: W(2, 1, 'allow ownership', -0.1) }; }
function sLegal({ T, W, CUES }) {
  const os = OS[2], a = CUES.Legal, { tS } = legalTimes(W);
  const tL = W(2, 2, null, 0), tGh = W(2, 2, 'separate', 0.1), tNo = W(2, 2, 'licence', 0), tDim = W(2, 2, 'is needed', 0);
  const sweep = at(T, tS + 0.05, 0.6, 'draw'), pNo = at(T, tNo, 0.5, 'pop'), pGh = at(T, tGh, 0.5);
  const lines1 = [[128, 380], [158, 330], [188, 356]], lines2 = [[352, 368], [382, 300], [412, 340], [466, 380], [496, 220]];
  const back = (
    <Frame n="Legal">
      <Band n="Legal" />
      <StageCopy T={T} pill={os[0]} pillAt={W(2, 0, null, -0.2)} heading={os[1]} headingAt={W(2, 0, 'legal preparation', -0.2)}
        rows={[{ text: os[2], t: W(2, 1, 'documents', -0.25), badgeAt: W(2, 1, 'recorded on a blockchain', 0) }, { text: os[3], t: W(2, 2, null, 0.05), badgeAt: tDim }]} />
      <Card x={1010} y={270} w={460} h={620} r={22} style={fade(at(T, a + 0.45, 0.8), 40, 0)}>
        <Tile x={28} y={26} s={52} r={14}><Ico n="doc" s={32} /></Tile>
        <Label x={96} y={25} text={UIX('s03', 'doc_title')} size={22} weight={700} c={C.ink} />
        <Label x={96} y={55} text={UIX('s03', 'doc_sub')} size={15} weight={500} c={C.muted} />
        <Box x={28} y={100} w={404} h={1.5} style={{ background: '#eef0f5' }} />
        {lines1.map(([yy, w], i) => <Bar key={i} x={28} y={yy} w={w} h={12} />)}
        <div style={{ position: 'absolute', left: 16, top: 236, width: 428, height: 88, borderRadius: 14, overflow: 'hidden', background: 'rgba(232,235,242,0.55)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 428, height: 88, background: 'rgba(162,255,200,0.65)', transform: `scaleX(${sweep})`, transformOrigin: 'left center' }} />
          <Label x={18} y={16} text={UIX('s03', 'clause_title')} size={18} weight={700} c={C.ink} />
          <Label x={18} y={47} text={UIX('s03', 'clause_sub')} size={15} weight={500} c={C.ink} />
        </div>
        <Status x={384} y={260} s={40} p={at(T, tS + 0.1, 0.5, 'pop')} />
        {lines2.map(([yy, w], i) => <Bar key={i} x={28} y={yy} w={w} h={12} />)}
        <Bar x={28} y={566} w={150} h={3} c={C.line} />
      </Card>
      <Card x={1430} y={330} w={340} h={190} r={22} style={fade(at(T, tL, 0.6), 0, 26)}>
        <Tile x={24} y={24} s={64} r={32} bg={C.mintSoft}><Ico n="seal" s={40} /></Tile>
        <Label x={106} y={30} text={UIX('s03', 'lic_title')} size={20} weight={700} c={C.ink} />
        <Label x={106} y={60} text={UIX('s03', 'lic_sub')} size={15} weight={600} c={C.navy} />
        <Label x={24} y={116} text={UIX('s03', 'lic_line_1')} size={14} weight={500} c={C.muted} />
        <Label x={24} y={138} text={UIX('s03', 'lic_line_2')} size={14} weight={500} c={C.muted} />
        <Status x={280} y={20} s={36} p={at(T, tL + 0.45, 0.5, 'pop')} />
      </Card>
      <div style={{ position: 'absolute', left: 1430, top: 560, width: 340, height: 190, borderRadius: 22, border: '3px dashed rgba(52,55,64,0.3)', boxSizing: 'border-box', background: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pGh * lerp(1, 0.6, at(T, tDim, 0.6)), transform: `translateY(${(1 - pGh) * 20}px)` }}>
        <div style={{ position: 'absolute', opacity: 1 - cl(pNo * 2) }}><Ico n="plus" s={52} c={C.muted} w={3} /></div>
        <Badge kind="no" s={60} p={pNo} />
      </div>
    </Frame>
  );
  const front = <Frame n="Legal"><Ripple x={1414} y={550} p={cl((T - tS) / 0.8)} r0={34} r1={120} a={0.45} /></Frame>;
  return { back, front };
}

function onbTimes(W) { return { tD0: W(3, 1, 'the token is designed', -0.1) }; }
function sOnboarding({ T, W, CUES }) {
  const os = OS[3], a = CUES.Onboarding, { tD0 } = onbTimes(W);
  const tM = W(3, 1, 'manager', 0.35), tF = W(3, 1, 'are verified', 0.15);
  const pO = at(T, tD0 - 0.05, 0.8, 'draw'), pG = at(T, tD0, 0.5);
  const pc1 = at(T, tD0 + 0.3, 0.5, 'pop'), pc2 = at(T, tD0 + 0.45, 0.5, 'pop'), pl = at(T, tD0 + 0.45, 0.4, 'draw');
  const flash = cl((T - (tD0 + 0.65)) / 0.7);
  const entity = (x, icon, tt, k) => (
    <div key={k} style={{ position: 'absolute', left: x, top: 96, width: 346, height: 144, borderRadius: 18, background: '#f7f8fb', border: '1px solid #e9ecf2', boxSizing: 'border-box', ...fade(at(T, a + 0.8 + 0.12 * k, 0.6), 0, 16) }}>
      <Tile x={20} y={40} s={64} r={16} bg="#ffffff" border="1px solid #e8ebf2"><Ico n={icon} s={40} /></Tile>
      <Label x={104} y={44} text={UIX('s04', k === 0 ? 'mgr_title' : 'fund_title')} size={20} weight={700} c={C.ink} />
      <Label x={104} y={75} text={UIX('s04', 'entity_sub')} size={15} weight={500} c={C.muted} />
      <Status x={280} y={50} s={44} p={at(T, tt, 0.5, 'pop')} />
    </div>
  );
  const back = (
    <Frame n="Onboarding">
      <Band n="Onboarding" />
      <StageCopy T={T} pill={os[0]} pillAt={W(3, 0, null, -0.2)} heading={os[1]} headingAt={W(3, 0, 'platform onboarding', -0.2)}
        rows={[{ text: os[2], t: W(3, 1, 'manager', -0.2), badgeAt: tF + 0.2 }, { text: os[3], t: tD0, badgeAt: tD0 + 0.75 }]} />
      <Card x={1000} y={230} w={780} h={720} style={fade(at(T, a + 0.45, 0.8), 40, 0)}>
        <div style={{ position: 'absolute', left: 28, top: 20, width: 26, height: 26, borderRadius: 8, background: C.mint }} />
        <div style={{ position: 'absolute', left: 70, top: 22, display: 'flex', gap: 26, fontFamily: 'Montserrat, sans-serif', fontSize: 15, fontWeight: 600, color: C.muted, whiteSpace: 'nowrap' }}><span style={{ color: C.ink }}>{UIX('s04', 'tab_1')}</span><span>{UIX('s04', 'tab_2')}</span><span>{UIX('s04', 'tab_3')}</span></div>
        <div style={{ position: 'absolute', left: 722, top: 18, width: 30, height: 30, borderRadius: 15, background: C.mist }} />
        <Box x={0} y={66} w={780} h={1} style={{ background: '#eef0f5' }} />
        {entity(32, 'person', tM, 0)}
        {entity(402, 'fund', tF, 1)}
        <div style={{ position: 'absolute', left: 32, top: 268, width: 716, height: 420, borderRadius: 18, background: '#f4f6fa', border: '1px solid #e9ecf2', boxSizing: 'border-box', backgroundImage: 'radial-gradient(rgba(52,55,64,0.10) 1.4px, transparent 1.7px)', backgroundSize: '24px 24px', overflow: 'hidden', ...fade(at(T, a + 1.0, 0.6), 0, 16) }}>
          <svg width="716" height="420" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <g stroke="rgba(50,59,112,0.28)" strokeWidth="1.5" strokeDasharray="6 8" opacity={pG}>
              <line x1="24" y1="210" x2="692" y2="210" /><line x1="358" y1="20" x2="358" y2="400" />
            </g>
            <circle cx="358" cy="210" r="112" fill="none" stroke={C.navy} strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - pO} opacity={pO > 0.001 ? 1 : 0} transform="rotate(-90 358 210)" />
            <g stroke={C.navy} strokeWidth="2.5" strokeLinecap="round" opacity={pl > 0.001 ? 1 : 0}>
              <line x1="144" y1="210" x2={144 + 102 * pl} y2="210" />
              <line x1="572" y1="210" x2={572 - 102 * pl} y2="210" />
            </g>
            <circle cx="358" cy="210" r={112 + 60 * MOTION.enter(flash)} fill="none" stroke={C.navy} strokeWidth="3" opacity={flash > 0 && flash < 1 ? 0.5 * (1 - flash) : 0} />
          </svg>
          <Tile x={52} y={164} s={92} r={22} bg="#ffffff" style={{ boxShadow: SH, transform: `scale(${pc1})`, opacity: cl(pc1 * 3) }}><Ico n="pie" s={50} c={C.navy} /></Tile>
          <Label x={-54} y={266} text={UIX('s04', 'param_class')} size={16} weight={600} c={C.navy} w={200} align="center" style={{ opacity: cl(pc1 * 3) }} />
          <Tile x={572} y={164} s={92} r={22} bg="#ffffff" style={{ boxShadow: SH, transform: `scale(${pc2})`, opacity: cl(pc2 * 3) }}><Ico n="rules" s={50} c={C.navy} /></Tile>
          <Label x={518} y={266} text={UIX('s04', 'param_rules')} size={16} weight={600} c={C.navy} w={200} align="center" style={{ opacity: cl(pc2 * 3) }} />
          <Label x={22} y={16} text={UIX('s04', 'area_title')} size={16} weight={700} c={C.navy} style={{ opacity: pG }} />
        </div>
      </Card>
    </Frame>
  );
  return { back };
}

const RING_C = [1400, 540], RING_R = 178, BEAD_A = [-30, 90, 210], RULE_ICONS = ['idcard', 'eligible', 'limit'];
function compTimes(W) {
  return { tk: [W(4, 1, 'Identity checks', 0), W(4, 1, 'who may invest', 0), W(4, 1, 'transfer limits', 0)], tEnc: W(4, 1, 'are encoded into the token', 0), tAuto: W(4, 1, 'enforced automatically', -0.05) };
}
function sCompliance({ T, W, CUES }) {
  const os = OS[4], a = CUES.Compliance, { tk, tEnc, tAuto } = compTimes(W);
  const glowEnc = Math.sin(Math.PI * cl((T - tEnc) / 0.9));
  const pp = at(T, tAuto, 0.55, 'pop');
  const back = (
    <Frame n="Compliance">
      <Band n="Compliance" />
      <StageCopy T={T} top={250} bottom={570} pill={os[0]} pillAt={W(4, 0, null, -0.2)} heading={os[1]} headingAt={W(4, 0, 'compliance configuration', -0.2)} rows={[]} />
      <Card x={150} y={590} w={720} h={340} r={24} style={fade(at(T, a + 0.7, 0.7), 0, 24)}>
        <div style={{ position: 'absolute', left: 24, top: 16 }}><Ico n="shieldok" s={32} c={C.navy} /></div>
        <Label x={68} y={19} text={UIX('s05', 'rules_title')} size={19} weight={700} c={C.ink} />
        <Box x={0} y={62} w={720} h={1} style={{ background: '#eef0f5' }} />
        {RULE_ICONS.map((ic, k) => {
          const cy = 114 + 88 * k, pt = at(T, tk[k] + 0.3, 0.3, 'draw');
          return (
            <div key={k} style={{ position: 'absolute', left: 0, top: cy - 44, width: 720, height: 88, ...fade(at(T, tk[k] - 0.1, 0.5), -16, 0) }}>
              {k > 0 ? <Box x={24} y={0} w={672} h={1} style={{ background: '#f0f2f6' }} /> : null}
              <Tile x={24} y={16} s={56} r={14} style={{ opacity: 1 - 0.6 * cl((T - tk[k] - 0.4) / 0.2) }}><Ico n={ic} s={34} /></Tile>
              <div style={{ position: 'absolute', left: 100, top: 0, height: 88, display: 'flex', alignItems: 'center', fontWeight: 500, fontSize: 30, color: C.ink, whiteSpace: 'nowrap' }}>{os[2 + k]}</div>
              <div style={{ position: 'absolute', left: 632, top: 27, width: 62, height: 34, borderRadius: 17, background: mixHex('#e3e6ec', C.mint, pt) }}>
                <div style={{ position: 'absolute', left: lerp(3, 31, pt), top: 3, width: 28, height: 28, borderRadius: 14, background: '#ffffff', boxShadow: '0 2px 6px rgba(32,50,31,0.25)' }} />
              </div>
            </div>
          );
        })}
      </Card>
      <svg width="1920" height="1080" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
        {BEAD_A.map((am, k) => {
          const d = arcD(RING_C[0], RING_C[1], RING_R, am - 55, am + 55), pl = at(T, tk[k] + 1.05, 0.45, 'draw');
          return (
            <g key={k}>
              <path d={d} fill="none" stroke="rgba(52,55,64,0.12)" strokeWidth="10" strokeLinecap="round" opacity={at(T, a + 0.9, 0.6)} />
              <path d={d} fill="none" stroke={C.navy} strokeWidth={10 + 4 * glowEnc} strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - pl} opacity={pl > 0.001 ? 1 : 0} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: 'absolute', left: 1000, top: 788, width: 800, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px 14px 22px', borderRadius: 999, background: C.navy, color: '#ffffff', fontWeight: 600, fontSize: 30, lineHeight: 1.1, boxShadow: SH, opacity: cl(pp * 3), transform: `scale(${lerp(0.6, 1, pp)})` }}>
          <Ico n="shieldok" s={34} c={C.mint} w={3} />{os[5]}
        </div>
      </div>
    </Frame>
  );
  const front = (
    <Frame n="Compliance">
      {RULE_ICONS.map((ic, k) => {
        const t0 = tk[k] + 0.4;
        if (T < t0) return null;
        const e = at(T, t0, 0.75, 'draw');
        const from = [202, 704 + 88 * k], to = [RING_C[0] + RING_R * Math.cos(BEAD_A[k] * D2R), RING_C[1] + RING_R * Math.sin(BEAD_A[k] * D2R)];
        const x = lerp(from[0], to[0], e), y = lerp(from[1], to[1], e) - 140 * Math.sin(Math.PI * e), s = lerp(56, 50, e);
        return (
          <div key={k} style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: lerp(14, s / 2, e), background: '#ffffff', boxShadow: SH, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + bump(T, t0 + 0.75, 0.25) + 0.08 * glowEnc})` }}>
            <Ico n={ic} s={30} c={C.navy} />
          </div>
        );
      })}
    </Frame>
  );
  return { back, front };
}

const REG_Y = [482, 610, 738];
function regTimes(W, CUES) {
  return { tId: W(5, 1, 'verifies their identity', 0), tWl: W(5, 1, 'gets a digital wallet', 0), tN: W(5, 2, null, 0), tLk: CUES.Register + 1.0, tOpen: CUES.Issuance - 1.25 };
}
function sRegister({ T, W, CUES }) {
  const os = OS[5], a = CUES.Register, { tId, tWl, tN } = regTimes(W, CUES);
  const back = (
    <Frame n="Register">
      <Band n="Register" />
      <StageCopy T={T} pill={os[0]} pillAt={W(5, 0, null, -0.2)} heading={os[1]} headingAt={W(5, 0, 'the investor register', -0.2)}
        rows={[{ text: os[2], t: tId - 0.2, badgeAt: tId + 0.6 }, { text: os[3], t: tWl - 0.2, badgeAt: tWl + 0.6 }, { text: os[4], t: tN - 0.1, badgeAt: tN + 0.3, kind: 'lock' }]} />
      <Card x={990} y={262} w={740} h={600} style={fade(at(T, a + 0.45, 0.8), 40, 0)}>
        <Tile x={28} y={24} s={52} r={14}><Ico n="ledger" s={30} /></Tile>
        <Label x={96} y={24} text={UIX('s06', 'reg_title')} size={22} weight={700} c={C.ink} />
        <Label x={96} y={55} text={UIX('s06', 'reg_sub')} size={15} weight={500} c={C.muted} />
        <Label x={28} y={110} text={UIX('s06', 'col_investor')} size={15} weight={600} c={C.muted} />
        <div style={{ position: 'absolute', left: 415, top: 106 }}><Ico n="idcard" s={30} c={C.muted} w={3} /></div>
        <div style={{ position: 'absolute', left: 525, top: 106 }}><Ico n="wallet" s={30} c={C.muted} w={3} /></div>
        <div style={{ position: 'absolute', left: 636, top: 107, width: 28, height: 28, borderRadius: 14, border: `3px solid ${C.muted}`, boxSizing: 'border-box' }} />
        <Box x={0} y={150} w={740} h={1} style={{ background: '#eef0f5' }} />
        {REG_Y.map((sy, k) => {
          const cy = sy - 262, pi = at(T, tId + 0.28 * k, 0.5, 'pop'), pw = at(T, tWl + 0.28 * k, 0.5, 'pop');
          const pulse = Math.sin(Math.PI * cl((T - tN - 0.12 * k) / 0.6));
          return (
            <div key={k} style={{ position: 'absolute', left: 0, top: cy - 64, width: 740, height: 128, ...fade(at(T, a + 0.8 + 0.12 * k, 0.6), 0, 14) }}>
              {k > 0 ? <Box x={28} y={0} w={684} h={1} style={{ background: '#f0f2f6' }} /> : null}
              <Tile x={28} y={34} s={60} r={30}><Ico n="person" s={36} /></Tile>
              <Label x={104} y={41} text={UIX('s06', 'row_' + (k + 1))} size={20} weight={600} c={C.ink} />
              <Label x={104} y={70} text={UIX('s06', 'row_sub')} size={15} weight={500} c={C.muted} />
              <Status x={406} y={40} s={48} p={pi} />
              <div style={{ position: 'absolute', left: 512, top: 36, width: 56, height: 56 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 16, border: '2.5px dashed rgba(52,55,64,0.25)', boxSizing: 'border-box', opacity: 1 - cl(pw * 2) }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: '#ffffff', border: '1px solid #e1e5ec', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: cl(pw * 3), transform: `scale(${pw})` }}><Ico n="wallet" s={34} /></div>
              </div>
              <div style={{ position: 'absolute', left: 624, top: 38, width: 52, height: 52, borderRadius: 26, border: '2.5px dashed rgba(52,55,64,0.3)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + 0.14 * pulse})` }}><LockIco s={24} c={C.muted} w={4} /></div>
            </div>
          );
        })}
      </Card>
    </Frame>
  );
  return { back };
}

const NET_O = [1010, 450], NET_J = [1480, 450], WAL_Y = [330, 450, 570], SLOT_X = 1731;
const branch = j => e => bez(NET_J, [1560, 450], [1600, WAL_Y[j]], [SLOT_X, WAL_Y[j]], e);
function issTimes(W) { return { tI: W(6, 0, 'issued', 0), tF: W(6, 1, null, 0.15), tRec: W(6, 1, 'the official record', 0) }; }
function sIssuance({ T, W, CUES }) {
  const os = OS[6], a = CUES.Issuance, { tI, tF, tRec } = issTimes(W);
  const pBase = at(T, a + 0.6, 0.6), pl = at(T, tI - 0.05, 0.85, 'draw'), gRec = at(T, tRec, 0.5);
  const back = (
    <Frame n="Issuance">
      <Box x={0} y={330} w={1920} h={240} style={{ background: C.navy }} />
      <StageCopy T={T} dark heading={os[0]} headingAt={W(6, 0, null, -0.15)} headSize={76}
        rows={[{ text: os[1], t: W(6, 0, 'into verified wallets', -0.2), badgeAt: tI + 1.3 }, { text: os[2], t: tF - 0.1, badgeAt: tRec }]} />
      <svg width="1920" height="1080" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
        <circle cx={NET_O[0]} cy={NET_O[1]} r={86 + 6 * Math.sin(2.2 * T)} fill="none" stroke="rgba(162,255,200,0.45)" strokeWidth="2" opacity={pBase} />
        <line x1="1096" y1="450" x2="1480" y2="450" stroke="rgba(255,255,255,0.18)" strokeWidth="4" strokeLinecap="round" opacity={pBase} />
        <line x1="1096" y1="450" x2={lerp(1096, 1480, pl)} y2="450" stroke={C.mint} strokeWidth="4" strokeLinecap="round" opacity={pl > 0.001 ? 1 : 0} />
        {WAL_Y.map((wy, k) => {
          const d = `M1480 450C1540 450 1550 ${wy} 1605 ${wy}`, pb = at(T, tI + 0.8 + 0.35 * k, 0.45, 'draw');
          return (
            <g key={k}>
              <path d={d} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" strokeLinecap="round" opacity={pBase} />
              <path d={d} fill="none" stroke={C.mint} strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - pb} opacity={pb > 0.001 ? 1 : 0} />
            </g>
          );
        })}
        {[1180, 1290, 1400].map((hx, k) => {
          const lt = at(T, tI + (0.8 * (hx - 1010)) / 470 - 0.05, 0.3);
          return <path key={k} d={hexD(hx, 450, 14)} fill={mixHex('#343740', '#2f5a4a', lt)} stroke={rgba(lerpC([255, 255, 255, 0.4], [162, 255, 200, 1], lt))} strokeWidth="2.5" opacity={pBase} />;
        })}
      </svg>
      {WAL_Y.map((wy, k) => {
        const g = cl((T - (tI + 0.35 * k + 1.25)) / 0.3) * (1 - 0.6 * cl((T - (tI + 0.35 * k + 2.0)) / 0.8));
        return (
          <Card key={k} dark x={1605} y={wy - 50} w={170} h={100} r={18} style={{ ...fade(at(T, a + 0.8 + 0.12 * k, 0.6), 24, 0), boxShadow: `${SH_DK}, 0 0 0 2px rgba(162,255,200,${(0.9 * g).toFixed(3)})` }}>
            <div style={{ position: 'absolute', left: 16, top: 30 }}><Ico n="wallet" s={40} c="#ffffff" w={2.8} /></div>
            <div style={{ position: 'absolute', left: 44, top: 14 }}><Badge kind="ok" s={22} /></div>
            <div style={{ position: 'absolute', left: 100, top: 24, width: 52, height: 52, borderRadius: 26, border: '2.5px dashed rgba(255,255,255,0.3)', boxSizing: 'border-box' }} />
          </Card>
        );
      })}
      <Card dark x={1000} y={650} w={780} h={290} r={24} style={{ ...fade(at(T, a + 1.0, 0.7), 0, 24), boxShadow: `${SH_DK}, 0 0 0 2px rgba(162,255,200,${(0.85 * gRec).toFixed(3)})` }}>
        <Tile x={24} y={16} s={44} r={12} bg="rgba(255,255,255,0.08)"><Ico n="ledger" s={26} c="#ffffff" w={3} /></Tile>
        <Label x={84} y={25} text={UIX('s07', 'reg_title')} size={19} weight={700} c={'#ffffff'} />
        <Box x={0} y={74} w={780} h={1} style={{ background: 'rgba(255,255,255,0.08)' }} />
        {[0, 1, 2].map(k => {
          const cy = 112 + 62 * k, pf = at(T, tF + 0.5 * k, 0.5);
          return (
            <div key={k}>
              <Tile x={24} y={cy - 20} s={40} r={20} bg="rgba(255,255,255,0.08)"><Ico n="person" s={24} c="#ffffff" w={3} /></Tile>
              <Label x={84} y={cy - 12} text={UIX('s07', 'row_' + (k + 1))} size={18} weight={600} c={rgba(lerpC([255, 255, 255, 0.35], [255, 255, 255, 0.95], pf))} />
              <Label x={300} y={cy - 11} text={UIX('s07', 'row_sub')} size={16} weight={500} c={rgba(lerpC([255, 255, 255, 0.25], [162, 255, 200, 0.95], pf))} />
              <div style={{ position: 'absolute', left: 600, top: cy - 15 }}><MiniCoin s={30} p={at(T, tF + 0.5 * k + 0.1, 0.5, 'pop')} /></div>
              <div style={{ position: 'absolute', left: 716, top: cy - 15 }}><Badge kind="ok" s={30} p={at(T, tF + 0.5 * k + 0.25, 0.5, 'pop')} /></div>
            </div>
          );
        })}
      </Card>
      {[1, 2].map(j => {
        const s0 = tI + 0.35 * j, pr = at(T, s0 - 0.1, 0.35, 'pop');
        if (pr <= 0.001) return null;
        const e = at(T, s0, 1.25, 'draw');
        const p = e < 0.6 ? [lerp(NET_O[0], NET_J[0], e / 0.6), 450] : branch(j)((e - 0.6) / 0.4);
        return <Token key={j} uid={'m7' + j} x={p[0]} y={p[1]} r={pr * lerp(30, 24, e)} yaw={18 + 14 * Math.sin(1.1 * T + j)} pitch={10} dk={1} />;
      })}
    </Frame>
  );
  return { back };
}

const TA = [1080, 644], TB = [1745, 815], GATE = [1400, 600];
const RA = 'M1180 634L1330 604', RX = 'M1470 592C1540 592 1555 405 1610 405', RB = 'M1470 610C1540 610 1555 785 1610 785';
const swapPath = (e, side) => {
  let p;
  if (e < 0.45) { const q = e / 0.45; p = [lerp(TA[0], GATE[0], q), lerp(TA[1], GATE[1], q)]; }
  else p = bez(GATE, [1520, 600], [1590, TB[1]], TB, (e - 0.45) / 0.55);
  return [p[0], p[1] + side * 26 * Math.sin(Math.PI * e)];
};
function trfTimes(W) {
  return { tc: W(7, 0, 'is checked', 0), tRu: W(7, 0, 'against the rules', 0), tBr: W(7, 0, 'breaches are rejected', 0), tOwn: W(7, 1, 'hold their own wallet', 0), tp: W(7, 1, 'transfer and payment', -0.1), tSec: W(7, 1, 'in seconds', -0.05) };
}
function sTransfers({ T, W, CUES }) {
  const os = OS[7], a = CUES.Transfers, { tc, tRu, tBr, tOwn, tp, tSec } = trfTimes(W);
  const pIn = k => at(T, a + 0.5 + 0.12 * k, 0.7);
  const pA = at(T, tc, 0.45, 'draw'), pX = at(T, tc + 0.35, 0.6, 'draw'), pB = at(T, tOwn + 0.2, 0.6, 'draw');
  const routeX = rgba(lerpC([50, 59, 112, 1], [52, 55, 64, 0.18], at(T, tBr + 0.5, 0.6)));
  const pKey = at(T, tOwn, 0.5, 'pop');
  const back = (
    <Frame n="Transfers">
      <Band n="Transfers" />
      <StageCopy T={T} heading={os[0]} headingAt={W(7, 0, null, -0.15)}
        rows={[{ text: os[1], t: tBr - 0.25, badgeAt: tBr + 0.2, kind: 'no' }, { text: os[2], t: tOwn - 0.2, badgeAt: tp + 1.25 }]} />
      <svg width="1920" height="1080" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: pIn(0), pointerEvents: 'none' }}>
        <line x1="1400" y1="470" x2="1400" y2="730" stroke="rgba(50,59,112,0.22)" strokeWidth="3" strokeDasharray="4 10" strokeLinecap="round" />
        {[RA, RX, RB].map((d, i) => <path key={i} d={d} fill="none" stroke="rgba(52,55,64,0.26)" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" />)}
        <path d={RA} fill="none" stroke={C.navy} strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - pA} opacity={pA > 0.001 ? 1 : 0} />
        <path d={RX} fill="none" stroke={routeX} strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - pX} opacity={pX > 0.001 ? 1 : 0} />
        <path d={RB} fill="none" stroke={C.navy} strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - pB} opacity={pB > 0.001 ? 1 : 0} />
      </svg>
      <Card x={980} y={500} w={200} h={220} r={24} style={fade(pIn(0), 0, 20)}>
        <div style={{ position: 'absolute', left: 22, top: 22 }}><Ico n="wallet" s={44} /></div>
        <div style={{ position: 'absolute', left: 150, top: 18 }}><Badge kind="ok" s={30} /></div>
        <div style={{ position: 'absolute', left: 56, top: 100, width: 88, height: 88, borderRadius: 44, border: '2.5px dashed rgba(52,55,64,0.22)', boxSizing: 'border-box' }} />
      </Card>
      <div style={{ position: 'absolute', left: 1330, top: 530, width: 140, height: 140, borderRadius: 70, background: '#ffffff', boxShadow: SH, display: 'flex', alignItems: 'center', justifyContent: 'center', ...fade(pIn(1), 0, 0, 0.7) }}><Ico n="shield" s={60} /></div>
      <div style={{ position: 'absolute', left: 1610, top: 330, width: 190, height: 150, borderRadius: 22, border: '3px dashed rgba(52,55,64,0.3)', background: 'rgba(255,255,255,0.5)', boxSizing: 'border-box', ...fade(pIn(2), 24, 0) }}>
        <div style={{ position: 'absolute', left: 22, top: 22 }}><Ico n="wallet" s={40} c={C.muted} /></div>
        <div style={{ position: 'absolute', left: 140, top: 16, width: 30, height: 30, borderRadius: 15, border: '2.5px dashed rgba(52,55,64,0.3)', boxSizing: 'border-box' }} />
        <Bar x={22} y={96} w={120} h={12} c="rgba(52,55,64,0.12)" />
      </div>
      <Card x={1610} y={700} w={190} h={170} r={22} style={fade(pIn(3), 24, 0)}>
        <div style={{ position: 'absolute', left: 22, top: 22 }}><Ico n="wallet" s={40} /></div>
        <div style={{ position: 'absolute', left: 142, top: 16 }}><Badge kind="ok" s={30} /></div>
        <div style={{ position: 'absolute', left: 22, top: 108, width: 44, height: 44, borderRadius: 22, background: C.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: cl(pKey * 3), transform: `scale(${pKey})` }}><Ico n="key" s={28} c={C.mintInk} w={3.2} /></div>
        <div style={{ position: 'absolute', left: 100, top: 80, width: 70, height: 70, borderRadius: 35, border: '2.5px dashed rgba(52,55,64,0.22)', boxSizing: 'border-box' }} />
      </Card>
    </Frame>
  );
  const scan = (T > tc + 0.85 && T < tBr + 0.2) || (T > tp + 0.25 && T < tp + 0.65);
  const sa = (T * 420) % 360;
  const pNo = at(T, tBr + 0.2, 0.45, 'pop') * (1 - at(T, tOwn - 0.4, 0.4));
  const pOk = at(T, tp + 0.5, 0.45, 'pop');
  const ePay = at(T, tp, 1.2, 'draw'), pay = swapPath(1 - ePay, 1), pPay = at(T, a + 1.0, 0.5, 'pop');
  const arrive = cl((T - (tp + 1.2)) / 0.7);
  const pW = at(T, tSec, 0.5, 'pop'), hand = 360 * at(T, tSec + 0.15, 0.8, 'draw');
  const front = (
    <Frame n="Transfers">
      <svg width="1920" height="1080" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
        {scan ? <path d={arcD(GATE[0], GATE[1], 86, sa, sa + 80)} fill="none" stroke={C.navy} strokeWidth="4" strokeLinecap="round" /> : null}
        {[-150, -90, -30].map((am, k) => {
          const pd = at(T, tRu + 0.15 * k, 0.35, 'pop') * (1 - at(T, tBr + 0.3, 0.4));
          return pd > 0.001 ? <circle key={k} cx={GATE[0] + 104 * Math.cos(am * D2R)} cy={GATE[1] + 104 * Math.sin(am * D2R)} r={7 * pd} fill={C.navy} /> : null;
        })}
      </svg>
      <div style={{ position: 'absolute', left: 1446, top: 520 }}><Badge kind="no" s={52} p={pNo} /></div>
      <div style={{ position: 'absolute', left: 1446, top: 520 }}><Badge kind="ok" s={52} p={pOk} /></div>
      {pPay > 0.001 ? (
        <div style={{ position: 'absolute', left: pay[0] - 30, top: pay[1] - 30, width: 60, height: 60, borderRadius: 30, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(50,59,112,0.3)', opacity: cl(pPay * 3), transform: `scale(${pPay})` }}><Ico n="cash" s={36} c="#ffffff" w={3} /></div>
      ) : null}
      <Ripple x={TA[0]} y={TA[1]} p={arrive} r0={50} r1={150} />
      <Ripple x={TB[0]} y={TB[1]} p={arrive} r0={50} r1={150} />
      {pW > 0.001 ? (
        <div style={{ position: 'absolute', left: 1368, top: 420, width: 64, height: 64, borderRadius: 32, background: '#ffffff', boxShadow: SH, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: cl(pW * 3), transform: `scale(${pW})` }}>
          <svg viewBox="0 0 64 64" width="44" height="44" fill="none" stroke={C.ink} strokeWidth="3.2" strokeLinecap="round" style={{ overflow: 'visible' }}>
            <circle cx="32" cy="36" r="20" /><path d="M27 9h10M32 9v7" /><path d="M32 36V23" stroke={C.navy} transform={`rotate(${hand} 32 36)`} />
          </svg>
        </div>
      ) : null}
    </Frame>
  );
  return { back, front };
}

const LOGO = { x: 406.5, y: 338, h: 84 }, LOGO_W = (84 * 218.106) / 36;
const LOGO_O = { x: 491.4, y: 388.15, r: 33.85 };
const RBL = { x: 1045.4, y: 315, w: 468, h: 130 };
function closeTimes(W, CUES) {
  const tO = CUES.Close + 0.95, tRb = W(8, 0, 'Redbelly Network', 0);
  return { tO, tRb, tL1: tRb + 0.4, tL2: W(8, 0, "Australia's", -0.1), tL3: W(8, 0, 'where transactions', -0.1), tCf: W(8, 0, 'confirmed once', 0), tUrl: CUES.Close + (VS[8].end - A0[8]) + 0.3 };
}
function sClose({ T, W, CUES }) {
  const os = OS[8], a = CUES.Close, t = closeTimes(W, CUES);
  const tk = DATA.logos.tokeniser, rb = DATA.logos.redbelly;
  const pR = at(T, t.tO + 0.55, 0.7, 'draw'), pO = at(T, t.tO + 0.6, 0.3), pRb = at(T, t.tRb, 0.7, 'draw'), pDiv = at(T, t.tRb - 0.1, 0.5, 'draw');
  const right = tk.paths.filter(p => p.id !== 'Vector_8' && p.id !== 'Vector_9'), tPath = tk.paths.find(p => p.id === 'Vector_8'), oPath = tk.paths.find(p => p.id === 'Vector_9');
  const back = (
    <Frame n="Close">
      <div style={{ position: 'absolute', left: 160, top: -40, width: 1600, height: 900, background: 'radial-gradient(closest-side, rgba(162,255,200,0.06), rgba(162,255,200,0))', opacity: at(T, a, 1.2) }} />
      <svg viewBox={tk.viewBox} width={LOGO_W} height={LOGO.h} style={{ position: 'absolute', left: LOGO.x, top: LOGO.y, overflow: 'visible' }}>
        <defs>
          <clipPath id="tkClipR"><rect x="51.2" y="-5" width={(218.2 - 51.2) * pR} height="46" /></clipPath>
          <clipPath id="tkClipL"><rect x={21.2 * (1 - pR)} y="-5" width={21.2 * pR} height="46" /></clipPath>
        </defs>
        <g clipPath="url(#tkClipR)" fill="#ffffff">{right.map(p => <path key={p.id} d={p.d} />)}</g>
        <g clipPath="url(#tkClipL)" fill="#ffffff"><path d={tPath.d} /></g>
        <path d={oPath.d} fill="#ffffff" opacity={pO} />
      </svg>
      <Box x={979.4} y={332} w={2} h={96} style={{ background: 'rgba(255,255,255,0.3)', transform: `scaleY(${pDiv})` }} />
      <svg viewBox={rb.viewBox} width={RBL.w} height={RBL.h} style={{ position: 'absolute', left: RBL.x, top: RBL.y, overflow: 'visible', opacity: cl(pRb * 2) }}>
        <defs><clipPath id="rbClip"><rect x="0" y="0" width={1080 * pRb} height="300" /></clipPath></defs>
        <g clipPath="url(#rbClip)">{rb.paths.map((p, i) => <path key={i} d={p.d} fill={p.red ? '#ff5050' : '#ffffff'} />)}</g>
      </svg>
      <div style={{ position: 'absolute', left: 0, top: 520, width: 1920, textAlign: 'center', fontWeight: 700, fontSize: 60, lineHeight: 1.15, letterSpacing: '-0.01em', color: '#ffffff', ...fade(at(T, t.tL1, 0.7), 0, 22) }}>{os[0]}</div>
      <div style={{ position: 'absolute', left: 0, top: 612, width: 1920, textAlign: 'center', fontWeight: 500, fontSize: 40, lineHeight: 1.3, color: C.onDark, ...fade(at(T, t.tL2, 0.7), 0, 20) }}>{os[1]}</div>
      <div style={{ position: 'absolute', left: 0, top: 710, width: 1920, display: 'flex', justifyContent: 'center', ...fade(at(T, t.tL3, 0.7), 0, 20) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', width: 50, height: 50 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.28)', boxSizing: 'border-box', opacity: 1 - at(T, t.tCf, 0.4) }} />
            <div style={{ position: 'absolute', inset: 0 }}><Badge kind="ok" s={50} p={at(T, t.tCf, 0.5, 'pop')} /></div>
          </div>
          <div style={{ fontWeight: 500, fontSize: 38, lineHeight: 1.2, color: '#ffffff' }}>{os[2]}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 860, width: 1920, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, ...fade(at(T, t.tUrl, 0.8), 0, 18) }}>
        <div style={{ fontWeight: 600, fontSize: 42, lineHeight: 1.1, color: C.mint, letterSpacing: '0.01em' }}>{os[3]}</div>
        <div style={{ width: 56, height: 3, borderRadius: 2, background: C.mint, transform: `scaleX(${at(T, t.tUrl + 0.3, 0.6, 'draw')})` }} />
      </div>
    </Frame>
  );
  const front = <Frame n="Close"><Ripple x={LOGO_O.x} y={LOGO_O.y} p={cl((T - t.tCf) / 1.2)} r0={34} r1={170} color="162,255,200" a={0.6} w={3} /></Frame>;
  return { back, front };
}

const STATIONS = [['Intro', sIntro], ['Meaning', sMeaning], ['Legal', sLegal], ['Onboarding', sOnboarding], ['Compliance', sCompliance], ['Register', sRegister], ['Issuance', sIssuance], ['Transfers', sTransfers], ['Close', sClose]];

// ── Camera + hero choreography ───────────────────────────────────────────
function buildModel(CUES, W, total, cin) {
  const ends = ORDER.map((n, i) => (i < ORDER.length - 1 ? CUES[ORDER[i + 1]] : total));
  const DIP = cin ? 0.15 : 0.06, KB = cin ? 1 : 0.5;
  const rest = (i, T) => {
    const n = ORDER[i], a = CUES[n], b = ends[i], u = cl((T - a) / Math.max(0.01, b - a));
    let cx = 960, cy = 540, z = 1 + 0.03 * KB * u;
    if (n === 'Intro') { const p = at(T, 0, 3.8, 'draw'); cy = lerp(480, 540, p); z = lerp(1 + 0.14 * KB, 1, p) + 0.02 * KB * cl((T - 3.8) / Math.max(0.01, b - 3.8)); }
    if (n === 'Issuance') { cx = 960 + 40 * KB * u; z = 1 + 0.04 * KB * u; }
    if (n === 'Close') { cy = 540 + 20 * u; z = 1 + 0.05 * KB * u; }
    return { x: ST[n][0] + cx, y: ST[n][1] + cy, z };
  };
  const cam = T => {
    for (let k = 1; k < ORDER.length; k++) {
      const b = CUES[ORDER[k]], t0 = b - 0.7, t1 = b + 0.8;
      if (T >= t0 && T <= t1) {
        const p = at(T, t0, t1 - t0, 'draw'), A = rest(k - 1, T), B = rest(k, T);
        return { x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p), z: lerp(A.z, B.z, p) * (1 - DIP * Math.sin(Math.PI * p)) };
      }
    }
    let i = 0; for (let k = 0; k < ORDER.length; k++) if (T >= CUES[ORDER[k]]) i = k;
    return rest(i, T);
  };

  const keys = []; let spins = 0;
  const k = (t, n, x, y, r, o = {}) => {
    spins += o.spin || 0;
    const ox = ST[n][0], oy = ST[n][1];
    keys.push({ t, x: ox + x, y: oy + y, r, yaw: (o.yaw != null ? o.yaw : 18) + 360 * spins, pitch: o.pitch != null ? o.pitch : 10, th: o.th != null ? o.th : 0.22, wob: o.wob != null ? o.wob : 1, op: o.op != null ? o.op : 1, ease: o.ease || 'draw', arc: o.arc || 0, path: o.path ? e => { const p = o.path(e); return [ox + p[0], oy + p[1]]; } : null });
  };
  const B = n => CUES[n];
  const tb = W(0, 0, 'becomes a token', -0.2);
  k(0, 'Intro', 960, 410, 0, { yaw: -320, wob: 0 });
  k(tb, 'Intro', 960, 410, 0, { yaw: -320, wob: 0 });
  k(tb + 1.3, 'Intro', 960, 410, 128, { ease: 'pop' });
  k(B('Meaning') - 0.9, 'Intro', 960, 410, 128);
  k(B('Meaning') - 0.6, 'Intro', 960, 386, 134, { ease: 'enter' });
  k(B('Meaning') + 0.55, 'Meaning', 1340, 500, 80, { spin: 1 });
  k(B('Legal') - 0.85, 'Meaning', 1340, 500, 80);
  k(B('Legal') + 0.6, 'Legal', 1250, 196, 64, { spin: 1, arc: 160 });
  const { tS } = legalTimes(W);
  k(tS - 0.4, 'Legal', 1250, 196, 64);
  k(tS, 'Legal', 1414, 550, 34);
  k(tS + 0.45, 'Legal', 1414, 550, 34);
  k(tS + 1.15, 'Legal', 1250, 196, 64, { spin: 1 });
  k(B('Onboarding') - 0.85, 'Legal', 1250, 196, 64);
  k(B('Onboarding') + 0.55, 'Onboarding', 1752, 254, 50, { spin: 1, arc: 140 });
  const { tD0 } = onbTimes(W);
  k(tD0, 'Onboarding', 1752, 254, 50);
  k(tD0 + 0.65, 'Onboarding', 1390, 708, 104, { spin: 1 });
  k(Math.max(tD0 + 1.05, B('Compliance') - 0.45), 'Onboarding', 1390, 708, 104);
  k(B('Compliance') + 0.7, 'Compliance', RING_C[0], RING_C[1], 128, { spin: 1, arc: 150 });
  k(B('Register') - 0.85, 'Compliance', RING_C[0], RING_C[1], 128);
  k(B('Register') + 0.55, 'Register', 1702, 290, 56, { spin: 1, arc: 130 });
  k(B('Issuance') - 0.8, 'Register', 1702, 290, 56);
  k(B('Issuance') + 0.6, 'Issuance', NET_O[0], NET_O[1], 62, { spin: 1 });
  const { tI } = issTimes(W);
  k(tI, 'Issuance', NET_O[0], NET_O[1], 62);
  k(tI + 0.8, 'Issuance', NET_J[0], NET_J[1], 46);
  k(tI + 1.25, 'Issuance', SLOT_X, WAL_Y[0], 24, { path: branch(0) });
  k(B('Transfers') - 0.85, 'Issuance', SLOT_X, WAL_Y[0], 24);
  k(B('Transfers') + 0.6, 'Transfers', TA[0], TA[1], 40, { spin: 1 });
  const tr = trfTimes(W);
  k(tr.tc + 0.2, 'Transfers', TA[0], TA[1], 40);
  k(tr.tc + 0.9, 'Transfers', 1300, 600, 40);
  k(tr.tBr + 0.55, 'Transfers', 1300, 600, 40);
  k(tr.tBr + 1.2, 'Transfers', TA[0], TA[1], 40);
  k(tr.tp, 'Transfers', TA[0], TA[1], 40);
  k(tr.tp + 1.2, 'Transfers', TB[0], TB[1], 40, { path: e => swapPath(e, -1) });
  k(B('Close') - 0.7, 'Transfers', TB[0], TB[1], 40);
  k(B('Close') + 0.4, 'Close', 960, 400, 112, { spin: 1 });
  const ct = closeTimes(W, CUES);
  k(ct.tO, 'Close', 960, 400, 112);
  k(ct.tO + 0.7, 'Close', LOGO_O.x, LOGO_O.y, LOGO_O.r, { yaw: -28.7, pitch: 0, th: 0.762, wob: 0, spin: 1 });
  k(ct.tO + 0.95, 'Close', LOGO_O.x, LOGO_O.y, LOGO_O.r, { yaw: -28.7, pitch: 0, th: 0.762, wob: 0, op: 0 });

  const m2 = meaningTimes(W), cp = compTimes(W);
  const bumps = [
    { t: m2.arr(1), a: 0.08 }, { t: m2.click(1), a: -0.07 }, { t: tS, a: -0.14 }, { t: tD0 + 0.65, a: 0.07 },
    ...cp.tk.map(t => ({ t: t + 1.15, a: 0.05 })), { t: cp.tEnc, a: 0.09 }, { t: tI + 1.25, a: 0.08 }, { t: tr.tp + 1.2, a: 0.07 },
  ];
  return { cam, keys, bumps, tS, tShake: tr.tBr + 0.2, reg: regTimes(W, CUES) };
}

function evalTrack(keys, T) {
  const n = keys.length;
  if (T <= keys[0].t) return keys[0];
  if (T >= keys[n - 1].t) return keys[n - 1];
  let i = 1; while (i < n - 1 && keys[i].t < T) i++;
  const k0 = keys[i - 1], k1 = keys[i];
  const e = MOTION[k1.ease]((T - k0.t) / Math.max(1e-6, k1.t - k0.t));
  let x, y;
  if (k1.path) { const p = k1.path(cl(e)); x = p[0]; y = p[1]; }
  else { x = lerp(k0.x, k1.x, e); y = lerp(k0.y, k1.y, e) - k1.arc * Math.sin(Math.PI * cl(e)); }
  const L = f => lerp(k0[f], k1[f], e);
  return { x, y, r: L('r'), yaw: L('yaw'), pitch: L('pitch'), th: L('th'), wob: L('wob'), op: L('op') };
}
function heroPose(m, T) {
  const b = evalTrack(m.keys, T), p = evalTrack(m.keys, T - 0.05);
  const vx = (b.x - p.x) / 0.05;
  let rs = 1; for (const q of m.bumps) rs += bump(T, q.t, q.a);
  return {
    x: b.x + shake(T, m.tShake), y: b.y + 0.05 * b.r * b.wob * Math.sin(1.7 * T), r: b.r * rs,
    yaw: b.yaw + 16 * b.wob * Math.sin(1.05 * T + 0.6), pitch: b.pitch + 4 * b.wob * Math.sin(0.83 * T + 1.1),
    th: b.th, op: b.op, roll: cl(vx / 140, -14, 14) * cl(b.wob * 2),
  };
}

// ── The piece ────────────────────────────────────────────────────────────
function Piece({ tw }) {
  const comp = useComposition();
  const { T, CUES, playing, authoredTotal } = comp;
  const tl = useTimeline();
  const cin = tw.camera !== 'Calm';
  const W = React.useMemo(() => makeW(CUES), [CUES]);
  const model = React.useMemo(() => buildModel(CUES, W, authoredTotal, cin), [CUES, W, authoredTotal, cin]);

  const c = model.cam(T);
  const z = c.z * (1 + bump(T, model.tS, 0.015));
  const cx = c.x + 0.5 * shake(T, model.tShake), cy = c.y;
  const pose = heroPose(model, T);
  const vw = 960 / z + 260, vh = 540 / z + 260;
  const vis = n => ST[n][0] < cx + vw && ST[n][0] + 1920 > cx - vw && ST[n][1] < cy + vh && ST[n][1] + 1080 > cy - vh;
  const args = { T, W, CUES };
  const S = {};
  for (const [n, fn] of STATIONS) S[n] = vis(n) ? fn(args) : null;

  const rg = model.reg;
  const pLk = at(T, rg.tLk, 0.5, 'pop'), pOpen = at(T, rg.tOpen, 0.4, 'draw'), pLkOut = at(T, rg.tOpen + 0.35, 0.3);
  const lkPulse = Math.sin(Math.PI * cl((T - rg.tN) / 0.7));

  // Voiceover: one media element, slaved to the authored clock (also mixed into video export).
  const audioRef = React.useRef(null), pend = React.useRef(false);
  const [blocked, setBlocked] = React.useState(false);
  const voice = tw.voiceover !== false;
  React.useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const target = cl(T, 0, TOTAL);
    if (voice && playing && T < TOTAL - 0.05) {
      const d = target - el.currentTime;
      if (Math.abs(d) > 0.45) { try { el.currentTime = target; } catch (e) {} }
      el.playbackRate = cl(1 + d * 0.6, 0.92, 1.08);
      if (el.paused && !pend.current) {
        pend.current = true;
        const pr = el.play();
        if (pr && pr.then) pr.then(() => { pend.current = false; setBlocked(false); }).catch(() => { pend.current = false; setBlocked(true); });
        else pend.current = false;
      }
    } else {
      if (!el.paused) el.pause();
      if (Math.abs(target - el.currentTime) > 0.04) { try { el.currentTime = target; } catch (e) {} }
    }
  });
  const unlock = () => {
    const el = audioRef.current;
    if (!el) return;
    try { el.currentTime = cl(T, 0, TOTAL); } catch (e) {}
    el.play().then(() => setBlocked(false)).catch(() => {});
    if (!playing) { if (comp.time >= comp.duration - 0.2) tl.setTime(0); tl.setPlaying(true); }
  };
  const soundBtn = blocked && voice && typeof ReactDOM !== 'undefined' && ReactDOM.createPortal ? ReactDOM.createPortal(
    <button onClick={unlock} title="Play with voiceover" style={{ position: 'fixed', top: 16, right: 16, zIndex: 2147483000, width: 52, height: 52, borderRadius: 26, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(30,32,38,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 0 6px rgba(162,255,200,0.18), 0 8px 24px rgba(0,0,0,0.35)', padding: 0 }}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#a2ffc8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10" /></svg>
    </button>, document.body) : null;

  return (
    <div data-screen-label={`t=${Math.floor(comp.time)}s`} style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, overflow: 'hidden', background: '#ffffff', fontFamily: FONT, color: C.ink, WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(960px,540px) scale(${z}) translate(${-cx}px,${-cy}px)` }}>
        {DARK.map(([x, y, w, h], i) => <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: C.ink, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1.6px, transparent 1.9px)', backgroundSize: '44px 44px' }} />)}
        {ORDER.map(n => (S[n] && S[n].back ? <React.Fragment key={n}>{S[n].back}</React.Fragment> : null))}
        <Token uid="hero" {...pose} dk={darkAt(pose.x, pose.y)} />
        {pLk > 0.001 && pLkOut < 0.999 ? (
          <div style={{ position: 'absolute', left: pose.x + 0.55 * pose.r - 22, top: pose.y + 0.5 * pose.r - 22, width: 44, height: 44, borderRadius: 22, background: '#ffffff', border: `2.5px solid ${C.ink}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SH, opacity: cl(pLk * 3) * (1 - pLkOut), transform: `scale(${pLk * (1 + 0.18 * lkPulse)})` }}>
            <LockIco s={26} c={C.ink} w={4.5} open={pOpen} />
          </div>
        ) : null}
        {ORDER.map(n => (S[n] && S[n].front ? <React.Fragment key={n + 'f'}>{S[n].front}</React.Fragment> : null))}
      </div>
      <Tracker T={T} W={W} CUES={CUES} dk={darkAt(cx, cy + (82 - 540) / z)} />
      <video ref={audioRef} src="assets/voiceover.mp3" preload="auto" playsInline data-om-exportable-video-play-start="0" data-om-exportable-video-play-end={String(TOTAL)} data-om-exportable-video-play-speed="1" style={{ position: 'absolute', left: 0, top: 0, width: 2, height: 2, opacity: 0, pointerEvents: 'none' }} />
      {soundBtn}
    </div>
  );
}

function TokenExplainer() {
  const [tw, setTweak] = useTweaks(window.TK_TWEAKS || { motionEditor: true, voiceover: true, camera: 'Cinematic' });
  return (
    <React.Fragment>
      <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#ffffff">
        <Piece tw={tw} />
      </CompositionStage>
      <TweaksPanel title="Tweaks">
        <TweakSection label="Editor" />
        <TweakToggle label="Motion editor" value={tw.motionEditor !== false} onChange={v => setTweak('motionEditor', v)} />
        <TweakSection label="Playback" />
        <TweakToggle label="Voiceover" value={tw.voiceover !== false} onChange={v => setTweak('voiceover', v)} />
        <TweakRadio label="Camera" value={tw.camera || 'Cinematic'} options={['Calm', 'Cinematic']} onChange={v => setTweak('camera', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}
window.TokenExplainer = TokenExplainer;
})();
