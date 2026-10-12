/* Jogo 10 — Draft club (temporada 2026/27)
   Onze clubes sorteados das 8 ligas (LaLiga, Premier League, Ligue 1, Serie A, Bundesliga, Brasileirão,
   Liga Argentina e Saudi Pro League). Para cada clube, escolha um jogador do elenco ATUAL e coloque-o no 4-3-3.
   Um único pulo de clube por partida. Base própria: data/draft.json (EA FC 27 + Wikipedia), carregada só aqui. */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  const SLOTS = [
    { k: 'GOL', x: 50, y: 88, acc: ['GK'] },
    { k: 'LE', x: 13, y: 67, acc: ['LB', 'LWB'] },
    { k: 'ZAG', x: 37, y: 72, acc: ['CB'] },
    { k: 'ZAG', x: 63, y: 72, acc: ['CB'] },
    { k: 'LD', x: 87, y: 67, acc: ['RB', 'RWB'] },
    { k: 'MC', x: 26, y: 45, acc: ['CM', 'CAM', 'CDM', 'LM'] },
    { k: 'VOL', x: 50, y: 53, acc: ['CDM', 'CM'] },
    { k: 'MC', x: 74, y: 45, acc: ['CM', 'CAM', 'CDM', 'RM'] },
    { k: 'PE', x: 15, y: 19, acc: ['LW', 'LM', 'CF'] },
    { k: 'ATA', x: 50, y: 13, acc: ['ST', 'CF'] },
    { k: 'PD', x: 85, y: 19, acc: ['RW', 'RM', 'CF'] },
  ];
  // ligações do 4-3-3 para a química
  const EDGES = [[0, 2], [0, 3], [1, 2], [2, 3], [3, 4], [1, 5], [2, 6], [3, 6], [4, 7], [5, 6], [6, 7], [5, 8], [6, 9], [7, 10], [8, 9], [9, 10]];
  const SEQ_LEN = 12; // 11 clubes + 1 reserva para o pulo
  MF.SLOT_LABEL = { pt: {}, en: { GOL: 'GK', LE: 'LB', ZAG: 'CB', LD: 'RB', MC: 'CM', VOL: 'CDM', PE: 'LW', ATA: 'ST', PD: 'RW', MEI: 'CAM' }, es: { GOL: 'POR', LE: 'LI', ZAG: 'DFC', LD: 'LD', MC: 'MC', VOL: 'MCD', PE: 'EI', ATA: 'DC', PD: 'ED', MEI: 'MCO' } };
  MF.slotName = (k) => (MF.SLOT_LABEL[MF.lang] || {})[k] || k;

  // ------------------------------------------------------------------ base 2026/27
  MF.loadDraft = () => {
    if (MF._draftP) return MF._draftP;
    MF._draftP = fetch('data/draft.json').then((r) => { if (!r.ok) throw new Error('draft ' + r.status); return r.json(); }).then((d) => {
      const leagues = d.leagues.map(([k, n], i) => ({ i, k, n }));
      const clubs = d.clubs.map(([n, l, s], i) => ({ i, n, l, s, players: [] }));
      const P = d.players.map(([n, full, nat, pos, alt, r, c, est], i) => {
        const keys = [MF.norm(n)]; if (full) keys.push(MF.norm(full));
        const p = { i, n, full, nat, pos, allpos: alt.split('/'), r, c, est: !!est, keys, toks: [...new Set(keys.join(' ').split(' '))] };
        clubs[c].players.push(i);
        return p;
      });
      return (MF.draft = { leagues, clubs, P });
    }).catch((e) => { MF._draftP = null; throw e; });
    return MF._draftP;
  };
  function search(q) {
    const nq = MF.norm(q);
    if (nq.length < 2) return [];
    const parts = nq.split(' '), res = [];
    for (const p of MF.draft.P) {
      let s = -1;
      if (p.keys.includes(nq)) s = 1000;
      else if (p.keys.some((k) => k.startsWith(nq))) s = 600;
      else if (parts.every((pt) => p.toks.some((tk) => tk.startsWith(pt)))) s = 400;
      else if (nq.length >= 4 && p.keys.some((k) => k.includes(nq))) s = 200;
      if (s >= 0) res.push([s + p.r, p.i]);
    }
    res.sort((a, b) => b[0] - a[0]);
    return res.slice(0, 8).map(([, i]) => i);
  }

  // sequência do dia: alterna as 8 ligas (todas aparecem) e completa com sorteio; sem repetir clube
  function clubsFor(mode, seedNo) {
    const { leagues, clubs } = MF.draft;
    const rnd = MF.rng('draft27:' + mode + ':' + seedNo);
    const byLeague = leagues.map((l) => {
      let cs = clubs.filter((c) => c.l === l.i && c.players.length >= 14);
      cs.sort((a, b) => b.s - a.s);
      if (mode === 'easy') cs = cs.slice(0, 7); // Fácil: os clubes mais fortes de cada liga
      return cs;
    });
    const order = MF.shuffle(leagues.map((l) => l.i), rnd);
    while (order.length < SEQ_LEN) order.push(Math.floor(rnd() * leagues.length));
    const used = new Set(), seq = [];
    for (const li of order) {
      const pool = byLeague[li].filter((c) => !used.has(c.i));
      const c = MF.pick(pool.length ? pool : clubs.filter((x) => !used.has(x.i)), rnd);
      used.add(c.i); seq.push(c.i);
    }
    return seq;
  }

  MF.registerGame({
    num: 10, slug: 'draft-club',
    rules: {
      pt: ['Onze clubes da temporada 2026/27 aparecem, um de cada vez, sorteados entre LaLiga, Premier League, Ligue 1, Serie A, Bundesliga, Brasileirão, Liga Argentina e Saudi Pro League.', 'Para cada clube, digite um jogador do elenco atual dele e coloque-o numa posição livre do 4-3-3. Ele só entra em posições compatíveis com a dele.', 'Você tem 1 pulo por partida para trocar de clube. No fim, veja a nota do time e a química (mesma seleção e mesma liga entre vizinhos, até 33). Se travar, use a bandeira branca para encerrar.'],
      en: ['Eleven 2026/27 clubs appear one at a time, drawn from LaLiga, Premier League, Ligue 1, Serie A, Bundesliga, Brasileirão, Argentine league and Saudi Pro League.', 'For each club, type a player from its current squad and put him in an open 4-3-3 spot. Players only fit positions that suit them.', 'You get 1 skip per game to swap the club. At the end you see the team rating and chemistry (same nation and same league between neighbours, up to 33). If stuck, use the white flag to end.'],
      es: ['Aparecen once clubes de la temporada 2026/27, de uno en uno, sorteados entre LaLiga, Premier League, Ligue 1, Serie A, Bundesliga, Brasileirão, liga argentina y Saudi Pro League.', 'Para cada club, escribe un jugador de su plantilla actual y ponlo en una posición libre del 4-3-3. Solo entra en posiciones compatibles.', 'Tienes 1 salto por partida para cambiar de club. Al final ves la media del equipo y la química (misma selección y misma liga entre vecinos, hasta 33). Si te atascas, usa la bandera blanca para terminar.'],
    },
    options: [
      { key: 'mode', label: () => t('mode'), def: 'easy', choices: () => [{ v: 'easy', label: t('easy') }, { v: 'normal', label: t('normal') }] },
      MF.timerOpt([0, 90, 60, 40]),
    ],
    preview() { return h('div', { class: 'pv-draft' }, SLOTS.map((s) => h('b', { style: { left: s.x + '%', top: s.y + '%' } }))); },
    play(board, ctx) {
      if (MF.draft) return start(board, ctx);
      const wait = h('p', { class: 'loading-inline' }, t('loading'));
      board.appendChild(wait);
      MF.loadDraft().then(() => { wait.remove(); start(board, ctx); }).catch(() => { wait.textContent = t('loadError'); wait.classList.add('err'); });
    },
    renderDetail(d) {
      const r = d.r;
      return h('div', { class: 'rating' },
        h('div', { class: 'rating-big' }, h('strong', null, r.ovr), h('span', null, t('teamRating'))),
        h('div', { class: 'rating-big' }, h('strong', null, r.chem + '/33'), h('span', null, t('chemistry'))),
        r.nLeagues != null ? h('div', { class: 'rating-big' }, h('strong', null, r.nLeagues), h('span', null, t('leaguesUsed'))) : null,
        h('p', { class: 'stars', 'aria-label': r.stars + '/5' }, h('span', { class: 'stars-row' }, Array.from({ length: 5 }, (_, i) => MF.icon(i < r.stars ? 'star' : 'starOff', 24))), ' ', h('span', null, r.label)));
    },
  });

  function start(board, ctx) {
    const { P, clubs, leagues } = MF.draft;
    const st = ctx.state;
    const mode = st.opts.mode || 'easy';
    const seq = clubsFor(mode, MF.daily('g10-draft27:' + mode, 1000));
    if (st.v !== 27) { st.v = 27; st.team = Array(11).fill(null); st.from = Array(11).fill(null); st.step = 0; st.skip = 0; }
    let pending = null;
    const cur = () => clubs[seq[Math.min(st.step + st.skip, SEQ_LEN - 1)]];

    const pitch = h('div', { class: 'mini-pitch' });
    const now = h('div', { class: 'draft-now', 'aria-live': 'polite' });
    const msg = h('p', { class: 'grid-msg', 'aria-live': 'polite' });
    const accepts = (p, s) => p.allpos.some((x) => s.acc.includes(x)) || s.acc.includes(p.pos);
    const skipBtn = h('button', { class: 'btn btn-ghost skip-club', type: 'button', onclick: () => skipClub() });
    function paintSkip() {
      const used = st.skip >= 1 || ctx.finished();
      skipBtn.disabled = used;
      skipBtn.textContent = st.skip >= 1 ? t('skipUsed') : t('skipClub') + ' (1)';
    }
    function paint(pop) {
      const done = ctx.finished();
      MF.clear(pitch);
      pitch.insertAdjacentHTML('beforeend', '<svg class="pitch-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96"/><line x1="2" y1="50" x2="98" y2="50"/><circle cx="50" cy="50" r="10"/><rect x="26" y="2" width="48" height="15"/><rect x="26" y="83" width="48" height="15"/></svg>');
      SLOTS.forEach((s, k) => {
        const pi = st.team[k];
        const can = pending != null && pi == null && accepts(P[pending], s);
        pitch.appendChild(h('button', {
          type: 'button', class: 'slot' + (pi != null ? ' filled' : '') + (can ? ' choose' : '') + (pop === k ? ' pop' : ''), style: { left: s.x + '%', top: s.y + '%' },
          disabled: !can, 'aria-label': MF.slotName(s.k) + (pi != null ? ' ' + P[pi].n : ''), onclick: () => can && place(k),
        }, h('span', { class: 'slot-pos' }, MF.slotName(s.k)),
          pi != null ? [MF.photo(P[pi].full || P[pi].n, clubs[P[pi].c].n, 26), h('span', { class: 'slot-r' }, P[pi].r), h('span', { class: 'slot-name' }, P[pi].n), MF.crest(clubs[st.from[k]].n, 14)] : null));
      });
      MF.clear(now);
      if (!done && st.step < 11) {
        const c = cur();
        now.appendChild(h('span', { class: 'draft-step' }, (st.step + 1) + '/11'));
        now.appendChild(h('div', { class: 'draft-club pop' }, MF.crest(c.n, 44), h('div', { class: 'draft-club-txt' }, h('strong', null, c.n), h('span', { class: 'draft-league' }, leagues[c.l].n))));
        if (pending != null) now.appendChild(h('p', null, t('chooseSlot') + ' ', h('strong', null, P[pending].n)));
      }
      paintSkip();
    }
    function pick(pi) {
      if (ctx.finished()) return;
      const p = P[pi], c = cur();
      if (p.c !== c.i) { MF.anim(now, 'shake'); return MF.toast(t('notInSquad').replace('{p}', p.n).replace('{c}', c.n), 'bad'); }
      if (st.team.includes(pi)) return MF.toast(t('usedAlready'));
      const open = SLOTS.map((s, k) => (st.team[k] == null && accepts(p, s) ? k : -1)).filter((k) => k >= 0);
      if (!open.length) { MF.anim(now, 'shake'); return MF.toast(t('noSlot'), 'bad'); }
      pending = pi;
      if (open.length === 1) return place(open[0]);
      msg.textContent = t('chooseSlot') + ' ' + p.n;
      paint();
    }
    function place(k) {
      st.team[k] = pending;
      st.from[k] = cur().i;
      st.step++;
      pending = null;
      msg.textContent = '';
      ctx.save();
      paint(k);
      if (st.step >= 11) end(true);
    }
    function skipClub() {
      if (ctx.finished() || st.skip >= 1) return;
      st.skip = 1; pending = null; msg.textContent = '';
      ctx.save();
      paint();
      MF.toast(t('skipDone'));
    }
    function end(complete) {
      if (ctx.finished()) return;
      const r = rate(st.team);
      st.scoreLabel = t('teamRating') + ': ' + r.ovr + ' · ' + t('chemistry') + ': ' + r.chem + '/33';
      const line = '⭐'.repeat(r.stars) + '☆'.repeat(5 - r.stars) + '\n' + t('teamRating') + ' ' + r.ovr + ' · ' + t('chemistry') + ' ' + r.chem + '/33 · ' + r.nLeagues + ' ' + t('leaguesUsed').toLowerCase();
      ctx.finish(complete && st.team.every((x) => x != null), r.ovr, line, { r });
      ac.hidden = true;
      paint();
    }
    ctx.onTimeUp = () => end(false);
    const flag = h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end(false) }, MF.icon('flag'));
    const ac = MF.autocomplete({
      source: (q) => search(q).map((i) => { const p = P[i]; return { id: i, label: p.n, sub: MF.pos(p.pos) + ' · ' + clubs[p.c].n, crest: clubs[p.c].n }; }),
      onPick: (it) => pick(it.id), extra: [skipBtn, flag],
    });
    board.appendChild(h('div', { class: 'bar' }, h('span', { class: 'pill' }, t(mode)), h('span', { class: 'pill' }, t('season') + ' 26/27'), ctx.timerEl));
    board.appendChild(h('div', { class: 'draft-layout' }, pitch, h('div', { class: 'draft-side' }, now, ac, msg)));
    if (ctx.finished()) ac.hidden = true;
    paint();
  }

  function rate(team) {
    const { P, clubs } = MF.draft;
    const filled = team.filter((i) => i != null);
    if (!filled.length) return { ovr: 0, chem: 0, nLeagues: 0, stars: 1, label: labels()[0] };
    const ovr = Math.round(filled.reduce((s, i) => s + P[i].r, 0) / 11);
    const link = Array(11).fill(0);
    for (const [a, b] of EDGES) {
      const pa = team[a] != null ? P[team[a]] : null, pb = team[b] != null ? P[team[b]] : null;
      if (!pa || !pb) continue;
      let v = 0;
      if (pa.nat === pb.nat) v += 1;
      if (clubs[pa.c].l === clubs[pb.c].l) v += 1;
      link[a] += v; link[b] += v;
    }
    let chem = 0;
    team.forEach((i, k) => {
      if (i == null) return;
      const natural = SLOTS[k].acc.includes(P[i].pos) ? 1 : 0;
      chem += Math.min(3, Math.round(link[k] * 0.75) + natural);
    });
    const nLeagues = new Set(filled.map((i) => clubs[P[i].c].l)).size;
    const score = ovr + (chem / 33) * 8;
    const stars = score >= 88 ? 5 : score >= 83 ? 4 : score >= 78 ? 3 : score >= 72 ? 2 : 1;
    return { ovr, chem, nLeagues, stars, label: labels()[stars - 1] };
  }
  function labels() {
    const L = { pt: ['Várzea', 'Mediano', 'Bom time', 'Elite', 'Lendário'], en: ['Sunday league', 'Average', 'Good side', 'Elite', 'Legendary'], es: ['Potrero', 'Normal', 'Buen equipo', 'Élite', 'Legendario'] };
    return L[MF.lang] || L.pt;
  }
  MF.rateDraft = rate;
  MF._draftSeq = clubsFor; // usado nos testes
})();
