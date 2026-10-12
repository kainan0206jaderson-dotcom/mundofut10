/* Jogo 9 — Jogo da distância (proximidade de cada palpite com o craque secreto) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  MF.similarity = (a, b, tmCache) => {
    if (a.i === b.i) return { s: 100, why: [] };
    let s = -50;
    const why = [];
    if (a.nat === b.nat) { s += 28; why.push('sameNat'); }
    if (a.pos === b.pos) { s += 22; why.push('samePos'); } else if (MF.line(a.pos) === MF.line(b.pos)) { s += 11; why.push('samePos'); }
    const shared = a.clubs.filter((c) => b.clubs.includes(c));
    if (shared.length) {
      s += Math.min(45, 25 + 10 * (shared.length - 1)); why.push('sameClub');
      if (tmCache.has(b.i)) { s += 30; why.push('teammates'); }
    } else if (a.leagues.some((l) => b.leagues.includes(l))) { s += 12; why.push('sameLeague'); }
    const d = Math.abs(a.born - b.born);
    if (d <= 2) { s += 15; why.push('sameEra'); } else if (d <= 5) { s += 9; why.push('sameEra'); } else if (d <= 9) s += 4; else if (d > 15) s -= 8;
    return { s: MF.clamp(s, -99, 99), why };
  };

  MF.registerGame({
    num: 9, slug: 'jogo-da-distancia',
    rules: {
      pt: ['Descubra o craque secreto. Cada palpite recebe uma nota de −99 a 100 conforme a proximidade.', 'Pesam seleção, posição, clubes em comum (mais ainda se foram companheiros), ligas e geração.', 'Quanto mais perto de 100, mais quente. Palpites livres: continue até acertar ou toque em Desistir.'],
      en: ['Find the secret star. Each guess gets a score from −99 to 100 based on how close it is.', 'Nation, position, shared clubs (more if they were teammates), leagues and generation all count.', 'The closer to 100, the warmer. Unlimited guesses: keep going until you get it or tap Give up.'],
      es: ['Descubre al crack secreto. Cada intento recibe una nota de −99 a 100 según la cercanía.', 'Cuentan selección, posición, clubes en común (más si fueron compañeros), ligas y generación.', 'Cuanto más cerca de 100, más caliente. Intentos libres: sigue hasta acertar o toca Rendirse.'],
    },
    options: [
      MF.timerOpt([0, 300, 180]),
    ],
    preview() { return h('div', { class: 'pv-dist' }, [92, 46, -12].map((v) => h('span', null, h('b', { style: { width: (v + 100) / 2 + '%' } }), v))); },
    play(board, ctx) {
      const { P } = MF.data;
      const pool = P.filter((p) => p.famous && p.st.length >= 2).map((p) => p.i);
      const target = P[pool[MF.daily('g9-distancia', pool.length)]];
      const tm = MF.teammates(target.i);
      const st = ctx.state;
      st.guesses = st.guesses || [];
      const list = h('ol', { class: 'dist-list' });
      const left = h('span', { class: 'pill' });
      const best = h('span', { class: 'pill hot' });
      const heat = (s) => (s >= 80 ? 'h4' : s >= 50 ? 'h3' : s >= 15 ? 'h2' : s >= -20 ? 'h1' : 'h0');
      function paint(last) {
        MF.clear(list);
        const scored = st.guesses.map((g) => ({ g, ...MF.similarity(target, P[g], tm) })).sort((a, b) => b.s - a.s);
        scored.forEach(({ g, s, why }) => list.appendChild(h('li', { class: 'dist ' + heat(s) + (g === last ? ' pop' : '') },
          h('span', { class: 'dist-bar', style: { width: Math.max(4, (s + 100) / 2) + '%' }, 'aria-hidden': 'true' }),
          h('span', { class: 'dist-name' }, MF.flag(P[g].nat), P[g].n),
          h('span', { class: 'dist-why' }, why.map((w) => t(w)).join(' · ')),
          h('strong', { class: 'dist-s' }, s))));
        left.textContent = t('attempts') + ': ' + st.guesses.length;
        best.textContent = t('closest') + ': ' + (scored.length ? scored[0].s : '—');
      }
      function guess(g) {
        if (ctx.finished()) return;
        if (st.guesses.includes(g)) return MF.toast(t('already'));
        st.guesses.push(g);
        ctx.save();
        if (g === target.i) return end(true);
        paint(g);
      }
      function end(win) {
        const top = st.guesses.map((g) => MF.similarity(target, P[g], tm).s).sort((a, b) => b - a);
        const line = (win ? '🎯 ' + st.guesses.length + ' ' + t('tries') : '❌ ' + t('closest') + ' ' + (top[0] ?? '—'));
        st.scoreLabel = target.n;
        ctx.finish(win, win ? st.guesses.length : 0, line, { pi: target.i });
        ac.hidden = true;
        paint();
      }
      const ac = MF.autocomplete({ source: MF.playerSource(), onPick: (it) => guess(it.id), extra: h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => end(false) }, t('giveUp')) });
      board.appendChild(h('div', { class: 'bar' }, left, best, ctx.timerEl));
      board.appendChild(ac);
      board.appendChild(list);
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
    renderDetail(d) { return MF.playerReveal(d.pi); },
  });
})();
