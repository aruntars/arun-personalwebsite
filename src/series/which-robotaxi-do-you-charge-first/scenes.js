// The on-screen graphics from the video, as drawn for it: each scene is a function of time that returns SVG.
// Copied from the video's overlay source. src/build.py wraps this file and hands BOX and FULL to the player.
//
// Changes from the overlay source. Everything from the line "Overlay band for content4" down to the block marked
// "Added for the article" at the very end is the overlay's script as it was, up to its DEFS line. No scene code
// was edited. The block at the end adds two things:
// 1. Names. This overlay is an older format. Its one timeline is called SCENES, every scene draws in the
//    1016 x 290 info box, and it has no full-screen scenes. The article player looks for BOX and FULL, so the
//    block defines BOX as SCENES and FULL as an empty list.
// 2. Hatch patterns. sC fills the gap up to the rush need with url(#hatchGold), and sD fills the part of the
//    charge that can wait with url(#hatchMuted). The overlay defined both patterns after this point, inside DEFS,
//    and its frame() put DEFS in front of every frame. The article player adds no <defs>, so the block makes
//    those two entries of BOX emit their own pattern, in front of the scene. The pattern markup is the overlay's,
//    unchanged.
// Not carried over: the third id in DEFS, the clip path panelClip. Only frame() used it, to round the corners of
// the panel, and the article page rounds the corners of the screen itself. The clip path rc is defined inline by
// sI and needs nothing.

// Overlay band for content4: 1080x320 logical units, rendered at 2x (2160x640)
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
  const { s = 1, glow = 1, op = 1 } = o;
  const c = ok ? GREEN : RED;
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

// ---------- scene A: hook (0.35 - 7.08) ----------
function sA(t) {
  let o = kicker(t, [[0, 'DEPOT STATUS'], [5.2, 'YOUR CALL']]);
  o += title(t, [[.45, 'Your depot: 20 chargers'], [1.78, `<tspan fill="${RED}">3 chargers down</tspan>`], [3.0, `<tspan fill="${RED}">3 down.</tspan> Rush hour is coming.`], [5.2, '{Who gets a plug first?}']]);

  // A1: charger bay + countdown
  const a1 = 1 - p(t, 5.0, .2);
  if (a1 > 0) {
    let d = '';
    for (let i = 0; i < 20; i++) {
      const col = i % 10, row = Math.floor(i / 10);
      const x = 52 + col * 46, y = 146 + row * 56, td = 1.5 + (i - 17) * .13;
      let ok = true, dx = 0;
      if (i >= 17 && t >= td) {
        ok = t < td + .3 ? Math.floor((t - td) / .05) % 2 === 1 : false;
        dx = Math.sin((t - td) * 70) * 3 * (1 - p(t, td, .45));
      }
      const glow = .5 + .5 * Math.sin(t * 5 + i * 1.3);
      d += charger(x + dx, y, ok, { glow, s: .56 * pop(t, .38 + col * .03 + row * .06, .35) });
    }
    d += T(190, 258, '17 WORKING', { size: 22, fill: GREEN, anchor: 'middle', ls: .6, op: fin(t, 2.0) });
    d += T(424, 258, '3 DOWN', { size: 22, fill: RED, anchor: 'middle', ls: .6, op: fin(t, 1.9) });
    // countdown block
    const c = pop(t, 3.0, .45);
    if (c > 0) {
      const rem = 3600 - Math.floor(Math.max(0, t - 3.25));
      const mm = String(Math.floor(rem / 60)).padStart(2, '0'), ss = String(rem % 60).padStart(2, '0');
      const beat = 1 + .035 * Math.max(0, Math.sin((t - 3) * Math.PI * 2));
      const circ = 2 * Math.PI * 46;
      let k = `<line x1="535" y1="112" x2="535" y2="268" stroke="${LINE}" stroke-width="2"/>`;
      k += G(`<circle r="46" fill="none" stroke="${LINE}" stroke-width="9"/>
        <circle r="46" fill="none" stroke="${GOLD}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${f(circ * (1 - .1 * p(t, 3.2, 2)))} ${f(circ)}" transform="rotate(-90)"/>
        <path d="M0,0 V-24" stroke="${WHITE}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M0,0 V-32" stroke="${GOLD}" stroke-width="3" stroke-linecap="round" transform="rotate(${f((t - 3) * 180)})"/>
        <circle r="5" fill="${WHITE}"/>`, { x: 628, y: 190, s: beat });
      k += T(704, 148, 'RUSH STARTS IN', { size: 21, fill: MUTED, ls: 1 });
      k += T(702, 210, `${mm}:${ss}`, { size: 66, fill: GOLD });
      k += T(704, 246, 'and counting', { size: 23, fill: MUTED, weight: 500 });
      d += G(k, { op: cl(c), y: (1 - cl(c)) * 8 });
    }
    o += G(d, { op: a1 });
  }
  // A2: which car first?
  if (t >= 5.2) {
    const lv = [.38, .12, .71, .55, .27];
    const seq = [1, 3, 0, 4, 2, 3, 1, 0, 2, 4, 1, 3];
    const sel = t >= 5.5 ? seq[Math.floor((t - 5.5) / .2) % seq.length] : -1;
    let d = '';
    for (let i = 0; i < 5; i++) {
      const x = 118 + i * 195, s = pop(t, 5.24 + i * .06, .38);
      let c = car(0, -8, 1.15) + battery(-46, 34, 90, 22, lv[i], lvlCol(lv[i]));
      if (i === sel) {
        c = R(-78, -52, 156, 124, 16, { fill: 'rgba(255,207,0,.10)', stroke: GOLD, sw: 3.5 }) + c
          + `<circle cx="66" cy="-46" r="17" fill="${GOLD}"/>` + T(66, -37, '?', { size: 26, fill: BG, anchor: 'middle' });
      }
      d += G(c, { x, y: 182, s });
    }
    o += d;
  }
  return o;
}

// ---------- scene B: constraint (7.18 - 13.5) ----------
function sB(t) {
  let o = kicker(t, [[0, 'THE CONSTRAINT']]);
  o += title(t, [[7.28, 'The queue keeps growing'], [8.58, 'Repair is under way…'], [10.1, '…but {every plug is taken}']]);
  for (let i = 0; i < 20; i++) {
    const col = i % 10, row = Math.floor(i / 10);
    const glow = .5 + .5 * Math.sin(t * 5 + i * 1.3);
    o += charger(48 + col * 44, 123 + row * 43, i < 17, { s: .46 * cl(pop(t, 7.2 + col * .015, .3), 0, 1.1), glow });
  }
  // technician on the fault
  const tk = pop(t, 8.58, .45);
  if (tk > 0) {
    o += pill(378, 206, 'TECH ON FAULT', GOLD, { size: 20, w: 224, op: cl(tk), s: .9 + .1 * cl(tk) });
    o += badge('work', 268, 206, 18, GOLD, BG, { s: tk, rot: Math.sin((t - 8.58) * 8) * 20 });
  }
  // stat tiles
  const arr = [7.3, 7.75, 8.2, 8.9, 9.6, 10.4, 11.3];
  const waiting = arr.filter(a => t > a + .45).length;
  const hot = t >= 10.1 ? .5 + .5 * Math.sin((t - 10.1) * 7) : 0;
  const tiles = [['17', 'WORKING', GREEN, 1], ['3', 'DOWN', RED, 0], [String(waiting), 'WAITING', GOLD, 1]];
  tiles.forEach(([n, lab, c, em], i) => {
    const x = 500 + i * 164, a = fin(t, 7.3 + i * .08);
    const last = arr.filter(q => t > q + .45).pop();
    const bump = i === 2 && last !== undefined ? 1 + .22 * (1 - p(t, last + .45, .3)) : 1;
    const dimmed = t >= 10.1 && !em ? lerp(1, .4, p(t, 10.1, .3)) : 1;
    o += G(R(0, 0, 156, 96, 14, { fill: TILE, stroke: em && t >= 10.1 ? c : LINE, sw: em && t >= 10.1 ? 2 + 1.5 * hot : 2 })
      + G(T(0, 0, n, { size: 50, fill: c, anchor: 'middle' }), { x: 78, y: 54, s: bump })
      + T(78, 82, lab, { size: 20, fill: MUTED, anchor: 'middle', ls: 1 }), { x, y: 106, op: a * dimmed });
  });
  // queue lane
  o += R(24, 225, 968, 52, 14, { fill: DARK, stroke: LINE, sw: 1.5, op: fin(t, 7.2) });
  arr.forEach((a, i) => { if (t >= a) o += car(lerp(1090, 72 + i * 94, eo(p(t, a, .7))), 251, .8); });
  if (t >= 11.84) o += T(972, 260, 'All 17 plugs busy', { size: 24, fill: GOLD, anchor: 'end', op: fin(t, 11.84) });
  return o;
}

// ---------- scene C: default rule -> catch -> better pick (13.72 - 31.6) ----------
function sC(t) {
  let o = kicker(t, [[0, 'THE DEFAULT RULE'], [17.38, 'THE CATCH'], [25.16, 'A BETTER FIRST PICK']]);
  o += title(t, [[13.85, 'Lowest battery goes first'], [17.38, 'What if #1 also needs a repair?'],
    [20.22, 'Then it stays parked tonight'], [22.3, 'Charging it now adds {zero rides}'],
    [25.16, 'This one is nearly {rush-ready}'], [28.8, 'So {that one} charges first']]);
  // info box: SoC definition
  const ib = fin(t, 15.1) * (1 - p(t, 17.1, .2));
  if (ib > 0) o += G(R(0, 0, 392, 38, 19, { fill: TILE, stroke: LINE, sw: 2 })
    + T(196, 26, `<tspan fill="${WHITE}">State of charge (SoC)</tspan> = battery %`, { size: 21, fill: MUTED, weight: 500, anchor: 'middle' }),
    { x: 594, y: 16, op: ib });

  const soc = [.38, .12, .71, .55];         // A, B, C, D in arrival order
  const s0 = [0, 1, 2, 3], s1 = [1, 0, 3, 2], s2 = [1, 3, 2, 0];
  const k1 = eio(p(t, 15.1, .75)), k2 = eio(p(t, 29.0, .75));
  const order = [0, 2, 3, 1].sort((a, b) => (a === 1 || a === 3 ? 1 : 0) - (b === 1 || b === 3 ? 1 : 0));
  for (const i of order) {
    const slot = lerp(lerp(s0[i], s1[i], k1), s2[i], k2);
    const arc = Math.sin(Math.PI * k1) * (s1[i] > s0[i] ? -1 : 1) * 10 + Math.sin(Math.PI * k2) * (s2[i] > s1[i] ? 1 : -1) * 12;
    const x = 30 + slot * 246, y = 108 + arc;
    const isB = i === 1, isD = i === 3;
    // emphasis
    let op = fin(t, 13.8 + i * .07);
    if (t >= 17.38 && t < 25.16 && !isB) op *= lerp(1, .42, p(t, 17.38, .4));
    if (t >= 25.16) op *= isD ? 1 : isB ? .4 : lerp(.42, t >= 29 ? .8 : .5, p(t, 29, .5));
    let stroke = LINE, sw = 2, fill = TILE;
    if (isB && t >= 18.44 && t < 25.16) { stroke = RED; sw = 3; fill = '#1d1a20'; }
    if (isD && t >= 25.16) { stroke = GOLD; sw = 3 + (t < 29 ? Math.sin((t - 25.16) * 6) : 0); fill = '#1a1e19'; }
    let c = R(0, 0, 230, 164, 16, { fill, stroke, sw });
    c += car(115, 50, 1.02);
    // battery + state
    let lvl = soc[i], col = lvlCol(lvl), status = `${Math.round(lvl * 100)}% charged`, scol = TXT, sscale = 1;
    if (isB) {
      if (t >= 22.3) { lvl = lerp(.12, .46, p(t, 22.3, 2.4)); col = lvl < .2 ? RED : GOLD; }
      status = `${Math.round(lvl * 100)}% charged`;
      if (t >= 18.44) { status = 'NEEDS REPAIR'; scol = RED; sscale = .8 + .2 * cl(pop(t, 18.44, .35)); }
      if (t >= 20.22) { status = 'PARKED TONIGHT'; sscale = .8 + .2 * cl(pop(t, 20.22, .35)); }
      if (t >= 23.4) { status = '+0 RIDES'; scol = GOLD; sscale = .7 + .3 * pop(t, 23.4, .4); }
      if (t >= 25.16) { status = 'REPAIR FIRST'; scol = RED; sscale = 1; }
    }
    if (isD) {
      if (t >= 30.0) lvl = lerp(.55, .70, eio(p(t, 30.0, .9)));
      col = GREEN;
      status = `${Math.round(lvl * 100)}% charged`;
      if (t >= 26.76) { status = 'NEEDS +15%'; scol = GOLD; sscale = .8 + .2 * cl(pop(t, 26.76, .35)); }
      if (t >= 30.9) { status = 'RUSH-READY'; scol = GREEN; sscale = .75 + .25 * pop(t, 30.9, .4); }
    }
    c += battery(22, 86, 180, 26, lvl, col);
    if (isD && t >= 26.76) {
      const g0 = 26 + 172 * .55, g1 = 26 + 172 * .70, pulse = .55 + .45 * Math.sin((t - 26.76) * 7);
      if (t < 30.9) c += R(g0, 90, g1 - g0, 18, 3, { fill: 'url(#hatchGold)', op: fin(t, 26.76) * (t < 30 ? pulse : .35) });
      c += `<path d="M${f(g1)},80 V118" stroke="${WHITE}" stroke-width="3" stroke-linecap="round" opacity="${f(fin(t, 26.76))}"/>`;
    }
    if (isB && t >= 22.3 && t < 25.16 && Math.floor(t * 4) % 2 === 0) c += ico('bolt', 112, 99, BG, .62);
    c += G(T(0, 0, status, { size: 22, fill: scol, anchor: 'middle', ls: scol === TXT ? 0 : .6, weight: scol === TXT ? 500 : 700 }), { x: 115, y: 148, s: sscale });
    // rank badge
    const r1 = s1[i], r2 = s2[i];
    const bs = pop(t, 15.95 + r1 * .1, .35);
    if (bs > 0) {
      const after = t >= 29.55;
      const num = after ? (isB ? '–' : String(r2 + 1)) : String(r1 + 1);
      const first = after ? r2 === 0 : r1 === 0;
      const flip = t >= 29.55 ? .6 + .4 * pop(t, 29.55, .35) : 1;
      c += G(`<circle r="17" fill="${first ? GOLD : TILE}" stroke="${first ? GOLD : MUTED}" stroke-width="2"/>`
        + T(0, 8, num, { size: 22, fill: first ? BG : TXT, anchor: 'middle' }), { x: 28, y: 28, s: bs * flip });
    }
    if (isB && t >= 18.44) c += badge('work', 202, 28, 18, RED, '#1d1a20', { s: pop(t, 18.44, .4), rot: t < 20.2 ? Math.sin((t - 18.44) * 9) * 18 : 0 });
    if (isD && t >= 30.9) c += badge('check', 202, 28, 18, GREEN, BG, { s: pop(t, 30.9, .4) });
    o += G(c, { x, y, op });
  }
  return o;
}

// ---------- scene D: right-size the charge (31.85 - 41.35) ----------
function sD(t) {
  let o = kicker(t, [[0, 'RIGHT-SIZE THE CHARGE']]);
  o += title(t, [[32.0, 'Default: charge every car to target'], [35.24, 'Charge for {the rush}, not for full'], [39.05, 'Same chargers. {More cars.}']]);
  const d1 = 1 - p(t, 38.75, .22);
  if (d1 > 0) {
    const X = 60, W = 790, Y = 152, H = 62, pad = 6, iw = W - 2 * pad;
    const px = v => X + pad + iw * v;
    const lvl = lerp(.22, .9, eio(p(t, 32.4, 2.5)));
    const k = eo(p(t, 35.3, .5));
    let d = R(X, Y, W, H, 17, { fill: DARK, stroke: '#6b7882', sw: 3 }) + R(X + W + 3, Y + 18, 8, H - 36, 3, { fill: '#6b7882' });
    const gW = iw * (k > 0 ? Math.min(lvl, .55) : lvl);
    d += R(X + pad, Y + pad, gW, H - 2 * pad, 11, { fill: mixHex(TXT, GREEN, k) });
    if (lvl > .55 && k > 0) {
      const x0 = px(.55), w = iw * (lvl - .55);
      d += R(x0, Y + pad, w, H - 2 * pad, 0, { fill: TXT, op: 1 - k });
      d += R(x0 + 3, Y + pad, w - 3, H - 2 * pad, 6, { fill: 'url(#hatchMuted)', op: k * .8 });
    }
    // markers
    d += `<path d="M${f(px(.9))},${Y - 10} V${Y + H + 10}" stroke="${MUTED}" stroke-width="3.5" stroke-linecap="round" opacity="${f(fin(t, 32.1))}"/>`;
    d += T(px(.9), Y - 20, 'USUAL TARGET', { size: 21, fill: MUTED, anchor: 'middle', ls: .8, op: fin(t, 32.1) });
    const rm = pop(t, 35.24, .4);
    if (rm > 0) {
      d += `<path d="M${f(px(.55))},${Y - 12} V${Y + H + 12}" stroke="${GOLD}" stroke-width="4.5" stroke-linecap="round" opacity="${f(cl(rm))}"/>`;
      d += G(T(0, 0, 'RUSH NEED', { size: 22, fill: GOLD, anchor: 'middle', ls: .8 }), { x: px(.55), y: Y - 20, s: rm });
      d += T(px(.275), Y + H + 40, 'enough for tonight', { size: 24, fill: GREEN, anchor: 'middle', op: fin(t, 35.9) });
      d += T(px(.725), Y + H + 40, 'can wait', { size: 24, fill: MUTED, anchor: 'middle', op: fin(t, 37.3) });
    }
    // car plugged in
    d += `<path d="M${X + W + 12},${Y + H / 2} H890" stroke="${DIM}" stroke-width="3" stroke-dasharray="6 6" stroke-dashoffset="${f(-t * 24)}" opacity="${f(fin(t, 32.1))}"/>`;
    d += car(940, Y + H / 2, 1.05, '#f2f2f2', fin(t, 32.05));
    o += G(d, { op: d1 });
  }
  if (t >= 38.95) {
    const rows = [['To the usual target', MUTED, 2, 39.2, .34, TILE, DIM], ['To the rush need', GOLD, 4, 39.95, .22, 'rgba(255,207,0,.14)', GOLD]];
    rows.forEach(([lab, c, n, t0, step, fill, stroke], r) => {
      const y = 118 + r * 68, x0 = 290, total = 696, gap = 8, bw = (total - gap * (n - 1)) / n;
      o += T(30, y + 31, lab, { size: 24, fill: c, op: fin(t, t0 - .15) });
      for (let i = 0; i < n; i++) {
        const k = eo(p(t, t0 + i * step, .4));
        if (k <= 0) continue;
        o += R(x0 + i * (bw + gap), y, bw * k, 48, 12, { fill, stroke, sw: 2 });
        o += car(x0 + i * (bw + gap) + bw / 2, y + 24, .66, '#f2f2f2', p(t, t0 + i * step + .15, .25));
      }
    });
    o += `<path d="M290,262 H986" stroke="${LINE}" stroke-width="2" opacity="${f(fin(t, 39.2))}"/>`;
    o += T(638, 284, 'one charger, same stretch of time', { size: 20, fill: MUTED, weight: 500, anchor: 'middle', op: fin(t, 39.3) });
  }
  return o;
}

// ---------- scene E: another site? (41.55 - 52.55) ----------
function sE(t) {
  let o = kicker(t, [[0, 'CHARGE AT ANOTHER SITE?']]);
  o += title(t, [[41.7, 'Send some cars elsewhere?'], [44.02, '{Maybe.} Three things decide it:']]);
  const P0 = [150, 158], P1 = [508, 92], P2 = [866, 158], Q1 = [508, 226];
  const bez = (a, b, c, u) => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
  const ang = (a, b, c, u) => { const dx = 2 * (1 - u) * (b[0] - a[0]) + 2 * u * (c[0] - b[0]), dy = 2 * (1 - u) * (b[1] - a[1]) + 2 * u * (c[1] - b[1]); return Math.atan2(dy, dx) * 180 / Math.PI; };
  const q1 = t >= 45.12, q2 = t >= 47.22, q3 = t >= 49.54;
  const a = fin(t, 41.6);
  // routes
  o += `<path d="M${P0} Q${P1} ${P2}" fill="none" stroke="${q1 && !q2 ? GOLD : DIM}" stroke-width="${q1 && !q2 ? 4 : 3}" stroke-dasharray="10 9" stroke-dashoffset="${f(-t * 30)}" opacity="${f(a)}"/>`;
  if (q3) o += `<path d="M${P2} Q${Q1} ${P0}" fill="none" stroke="${GOLD}" stroke-width="4" stroke-dasharray="10 9" stroke-dashoffset="${f(-t * 30)}" opacity="${f(fin(t, 49.54))}"/>`;
  // nodes
  const node = (x, y, ok, lab, hi) => G(R(-38, -38, 76, 76, 18, { fill: TILE, stroke: hi ? GOLD : MUTED, sw: hi ? 3.5 : 2.5 })
    + charger(-3, 0, ok, { s: .72, glow: .5 + .5 * Math.sin(t * 5) }), { x, y, op: a })
    + T(x, y + 62, lab, { size: 20, fill: MUTED, anchor: 'middle', ls: .8, op: a });
  o += node(104, 158, false, 'YOUR DEPOT', false) + node(912, 158, true, 'OTHER SITE', q2 && !q3);
  // travel-time question
  if (q1) o += pill(508, 124, '? min', GOLD, { size: 23, w: 108, fill: BG, s: pop(t, 45.12, .4), op: q2 ? lerp(1, .55, p(t, 47.22, .3)) : 1 });
  // charger availability flicker
  if (q2) {
    const k = pop(t, 47.22, .4);
    for (let i = 0; i < 3; i++) {
      const free = !q3 ? (Math.floor((t - 47.22) / .28 + i * 1.7) * 7 + i * 3) % 5 < 2 : false;
      o += G(R(-13, -13, 26, 26, 7, { fill: free ? GREEN : RED, op: q3 ? .45 : 1 }) + ico('bolt', 0, 0, BG, .6), { x: 776 + i * 34, y: 116, s: k });
    }
    o += T(742, 124, '?', { size: 28, fill: GOLD, anchor: 'end', op: q3 ? .45 : cl(k) });
  }
  // car
  if (t >= 41.9 && t < 49.54) {
    const u = eio(p(t, 41.9, 4.9)) * .93;
    const [x, y] = bez(P0, P1, P2, u);
    o += car(x, y, .62, '#f2f2f2', fin(t, 41.9) * (1 - p(t, 47.0, .3) * .0), ang(P0, P1, P2, u));
  }
  if (q3) {
    const u = eo(p(t, 49.6, 2.8)) * .62;
    const [x, y] = bez(P2, Q1, P0, u);
    o += car(x, y, .62, '#f2f2f2', 1, ang(P2, Q1, P0, u));
    o += G(`<circle r="15" fill="${GOLD}"/>` + T(0, 8, '?', { size: 23, fill: BG, anchor: 'middle' }), { x: x - 44, y: y - 4, s: pop(t, 50.2, .4) });
  }
  // question chips
  const chips = [[45.12, 'How far is it?'], [47.22, 'Charger free?'], [49.54, 'Back in time?']];
  chips.forEach(([t0, lab], i) => {
    const t1 = i < 2 ? chips[i + 1][0] : Infinity;
    const active = t >= t0 && t < t1, done = t >= t1;
    const c = active ? GOLD : done ? MUTED : LINE;
    const s = active ? .92 + .08 * cl(pop(t, t0, .4), 0, 1.3) : 1;
    o += G(R(-154, -22, 308, 44, 22, { fill: active ? 'rgba(255,207,0,.12)' : TILE, stroke: c, sw: active ? 3 : 2 })
      + `<circle cx="-128" cy="0" r="14" fill="${active ? GOLD : 'none'}" stroke="${c}" stroke-width="2"/>`
      + T(-128, 7.5, String(i + 1), { size: 20, fill: active ? BG : done ? TXT : DIM, anchor: 'middle' })
      + T(-102, 8, lab, { size: 24, fill: active ? GOLD : done ? TXT : DIM }), { x: 184 + i * 324, y: 256, s, op: fin(t, 44.1 + i * .08) });
  });
  return o;
}

// ---------- scene F: the real question (52.75 - 57.35) ----------
function sF(t) {
  let o = kicker(t, [[0, 'THE REAL QUESTION']]);
  o += title(t, [[53.0, 'Which car is back with riders {soonest?}']], { size: 36, y: 88 });
  const lanes = [160, 205, 250], frac = [.5, 1, .72], tag = ['work', 'bolt', 'time'];
  const prog = p(t, 53.3, 3.1), arrived = t >= 56.4;
  o += `<path d="M872,136 V274" stroke="${MUTED}" stroke-width="3" stroke-dasharray="7 7" opacity="${f(fin(t, 52.9))}"/>`;
  lanes.forEach((y, i) => {
    o += `<path d="M40,${y} H850" stroke="${LINE}" stroke-width="2" stroke-dasharray="4 10" opacity="${f(fin(t, 52.9))}"/>`;
    const x = 80 + 752 * frac[i] * (prog * (2 - prog) * .55 + prog * .45);
    const win = i === 1 && arrived;
    if (win) o += pill(x - 150, y, 'FIRST BACK', GOLD, { size: 21, fill: GOLD, tcol: BG, s: pop(t, 56.4, .4), w: 166 });
    else o += badge(tag[i], x - 52, y, 14, TILE, i === 0 ? RED : MUTED, { stroke: i === 0 ? RED : DIM, op: fin(t, 53.3) });
    if (i === 1 && !arrived) for (let k = 1; k <= 3; k++) o += `<path d="M${f(x - 62 - k * 17)},${y} h10" stroke="${GOLD}" stroke-width="3" stroke-linecap="round" opacity="${f(.9 - k * .22)}"/>`;
    o += car(x, y, .72, win ? GOLD : '#f2f2f2', fin(t, 53.0 + i * .06));
  });
  // riders
  const ring = (t - 52.75) % 1.2 / 1.2;
  o += `<circle cx="936" cy="205" r="${f(34 + ring * 22)}" fill="none" stroke="${GOLD}" stroke-width="2.5" opacity="${f((1 - ring) * .7 * fin(t, 53))}"/>`;
  o += G(`<circle r="34" fill="${TILE}" stroke="${GOLD}" stroke-width="3"/>` + ico('person', 0, 3, WHITE, .95), { x: 936, y: 205, s: pop(t, 52.95, .4) * (arrived ? 1 + .08 * Math.sin((t - 56.4) * 10) * (1 - p(t, 56.4, .6)) : 1) });
  o += T(936, 268, 'RIDERS', { size: 20, fill: MUTED, anchor: 'middle', ls: 1, op: fin(t, 53.1) });
  return o;
}

// ---------- scene G: five inputs (57.45 - 70.35) ----------
const FLAB = [['State of', 'charge'], ['Work still', 'needed'], ['Chargers at', 'other sites'], ['Travel', 'time'], ['Demand in', 'next hour']];
function sG(t) {
  let o = kicker(t, [[0, 'WEIGH IT ALL']]);
  o += title(t, [[57.6, '{5 inputs.} One decision.'], [67.34, 'All five. {At the same time.}']]);
  const times = [59.0, 60.1, 62.28, 63.94, 64.82];
  const all = t >= 67.34, building = t >= 68.52;
  // rush building bars, either side of the pill
  if (building) {
    for (let i = 0; i < 30; i++) {
      const x = 30 + i * 32.2;
      if (x > 318 && x < 676) continue;
      const hot = i / 29;
      const h = (8 + 38 * Math.pow(hot, 1.5)) * eo(p(t, 68.52 + i * .02, .35));
      o += R(x, 278 - h, 22, h, 4, { fill: mixHex(GOLD, RED, hot * .85), op: .45 + .5 * hot });
    }
  }
  times.forEach((t0, i) => {
    const x = 30 + i * 193, s = pop(t, t0, .45);
    const cx = x + 92;
    if (s <= 0) { o += R(x, 106, 184, 112, 16, { stroke: LINE, sw: 2, dash: '6 8', op: fin(t, 57.7) * .7 }) + T(cx, 174, String(i + 1), { size: 34, fill: LINE, anchor: 'middle', op: fin(t, 57.7) }); return; }
    const flash = 1 - p(t, t0, .9);
    const pulse = all ? .5 + .5 * Math.sin((t - 67.34) * 8 - i * .5) : 0;
    const hot = Math.max(flash, all ? .65 + .35 * pulse : 0);
    const c = mixHex(MUTED, GOLD, hot);
    o += G(R(-92, -56, 184, 112, 16, { fill: hot > .3 ? '#1b1f17' : TILE, stroke: c, sw: 2 + 1.5 * hot })
      + ico(FACTORS[i], 0, -26, c, 1.0, hot > .3 ? '#1b1f17' : TILE)
      + T(0, 18, FLAB[i][0], { size: 22, fill: WHITE, anchor: 'middle' }) + T(0, 43, FLAB[i][1], { size: 22, fill: WHITE, anchor: 'middle' })
      + `<circle cx="-72" cy="-37" r="13" fill="${c}"/>` + T(-72, -30, String(i + 1), { size: 18, fill: BG, anchor: 'middle' }), { x: cx, y: 162, s });
    if (all) {
      const k = eo(p(t, 67.34 + i * .04, .35));
      o += `<path d="M${cx},218 V${f(lerp(218, 236, k))} H${f(lerp(cx, 508, k))}" fill="none" stroke="${GOLD}" stroke-width="2.5" opacity="${f(.9 * (1 - p(t, 68.45, .2)))}"/>`;
    }
  });
  if (all) o += pill(508, 256, building ? 'WHILE THE RUSH BUILDS' : 'ONE CALL', GOLD, { size: 22, fill: GOLD, tcol: BG, s: pop(t, 67.5, .4) * (building ? .9 + .1 * cl(pop(t, 68.52, .35), 0, 1.3) : 1), w: building ? 330 : 170, h: 40 });
  return o;
}

// ---------- orbit of the five inputs around a hub ----------
function orbit(t, cx, cy, a, speed = .9, lit = 0, sc = 1) {
  const items = FACTORS.map((k, i) => {
    const th = i * 2 * Math.PI / 5 + t * speed;
    return { k, x: cx + 112 * sc * (sc > 1 ? 1.25 : 1) * Math.cos(th), y: cy + 50 * sc * Math.sin(th), d: Math.sin(th) };
  }).sort((p1, p2) => p1.d - p2.d);
  const draw = it => badge(it.k, it.x, it.y, 20, TILE, mixHex(MUTED, GOLD, lit), { stroke: mixHex(LINE, GOLD, lit * .8), s: (.82 + .18 * it.d) * a * sc, op: (.55 + .45 * (it.d + 1) / 2) * cl(a) });
  return { backHalf: items.filter(i => i.d < 0).map(draw).join(''), frontHalf: items.filter(i => i.d >= 0).map(draw).join('') };
}

// ---------- scene H: the human limit (70.6 - 76.25) ----------
function sH(t) {
  let o = kicker(t, [[0, 'THE HUMAN LIMIT']]);
  o += title(t, [[70.74, 'Your best supervisor juggles all five'], [73.12, '…but only on {their} shift']]);
  const mv = eio(p(t, 72.85, .65)), cx = lerp(508, 158, mv), cy = 192, big = lerp(1.3, 1, mv);
  const ob = orbit(t, cx, cy, pop(t, 71.0, .5), .9, 0, big);
  o += ob.backHalf;
  o += G(`<circle r="40" fill="${TILE}" stroke="${WHITE}" stroke-width="3"/>` + ico('person', 0, 3, WHITE, 1.15), { x: cx, y: cy, s: pop(t, 70.7, .45) * big });
  o += ob.frontHalf;
  const shifts = [['DAY', true, 73.2], ['EVENING', false, 74.14], ['NIGHT', false, 74.5]];
  shifts.forEach(([lab, ok, t0], i) => {
    const x = 336 + i * 220, k = pop(t, 73.15 + i * .1, .4);
    if (k <= 0) return;
    const shown = t >= t0;
    const c = ok ? GREEN : RED;
    let d = R(0, 0, 206, 162, 16, { fill: TILE, stroke: shown ? c : LINE, sw: shown ? 2.5 : 2 });
    d += T(103, 34, lab, { size: 21, fill: MUTED, anchor: 'middle', ls: 1.2 });
    if (ok) d += `<circle cx="103" cy="84" r="29" fill="${DARK}" stroke="${GREEN}" stroke-width="3"/>` + ico('person', 103, 86, WHITE, .82);
    else d += `<circle cx="103" cy="84" r="29" fill="none" stroke="${shown ? RED : DIM}" stroke-width="3" stroke-dasharray="7 7" transform="rotate(${f(t * 20)} 103 84)"/>` + T(103, 95, '?', { size: 32, fill: shown ? RED : DIM, anchor: 'middle' });
    if (shown) d += G(T(0, 0, ok ? 'COVERED' : 'NOT THERE', { size: 21, fill: c, anchor: 'middle', ls: .8 }), { x: 103, y: 144, s: .8 + .2 * cl(pop(t, t0, .35), 0, 1.3) });
    o += G(d, { x, y: 108 + (1 - cl(k)) * 10, op: cl(k) });
  });
  return o;
}

// ---------- scene I: AI agent (76.45 - 84.8) ----------
function sI(t) {
  let o = kicker(t, [[0, 'WHERE AN AI AGENT HELPS']]);
  o += title(t, [[76.6, 'An {AI agent} can carry that load'], [79.0, 'All five inputs, re-weighed {every hour}'], [81.46, 'Cars ready at the peak, {fault or not}']]);
  const cx = 158, cy = 192;
  const ob = orbit(t, cx, cy, pop(t, 76.9, .5), 1.6, .5 + .5 * Math.sin(t * 4));
  o += ob.backHalf;
  const halo = (t - 76.5) % 1.4 / 1.4;
  o += `<circle cx="${cx}" cy="${cy}" r="${f(40 + halo * 26)}" fill="none" stroke="${GOLD}" stroke-width="2.5" opacity="${f((1 - halo) * .6 * fin(t, 76.8))}"/>`;
  o += G(`<circle r="40" fill="#1b1f17" stroke="${GOLD}" stroke-width="3.5"/>` + ico('spark', -2, 2, GOLD, 1.05), { x: cx, y: cy, s: pop(t, 76.6, .45) });
  o += ob.frontHalf;
  o += T(cx, 281, 'AI AGENT', { size: 20, fill: GOLD, anchor: 'middle', ls: 1.2, op: fin(t, 76.9) });
  // timeline chart
  if (t >= 77.3) {
    const a = fin(t, 77.35, .5), AX = 252, x0 = 352, step = 88, PK = x0 + 5 * step, FX = x0 + 2 * step;
    const dem = x => AX - 6 - 92 * Math.exp(-Math.pow((x - PK) / 118, 2));
    const ready = x => Math.min(208, dem(x) - 20) + 24 * Math.exp(-Math.pow((x - FX - 14) / 30, 2)) * (t >= 82.9 ? eo(p(t, 82.9, .4)) : 0);
    let dp = '', rp = '';
    for (let x = 336; x <= 986; x += 6) { dp += `${x === 336 ? 'M' : 'L'}${x},${f(dem(x))} `; rp += `${x === 336 ? 'M' : 'L'}${x},${f(ready(x))} `; }
    o += `<path d="${dp} L986,${AX} L336,${AX} Z" fill="${MUTED}" opacity="${f(.16 * a)}"/><path d="${dp}" fill="none" stroke="${MUTED}" stroke-width="2.5" opacity="${f(.8 * a)}"/>`;
    o += `<path d="M336,${AX} H986" stroke="${DIM}" stroke-width="2.5" opacity="${f(a)}"/>`;
    o += T(340, AX - 16, 'demand', { size: 20, fill: MUTED, weight: 500, op: a });
    for (let i = 0; i < 8; i++) {
      const x = x0 + i * step, t0 = 79.15 + i * .28, lit = t >= t0;
      const ring = p(t, t0, .6);
      if (lit && ring < 1) o += `<circle cx="${x}" cy="${AX}" r="${f(6 + ring * 18)}" fill="none" stroke="${GOLD}" stroke-width="2.5" opacity="${f(1 - ring)}"/>`;
      o += `<circle cx="${x}" cy="${AX}" r="${lit ? 7 : 5}" fill="${lit ? GOLD : DIM}" opacity="${f(a)}"/>`;
      if (lit) o += `<path d="M${x},${AX - 9} V${f(lerp(AX - 9, dem(x) + 4, eo(p(t, t0, .4))))}" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="3 5" opacity=".55"/>`;
    }
    o += T(661, AX + 30, 'hour by hour', { size: 20, fill: MUTED, weight: 500, anchor: 'middle', op: a });
    // cars-ready line
    if (t >= 81.46) {
      const k = eio(p(t, 81.5, 1.5));
      o += `<clipPath id="rc"><rect x="330" y="90" width="${f(660 * k)}" height="200"/></clipPath>`;
      o += `<path d="${rp}" fill="none" stroke="${GREEN}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#rc)"/>`;
      o += T(PK, dem(PK) - 34, 'CARS READY', { size: 21, fill: GREEN, anchor: 'middle', ls: 1, op: fin(t, 82.7) });
      o += G(`<circle r="8" fill="${GREEN}"/>`, { x: PK, y: ready(PK), s: pop(t, 82.8, .4) });
    }
    if (t >= 82.9) {
      const k = pop(t, 82.9, .4);
      o += G(`<circle r="16" fill="${RED}"/>` + ico('bolt', 0, 0, BG, .72), { x: FX + 14, y: 186, s: k * (1 + .08 * Math.sin((t - 82.9) * 12) * (1 - p(t, 82.9, .8))) });
      o += T(FX + 14, 160, 'FAULT', { size: 20, fill: RED, anchor: 'middle', ls: 1, op: cl(k) });
    }
  }
  return o;
}

// ---------- scene J: next (85.0 - 88.9) ----------
function sJ(t) {
  let o = kicker(t, [[0, 'NEXT UP']]);
  const k = pop(t, 85.15, .5);
  const len = 46, dash = len * eo(p(t, 85.7, .45));
  o += G(`<path d="M0,-44 L34,-31 V-2 C34,22 17,38 0,45 C-17,38 -34,22 -34,-2 V-31 Z" fill="#1b1f17" stroke="${GOLD}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-15,0 L-4,12 L17,-13" fill="none" stroke="${GOLD}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${f(dash)} 100"/>`, { x: 104, y: 178, s: k });
  const l1 = eo(p(t, 85.2, .35)), l2 = eo(p(t, 85.75, .35));
  o += T(178, 162 + (1 - l1) * 10, 'What would it take to {trust}', { size: 40, fill: WHITE, op: l1 });
  o += T(178, 214 + (1 - l2) * 10, 'an AI agent with that call?', { size: 40, fill: WHITE, op: l2 });
  for (let i = 0; i < 3; i++) {
    const ph = ((t - 85) * 1.6 - i * .28) % 1;
    const al = .25 + .75 * Math.max(0, Math.sin(Math.max(0, ph) * Math.PI));
    o += `<path d="M${880 + i * 34},164 l22,22 l-22,22" fill="none" stroke="${GOLD}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="${f(al * fin(t, 86.3))}"/>`;
  }
  return o;
}

// ---------- compose ----------
const SCENES = [[.35, 7.08, sA], [7.18, 13.5, sB], [13.72, 31.6, sC], [31.85, 41.35, sD], [41.55, 52.55, sE],
  [52.75, 57.35, sF], [57.45, 70.35, sG], [70.6, 76.25, sH], [76.45, 84.8, sI], [85.0, 88.9, sJ]];

// ---- Added for the article. Not in the video's overlay source. ----
// The names the article player looks for (see note 1 at the top of this file).
const BOX = SCENES;
const FULL = [];
// The hatch patterns, which the overlay kept in DEFS (see note 2 at the top of this file).
const HATCH_GOLD_DEFS = `<defs>
  <pattern id="hatchGold" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4.5" height="9" fill="${GOLD}"/></pattern>
</defs>`;
const HATCH_MUTED_DEFS = `<defs>
  <pattern id="hatchMuted" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="14" fill="${DIM}"/></pattern>
</defs>`;
BOX.forEach(entry => {
  const scene = entry[2];
  if (scene === sC) entry[2] = t => HATCH_GOLD_DEFS + scene(t);
  if (scene === sD) entry[2] = t => HATCH_MUTED_DEFS + scene(t);
});
