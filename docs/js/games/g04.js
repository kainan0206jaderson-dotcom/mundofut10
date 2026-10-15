/* Jogo 4 — Descubra o card (carta do FIFA em 5 dicas) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  const LABELS = {
    pt: [['RIT', 'FIN', 'PAS', 'DRI', 'DEF', 'FÍS'], ['ELA', 'MAN', 'CHU', 'REF', 'VEL', 'POS']],
    en: [['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'], ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS']],
    es: [['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FÍS'], ['EST', 'PAR', 'SAQ', 'REF', 'VEL', 'POS']],
  };
  const TYPES = { pt: ['Ouro', 'Prata', 'Bronze'], en: ['Gold', 'Silver', 'Bronze'], es: ['Oro', 'Plata', 'Bronce'] };
  MF.cardTier = (ovr) => (ovr >= 75 ? 0 : ovr >= 65 ? 1 : 2);
  MF.cardType = (ovr) => (TYPES[MF.lang] || TYPES.pt)[MF.cardTier(ovr)];
  MF.edition = (v) => (v >= 24 ? 'EA FC ' + v : 'FIFA ' + v);
  MF.money = (m) => (m >= 1 ? '€' + (Number.isInteger(m) ? m : m.toFixed(1)) + ' mi' : '€' + Math.round(m * 1000) + ' mil');

  // carta desenhada em CSS (sem arte oficial)
  MF.fifaCard = (c, opts) => {
    const [pi, ver, ovr, pos, ci, val, age, stats, num] = c;
    const p = MF.data.P[pi];
    const gk = pos === 'GK';
    const lab = (LABELS[MF.lang] || LABELS.pt)[gk ? 1 : 0];
    const tier = ['gold', 'silver', 'bronze'][MF.cardTier(ovr)];
    const club = MF.data.clubs[ci] ? MF.data.clubs[ci].n : '';
    const name = (p.fn || p.n).toUpperCase();
    const el = h('div', { class: 'fcard ' + tier + (opts && opts.flip ? ' reveal-anim' : ''), role: 'img', 'aria-label': p.n + ' ' + ovr + ' ' + MF.pos(pos) + ' ' + MF.edition(ver) },
      h('div', { class: 'fc-shine', 'aria-hidden': 'true' }),
      h('div', { class: 'fc-top' },
        h('div', { class: 'fc-ovr' }, h('strong', null, ovr), h('span', null, MF.pos(pos)), MF.flag(p.nat), MF.crest(club, 22)),
        MF.silhouette('fc-sil', p.n, p.nat)),
      h('div', { class: 'fc-name' }, name),
      h('div', { class: 'fc-stats' }, stats.map((s, i) => h('span', null, h('b', null, s), ' ' + lab[i]))),
      h('div', { class: 'fc-ed' }, MF.edition(ver)));
    return el;
  };

  MF.registerGame({
    num: 4, slug: 'descubra-o-card',
    rules: {
      pt: ['Uma carta real do FIFA / EA FC (FIFA 15 a EA FC 26) está escondida — este é o modo dedicado às cartas do videogame.', 'A primeira dica é o tipo da carta e a edição. Cada palpite errado ou pulo revela a próxima dica. Acertou, a carta vira na tela.', 'Ajuda: uma vez por partida, mostra as iniciais e o tamanho do nome.', 'Fácil: cartas de craques conhecidos na mídia (geral 86+), com seleção e posição logo no começo e palpites livres. Normal: cartas 80+ de jogadores conhecidos das principais ligas, palpites livres. Difícil: jogadores das principais ligas e lendas (sem os mais óbvios), dicas na ordem mais difícil e até 8 palpites. Lendário: cartas abaixo de 85, o clube nunca aparece e só 4 palpites.'],
      en: ['A real FIFA / EA FC card (FIFA 15 to EA FC 26) is hidden — this is the mode dedicated to video game cards.', 'The first hint is the card type and edition. Each wrong guess or skip reveals the next hint. Get it right and the card flips over.', 'Help: once per game, shows the initials and length of the name.', 'Easy: media-famous stars (86+ overall), with nation and position early and unlimited guesses. Normal: 80+ cards of well-known top-league players, unlimited guesses. Hard: top-league players and legends (no obvious picks), hints in the hardest order and up to 8 guesses. Legendary: cards under 85, the club never shows and only 4 guesses.'],
      es: ['Una carta real de FIFA / EA FC (FIFA 15 a EA FC 26) está oculta — este es el modo dedicado a las cartas del videojuego.', 'La primera pista es el tipo de carta y la edición. Cada fallo o salto revela la siguiente pista. Si aciertas, la carta se da la vuelta.', 'Ayuda: una vez por partida, muestra las iniciales y el largo del nombre.', 'Fácil: cartas de cracks conocidos (media 86+), con selección y posición al principio e intentos libres. Normal: cartas 80+ de jugadores conocidos de las grandes ligas, intentos libres. Difícil: jugadores de las grandes ligas y leyendas (sin los más obvios), pistas en el orden más difícil y hasta 8 intentos. Legendario: cartas por debajo de 85, el club nunca aparece y solo 4 intentos.'],
    },
    options: [MF.levelOpt(), MF.timerOpt([0, 90, 60])],
    preview() { return h('div', { class: 'fcard gold mini back', 'aria-hidden': 'true' }, h('span', null, '?')); },
    play(board, ctx) {
      const { games, P, clubs, leagues } = MF.data;
      const st = ctx.state;
      const lvl = MF.level(st);
      const OK = { easy: (c) => c[2] >= 86, normal: (c) => c[2] >= 80, hard: () => true, legend: (c) => c[2] < 85 };
      // a resposta é o jogador: cartas diferentes do mesmo jogador não se repetem em dias próximos
      // cartas do EA FC 25 e 26 entram a partir do desafio nº 4 (15/10/2026); antes disso, o sorteio fica como era
      const NEW = MF.today() >= 3;
      // a partir de 16/10/2026: o jogador da carta segue o critério do nível (Difícil sem os óbvios)
      const card = MF.isNew()
        ? MF.dailyPick('g4-card5', lvl, (l) => MF.byLevel(l, games.cards.filter(OK[l]), (c) => P[c[0]], { answer: true, min: 10 }), (c) => c[0])
        : MF.dailyPick(NEW ? 'g4-card4' : 'g4-card3', lvl, (l) => games.cards.filter((c) => (NEW || c[1] < 25) && OK[l](c)), (c) => c[0]);
      const [pi, ver, ovr, pos, ci, val, age] = card;
      const p = P[pi];
      const club = clubs[ci];
      st.guesses = st.guesses || [];
      const MAXG = { easy: Infinity, normal: Infinity, hard: 8, legend: 4 }[lvl];
      const H = {
        type: [t('cardType'), h('span', { class: 'tier-chip t' + MF.cardTier(ovr) }, MF.cardType(ovr) + ' · ' + MF.edition(ver))],
        pos: [t('position') + ' · ' + t('rating'), MF.pos(pos) + ' · ' + ovr],
        age: val == null ? [t('age'), String(age)] : [t('age') + ' · ' + t('value'), age + ' · ' + MF.money(val)], // o FC 25 não traz o valor
        nat: [t('nationality'), h('span', { class: 'v-club' }, MF.flag(p.nat), MF.country(p.nat))],
        club: [t('club') + ' · ' + t('league'), h('span', { class: 'v-club' }, MF.crest(club.n, 20), club.n + ' · ' + (leagues[club.l] || ''))],
      };
      const ORDER = { easy: ['type', 'nat', 'pos', 'club', 'age'], normal: ['type', 'pos', 'age', 'nat', 'club'], hard: ['type', 'age', 'pos', 'nat', 'club'], legend: ['type', 'age', 'pos', 'nat'] }[lvl];
      const hints = ORDER.map((k) => H[k]);
      const slot = h('div', { class: 'card-slot' });
      const list = h('ol', { class: 'hint-list' });
      const guesses = h('ol', { class: 'guess-list' });
      const left = h('span', { class: 'pill' });
      function paint(newIdx) {
        const done = ctx.finished();
        const shown = done ? hints.length : Math.min(hints.length, st.guesses.length + 1);
        MF.clear(list);
        hints.forEach(([l, v], i) => list.appendChild(h('li', { class: 'hint' + (i < shown ? ' on' : '') + (i === newIdx ? ' flip' : '') },
          h('span', { class: 'hint-n' }, t('hint') + ' ' + (i + 1)), h('span', { class: 'hint-l' }, l), h('span', { class: 'hint-v' }, i < shown ? v : '?'))));
        MF.clear(guesses);
        st.guesses.forEach((g) => guesses.appendChild(h('li', { class: g === pi ? 'hit' : g == null ? 'skip' : 'miss' }, g == null ? t('skip') : P[g].n)));
        left.textContent = t('attempts') + ': ' + st.guesses.filter((g) => g != null).length + (MAXG < Infinity ? '/' + MAXG : '');
        skipBtn.disabled = st.guesses.length >= hints.length - 1 || done;
        MF.clear(slot);
        slot.appendChild(done ? MF.fifaCard(card, { flip: true }) : h('div', { class: 'fcard back ' + ['gold', 'silver', 'bronze'][MF.cardTier(ovr)] }, h('span', null, '?')));
      }
      function act(g) {
        if (ctx.finished()) return;
        if (g != null && st.guesses.includes(g)) return MF.toast(t('already'));
        if (g == null && st.guesses.length >= hints.length - 1) return;
        st.guesses.push(g);
        ctx.save();
        if (g === pi) return end(true);
        if (g != null) { MF.toast(t('wrong') + ': ' + P[g].n, 'bad'); MF.anim(slot, 'shake'); }
        if (st.guesses.filter((x) => x != null).length >= MAXG) return end(false);
        paint(Math.min(st.guesses.length, hints.length - 1));
      }
      function end(win) {
        const tries = st.guesses.filter((g) => g != null).length;
        const line = st.guesses.map((g) => (g === pi ? '🟩' : g == null ? '⬜' : '🟥')).join('') + ' · ' + (win ? tries + ' ' + t('tries') : '❌');
        st.scoreLabel = p.n + ' · ' + ovr + ' · ' + MF.edition(ver);
        ctx.finish(win, win ? tries : 0, line);
        ac.hidden = true;
        helpBtn.refresh();
        paint();
      }
      const skipBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => act(null) }, t('skip'));
      // ajuda única: mostra as iniciais e o tamanho do nome
      const helpBtn = MF.helpButton(ctx, () => MF.ht('initials', { m: MF.mask(p.n) }));
      const ac = MF.autocomplete({ source: MF.playerSource(), onPick: (it) => act(it.id), extra: [skipBtn, helpBtn, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => end(false) }, t('giveUp'))] });
      board.appendChild(h('div', { class: 'bar' }, left, ctx.timerEl));
      board.appendChild(h('div', { class: 'card-layout' }, slot, h('div', { class: 'card-side' }, list, ac, helpBtn.note, guesses)));
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
  });
})();
