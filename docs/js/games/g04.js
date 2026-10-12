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
      pt: ['Uma carta real do FIFA (FIFA 15 a EA FC 24) está escondida.', 'A primeira dica é o tipo da carta e a edição. Cada palpite errado ou pulo revela a próxima: posição e geral, idade e valor de mercado, seleção e, por último, o clube.', 'Palpites livres: depois da 5ª dica, continue tentando ou toque em Desistir. Acertou, a carta vira na tela.'],
      en: ['A real FIFA card (FIFA 15 to EA FC 24) is hidden.', 'The first hint is the card type and edition. Each wrong guess or skip reveals the next one: position and overall, age and market value, nation and, last, the club.', 'Unlimited guesses: after the 5th hint keep trying or tap Give up. Get it right and the card flips over.'],
      es: ['Una carta real de FIFA (FIFA 15 a EA FC 24) está oculta.', 'La primera pista es el tipo de carta y la edición. Cada fallo o salto revela la siguiente: posición y media, edad y valor de mercado, selección y, por último, el club.', 'Intentos libres: tras la 5.ª pista sigue probando o toca Rendirse. Si aciertas, la carta se da la vuelta.'],
    },
    options: [MF.timerOpt([0, 90, 60])],
    preview() { return h('div', { class: 'fcard gold mini back', 'aria-hidden': 'true' }, h('span', null, '?')); },
    play(board, ctx) {
      const { games, P, clubs, leagues } = MF.data;
      const cards = games.cards;
      const card = cards[MF.daily('g4-card', cards.length)];
      const [pi, ver, ovr, pos, ci, val, age] = card;
      const p = P[pi];
      const club = clubs[ci];
      const st = ctx.state;
      st.guesses = st.guesses || [];
      const MAX = 5;
      const hints = [
        [t('cardType'), h('span', { class: 'tier-chip t' + MF.cardTier(ovr) }, MF.cardType(ovr) + ' · ' + MF.edition(ver))],
        [t('position') + ' · ' + t('rating'), MF.pos(pos) + ' · ' + ovr],
        [t('age') + ' · ' + t('value'), age + ' · ' + MF.money(val)],
        [t('nationality'), h('span', { class: 'v-club' }, MF.flag(p.nat), MF.country(p.nat))],
        [t('club') + ' · ' + t('league'), h('span', { class: 'v-club' }, MF.crest(club.n, 20), club.n + ' · ' + (leagues[club.l] || ''))],
      ];
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
        left.textContent = t('attempts') + ': ' + st.guesses.filter((g) => g != null).length;
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
        paint(Math.min(st.guesses.length, hints.length - 1));
      }
      function end(win) {
        const tries = st.guesses.filter((g) => g != null).length;
        const line = st.guesses.map((g) => (g === pi ? '🟩' : g == null ? '⬜' : '🟥')).join('') + ' · ' + (win ? tries + ' ' + t('tries') : '❌');
        st.scoreLabel = p.n + ' · ' + ovr + ' · ' + MF.edition(ver);
        ctx.finish(win, win ? tries : 0, line);
        ac.hidden = true;
        paint();
      }
      const skipBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => act(null) }, t('skip'));
      const ac = MF.autocomplete({ source: MF.playerSource(), onPick: (it) => act(it.id), extra: [skipBtn, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => end(false) }, t('giveUp'))] });
      board.appendChild(h('div', { class: 'bar' }, left, ctx.timerEl));
      board.appendChild(h('div', { class: 'card-layout' }, slot, h('div', { class: 'card-side' }, list, ac, guesses)));
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
  });
})();
