/* Jogo 6 — Pirâmide do atleta (ordenar 10 jogadores numa pirâmide 1-2-3-4) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const ROWS = [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9]];
  const UNIT = { gols: { pt: 'gols', en: 'goals', es: 'goles' }, jogos: { pt: 'jogos', en: 'caps', es: 'partidos' } };

  function categories() {
    if (MF._pyr) return MF._pyr;
    const { games, P } = MF.data;
    const out = [];
    for (const [title, unit, items] of games.pyramids) {
      out.push({ title: { pt: title, en: TR[title] ? TR[title][0] : title, es: TR[title] ? TR[title][1] : title }, unit: UNIT[unit] || { pt: unit, en: unit, es: unit }, items: items.map(([n, v]) => ({ n, v })) });
    }
    for (const [y, rows] of Object.entries(games.ballon)) {
      if (rows.some((r) => r[4] == null)) continue;
      const top = rows.slice(0, 10);
      const pct = +y >= 2010 && +y <= 2015;
      out.push({ title: { pt: 'Votação da Bola de Ouro ' + y, en: 'Ballon d’Or ' + y + ' voting', es: 'Votación del Balón de Oro ' + y },
        unit: pct ? { pt: '% dos votos', en: '% of votes', es: '% de los votos' } : { pt: 'pontos', en: 'points', es: 'puntos' },
        items: top.map((r) => ({ n: r[1], v: r[4] })) });
    }
    const byVer = {};
    for (const c of games.cards) (byVer[c[1]] = byVer[c[1]] || []).push(c);
    for (const [ver, cs] of Object.entries(byVer)) {
      const top = cs.filter((c) => c[2] >= 75).sort((a, b) => b[2] - a[2]).slice(0, 36);
      const pickO = MF.sample(top, 10, MF.rng('pyr-ovr:' + ver));
      out.push({ title: { pt: 'Geral no ' + MF.edition(+ver), en: 'Overall in ' + MF.edition(+ver), es: 'Media en ' + MF.edition(+ver) }, unit: { pt: 'geral', en: 'OVR', es: 'media' },
        items: uniq(pickO).map((c) => ({ n: P[c[0]].n, v: c[2] })) });
      const fast = cs.filter((c) => c[3] !== 'GK').sort((a, b) => b[7][0] - a[7][0]).slice(0, 30);
      const pickP = MF.sample(fast, 10, MF.rng('pyr-pac:' + ver));
      out.push({ title: { pt: 'Velocidade (RIT) no ' + MF.edition(+ver), en: 'Pace in ' + MF.edition(+ver), es: 'Ritmo en ' + MF.edition(+ver) }, unit: { pt: 'RIT', en: 'PAC', es: 'RIT' },
        items: uniq(pickP).map((c) => ({ n: P[c[0]].n, v: c[7][0] })) });
    }
    return (MF._pyr = out.filter((c) => c.items.length === 10));
  }
  const uniq = (cs) => { const s = new Set(); return cs.filter((c) => (s.has(c[0]) ? false : s.add(c[0]))); };
  const TR = {
    'Gols em Copas do Mundo': ['World Cup goals', 'Goles en Mundiales'],
    'Gols pela Seleção Brasileira': ['Goals for Brazil', 'Goles con Brasil'],
    'Jogos pela Seleção Brasileira': ['Caps for Brazil', 'Partidos con Brasil'],
    'Gols na história da Premier League': ['All-time Premier League goals', 'Goles históricos en la Premier League'],
    'Gols na história da La Liga': ['All-time La Liga goals', 'Goles históricos en LaLiga'],
    'Gols na história da Serie A': ['All-time Serie A goals', 'Goles históricos en la Serie A'],
  };

  MF.registerGame({
    num: 6, slug: 'piramide-do-atleta',
    rules: {
      pt: ['A categoria do dia aparece no topo (gols, votos da Bola de Ouro, notas do FIFA…).', 'Os 10 jogadores chegam um por vez. Toque numa casa vazia para colocá-lo: o 1º no topo, depois 2, 3 e 4 por fileira, da esquerda para a direita.', 'Para trocar, toque num jogador já colocado e depois na casa de destino. A Ajuda, uma vez por jogo, pinta de verde quem está no lugar certo e de vermelho quem está errado.', 'No modo fácil você vê em qual fileira cada jogador fica. Acertando 7 ou mais, vitória.'],
      en: ['Today’s category is at the top (goals, Ballon d’Or votes, FIFA ratings…).', 'The 10 players arrive one at a time. Tap an empty spot to place them: 1st at the top, then rows of 2, 3 and 4, left to right.', 'To swap, tap a placed player and then the target spot. Help, once per game, turns players in the right spot green and the wrong ones red.', 'In easy mode you see which row each player belongs to. Get 7 or more right to win.'],
      es: ['La categoría del día está arriba (goles, votos del Balón de Oro, medias de FIFA…).', 'Los 10 jugadores llegan de uno en uno. Toca una casilla vacía para colocarlo: el 1.º arriba, luego filas de 2, 3 y 4, de izquierda a derecha.', 'Para cambiar, toca un jugador colocado y luego la casilla de destino. La Ayuda, una vez por partida, pinta de verde a los bien colocados y de rojo a los mal colocados.', 'En modo fácil ves en qué fila va cada jugador. Con 7 o más aciertos, ganas.'],
    },
    options: [
      { key: 'mode', label: () => t('mode'), def: 'normal', choices: () => [{ v: 'easy', label: t('easy') }, { v: 'normal', label: t('normal') }] },
      MF.timerOpt([0, 120, 60]),
    ],
    preview() { return h('div', { class: 'pv-pyr' }, ROWS.map((r) => h('span', null, r.map(() => h('b'))))); },
    play(board, ctx) {
      const cats = categories();
      const cat = cats[MF.daily('g6-piramide', cats.length)];
      const st = ctx.state;
      const items = cat.items;
      const sorted = items.map((x, i) => i).sort((a, b) => items[b].v - items[a].v);
      const rankVal = sorted.map((i) => items[i].v);
      const queue = MF.shuffle(items.map((x, i) => i), MF.rng('pyr-ordem:' + MF.today()));
      st.slots = st.slots || Array(10).fill(null);
      st.help = st.help || false;
      let sel = null;
      const lang = MF.lang;
      const placed = () => st.slots.filter((x) => x != null).length;
      const current = () => queue.find((i) => !st.slots.includes(i));
      const tierOf = (i) => { const k = sorted.indexOf(i); return ROWS.findIndex((r) => r.includes(k)); };
      const correct = () => st.slots.reduce((n, it, k) => n + (it != null && items[it].v === rankVal[k] ? 1 : 0), 0);

      const pyr = h('div', { class: 'pyr' });
      const next = h('div', { class: 'pyr-next', 'aria-live': 'polite' });
      const helpBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { if (st.help) return; st.help = true; st.helpSnap = st.slots.slice(); ctx.save(); MF.toast(correct() + ' ' + t('correctCount')); paint(); } }, t('help'));
      const submit = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => end() }, t('submit'));
      function paint(pop) {
        const done = ctx.finished();
        MF.clear(pyr);
        ROWS.forEach((r) => {
          pyr.appendChild(h('div', { class: 'pyr-row' }, r.map((k) => {
            const it = st.slots[k];
            const right = done && it != null && items[it].v === rankVal[k];
            // Ajuda: pinta (verde/vermelho) os que estavam na pirâmide quando ela foi usada, enquanto não forem movidos
            const hinted = !done && st.helpSnap && it != null && st.helpSnap[k] === it;
            const hintCls = hinted ? (items[it].v === rankVal[k] ? ' ok' : ' bad') : '';
            return h('button', {
              type: 'button', class: 'pyr-slot' + (it != null ? ' filled' : '') + (sel === k ? ' sel' : '') + (done ? (right ? ' ok' : ' bad') : hintCls) + (pop === k ? ' pop' : ''),
              disabled: done, 'aria-label': (k + 1) + 'º ' + (it != null ? items[it].n : ''), onclick: () => tap(k),
            }, h('span', { class: 'pyr-k' }, k + 1), it != null ? h('span', { class: 'pyr-name' }, MF.photo(items[it].n, '', 24), items[it].n) : null,
              done && it != null ? h('span', { class: 'pyr-val' }, fmt(items[it].v)) : null);
          })));
        });
        MF.clear(next);
        const c = current();
        if (!done && c != null) {
          next.appendChild(h('span', { class: 'pyr-label' }, t('next')));
          next.appendChild(h('strong', { class: 'pyr-card pop' }, MF.photo(items[c].n, '', 40), items[c].n));
          if (st.opts.mode === 'easy') next.appendChild(h('span', { class: 'pill' }, t('tier') + ' ' + (tierOf(c) + 1)));
        }
        if (done) {
          next.appendChild(h('ol', { class: 'pyr-answer' }, sorted.map((i, k) => h('li', null, h('b', null, k + 1 + 'º'), ' ' + items[i].n + ' — ' + fmt(items[i].v)))));
        }
        submit.disabled = placed() < 10 || done;
        helpBtn.disabled = st.help || done;
      }
      const fmt = (v) => (Number.isInteger(v) ? v : v.toFixed(2)) + ' ' + (cat.unit[lang] || cat.unit.pt);
      function tap(k) {
        if (ctx.finished()) return;
        const it = st.slots[k];
        if (sel != null) {
          if (sel !== k) { const a = st.slots[sel]; st.slots[sel] = st.slots[k]; st.slots[k] = a; ctx.save(); }
          sel = null;
          return paint(k);
        }
        if (it == null) {
          const c = current();
          if (c == null) return;
          st.slots[k] = c;
          ctx.save();
          return paint(k);
        }
        sel = k;
        paint();
      }
      function end() {
        const n = correct();
        const line = ROWS.map((r) => r.map((k) => (st.slots[k] != null && items[st.slots[k]].v === rankVal[k] ? '🟩' : '🟥')).join('')).join('\n') + '\n' + n + '/10';
        st.scoreLabel = (cat.title[lang] || cat.title.pt) + ' · ' + n + '/10';
        ctx.finish(n >= 7, n, line);
        paint();
      }
      ctx.onTimeUp = () => end();
      board.appendChild(h('div', { class: 'bar' }, h('span', { class: 'cat-title' }, cat.title[lang] || cat.title.pt), ctx.timerEl));
      board.appendChild(h('div', { class: 'pyr-layout' }, pyr, h('div', { class: 'pyr-side' }, next, h('div', { class: 'row-btns' }, helpBtn, submit))));
      paint();
    },
  });
})();
