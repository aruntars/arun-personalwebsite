/* Plays the video's graphics inside the article.

   A figure such as <figure class="scene" data-scene="box:1"> names one scene from the episode's scenes.js:
   "box" scenes are the info box at the top of the video, "full" scenes are its full-screen cutaways. Every scene
   is a function of time that returns SVG, so this player only steps time. A scene runs while its figure is on
   screen, holds on the finished picture, then starts again. Each one has a pause button. For visitors who ask
   their device for less motion, scenes show the finished picture and play once, only when asked. */
(function () {
  var S = window.SERIES_SCENES;
  if (!S) return;
  var NS = 'http://www.w3.org/2000/svg';
  var still = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var ICON = {
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.6" height="12" rx="1"/><rect x="9.4" y="2" width="3.6" height="12" rx="1"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.2v11.6a.6.6 0 0 0 .9.5l9.2-5.8a.6.6 0 0 0 0-1L4.9 1.7a.6.6 0 0 0-.9.5z"/></svg>'
  };
  var players = [], running = false, last = 0;

  function draw(P, t) {
    var v = P.view, a = Math.max(0, Math.min(1, (t - P.from) / 0.3));
    a = 1 - Math.pow(1 - a, 3);
    P.svg.innerHTML = '<rect x="' + v[0] + '" y="' + v[1] + '" width="' + v[2] + '" height="' + v[3] + '" fill="' + S.BG + '"/>' +
      '<g opacity="' + a.toFixed(2) + '">' + P.fn(t) + '</g>';
    P.bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, (t - P.from) / (P.end - P.from))).toFixed(3) + ')';
  }
  function label(P) {
    P.btn.innerHTML = P.paused ? ICON.play : ICON.pause;
    P.btn.setAttribute('aria-label', P.paused ? 'Play the animation' : 'Pause the animation');
  }
  function step(now) {
    var dt = (now - last) / 1000, any = false;
    if (dt < 0.03) { requestAnimationFrame(step); return; }
    last = now;
    dt = Math.min(dt, 0.1);
    players.forEach(function (P) {
      if (!P.seen || P.paused) return;
      any = true;
      var span = P.end - P.from;
      if (P.u >= span) {
        if (P.once) { P.paused = true; label(P); return; }
        P.hold += dt;
        if (P.hold < 1.8) return;
        P.u = 0; P.hold = 0;
      }
      P.u = Math.min(span, P.u + dt * P.speed);
      draw(P, P.from + P.u);
    });
    if (any) requestAnimationFrame(step); else running = false;
  }
  function kick() {
    if (running) return;
    running = true; last = performance.now();
    requestAnimationFrame(step);
  }
  function make(fig) {
    var ref = (fig.getAttribute('data-scene') || '').split(':');
    var entry = (ref[0] === 'full' ? S.FULL : S.BOX)[+ref[1]];
    if (!entry) return;
    var view = fig.getAttribute('data-view') || (ref[0] === 'full' ? '0 0 1080 1920' : '0 0 1016 290');
    var from = +(fig.getAttribute('data-from') || entry[0]), to = +(fig.getAttribute('data-to') || entry[1]);
    var screen = document.createElement('div'), svg = document.createElementNS(NS, 'svg');
    var bar = document.createElement('i'), foot = document.createElement('div'), btn = document.createElement('button');
    var cap = fig.querySelector('figcaption');
    screen.className = 'screen'; bar.className = 'scene-bar'; foot.className = 'scene-foot';
    btn.type = 'button'; btn.className = 'scene-btn';
    svg.setAttribute('viewBox', view); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', fig.getAttribute('data-label') || (cap ? cap.textContent : 'Animation from the video'));
    screen.appendChild(svg); screen.appendChild(bar);
    fig.insertBefore(screen, fig.firstChild);
    foot.appendChild(btn);
    if (cap) foot.appendChild(cap);
    fig.appendChild(foot);
    var P = { svg: svg, bar: bar, btn: btn, fn: entry[2], from: from, to: to, end: to - 0.3, u: 0, hold: 0, seen: false,
              paused: still.matches, once: still.matches, speed: +(fig.getAttribute('data-speed') || 1.15),
              view: view.split(/\s+/).map(Number) };
    btn.addEventListener('click', function () {
      P.paused = !P.paused;
      if (!P.paused && P.u >= P.end - P.from) { P.u = 0; P.hold = 0; }
      label(P);
      if (!P.paused) kick();
    });
    label(P);
    draw(P, P.end);                 /* the finished picture, until the figure scrolls into view */
    P.u = still.matches ? P.end - P.from : 0;
    fig.classList.add('is-live');
    players.push(P);
    return P;
  }

  var figs = document.querySelectorAll('figure.scene'), map = [];
  Array.prototype.forEach.call(figs, function (fig) { var P = make(fig); if (P) map.push([fig, P]); });
  if (!map.length) return;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        for (var i = 0; i < map.length; i++) if (map[i][0] === e.target) {
          map[i][1].seen = e.isIntersecting;
          if (e.isIntersecting) kick();
        }
      });
    }, { threshold: 0.35 });
    map.forEach(function (m) { io.observe(m[0]); });
  } else {
    map.forEach(function (m) { m[1].seen = true; });
    kick();
  }
})();
