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
      if (n >= 6) cats.push({ key: 'cc' + A + '-' + B, clubs: [A, B], lv: MF.today() >= 7 ? 1 : 2, // dois clubes grandes = pergunta de Normal (19/10/2026)
         label: lab('Jogou no ' + clubs[A].n + ' e no ' + clubs[B].n, 'Played for ' + clubs[A].n + ' and ' + clubs[B].n, 'Jugó en el ' + clubs[A].n + ' y el ' + clubs[B].n),
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
  // desde 19/10/2026 (desafio nº 8): nota de dificuldade por pergunta, Difícil/Lendário sempre de números, tema diferente da Pirâmide
  const V7 = () => MF.today() >= 7;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  // fama: o quanto o nome é conhecido (nota + marcações)
  const fame = (p) => p.r + (p.famous || p.legend ? 4 : 0) + (p.bo ? 4 : 0) + (p.bow ? 4 : 0) + (p.icon ? 2 : 0);
  const midY = (p) => (p.first + Math.min(p.lastY, 2026)) / 2;
  const cLen = (p) => Math.min(p.lastY, 2026) - p.first;
  // tema de uma pergunta (Pirâmide "t-…" ou Impostor "s-…"): perguntas com tema em comum não saem no mesmo dia
  const IMP_TAGS = { s50: ['boot'], boot: ['boot'], pl30: ['pl'], plboot: ['pl'], pichichi: ['ll'], capo: ['sa'], bunde: ['bl'],
    ucl5: ['ucl'], ucl2c: ['ucl'], libucl: ['lib', 'ucl'], wctop: ['wc'], wc5: ['wc'], cup4: ['wc'], cup5: ['wc'], wcsc3: ['wc'], wcg8: ['wc'], wcj20: ['wc'],
    bopod: ['bo'], cap120: ['caps'], cap150: ['caps'], ng50: ['ng'], ng60: ['ng'], wceu: ['wc', 'euro'], wclib: ['wc', 'lib'], wcbo: ['wc', 'bo'] };
  const X_TAGS = { ucl: 'ucl', wc: 'wc', pl: 'pl', ll: 'll', sa: 'sa', bl: 'bl', lib: 'lib' };
  function qTags(key) {
    const k = String(key).replace(/^[st]-/, '');
    let m;
    if ((m = k.match(/^g-(\w+)$/))) return ['nat:' + m[1], 'ng'];
    if ((m = k.match(/^c-(\w+)$/))) return ['nat:' + m[1], 'caps'];
    if ((m = k.match(/^(?:cl|a)-(\w+)$/))) return ['club:' + m[1]];
    if ((m = k.match(/^x-(ucl|wc|pl|ll|sa|bl|lib)/))) return [X_TAGS[m[1]]];
    if ((m = k.match(/^wcg(\d{4})$/))) return ['wc', 'wc:' + m[1]];
    if ((m = k.match(/^bo(\d{4})$/))) return ['bo', 'bo:' + m[1]];
    return IMP_TAGS[k] || [k];
  }
  MF._qTags = qTags;
  // temas da Pirâmide em cada dia (todos os níveis juntos)
  let pyrDays = null;
  function pyrTagsOn(d) {
    if (!pyrDays) {
      pyrDays = [];
      try { (MF._pyrHist ? MF._pyrHist() : []).forEach((day, i) => { const s = new Set(); Object.values(day || {}).forEach((c) => c && qTags(c.key).forEach((x) => s.add(x))); pyrDays[i] = s; }); } catch (e) { /* sem Pirâmide */ }
    }
    return pyrDays[d] || null;
  }
  // Nota de dificuldade (0–100) de uma pergunta de números, medida nos dados:
  //  O = quão pouco conhecidos são os certos (mediana da fama da lista)    35%
  //  A = época (quanto mais antiga, mais difícil)                           15%
  //  T = armadilhas: impostores plausíveis e tão conhecidos quanto os certos 20%
  //  L = nível curado da lista (como na Pirâmide)                          30%
  function rate(c, core) {
    const mem = core.filter((p) => c.members.has(p.i)).sort((a, b) => fame(b) - fame(a));
    // referência: a mediana da fama dos certos (os 6 mais famosos sempre são craques; o que pesa é o resto da lista)
    const famTop = mem.length ? fame(mem[Math.floor(mem.length / 2)]) : 85;
    const mids = mem.map(midY).sort((a, b) => a - b);
    const t = c.year || mids[Math.floor(mids.length / 2)] || 2010;
    const traps = c.near ? core.filter((p) => !c.members.has(p.i) && !c.avoid.has(p.i) && c.near(p) && fame(p) >= famTop - 8).length : 8;
    const O = clamp((95 - famTop) / 15), A = clamp((2024 - t) / 30), T = clamp(traps / 25), L = clamp(c.lv / 3);
    c.rate = { O: +O.toFixed(2), A: +A.toFixed(2), T: +T.toFixed(2), L };
    c.D = Math.round(100 * (0.35 * O + 0.15 * A + 0.2 * T + 0.3 * L));
    return c.D;
  }
  // faixas da nota (percentil entre todas as perguntas de números) por nível; as faixas se encostam para o sorteio ter variedade
  const BAND = { easy: [0, 0.38], normal: [0.22, 0.62], hard: [0.52, 0.92], legend: [0.72, 1] };
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
      // listas de seleção: o número da base (gols/jogos pela seleção) mede o "quase" — quem chegou perto do 10º;
      // quem tem número de top 10 na base mas não está na lista fica fora (pode ter passado alguém depois da data da lista)
      const nv = /^g-/.test(c.k) ? (p) => p.ng : /^c-/.test(c.k) ? (p) => p.caps : null;
      // listas de clube: o "quase" é quem ficou muitos anos no clube (passagem curta entrega que não está no top 10)
      const yrsAt = ci >= 0 ? (p) => p.st.filter((s) => s[0] === ci).reduce((t, s) => t + Math.max(1, s[2] - s[1]), 0) : null;
      const minV = Math.min(...c.it.map((x) => x[1]));
      const avoid = new Set();
      if (nv && c.nat) core.forEach((p) => { if (p.nat === c.nat && nv(p) >= minV && !order.some((o) => o.pi === p.i)) avoid.add(p.i); });
      add({ key: 's-' + c.k, lv: c.lv, label: { pt: c.t[0], en: c.t[1], es: c.t[2] }, src: c.src, unit: c.u, order, avoid, career: true,
        close: nv ? (p) => clamp(nv(p) / minV) : yrsAt ? (p) => clamp((yrsAt(p) - 1) / 8) : null,
        near: nearOf({ nat: c.nat, club: ci, att: c.u === 'gols', league: lg ? LG[lg] : null }) });
    }
    // 2) listas do impostor (temporadas, artilharias de liga, Chuteira de Ouro, títulos)
    for (const c of games.imp || []) {
      const order = c.it.map((n, k) => { const p = res(n); return { pi: p ? p.i : -1, n, pos: k + 1 }; });
      const nearIds = new Set((c.near_it || []).map((n) => { const p = res(n); return p ? p.i : -1; }));
      const avoid = new Set((c.avoid || []).map((n) => { const p = res(n); return p ? p.i : -1; }));
      add({ key: 's-' + c.k, lv: c.lv, label: { pt: c.t[0], en: c.t[1], es: c.t[2] }, src: c.src, order, avoid, unordered: true, career: true,
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
        add({ key: 's-wcg' + y, year: +y, lv: +y >= 2014 ? 0 : +y >= 2002 ? 1 : 2, unit: 'gols', order: t10, near: MF.today() >= 6 ? (p) => attNear(p) && inCup.has(p.i) : attNear, src: 'FIFA',
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
      add({ key: 's-bo' + y, year: +y, lv: +y >= 2008 ? 2 : 3, unit: 'pos', order, near: (p) => nearIds.has(p.i), src: 'France Football',
        label: lab('Top 10 da Bola de Ouro ' + y, 'Ballon d’Or ' + y + ' top 10', 'Top 10 del Balón de Oro ' + y) });
    }
    add({ key: 's-bopod', lv: 0, unit: 'podium', order: recent(pod), near: (p) => p.bo, src: 'France Football', unordered: true,
      label: lab('Ficaram no pódio da Bola de Ouro (1990–2025)', 'Ballon d’Or podium (1990–2025)', 'Podio del Balón de Oro (1990–2025)') });
    // 5) marcas da base (Transfermarkt): seleção, Copas e títulos
    const app = new Map(Object.entries(games.wcapp || {}).map(([i, l]) => [+i, l]));
    const nCups = (p) => (app.get(p.i) || []).length;
    // close: o quanto o impostor chegou perto da marca (0–1), usado para escolher os "quase" no Difícil e no Lendário
    const fromBase = (key, lv, label, test, near, val, close, src) => {
      const order = core.filter(test).sort((a, b) => (val ? val(b) - val(a) : b.r - a.r)).map((p, k) => ({ pi: p.i, n: p.n, v: val ? val(p) : null, pos: k + 1 }));
      add({ key, lv, label, order, near, src: src || 'Transfermarkt', unordered: !val, unit: val ? 'num' : null, career: true, close: close || null });
    };
    const wcGoals = (p) => (app.get(p.i) || []).reduce((s, x) => s + x[2], 0);
    const wcGames = (p) => (app.get(p.i) || []).reduce((s, x) => s + x[1], 0);
    const wcScored = (p) => (app.get(p.i) || []).filter((x) => x[2] > 0).length;
    fromBase('s-cap120', 2, lab('120 jogos ou mais pela seleção', '120+ caps', '120 partidos o más con la selección'), (p) => p.caps >= 120, (p) => p.caps >= 85 && p.caps < 120, (p) => p.caps, (p) => clamp((p.caps - 85) / 35));
    fromBase('s-ng50', 0, lab('50 gols ou mais pela seleção', '50+ international goals', '50 goles o más con la selección'), (p) => p.ng >= 50, (p) => p.ng >= 28 && p.ng < 50, (p) => p.ng, (p) => clamp((p.ng - 28) / 22));
    fromBase('s-cup4', 2, lab('Jogaram 4 Copas do Mundo ou mais (desde 1990)', 'Played 4+ World Cups (since 1990)', 'Jugaron 4 Mundiales o más (desde 1990)'), (p) => nCups(p) >= 4, (p) => nCups(p) === 3, nCups, null, 'FIFA');
    fromBase('s-wceu', 1, lab('Campeões da Copa do Mundo e da Eurocopa', 'Won both the World Cup and the Euros', 'Campeones del Mundial y de la Eurocopa'), (p) => p.wc && p.euro, (p) => p.wc || p.euro);
    fromBase('s-wclib', 2, lab('Campeões da Copa do Mundo e da Libertadores', 'Won both the World Cup and the Libertadores', 'Campeones del Mundial y de la Libertadores'), (p) => p.wc && p.lib, (p) => p.wc || p.lib);
    fromBase('s-wcbo', 1, lab('Campeões do mundo que ficaram no top 10 da Bola de Ouro', 'World Cup winners who made a Ballon d’Or top 10', 'Campeones del mundo en el top 10 del Balón de Oro'), (p) => p.wc && p.bo, (p) => p.wc || p.bo);
    // perguntas mais complexas (19/10/2026, pedido: "mais de 4/5 Copas" etc.), com o "quase" de impostor
    if (V7()) {
      fromBase('s-cup5', 3, lab('Jogaram 5 Copas do Mundo ou mais (desde 1990)', 'Played 5+ World Cups (since 1990)', 'Jugaron 5 Mundiales o más (desde 1990)'), (p) => nCups(p) >= 5, (p) => nCups(p) === 4, nCups, null, 'FIFA');
      fromBase('s-wcsc3', 2, lab('Fizeram gol em 3 Copas do Mundo diferentes ou mais (1990–2026)', 'Scored at 3+ different World Cups (1990–2026)', 'Marcaron en 3 Mundiales distintos o más (1990–2026)'), (p) => wcScored(p) >= 3, (p) => wcScored(p) === 2 && nCups(p) >= 3, wcScored, null, 'FIFA');
      fromBase('s-wcg8', 2, lab('Fizeram 8 gols ou mais em Copas do Mundo (1990–2026)', 'Scored 8+ World Cup goals (1990–2026)', 'Marcaron 8 goles o más en Mundiales (1990–2026)'), (p) => wcGoals(p) >= 8, (p) => wcGoals(p) >= 4 && wcGoals(p) < 8, wcGoals, (p) => clamp((wcGoals(p) - 3) / 4), 'FIFA');
      fromBase('s-wcj20', 3, lab('Fizeram 20 jogos ou mais em Copas do Mundo (1990–2026)', 'Played 20+ World Cup matches (1990–2026)', 'Jugaron 20 partidos o más en Mundiales (1990–2026)'), (p) => wcGames(p) >= 20, (p) => wcGames(p) >= 13 && wcGames(p) < 20, wcGames, (p) => clamp((wcGames(p) - 12) / 7), 'FIFA');
      fromBase('s-cap150', 3, lab('150 jogos ou mais pela seleção', '150+ caps', '150 partidos o más con la selección'), (p) => p.caps >= 150, (p) => p.caps >= 115 && p.caps < 150, (p) => p.caps, (p) => clamp((p.caps - 115) / 35));
      fromBase('s-ng60', 2, lab('60 gols ou mais pela seleção', '60+ international goals', '60 goles o más con la selección'), (p) => p.ng >= 60, (p) => p.ng >= 38 && p.ng < 60, (p) => p.ng, (p) => clamp((p.ng - 38) / 22));
    }
    // nota de dificuldade e percentil de cada pergunta
    out.forEach((c) => { c.tags = qTags(c.key); rate(c, core); });
    const sorted = out.slice().sort((a, b) => a.D - b.D || (a.key < b.key ? -1 : 1));
    sorted.forEach((c, k) => { c.pct = sorted.length > 1 ? k / (sorted.length - 1) : 0.5; });
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
    const stats = statCats();
    const memOk = (c, n) => n.filter((p) => c.members.has(p.i)).length;
    if (V7()) {
      // desde 19/10/2026: Difícil e Lendário são SEMPRE perguntas de números (estilo Pirâmide); a categoria clássica
      // (clube, seleção, liga, dois clubes…) volta 1 dia a cada 5 só no Fácil e no Normal.
      // A pergunta sai da faixa de dificuldade do nível (nota medida nos dados, ver rate) e nunca tem o tema da Pirâmide do dia.
      const STAT = lvl === 'hard' || lvl === 'legend' || MF.today() % 5 !== 2;
      const MIN_MEM = { easy: 4, normal: 3, hard: 0, legend: 0 };
      const pool = (l) => { const n = NFor(l); const [a, b] = BAND[l]; return stats.filter((c) => c.pct >= a && c.pct <= b && c.inCore >= 4 && memOk(c, n) >= MIN_MEM[l] && n.length - c.members.size - c.avoid.size >= 10); };
      const avoid = (c, d) => { const s = pyrTagsOn(d); return !!s && c.tags.some((x) => s.has(x)); };
      const cat = STAT ? MF.dailyPick('g8-imp7s', lvl, pool, (c) => c.key, { avoid }) : MF.dailyPick('g8-imp5c', lvl, okFor, (c) => c.key);
      return { cat, STAT, NFor, core, N };
    }
    const STAT = NEW && MF.today() % 5 !== 2;
    const okStat = (l) => { const n = NFor(l); return stats.filter((c) => LVLS[l].includes(c.lv) && c.inCore >= 4 && n.length - c.members.size - c.avoid.size >= 10); };
    const cat = STAT ? MF.dailyPick('g8-imp5s', lvl, okStat, (c) => c.key) : MF.dailyPick(NEW ? 'g8-imp5c' : 'g8-imp3', lvl, okFor, (c) => c.key);
    return { cat, STAT, NFor, core, N };
  }
  MF._impPick = (l) => chooseCat(l).cat;
  const labelOf = (c) => { const l = c.label[MF.lang] || c.label.pt; return typeof l === 'function' ? l() : l; };

  MF.registerGame({
    num: 8, slug: 'modo-impostor',
    rules: {
      pt: ['A categoria do dia fica no centro e 10 jogadores aparecem em volta (só jogadores de 1990 para cá).', 'Marque todos que pertencem à categoria. Quem não pertence é impostor. Quase todo dia a pergunta é sobre números de verdade: mais jogos ou gols numa competição, quem fez 50 gols numa temporada, artilheiros de liga e de Copa, Chuteira de Ouro, Bola de Ouro, títulos e marcas pela seleção. No fim aparece a ordem real com os números. Cada pergunta tem uma nota de dificuldade (quão conhecidos são os certos, a época, quantas armadilhas existem) e cada nível pega a sua faixa; o tema nunca é o mesmo da Pirâmide do dia. No Fácil e no Normal, de vez em quando volta uma categoria clássica (clube, seleção, liga); Difícil e Lendário são sempre perguntas de números.', 'Ajuda: uma vez por partida, revela um impostor.', 'Fácil: craques conhecidos, clubes famosos e categorias amplas; nas perguntas de números, os impostores são do mesmo contexto (mesma seleção, clube ou liga; atacantes nas listas de gols), mas bem conhecidos. Normal: jogadores conhecidos das principais ligas, clubes famosos e campeões da Champions, impostores da mesma geração. Difícil: perguntas complexas (4 Copas, gol em 3 Copas, recordes de clubes, artilheiros de liga…) e impostores que chegam perto da marca e fazem sentido — nunca alguém que se elimina sozinho, como um estreante numa pergunta de Copas. Lendário: as perguntas mais difíceis (5 Copas, 150 jogos pela seleção…) e os impostores mais "quase".', 'Estilo Normal: marque todos e confirme. Um por um: cada toque vale, e um impostor encerra o jogo.'],
      en: ['Today’s category is in the middle with 10 players around it (only players from 1990 on).', 'Pick everyone who fits the category. Those who don’t are impostors. Most days the question is about real numbers: most appearances or goals in a competition, 50-goal seasons, league and World Cup top scorers, Golden Shoe, Ballon d’Or, titles and international records. At the end you see the real order with the numbers. Every question has a difficulty score (how well known the right players are, the era, how many traps exist) and each level takes its own band; the topic is never the same as the day’s Pyramid. On Easy and Normal a classic category (club, nation, league) comes back now and then; Hard and Legendary are always number questions.', 'Help: once per game, reveals one impostor.', 'Easy: famous players and clubs and broad categories; in number questions, impostors come from the same context (same nation, club or league; forwards in goal lists), but well known. Normal: well-known top-league players, famous clubs and Champions League winners, impostors from the same generation. Hard: complex questions (4 World Cups, scored at 3 World Cups, club records, league top scorers…) and impostors who come close to the mark and make sense — never someone who rules himself out, like a debutant in a World Cups question. Legendary: the hardest questions (5 World Cups, 150 caps…) and the closest "nearly" impostors.', 'Normal style: pick them all and confirm. One by one: every tap counts and one impostor ends the game.'],
      es: ['La categoría del día está en el centro con 10 jugadores alrededor (solo jugadores de 1990 en adelante).', 'Marca a todos los que encajan en la categoría. Los que no, son impostores. Casi todos los días la pregunta es sobre números reales: más partidos o goles en una competición, temporadas de 50 goles, máximos goleadores de liga y de Mundial, Bota de Oro, Balón de Oro, títulos y marcas con la selección. Al final aparece el orden real con los números. Cada pregunta tiene una nota de dificultad (lo conocidos que son los correctos, la época, cuántas trampas hay) y cada nivel toma su franja; el tema nunca es el mismo de la Pirámide del día. En Fácil y Normal a veces vuelve una categoría clásica (club, selección, liga); Difícil y Legendario son siempre preguntas de números.', 'Ayuda: una vez por partida, revela un impostor.', 'Fácil: cracks y clubes famosos y categorías amplias; en las preguntas de números, los impostores son del mismo contexto (misma selección, club o liga; delanteros en las listas de goles), pero muy conocidos. Normal: jugadores conocidos de las grandes ligas, clubes famosos y campeones de la Champions, impostores de la misma generación. Difícil: preguntas complejas (4 Mundiales, gol en 3 Mundiales, récords de clubes, máximos goleadores de liga…) e impostores que rozan la marca y tienen sentido — nunca alguien que se descarta solo, como un debutante en una pregunta de Mundiales. Legendario: las preguntas más difíciles (5 Mundiales, 150 partidos con la selección…) y los impostores más "casi".', 'Estilo Normal: márcalos todos y confirma. Uno a uno: cada toque cuenta y un impostor termina el juego.'],
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
      let scored = null;
      if (V7() && fit && fit.length >= need) { // perguntas de números e categorias clássicas
        // Desde 19/10/2026: impostor ponderado por plausibilidade. Cada candidato (já do contexto da pergunta) ganha pontos por
        // chegar perto da marca (close), ser da mesma época dos certos, da mesma seleção/liga e tão conhecido quanto eles.
        // Difícil e Lendário: nada que se elimine sozinho — pergunta de carreira (Copas, jogos, gols…) não aceita carreira curta
        // demais (ex.: estreante da última Copa numa pergunta de 5 Copas); pergunta de uma edição exige estar em atividade no ano.
        const mids = good.map(midY).sort((a, b) => a - b);
        const eraT = cat.year || mids[Math.floor(mids.length / 2)];
        const gFame = good.reduce((s, p) => s + fame(p), 0) / good.length;
        const minLen = Math.min(...good.map(cLen));
        const fair = (p) => (cat.year ? p.first <= cat.year && p.lastY >= cat.year : !cat.career || cLen(p) >= Math.max(4, 0.6 * minLen));
        const score = (p) => (cat.close ? 3 * cat.close(p) : 1.5) + 2 * clamp(1 - Math.abs(midY(p) - eraT) / 12)
          + (good.some((g) => g.nat === p.nat) ? 1 : 0) + (good.some((g) => g.leagues.some((l) => p.leagues.includes(l))) ? 0.5 : 0)
          + clamp(1 - Math.abs(fame(p) - gFame) / 12);
        let pool = lvl === 'hard' || lvl === 'legend' ? fit.filter(fair) : fit;
        if (pool.length < need) pool = fit;
        const ranked = pool.map((p) => ({ p, s: score(p) })).sort((a, b) => b.s - a.s || b.p.r - a.p.r);
        const famousP = (p) => p.famous || p.legend || p.bo || p.r >= 84;
        let win;
        if (lvl === 'easy') {
          // Fácil pode facilitar: do contexto, conhecidos, mas os menos traiçoeiros
          const f = ranked.filter((x) => famousP(x.p)).reverse();
          win = (f.length >= need ? f : ranked.slice().reverse()).slice(0, Math.max(need * 3, 15));
        } else if (lvl === 'normal') {
          // Normal: plausíveis, mas conhecidos (nada de nome perdido)
          const k2 = ranked.filter((x) => fame(x.p) >= gFame - 10);
          const r2 = k2.length >= need * 2 ? k2 : ranked;
          win = r2.slice(Math.floor(r2.length * 0.15)).slice(0, Math.max(need * 4, 28));
        }
        else if (lvl === 'hard') win = ranked.slice(0, Math.max(need + 6, 20));
        else win = ranked.slice(0, Math.max(need + 3, 13));
        if (win.length < need) win = ranked;
        scored = win.map((x) => x.p);
        src = scored;
      } else if (fit && fit.length >= need) {
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
