/* MUNDOFUT10 — roteador, página inicial (campo com os 11 jogos) e moldura comum dos jogos */
(function () {
  'use strict';
  const MF = (window.MF = window.MF || {});
  const h = MF.h, t = (k) => MF.t(k);

  MF.games = [];
  MF.registerGame = (g) => { MF.games[g.num - 1] = g; };

  // posições no campo (numeração brasileira): x%, y% (ataque para cima)
  const SPOT = {
    1: [50, 90], 2: [85, 64], 3: [63, 72], 4: [37, 72], 6: [15, 64],
    5: [50, 52], 8: [76, 40], 10: [24, 40], 7: [83, 15], 9: [50, 10], 11: [17, 15],
  };

  const app = () => document.getElementById('app');

  // ------------------------------------------------------------------ cabeçalho
  const brasiliaTime = () => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
  // período do dia em Brasília (pela elevação real do sol quando o 3D existe)
  function isDay(d) {
    d = d || new Date();
    if (MF.Stadium && MF.Stadium.sun) return MF.Stadium.sun(d).elev > -4;
    const hh = +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(d);
    return hh >= 6 && hh < 18;
  }
  const SUN = '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="4.6" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z" fill="currentColor"/></svg>';
  function paintSky(el) {
    const d = isDay(); el.innerHTML = d ? SUN : MOON; el.dataset.p = d ? 'day' : 'night';
    if (!el.hasAttribute('data-notitle')) el.title = d ? t('dayNow') : t('nightNow');
  }
  function credit() { return h('p', { class: 'credit' }, t('creditBy') + ' ', h('strong', { translate: 'no' }, 'SucodeFrutas')); }

  // ------------------------------------------------------------------ placar do estádio (relógio de Brasília)
  // Painel de LED como os de estádio: no lugar do placar do jogo, horas × minutos; os segundos são o cronômetro
  // da partida, "1º tempo" de manhã e "2º tempo" de tarde/noite. A cada minuto os números piscam como gol
  // marcado; na virada da hora o painel comemora com GOOOL. O estádio 3D tem um telão igual (stadium.js).
  const BRT = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  MF.clockParts = (d) => {
    const p = {};
    for (const x of BRT.formatToParts(d || new Date())) p[x.type] = x.value;
    const hh = p.hour === '24' ? '00' : p.hour;
    const half = +hh < 12 ? 1 : 2;
    return { h: hh, m: p.minute, s: p.second, half, extra: +hh === 23 && +p.minute >= 45 };
  };
  MF.halfLabel = (c) => t(c.half === 1 ? 'half1' : 'half2') + (c.extra ? '+' : '');
  function scoreboard() {
    const c = MF.clockParts();
    const dig = (k, v, cls) => h('span', { class: 'sb-d' + (cls ? ' ' + cls : ''), 'data-d': k },
      h('span', { class: 'sb-off' }, '8'), h('span', { class: 'sb-on' }, v));
    const sky = h('span', { class: 'sb-sky', 'data-sky': '', 'data-notitle': '' });
    paintSky(sky);
    const bulbs = h('span', { class: 'sb-bulbs' }, Array.from({ length: 16 }, (_, i) => h('i', { style: { '--b': i } })));
    const board = h('div', { class: 'sb', 'data-board': '' },
      h('span', { class: 'sr-only', 'data-sb-sr': '' }, t('brasiliaTime') + ' ' + c.h + ':' + c.m),
      h('div', { class: 'sb-frame', 'aria-hidden': 'true' }, bulbs,
        h('div', { class: 'sb-screen' },
          h('div', { class: 'sb-top' },
            h('span', { class: 'sb-period', 'data-sb-half': '' }, MF.halfLabel(c)),
            h('span', { class: 'sb-sec' }, dig('s0', c.s[0], 'sm'), dig('s1', c.s[1], 'sm')),
            sky),
          h('div', { class: 'sb-main' },
            h('span', { class: 'sb-team' }, h('i', { class: 'sb-kit' }), 'MUN'),
            h('span', { class: 'sb-score', 'data-g': 'h' }, dig('h0', c.h[0]), dig('h1', c.h[1])),
            h('span', { class: 'sb-colon' }, ':'),
            h('span', { class: 'sb-score', 'data-g': 'm' }, dig('m0', c.m[0]), dig('m1', c.m[1])),
            h('span', { class: 'sb-team away' }, 'FUT', h('i', { class: 'sb-kit g' }))),
          h('div', { class: 'sb-goal' }, h('span', null, '')),
          h('div', { class: 'sb-bar', style: { '--p': ((+c.s + 1) / 60).toFixed(4) } }))));
    board._v = c;
    return board;
  }
  // varredura de LED: o número novo acende de cima para baixo, linha a linha
  const LED_WIPE = [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }];
  const LED_BLINK = [
    { opacity: 1, offset: 0 }, { opacity: 1, offset: 0.16 }, { opacity: 0.12, offset: 0.18 }, { opacity: 0.12, offset: 0.34 },
    { opacity: 1, offset: 0.36 }, { opacity: 1, offset: 0.52 }, { opacity: 0.12, offset: 0.54 }, { opacity: 0.12, offset: 0.7 },
    { opacity: 1, offset: 0.72 }, { opacity: 1, offset: 1 }];
  function goalBoard(b, c) {
    if (MF.reduced() || b.classList.contains('is-goal')) return;
    b.querySelector('.sb-goal span').textContent = t('goal') + '  ' + c.h + ':00';
    b.classList.add('is-goal');
    clearTimeout(b._goalT);
    b._goalT = setTimeout(() => b.classList.remove('is-goal'), 5400);
  }
  function updateBoards() {
    const boards = document.querySelectorAll('[data-board]');
    if (!boards.length) return;
    const c = MF.clockParts(), anim = !MF.reduced();
    boards.forEach((b) => {
      const prev = b._v || {};
      const val = { h0: c.h[0], h1: c.h[1], m0: c.m[0], m1: c.m[1], s0: c.s[0], s1: c.s[1] };
      b.querySelectorAll('[data-d]').forEach((el) => {
        const on = el.lastChild, v = val[el.dataset.d];
        if (on.textContent === v) return;
        on.textContent = v;
        if (anim) on.animate(LED_WIPE, { duration: 220, easing: 'steps(6, end)' });
      });
      b.querySelector('.sb-bar').style.setProperty('--p', ((+c.s + 1) / 60).toFixed(4));
      const half = b.querySelector('[data-sb-half]'), hl = MF.halfLabel(c);
      if (half.textContent !== hl) half.textContent = hl;
      if (prev.m != null && prev.m !== c.m) {
        b.querySelector('[data-sb-sr]').textContent = t('brasiliaTime') + ' ' + c.h + ':' + c.m;
        if (prev.h !== c.h) goalBoard(b, c);
        else if (anim) b.querySelectorAll('.sb-score').forEach((g) => g.animate(LED_BLINK, { duration: 1100, easing: 'linear' }));
      }
      b._v = c;
    });
  }
  function tick() {
    document.querySelectorAll('[data-clock]').forEach((el) => (el.textContent = brasiliaTime()));
    updateBoards();
    if (new Date().getSeconds() === 0) document.querySelectorAll('[data-sky]').forEach(paintSky);
    const ms = MF.nextReset() - Date.now();
    document.querySelectorAll('[data-reset]').forEach((el) => (el.textContent = MF.fmtCountdown(ms)));
    if (ms <= 0 || MF.today() !== MF._bootDay) location.reload();
  }
  // o dia virou com o app em segundo plano (celular): recarrega ao voltar, para trazer os desafios novos
  if (MF._bootDay == null) {
    MF._bootDay = MF.today();
    const fresh = () => { if (MF.today() !== MF._bootDay) location.reload(); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) fresh(); });
    addEventListener('pageshow', (e) => { if (e.persisted) fresh(); });
    addEventListener('focus', fresh);
  }
  // cabeçalho ganha fundo sólido ao rolar (no celular a lista passa por baixo dele)
  if (!MF._scrollHook) { MF._scrollHook = true; addEventListener('scroll', () => { const t = document.querySelector('.top'); if (t) t.classList.toggle('scrolled', scrollY > 24); }, { passive: true }); }
  clearInterval(MF._cdIv);
  MF._cdIv = setInterval(tick, 1000);
  function header(opts) {
    const noClock = opts && opts.noClock;
    const sel = h('div', { class: 'lang-switch', role: 'group', 'aria-label': t('language') },
      MF.LANGS.map(([v, l]) => h('button', {
        type: 'button', class: v === MF.lang ? 'on' : '', 'aria-pressed': v === MF.lang ? 'true' : 'false', lang: v,
        onclick: () => { if (v === MF.lang) return; MF.setLang(v); route(); },
      }, l)));
    const skip = h('a', { class: 'skip-link', href: '#', onclick: (e) => { e.preventDefault(); const f = document.querySelector('.sheet a, .sheet-row a, .sheet-panel a, .game-board input, .game-board button'); if (f) f.focus(); } }, t('skipToGames'));
    return h('header', { class: 'top' }, skip,
      h('a', { class: 'logo', href: '#', 'aria-label': 'MUNDOFUT10', translate: 'no' }, h('span', { class: 'logo-word' }, 'MUNDOFUT'), h('span', { class: 'logo-num' }, '10')),
      h('div', { class: 'top-right' },
        noClock ? null : h('span', { class: 'cd' }, h('span', { class: 'sr-only' }, t('brasiliaTime')), h('time', { class: 'cd-time', 'data-clock': '' }, brasiliaTime())),
        sel,
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('stats'), title: t('stats'), onclick: () => showAllStats() }, statsIcon())));
  }
  function statsIcon() {
    const s = h('span', { 'aria-hidden': 'true', class: 'ico' });
    s.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 20V11M10 20V5M16 20V14M22 20H2" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
    return s;
  }
  // camisa com "tecido": o filtro de turbulência deforma a malha quando o mouse está em cima
  let clothId = 0;
  function jerseySVG(num, state) {
    const id = 'cloth' + ++clothId;
    const s = h('span', { class: 'jersey-svg', 'aria-hidden': 'true' });
    const badge = state === 'won'
      ? '<circle class="tick-bg" cx="54" cy="52" r="8"/><path class="tick" d="M50 52 l3 3 l6 -6"/>'
      : state === 'lost' ? '<circle class="x-bg" cx="54" cy="52" r="8"/><path class="x" d="M50.5 48.5 l7 7 M57.5 48.5 l-7 7"/>' : '';
    s.innerHTML = `<svg viewBox="-4 -4 72 68"><defs><filter id="${id}" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.03 0.07" numOctaves="2" seed="${num * 7}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter><linearGradient id="${id}g" x1="0" x2="1" y1="0" y2="0.3"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".35" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#000" stop-opacity=".12"/><stop offset=".8" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs><g class="cloth" filter="url(#${id})"><path class="shirt" d="M20 3 L8 8 L1 22 L11 27 L13 23 V57 H51 V23 L53 27 L63 22 L56 8 L44 3 C42 9 37 12 32 12 C27 12 22 9 20 3 Z"/><path class="folds" fill="url(#${id}g)" d="M20 3 L8 8 L1 22 L11 27 L13 23 V57 H51 V23 L53 27 L63 22 L56 8 L44 3 C42 9 37 12 32 12 C27 12 22 9 20 3 Z"/><text x="32" y="45" text-anchor="middle">${num}</text></g>${badge}</svg>`;
    return s;
  }
  // animação de tecido ao passar o mouse (para quando o mouse sai)
  function attachCloth(link) {
    const svg = link.querySelector('svg');
    const turb = svg.querySelector('feTurbulence'), disp = svg.querySelector('feDisplacementMap');
    const folds = svg.querySelector('.folds'), cloth = svg.querySelector('.cloth');
    let raf = null, amp = 0, target = 0, t0 = performance.now();
    const loop = (now) => {
      amp += (target - amp) * 0.12;
      const tt = (now - t0) / 1000;
      turb.setAttribute('baseFrequency', (0.028 + 0.008 * Math.sin(tt * 2.1)).toFixed(4) + ' ' + (0.06 + 0.02 * Math.cos(tt * 1.6)).toFixed(4));
      disp.setAttribute('scale', (amp * (4.5 + 1.5 * Math.sin(tt * 5.3))).toFixed(2));
      cloth.style.transform = `rotate(${(amp * 3.2 * Math.sin(tt * 4.1)).toFixed(2)}deg) skewX(${(amp * 2.5 * Math.sin(tt * 3.3 + 1)).toFixed(2)}deg) scaleY(${(1 - amp * 0.03 * (1 + Math.sin(tt * 6))).toFixed(3)})`;
      folds.style.transform = `translateX(${(amp * 4 * Math.sin(tt * 3.7)).toFixed(2)}px)`;
      if (target === 0 && amp < 0.01) {
        disp.setAttribute('scale', '0'); cloth.style.transform = ''; folds.style.transform = ''; raf = null; return;
      }
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (MF.reduced()) return; target = 1; if (!raf) { t0 = performance.now(); raf = requestAnimationFrame(loop); } };
    const stop = () => { target = 0; };
    link.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') start(); });
    link.addEventListener('pointerleave', stop);
    link.addEventListener('focus', start);
    link.addEventListener('blur', stop);
  }

  // ------------------------------------------------------------------ página inicial
  function gameStatus(g) { return MF.dayStatus(g.slug); } // new | playing | won | lost
  const statusText = (s) => t(s === 'won' ? 'statusWon' : s === 'lost' ? 'statusLost' : s === 'playing' ? 'playing' : 'play');
  // bolinhas de dificuldade do card: uma por nível, com o resultado do dia (22/10/2026)
  // MF._dotSeen guarda o último estado mostrado; a bolinha que mudou desde a última vez entra com animação
  function levelDots(g) {
    const st = MF.dayStates(g.slug);
    const seen = MF._dotSeen || (MF._dotSeen = {});
    const day = MF.today();
    const label = MF.LEVELS.map((l) => MF.levelName(l) + ': ' + MF.levelStateText(st[l] && st[l].status)).join(' · ');
    const wrap = h('span', { class: 'lv-dots', role: 'img', 'aria-label': t('lvDots') + ' — ' + label, title: label });
    MF.LEVELS.forEach((l, i) => {
      const status = (st[l] && st[l].status) || 'new';
      const key = day + ':' + g.slug + ':' + l;
      const fresh = key in seen && seen[key] !== status && status !== 'new';
      seen[key] = status;
      const dot = MF.levelDot(l, status, fresh ? 'is-fresh' : '');
      if (fresh) dot.style.setProperty('--k', i);
      wrap.appendChild(dot);
    });
    return wrap;
  }
  function levelLegend() {
    return h('div', { class: 'lvl-key', 'aria-hidden': 'true' },
      h('span', { class: 'lvl-key-g' }, MF.LEVELS.map((l) => h('span', { class: 'lvl-key-i' }, MF.levelDot(l, 'solid'), MF.levelName(l)))),
      h('span', { class: 'lvl-key-g lvl-key-st' },
        h('span', { class: 'lvl-key-i' }, MF.levelDot('key', 'won'), t('lvWon')),
        h('span', { class: 'lvl-key-i' }, MF.levelDot('key', 'lost'), t('lvLost')),
        h('span', { class: 'lvl-key-i' }, MF.levelDot('key', 'new'), t('lvNew'))));
  }
  function home() {
    if (MF.Stadium && MF.Stadium.init && MF.Stadium.init()) return home3d();
    return home2d();
  }
  function home2d() {
    document.body.classList.remove('is-home3d');
    const root = MF.clear(app());
    root.appendChild(header({ noClock: true }));
    const done = MF.games.filter((g) => ['won', 'lost'].includes(gameStatus(g))).length;
    const d = MF.dayDate();
    const dateStr = d.toLocaleDateString(MF.lang === 'pt' ? 'pt-BR' : MF.lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });

    const pitch = h('div', { class: 'pitch', role: 'list', 'aria-label': t('lineup') });
    pitch.innerHTML = '<svg class="pitch-lines" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><rect x="3" y="3" width="94" height="134" rx="1"/><line x1="3" y1="70" x2="97" y2="70"/><circle cx="50" cy="70" r="11"/><rect x="24" y="3" width="52" height="20"/><rect x="37" y="3" width="26" height="8"/><rect x="24" y="117" width="52" height="20"/><rect x="37" y="129" width="26" height="8"/><path d="M41 23 A11 11 0 0 0 59 23"/><path d="M41 117 A11 11 0 0 1 59 117"/></svg>';
    MF.games.forEach((g, idx) => {
      const [x, y] = SPOT[g.num];
      const status = gameStatus(g);
      const [name] = MF.gameInfo(g.num - 1);
      const link = h('a', {
        class: 'jersey st-' + status, href: '#' + g.slug, role: 'listitem', style: { left: x + '%', top: y + '%', '--d': idx * 55 + 'ms' },
        'aria-label': g.num + ' · ' + name + ' · ' + statusText(status),
      }, jerseySVG(g.num, status), h('span', { class: 'jersey-name' }, name));
      pitch.appendChild(link);
      attachCloth(link);
    });

    const sheet = h('ol', { class: 'sheet' });
    MF.games.forEach((g) => {
      const status = gameStatus(g);
      const [name, desc] = MF.gameInfo(g.num - 1);
      const s = MF.stats(g.slug);
      sheet.appendChild(h('li', null, h('a', { class: 'sheet-row st-' + status, href: '#' + g.slug },
        h('span', { class: 'sheet-num' }, g.num),
        h('span', { class: 'sheet-txt' },
          h('span', { class: 'sheet-name' }, name),
          h('span', { class: 'sheet-desc' }, desc),
          MF.ruleTag(g)),
        h('span', { class: 'sheet-act' }, h('span', { class: 'chip chip-' + status }, statusText(status)), levelDots(g)),
        s.streak > 1 ? h('span', { class: 'streak', title: t('streak') }, '🔥' + s.streak) : null)));
    });

    root.appendChild(h('main', { class: 'home' },
      h('section', { class: 'home-intro' },
        h('h1', null, t('lineup')), credit(),
        h('p', { class: 'meta' }, h('span', null, t('challenge') + ' ' + MF.challengeNo()), h('span', { class: 'meta-sep', 'aria-hidden': 'true' }), h('span', null, dateStr)),
        h('p', { class: 'lede' }, t('tagline')),
        h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 11, 'aria-valuenow': done, 'aria-label': t('doneToday') },
          h('span', { class: 'progress-bar', style: { width: (done / 11) * 100 + '%' } }),
          h('span', { class: 'progress-txt' }, done + '/11 ' + t('doneToday'))),
scoreboard(),
        done === 11 ? h('p', { class: 'all-done' }, t('allDone')) : null),
      h('div', { class: 'home-grid' }, h('div', { class: 'pitch-wrap' }, pitch), h('div', { class: 'sheet-col' }, levelLegend(), sheet))));
    root.appendChild(footer());
    document.title = 'MUNDOFUT10';
    if (!MF._played && !MF._introRunning) { pitch.classList.add('enter'); MF._played = true; }
  }

  // ------------------------------------------------------------------ página inicial 3D (estádio vivo)
  function sheetList() {
    const sheet = h('ol', { class: 'sheet' });
    MF.games.forEach((g) => {
      const status = gameStatus(g);
      const [name, desc] = MF.gameInfo(g.num - 1);
      const s = MF.stats(g.slug);
      sheet.appendChild(h('li', { style: { '--i': g.num } }, h('a', { class: 'sheet-row st-' + status, href: '#' + g.slug },
        h('span', { class: 'sheet-num' }, g.num),
        h('span', { class: 'sheet-txt' },
          h('span', { class: 'sheet-name' }, name),
          h('span', { class: 'sheet-desc' }, desc),
          MF.ruleTag(g)),
        h('span', { class: 'sheet-act' }, h('span', { class: 'chip chip-' + status }, statusText(status)), levelDots(g)),
        s.streak > 1 ? h('span', { class: 'streak', title: t('streak') }, '🔥' + s.streak) : null)));
    });
    return sheet;
  }
  function home3d() {
    const S = MF.Stadium;
    const root = MF.clear(app());
    document.body.classList.add('is-home3d');
    root.appendChild(header({ noClock: true }));
    const done = MF.games.filter((g) => ['won', 'lost'].includes(gameStatus(g))).length;
    const dateStr = MF.dayDate().toLocaleDateString(MF.lang === 'pt' ? 'pt-BR' : MF.lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
    const layer = h('div', { class: 'jersey-layer', role: 'list', 'aria-label': t('lineup') });
    const items = MF.games.map((g) => {
      const status = gameStatus(g);
      const [name] = MF.gameInfo(g.num - 1);
      const el = h('a', { class: 'j3d st-' + status, href: '#' + g.slug, role: 'listitem', 'aria-label': g.num + ' · ' + name + ' · ' + statusText(status) },
        h('span', { class: 'j3d-hit', 'aria-hidden': 'true' }), h('span', { class: 'j3d-name' }, name));
      layer.appendChild(el);
      return { num: g.num, status, el };
    });
    const ui = h('div', { class: 'stage-ui' },
      h('h1', null, t('lineup')), credit(),
      h('p', { class: 'meta' }, h('span', null, t('challenge') + ' ' + MF.challengeNo()), h('span', { class: 'meta-sep', 'aria-hidden': 'true' }), h('span', null, dateStr)),
      h('p', { class: 'lede' }, t('tagline')),
      h('div', { class: 'ui-row' },
        h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 11, 'aria-valuenow': done, 'aria-label': t('doneToday') },
          h('span', { class: 'progress-bar', style: { width: (done / 11) * 100 + '%' } }),
          h('span', { class: 'progress-txt' }, done + '/11 ' + t('doneToday'))),
scoreboard()),
      done === 11 ? h('p', { class: 'all-done' }, t('allDone')) : null);
    const fog = h('div', { class: 'cloud-fog', 'aria-hidden': 'true' });
    const skip = h('button', { class: 'cam-skip', type: 'button', hidden: true, onclick: () => S.skipIntro() }, t('skipIntro'));
    const stage = h('section', { class: 'stage3d' }, fog, layer, ui, skip);
    const panel = h('aside', { class: 'sheet-panel', 'aria-label': t('lineup') }, h('h2', { class: 'panel-title' }, t('todayGames')), levelLegend(), sheetList());
    const main = h('main', { class: 'home3d' }, stage, panel);
    root.appendChild(main);
    root.appendChild(footer());
    document.title = 'MUNDOFUT10';
    S.fogEl = fog;
    const wide = () => innerWidth >= 900;
    const setCols = () => stage.classList.toggle('cols', innerWidth >= 1200);
    setCols(); addEventListener('resize', setCols);
    // o telão 3D pendurado no estádio é o relógio em TODAS as telas (celular e computador, desde 18/10/2026):
    // fica sempre no lugar dele, fazendo parte do estádio, e a câmera o enquadra junto com o campo.
    // O placar da interface vira só texto para leitores de tela.
    const boardMode = () => {
      S.boardFit = true;
      stage.classList.add('board3d');
      S.setBoard(true);
    };
    const fitRect = () => {
      boardMode();
      const sr = stage.getBoundingClientRect(), ur = ui.getBoundingClientRect();
      const W = sr.width, H = sr.height;
      const y1 = 1 - 2 * ((ur.bottom - sr.top + 14) / H);
      if (wide()) {
        const pr = panel.getBoundingClientRect();
        const x1 = ((pr.left - sr.left - 26) / W) * 2 - 1;
        if (stage.classList.contains('cols')) S.fitRect = { x0: -0.97, x1, y0: -0.97, y1: 1 - 2 * (62 / H) };
        else S.fitRect = { x0: -0.97, x1, y0: -0.95, y1 };
      } else {
        S.fitRect = { x0: -0.98, x1: 0.98, y0: -0.97, y1 };
      }
    };
    S.setJerseys(items, layer);
    S.mount(stage, fitRect);
    const firstTime = !MF._introPlayed && !MF.reduced();
    if (firstTime) {
      MF._introPlayed = true;
      main.classList.add('intro-on');
      document.body.classList.add('intro-on');
      skip.hidden = false;
      setTimeout(() => skip.focus({ preventScroll: true }), 60);
      S.playIntro(() => {
        S.setBoard(true);
        document.body.classList.remove('intro-on');
        main.classList.remove('intro-on');
        main.classList.add('ui-in');
      }, () => { skip.hidden = true; });
      const onKey = (e) => { if (e.key === 'Escape') { S.skipIntro(); removeEventListener('keydown', onKey); } };
      addEventListener('keydown', onKey);
    } else {
      S.showHome();
      main.classList.add('ui-in', 'no-anim');
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => S.refreshTextures && S.refreshTextures());
  }
  function footer() { return h('footer', { class: 'foot' }, h('p', null, t('footer'))); }

  function showAllStats() {
    const rows = MF.games.map((g) => {
      const s = MF.stats(g.slug);
      return h('tr', null, h('td', null, h('span', { class: 'sheet-num sm' }, g.num)), h('td', null, MF.gameInfo(g.num - 1)[0]), h('td', null, s.played), h('td', null, s.wins), h('td', null, s.streak), h('td', null, s.best));
    });
    MF.modal(t('stats'), h('div', { class: 'table-wrap' }, h('table', { class: 'stats-table' },
      h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, ''), h('th', null, t('played')), h('th', null, t('wins')), h('th', null, t('streak')), h('th', null, t('best')))),
      h('tbody', null, rows))));
  }

  // ------------------------------------------------------------------ moldura dos jogos
  function openGame(g) {
    document.body.classList.remove('is-home3d', 'intro-on');
    if (MF.Stadium && MF.Stadium.ok) MF.Stadium.unmount();
    const root = MF.clear(app());
    root.appendChild(header());
    const [name, desc] = MF.gameInfo(g.num - 1);
    document.title = name + ' · MUNDOFUT10';
    const stage = h('div', { class: 'stage' });
    const statsBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('stats'), onclick: () => gameStats(g) }, statsIcon());
    root.appendChild(h('main', { class: 'game g-' + g.slug },
      h('div', { class: 'game-head' },
        h('a', { class: 'back', href: '#' }, h('span', { 'aria-hidden': 'true' }, '‹'), t('back')),
        h('div', { class: 'game-title' }, jerseySVG(g.num, 'new'), h('div', null, h('h1', null, name), h('p', null, desc))),
        statsBtn),
      stage));
    root.appendChild(footer());

    // partida em andamento (em qualquer dificuldade) continua de onde parou
    const playing = Object.values(MF.dayStates(g.slug)).find((s) => s.status === 'playing');
    if (playing) return runGame(g, stage, playing);
    intro(g, stage);
  }
  MF.openIntro = (g, stage) => intro(g, stage);

  // tela inicial do jogo: regras, dificuldade (cada uma uma vez por dia) e tempo (livre para repetir)
  function intro(g, stage) {
    MF.clear(stage);
    window.scrollTo(0, 0);
    const opts = {};
    const done = MF.dayStates(g.slug);
    const free = MF.LEVELS.filter((l) => !done[l]);
    const controls = (g.options || []).map((o) => {
      let def = o.def;
      let choices = o.choices();
      if (o.key === 'mode') {
        choices = choices.map((c) => done[c.v] ? Object.assign({}, c, { disabled: true, mark: done[c.v].status === 'won' ? 'won' : 'lost' }) : c);
        if (done[def]) def = free.includes('normal') ? 'normal' : free[0] || def;
      }
      opts[o.key] = def;
      return MF.segmented(o.label(), choices, def, (v) => (opts[o.key] = v));
    });
    const rules = (g.rules[MF.lang] || g.rules.pt);
    const playedList = Object.entries(done).filter(([, s]) => s.status !== 'playing');
    const allDone = !free.length;
    stage.appendChild(h('section', { class: 'intro' },
      g.preview ? h('div', { class: 'intro-art', 'aria-hidden': 'true' }, g.preview()) : null,
      h('div', { class: 'intro-body' },
        h('h2', null, t('howTo')),
        MF.ruleTag(g),
        h('ul', { class: 'rules' }, rules.map((r) => h('li', null, r))),
        playedList.length ? h('div', { class: 'played-today' },
          h('span', { class: 'seg-label' }, t('playedToday')),
          h('div', { class: 'played-chips' }, playedList.map(([l, s]) => h('button', {
            type: 'button', class: 'chip chip-' + s.status, onclick: () => runGame(g, stage, s), title: t('seeResult'),
            'aria-label': MF.levelName(l) + ' · ' + MF.levelStateText(s.status),
          }, MF.levelDot(l, s.status), MF.levelName(l))))) : null,
        allDone ? h('p', { class: 'all-levels' }, t('allLevelsDone')) : h('div', { class: 'controls' }, controls),
        allDone ? null : h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => {
          if (MF.dayState(g.slug, opts.mode || 'normal')) return MF.toast(t('levelDone'));
          const state = { status: 'playing', opts: Object.assign({ mode: 'normal' }, opts), started: Date.now() };
          const tsec = +opts.timer || 0;
          if (tsec) state.deadline = Date.now() + tsec * 1000;
          MF.saveDayState(g.slug, state);
          runGame(g, stage, state);
        } }, t('start')))));
  }

  function runGame(g, stage, state) {
    MF.clear(stage);
    let timerObj = null;
    const ctx = {
      game: g,
      state,
      opts: state.opts,
      rnd: (x) => MF.dayRng(g.slug + ':' + JSON.stringify(state.opts.mode || ''), x),
      save: () => MF.saveDayState(g.slug, state),
      finished: () => state.status !== 'playing',
      timerEl: null,
      // encerra a partida: vitória/derrota + pontuação + linha de compartilhamento
      finish: (win, score, shareLine, detail) => {
        if (state.status !== 'playing') return;
        state.status = win ? 'won' : 'lost';
        state.score = score;
        state.share = shareLine;
        state.detail = detail || null;
        ctx.save();
        timerObj && timerObj.stop();
        MF.recordResult(g.slug, win, score);
        if (win) MF.confetti();
        showResult();
      },
    };
    // cronômetro com prazo salvo (sobrevive a recarregar a página)
    if (state.deadline && state.status === 'playing') {
      const left = Math.round((state.deadline - Date.now()) / 1000);
      if (left <= 0) {
        state.timeUp = true;
      } else {
        timerObj = MF.timer(left, () => { state.timeUp = true; ctx.onTimeUp ? ctx.onTimeUp() : ctx.finish(false, 0, '⏱'); });
        ctx.timerEl = timerObj.el;
      }
    } else if (state.status === 'playing') {
      ctx.timerEl = MF.timer(0).el;
    }
    const resultBox = h('div', { class: 'result-slot' });
    function showResult() {
      MF.clear(resultBox);
      const [name] = MF.gameInfo(g.num - 1);
      const win = state.status === 'won';
      const lv = state.opts && state.opts.mode;
      const share = 'MUNDOFUT10 #' + MF.challengeNo() + ' · ' + name + (MF.LEVELS.includes(lv) ? ' · ' + t(lv === 'legend' ? 'legendary' : lv) : '') + '\n' + (state.share || '');
      const s = MF.stats(g.slug);
      resultBox.appendChild(h('section', { class: 'result ' + (win ? 'win' : 'lose'), 'aria-live': 'polite' },
        h('div', { class: 'result-head' },
          h('span', { class: 'result-card', 'aria-hidden': 'true' }),
          h('div', null, h('h2', null, win ? t('youWon') : (state.timeUp ? t('timeUp') : t('youLost'))),
            state.scoreLabel || (state.score != null && typeof state.score === 'string') ? h('p', { class: 'result-score' }, state.scoreLabel || state.score) : null)),
        state.detail ? h('div', { class: 'result-detail' }, renderDetail(state.detail)) : null,
        h('div', { class: 'result-stats' },
          stat(t('played'), s.played), stat(t('wins'), s.wins), stat(t('streak'), s.streak), stat(t('best'), s.best)),
        h('div', { class: 'result-foot' }, MF.shareBox(share),
          MF.LEVELS.some((l) => !MF.dayState(g.slug, l)) ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => intro(g, stage) }, t('otherLevel')) : null,
          h('p', { class: 'next' }, t('comeBack')))));
      resultBox.scrollIntoView && setTimeout(() => resultBox.scrollIntoView({ behavior: MF.reduced() ? 'auto' : 'smooth', block: 'nearest' }), 60);
    }
    function renderDetail(d) { return typeof d === 'string' ? h('p', null, d) : (g.renderDetail ? g.renderDetail(d, ctx) : null); }
    function stat(l, v) { return h('div', { class: 'stat' }, h('strong', null, v), h('span', null, l)); }

    const board = h('div', { class: 'board' });
    stage.appendChild(board);
    stage.appendChild(resultBox);
    g.play(board, ctx);
    if (state.status !== 'playing') showResult();
    else if (state.timeUp) { ctx.onTimeUp ? ctx.onTimeUp() : ctx.finish(false, 0, '⏱'); }
  }

  function gameStats(g) {
    const s = MF.stats(g.slug);
    MF.modal(MF.gameInfo(g.num - 1)[0], h('div', { class: 'result-stats' },
      ...[[t('played'), s.played], [t('wins'), s.wins], [t('streak'), s.streak], [t('best'), s.best]].map(([l, v]) => h('div', { class: 'stat' }, h('strong', null, v), h('span', null, l)))));
  }

  // dificuldade padrão dos modos: Fácil (quem não acompanha muito), Normal (padrão), Difícil (quem conhece bem futebol), Lendário (o mais difícil possível)
  MF.ruleTag = (g) => h('span', { class: 'rule-tag' + (g.chances || g.tag ? ' limited' : '') }, g.tag ? g.tag() : g.chances ? t('nChances').replace('{n}', g.chances) : t('freeAnswers'));
  MF.levelOpt = () => ({
    key: 'mode', label: () => t('mode'), def: 'normal',
    choices: () => [{ v: 'easy', label: t('easy') }, { v: 'normal', label: t('normal') }, { v: 'hard', label: t('hard') }, { v: 'legend', label: t('legendary') }].map((c) => Object.assign(c, { lv: c.v })),
  });
  MF.level = (st) => (MF.LEVELS.includes(st.opts.mode) ? st.opts.mode : 'normal');

  // opções de tempo padrão
  MF.timerOpt = (choices, def) => ({
    key: 'timer', label: () => t('timer'), def: def == null ? 0 : def,
    choices: () => choices.map((s) => ({ v: s, label: s ? (s >= 120 ? s / 60 + ' min' : s + 's') : t('noTimer') + ' ∞' })),
  });

  // ------------------------------------------------------------------ roteador
  function route() {
    window.scrollTo(0, 0);
    const slug = location.hash.replace('#', '');
    const g = MF.games.find((x) => x && x.slug === slug);
    if (g) openGame(g); else home();
  }
  MF.route = route;
  window.addEventListener('hashchange', route);

  MF.boot = async () => {
    MF.applyLang();
    const root = app();
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'loading' }, t('loading')));
    try {
      await MF.loadData();
      // espera a fonte do título (no máximo 0,6 s) para o estádio não ter de redesenhar texturas no meio do voo
      if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('900 34px "Big Shoulders Display"').catch(() => {}), new Promise((r) => setTimeout(r, 600))]);
    } catch (e) {
      root.innerHTML = '';
      root.appendChild(h('p', { class: 'loading err' }, t('loadError')));
      console.error(e);
      return;
    }
    route();
  };
})();
