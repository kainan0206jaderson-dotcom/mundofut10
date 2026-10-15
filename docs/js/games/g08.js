/* Jogo 8 — Modo impostor (marque quem pertence à categoria)
   Categorias reais (nada de videogame): clubes, seleções, ligas, Copas do Mundo (gols e participações, 1990–2026),
   Bola de Ouro, títulos, marcas pela seleção e mercado (Transfermarkt). Só jogadores de 1990 para cá.
   A dificuldade escolhe a categoria e o quanto os impostores se parecem com os certos:
   no Fácil eles são bem diferentes; no Lendário são "quase": jogou a Copa mas não marcou, 11º da Bola de Ouro, 90 jogos pela seleção… */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const BIG_CLUBS = ['Real Madrid', 'Barcelona', 'Manchester United', 'Liverpool', 'Chelsea', 'Arsenal', 'Manchester City', 'Bayern de Munique', 'Juventus', 'Milan',
    'Inter de Milão', 'Paris Saint-Germain', 'Atlético de Madrid', 'Borussia Dortmund', 'Flamengo', 'Palmeiras', 'Corinthians', 'São Paulo', 'Santos', 'Boca Juniors', 'River Plate'];
  const BIG_NATS = ['Brazil', 'Argentina', 'France', 'Spain', 'Germany', 'England', 'Portugal', 'Italy', 'Netherlands'];
  const NOTABLE = { easy: 84, normal: 80, hard: 77, legend: 74 };
  const lab = (pt, en, es) => ({ pt, en, es });

  function categories() {
    if (MF._imp2) return MF._imp2;
    const { P, clubs, byClub, leagues, games } = MF.data;
    const core = P.slice(0, MF.CORE_N).filter((p) => MF.era(p) && p.r >= 74);
    const cats = [];
    const ofClub = (c) => (p) => p.clubs.includes(c);
    // clubes
    const cnt = new Map();
    for (const p of core) if (p.r >= 80) for (const c of p.clubs) cnt.set(c, (cnt.get(c) || 0) + 1);
    for (const [c, n] of cnt) {
      if (n < 10) continue;
      const big = BIG_CLUBS.includes(clubs[c].n);
      cats.push({ key: 'c' + c, clubs: [c], lv: big ? 0 : n >= 25 ? 1 : 2, label: lab('Jogou no ' + clubs[c].n, 'Played for ' + clubs[c].n, 'Jugó en el ' + clubs[c].n), test: ofClub(c),
        near: (p) => p.leagues.includes(clubs[c].l) });
    }
    // dois clubes
    const bigIdx = clubs.filter((c) => BIG_CLUBS.includes(c.n)).map((c) => c.i);
    for (let a = 0; a < bigIdx.length; a++) for (let b = a + 1; b < bigIdx.length; b++) {
      const A = bigIdx[a], B = bigIdx[b];
      const n = core.filter((p) => p.clubs.includes(A) && p.clubs.includes(B)).length;
      if (n >= 6) cats.push({ key: 'cc' + A + '-' + B, clubs: [A, B], lv: 2, label: lab('Jogou no ' + clubs[A].n + ' e no ' + clubs[B].n, 'Played for ' + clubs[A].n + ' and ' + clubs[B].n, 'Jugó en el ' + clubs[A].n + ' y el ' + clubs[B].n),
        test: (p) => p.clubs.includes(A) && p.clubs.includes(B), near: (p) => p.clubs.includes(A) || p.clubs.includes(B) });
    }
    // seleções
    const nats = new Map();
    for (const p of core) if (!p.natGuess) nats.set(p.nat, (nats.get(p.nat) || 0) + 1);
    for (const [n, k] of nats) if (k >= 12) cats.push({ key: 'n' + n, lv: BIG_NATS.includes(n) ? 0 : 1, label: { pt: () => 'Seleção: ' + MF.country(n), en: () => 'Nation: ' + n, es: () => 'Selección: ' + MF.country(n) },
      test: (p) => p.nat === n, near: (p) => p.leagues.some((l) => core.some((q) => q.nat === n && q.leagues.includes(l))) });
    // ligas
    for (const [lid, name] of Object.entries(leagues)) {
      const l = +lid;
      const k = core.filter((p) => p.leagues.includes(l)).length;
      if (k >= 40 && k <= core.length * 0.7) cats.push({ key: 'l' + l, lv: [13, 53, 31, 19, 16, 7].includes(l) ? 1 : 2, label: lab('Jogou na ' + name, 'Played in the ' + name, 'Jugó en la ' + name), test: (p) => p.leagues.includes(l) || p.leagues.includes(lid) });
    }
    // Copas do Mundo
    const app = new Map(Object.entries(games.wcapp || {}).map(([i, l]) => [+i, l]));
    const years = [...new Set([].concat(...[...app.values()].map((l) => l.map((x) => x[0]))))].sort();
    for (const y of years) {
      const played = (p) => (app.get(p.i) || []).some((x) => x[0] === y);
      const scored = (p) => (app.get(p.i) || []).some((x) => x[0] === y && x[2] > 0);
      if (core.filter(scored).length >= 8) cats.push({ key: 'wg' + y, lv: y >= 2002 ? 1 : 2, label: lab('Fez gol na Copa de ' + y, 'Scored at the ' + y + ' World Cup', 'Marcó en el Mundial ' + y), test: scored, near: played });
      if (y <= 2022 && core.filter(played).length >= 25) cats.push({ key: 'wp' + y, lv: 1, label: lab('Jogou a Copa de ' + y, 'Played at the ' + y + ' World Cup', 'Jugó el Mundial ' + y), test: played,
        near: (p) => (app.get(p.i) || []).some((x) => Math.abs(x[0] - y) === 4) });
    }
    const nCups = (p) => (app.get(p.i) || []).length;
    cats.push({ key: 'w3', lv: 2, label: lab('Jogou 3 Copas do Mundo ou mais (desde 1990)', 'Played 3+ World Cups (since 1990)', 'Jugó 3 Mundiales o más (desde 1990)'), test: (p) => nCups(p) >= 3, near: (p) => nCups(p) === 2 });
    cats.push({ key: 'wgany', lv: 0, label: lab('Fez gol em Copa do Mundo (1990–2026)', 'Scored at a World Cup (1990–2026)', 'Marcó en un Mundial (1990–2026)'), test: (p) => (app.get(p.i) || []).some((x) => x[2] > 0), near: (p) => nCups(p) > 0 });
    // Bola de Ouro
    for (const [y, rows] of Object.entries(games.ballon)) {
      const ids = new Set(rows.slice(0, 10).map((r) => { const p = MF.resolvePlayer(r[1]); return p ? p.i : -1; }));
      const nearIds = new Set();
      for (const yy of [+y - 1, +y + 1]) (games.ballon[yy] || []).forEach((r) => { const p = MF.resolvePlayer(r[1]); if (p && !ids.has(p.i)) nearIds.add(p.i); });
      if (ids.size >= 8) cats.push({ key: 'bo' + y, lv: +y >= 2005 ? 2 : 3, label: lab('Top 10 da Bola de Ouro ' + y, 'Ballon d’Or ' + y + ' top 10', 'Top 10 del Balón de Oro ' + y), test: (p) => ids.has(p.i), near: (p) => nearIds.has(p.i) || p.bo });
    }
    cats.push({ key: 'bow', lv: 0, label: lab('Venceu a Bola de Ouro', 'Won the Ballon d’Or', 'Ganó el Balón de Oro'), test: (p) => p.bow, near: (p) => p.bo });
    cats.push({ key: 'bo', lv: 1, label: lab('Ficou no top 10 da Bola de Ouro (1990–2025)', 'Ballon d’Or top 10 (1990–2025)', 'Top 10 del Balón de Oro (1990–2025)'), test: (p) => p.bo, near: (p) => p.r >= 86 });
    // títulos
    cats.push({ key: 'wc', lv: 1, label: lab('Campeão da Copa do Mundo (1994–2026)', 'World Cup winner (1994–2026)', 'Campeón del Mundial (1994–2026)'), test: (p) => p.wc, near: (p) => nCups(p) > 0 });
    cats.push({ key: 'lib', lv: 2, label: lab('Campeão da Libertadores', 'Copa Libertadores winner', 'Campeón de la Libertadores'), test: (p) => p.lib, near: (p) => p.leagues.includes(7) || p.leagues.includes(353) });
    cats.push({ key: 'euro', lv: 2, label: lab('Campeão da Eurocopa', 'Euro winner', 'Campeón de la Eurocopa'), test: (p) => p.euro, near: (p) => ['Spain', 'France', 'Italy', 'Portugal', 'Germany', 'Greece', 'Denmark', 'Netherlands'].includes(p.nat) });
    // seleção e mercado (Transfermarkt)
    cats.push({ key: 'c100', lv: 1, label: lab('100 jogos ou mais pela seleção', '100+ caps', '100 partidos o más con la selección'), test: (p) => p.caps >= 100, near: (p) => p.caps >= 65 && p.caps < 100 });
    cats.push({ key: 'g40', lv: 2, label: lab('40 gols ou mais pela seleção', '40+ international goals', '40 goles o más con la selección'), test: (p) => p.ng >= 40, near: (p) => p.ng >= 22 && p.ng < 40 });
    cats.push({ key: 'mv100', lv: 1, label: lab('Já valeu €100 mi ou mais (Transfermarkt)', 'Market value of €100m+ (Transfermarkt)', 'Llegó a valer €100M o más (Transfermarkt)'), test: (p) => p.mv >= 100, near: (p) => p.mv >= 60 && p.mv < 100 });
    cats.push({ key: 'fee50', lv: 2, label: lab('Foi vendido por €50 mi ou mais', 'Sold for €50m or more', 'Vendido por €50M o más'), test: (p) => p.fee >= 50, near: (p) => p.fee >= 25 && p.fee < 50 });
    // posição
    cats.push({ key: 'gk', lv: 0, label: lab('Goleiros', 'Goalkeepers', 'Porteros'), test: (p) => p.pos === 'GK', near: () => true });
    cats.push({ key: 'cb', lv: 1, label: lab('Zagueiros', 'Centre-backs', 'Centrales'), test: (p) => p.pos === 'CB', near: (p) => ['LB', 'RB', 'CDM'].includes(p.pos) });
    return (MF._imp2 = { cats, core });
  }
  const labelOf = (c) => { const l = c.label[MF.lang] || c.label.pt; return typeof l === 'function' ? l() : l; };

  MF.registerGame({
    num: 8, slug: 'modo-impostor',
    rules: {
      pt: ['A categoria do dia fica no centro e 10 jogadores aparecem em volta (só jogadores de 1990 para cá).', 'Marque todos que pertencem à categoria. Quem não pertence é impostor. Categorias: clubes, seleções, ligas, gols e participações em Copas do Mundo, Bola de Ouro, títulos, marcas pela seleção e valores do Transfermarkt.', 'Ajuda: uma vez por partida, revela um impostor.', 'Fácil: craques conhecidos, clubes famosos, categorias amplas e impostores bem diferentes. Normal: jogadores conhecidos das principais ligas, clubes famosos e campeões da Champions, impostores da mesma geração. Difícil: jogadores das principais ligas e lendas, campeões europeus e clubes da 1ª divisão, impostores parecidos. Lendário: impostores "quase" (jogou a Copa mas não marcou, ficou fora do top 10, chegou perto da marca).', 'Estilo Normal: marque todos e confirme. Um por um: cada toque vale, e um impostor encerra o jogo.'],
      en: ['Today’s category is in the middle with 10 players around it (only players from 1990 on).', 'Pick everyone who fits the category. Those who don’t are impostors. Categories: clubs, nations, leagues, World Cup goals and appearances, Ballon d’Or, titles, international records and Transfermarkt values.', 'Help: once per game, reveals one impostor.', 'Easy: famous players and clubs, broad categories and very different impostors. Normal: well-known top-league players, famous clubs and Champions League winners, impostors from the same generation. Hard: top-league players and legends, European winners and top-flight clubs, similar impostors. Legendary: "nearly" impostors (played the World Cup but didn’t score, just outside the top 10, close to the mark).', 'Normal style: pick them all and confirm. One by one: every tap counts and one impostor ends the game.'],
      es: ['La categoría del día está en el centro con 10 jugadores alrededor (solo jugadores de 1990 en adelante).', 'Marca a todos los que encajan en la categoría. Los que no, son impostores. Categorías: clubes, selecciones, ligas, goles y participaciones en Mundiales, Balón de Oro, títulos, marcas con la selección y valores de Transfermarkt.', 'Ayuda: una vez por partida, revela un impostor.', 'Fácil: cracks y clubes famosos, categorías amplias e impostores muy distintos. Normal: jugadores conocidos de las grandes ligas, clubes famosos y campeones de la Champions, impostores de la misma generación. Difícil: jugadores de las grandes ligas y leyendas, campeones europeos y clubes de primera, impostores parecidos. Legendario: impostores "casi" (jugó el Mundial pero no marcó, se quedó fuera del top 10, rozó la marca).', 'Estilo Normal: márcalos todos y confirma. Uno a uno: cada toque cuenta y un impostor termina el juego.'],
    },
    options: [
      MF.levelOpt(),
      { key: 'style', label: () => t('style'), def: 'normal', choices: () => [{ v: 'normal', label: t('normal') }, { v: 'one', label: t('oneByOne') }] },
      MF.timerOpt([0, 60, 40]),
    ],
    preview() { return h('div', { class: 'pv-imp' }, Array.from({ length: 6 }, (_, i) => h('b', { class: i === 2 ? 'bad' : '' }))); },
    play(board, ctx) {
      const st = ctx.state;
      const lvl = MF.level(st);
      const { cats, core } = categories();
      // a partir de 16/10/2026: jogadores e clubes das categorias seguem o critério do nível (Lendário mantém a base)
      const NEW = MF.isNew();
      const NFor = (l) => (NEW && l !== 'legend' ? core.filter((p) => MF.playerOk(l, p)) : core.filter((p) => p.r >= NOTABLE[l] || (l !== 'easy' && p.famous)));
      const N = NFor(lvl);
      const LVLS = { easy: [0], normal: [0, 1], hard: [1, 2], legend: [2, 3] };
      const clubsOk = (c, l) => !NEW || l === 'legend' || !c.clubs || c.clubs.every((x) => MF.clubOk(l, x));
      const okFor = (l) => { const n = NFor(l); return cats.filter((c) => LVLS[l].includes(c.lv) && clubsOk(c, l) && n.filter(c.test).length >= 6 && n.filter((p) => !c.test(p)).length >= 10); };
      const cat = MF.dailyPick(NEW ? 'g8-imp4' : 'g8-imp3', lvl, okFor, (c) => c.key);
      const rnd = MF.rng('imp2:' + MF.today() + ':' + lvl);
      const ins = N.filter(cat.test).sort((a, b) => b.r - a.r);
      const outs = N.filter((p) => !cat.test(p));
      const k = 4 + Math.floor(rnd() * 3);
      const topN = { easy: 18, normal: 35, hard: 60, legend: 120 }[lvl];
      const good = MF.sample(ins.slice(0, Math.max(topN, k)), k, rnd);
      // impostores: quanto mais difícil, mais parecidos com os certos
      const era = good.reduce((s, p) => s + (p.born || 1990), 0) / good.length;
      const sameEra = (p) => Math.abs((p.born || 1990) - era) <= 8;
      const similar = (p) => good.some((g) => g.nat === p.nat || g.leagues.some((l) => p.leagues.includes(l)));
      let src;
      if (lvl === 'easy') src = outs.filter((p) => !similar(p) || p.famous);
      else if (lvl === 'normal') src = outs.filter(sameEra);
      else if (lvl === 'hard') src = outs.filter((p) => sameEra(p) && (similar(p) || (cat.near && cat.near(p))));
      else src = outs.filter((p) => cat.near && cat.near(p));
      if (src.length < 10 - k) src = outs.filter(sameEra);
      if (src.length < 10 - k) src = outs;
      const bad = MF.sample(src.sort((a, b) => b.r - a.r).slice(0, lvl === 'easy' ? 40 : 80), 10 - k, rnd);
      const ring = MF.shuffle([...good, ...bad], rnd).map((p) => p.i);
      const goodSet = new Set(good.map((p) => p.i));
      st.sel = st.sel || [];
      const one = st.opts.style === 'one';

      const wrap = h('div', { class: 'imp' });
      const confirm = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => end() }, t('confirm'));
      const counter = h('span', { class: 'pill' });
      function paint(pop) {
        const done = ctx.finished();
        MF.clear(wrap);
        wrap.appendChild(h('div', { class: 'imp-center' }, h('span', null, labelOf(cat))));
        ring.forEach((i, n) => {
          const p = MF.data.P[i];
          const on = st.sel.includes(i);
          const isGood = goodSet.has(i);
          const shown = !done && !on && st.helpImp === i; // impostor revelado pela ajuda
          const cls = 'imp-p' + (on ? ' on' : '') + (done ? (isGood ? ' good' : ' imp-bad') : one && on ? (isGood ? ' good' : ' imp-bad') : '') + (shown ? ' imp-shown' : '') + (pop === i ? ' pop' : '');
          const ang = (n / ring.length) * Math.PI * 2 - Math.PI / 2;
          wrap.appendChild(h('button', {
            type: 'button', class: cls, style: { '--x': (50 + 41 * Math.cos(ang)).toFixed(2) + '%', '--y': (50 + 41 * Math.sin(ang)).toFixed(2) + '%' },
            'aria-pressed': on ? 'true' : 'false', disabled: done || (one && on) || shown, onclick: () => tap(i),
          }, (done || on || lvl === 'easy') ? MF.photo(p.n, p.nat, 30) : null, h('span', null, p.n)));
        });
        counter.textContent = st.sel.length + ' ' + t('selected');
        confirm.hidden = one || done;
      }
      function tap(i) {
        if (ctx.finished()) return;
        if (one) {
          st.sel.push(i);
          ctx.save();
          if (!goodSet.has(i)) { MF.toast(t('impostorHit'), 'bad'); MF.anim(wrap, 'shake'); return end(); }
          paint(i);
          if (good.every((g) => st.sel.includes(g.i))) end();
          return;
        }
        st.sel = st.sel.includes(i) ? st.sel.filter((x) => x !== i) : st.sel.concat(i);
        ctx.save();
        paint(i);
      }
      function end() {
        const hits = st.sel.filter((i) => goodSet.has(i)).length;
        const wrongs = st.sel.filter((i) => !goodSet.has(i)).length;
        const win = wrongs === 0 && hits === good.length;
        const line = ring.map((i) => (goodSet.has(i) ? (st.sel.includes(i) ? '🟩' : '⬜') : st.sel.includes(i) ? '🟥' : '⬛')).join('') + '\n' + hits + '/' + good.length;
        st.scoreLabel = labelOf(cat) + ' · ' + hits + '/' + good.length;
        ctx.finish(win, hits, line);
        paint();
        helpBtn.refresh();
      }
      ctx.onTimeUp = () => end();
      // ajuda única: revela (e tira do jogo) um impostor que ainda não foi marcado
      const helpBtn = MF.helpButton(ctx, () => {
        const imp = ring.find((i) => !goodSet.has(i) && !st.sel.includes(i));
        if (imp == null) return false;
        st.helpImp = imp;
        paint();
        return MF.ht('impostor');
      });
      board.appendChild(h('div', { class: 'bar' }, counter, lvl === 'easy' ? h('span', { class: 'pill' }, good.length + ' ' + t('impCount')) : null, ctx.timerEl));
      board.appendChild(wrap);
      board.appendChild(h('div', { class: 'row-btns center' }, helpBtn, confirm));
      board.appendChild(helpBtn.note);
      paint();
    },
  });
  MF._impCats = categories;
})();
