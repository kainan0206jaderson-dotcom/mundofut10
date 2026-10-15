/* Jogo 10 — Draft por clube sorteado
   1) escolha 1 de 5 formações; 2) a cada rodada um clube é sorteado: toque na posição que quiser e escolha QUALQUER jogador
   que já passou por esse clube — lenda ou atual (base do Transfermarkt + lendas curadas).
   Ligações entre vizinhos dão a química: verde = já jogaram no mesmo clube, ou mesma seleção e mesma liga; laranja = mesma
   seleção ou mesma liga; vermelho = nada em comum. Jogador fora da posição perde química.
   Pontuação draft = nota do time + química (até 100). Notas MUNDOFUT: calculadas a partir de valor de mercado, seleção,
   anos em grandes ligas e prêmios (não são notas de videogame).
   Dificuldade: Fácil = gigantes do futebol e 3 trocas de clube; Normal = clubes conhecidos e 2 trocas; Difícil = clubes médios
   e 1 troca; Lendário = clubes menores, sem trocas. */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  const DEF4 = [['GK', 50, 91], ['LB', 11, 68], ['CB', 36, 73], ['CB', 64, 73], ['RB', 89, 68]];
  const BACK4 = [[0, 2], [0, 3], [1, 2], [2, 3], [3, 4]];
  const FORMS = {
    '4-3-3': { s: [...DEF4, ['CM', 24, 47], ['CM', 50, 52], ['CM', 76, 47], ['LW', 15, 18], ['ST', 50, 13], ['RW', 85, 18]],
      l: [...BACK4, [1, 5], [2, 6], [3, 6], [4, 7], [5, 6], [6, 7], [5, 8], [6, 9], [7, 10], [8, 9], [9, 10]] },
    '4-4-2': { s: [...DEF4, ['LM', 11, 42], ['CM', 36, 49], ['CM', 64, 49], ['RM', 89, 42], ['ST', 34, 14], ['ST', 66, 14]],
      l: [...BACK4, [1, 5], [2, 6], [3, 7], [4, 8], [5, 6], [6, 7], [7, 8], [5, 9], [6, 9], [7, 10], [8, 10], [9, 10]] },
    '4-2-3-1': { s: [...DEF4, ['CDM', 35, 55], ['CDM', 65, 55], ['LM', 13, 33], ['CAM', 50, 34], ['RM', 87, 33], ['ST', 50, 11]],
      l: [...BACK4, [1, 7], [2, 5], [3, 6], [4, 9], [5, 6], [5, 7], [5, 8], [6, 8], [6, 9], [7, 10], [8, 10], [9, 10]] },
    '4-1-2-1-2': { s: [...DEF4, ['CDM', 50, 57], ['CM', 24, 44], ['CM', 76, 44], ['CAM', 50, 32], ['ST', 33, 12], ['ST', 67, 12]],
      l: [...BACK4, [1, 6], [2, 5], [3, 5], [4, 7], [5, 6], [5, 7], [6, 8], [7, 8], [6, 9], [7, 10], [8, 9], [8, 10], [9, 10]] },
    '3-5-2': { s: [['GK', 50, 91], ['CB', 24, 74], ['CB', 50, 77], ['CB', 76, 74], ['LM', 9, 45], ['CDM', 34, 56], ['CDM', 66, 56], ['RM', 91, 45], ['CAM', 50, 34], ['ST', 33, 12], ['ST', 67, 12]],
      l: [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [1, 4], [1, 5], [2, 5], [2, 6], [3, 6], [3, 7], [4, 5], [5, 6], [6, 7], [5, 8], [6, 8], [4, 9], [7, 10], [8, 9], [8, 10], [9, 10]] },
    '3-4-3': { s: [['GK', 50, 91], ['CB', 24, 74], ['CB', 50, 77], ['CB', 76, 74], ['LM', 9, 46], ['CM', 36, 51], ['CM', 64, 51], ['RM', 91, 46], ['LW', 16, 18], ['ST', 50, 12], ['RW', 84, 18]],
      l: [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [1, 4], [2, 5], [2, 6], [3, 7], [4, 5], [5, 6], [6, 7], [4, 8], [5, 9], [6, 9], [7, 10], [8, 9], [9, 10]] },
    '4-3-2-1': { s: [...DEF4, ['CM', 22, 52], ['CM', 50, 56], ['CM', 78, 52], ['CAM', 30, 31], ['CAM', 70, 31], ['ST', 50, 11]],
      l: [...BACK4, [1, 5], [2, 6], [3, 6], [4, 7], [5, 6], [6, 7], [5, 8], [6, 8], [6, 9], [7, 9], [8, 9], [8, 10], [9, 10]] },
    '5-3-2': { s: [['GK', 50, 91], ['LB', 9, 60], ['CB', 29, 75], ['CB', 50, 78], ['CB', 71, 75], ['RB', 91, 60], ['CM', 24, 44], ['CM', 50, 50], ['CM', 76, 44], ['ST', 34, 13], ['ST', 66, 13]],
      l: [[0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6], [2, 6], [3, 7], [4, 8], [5, 8], [6, 7], [7, 8], [6, 9], [7, 9], [7, 10], [8, 10], [9, 10]] },
  };
  const PITCH_SVG = '<svg class="pitch-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96"/><line x1="2" y1="50" x2="98" y2="50"/><circle cx="50" cy="50" r="10"/><rect x="26" y="2" width="48" height="15"/><rect x="26" y="83" width="48" height="15"/></svg>';
  // posições "parecidas" (sem perder química)
  const NEAR = { GK: ['GK'], CB: ['CB'], LB: ['LB', 'LWB'], RB: ['RB', 'RWB'], CDM: ['CDM', 'CM'], CM: ['CM', 'CDM', 'CAM'], CAM: ['CAM', 'CM', 'CF'],
    LM: ['LM', 'LW'], RM: ['RM', 'RW'], LW: ['LW', 'LM'], RW: ['RW', 'RM'], ST: ['ST', 'CF'], CF: ['CF', 'ST', 'CAM'] };
  const REROLLS = { easy: 3, normal: 2, hard: 1, legend: 0 };
  const fits = (p, pos) => (NEAR[pos] || [pos]).includes(p.pos) || p.allpos.some((a) => (NEAR[pos] || [pos]).includes(a));
  const line = (pos) => MF.line(pos);

  // clubes sorteáveis por dificuldade: quantidade de jogadores relevantes que passaram por ele (base principal)
  function clubPools() {
    const NEW = MF.isNew();
    if (MF._draftClubs && MF._draftClubs.NEW === NEW) return MF._draftClubs;
    const { P, clubs, byClub } = MF.data;
    const score = clubs.map((c) => {
      const ps = byClub[c.i].map((i) => P[i]);
      const good = ps.filter((p) => p.r >= 78);
      const lines = new Set(good.map((p) => line(p.pos)));
      return { c: c.i, n: ps.length, g: good.length, ok: lines.size === 4 && ps.some((p) => p.pos === 'GK') };
    }).filter((x) => x.ok && x.n >= 25).sort((a, b) => b.g - a.g || b.n - a.n);
    if (NEW) {
      // a partir de 16/10/2026 — Fácil: clubes famosos; Normal: + campeões da Champions; Difícil: campeões da Champions e da
      // Europa League e clubes da 1ª divisão em 2026/27; Lendário: clubes menores (como antes)
      const of = (l) => score.filter((x) => MF.clubOk(l, x.c)).map((x) => x.c);
      return (MF._draftClubs = { NEW, easy: of('easy'), normal: of('normal'), hard: of('hard'), legend: score.slice(70, 420).map((x) => x.c) });
    }
    return (MF._draftClubs = {
      NEW, easy: score.slice(0, 30).map((x) => x.c), normal: score.slice(0, 90).map((x) => x.c),
      hard: score.slice(25, 220).map((x) => x.c), legend: score.slice(70, 420).map((x) => x.c),
    });
  }

  // química: verde (2) = já jogaram no mesmo clube, ou mesma seleção e liga; laranja (1) = mesma seleção ou liga; vermelho (0)
  function linkVal(a, b) {
    if (a.clubs.some((c) => b.clubs.includes(c))) return 2;
    const nat = a.nat && a.nat === b.nat, lg = a.leagues.some((l) => b.leagues.includes(l));
    return nat && lg ? 2 : nat || lg ? 1 : 0;
  }
  function rate(team, formKey) {
    const { P, clubs } = MF.data;
    const F = FORMS[formKey] || FORMS['4-3-3'];
    const ps = team.map((i) => (i != null ? P[i] : null));
    const filled = ps.filter(Boolean);
    const sum = Array(11).fill(0), cnt = Array(11).fill(0);
    const links = F.l.map(([a, b]) => {
      if (!ps[a] || !ps[b]) return null;
      const v = linkVal(ps[a], ps[b]);
      sum[a] += v; sum[b] += v; cnt[a]++; cnt[b]++;
      return v;
    });
    const pchem = ps.map((p, k) => {
      if (!p) return null;
      const pos = F.s[k][0];
      const pen = fits(p, pos) ? 0 : line(p.pos) === line(pos) ? 2 : 5;
      if (!cnt[k]) return Math.max(0, 3 - pen);
      return Math.max(0, Math.min(10, Math.round(3 + 3.5 * (sum[k] / cnt[k])) - pen));
    });
    const chem = Math.min(100, pchem.reduce((s, c) => s + (c || 0), 0));
    const tot = filled.reduce((s, p) => s + p.r, 0);
    const avg = tot / 11;
    const ex = filled.reduce((s, p) => s + Math.max(0, p.r - avg), 0);
    const ovr = filled.length ? Math.floor((tot + ex) / 11 + 0.04) : 0;
    const score = ovr + chem;
    const stars = score >= 182 ? 5 : score >= 170 ? 4 : score >= 157 ? 3 : score >= 142 ? 2 : 1;
    const nClubs = new Set(team.map((x, k) => x != null ? x : null).filter((x) => x != null).map((x) => x)).size;
    const nNations = new Set(filled.map((p) => p.nat)).size;
    return { ovr, chem, score, stars, label: labels()[stars - 1], nNations, nClubs, links, pchem };
  }
  function labels() {
    const L = { pt: ['Várzea', 'Mediano', 'Bom time', 'Elite', 'Lendário'], en: ['Sunday league', 'Average', 'Good side', 'Elite', 'Legendary'], es: ['Potrero', 'Normal', 'Buen equipo', 'Élite', 'Legendario'] };
    return L[MF.lang] || L.pt;
  }

  MF.registerGame({
    num: 10, slug: 'draft-club',
    rules: {
      pt: ['Escolha 1 de 5 formações. Em cada rodada um clube é sorteado: toque na posição que quiser e escolha qualquer jogador que já passou por esse clube — lenda ou atual.', 'As linhas entre vizinhos mostram a química: verde = já jogaram num mesmo clube, ou mesma seleção e mesma liga; laranja = mesma seleção ou mesma liga; vermelho = nada em comum. Fora da posição, o jogador perde química. Toque num jogador escalado e depois noutra posição para trocá-los.', 'Pontuação draft = nota do time + química (até 100). As notas são do MUNDOFUT10 (valor de mercado, seleção, anos em grandes ligas e prêmios).', 'Fácil: só clubes famosos e 3 trocas de clube. Normal: os famosos e os campeões da Champions, 2 trocas. Difícil: campeões da Champions e da Europa League e clubes da 1ª divisão, 1 troca. Lendário: clubes menores e nenhuma troca. Vence quem completar os 11. Ajuda: uma vez por partida, sugere um jogador do clube da rodada.'],
      en: ['Pick 1 of 5 formations. Each round a club is drawn: tap the position you want and pick any player who ever played for that club — legend or current.', 'Lines between neighbours show chemistry: green = they shared a club, or same nation and league; orange = same nation or league; red = nothing in common. Out of position, a player loses chemistry. Tap a player, then another position, to swap them.', 'Draft score = team rating + chemistry (up to 100). Ratings are MUNDOFUT10’s own (market value, caps, years in big leagues and awards).', 'Easy: famous clubs only and 3 club rerolls. Normal: the famous ones plus Champions League winners, 2 rerolls. Hard: Champions League and Europa League winners and top-flight clubs, 1 reroll. Legendary: smaller clubs and no rerolls. Complete the XI to win. Help: once per game, suggests a player from the club of the round.'],
      es: ['Elige 1 de 5 formaciones. En cada ronda se sortea un club: toca la posición que quieras y elige a cualquier jugador que haya pasado por ese club — leyenda o actual.', 'Las líneas entre vecinos muestran la química: verde = compartieron club, o misma selección y liga; naranja = misma selección o liga; rojo = nada en común. Fuera de posición, el jugador pierde química. Toca un jugador y luego otra posición para cambiarlos.', 'Puntuación draft = media del equipo + química (hasta 100). Las medias son de MUNDOFUT10 (valor de mercado, selección, años en grandes ligas y premios).', 'Fácil: solo clubes famosos y 3 cambios de club. Normal: los famosos y los campeones de la Champions, 2 cambios. Difícil: campeones de la Champions y la Europa League y clubes de primera, 1 cambio. Legendario: clubes más pequeños y sin cambios. Completa el once para ganar. Ayuda: una vez por partida, sugiere un jugador del club de la ronda.'],
    },
    options: [MF.levelOpt(), MF.timerOpt([0, 300, 180, 120])],
    preview() { return h('div', { class: 'pv-draft' }, FORMS['4-3-3'].s.map(([, x, y]) => h('b', { style: { left: x + '%', top: y + '%' } }))); },
    play(board, ctx) { start(board, ctx); },
    renderDetail(d) {
      const r = d.r;
      if (!r) return null;
      return h('div', { class: 'rating' },
        h('div', { class: 'rating-big' }, h('strong', null, r.score), h('span', null, t('fdDraft'))),
        h('div', { class: 'rating-big' }, h('strong', null, r.ovr), h('span', null, t('fdRating'))),
        h('div', { class: 'rating-big' }, h('strong', null, r.chem), h('span', null, t('chemistry'))),
        h('p', { class: 'stars', 'aria-label': r.stars + '/5' }, h('span', { class: 'stars-row' }, Array.from({ length: 5 }, (_, i) => MF.icon(i < r.stars ? 'star' : 'starOff', 24))), ' ', h('span', null, r.label)));
    },
  });

  // carta compacta (campo e escolha)
  function card(pi, opts) {
    const { P, clubs } = MF.data;
    const p = P[pi], o = opts || {};
    const tier = p.r >= 88 ? 'elite' : p.r >= 78 ? 'gold' : p.r >= 70 ? 'silver' : 'bronze';
    const club = o.club != null ? clubs[o.club].n : '';
    return h('span', { class: 'fdc ' + tier + (o.mini ? ' mini' : '') + (o.cls ? ' ' + o.cls : '') },
      h('span', { class: 'fdc-top' }, h('b', { class: 'fdc-r' }, p.r), h('span', { class: 'fdc-p' }, MF.pos(o.pos || p.pos))),
      MF.photo(p.n, p.nat, o.mini ? 30 : 58),
      h('span', { class: 'fdc-n' }, p.fn && !/\s/.test(p.fn) ? p.fn : p.n),
      h('span', { class: 'fdc-m' }, MF.flag(p.nat), club ? MF.crest(club, o.mini ? 14 : 20) : null),
      !o.mini && club ? h('span', { class: 'fdc-c' }, club) : null);
  }

  function start(board, ctx) {
    const { P, clubs } = MF.data;
    const st = ctx.state;
    const lvl = MF.level(st);
    const day = MF.today();
    const seed = (MF.isNew() ? 'fd4:' : 'fd3:') + day + ':' + lvl;
    if (st.v !== 3) Object.assign(st, { v: 3, phase: 'form', form: null, forms: null, team: Array(11).fill(null), from: Array(11).fill(null), round: 0, rerolls: 0, drawn: [] });
    if (!st.forms) st.forms = MF.sample(Object.keys(FORMS), 5, MF.rng(seed + ':forms'));
    const pools = clubPools();
    const pool = pools[lvl] || pools.normal;
    // sequência de clubes do dia (sem repetir); trocas puxam o próximo da fila
    const order = MF.shuffle(pool, MF.rng(seed + ':clubs'));
    const clubAt = (k) => order[k % order.length];
    if (!st.drawn.length) st.drawn = [clubAt(0)];
    const curClub = () => st.drawn[st.drawn.length - 1];
    let sel = null;
    let target = null; // posição escolhida para o jogador do clube da rodada

    const F = () => FORMS[st.form];
    const stepPill = h('span', { class: 'pill' });
    const pitch = h('div', { class: 'mini-pitch fd-pitch' });
    const side = h('div', { class: 'fd-side' });
    const sheet = h('div', { class: 'fd-sheet', hidden: true });
    const roundBox = h('div', { class: 'fd-round', 'aria-live': 'polite' });
    const finishBtn = h('button', { class: 'btn btn-primary fd-finish', type: 'button', onclick: () => end(true) }, t('fdFinish'));
    const flag = h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end(false) }, MF.icon('flag'));
    const used = () => new Set(st.team.filter((x) => x != null));
    // busca: qualquer jogador (base principal + estendida) que passou pelo clube da rodada
    const ac = MF.autocomplete({
      placeholder: t('fdTypeFrom'),
      source: (q) => {
        const c = curClub();
        const u = used();
        return MF.searchPlayers(q, 8, (i) => !u.has(i) && P[i].clubs.includes(c)).map((i) => {
          const p = P[i];
          const ys = p.st.filter((s) => s[0] === c).map((s) => (s[1] === s[2] ? s[1] : s[1] + '–' + s[2])).join(', ');
          return { id: i, label: p.n, sub: MF.pos(p.pos) + ' · ' + ys, flag: p.nat };
        });
      },
      onPick: (it) => choose(it.id),
    });

    // ajuda única: sugere um jogador conhecido do clube da rodada para uma posição livre
    const helpBtn = MF.helpButton(ctx, () => {
      if (st.phase !== 'xi') return false;
      const c = curClub(), u = used(), f = F().s;
      const free = f.map(([pos], j) => (st.team[j] == null ? pos : null)).filter(Boolean);
      const want = target != null && st.team[target] == null ? [f[target][0]] : free;
      const cand = (MF.data.byClubAll || MF.data.byClub)[c].filter((i) => !u.has(i)).map((i) => P[i]).sort((a, b) => b.r - a.r);
      const p = cand.find((q) => want.some((pos) => fits(q, pos))) || cand[0];
      if (!p) return false;
      const pos = want.find((x) => fits(p, x)) || p.pos;
      return MF.ht('draftTip', { p: p.n, pos: MF.pos(pos) });
    });
    function closeSheet() { sheet.hidden = true; MF.clear(sheet); board.classList.remove('fd-modal'); }
    function formSheet() {
      MF.clear(sheet);
      const panel = h('div', { class: 'fd-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('fdForm') },
        h('div', { class: 'fd-head' }, h('div', null, h('h3', null, t('fdForm')), h('p', null, t('fdFormNote')))),
        h('div', { class: 'fd-opts fd-forms' }, st.forms.map((fk) => h('button', { type: 'button', class: 'fd-form', onclick: () => { st.form = fk; st.phase = 'xi'; ctx.save(); closeSheet(); paint(); } },
          h('span', { class: 'fd-form-pitch' }, FORMS[fk].s.map(([, x, y]) => h('i', { style: { left: x + '%', top: y + '%' } }))),
          h('strong', null, fk)))));
      sheet.appendChild(h('div', { class: 'fd-scrim' }));
      sheet.appendChild(panel);
      sheet.hidden = false;
      board.classList.add('fd-modal');
    }
    function reroll() {
      if (st.rerolls >= REROLLS[lvl] || ctx.finished()) return;
      st.rerolls++;
      let k = st.drawn.length + st.round;
      let c = clubAt(k);
      while (st.drawn.includes(c) && k < order.length * 2) c = clubAt(++k);
      st.drawn.push(c);
      ctx.save();
      paint();
    }
    function choose(pi) {
      if (ctx.finished() || st.phase !== 'xi') return;
      const p = P[pi];
      let k = target;
      if (k == null || st.team[k] != null) {
        // sem posição escolhida: a primeira vaga livre da posição dele (ou da mesma linha)
        const f = F().s;
        k = f.findIndex(([pos], j) => st.team[j] == null && fits(p, pos));
        if (k < 0) k = f.findIndex(([pos], j) => st.team[j] == null && line(pos) === line(p.pos));
        if (k < 0) k = st.team.findIndex((x) => x == null);
      }
      if (k < 0) return;
      st.team[k] = pi;
      st.from[k] = curClub();
      st.round++;
      target = null;
      if (st.team.every((x) => x != null)) { ctx.save(); return end(true); }
      // próximo clube (sem repetir)
      let n = st.drawn.length + st.round;
      let c = clubAt(n);
      while (st.drawn.includes(c) && n < order.length * 2) c = clubAt(++n);
      st.drawn.push(c);
      ctx.save();
      paint(k);
      setTimeout(() => ac.focus && ac.focus(), 50);
    }
    function tapSlot(k) {
      if (ctx.finished() || st.phase !== 'xi') return;
      const pi = st.team[k];
      if (sel != null) {
        if (sel === k) { sel = null; return paint(); }
        const a = st.team[sel], fa = st.from[sel];
        st.team[sel] = pi; st.from[sel] = st.from[k];
        st.team[k] = a; st.from[k] = fa;
        const from = sel; sel = null; ctx.save(); return paint(k, from);
      }
      if (pi != null) { sel = k; target = null; return paint(); }
      target = target === k ? null : k;
      paint();
      if (target != null) setTimeout(() => ac.focus && ac.focus(), 30);
    }

    function paint(pop, pop2) {
      const done = ctx.finished();
      const r = st.form ? rate(st.team, st.form) : null;
      const nFilled = st.team.filter((x) => x != null).length;
      stepPill.textContent = st.phase === 'form' ? t('fdForm') : t('fdStep') + ' ' + nFilled + '/11';
      MF.clear(pitch);
      pitch.insertAdjacentHTML('beforeend', PITCH_SVG);
      const f = F() || FORMS[st.forms[0]];
      if (st.form) {
        const lines = f.l.map(([a, b], i) => {
          const v = r.links[i];
          const cls = v == null ? 'ln-n' : v === 2 ? 'ln-g' : v === 1 ? 'ln-o' : 'ln-r';
          return `<line class="${cls}" x1="${f.s[a][1]}" y1="${f.s[a][2]}" x2="${f.s[b][1]}" y2="${f.s[b][2]}" vector-effect="non-scaling-stroke"/>`;
        }).join('');
        pitch.insertAdjacentHTML('beforeend', '<svg class="fd-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + lines + '</svg>');
      }
      f.s.forEach(([pos, x, y], k) => {
        const pi = st.team[k];
        const cls = 'fd-slot' + (pi != null ? ' on' : '') + (sel === k ? ' sel' : '') + (sel != null && sel !== k ? ' can' : '') + (target === k ? ' open' : '') + (pop === k || pop2 === k ? ' pop' : '');
        const label = MF.pos(pos) + (pi != null ? ' · ' + P[pi].n + ' ' + P[pi].r + ' · ' + t('chemistry') + ' ' + r.pchem[k] : '');
        const inner = pi != null
          ? [card(pi, { mini: true, pos, club: st.from[k] }), h('span', { class: 'fd-chem c' + Math.min(3, Math.floor((r.pchem[k] || 0) / 3.4)) }, r.pchem[k])]
          : [h('span', { class: 'fd-plus', 'aria-hidden': 'true' }, '+'), h('span', { class: 'fd-pos' }, MF.pos(pos))];
        pitch.appendChild(h('button', { type: 'button', class: cls, style: { left: x + '%', top: y + '%' }, disabled: done || st.phase !== 'xi', 'aria-label': label, 'aria-pressed': sel === k || target === k ? 'true' : null, onclick: () => tapSlot(k) }, inner));
      });
      // rodada: clube sorteado + busca
      MF.clear(roundBox);
      if (!done && st.phase === 'xi') {
        const c = curClub();
        const left = REROLLS[lvl] - st.rerolls;
        roundBox.appendChild(h('div', { class: 'fd-club pop' },
          MF.crest(clubs[c].n, 52),
          h('div', null, h('span', { class: 'fd-club-l' }, t('fdRoundClub') + ' · ' + (st.round + 1) + '/11'), h('strong', null, clubs[c].n),
            h('span', { class: 'fd-club-h' }, target != null ? t('fdForPos').replace('{p}', MF.pos(F().s[target][0])) : t('fdPickPos')))));
        roundBox.appendChild(ac);
        if (REROLLS[lvl] > 0) roundBox.appendChild(h('button', { class: 'btn btn-ghost fd-reroll', type: 'button', disabled: left <= 0, onclick: reroll }, left > 0 ? t('fdRerollClub') + ' (' + left + ')' : t('fdRerollUsed')));
        helpBtn.refresh();
        roundBox.appendChild(helpBtn);
        roundBox.appendChild(helpBtn.note);
      }
      MF.clear(side);
      const stat = (n, l, cls) => h('div', { class: 'fd-stat' + (cls ? ' ' + cls : '') }, h('strong', null, n), h('span', null, l));
      side.appendChild(roundBox);
      side.appendChild(h('div', { class: 'fd-stats' }, stat(r ? r.ovr : 0, t('fdRating')), stat(r ? r.chem : 0, t('chemistry')), stat(r ? r.score : 0, t('fdDraft'), 'big')));
      side.appendChild(h('p', { class: 'fd-formula' }, t('fdFormula')));
      if (!done) {
        if (st.form) side.appendChild(h('p', { class: 'fd-legend' }, h('i', { class: 'lg-g' }), ' ', h('i', { class: 'lg-o' }), ' ', h('i', { class: 'lg-r' }), ' ', t('fdLinks')));
        finishBtn.disabled = nFilled < 11;
        side.appendChild(h('div', { class: 'fd-actions' }, finishBtn, flag));
      } else if (r) {
        side.appendChild(h('p', { class: 'stars', 'aria-label': r.stars + '/5' }, h('span', { class: 'stars-row' }, Array.from({ length: 5 }, (_, i) => MF.icon(i < r.stars ? 'star' : 'starOff', 22))), ' ', h('span', null, r.label)));
      }
      if (!done && st.phase === 'form') formSheet();
    }
    function end(complete) {
      if (ctx.finished()) return;
      closeSheet(); sel = null;
      const r = rate(st.team, st.form || st.forms[0]);
      const ok = complete && st.team.every((x) => x != null);
      st.scoreLabel = t('fdDraft') + ': ' + r.score + ' (' + r.ovr + ' + ' + r.chem + ')';
      const lineTxt = '⭐'.repeat(r.stars) + '☆'.repeat(5 - r.stars) + '\n' + (st.form || '') + ' · ' + t('fdRating') + ' ' + r.ovr + ' · ' + t('chemistry') + ' ' + r.chem + ' · ' + t('fdDraft') + ' ' + r.score;
      ctx.finish(ok, ok ? r.score : 0, lineTxt, { r: { ovr: r.ovr, chem: r.chem, score: r.score, stars: r.stars, label: r.label } });
      paint();
    }
    ctx.onTimeUp = () => end(false);
    // a base completa (todos os jogadores do Transfermarkt) chega em segundo plano
    MF.loadExt && MF.loadExt();
    board.appendChild(h('div', { class: 'bar' }, stepPill, ctx.timerEl));
    board.appendChild(h('div', { class: 'draft-layout fd-layout' }, pitch, side));
    board.appendChild(sheet);
    paint();
  }
  MF.rateDraft = rate;
  MF._draftForms = FORMS;
  MF._draftClubs0 = clubPools;
})();
