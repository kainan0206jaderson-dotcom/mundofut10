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
  // O dia vira às 06:00 de Brasília (UTC−3, sem horário de verão) = 09:00 UTC.
  const DAY = 86400000;
  const SHIFT = 9 * 3600000;
  const LAUNCH = Math.floor((Date.UTC(2026, 9, 12, 9, 0, 0) - SHIFT) / DAY); // 12/10/2026 06:00 BRT
  MF.dayAbs = () => Math.floor((Date.now() - SHIFT) / DAY);
  MF.today = () => MF.dayAbs() - LAUNCH; // 0 no lançamento
  MF.challengeNo = () => MF.today() + 1;
  MF.nextReset = () => (MF.dayAbs() + 1) * DAY + SHIFT;
  MF.dayDate = () => new Date((MF.dayAbs()) * DAY + SHIFT + 3 * 3600000); // meio-dia aprox. no fuso BRT

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
  MF.dayRng = (gameKey, extra) => MF.rng(gameKey + ':dia:' + MF.today() + ':' + (extra || ''));

  // ------------------------------------------------------------------ armazenamento local
  const LS = 'mf10:';
  MF.load = (k, fb) => {
    try { const v = localStorage.getItem(LS + k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; }
  };
  MF.save = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

  // estado do jogo do dia + estatísticas por jogo
  MF.dayState = (game) => MF.load('d:' + game + ':' + MF.today(), null);
  MF.saveDayState = (game, st) => MF.save('d:' + game + ':' + MF.today(), st);
  MF.stats = (game) => MF.load('s:' + game, { played: 0, wins: 0, streak: 0, best: 0, last: null, scores: [] });
  MF.recordResult = (game, win, score) => {
    const s = MF.stats(game);
    const d = MF.today();
    if (s.last === d) return s;
    s.played++;
    if (win) { s.wins++; s.streak = s.lastWin === d - 1 ? s.streak + 1 : 1; s.lastWin = d; }
    else s.streak = 0;
    s.best = Math.max(s.best, s.streak);
    s.last = d;
    s.scores = (s.scores || []).concat([score == null ? (win ? 1 : 0) : score]).slice(-60);
    MF.save('s:' + game, s);
    return s;
  };

  // ------------------------------------------------------------------ dados
  MF.data = null;
  MF.loadData = async () => {
    MF.CRESTS = await fetch('data/crests.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    const [db, games, flags] = await Promise.all(
      ['data/db.json', 'data/games.json', 'data/flags.json'].map((u) => fetch(u).then((r) => {
        if (!r.ok) throw new Error(u + ' ' + r.status);
        return r.json();
      }))
    );
    const P = db.players.map((r, i) => ({
      i, n: r[0], alias: r[1], fn: r[2], nat: r[3], born: r[4], pos: r[5], allpos: r[6].split('/'),
      r: r[7], st: r[8], legend: !!(r[9] & 1), famous: !!(r[9] & 2), bo: !!(r[9] & 4), bow: !!(r[9] & 8), wc: !!(r[9] & 16),
      h: r[10], foot: r[11], lastV: r[12],
    }));
    const clubs = db.clubs.map((c, i) => ({ i, n: c[0], l: c[1] }));
    for (const p of P) {
      p.clubs = [...new Set(p.st.map((s) => s[0]))];
      p.leagues = [...new Set(p.clubs.map((c) => clubs[c].l))];
      p.key = MF.norm(p.n);
      p.keys = [p.key, ...p.alias.map(MF.norm)];
      p.first = p.st.length ? p.st[0][1] : p.born + 18;
      p.lastY = p.st.length ? Math.max(...p.st.map((s) => s[2])) : p.born + 35;
    }
    // jogadores por clube
    const byClub = clubs.map(() => []);
    for (const p of P) for (const c of p.clubs) byClub[c].push(p.i);
    MF.data = { P, clubs, leagues: db.leagues, byClub, games, flags };
    MF.buildSearch();
    return MF.data;
  };

  // companheiros de clube: mesmo clube com pelo menos uma temporada em comum
  MF.teammates = (pi) => {
    const { P, byClub } = MF.data;
    const p = P[pi];
    const out = new Map();
    for (const [c, a, b] of p.st) {
      for (const qi of byClub[c]) {
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
  MF.playedFor = (pi, ci) => MF.data.P[pi].clubs.includes(ci);

  // ------------------------------------------------------------------ busca de jogadores
  MF.buildSearch = () => {
    const { P } = MF.data;
    MF._search = P.map((p) => ({ i: p.i, keys: p.keys, toks: [...new Set(p.keys.join(' ').split(' '))], score: p.r + (p.famous ? 20 : 0) }));
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
    return res.slice(0, limit).map((r) => r[1]);
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
