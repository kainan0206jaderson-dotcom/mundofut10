/* Jogo 7 — Bingo FUT10 (no estilo Futbol11 Bingo)
   Uma cartela 4×3 com 12 categorias (clubes, seleções, ligas e prêmios). Os jogadores chegam um por vez:
   toque na casa em que ele se encaixa ou pule. Vale a carreira inteira (clube ou liga em qualquer época).
   Baralho de 30 cartas com jogadores conhecidos, retrô e atuais; a cartela sempre tem solução.
   Encaixe errado queima a carta. Preencha as 12 casas antes de as cartas acabarem. */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const DECK = 30;
  const LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Brasileirão', 'Liga Portugal', 'Saudi Pro League', 'MLS', 'Süper Lig'];
  const LG_SHORT = { 'Premier League': 'PL', 'La Liga': 'LL', 'Serie A': 'SA', 'Bundesliga': 'BL', 'Ligue 1': 'L1', 'Brasileirão': 'BR', 'Liga Portugal': 'LP', 'Saudi Pro League': 'SPL', 'MLS': 'MLS', 'Süper Lig': 'SL' };
  const AWARDS = {
    bow: { pt: 'Vencedor da Bola de Ouro', en: 'Ballon d’Or winner', es: 'Ganador del Balón de Oro', fit: (p) => p.bow, ico: 'ball' },
    bo: { pt: 'Top 10 da Bola de Ouro', en: 'Ballon d’Or top 10', es: 'Top 10 del Balón de Oro', fit: (p) => p.bo, ico: 'ball' },
    wc: { pt: 'Campeão do Mundo', en: 'World Cup winner', es: 'Campeón del Mundo', fit: (p) => p.wc, ico: 'cup' },
  };
  const ICO = {
    cup: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 6h20v8c0 7-4 13-10 14-6-1-10-7-10-14z" fill="currentColor"/><path d="M14 9H7c0 7 3 11 8 12M34 9h7c0 7-3 11-8 12" fill="none" stroke="currentColor" stroke-width="3"/><path d="M21 28h6v8h-6z" fill="currentColor"/><path d="M15 42c0-4 4-6 9-6s9 2 9 6z" fill="currentColor"/></svg>',
    ball: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="20" r="14" fill="currentColor"/><path d="M24 11l6 4-2 7h-8l-2-7z" fill="#0d0c09" opacity=".55"/><path d="M17 37h14l2 6H15z" fill="currentColor"/><path d="M22 33h4v5h-4z" fill="currentColor"/></svg>',
  };

  // jogadores do bingo: lendas, famosos e nota 84+ (retrô e atuais)
  function pool() {
    if (MF._bingoPool) return MF._bingoPool;
    return (MF._bingoPool = MF.data.P.filter((p) => p.legend || p.famous || p.r >= 84));
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
    const aw = Object.entries(AWARDS).map(([k, a]) => ({ type: 'award', id: k, fit: a.fit }));
    return (MF._bingoCat = { club, nat, lg, aw });
  }

  // cartela + baralho do dia (sempre com solução: 12 cartas formam um encaixe perfeito)
  function build(seed) {
    const { club, nat, lg, aw } = catalog();
    const pl = pool();
    const rnd = MF.rng('bingo:' + seed);
    for (let tries = 0; tries < 50; tries++) {
      const cats = MF.shuffle([...MF.sample(club, 6, rnd), ...MF.sample(nat, 3, rnd), ...MF.sample(lg, 1, rnd), ...MF.sample(aw, 2, rnd)], rnd);
      // encaixe: categorias com menos candidatos primeiro
      const order = cats.map((c, i) => i).sort((a, b) => pl.filter(cats[a].fit).length - pl.filter(cats[b].fit).length);
      const used = new Set(), sol = [];
      let ok = true;
      for (const i of order) {
        const cand = pl.filter((p) => cats[i].fit(p) && !used.has(p.i));
        if (!cand.length) { ok = false; break; }
        const p = MF.pick(cand, rnd);
        used.add(p.i); sol.push(p.i);
      }
      if (!ok) continue;
      // extras: 2/3 servem em alguma casa, 1/3 aleatórios
      const fitsAny = pl.filter((p) => !used.has(p.i) && cats.some((c) => c.fit(p)));
      const extra = [];
      for (const p of MF.shuffle(fitsAny, rnd)) { if (extra.length >= 8) break; extra.push(p.i); used.add(p.i); }
      for (const p of MF.shuffle(pl, rnd)) { if (extra.length >= DECK - 12) break; if (!used.has(p.i)) { extra.push(p.i); used.add(p.i); } }
      return { cats, deck: MF.shuffle([...sol, ...extra], rnd) };
    }
    return null;
  }

  MF.registerGame({
    num: 7, slug: 'bingo-fut10',
    tag: () => t('nCards').replace('{n}', DECK),
    rules: {
      pt: ['Uma cartela com 12 casas: clubes, seleções, ligas e prêmios. Os jogadores aparecem um por vez, entre craques retrô e atuais.', 'Toque na casa em que o jogador se encaixa ou pule para o próximo. Vale a carreira inteira: o clube ou a liga em qualquer época; seleção é a que ele defende.', 'São 30 cartas. Encaixe errado queima a carta. Cada jogador preenche uma casa só. Preencha as 12 casas antes de as cartas acabarem.'],
      en: ['A card with 12 squares: clubs, nations, leagues and awards. Players appear one at a time, retro stars and current ones.', 'Tap the square where the player fits or skip to the next. The whole career counts: the club or league at any time; nation is the one he represents.', 'There are 30 cards. A wrong placement burns the card. Each player fills one square only. Fill all 12 squares before the cards run out.'],
      es: ['Un cartón con 12 casillas: clubes, selecciones, ligas y premios. Los jugadores aparecen de uno en uno, entre cracks retro y actuales.', 'Toca la casilla en la que encaja el jugador o salta al siguiente. Vale toda la carrera: el club o la liga en cualquier época; la selección es la que representa.', 'Hay 30 cartas. Un encaje equivocado quema la carta. Cada jugador llena una sola casilla. Llena las 12 casillas antes de que se acaben las cartas.'],
    },
    options: [MF.timerOpt([0, 90, 60])],
    preview() { return h('div', { class: 'pv-grid pv-bingo' }, Array.from({ length: 12 }, (_, i) => h('b', { class: i % 5 === 0 ? 'on' : '' }))); },
    play(board, ctx) {
      const { P, clubs } = MF.data;
      const st = ctx.state;
      const no = MF.daily('g7-bingo', 1000);
      let B = build(no);
      for (let k = 1; !B && k < 10; k++) B = build(no + ':' + k);
      const { cats, deck } = B;
      st.cells = st.cells || Array(12).fill(null);
      st.k = st.k || 0; // carta atual
      st.miss = st.miss || 0;
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
      const deckPill = h('span', { class: 'pill' });
      const cellPill = h('span', { class: 'pill' });
      const skipBtn = h('button', { class: 'btn btn-ghost bg-skip', type: 'button', onclick: () => next() }, t('skip'));
      const flag = h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end(false) }, MF.icon('flag'));
      const filled = () => st.cells.filter((x) => x != null).length;
      const cur = () => (st.k < deck.length ? P[deck[st.k]] : null);

      function paint(pop, bad) {
        const done = ctx.finished();
        const p = cur();
        MF.clear(cardBox);
        if (!done && p) {
          cardBox.appendChild(h('div', { class: 'bg-player pop' }, MF.photo(p.n, p.nat, 84), h('strong', null, p.n)));
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
            const ex = pool().filter((q) => c.fit(q) && !st.cells.includes(q.i)).sort((a, b) => b.r - a.r)[0];
            inner = [icon(c), h('span', { class: 'bg-cat' }, label(c)), ex ? h('span', { class: 'bg-ex' }, ex.n) : null];
          } else inner = [icon(c), h('span', { class: 'bg-cat' }, label(c))];
          grid.appendChild(h('button', {
            type: 'button', class: 'bg-cell' + (pi != null ? ' on' : '') + (pop === i ? ' pop' : '') + (bad === i ? ' bad shake' : '') + (done && pi == null ? ' miss' : ''),
            disabled: done || pi != null, 'aria-label': label(c) + (pi != null ? ' · ' + P[pi].n : ''), onclick: () => place(i),
          }, inner));
        });
        deckPill.textContent = t('cardsLeft') + ': ' + Math.max(0, deck.length - st.k) + '/' + deck.length;
        cellPill.textContent = filled() + '/12';
      }
      function next() {
        if (ctx.finished()) return;
        st.k++;
        ctx.save();
        if (st.k >= deck.length) return end(false);
        paint();
      }
      function place(i) {
        const p = cur();
        if (ctx.finished() || !p || st.cells[i] != null) return;
        if (cats[i].fit(p)) {
          st.cells[i] = p.i; st.k++;
          ctx.save();
          if (filled() === 12) return end(true);
          if (st.k >= deck.length) return end(false);
          return paint(i);
        }
        st.miss++; st.k++;
        ctx.save();
        MF.toast(t('bingoWrong').replace('{p}', p.n).replace('{c}', label(cats[i])), 'bad');
        if (st.k >= deck.length) return end(false);
        paint(null, i);
      }
      function end(win) {
        if (ctx.finished()) return;
        const n = filled();
        const rows = [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (st.cells[r * 4 + c] != null ? '🟩' : '⬛')).join('')).join('\n');
        st.scoreLabel = n + '/12 · ' + st.k + ' ' + t('cardsWord');
        ctx.finish(win, n, rows + '\n' + n + '/12 · ' + st.k + '/' + deck.length + ' ' + t('cardsWord') + ' · ' + st.miss + ' ' + t('missesWord'));
        paint();
      }
      ctx.onTimeUp = () => end(false);
      board.appendChild(h('div', { class: 'bar' }, deckPill, cellPill, ctx.timerEl));
      board.appendChild(cardBox);
      board.appendChild(grid);
      board.appendChild(h('div', { class: 'row-btns center' }, flag));
      paint();
    },
  });
  MF._bingoBuild = build; // usado nos testes
})();
