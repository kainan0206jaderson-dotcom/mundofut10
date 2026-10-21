/* Jogo 9 — Jogo da distância (proximidade de cada palpite com o craque secreto) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  // ---------------------------------------------------------------- proximidade (revisão de 21/10/2026)
  // Como no Goltexto do Futbol11: a nota junta vários sinais (posição, idade, seleção, liga, clubes, companheiros) e cresce
  // aos poucos até 100. Calibrada no jogo deles: sem nada em comum, mesma posição e idade ≈ +10; outro setor ≈ −40; goleiro × linha ≈ −55.
  // Posição: lateral só com lateral (ala = lateral do mesmo lado), zagueiro com zagueiro, volante com volante, ponta com ponta…
  const SPOT = { GK: [0, 50], CB: [15, 50], LB: [22, 12], LWB: [30, 10], RB: [22, 88], RWB: [30, 90], CDM: [40, 50], CM: [52, 50],
    LM: [58, 14], RM: [58, 86], CAM: [68, 50], LW: [80, 14], RW: [80, 86], CF: [82, 50], ST: [92, 50] };
  const EXACT = { LWB: 'LB', RWB: 'RB' };
  MF.samePosExact = (x, y) => (EXACT[x] || x) === (EXACT[y] || y);
  MF.posClose = (x, y) => {
    if (MF.samePosExact(x, y)) return { v: 55, tag: 'samePos' };
    if (x === 'GK' || y === 'GK') return { v: 0 };
    const a = SPOT[x] || SPOT.CM, b = SPOT[y] || SPOT.CM;
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (MF.line(x) === MF.line(y)) return { v: Math.round(40 + 12 * Math.max(0, 1 - d / 80)), tag: 'sameLine' };
    return { v: Math.round(18 * Math.max(0, 1 - d / 45)) };
  };
  MF.similarity = (a, b, tmCache) => {
    if (MF.same(a.i, b.i)) return { s: 100, why: [] };
    let s = -55;
    const why = [];
    const pc = MF.posClose(a.pos, b.pos);
    s += pc.v; if (pc.tag) why.push(pc.tag);
    const d = Math.abs((a.born || 0) - (b.born || 0));
    if (d <= 1) { s += 8; why.push('sameEra'); } else if (d <= 3) { s += 5; why.push('sameEra'); } else if (d <= 6) s += 2; else if (d > 10) s -= 4;
    if (a.nat && a.nat === b.nat) { s += 18; why.push('sameNat'); }
    const ca = MF.curClub(a), cb = MF.curClub(b), cl = MF.data.clubs;
    if (ca != null && cb != null && cl[ca].l === cl[cb].l) { s += 6; why.push('sameLeague'); }
    else if (a.leagues.some((l) => b.leagues.includes(l))) { s += 3; why.push('sameLeague'); }
    const shared = a.clubs.filter((c) => b.clubs.includes(c));
    if (shared.length) {
      s += Math.min(30, 20 + 5 * (shared.length - 1)); why.push('sameClub');
      if (tmCache.has(b.i)) { s += 16; why.push('teammates'); }
      if (ca != null && ca === cb) { s += 12; why.push('nowTogether'); }
    }
    return { s: MF.clamp(Math.round(s), -99, 99), why };
  };
  // largura da barra: −60 ou menos = vazia, 100 = cheia (no Futbol11 a barra começa a encher perto de −60)
  MF.distFill = (s) => MF.clamp((s + 60) / 1.6, 3, 100);

  MF.registerGame({
    num: 9, slug: 'jogo-da-distancia',
    rules: {
      pt: ['Descubra o jogador secreto: sempre alguém que ainda joga (veterano ou jovem). Na busca vale qualquer jogador, da ativa ou aposentado. Cada palpite recebe uma nota de −99 a 100: quanto mais perto de 100, mais quente, e a barra enche junto.', 'A nota junta vários sinais: posição (a mesma posição exata vale mais que só o mesmo setor; goleiro × jogador de linha fica bem longe), idade, seleção, liga atual, clubes em comum, se foram companheiros e se jogam juntos hoje.', 'Dica em todos os níveis: cada palpite mostra a posição dele e os motivos da nota (mesma posição, mesmo setor, mesma seleção, liga, clube, companheiros, jogam juntos, geração).', 'Fácil: craques conhecidos na mídia, com a seleção como dica. Normal: jogadores conhecidos dos clubes mais conhecidos. Difícil: jogadores dos clubes tradicionais das principais ligas (sem os mais óbvios). Lendário: qualquer jogador relevante em atividade e no máximo 15 palpites.'],
      en: ['Find the secret player: always someone who still plays (veteran or young). You can search any player, active or retired. Each guess gets a score from −99 to 100: the closer to 100, the warmer, and the bar fills up with it.', 'The score combines several signals: position (the exact same position counts more than just the same line; goalkeeper vs outfield is far apart), age, nation, current league, shared clubs, whether they were teammates and whether they play together now.', 'Hint at every level: each guess shows his position and the reasons behind its score (same position, same line, same nation, league, club, teammates, play together, generation).', 'Easy: media-famous stars, with the nation as a hint. Normal: well-known players of the best-known clubs. Hard: players of traditional top-league clubs (no obvious picks). Legendary: any relevant active player and at most 15 guesses.'],
      es: ['Descubre al jugador secreto: siempre alguien que sigue jugando (veterano o joven). En la búsqueda vale cualquier jugador, en activo o retirado. Cada intento recibe una nota de −99 a 100: cuanto más cerca de 100, más caliente, y la barra se llena con ella.', 'La nota junta varias señales: posición (la misma posición exacta vale más que solo la misma línea; portero × jugador de campo queda muy lejos), edad, selección, liga actual, clubes en común, si fueron compañeros y si juegan juntos hoy.', 'Pista en todos los niveles: cada intento muestra su posición y los motivos de la nota (misma posición, misma línea, misma selección, liga, club, compañeros, juegan juntos, generación).', 'Fácil: cracks conocidos en los medios, con la selección como pista. Normal: jugadores conocidos de los clubes más conocidos. Difícil: jugadores de los clubes tradicionales de las grandes ligas (sin los más obvios). Legendario: cualquier jugador relevante en activo y como máximo 15 intentos.'],
    },
    options: [MF.levelOpt(), MF.timerOpt([0, 300, 180])],
    preview() { return h('div', { class: 'pv-dist' }, [92, 46, -12].map((v) => h('span', null, h('b', { style: { width: MF.distFill(v) + '%' } }), v))); },
    play(board, ctx) {
      const { P } = MF.data;
      const st = ctx.state;
      const lvl = MF.level(st);
      const MINS = { easy: 88, normal: 84, hard: 80, legend: 76 };
      const MIN = MINS[lvl];
      const MAX_G = lvl === 'legend' ? 15 : Infinity;
      const NEW = MF.isNew();
      const REV = MF.isRev();
      // a partir de 21/10/2026: o jogador do dia é sempre alguém que ainda joga (aposentado, falecido ou sem clube não entra)
      const base = (l) => P.slice(0, MF.CORE_N).filter((p) => MF.era(p) && p.st.length >= 2 && !p.natGuess && (!REV || (MF.active(p) && MF.isCanon(p))));
      // a partir de 16/10/2026: o jogador secreto segue o critério do nível (Difícil sem os óbvios); Lendário mantém a base
      const poolFor = NEW
        ? (l) => (l === 'legend' ? base(l).filter((p) => p.r >= MINS[l]) : base(l).filter((p) => MF.playerOk(l, p, { answer: true }))).map((p) => p.i)
        : (l) => base(l).filter((p) => p.r >= MINS[l] && (l !== 'easy' || p.famous)).map((p) => p.i);
      const target = P[MF.dailyPick(REV ? 'g9-dist5' : NEW ? 'g9-dist4' : 'g9-dist3', lvl, poolFor)];
      MF._distLast = target; // (testes)
      const tm = MF.teammates(target.i);
      // os motivos de cada nota (mesma seleção, posição, clube, companheiros, liga, geração) voltam a aparecer em todos os níveis
      const why = true;
      st.guesses = st.guesses || [];
      const list = h('ol', { class: 'dist-list' });
      const left = h('span', { class: 'pill' });
      const best = h('span', { class: 'pill hot' });
      const heat = (s) => (s >= 70 ? 'h4' : s >= 40 ? 'h3' : s >= 10 ? 'h2' : s >= -25 ? 'h1' : 'h0');
      function paint(last) {
        MF.clear(list);
        const scored = st.guesses.map((g) => ({ g, ...MF.similarity(target, P[g], tm) })).sort((a, b) => b.s - a.s);
        scored.forEach(({ g, s, why: whyList }) => list.appendChild(h('li', { class: 'dist ' + heat(s) + (g === last ? ' pop' : '') },
          h('span', { class: 'dist-name' }, MF.photo(P[g].n, P[g].nat, 28), MF.flag(P[g].nat), P[g].n,
            h('span', { class: 'dist-pos' }, MF.pos(P[g].pos))),
          h('span', { class: 'dist-why' }, why ? whyList.map((w) => t(w)).join(' · ') : ''),
          h('strong', { class: 'dist-s' }, s),
          h('span', { class: 'dist-meter', role: 'meter', 'aria-valuemin': -99, 'aria-valuemax': 100, 'aria-valuenow': s, 'aria-label': t('closeness') + ' ' + s },
            h('span', { class: 'dist-fill', style: { width: MF.distFill(s) + '%' } })))));
        left.textContent = t('attempts') + ': ' + st.guesses.length + (MAX_G < Infinity ? '/' + MAX_G : '');
        best.textContent = t('closest') + ': ' + (scored.length ? scored[0].s : '—');
      }
      function guess(g) {
        if (ctx.finished()) return;
        if (st.guesses.includes(g)) return MF.toast(t('already'));
        st.guesses.push(g);
        ctx.save();
        if (MF.same(g, target.i)) return end(true);
        if (st.guesses.length >= MAX_G) return end(false);
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
      const ac = MF.autocomplete({ source: MF.playerSource((i) => MF.era(P[i])), onPick: (it) => guess(it.id), extra: h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => end(false) }, t('giveUp')) });
      board.appendChild(h('div', { class: 'bar' }, left, best, lvl === 'easy' ? h('span', { class: 'pill' }, MF.flag(target.nat), ' ' + MF.country(target.nat)) : null, ctx.timerEl));
      board.appendChild(ac);
      board.appendChild(list);
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
    renderDetail(d) { return MF.playerReveal(d.pi); },
  });
})();
