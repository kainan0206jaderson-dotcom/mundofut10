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
  function paintSky(el) { const d = isDay(); el.innerHTML = d ? SUN : MOON; el.dataset.p = d ? 'day' : 'night'; el.title = d ? t('dayNow') : t('nightNow'); }
  function credit() { return h('p', { class: 'credit' }, t('creditBy') + ' ', h('strong', { translate: 'no' }, 'SucodeFrutas')); }
  function clockLine() {
    const ico = h('span', { class: 'clock-ico', 'aria-hidden': 'true', 'data-sky': '' });
    paintSky(ico);
    return h('p', { class: 'reset-line clock-line' }, ico,
      h('span', { class: 'clock-txt' }, h('span', { class: 'clock-label' }, t('brasiliaTime')), h('strong', { 'data-clock': '' }, brasiliaTime())));
  }
  function tick() {
    document.querySelectorAll('[data-clock]').forEach((el) => (el.textContent = brasiliaTime()));
    if (new Date().getSeconds() === 0) document.querySelectorAll('[data-sky]').forEach(paintSky);
    const ms = MF.nextReset() - Date.now();
    document.querySelectorAll('[data-reset]').forEach((el) => (el.textContent = MF.fmtCountdown(ms)));
    if (ms <= 0) location.reload();
  }
  clearInterval(MF._cdIv);
  MF._cdIv = setInterval(tick, 1000);
  function header() {
    const sel = h('div', { class: 'lang-switch', role: 'group', 'aria-label': t('language') },
      MF.LANGS.map(([v, l]) => h('button', {
        type: 'button', class: v === MF.lang ? 'on' : '', 'aria-pressed': v === MF.lang ? 'true' : 'false', lang: v,
        onclick: () => { if (v === MF.lang) return; MF.setLang(v); route(); },
      }, l)));
    const skip = h('a', { class: 'skip-link', href: '#', onclick: (e) => { e.preventDefault(); const f = document.querySelector('.sheet a, .sheet-row a, .sheet-panel a, .game-board input, .game-board button'); if (f) f.focus(); } }, t('skipToGames'));
    return h('header', { class: 'top' }, skip,
      h('a', { class: 'logo', href: '#', 'aria-label': 'MUNDOFUT10', translate: 'no' }, h('span', { class: 'logo-word' }, 'MUNDOFUT'), h('span', { class: 'logo-num' }, '10')),
      h('div', { class: 'top-right' },
        h('span', { class: 'cd', title: t('brasiliaTime') }, h('span', { class: 'cd-label' }, t('brasiliaTime')), h('time', { class: 'cd-time', 'data-clock': '' }, brasiliaTime())),
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
  function gameStatus(g) {
    const st = MF.dayState(g.slug);
    return st ? st.status : 'new'; // new | playing | won | lost
  }
  const statusText = (s) => t(s === 'won' ? 'statusWon' : s === 'lost' ? 'statusLost' : s === 'playing' ? 'playing' : 'play');
  function home() {
    if (MF.Stadium && MF.Stadium.init && MF.Stadium.init()) return home3d();
    return home2d();
  }
  function home2d() {
    document.body.classList.remove('is-home3d');
    const root = MF.clear(app());
    root.appendChild(header());
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
          h('span', { class: 'rule-tag' + (g.chances ? ' limited' : '') }, g.chances ? t('fiveChances') : t('freeAnswers'))),
        h('span', { class: 'chip chip-' + status }, statusText(status)),
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
clockLine(),
        done === 11 ? h('p', { class: 'all-done' }, t('allDone')) : null),
      h('div', { class: 'home-grid' }, h('div', { class: 'pitch-wrap' }, pitch), sheet)));
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
          h('span', { class: 'rule-tag' + (g.chances ? ' limited' : '') }, g.chances ? t('fiveChances') : t('freeAnswers'))),
        h('span', { class: 'chip chip-' + status }, statusText(status)),
        s.streak > 1 ? h('span', { class: 'streak', title: t('streak') }, '🔥' + s.streak) : null)));
    });
    return sheet;
  }
  function home3d() {
    const S = MF.Stadium;
    const root = MF.clear(app());
    document.body.classList.add('is-home3d');
    root.appendChild(header());
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
clockLine()),
      done === 11 ? h('p', { class: 'all-done' }, t('allDone')) : null);
    const fog = h('div', { class: 'cloud-fog', 'aria-hidden': 'true' });
    const skip = h('button', { class: 'cam-skip', type: 'button', hidden: true, onclick: () => S.skipIntro() }, t('skipIntro'));
    const stage = h('section', { class: 'stage3d' }, fog, layer, ui, skip);
    const panel = h('aside', { class: 'sheet-panel', 'aria-label': t('lineup') }, h('h2', { class: 'panel-title' }, t('todayGames')), sheetList());
    const main = h('main', { class: 'home3d' }, stage, panel);
    root.appendChild(main);
    root.appendChild(footer());
    document.title = 'MUNDOFUT10';
    S.fogEl = fog;
    const wide = () => innerWidth >= 900;
    const setCols = () => stage.classList.toggle('cols', innerWidth >= 1200);
    setCols(); addEventListener('resize', setCols);
    const fitRect = () => {
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

    let state = MF.dayState(g.slug);
    if (state && state.status !== 'playing') return runGame(g, stage, state);
    if (state && state.status === 'playing') return runGame(g, stage, state);
    intro(g, stage);
  }

  function intro(g, stage) {
    MF.clear(stage);
    const opts = {};
    const controls = (g.options || []).map((o) => {
      opts[o.key] = o.def;
      return MF.segmented(o.label(), o.choices(), o.def, (v) => (opts[o.key] = v));
    });
    const rules = (g.rules[MF.lang] || g.rules.pt);
    stage.appendChild(h('section', { class: 'intro' },
      g.preview ? h('div', { class: 'intro-art', 'aria-hidden': 'true' }, g.preview()) : null,
      h('div', { class: 'intro-body' },
        h('h2', null, t('howTo')),
        h('span', { class: 'rule-tag' + (g.chances ? ' limited' : '') }, g.chances ? t('fiveChances') : t('freeAnswers')),
        h('ul', { class: 'rules' }, rules.map((r) => h('li', null, r))),
        h('div', { class: 'controls' }, controls),
        h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => {
          const state = { status: 'playing', opts, started: Date.now() };
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
      const share = 'MUNDOFUT10 #' + MF.challengeNo() + ' · ' + name + '\n' + (state.share || '') ;
      const s = MF.stats(g.slug);
      resultBox.appendChild(h('section', { class: 'result ' + (win ? 'win' : 'lose'), 'aria-live': 'polite' },
        h('div', { class: 'result-head' },
          h('span', { class: 'result-card', 'aria-hidden': 'true' }),
          h('div', null, h('h2', null, win ? t('youWon') : (state.timeUp ? t('timeUp') : t('youLost'))),
            state.scoreLabel || (state.score != null && typeof state.score === 'string') ? h('p', { class: 'result-score' }, state.scoreLabel || state.score) : null)),
        state.detail ? h('div', { class: 'result-detail' }, renderDetail(state.detail)) : null,
        h('div', { class: 'result-stats' },
          stat(t('played'), s.played), stat(t('wins'), s.wins), stat(t('streak'), s.streak), stat(t('best'), s.best)),
        h('div', { class: 'result-foot' }, MF.shareBox(share), h('p', { class: 'next' }, t('comeBack')))));
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
    } catch (e) {
      root.innerHTML = '';
      root.appendChild(h('p', { class: 'loading err' }, t('loadError')));
      console.error(e);
      return;
    }
    route();
  };
})();
