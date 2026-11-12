// The on-screen graphics from the video, as drawn for it: each scene is a function of time that returns SVG.
// Copied from the video's overlay source. src/build.py wraps this file and hands BOX and FULL to the player.
//
// Changes from the overlay source. Apart from the three things below, everything up to the block marked
// "Added for the article" at the very end is the overlay's script as it was, up to its DEFS line.
// 1. Clip path. The scenes with a media card (fsStory, fsCourse, fsOps) clip their picture to rounded corners with
//    url(#mediaClip). The overlay defined that clip path after this point, inside DEFS, and its frame() put DEFS in
//    front of every frame. The article player adds no <defs>, so the block at the end makes those entries of FULL
//    emit the clip path themselves, in front of the scene.
// 2. Pictures. The image paths are unchanged: they already read assets/..., and that folder sits beside the
//    article page. It holds the four pictures fsOps shows, scaled down to 1200 px wide.
// 3. The first two full-screen scenes are not used. fsStory and fsCourse show footage and photos of the vehicle
//    programme the speaker worked on before TARS AI. The site names no past employer, so the article leaves both
//    scenes out, their pictures were not copied, and the labels in them that named the vehicle and the two test
//    locations are blank here. FULL keeps both entries so the numbering of the later scenes does not change.
//    Do not point a figure at full:0 or full:1.

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

// Intro video (third recording), full-screen sequence 1: the vehicle's story told with real footage (2.4 - 15.95 s).
// One media card (5:3) at the top of the stage, a label zone under it.
// Layout: header (y 200-300), stage (y 340-1200) = media card (y 352-938) + label zone (y 955-1190).
// Word timings: bare 2.76, no pedals 4.90, no steering wheel 5.78, factory 7.66, public roads 8.28, thousands 10.40,
// engineering 11.66, safety 12.66, legal 13.30, operations 13.84, so many other teams 14.66, "It took years" 16.18.

const MC = { x: 52, y: 352, w: 976, h: 586 };
const pad3 = n => String(n).padStart(3, '0');
const clipN = (t, t0, fps, n) => cl(Math.floor((t - t0) * fps + 1e-6), 0, n - 1);
// what the card shows from t0 on; zoom = [from, to, scale0, scale1] is a slow push-in on a still
const MEDIA = [
  { t0: 2.0, src: t => `assets/acc/${pad3(1 + clipN(t, 2.4, 15, 25))}.jpg` },                        // bare frames on the line
  { t0: 4.1, src: t => `assets/acc/${pad3(26 + clipN(t, 4.1, 15, 14))}.jpg`, zoom: [5.0, 6.9, 1, 1.06] },   // inside the bare shell
  { t0: 7.2, src: t => `assets/ez/${pad3(1 + clipN(t, 7.2, 12, 22))}.jpg` },                          // finished vehicle in the factory
  { t0: 8.35, src: () => 'assets/roads.jpg', zoom: [8.35, 10.5, 1, 1.07] },                            // on public roads
  { t0: 10.35, src: t => `assets/wav/${pad3(1 + clipN(t, 10.35, 30, 131))}.jpg` },                     // the team around the vehicle
  { t0: 14.66, src: () => 'assets/team.jpg', zoom: [14.66, 16.4, 1, 1.05] },                          // factory floor photo
];
// the media card for any list of media items (the story, the closed course, the operations photos)
function mediaCard(t, media = MEDIA) {
  let idx = 0;
  for (let i = 0; i < media.length; i++) if (t >= media[i].t0) idx = i;
  const cx = MC.x + MC.w / 2, cy = MC.y + MC.h / 2;
  const draw = (i, op) => {
    const m = media[i], z = m.zoom, s = z ? lerp(z[2], z[3], p(t, z[0], z[1] - z[0])) : 1;
    return `<image href="${m.src(t)}" x="${MC.x}" y="${MC.y}" width="${MC.w}" height="${MC.h}" preserveAspectRatio="xMidYMid slice" opacity="${f(op)}" transform="translate(${cx},${cy}) scale(${f(s * 1000) / 1000}) translate(${-cx},${-cy})"/>`;
  };
  const k = p(t, media[idx].t0, .16);
  return `<g clip-path="url(#mediaClip)">${R(MC.x, MC.y, MC.w, MC.h, 0, { fill: '#000' })}${k < 1 && idx > 0 ? draw(idx - 1, 1) : ''}${draw(idx, k)}</g>`
    + R(MC.x, MC.y, MC.w, MC.h, 18, { stroke: LINE, sw: 2 });
}

const STEPS = [[2.4, 'BARE METAL'], [7.2, 'THE FACTORY'], [8.35, 'PUBLIC ROADS']];
const TEAMS = [['ENGINEERING', 11.66], ['SAFETY', 12.66], ['LEGAL', 13.3], ['OPERATIONS', 13.84], ['+ MANY MORE', 14.66]];
// a row of pills that light up one by one, as in the teams list
function pillRow(t, items, y) {
  let z = '', x = 70;
  items.forEach(([lab, t0]) => {
    const w = lab.length * 23 * .64 + 30, on = t >= t0;
    z += pill(x + w / 2, y, lab, on ? GOLD : LINE, { size: 23, w, h: 46, fill: on ? GOLD : BG, tcol: on ? BG : DIM, s: on ? 1 + .1 * (1 - p(t, t0, .3)) : 1 });
    x += w + 14;
  });
  return z;
}
function storyZone(t) {
  let o = '';
  if (t < 10.5) {                                 // the three-step journey
    const zo = 1 - p(t, 10.3, .2);
    const step = t >= STEPS[2][0] ? 2 : t >= STEPS[1][0] ? 1 : 0;
    let z = G(`<circle r="46" fill="#1b1f17" stroke="${GOLD}" stroke-width="3.5"/>` + T(0, 17, '0' + (step + 1), { size: 46, fill: GOLD, anchor: 'middle' }),
      { x: 116, y: 1046, s: 1 + .1 * (1 - p(t, STEPS[step][0], .3)) });
    z += swap(t, STEPS, (v, al, dy) => T(184, 1046 + dy, v, { size: 54, fill: WHITE, op: al }));
    z += swap(t, [[2.4, 'A frame on the assembly line'], [4.1, ''], [7.2, 'The finished vehicle'], [8.35, '']],
      (v, al) => T(186, 1096, v, { size: 28, fill: MUTED, weight: 500, op: al }));
    if (t >= 4.1 && t < 7.2) {                     // "No pedals, no steering wheel"
      const fo = 1 - p(t, 7.05, .15);
      z += pill(262, 1088, 'NO PEDALS', RED, { size: 22, w: 156, h: 42, fill: '#2a1a1c', tcol: WHITE, s: cl(pop(t, 4.9, .4), 0, 1.1), op: fo * cl(pop(t, 4.9, .4)) });
      z += pill(489, 1088, 'NO STEERING WHEEL', RED, { size: 22, w: 270, h: 42, fill: '#2a1a1c', tcol: WHITE, s: cl(pop(t, 5.78, .4), 0, 1.1), op: fo * cl(pop(t, 5.78, .4)) });
    }
    STEPS.forEach(([t0], i) => {                   // progress bar
      const x = 70 + i * 317.3;
      z += R(x, 1150, 305.3, 9, 4.5, { fill: LINE });
      z += R(x, 1150, 305.3 * eo(p(t, t0, .45)), 9, 4.5, { fill: GOLD });
    });
    o += G(z, { op: zo });
  }
  if (t >= 10.3) {                                // the people
    const zi = fin(t, 10.35, .3);
    let z = swap(t, [[10.3, '{Thousands} of people'], [14.6, 'And so many other {teams}']], (v, al, dy) => T(70, 1050 + dy, v, { size: 54, fill: WHITE, op: al }));
    z += pillRow(t, TEAMS, 1118);
    o += G(z, { op: zi });
  }
  return o;
}

function fsStory(t) {
  let o = T(40, 238, '', { size: 30, fill: GOLD, ls: 2 });
  o += swap(t, [[2.4, 'From {bare metal} to {public roads}'], [9.3, 'Getting there was a {team effort}']],
    (v, al, dy) => T(40, 296 + dy, v, { size: 46, fill: WHITE, op: al }));
  o += R(40, 340, 1000, 860, 26, { fill: DARK, stroke: LINE, sw: 3 });
  o += mediaCard(t);
  if (t >= 14.75) o += pill(MC.x + 168, MC.y + MC.h - 40, 'ON THE FACTORY FLOOR', WHITE, { size: 20, w: 290, h: 40, fill: BG, op: fin(t, 14.85, .3) * .95 });
  o += storyZone(t);
  return o;
}

// Intro video (third recording), the two photo sequences in the same media-card layout as the story.
//   fsCourse  22.95 - 25.6   closed-course testing footage          (words: closed course 23.14, edge case 24.06 / 25.06)
//   fsOps     41.3 - 55.3    what it takes to run a thousand cars   (depots 41.58, service centers 43.70, roadside 46.16,
//                            remote operations 48.24, a dozen other functions 51.72, riders never see 52.94)
//                            covers the edit points at 46.27 and 54.90.

const COURSE_MEDIA = [{ t0: 22.6, src: () => 'assets/cc/001.jpg', zoom: [22.9, 25.9, 1, 1.09] }];
function fsCourse(t) {
  let o = T(40, 238, '', { size: 30, fill: GOLD, ls: 2 });
  o += T(40, 296, 'Years of testing before a {single ride}', { size: 46, fill: WHITE });
  o += R(40, 340, 1000, 860, 26, { fill: DARK, stroke: LINE, sw: 3 });
  o += mediaCard(t, COURSE_MEDIA);
  let z = T(70, 1046, 'Closed course', { size: 54, fill: WHITE });
  z += T(70, 1096, '', { size: 28, fill: MUTED, weight: 500 });
  [24.06, 25.06].forEach((t0, i) => {              // edge case after edge case
    const k = cl(pop(t, t0, .4), 0, 1.1);
    if (k > 0) z += pill(70 + 82 + i * 178, 1150, 'EDGE CASE', RED, { size: 22, w: 164, h: 42, fill: '#2a1a1c', tcol: WHITE, s: k, op: cl(k) });
  });
  return o + z;
}

const OPS_MEDIA = [
  { t0: 41.3, src: () => 'assets/ops-depot.jpg', zoom: [41.3, 43.8, 1, 1.05] },
  { t0: 43.55, src: () => 'assets/ops-service-center.jpg', zoom: [43.55, 46.3, 1, 1.05] },
  { t0: 46.05, src: () => 'assets/ops-roadside.jpg', zoom: [46.05, 48.4, 1, 1.05] },
  { t0: 48.15, src: () => 'assets/ops-remote-ops.jpg', zoom: [48.15, 51.4, 1, 1.05] },
];
const OPS_LABELS = [[41.3, '{Depots}', 'Charging, cleaning, inspection'], [43.55, '{Service centers}', 'Keeping them on the road'],
  [46.05, '{Roadside}', 'When one gets stuck'], [48.15, '{Remote operations}', 'When the car needs to phone a friend'], [51.1, 'And a {dozen more}', 'Functions riders never see']];
const OPS_PILLS = [['DEPOTS', 41.58], ['SERVICE CENTERS', 43.7], ['ROADSIDE', 46.16], ['REMOTE OPS', 48.24], ['+ MANY MORE', 51.86]];
const OPS_TILES = [['ops-depot', 'DEPOTS'], ['ops-service-center', 'SERVICE CENTERS'], ['ops-roadside', 'ROADSIDE'], ['ops-remote-ops', 'REMOTE OPS']];
function fsOps(t) {
  let o = T(40, 238, 'ONE TO N', { size: 30, fill: GOLD, ls: 2 });
  o += T(40, 296, 'What it takes to run a {thousand cars}', { size: 46, fill: WHITE });
  o += R(40, 340, 1000, 860, 26, { fill: DARK, stroke: LINE, sw: 3 });
  const grid = p(t, 51.1, .3);                     // 0 = one photo at a time, 1 = all four, and a dozen more
  if (grid < 1) o += G(mediaCard(t, OPS_MEDIA), { op: 1 - grid });
  if (grid > 0) {
    const w = MC.w / 2, h = MC.h / 2;
    let g = R(MC.x, MC.y, MC.w, MC.h, 0, { fill: '#000' });
    OPS_TILES.forEach(([src, lab], i) => {
      const x = MC.x + (i % 2) * w, y = MC.y + Math.floor(i / 2) * h;
      g += `<image href="assets/${src}.jpg" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" preserveAspectRatio="xMidYMid slice"/>`;
      g += R(x + 16, y + h - 50, lab.length * 20 * .64 + 24, 34, 8, { fill: BG, op: .85 });
      g += T(x + 28, y + h - 26, lab, { size: 20, fill: WHITE, ls: 1.2 });
    });
    g += `<path d="M${f(MC.x + w)},${MC.y} V${f(MC.y + MC.h)} M${MC.x},${f(MC.y + h)} H${f(MC.x + MC.w)}" stroke="${LINE}" stroke-width="4"/>`;
    g = `<g clip-path="url(#mediaClip)">${g}</g>` + R(MC.x, MC.y, MC.w, MC.h, 18, { stroke: LINE, sw: 2 });
    const k = cl(pop(t, 51.86, .45), 0, 1.12);
    if (k > 0) g += pill(MC.x + MC.w / 2, MC.y + MC.h / 2, '+ A DOZEN MORE', GOLD, { size: 28, w: 320, h: 62, fill: GOLD, tcol: BG, s: k, op: cl(k) });
    o += G(g, { op: grid });
  }
  let z = swap(t, OPS_LABELS.map(([t0, big]) => [t0, big]), (v, al, dy) => T(70, 1046 + dy, v, { size: 54, fill: WHITE, op: al }));
  z += swap(t, OPS_LABELS.map(([t0, , sub]) => [t0, sub]), (v, al) => T(70, 1096, v, { size: 28, fill: MUTED, weight: 500, op: al }));
  z += pillRow(t, OPS_PILLS, 1150);
  return o + z;
}

// Intro video (third recording), full-screen illustrated sequences. Each one covers an edit point in the footage.
//   fsFound  65.2 - 84.7    the last two years, the foundation, then what I found  (covers cuts at 65.37 and 79.67)
//   fsScale  96.7 - 101.3   works for a few hundred cars, breaks at scale          (covers cuts at 97.10 and 100.87)
//   fsGoal  107.9 - 113.2   an operation as autonomous as the vehicles             (covers cut at 112.77)
//   fsPay  123.75 - 129.6   0 to 1 puts cars on the road, 1 to N makes them pay    (covers cut at 124.10)
// Layout as in the story sequence: header (y 200-300), stage (y 340-1200).

function ico2(kind, x, y, c, s = 1, op = 1) {
  const g = inner => `<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})" opacity="${f(op)}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  switch (kind) {
    case 'depot': return g(`<path d="M-19,17 V-3 L0,-17 L19,-3 V17 Z"/><path d="M-9,17 V4 H9 V17"/>`);
    case 'partners': return g(`<circle cx="-8" cy="0" r="12"/><circle cx="8" cy="0" r="12"/>`);
    case 'lock': return g(`<rect x="-11" y="-3" width="22" height="18" rx="3.5"/><path d="M-7,-3 V-9 a7,7 0 0 1 14,0 V-3"/>`);
    case 'loop': return g(`<path d="M-14,4 a14,14 0 1 1 6,11"/><path d="M-15,17 L-8,15 L-10,8" />`);
    case 'coin': return g(`<circle r="17"/><path d="M5,-7 C-9,-13 -9,0 0,0 C9,0 9,13 -6,7 M0,-12 V12"/>`);
  }
  return '';
}
// kickers: a string, or [[t, text], ...] when it changes
const stageHead = (kick, titles, t) => (typeof kick === 'string' ? T(40, 238, kick, { size: 30, fill: GOLD, ls: 2 })
  : swap(t, kick, (v, al) => T(40, 238, v, { size: 30, fill: GOLD, ls: 2, op: al })))
  + swap(t, titles, (v, al, dy) => T(40, 296 + dy, v, { size: 46, fill: WHITE, op: al }))
  + R(40, 340, 1000, 860, 26, { fill: DARK, stroke: LINE, sw: 3 });
const bigCheck = (x, y, t, t0, r = 26) => G(`<circle r="${r}" fill="${GREEN}"/>` + ico('check', 0, 0, BG, r / 17, GREEN), { x, y, s: cl(pop(t, t0, .4), 0, 1.15) });
const bigX = (x, y, t, t0, r = 26) => G(`<circle r="${r}" fill="#3a2020" stroke="${RED}" stroke-width="3"/>` + ico('x', 0, 0, RED, r / 20), { x, y, s: cl(pop(t, t0, .4), 0, 1.15) });
const nodeIcon = (kind, c, s) => kind === 'car' ? car(0, 0, s * .6) : kind === 'depot' || kind === 'partners' ? ico2(kind, 0, 0, c, s)
  : ico(kind, 0, 0, c, kind === 'bolt' ? s * 1.2 : s * .9, TILE);

// ---------- the last two years, the foundation, then what I found ----------
// words: operators 66.24, partners 67.52, models 68.68, agents 69.32, simulating 69.82, people doing the work 72.70,
// holds up 74.30, foundation 76.74, physical AI 77.58, autonomous fleets 78.60, found 80.20, car 81.48, autonomous 81.96,
// operations 82.96, is not 84.06
const LAYERS = [['OPERATORS · CUSTOMERS · PARTNERS', 66.2], ['MODELS  ·  AGENTS  ·  SIMULATION', 68.6], ['THE PEOPLE DOING THE WORK', 72.6], ['PHYSICAL AI', 76.7]];
const FOUND_NODES = [['ENERGY', 'bolt'], ['MAINTENANCE', 'work'], ['VENDORS', 'partners'], ['SUPPORT', 'person'], ['PEOPLE', 'person']];
const persons = (n, x0, y) => Array.from({ length: n }, (_, j) => G(`<circle r="22" fill="${BG}" stroke="${MUTED}" stroke-width="2.5"/>` + ico('person', 0, 2, WHITE, .66), { x: x0 + j * 50, y })).join('');
function fsFound(t) {
  let o = stageHead([[65.0, 'THE LAST TWO YEARS'], [79.3, 'WHAT I FOUND']],
    [[65.0, 'Two years around {one question}'], [68.0, 'Models, agents and {simulation}'], [71.7, 'Tested with the people {doing the work}'],
      [75.0, 'Laying the {foundation} for physical AI'], [79.3, 'So here is {what I found}'], [81.4, 'The car is {autonomous}'], [82.8, 'The operation around it {is not}']], t);
  const sw = p(t, 79.1, .25);                       // 0 = foundation, 1 = what I found
  if (sw < 1) {
    let z = '';
    LAYERS.forEach(([lab, t0], i) => {              // layers rise into place, bottom first
      const k = eo(p(t, t0, .45));
      if (k <= 0) return;
      const y = 1040 - i * 150 + (1 - k) * 60, top = i === 3;
      z += G(R(140, 0, 800, 136, 18, { fill: top ? '#1b1f17' : TILE, stroke: top ? GOLD : LINE, sw: top ? 3.5 : 2.5 })
        + (i === 0 ? G(ico2('partners', 0, 0, WHITE, 1.1), { x: 200, y: 68 }) + persons(2, 262, 68)
          : i === 1 ? G(ico('db', 0, 0, WHITE, 1.1, TILE), { x: 196, y: 68 }) + sparkDot(250, 68, .8, GOLD) + G(ico('target', 0, 0, WHITE, 1.05, TILE), { x: 304, y: 68 })
            : i === 2 ? persons(4, 196, 68) : sparkDot(196, 68, 1.1, GOLD))
        + T(top ? 240 : 420, 81, lab, { size: top ? 40 : i === 0 ? 23 : 28, fill: top ? GOLD : WHITE, ls: i === 0 ? 1 : 1.4 }), { y, op: k });
    });
    if (t >= 78.5) {                                // the fleet on top of the foundation
      let cars = '';
      for (let i = 0; i < 7; i++) { const k = pop(t, 78.55 + i * .07, .35); if (k > 0) cars += car(240 + i * 100, 500, 1.35 * cl(k, 0, 1.08), '#f2f2f2', cl(k)); }
      z += cars + T(540, 426, 'AUTONOMOUS FLEETS', { size: 30, fill: WHITE, anchor: 'middle', ls: 2, op: fin(t, 78.65, .3) });
    }
    o += G(z, { op: 1 - sw });
  }
  if (sw > 0) {
    let z = '';
    const ok = t >= 81.9;
    z += G(`<circle r="120" fill="${ok ? '#152017' : TILE}" stroke="${ok ? GREEN : LINE}" stroke-width="5"/>` + car(0, 0, 3.1), { x: 540, y: 600, s: 1 + .08 * (1 - p(t, 81.9, .3)) });
    if (ok) z += bigCheck(640, 506, t, 81.9, 32);
    z += T(540, 776, 'THE CAR', { size: 26, fill: MUTED, anchor: 'middle', ls: 2 });
    if (ok) z += T(540, 816, 'AUTONOMOUS', { size: 30, fill: GREEN, anchor: 'middle', ls: 2, op: fin(t, 82.0, .3) });
    if (t >= 82.9) {                                // the operations around it, each its own island
      FOUND_NODES.forEach(([lab, kind], i) => {
        const k = pop(t, 82.95 + i * .14, .4);
        if (k <= 0) return;
        const x = 150 + i * 195;
        z += G(`<circle r="58" fill="${TILE}" stroke="#6b7882" stroke-width="3"/>` + nodeIcon(kind, WHITE, 1.6), { x, y: 960, s: cl(k, 0, 1.08) });
        z += T(x, 1052, lab, { size: 20, fill: WHITE, anchor: 'middle', ls: 1.2, op: cl(k) });
        if (i < 4) {
          z += `<path d="M${x + 66},960 H${x + 129}" stroke="${LINE}" stroke-width="3" stroke-dasharray="8 8" opacity="${f(cl(k))}"/>`;
          if (t >= 84.0) z += bigX(x + 97.5, 960, t, 84.05 + i * .12, 20);
        }
      });
      if (t >= 84.15) z += T(540, 1150, 'NOT AUTONOMOUS', { size: 40, fill: RED, anchor: 'middle', ls: 2.5, op: fin(t, 84.2, .3) });
    }
    o += G(z, { op: sw });
  }
  return o;
}

// ---------- works for a few hundred vehicles, breaks at scale ----------
// words: that works 96.90, few hundred 98.22, cars 98.80, breaks 99.70, scale 100.26
const SC = { x: 540, y: 715, dx: 88, dy: 62, s: .3 };
function fsScale(t) {
  let o = stageHead('THE BREAKING POINT', [[96.6, 'That works for a {few hundred}'], [99.5, 'It {breaks} at scale']], t);
  const z = eio(p(t, 99.55, .55)), s = lerp(1, SC.s, z);
  if (z > 0) for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) {   // eight more fleets appear around the first one
    if (c === 1 && r === 1) continue;
    const n = r * 3 + c, k = pop(t, 99.68 + rnd(n + 2) * .3, .4);
    if (k <= 0) continue;
    const cx = SC.x + (c - 1) * 306, cy = SC.y + (r - 1) * 232, bad = eo(p(t, 100.1 + rnd(n + 9) * .45, .3));
    let m = '';
    for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
      const red = rnd(n * 100 + i * 10 + j) < .55 * bad;
      m += `<rect x="${f((i - 4.5) * SC.dx * SC.s - 9)}" y="${f((j - 4.5) * SC.dy * SC.s - 5)}" width="18" height="10" rx="3" fill="${red ? RED : '#c9cdd0'}"/>`;
    }
    o += G(m, { x: cx, y: cy, s: cl(k, 0, 1.06), op: cl(k) });
    if (bad > 0 && rnd(n + 31) < .75) o += bigX(cx, cy, t, 100.1 + rnd(n + 9) * .45, 30);
  }
  let g = '';
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
    const k = eo(p(t, 96.75 + (i + j) * .03, .25));
    if (k > 0) g += car((i - 4.5) * SC.dx, (j - 4.5) * SC.dy, .58 * k, '#f2f2f2', k);
  }
  o += G(g, { x: SC.x, y: SC.y, s });
  if (z > 0) o += R(SC.x - 140, SC.y - 104, 280, 208, 14, { stroke: GREEN, sw: 3, op: z * .9 });
  o += swap(t, [[98.2, 'ok'], [100.2, 'bad']], (v, al, dy) => v === 'ok'
    ? G(`<circle cx="-150" cy="-17" r="26" fill="${GREEN}"/>` + ico('check', -150, -17, BG, 1.5, GREEN) + T(-108, 0, 'A FEW HUNDRED', { size: 52, fill: GREEN }), { x: 500, y: 1140 + dy, op: al })
    : G(`<circle cx="-150" cy="-17" r="26" fill="${RED}"/>` + ico('x', -150, -17, BG, 1.4, RED) + T(-108, 0, 'AT SCALE', { size: 52, fill: RED }), { x: 560, y: 1140 + dy, op: al }));
  return o;
}

// ---------- the goal: an operation as autonomous as the vehicles ----------
// words: goal 109.08, operation 109.94, autonomous 110.88, vehicles 111.82, themselves 112.06
// Every part of robotaxi operations around one hub of agents and robots: an inner ring of the core functions and an
// outer ring of everything that happens in the field.
function ico3(kind, x, y, c, s = 1) {
  const g = inner => `<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  switch (kind) {
    case 'headset': return g(`<path d="M-15,4 V-2 a15,15 0 0 1 30,0 V4"/><rect x="-18" y="2" width="8" height="12" rx="3" fill="${c}" stroke="none"/><rect x="10" y="2" width="8" height="12" rx="3" fill="${c}" stroke="none"/><path d="M14,14 c0,6 -6,8 -12,8"/>`);
    case 'warn': return g(`<path d="M0,-17 L18,14 H-18 Z"/><path d="M0,-4 V5"/><circle cx="0" cy="10" r="1.8" fill="${c}" stroke="none"/>`);
    case 'crash': return g(`<rect x="-21" y="-3" width="15" height="12" rx="3"/><rect x="6" y="-3" width="15" height="12" rx="3"/><path d="M-4,-6 L0,-14 M0,-4 L4,-10 M-4,-2 L-9,-8" stroke-width="2.6"/><path d="M0,-2 L4,2" stroke-width="2.6"/>`);
    case 'building': return g(`<rect x="-14" y="-17" width="28" height="34" rx="2"/><path d="M-7,-9 H-3 M3,-9 H7 M-7,-1 H-3 M3,-1 H7 M-7,7 H-3 M3,7 H7"/><path d="M-3,17 V11 H3 V17"/>`);
    case 'tow': return g(`<path d="M-18,8 H-2 V-6 H8 L14,2 H18 V8"/><circle cx="-10" cy="12" r="4"/><circle cx="12" cy="12" r="4"/><path d="M-18,8 V-14 L-8,-14 L-8,-4"/>`);
    case 'pin': return g(`<path d="M0,17 C-11,4 -13,-1 -13,-5 a13,13 0 1 1 26,0 c0,4 -2,9 -13,22 z"/><circle cx="0" cy="-5" r="4"/>`);
    case 'tower': return g(`<path d="M0,-16 V17 M-9,17 L0,-2 L9,17"/><path d="M-11,-10 a15,15 0 0 1 22,0 M-6,-5 a8,8 0 0 1 12,0"/>`);
    case 'civic': return g(`<path d="M-17,-5 L0,-15 L17,-5 Z"/><path d="M-13,-5 V11 M-5,-5 V11 M5,-5 V11 M13,-5 V11"/><path d="M-17,11 H17 M-17,17 H17"/>`);
    case 'wrench': return g(`<path d="M-14,14 L1,-1" stroke-width="7"/><circle cx="6" cy="-6" r="10.5" fill="${c}" stroke="none"/><circle cx="9" cy="-9" r="4" fill="${BG}" stroke="none"/>`);
    case 'parking': return g(`<rect x="-15" y="-15" width="30" height="30" rx="5"/><path d="M-5,9 V-8 H2 a5,5 0 0 1 0,10 H-5" stroke-width="3.4"/>`);
    case 'charge': return g(`<rect x="-12" y="-10" width="24" height="26" rx="3"/><path d="M-6,-10 V-16 M6,-10 V-16"/><path d="M2,-5 L-4,3 H4 L-2,11" fill="none"/>`);
  }
  return '';
}
// The map is built around a vehicle's day. The inner ring is that day, in order; the hub of agents and robots runs
// every stage of it. Each outer node hangs off the stage it belongs to, and nothing else.
const GOALC = { x: 540, y: 760 }, GR_IN = 190, GR_OUT = 350;
const DAY = [['DISPATCH', 'target', -90], ['ON THE ROAD', 'car', -30], ['BACK TO DEPOT', 'depot', 30], ['CHARGING', 'charge', 90], ['CLEAN & INSPECT', 'loop', 150], ['MAINTENANCE', 'wrench', 210]];
// [label, icon, angle, parent stage index, extra link to another outer node]
const FIELD = [['CITIES &\nSTATES', 'civic', -112, 0], ['RIDER\nSUPPORT', 'headset', -68, 1], ['REMOTE\nOPS', 'tower', -40, 1], ['INCIDENTS &\nCOLLISIONS', 'crash', -12, 1],
  ['ROADSIDE &\nTOWING', 'tow', 14, 2, 3], ['SATELLITE\nSITES', 'pin', 44, 2], ['PARKING', 'parking', 72, 2, 5], ['POWER GRID', 'bolt', 102, 3], ['CREWS', 'person', 138, 4], ['VENDORS &\nPARTS', 'partners', 196, 5], ['SERVICE\nCENTERS', 'building', 224, 5, 9]];
const gpos = (ang, r) => ({ x: GOALC.x + r * Math.cos(ang * Math.PI / 180), y: GOALC.y + r * Math.sin(ang * Math.PI / 180) });
const GOAL_IN = DAY.map(([lab, kind, ang], i) => ({ lab, kind, ang, ...gpos(ang, GR_IN), t: 108.3 + i * .1 }));
const GOAL_OUT = FIELD.map(([lab, kind, ang, par, link], i) => ({ lab, kind, ang, par, link, ...gpos(ang, GR_OUT), t: 109.1 + i * .08 }));
const goalIcon = (kind, c, s) => kind === 'car' ? car(0, 0, s * .55) : kind === 'depot' || kind === 'partners' || kind === 'loop' ? ico2(kind, 0, 0, c, s)
  : kind === 'person' || kind === 'target' || kind === 'bolt' ? ico(kind, 0, 0, c, kind === 'bolt' ? s * 1.15 : s * .9, TILE) : ico3(kind, 0, 0, c, s * .9);
let G_BASE = 1;                                     // opacity of the grey guide lines (they fade in with the nodes)
const gline = (A, B, k, col = GOLD, w = 3) => {
  const L = Math.hypot(B.x - A.x, B.y - A.y);
  return `<path d="M${f(A.x)},${f(A.y)} L${f(B.x)},${f(B.y)}" stroke="${LINE}" stroke-width="2.5" opacity="${f(G_BASE)}"/>`
    + (k > 0 ? `<path d="M${f(A.x)},${f(A.y)} L${f(B.x)},${f(B.y)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${f(L * k)} ${f(L)}"/>` : '');
};
function goalNode(t, n, NR, on, k, done, tDone, size) {
  let o = G(`<circle r="${NR}" fill="${on ? '#1b1f17' : TILE}" stroke="${on ? GOLD : LINE}" stroke-width="3"/>` + goalIcon(n.kind, on ? WHITE : MUTED, NR / 36),
    { x: n.x, y: n.y, s: cl(k, 0, 1.08) });
  if (done) o += bigCheck(n.x + NR * .72, n.y - NR * .72, t, tDone, NR > 46 ? 17 : 14);
  const lines = n.lab.split('\n'), lw = Math.max(...lines.map(l => l.length)) * size * .66 + 16;
  o += R(n.x - lw / 2, n.y + NR + 8, lw, 10 + lines.length * (size + 5), 6, { fill: DARK, op: cl(k) * .92 });
  lines.forEach((l, j) => { o += T(n.x, n.y + NR + 27 + j * (size + 5), l, { size, fill: on ? WHITE : DIM, anchor: 'middle', ls: 1.1, op: cl(k) }); });
  return o;
}
function fsGoal(t) {
  let o = stageHead('TARS AI', [[108.15, 'The {goal}'], [109.45, 'An operation as {autonomous} as the car']], t);
  const link = eio(p(t, 109.45, 1.3));             // the agents take over the day, stage by stage
  G_BASE = fin(t, 108.55, .9);
  // the day: arrows from stage to stage around the inner ring
  DAY.forEach((d, i) => {
    const a0 = d[2] + 17, a1 = DAY[(i + 1) % 6][2] - 17 + (i === 5 ? 360 : 0), k = cl(link * 6 - i, 0, 1);
    const A = gpos(a0, GR_IN), B = gpos(a1, GR_IN), Bk = gpos(a0 + (a1 - a0) * k, GR_IN);
    o += `<path d="M${f(A.x)},${f(A.y)} A${GR_IN},${GR_IN} 0 0 1 ${f(B.x)},${f(B.y)}" stroke="${LINE}" stroke-width="2.5" fill="none" opacity="${f(G_BASE)}"/>`;
    if (k > 0) o += `<path d="M${f(A.x)},${f(A.y)} A${GR_IN},${GR_IN} 0 0 1 ${f(Bk.x)},${f(Bk.y)}" stroke="${GOLD}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    if (k >= 1) o += G(`<path d="M-9,-7 L4,0 L-9,7" fill="none" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`, { x: B.x, y: B.y, rot: a1 + 90 });
  });
  // spokes from the hub to every stage, then each field node to its stage
  GOAL_IN.forEach((n, i) => { o += gline(GOALC, n, cl(link * 6 - i, 0, 1), GOLD, 3.5); });
  GOAL_OUT.forEach(n => {
    const k = cl(link * 6 - n.par - .5, 0, 1);
    o += gline(GOAL_IN[n.par], n, k, '#c9a800', 2.5);
    if (n.link !== undefined) o += gline(GOAL_OUT[n.link], n, k, '#c9a800', 2.5);
  });
  GOAL_IN.forEach((n, i) => { const k = pop(t, n.t, .45); if (k > 0) o += goalNode(t, n, 50, link * 6 >= i, k, t >= 110.9 + i * .08, 110.9 + i * .08, 18); });
  GOAL_OUT.forEach((n, i) => { const k = pop(t, n.t, .45); if (k > 0) o += goalNode(t, n, 42, link * 6 >= n.par + .5, k, t >= 111.4 + i * .05, 111.4 + i * .05, 16); });
  const hk = cl(pop(t, 108.75, .45), 0, 1.1), hh = (t % 1.4) / 1.4;
  o += `<circle cx="${GOALC.x}" cy="${GOALC.y}" r="${f(78 + hh * 36)}" fill="none" stroke="${GOLD}" stroke-width="2.5" opacity="${f((1 - hh) * .5 * hk)}"/>`;
  o += G(`<circle r="78" fill="#1b1f17" stroke="${GOLD}" stroke-width="4"/>` + ico('spark', 0, -24, GOLD, 1.2)
    + T(0, 22, 'AI AGENTS', { size: 16, fill: GOLD, anchor: 'middle', ls: 1.2 }) + T(0, 43, '+ ROBOTICS', { size: 16, fill: GOLD, anchor: 'middle', ls: 1.2 }), { x: GOALC.x, y: GOALC.y, s: hk });
  return o;
}

// ---------- 0 to 1 puts the cars on the road, 1 to N makes them pay ----------
// words: 0 to 1 123.98, road 126.32, 1 to N 126.96, pay 128.68, "That's what we are building" 129.36
function fsPay(t) {
  let o = stageHead('ZERO TO ONE. ONE TO N.', [[123.65, '{0 to 1} puts these cars on the road'], [126.85, '{1 to N} is what makes them pay']], t);
  const a = t >= 124.0, b = t >= 126.96;
  let A = R(0, 0, 940, 360, 24, { fill: TILE, stroke: a ? GREEN : LINE, sw: a ? 4 : 2.5 })
    + T(50, 210, `0 ${ARROW} 1`, { size: 150, fill: a ? WHITE : DIM }) + T(54, 290, 'ON THE ROAD', { size: 30, fill: a ? GREEN : DIM, ls: 2 })
    + car(690, 180, 3.0, '#f2f2f2', a ? 1 : .35) + (a ? bigCheck(880, 60, t, 124.0, 30) : '');
  o += G(A, { x: 70, y: 400 });
  let cars = '';
  for (let n = 0; n < 15; n++) {
    const k = b ? pop(t, 127.05 + n * .06, .35) : 0;
    cars += car(590 + (n % 5) * 76, 90 + Math.floor(n / 5) * 80, 1.05 * (b ? cl(k, 0, 1.1) : 1), b ? '#f2f2f2' : '#3d4a54', b ? cl(k) : .6);
  }
  let coins = '';
  if (t >= 128.35) for (let i = 0; i < 5; i++) coins += G(`<circle r="22" fill="${GOLD}"/>` + ico2('coin', 0, 0, BG, .8), { x: 590 + i * 76, y: 318, s: cl(pop(t, 128.4 + i * .1, .4), 0, 1.15) });
  let B = R(0, 0, 940, 360, 24, { fill: b ? '#1b1f17' : TILE, stroke: b ? GOLD : LINE, sw: b ? 4 : 2.5 })
    + T(50, 210, `1 ${ARROW} N`, { size: 150, fill: b ? GOLD : DIM }) + T(54, 290, 'MAKES THEM PAY', { size: 30, fill: b ? GOLD : DIM, ls: 2 }) + cars + coins;
  o += G(B, { x: 70, y: 800 });
  return o;
}

// Intro video (third recording): each part optimizes for itself, the cost sits in the handoffs, the people are
// stretched thin. Full screen from 88.75 s, then cross-fades into fsScale at 96.45 (one block, so the speaker never
// flashes between the two). Covers the edit point at 91.27.
// words: vendors 88.90, support 89.68, same thing 90.64, everyone's piece works 91.10-92.22, cost 93.04,
// handoffs 94.06, people 95.24, stretched thin 96.32, that works 96.90

const SILOS = [['ENERGY', 'bolt', 88.45], ['MAINTENANCE', 'work', 88.6], ['VENDORS', 'partners', 88.9], ['SUPPORT', 'person', 89.68]];
const siloIcon = (kind, c, s) => kind === 'partners' ? ico2(kind, 0, 0, c, s) : ico(kind, 0, 0, c, kind === 'bolt' ? s * 1.25 : s, TILE);
function fsSilos(t) {
  let o = stageHead('WHAT I FOUND', [[88.4, 'Each part optimizes for {itself}'], [90.9, 'Everyone’s piece {works}'],
    [92.8, 'The cost shows up in the {handoffs}'], [94.4, 'The people are {stretched thin}']], t);
  const ph = p(t, 94.5, .3);                        // 0 = the parts, 1 = the people
  if (ph < 1) {
    let z = '';
    const TW = 212, TH = 300, TY = 610;
    SILOS.forEach(([lab, kind, t0], i) => {
      const on = t >= t0, x = 70 + i * 252, k = on ? 1 + .06 * (1 - p(t, t0, .3)) : 1;
      let tile = R(0, 0, TW, TH, 20, { fill: on ? '#1b1f17' : TILE, stroke: on ? GOLD : LINE, sw: on ? 3.5 : 2.5 })
        + G(`<circle r="44" fill="${BG}" stroke="${on ? GOLD : LINE}" stroke-width="3"/>` + siloIcon(kind, on ? WHITE : DIM, 1.5), { x: TW / 2, y: 84 })
        + T(TW / 2, 182, lab, { size: lab.length > 8 ? 21 : 25, fill: on ? WHITE : DIM, anchor: 'middle', ls: .8 });
      if (on) {                                     // optimizing for itself
        const lk = cl(pop(t, t0 + .25, .4), 0, 1.15);
        tile += G(ico2('loop', 0, 0, GOLD, 1.0), { x: TW / 2, y: 232, s: lk })
          + T(TW / 2, 276, 'FOR ITSELF', { size: 16, fill: MUTED, anchor: 'middle', ls: 1.4, op: cl(lk) });
      }
      if (t >= 91.5) tile += bigCheck(TW - 4, 4, t, 91.55 + i * .15, 22);   // everyone's piece works
      z += G(tile, { x, y: TY, s: k });
      if (i < 3) {                                  // the handoff between this part and the next
        const gx = x + TW + 20, gy = TY + TH / 2;
        z += `<path d="M${f(x + TW + 4)},${gy} H${f(x + 252 - 4)}" stroke="${LINE}" stroke-width="3" stroke-dasharray="8 8"/>`;
        if (t >= 93.2) {                            // the cost sits in the gap
          const g = cl(pop(t, 93.3 + i * .25, .4), 0, 1.15);
          z += G(`<circle r="26" fill="#3a2020" stroke="${RED}" stroke-width="3"/>` + ico2('coin', 0, 0, RED, 1.1), { x: gx, y: gy, s: g });
        }
      }
    });
    if (t >= 93.9) z += T(540, 1040, 'THE COST IS IN THE HANDOFFS', { size: 30, fill: RED, anchor: 'middle', ls: 2.5, op: fin(t, 94.0, .3) });
    o += G(z, { op: 1 - ph });
  }
  if (ph > 0) {                                     // stretched thin
    let z = '';
    const lv = lerp(.38, 1.16, eio(p(t, 95.0, 1.5)));
    [0, 1, 2].forEach(i => { z += G(`<circle r="54" fill="${TILE}" stroke="${WHITE}" stroke-width="4"/>` + ico('person', 0, 5, WHITE, 1.6), { x: 190 + i * 130, y: 640 }); });
    z += T(540, 735, 'THE PEOPLE DOING THE WORK', { size: 22, fill: MUTED, anchor: 'middle', ls: 2 });
    const x0 = 70, w = 940, cap = x0 + w * .78;
    z += T(x0, 820, 'WORKLOAD', { size: 24, fill: MUTED, ls: 1.6 });
    z += R(x0, 840, w, 70, 16, { fill: BG, stroke: LINE, sw: 2.5 });
    z += R(x0 + 7, 847, (w - 14) * Math.min(lv, .78), 56, 11, { fill: GOLD });
    if (lv > .78) z += R(cap, 847, (w - 14) * (Math.min(lv, 1) - .78) - 1, 56, 11, { fill: RED });
    z += `<path d="M${f(cap)},826 V925" stroke="${WHITE}" stroke-width="4" stroke-dasharray="8 7"/>` + T(cap, 960, 'CAPACITY', { size: 22, fill: WHITE, anchor: 'middle', ls: 1.6 });
    if (lv > 1) z += T(x0 + w, 820, 'OVER', { size: 26, fill: RED, anchor: 'end', ls: 1.8, op: fin(t, 96.3, .3) });
    if (t >= 96.25) z += T(540, 1090, 'STRETCHED THIN', { size: 40, fill: RED, anchor: 'middle', ls: 2.5, op: fin(t, 96.3, .3) });
    o += G(z, { op: ph });
  }
  return o;
}
// one block: the silos, then the breaking point
function fsSilosScale(t) {
  const k = p(t, 96.45, .35);
  return (k < 1 ? G(fsSilos(t), { op: 1 - k }) : '') + (k > 0 ? G(fsScale(t), { op: k }) : '');
}

// Intro video (third recording): the small info box shown above the speaker (1016 x 290, drawn in its own coordinates).
// Kicker at y 43, title at y 85, content in y 112-262.
//   bZeroN   27.5 - 38.5    zero to one vs one to N
//   bEarn   113.0 - 123.95  not more cars: hours, turnaround, cost per mile

const ARROW = '→';
const checkBadge = (x, y, t, t0) => G(`<circle r="17" fill="${GREEN}"/>` + ico('check', 0, 0, BG, 1, GREEN), { x, y, s: cl(pop(t, t0, .4), 0, 1.15) });

// 0 -> 1 and 1 -> N as two tiles
function twoProblems(t, tA, tB, subA, subB) {
  const a = t >= tA, b = t >= tB;
  let o = G(R(0, 0, 470, 150, 16, { fill: TILE, stroke: a ? GREEN : LINE, sw: a ? 3 : 2 })
    + T(26, 92, `0 ${ARROW} 1`, { size: 68, fill: a ? WHITE : DIM }) + T(28, 128, subA, { size: 20, fill: a ? GREEN : DIM, ls: 1.4 })
    + car(360, 66, 1.25, '#f2f2f2', a ? 1 : .35)
    + (a ? checkBadge(436, 32, t, tA) : ''), { x: 30, y: 112 });
  let cars = '';
  for (let n = 0; n < 15; n++) { const k = b ? pop(t, tB + .1 + n * .07, .35) : 0; cars += car(256 + (n % 5) * 44, 34 + Math.floor(n / 5) * 34, .46 * (b ? cl(k, 0, 1.1) : 1), b ? '#f2f2f2' : '#3d4a54', b ? cl(k) : .6); }
  o += G(R(0, 0, 470, 150, 16, { fill: b ? '#1b1f17' : TILE, stroke: b ? GOLD : LINE, sw: b ? 3.5 : 2 })
    + T(26, 92, `1 ${ARROW} N`, { size: 68, fill: b ? GOLD : DIM }) + T(28, 128, subB, { size: 20, fill: b ? GOLD : DIM, ls: 1.4 }) + cars, { x: 516, y: 112 });
  return o;
}
// words: That 27.70, zero to one 28.64, works 31.30, scale 34.22, one to N 36.14, different problem 37.26
function bZeroN(t) {
  return kicker(t, [[0, 'TWO DIFFERENT PROBLEMS']])
    + title(t, [[27.4, 'That was the {zero to one} problem'], [29.9, 'The technology {works} on public roads'], [33.0, 'The industry is moving to {scale}'], [35.4, 'But {1 to N} is a different problem']])
    + twoProblems(t, 28.6, 36.5, 'MAKE IT WORK', 'MAKE IT SCALE');
}

// unit economics: more cars 114.82, unit economics 115.84, hours 117.64, earning 118.80, fast 119.42, mile 122.46, cost 122.84
const EARN = [['HOURS', 'EARNING PER DAY', 'time', 117.64], ['TURNAROUND', 'BACK ON THE ROAD', 'loop', 119.42], ['COST', 'PER MILE TO RUN', 'coin', 122.46]];
function bEarn(t) {
  let o = kicker(t, [[0, 'UNIT ECONOMICS']]);
  o += title(t, [[112.9, 'Scaling is not about {more cars}'], [115.3, 'It is a {unit economics} problem'], [116.7, 'How many {hours} a day each car is earning'],
    [119.1, 'How {fast} it turns around'], [121.6, 'What every {mile} costs to run']]);
  const ph = p(t, 115.4, .25);                      // 0 = more cars, 1 = the three measures
  if (ph < 1) {
    let z = '';
    for (let n = 0; n < 18; n++) {
      const k = pop(t, 113.6 + n * .09, .35);
      if (k > 0) z += car(72 + (n % 9) * 60, 158 + Math.floor(n / 9) * 58, .7 * cl(k, 0, 1.08), '#f2f2f2', cl(k));
    }
    const st = eo(p(t, 114.82, .5));                 // "isn't about more cars"
    z += T(620, 204, 'MORE CARS', { size: 38, fill: mixHex(WHITE, DIM, st), ls: 1.5, op: fin(t, 113.8, .3) });
    if (st > 0) z += `<path d="M612,191 H${f(612 + 250 * st)}" stroke="${RED}" stroke-width="6" stroke-linecap="round"/>`;
    o += G(z, { op: 1 - ph });
  }
  if (ph > 0) {
    let z = '';
    EARN.forEach(([a, b, kind, t0], i) => {
      const on = t >= t0, cur = on && (i === 2 || t < EARN[i + 1][3]), col = cur ? GOLD : on ? GREEN : LINE;
      const icon = kind === 'time' ? ico(kind, 0, 0, on ? WHITE : DIM, 1.25, TILE) : ico2(kind, 0, 0, on ? WHITE : DIM, 1.25);
      z += G(R(0, 0, 310, 150, 16, { fill: cur ? '#1b1f17' : TILE, stroke: col, sw: cur ? 3.5 : 2 })
        + G(`<circle r="36" fill="${BG}" stroke="${col}" stroke-width="3"/>` + icon, { x: 58, y: 62, s: on ? 1 + .12 * (1 - p(t, t0, .3)) : 1 })
        + T(108, 73, a, { size: a.length > 6 ? 23 : 34, fill: on ? WHITE : DIM, ls: .6 })
        + T(22, 128, b, { size: 19, fill: on ? MUTED : DIM, ls: 1.2 }), { x: 30 + i * 323, y: 112 });
    });
    o += G(z, { op: ph });
  }
  return o;
}

// Intro video (third recording): what is on screen when.
// [start, end, scene, entry, exit]: blocks where the graphics take the whole frame.
// 'fade' = appears over the speaker, 'grow' = the info box grows to full screen / shrinks back into it.
// Edit points in the footage: 46.27, 54.90, 65.37, 79.67, 91.27, 97.10, 100.87, 112.77, 124.10 s.
// Every one of them falls inside a full-screen block.
const FULL = [
  [2.4, 15.95, fsStory, 'fade', 'grow'],
  [22.95, 25.6, fsCourse, 'fade', 'fade'],
  [41.3, 55.3, fsOps, 'fade', 'fade'],
  [65.2, 84.7, fsFound, 'fade', 'grow'],
  [88.75, 101.3, fsSilosScale, 'fade', 'grow'],
  [107.9, 113.2, fsGoal, 'fade', 'grow'],
  [123.75, 129.6, fsPay, 'grow', 'grow'],
];
// box scenes (top panel) while the speaker is on camera
const BOX = [[27.5, 38.5, bZeroN], [113.0, 123.95, bEarn]];
// when the box panel itself is up
const BOX_WINDOWS = [[27.5, 38.5], [113.0, 123.95]];

// ---- Added for the article. Not in the video's overlay source. ----
// The clip path for the media card, which the overlay kept in DEFS (see note 1 at the top of this file).
const MEDIA_DEFS = `<defs><clipPath id="mediaClip"><rect x="${MC.x}" y="${MC.y}" width="${MC.w}" height="${MC.h}" rx="18"/></clipPath></defs>`;
FULL.forEach(entry => {
  const scene = entry[2];
  if (scene === fsStory || scene === fsCourse || scene === fsOps) entry[2] = t => MEDIA_DEFS + scene(t);
});
