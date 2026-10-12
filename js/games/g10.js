/* Jogo 10 — Draft club (um jogador por clube sorteado + nota, química e entrosamento) */
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
  MF.SLOT_LABEL = { pt: {}, en: { GOL: 'GK', LE: 'LB', ZAG: 'CB', LD: 'RB', MC: 'CM', VOL: 'CDM', PE: 'LW', ATA: 'ST', PD: 'RW', MEI: 'CAM' }, es: { GOL: 'POR', LE: 'LI', ZAG: 'DFC', LD: 'LD', MC: 'MC', VOL: 'MCD', PE: 'EI', ATA: 'DC', PD: 'ED', MEI: 'MCO' } };
  MF.slotName = (k) => (MF.SLOT_LABEL[MF.lang] || {})[k] || k;

  function clubsFor(mode, seedNo) {
    const { byClub, P } = MF.data;
    const base = mode === 'easy' ? MF.criteria('easy').cl : MF.criteria('normal').cl;
    const rnd = MF.rng('draft:' + mode + ':' + seedNo);
    // clubes precisam ter jogadores em várias linhas para o draft ser possível
    const ok = base.filter((c) => { const lines = new Set(byClub[c.id].map((i) => MF.line(P[i].pos))); return lines.size >= 3; });
    return MF.sample(ok, 11, rnd).map((c) => c.id);
  }

  MF.registerGame({
    num: 10, slug: 'draft-club',
    rules: {
      pt: ['Onze clubes aparecem, um de cada vez. Para cada um, escolha um jogador que passou por ele e coloque-o numa posição livre do 4-3-3.', 'O jogador só entra em posições compatíveis com a dele. Se travar, use a bandeira branca para encerrar.', 'No fim, você vê a nota do time, a química (seleção, clube e liga em comum entre vizinhos, até 33) e o entrosamento real: quantas duplas vizinhas jogaram juntas de verdade.'],
      en: ['Eleven clubs appear, one at a time. For each, pick a player who played there and put him in an open 4-3-3 spot.', 'Players only go into positions that suit them. If you get stuck, use the white flag to end.', 'At the end you get the team rating, chemistry (shared nation, club and league between neighbours, up to 33) and real-life chemistry: how many neighbouring pairs actually played together.'],
      es: ['Aparecen once clubes, de uno en uno. Para cada uno, elige un jugador que pasó por él y ponlo en una posición libre del 4-3-3.', 'El jugador solo entra en posiciones compatibles. Si te atascas, usa la bandera blanca para terminar.', 'Al final ves la media del equipo, la química (selección, club y liga en común entre vecinos, hasta 33) y la química real: cuántas parejas vecinas jugaron juntas de verdad.'],
    },
    options: [
      { key: 'mode', label: () => t('mode'), def: 'easy', choices: () => [{ v: 'easy', label: t('easy') }, { v: 'normal', label: t('normal') }] },
      MF.timerOpt([0, 90, 60, 40]),
    ],
    preview() { return h('div', { class: 'pv-draft' }, SLOTS.map((s) => h('b', { style: { left: s.x + '%', top: s.y + '%' } }))); },
    play(board, ctx) {
      const { P, clubs } = MF.data;
      const st = ctx.state;
      const mode = st.opts.mode || 'easy';
      const seq = clubsFor(mode, MF.daily('g10-draft:' + mode, 500));
      st.team = st.team || Array(11).fill(null); // índice do jogador por posição
      st.from = st.from || Array(11).fill(null); // clube usado em cada posição
      st.step = st.step || 0;
      let pending = null;

      const pitch = h('div', { class: 'mini-pitch' });
      const now = h('div', { class: 'draft-now', 'aria-live': 'polite' });
      const msg = h('p', { class: 'grid-msg', 'aria-live': 'polite' });
      const accepts = (p, s) => p.allpos.some((x) => s.acc.includes(x)) || s.acc.includes(p.pos);
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
            pi != null ? [h('span', { class: 'slot-r' }, P[pi].r), h('span', { class: 'slot-name' }, P[pi].fn || P[pi].n), MF.crest(clubs[st.from[k]].n, 14)] : null));
        });
        MF.clear(now);
        if (!done && st.step < 11) {
          const c = clubs[seq[st.step]];
          now.appendChild(h('span', { class: 'draft-step' }, (st.step + 1) + '/11'));
          now.appendChild(h('div', { class: 'draft-club pop' }, MF.crest(c.n, 44), h('strong', null, c.n)));
          if (pending != null) now.appendChild(h('p', null, t('chooseSlot') + ' ', h('strong', null, P[pending].n)));
        }
      }
      function pick(pi) {
        if (ctx.finished()) return;
        const p = P[pi];
        const club = seq[st.step];
        if (!p.clubs.includes(club)) { MF.anim(now, 'shake'); return MF.toast(t('notInClub') + ' (' + p.n + ')', 'bad'); }
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
        st.from[k] = seq[st.step];
        st.step++;
        pending = null;
        msg.textContent = '';
        ctx.save();
        paint(k);
        if (st.step >= 11) end(true);
      }
      function end(complete) {
        const r = MF.rateTeam(st.team);
        st.scoreLabel = t('teamRating') + ': ' + r.ovr + ' · ' + t('chemistry') + ': ' + r.chem + '/33';
        const line = '⭐'.repeat(r.stars) + '☆'.repeat(5 - r.stars) + '\n' + t('teamRating') + ' ' + r.ovr + ' · ' + t('chemistry') + ' ' + r.chem + '/33 · ' + t('realLink') + ' ' + r.real + '/' + EDGES.length;
        ctx.finish(complete && st.team.every((x) => x != null), r.ovr, line, { team: st.team.slice(), r });
        ac.hidden = true;
        paint();
      }
      ctx.onTimeUp = () => end(false);
      const flag = h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end(false) }, MF.icon('flag'));
      const ac = MF.autocomplete({ source: MF.playerSource(), onPick: (it) => pick(it.id), extra: flag });
      board.appendChild(h('div', { class: 'bar' }, h('span', { class: 'pill' }, t(mode)), ctx.timerEl));
      board.appendChild(h('div', { class: 'draft-layout' }, pitch, h('div', { class: 'draft-side' }, now, ac, msg)));
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
    renderDetail(d) {
      const r = d.r;
      return h('div', { class: 'rating' },
        h('div', { class: 'rating-big' }, h('strong', null, r.ovr), h('span', null, t('teamRating'))),
        h('div', { class: 'rating-big' }, h('strong', null, r.chem + '/33'), h('span', null, t('chemistry'))),
        h('div', { class: 'rating-big' }, h('strong', null, r.real + '/' + EDGES.length), h('span', null, t('teammatesPairs'))),
        h('p', { class: 'stars', 'aria-label': r.stars + '/5' }, h('span', { class: 'stars-row' }, Array.from({ length: 5 }, (_, i) => MF.icon(i < r.stars ? 'star' : 'starOff', 24))), ' ', h('span', null, r.label)));
    },
  });

  MF.rateTeam = (team) => {
    const { P } = MF.data;
    const filled = team.map((i, k) => [i, k]).filter(([i]) => i != null);
    if (!filled.length) return { ovr: 0, chem: 0, real: 0, stars: 0, label: '—' };
    const ovr = Math.round(filled.reduce((s, [i]) => s + P[i].r, 0) / 11);
    const link = Array(11).fill(0);
    let real = 0;
    const tmCache = {};
    for (const [a, b] of EDGES) {
      const pa = team[a] != null ? P[team[a]] : null, pb = team[b] != null ? P[team[b]] : null;
      if (!pa || !pb) continue;
      let v = 0;
      if (pa.nat === pb.nat) v += 1;
      if (pa.clubs.some((c) => pb.clubs.includes(c))) v += 1;
      else if (pa.leagues.some((l) => pb.leagues.includes(l))) v += 0.5;
      link[a] += v; link[b] += v;
      tmCache[pa.i] = tmCache[pa.i] || MF.teammates(pa.i);
      if (tmCache[pa.i].has(pb.i)) real++;
    }
    let chem = 0;
    team.forEach((i, k) => {
      if (i == null) return;
      const natural = SLOTS[k].acc.includes(P[i].pos) ? 1 : 0;
      chem += Math.min(3, Math.round(link[k] * 0.75) + natural);
    });
    const score = ovr + (chem / 33) * 8 + (real / EDGES.length) * 6;
    const stars = score >= 96 ? 5 : score >= 90 ? 4 : score >= 84 ? 3 : score >= 76 ? 2 : 1;
    const labels = { pt: ['Várzea', 'Mediano', 'Bom time', 'Elite', 'Lendário'], en: ['Sunday league', 'Average', 'Good side', 'Elite', 'Legendary'], es: ['Potrero', 'Normal', 'Buen equipo', 'Élite', 'Legendario'] };
    return { ovr, chem, real, stars, label: (labels[MF.lang] || labels.pt)[stars - 1] };
  };
})();
