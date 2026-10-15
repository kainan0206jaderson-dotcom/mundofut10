/* MUNDOFUT10 — núcleo: dia do desafio, sorteio sem repetição, dados, idiomas, armazenamento */
(function () {
  'use strict';
  const MF = (window.MF = window.MF || {});

  // ------------------------------------------------------------------ utilidades
  MF.norm = (s) =>
    (s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ø/g, 'o').replace(/ß/g, 'ss').replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/đ/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  // hash de texto -> inteiro 32 bits (cyrb53 reduzido)
  MF.hash = (str) => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0) ^ (h1 >>> 0);
  };
  // gerador pseudoaleatório determinístico
  MF.rng = (seed) => {
    let a = typeof seed === 'string' ? MF.hash(seed) : seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  MF.shuffle = (arr, rnd) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  MF.pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];
  MF.sample = (arr, n, rnd) => MF.shuffle(arr, rnd).slice(0, n);
  MF.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------------ dia do desafio
  // O dia vira à meia-noite de Brasília (UTC−3, sem horário de verão) = 03:00 UTC.
  const DAY = 86400000;
  const SHIFT = 3 * 3600000;
  const LAUNCH = Math.floor((Date.UTC(2026, 9, 12, 3, 0, 0) - SHIFT) / DAY); // 12/10/2026 00:00 BRT
  MF.dayAbs = () => Math.floor((Date.now() - SHIFT) / DAY);
  MF.today = () => MF.dayAbs() - LAUNCH; // 0 no lançamento
  MF.challengeNo = () => MF.today() + 1;
  MF.nextReset = () => (MF.dayAbs() + 1) * DAY + SHIFT;
  MF.dayDate = () => new Date(MF.dayAbs() * DAY + SHIFT + 12 * 3600000); // meio-dia no fuso BRT

  /**
   * Item do dia sem repetição: percorre uma permutação do conjunto; só repete
   * depois que todas as possibilidades foram usadas (novo ciclo = nova permutação).
   */
  MF.daily = (gameKey, n, day) => {
    if (!n) return -1;
    const d = day == null ? MF.today() : day;
    const k = ((d % n) + n) % n;
    const cycle = Math.floor(d / n);
    const order = MF.shuffle([...Array(n).keys()], MF.rng(gameKey + ':ciclo:' + cycle));
    return order[k];
  };
  /**
   * Desafio do dia por dificuldade, sem repetir a RESPOSTA:
   * - cada nível percorre a sua própria permutação do seu conjunto (sem repetir até esgotar);
   * - a mesma resposta (ex.: o mesmo jogador em cartas/temporadas diferentes) não volta em
   *   NENHUM nível por um bom tempo (≈ metade do tamanho do conjunto em dias, até 1 ano);
   * - no mesmo dia, cada nível tem uma resposta diferente.
   * poolFor(nível) → lista de itens; idOf(item) → identidade da resposta.
   * O histórico é recalculado desde o lançamento, igual para todo mundo.
   */
  MF._dp = {};
  MF.dailyPick = (gameKey, lvl, poolFor, idOf) => {
    const today = MF.today();
    const ck = gameKey + '|' + today;
    if (!MF._dp[ck]) {
      const id = idOf || ((x) => x);
      const S = MF.LEVELS.map((l) => {
        const pool = poolFor(l) || [];
        return { l, pool, n: pool.length, R: Math.max(1, Math.min(365, Math.ceil(pool.length / 2))), order: null, pos: 0, cycle: -1 };
      });
      const last = new Map(); // identidade -> último dia usado (qualquer nível)
      const res = {};
      for (let d = 0; d <= Math.max(0, today); d++) {
        for (const s of S) {
          if (!s.n) { res[s.l] = null; continue; }
          if (!s.order || s.pos >= s.n) {
            s.cycle++; s.pos = 0;
            s.order = MF.shuffle([...Array(s.n).keys()], MF.rng(gameKey + ':' + s.l + ':ciclo:' + s.cycle));
          }
          // primeiro item da fila cuja resposta não saiu (em nível nenhum) nos últimos R dias
          let best = -1, bestAge = -1;
          for (let k = s.pos; k < s.n; k++) {
            const used = last.get(id(s.pool[s.order[k]]));
            const age = used == null ? Infinity : d - used;
            if (age > s.R) { best = k; break; }
            if (age > bestAge) { bestAge = age; best = k; }
          }
          [s.order[s.pos], s.order[best]] = [s.order[best], s.order[s.pos]];
          const item = s.pool[s.order[s.pos++]];
          last.set(id(item), d);
          if (d === today) res[s.l] = item;
        }
      }
      MF._dp[ck] = res;
    }
    const r = MF._dp[ck];
    return r[lvl] !== undefined ? r[lvl] : r.normal;
  };
  MF.dayRng = (gameKey, extra) => MF.rng(gameKey + ':dia:' + MF.today() + ':' + (extra || ''));

  // ------------------------------------------------------------------ armazenamento local
  const LS = 'mf10:';
  MF.load = (k, fb) => {
    try { const v = localStorage.getItem(LS + k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; }
  };
  MF.save = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

  // estado do jogo do dia — um por dificuldade (cada dificuldade pode ser jogada uma vez por dia)
  MF.LEVELS = ['easy', 'normal', 'hard', 'legend'];
  MF.dayState = (game, lvl) => MF.load('d2:' + game + ':' + (lvl || 'normal') + ':' + MF.today(), null);
  MF.saveDayState = (game, st) => MF.save('d2:' + game + ':' + ((st && st.opts && st.opts.mode) || 'normal') + ':' + MF.today(), st);
  MF.dayStates = (game) => {
    const out = {};
    for (const l of MF.LEVELS) { const s = MF.dayState(game, l); if (s) out[l] = s; }
    return out;
  };
  // resumo do dia para a escalação: acertou em alguma dificuldade > errou > em andamento > novo
  MF.dayStatus = (game) => {
    const st = Object.values(MF.dayStates(game)).map((s) => s.status);
    return st.includes('won') ? 'won' : st.includes('lost') ? 'lost' : st.includes('playing') ? 'playing' : 'new';
  };
  MF.stats = (game) => MF.load('s:' + game, { played: 0, wins: 0, streak: 0, best: 0, last: null, scores: [] });
  // cada partida conta; a sequência é de dias seguidos com pelo menos uma vitória
  MF.recordResult = (game, win, score) => {
    const s = MF.stats(game);
    const d = MF.today();
    s.played++;
    if (win) {
      s.wins++;
      if (s.lastWin !== d) s.streak = s.lastWin === d - 1 ? s.streak + 1 : 1;
      s.lastWin = d;
    } else if (s.lastWin != null && s.lastWin < d - 1) s.streak = 0;
    s.best = Math.max(s.best, s.streak);
    s.last = d;
    s.scores = (s.scores || []).concat([score == null ? (win ? 1 : 0) : score]).slice(-60);
    MF.save('s:' + game, s);
    return s;
  };

  // ------------------------------------------------------------------ dados
  MF.data = null;
  MF.loadData = async () => {
    const opt = (u) => fetch(u).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    [MF.CRESTS, MF.TROPHIES] = await Promise.all([opt('data/crests.json'), opt('data/trophies.json')]);
    const [db, games, flags] = await Promise.all(
      ['data/db.json', 'data/games.json', 'data/flags.json'].map((u) => fetch(u).then((r) => {
        if (!r.ok) throw new Error(u + ' ' + r.status);
        return r.json();
      }))
    );
    const P = db.players.map((r, i) => MF._player(r, i, false));
    const clubs = db.clubs.map((c, i) => ({ i, n: c[0], l: c[1], cty: c[2] || '', tm: c[3] || '' }));
    // nomes em outro alfabeto (ex.: '久保 Kubo'): a partir de 16/10/2026 aparecem pelo nome latino
    if (MF.isNew && MF.isNew()) for (const p of P) {
      if (!/[^\u0000-\u024f\u1e00-\u1eff\s.'-]/.test(p.n)) continue;
      const lat = p.alias.find((a) => /^[\u0000-\u024f\u1e00-\u1eff\s.'-]+$/.test(a) && /\S{3,} \S{3,}/.test(a));
      if (lat) { p.n = lat; p.fn = lat; p.alt = true; }
    }
    for (const p of P) MF._derive(p, clubs);
    // fichas duplicadas do mesmo jogador (nome em outro alfabeto + nome latino, mesma seleção e nascimento):
    // a mais completa é a principal; a busca mostra uma só e a resposta vale para as duas
    MF.canon = P.map((p) => p.i);
    {
      const groups = new Map();
      for (const p of P) {
        if (!p.st.length) continue;
        const k = p.key + '|' + p.nat;
        const g = groups.get(k);
        if (!g) { groups.set(k, [p]); continue; }
        g.push(p);
      }
      for (const g of groups.values()) {
        if (g.length < 2 || !g.some((p) => p.alt)) continue; // só fichas que vieram com nome em outro alfabeto
        const born = g.map((p) => p.born).filter(Boolean);
        if (new Set(born).size > 1) continue; // homônimos de verdade
        const main = g.slice().sort((a, b) => b.st.length - a.st.length || b.r - a.r)[0];
        for (const p of g) MF.canon[p.i] = main.i;
      }
    }
    // títulos extras (Libertadores pelo clube/ano, Eurocopa pelos elencos campeões)
    const TR = MF.TROPHIES || {};
    for (const p of P) { p.lib = !!(TR.lib && TR.lib[p.i]); p.euro = !!(TR.euro && TR.euro[p.i]); }
    // jogadores por clube (só a base principal: é o que define os desafios do dia, sempre igual para todos)
    const byClub = clubs.map(() => []);
    for (const p of P) for (const c of p.clubs) byClub[c].push(p.i);
    MF.CORE_N = P.length;
    MF.data = { P, clubs, leagues: db.leagues, byClub, games, flags };
    MF.buildSearch();
    // base estendida (todos os demais jogadores do Transfermarkt): baixa depois, sem travar a abertura
    MF.whenCalm(() => MF.loadExt());
    return MF.data;
  };
  MF._player = (r, i, ext) => ext
    ? { i, n: r[0], alias: [], fn: r[0], nat: r[2], born: r[1], pos: r[3], allpos: [r[3]], r: r[4], st: r[5], legend: false, famous: false, bo: false, bow: false, wc: false, retired: false, natGuess: !r[2], h: 0, foot: '', caps: 0, ng: 0, mv: 0, tm: 0, fee: 0, ext: true }
    : {
      i, n: r[0], alias: r[1], fn: r[2], nat: r[3], born: r[4], pos: r[5], allpos: r[6].split('/'),
      r: r[7], st: r[8], legend: !!(r[9] & 1), famous: !!(r[9] & 2), bo: !!(r[9] & 4), bow: !!(r[9] & 8), wc: !!(r[9] & 16),
      retired: !!(r[9] & 32), natGuess: !!(r[9] & 64), icon: !!(r[9] & 128), h: r[10], foot: r[11], caps: r[13] || 0, ng: r[14] || 0, mv: r[15] || 0, tm: r[16] || 0, fee: r[17] || 0, ext: false,
    };
  MF._derive = (p, clubs) => {
    p.clubs = [...new Set(p.st.map((s) => s[0]))];
    p.leagues = [...new Set(p.clubs.map((c) => clubs[c].l))];
    p.key = MF.norm(p.n);
    p.keys = [...new Set([p.key, MF.norm(p.fn), ...p.alias.map(MF.norm)].filter(Boolean))];
    p.first = p.st.length ? Math.min(...p.st.map((s) => s[1])) : (p.born || 2000) + 18;
    p.lastY = p.st.length ? Math.max(...p.st.map((s) => s[2])) : (p.born || 2000) + 35;
  };
  // jogou de 1990 em diante (regra dos modos, exceto Draft e Jogou por onde?)
  MF.era = (p) => p.lastY >= 1990;
  // passagem com datas confiáveis (sem início/fim aproximado)
  MF.exact = (s) => !((s[3] || 0) & 3);
  MF.extReady = false;
  // trabalho pesado que não é urgente: espera o voo de abertura acabar e o navegador ficar ocioso
  MF.whenCalm = (f) => {
    const go = () => (window.requestIdleCallback ? requestIdleCallback(() => f(), { timeout: 4000 }) : setTimeout(f, 300));
    const chk = () => (MF.Stadium && MF.Stadium.intro ? setTimeout(chk, 400) : go());
    setTimeout(chk, 1200);
  };
  // processa em fatias de ~8 ms para não travar animações; publica tudo de uma vez no final
  const sliced = (n, step, done) => new Promise((res) => {
    let i = 0;
    const run = () => {
      const t0 = performance.now();
      while (i < n && performance.now() - t0 < 8) { const e = Math.min(n, i + 200); for (; i < e; i++) step(i); }
      if (i < n) setTimeout(run, 0); else { done(); res(); }
    };
    run();
  });
  MF.loadExt = () => {
    if (MF._extP) return MF._extP;
    MF._extP = fetch('data/ext.json').then((r) => (r.ok ? r.json() : null)).then((x) => {
      if (!x || !MF.data) return;
      const { P, clubs } = MF.data;
      const base = P.length;
      const byClubAll = MF.data.byClub.map((a) => a.slice());
      const add = [], srch = [];
      return sliced(x.players.length, (k) => {
        const p = MF._player(x.players[k], base + k, true);
        MF._derive(p, clubs);
        add.push(p);
        for (const c of p.clubs) (byClubAll[c] = byClubAll[c] || []).push(p.i);
        srch.push(MF._searchEntry(p));
      }, () => {
        for (const p of add) P.push(p);
        for (const e of srch) MF._search.push(e);
        MF.data.byClubAll = byClubAll;
        MF.extReady = true;
        (MF._extCbs || []).forEach((f) => f());
      });
    }).catch(() => { MF._extP = null; });
    return MF._extP;
  };
  MF.onExt = (f) => { if (MF.extReady) f(); else (MF._extCbs = MF._extCbs || []).push(f); };

  // companheiros de clube: mesmo clube com pelo menos uma temporada em comum
  MF.teammates = (pi) => {
    const { P, byClub } = MF.data;
    const p = P[pi];
    const out = new Map();
    for (const [c, a, b] of p.st) {
      for (const qi of (MF.data.byClubAll || byClub)[c] || []) {
        if (qi === pi) continue;
        for (const [c2, a2, b2] of P[qi].st) {
          if (c2 === c && a2 <= b && a <= b2) {
            if (!out.has(qi)) out.set(qi, new Set());
            out.get(qi).add(c);
          }
        }
      }
    }
    return out; // Map(qi -> Set(clubes))
  };
  /** mesmo jogador (considera fichas duplicadas da base) */
  MF.same = (a, b) => a === b || (a != null && b != null && MF.canon && MF.canon[a] !== undefined && MF.canon[a] === MF.canon[b]);
  MF.playedFor = (pi, ci) => MF.data.P[pi].clubs.includes(ci);

  // ------------------------------------------------------------------ busca de jogadores
  MF._searchEntry = (p) => ({ i: p.i, keys: p.keys, toks: [...new Set(p.keys.join(' ').split(' '))], score: p.r + (p.famous ? 20 : 0) + (p.legend ? 10 : 0) - (p.ext ? 15 : 0) });
  MF.buildSearch = () => {
    MF._search = MF.data.P.map(MF._searchEntry);
  };
  /** busca por prefixo de palavra ou substring; retorna índices ordenados por relevância */
  MF.searchPlayers = (q, limit = 8, filter) => {
    const nq = MF.norm(q);
    if (nq.length < 2) return [];
    const parts = nq.split(' ');
    const res = [];
    for (const e of MF._search) {
      if (filter && !filter(e.i)) continue;
      let s = -1;
      if (e.keys.some((k) => k === nq)) s = 1000;
      else if (e.keys.some((k) => k.startsWith(nq))) s = 600;
      else if (parts.every((pt) => e.toks.some((t) => t.startsWith(pt)))) s = 400;
      else if (nq.length >= 4 && e.keys.some((k) => k.includes(nq))) s = 200;
      if (s >= 0) res.push([s + e.score, e.i]);
    }
    res.sort((a, b) => b[0] - a[0]);
    const seen = new Set(), out = [];
    for (const [, i] of res) {
      const c = MF.canon && MF.canon[i] !== undefined ? MF.canon[i] : i;
      if (seen.has(c)) continue;
      seen.add(c); out.push(i);
      if (out.length >= limit) break;
    }
    return out;
  };
  /** resolve um texto digitado num jogador (exato), ou null */
  MF.resolvePlayer = (q) => {
    const nq = MF.norm(q);
    let best = null;
    for (const p of MF.data.P) if (p.keys.includes(nq) && (!best || p.r > best.r)) best = p;
    return best;
  };

  // ------------------------------------------------------------------ rótulos
  MF.POS = {
    pt: { GK: 'GOL', CB: 'ZAG', LB: 'LE', LWB: 'ALE', RB: 'LD', RWB: 'ALD', CDM: 'VOL', CM: 'MC', CAM: 'MEI', LM: 'ME', RM: 'MD', LW: 'PE', RW: 'PD', CF: 'SA', ST: 'ATA' },
    en: { GK: 'GK', CB: 'CB', LB: 'LB', LWB: 'LWB', RB: 'RB', RWB: 'RWB', CDM: 'CDM', CM: 'CM', CAM: 'CAM', LM: 'LM', RM: 'RM', LW: 'LW', RW: 'RW', CF: 'CF', ST: 'ST' },
    es: { GK: 'POR', CB: 'DFC', LB: 'LI', LWB: 'CAI', RB: 'LD', RWB: 'CAD', CDM: 'MCD', CM: 'MC', CAM: 'MCO', LM: 'MI', RM: 'MD', LW: 'EI', RW: 'ED', CF: 'SD', ST: 'DC' },
  };
  MF.posName = {
    pt: { GK: 'Goleiro', DF: 'Defensor', MF: 'Meio-campista', FW: 'Atacante' },
    en: { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' },
    es: { GK: 'Portero', DF: 'Defensa', MF: 'Centrocampista', FW: 'Delantero' },
  };
  MF.line = (pos) => (pos === 'GK' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos) ? 'DF' : ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos) ? 'MF' : 'FW');
  MF.pos = (code) => (MF.POS[MF.lang] || MF.POS.pt)[code] || code;
})();
