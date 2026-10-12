/* Jogo 7 — Jogador link (5 companheiros de clube levam ao jogador misterioso) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const notable = (p) => p.famous || p.r >= 82;

  function pool() {
    if (MF._linkPool) return MF._linkPool;
    const { P } = MF.data;
    const out = [];
    for (const p of P) {
      if (!p.famous) continue;
      const tm = MF.teammates(p.i);
      const good = [...tm.keys()].filter((q) => notable(P[q]));
      const clubs = new Set(good.flatMap((q) => [...tm.get(q)]));
      if (good.length >= 7 && clubs.size >= 2) out.push(p.i);
    }
    return (MF._linkPool = out);
  }

  function puzzle(pi, seed) {
    const { P } = MF.data;
    const tm = MF.teammates(pi);
    const cand = [...tm.keys()].filter((q) => notable(P[q]));
    const byClub = new Map();
    for (const q of cand) { const c = [...tm.get(q)][0]; if (!byClub.has(c)) byClub.set(c, []); byClub.get(c).push(q); }
    const rnd = MF.rng(seed);
    for (let tries = 0; tries < 40; tries++) {
      // rodízio entre clubes para variar as pistas
      const lists = MF.shuffle([...byClub.values()].map((l) => MF.shuffle(l, rnd)), rnd);
      const pick = [];
      for (let k = 0; pick.length < 5 && k < 40; k++) { const l = lists[k % lists.length]; if (l.length) pick.push(l.shift()); }
      if (pick.length < 5) continue;
      // unicidade: ninguém além do misterioso jogou com os cinco
      let inter = null;
      for (const q of pick) { const s = new Set(MF.teammates(q).keys()); inter = inter ? new Set([...inter].filter((x) => s.has(x))) : s; }
      inter.delete(pi);
      if (!inter.size || tries === 39) {
        pick.sort((a, b) => P[a].r - P[b].r); // do menos conhecido para o mais conhecido
        return pick.map((q) => ({ q, club: [...tm.get(q)][0] }));
      }
    }
    return null;
  }

  MF.registerGame({
    num: 7, slug: 'jogador-link', chances: 5,
    rules: {
      pt: ['Descubra o jogador misterioso que jogou com os cinco companheiros mostrados.', 'O jogo começa com um companheiro. Palpite ou pule para ver o próximo.', 'Contam companheiros de clube no profissional, em qualquer ordem. Você tem 5 chances de resposta; pular não gasta chance. No 5º erro, o desafio termina como errado.'],
      en: ['Find the mystery player who played with all five teammates shown.', 'The game starts with one teammate. Guess or skip to see the next.', 'Senior club teammates count, in any order. You have 5 answer chances; skipping is free. On the 5th miss the challenge ends as lost.'],
      es: ['Descubre al jugador misterioso que jugó con los cinco compañeros mostrados.', 'El juego empieza con un compañero. Adivina o salta para ver el siguiente.', 'Cuentan compañeros de club profesional, en cualquier orden. Tienes 5 oportunidades de respuesta; saltar es gratis. Al 5.º fallo, el desafío termina como perdido.'],
    },
    options: [MF.timerOpt([0, 90, 60])],
    preview() { return h('div', { class: 'pv-link' }, [0, 1, 2].map(() => h('b')), h('i', null, '?')); },
    play(board, ctx) {
      const { P, clubs } = MF.data;
      const pl = pool();
      let pi = pl[MF.daily('g7-link', pl.length)];
      let links = puzzle(pi, 'link:' + MF.today());
      for (let k = 1; !links && k < pl.length; k++) { pi = pl[(pl.indexOf(pi) + 1) % pl.length]; links = puzzle(pi, 'link:' + MF.today() + ':' + k); }
      const st = ctx.state;
      st.shown = st.shown || 1;
      st.guesses = st.guesses || [];
      const MAX = 5;
      const row = h('ol', { class: 'link-row' });
      const guesses = h('ol', { class: 'guess-list' });
      const left = h('span', { class: 'pill' });
      const skipBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { if (st.shown < 5) { st.shown++; ctx.save(); paint(st.shown - 1); } } }, t('skip'));
      const misses = () => st.guesses.filter((g) => g !== pi).length;
      function paint(pop) {
        const done = ctx.finished();
        MF.clear(row);
        links.forEach((l, i) => {
          const on = i < st.shown || done;
          const p = P[l.q];
          row.appendChild(h('li', { class: 'link-card' + (on ? ' on' : '') + (pop === i ? ' flip' : '') },
            on ? [MF.silhouette('sil-sm'), h('span', { class: 'link-name' }, p.n), h('span', { class: 'link-sub' }, MF.flag(p.nat), MF.pos(p.pos)),
              done ? h('span', { class: 'link-club' }, MF.crest(clubs[l.club].n, 16), clubs[l.club].n) : null]
              : h('span', { class: 'link-q' }, i + 1)));
        });
        row.appendChild(h('li', { class: 'link-card mystery' + (done ? ' on' : '') }, done ? [MF.silhouette('sil-sm'), h('span', { class: 'link-name' }, P[pi].n)] : h('span', { class: 'link-q' }, '?')));
        MF.clear(guesses);
        st.guesses.forEach((g) => guesses.appendChild(h('li', { class: g === pi ? 'hit' : 'miss' }, P[g].n)));
        left.textContent = t('chancesLeft') + ': ' + (MAX - misses()) + '/' + MAX;
        skipBtn.disabled = st.shown >= 5 || done;
      }
      function guess(g) {
        if (ctx.finished()) return;
        if (st.guesses.includes(g)) return MF.toast(t('already'));
        st.guesses.push(g);
        if (g === pi) { ctx.save(); return end(true); }
        if (st.shown < 5) st.shown++;
        ctx.save();
        MF.toast(t('wrong') + ': ' + P[g].n, 'bad');
        MF.anim(row, 'shake');
        if (misses() >= MAX) return end(false);
        paint(st.shown - 1);
      }
      function end(win) {
        const line = links.map((l, i) => (i < st.shown ? '🟨' : '⬛')).join('') + (win ? ' ✅' : ' ❌') + ' · ' + misses() + ' ' + t('wrong').toLowerCase();
        st.scoreLabel = P[pi].n;
        ctx.finish(win, win ? 6 - st.shown : 0, line, { pi });
        ac.hidden = true;
        paint();
      }
      const ac = MF.autocomplete({ source: MF.playerSource(), onPick: (it) => guess(it.id), extra: skipBtn });
      board.appendChild(h('div', { class: 'bar' }, left, ctx.timerEl));
      board.appendChild(row);
      board.appendChild(ac);
      board.appendChild(guesses);
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
    renderDetail(d) { return MF.playerReveal(d.pi); },
  });
})();
