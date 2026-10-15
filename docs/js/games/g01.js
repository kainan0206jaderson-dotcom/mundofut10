/* Jogo 1 — Quem é craque? (temporada + liga + estatísticas reveladas aos poucos) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  MF.registerGame({
    num: 1, slug: 'quem-e-craque', chances: 5,
    rules: {
      pt: ['Você recebe a temporada e a liga de um jogador misterioso.', 'Palpite um nome ou pule: cada palpite errado ou pulo revela mais duas pistas (jogos, gols, assistências, clube, seleção, posição, idade e camisa).', 'Você tem 5 chances de resposta. Pular não gasta chance. No 5º erro, o desafio termina como errado.', 'Ajuda: uma vez por partida, mostra as iniciais e o tamanho do nome.', 'Dificuldade — Fácil: craques conhecidos, começa com clube e seleção já revelados. Normal: pistas em ordem aleatória, duas por vez. Difícil: sem os óbvios (Messi, Cristiano Ronaldo e vencedores da Bola de Ouro), clube e seleção bloqueados. Lendário: clube, seleção e camisa bloqueados, e só uma pista nova por vez.'],
      en: ['You get the season and league of a mystery player.', 'Guess or skip: each wrong guess or skip reveals two more clues (apps, goals, assists, club, nation, position, age and shirt).', 'You have 5 answer chances. Skipping is free. On the 5th miss the challenge ends as lost.', 'Help: once per game, shows the initials and length of the name.', 'Difficulty — Easy: well-known stars, starts with club and nation already shown. Normal: clues in random order, two at a time. Hard: no obvious picks (Messi, Cristiano Ronaldo, Ballon d’Or winners), club and nation locked. Legendary: club, nation and shirt locked, and only one new clue at a time.'],
      es: ['Recibes la temporada y la liga de un jugador misterioso.', 'Adivina o salta: cada fallo o salto revela dos pistas más (partidos, goles, asistencias, club, selección, posición, edad y dorsal).', 'Tienes 5 oportunidades de respuesta. Saltar no gasta oportunidad. Al 5.º fallo, el desafío termina como perdido.', 'Ayuda: una vez por partida, muestra las iniciales y el largo del nombre.', 'Dificultad — Fácil: cracks conocidos, empieza con club y selección ya revelados. Normal: pistas en orden aleatorio, de dos en dos. Difícil: sin los obvios (Messi, Cristiano Ronaldo y ganadores del Balón de Oro), club y selección bloqueados. Legendario: club, selección y dorsal bloqueados, y solo una pista nueva cada vez.'],
    },
    options: [
      MF.levelOpt(),
      MF.timerOpt([0, 120, 60]),
    ],
    preview() {
      return h('div', { class: 'pv-stat' }, h('span', { class: 'pv-num' }, '10'), h('span', null, '2011/12'), h('span', null, 'La Liga'), h('span', null, '50 ' + t('goals').toLowerCase()));
    },
    play(board, ctx) {
      const { P, games } = MF.data;
      const st = ctx.state;
      const lvl = MF.level(st);
      const rows = games.statdle;
      // cada dificuldade tem o seu jogador do dia
      // a partir de 16/10/2026: jogador da resposta pelo critério do nível (Fácil = craques da mídia; Normal = conhecidos das
      // principais ligas; Difícil = principais ligas + lendas, sem os óbvios como Messi e Cristiano Ronaldo)
      const row = MF.isNew()
        ? MF.dailyPick('g1-statdle5', lvl, (l) => MF.byLevel(l, rows, (r) => P[r[0]], { answer: true, min: 5 }), (r) => r[0])
        : MF.dailyPick('g1-statdle4', lvl, () => rows, (r) => r[0]);
      const [pi, season, league, club, apps, goals, ast, age, pos, num] = row;
      const target = P[pi];
      const LOCK = lvl === 'legend' ? ['club', 'nat', 'shirt'] : lvl === 'hard' ? ['club', 'nat'] : [];
      const STEP = lvl === 'legend' ? 1 : 2;
      st.guesses = st.guesses || [];
      st.rev = st.rev || 0;

      const all = [
        ['apps', t('apps'), apps], ['goals', t('goals'), goals], ast != null ? ['assists', t('assists'), ast] : null,
        ['club', t('club'), club, 'club'], ['nat', t('nationality'), target.nat, 'nat'], ['pos', t('position'), MF.pos(pos)],
        ['age', t('age'), age], ['shirt', t('shirt'), num],
      ].filter(Boolean);
      let order = MF.shuffle(all, MF.rng('g1-ordem:' + MF.today() + ':' + lvl));
      // fácil: clube e seleção vêm primeiro e já abertos
      if (lvl === 'easy') order = [...order.filter((c) => c[0] === 'club' || c[0] === 'nat'), ...order.filter((c) => c[0] !== 'club' && c[0] !== 'nat')];
      const open = order.filter((c) => !LOCK.includes(c[0]));
      const locked = order.filter((c) => LOCK.includes(c[0]));
      if (lvl === 'easy' && !st.rev) st.rev = 2;
      const MAX = 5;

      const tiles = h('div', { class: 'clue-grid' });
      const guessList = h('ol', { class: 'guess-list' });
      const left = h('span', { class: 'pill' });
      const tag = (l, v) => h('div', { class: 'tag-big' }, h('span', null, l), h('strong', null, v));
      const sheet = h('div', { class: 'stat-sheet' },
        h('div', { class: 'sheet-top' }, tag(t('season'), season), tag(t('league'), league), MF.silhouette('sil-lg')),
        tiles);

      function paint(flipLast) {
        MF.clear(tiles);
        const done = ctx.finished();
        open.forEach((c, i) => {
          const shown = i < st.rev || done;
          tiles.appendChild(tile(c, shown, flipLast && shown && i >= st.rev - STEP && !done));
        });
        locked.forEach((c) => tiles.appendChild(tile(c, done, false, true)));
        MF.clear(guessList);
        st.guesses.forEach((g) => guessList.appendChild(h('li', { class: g === null ? 'skip' : 'miss' }, g === null ? t('skip') : P[g].n)));
        left.textContent = t('chancesLeft') + ': ' + (MAX - misses()) + '/' + MAX;
        skipBtn.disabled = st.rev >= open.length || ctx.finished();
      }
      function tile(c, shown, flip, isLocked) {
        let val = c[2];
        let node;
        if (c[3] === 'club') node = h('span', { class: 'v-club' }, MF.crest(val, 22), val);
        else if (c[3] === 'nat') node = h('span', { class: 'v-club' }, MF.flag(val), MF.country(val));
        else node = String(val);
        return h('div', { class: 'clue' + (shown ? ' on' : '') + (flip ? ' flip' : '') + (isLocked && !shown ? ' locked' : '') },
          h('span', { class: 'clue-l' }, c[1]),
          h('span', { class: 'clue-v' }, shown ? node : isLocked ? t('locked') : '?'));
      }
      const misses = () => st.guesses.filter((g) => g != null && g !== pi).length;
      function act(guessIdx) {
        if (ctx.finished()) return;
        if (guessIdx == null && st.rev >= open.length) return;
        if (guessIdx != null && st.guesses.includes(guessIdx)) return MF.toast(t('already'));
        if (guessIdx === pi) {
          st.guesses.push(guessIdx);
          ctx.save();
          return end(true);
        }
        st.guesses.push(guessIdx == null ? null : guessIdx);
        st.rev = Math.min(open.length, st.rev + STEP);
        ctx.save();
        if (guessIdx != null) { MF.toast(t('wrong') + ': ' + P[guessIdx].n, 'bad'); MF.anim(sheet, 'shake'); }
        if (misses() >= MAX) return end(false);
        paint(true);
      }
      function end(win) {
        const line = st.guesses.map((g) => (g === pi ? '🟩' : g === null ? '⬜' : '🟥')).join('') + ' · ' + misses() + '/' + MAX + ' ' + t('missesWord');
        st.scoreLabel = target.n + ' · ' + season;
        ctx.finish(win, win ? MAX - misses() : 0, line, { type: 'player', pi });
        paint(false);
        input.hidden = true;
        helpBtn.refresh();
      }
      const skipBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => act(null) }, t('skip'));
      // ajuda única: mostra as iniciais e o tamanho do nome
      const helpBtn = MF.helpButton(ctx, () => MF.ht('initials', { m: MF.mask(target.n) }));
      const input = MF.autocomplete({ source: MF.playerSource((i) => MF.era(P[i])), onPick: (it) => act(it.id), extra: [skipBtn, helpBtn] });
      board.appendChild(h('div', { class: 'bar' }, left, ctx.timerEl));
      board.appendChild(sheet);
      if (!ctx.finished()) board.appendChild(input);
      if (!ctx.finished()) board.appendChild(helpBtn.note);
      board.appendChild(guessList);
      paint(false);
      if (ctx.finished()) input.hidden = true;
    },
    renderDetail(d) { return MF.playerReveal(d.pi); },
  });

  // cartão de revelação de jogador, reutilizado por vários jogos
  MF.playerReveal = (pi, extra) => {
    const p = MF.data.P[pi];
    const clubs = MF.data.clubs;
    return h('div', { class: 'reveal' },
      MF.silhouette('sil-md', p.n, p.nat),
      h('div', null,
        h('p', { class: 'reveal-name' }, MF.flag(p.nat), p.n),
        h('p', { class: 'reveal-sub' }, MF.pos(p.pos) + ' · ' + MF.country(p.nat) + ' · ' + p.born),
        h('p', { class: 'reveal-clubs' }, p.st.map(([c, a, b]) => h('span', { class: 'career' }, MF.crest(clubs[c].n, 16), clubs[c].n + ' ', h('small', null, a === b ? a : a + '–' + b)))),
        extra || null));
  };
})();
