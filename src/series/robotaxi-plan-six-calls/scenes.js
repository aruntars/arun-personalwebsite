// The on-screen graphics from the video, as drawn for it: each scene is a function of time that returns SVG.
// Copied from the video's overlay source. src/build.py wraps this file and hands BOX and FULL to the player.
// Overlay for content 7: 1080x1920 logical units, rendered at 2x (2160x3840) and composited over the video.
// Every frame is a pure function of t (seconds), so any frame can be rendered independently.

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

// Content 7, reshoot ("Your board just asked for a robotaxi plan"): the top info box scenes.
// Each scene draws in box coordinates (1016 x 290) and is a pure function of t (seconds).

const GREY = '#8a949c', BLUE = '#6ab0f3';
const rnd = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function icon(kind, x, y, c, s = 1, bg = TILE, op = 1) {
  const g = inner => `<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})" opacity="${f(op)}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  switch (kind) {
    case 'pin': return g(`<path d="M0,19 C-13,4 -15,-2 -15,-6 a15,15 0 1 1 30,0 c0,4 -2,10 -15,25 z"/><circle cx="0" cy="-6" r="5" fill="${c}" stroke="none"/>`);
    case 'depot': return g(`<rect x="-15" y="-7" width="30" height="22" rx="3"/><path d="M-20,-7 L0,-21 L20,-7"/>`);
    case 'order': return g(`<path d="M-17,-12 H-5 M-17,0 H-5 M-17,12 H-5"/><path d="M6,-12 H18 M6,0 H14 M6,12 H10"/>`);
    case 'grid': return g(`<rect x="-16" y="-16" width="13" height="13" rx="2"/><rect x="3" y="-16" width="13" height="13" rx="2"/><rect x="-16" y="3" width="13" height="13" rx="2"/><rect x="3" y="3" width="13" height="13" rx="2"/>`);
    case 'truck': return g(`<rect x="-19" y="-10" width="23" height="17" rx="2"/><path d="M4,-4 H13 L19,2 V7 H4 Z"/><circle cx="-11" cy="11" r="4" fill="${c}" stroke="none"/><circle cx="12" cy="11" r="4" fill="${c}" stroke="none"/>`);
    case 'chat': return g(`<path d="M-17,-13 H17 a4,4 0 0 1 4,4 V5 a4,4 0 0 1 -4,4 H-2 L-11,17 V9 H-17 a4,4 0 0 1 -4,-4 V-9 a4,4 0 0 1 4,-4 Z"/>`);
    case 'narrow': return g(`<path d="M-18,-14 L-4,0 L-18,14 M18,-14 L4,0 L18,14"/>`);
    case 'bars': return g(`<path d="M-14,14 V2 M-4,14 V-6 M6,14 V-14 M16,14 V-2" stroke-width="6"/>`);
    case 'gap': return g(`<path d="M-19,10 H-7 M7,10 H19"/><path d="M-7,10 V-10 H7 V10" stroke-dasharray="4 5"/>`);
  }
  return ico(kind, x, y, c, s, bg, op);
}
const disc = (x, y, r, kind, c, o = {}) => G(`<circle r="${r}" fill="${o.fill ?? BG}" stroke="${o.stroke ?? c}" stroke-width="3"/>` + icon(kind, 0, o.dy ?? 0, c, r / 28, o.fill ?? BG), { x, y, s: o.s ?? 1, op: o.op ?? 1 });
const mark = (x, y, ok, s = 1, op = 1) => G(`<circle r="13" fill="${ok ? GREEN : RED}"/>` + (ok ? `<path d="M-6,0 L-2,5 L7,-5" fill="none" stroke="${BG}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>` : `<path d="M-5,-5 L5,5 M5,-5 L-5,5" stroke="${BG}" stroke-width="3.4" stroke-linecap="round"/>`), { x, y, s, op });
const flow = (x0, x1, y, t, c, op = 1, w = 5) => op <= 0 ? '' : `<path d="M${f(x0)},${y} H${f(x1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="12 12" stroke-dashoffset="${f(-t * 70)}" opacity="${f(op)}"/>`;
function icon2(kind, x, y, c, s = 1, bg = TILE, op = 1) {
  const g = inner => `<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})" opacity="${f(op)}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  switch (kind) {
    case 'doc': return g(`<path d="M-13,-19 H5 L14,-10 V19 H-13 Z"/><path d="M-7,-4 H8 M-7,4 H8 M-7,12 H2"/>`);
    case 'lock': return g(`<rect x="-12" y="-3" width="24" height="19" rx="4"/><path d="M-7,-3 V-9 a7,7 0 0 1 14,0 V-3"/>`);
    case 'mail': return g(`<rect x="-19" y="-13" width="38" height="26" rx="4"/><path d="M-19,-9 L0,5 L19,-9"/>`);
  }
  return icon(kind, x, y, c, s, bg, op);
}
const QN = ['Market entry', 'Partner choice', 'Sites', 'Mixed fleets', 'Business case', 'Operating layer'];
// the six-call tracker in the top right corner of the box: n = the call being discussed (1..6; 7 = all done)
function pips(t, n, t0) {
  let o = '';
  for (let i = 0; i < 6; i++) {
    const x = 806 + i * 36, done = i < n - 1, cur = i === n - 1, k = cur ? cl(pop(t, t0, .4), 0, 1.15) : 1;
    o += done ? mark(x, 36, true, .86) : G(`<circle r="13" fill="${cur ? GOLD : 'none'}" stroke="${cur ? GOLD : LINE}" stroke-width="2.5"/>` + T(0, 6, String(i + 1), { size: 17, fill: cur ? BG : DIM, anchor: 'middle' }), { x, y: 36, s: k });
  }
  return o;
}
const qhead = (t, n, t0) => kicker(t, [[0, `CALL ${n} OF 6`]]) + pips(t, n, t0);
// position along a polyline at keyframed times: keys = [[time, point index], ...]; returns [path through the points reached, head point]
function trace(pts, keys, t) {
  if (t <= keys[0][0]) return ['', pts[keys[0][1]]];
  let d = `M${pts[0][0]},${pts[0][1]}`, head = pts[0];
  for (let k = 1; k < keys.length; k++) {
    const [ta, ia] = keys[k - 1], [tb, ib] = keys[k];
    if (t >= tb) { d += ` L${pts[ib][0]},${pts[ib][1]}`; head = pts[ib]; continue; }
    const u = eio((t - ta) / (tb - ta)); head = [lerp(pts[ia][0], pts[ib][0], u), lerp(pts[ia][1], pts[ib][1], u)];
    d += ` L${f(head[0])},${f(head[1])}`; break;
  }
  return [d, head];
}

// ---------- the ask (0.15 - 7.2) ----------
function sHook(t) {
  let o = kicker(t, [[0, 'THE ASK']]) + title(t, [[0.15, 'Your board wants a {robotaxi plan}'], [5.85, '{Where} do you start?']]);
  if (t < 2.45) {
    const a = 1 - p(t, 2.2, .25), k = pop(t, .3, .45);
    o += G(R(-230, -75, 460, 150, 16, { fill: TILE, stroke: LINE, sw: 2.5 }) + T(-200, -38, 'BOARD AGENDA', { size: 19, fill: MUTED, ls: 1.4 })
      + R(-200, -18, 300, 12, 6, { fill: LINE }) + R(-200, 6, 240, 12, 6, { fill: LINE })
      + G(R(-200, 30, 400, 34, 8, { fill: '#1b1f17', stroke: GOLD, sw: 2 }) + T(-186, 54, 'Robotaxi plan', { size: 22, fill: GOLD }) + T(186, 53, 'NEW', { size: 16, fill: GOLD, anchor: 'end', ls: 1 }), { op: fin(t, 1.3, .3) }), { x: 508, y: 186, s: cl(k, 0, 1.04), op: cl(k) * a });
  }
  if (t >= 2.2) {
    [['RENTAL CARS', 'car', 2.79], ['RIDESHARE SUPPLY', 'pin', 3.77], ['CORPORATE FLEET', 'grid', 5.01]].forEach(([lab, kind, t0], i) => {
      const k = pop(t, t0, .42), x = 180 + i * 328, q = pop(t, 5.95 + i * .14, .4);
      if (k <= 0) { o += R(x - 150, 110, 300, 152, 18, { stroke: LINE, sw: 2, dash: '6 8', op: .7 * fin(t, 2.3) }); return; }
      o += G(R(-150, -76, 300, 152, 18, { fill: TILE, stroke: WHITE, sw: 2.5 }) + (kind === 'car' ? car(0, -20, .95, WHITE) : icon(kind, 0, -20, WHITE, 1.5)) + T(0, 46, lab, { size: 23, fill: WHITE, anchor: 'middle', ls: 1 })
        + G(`<circle r="17" fill="${GOLD}"/>` + T(0, 8, '?', { size: 24, fill: BG, anchor: 'middle' }), { x: 122, y: -50, s: cl(q, 0, 1.1), op: cl(q) }), { x, y: 186, s: cl(k, 0, 1.06), op: cl(k) });
    });
  }
  return o;
}

// ---------- 1: market entry (19.0 - 40.25) ----------
function sC1(t) {
  let o = qhead(t, 1, 19.0);
  o += title(t, [[19.0, 'Market entry'], [20.3, 'Most cities: {one fleet operator} per AV partner'], [24.39, 'Who runs the depots {today}'], [30.05, 'Picked {before} the city is announced'], [33.5, 'So the conversation has to {start early}'], [36.19, 'What gets you in the room: a {faster launch}']]);
  if (t < 24.39) {
    const a = 1 - p(t, 24.15, .22);
    o += T(30, 150, 'CITY', { size: 17, fill: MUTED, ls: 1.2, op: fin(t, 20.9) * a }) + T(30, 240, 'FLEET OPERATOR', { size: 17, fill: GOLD, ls: 1.2, op: fin(t, 22.9) * a });
    for (let i = 0; i < 5; i++) {
      const x = 290 + i * 150, k = pop(t, 21.05 + i * .13, .4), pk = pop(t, 23.03 + i * .12, .4);
      o += G(icon('pin', 0, 0, WHITE, 1.25), { x, y: 142, s: cl(k, 0, 1.1), op: cl(k) * a });
      o += `<path d="M${x},172 V208" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="5 6" opacity="${f(cl(pk) * a)}"/>`;
      o += G(`<circle r="22" fill="#1b1f17" stroke="${GOLD}" stroke-width="2.5"/>` + icon('depot', 0, 0, GOLD, .78), { x, y: 234, s: cl(pk, 0, 1.1), op: cl(pk) * a });
    }
    return o;
  }
  if (t < 30.05) {
    const a = 1 - p(t, 29.82, .22);
    const row = (y, name, t0, cities) => {
      const k = pop(t, t0, .42);
      let s = G(R(-100, -32, 200, 64, 14, { fill: TILE, stroke: WHITE, sw: 2.5 }) + T(0, 10, name, { size: 28, fill: WHITE, anchor: 'middle' }), { x: 130, y, s: cl(k, 0, 1.05), op: cl(k) * a });
      cities.forEach(([c, tc], i) => {
        const ck = pop(t, tc, .4), x = 330 + i * 232;
        if (i === 0) s += flow(240, 296, y, t, GOLD, cl(ck) * a * .85, 3.5);
        s += G(icon('pin', 0, 0, GOLD, .95) + T(26, 9, c, { size: 25, fill: WHITE }), { x, y, s: cl(ck, 0, 1.06), op: cl(ck) * a });
      });
      return s;
    };
    return o + row(150, 'Avis', 24.39, [['Dallas', 26.19]]) + row(232, 'Moove', 26.89, [['Phoenix', 27.59], ['Miami', 28.59], ['Las Vegas', 29.19]]);
  }
  if (t < 33.5) {
    const a = 1 - p(t, 33.28, .22), k1 = pop(t, 31.59, .42), k2 = pop(t, 33.01, .42), head = lerp(60, 956, eio(p(t, 30.2, 2.9))), bk = fin(t, 31.97, .4);
    o += `<path d="M60,200 H956" stroke="${LINE}" stroke-width="5" stroke-linecap="round" opacity="${f(a)}"/><path d="M60,200 H${f(head)}" stroke="${WHITE}" stroke-width="5" stroke-linecap="round" opacity="${f(a)}"/>`;
    o += G(`<circle r="20" fill="${GOLD}"/>` + icon('check', 0, 0, BG, .85, GOLD), { x: 300, y: 200, s: cl(k1, 0, 1.1), op: cl(k1) * a }) + T(300, 158, 'OPERATOR PICKED', { size: 21, fill: GOLD, anchor: 'middle', ls: 1, op: cl(k1) * a });
    o += G(`<circle r="20" fill="${BG}" stroke="${WHITE}" stroke-width="3"/>` + icon('pin', 0, 0, WHITE, .62), { x: 760, y: 200, s: cl(k2, 0, 1.1), op: cl(k2) * a }) + T(760, 158, 'CITY ANNOUNCED', { size: 21, fill: WHITE, anchor: 'middle', ls: 1, op: cl(k2) * a });
    o += `<path d="M330,248 H730 M330,239 V257 M730,239 V257" stroke="${GOLD}" stroke-width="2.5" opacity="${f(bk * a)}" fill="none"/>` + G(R(-62, -16, 124, 32, 16, { fill: BG, stroke: GOLD, sw: 2 }) + T(0, 7, 'BEFORE', { size: 18, fill: GOLD, anchor: 'middle', ls: 1.2 }), { x: 530, y: 248, op: bk * a });
    return o;
  }
  const g1 = eio(p(t, 34.0, 1.3)), on2 = fin(t, 36.19), g2 = eio(p(t, 37.83, 1.0)), fk = pop(t, 38.33, .42);
  o += T(30, 136, 'A TYPICAL LAUNCH', { size: 18, fill: MUTED, ls: 1.2 }) + R(30, 148, 820, 30, 15, { fill: DARK, stroke: LINE, sw: 2 }) + R(30, 148, Math.max(30, 820 * g1), 30, 15, { fill: GREY, op: fin(t, 34.0, .2) });
  o += T(864, 170, 'LAUNCH', { size: 17, fill: MUTED, ls: 1, op: fin(t, 35.2) });
  o += T(30, 216, 'WITH YOU IN THE ROOM', { size: 18, fill: GOLD, ls: 1.2, op: on2 }) + R(30, 228, 820, 30, 15, { fill: DARK, stroke: LINE, sw: 2, op: on2 }) + R(30, 228, Math.max(30, 500 * g2), 30, 15, { fill: GOLD, op: fin(t, 37.83, .2) });
  o += T(544, 250, 'LAUNCH', { size: 17, fill: GOLD, ls: 1, op: fin(t, 38.75) });
  o += G(R(-70, -17, 140, 34, 17, { fill: BG, stroke: GOLD, sw: 2.2 }) + T(0, 7, 'FASTER', { size: 19, fill: GOLD, anchor: 'middle', ls: 1.2 }), { x: 745, y: 243, s: cl(fk, 0, 1.08), op: cl(fk) });
  return o;
}

// ---------- 2: partner choice (40.35 - 54.2) ----------
function sC2(t) {
  let o = qhead(t, 2, 40.37);
  o += title(t, [[40.37, 'Partner choice'], [41.69, 'It depends on {what you already have}'], [43.93, 'Rental fleets have {all three}, at airports'], [47.33, 'Asset-light? You need {two partners}']]);
  if (t < 47.33) {
    const a = 1 - p(t, 47.1, .22);
    [['LOTS', 'grid', 45.13], ['CHARGERS', 'bolt', 45.63], ['PEOPLE', 'person', 46.21]].forEach(([lab, kind, t0], i) => {
      const x = 180 + i * 328, k = pop(t, t0, .42), e = fin(t, 41.9 + i * .12);
      o += R(x - 150, 108, 300, 108, 18, { stroke: LINE, sw: 2, dash: '6 8', op: .8 * e * a * (1 - cl(k)) }) + T(x, 170, lab, { size: 22, fill: DIM, anchor: 'middle', ls: 1, op: e * a * (1 - cl(k)) });
      o += G(R(-150, -54, 300, 108, 18, { fill: TILE, stroke: WHITE, sw: 2.5 }) + icon(kind, -96, 0, WHITE, 1.3) + T(-56, 9, lab, { size: 24, fill: WHITE, ls: 1 }) + mark(118, -28, true, .95), { x, y: 162, s: cl(k, 0, 1.06), op: cl(k) * a });
    });
    o += pill(118, 252, 'AVIS · HERTZ', WHITE, { size: 19, op: fin(t, 43.93) * a }) + pill(318, 252, 'AT AIRPORTS', GOLD, { size: 19, op: fin(t, 46.41) * a });
    return o;
  }
  const ky = pop(t, 47.85, .42), k1 = pop(t, 50.19, .42), k2 = pop(t, 51.73, .42);
  o += flow(306, 440, 188, -t, GOLD, cl(k1) * .9, 4) + flow(576, 710, 188, t, GOLD, cl(k2) * .9, 4);
  o += G(`<circle r="62" fill="#1b1f17" stroke="${GOLD}" stroke-width="3"/>` + T(0, -2, 'YOU', { size: 30, fill: GOLD, anchor: 'middle' }) + T(0, 24, 'asset-light', { size: 17, fill: MUTED, anchor: 'middle', weight: 500 }), { x: 508, y: 188, s: cl(ky, 0, 1.06), op: cl(ky) });
  o += G(R(-135, -62, 270, 124, 18, { fill: TILE, stroke: WHITE, sw: 2.5 }) + car(-92, -16, .6, WHITE) + T(-54, -8, 'AV PARTNER', { size: 22, fill: WHITE, ls: .8 }) + T(-118, 36, 'The vehicles and the tech', { size: 18, fill: MUTED, weight: 500 }), { x: 165, y: 188, s: cl(k1, 0, 1.06), op: cl(k1) });
  o += G(R(-135, -62, 270, 124, 18, { fill: TILE, stroke: WHITE, sw: 2.5 }) + icon('site', -100, -16, WHITE, 1.05) + T(-72, -8, 'SITES + POWER', { size: 21, fill: WHITE, ls: .8 }) + T(-118, 36, 'e.g. Terawatt, Voltera', { size: 18, fill: MUTED, weight: 500 }), { x: 851, y: 188, s: cl(k2, 0, 1.06), op: cl(k2) });
  return o;
}

// ---------- 3: sites (54.3 - 66.55) ----------
function sC3(t) {
  let o = qhead(t, 3, 54.31);
  o += title(t, [[54.31, 'Sites'], [55.29, 'Hardest to find: {power, near demand}'], [59.19, 'Rare, and {AV partners know it}'], [61.85, 'Own one? It’s your {strongest card}']]);
  if (t < 61.85) {
    const a = 1 - p(t, 61.62, .22), pw = p(t, 57.09, .4), dm = p(t, 58.45, .4), POWER = [1, 4, 8, 11, 14, 19, 22], NEAR = [11, 19];
    for (let i = 0; i < 24; i++) {
      const c = i % 8, r = Math.floor(i / 8), x = 62 + c * 62, y = 136 + r * 52, k = pop(t, 55.5 + (c + r) * .05, .35), hasP = POWER.includes(i), near = NEAR.includes(i);
      const lost = (hasP ? 0 : pw * .8) + (hasP && !near ? dm * .62 : 0), col = near && dm > 0 ? mixHex(WHITE, GOLD, dm) : WHITE;
      const pulse = near && t > 59.19 ? 1 + .1 * Math.sin((t - 59.19) * 6.5) : 1;
      o += G(`<circle r="19" fill="${TILE}" stroke="${col}" stroke-width="2.5"/>` + (hasP && pw > 0 ? `<path d="${BOLT}" transform="scale(.8)" fill="${col}" opacity="${f(pw)}"/>` : `<circle r="4" fill="${col}"/>`), { x, y, s: cl(k, 0, 1.08) * pulse, op: cl(k) * (1 - lost) * a });
    }
    [['CANDIDATE SITES', '24', 55.6, WHITE], ['WITH POWER', '7', 57.09, WHITE], ['NEAR DEMAND', '2', 58.45, GOLD]].forEach(([lab, n, t0, c], i) => {
      const k = pop(t, t0, .42), y = 136 + i * 52;
      o += G(R(0, -22, 400, 44, 12, { fill: TILE, stroke: i === 2 ? GOLD : LINE, sw: 2 }) + T(18, 7, lab, { size: 19, fill: i === 2 ? GOLD : MUTED, ls: 1 }) + T(382, 10, n, { size: 28, fill: c, anchor: 'end' }), { x: 580, y, op: cl(k) * a });
    });
    return o;
  }
  [['Fleet scale', 290, GREY, 62.3], ['Capital', 230, GREY, 62.5], ['Crews', 260, GREY, 62.7], ['A powered site, near demand', 626, GOLD, 64.31]].forEach(([lab, w, c, t0], i) => {
    const y = 118 + i * 41, g = eio(p(t, t0, i === 3 ? .9 : .6)), gold = i === 3;
    o += T(30, y + 20, lab, { size: 20, fill: gold ? GOLD : MUTED, weight: gold ? 700 : 500, op: fin(t, t0 - .15) });
    o += R(350, y, 630, 26, 13, { fill: DARK, stroke: LINE, sw: 1.5, op: fin(t, 61.95) }) + R(350, y, Math.max(26, w * g), 26, 13, { fill: c, op: fin(t, t0, .15) });
  });
  return o;
}

// ---------- 4: mixed fleets (66.65 - 80.9) ----------
const avCar = (x, y, s, op = 1) => car(x, y, s, WHITE, op, 90) + G(`<circle r="${f(7 * s)}" fill="${GOLD}"/>`, { x, y, op });
function sC4(t) {
  let o = qhead(t, 4, 66.67);
  o += title(t, [[66.67, 'Mixed fleets'], [67.95, 'At first, AVs {share} your lots, chargers, crews'], [72.11, 'That saves {money} and {time to launch}'], [74.35, 'But AV partners want {capacity they can count on}'], [77.73, 'Know the number: when they need {their own site}']]);
  const sx = i => 36 + i * 95, v = t < 78.2 ? 3 : Math.min(8, 3 + (t - 78.2) / .26), lock = fin(t, 75.9, .4) * (1 - p(t, 77.5, .25));
  for (let i = 0; i < 10; i++) {
    const tAV = i >= 7 ? 68.49 + (i - 7) * .18 : i >= 2 ? 78.2 + (6 - i) * .26 : Infinity, av = pop(t, tAV, .4), e = fin(t, 67.95 + i * .04);
    const res = i >= 7 ? lock : 0;
    o += R(sx(i), 112, 86, 100, 12, { fill: DARK, stroke: res > 0 ? mixHex(LINE, GOLD, res) : LINE, sw: 2 + res, op: e });
    if (i < 7) o += car(sx(i) + 43, 162, .78, DIM, e * (1 - cl(av)), 90);
    if (av > 0) o += G(avCar(0, 0, .78), { x: sx(i) + 43, y: 162 + 26 * (1 - cl(av)), op: cl(av) });
  }
  if (t < 72.11) [['LOTS', 69.75, 96], ['CHARGERS', 70.15, 262], ['CREWS', 70.71, 440]].forEach(([lab, t0, x]) => { const k = pop(t, t0, .4); o += pill(x, 251, lab, WHITE, { size: 19, s: cl(k, 0, 1.08), op: cl(k) * (1 - p(t, 71.9, .2)) }); });
  else if (t < 74.35) [['LOWER COST', 72.79, 130], ['FASTER LAUNCH', 73.45, 380]].forEach(([lab, t0, x]) => { const k = pop(t, t0, .4); o += pill(x, 251, lab, GREEN, { size: 19, s: cl(k, 0, 1.08), op: cl(k) * (1 - p(t, 74.13, .2)) }); });
  else if (t < 77.73) { const k = pop(t, 76.15, .42); o += G(R(-128, -18, 256, 36, 18, { fill: BG, stroke: GOLD, sw: 2.2 }) + icon2('lock', -100, -1, GOLD, .62) + T(-78, 7, 'RESERVED FOR AVs', { size: 19, fill: GOLD, ls: .6 }), { x: 838, y: 251, s: cl(k, 0, 1.08), op: cl(k) * (1 - p(t, 77.5, .2)) }); }
  else {
    const e = fin(t, 77.85), over = v >= 6, k = pop(t, 79.97, .42);
    o += R(36, 240, 524, 22, 11, { fill: DARK, stroke: LINE, sw: 2, op: e }) + R(36, 240, 524 * v / 10, 22, 11, { fill: over ? GOLD : WHITE, op: e });
    o += `<path d="M350,231 V271" stroke="${GOLD}" stroke-width="3" stroke-dasharray="4 5" opacity="${f(e)}"/>`;
    o += T(576, 259, Math.floor(v) + ' AVs', { size: 22, fill: over ? GOLD : WHITE, op: e });
    o += G(R(-143, -22, 286, 44, 14, { fill: '#1b1f17', stroke: GOLD, sw: 2.5 }) + icon('depot', -112, 2, GOLD, .7) + T(-84, 7, 'THEIR OWN SITE', { size: 20, fill: GOLD, ls: .8 }), { x: 837, y: 251, s: cl(k, 0, 1.08), op: cl(k) });
  }
  return o;
}

// ---------- 5: business case (81.0 - 97.12) ----------
function sC5(t) {
  let o = qhead(t, 5, 81.01);
  o += title(t, [[81.01, 'Business case'], [82.51, 'You spend {long before} the contract pays'], [86.65, 'Your existing business {pays for the launch}'], [89.67, 'Decide: {your balance sheet}, or a partner’s'], [94.13, 'If the launch slips, what you own {sits idle}']]);
  if (t < 86.65) {
    const a = 1 - p(t, 86.42, .22), e = fin(t, 82.6);
    const P = [[60, 150], [200, 150], [200, 180], [330, 180], [330, 214], [460, 214], [460, 250], [640, 250], [940, 128]];
    const [d1] = trace(P.slice(0, 8), [[82.9, 0], [83.47, 1], [83.6, 2], [83.95, 3], [84.08, 4], [84.41, 5], [84.54, 6], [85.61, 7]], t);
    const [d2, head] = trace(P.slice(7), [[85.61, 0], [86.4, 1]], t);
    o += `<path d="M60,150 H960" stroke="${LINE}" stroke-width="2.5" stroke-dasharray="6 8" opacity="${f(a * e)}"/>` + T(62, 138, 'BREAK EVEN', { size: 15, fill: DIM, ls: 1, op: a * e });
    o += `<path d="M200,150 V180 H330 V214 H460 V250 H640 L886,150 Z" fill="${RED}" opacity="${f(.13 * fin(t, 84.6) * a)}"/>`;
    if (d1) o += `<path d="${d1}" fill="none" stroke="${RED}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="${f(a)}"/>`;
    if (d2) o += `<path d="${d2}" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="${f(a)}"/>` + `<circle cx="${f(head[0])}" cy="${f(head[1])}" r="8" fill="${GOLD}" opacity="${f(a)}"/>`;
    [['DEPOTS', 265, 172, 83.47], ['POWER', 395, 206, 83.95], ['PILOTS', 550, 242, 84.41]].forEach(([lab, x, y, t0]) => { o += T(x, y, lab, { size: 17, fill: WHITE, anchor: 'middle', ls: 1, op: fin(t, t0 + .1) * a }); });
    o += `<path d="M640,112 V268" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="5 6" opacity="${f(fin(t, 85.5) * a)}"/>` + T(654, 128, 'CONTRACT PAYS', { size: 17, fill: GOLD, ls: 1, op: fin(t, 85.61) * a });
    return o;
  }
  if (t < 89.67) {
    const a = 1 - p(t, 89.45, .22), k1 = pop(t, 86.9, .42), k2 = pop(t, 88.87, .42);
    o += flow(372, 644, 190, t, LINE, a * fin(t, 87.6), 3);
    for (let i = 0; i < 5; i++) { if (t < 88.2) break; const u = ((t - 88.2) * .55 + i / 5) % 1; o += G(`<circle r="15" fill="${BG}" stroke="${GOLD}" stroke-width="2.5"/>` + T(0, 7, '$', { size: 19, fill: GOLD, anchor: 'middle' }), { x: lerp(380, 636, u), y: 190, op: Math.sin(u * Math.PI) * a * fin(t, 88.2) }); }
    o += G(R(-160, -70, 320, 140, 18, { fill: TILE, stroke: WHITE, sw: 2.5 }) + car(-78, -22, .7, GREY) + car(0, -22, .7, GREY) + car(78, -22, .7, GREY) + T(0, 42, 'EXISTING BUSINESS', { size: 22, fill: WHITE, anchor: 'middle', ls: 1 }), { x: 200, y: 190, s: cl(k1, 0, 1.05), op: cl(k1) * a });
    o += G(R(-160, -70, 320, 140, 18, { fill: '#1b1f17', stroke: GOLD, sw: 2.5 }) + car(0, -22, .85, WHITE) + `<circle cx="0" cy="-22" r="6" fill="${GOLD}"/>` + T(0, 42, 'AV LAUNCH', { size: 22, fill: GOLD, anchor: 'middle', ls: 1 }), { x: 816, y: 190, s: cl(k2, 0, 1.05), op: cl(k2) * a });
    return o;
  }
  const mine = eo(p(t, 91.9, .45)), theirs = eo(p(t, 93.0, .45)), slip = t >= 94.13, gone = slip ? 1 - p(t, 94.13, .35) : 1;
  o += `<path d="M508,112 V272" stroke="${LINE}" stroke-width="2" stroke-dasharray="6 8" opacity="${f(fin(t, 90.1) * gone)}"/>`;
  o += T(250, 132, 'YOUR BALANCE SHEET', { size: 19, fill: GOLD, anchor: 'middle', ls: 1.2, op: fin(t, 91.45) }) + T(766, 132, 'PARTNERS CARRY', { size: 19, fill: WHITE, anchor: 'middle', ls: 1.2, op: fin(t, 92.93) * gone });
  [['DEPOTS', 0, 135], ['CHARGERS', 0, 365], ['VEHICLES', 1, 651], ['POWER UPGRADES', 1, 881]].forEach(([lab, side, x], i) => {
    const k = pop(t, 90.11 + i * .14, .42), dec = side ? theirs : mine, col = dec <= 0 ? DIM : side ? WHITE : GOLD, idle = !side && slip ? p(t, 96.2, .3) : 0;
    o += G(R(-100, -24, 200, 48, 24, { fill: dec > 0 ? TILE : BG, stroke: idle > 0 ? mixHex(GOLD, DIM, idle) : col, sw: 2.2, dash: dec > 0 ? '' : '6 7' }) + T(0, 7, lab, { size: 18, fill: idle > 0 ? mixHex(GOLD, MUTED, idle) : dec > 0 ? col : MUTED, anchor: 'middle', ls: .8 }), { x, y: 182, s: cl(k, 0, 1.06), op: cl(k) * (side ? gone : 1) });
    if (!side && slip) { const ik = pop(t, 96.35 + i * .12, .4); o += G(R(-38, -15, 76, 30, 15, { fill: RED }) + T(0, 6, 'IDLE', { size: 17, fill: BG, anchor: 'middle', ls: 1.2 }), { x, y: 238, s: cl(ik, 0, 1.1), op: cl(ik) }); }
  });
  if (slip) {
    const e = fin(t, 94.4), mv = eio(p(t, 95.0, 1.0)), x = lerp(640, 900, mv);
    o += `<path d="M560,200 H970" stroke="${LINE}" stroke-width="5" stroke-linecap="round" opacity="${f(e)}"/>`;
    o += `<path d="M640,184 V216" stroke="${MUTED}" stroke-width="3" opacity="${f(e)}"/>` + T(640, 168, 'PLANNED', { size: 16, fill: MUTED, anchor: 'middle', ls: 1, op: e });
    o += `<path d="M640,200 H${f(x)}" stroke="${RED}" stroke-width="5" stroke-linecap="round" opacity="${f(e)}"/>`;
    o += `<circle cx="${f(x)}" cy="200" r="13" fill="${RED}" stroke="${BG}" stroke-width="3" opacity="${f(e)}"/>` + T(x, 244, 'LAUNCH SLIPS', { size: 17, fill: RED, anchor: 'middle', ls: 1, op: e * fin(t, 95.01) });
  }
  return o;
}

// ---------- 6: operating layer (97.22 - 115.48) ----------
function gauge(cx, cy, r, v, label, on, col) {
  const px = u => cx - r * Math.cos(Math.PI * u), py = u => cy - r * Math.sin(Math.PI * u);
  let o = `<path d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}" fill="none" stroke="${LINE}" stroke-width="12" stroke-linecap="round" opacity="${f(on)}"/>`;
  o += `<path d="M${f(px(.72))},${f(py(.72))} A${r},${r} 0 0 1 ${cx + r},${cy}" fill="none" stroke="${GREEN}" stroke-width="12" stroke-linecap="round" opacity="${f(on * .9)}"/>`;
  o += `<path d="M${cx},${cy} L${f(cx - (r - 20) * Math.cos(Math.PI * v))},${f(cy - (r - 20) * Math.sin(Math.PI * v))}" stroke="${col}" stroke-width="5" stroke-linecap="round" opacity="${f(on)}"/><circle cx="${cx}" cy="${cy}" r="9" fill="${col}" opacity="${f(on)}"/>`;
  return o + T(cx, cy + 34, label, { size: 19, fill: col, anchor: 'middle', ls: 1.2, op: on });
}
const NET = [170, 508, 846].map((x, g) => [0, 1, 2].map(r => [x, 150 + r * 48]));
function sC6(t) {
  let o = qhead(t, 6, 97.23);
  o += title(t, [[97.23, 'Operating layer'], [99.01, 'You’re judged on {uptime} and {turnaround}'], [103.53, 'Every idle minute is a minute {not earning}'], [107.87, 'It rides on {dozens of handoffs}'], [111.93, 'Who ties it together? {Build it or buy it}']]);
  if (t < 103.53) {
    const a = 1 - p(t, 103.3, .22), on = fin(t, 99.3) * a;
    const v1 = lerp(.3 + .04 * Math.sin(t * 5), .88, eio(p(t, 102.07, .7))), v2 = lerp(.36 + .04 * Math.sin(t * 4.3 + 1), .82, eio(p(t, 102.67, .7)));
    o += T(508, 150, 'THE AV PARTNER’S', { size: 16, fill: MUTED, anchor: 'middle', ls: 1.2, op: on }) + T(508, 172, 'SCORECARD', { size: 16, fill: MUTED, anchor: 'middle', ls: 1.2, op: on });
    return o + gauge(250, 226, 92, v1, 'UPTIME', on, t >= 102.07 ? GOLD : WHITE) + gauge(766, 226, 92, v2, 'TURNAROUND TIME', on, t >= 102.67 ? GOLD : WHITE);
  }
  if (t < 107.87) {
    const a = 1 - p(t, 107.65, .22), mins = Math.floor(cl((t - 104.05) / 3.3) * 42), z = pop(t, 107.13, .45), e = fin(t, 103.7) * a;
    o += R(30, 112, 300, 160, 18, { fill: TILE, stroke: LINE, sw: 2.5, op: e }) + icon('depot', 66, 142, MUTED, .8, TILE, e) + T(92, 149, 'DEPOT', { size: 18, fill: MUTED, ls: 1.2, op: e }) + car(180, 216, 1.3, WHITE, e);
    o += T(380, 146, 'MINUTES IDLE', { size: 18, fill: MUTED, ls: 1.2, op: e }) + T(380, 226, String(mins), { size: 76, fill: WHITE, op: e });
    o += T(680, 146, 'FARES EARNED', { size: 18, fill: MUTED, ls: 1.2, op: e }) + G(T(0, 0, '$0', { size: 76, fill: RED }), { x: 680, y: 226, s: z > 0 ? cl(z, .9, 1.08) : 1, op: e });
    o += `<path d="M380,256 H${f(380 + 240 * cl((t - 104.05) / 3.3))}" stroke="${WHITE}" stroke-width="5" stroke-linecap="round" opacity="${f(e)}"/><path d="M680,256 H950" stroke="${RED}" stroke-width="5" stroke-linecap="round" stroke-dasharray="3 11" opacity="${f(e)}"/>`;
    return o;
  }
  const ask = t >= 111.93, dimv = ask ? 1 - .78 * p(t, 113.5, .35) : 1, links = p(t, 109.09, 1.0);
  [['SITES', 110.31], ['FLEETS', 110.93], ['VENDORS', 111.43]].forEach(([lab, t0], g) => {
    const lit = fin(t, t0, .3);
    o += T(NET[g][0][0], 124, lab, { size: 18, fill: mixHex(DIM, WHITE, lit), anchor: 'middle', ls: 1.2, op: fin(t, 108.1) * dimv });
    NET[g].forEach(([x, y], r) => { const k = pop(t, 108.1 + g * .1 + r * .06, .35); o += G(`<circle r="15" fill="${TILE}" stroke="${mixHex(DIM, WHITE, lit)}" stroke-width="2.5"/>`, { x, y, s: cl(k, 0, 1.1), op: cl(k) * dimv }); });
  });
  for (let g = 0; g < 2; g++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    const n = g * 9 + a * 3 + b, on = cl(links * 18 - n), [x0, y0] = NET[g][a], [x1, y1] = NET[g + 1][b];
    if (on <= 0) continue;
    o += `<path d="M${x0 + 17},${y0} L${x1 - 17},${y1}" stroke="${ask ? GOLD : LINE}" stroke-width="2" opacity="${f(on * dimv * (ask ? .45 : 1))}"/>`;
    const u = ((t * .55 + rnd(n) * 3) % 1);
    o += `<circle cx="${f(lerp(x0 + 17, x1 - 17, u))}" cy="${f(lerp(y0, y1, u))}" r="4.5" fill="${GOLD}" opacity="${f(on * dimv * Math.sin(u * Math.PI))}"/>`;
  }
  if (!ask) { const n = Math.round(lerp(0, 36, links)); o += T(986, 204, String(n), { size: 44, fill: GOLD, anchor: 'end', op: fin(t, 109.09) }) + T(986, 230, 'HANDOFFS', { size: 15, fill: GOLD, anchor: 'end', ls: 1, op: fin(t, 109.09) }); }
  else {
    const q = pop(t, 112.43, .45), b1 = pop(t, 114.21, .42), b2 = pop(t, 114.93, .42);
    o += G(`<circle r="30" fill="#1b1f17" stroke="${GOLD}" stroke-width="3"/>` + T(0, 12, '?', { size: 34, fill: GOLD, anchor: 'middle' }), { x: 508, y: 198, s: cl(q, 0, 1.1), op: cl(q) * (1 - p(t, 113.5, .3)) });
    o += G(R(-120, -38, 240, 76, 38, { fill: TILE, stroke: WHITE, sw: 3 }) + T(0, 12, 'BUILD', { size: 34, fill: WHITE, anchor: 'middle', ls: 1.5 }), { x: 340, y: 198, s: cl(b1, 0, 1.06), op: cl(b1) });
    o += T(508, 208, 'OR', { size: 22, fill: MUTED, anchor: 'middle', ls: 1.5, op: fin(t, 114.67) });
    o += G(R(-120, -38, 240, 76, 38, { fill: '#1b1f17', stroke: GOLD, sw: 3 }) + T(0, 12, 'BUY', { size: 34, fill: GOLD, anchor: 'middle', ls: 1.5 }), { x: 676, y: 198, s: cl(b2, 0, 1.06), op: cl(b2) });
  }
  return o;
}

// ---------- that's the plan / the win (115.55 - 118.45) ----------
function sPlan(t) {
  let o = kicker(t, [[0, 'THE ROBOTAXI PLAN']]) + pips(t, 7, 0);
  o += title(t, [[115.57, 'That’s the plan: {six calls}'], [116.65, 'Now say you {win the contract}']]);
  const won = pop(t, 117.55, .45), dimv = 1 - .75 * p(t, 117.3, .3);
  QN.forEach((name, i) => { const k = pop(t, 115.6 + i * .07, .4), x = 30 + (i % 3) * 328, y = 112 + Math.floor(i / 3) * 80;
    o += G(R(0, 0, 300, 64, 14, { fill: TILE, stroke: LINE, sw: 2 }) + mark(34, 32, true, 1.1) + T(66, 40, name, { size: 24, fill: WHITE }), { x, y, op: cl(k) * dimv }); });
  o += G(R(-190, -44, 380, 88, 44, { fill: '#1b1f17', stroke: GOLD, sw: 3 }) + icon2('doc', -138, 0, GOLD, 1.2) + T(-102, 11, 'CONTRACT WON', { size: 30, fill: GOLD, ls: 1 }), { x: 508, y: 186, s: cl(won, 0, 1.06), op: cl(won) });
  return o;
}

// ---------- scale (118.52 - 126.78) ----------
function sScale(t) {
  let o = kicker(t, [[0, 'AFTER THE WIN']]) + title(t, [[118.57, 'The next question is about {scale}'], [121.15, '{50} cars this quarter, {500} next year'], [125.0, 'Does your operation {keep up}?']]);
  const k1 = pop(t, 122.19, .42), k2 = pop(t, 123.75, .42), g = eio(p(t, 123.75, 1.1)), n = Math.round(lerp(50, 500, g)), q = pop(t, 126.17, .45);
  o += T(30, 138, 'THIS QUARTER', { size: 18, fill: MUTED, ls: 1.2, op: fin(t, 121.6) }) + G(T(0, 0, '50', { size: 76, fill: WHITE }), { x: 30, y: 222, s: cl(k1, 0, 1.06), op: cl(k1) });
  o += T(270, 138, 'NEXT YEAR', { size: 18, fill: MUTED, ls: 1.2, op: fin(t, 123.33) }) + G(T(0, 0, String(n), { size: 76, fill: GOLD }), { x: 270, y: 222, s: cl(k2, 0, 1.06), op: cl(k2) });
  o += T(30, 262, 'cars', { size: 20, fill: MUTED, weight: 500, op: cl(k1) }) + T(270, 262, 'cars', { size: 20, fill: MUTED, weight: 500, op: cl(k2) });
  for (let i = 0; i < 100; i++) {                // each cell is five cars
    const c = i % 20, r = Math.floor(i / 20), x = 560 + c * 21, y = 122 + r * 30, first = i < 10, on = first ? cl(k1) : cl(g * 92 - (i - 10) + 1) * (k2 > 0 ? 1 : 0);
    const wob = t >= 125.0 && !first ? .75 + .25 * Math.sin(t * 7 + i * .4) : 1;
    o += R(x, y, 16, 22, 4, { fill: on > 0 ? (first ? WHITE : GOLD) : 'none', stroke: on > 0 ? 'none' : LINE, sw: 1.5, op: (on > 0 ? on * wob : fin(t, 121.3) * .8) });
  }
  o += G(`<circle r="30" fill="${BG}" stroke="${GOLD}" stroke-width="3"/>` + T(0, 12, '?', { size: 34, fill: GOLD, anchor: 'middle' }), { x: 770, y: 195, s: cl(q, 0, 1.1), op: cl(q) });
  return o;
}

// ---------- you don't need robotaxis to find out (126.85 - 128.9), then the box opens into the full-screen dry run ----------
function sDryIntro(t) {
  let o = kicker(t, [[0, 'BEFORE DAY ONE']]) + title(t, [[126.85, 'You don’t need {robotaxis} to find out']]);
  const k1 = pop(t, 127.45, .42), k2 = pop(t, 127.97, .42);
  o += G(R(-200, -66, 400, 132, 18, { stroke: DIM, sw: 2.5, dash: '7 9' }) + car(-128, -8, 1.0, DIM) + T(-62, -4, 'ROBOTAXIS', { size: 22, fill: DIM, ls: 1 }) + T(-62, 26, 'not needed yet', { size: 18, fill: DIM, weight: 500 }), { x: 250, y: 190, s: cl(k1, 0, 1.05), op: cl(k1) });
  o += G(R(-200, -66, 400, 132, 18, { fill: TILE, stroke: GOLD, sw: 2.5 }) + car(-128, -8, 1.0, WHITE) + T(-62, -4, 'CARS YOU HAVE', { size: 22, fill: WHITE, ls: 1 }) + T(-62, 26, 'and the people you have', { size: 18, fill: MUTED, weight: 500 }) + mark(172, -40, true, 1), { x: 766, y: 190, s: cl(k2, 0, 1.05), op: cl(k2) });
  return o;
}

// ---------- proof (147.68 - 153.12) ----------
function sProof(t) {
  let o = kicker(t, [[0, 'THE READINESS CASE']]) + title(t, [[147.71, 'Now your plan comes with {proof}'], [149.43, '{You} set the targets, not the AV partner']]);
  if (t < 149.43) {
    const a = 1 - p(t, 149.2, .22), k = pop(t, 147.9, .42), st = pop(t, 149.0, .4);
    o += G(R(-210, -78, 420, 156, 14, { fill: TILE, stroke: WHITE, sw: 2.5 }) + T(-186, -44, 'ROBOTAXI PLAN', { size: 19, fill: MUTED, ls: 1.4 }) + R(-186, -22, 250, 12, 6, { fill: LINE }) + R(-186, 2, 210, 12, 6, { fill: LINE }) + R(-186, 26, 232, 12, 6, { fill: LINE }) + R(-186, 50, 150, 12, 6, { fill: LINE })
      + G(`<circle r="46" fill="#1b1f17" stroke="${GOLD}" stroke-width="4"/>` + icon('check', 0, -8, GOLD, 1.5, '#1b1f17') + T(0, 30, 'PROOF', { size: 15, fill: GOLD, anchor: 'middle', ls: 1.5 }), { x: 130, y: 10, rot: -10, s: st > 0 ? cl(2 - st, 1, 2) * 1 : 0, op: cl(st) }), { x: 508, y: 190, s: cl(k, 0, 1.04), op: cl(k) * a });
    return o;
  }
  const k0 = pop(t, 149.63, .42), strike = eo(p(t, 151.15, .45));
  o += G(R(-175, -76, 350, 152, 18, { fill: BG, stroke: mixHex(WHITE, DIM, strike), sw: 2.5, dash: '7 8' }) + T(-150, -34, 'TARGETS', { size: 18, fill: MUTED, ls: 1.2 }) + T(-150, 8, 'Set for you', { size: 30, fill: mixHex(WHITE, DIM, strike) }) + T(-150, 44, 'by the AV partner', { size: 20, fill: mixHex(MUTED, DIM, strike), weight: 500 })
    + (strike > 0 ? `<path d="M-156,-2 H${f(-156 + 190 * strike)}" stroke="${RED}" stroke-width="4" stroke-linecap="round"/>` : ''), { x: 205, y: 190, op: fin(t, 149.5) });
  o += G(R(-285, -76, 570, 152, 18, { fill: '#1b1f17', stroke: GOLD, sw: 2.5 }) + T(-260, -40, 'TARGETS SET BY YOU', { size: 18, fill: GOLD, ls: 1.2 })
    + [['Cars ready by the rush', .72], ['Turnaround time', .55], ['Uptime', .84]].map(([lab, v], i) => { const y = -8 + i * 34, u = lerp(.25, v, eio(p(t, 150.09 + i * .16, .6)));
        return T(-260, y + 6, lab, { size: 18, fill: WHITE, weight: 500 }) + `<path d="M0,${y} H256" stroke="${LINE}" stroke-width="6" stroke-linecap="round"/><path d="M0,${y} H${f(256 * u)}" stroke="${GOLD}" stroke-width="6" stroke-linecap="round"/><circle cx="${f(256 * u)}" cy="${y}" r="10" fill="${GOLD}" stroke="${BG}" stroke-width="3"/>`; }).join(''), { x: 701, y: 190, s: cl(k0, 0, 1.05), op: cl(k0) });
  return o;
}

// ---------- reach out (153.2 - 159.75) ----------
function sCTA(t) {
  let o = kicker(t, [[0, 'TARS AI']]) + title(t, [[153.23, 'Working on a {robotaxi plan} for your fleet?']]);
  const k = pop(t, 155.81, .45), e = t >= 157.19, z = pop(t, 157.19, .45);
  o += G(R(-440, -62, 880, 124, 24, { fill: e ? '#1b1f17' : TILE, stroke: e ? GOLD : LINE, sw: 3 }) + icon2('mail', -372, 0, e ? GOLD : WHITE, 1.5)
    + T(-312, e ? 20 : 15, e ? 'contact@tarsai.co' : 'Reach out to us', { size: e ? 58 : 44, fill: e ? GOLD : WHITE }), { x: 508, y: 196, s: cl(k, 0, 1.04) * (e ? cl(z, .94, 1.04) : 1), op: cl(k) });
  return o;
}

// Content 7, reshoot: the two full-screen scenes, drawn in final frame coordinates (1080 x 1920).
// Everything sits inside the phone safe zone (x 110..970, y 250..1500); the caption band (y 1248..1438) stays clear
// and nothing sits right of x 850 below y 780 (the apps' avatar and action buttons).

// ---------- 1: six calls, all connected (7.45 - 18.8) ----------
const WC = { x: 540, y: 850, R: 285, r: 58 };
const WICON = ['pin', 'target', 'depot', 'car', 'bars', 'time'];
const WN = QN.map((name, i) => { const a = (-90 + i * 60) * Math.PI / 180; return { name, i, a, x: WC.x + WC.R * Math.cos(a), y: WC.y + WC.R * Math.sin(a) }; });
const C_HOT = [10.03, 11.25, 12.87, 14.2, 14.55, 15.45];                              // when call i turns gold
const C_ARC = [[10.5, .75], [12.3, .57], [13.8, .4], [14.2, .35], [15.0, .45], [15.45, .5]];   // gold link from call i to the next: [start, duration]
const C_TEST = 16.0, C_LAP = 2.2;
function wArc(i, k, col, w, op = 1) {                // the ring segment from node i to node i+1, drawn clockwise up to fraction k
  if (k <= 0 || op <= 0) return '';
  const gap = (WC.r + 14) / WC.R, a0 = WN[i].a + gap, a1 = WN[i].a + Math.PI / 3 - gap, a = a0 + (a1 - a0) * k;
  const P = an => [WC.x + WC.R * Math.cos(an), WC.y + WC.R * Math.sin(an)], [x0, y0] = P(a0), [x1, y1] = P(a);
  let o = `<path d="M${f(x0)},${f(y0)} A${WC.R},${WC.R} 0 0 1 ${f(x1)},${f(y1)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity="${f(op)}"/>`;
  if (k >= 1) { const d = a * 180 / Math.PI + 90; o += `<path d="M-11,-9 L4,0 L-11,9" transform="translate(${f(x1)},${f(y1)}) rotate(${f(d)})" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${f(op)}"/>`; }
  return o;
}
function fsCalls(t) {
  const test = t >= C_TEST, lap = test ? Math.max(0, (t - C_TEST - .15) / C_LAP) : 0;
  let o = T(110, 292, 'THE ROBOTAXI PLAN', { size: 26, fill: BLUE, ls: 1 });
  o += swap(t, [[0, 'Six calls, {all connected}'], [C_TEST, '{Pressure-test} the plan']], (v, al, dy) => T(110, 350 + dy, v, { size: 44, fill: WHITE, op: al }));
  o += swap(t, [[10.03, 'The city shapes {the partner}'], [11.81, 'The partner shapes {the sites}'], [13.35, 'The sites shape {the cost}'], [14.99, 'And there is a way to test all of it'], [16.83, 'before any robotaxi {shows up}']], (v, al, dy) => T(110, 404 + dy, v, { size: 27, fill: MUTED, weight: 500, op: al }));
  // the plan in the middle
  const gk = pop(t, 7.6, .5), lit = C_HOT.reduce((a, h) => a + fin(t, h, .35), 0), tk = fin(t, C_TEST, .35);
  o += `<circle cx="${WC.x}" cy="${WC.y}" r="${f(128 * cl(gk, 0, 1.05))}" fill="#1b1f17" stroke="${LINE}" stroke-width="6"/>`;
  o += `<circle cx="${WC.x}" cy="${WC.y}" r="128" fill="none" stroke="${GOLD}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${f(804.2 * lit / 6)} 805" transform="rotate(-90 ${WC.x} ${WC.y})" opacity="${f(cl(gk))}"/>`;
  o += G(G(T(0, -38, 'SIX CALLS', { size: 16, fill: GOLD, anchor: 'middle', ls: 1.5 }) + T(0, 4, 'Robotaxi', { size: 36, fill: WHITE, anchor: 'middle' }) + T(0, 44, 'plan', { size: 36, fill: WHITE, anchor: 'middle' }), { op: 1 - tk })
    + G(T(0, -38, 'BEFORE DAY ONE', { size: 16, fill: GOLD, anchor: 'middle', ls: 1.5 }) + T(0, 4, 'Pressure', { size: 36, fill: GOLD, anchor: 'middle' }) + T(0, 44, 'test', { size: 36, fill: GOLD, anchor: 'middle' }), { op: tk }), { x: WC.x, y: WC.y, s: cl(gk, 0, 1.05), op: cl(gk) });
  // spokes
  WN.forEach((n, i) => { const k = fin(t, C_HOT[i], .4); if (k > 0) o += `<path d="M${f(lerp(n.x, WC.x, .26))},${f(lerp(n.y, WC.y, .26))} L${f(lerp(n.x, WC.x, .52))},${f(lerp(n.y, WC.y, .52))}" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="5 7" stroke-dashoffset="${f(-t * 26)}" opacity="${f(k * .7)}"/>`; });
  // the ring: faint track, then white when "connected", then gold as each call shapes the next
  for (let i = 0; i < 6; i++) o += wArc(i, 1, LINE, 5, fin(t, 8.6, .4) * .9) + wArc(i, eo(p(t, 9.1 + i * .07, .4)), WHITE, 5) + wArc(i, eo(p(t, C_ARC[i][0], C_ARC[i][1])), GOLD, 7);
  const nHot = C_HOT.filter(h => t >= h).length, active = test ? Math.floor(lap * 6) % 6 : nHot - 1;
  WN.forEach((n, i) => {
    const k = pop(t, 7.85 + i * .12, .42), gold = t >= C_HOT[i], hot = gold && i === active, c = gold ? GOLD : WHITE;
    if (k <= 0) return;
    o += G(`<circle r="${WC.r}" fill="${gold ? '#1b1f17' : TILE}" stroke="${c}" stroke-width="${hot ? 4.5 : 3}"/>` + (WICON[i] === 'car' ? car(0, 0, .82, c) : icon(WICON[i], 0, 0, c, 1.5, TILE))
      + G(`<circle r="15" fill="${c}"/>` + T(0, 6, String(i + 1), { size: 18, fill: BG, anchor: 'middle' }), { x: -44, y: -44 }), { x: n.x, y: n.y, s: cl(k, 0, 1.08) * (hot ? 1.07 : 1), op: cl(k) });
    if (test) { const ck = pop(t, C_TEST + .15 + (i + .35) / 6 * C_LAP, .4); o += mark(n.x + 44, n.y - 44, true, 1.15 * cl(ck, 0, 1.1), cl(ck)); }
    const up = i === 0 || i === 1 || i === 5, dx = i === 1 || i === 2 ? 34 : i === 4 || i === 5 ? -34 : 0;
    o += T(n.x + dx, up ? n.y - WC.r - 18 : n.y + WC.r + 32, n.name, { size: 23, fill: c, anchor: 'middle', op: cl(k) });
  });
  if (test) { const a = -Math.PI / 2 + lap * 2 * Math.PI; o += `<circle cx="${f(WC.x + WC.R * Math.cos(a))}" cy="${f(WC.y + WC.R * Math.sin(a))}" r="10" fill="${GOLD}" stroke="${BG}" stroke-width="3" opacity="${f(fin(t, C_TEST + .15, .2))}"/>`; }
  return o;
}

// ---------- 2: the dry run and the readiness case (128.8 - 147.5) ----------
const D_ST = [['ARRIVE', 'down'], ['CHARGE', 'bolt'], ['CLEAN', 'spark'], ['INSPECT', 'target'], ['READY', 'check']];
const D_X = i => 110 + i * 177.5, D_T0 = 130.9, D_V = .6, D_N = 9, D_L = 5.6, D_D = D_L / D_N, D_GATE = .95, D_PRESS = 134.87, D_FAIL = 138.07, D_SLIP = 139.51, D_CASE = 141.87;
// each of the nine slots queues once after the slip starts; rank them by when they reach the charger
const D_Q = (() => { const tg = []; for (let j = 0; j < D_N; j++) { const u = (D_SLIP - D_T0) * D_V + j * D_D, c = Math.floor((u + .3) / D_L), s = u - c * D_L; tg.push(s < D_GATE ? D_SLIP + (D_GATE - s) / D_V : D_T0 + ((c + 1) * D_L + D_GATE - j * D_D) / D_V); }
  const order = tg.map((v, j) => [v, j]).sort((a, b) => a[0] - b[0]).map(v => v[1]); return order.reduce((m, j, r) => (m[j] = r, m), {}); })();
function dCar(j, t) {                              // where slot j's car is along the lane (0 = ARRIVE ... 4 = READY), or null if not on screen
  const u = (t - D_T0) * D_V + j * D_D, c = Math.floor((u + .3) / D_L); let s = u - c * D_L;
  if (t > D_SLIP) {
    const uS = (D_SLIP - D_T0) * D_V + j * D_D, cS = Math.floor((uS + .3) / D_L), sS = uS - cS * D_L, passed = sS >= D_GATE, cap = D_GATE - .21 * D_Q[j];
    if (!(passed && c === cS)) s = Math.min((c === cS || (passed && c === cS + 1)) ? s : 99, cap);
  }
  const base = j % 2 === 0 && j < 8, op = (base ? 1 : fin(t, 136.2 + j * .06, .4)) * cl((s + .3) / .2) * cl((4.5 - s) / .3);
  return op > 0 ? { s, op } : null;
}
function fsDry(t) {
  let o = T(110, 292, 'THE DRY RUN', { size: 26, fill: BLUE, ls: 1 });
  o += swap(t, [[0, ['Pick a site you scored.', 'Run the {depot process} there.']], [131.5, ['With cars you already have,', 'measure {every handoff}.']], [D_PRESS, ['Then {pressure-test} it.', 'More cars. Tighter windows.']], [138.0, ['Then {pressure-test} it.', 'A {failed charger}, mid-rush.']],
    [D_SLIP, ['Watch where it', '{starts to slip}.']], [D_CASE, ['That’s your', '{readiness case}.']]], (v, al, dy) => T(110, 348 + dy, v[0], { size: 43, fill: WHITE, op: al }) + T(110, 402 + dy, v[1], { size: 43, fill: WHITE, op: al }));
  if (t < 130.75) {                               // the sites you scored
    const a = 1 - p(t, 130.5, .25);
    [['SITE A', 64], ['SITE B', 88], ['SITE C', 71]].forEach(([name, sc], i) => {
      const k = pop(t, 128.95 + i * .12, .42), sk = pop(t, 129.79 + i * .1, .4), pick = i === 1 ? fin(t, 130.1, .3) : 0, c = pick > 0 ? mixHex(WHITE, GOLD, pick) : WHITE;
      o += G(R(-135, -105, 270, 210, 20, { fill: pick > 0 ? '#1b1f17' : TILE, stroke: c, sw: 2.5 + pick }) + icon('depot', 0, -52, c, 1.5) + T(0, 8, name, { size: 26, fill: c, anchor: 'middle', ls: 1 })
        + T(0, 44, 'SCORE', { size: 16, fill: MUTED, anchor: 'middle', ls: 1.4, op: cl(sk) }) + G(T(0, 0, String(sc), { size: 40, fill: c, anchor: 'middle' }), { y: 86, s: cl(sk, 0, 1.1), op: cl(sk) })
        + (pick > 0 ? mark(108, -80, true, 1.2 * pick, pick) : ''), { x: 245 + i * 295, y: 590, s: cl(k, 0, 1.05), op: cl(k) * a * (i === 1 ? 1 : 1 - .55 * fin(t, 130.1, .3)) });
    });
  }
  if (t >= 130.5 && t < D_CASE + .3) {            // the depot process, then the pressure test
    const a = fin(t, 130.55, .3) * (1 - p(t, D_CASE - .12, .32)), press = t >= D_PRESS, fail = t >= D_FAIL, slip = t >= D_SLIP;
    const cars = []; for (let j = 0; j < D_N; j++) { const c = dCar(j, t); if (c) cars.push(c); }
    o += `<path d="M110,716 H970" stroke="${LINE}" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round" opacity="${f(a)}"/>`;
    D_ST.forEach(([name, kind], i) => {
      const k = pop(t, 130.55 + i * .09, .42), busy = cars.some(c => Math.abs(c.s - i) < .28), bad = i === 1 && fail, c = bad ? RED : busy ? GOLD : WHITE;
      o += G(R(-75, -75, 150, 150, 18, { fill: busy && !bad ? '#1b1f17' : TILE, stroke: c, sw: busy || bad ? 3.5 : 2.5 }) + icon(kind, 0, -18, c, 1.45, TILE) + T(0, 46, name, { size: 21, fill: c, anchor: 'middle', ls: 1 }), { x: D_X(i) + 75, y: 575, s: cl(k, 0, 1.05), op: cl(k) * a });
      if (i === 1) for (let q = 0; q < 3; q++) { const dead = fail && q === 2; o += G(R(-9, -6, 18, 12, 3, { fill: dead ? RED : GREEN }), { x: D_X(1) + 47 + q * 28, y: 516, op: cl(k) * a * (dead ? .6 + .4 * Math.sin(t * 12) : 1) }); }
    });
    cars.forEach(c => { o += car(185 + c.s * 177.5, 716, .56, WHITE, c.op * a); });
    // the stopwatch on every handoff
    ['3 min', '5 min', '2 min', '3 min'].forEach((v, i) => {
      const k = pop(t, 133.63 + i * .13, .4), hot = slip && i === 0, txt = hot ? Math.round(lerp(5, 19, eio(p(t, D_SLIP + .15, 1.4)))) + ' min' : v, c = hot ? RED : GREEN;
      o += G(R(-46, -17, 92, 34, 17, { fill: BG, stroke: c, sw: 2.2 }) + T(0, 7, txt, { size: 18, fill: c, anchor: 'middle' }), { x: D_X(i) + 163.75, y: 772, s: cl(k, 0, 1.08), op: cl(k) * a });
    });
    o += T(110, 779, '', {});
    // the numbers under test
    const nCars = Math.round(lerp(12, 30, eio(p(t, 136.15, .8)))), win = lerp(6, 4, eio(p(t, 137.15, .6))), late = slip && t >= 140.65;
    const tile = (i, lab, val, c, hot) => G(R(0, 0, 236, 130, 18, { fill: hot ? '#1b1f17' : TILE, stroke: hot ? c : LINE, sw: 2.5 }) + T(22, 38, lab, { size: 17, fill: MUTED, ls: 1.2 }) + T(22, 100, val, { size: 50, fill: c }), { x: 110 + i * 252, y: 826, op: fin(t, 131.2 + i * .1) * a });
    o += tile(0, 'CARS TONIGHT', String(nCars), t >= 136.15 ? GOLD : WHITE, t >= 136.15 && t < 137.15);
    o += tile(1, 'WINDOW', (Math.round(win * 10) / 10).toFixed(win % 1 > .04 && win % 1 < .96 ? 1 : 0) + ' h', t >= 137.15 ? GOLD : WHITE, t >= 137.15 && t < D_FAIL);
    o += tile(2, 'READY ON TIME', late ? '22 / 30' : t >= 136.15 ? '? / 30' : '12 / 12', late ? RED : t >= 136.15 ? MUTED : GREEN, late);
    // what tonight looks like
    const st = swap(t, [[131.2, ['A normal night: {on time}', GREEN]], [D_PRESS, ['Now add {pressure}', GOLD]], [D_FAIL, ['One charger {down}', RED]], [D_SLIP, ['It slips at {charging}', RED]]], (v, al, dy) =>
      `<circle cx="140" cy="${f(1016 + dy)}" r="9" fill="${v[1]}" opacity="${f(al)}"/>` + T(166, 1027 + dy, v[0].replace('{', `<tspan fill="${v[1]}">`).replace('}', '</tspan>'), { size: 30, fill: WHITE, op: al }));
    o += G(R(110, 982, 740, 68, 18, { fill: TILE, stroke: LINE, sw: 2.5 }) + st, { op: fin(t, 131.2) * a });
    if (slip) { const k = fin(t, 141.21, .3); o += R(D_X(1) - 12, 488, 174, 174, 24, { stroke: GOLD, sw: 3, dash: '8 9', op: k * a }) + G(R(-78, -17, 156, 34, 17, { fill: GOLD }) + T(0, 7, 'SLIPS HERE', { size: 18, fill: BG, anchor: 'middle', ls: 1 }), { x: D_X(1) + 75, y: 470, op: k * a }); }
  }
  if (t >= D_CASE) {                                // the readiness case
    const hk = pop(t, D_CASE + .1, .42);
    o += G(R(0, -22, 330, 44, 22, { fill: '#1b1f17', stroke: GOLD, sw: 2.2 }) + T(22, 7, 'READINESS CASE · SITE B', { size: 19, fill: GOLD, ls: 1 }), { x: 110, y: 478, s: cl(hk, 0, 1.04), op: cl(hk) });
    [['WHAT THE SITE CAN HANDLE', '24 cars a night', 'in a 4-hour window', GREEN, 'check', 143.43], ['WHERE IT BREAKS', 'Charging', 'one charger down at the rush', RED, 'x', 145.01], ['WHAT IT TAKES TO FIX IT', 'A spare charger', 'and a faster hand-off to cleaning', GOLD, 'work', 146.13]].forEach(([lab, big, sub, c, kind, t0], i) => {
      const k = pop(t, t0, .45);
      o += G(R(0, 0, 740, 160, 20, { fill: TILE, stroke: c, sw: 2.5 }) + `<circle cx="80" cy="80" r="42" fill="${BG}" stroke="${c}" stroke-width="3"/>` + icon(kind, 80, 80, c, 1.5, BG)
        + T(150, 46, lab, { size: 19, fill: c, ls: 1.2 }) + T(150, 96, big, { size: 42, fill: WHITE }) + T(150, 134, sub, { size: 22, fill: MUTED, weight: 500 }), { x: 110 + 40 * (1 - cl(k)), y: 520 + i * 178, op: cl(k) });
    });
    o += T(110, 1088, 'Illustrative numbers', { size: 18, fill: DIM, weight: 500, op: fin(t, 143.43) });
  }
  return o;
}

// Content 7, reshoot: what is on screen when.
// Jump cuts in the footage (frames): 570, 808, 910, 1209, 1318, 1634, 2006, 2333, 2431, 2828, 2923, 3237, 3471, 3813, 3911, 4047, 4435, 4602.
const FULL = [[7.45, 18.8, fsCalls], [128.8, 147.5, fsDry]];
const BOX = [[0.15, 7.2, sHook], [19.0, 40.25, sC1], [40.35, 54.2, sC2], [54.3, 66.55, sC3], [66.65, 80.9, sC4], [81.0, 97.12, sC5], [97.22, 115.48, sC6],
             [115.55, 118.45, sPlan], [118.52, 126.78, sScale], [126.85, 128.9, sDryIntro], [147.68, 153.12, sProof], [153.2, 159.75, sCTA]];
// the box is up from the first word to the last, so there is always a visual on screen
const BOX_WINDOWS = [[0.15, 159.75]];
