/* Jogo 7 — Jogador link (no estilo Futbol11 Legacy)
   Um jogador misterioso e 4 clubes por onde ele passou, revelados um por vez em ordem aleatória
   (não cronológica: pode ser o clube de estreia, o atual ou um empréstimo). Palpite ou pule para ver o próximo clube.
   4 chances de resposta; pular não gasta chance. Só existe UM jogador da base que passou pelos quatro clubes. */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const MAX = 4;

  // candidatos: jogadores conhecidos com pelo menos 4 clubes na carreira
  function pool() {
    if (MF._legacyPool) return MF._legacyPool;
    const { P, byClub } = MF.data;
    const out = P.filter((p) => (p.famous || p.r >= 82) && p.clubs.length >= 4 && p.clubs.filter((c) => byClub[c].length >= 12).length >= 4).map((p) => p.i);
    return (MF._legacyPool = out);
  }
  // escolhe 4 clubes da carreira (preferindo clubes conhecidos) que só esse jogador tem em comum
  function puzzle(pi, seed) {
    const { P, byClub } = MF.data;
    const rnd = MF.rng(seed);
    const cs = P[pi].clubs.filter((c) => byClub[c].length >= 12).sort((a, b) => byClub[b].length - byClub[a].length).slice(0, 7);
    const combos = [];
    for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) for (let c = b + 1; c < cs.length; c++) for (let d = c + 1; d < cs.length; d++) combos.push([cs[a], cs[b], cs[c], cs[d]]);
    for (const combo of MF.shuffle(combos, rnd)) {
      let inter = new Set(byClub[combo[0]]);
      for (const c of combo.slice(1)) { const s = new Set(byClub[c]); inter = new Set([...inter].filter((x) => s.has(x))); }
      if (inter.size === 1 && inter.has(pi)) return MF.shuffle(combo, rnd); // ordem aleatória, não cronológica
    }
    return null;
  }

  MF.registerGame({
    num: 7, slug: 'jogador-link', chances: MAX,
    rules: {
      pt: ['Descubra o jogador misterioso a partir de 4 clubes por onde ele passou.', 'Os clubes aparecem um por vez, em ordem aleatória: pode ser o clube de estreia, o atual ou um empréstimo. Palpite ou pule para ver o próximo.', 'Você tem 4 chances de resposta; pular não gasta chance. Só um jogador da base passou pelos quatro clubes. No 4º erro, o desafio termina como errado.'],
      en: ['Find the mystery player from 4 clubs he played for.', 'The clubs appear one at a time, in random order: it can be his debut club, his current one or a loan. Guess or skip to see the next.', 'You have 4 answer chances; skipping is free. Only one player in the database played for all four clubs. On the 4th miss the challenge ends as lost.'],
      es: ['Descubre al jugador misterioso a partir de 4 clubes por los que pasó.', 'Los clubes aparecen de uno en uno, en orden aleatorio: puede ser el club de su debut, el actual o una cesión. Adivina o salta para ver el siguiente.', 'Tienes 4 oportunidades de respuesta; saltar es gratis. Solo un jugador de la base pasó por los cuatro clubes. Al 4.º fallo, el desafío termina como perdido.'],
    },
    options: [MF.timerOpt([0, 90, 60])],
    preview() { return h('div', { class: 'pv-link' }, [0, 1, 2].map(() => h('b')), h('i', null, '?')); },
    play(board, ctx) {
      const { P, clubs } = MF.data;
      const pl = pool();
      let k0 = MF.daily('g7-legacy', pl.length), pi = pl[k0], four = puzzle(pi, 'legacy:' + MF.today());
      for (let k = 1; !four && k < pl.length; k++) { pi = pl[(k0 + k) % pl.length]; four = puzzle(pi, 'legacy:' + MF.today() + ':' + k); }
      const target = P[pi];
      const st = ctx.state;
      st.shown = st.shown || 1;
      st.guesses = st.guesses || [];
      const misses = () => st.guesses.filter((g) => g !== pi).length;

      const row = h('ol', { class: 'lg-row', 'aria-label': t('legacyHint') });
      const who = h('div', { class: 'lg-who' });
      const guesses = h('ol', { class: 'guess-list' });
      const left = h('span', { class: 'pill' });
      const shownPill = h('span', { class: 'pill' });
      const skipBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { if (st.shown < 4 && !ctx.finished()) { st.shown++; ctx.save(); paint(st.shown - 1); } } }, t('skip'));
      function span(c) {
        const s = target.st.filter((x) => x[0] === c);
        return s.map(([, a, b]) => (a === b ? a : a + '–' + b)).join(', ');
      }
      function paint(pop) {
        const done = ctx.finished();
        MF.clear(row);
        four.forEach((c, i) => {
          const on = i < st.shown || done;
          row.appendChild(h('li', { class: 'lg-club' + (on ? ' on' : '') + (pop === i ? ' flip' : '') },
            h('span', { class: 'lg-n' }, i + 1),
            on ? [MF.crest(clubs[c].n, 64), h('strong', { class: 'lg-name' }, clubs[c].n), done ? h('span', { class: 'lg-yrs' }, span(c)) : null]
              : h('span', { class: 'lg-q', 'aria-label': t('locked') }, '?')));
        });
        MF.clear(who);
        who.appendChild(done
          ? h('div', { class: 'lg-player on' }, MF.silhouette('sil-md', target.n, target.nat), h('div', null, h('strong', null, target.n), h('span', null, MF.flag(target.nat), ' ', MF.pos(target.pos))))
          : h('div', { class: 'lg-player' }, MF.silhouette('sil-md'), h('div', null, h('strong', null, '???'), h('span', null, t('legacyHint')))));
        MF.clear(guesses);
        st.guesses.forEach((g) => guesses.appendChild(h('li', { class: g === pi ? 'hit' : 'miss' }, P[g].n)));
        left.textContent = t('chancesLeft') + ': ' + (MAX - misses()) + '/' + MAX;
        shownPill.textContent = t('clubsShown') + ': ' + (done ? 4 : st.shown) + '/4';
        skipBtn.disabled = st.shown >= 4 || done;
      }
      function guess(g) {
        if (ctx.finished()) return;
        if (st.guesses.includes(g)) return MF.toast(t('already'));
        st.guesses.push(g);
        if (g === pi) { ctx.save(); return end(true); }
        if (st.shown < 4) st.shown++;
        ctx.save();
        MF.toast(t('wrong') + ': ' + P[g].n, 'bad');
        MF.anim(row, 'shake');
        if (misses() >= MAX) return end(false);
        paint(st.shown - 1);
      }
      function end(win) {
        if (ctx.finished()) return;
        const line = four.map((c, i) => (i < st.shown ? '🟨' : '⬛')).join('') + (win ? ' ✅' : ' ❌') + ' · ' + misses() + '/' + MAX + ' ' + t('missesWord');
        st.scoreLabel = target.n;
        ctx.finish(win, win ? 5 - st.shown : 0, line, { pi });
        ac.hidden = true;
        paint();
      }
      ctx.onTimeUp = () => end(false);
      const ac = MF.autocomplete({ source: MF.playerSource(), onPick: (it) => guess(it.id), extra: skipBtn });
      board.appendChild(h('div', { class: 'bar' }, left, shownPill, ctx.timerEl));
      board.appendChild(h('div', { class: 'lg-stage' }, row, who));
      board.appendChild(ac);
      board.appendChild(guesses);
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
    renderDetail(d) { return MF.playerReveal(d.pi); },
  });
})();
