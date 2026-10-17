/* Jogo 6 — Pirâmide (ordenar 10 jogadores numa pirâmide 1-2-3-4)
   Desde o desafio nº 5 (16/10/2026) toda pergunta é um Top 10 de verdade (listas curadas com fonte, em games.json "tops"):
   artilharia só de seleções e clubes campeões de título importante, jogos pela seleção só das campeãs da Copa, e números
   (jogos, assistências, gols em competições) só de times e competições conhecidos; mais a artilharia de cada Copa e a votação
   da Bola de Ouro. A Ajuda (uma vez por partida) pinta de verde quem está no lugar certo e de vermelho quem está errado.
   categories() é a versão antiga, usada só até o desafio nº 4 (para não trocar a pergunta no meio do dia). */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const ROWS = [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9]];
  const U = {
    gols: { pt: 'gols', en: 'goals', es: 'goles' }, jogos: { pt: 'jogos', en: 'games', es: 'partidos' },
    mi: { pt: 'mi de €', en: '€m', es: 'M€' }, pts: { pt: 'pontos', en: 'points', es: 'puntos' }, pct: { pt: '% dos votos', en: '% of votes', es: '% de los votos' },
  };
  const BIG_NATS = ['Brazil', 'Argentina', 'France', 'Spain', 'England', 'Germany', 'Portugal', 'Italy', 'Netherlands', 'Belgium'];
  const MORE_NATS = ['Uruguay', 'Colombia', 'Croatia', 'Mexico', 'United States', 'Chile', 'Denmark', 'Sweden', 'Switzerland', 'Poland', 'Japan', 'Korea Republic',
    'Morocco', 'Senegal', 'Nigeria', 'Ghana', "Côte d'Ivoire", 'Cameroon', 'Egypt', 'Serbia', 'Turkey', 'Russia', 'Austria', 'Scotland', 'Wales', 'Republic of Ireland',
    'Norway', 'Czech Republic', 'Ecuador', 'Paraguay', 'Peru', 'Saudi Arabia', 'Australia', 'Ukraine', 'Greece'];
  const TR = {
    'Gols em Copas do Mundo': ['World Cup goals', 'Goles en Mundiales'], 'Gols pela Seleção Brasileira': ['Goals for Brazil', 'Goles con Brasil'],
    'Jogos pela Seleção Brasileira': ['Caps for Brazil', 'Partidos con Brasil'], 'Gols na história da Premier League': ['All-time Premier League goals', 'Goles históricos en la Premier League'],
    'Gols na história da La Liga': ['All-time La Liga goals', 'Goles históricos en LaLiga'], 'Gols na história da Serie A': ['All-time Serie A goals', 'Goles históricos en la Serie A'],
  };

  // ------------------------------------------------------------------ categorias (só a base principal: o desafio do dia é igual para todos)
  function categories() {
    if (MF._pyr2) return MF._pyr2;
    const { games, P } = MF.data;
    const core = P.slice(0, MF.CORE_N).filter(MF.era);
    const cats = [];
    const add = (c) => { if (c.items.filter((x) => x.v > 0).length >= 14 || c.fixed) cats.push(c); };
    const fame = (p) => (p ? p.r + (p.famous ? 6 : 0) + (p.legend ? 4 : 0) : 70);
    // artilharia de cada Copa
    for (const [y, rows] of Object.entries(games.wcg || {})) {
      const items = rows.map(([pi, n, nat, g]) => ({ n: pi >= 0 ? P[pi].n : n, pi, nat, v: g, f: pi >= 0 ? fame(P[pi]) : 72 }));
      add({ key: 'wcg' + y, lv: +y >= 2002 ? 0 : +y >= 1994 ? 1 : 2, title: { pt: 'Gols na Copa do Mundo de ' + y, en: 'Goals at the ' + y + ' World Cup', es: 'Goles en el Mundial ' + y }, unit: U.gols, items });
    }
    // gols e jogos em Copas (1990–2026)
    const wc = Object.entries(games.wcapp || {}).map(([i, list]) => ({ p: P[+i], g: list.reduce((s, x) => s + x[2], 0), j: list.reduce((s, x) => s + x[1], 0), n: list.length }));
    add({ key: 'wcgt', lv: 1, title: { pt: 'Gols em Copas do Mundo (1990–2026)', en: 'World Cup goals (1990–2026)', es: 'Goles en Mundiales (1990–2026)' }, unit: U.gols,
      items: wc.filter((x) => x.g > 0).map((x) => ({ n: x.p.n, pi: x.p.i, nat: x.p.nat, v: x.g, f: fame(x.p) })) });
    add({ key: 'wcjt', lv: 2, title: { pt: 'Jogos em Copas do Mundo (1990–2022)', en: 'World Cup matches (1990–2022)', es: 'Partidos en Mundiales (1990–2022)' }, unit: U.jogos,
      items: wc.filter((x) => x.j > 0).map((x) => ({ n: x.p.n, pi: x.p.i, nat: x.p.nat, v: x.j, f: fame(x.p) })) });
    // seleções (Transfermarkt)
    [...BIG_NATS, ...MORE_NATS].forEach((nat, k) => {
      const ps = core.filter((p) => p.nat === nat && !p.natGuess);
      const lv = k < BIG_NATS.length ? (k < 7 ? 0 : 1) : 2;
      add({ key: 'caps' + nat, lv, nat, title: { pt: () => 'Jogos pela seleção: ' + MF.country(nat), en: () => 'Caps for ' + nat, es: () => 'Partidos con ' + MF.country(nat) }, unit: U.jogos,
        items: ps.filter((p) => p.caps > 0).map((p) => ({ n: p.n, pi: p.i, nat, v: p.caps, f: fame(p) })) });
      add({ key: 'ng' + nat, lv: Math.min(3, lv + 1), nat, title: { pt: () => 'Gols pela seleção: ' + MF.country(nat), en: () => 'Goals for ' + nat, es: () => 'Goles con ' + MF.country(nat) }, unit: U.gols,
        items: ps.filter((p) => p.ng > 0).map((p) => ({ n: p.n, pi: p.i, nat, v: p.ng, f: fame(p) })) });
    });
    // mercado (Transfermarkt)
    add({ key: 'mv', lv: 0, title: { pt: 'Maior valor de mercado da carreira (Transfermarkt)', en: 'Career-high market value (Transfermarkt)', es: 'Mayor valor de mercado de su carrera (Transfermarkt)' }, unit: U.mi,
      items: core.filter((p) => p.mv >= 5).map((p) => ({ n: p.n, pi: p.i, nat: p.nat, v: p.mv, f: fame(p) })) });
    add({ key: 'fee', lv: 1, title: { pt: 'Maior transferência da carreira (Transfermarkt)', en: 'Biggest transfer fee of his career (Transfermarkt)', es: 'Traspaso más caro de su carrera (Transfermarkt)' }, unit: U.mi,
      items: core.filter((p) => p.fee >= 3).map((p) => ({ n: p.n, pi: p.i, nat: p.nat, v: p.fee, f: fame(p) })) });
    // Bola de Ouro
    for (const [y, rows] of Object.entries(games.ballon)) {
      if (rows.some((r) => r[4] == null)) continue;
      const pct = +y >= 2010 && +y <= 2015;
      const items = rows.slice(0, 10).map((r) => { const p = MF.resolvePlayer(r[1]); return { n: r[1], pi: p ? p.i : -1, nat: r[2], v: r[4], f: 99 }; });
      cats.push({ key: 'bo' + y, lv: +y >= 2008 ? 1 : 2, fixed: true, title: { pt: 'Votação da Bola de Ouro ' + y, en: 'Ballon d’Or ' + y + ' voting', es: 'Votación del Balón de Oro ' + y }, unit: pct ? U.pct : U.pts, items });
    }
    // recordes históricos curados (só os que têm 10 jogadores de 1990 em diante)
    for (const [title, unit, list] of games.pyramids || []) {
      const items = list.map(([n, v]) => { const p = MF.resolvePlayer(n); return { n, pi: p ? p.i : -1, v, f: 99, era: !p || MF.era(p) }; }).filter((x) => x.era);
      if (items.length >= 10) cats.push({ key: 'cur' + title, lv: 1, fixed: true, title: { pt: title, en: TR[title] ? TR[title][0] : title, es: TR[title] ? TR[title][1] : title }, unit: U[unit] || U.gols, items: items.slice(0, 10) });
    }
    return (MF._pyr2 = cats);
  }

  // ------------------------------------------------------------------ categorias Top 10 (a partir do desafio nº 5, 16/10/2026)
  // Toda pergunta é um Top 10 de verdade (sem sorteio de jogadores):
  // - seleção (jogos): só seleções campeãs da Copa do Mundo;
  // - artilharia: só clubes e seleções campeões de título importante (Copa, Champions, Europa League, Libertadores, Copa América, Eurocopa);
  // - números (jogos, assistências, gols em competições, mercado): só times e competições conhecidos.
  // Listas curadas em games.json "tops" (tools/tops.json, com a fonte e a data de cada uma).
  const U2 = { assist: { pt: 'assistências', en: 'assists', es: 'asistencias' } };
  function topCats() {
    if (MF._pyr3) return MF._pyr3;
    const { games, P } = MF.data;
    const cats = [];
    const linkP = (name, nat) => { const p = MF.resolvePlayer(name); return p && (!nat || p.nat === nat) ? p : null; };
    for (const c of games.tops || []) {
      const ck = c.club ? MF.norm(c.club) : null;
      const ci = ck ? (MF.data.clubs.find((x) => MF.norm(x.n) === ck) || {}).i : null;
      const items = c.it.map(([n, v, nat]) => {
        const na = nat || c.nat || '';
        let p = linkP(n, na);
        if (p && ci != null && !p.clubs.includes(ci)) p = null; // homônimo que nunca jogou no clube (ex.: Dida do Flamengo x goleiro Dida)
        return { n, v, nat: na, pi: p ? p.i : -1, ph: c.club ? na + ' ' + c.club : na };
      });
      cats.push({ key: 't-' + c.k, lv: c.lv, fixed: true, src: c.src, title: { pt: c.t[0], en: c.t[1], es: c.t[2] }, unit: U[c.u] || U2[c.u] || U.gols, items: items.slice(0, 10) });
    }
    // (mercado e transferências ficaram de fora: a base não tem todas as marcas, então não seria um Top 10 de verdade)
    // artilharia de cada Copa do Mundo (a Copa é título importante): Top 10 da edição
    for (const [y, rows] of Object.entries(games.wcg || {})) {
      const items = rows.slice().sort((a, b) => b[3] - a[3]).slice(0, 10).map(([pi, n, nat, g]) => ({ n: pi >= 0 ? P[pi].n : n, pi, nat, v: g }));
      if (items.length === 10) cats.push({ key: 't-wcg' + y, lv: +y >= 2002 ? 2 : 3, fixed: true, src: 'FIFA', unit: U.gols, items,
        title: { pt: 'Top 10: artilheiros da Copa do Mundo de ' + y, en: 'Top 10: top scorers at the ' + y + ' World Cup', es: 'Top 10: goleadores del Mundial ' + y } });
    }
    // votação da Bola de Ouro (o top 10 do ano)
    for (const [y, rows] of Object.entries(games.ballon)) {
      if (rows.some((r) => r[4] == null)) continue;
      const pct = +y >= 2010 && +y <= 2015;
      const items = rows.slice(0, 10).map((r) => { const p = linkP(r[1], r[2]); return { n: r[1], pi: p ? p.i : -1, nat: r[2], v: r[4] }; });
      cats.push({ key: 't-bo' + y, lv: +y >= 2008 ? 2 : 3, fixed: true, src: 'France Football', unit: pct ? U.pct : U.pts, items,
        title: { pt: 'Top 10: votação da Bola de Ouro ' + y, en: 'Top 10: Ballon d’Or ' + y + ' voting', es: 'Top 10: votación del Balón de Oro ' + y } });
    }
    return (MF._pyr3 = cats.filter((c) => c.items.length === 10));
  }
  // escolhe os 10 do dia conforme a dificuldade (determinístico)
  function pick(cat, lvl, rnd) {
    if (cat.fixed) return cat.items.slice(0, 10);
    const all = cat.items.filter((x) => x.v > 0);
    const byFame = all.slice().sort((a, b) => b.f - a.f);
    const N = { easy: 30, normal: 55, hard: 90, legend: 200 }[lvl];
    let pool = byFame.slice(0, Math.max(N, 14));
    const vals = pool.map((x) => x.v);
    const range = Math.max(...vals) - Math.min(...vals) || 1;
    for (let tries = 0; tries < 200; tries++) {
      let cand;
      if (lvl === 'legend') {
        // números colados: uma janela da lista ordenada por valor
        const sorted = pool.slice().sort((a, b) => b.v - a.v);
        // janela de valores próximos, mas com números diferentes entre si
        const byVal = [];
        for (const x of sorted) if (!byVal.length || byVal[byVal.length - 1][0].v !== x.v) byVal.push([x]); else byVal[byVal.length - 1].push(x);
        const start = Math.floor(rnd() * Math.max(1, byVal.length - 9));
        const win = byVal.slice(start, start + 9);
        cand = MF.shuffle(win.map((g) => MF.pick(g, rnd)), rnd);
        const extra = MF.shuffle([].concat(...win).filter((x) => !cand.includes(x)), rnd);
        cand = cand.concat(extra).slice(0, 10);
      } else cand = MF.sample(pool, 10, rnd);
      const vs = cand.map((x) => x.v).sort((a, b) => b - a);
      const gap = Math.min(...vs.slice(1).map((v, i) => vs[i] - v));
      const need = { easy: range * 0.025, normal: range * 0.01, hard: -1, legend: -1 }[lvl];
      const minDistinct = { easy: 10, normal: 10, hard: 8, legend: 7 }[lvl];
      if (new Set(cand.map((x) => x.n)).size < 10) continue;
      if (new Set(vs).size < minDistinct && tries < 190) continue;
      if (gap > need || tries > 150) return cand;
    }
    // reserva: os 10 de maior valor, um por valor
    const seen = new Set();
    return pool.slice().sort((a, b) => b.v - a.v).filter((x) => (seen.has(x.v) ? false : seen.add(x.v))).slice(0, 10);
  }

  MF.registerGame({
    num: 6, slug: 'piramide-do-atleta',
    rules: {
      pt: ['Cada pergunta é um Top 10 de verdade: maiores artilheiros de seleções e clubes campeões, mais jogos pela seleção (só campeãs da Copa), recordes da Champions, das Copas e das grandes ligas, Bola de Ouro… A fonte aparece embaixo da pergunta. Empate: quem tem o mesmo número vale em qualquer casa do grupo empatado (ex.: três com 3 gols nas casas 8, 9 e 10, em qualquer ordem); sem empate, só a posição exata conta.', 'Os 10 jogadores chegam um por vez. Toque numa casa vazia para colocá-lo: o 1º no topo, depois 2, 3 e 4 por fileira, da esquerda para a direita. Para trocar, toque num jogador já colocado e depois na casa de destino.', 'Ajuda: uma vez por partida, em qualquer dificuldade, pinta de verde quem está no lugar certo e de vermelho quem está errado.', 'Fácil: os Top 10 mais famosos (Seleção Brasileira, Real, Barça, Flamengo, Champions, Copas) e a fileira de cada um aparece; vence com 6 acertos. Normal: grandes clubes, seleções campeãs e grandes ligas; vence com 7. Difícil: recordes de jogos, Libertadores, Bola de Ouro e artilharia de cada Copa; vence com 8. Lendário: qualquer Top 10, inclusive Copas e Bolas de Ouro antigas, sem trocas; vence com 8.'],
      en: ['Every question is a real Top 10: all-time top scorers of title-winning nations and clubs, most caps (World Cup winners only), Champions League, World Cup and big-league records, Ballon d’Or… The source is shown under the question. Ties: players with the same number count in any spot of the tied group (e.g. three with 3 goals in spots 8, 9 and 10, any order); without a tie, only the exact spot counts.', 'The 10 players arrive one at a time. Tap an empty spot to place them: 1st at the top, then rows of 2, 3 and 4, left to right. To swap, tap a placed player and then the target spot.', 'Help: once per game, in any difficulty, turns players in the right spot green and the wrong ones red.', 'Easy: the most famous Top 10s (Brazil, Real, Barça, Flamengo, Champions League, World Cups) and each player’s row is shown; win with 6. Normal: big clubs, World Cup–winning nations and big leagues; win with 7. Hard: appearance records, Libertadores, Ballon d’Or and each World Cup’s scorers; win with 8. Legendary: any Top 10, including old World Cups and Ballon d’Or, no swaps; win with 8.'],
      es: ['Cada pregunta es un Top 10 de verdad: máximos goleadores de selecciones y clubes campeones, más partidos con la selección (solo campeonas del Mundial), récords de la Champions, de los Mundiales y de las grandes ligas, Balón de Oro… La fuente aparece bajo la pregunta. Empate: quienes tienen el mismo número valen en cualquier casilla del grupo empatado (ej.: tres con 3 goles en las casillas 8, 9 y 10, en cualquier orden); sin empate, solo cuenta la posición exacta.', 'Los 10 jugadores llegan de uno en uno. Toca una casilla vacía para colocarlo: el 1.º arriba, luego filas de 2, 3 y 4, de izquierda a derecha. Para cambiar, toca un jugador colocado y luego la casilla de destino.', 'Ayuda: una vez por partida, en cualquier dificultad, pinta de verde a los bien colocados y de rojo a los mal colocados.', 'Fácil: los Top 10 más famosos (Brasil, Real, Barça, Flamengo, Champions, Mundiales) y se muestra la fila de cada uno; ganas con 6. Normal: grandes clubes, selecciones campeonas y grandes ligas; ganas con 7. Difícil: récords de partidos, Libertadores, Balón de Oro y goleadores de cada Mundial; ganas con 8. Legendario: cualquier Top 10, incluso Mundiales y Balones de Oro antiguos, sin cambios; ganas con 8.'],
    },
    options: [MF.levelOpt(), MF.timerOpt([0, 120, 60])],
    preview() { return h('div', { class: 'pv-pyr' }, ROWS.map((r) => h('span', null, r.map(() => h('b'))))); },
    play(board, ctx) {
      const st = ctx.state;
      const lvl = MF.level(st);
      const LV = { easy: 0, normal: 1, hard: 2, legend: 3 }[lvl];
      const NEW = MF.isNew();
      const all = NEW ? topCats() : categories();
      // Fácil: categorias populares; cada nível sobe a régua (no Lendário vale qualquer uma)
      const distinct = (c) => new Set(c.items.map((x) => x.v)).size;
      const LVN = { easy: 0, normal: 1, hard: 2, legend: 3 };
      const inLv = NEW
        ? (c, l) => (l === 'legend' ? true : l === 'hard' ? c.lv === 1 || c.lv === 2 : c.lv <= LVN[l])
        : (c, l) => (l === 'legend' ? true : l === 'hard' ? c.lv >= 1 : c.lv <= LVN[l]);
      const catsFor = (l) => all.filter((c) => inLv(c, l) && (c.fixed || distinct(c) >= 10));
      const cat = MF.dailyPick(NEW ? 'g6-top10' : 'g6-pyr3', lvl, catsFor, (c) => c.key);
      const items = pick(cat, lvl, MF.rng('pyr2:' + MF.today() + ':' + lvl + ':' + cat.key));
      const sorted = items.map((x, i) => i).sort((a, b) => items[b].v - items[a].v);
      const rankVal = sorted.map((i) => items[i].v);
      const queue = MF.shuffle(items.map((x, i) => i), MF.rng('pyr-ordem:' + MF.today() + ':' + lvl));
      st.slots = st.slots || Array(10).fill(null);
      let sel = null;
      const WIN = { easy: 6, normal: 7, hard: 8, legend: 8 }[lvl];
      const lang = MF.lang;
      const title = (c) => { const x = c.title[lang] || c.title.pt; return typeof x === 'function' ? x() : x; };
      const placed = () => st.slots.filter((x) => x != null).length;
      const current = () => queue.find((i) => !st.slots.includes(i));
      // empate: quem tem o mesmo número pode ocupar qualquer casa do grupo empatado (pedido do usuário, 17/10/2026);
      // sem empate, só a casa exata vale
      const tieRange = (v) => [rankVal.indexOf(v), rankVal.lastIndexOf(v)];
      const rowOf = (k) => ROWS.findIndex((r) => r.includes(k)) + 1;
      const tierOf = (i) => { const [a, b] = tieRange(items[i].v); return rowOf(a) === rowOf(b) ? rowOf(a) : rowOf(a) + '–' + rowOf(b); };
      const posLabel = (v) => { const [a, b] = tieRange(v); return a === b ? a + 1 + 'º' : a + 1 + 'º–' + (b + 1) + 'º'; };
      MF._pyrLast = { cat, items, rankVal };
      const right = (k) => st.slots[k] != null && items[st.slots[k]].v === rankVal[k];
      const correct = () => st.slots.reduce((n, it, k) => n + (right(k) ? 1 : 0), 0);
      const fmt = (v) => (Number.isInteger(v) ? v : v.toFixed(v < 10 ? 2 : 1).replace(/\.0$/, '')) + ' ' + (cat.unit[lang] || cat.unit.pt);

      const pyr = h('div', { class: 'pyr' });
      const next = h('div', { class: 'pyr-next', 'aria-live': 'polite' });
      const helpBtn = h('button', { class: 'btn btn-ghost pyr-help', type: 'button', onclick: () => useHelp() });
      const submit = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => end() }, t('submit'));
      function useHelp() {
        if (st.help || ctx.finished()) return;
        if (!placed()) return MF.toast(t('pyrHelpEmpty'));
        st.help = true;
        st.helpSnap = st.slots.slice();
        ctx.save();
        MF.toast(correct() + ' ' + t('correctCount'));
        paint();
      }
      function paint(pop) {
        const done = ctx.finished();
        MF.clear(pyr);
        ROWS.forEach((r) => {
          pyr.appendChild(h('div', { class: 'pyr-row' }, r.map((k) => {
            const it = st.slots[k];
            // Ajuda: pinta quem estava na pirâmide quando foi usada, enquanto não for movido
            const hinted = !done && st.helpSnap && it != null && st.helpSnap[k] === it;
            const hintCls = hinted ? (right(k) ? ' ok' : ' bad') : '';
            return h('button', {
              type: 'button', class: 'pyr-slot' + (it != null ? ' filled' : '') + (sel === k ? ' sel' : '') + (done ? (right(k) ? ' ok' : ' bad') : hintCls) + (pop === k ? ' pop' : ''),
              disabled: done, 'aria-label': (k + 1) + 'º ' + (it != null ? items[it].n : ''), onclick: () => tap(k),
            }, h('span', { class: 'pyr-k' }, k + 1), it != null ? h('span', { class: 'pyr-name' }, MF.photo(items[it].n, items[it].ph || items[it].nat || '', 24), items[it].n) : null,
              done && it != null ? h('span', { class: 'pyr-val' }, fmt(items[it].v)) : null);
          })));
        });
        MF.clear(next);
        const c = current();
        if (!done && c != null) {
          next.appendChild(h('span', { class: 'pyr-label' }, t('next')));
          next.appendChild(h('strong', { class: 'pyr-card pop' }, MF.photo(items[c].n, items[c].ph || items[c].nat || '', 40), items[c].n, items[c].nat ? MF.flag(items[c].nat) : null));
          if (lvl === 'easy') next.appendChild(h('span', { class: 'pill' }, t('tier') + ' ' + tierOf(c)));
        }
        if (done) next.appendChild(h('ol', { class: 'pyr-answer' }, sorted.map((i) => h('li', null, h('b', null, posLabel(items[i].v)), ' ' + items[i].n + ' — ' + fmt(items[i].v)))));
        submit.disabled = placed() < 10 || done;
        helpBtn.disabled = st.help || done;
        MF.clear(helpBtn);
        helpBtn.appendChild(document.createTextNode(st.help ? t('helpUsed') : t('help') + ' (1)'));
      }
      function tap(k) {
        if (ctx.finished()) return;
        const it = st.slots[k];
        if (it != null && lvl === 'legend') return MF.toast(t('pyrNoSwap'));
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
        const line = ROWS.map((r) => r.map((k) => (right(k) ? '🟩' : '🟥')).join('')).join('\n') + '\n' + n + '/10';
        st.scoreLabel = title(cat) + ' · ' + n + '/10';
        ctx.finish(n >= WIN, n, line);
        paint();
      }
      ctx.onTimeUp = () => end();
      board.appendChild(h('div', { class: 'bar' }, h('span', { class: 'cat-title' }, title(cat)), h('span', { class: 'pill' }, t('winWith').replace('{n}', WIN)), ctx.timerEl));
      if (cat.src) board.appendChild(h('p', { class: 'pyr-src' }, (lang === 'en' ? 'Source: ' : lang === 'es' ? 'Fuente: ' : 'Fonte: ') + cat.src));
      board.appendChild(h('div', { class: 'pyr-layout' }, pyr, h('div', { class: 'pyr-side' }, next, h('div', { class: 'row-btns' }, helpBtn, submit))));
      paint();
    },
  });
  MF._pyrCats = categories; MF._pyrPick = pick; MF._pyrTop = topCats;
})();
