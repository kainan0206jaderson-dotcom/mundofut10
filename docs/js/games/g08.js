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

  function coreList() {
    if (!MF._impCore) MF._impCore = MF.data.P.slice(0, MF.CORE_N).filter((p) => MF.era(p) && p.r >= 74);
    return MF._impCore;
  }
  function categories() {
    if (MF._imp2) return MF._imp2;
    const { P, clubs, byClub, leagues, games } = MF.data;
    const core = coreList();
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
      if (k < 40 || k > core.length * 0.7) continue;
      // impostor plausível (desde 18/10): jogou em outra liga ao lado de quem jogou nesta (mesmas seleções mais comuns)
      const nc = new Map(); core.forEach((p) => { if (p.leagues.includes(l)) nc.set(p.nat, (nc.get(p.nat) || 0) + 1); });
      const topNat = new Set([...nc].sort((x, y) => y[1] - x[1]).slice(0, 4).map((x) => x[0]));
      cats.push({ key: 'l' + l, lv: [13, 53, 31, 19, 16, 7].includes(l) ? 1 : 2, label: lab('Jogou na ' + name, 'Played in the ' + name, 'Jugó en la ' + name), test: (p) => p.leagues.includes(l) || p.leagues.includes(lid),
        near: (p) => topNat.has(p.nat) });
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
    // valor de mercado e venda saíram em 18/10/2026: a base não tem todas as marcas (faltavam Neymar 222, Mbappé 180…)
    if (MF.today() < 6) cats.push({ key: 'mv100', lv: 1, label: lab('Já valeu €100 mi ou mais (Transfermarkt)', 'Market value of €100m+ (Transfermarkt)', 'Llegó a valer €100M o más (Transfermarkt)'), test: (p) => p.mv >= 100, near: (p) => p.mv >= 60 && p.mv < 100 });
    if (MF.today() < 6) cats.push({ key: 'fee50', lv: 2, label: lab('Foi vendido por €50 mi ou mais', 'Sold for €50m or more', 'Vendido por €50M o más'), test: (p) => p.fee >= 50, near: (p) => p.fee >= 25 && p.fee < 50 });
    // posição
    cats.push({ key: 'gk', lv: 0, label: lab('Goleiros', 'Goalkeepers', 'Porteros'), test: (p) => p.pos === 'GK', near: () => true });
    cats.push({ key: 'cb', lv: 1, label: lab('Zagueiros', 'Centre-backs', 'Centrales'), test: (p) => p.pos === 'CB', near: (p) => ['LB', 'RB', 'CDM'].includes(p.pos) });
    return (MF._imp2 = { cats, core });
  }

  // ------------------------------------------------------------------ perguntas de números (desde 16/10/2026)
  // Pedido do usuário: o impostor gira em torno de marcas reais — mais jogos/gols em competições, temporadas de 50 gols,
  // artilheiros de liga, Chuteira de Ouro, Copas, Bola de Ouro, títulos… (estilo Futbol11). Fontes:
  // games.json "tops" (Top 10 curados da Pirâmide), "imp" (tools/impostor.json), "wcg" (gols por Copa) e "ballon".
  // Quem não está na lista é impostor; no fim aparece a ordem real com os números.
  const ATT = ['ST', 'CF', 'LW', 'RW', 'CAM', 'LM', 'RM'];
  function statCats() {
    if (MF._imp5) return MF._imp5;
    const { P, clubs, games } = MF.data;
    const core = coreList();
    const coreSet = new Set(core.map((p) => p.i));
    const res = (n, nat) => { const p = MF.resolvePlayer(n); return p && (!nat || p.nat === nat) ? p : null; };
    const clubIdx = (name) => { const k = MF.norm(name); const c = clubs.find((x) => MF.norm(x.n) === k); return c ? c.i : -1; };
    const out = [];
    // nome da lista que não casou com a base: ninguém com esse sobrenome vira impostor (ex.: grafia diferente na base)
    const sur = (n) => { const w = MF.norm(n).split(/\s+/).filter((x) => x.length > 2); return w[w.length - 1] || MF.norm(n); };
    const byWord = new Map();
    for (const p of core) for (const k of p.keys) for (const w of k.split(/\s+/)) { if (!byWord.has(w)) byWord.set(w, new Set()); byWord.get(w).add(p.i); }
    const lookalikes = (names) => { const out = new Set(); names.forEach((n) => (byWord.get(sur(n)) || []).forEach((i) => out.add(i))); return [...out]; };
    const add = (c) => {
      c.members = new Set(c.order.map((o) => o.pi).filter((i) => i >= 0));
      c.avoid = c.avoid || new Set();
      lookalikes(c.order.filter((o) => o.pi < 0).map((o) => o.n)).forEach((i) => { if (!c.members.has(i)) c.avoid.add(i); });
      c.test = (p) => c.members.has(p.i);
      c.inCore = [...c.members].filter((i) => coreSet.has(i)).length;
      if (c.inCore >= 4) out.push(c);
    };
    const nearOf = (spec) => {
      const n = [];
      if (spec.att) n.push((p) => ATT.includes(p.pos));
      if (spec.league != null) n.push((p) => p.leagues.includes(spec.league) || p.leagues.includes(String(spec.league)));
      if (spec.nat) n.push((p) => p.nat === spec.nat);
      if (spec.club >= 0) n.push((p) => p.clubs.includes(spec.club));
      if (spec.ids) n.push((p) => spec.ids.has(p.i));
      if (spec.sa) n.push((p) => ['Brazil', 'Argentina', 'Uruguay', 'Colombia'].includes(p.nat));
      return n.length ? (p) => n.every((f) => f(p)) || (spec.ids && spec.ids.has(p.i)) : null;
    };
    const LG = { pl: 13, ll: 53, sa: 31, bl: 19 };
    // 1) Top 10 curados (seleções, clubes e competições)
    for (const c of games.tops || []) {
      const ci = c.club ? clubIdx(c.club) : -1;
      // lista de clube: só vale o jogador que passou pelo clube (ex.: o Dida artilheiro do Flamengo não é o goleiro Dida)
      const order = c.it.map(([n, v, nat], k) => { let p = res(n, nat || c.nat); if (p && ci >= 0 && !p.clubs.includes(ci)) p = null; return { pi: p ? p.i : -1, n, v, pos: k + 1 }; });
      const lg = (c.k.match(/^x-(pl|ll|sa|bl)/) || [])[1];
      add({ key: 's-' + c.k, lv: c.lv, label: { pt: c.t[0], en: c.t[1], es: c.t[2] }, src: c.src, unit: c.u, order,
        near: nearOf({ nat: c.nat, club: ci, att: c.u === 'gols', league: lg ? LG[lg] : null }) });
    }
    // 2) listas do impostor (temporadas, artilharias de liga, Chuteira de Ouro, títulos)
    for (const c of games.imp || []) {
      const order = c.it.map((n, k) => { const p = res(n); return { pi: p ? p.i : -1, n, pos: k + 1 }; });
      const nearIds = new Set((c.near_it || []).map((n) => { const p = res(n); return p ? p.i : -1; }));
      const avoid = new Set((c.avoid || []).map((n) => { const p = res(n); return p ? p.i : -1; }));
      add({ key: 's-' + c.k, lv: c.lv, label: { pt: c.t[0], en: c.t[1], es: c.t[2] }, src: c.src, order, avoid, unordered: true,
        near: nearOf({ att: c.near === 'att', league: c.league, ids: nearIds.size ? nearIds : null, sa: c.near === 'sa' }) });
    }
    // 3) Copas do Mundo: Top 10 de artilheiros de cada edição, artilheiros de Copa e quem fez 5+ gols numa Copa
    const wcRow = (y, r) => { const p = r[0] >= 0 ? P[r[0]] : res(r[1], r[2]); return { pi: p ? p.i : -1, n: p ? p.n : r[1], v: r[3], y }; };
    const tops = [], five = [];
    for (const [y, rows] of Object.entries(games.wcg || {})) {
      const all = rows.map((r) => wcRow(+y, r)).sort((a, b) => b.v - a.v);
      if (!all.length) continue;
      all.filter((x) => x.v === all[0].v).forEach((x) => tops.push(x));
      all.filter((x) => x.v >= 5).forEach((x) => five.push(x));
      if (+y >= 1990) {
        const t10 = all.slice(0, 10).map((x, k) => ({ ...x, pos: k + 1 }));
        // impostor plausível: atacante que jogou ESSA Copa (desde 18/10/2026; antes, qualquer atacante)
        const inCup = new Set(Object.entries(games.wcapp || {}).filter(([, l]) => l.some((x) => x[0] === +y)).map(([i]) => +i));
        const attNear = nearOf({ att: true });
        add({ key: 's-wcg' + y, lv: +y >= 2014 ? 0 : +y >= 2002 ? 1 : 2, unit: 'gols', order: t10, near: MF.today() >= 6 ? (p) => attNear(p) && inCup.has(p.i) : attNear, src: 'FIFA',
          label: lab('Top 10: artilheiros da Copa do Mundo de ' + y, 'Top 10: top scorers at the ' + y + ' World Cup', 'Top 10: goleadores del Mundial ' + y) });
      }
    }
    const recent = (l) => l.filter((x) => x.y >= 1990).sort((a, b) => b.y - a.y);
    add({ key: 's-wctop', lv: 0, unit: 'gols', order: recent(tops), near: nearOf({ att: true }), src: 'FIFA', unordered: true,
      label: lab('Foram artilheiros de uma Copa do Mundo (1990–2026)', 'Top scorer at a World Cup (1990–2026)', 'Fueron máximos goleadores de un Mundial (1990–2026)') });
    add({ key: 's-wc5', lv: 1, unit: 'gols', order: recent(five), near: nearOf({ att: true }), src: 'FIFA', unordered: true,
      label: lab('Fizeram 5 gols ou mais numa mesma Copa do Mundo (1990–2026)', 'Scored 5+ goals at a single World Cup (1990–2026)', 'Marcaron 5 goles o más en un mismo Mundial (1990–2026)') });
    // 4) Bola de Ouro: Top 10 de cada ano (na ordem da votação) e pódio
    const pod = [], boY = {};
    for (const [y, rows] of Object.entries(games.ballon || {})) boY[y] = rows.slice(0, 10).map((r) => { const p = res(r[1], r[2]); return { pi: p ? p.i : -1, n: r[1], pos: r[0], y: +y }; });
    for (const [y, order] of Object.entries(boY)) {
      order.filter((o) => o.pos <= 3).forEach((o) => pod.push(o));
      // um ano sim, outro não (desde 2005) e a cada 4 anos antes disso, para a Bola de Ouro não tomar conta do Difícil e do Lendário
      if (+y < 1990 || (+y >= 2005 ? +y % 2 !== 1 : +y % 4 !== 0)) continue;
      // impostores "quase": top 10 dos anos vizinhos
      const nearIds = new Set([-2, -1, 1, 2].flatMap((d) => (boY[+y + d] || []).map((o) => o.pi)));
      add({ key: 's-bo' + y, lv: +y >= 2008 ? 2 : 3, unit: 'pos', order, near: (p) => nearIds.has(p.i), src: 'France Football',
        label: lab('Top 10 da Bola de Ouro ' + y, 'Ballon d’Or ' + y + ' top 10', 'Top 10 del Balón de Oro ' + y) });
    }
    add({ key: 's-bopod', lv: 0, unit: 'podium', order: recent(pod), near: (p) => p.bo, src: 'France Football', unordered: true,
      label: lab('Ficaram no pódio da Bola de Ouro (1990–2025)', 'Ballon d’Or podium (1990–2025)', 'Podio del Balón de Oro (1990–2025)') });
    // 5) marcas da base (Transfermarkt): seleção, Copas e títulos
    const app = new Map(Object.entries(games.wcapp || {}).map(([i, l]) => [+i, l]));
    const nCups = (p) => (app.get(p.i) || []).length;
    const fromBase = (key, lv, label, test, near, val) => {
      const order = core.filter(test).sort((a, b) => (val ? val(b) - val(a) : b.r - a.r)).map((p, k) => ({ pi: p.i, n: p.n, v: val ? val(p) : null, pos: k + 1 }));
      add({ key, lv, label, order, near, src: 'Transfermarkt', unordered: !val, unit: val ? 'num' : null });
    };
    fromBase('s-cap120', 2, lab('120 jogos ou mais pela seleção', '120+ caps', '120 partidos o más con la selección'), (p) => p.caps >= 120, (p) => p.caps >= 85 && p.caps < 120, (p) => p.caps);
    fromBase('s-ng50', 0, lab('50 gols ou mais pela seleção', '50+ international goals', '50 goles o más con la selección'), (p) => p.ng >= 50, (p) => p.ng >= 28 && p.ng < 50, (p) => p.ng);
    fromBase('s-cup4', 2, lab('Jogaram 4 Copas do Mundo ou mais (desde 1990)', 'Played 4+ World Cups (since 1990)', 'Jugaron 4 Mundiales o más (desde 1990)'), (p) => nCups(p) >= 4, (p) => nCups(p) === 3, nCups);
    fromBase('s-wceu', 1, lab('Campeões da Copa do Mundo e da Eurocopa', 'Won both the World Cup and the Euros', 'Campeones del Mundial y de la Eurocopa'), (p) => p.wc && p.euro, (p) => p.wc || p.euro);
    fromBase('s-wclib', 2, lab('Campeões da Copa do Mundo e da Libertadores', 'Won both the World Cup and the Libertadores', 'Campeones del Mundial y de la Libertadores'), (p) => p.wc && p.lib, (p) => p.wc || p.lib);
    fromBase('s-wcbo', 1, lab('Campeões do mundo que ficaram no top 10 da Bola de Ouro', 'World Cup winners who made a Ballon d’Or top 10', 'Campeones del mundo en el top 10 del Balón de Oro'), (p) => p.wc && p.bo, (p) => p.wc || p.bo);
    return (MF._imp5 = out);
  }
  // "Na ordem": a ordem real dos certos que estavam na roda (com o número quando a lista tem)
  function orderLine(cat, ids) {
    const rows = cat.order.filter((o) => ids.has(o.pi));
    const seen = new Set();
    const u = { gols: { pt: 'gols', en: 'goals', es: 'goles' }, jogos: { pt: 'jogos', en: 'apps', es: 'partidos' }, assist: { pt: 'assist.', en: 'assists', es: 'asist.' } }[cat.unit];
    const parts = rows.filter((o) => !seen.has(o.pi) && seen.add(o.pi)).map((o) => {
      const nm = MF.data.P[o.pi].n;
      if (cat.unit === 'pos') return o.pos + 'º ' + nm;
      if (cat.unit === 'podium') return nm + ' (' + o.pos + 'º em ' + o.y + ')';
      if (cat.unordered) return nm + (o.y ? ' (' + o.y + (o.v ? ', ' + o.v + (u ? ' ' + (u[MF.lang] || u.pt) : '') : '') + ')' : o.v != null ? ' (' + o.v + ')' : '');
      return o.pos + 'º ' + nm + (o.v != null ? ' — ' + o.v + (u ? ' ' + (u[MF.lang] || u.pt) : '') : '');
    });
    const head = { pt: cat.unordered ? 'Os certos: ' : 'Na ordem: ', en: cat.unordered ? 'The right ones: ' : 'In order: ', es: cat.unordered ? 'Los correctos: ' : 'En orden: ' }[MF.lang] || 'Na ordem: ';
    return head + parts.join(' · ') + (cat.src ? '  (fonte: ' + cat.src + ')' : '');
  }
  // categoria do dia para o nível (também usada nos testes: MF._impPick)
  function chooseCat(lvl) {
    const core = coreList();
    // a partir de 16/10/2026: jogadores e clubes das categorias seguem o critério do nível (Lendário mantém a base)
    const NEW = MF.isNew();
    MF._impN = MF._impN || {};
    const NFor = (l) => MF._impN[l + NEW] || (MF._impN[l + NEW] = NEW && l !== 'legend' ? core.filter((p) => MF.playerOk(l, p)) : core.filter((p) => p.r >= NOTABLE[l] || (l !== 'easy' && p.famous)));
    const N = NFor(lvl);
    const LVLS = { easy: [0], normal: [0, 1], hard: [1, 2], legend: [2, 3] };
    const clubsOk = (c, l) => !NEW || l === 'legend' || !c.clubs || c.clubs.every((x) => MF.clubOk(l, x));
    const okFor = (l) => { const n = NFor(l); return categories().cats.filter((c) => LVLS[l].includes(c.lv) && clubsOk(c, l) && n.filter(c.test).length >= 6 && n.filter((p) => !c.test(p)).length >= 10); };
    // desde 16/10/2026: 4 de cada 5 dias são perguntas de números (rankings, temporadas, artilharias, títulos);
    // no outro dia volta uma categoria clássica (clube, seleção, liga…)
    const STAT = NEW && MF.today() % 5 !== 2;
    const stats = statCats();
    const memOk = (c, n) => n.filter((p) => c.members.has(p.i)).length;
    const okStat = (l) => { const n = NFor(l); return stats.filter((c) => LVLS[l].includes(c.lv) && c.inCore >= 4 && n.length - c.members.size - c.avoid.size >= 10); };
    const cat = STAT ? MF.dailyPick('g8-imp5s', lvl, okStat, (c) => c.key) : MF.dailyPick(NEW ? 'g8-imp5c' : 'g8-imp3', lvl, okFor, (c) => c.key);
    return { cat, STAT, NFor, core, N };
  }
  MF._impPick = (l) => chooseCat(l).cat;
  const labelOf = (c) => { const l = c.label[MF.lang] || c.label.pt; return typeof l === 'function' ? l() : l; };

  MF.registerGame({
    num: 8, slug: 'modo-impostor',
    rules: {
      pt: ['A categoria do dia fica no centro e 10 jogadores aparecem em volta (só jogadores de 1990 para cá).', 'Marque todos que pertencem à categoria. Quem não pertence é impostor. Quase todo dia a pergunta é sobre números de verdade: mais jogos ou gols numa competição, quem fez 50 gols numa temporada, artilheiros de liga e de Copa, Chuteira de Ouro, Bola de Ouro, títulos e marcas pela seleção. No fim aparece a ordem real com os números. De vez em quando volta uma categoria clássica (clube, seleção, liga).', 'Ajuda: uma vez por partida, revela um impostor.', 'Fácil: craques conhecidos, clubes famosos e categorias amplas; nas perguntas de números, os impostores são do mesmo contexto (mesma seleção, clube ou liga; atacantes nas listas de gols), mas bem conhecidos. Normal: jogadores conhecidos das principais ligas, clubes famosos e campeões da Champions, impostores da mesma geração. Difícil: jogadores das principais ligas e lendas, campeões europeus e clubes da 1ª divisão, impostores parecidos. Lendário: impostores "quase" (jogou a Copa mas não marcou, ficou fora do top 10, chegou perto da marca).', 'Estilo Normal: marque todos e confirme. Um por um: cada toque vale, e um impostor encerra o jogo.'],
      en: ['Today’s category is in the middle with 10 players around it (only players from 1990 on).', 'Pick everyone who fits the category. Those who don’t are impostors. Most days the question is about real numbers: most appearances or goals in a competition, 50-goal seasons, league and World Cup top scorers, Golden Shoe, Ballon d’Or, titles and international records. At the end you see the real order with the numbers. Now and then a classic category (club, nation, league) comes back.', 'Help: once per game, reveals one impostor.', 'Easy: famous players and clubs and broad categories; in number questions, impostors come from the same context (same nation, club or league; forwards in goal lists), but well known. Normal: well-known top-league players, famous clubs and Champions League winners, impostors from the same generation. Hard: top-league players and legends, European winners and top-flight clubs, similar impostors. Legendary: "nearly" impostors (played the World Cup but didn’t score, just outside the top 10, close to the mark).', 'Normal style: pick them all and confirm. One by one: every tap counts and one impostor ends the game.'],
      es: ['La categoría del día está en el centro con 10 jugadores alrededor (solo jugadores de 1990 en adelante).', 'Marca a todos los que encajan en la categoría. Los que no, son impostores. Casi todos los días la pregunta es sobre números reales: más partidos o goles en una competición, temporadas de 50 goles, máximos goleadores de liga y de Mundial, Bota de Oro, Balón de Oro, títulos y marcas con la selección. Al final aparece el orden real con los números. A veces vuelve una categoría clásica (club, selección, liga).', 'Ayuda: una vez por partida, revela un impostor.', 'Fácil: cracks y clubes famosos y categorías amplias; en las preguntas de números, los impostores son del mismo contexto (misma selección, club o liga; delanteros en las listas de goles), pero muy conocidos. Normal: jugadores conocidos de las grandes ligas, clubes famosos y campeones de la Champions, impostores de la misma generación. Difícil: jugadores de las grandes ligas y leyendas, campeones europeos y clubes de primera, impostores parecidos. Legendario: impostores "casi" (jugó el Mundial pero no marcó, se quedó fuera del top 10, rozó la marca).', 'Estilo Normal: márcalos todos y confirma. Uno a uno: cada toque cuenta y un impostor termina el juego.'],
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
      const { cat, STAT, core, N } = chooseCat(lvl);
      const rnd = MF.rng((STAT ? 'imp5:' : 'imp2:') + MF.today() + ':' + lvl);
      // nas perguntas de números, os certos saem da lista (os do nível primeiro); impostores nunca são da lista nem duvidosos
      let ins = N.filter(cat.test).sort((a, b) => b.r - a.r);
      if (STAT && ins.length < 4) ins = ins.concat(core.filter((p) => cat.test(p) && !ins.includes(p)).sort((a, b) => b.r - a.r));
      // perguntas de números sobre outras épocas: os impostores também podem vir dos conhecidos dessa época (não só do elenco atual)
      const base = STAT && lvl !== 'legend' ? [...new Set(N.concat(core.filter((p) => p.r >= NOTABLE[lvl] + 2 || ((p.legend || p.famous || p.bo) && p.r >= NOTABLE[lvl]))))] : N;
      const outs = base.filter((p) => !cat.test(p) && !(cat.avoid && cat.avoid.has(p.i)));
      const k = Math.min(ins.length, 4 + Math.floor(rnd() * 3));
      const topN = { easy: 18, normal: 35, hard: 60, legend: 120 }[lvl];
      const good = MF.sample(ins.slice(0, Math.max(topN, k)), k, rnd);
      // impostores: quanto mais difícil, mais parecidos com os certos
      const era = good.reduce((s, p) => s + (p.born || 1990), 0) / good.length;
      const sameEra = (p) => Math.abs((p.born || 1990) - era) <= 8;
      const similar = (p) => good.some((g) => g.nat === p.nat || g.leagues.some((l) => p.leagues.includes(l)));
      let src;
      const need = 10 - k;
      // Desde 18/10/2026 (pedido do usuário): nas perguntas de números, todo impostor é plausível em qualquer nível —
      // sai do mesmo contexto da pergunta (mesma seleção, clube ou liga; atacante nas listas de gols; marca parecida),
      // para ninguém ser eliminado só por ser zagueiro, de outro país ou de outra época. O nível só muda o quanto ele é parecido.
      const PLAUS = MF.today() >= 6 && cat.near; // desde 18/10 também nas categorias clássicas
      const fit = PLAUS ? outs.filter(cat.near) : null;
      if (fit && fit.length >= need) {
        const famous = (p) => p.famous || p.legend || p.bo || p.r >= 84;
        const tiers = {
          easy: [fit.filter(famous), fit],
          normal: [fit.filter(sameEra), fit],
          hard: [fit.filter((p) => sameEra(p) && similar(p)), fit.filter(sameEra), fit],
          legend: [fit.filter((p) => sameEra(p) && similar(p)), fit.filter(sameEra), fit],
        }[lvl];
        src = tiers.find((x) => x.length >= need);
      } else {
        if (lvl === 'easy') src = outs.filter((p) => !similar(p) || p.famous);
        else if (lvl === 'normal') src = outs.filter(sameEra);
        else if (lvl === 'hard') src = outs.filter((p) => sameEra(p) && (similar(p) || (cat.near && cat.near(p))));
        else src = outs.filter((p) => cat.near && cat.near(p));
        if (src.length < need) src = outs.filter(sameEra);
        if (src.length < need) src = outs;
      }
      MF._impLast = { cat, good, plaus: !!(fit && fit.length >= need), fit: fit ? fit.length : 0 };
      const bad = MF.sample(src.sort((a, b) => b.r - a.r).slice(0, lvl === 'easy' ? 40 : 80), 10 - k, rnd);
      MF._impLast.bad = bad;
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
        ctx.finish(win, hits, line, cat.order ? orderLine(cat, goodSet) : null);
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
  MF._impStats = statCats;
})();
