/* Jogo 6 — Pirâmide (ordenar 10 jogadores numa pirâmide 1-2-3-4)
   Categorias reais, sem notas de videogame: artilharia de cada Copa (1990–2026), gols e jogos em Copas, jogos e gols por seleção,
   maior valor de mercado e maior transferência (Transfermarkt), votação da Bola de Ouro e recordes históricos.
   A dificuldade muda a categoria e os jogadores: no Fácil, nomes muito conhecidos e números bem separados; no Lendário,
   jogadores menos óbvios e números colados. A Ajuda (uma vez por partida, em qualquer dificuldade) pinta de verde quem está
   no lugar certo e de vermelho quem está errado. */
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
      pt: ['A categoria do dia aparece no topo: gols numa Copa do Mundo, jogos ou gols pela seleção, maior valor de mercado ou transferência (Transfermarkt), votação da Bola de Ouro…', 'Os 10 jogadores chegam um por vez. Toque numa casa vazia para colocá-lo: o 1º no topo, depois 2, 3 e 4 por fileira, da esquerda para a direita. Para trocar, toque num jogador já colocado e depois na casa de destino.', 'Ajuda: uma vez por partida, em qualquer dificuldade, pinta de verde quem está no lugar certo e de vermelho quem está errado.', 'Fácil: jogadores muito conhecidos, números bem separados e a fileira de cada um aparece; vence com 6 acertos. Normal: vence com 7. Difícil: jogadores menos óbvios e números mais próximos; vence com 8. Lendário: números colados, sem trocas (cada jogador fica onde foi colocado); vence com 8.'],
      en: ['Today’s category is at the top: goals at a World Cup, caps or goals for a nation, highest market value or transfer fee (Transfermarkt), Ballon d’Or voting…', 'The 10 players arrive one at a time. Tap an empty spot to place them: 1st at the top, then rows of 2, 3 and 4, left to right. To swap, tap a placed player and then the target spot.', 'Help: once per game, in any difficulty, turns players in the right spot green and the wrong ones red.', 'Easy: very well-known players, values far apart and each player’s row is shown; win with 6 right. Normal: win with 7. Hard: less obvious players and closer values; win with 8. Legendary: very close values and no swaps; win with 8.'],
      es: ['La categoría del día está arriba: goles en un Mundial, partidos o goles con la selección, mayor valor de mercado o traspaso (Transfermarkt), votación del Balón de Oro…', 'Los 10 jugadores llegan de uno en uno. Toca una casilla vacía para colocarlo: el 1.º arriba, luego filas de 2, 3 y 4, de izquierda a derecha. Para cambiar, toca un jugador colocado y luego la casilla de destino.', 'Ayuda: una vez por partida, en cualquier dificultad, pinta de verde a los bien colocados y de rojo a los mal colocados.', 'Fácil: jugadores muy conocidos, números bien separados y se muestra la fila de cada uno; ganas con 6. Normal: ganas con 7. Difícil: jugadores menos obvios y números más cercanos; ganas con 8. Legendario: números muy pegados y sin cambios; ganas con 8.'],
    },
    options: [MF.levelOpt(), MF.timerOpt([0, 120, 60])],
    preview() { return h('div', { class: 'pv-pyr' }, ROWS.map((r) => h('span', null, r.map(() => h('b'))))); },
    play(board, ctx) {
      const st = ctx.state;
      const lvl = MF.level(st);
      const LV = { easy: 0, normal: 1, hard: 2, legend: 3 }[lvl];
      const all = categories();
      // Fácil: categorias populares; cada nível sobe a régua (no Lendário vale qualquer uma)
      const distinct = (c) => new Set(c.items.map((x) => x.v)).size;
      const LVN = { easy: 0, normal: 1, hard: 2, legend: 3 };
      const catsFor = (l) => all.filter((c) => (l === 'legend' ? true : l === 'hard' ? c.lv >= 1 : c.lv <= LVN[l]) && (c.fixed || distinct(c) >= 10));
      const cat = MF.dailyPick('g6-pyr3', lvl, catsFor, (c) => c.key);
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
      const tierOf = (i) => ROWS.findIndex((r) => r.includes(sorted.indexOf(i))) + 1;
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
            }, h('span', { class: 'pyr-k' }, k + 1), it != null ? h('span', { class: 'pyr-name' }, MF.photo(items[it].n, items[it].nat || '', 24), items[it].n) : null,
              done && it != null ? h('span', { class: 'pyr-val' }, fmt(items[it].v)) : null);
          })));
        });
        MF.clear(next);
        const c = current();
        if (!done && c != null) {
          next.appendChild(h('span', { class: 'pyr-label' }, t('next')));
          next.appendChild(h('strong', { class: 'pyr-card pop' }, MF.photo(items[c].n, items[c].nat || '', 40), items[c].n, items[c].nat ? MF.flag(items[c].nat) : null));
          if (lvl === 'easy') next.appendChild(h('span', { class: 'pill' }, t('tier') + ' ' + tierOf(c)));
        }
        if (done) next.appendChild(h('ol', { class: 'pyr-answer' }, sorted.map((i, k) => h('li', null, h('b', null, k + 1 + 'º'), ' ' + items[i].n + ' — ' + fmt(items[i].v)))));
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
      board.appendChild(h('div', { class: 'pyr-layout' }, pyr, h('div', { class: 'pyr-side' }, next, h('div', { class: 'row-btns' }, helpBtn, submit))));
      paint();
    },
  });
  MF._pyrCats = categories; MF._pyrPick = pick;
})();
