/* Jogo 7 — Bingo FUT10 (no estilo Futbol11 Bingo)
   Cartela 4×3 com 12 categorias (7 clubes, 3 seleções, 1 liga e 1 prêmio que se reveza: Bola de Ouro, Copa do Mundo, Libertadores e Eurocopa). Os jogadores chegam um por vez,
   craques e jogadores conhecidos de várias épocas — alguns sem ligação nenhuma com a cartela.
   Sem tempo. Erros livres: encaixe errado não tira a carta. Modo Livre (pulos à vontade) ou 5 pulos.
   A cartela sempre tem solução. */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const FIRST = 17; // primeiras cartas: 12 da solução + 2 que encaixam + 3 sem ligação
  const DECK = 90;
  const SKIPS = 5;
  const LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Brasileirão', 'Liga Portugal', 'Saudi Pro League', 'MLS', 'Süper Lig'];
  const LG_SHORT = { 'Premier League': 'PL', 'La Liga': 'LL', 'Serie A': 'SA', 'Bundesliga': 'BL', 'Ligue 1': 'L1', 'Brasileirão': 'BR', 'Liga Portugal': 'LP', 'Saudi Pro League': 'SPL', 'MLS': 'MLS', 'Süper Lig': 'SL' };
  // os 4 prêmios se revezam: um por dia, sempre na mesma ordem
  const AWARD_ORDER = ['bow', 'wc', 'lib', 'euro'];
  const AWARDS = {
    bow: { pt: 'Vencedor da Bola de Ouro', en: 'Ballon d’Or winner', es: 'Ganador del Balón de Oro', fit: (p) => p.bow, ico: 'ball' },
    wc: { pt: 'Campeão da Copa do Mundo', en: 'World Cup winner', es: 'Campeón del Mundial', fit: (p) => p.wc, ico: 'wc' },
    lib: { pt: 'Campeão da Libertadores', en: 'Copa Libertadores winner', es: 'Campeón de la Libertadores', fit: (p) => p.lib, ico: 'lib' },
    euro: { pt: 'Campeão da Eurocopa', en: 'Euro winner', es: 'Campeón de la Eurocopa', fit: (p) => p.euro, ico: 'euro' },
  };
  const ICO = {
    // Bola de Ouro: bola dourada sobre a base
    ball: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="19" r="14" fill="currentColor"/><path d="M24 10.5l6.2 4.5-2.4 7.3h-7.6l-2.4-7.3z" fill="#0d0c09" opacity=".5"/><path d="M11 16l5-1M37 16l-5-1M18 29l2-6M30 29l-2-6" stroke="#0d0c09" stroke-width="1.5" opacity=".4"/><path d="M20 33h8v4h-8z" fill="currentColor"/><path d="M14 38h20l2 6H12z" fill="currentColor"/></svg>',
    // Copa do Mundo: duas figuras segurando o globo
    wc: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="10" r="8" fill="currentColor"/><path d="M17 15c-1 6 2 10 5 13l-2 9h8l-2-9c3-3 6-7 5-13-2 3-5 4-5 4s-3-1-5-4z" fill="currentColor"/><path d="M18 37h12l1 3H17z" fill="currentColor"/><path d="M15 41h18l1 4H14z" fill="#3ddc8a"/></svg>',
    // Libertadores: taça alta com a figura no topo e base larga
    lib: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="5" r="3" fill="currentColor"/><path d="M22 8h4l1 5h-6z" fill="currentColor"/><path d="M16 13h16c0 7-3 12-8 13-5-1-8-6-8-13z" fill="currentColor"/><path d="M22 26h4v7h-4z" fill="currentColor"/><path d="M16 33h16v4H16z" fill="currentColor"/><path d="M13 38h22v6H13z" fill="currentColor"/><path d="M15 40h18" stroke="#0d0c09" stroke-width="1.2" opacity=".45"/></svg>',
    // Eurocopa: taça de alças grandes (Henri Delaunay)
    euro: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 5h14v20c0 3-3 5-7 5s-7-2-7-5z" fill="currentColor"/><path d="M17 8c-6 0-8 4-8 7s3 6 8 6M31 8c6 0 8 4 8 7s-3 6-8 6" fill="none" stroke="currentColor" stroke-width="3"/><path d="M21 30h6v6h-6z" fill="currentColor"/><path d="M15 37h18l2 7H13z" fill="currentColor"/></svg>',
  };

  // jogadores do bingo: lendas, famosos e jogadores conhecidos (nota 82+), de todas as épocas.
  // Só entra quem tem a carreira completa na base (começa até os 21 anos), para nenhum "não encaixa" ser injusto.
  function pool() {
    if (MF._bingoPool) return MF._bingoPool;
    return (MF._bingoPool = MF.data.P.filter((p) => (p.legend || p.famous || p.r >= 82) && p.st.length && p.first - p.born <= 21));
  }
  function catalog() {
    if (MF._bingoCat) return MF._bingoCat;
    const { leagues } = MF.data;
    const pl = pool();
    const cc = new Map(), nc = new Map();
    for (const p of pl) { for (const c of p.clubs) cc.set(c, (cc.get(c) || 0) + 1); nc.set(p.nat, (nc.get(p.nat) || 0) + 1); }
    const club = [...cc].filter(([, n]) => n >= 18).map(([c]) => ({ type: 'club', id: c, fit: (p) => p.clubs.includes(c) }));
    const nat = [...nc].filter(([, n]) => n >= 15).map(([n]) => ({ type: 'nat', id: n, fit: (p) => p.nat === n }));
    const lg = [];
    Object.entries(leagues).forEach(([id, name]) => {
      if (!LEAGUES.includes(name)) return;
      const lid = +id;
      const c = { type: 'league', id: lid, name, fit: (p) => p.leagues.includes(lid) || p.leagues.includes(id) };
      if (pl.filter(c.fit).length >= 18) lg.push(c);
    });
    const aw = Object.fromEntries(Object.entries(AWARDS).map(([k, a]) => [k, { type: 'award', id: k, fit: a.fit }]));
    return (MF._bingoCat = { club, nat, lg, aw });
  }

  // cartela + baralho do dia: as primeiras 17 cartas bastam (12 formam um encaixe perfeito, 3 não servem em nada);
  // depois o baralho continua com ~70% de jogadores que encaixam em algo e ~30% sem ligação
  function build(seed, awardKey) {
    const { club, nat, lg, aw } = catalog();
    const pl = pool();
    const rnd = MF.rng('bingo2:' + seed);
    for (let tries = 0; tries < 50; tries++) {
      // como no Futbol11: 7 clubes, 3 seleções (bandeiras), 1 liga e 1 prêmio
      const award = aw[awardKey] || aw.bow;
      const cats = MF.shuffle([...MF.sample(club, 7, rnd), ...MF.sample(nat, 3, rnd), ...MF.sample(lg, 1, rnd), award], rnd);
      const order = cats.map((c, i) => i).sort((x, y) => pl.filter(cats[x].fit).length - pl.filter(cats[y].fit).length);
      const used = new Set(), sol = [];
      let ok = true;
      for (const i of order) {
        // prefere jogadores que não sejam só os mais premiados
        const cand = pl.filter((p) => cats[i].fit(p) && !used.has(p.i));
        if (!cand.length) { ok = false; break; }
        const p = MF.pick(cand, rnd);
        used.add(p.i); sol.push(p.i);
      }
      if (!ok) continue;
      const fit = MF.shuffle(pl.filter((p) => !used.has(p.i) && cats.some((c) => c.fit(p))), rnd);
      const none = MF.shuffle(pl.filter((p) => !cats.some((c) => c.fit(p))), rnd);
      if (none.length < 20) continue;
      const take = (arr, n) => { const out = []; while (out.length < n && arr.length) { const p = arr.shift(); if (!used.has(p.i)) { used.add(p.i); out.push(p.i); } } return out; };
      const awardFit = fit.filter((p) => award.fit(p));
      const first = MF.shuffle([...sol, ...take(awardFit.length ? awardFit : fit, 1), ...take(fit, 1), ...take(none, 3)], rnd);
      const rest = [];
      while (rest.length < DECK - FIRST && (fit.length || none.length)) {
        const src = rnd() < 0.3 ? none : fit;
        const got = take(src.length ? src : (src === none ? fit : none), 1);
        if (got.length) rest.push(got[0]);
      }
      return { cats, deck: [...first, ...rest] };
    }
    return null;
  }

  MF.registerGame({
    num: 7, slug: 'bingo-fut10',
    tag: () => t('noTimer') + ' ∞',
    rules: {
      pt: ['Uma cartela com 12 casas: 7 clubes, 3 seleções, 1 liga e 1 título que se reveza a cada dia (Bola de Ouro, Copa do Mundo, Libertadores e Eurocopa). Os jogadores aparecem um por vez, com foto e nome: craques e jogadores conhecidos de várias épocas — e alguns não têm ligação nenhuma com a cartela.', 'Toque na casa em que o jogador se encaixa ou pule. Vale a carreira inteira: o clube ou a liga em qualquer época; seleção é a que ele defende. Cada jogador preenche uma casa só.', 'Sem limite de tempo e erros livres: encaixe errado não tira o jogador, tente outra casa ou pule. Modo Livre: pulos à vontade. Modo 5 pulos: só 5 pulos; se acabarem e aparecer alguém que não serve em nenhuma casa livre, o jogo termina. Preencha as 12 casas para vencer.'],
      en: ['A card with 12 squares: 7 clubs, 3 nations, 1 league and 1 title that rotates every day (Ballon d’Or, World Cup, Libertadores and Euro). Players appear one at a time, with photo and name: stars and well-known players from every era — and some have no link to the card at all.', 'Tap the square where the player fits or skip. The whole career counts: the club or league at any time; nation is the one he represents. Each player fills one square only.', 'No time limit and unlimited mistakes: a wrong square keeps the player, try another or skip. Free mode: unlimited skips. 5 skips mode: only 5 skips; if they run out and a player fits no open square, the game ends. Fill all 12 squares to win.'],
      es: ['Un cartón con 12 casillas: 7 clubes, 3 selecciones, 1 liga y 1 título que se alterna cada día (Balón de Oro, Mundial, Libertadores y Eurocopa). Los jugadores aparecen de uno en uno, con foto y nombre: cracks y jugadores conocidos de todas las épocas — y algunos no tienen relación con el cartón.', 'Toca la casilla en la que encaja el jugador o salta. Vale toda la carrera: el club o la liga en cualquier época; la selección es la que representa. Cada jugador llena una sola casilla.', 'Sin límite de tiempo y fallos libres: una casilla equivocada no quita al jugador, prueba otra o salta. Modo Libre: saltos ilimitados. Modo 5 saltos: solo 5; si se acaban y aparece alguien que no encaja en ninguna casilla libre, el juego termina. Llena las 12 casillas para ganar.'],
    },
    options: [{ key: 'mode', label: () => t('mode'), def: 'free', choices: () => [{ v: 'free', label: t('bingoFree') }, { v: 'five', label: t('bingoFive') }] }],
    preview() { return h('div', { class: 'pv-grid pv-bingo' }, Array.from({ length: 12 }, (_, i) => h('b', { class: i % 5 === 0 ? 'on' : '' }))); },
    play(board, ctx) {
      const { P, clubs } = MF.data;
      const st = ctx.state;
      const five = st.opts.mode === 'five';
      const no = MF.daily('g7-bingo', 1000);
      const awardKey = AWARD_ORDER[((MF.today() % 4) + 4) % 4];
      let B = build(no, awardKey);
      for (let k = 1; !B && k < 10; k++) B = build(no + ':' + k, awardKey);
      const { cats, deck } = B;
      st.cells = st.cells || Array(12).fill(null);
      st.k = st.k || 0; // posição no baralho
      st.miss = st.miss || 0;
      st.skips = st.skips || 0;
      st.tried = st.tried || []; // casas já tentadas com o jogador atual
      const lang = MF.lang;

      const label = (c) => (c.type === 'club' ? clubs[c.id].n : c.type === 'nat' ? MF.country(c.id) : c.type === 'league' ? c.name : AWARDS[c.id][lang] || AWARDS[c.id].pt);
      function icon(c) {
        if (c.type === 'club') return MF.crest(clubs[c.id].n, 46);
        if (c.type === 'nat') return MF.flag(c.id, 'lg');
        if (c.type === 'league') return h('span', { class: 'bg-lg' }, LG_SHORT[c.name] || c.name.slice(0, 3));
        const s = h('span', { class: 'bg-aw' }); s.innerHTML = ICO[AWARDS[c.id].ico]; return s;
      }

      const cardBox = h('div', { class: 'bg-card', 'aria-live': 'polite' });
      const grid = h('div', { class: 'bg-grid' });
      const missPill = h('span', { class: 'pill' });
      const cellPill = h('span', { class: 'pill' });
      const skipBtn = h('button', { class: 'btn btn-ghost bg-skip', type: 'button', onclick: () => skip() });
      const flag = h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end(false) }, MF.icon('flag'));
      const filled = () => st.cells.filter((x) => x != null).length;
      // baralho sem fim: depois das 90 cartas, volta ao começo pulando quem já está na cartela
      const cur = () => {
        for (let n = 0; n < deck.length; n++) { const pi = deck[(st.k + n) % deck.length]; if (!st.cells.includes(pi)) { if (n) st.k += n; return P[pi]; } }
        return null;
      };
      const skipsLeft = () => SKIPS - st.skips;
      const fitsOpen = (p) => cats.some((c, i) => st.cells[i] == null && c.fit(p));

      function paint(pop, bad) {
        const done = ctx.finished();
        const p = done ? null : cur();
        MF.clear(cardBox);
        if (p) {
          cardBox.appendChild(h('div', { class: 'bg-player pop' }, MF.photo(p.n, p.nat, 96), h('strong', null, p.n)));
          skipBtn.textContent = t('skip') + (five ? ' (' + skipsLeft() + ')' : '');
          skipBtn.disabled = five && skipsLeft() <= 0;
          cardBox.appendChild(skipBtn);
        } else if (done) {
          cardBox.appendChild(h('p', { class: 'bg-end' }, filled() + '/12'));
        }
        MF.clear(grid);
        cats.forEach((c, i) => {
          const pi = st.cells[i];
          let inner;
          if (pi != null) inner = [MF.photo(P[pi].n, P[pi].nat, 40), h('span', { class: 'bg-name' }, P[pi].n), h('span', { class: 'bg-cat' }, label(c))];
          else if (done) {
            const ex = pool().filter((q) => c.fit(q) && !st.cells.includes(q.i)).sort((x, y) => y.r - x.r)[0];
            inner = [icon(c), h('span', { class: 'bg-cat' }, label(c)), ex ? h('span', { class: 'bg-ex' }, ex.n) : null];
          } else inner = [icon(c), h('span', { class: 'bg-cat' }, label(c))];
          const tried = !done && pi == null && st.tried.includes(i);
          grid.appendChild(h('button', {
            type: 'button', class: 'bg-cell' + (pi != null ? ' on' : '') + (pop === i ? ' pop' : '') + (bad === i ? ' bad shake' : tried ? ' bad' : '') + (done && pi == null ? ' miss' : ''),
            disabled: done || pi != null, 'aria-label': label(c) + (pi != null ? ' · ' + P[pi].n : ''), onclick: () => place(i),
          }, inner));
        });
        missPill.textContent = t('misses') + ': ' + st.miss;
        cellPill.textContent = filled() + '/12' + (five ? ' · ' + t('skipsLeft') + ': ' + skipsLeft() : '');
      }
      function advance() {
        st.k = (st.k + 1) % deck.length;
        st.tried = [];
        ctx.save();
        // 5 pulos: sem pulo e ninguém para essa carta → fim de jogo
        const p = cur();
        if (five && skipsLeft() <= 0 && p && !fitsOpen(p)) {
          MF.toast(t('bingoStuck').replace('{p}', p.n), 'bad');
          return end(false);
        }
        paint();
      }
      function skip() {
        if (ctx.finished()) return;
        if (five) { if (skipsLeft() <= 0) return; st.skips++; }
        advance();
      }
      function place(i) {
        const p = cur();
        if (ctx.finished() || !p || st.cells[i] != null) return;
        if (cats[i].fit(p)) {
          st.cells[i] = p.i;
          if (filled() === 12) { ctx.save(); return end(true); }
          st.k = (st.k + 1) % deck.length; st.tried = [];
          ctx.save();
          const q = cur();
          if (five && skipsLeft() <= 0 && q && !fitsOpen(q)) { MF.toast(t('bingoStuck').replace('{p}', q.n), 'bad'); return end(false); }
          return paint(i);
        }
        // erro livre: o jogador continua, a casa fica marcada para esta carta
        st.miss++;
        if (!st.tried.includes(i)) st.tried.push(i);
        ctx.save();
        MF.toast(t('bingoWrong').replace('{p}', p.n).replace('{c}', label(cats[i])), 'bad');
        paint(null, i);
      }
      function end(win) {
        if (ctx.finished()) return;
        const n = filled();
        const rows = [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (st.cells[r * 4 + c] != null ? '🟩' : '⬛')).join('')).join('\n');
        st.scoreLabel = n + '/12 · ' + st.miss + ' ' + t('missesWord');
        ctx.finish(win, n, rows + '\n' + n + '/12 · ' + st.miss + ' ' + t('missesWord') + (five ? ' · ' + st.skips + '/' + SKIPS + ' ' + t('skipsWord') : ''));
        paint();
      }
      board.appendChild(h('div', { class: 'bar' }, cellPill, missPill, h('span', { class: 'pill' }, five ? t('bingoFive') : t('bingoFree'))));
      board.appendChild(cardBox);
      board.appendChild(grid);
      board.appendChild(h('div', { class: 'row-btns center' }, flag));
      paint();
    },
  });
  MF._bingoBuild = build; MF._bingoAwards = AWARD_ORDER; // usado nos testes
})();
