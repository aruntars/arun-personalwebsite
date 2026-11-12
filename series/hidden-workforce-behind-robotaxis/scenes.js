(function(){
// The graphics for this episode's page: each scene is a function of time that returns SVG.
// Episode 2 was edited without coded graphics. Its info cards were still pictures, so the scenes at the end of
// this file redraw those cards and animate them. They are new for the page, and they show only what the video says.
// The colours, helpers and icons below are the series' own, copied unchanged from the episode 3 overlay source.
// src/build.py wraps this file and hands BOX and FULL to the player.

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


// ---------- episode 2: helpers ----------
const commas = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const upTo = (t, a, d, n, step = 1) => Math.round(n * eo(p(t, a, d)) / step) * step;      // a number counting up
function ico2(kind, x, y, c, s = 1, op = 1) {
  const g = inner => `<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})" opacity="${f(op)}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  switch (kind) {
    case 'remote': return g(`<path d="M-15,3 V-2 a15,15 0 0 1 30,0 V3"/>
      <rect x="-19" y="1" width="8" height="14" rx="3" fill="${c}" stroke="none"/><rect x="11" y="1" width="8" height="14" rx="3" fill="${c}" stroke="none"/>
      <path d="M15,15 v1 a6,6 0 0 1 -6,6 h-6"/>`);
    case 'depot': return g(`<path d="M-19,16 V-5 L0,-17 L19,-5 V16"/><path d="M-10,16 V3 H10 V16"/><path d="M-10,9.5 H10"/>`);
    case 'support': return g(`<path d="M-18,-14 H18 V8 H-1 L-11,17 V8 H-18 Z"/><path d="M-9,-3 H9"/>`);
    case 'roadside': return g(`<path d="M0,-17 L19,15 H-19 Z"/><path d="M0,-5 V5"/><circle cx="0" cy="10" r="1.7" fill="${c}" stroke="none"/>`);
    case 'repair': return ico('work', x, y, c, s, DARK, op);
  }
  return '';
}
function dashPill(cx, cy, text, o = {}) {                 // a cost that is named but not counted yet
  const { size = 20, w = text.length * size * .64 + 30, h = size + 15, s = 1, op = 1 } = o;
  return G(R(-w / 2, -h / 2, w, h, h / 2, { fill: BG, stroke: MUTED, sw: 2, dash: '6 6' }) +
    T(0, size * .35, text, { size, fill: TXT, weight: 500, anchor: 'middle' }), { x: cx, y: cy, s, op });
}

// ---------- 1. staffing estimate (0 - 6.6) ----------
function w1(t) {
  const a = 0;
  let o = kicker(t, [[0, 'ILLUSTRATIVE STAFFING ESTIMATE']]);
  const lo = upTo(t, a + .5, 1.4, 500, 10), more = upTo(t, a + 3.3, 1.0, 200, 10);
  o += T(30, 152, more > 0 ? `${lo} to ${lo + more}` : `${lo}`, { size: 76, fill: GOLD, op: fin(t, a + .4) });
  o += T(30, 204, 'people', { size: 40, fill: WHITE, op: fin(t, a + .6) });
  o += T(30, 252, 'Supporting 1,000 robotaxis', { size: 25, fill: MUTED, weight: 500, op: fin(t, a + 1.0) });
  const X = i => 502 + i * 53;
  o += T(482, 92, '1,000 ROBOTAXIS', { size: 20, fill: MUTED, ls: 1, op: fin(t, a + .9) });
  o += T(986, 92, 'each icon = 100', { size: 19, fill: DIM, weight: 500, anchor: 'end', op: fin(t, a + 1.6) });
  for (let i = 0; i < 10; i++) o += car(X(i), 124, .56 * pop(t, a + 1.0 + i * .07, .35));
  o += T(482, 184, 'THE PEOPLE BEHIND THEM', { size: 20, fill: MUTED, ls: 1, op: fin(t, a + 1.9) });
  for (let i = 0; i < 7; i++) {
    const range = i >= 5, t0 = range ? a + 3.3 + (i - 5) * .45 : a + 2.0 + i * .12;
    const k = pop(t, t0, .38);
    if (k <= 0) continue;
    const pulse = range ? .55 + .45 * Math.pow(Math.sin((t - t0) * 2.4), 2) : 1;      // the range: 500 to 700
    o += G(ico('person', 0, 0, range ? GOLD : WHITE, .8), { x: X(i), y: 222, s: k, op: pulse });
  }
  o += T(X(4), 266, '500', { size: 20, fill: MUTED, anchor: 'middle', op: fin(t, a + 2.7) });
  o += T(X(6), 266, '700', { size: 20, fill: GOLD, anchor: 'middle', op: fin(t, a + 4.0) });
  return o;
}

// ---------- 2. where they work (10 - 16.6) ----------
const ROLES = [['remote', 'Remote', 'assistance'], ['depot', 'Depot', 'operations'], ['support', 'Customer', 'support'],
  ['roadside', 'Roadside', ''], ['repair', 'Repairs and', 'collision']];
function w2(t) {
  const a = 10;
  let o = kicker(t, [[0, 'THE PEOPLE BEHIND THE FLEET']]);
  ROLES.forEach(([kind, l1, l2], i) => {
    const t0 = a + .5 + i * .95, k = pop(t, t0, .45);
    if (k <= 0) return;
    const w = 180, hot = 1 - p(t, t0 + .5, .6);                                        // gold as it lands, then it settles
    let g = R(-w / 2, -96, w, 192, 16, { fill: TILE, stroke: mixHex(LINE, GOLD, hot), sw: 2.5 });
    g += `<circle cx="0" cy="-38" r="34" fill="${DARK}" stroke="${mixHex(DIM, GOLD, hot)}" stroke-width="2.5"/>`;
    g += ico2(kind, 0, -38, mixHex(WHITE, GOLD, hot));
    g += T(0, l2 ? 34 : 48, l1, { size: 23, fill: WHITE, anchor: 'middle' });
    if (l2) g += T(0, 62, l2, { size: 23, fill: WHITE, anchor: 'middle' });
    o += G(g, { x: 30 + i * 194 + w / 2, y: 168, s: .9 + .1 * k, op: cl(k) });
  });
  return o;
}

// ---------- 3. what the jobs pay (20 - 27.5) ----------
const WAGES = [['Depot staff', 'San Francisco', [26, 30], 'an hour'], ['Roadside', 'assistance', [25], 'an hour'],
  ['Operations', 'supervisor', [100000], 'a year'], ['Waymo operations', 'manager, depots', [170000], 'a year']];
function w3(t) {
  const a = 20;
  let o = kicker(t, [[0, 'REAL JOBS, REAL WAGES']]);
  o += T(986, 43, 'approximate pay', { size: 20, fill: DIM, weight: 500, anchor: 'end', op: fin(t, a + .4) });
  WAGES.forEach(([l1, l2, nums, unit], i) => {
    const t0 = a + .5 + i * 1.5, k = pop(t, t0, .45);
    if (k <= 0) return;
    const w = 232;
    const val = nums.map(n => '$' + commas(upTo(t, t0 + .1, .9, n, n > 1000 ? 1000 : 1))).join(' to ');
    let g = R(-w / 2, -100, w, 200, 16, { fill: TILE, stroke: LINE, sw: 2 });
    g += T(0, -60, l1, { size: 21, fill: MUTED, weight: 500, anchor: 'middle' });
    g += T(0, -33, l2, { size: 21, fill: MUTED, weight: 500, anchor: 'middle' });
    g += T(0, 30, val, { size: 37, fill: GOLD, anchor: 'middle' });
    g += T(0, 68, unit, { size: 21, fill: TXT, weight: 500, anchor: 'middle' });
    o += G(g, { x: 26 + i * 244 + w / 2, y: 168, s: .9 + .1 * k, op: cl(k) });
  });
  return o;
}

// ---------- 4. blended across every role (30 - 35.8) ----------
const BLEND = ['Depot staff', 'Roadside', 'Supervisors', 'Managers', 'Remote roles'];
function w4(t) {
  const a = 30;
  let o = kicker(t, [[0, 'ILLUSTRATIVE BLENDED WAGE']]);
  BLEND.forEach((name, i) => {
    const y = 88 + i * 42;
    const k = eo(p(t, a + 1.5 + i * .12, .8));
    if (k > 0) o += `<path d="M222,${y} C330,${y} 310,172 414,172" fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-linecap="round" pathLength="1" stroke-dasharray="${f(k)} 1" opacity=".75"/>`;
    o += pill(126, y, name, MUTED, { size: 20, w: 192, h: 34, fill: TILE, tcol: TXT, op: fin(t, a + .3 + i * .2) });
  });
  o += T(432, 180, '~$' + commas(upTo(t, a + 2.3, 1.2, 50000, 1000)), { size: 78, fill: GOLD, op: fin(t, a + 2.2) });
  o += T(434, 226, 'a year, per person', { size: 30, fill: WHITE, op: fin(t, a + 2.8) });
  o += T(434, 262, 'Before benefits. Role mix matters.', { size: 21, fill: MUTED, weight: 500, op: fin(t, a + 3.6) });
  return o;
}

// ---------- 5. revenue assumptions (40 - 47.4) ----------
const TRIP = [['20', 'paid trips', 'per car a day'], ['6 mi', 'per trip', 'on average'], ['$20', 'per trip', '']];
function w5(t) {
  const a = 40;
  let o = kicker(t, [[0, 'REVENUE ASSUMPTIONS']]);
  TRIP.forEach(([v, l1, l2], i) => {
    const t0 = a + .5 + i * 1.0, k = pop(t, t0, .45);
    if (k <= 0) return;
    const w = 196;
    let g = R(-w / 2, -76, w, 152, 16, { fill: TILE, stroke: LINE, sw: 2 });
    g += T(0, -8, v, { size: 56, fill: WHITE, anchor: 'middle' });
    g += T(0, l2 ? 28 : 40, l1, { size: 20, fill: TXT, weight: 500, anchor: 'middle' });
    if (l2) g += T(0, 53, l2, { size: 20, fill: MUTED, weight: 500, anchor: 'middle' });
    o += G(g, { x: 30 + i * 212 + w / 2, y: 146, s: .9 + .1 * k, op: cl(k) });
  });
  for (let i = 0; i < 3; i++) {                                                         // the three assumptions lead to one number
    const ph = ((t - a) * 1.5 - i * .28) % 1;
    const al = .25 + .75 * Math.max(0, Math.sin(Math.max(0, ph) * Math.PI));
    o += `<path d="M${670 + i * 16},132 l14,14 l-14,14" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="${f(al * fin(t, a + 3.7))}"/>`;
  }
  const kr = pop(t, a + 4.1, .45);
  if (kr > 0) {
    const w = 252;
    let g = R(-w / 2, -76, w, 152, 16, { fill: '#1b1f17', stroke: GOLD, sw: 3 });
    g += T(0, -4, '$' + (3.33 * eo(p(t, a + 4.2, .9))).toFixed(2), { size: 64, fill: GOLD, anchor: 'middle' });
    g += T(0, 40, 'for every paid mile', { size: 21, fill: WHITE, weight: 500, anchor: 'middle' });
    o += G(g, { x: 860, y: 146, s: .9 + .1 * kr, op: cl(kr) });
  }
  o += T(30, 262, '$20 a trip \u00f7 6 miles = about {$3.33} a paid mile', { size: 21, fill: MUTED, weight: 500, op: fin(t, a + 5.0) });
  return o;
}

// ---------- 6. what wages take from each paid mile (50 - 57.6) ----------
function w6(t) {
  const a = 50, X0 = 30, W = 956, Y = 112, H = 54, per = W / 3.33;                     // the bar is $3.33 wide
  let o = kicker(t, [[0, 'PER PAID MILE | ILLUSTRATIVE']]);
  o += R(X0, Y, W * eo(p(t, a + .4, .9)), H, 12, { fill: TILE, stroke: LINE, sw: 2 });
  o += T(X0 + W, Y - 14, '{$3.33} gross fares', { size: 26, fill: WHITE, anchor: 'end', op: fin(t, a + 1.0) });
  const k1 = eo(p(t, a + 2.0, .9)), k2 = eo(p(t, a + 3.1, .8));
  const w57 = .57 * per, w80 = .80 * per;
  if (k2 > 0) o += R(X0 + 3, Y + 3, w57 + (w80 - w57) * k2 - 3, H - 6, 9, { fill: GOLD, op: .34 + .12 * Math.sin((t - a) * 3) });
  o += R(X0 + 3, Y + 3, w57 * k1 - 3, H - 6, 9, { fill: GOLD });
  const cents = k2 > 0 ? `57 to ${57 + Math.round(23 * k2)}` : `${Math.round(57 * k1)}`;
  o += T(X0, Y - 14, `{${cents} cents} wages alone`, { size: 26, fill: WHITE, op: fin(t, a + 2.0) });
  [[w57, '57\u00a2', a + 2.8], [w80, '80\u00a2', a + 3.8]].forEach(([x, label, t0]) => {
    o += `<path d="M${f(X0 + x)},${Y + H + 5} v9" stroke="${MUTED}" stroke-width="2.5" stroke-linecap="round" opacity="${f(fin(t, t0))}"/>`;
    o += T(X0 + x, Y + H + 36, label, { size: 20, fill: MUTED, anchor: 'middle', op: fin(t, t0) });
  });
  o += T(X0, 262, 'Before:', { size: 21, fill: MUTED, weight: 500, op: fin(t, a + 4.3) });
  let x = 128;
  ['Vehicle depreciation', 'Insurance', 'Infrastructure costs'].forEach((name, i) => {
    const w = name.length * 20 * .64 + 30;
    o += dashPill(x + w / 2, 255, name, { w, s: pop(t, a + 4.6 + i * .6, .4) });
    x += w + 14;
  });
  return o;
}

// ---------- 7. where most of them work (60 - 66.8) ----------
const TASKS = ['Charging', 'Cleaning', 'Inspecting', 'Calibrating', 'Maintaining'];
function w7(t) {
  const a = 60, X0 = 30, W = 956;
  let o = kicker(t, [[0, 'ESTIMATED WORKFORCE MIX']]);
  o += title(t, [[a + .3, 'About {two-thirds} work in depots']], { size: 36, y: 94 });
  o += R(X0, 116, W, 30, 15, { fill: TILE, stroke: LINE, sw: 2, op: fin(t, a + .4) });
  o += R(X0 + 3, 119, W * 2 / 3 * eio(p(t, a + .8, 1.3)) - 3, 24, 12, { fill: GOLD });
  o += T(X0 + 4, 176, 'DEPOTS', { size: 20, fill: GOLD, ls: 1, op: fin(t, a + 1.8) });
  let x = X0;
  TASKS.forEach((name, i) => {
    const w = name.length * 22 * .64 + 34;
    o += pill(x + w / 2, 234, name, MUTED, { size: 22, w, fill: TILE, tcol: WHITE, s: pop(t, a + 2.6 + i * .55, .4) });
    x += w + 16;
  });
  return o;
}

// ---------- 8. the lever: how much of the fleet each person supports (70 - 77.8) ----------
const LEVERS = [['Better tools', 2.0, 2], ['Fewer wasted steps', 3.6, 2], ['Less waiting on the next car', 5.2, 3]];
function w8(t) {
  const a = 70;
  let o = kicker(t, [[0, 'THE OPERATING LEVER']]);
  o += title(t, [[a + .3, 'Fleet supported {per person}']], { size: 36, y: 94 });
  // the cars one person keeps on the road: a few at first, more with each change. No count is implied.
  const lit = 3 * eo(p(t, a + .9, .6)) + LEVERS.reduce((n, [, dt, add]) => n + add * eo(p(t, a + dt, .8)), 0);
  const CX = i => 152 + i * 88;
  for (let i = 0; i < 10; i++) {
    const on = cl(lit - i);
    o += car(CX(i), 158, .8, mixHex('#5d6b75', '#f2f2f2', on), fin(t, a + .6 + i * .05) * (.4 + .6 * on));
  }
  o += G(`<circle r="30" fill="${TILE}" stroke="${GOLD}" stroke-width="3"/>` + ico('person', 0, 3, WHITE, .85), { x: 66, y: 158, s: pop(t, a + .5, .45) });
  if (lit > .05) {
    const x1 = CX(0) - 44 + lit * 88 - 4;
    o += `<path d="M${CX(0) - 40},196 H${f(x1)}" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>`;
    o += `<path d="M${f(x1)},189 v14" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>`;
  }
  let x = 30;
  LEVERS.forEach(([name, dt]) => {
    const w = name.length * 20 * .64 + 34;
    o += pill(x + w / 2, 248, name, GOLD, { size: 20, w, fill: BG, s: pop(t, a + dt, .4) });
    x += w + 16;
  });
  return o;
}

// ---------- what plays when ----------
// These times are the page's own. The video had no coded timeline for its cards.
const BOX = [[0, 6.6, w1], [10, 16.6, w2], [20, 27.5, w3], [30, 35.8, w4], [40, 47.4, w5], [50, 57.6, w6], [60, 66.8, w7], [70, 77.8, w8]];
const FULL = [];
window.SERIES_SCENES = {BOX: typeof BOX === 'undefined' ? [] : BOX, FULL: typeof FULL === 'undefined' ? [] : FULL, BG: BG};
})();
