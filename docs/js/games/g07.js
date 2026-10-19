/* Jogo 7 — Desafio do elenco (no estilo Futbol11 SquadSlice; substituiu o Bingo FUT10 em 18/10/2026)
   Uma rosca com as nacionalidades do elenco de um clube numa temporada: cada fatia é um país, e o tamanho
   é quantos jogadores daquele país estavam no elenco. Adivinhe o clube em 5 tentativas.

   Revelação gradual (pedido do usuário, 18/10/2026): o desenho das fatias aparece desde o início, mas as bandeiras vêm aos poucos —
   2 bandeiras na 1ª tentativa, 3 na 2ª, 5 na 3ª, 7 na 4ª. A bandeira PRINCIPAL (a maior fatia, o país com mais jogadores) fica
   trancada até a última tentativa, quando a rosca inteira aparece. Errar ou pular libera a próxima leva.
   Ordem: Aleatória (sorteada, igual para todos) ou Sentido horário (a partir da fatia ao lado da principal, das maiores para as menores).
   Os países aparecem inteiros (fatia toda ou nada).
   Dados: data/squads.json (tools/build_squads.py) — 2026/27 pelos elencos reais da temporada; anteriores pelas passagens do Transfermarkt. */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const STEPS = [2, 3, 5, 7];        // bandeiras (fora a principal) à mostra antes de cada tentativa
  const TRIES = STEPS.length + 1;    // na última, a rosca inteira (com a principal)
  const NS = 'http://www.w3.org/2000/svg';
  const HIDE = '#1f2119';
  const TX = {
    pt: {
      guess: 'ADIVINHE O TIME', players: (n) => n + (n === 1 ? ' jogador' : ' jogadores'), hidden: 'País escondido', flags: 'Bandeiras', attempt: 'Tentativa',
      random: 'Aleatória', clockwise: 'Sentido horário', reveal: 'Revelação', skipped: 'Pulou', tapSlice: 'Toque numa fatia para ver os jogadores.',
      tapCount: 'Toque numa fatia para ver quantos jogadores ela tem.', help: (c) => 'Ajuda: o clube é de ' + c, gotIt: (n) => 'Acertou na ' + n + 'ª tentativa',
      answer: 'O clube era', wrongClub: 'Não é o', loading: 'Carregando elencos…', next: (n) => 'Errou ou pulou? +' + n + (n === 1 ? ' bandeira' : ' bandeiras'),
      nextMain: 'Errou ou pulou? A bandeira principal aparece', lastTry: 'Última tentativa: a rosca inteira está à mostra', main: 'Bandeira principal',
      mainLocked: 'Bandeira principal — só na última tentativa', more: (n) => '+' + n + (n === 1 ? ' bandeira' : ' bandeiras'), mainOut: 'Bandeira principal revelada!',
      revealed: 'Países à mostra', none: 'Nenhuma bandeira ainda', same: 'Errou ou pulou? Todas as outras bandeiras já estão à mostra',
    },
    en: {
      guess: 'GUESS THE TEAM', players: (n) => n + (n === 1 ? ' player' : ' players'), hidden: 'Hidden country', flags: 'Flags', attempt: 'Guess',
      random: 'Random', clockwise: 'Clockwise', reveal: 'Reveal', skipped: 'Skipped', tapSlice: 'Tap a slice to see the players.',
      tapCount: 'Tap a slice to see how many players it has.', help: (c) => 'Help: the club is from ' + c, gotIt: (n) => 'Got it on guess ' + n,
      answer: 'The club was', wrongClub: 'Not', loading: 'Loading squads…', next: (n) => 'Miss or skip? +' + n + (n === 1 ? ' flag' : ' flags'),
      nextMain: 'Miss or skip? The main flag shows up', lastTry: 'Last guess: the whole donut is shown', main: 'Main flag',
      mainLocked: 'Main flag — only on the last guess', more: (n) => '+' + n + (n === 1 ? ' flag' : ' flags'), mainOut: 'Main flag revealed!',
      revealed: 'Countries shown', none: 'No flags yet', same: 'Miss or skip? All the other flags are already shown',
    },
    es: {
      guess: 'ADIVINA EL EQUIPO', players: (n) => n + (n === 1 ? ' jugador' : ' jugadores'), hidden: 'País oculto', flags: 'Banderas', attempt: 'Intento',
      random: 'Aleatoria', clockwise: 'Sentido horario', reveal: 'Revelación', skipped: 'Saltó', tapSlice: 'Toca una porción para ver los jugadores.',
      tapCount: 'Toca una porción para ver cuántos jugadores tiene.', help: (c) => 'Ayuda: el club es de ' + c, gotIt: (n) => 'Acertaste en el intento ' + n,
      answer: 'El club era', wrongClub: 'No es', loading: 'Cargando plantillas…', next: (n) => '¿Fallas o saltas? +' + n + (n === 1 ? ' bandera' : ' banderas'),
      nextMain: '¿Fallas o saltas? Aparece la bandera principal', lastTry: 'Último intento: la dona entera está a la vista', main: 'Bandera principal',
      mainLocked: 'Bandera principal — solo en el último intento', more: (n) => '+' + n + (n === 1 ? ' bandera' : ' banderas'), mainOut: '¡Bandera principal revelada!',
      revealed: 'Países a la vista', none: 'Todavía no hay banderas', same: '¿Fallas o saltas? Todas las demás banderas ya están a la vista',
    },
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

  // cor de cada país tirada da própria bandeira (a cor mais viva e frequente), clareada para aparecer no fundo escuro.
  // As cores do desafio são calculadas ANTES de desenhar, para a animação das fatias não ser interrompida no meio.
  const FALL = ['#3d7be0', '#e0533d', '#3ddc8a', '#ffd400', '#b06ad8', '#ef8a2e', '#2fc2c9', '#d8487a'];
  const colCache = {};
  const fallback = (nat) => { let hsh = 0; for (const ch of nat) hsh = (hsh * 31 + ch.charCodeAt(0)) | 0; return FALL[Math.abs(hsh) % FALL.length]; };
  const flagSrc = (nat) => { const code = MF.data.flags.map[nat]; return code && MF.data.flags.img[code]; };
  function colorOf(img) {
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
    let r = best.r / best.n / 255, gg = best.g / best.n / 255, b = best.b / best.n / 255;
    // HSL: luminosidade entre 38% e 62% para a fatia não sumir no fundo
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    let hh = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      hh = (mx === r ? (gg - b) / d + (gg < b ? 6 : 0) : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4) * 60;
    }
    l = Math.min(0.62, Math.max(0.38, l));
    return 'hsl(' + Math.round(hh) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%)';
  }
  const loadColor = (nat) => new Promise((res) => {
    if (colCache[nat]) return res();
    const src = flagSrc(nat);
    if (!src) { colCache[nat] = fallback(nat); return res(); }
    const img = new Image();
    const done = () => { if (!colCache[nat]) colCache[nat] = fallback(nat); res(); };
    img.onload = () => { try { colCache[nat] = colorOf(img); } catch (e) { /* cor reserva */ } done(); };
    img.onerror = done;
    setTimeout(done, 1500);
    img.src = src;
  });
  const colorFor = (nat) => colCache[nat] || fallback(nat);

  // ------------------------------------------------------------------ rosca
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const pt = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  function arc(cx, cy, R, r, a0, a1) {
    // fatia única (o elenco todo de um país): anel completo, desenhado em duas metades
    if (a1 - a0 >= Math.PI * 2 - 1e-6) return arc(cx, cy, R, r, a0, a0 + Math.PI) + arc(cx, cy, R, r, a0 + Math.PI, a1 - 1e-4);
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = pt(cx, cy, R, a0), [x1, y1] = pt(cx, cy, R, a1), [x2, y2] = pt(cx, cy, r, a1), [x3, y3] = pt(cx, cy, r, a0);
    return 'M' + x0 + ' ' + y0 + 'A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + 'A' + r + ' ' + r + ' 0 ' + big + ' 0 ' + x3 + ' ' + y3 + 'Z';
  }
  const LOCK = 'M-5 -1.5v-3a5 5 0 0 1 10 0v3h1.6a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H-6.6a1 1 0 0 1-1-1V-.5a1 1 0 0 1 1-1zm2.4 0h5.2v-3a2.6 2.6 0 0 0-5.2 0z';

  /**
   * Quais países estão à mostra antes da tentativa k (0 = primeira).
   * slices já vêm da maior para a menor; a principal é a de índice 0.
   * order = ordem de revelação dos demais países. Antes da última tentativa: STEPS[k] bandeiras (sem a principal);
   * na última (ou com o jogo encerrado): todas.
   */
  function shownAt(k, order, nSlices, finished) {
    if (finished || k >= TRIES - 1) return new Set([...Array(nSlices).keys()]);
    return new Set(order.slice(0, Math.min(STEPS[k], order.length)));
  }

  MF.registerGame({
    num: 7, slug: 'desafio-do-elenco',
    chances: TRIES,
    rules: {
      pt: ['Uma rosca com as nacionalidades do elenco de um clube numa temporada (a temporada aparece no meio). Cada fatia é um país; quanto maior a fatia, mais jogadores daquele país no elenco.', 'Digite e escolha o clube. São 5 tentativas e as bandeiras aparecem aos poucos: 2 na 1ª tentativa, 3 na 2ª, 5 na 3ª e 7 na 4ª. A bandeira principal (a maior fatia, o país com mais jogadores) fica trancada até a última tentativa, quando a rosca inteira aparece. Errar ou pular libera a próxima leva.', 'Revelação Aleatória (bandeiras em ordem sorteada) ou Sentido horário (a partir da fatia ao lado da principal, das maiores para as menores). Toque numa fatia para ver quantos jogadores ela tem; no fim, toque para ver os nomes.', 'Fácil: elencos 2026/27 dos clubes famosos. Normal: elencos 2026/27 dos famosos e dos campeões da Champions. Difícil: elencos 2026/27 dos clubes conhecidos da 1ª divisão e temporadas desde 2005/06 dos grandes. Lendário: qualquer elenco, desde 1995/96.', 'Ajuda: uma vez por partida, mostra o país do clube. Dica: preste atenção na temporada — uma nacionalidade rara pode entregar o time.'],
      en: ['A donut with the nationalities of a club’s squad in one season (the season is in the middle). Each slice is a country; the bigger the slice, the more players from that country.', 'Type and pick the club. You get 5 guesses and the flags appear little by little: 2 on the 1st guess, 3 on the 2nd, 5 on the 3rd and 7 on the 4th. The main flag (the biggest slice, the country with the most players) stays locked until the last guess, when the whole donut is shown. A miss or a skip unlocks the next batch.', 'Random reveal (flags in random order) or Clockwise (starting next to the main slice, biggest first). Tap a slice to see how many players it has; at the end, tap to see the names.', 'Easy: 2026/27 squads of famous clubs. Normal: 2026/27 squads of famous clubs and Champions League winners. Hard: 2026/27 squads of well-known top-flight clubs plus seasons since 2005/06 of the big ones. Legendary: any squad since 1995/96.', 'Help: once per game, shows the club’s country. Tip: mind the season — one rare nationality can give the team away.'],
      es: ['Una dona con las nacionalidades de la plantilla de un club en una temporada (la temporada aparece en el centro). Cada porción es un país; cuanto más grande, más jugadores de ese país.', 'Escribe y elige el club. Tienes 5 intentos y las banderas aparecen poco a poco: 2 en el 1º intento, 3 en el 2º, 5 en el 3º y 7 en el 4º. La bandera principal (la porción más grande, el país con más jugadores) queda bloqueada hasta el último intento, cuando aparece la dona entera. Fallar o saltar libera la siguiente tanda.', 'Revelación Aleatoria (banderas en orden sorteado) o Sentido horario (desde la porción junto a la principal, de las más grandes a las más pequeñas). Toca una porción para ver cuántos jugadores tiene; al final, toca para ver los nombres.', 'Fácil: plantillas 2026/27 de los clubes famosos. Normal: plantillas 2026/27 de los famosos y campeones de la Champions. Difícil: plantillas 2026/27 de clubes conocidos de primera y temporadas desde 2005/06 de los grandes. Legendario: cualquier plantilla desde 1995/96.', 'Ayuda: una vez por partida, muestra el país del club. Consejo: fíjate en la temporada — una nacionalidad rara puede delatar al equipo.'],
    },
    options: [
      MF.levelOpt(),
      { key: 'reveal', label: () => tx().reveal, def: 'random', choices: () => [{ v: 'random', label: tx().random }, { v: 'cw', label: tx().clockwise }] },
      MF.timerOpt([0, 180, 120, 90]),
    ],
    preview() {
      const s = el('svg', { viewBox: '0 0 120 120', class: 'pv-donut' });
      const parts = [9, 5, 4, 3, 2, 2, 1, 1, 1, 1];
      const tot = parts.reduce((a, b) => a + b, 0);
      let a = -Math.PI / 2;
      const on = [2, 5];
      parts.forEach((n, i) => {
        const a1 = a + (n / tot) * Math.PI * 2;
        s.appendChild(el('path', { d: arc(60, 60, 56, 32, a, a1), class: on.includes(i) ? 'on' + i : '' }));
        if (i === 0) { const [x, y] = pt(60, 60, 44, (a + a1) / 2); const g = el('path', { d: LOCK, class: 'pv-lock', transform: 'translate(' + x + ' ' + y + ') scale(.75)' }); s.appendChild(g); }
        a = a1;
      });
      return s;
    },
    play(board, ctx) {
      const L = tx();
      if (!SQ) {
        const wait = h('p', { class: 'loading' }, L.loading);
        board.appendChild(wait);
        loadSquads().then(() => { wait.remove(); this.play(board, ctx); }).catch(() => { wait.textContent = t('loadError'); });
        return;
      }
      const { clubs } = MF.data;
      const st = ctx.state;
      const lvl = MF.level(st);
      const q = MF.dailyPick('g7-elenco1', lvl, pool, (x) => x.c[0]);
      const slices = q.n.map(([nat, pl]) => ({ nat, pl, n: pl.length }));
      // cores das bandeiras antes de desenhar (rápido: são imagens embutidas)
      if (slices.some((s) => !colCache[s.nat])) {
        const wait = h('p', { class: 'loading' }, L.loading);
        board.appendChild(wait);
        Promise.all(slices.map((s) => loadColor(s.nat))).then(() => { wait.remove(); this.play(board, ctx); });
        return;
      }
      const names = new Set(q.c.map((i) => MF.norm(clubs[i].n)));
      const isAnswer = (ci) => q.c.includes(ci) || names.has(MF.norm(clubs[ci].n));
      const club = clubs[q.c[0]];
      const total = slices.reduce((a, s) => a + s.n, 0);
      // ordem de revelação dos países (a principal, índice 0, fica de fora: só na última tentativa)
      const rest = slices.map((_, i) => i).slice(1);
      const order = st.opts.reveal === 'cw' ? rest : MF.shuffle(rest, MF.rng('g7-elenco:' + q.c[0] + ':' + q.s));
      st.g = st.g || []; // tentativas: índice do clube ou -1 (pulou)
      let sel = null;
      const shown = () => shownAt(st.g.length, order, slices.length, ctx.finished());

      const chartWrap = h('div', { class: 'sq-chart' });
      const info = h('div', { class: 'sq-info', 'aria-live': 'polite' });
      const chips = h('ul', { class: 'sq-chips', 'aria-label': L.revealed });
      const guesses = h('ol', { class: 'sq-guesses' });
      const steps = h('div', { class: 'sq-steps', 'aria-hidden': 'true' });
      const nextLine = h('p', { class: 'sq-next', 'aria-live': 'polite' });
      const flagPill = h('span', { class: 'pill' });
      const triesPill = h('span', { class: 'pill' });
      const answerBox = h('div', { class: 'sq-answer' });

      function drawChart(fresh) {
        const on = shown();
        const done = ctx.finished();
        const svg = el('svg', { viewBox: '0 0 300 300', role: 'img', 'aria-label': L.guess + ' ' + season(q) });
        const C = 150, R = 142, r = 82;
        let a = -Math.PI / 2;
        const freshList = fresh ? [...fresh] : [];
        slices.forEach((s, i) => {
          const a1 = a + (s.n / total) * Math.PI * 2;
          const mid = (a + a1) / 2;
          const vis = on.has(i);
          const isNew = fresh && fresh.has(i);
          const off = sel === i ? 6 : 0;
          const g = el('g', {
            class: 'sq-slice' + (vis ? ' on' : '') + (sel === i ? ' sel' : '') + (isNew ? ' pop' : '') + (i === 0 ? ' main' : ''),
            transform: 'translate(' + (Math.cos(mid) * off).toFixed(2) + ' ' + (Math.sin(mid) * off).toFixed(2) + ')', tabindex: '0', role: 'button',
            'aria-label': (vis ? MF.country(s.nat) : i === 0 ? L.mainLocked : L.hidden) + ': ' + L.players(s.n),
          });
          if (isNew) g.style.setProperty('--d', freshList.indexOf(i) * 140 + 'ms');
          const tip = el('title', {}); tip.textContent = (vis ? MF.country(s.nat) : i === 0 ? L.mainLocked : L.hidden) + ' · ' + L.players(s.n); g.appendChild(tip);
          const path = el('path', { d: arc(C, C, R, r, a, a1) });
          if (vis) path.style.fill = colorFor(s.nat);
          g.appendChild(path);
          const arcLen = (a1 - a) * ((R + r) / 2);
          const [fx, fy] = pt(C, C, (R + r) / 2, mid);
          if (vis) {
            const src = flagSrc(s.nat);
            const w = Math.max(13, Math.min(i === 0 ? 40 : 34, arcLen * 0.62, (R - r) * 0.55));
            const hgt = w * 0.68;
            const fl = el('g', { class: 'sq-fl', transform: 'translate(' + fx.toFixed(2) + ' ' + fy.toFixed(2) + ')' });
            if (src) {
              fl.appendChild(el('rect', { x: -w / 2 - 1.5, y: -hgt / 2 - 1.5, width: w + 3, height: hgt + 3, rx: 2.5, class: 'sq-fl-bg' }));
              const im = el('image', { x: -w / 2, y: -hgt / 2, width: w, height: hgt, preserveAspectRatio: 'none' });
              im.setAttribute('href', src);
              fl.appendChild(im);
            } else {
              const tt = el('text', { x: 0, y: 4, 'text-anchor': 'middle', class: 'sq-fl-txt' }); tt.textContent = s.nat.slice(0, 3).toUpperCase(); fl.appendChild(tt);
            }
            g.appendChild(fl);
          } else if (i === 0 && !done) {
            // cadeado na fatia principal: só abre na última tentativa
            const sc = Math.max(0.7, Math.min(1.25, arcLen / 60));
            g.appendChild(el('path', { d: LOCK, class: 'sq-lock', transform: 'translate(' + fx.toFixed(2) + ' ' + fy.toFixed(2) + ') scale(' + sc.toFixed(2) + ')' }));
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
        const t3 = el('text', { x: C, y: C + 44, 'text-anchor': 'middle', class: 'sq-c3' }); t3.textContent = L.players(total); svg.appendChild(t3);
        MF.clear(chartWrap).appendChild(svg);
        flagPill.textContent = L.flags + ': ' + on.size + '/' + slices.length;
        triesPill.textContent = L.attempt + ' ' + (done ? st.g.length || 1 : Math.min(st.g.length + 1, TRIES)) + '/' + TRIES;
      }
      // fileira de bandeiras à mostra (maior para menor) — facilita no celular, onde as fatias pequenas ficam miúdas
      function paintChips(fresh) {
        MF.clear(chips);
        const on = shown();
        const vis = slices.map((s, i) => ({ s, i })).filter(({ i }) => on.has(i));
        if (!vis.length) { chips.appendChild(h('li', { class: 'sq-chip empty' }, L.none)); return; }
        vis.forEach(({ s, i }) => chips.appendChild(h('li', null, h('button', {
          type: 'button', class: 'sq-chip' + (sel === i ? ' sel' : '') + (fresh && fresh.has(i) ? ' pop' : '') + (i === 0 ? ' main' : ''),
          onclick: () => { sel = sel === i ? null : i; drawChart(); paintInfo(); paintChips(); }, 'aria-label': MF.country(s.nat) + ': ' + L.players(s.n),
        }, MF.flag(s.nat), h('b', null, s.n)))));
      }
      function paintInfo() {
        MF.clear(info);
        const done = ctx.finished();
        if (sel == null) { info.appendChild(h('p', { class: 'sq-tip' }, done ? L.tapSlice : L.tapCount)); return; }
        const s = slices[sel];
        const vis = shown().has(sel);
        info.appendChild(h('div', { class: 'sq-info-head' },
          vis ? MF.flag(s.nat) : h('span', { class: 'sq-q' + (sel === 0 ? ' lock' : '') }, sel === 0 ? '🔒' : '?'),
          h('strong', null, vis ? MF.country(s.nat) : sel === 0 ? L.main : L.hidden),
          h('span', { class: 'sq-n' }, L.players(s.n))));
        if (!vis && sel === 0) info.appendChild(h('p', { class: 'sq-names' }, L.mainLocked));
        if (done) info.appendChild(h('p', { class: 'sq-names' }, s.pl.join(' · ')));
      }
      // indicador das 5 etapas: quantas bandeiras cada tentativa mostra (a última com a principal)
      function paintSteps() {
        MF.clear(steps);
        const done = ctx.finished();
        for (let k = 0; k < TRIES; k++) {
          const used = k < st.g.length;
          const cur = !done && k === st.g.length;
          const g = st.g[k];
          const cls = used ? (g >= 0 && isAnswer(g) ? ' ok' : ' bad') : cur ? ' cur' : '';
          const lab = k === TRIES - 1 ? '★' : String(Math.min(STEPS[k], order.length));
          steps.appendChild(h('span', { class: 'sq-step' + cls }, h('b', null, lab), h('i', null, k === TRIES - 1 ? L.main : L.flags)));
        }
        MF.clear(nextLine);
        if (done) return;
        const k = st.g.length;
        if (k >= TRIES - 1) nextLine.textContent = L.lastTry;
        else if (k === TRIES - 2) nextLine.textContent = L.nextMain;
        else {
          const add = Math.min(STEPS[k + 1], order.length) - Math.min(STEPS[k], order.length);
          nextLine.textContent = add > 0 ? L.next(add) : L.same;
        }
      }
      function paintGuesses() {
        MF.clear(guesses);
        st.g.forEach((ci) => {
          const ok = ci >= 0 && isAnswer(ci);
          guesses.appendChild(h('li', { class: ok ? 'ok' : 'bad' }, h('span', { class: 'sq-mark', 'aria-hidden': 'true' }, ok ? '✓' : '✗'), ci >= 0 ? clubs[ci].n : L.skipped));
        });
        if (!ctx.finished() && st.g.length < TRIES) guesses.appendChild(h('li', { class: 'empty' }, h('span', { class: 'sq-mark' }, st.g.length + 1), L.attempt + ' ' + (st.g.length + 1) + '/' + TRIES));
      }
      function paintAnswer() {
        MF.clear(answerBox);
        if (!ctx.finished()) return;
        answerBox.appendChild(h('div', { class: 'sq-club pop' }, MF.crest(club.n, 54), h('div', null, h('span', null, L.answer), h('strong', null, club.n), h('em', null, season(q) + ' · ' + L.players(total)))));
        answerBox.appendChild(h('ul', { class: 'sq-list' }, slices.map((s) => h('li', null, MF.flag(s.nat), h('b', null, s.n), h('span', null, h('strong', null, MF.country(s.nat)), ' — ' + s.pl.join(', '))))));
      }
      function paint(fresh) { drawChart(fresh); paintChips(fresh); paintInfo(); paintSteps(); paintGuesses(); paintAnswer(); }

      function attempt(ci) {
        if (ctx.finished()) return;
        if (ci >= 0 && st.g.includes(ci)) return MF.toast(L.wrongClub + ' ' + clubs[ci].n, 'bad');
        const before = shown();
        st.g.push(ci);
        ctx.save();
        if (ci >= 0 && isAnswer(ci)) return end(true, before);
        if (st.g.length >= TRIES) return end(false, before);
        const now = shown();
        const fresh = new Set([...now].filter((i) => !before.has(i)));
        const mainOut = fresh.has(0);
        const msg = mainOut ? L.mainOut : fresh.size ? L.more(fresh.size) : '';
        MF.toast((ci >= 0 ? L.wrongClub + ' ' + clubs[ci].n : L.skipped) + (msg ? ' · ' + msg : ''), ci >= 0 ? 'bad' : undefined);
        if (ci >= 0) MF.anim(chartWrap, 'shake');
        if (sel != null && !now.has(sel)) sel = null;
        paint(fresh);
      }
      function end(win, before) {
        if (ctx.finished()) return;
        const n = st.g.length;
        const marks = st.g.map((ci) => (ci >= 0 && isAnswer(ci) ? '🟩' : '🟥')).join('');
        st.scoreLabel = win ? L.gotIt(n) : L.answer + ': ' + club.n;
        ctx.finish(win, win ? TRIES + 1 - n : 0, marks + (win ? '⬜'.repeat(Math.max(0, TRIES - n)) : '') + ' · ' + season(q));
        ac.hidden = true;
        helpBtn.refresh();
        const all = shown();
        paint(before ? new Set([...all].filter((i) => !before.has(i))) : null);
      }
      ctx.onTimeUp = () => end(false, shown());
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
          return list.filter((c) => !st.g.includes(c.i) && (c.k.startsWith(nq) || c.k.split(/[\s-]/).some((w) => w.startsWith(nq))))
            .sort((a, b) => (b.k.startsWith(nq) - a.k.startsWith(nq)) || b.sz - a.sz).slice(0, 8).map((c) => ({ id: c.i, label: c.n }));
        },
        onPick: (it) => attempt(it.id),
        extra: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => attempt(-1) }, t('skip')), helpBtn,
          h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end(false, shown()) }, MF.icon('flag'))],
      });
      board.appendChild(h('div', { class: 'bar' }, triesPill, flagPill, ctx.timerEl));
      board.appendChild(h('div', { class: 'sq-layout' },
        h('div', { class: 'sq-left' }, chartWrap, chips, info),
        h('div', { class: 'sq-side' }, steps, nextLine, guesses, ac, helpBtn.note, answerBox)));
      if (ctx.finished()) ac.hidden = true;
      // primeira abertura da partida: as 2 primeiras bandeiras entram animadas
      paint(!ctx.finished() && !st.g.length ? shown() : null);
      MF._sqLast = q; // usado nos testes
    },
  });
  MF._sqShownAt = shownAt; MF._sqSteps = STEPS; // usado nos testes
})();
