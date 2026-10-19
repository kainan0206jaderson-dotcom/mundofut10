/* Jogo 7 — Desafio do elenco (no estilo Futbol11 SquadSlice; substituiu o Bingo FUT10 em 18/10/2026)
   Uma rosca com as nacionalidades do elenco de um clube numa temporada: cada fatia é um país, e o tamanho
   é quantos jogadores daquele país estavam no elenco. Adivinhe o clube em 3 tentativas.
   1ª tentativa: ~30% do elenco à mostra; depois de errar ou pular: ~60%; última tentativa: a rosca inteira.
   Os países aparecem inteiros (fatia toda ou nada). Revelação: Aleatória ou Sentido horário (das maiores fatias para as menores).
   Dados: data/squads.json (tools/build_squads.py) — 2026/27 pelos elencos reais da temporada; anteriores pelas passagens do Transfermarkt. */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const TRIES = 3;
  const SHOW = [0.3, 0.6, 1];
  const NS = 'http://www.w3.org/2000/svg';
  const TX = {
    pt: { guess: 'ADIVINHE O TIME', players: (n) => n + (n === 1 ? ' jogador' : ' jogadores'), hidden: 'País escondido', shown: 'Elenco à mostra', attempt: 'Tentativa', random: 'Aleatória', clockwise: 'Sentido horário', reveal: 'Revelação', skipped: 'Pulou', tapSlice: 'Toque numa fatia para ver os jogadores.', tapCount: 'Toque numa fatia para ver quantos jogadores.', help: (c) => 'Ajuda: o clube é de ' + c, gotIt: (n) => 'Acertou na ' + n + 'ª tentativa', answer: 'O clube era', wrongClub: 'Não é o', loading: 'Carregando elencos…', squad: 'Elenco' },
    en: { guess: 'GUESS THE TEAM', players: (n) => n + (n === 1 ? ' player' : ' players'), hidden: 'Hidden country', shown: 'Squad shown', attempt: 'Guess', random: 'Random', clockwise: 'Clockwise', reveal: 'Reveal', skipped: 'Skipped', tapSlice: 'Tap a slice to see the players.', tapCount: 'Tap a slice to see how many players.', help: (c) => 'Help: the club is from ' + c, gotIt: (n) => 'Got it on guess ' + n, answer: 'The club was', wrongClub: 'Not', loading: 'Loading squads…', squad: 'Squad' },
    es: { guess: 'ADIVINA EL EQUIPO', players: (n) => n + (n === 1 ? ' jugador' : ' jugadores'), hidden: 'País oculto', shown: 'Plantilla visible', attempt: 'Intento', random: 'Aleatoria', clockwise: 'Sentido horario', reveal: 'Revelación', skipped: 'Saltó', tapSlice: 'Toca una porción para ver los jugadores.', tapCount: 'Toca una porción para ver cuántos jugadores.', help: (c) => 'Ayuda: el club es de ' + c, gotIt: (n) => 'Acertaste en el intento ' + n, answer: 'El club era', wrongClub: 'No es', loading: 'Cargando plantillas…', squad: 'Plantilla' },
  };
  const tx = () => TX[MF.lang] || TX.pt;

  // ------------------------------------------------------------------ dados
  let SQ = null, SQP = null;
  const loadSquads = () => SQP || (SQP = fetch('data/squads.json').then((r) => { if (!r.ok) throw new Error('squads ' + r.status); return r.json(); }).then((d) => (SQ = d.q)));
  // por nível: Fácil = elencos 2026/27 dos clubes famosos; Normal = 2026/27 dos famosos e campeões da Champions;
  // Difícil = 2026/27 dos clubes do Difícil + temporadas de 2005/06 em diante dos famosos e campeões da Champions;
  // Lendário = qualquer elenco (2026/27 e temporadas desde 1995/96)
  function pool(lvl) {
    MF._sqPool = MF._sqPool || {};
    if (MF._sqPool[lvl]) return MF._sqPool[lvl];
    const any = (q, l) => q.c.some((i) => MF.clubOk(l, i));
    const cur = (q) => q.s === 2026;
    const f = {
      easy: (q) => cur(q) && any(q, 'easy'),
      normal: (q) => cur(q) && any(q, 'normal'),
      hard: (q) => (cur(q) && any(q, 'hard')) || (q.s >= 2005 && any(q, 'normal')),
      legend: () => true,
    }[lvl];
    return (MF._sqPool[lvl] = SQ.filter(f));
  }
  const season = (q) => (q.cal ? String(q.s) : q.s + '/' + String((q.s + 1) % 100).padStart(2, '0'));

  // cor de cada país tirada da própria bandeira (a cor mais viva e frequente), clareada para aparecer no fundo escuro
  const FALL = ['#3d7be0', '#e0533d', '#3ddc8a', '#ffd400', '#b06ad8', '#ef8a2e', '#2fc2c9', '#d8487a'];
  const colCache = {};
  function flagColor(nat, done) {
    if (colCache[nat]) return colCache[nat];
    let hsh = 0; for (const ch of nat) hsh = (hsh * 31 + ch.charCodeAt(0)) | 0;
    const fb = FALL[Math.abs(hsh) % FALL.length];
    const code = MF.data.flags.map[nat], src = code && MF.data.flags.img[code];
    if (!src) return (colCache[nat] = fb);
    colCache[nat] = fb;
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement('canvas'); cv.width = 20; cv.height = 14;
        const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 20, 14);
        const px = g.getImageData(0, 0, 20, 14).data;
        const B = new Map();
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], gg = px[i + 1], b = px[i + 2];
          const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
          const sat = mx ? (mx - mn) / mx : 0;
          const k = (r >> 5) + ',' + (gg >> 5) + ',' + (b >> 5);
          const e = B.get(k) || { w: 0, r: 0, g: 0, b: 0, n: 0 };
          e.w += 0.12 + sat; e.r += r; e.g += gg; e.b += b; e.n++;
          B.set(k, e);
        }
        const best = [...B.values()].sort((a, b) => b.w - a.w)[0];
        let [r, gg, b] = [best.r / best.n, best.g / best.n, best.b / best.n];
        // HSL: garante luminosidade entre 38% e 62% para a fatia não sumir no fundo
        r /= 255; gg /= 255; b /= 255;
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        let hh = 0, s = 0, l = (mx + mn) / 2;
        if (mx !== mn) {
          const d = mx - mn;
          s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
          hh = mx === r ? (gg - b) / d + (gg < b ? 6 : 0) : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4;
          hh *= 60;
        }
        l = Math.min(0.62, Math.max(0.38, l));
        colCache[nat] = 'hsl(' + Math.round(hh) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%)';
        done && done();
      } catch (e) { /* fica a cor reserva */ }
    };
    img.src = src;
    return fb;
  }

  // ------------------------------------------------------------------ rosca
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const pt = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  function arc(cx, cy, R, r, a0, a1) {
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = pt(cx, cy, R, a0), [x1, y1] = pt(cx, cy, R, a1), [x2, y2] = pt(cx, cy, r, a1), [x3, y3] = pt(cx, cy, r, a0);
    return 'M' + x0 + ' ' + y0 + 'A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + 'A' + r + ' ' + r + ' 0 ' + big + ' 0 ' + x3 + ' ' + y3 + 'Z';
  }

  MF.registerGame({
    num: 7, slug: 'desafio-do-elenco',
    chances: TRIES,
    rules: {
      pt: ['Uma rosca com as nacionalidades do elenco de um clube numa temporada (a temporada aparece no meio). Cada fatia é um país; quanto maior a fatia, mais jogadores daquele país no elenco.', 'Digite e escolha o clube. Você tem 3 tentativas: na 1ª, cerca de 30% do elenco aparece; depois de errar ou pular, cerca de 60%; na última, a rosca inteira. Os países aparecem inteiros.', 'Revelação Aleatória (países em ordem sorteada) ou Sentido horário (das maiores fatias para as menores). Toque numa fatia para ver quantos jogadores; no fim, toque para ver os nomes.', 'Fácil: elencos 2026/27 dos clubes famosos. Normal: elencos 2026/27 dos famosos e dos campeões da Champions. Difícil: elencos 2026/27 dos clubes conhecidos da 1ª divisão e temporadas desde 2005/06 dos grandes. Lendário: qualquer elenco, desde 1995/96.', 'Ajuda: uma vez por partida, mostra o país do clube. Dica: preste atenção na temporada — uma nacionalidade rara pode entregar o time.'],
      en: ['A donut with the nationalities of a club’s squad in one season (the season is in the middle). Each slice is a country; the bigger the slice, the more players from that country.', 'Type and pick the club. You have 3 guesses: on the 1st, about 30% of the squad is shown; after a miss or skip, about 60%; on the last, the whole donut. Countries are revealed whole.', 'Random reveal (countries in random order) or Clockwise (biggest slices first). Tap a slice to see how many players; at the end, tap to see the names.', 'Easy: 2026/27 squads of famous clubs. Normal: 2026/27 squads of famous clubs and Champions League winners. Hard: 2026/27 squads of well-known top-flight clubs plus seasons since 2005/06 of the big ones. Legendary: any squad since 1995/96.', 'Help: once per game, shows the club’s country. Tip: mind the season — one rare nationality can give the team away.'],
      es: ['Una dona con las nacionalidades de la plantilla de un club en una temporada (la temporada aparece en el centro). Cada porción es un país; cuanto más grande, más jugadores de ese país.', 'Escribe y elige el club. Tienes 3 intentos: en el 1º se ve cerca del 30% de la plantilla; tras fallar o saltar, cerca del 60%; en el último, la dona entera. Los países aparecen enteros.', 'Revelación Aleatoria (países en orden sorteado) o Sentido horario (de las porciones más grandes a las más pequeñas). Toca una porción para ver cuántos jugadores; al final, toca para ver los nombres.', 'Fácil: plantillas 2026/27 de los clubes famosos. Normal: plantillas 2026/27 de los famosos y campeones de la Champions. Difícil: plantillas 2026/27 de clubes conocidos de primera y temporadas desde 2005/06 de los grandes. Legendario: cualquier plantilla desde 1995/96.', 'Ayuda: una vez por partida, muestra el país del club. Consejo: fíjate en la temporada — una nacionalidad rara puede delatar al equipo.'],
    },
    options: [
      MF.levelOpt(),
      { key: 'reveal', label: () => tx().reveal, def: 'random', choices: () => [{ v: 'random', label: tx().random }, { v: 'cw', label: tx().clockwise }] },
      MF.timerOpt([0, 120, 90, 60]),
    ],
    preview() {
      const s = el('svg', { viewBox: '0 0 120 120', class: 'pv-donut' });
      const parts = [9, 5, 4, 3, 2, 2, 1, 1, 1, 1];
      const tot = parts.reduce((a, b) => a + b, 0);
      let a = -Math.PI / 2;
      const on = [0, 2, 5];
      parts.forEach((n, i) => {
        const a1 = a + (n / tot) * Math.PI * 2;
        s.appendChild(el('path', { d: arc(60, 60, 56, 32, a, a1), class: on.includes(i) ? 'on' + i : '' }));
        a = a1;
      });
      return s;
    },
    play(board, ctx) {
      if (!SQ) {
        const wait = h('p', { class: 'loading' }, tx().loading);
        board.appendChild(wait);
        loadSquads().then(() => { wait.remove(); this.play(board, ctx); }).catch(() => { wait.textContent = t('loadError'); });
        return;
      }
      const { clubs } = MF.data;
      const st = ctx.state;
      const lvl = MF.level(st);
      const L = tx();
      const q = MF.dailyPick('g7-elenco1', lvl, pool, (x) => x.c[0]);
      const names = new Set(q.c.map((i) => MF.norm(clubs[i].n)));
      const isAnswer = (ci) => q.c.includes(ci) || names.has(MF.norm(clubs[ci].n));
      const club = clubs[q.c[0]];
      const slices = q.n.map(([nat, pl]) => ({ nat, pl, n: pl.length }));
      const total = slices.reduce((a, s) => a + s.n, 0);
      // ordem da revelação: sentido horário = das maiores fatias (que já começam no topo) para as menores; aleatória = sorteada, igual para todos
      const order = st.opts.reveal === 'cw' ? slices.map((_, i) => i) : MF.shuffle(slices.map((_, i) => i), MF.rng('g7-elenco:' + q.c[0] + ':' + q.s));
      st.g = st.g || []; // tentativas: índice do clube ou -1 (pulou)
      let sel = null;

      // quantos países (na ordem da revelação) aparecem em cada tentativa: o corte que chega mais perto de 30% / 60% do elenco,
      // sempre pelo menos um país a mais que na tentativa anterior; na última, todos
      const cuts = (() => {
        const out = [];
        let prev = 0;
        SHOW.forEach((f, k) => {
          let n = order.length;
          if (f < 1) {
            const goal = f * total;
            let sum = 0; n = 0;
            for (const i of order) {
              const nx = sum + slices[i].n;
              if (n && sum < goal && Math.abs(nx - goal) > Math.abs(sum - goal)) break;
              if (n && sum >= goal) break;
              sum = nx; n++;
            }
            n = Math.min(order.length - (TRIES - 1 - k), Math.max(n, prev + 1));
          }
          out.push((prev = Math.max(1, n)));
        });
        return out;
      })();
      const shownSet = () => new Set(ctx.finished() ? order : order.slice(0, cuts[Math.min(st.g.length, TRIES - 1)]));

      const chartWrap = h('div', { class: 'sq-chart' });
      const info = h('div', { class: 'sq-info', 'aria-live': 'polite' });
      const guesses = h('ol', { class: 'sq-guesses' });
      const pctPill = h('span', { class: 'pill' });
      const triesPill = h('span', { class: 'pill' });
      const answerBox = h('div', { class: 'sq-answer' });

      function drawChart(pop) {
        const shown = shownSet();
        const done = ctx.finished();
        const svg = el('svg', { viewBox: '0 0 300 300', role: 'img', 'aria-label': L.guess + ' ' + season(q) });
        const C = 150, R = 142, r = 82;
        let a = -Math.PI / 2;
        slices.forEach((s, i) => {
          const a1 = a + (s.n / total) * Math.PI * 2;
          const mid = (a + a1) / 2;
          const on = shown.has(i);
          const off = sel === i ? 6 : 0;
          const g = el('g', { class: 'sq-slice' + (on ? ' on' : '') + (sel === i ? ' sel' : '') + (pop && pop.has(i) ? ' pop' : ''), transform: 'translate(' + (Math.cos(mid) * off).toFixed(2) + ' ' + (Math.sin(mid) * off).toFixed(2) + ')', tabindex: '0', role: 'button',
            'aria-label': (on ? MF.country(s.nat) : L.hidden) + ': ' + L.players(s.n) });
          const path = el('path', { d: arc(C, C, R, r, a, a1) });
          if (on) path.style.fill = flagColor(s.nat, () => drawChart());
          g.appendChild(path);
          if (on) {
            const code = MF.data.flags.map[s.nat], src = code && MF.data.flags.img[code];
            const arcLen = (a1 - a) * ((R + r) / 2);
            const w = Math.max(13, Math.min(34, arcLen * 0.62, (R - r) * 0.5));
            const hgt = w * 0.68;
            const [fx, fy] = pt(C, C, (R + r) / 2, mid);
            if (src) {
              g.appendChild(el('rect', { x: fx - w / 2 - 1.5, y: fy - hgt / 2 - 1.5, width: w + 3, height: hgt + 3, rx: 2.5, class: 'sq-fl-bg' }));
              const im = el('image', { x: fx - w / 2, y: fy - hgt / 2, width: w, height: hgt, preserveAspectRatio: 'none' });
              im.setAttribute('href', src);
              g.appendChild(im);
            } else {
              const tt = el('text', { x: fx, y: fy + 4, 'text-anchor': 'middle', class: 'sq-fl-txt' }); tt.textContent = s.nat.slice(0, 3).toUpperCase(); g.appendChild(tt);
            }
          }
          const pick = () => { sel = sel === i ? null : i; drawChart(); paintInfo(); };
          g.addEventListener('click', pick);
          g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
          svg.appendChild(g);
          a = a1;
        });
        const t1 = el('text', { x: C, y: C - 10, 'text-anchor': 'middle', class: 'sq-c1' }); t1.textContent = L.guess;
        const t2 = el('text', { x: C, y: C + 22, 'text-anchor': 'middle', class: 'sq-c2' }); t2.textContent = season(q);
        svg.appendChild(t1); svg.appendChild(t2);
        if (done) {
          const t3 = el('text', { x: C, y: C + 44, 'text-anchor': 'middle', class: 'sq-c3' }); t3.textContent = L.players(total); svg.appendChild(t3);
        }
        MF.clear(chartWrap).appendChild(svg);
        const shownN = [...shown].reduce((x, i) => x + slices[i].n, 0);
        pctPill.textContent = L.shown + ': ' + Math.round((shownN / total) * 100) + '%';
        triesPill.textContent = L.attempt + ' ' + (done ? st.g.length || 1 : Math.min(st.g.length + 1, TRIES)) + '/' + TRIES;
      }
      function paintInfo() {
        MF.clear(info);
        const done = ctx.finished();
        if (sel == null) { info.appendChild(h('p', { class: 'sq-tip' }, done ? L.tapSlice : L.tapCount)); return; }
        const s = slices[sel];
        const on = shownSet().has(sel);
        info.appendChild(h('div', { class: 'sq-info-head' }, on ? MF.flag(s.nat) : h('span', { class: 'sq-q' }, '?'), h('strong', null, on ? MF.country(s.nat) : L.hidden), h('span', { class: 'sq-n' }, L.players(s.n))));
        if (done) info.appendChild(h('p', { class: 'sq-names' }, s.pl.join(' · ')));
      }
      function paintGuesses() {
        MF.clear(guesses);
        st.g.forEach((ci) => {
          const ok = ci >= 0 && isAnswer(ci);
          guesses.appendChild(h('li', { class: ok ? 'ok' : 'bad' }, h('span', { class: 'sq-mark', 'aria-hidden': 'true' }, ok ? '✓' : '✗'), ci >= 0 ? clubs[ci].n : L.skipped));
        });
        for (let k = st.g.length; k < TRIES && !ctx.finished(); k++) guesses.appendChild(h('li', { class: 'empty' }, h('span', { class: 'sq-mark' }, k + 1)));
      }
      function paintAnswer() {
        MF.clear(answerBox);
        if (!ctx.finished()) return;
        answerBox.appendChild(h('div', { class: 'sq-club pop' }, MF.crest(club.n, 54), h('div', null, h('span', null, L.answer), h('strong', null, club.n), h('em', null, season(q)))));
        answerBox.appendChild(h('ul', { class: 'sq-list' }, slices.map((s) => h('li', null, MF.flag(s.nat), h('b', null, s.n), h('span', null, MF.country(s.nat) + ' — ' + s.pl.join(', '))))));
      }
      function paint(pop) { drawChart(pop); paintInfo(); paintGuesses(); paintAnswer(); }

      function attempt(ci) {
        if (ctx.finished()) return;
        if (ci >= 0 && st.g.includes(ci)) return MF.toast(L.wrongClub + ' ' + clubs[ci].n, 'bad');
        const before = shownSet();
        st.g.push(ci);
        ctx.save();
        if (ci >= 0 && isAnswer(ci)) return end(true);
        if (st.g.length >= TRIES) return end(false);
        if (ci >= 0) { MF.toast(L.wrongClub + ' ' + clubs[ci].n, 'bad'); MF.anim(chartWrap, 'shake'); }
        const now = shownSet();
        paint(new Set([...now].filter((i) => !before.has(i))));
      }
      function end(win) {
        if (ctx.finished()) return;
        const n = st.g.length;
        const marks = st.g.map((ci) => (ci >= 0 && isAnswer(ci) ? '🟩' : '🟥')).join('');
        st.scoreLabel = win ? L.gotIt(n) : L.answer + ': ' + club.n;
        ctx.finish(win, win ? TRIES + 1 - n : 0, marks + (win ? '' : '⬛'.repeat(Math.max(0, TRIES - n))) + ' · ' + season(q));
        ac.hidden = true;
        helpBtn.refresh();
        paint();
      }
      ctx.onTimeUp = () => end(false);
      // ajuda única: o país do clube
      const helpBtn = MF.helpButton(ctx, () => (club.cty ? L.help(MF.country(club.cty)) : false));
      const list = (() => {
        if (MF._allClubs) return MF._allClubs;
        const { byClub } = MF.data;
        return (MF._allClubs = clubs.filter((c) => byClub[c.i].length).map((c) => ({ i: c.i, n: c.n, k: MF.norm(c.n), sz: byClub[c.i].length })));
      })();
      const ac = MF.autocomplete({
        placeholder: t('typeClub'),
        // busca em todos os clubes, só pelo nome: nunca mostra escudo
        source: (s) => {
          const nq = MF.norm(s); if (nq.length < 2) return [];
          return list.filter((c) => c.k.startsWith(nq) || c.k.split(/[\s-]/).some((w) => w.startsWith(nq)))
            .sort((a, b) => (b.k.startsWith(nq) - a.k.startsWith(nq)) || b.sz - a.sz).slice(0, 8).map((c) => ({ id: c.i, label: c.n }));
        },
        onPick: (it) => attempt(it.id),
        extra: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => attempt(-1) }, t('skip')), helpBtn,
          h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end(false) }, MF.icon('flag'))],
      });
      board.appendChild(h('div', { class: 'bar' }, triesPill, pctPill, ctx.timerEl));
      board.appendChild(h('div', { class: 'sq-layout' }, h('div', { class: 'sq-left' }, chartWrap, info), h('div', { class: 'sq-side' }, guesses, ac, helpBtn.note, answerBox)));
      if (ctx.finished()) ac.hidden = true;
      paint();
      MF._sqLast = q; // usado nos testes
    },
  });
})();
