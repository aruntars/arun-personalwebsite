(function(){
// The on-screen graphics from the video, as drawn for it: each scene is a function of time that returns SVG.
// Copied from the video's overlay source. src/build.py wraps this file and hands BOX and FULL to the player.
//
// Changes from the overlay source. Apart from the one thing below, everything up to the block marked
// "Added for the article" at the very end is the overlay's script as it was, up to its DEFS line.
// 1. Clip path. Two full-screen scenes, fsCall (the depot map) and fsLog (the decision log), clip their picture to
//    rounded corners with url(#mapClip). The overlay defined that clip path after this point, inside DEFS, and its
//    frame() put DEFS in front of every frame. The article player adds no <defs>, so the block at the end makes
//    those two entries of FULL emit the clip path themselves, in front of the scene. Nothing else gets a def:
//    fsOrch and the box scenes do not refer to anything in DEFS. DEFS also held hatchGold, hatchMuted and
//    panelClip. No scene in this file refers to the two hatch patterns, and panelClip was used only by frame(),
//    which is not copied. The clip paths gc and hc in sI are defined by that scene itself.
// The scenes sA, sC, sD and sH are defined below but are not in this version's BOX, so the article cannot show them.
// Overlay band for content5: 1080x320 logical units, rendered at 2x (2160x640)
// and composited onto the 2160x3840 video at y=344. Every frame is a pure
// function of t (seconds), so any frame can be rendered independently.

const GOLD = '#ffcf00', WHITE = '#f1f3f4', TXT = '#dedede', MUTED = '#adb8c0';
const LINE = '#35434e', DIM = '#5d6b75', GREEN = '#6fe3a5', RED = '#ff6b6b';
const BG = '#091117', TILE = '#121d25', DARK = '#0d171e';

// ---------- math ----------
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const p = (t, a, d) => cl((t - a) / d);
const eo = x => 1 - Math.pow(1 - x, 3);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .42) => t < a ? 0 : back(p(t, a, d));
const fin = (t, a, d = .3) => eo(p(t, a, d));
const lerp = (a, b, x) => a + (b - a) * x;
const f = n => Math.round(n * 100) / 100;
const mixHex = (h1, h2, x) => {
  const c = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const a = c(h1), b = c(h2);
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], x)).toString(16).padStart(2, '0')).join('');
};

// ---------- primitives ----------
const rich = s => s.replace(/\{/g, `<tspan fill="${GOLD}">`).replace(/\}/g, '</tspan>');
function T(x, y, s, o = {}) {
  const { size = 24, fill = TXT, weight = 700, anchor = 'start', op = 1, ls = 0 } = o;
  if (op <= 0) return '';
  return `<text x="${f(x)}" y="${f(y)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" opacity="${f(op)}" letter-spacing="${ls}">${rich(s)}</text>`;
}
function G(inner, o = {}) {
  const { x = 0, y = 0, s = 1, op = 1, rot = 0 } = o;
  if (op <= 0 || s <= 0) return '';
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${f(rot)}) scale(${f(s)})" opacity="${f(op)}">${inner}</g>`;
}
function R(x, y, w, h, rx, o = {}) {
  const { fill = 'none', stroke = 'none', sw = 2, op = 1, dash = '' } = o;
  if (w <= 0 || h <= 0) return '';
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${f(op)}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
}
function swap(t, items, fn) {
  let out = '';
  for (let i = 0; i < items.length; i++) {
    const [a, v] = items[i];
    const b = i + 1 < items.length ? items[i + 1][0] : Infinity;
    if (t < a || t >= b) continue;
    const k = eo(p(t, a, .26));
    out += fn(v, k * (1 - p(t, b - .12, .12)), (1 - k) * 10);
  }
  return out;
}
const title = (t, items, o = {}) => swap(t, items, (v, al, dy) =>
  T(o.x ?? 30, (o.y ?? 85) + dy, v, { size: o.size ?? 34, fill: WHITE, op: al, anchor: o.anchor ?? 'start' }));
const kicker = (t, items) => swap(t, items, (v, al) => T(30, 43, v, { size: 24, fill: GOLD, op: al, ls: 1 }));

// ---------- icons ----------
function car(x, y, s = 1, body = '#f2f2f2', op = 1, rot = 0) {
  return G(`
    <rect x="-27" y="-23" width="14" height="7" rx="2.5" fill="#8a949c"/><rect x="13" y="-23" width="14" height="7" rx="2.5" fill="#8a949c"/>
    <rect x="-27" y="16" width="14" height="7" rx="2.5" fill="#8a949c"/><rect x="13" y="16" width="14" height="7" rx="2.5" fill="#8a949c"/>
    <rect x="-39" y="-20" width="78" height="40" rx="13" fill="${body}"/>
    <rect x="-21" y="-13" width="40" height="26" rx="6" fill="${DARK}"/>
    <rect x="-3" y="-13" width="4" height="26" fill="${body}"/>
    <rect x="30" y="-10" width="4" height="20" rx="2" fill="${GOLD}"/>`, { x, y, s, op, rot });
}
const BOLT = 'M3,-13 L-7,2 L-1,2 L-3,13 L7,-2 L1,-2 Z';
function charger(x, y, ok, o = {}) {
  const { s = 1, glow = 1, op = 1, col = null } = o;
  const c = col || (ok ? GREEN : RED);
  const glyph = ok
    ? `<path d="${BOLT}" transform="translate(0,7) scale(.95)" fill="${c}" opacity="${f(glow)}"/>`
    : `<path d="M-7,0 L7,14 M7,0 L-7,14" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
  return G(`
    <path d="M19,-8 h8 a8,8 0 0 1 8,8 v16" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity=".75"/>
    <rect x="31" y="15" width="8" height="11" rx="2.5" fill="${c}" opacity=".85"/>
    <rect x="-19" y="-34" width="38" height="62" rx="8" fill="${TILE}" stroke="${c}" stroke-width="3"/>
    <rect x="-11" y="-26" width="22" height="12" rx="3" fill="${c}" opacity="${ok ? f(.55 + .4 * glow) : .28}"/>
    ${glyph}
    <rect x="-25" y="28" width="50" height="7" rx="3" fill="${c}" opacity=".85"/>`, { x, y, s, op });
}
function battery(x, y, w, h, lvl, col, o = {}) {
  const { stroke = '#6b7882', pad = 4 } = o;
  const iw = (w - 2 * pad) * cl(lvl), ih = h - 2 * pad;
  return R(x, y, w, h, f(h * .28), { fill: DARK, stroke, sw: 2.5 })
    + R(x + w + 2, y + h * .3, 5, h * .4, 2, { fill: stroke })
    + R(x + pad, y + pad, iw, ih, f(ih * .25), { fill: col });
}
const lvlCol = v => v < .2 ? RED : v < .5 ? GOLD : GREEN;
function ico(kind, x, y, c, s = 1, bg = TILE, op = 1) {
  const g = inner => `<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})" opacity="${f(op)}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  switch (kind) {
    case 'soc': return g(`<rect x="-20" y="-11" width="37" height="22" rx="5"/><path d="M21,-4 v8"/>
      <rect x="-15" y="-6" width="8" height="12" rx="1.5" fill="${c}" stroke="none"/><rect x="-4.5" y="-6" width="8" height="12" rx="1.5" fill="${c}" stroke="none"/>`);
    case 'work': return g(`<path d="M-14,14 L1,-1" stroke-width="7"/><circle cx="6" cy="-6" r="10.5" fill="${c}" stroke="none"/>
      <path d="M7,-7 L18,-18" stroke="${bg}" stroke-width="7.5" stroke-linecap="butt"/>`);
    case 'site': return g(`<path d="M0,19 C-13,4 -15,-2 -15,-6 a15,15 0 1 1 30,0 c0,4 -2,10 -15,25 z"/>
      <path d="${BOLT}" transform="translate(0,-6) scale(.62)" fill="${c}" stroke="none"/>`);
    case 'time': return g(`<circle r="17"/><path d="M0,-9 V0 L7,5"/>`);
    case 'demand': return g(`<path d="M-19,14 H19"/><path d="M-18,9 C-8,9 -7,-15 0,-15 C7,-15 8,9 18,9"/>`);
    case 'person': return g(`<circle cx="0" cy="-9" r="9" fill="${c}" stroke="none"/><path d="M-17,19 a17,16 0 0 1 34,0 z" fill="${c}" stroke="none"/>`);
    case 'spark': return g(`<path d="M0,-20 C2,-6 6,-2 20,0 C6,2 2,6 0,20 C-2,6 -6,2 -20,0 C-6,-2 -2,-6 0,-20 Z" fill="${c}" stroke="none"/>
      <path d="M15,-21 C16,-16 17,-15 22,-14 C17,-13 16,-12 15,-7 C14,-12 13,-13 8,-14 C13,-15 14,-16 15,-21 Z" fill="${c}" stroke="none"/>`);
    case 'bolt': return g(`<path d="${BOLT}" fill="${c}" stroke="none"/>`);
    case 'x': return g(`<path d="M-8,-8 L8,8 M8,-8 L-8,8"/>`);
    case 'target': return g(`<circle r="17"/><circle r="9"/><circle r="3" fill="${c}" stroke="none"/>`);
    case 'db': return g(`<ellipse cx="0" cy="-12" rx="16" ry="6"/><path d="M-16,-12 V12 a16,6 0 0 0 32,0 V-12"/><path d="M-16,0 a16,6 0 0 0 32,0"/>`);
    case 'up': return g(`<path d="M0,13 V-12 M-10,-2 L0,-12 L10,-2"/>`);
    case 'down': return g(`<path d="M0,-13 V12 M-10,2 L0,12 L10,2"/>`);
    case 'check': return g(`<path d="M-8,0 L-2,7 L9,-7"/>`);
  }
  return '';
}
const FACTORS = ['soc', 'work', 'site', 'time', 'demand'];
function badge(kind, x, y, r, fill, c, o = {}) {
  const { s = 1, op = 1, rot = 0, stroke = 'none' } = o;
  return G(`<circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>` +
    `<g transform="rotate(${f(rot)})">${ico(kind, 0, 0, c, r / 30, fill)}</g>`, { x, y, s, op });
}
function pill(cx, cy, text, col, o = {}) {
  const { size = 21, w = text.length * size * .64 + 30, h = size + 15, fill = BG, s = 1, op = 1, tcol = col } = o;
  return G(R(-w / 2, -h / 2, w, h, h / 2, { fill, stroke: col, sw: 2.2 }) +
    T(0, size * .35, text, { size, fill: tcol, anchor: 'middle', ls: .6 }), { x: cx, y: cy, s, op });
}

// Scenes for content 5 ("Would you let AI run the robotaxi depot?").
// Appended to the shared drawing helpers when overlay.html is assembled.

const GREY = '#8a949c';
const rnd = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const sparkDot = (x, y, s, c, op = 1) => op <= 0 ? '' :
  `<path transform="translate(${f(x)},${f(y)}) scale(${f(s)})" opacity="${f(op)}" fill="${c}" d="M0,-20 C2,-6 6,-2 20,0 C6,2 2,6 0,20 C-2,6 -6,2 -20,0 C-6,-2 -2,-6 0,-20 Z"/>`;
const agentNode = (t, x, y, r, s = 1, halo = true) => {
  const h = (t % 1.4) / 1.4;
  return (halo && s > .5 ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + h * r * .6)}" fill="none" stroke="${GOLD}" stroke-width="2.5" opacity="${f((1 - h) * .6)}"/>` : '')
    + G(`<circle r="${r}" fill="#1b1f17" stroke="${GOLD}" stroke-width="3.5"/>` + ico('spark', -r * .05, r * .05, GOLD, r / 38), { x, y, s });
};
const personNode = (x, y, r, c = WHITE, s = 1) =>
  G(`<circle r="${r}" fill="${TILE}" stroke="${c}" stroke-width="3"/>` + ico('person', 0, r * .08, WHITE, r / 35), { x, y, s });

// ---------- A: the question (0.25 - 4.5) ----------
function sA(t) {
  let o = kicker(t, [[0, 'THE QUESTION']]);
  o += title(t, [[.3, 'Would you let {AI} make this call?']]);
  const sel = 2, pulled = eio(p(t, 2.18, .7));
  const hop = [0, 3, 1, 2];
  const target = t < 1.12 ? -1 : t >= 1.9 ? sel : hop[Math.floor((t - 1.12) / .2) % 4];
  for (let i = 0; i < 4; i++) {
    const x = 92 + i * 118, k = pop(t, .32 + i * .06, .38);
    const isSel = i === sel;
    const cy = 226 + (isSel ? pulled * 110 : 0);
    const free = isSel && t >= 2.5;
    let d = '';
    if (!(isSel && pulled > .15)) d += `<path d="M${x},160 V200" stroke="${GREEN}" stroke-width="3" stroke-dasharray="5 5" stroke-dashoffset="${f(-t * 22)}" opacity=".8"/>`;
    if (free) { const r = ((t - 2.5) % 1) / 1; d += `<circle cx="${x}" cy="134" r="${f(26 + r * 16)}" fill="none" stroke="${GREEN}" stroke-width="2.5" opacity="${f(1 - r)}"/>`; }
    d += charger(x, 134, true, { s: .62 * cl(k, 0, 1.1), glow: .5 + .5 * Math.sin(t * 5 + i) });
    d += car(x, cy, .8 * cl(k, 0, 1.1), '#f2f2f2', isSel ? 1 - pulled * .7 : 1, -90);
    if (i === target && !(isSel && pulled >= 1)) {
      const lock = isSel && t >= 1.9;
      d += R(x - 30, cy - 42, 60, 84, 12, { fill: 'rgba(255,207,0,.10)', stroke: GOLD, sw: lock ? 3.5 : 2.5, dash: lock ? '' : '7 6', op: isSel ? 1 - pulled : 1 });
    }
    o += d;
  }
  if (t >= 1.9) o += G(agentNode(t, 0, 0, 17, 1, false), { x: 92 + sel * 118 + 40, y: 226 + pulled * 110 - 44, s: pop(t, 1.9, .35), op: 1 - pulled });
  if (t >= 2.5) o += T(92 + sel * 118, 240, 'FREED', { size: 20, fill: GREEN, anchor: 'middle', ls: 1, op: fin(t, 2.6) });
  // rush meter + decision buttons
  o += `<line x1="548" y1="112" x2="548" y2="270" stroke="${LINE}" stroke-width="2" opacity="${f(fin(t, .4))}"/>`;
  o += T(580, 132, 'RUSH', { size: 21, fill: MUTED, ls: 1.2, op: fin(t, .5) });
  for (let i = 0; i < 12; i++) {
    const on = t >= .7 + i * .2;
    const hot = i / 11, peak = i >= 9 && on ? .6 + .4 * Math.sin(t * 9) : 1;
    o += R(660 + i * 27, 113, 20, 24, 5, { fill: on ? mixHex(GOLD, RED, hot) : TILE, stroke: on ? 'none' : LINE, sw: 1.5, op: fin(t, .5) * peak });
  }
  o += T(580, 190, 'LET AI DECIDE?', { size: 21, fill: MUTED, ls: 1.2, op: fin(t, .9) });
  const pick = t < 1.2 ? -1 : Math.floor((t - 1.2) / .42) % 2;
  [['YES', GREEN], ['NO', RED]].forEach(([lab, c], i) => {
    const on = pick === i;
    o += G(R(-98, -27, 196, 54, 14, { fill: on ? 'rgba(255,207,0,.14)' : TILE, stroke: on ? GOLD : DIM, sw: on ? 3.5 : 2.5 })
      + T(0, 10, lab, { size: 28, fill: on ? GOLD : MUTED, anchor: 'middle', ls: 1 }), { x: 678 + i * 210, y: 233, s: pop(t, 1.0 + i * .1, .38) * (on ? 1.04 : 1) });
  });
  return o;
}

// ---------- B: the first question (4.7 - 15.4) ----------
function sB(t) {
  let o = kicker(t, [[0, 'WHAT OPERATORS ASKED FIRST']]);
  o += title(t, [[4.86, 'Agents plug into the {depot OS}'], [7.36, 'The first question was not about IQ'], [11.68, 'It was about {consistency}']]);
  const p1 = 1 - p(t, 7.1, .22);
  if (p1 > 0) {
    let d = '';
    const dock = [[-170, -40], [-170, 44], [170, -40], [170, 44], [-300, 2], [300, 2]];
    dock.forEach(([dx, dy], i) => {
      const t0 = 5.0 + i * .28, k = eo(p(t, t0, .55));
      if (t < t0) return;
      const sx = 508 + dx * 3.2, sy = 190 + dy * 3;
      const x = lerp(sx, 508 + dx, k), y = lerp(sy, 190 + dy, k);
      d += `<path d="M${f(x)},${f(y)} L${508 + Math.sign(dx) * 96},${190 + dy * .35}" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="5 6" stroke-dashoffset="${f(-t * 24)}" opacity="${f(k * .8)}"/>`;
      d += agentNode(t + i * .3, x, y, 22, cl(k * 1.2), k >= 1);
    });
    d += G(R(-96, -46, 192, 92, 16, { fill: TILE, stroke: WHITE, sw: 3 })
      + T(0, -6, 'DEPOT OS', { size: 26, fill: WHITE, anchor: 'middle', ls: 1.5 })
      + [0, 1, 2, 3, 4, 5].map(i => R(-81 + i * 28, 12, 22, 12, 3, { fill: i < Math.floor((t - 5) / .28) ? GOLD : DIM })).join(''), { x: 508, y: 196, s: pop(t, 4.8, .45) });
    o += G(d, { op: p1 });
  }
  if (t >= 7.3) {
    // operators + speech bubble (centred until the three runs appear)
    const sx = lerp(190, 0, eio(p(t, 12.0, .5)));
    [[72, 190], [128, 148], [128, 232]].forEach(([x, y], i) => { o += personNode(x + sx, y, 24, MUTED, pop(t, 7.36 + i * .08, .4)); });
    const bk = pop(t, 7.6, .4);
    if (bk > 0) {
      const smart = t < 11.4;
      let b = `<path d="M-212,0 l-22,10 l22,12 z" fill="${TILE}" stroke="${smart ? LINE : GOLD}" stroke-width="2.5"/>`
        + R(-212, -62, 424, 124, 20, { fill: smart ? TILE : '#1b1f17', stroke: smart ? LINE : GOLD, sw: smart ? 2.5 : 3 })
        + `<rect x="-214" y="-2" width="5" height="26" fill="${smart ? TILE : '#1b1f17'}"/>`;
      if (t < 8.8) for (let i = 0; i < 3; i++) b += `<circle cx="${-24 + i * 24}" cy="${f(-Math.max(0, Math.sin(t * 9 - i * .9)) * 8)}" r="7" fill="${MUTED}"/>`;
      else if (smart) {
        const cut = eo(p(t, 9.9, .35)), dimmed = lerp(1, .4, p(t, 10.2, .4)) * (1 - p(t, 11.2, .2));
        b += T(0, 12, 'How smart is it?', { size: 36, fill: WHITE, anchor: 'middle', op: fin(t, 8.94, .25) * dimmed });
        if (cut > 0) b += `<path d="M-150,0 H${f(-150 + 300 * cut)}" stroke="${RED}" stroke-width="5" stroke-linecap="round" opacity="${f(1 - p(t, 11.2, .2))}"/>`;
      } else {
        const k = eo(p(t, 11.68, .3));
        b += T(0, -8 + (1 - k) * 8, 'Same situation,', { size: 31, fill: GOLD, anchor: 'middle', op: k });
        b += T(0, 32 + (1 - k) * 8, 'same call. Every time?', { size: 31, fill: GOLD, anchor: 'middle', op: eo(p(t, 12.0, .3)) });
      }
      o += G(b, { x: 392 + sx, y: 190, s: cl(bk, 0, 1.06), op: cl(bk) });
    }
    // three identical runs
    [12.5, 13.3, 14.1].forEach((t0, i) => {
      const k = eo(p(t, t0, .35));
      if (k <= 0) return;
      const y = 132 + i * 54, done = t >= t0 + .5, u = p(t, t0, .5);
      let d = R(646, y - 20, 138, 40, 12, { fill: TILE, stroke: LINE, sw: 2 }) + T(715, y + 7, 'Same input', { size: 20, fill: TXT, anchor: 'middle', weight: 500 });
      d += `<path d="M788,${y} H828" stroke="${DIM}" stroke-width="2.5"/>` + sparkDot(lerp(790, 828, u), y, .42, GOLD, done ? 0 : 1);
      d += R(832, y - 20, 154, 40, 12, { fill: done ? '#13221b' : TILE, stroke: done ? GREEN : LINE, sw: 2 });
      if (done) d += T(846, y + 7, 'Same call', { size: 20, fill: GREEN }) + ico('check', 964, y, GREEN, .85 * cl(pop(t, t0 + .5, .3), 0, 1.2));
      o += G(d, { op: k });
    });
  }
  return o;
}

// ---------- C: one real call (15.6 - 28.95) ----------
function sC(t) {
  let o = kicker(t, [[0, 'ONE REAL CALL']]);
  o += title(t, [[15.9, 'Here is the situation'], [18.32, 'Cars come in {faster} than they leave'], [20.72, 'Lot jammed. Only {2 chargers free}.'], [24.12, 'Topping up to 80% {blocks the next car}']]);
  const c1 = 1 - p(t, 23.72, .22);
  if (c1 > 0) {
    let d = '';
    const jam = t >= 21.22, strip = t >= 21.8;
    const ly = lerp(118, 104, eio(p(t, 21.6, .4))), lh = lerp(148, 106, eio(p(t, 21.6, .4))), rowGap = lh / 3 - 3;
    d += R(250, ly, 516, lh, 14, { fill: DARK, stroke: jam ? RED : LINE, sw: jam ? 3 : 2 });
    const n = t < 18.3 ? 7 : 7 + Math.floor(17 * p(t, 18.3, 2.9));
    const orderIdx = Array.from({ length: 24 }, (_, i) => i).sort((a, b) => rnd(a + 3) - rnd(b + 3));
    for (let q = 0; q < Math.min(24, n); q++) {
      const i = orderIdx[q], c = i % 8, r = Math.floor(i / 8);
      const born = q < 7 ? 15.9 + q * .05 : 18.3 + (q - 7) / 17 * 2.9;
      d += car(283 + c * 64.5, ly + lh / 6 + 2 + r * rowGap, .47 * cl(pop(t, born, .3), 0, 1.15));
    }
    if (jam) d += pill(706, ly, 'JAMMED', RED, { size: 20, fill: BG, s: pop(t, 21.22, .4) });
    const my = ly + lh / 2;
    // IN lane
    d += T(40, my - 26, 'IN', { size: 22, fill: GOLD, ls: 1.5, op: fin(t, 16.1) });
    for (let i = 0; i < 3; i++) { const ph = ((t * 2.6 - i * .33) % 1 + 1) % 1; d += `<path d="M${88 + i * 18},${f(my - 43)} l9,9 l-9,9" fill="none" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="${f((.25 + .75 * Math.sin(ph * Math.PI)) * fin(t, 16.1))}"/>`; }
    if (t >= 18.3 && t < 21.3) for (let i = 0; i < 2; i++) { const ph = ((t - 18.3) / .62 + i * .5) % 1; d += car(lerp(-30, 236, ph), my + 6, .6, '#f2f2f2', Math.min(1, (1 - ph) * 5)); }
    if (t >= 21.1) [0, 1, 2].forEach(i => { d += car(lerp(-40, 206 - i * 62, eo(p(t, 21.1 + i * .25, .6))), my + 6, .6); });
    // OUT lane
    d += T(976, my - 26, 'OUT', { size: 22, fill: MUTED, ls: 1.5, anchor: 'end', op: fin(t, 16.1) });
    { const ph = ((t * .55) % 1 + 1) % 1; d += `<path d="M900,${f(my - 43)} l9,9 l-9,9" fill="none" stroke="${MUTED}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="${f((.25 + .75 * Math.sin(ph * Math.PI)) * fin(t, 16.1))}"/>`; }
    if (t >= 19.2 && t < 22.4) d += car(lerp(780, 1050, p(t, 19.2, 3.1)), my + 6, .6);
    // charger strip
    if (strip) {
      const free = [6, 13];
      for (let i = 0; i < 20; i++) {
        const isFree = free.includes(i), k = pop(t, 21.85 + i * .015, .3);
        const x = 44 + i * 39;
        if (isFree) { const r = ((t - 22) % 1 + 1) % 1; d += `<circle cx="${x}" cy="250" r="${f(15 + r * 12)}" fill="none" stroke="${GREEN}" stroke-width="2.5" opacity="${f((1 - r) * cl(k))}"/>`; }
        d += charger(x, 250, true, { s: .4 * cl(k, 0, 1.1), glow: 1, col: isFree ? GREEN : GREY, op: isFree ? 1 : .75 });
      }
      d += T(986, 245, '2 FREE', { size: 24, fill: GREEN, anchor: 'end', ls: .6, op: fin(t, 22.1) });
      d += T(986, 270, '18 in use', { size: 20, fill: MUTED, anchor: 'end', weight: 500, op: fin(t, 22.2) });
    }
    o += G(d, { op: c1 });
  }
  if (t >= 23.95) {
    const X = 132, W = 440, Y = 158, H = 58, pad = 6, iw = W - 2 * pad;
    const lvl = lerp(.71, .768, p(t, 24.1, 4.6));
    o += charger(68, Y + H / 2 - 2, true, { s: .95 * cl(pop(t, 24.0, .4), 0, 1.1), glow: .5 + .5 * Math.sin(t * 6) });
    let d = R(X, Y, W, H, 16, { fill: DARK, stroke: '#6b7882', sw: 3 }) + R(X + W + 3, Y + 17, 8, H - 34, 3, { fill: '#6b7882' });
    d += R(X + pad, Y + pad, iw * lvl, H - 2 * pad, 10, { fill: GREEN });
    const sh = ((t * .9) % 1);
    d += R(X + pad + iw * lvl * sh - 20, Y + pad, 40, H - 2 * pad, 8, { fill: '#ffffff', op: .22 * Math.sin(sh * Math.PI) });
    d += T(X + pad + iw * lvl - 14, Y + H / 2 + 10, `${Math.floor(lvl * 100)}%`, { size: 30, fill: BG, anchor: 'end' });
    const mx = X + pad + iw * .8;
    d += `<path d="M${f(mx)},${Y - 10} V${Y + H + 10}" stroke="${GOLD}" stroke-width="4.5" stroke-linecap="round"/>`;
    d += T(mx, Y - 20, 'RELEASE AT 80%', { size: 21, fill: GOLD, anchor: 'middle', ls: .8 });
    o += G(d, { op: fin(t, 24.0) });
    o += T(X + 4, Y + H + 40, 'still holding the charger\u2026', { size: 23, fill: MUTED, weight: 500, op: fin(t, 26.34) });
    // waiting queue
    const qk = fin(t, 26.8);
    if (qk > 0) {
      const dots = '.'.repeat(1 + Math.floor((t * 2.5) % 3));
      o += T(650, 136, 'WAITING' + dots, { size: 21, fill: RED, ls: 1.2, op: qk });
      [0, 1, 2].forEach(i => {
        const k = pop(t, 26.8 + i * .14, .4), x = 690 + i * 104, jig = Math.sin(t * 11 + i * 2) * 1.5;
        o += G(car(0, 0, .86) + battery(-34, 30, 64, 18, [.14, .09, .17][i], RED), { x: x + jig, y: 184, s: cl(k, 0, 1.1), op: cl(k) });
      });
      o += `<path d="M${X + W + 26},${Y + H / 2} H636" stroke="${RED}" stroke-width="3" stroke-dasharray="6 7" opacity="${f(qk)}"/>`;
    }
  }
  return o;
}

// ---------- D: the suggestion (29.2 - 40.45) ----------
function sD(t) {
  let o = kicker(t, [[0, 'THE AGENT SUGGESTS']]);
  o += title(t, [[29.5, 'A small, {temporary} rule change']]);
  // left: the new threshold
  o += T(34, 132, 'RELEASE CARS AT', { size: 21, fill: MUTED, ls: 1.2, op: fin(t, 31.5) });
  const k70 = pop(t, 32.25, .45);
  if (k70 > 0) o += G(T(0, 0, '70%', { size: 88, fill: GOLD }), { x: 30, y: 212, s: .6 + .4 * k70, op: cl(k70) });
  if (t >= 33.24) {
    const a = fin(t, 33.24), cut = eo(p(t, 33.8, .35));
    o += T(262, 168, 'instead of', { size: 21, fill: MUTED, weight: 500, op: a });
    o += T(260, 212, '80%', { size: 50, fill: MUTED, op: a * lerp(1, .6, cut) });
    if (cut > 0) o += `<path d="M254,196 H${f(254 + 118 * cut)}" stroke="${RED}" stroke-width="5" stroke-linecap="round"/>`;
  }
  // slider
  const sa = fin(t, 31.6), vx = v => 60 + (v - 60) * 14.5;
  const knob = lerp(vx(80), vx(70), eio(p(t, 32.2, .8)));
  let s = `<path d="M${vx(60)},250 H${vx(90)}" stroke="${LINE}" stroke-width="7" stroke-linecap="round"/>`;
  s += `<path d="M${f(knob)},250 H${vx(80)}" stroke="${GOLD}" stroke-width="7" stroke-linecap="round" opacity=".55"/>`;
  s += `<circle cx="${vx(80)}" cy="250" r="9" fill="${BG}" stroke="${MUTED}" stroke-width="2.5" stroke-dasharray="4 4"/>`;
  s += `<circle cx="${f(knob)}" cy="250" r="12" fill="${GOLD}"/>`;
  s += T(vx(70), 282, '70', { size: 19, fill: GOLD, anchor: 'middle' }) + T(vx(80), 282, '80', { size: 19, fill: MUTED, anchor: 'middle' });
  o += G(s, { op: sa });
  // right: agent thinking, then duration + impact
  const think = fin(t, 29.5) * (1 - p(t, 34.6, .25));
  if (think > 0) {
    const ax = lerp(508, 783, eio(p(t, 31.2, .6)));
    let d = agentNode(t, ax, 176, 44, cl(pop(t, 29.5, .45), 0, 1.1));
    for (let i = 0; i < 3; i++) d += `<circle cx="${f(ax - 24 + i * 24)}" cy="${f(250 - Math.max(0, Math.sin(t * 8 - i * .9)) * 7)}" r="6" fill="${GOLD}"/>`;
    o += G(d, { op: think });
  }
  const tk = pop(t, 34.9, .42);
  if (tk > 0) {
    const rem = 900 - Math.floor(Math.max(0, t - 35.6));
    const circ = 2 * Math.PI * 27;
    o += G(R(0, 0, 406, 82, 16, { fill: TILE, stroke: GOLD, sw: 2.5 })
      + `<circle cx="46" cy="41" r="27" fill="none" stroke="${LINE}" stroke-width="7"/><circle cx="46" cy="41" r="27" fill="none" stroke="${GOLD}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${f(circ * (1 - .12 * p(t, 35.4, 4)))} ${f(circ)}" transform="rotate(-90 46 41)"/>`
      + T(92, 38, 'FOR THE NEXT', { size: 19, fill: MUTED, ls: 1.2 })
      + T(92, 70, `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`, { size: 34, fill: GOLD })
      + T(392, 70, 'min, then back to 80%', { size: 20, fill: MUTED, weight: 500, anchor: 'end' }), { x: 580, y: 104 + (1 - cl(tk)) * 8, op: cl(tk) });
  }
  const ik = pop(t, 37.1, .42);
  if (ik > 0) {
    const freed = [37.7, 38.1, 38.5, 38.9].filter(q => t >= q).length;
    let d = R(0, 0, 406, 82, 16, { fill: '#13221b', stroke: GREEN, sw: 2.5 });
    [37.7, 38.1, 38.5, 38.9].forEach((q, i) => { d += car(46 + i * 58, 41, .58 * cl(pop(t, q, .35), 0, 1.2), '#bff3d6'); });
    d += G(T(0, 0, `+${freed}`, { size: 44, fill: GREEN, anchor: 'end' }), { x: 392, y: 46, s: freed ? 1 + .2 * (1 - p(t, [37.7, 38.1, 38.5, 38.9][freed - 1], .3)) : 1 });
    d += T(392, 71, 'cars freed up', { size: 20, fill: GREEN, weight: 500, anchor: 'end' });
    o += G(d, { x: 580, y: 194 + (1 - cl(ik)) * 8, op: cl(ik) });
  }
  return o;
}

// ---------- E: hundreds of agents (40.55 - 51.65) ----------
const E_DOTS = (() => {
  const arcs = [10, 14, 19, 24, 29], out = [];
  let n = 0;
  arcs.forEach((cnt, j) => {
    const ry = 44 + j * 20, rx = ry * 3.3;
    for (let q = 0; q < cnt; q++, n++) {
      const th = Math.PI * (1 - (q + .5) / cnt);
      out.push({ gx: 68 + (n % 16) * 58.6, gy: 118 + Math.floor(n / 16) * 30, ox: 508 + rx * Math.cos(th), oy: 282 - ry * Math.sin(th), j, th, born: rnd(n) });
    }
  });
  return out;
})();
function sE(t) {
  let o = kicker(t, [[0, 'NOW SCALE IT']]);
  o += title(t, [[40.74, 'That was just {one} agent'], [42.2, 'Now picture {hundreds} of them'], [45.24, 'In concert, like an orchestra'], [50.08, 'All playing toward {one goal}']]);
  o += swap(t, [[40.9, '1 AGENT'], [42.66, 'HUNDREDS']], (v, al) => G(pill(0, 0, v, GOLD, { size: 21, fill: '#1b1f17' }), { x: 986 - (v.length * 21 * .64 + 30) / 2, y: 36, op: al }));
  // the single agent
  const one = 1 - p(t, 42.2, .5);
  if (one > 0) o += G(agentNode(t, 508, 186, 46, cl(pop(t, 40.74, .45), 0, 1.1)) + T(508, 268, 'one decision at a time', { size: 22, fill: MUTED, weight: 500, anchor: 'middle', op: fin(t, 41.0) }), { op: one });
  // the swarm
  if (t >= 42.2) {
    const m = eio(p(t, 45.3, 1.0)), goal = t >= 50.08;
    const sect = t >= 49.56 ? 2 : t >= 48.84 ? 1 : t >= 47.4 ? 0 : -1;
    if (goal) for (let i = 0; i < 14; i++) {
      const th = Math.PI * (i + .5) / 14, k = eo(p(t, 50.1 + i * .02, .5));
      o += `<path d="M${f(508 + 400 * Math.cos(th))},${f(282 - 122 * Math.sin(th))} L${f(lerp(508 + 400 * Math.cos(th), 508 + 30 * Math.cos(th), k))},${f(lerp(282 - 122 * Math.sin(th), 270 - 14 * Math.sin(th), k))}" stroke="${GOLD}" stroke-width="1.6" opacity=".35"/>`;
    }
    E_DOTS.forEach((d, i) => {
      const a = eo(p(t, 42.35 + d.born * 1.5, .3));
      if (a <= 0) return;
      const x = lerp(d.gx, d.ox, m), y = lerp(d.gy, d.oy, m);
      const wave = m > .5 ? Math.max(0, Math.sin(t * 5.5 - d.j * .95)) : Math.max(0, Math.sin(t * 3 + i * .7)) * .5;
      const s3 = d.th > Math.PI * 2 / 3 ? 0 : d.th > Math.PI / 3 ? 1 : 2;
      const hi = sect === s3 && !goal ? 1 : 0;
      const col = hi ? [GREEN, WHITE, GOLD][s3] : mixHex('#8f7a1e', GOLD, wave);
      o += sparkDot(x, y, (.4 + .12 * wave + .1 * hi) * a, col, (sect >= 0 && !hi && !goal ? .5 : .65 + .35 * wave) * a);
    });
    // conductor / goal
    const ck = pop(t, 45.7, .45);
    if (ck > 0 && !goal) o += agentNode(t, 508, 266, 17, cl(ck, 0, 1.1), false);
    if (goal) o += G(`<circle r="21" fill="#1b1f17" stroke="${GOLD}" stroke-width="3"/>` + ico('target', 0, 0, GOLD, .85), { x: 508, y: 264, s: pop(t, 50.3, .45) });
    [['EVERY CHARGER', 47.4, GREEN, 178], ['EVERY CAR', 48.84, WHITE, 508], ['EVERY SHIFT', 49.56, GOLD, 838]].forEach(([lab, t0, c, x], i) => {
      const k = pop(t, t0, .4);
      if (k > 0) o += pill(x, 126, lab, sect === i && !goal ? c : MUTED, { size: 21, fill: BG, s: cl(k, 0, 1.08), op: cl(k), w: 232 });
    });
  }
  return o;
}

// ---------- F: the goal (51.85 - 54.7) ----------
function sF(t) {
  let o = kicker(t, [[0, 'ONE GOAL']]);
  [['MORE', 'uptime', 'up', 52.12], ['BETTER', 'utilization', 'up', 52.95], ['LOWER', 'cost', 'down', 53.9]].forEach(([a, b, dir, t0], i) => {
    const k = pop(t, t0, .45);
    if (k <= 0) { o += R(30 + i * 328, 66, 300, 206, 18, { stroke: LINE, sw: 2, dash: '6 8', op: .7 }); return; }
    const bob = Math.sin((t - t0) * 6) * 4 * (dir === 'up' ? -1 : 1);
    o += G(R(-150, -103, 300, 206, 18, { fill: '#13221b', stroke: GREEN, sw: 2.5 })
      + `<circle cx="0" cy="-48" r="34" fill="${BG}" stroke="${GREEN}" stroke-width="3"/>` + ico(dir, 0, -48 + bob, GREEN, 1.25)
      + T(0, 28, a, { size: 23, fill: GREEN, anchor: 'middle', ls: 1.5 }) + T(0, 72, b, { size: 40, fill: WHITE, anchor: 'middle' }), { x: 180 + i * 328, y: 169, s: cl(k, 0, 1.06), op: cl(k) });
  });
  return o;
}

// ---------- G: human in the loop (54.8 - 64.75) ----------
function sG(t) {
  let o = kicker(t, [[0, 'KEEPING IT PREDICTABLE']]);
  o += title(t, [[54.88, 'What keeps hundreds of agents {predictable?}'], [57.66, 'At first: {people}'], [59.34, 'Early on, a {human in the loop}'], [62.3, 'Agents {suggest}. People {decide}.']]);
  // restless swarm
  const sw = fin(t, 54.9) * (1 - p(t, 57.5, .5));
  if (sw > 0) {
    for (let i = 0; i < 44; i++) {
      const bx = 60 + rnd(i) * 900, by = 118 + rnd(i + 50) * 150;
      const x = bx + Math.sin(t * (2 + rnd(i + 9) * 3) + i) * 26, y = by + Math.cos(t * (2.4 + rnd(i + 5) * 3) + i * 2) * 14;
      o += sparkDot(x, y, .3 + .12 * rnd(i + 7), GOLD, (.35 + .5 * rnd(i + 2)) * sw);
    }
    o += G(`<circle r="40" fill="${BG}" stroke="${GOLD}" stroke-width="3"/>` + T(0, 17, '?', { size: 50, fill: GOLD, anchor: 'middle' }), { x: 508, y: 190, s: pop(t, 55.2, .45), op: sw });
  }
  if (t >= 57.6) {
    const mv = eio(p(t, 59.3, .6)), px = lerp(508, 786, mv), big = lerp(1.25, 1, mv);
    const loop = t >= 59.5;
    const A = [230, 190], P = [786, 190], TOP = [508, 96], BOT = [508, 284];
    const bez = (a, b, c, u) => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
    if (loop) {
      const k = eo(p(t, 59.8, .8)), sug = t >= 62.3 && t < 63.14, dec = t >= 63.14;
      o += `<path d="M${A[0] + 44},${A[1] - 14} Q${TOP} ${P[0] - 44},${P[1] - 14}" fill="none" stroke="${sug ? GOLD : DIM}" stroke-width="${sug ? 4 : 3}" stroke-dasharray="9 8" stroke-dashoffset="${f(-t * 28)}" opacity="${f(k)}"/>`;
      o += `<path d="M${P[0] - 44},${P[1] + 14} Q${BOT} ${A[0] + 44},${A[1] + 14}" fill="none" stroke="${dec ? GREEN : DIM}" stroke-width="${dec ? 4 : 3}" stroke-dasharray="9 8" stroke-dashoffset="${f(-t * 28)}" opacity="${f(k)}"/>`;
      if (t >= 60.4) {
        const u = ((t - 60.4) / 1.7) % 1;
        const [x1, y1] = bez([A[0] + 44, A[1] - 14], TOP, [P[0] - 44, P[1] - 14], u);
        o += G(R(-17, -12, 34, 24, 6, { fill: GOLD }) + `<path d="M-9,-3 H9 M-9,4 H3" stroke="${BG}" stroke-width="2.5" stroke-linecap="round"/>`, { x: x1, y: y1, op: Math.min(1, u * 6, (1 - u) * 6) });
        const u2 = ((t - 60.4) / 1.7 + .5) % 1;
        const [x2, y2] = bez([P[0] - 44, P[1] + 14], BOT, [A[0] + 44, A[1] + 14], u2);
        o += G(`<circle r="14" fill="${GREEN}"/>` + ico('check', 0, 0, BG, .8), { x: x2, y: y2, op: Math.min(1, u2 * 6, (1 - u2) * 6) });
      }
      o += agentNode(t, A[0], A[1], 40, cl(pop(t, 59.5, .45), 0, 1.1));
      o += T(A[0], 258, 'AGENTS', { size: 20, fill: GOLD, anchor: 'middle', ls: 1.4, op: fin(t, 59.7) });
      o += T(P[0], 258, 'PEOPLE', { size: 20, fill: WHITE, anchor: 'middle', ls: 1.4, op: fin(t, 59.9) });
      if (t < 62.3) o += T(508, 198, 'HUMAN IN THE LOOP', { size: 23, fill: MUTED, anchor: 'middle', ls: 1.4, op: fin(t, 60.9) * (1 - p(t, 62.1, .2)) });
      if (t >= 62.3) o += pill(508, 143, 'SUGGEST', GOLD, { size: 23, fill: sug ? GOLD : BG, tcol: sug ? BG : GOLD, s: pop(t, 62.4, .4), w: 170, h: 42 });
      if (t >= 63.14) o += pill(508, 237, 'DECIDE', GREEN, { size: 23, fill: dec ? GREEN : BG, tcol: dec ? BG : GREEN, s: pop(t, 63.5, .4), w: 150, h: 42 });
    }
    o += personNode(px, 190, 40, loop && t >= 63.14 ? GREEN : WHITE, pop(t, 57.7, .45) * big);
  }
  return o;
}

// ---------- H: the decision log (64.85 - 80.7) ----------
function sH(t) {
  let o = kicker(t, [[0, 'THE DECISION LOG']]);
  o += title(t, [[64.94, 'Every call gets {written down}'], [74.12, 'Overrides teach. Approvals confirm.'], [77.38, 'The log becomes {training data}']]);
  o += R(30, 104, 694, 172, 16, { fill: DARK, stroke: LINE, sw: 2, op: fin(t, 65.1) });
  o += `<path d="M30,190 H724" stroke="${LINE}" stroke-width="2" opacity="${f(fin(t, 65.1))}"/>`;
  if (t < 67.8) for (let r = 0; r < 2; r++) o += R(92, 126 + r * 86, 300, 12, 6, { fill: LINE, op: fin(t, 65.3) * .8 }) + R(92, 150 + r * 86, 420, 10, 5, { fill: LINE, op: fin(t, 65.3) * .5 }) + `<circle cx="62" cy="${147 + r * 86}" r="17" fill="none" stroke="${LINE}" stroke-width="2.5" opacity="${f(fin(t, 65.3))}"/>`;
  // entry 1: approved
  if (t >= 67.8) {
    const ok = t >= 70.08;
    o += ok ? G(`<circle r="17" fill="${GREEN}"/>` + ico('check', 0, 0, BG, .95), { x: 62, y: 147, s: pop(t, 70.08, .4) })
      : `<circle cx="62" cy="147" r="17" fill="none" stroke="${MUTED}" stroke-width="2.5" stroke-dasharray="5 5" transform="rotate(${f(t * 60)} 62 147)"/>`;
    o += T(92, 141, 'Release at 70% for 15 min', { size: 25, fill: WHITE, op: fin(t, 67.92) });
    o += T(92, 171, `<tspan fill="${MUTED}">Why:</tspan> lot jammed, 2 chargers free`, { size: 20, fill: TXT, weight: 500, op: fin(t, 69.34) });
    o += T(432, 171, `<tspan fill="${MUTED}">By:</tspan> <tspan fill="${GREEN}">shift lead</tspan>`, { size: 20, fill: TXT, weight: 500, op: fin(t, 69.86) });
    if (t >= 75.76) o += pill(650, 134, 'SIGNAL', GREEN, { size: 20, fill: '#13221b', s: pop(t, 76.1, .4), w: 116 });
  }
  // entry 2: overridden
  if (t >= 71.26) {
    const a = fin(t, 71.26);
    o += G(`<circle r="17" fill="${RED}"/>` + ico('x', 0, 0, BG, .8), { x: 62, y: 233, s: pop(t, 71.56, .4) });
    o += T(92, 227, 'Pull car 14 off its charger', { size: 25, fill: WHITE, op: a });
    o += T(92, 257, `<tspan fill="${RED}">Overridden:</tspan> booked for a long trip`, { size: 20, fill: TXT, weight: 500, op: fin(t, 72.62) });
    if (t >= 74.12) o += pill(650, 220, 'LESSON', GOLD, { size: 20, fill: '#1b1f17', s: pop(t, 74.6, .4), w: 116 });
  }
  // right column: what / why / who, then training
  const chk = 1 - p(t, 77.15, .25);
  if (chk > 0) [['WHAT', 67.92], ['WHY', 69.34], ['WHO', 69.86]].forEach(([lab, t0], i) => {
    const on = t >= t0, k = fin(t, 65.3 + i * .08);
    o += G(R(0, 0, 232, 48, 14, { fill: on ? '#1b1f17' : TILE, stroke: on ? GOLD : LINE, sw: on ? 2.5 : 2 })
      + T(22, 32, lab, { size: 22, fill: on ? GOLD : DIM, ls: 1.4 })
      + (on ? G(`<circle r="14" fill="${GOLD}"/>` + ico('check', 0, 0, BG, .8), { x: 202, y: 24, s: pop(t, t0, .4) }) : `<circle cx="202" cy="24" r="13" fill="none" stroke="${LINE}" stroke-width="2.5"/>`), { x: 754, y: 106 + i * 58, op: k * chk });
  });
  if (t >= 77.3) {
    const k = pop(t, 77.45, .45), lv = eio(p(t, 78.2, 2.0));
    for (let i = 0; i < 8; i++) {
      const u = ((t - 77.4) / 1.1 + i / 8) % 1, row = i % 2;
      const x = lerp(726, 826, u), y = lerp(row ? 233 : 147, 190, u * u);
      o += `<circle cx="${f(x)}" cy="${f(y)}" r="5" fill="${row ? GOLD : GREEN}" opacity="${f(Math.min(1, u * 5, (1 - u) * 4) * cl(k))}"/>`;
    }
    const circ = 2 * Math.PI * 54;
    o += `<circle cx="872" cy="190" r="54" fill="none" stroke="${LINE}" stroke-width="6" opacity="${f(cl(k))}"/>`;
    o += `<circle cx="872" cy="190" r="54" fill="none" stroke="${GREEN}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${f(circ * .82 * lv)} ${f(circ)}" transform="rotate(-90 872 190)" opacity="${f(cl(k))}"/>`;
    o += agentNode(t, 872, 190, 38, cl(k, 0, 1.1), false);
    o += T(872, 272, 'LEARNING', { size: 20, fill: GREEN, anchor: 'middle', ls: 1.4, op: fin(t, 78.2) });
  }
  return o;
}

// ---------- I: trust earned (80.8 - 87.95) ----------
function sI(t) {
  let o = kicker(t, [[0, 'TRUST, EARNED']]);
  o += title(t, [[81.0, 'Agents get it right {more often}\u2026'], [83.14, '\u2026so people step in {less}'], [84.68, 'Routine runs itself. People take {exceptions}.']]);
  const c1 = 1 - p(t, 84.45, .22);
  if (c1 > 0) {
    const X0 = 60, X1 = 950, sig = u => 1 / (1 + Math.exp(-(u - .5) * 7));
    const gy = u => 240 - 110 * sig(u), hy = u => 132 + 104 * sig(u);
    let gp = '', hp = '';
    for (let i = 0; i <= 60; i++) { const u = i / 60, x = lerp(X0, X1, u); gp += `${i ? 'L' : 'M'}${f(x)},${f(gy(u))} `; hp += `${i ? 'L' : 'M'}${f(x)},${f(hy(u))} `; }
    const g = eio(p(t, 81.2, 1.7)), h = eio(p(t, 83.14, 1.2));
    let d = `<path d="M${X0},258 H${X1}" stroke="${DIM}" stroke-width="2.5"/>` + T(X1, 281, 'time', { size: 20, fill: MUTED, weight: 500, anchor: 'end' });
    d += `<clipPath id="gc"><rect x="${X0 - 8}" y="95" width="${f((X1 - X0 + 16) * g)}" height="170"/></clipPath><clipPath id="hc"><rect x="${X0 - 8}" y="95" width="${f((X1 - X0 + 16) * h)}" height="170"/></clipPath>`;
    d += `<path d="${gp}" fill="none" stroke="${GREEN}" stroke-width="5" stroke-linecap="round" clip-path="url(#gc)"/>`;
    d += `<path d="${hp}" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round" clip-path="url(#hc)"/>`;
    if (g > .02) d += `<circle cx="${f(lerp(X0, X1, g))}" cy="${f(gy(g))}" r="8" fill="${GREEN}"/>`;
    if (h > .02) d += `<circle cx="${f(lerp(X0, X1, h))}" cy="${f(hy(h))}" r="8" fill="${GOLD}"/>`;
    d += T(X1 - 6, 118, 'AGENT GETS IT RIGHT', { size: 20, fill: GREEN, anchor: 'end', ls: 1, op: fin(t, 82.4) });
    d += T(X0 + 4, 118, 'PEOPLE STEP IN', { size: 20, fill: GOLD, ls: 1, op: fin(t, 83.3) });
    o += G(d, { op: c1 * fin(t, 81.0) });
  }
  if (t >= 84.55) {
    const a = fin(t, 84.6);
    const kinds = [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0];
    let d = `<path d="M40,190 H400 L560,140 H826" fill="none" stroke="${DIM}" stroke-width="2.5" stroke-dasharray="6 8"/><path d="M400,190 L560,240 H826" fill="none" stroke="${DIM}" stroke-width="2.5" stroke-dasharray="6 8"/>`;
    d += T(580, 116, 'ROUTINE CALLS', { size: 20, fill: MUTED, ls: 1.2 }) + T(580, 274, 'EXCEPTIONS', { size: 20, fill: GOLD, ls: 1.2 });
    d += T(40, 170, 'INCOMING CALLS', { size: 20, fill: MUTED, ls: 1.2 });
    let hit = 0;
    kinds.forEach((ex, i) => {
      const u = (t - 84.8 - i * .3) / 2.4;
      if (u <= 0 || u >= 1) return;
      let x, y;
      if (u < .44) { x = lerp(40, 400, u / .44); y = 190; }
      else if (u < .64) { const v = (u - .44) / .2; x = lerp(400, 560, v); y = lerp(190, ex ? 240 : 140, v); }
      else { x = lerp(560, 826, (u - .64) / .36); y = ex ? 240 : 140; }
      if (ex && u > .9) hit = 1;
      d += G(R(-14, -14, 28, 28, 8, { fill: ex ? GOLD : TILE, stroke: ex ? GOLD : GREY, sw: 2 })
        + (ex ? T(0, 8, '!', { size: 22, fill: BG, anchor: 'middle' }) : ico('check', 0, 0, u > .5 ? GREEN : GREY, .6)), { x, y, op: Math.min(1, u * 8, (1 - u) * 8) });
    });
    d += agentNode(t, 872, 140, 30, 1, false) + T(916, 147, 'AUTO', { size: 20, fill: GREEN, ls: 1 });
    d += personNode(872, 240, 30, GOLD, 1 + .08 * hit);
    o += G(d, { op: a });
  }
  return o;
}

// ---------- J: the strategic part (88.1 - 95.35) ----------
function sJ(t) {
  let o = kicker(t, [[0, 'THE STRATEGIC PART']]);
  o += title(t, [[88.5, 'What do the agents learn from?'], [89.7, 'Data that is {yours alone}'], [93.78, '{Nobody} can sell it to you']]);
  const V = [806, 178];
  const src = [['YOUR FLEET', 'car', 90.66, 112], ['YOUR SITES', 'site', 91.44, 318], ['YOUR PEOPLE', 'person', 92.32, 524]];
  src.forEach(([lab, kind, t0, x], i) => {
    const k = pop(t, t0, .45);
    if (k <= 0) { o += `<circle cx="${x}" cy="176" r="38" fill="none" stroke="${LINE}" stroke-width="2.5" stroke-dasharray="6 8" opacity="${f(fin(t, 88.6))}"/>`; return; }
    o += `<path d="M${x + 44},176 C${x + 120},${118 + i * 28} ${V[0] - 150},${130 + i * 20} ${V[0] - 56},${V[1]}" fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="7 8" stroke-dashoffset="${f(-t * 30)}" opacity="${f(.75 * cl(k))}"/>`;
    o += G(`<circle r="38" fill="${TILE}" stroke="${WHITE}" stroke-width="3"/>` + (kind === 'car' ? car(0, 0, .62) : ico(kind, 0, kind === 'person' ? 3 : 0, WHITE, 1.15)), { x, y: 176, s: cl(k, 0, 1.1) });
    o += T(x, 248, lab, { size: 20, fill: WHITE, anchor: 'middle', ls: 1.2, op: cl(k) });
  });
  const got = src.filter(s => t >= s[2] + .5).length;
  const vk = pop(t, 88.45, .45);
  o += G(`<circle r="50" fill="#1b1f17" stroke="${GOLD}" stroke-width="3.5"/>` + ico('db', 0, 0, GOLD, 1.35), { x: V[0], y: V[1], s: vk * (1 + .05 * got) });
  o += T(V[0], 262, 'YOUR DATA', { size: 21, fill: GOLD, anchor: 'middle', ls: 1.4, op: cl(vk) });
  if (t >= 93.78) {
    const k = pop(t, 94.0, .45);
    o += G(R(-96, -22, 192, 44, 10, { fill: BG, stroke: RED, sw: 3.5 }) + T(0, 8, 'NOT FOR SALE', { size: 22, fill: RED, anchor: 'middle', ls: 1.2 }), { x: 876, y: 116, s: lerp(1.8, 1, cl(k)), op: cl(k), rot: -7 });
  }
  return o;
}

// ---------- K: the head start (95.45 - 104.35) ----------
function sK(t) {
  let o = kicker(t, [[0, 'THE HEAD START']]);
  o += title(t, [[95.56, 'Anyone can get the {same software}'], [98.82, 'The early starter ends up {a year ahead}'], [101.5, "{Time} is the one thing you can't buy"]]);
  const rows = [['OPERATOR A', 152, GOLD, 'starts early'], ['OPERATOR B', 228, MUTED, 'starts later']];
  const app = (x, y, s) => G(R(-34, -24, 68, 48, 10, { fill: TILE, stroke: WHITE, sw: 2.5 }) + `<path d="M-34,-10 H34" stroke="${WHITE}" stroke-width="2.5"/><circle cx="-24" cy="-17" r="2.5" fill="${WHITE}"/><circle cx="-16" cy="-17" r="2.5" fill="${WHITE}"/>` + sparkDot(0, 6, .5, GOLD), { x, y, s });
  rows.forEach(([lab, y, c, sub], i) => {
    o += T(30, y - 2, lab, { size: 21, fill: WHITE, ls: 1, op: fin(t, 95.6 + i * .1) });
    if (t >= 98.82) o += T(30, y + 22, sub, { size: 19, fill: c, weight: 500, op: fin(t, 98.9 + i * .9) });
    o += app(232, y, pop(t, 96.3 + i * .55, .42));
  });
  if (t >= 97.3 && t < 98.7) o += G(T(0, 0, '=', { size: 40, fill: GOLD, anchor: 'middle' }), { x: 232, y: 203, s: pop(t, 97.4, .4), op: 1 - p(t, 98.5, .2) });
  if (t >= 96.1) {
    const X0 = 300, X1 = 968, gap = 230, v = 270;
    const aEnd = cl(X0 + v * (t - 99.0), X0, X1), bEnd = cl(X0 + v * (t - 99.0) - gap, X0, X1 - gap);
    const a = fin(t, 96.2, .5);
    rows.forEach(([lab, y, c], i) => {
      const end = i ? bEnd : aEnd;
      o += R(X0, y - 13, X1 - X0, 26, 13, { fill: DARK, stroke: LINE, sw: 2, op: a });
      if (end > X0 + 4) o += R(X0, y - 13, end - X0, 26, 13, { fill: i ? GREY : GOLD, op: i ? .85 : 1 });
      if (end > X0 + 4) o += G(`<circle r="17" fill="${BG}" stroke="${i ? GREY : GOLD}" stroke-width="3"/>` + sparkDot(0, 0, .5, i ? GREY : GOLD), { x: end, y });
    });
    if (t >= 100.4) {
      const k = pop(t, 100.5, .45), deny = t >= 102.9;
      const gx0 = bEnd + 22, gx1 = aEnd - 4;
      o += R(gx0, 228 - 15, gx1 - gx0, 30, 13, { fill: 'none', stroke: deny ? RED : GOLD, sw: 2.5, dash: '7 6', op: cl(k) });
      o += G(T(0, 0, '1 YEAR AHEAD', { size: 21, fill: deny ? RED : GOLD, anchor: 'middle', ls: 1 }), { x: (gx0 + gx1) / 2, y: 236, s: cl(k, 0, 1.1), op: cl(k) });
      o += `<path d="M${f(gx0)},168 V208 M${f(gx1)},168 V208" stroke="${GOLD}" stroke-width="2" stroke-dasharray="3 5" opacity="${f(cl(k) * .7)}"/>`;
    }
    if (t >= 101.5) {
      const k = pop(t, 101.6, .4), drop = eio(p(t, 102.5, .4)), bounce = t >= 102.9 ? Math.sin(Math.min(1, (t - 102.9) / .5) * Math.PI) : 0;
      const cx = (bEnd + 22 + aEnd - 4) / 2 + 120 * (1 - drop), cy = 266 + 5 * bounce - (t >= 102.75 && t < 102.9 ? 8 * p(t, 102.75, .15) : 0);
      o += G(`<circle r="17" fill="${GOLD}" stroke="${BG}" stroke-width="2"/>` + T(0, 8, '$', { size: 23, fill: BG, anchor: 'middle' }), { x: cx, y: cy, s: k });
      if (t >= 102.9) o += G(`<path d="M-13,-13 L13,13 M13,-13 L-13,13" stroke="${RED}" stroke-width="6" stroke-linecap="round"/>`, { x: cx, y: cy, s: pop(t, 102.9, .35) });
    }
  }
  return o;
}

// Content 5, version 3: full-screen illustrated sequence "one real call" (15.9 - 40.45 s).
// Drawn on the whole 1080x1920 canvas. Captions sit at y 1248-1438, so that band stays clear.
// Layout: header (y 200-300), depot map viewport (y 330-1175), stats strip (y 1470-1612).

const BAY_X = c => 90 + c * 90;
const ROW_A = { cy: 378, y: 476, rot: -90 }, ROW_B = { cy: 802, y: 704, rot: 90 };
const BAYS = Array.from({ length: 20 }, (_, i) => ({ i, top: i < 10, x: BAY_X(i % 10), ...(i < 10 ? ROW_A : ROW_B) }));
// battery level (%) of the car on each charger at t = 24 s; null = no car
const SOC0 = [66, 77, 73, 58, 71, 64, null, 55, 62, 49, 65, 52, 75, 60, 60, 57, 72, 44, 63, 51];
const EARLY_LEAVER = 13;                      // the one car that gets out during the rush, at 18.9 s
const LEAVE = [1, 2, 4, 12, 16];              // cars released once the rule drops to 70%
const leaveT = i => 37.3 + LEAVE.indexOf(i) * .36;
const AISLE = 590, LANE = 1130, EXIT_X = 985, CS = 1.5, LS = 1.2;   // car scales: charging rows, lot and lane
const LOT = Array.from({ length: 20 }, (_, i) => ({ x: BAY_X(i % 10), y: i < 10 ? 905 : 1012 }));
// the back row fills first, then the row nearest the lane
const LOT_ORDER = [...[...Array(10).keys()].sort((a, b) => rnd(a + 11) - rnd(b + 11)), ...[...Array(10).keys()].sort((a, b) => rnd(a + 31) - rnd(b + 31)).map(v => v + 10)];
const soc = (i, t) => SOC0[i] + .2 * Math.max(0, t - 24);
const threshold = t => lerp(80, 70, eio(p(t, 32.25, .8)));

// position along a polyline at distance d: returns [x, y, heading in degrees]
function along(pts, d) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0);
    if (d <= len || i === pts.length - 2) { const u = cl(d / len); return [lerp(x0, x1, u), lerp(y0, y1, u), Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI]; }
    d -= len;
  }
}
const pathLen = pts => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
function drive(pts, t, t0, speed, body, s) {                // a car driving a path from t0 at constant speed
  if (t < t0) return '';
  const d = speed * (t - t0), L = pathLen(pts);
  if (d > L + 120) return '';
  const [x, y, h] = along(pts, Math.min(d, L));
  return car(x, y, s, body, 1, h);
}

function callMap(t, zoomA) {
  let o = R(40, 340, 1000, 860, 26, { fill: DARK, stroke: LINE, sw: 3 });
  for (let c = 0; c <= 10; c++) { const x = BAY_X(c) - 45; o += `<path d="M${x},418 V540 M${x},640 V762" stroke="${LINE}" stroke-width="2"/>`; }
  o += `<path d="M60,${AISLE} H${EXIT_X} V${LANE}" fill="none" stroke="${LINE}" stroke-width="2" stroke-dasharray="12 14"/>`;
  LOT.forEach(s => { o += R(s.x - 27, s.y - 51, 54, 102, 10, { stroke: LINE, sw: 1.5 }); });
  o += `<path d="M40,1078 H940" stroke="${LINE}" stroke-width="2"/><path d="M60,${LANE} H1020" stroke="${LINE}" stroke-width="2" stroke-dasharray="12 14"/>`;
  // gates
  o += T(62, 1188, 'IN', { size: 22, fill: GOLD, ls: 1.5 });
  for (let i = 0; i < 3; i++) { const ph = ((t * 2.6 - i * .33) % 1 + 1) % 1; o += `<path d="M${106 + i * 17},1172 l8,8 l-8,8" fill="none" stroke="${GOLD}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="${f(.25 + .75 * Math.sin(ph * Math.PI))}"/>`; }
  o += T(1018, 1188, 'OUT', { size: 22, fill: MUTED, ls: 1.5, anchor: 'end' });
  { const ph = ((t * .55) % 1 + 1) % 1; o += `<path d="M936,1172 l8,8 l-8,8" fill="none" stroke="${MUTED}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="${f(.25 + .75 * Math.sin(ph * Math.PI))}"/>`; }

  // ----- waiting lot: 20 slots, cars nose-in from the lane -----
  LOT_ORDER.forEach((slot, k) => {
    const s = LOT[slot];
    if (k < 6) { o += car(s.x, s.y, LS * cl(pop(t, 16.0 + k * .05, .3), 0, 1.1), '#f2f2f2', 1, -90); return; }
    const ta = 18.3 + (k - 6) / 14 * 2.9, pts = [[-70, LANE], [s.x, LANE], [s.x, s.y]];
    if (t < ta) return;
    const d = 1000 * (t - ta), L = pathLen(pts);
    if (d >= L) o += car(s.x, s.y, LS, '#f2f2f2', 1, -90); else { const [x, y, h] = along(pts, d); o += car(x, y, LS, '#f2f2f2', 1, h); }
  });
  // cars backing up in the entry lane once the lot is full
  [0, 1, 2, 3].forEach(j => { o += drive([[-70, LANE], [470 - j * 112, LANE]], t, 21.25 + j * .28, 760, '#f2f2f2', LS); });

  // ----- chargers and the cars on them -----
  const thr = threshold(t);
  BAYS.forEach(b => {
    const i = b.i, leaves = LEAVE.includes(i);
    const hasCar = SOC0[i] !== null;
    const goneAt = i === EARLY_LEAVER ? 18.9 : leaves ? leaveT(i) : Infinity;
    const refill = { 4: 38.8, 2: 39.1, 1: 39.4 }[i];
    const free = !hasCar || (t > goneAt + .35 && !(refill && t > refill + .75));
    if (free) { const r = ((t * 1.1) % 1 + 1) % 1; o += `<circle cx="${b.x}" cy="${b.cy}" r="${f(30 + r * 14)}" fill="none" stroke="${GREEN}" stroke-width="3" opacity="${f(1 - r)}"/>`; }
    o += charger(b.x - 5, b.cy, true, { s: .86, glow: 1, col: free ? GREEN : GREY, op: free ? 1 : .8 });
    if (!hasCar) return;
    const ready = leaves && t >= 32.3 && soc(i, t) >= thr;
    const body = ready ? '#bff3d6' : '#f2f2f2';
    if (t < goneAt) o += car(b.x, b.y, CS, body, 1, b.rot);
    else o += drive([[b.x, b.y], [b.x, AISLE], [EXIT_X, AISLE], [EXIT_X, LANE], [1160, LANE]], t, goneAt, i === EARLY_LEAVER ? 340 : 640, body, CS);
    // battery gauge beside each charging car (only drawn when zoomed in)
    if (b.top && zoomA > .02 && t < goneAt + .2) {
      const v = soc(i, t), x = b.x + 45, y0 = 432, col = ready ? GREEN : GOLD, H = 88;
      let g = R(x - 8, y0, 16, H, 5, { fill: BG, stroke: '#6b7882', sw: 2 }) + R(x - 4.5, y0 + H - 3 - (H - 6) * v / 100, 9, (H - 6) * v / 100, 2.5, { fill: col });
      const my = y0 + H - 3 - (H - 6) * thr / 100;
      g += `<path d="M${x - 12},${f(my)} H${x + 12}" stroke="${t >= 32.25 ? GOLD : WHITE}" stroke-width="3" stroke-linecap="round"/>`;
      g += T(x - 4, y0 + H + 22, `${Math.floor(v)}%`, { size: 16, fill: ready ? GREEN : WHITE, anchor: 'middle' });
      o += G(g, { op: zoomA * (1 - p(t, goneAt, .2)) });
    }
  });

  // ----- cars stuck in the aisle, waiting for a charger -----
  [[420, 25.6, 4, 38.8], [286, 25.95, 2, 39.1], [152, 26.3, 1, 39.4]].forEach(([qx, t0, bay, go]) => {
    if (t < t0) return;
    const b = BAYS[bay], pts = [[qx, AISLE], [b.x, AISLE], [b.x, b.y]];
    if (t >= go) { o += 640 * (t - go) > pathLen(pts) ? car(b.x, b.y, CS, '#f2f2f2', 1, -90) : drive(pts, t, go, 640, '#f2f2f2', CS); return; }
    const x = lerp(-80, qx, eo(p(t, t0, .7)));
    const pulse = .5 + .5 * Math.sin(t * 6 + qx);
    o += R(x - 66, AISLE - 38, 132, 76, 16, { stroke: RED, sw: 3, op: (.35 + .5 * pulse) * zoomA });
    o += car(x, AISLE, CS);
    o += G(R(-15, -8, 30, 16, 4, { fill: BG, stroke: RED, sw: 2 }) + R(-12, -5, 7, 10, 1.5, { fill: RED }) + `<rect x="16" y="-3" width="3" height="6" fill="${RED}"/>`, { x: x - 3, y: AISLE, op: zoomA });
  });

  // ----- callouts on the wide view -----
  if (t >= 21.22 && t < 24.6) {
    const a = 1 - p(t, 23.9, .4);
    o += R(54, 846, 884, 226, 18, { stroke: RED, sw: 4, dash: '14 10', op: fin(t, 21.22) * a });
    o += pill(496, 846, 'LOT JAMMED', RED, { size: 28, fill: BG, s: pop(t, 21.22, .4), op: a, w: 250, h: 50 });
  }
  if (t >= 21.92 && t < 24.6) {
    const a = 1 - p(t, 23.9, .4);
    [6, 13].forEach(i => { const b = BAYS[i]; o += `<circle cx="${b.x}" cy="${b.y}" r="62" fill="rgba(111,227,165,.10)" stroke="${GREEN}" stroke-width="3.5" opacity="${f(cl(pop(t, 21.95, .4)) * a)}"/>`; });
    o += pill(496, AISLE, 'ONLY 2 CHARGERS FREE', GREEN, { size: 28, fill: BG, s: pop(t, 22.05, .4), op: a, w: 430, h: 50 });
  }
  return o;
}

function callCard(t) {                         // the agent's suggestion, bottom of the map area
  const k = eo(p(t, 29.45, .5));
  if (k <= 0) return '';
  let o = R(40, 876, 1000, 324, 26, { fill: '#10181f', stroke: GOLD, sw: 3 });
  o += agentNode(t, 92, 926, 26, 1, true) + T(134, 936, 'AGENT SUGGESTS', { size: 27, fill: GOLD, ls: 1.6 });
  o += T(66, 1004, 'RELEASE CARS AT', { size: 23, fill: MUTED, ls: 1.5, op: fin(t, 31.5) });
  const k70 = pop(t, 32.25, .45);
  if (k70 > 0) o += G(T(0, 0, '70%', { size: 140, fill: GOLD }), { x: 58, y: 1134, s: .6 + .4 * k70, op: cl(k70) });
  if (t >= 33.24) {
    const a = fin(t, 33.24), cut = eo(p(t, 33.8, .35));
    o += T(386, 1060, 'instead of', { size: 25, fill: MUTED, weight: 500, op: a });
    o += T(382, 1134, '80%', { size: 74, fill: MUTED, op: a * lerp(1, .55, cut) });
    if (cut > 0) o += `<path d="M374,1109 H${f(374 + 170 * cut)}" stroke="${RED}" stroke-width="7" stroke-linecap="round"/>`;
  }
  const tk = pop(t, 34.9, .42);
  if (tk > 0) {
    const rem = 900 - Math.floor(Math.max(0, t - 35.6)), circ = 2 * Math.PI * 36;
    o += G(R(0, 0, 404, 136, 18, { fill: TILE, stroke: GOLD, sw: 2.5 })
      + `<circle cx="62" cy="68" r="36" fill="none" stroke="${LINE}" stroke-width="9"/><circle cx="62" cy="68" r="36" fill="none" stroke="${GOLD}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${f(circ * (1 - .12 * p(t, 35.4, 4)))} ${f(circ)}" transform="rotate(-90 62 68)"/>`
      + T(122, 42, 'FOR THE NEXT', { size: 21, fill: MUTED, ls: 1.4 })
      + T(120, 96, `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`, { size: 56, fill: GOLD })
      + T(280, 96, 'min', { size: 27, fill: MUTED, weight: 500 })
      + T(122, 123, 'then back to 80%', { size: 20, fill: MUTED, weight: 500 }), { x: 612, y: 892 + (1 - cl(tk)) * 10, op: cl(tk) });
  }
  const ik = pop(t, 37.05, .42);
  if (ik > 0) {
    const freed = LEAVE.filter(i => t >= leaveT(i) + .3).length;
    const last = freed ? leaveT(LEAVE[freed - 1]) + .3 : 0;
    o += G(R(0, 0, 404, 146, 18, { fill: '#13221b', stroke: GREEN, sw: 2.5 })
      + T(24, 40, 'FREES UP RIGHT NOW', { size: 21, fill: GREEN, ls: 1.4 })
      + G(T(0, 0, `+${freed}`, { size: 92, fill: GREEN }), { x: 20, y: 126, s: freed ? 1 + .14 * (1 - p(t, last, .3)) : 1 })
      + T(164, 96, 'chargers', { size: 34, fill: WHITE }) + T(164, 128, 'for waiting cars', { size: 23, fill: MUTED, weight: 500 }), { x: 612, y: 1040 + (1 - cl(ik)) * 10, op: cl(ik) });
  }
  return G(o, { y: (1 - k) * 60, op: k });
}

function callStrip(t) {                        // three tiles under the captions
  const tile = (i, label, value, col, o = {}) => G(R(0, 0, 320, 142, 20, { fill: TILE, stroke: o.hot ? col : LINE, sw: o.hot ? 3 : 2 })
    + T(24, 42, label, { size: 22, fill: MUTED, ls: 1.4 }) + (o.inner ?? G(T(0, 0, value, { size: 62, fill: col }), { x: 24, y: 112, s: o.bump ?? 1 })), { x: 40 + i * 340, y: 1470 });
  const bars = (n, col, speed) => { let s = ''; for (let k = 0; k < 6; k++) { const on = k < n, pulse = on ? .65 + .35 * Math.sin(t * speed - k * .7) : 1; s += R(24 + k * 46, 66, 34, 50, 8, { fill: on ? col : BG, stroke: on ? 'none' : LINE, sw: 2, op: pulse }); } return s; };
  const stage2 = eio(p(t, 24.0, .5));
  let o = '';
  if (stage2 < 1) {
    const flow = fin(t, 18.32, .4);
    const a = G(tile(0, 'ARRIVING', '', GOLD, { inner: bars(t < 18.32 ? 2 : 6, GOLD, 9), hot: t >= 18.32 })
      + tile(1, 'LEAVING', '', MUTED, { inner: bars(1, GREY, 2) })
      + tile(2, 'CHARGERS FREE', '', GREEN, { hot: t >= 21.92, inner: t >= 21.92
        ? G(T(0, 0, `<tspan fill="${GREEN}">2</tspan><tspan fill="${MUTED}" font-size="40"> of 20</tspan>`, { size: 62, fill: GREEN }), { x: 24, y: 112, s: .8 + .2 * cl(pop(t, 21.95, .4), 0, 1.2) })
        : T(24, 110, '\u2026', { size: 62, fill: DIM }) }), { op: 1 - stage2 });
    o += a;
  }
  if (stage2 > 0) {
    const switched = t >= 32.25, freed = LEAVE.filter(i => t >= leaveT(i) + .3).length;
    o += G(tile(0, 'RELEASE RULE', switched ? '70%' : '80%', switched ? GOLD : WHITE, { hot: switched, bump: switched ? 1 + .15 * (1 - p(t, 32.25, .4)) : 1 })
      + tile(1, 'WAITING LOT', 'FULL', RED)
      + tile(2, 'CHARGERS FREED', `+${freed}`, freed ? GREEN : DIM, { hot: freed > 0 }), { op: stage2 });
  }
  return o;
}

function fsCall(t) {
  // camera: wide, push in on the top-left chargers while the rule is discussed, back out for the payoff
  const zoomA = eio(p(t, 23.9, 1.0)) * (1 - eio(p(t, 36.6, .9)));
  const s = 1 + .9 * zoomA;                      // 1.9x at full zoom: chargers 0-4 of the top row plus the aisle
  const tx = lerp(0, 40 - 48 * s, zoomA), ty = lerp(0, 336 - 345 * s, zoomA);
  let o = '';
  o += T(40, 238, 'ONE REAL CALL', { size: 30, fill: GOLD, ls: 2 });
  o += swap(t, [[16.1, 'A depot, mid-rush'], [18.32, 'Cars arrive {faster} than they leave'], [20.72, 'Lot jammed. Only {2 of 20} chargers free.'],
    [24.12, 'Every car waits to reach {80%}\u2026'], [26.34, '\u2026while holding a charger others need'], [29.5, 'The agent suggests one {change}'],
    [31.5, 'Release earlier, {just for now}'], [37.02, 'That opens up {5 chargers} at once']],
    (v, al, dy) => T(40, 296 + dy, v, { size: 46, fill: WHITE, op: al }));
  o += `<g clip-path="url(#mapClip)"><g transform="translate(${f(tx)},${f(ty)}) scale(${f(s)})">${callMap(t, zoomA)}</g></g>`;
  o += callCard(t);
  o += callStrip(t);
  return o;
}

// Content 5, version 3: full-screen illustrated sequence "like an orchestra" (44.9 - 51.7 s).
// Hundreds of agent sparks start scattered across the stage, then seat themselves in a horseshoe
// around the conductor. Three sections light up in turn (charger, car, shift), then all play to one goal.
// Layout matches the first block: header (y 200-300), stage (y 340-1200), strip under the captions (y 1470-1612).

const OC = { x: 540, y: 915 }, O_A0 = -20 * Math.PI / 180, O_A1 = 200 * Math.PI / 180;
const O_SEC = th => th > O_A0 + (O_A1 - O_A0) * 2 / 3 ? 0 : th > O_A0 + (O_A1 - O_A0) / 3 ? 1 : 2;   // 0 left, 1 centre, 2 right
const O_COL = [GREEN, WHITE, GOLD], O_T = [47.4, 48.84, 49.56];
const oPt = (r, th) => [OC.x + r * Math.cos(th), OC.y - r * Math.sin(th)];
const O_DOTS = (() => {
  const out = [];
  let n = 0;
  for (let j = 0; j < 7; j++) {
    const r = 150 + j * 53.3, cnt = Math.round((O_A1 - O_A0) * r / 37);
    for (let q = 0; q < cnt; q++, n++) {
      const th = O_A0 + (O_A1 - O_A0) * (q + .5) / cnt, [ox, oy] = oPt(r, th);
      out.push({ n, j, th, ox, oy, sec: O_SEC(th), born: rnd(n + 3) });
    }
  }
  // starting positions: a loose grid over the whole stage, in shuffled order
  const cols = 16, rows = Math.ceil(out.length / cols);
  out.map((_, i) => i).sort((a, b) => rnd(a + 77) - rnd(b + 77)).forEach((idx, k) => {
    out[idx].gx = 90 + (k % cols) * 60 + (rnd(k + 5) - .5) * 14;
    out[idx].gy = 400 + Math.floor(k / cols) * (740 / (rows - 1)) + (rnd(k + 9) - .5) * 14;
  });
  return out;
})();
function oArc(r) {                              // one seating row, drawn left to right over the top
  const [x1, y1] = oPt(r, O_A1), [x0, y0] = oPt(r, O_A0);
  return `M${f(x1)},${f(y1)} A${r},${r} 0 1 1 ${f(x0)},${f(y0)}`;
}
function oWedge(a0, a1, r0, r1) {               // one section of the horseshoe
  const [ax, ay] = oPt(r1, a1), [bx, by] = oPt(r1, a0), [cx, cy] = oPt(r0, a0), [dx, dy] = oPt(r0, a1);
  return `M${f(ax)},${f(ay)} A${r1},${r1} 0 0 1 ${f(bx)},${f(by)} L${f(cx)},${f(cy)} A${r0},${r0} 0 0 0 ${f(dx)},${f(dy)} Z`;
}

function orchStrip(t, sect, goal) {
  const show = fin(t, 46.3, .4), merge = eio(p(t, 50.08, .45));
  let o = '';
  if (merge < 1) ['CHARGER', 'CAR', 'SHIFT'].forEach((lab, i) => {
    const on = t >= O_T[i], cur = sect === i && !goal, col = O_COL[i];
    o += G(R(0, 0, 320, 142, 20, { fill: cur ? '#16222b' : TILE, stroke: on ? col : LINE, sw: cur ? 3.5 : 2 })
      + T(24, 42, 'EVERY', { size: 22, fill: MUTED, ls: 1.4 })
      + G(T(0, 0, lab, { size: 50, fill: on ? col : DIM }), { x: 24, y: 110, s: on ? 1 + .12 * (1 - p(t, O_T[i], .35)) : 1 }), { x: 40 + i * 340, y: 1470, op: show * (1 - merge) });
  });
  if (merge > 0) o += G(R(0, 0, 1000, 142, 20, { fill: '#1b1f17', stroke: GOLD, sw: 3 })
    + `<circle cx="80" cy="71" r="46" fill="${BG}" stroke="${GOLD}" stroke-width="3"/>` + ico('target', 80, 71, GOLD, 1.7, BG)
    + T(156, 52, 'EVERY CHARGER \u00b7 EVERY CAR \u00b7 EVERY SHIFT', { size: 22, fill: MUTED, ls: 1.2 })
    + T(154, 114, 'ONE GOAL', { size: 60, fill: GOLD, ls: 1 }), { x: 40, y: 1470, op: merge });
  return o;
}

function fsOrch(t) {
  const m = eio(p(t, 45.3, 1.1));                // 0 = scattered, 1 = seated
  const goal = t >= 50.08, gk = eio(p(t, 50.1, .7));
  const sect = t >= O_T[2] ? 2 : t >= O_T[1] ? 1 : t >= O_T[0] ? 0 : -1;
  let o = T(40, 238, 'NOW SCALE IT', { size: 30, fill: GOLD, ls: 2 });
  o += pill(960, 228, 'HUNDREDS', GOLD, { size: 24, fill: '#1b1f17', w: 160, h: 44 });
  o += swap(t, [[44.4, 'Hundreds of agents, working together'], [45.24, 'In concert, like an {orchestra}'], [46.7, 'Coordinating {every charger}'],
    [48.84, 'Every {car}, every {shift}'], [50.08, 'All playing toward {one goal}']],
    (v, al, dy) => T(40, 296 + dy, v, { size: 46, fill: WHITE, op: al }));
  o += R(40, 340, 1000, 860, 26, { fill: DARK, stroke: LINE, sw: 3 });

  // seating rows and section tints
  for (let j = 0; j < 7; j++) o += `<path d="${oArc(150 + j * 53.3)}" fill="none" stroke="${LINE}" stroke-width="1.5" opacity="${f(.55 * m)}"/>`;
  const third = (O_A1 - O_A0) / 3;
  [0, 1, 2].forEach(i => {
    if (t < O_T[i]) return;
    const cur = sect === i && !goal, a0 = O_A0 + third * (2 - i);
    o += `<path d="${oWedge(a0 + .012, a0 + third - .012, 124, 496)}" fill="${O_COL[i]}" opacity="${f(fin(t, O_T[i], .35) * (cur ? .1 : .045))}"/>`;
  });

  // everything converges on the goal
  if (goal) O_DOTS.forEach(d => {
    const k = eo(p(t, 50.1 + d.born * .25, .55)), dist = Math.hypot(d.ox - OC.x, d.oy - OC.y), u = lerp(0, 1 - 66 / dist, k);
    o += `<path d="M${f(d.ox)},${f(d.oy)} L${f(lerp(d.ox, OC.x, u))},${f(lerp(d.oy, OC.y, u))}" stroke="${GOLD}" stroke-width="1.5" opacity="${f(.22 * (1 - .5 * p(t, 51.0, .6)))}"/>`;
  });

  // the agents
  O_DOTS.forEach(d => {
    const a = eo(p(t, 44.55 + d.born * .5, .3));
    if (a <= 0) return;
    const x = lerp(d.gx, d.ox, m), y = lerp(d.gy, d.oy, m);
    const wave = m > .5 ? Math.max(0, Math.sin(t * 5.5 - d.j * .95)) : Math.max(0, Math.sin(t * 3 + d.n * .7)) * .5;
    let col = mixHex('#8f7a1e', GOLD, wave), s = .5 + .12 * wave, op = .6 + .4 * wave;
    if (goal) {
      const inward = Math.max(0, Math.sin(t * 7 + d.j * .95));
      col = mixHex(t >= O_T[d.sec] ? O_COL[d.sec] : GOLD, GOLD, gk); s = .54 + .16 * inward; op = .75 + .25 * inward;
    } else if (sect >= 0) {
      if (d.sec === sect) { col = O_COL[d.sec]; s = .6 + .16 * wave; op = 1; }
      else if (d.sec < sect) { col = O_COL[d.sec]; op = .5 + .25 * wave; }
      else op = .38 + .2 * wave;
    }
    o += sparkDot(x, y, s * a, col, op * a);
  });

  // section badges
  [[243, 826], [540, 605], [837, 826]].forEach(([bx, by], i) => {
    const k = pop(t, O_T[i], .45);
    if (k <= 0) return;
    const cur = sect === i && !goal, col = O_COL[i];
    if (cur) { const r = ((t - O_T[i]) % 1.1) / 1.1; o += `<circle cx="${bx}" cy="${by}" r="${f(74 + r * 34)}" fill="none" stroke="${col}" stroke-width="3" opacity="${f(1 - r)}"/>`; }
    const icon = i === 0 ? charger(-5, -1, true, { s: 1.3, glow: .6 + .4 * Math.sin(t * 6), col }) : i === 1 ? car(0, 0, 1.35) : ico('time', 0, 0, col, 2.4, BG);
    o += G(`<circle r="72" fill="${BG}" stroke="${col}" stroke-width="${cur ? 5 : 3.5}"/>` + icon, { x: bx, y: by, s: cl(k, 0, 1.08) * (cur ? 1.05 : 1), op: cl(k) * (cur || goal ? 1 : .85) });
  });

  // the conductor, which becomes the goal
  const ck = pop(t, 45.5, .45);
  if (ck > 0 && t < 50.45) o += G(agentNode(t, OC.x, OC.y, 52, cl(ck, 0, 1.1)), { op: 1 - p(t, 50.2, .25) });
  if (goal) {
    const tk = pop(t, 50.25, .45), r = ((t - 50.25) % 1.2) / 1.2;
    if (tk > 0) {
      o += `<circle cx="${OC.x}" cy="${OC.y}" r="${f(62 + r * 40)}" fill="none" stroke="${GOLD}" stroke-width="3" opacity="${f((1 - r) * cl(tk))}"/>`;
      o += G(`<circle r="60" fill="#1b1f17" stroke="${GOLD}" stroke-width="4.5"/>` + ico('target', 0, 0, GOLD, 2.3, '#1b1f17'), { x: OC.x, y: OC.y, s: cl(tk, 0, 1.1), op: cl(tk) });
    }
  }
  o += swap(t, [[45.7, 'DEPOT OS'], [50.3, 'ONE GOAL']], (v, al) => pill(OC.x, OC.y + 98, v, v === 'ONE GOAL' ? GOLD : WHITE,
    { size: 24, fill: v === 'ONE GOAL' ? GOLD : BG, tcol: v === 'ONE GOAL' ? BG : WHITE, w: 172, h: 44, op: al }));
  o += orchStrip(t, sect, goal);
  return o;
}

// Content 5, version 3: full-screen illustrated sequence "the decision log" (64.75 - 80.7 s).
// A list of logged calls fills the stage; two entries open up as large cards (one approved, one
// overridden) and fill in what / why / who. Then the log shrinks to a column and feeds the agent.
// Layout matches the other blocks: header (y 200-300), stage (y 340-1200), strip (y 1470-1612).

const LG = { x: 70, w: 940, y0: 372, rowH: 104, step: 116, cardH: 280, c1: 372, c2: 664, s: .56 };
const LG_ROWS = [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1];        // 1 = approved, 0 = overridden
const lgRowY = i => LG.y0 + i * LG.step;
const LG_CARD1 = { tIn: 67.7, tWhat: 67.92, what: 'Release cars at 70% for 15 min', tWhy: 69.34, why: 'Lot jammed, 2 of 20 chargers free',
  tWho: 69.86, who: `<tspan fill="${GREEN}">Approved</tspan> by shift lead`, tDone: 70.08, ok: 1, tGlow: 75.76, tTag: 76.3, tag: 'SIGNAL', tagCol: GREEN };
const LG_CARD2 = { tIn: 71.2, tWhat: 71.3, what: 'Pull car 14 off its charger', tWhy: 72.62, why: 'Booked for a long trip',
  tWho: 71.62, who: `<tspan fill="${RED}">Overridden</tspan> by shift lead`, tDone: 71.56, ok: 0, tGlow: 74.12, tTag: 74.7, tag: 'LESSON', tagCol: GOLD };

function lgRow(i, op, dy) {                      // a collapsed log entry
  const y = lgRowY(i), ok = LG_ROWS[i], c = ok ? GREEN : RED;
  return G(R(LG.x, y, LG.w, LG.rowH, 18, { fill: TILE, stroke: LINE, sw: 2 })
    + `<circle cx="${LG.x + 62}" cy="${y + 52}" r="27" fill="${ok ? '#173226' : '#3a2020'}" stroke="${c}" stroke-width="2.5"/>` + ico(ok ? 'check' : 'x', LG.x + 62, y + 52, c, 1.35)
    + R(LG.x + 122, y + 28, 300 + rnd(i + 4) * 220, 18, 9, { fill: LINE })
    + R(LG.x + 122, y + 62, 420 + rnd(i + 9) * 280, 13, 6.5, { fill: LINE, op: .6 }), { y: dy, op });
}
function lgCard(t, y, c) {                       // an opened log entry
  const k = eo(p(t, c.tIn, .4));
  if (k <= 0) return '';
  const done = t >= c.tDone, glow = t >= c.tGlow, col = c.ok ? GREEN : RED;
  let o = R(0, 0, LG.w, LG.cardH, 22, { fill: glow ? (c.ok ? '#13221b' : '#1b1f17') : TILE, stroke: glow ? c.tagCol : done ? col : LINE, sw: glow ? 4.5 : 3 });
  o += done ? G(`<circle r="34" fill="${col}"/>` + ico(c.ok ? 'check' : 'x', 0, 0, BG, 2, col), { x: 64, y: 74, s: cl(pop(t, c.tDone, .4), 0, 1.15) })
    : `<circle cx="64" cy="74" r="32" fill="none" stroke="${MUTED}" stroke-width="3.5" stroke-dasharray="9 9" transform="rotate(${f(t * 70)} 64 74)"/>`;
  o += T(124, 50, 'WHAT', { size: 22, fill: GOLD, ls: 1.6 });
  o += T(122, 102, c.what, { size: 40, fill: WHITE, op: fin(t, c.tWhat) });
  o += `<path d="M124,132 H${LG.w - 30}" stroke="${LINE}" stroke-width="2"/>`;
  o += T(124, 184, 'WHY', { size: 22, fill: t >= c.tWhy ? GOLD : DIM, ls: 1.6 });
  o += t >= c.tWhy ? T(214, 186, c.why, { size: 31, fill: TXT, weight: 500, op: fin(t, c.tWhy) }) : R(214, 166, 380, 18, 9, { fill: LINE, op: .7 });
  o += T(124, 244, 'WHO', { size: 22, fill: t >= c.tWho ? GOLD : DIM, ls: 1.6 });
  o += t >= c.tWho ? T(214, 246, c.who, { size: 31, fill: TXT, weight: 500, op: fin(t, c.tWho) }) : R(214, 226, 300, 18, 9, { fill: LINE, op: .7 });
  if (t >= c.tTag) o += pill(LG.w - 108, 46, c.tag, c.tagCol, { size: 26, fill: BG, s: cl(pop(t, c.tTag, .4), 0, 1.1), w: 164, h: 44 });
  return G(o, { x: LG.x, y: y + (1 - k) * 14, op: k });
}

function logStrip(t) {
  const stage2 = eio(p(t, 73.75, .4));
  let o = '';
  if (stage2 < 1) [['WHAT', 67.92], ['WHY', 69.34], ['WHO', 69.86]].forEach(([lab, t0], i) => {
    const on = t >= t0;
    o += G(R(0, 0, 320, 142, 20, { fill: on ? '#1b1f17' : TILE, stroke: on ? GOLD : LINE, sw: on ? 3 : 2 })
      + T(24, 42, 'LOGGED', { size: 22, fill: MUTED, ls: 1.4 })
      + T(24, 110, lab, { size: 56, fill: on ? GOLD : DIM })
      + (on ? G(`<circle r="24" fill="${GOLD}"/>` + ico('check', 0, 0, BG, 1.4, GOLD), { x: 266, y: 88, s: cl(pop(t, t0, .4), 0, 1.15) })
        : `<circle cx="266" cy="88" r="23" fill="none" stroke="${LINE}" stroke-width="3"/>`), { x: 40 + i * 340, y: 1470, op: 1 - stage2 });
  });
  if (stage2 > 0) [['EVERY OVERRIDE', 'LESSON', GOLD, 74.12, 74.7], ['EVERY APPROVAL', 'SIGNAL', GREEN, 75.76, 76.3], ['THE RECORD', 'TRAINING', WHITE, 77.38, 78.64]].forEach(([lab, val, col, t0, t1], i) => {
    const on = t >= t0, full = t >= t1;
    o += G(R(0, 0, 320, 142, 20, { fill: TILE, stroke: on ? col : LINE, sw: on ? 3 : 2 })
      + T(24, 42, lab, { size: 22, fill: on ? MUTED : DIM, ls: 1.4 })
      + (full ? G(T(0, 0, val, { size: 52, fill: col }), { x: 24, y: 110, s: 1 + .12 * (1 - p(t, t1, .35)) }) : T(24, 108, '\u2026', { size: 52, fill: DIM })), { x: 40 + i * 340, y: 1470, op: stage2 });
  });
  return o;
}

function fsLog(t) {
  let o = T(40, 238, 'THE DECISION LOG', { size: 30, fill: GOLD, ls: 2 });
  o += swap(t, [[64.8, 'Every call gets {written down}'], [67.92, 'Each entry: {what} was suggested'], [69.34, '{Why}, and {who} approved it'],
    [71.26, 'An override needs a {reason}'], [74.12, 'Override = a {lesson}'], [75.76, 'Approval = a {signal}'], [77.38, 'The log becomes {training data}']],
    (v, al, dy) => T(40, 296 + dy, v, { size: 46, fill: WHITE, op: al }));
  o += R(40, 340, 1000, 860, 26, { fill: DARK, stroke: LINE, sw: 3 });

  // the log: collapsed rows, two of them opened as cards; it shrinks to a column at 77.25 s
  const pb = eio(p(t, 77.25, .8)), s = lerp(1, LG.s, pb);
  let log = '';
  for (let i = 0; i < 12; i++) {
    const arrive = i < 7 ? eo(p(t, 65.1 + i * .26, .35)) : 1;
    const op = arrive * (i < 3 ? 1 - p(t, 67.55, .3) : i < 5 ? 1 - p(t, 71.05, .25) : i < 7 ? 1 : pb);
    if (op > 0) log += lgRow(i, op, (1 - arrive) * -18);
  }
  log += lgCard(t, LG.c1, LG_CARD1) + lgCard(t, LG.c2, LG_CARD2);
  o += `<g clip-path="url(#mapClip)"><g transform="translate(${f(LG.x * (1 - s))},${f(LG.y0 * (1 - s))}) scale(${f(s)})">${log}</g></g>`;

  // the record flows into the agent
  if (t >= 77.3) {
    const AX = 818, AY = 770, k = pop(t, 77.7, .45), x0 = LG.x + LG.w * LG.s + 10, x1 = AX - 116;
    const src = [[LG.c1 + 140, 1], [LG.c2 + 140, 0], ...[5, 6, 7, 8, 9, 10, 11].map(i => [lgRowY(i) + 52, LG_ROWS[i]])].map(([y, ok]) => [LG.y0 + (y - LG.y0) * LG.s, ok]);
    src.forEach(([y, ok], n) => {
      const P = [[x0, y], [x0 + 80, y], [x1 - 80, AY], [x1, AY]];
      o += `<path d="M${f(P[0][0])},${f(y)} C${f(P[1][0])},${f(y)} ${f(P[2][0])},${AY} ${f(x1)},${AY}" fill="none" stroke="${LINE}" stroke-width="2" opacity="${f(pb)}"/>`;
      if (t < 77.9) return;
      for (let q = 0; q < 2; q++) {
        const u = ((t - 77.9) / 1.3 + q / 2 + rnd(n + 2)) % 1, v = 1 - u;
        if ((t - 77.9) / 1.3 + q / 2 + rnd(n + 2) < 1 && u < rnd(n + 2) + q / 2) continue;      // not emitted yet
        const bx = v * v * v * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u * u * u * P[3][0];
        const by = v * v * v * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u * u * u * P[3][1];
        o += `<circle cx="${f(bx)}" cy="${f(by)}" r="7.5" fill="${ok ? GREEN : GOLD}" opacity="${f(Math.min(1, u * 6, (1 - u) * 5))}"/>`;
      }
    });
    const circ = 2 * Math.PI * 98, lv = eio(p(t, 78.2, 2.1));
    o += `<circle cx="${AX}" cy="${AY}" r="98" fill="${BG}" stroke="${LINE}" stroke-width="9" opacity="${f(cl(k))}"/>`;
    o += `<circle cx="${AX}" cy="${AY}" r="98" fill="none" stroke="${GREEN}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${f(circ * .86 * lv)} ${f(circ)}" transform="rotate(-90 ${AX} ${AY})" opacity="${f(cl(k))}"/>`;
    o += agentNode(t, AX, AY, 64, cl(k, 0, 1.1), false);
    o += T(AX, AY - 136, 'THE AGENT', { size: 24, fill: MUTED, anchor: 'middle', ls: 1.6, op: fin(t, 77.9) });
    o += T(AX, AY + 158, 'LEARNING', { size: 30, fill: GREEN, anchor: 'middle', ls: 1.8, op: fin(t, 78.3) });
    o += T(AX, AY + 194, 'from every approval', { size: 23, fill: MUTED, weight: 500, anchor: 'middle', op: fin(t, 78.7) });
    o += T(AX, AY + 224, 'and every override', { size: 23, fill: MUTED, weight: 500, anchor: 'middle', op: fin(t, 78.9) });
  }
  o += logStrip(t);
  return o;
}

// Content 5, version 3: what is on screen when.
// [start, end, scene]: blocks where the illustration takes the whole frame
const FULL = [[15.9, 40.45, fsCall], [44.9, 51.7, fsOrch], [64.75, 80.7, fsLog]];
// box scenes (top panel) while the speaker is on camera; reused from version 1
const BOX = [[11.68, 15.9, sB], [40.45, 45.3, sE], [51.85, 54.7, sF], [54.8, 64.75, sG], [80.8, 87.95, sI], [88.1, 95.35, sJ], [95.45, 103.9, sK]];
// no graphics over the hook (0 - 11.7 s) or the last moments, so the video opens and closes on the speaker
const BOX_WINDOWS = [[11.68, 103.7]];

// ---- Added for the article. Not in the video's overlay source. ----
// The clip path for the depot map and the decision log, which the overlay kept in DEFS (see note 1 at the top of
// this file). The clipPath markup is the overlay's own line, unchanged.
const MAP_DEFS = `<defs><clipPath id="mapClip"><rect x="40" y="330" width="1000" height="872" rx="26"/></clipPath></defs>`;
FULL.forEach(entry => {
  const scene = entry[2];
  if (scene === fsCall || scene === fsLog) entry[2] = t => MAP_DEFS + scene(t);
});
window.SERIES_SCENES = {BOX: typeof BOX === 'undefined' ? [] : BOX, FULL: typeof FULL === 'undefined' ? [] : FULL, BG: BG};
})();
