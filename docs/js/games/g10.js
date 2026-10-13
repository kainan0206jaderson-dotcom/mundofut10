/* Jogo 10 — Draft (no estilo FUT Draft / FUTBIN Draft Simulator), temporada 2026/27
   1) escolha 1 de 5 formações; 2) escolha o capitão entre 5 cartas; 3) toque em cada posição e escolha 1 de 5 cartas.
   Ligações entre vizinhos dão a química (verde, laranja, vermelho); jogadores escalados podem trocar de posição.
   Pontuação draft = nota do time (fórmula FUT) + química (até 100). Um único "Trocar opções" por partida.
   Clubes: os mais relevantes de LaLiga, Premier League, Ligue 1, Serie A, Bundesliga, Liga Argentina e Saudi Pro League,
   e todos os do Brasileirão. Base própria: data/draft.json (EA FC 27 + Wikipedia), carregada só aqui. */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  // clubes relevantes por liga (o Brasileirão entra inteiro)
  const TOP = {
    laliga: ['Real Madrid', 'Barcelona', 'Atlético de Madrid', 'Athletic Bilbao', 'Real Sociedad', 'Real Betis', 'Villarreal', 'Sevilla', 'Valencia'],
    premier: ['Manchester City', 'Manchester United', 'Arsenal', 'Liverpool', 'Chelsea', 'Tottenham', 'Aston Villa', 'Newcastle'],
    ligue1: ['Paris Saint-Germain', 'Olympique de Marseille', 'Lyon', 'Monaco', 'Lille', 'Lens', 'Nice'],
    seriea: ['Inter de Milão', 'Milan', 'Juventus', 'Napoli', 'Roma', 'Atalanta', 'Lazio', 'Fiorentina'],
    bundesliga: ['Bayern de Munique', 'Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig', 'Stuttgart', 'Eintracht Frankfurt', 'Borussia Mönchengladbach'],
    argentina: ['River Plate', 'Boca Juniors', 'Racing Club', 'Independiente', 'San Lorenzo', 'Estudiantes de La Plata', 'Vélez Sarsfield', 'Rosario Central', "Newell's Old Boys"],
    saudi: ['Al-Hilal', 'Al-Nassr', 'Al-Ittihad', 'Al-Ahli', 'Al-Qadsiah'],
  };

  // formações: [posição, x %, y %] (y = 0 no ataque) e ligações entre vizinhos
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

  // ------------------------------------------------------------------ base 2026/27
  MF.loadDraft = () => {
    if (MF._draftP) return MF._draftP;
    MF._draftP = fetch('data/draft.json').then((r) => { if (!r.ok) throw new Error('draft ' + r.status); return r.json(); }).then((d) => {
      const leagues = d.leagues.map(([k, n], i) => ({ i, k, n }));
      const clubs = d.clubs.map(([n, l, s], i) => ({ i, n, l, s, players: [] }));
      const P = d.players.map(([n, full, nat, pos, alt, r, c, est], i) => {
        const p = { i, n, full, nat, pos, allpos: alt.split('/'), r, c, est: !!est };
        clubs[c].players.push(i);
        return p;
      });
      // pool do draft: clubes relevantes (Brasileirão inteiro), jogadores com nota 65+
      const keep = new Set();
      leagues.forEach((l) => {
        const cs = clubs.filter((c) => c.l === l.i);
        (l.k === 'brasileirao' ? cs : cs.filter((c) => (TOP[l.k] || []).includes(c.n))).forEach((c) => keep.add(c.i));
      });
      const pool = P.filter((p) => keep.has(p.c) && p.r >= 65);
      return (MF.draft = { leagues, clubs, P, pool, keep });
    }).catch((e) => { MF._draftP = null; throw e; });
    return MF._draftP;
  };
  const fits = (p, pos) => p.pos === pos || p.allpos.includes(pos);

  // química: ligação verde (2) = mesmo clube, ou mesma seleção e mesma liga; laranja (1) = mesma seleção ou liga; vermelha (0)
  function linkVal(a, b) {
    const { clubs } = MF.draft;
    if (a.c === b.c) return 2;
    const nat = a.nat === b.nat, lg = clubs[a.c].l === clubs[b.c].l;
    return nat && lg ? 2 : nat || lg ? 1 : 0;
  }
  function rate(team, formKey) {
    const { P, clubs } = MF.draft;
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
      if (!cnt[k]) return 3;
      const avg = sum[k] / cnt[k];
      return Math.max(0, Math.min(10, Math.round(3 + 3.5 * avg) - (fits(p, F.s[k][0]) ? 0 : 3)));
    });
    const chem = Math.min(100, pchem.reduce((s, c) => s + (c || 0), 0));
    // nota do time no estilo FUT: soma + o quanto cada um passa da média, dividido por 11
    const tot = filled.reduce((s, p) => s + p.r, 0);
    const avg = tot / 11;
    const ex = filled.reduce((s, p) => s + Math.max(0, p.r - avg), 0);
    const ovr = filled.length ? Math.floor((tot + ex) / 11 + 0.04) : 0;
    const score = ovr + chem;
    const stars = score >= 180 ? 5 : score >= 168 ? 4 : score >= 155 ? 3 : score >= 140 ? 2 : 1;
    const nLeagues = new Set(filled.map((p) => clubs[p.c].l)).size;
    const nClubs = new Set(filled.map((p) => p.c)).size;
    const nNations = new Set(filled.map((p) => p.nat)).size;
    return { ovr, chem, score, stars, label: labels()[stars - 1], nLeagues, nClubs, nNations, links, pchem };
  }
  function labels() {
    const L = { pt: ['Várzea', 'Mediano', 'Bom time', 'Elite', 'Lendário'], en: ['Sunday league', 'Average', 'Good side', 'Elite', 'Legendary'], es: ['Potrero', 'Normal', 'Buen equipo', 'Élite', 'Legendario'] };
    return L[MF.lang] || L.pt;
  }

  // 5 opções para uma posição: 1 craque (85+ quando der), 2 bons (79–84), 2 do resto; se já houver vizinho escalado,
  // uma das opções costuma ter ligação com ele (como no FUT, dá para buscar química sem garantia)
  function offerFor(pos, rnd, blocked, neighbours) {
    const { pool } = MF.draft;
    const cand = pool.filter((p) => fits(p, pos) && !blocked.has(p.i));
    const nat = cand.filter((p) => p.pos === pos);
    const base = nat.length >= 12 ? nat : cand;
    const hi = base.filter((p) => p.r >= 85), mid = base.filter((p) => p.r >= 79 && p.r < 85), lo = base.filter((p) => p.r < 79 && p.r >= 70);
    const out = [];
    const take = (arr) => { const a = arr.filter((p) => !out.includes(p)); if (a.length) out.push(MF.pick(a, rnd)); };
    take(hi.length && rnd() < 0.75 ? hi : mid);
    take(mid); take(mid.length > 6 && rnd() < 0.5 ? mid : lo);
    take(lo);
    if (neighbours.length) {
      const linked = cand.filter((p) => !out.includes(p) && neighbours.some((n) => linkVal(p, n) === 2));
      const half = cand.filter((p) => !out.includes(p) && neighbours.some((n) => linkVal(p, n) === 1) && p.r >= 74);
      take(linked.length && rnd() < 0.7 ? linked : half.length ? half : lo);
    } else take(lo.length ? lo : mid);
    while (out.length < 5) { const rest = cand.filter((p) => !out.includes(p)); if (!rest.length) break; out.push(MF.pick(rest, rnd)); }
    return MF.shuffle(out.map((p) => p.i), rnd);
  }

  MF.registerGame({
    num: 10, slug: 'draft-club',
    rules: {
      pt: ['Monte um time da temporada 2026/27 como no FUT Draft: escolha 1 de 5 formações e depois o capitão entre 5 cartas.', 'Toque em cada posição vazia e escolha 1 de 5 jogadores. As linhas entre vizinhos mostram a química: verde = mesmo clube, ou mesma seleção e mesma liga; laranja = mesma seleção ou mesma liga; vermelho = nada em comum. Toque num jogador escalado e depois noutra posição para trocá-los de lugar.', 'Pontuação draft = nota do time + química (até 100). Você tem 1 "Trocar opções" por partida. Clubes: os mais relevantes de LaLiga, Premier League, Ligue 1, Serie A, Bundesliga, Liga Argentina e Saudi Pro League, e todos do Brasileirão.'],
      en: ['Build a 2026/27 team like in FUT Draft: pick 1 of 5 formations, then your captain from 5 cards.', 'Tap each empty position and pick 1 of 5 players. Lines between neighbours show chemistry: green = same club, or same nation and league; orange = same nation or league; red = nothing in common. Tap a player on the pitch, then another position, to swap them.', 'Draft score = team rating + chemistry (up to 100). You get 1 "New options" per game. Clubs: the most relevant from LaLiga, Premier League, Ligue 1, Serie A, Bundesliga, Argentine league and Saudi Pro League, plus every Brasileirão club.'],
      es: ['Arma un equipo de la temporada 2026/27 como en el FUT Draft: elige 1 de 5 formaciones y luego al capitán entre 5 cartas.', 'Toca cada posición vacía y elige 1 de 5 jugadores. Las líneas entre vecinos muestran la química: verde = mismo club, o misma selección y liga; naranja = misma selección o liga; rojo = nada en común. Toca un jugador del campo y luego otra posición para intercambiarlos.', 'Puntuación draft = media del equipo + química (hasta 100). Tienes 1 "Cambiar opciones" por partida. Clubes: los más relevantes de LaLiga, Premier League, Ligue 1, Serie A, Bundesliga, liga argentina y Saudi Pro League, y todos los del Brasileirão.'],
    },
    options: [MF.timerOpt([0, 180, 120, 90])],
    preview() { return h('div', { class: 'pv-draft' }, FORMS['4-3-3'].s.map(([, x, y]) => h('b', { style: { left: x + '%', top: y + '%' } }))); },
    play(board, ctx) {
      if (MF.draft) return start(board, ctx);
      const wait = h('p', { class: 'loading-inline' }, t('loading'));
      board.appendChild(wait);
      MF.loadDraft().then(() => { wait.remove(); start(board, ctx); }).catch(() => { wait.textContent = t('loadError'); wait.classList.add('err'); });
    },
    renderDetail(d) {
      const r = d.r;
      if (!r) return null;
      return h('div', { class: 'rating' },
        h('div', { class: 'rating-big' }, h('strong', null, r.score), h('span', null, t('fdDraft'))),
        h('div', { class: 'rating-big' }, h('strong', null, r.ovr), h('span', null, t('fdRating'))),
        h('div', { class: 'rating-big' }, h('strong', null, r.chem), h('span', null, t('chemistry'))),
        h('p', { class: 'stars', 'aria-label': r.stars + '/5' }, h('span', { class: 'stars-row' }, Array.from({ length: 5 }, (_, i) => MF.icon(i < r.stars ? 'star' : 'starOff', 24))), ' ', h('span', null, r.label)),
        r.nClubs != null ? h('p', { class: 'fd-counts' }, r.nLeagues + ' ' + t('fdLeagues').toLowerCase() + ' · ' + r.nClubs + ' ' + t('fdClubs').toLowerCase() + ' · ' + r.nNations + ' ' + t('fdNations').toLowerCase()) : null);
    },
  });

  // carta FUT compacta (opções e campo)
  function card(pi, opts) {
    const { P, clubs } = MF.draft;
    const p = P[pi], o = opts || {};
    const tier = p.r >= 85 ? 'elite' : p.r >= 75 ? 'gold' : p.r >= 65 ? 'silver' : 'bronze';
    const kids = [
      h('span', { class: 'fdc-top' }, h('b', { class: 'fdc-r' }, p.r), h('span', { class: 'fdc-p' }, MF.pos(o.pos || p.pos))),
      MF.photo(p.full || p.n, clubs[p.c].n, o.mini ? 30 : 58),
      h('span', { class: 'fdc-n' }, p.n),
      h('span', { class: 'fdc-m' }, MF.flag(p.nat), MF.crest(clubs[p.c].n, o.mini ? 14 : 20)),
    ];
    if (!o.mini) kids.push(h('span', { class: 'fdc-c' }, clubs[p.c].n));
    return h(o.tag || 'span', Object.assign({ class: 'fdc ' + tier + (o.mini ? ' mini' : '') + (o.cls ? ' ' + o.cls : '') }, o.attrs || {}), kids);
  }

  function start(board, ctx) {
    const { P } = MF.draft;
    const st = ctx.state;
    const day = MF.today();
    if (st.v !== 28) Object.assign(st, { v: 28, phase: 'form', form: null, forms: null, capOffer: null, team: Array(11).fill(null), cap: null, offers: {}, reroll: 0 });
    if (!st.forms) st.forms = MF.sample(Object.keys(FORMS), 5, MF.rng('fd28:forms:' + day));
    let sel = null; // índice do jogador escalado selecionado para troca
    let openSlot = null; // posição com o seletor aberto

    const F = () => FORMS[st.form];
    const used = () => new Set(st.team.filter((x) => x != null));
    const blocked = () => {
      const b = used();
      Object.values(st.offers).forEach((ids) => ids.forEach((i) => b.add(i)));
      (st.capOffer || []).forEach((i) => b.add(i));
      return b;
    };
    const neighbours = (k) => F().l.filter(([a, b]) => a === k || b === k).map(([a, b]) => st.team[a === k ? b : a]).filter((x) => x != null).map((i) => P[i]);

    const stepPill = h('span', { class: 'pill' });
    const pitch = h('div', { class: 'mini-pitch fd-pitch' });
    const side = h('div', { class: 'fd-side' });
    const sheet = h('div', { class: 'fd-sheet', hidden: true });
    const finishBtn = h('button', { class: 'btn btn-primary fd-finish', type: 'button', onclick: () => end(true) }, t('fdFinish'));
    const flag = h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end(false) }, MF.icon('flag'));

    function rerollBtn(fn) {
      const b = h('button', { class: 'btn btn-ghost fd-reroll', type: 'button', disabled: st.reroll >= 1, onclick: () => { if (st.reroll >= 1) return; st.reroll = 1; fn(); ctx.save(); } },
        st.reroll >= 1 ? t('fdRerollUsed') : t('fdReroll') + ' (1)');
      return b;
    }
    function closeSheet() { openSlot = null; sheet.hidden = true; MF.clear(sheet); board.classList.remove('fd-modal'); }
    function showSheet(title, sub, body, closable, foot) {
      MF.clear(sheet);
      const panel = h('div', { class: 'fd-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'fd-head' }, h('div', null, h('h3', null, title), sub ? h('p', null, sub) : null),
          closable ? h('button', { class: 'btn btn-ghost fd-x', type: 'button', 'aria-label': t('close'), onclick: () => { closeSheet(); paint(); } }, MF.icon('close')) : null),
        body, foot || null);
      sheet.appendChild(h('div', { class: 'fd-scrim', onclick: () => { if (closable) { closeSheet(); paint(); } } }));
      sheet.appendChild(panel);
      sheet.hidden = false;
      board.classList.add('fd-modal');
      // foco: dentro do diálogo (só move o foco sozinho com mouse/teclado, não no toque)
      const f = panel.querySelector('.fd-opts button:not(:disabled)');
      if (f && window.matchMedia && matchMedia('(pointer: fine)').matches) f.focus({ preventScroll: true });
    }

    // ---------------- fase 1: formação
    function formSheet() {
      const body = h('div', { class: 'fd-opts fd-forms' }, st.forms.map((fk) => h('button', { type: 'button', class: 'fd-form', onclick: () => pickForm(fk) },
        h('span', { class: 'fd-form-pitch' }, FORMS[fk].s.map(([, x, y]) => h('i', { style: { left: x + '%', top: y + '%' } }))),
        h('strong', null, fk))));
      showSheet(t('fdForm'), t('fdFormNote'), body, false);
    }
    function pickForm(fk) {
      st.form = fk; st.phase = 'cap';
      // capitão: 5 cartas de nota alta, posições diferentes que existam na formação
      const posSet = [...new Set(F().s.map((s) => s[0]))];
      const rnd = MF.rng('fd28:cap:' + day + ':' + fk);
      const cand = MF.draft.pool.filter((p) => p.r >= 85 && posSet.includes(p.pos));
      const out = [];
      for (const p of MF.shuffle(cand, rnd)) { if (out.length >= 5) break; if (out.filter((q) => MF.line(q.pos) === MF.line(p.pos)).length < 2) out.push(p); }
      for (const p of cand) { if (out.length >= 5) break; if (!out.includes(p)) out.push(p); }
      st.capOffer = out.map((p) => p.i);
      ctx.save();
      paint();
    }
    // ---------------- fase 2: capitão
    function capSheet() {
      const body = h('div', { class: 'fd-opts' }, st.capOffer.map((pi) => card(pi, { tag: 'button', attrs: { type: 'button', onclick: () => pickCap(pi), 'aria-label': P[pi].n + ' ' + P[pi].r } })));
      showSheet(t('fdCaptain'), st.form, body, false, h('div', { class: 'fd-foot' }, rerollBtn(() => {
        const rnd = MF.rng('fd28:cap:' + day + ':' + st.form + ':r');
        const posSet = [...new Set(F().s.map((s) => s[0]))];
        const prev = new Set(st.capOffer);
        st.capOffer = MF.sample(MF.draft.pool.filter((p) => p.r >= 84 && posSet.includes(p.pos) && !prev.has(p.i)), 5, rnd).map((p) => p.i);
        paint();
      })));
    }
    function pickCap(pi) {
      const p = P[pi];
      let k = F().s.findIndex((s) => s[0] === p.pos);
      if (k < 0) k = F().s.findIndex((s) => fits(p, s[0]));
      st.team[k] = pi; st.cap = k; st.capOffer = null; st.phase = 'xi';
      ctx.save();
      closeSheet();
      paint(k);
    }
    // ---------------- fase 3: escalação
    function openPick(k) {
      if (ctx.finished()) return;
      if (!st.offers[k]) {
        st.offers[k] = offerFor(F().s[k][0], MF.rng('fd28:' + day + ':' + st.form + ':' + k), blocked(), neighbours(k));
        ctx.save();
      }
      openSlot = k;
      const u = used();
      const body = h('div', { class: 'fd-opts' }, st.offers[k].map((pi) => card(pi, { tag: 'button', pos: F().s[k][0], cls: u.has(pi) ? 'off' : '',
        attrs: { type: 'button', disabled: u.has(pi), onclick: () => place(k, pi), 'aria-label': P[pi].n + ' ' + P[pi].r + (u.has(pi) ? ' · ' + t('fdUsed') : '') } })));
      showSheet(t('fdPick') + ' · ' + MF.pos(F().s[k][0]), t('fdLinks'), body, true, h('div', { class: 'fd-foot' }, rerollBtn(() => {
        const b = blocked(); st.offers[k].forEach((i) => b.add(i));
        st.offers[k] = offerFor(F().s[k][0], MF.rng('fd28:' + day + ':' + st.form + ':' + k + ':r'), b, neighbours(k));
        openPick(k);
      })));
    }
    function place(k, pi) {
      if (used().has(pi)) return;
      st.team[k] = pi;
      delete st.offers[k];
      ctx.save();
      closeSheet();
      paint(k);
      const b = pitch.querySelectorAll('.fd-slot')[k]; if (b) b.focus({ preventScroll: true });
    }
    function tapSlot(k) {
      if (ctx.finished() || st.phase !== 'xi') return;
      const pi = st.team[k];
      if (sel != null) {
        if (sel === k) { sel = null; return paint(); }
        const a = st.team[sel];
        if (fits(P[a], F().s[k][0]) && (pi == null || fits(P[pi], F().s[sel][0]))) {
          st.team[k] = a; st.team[sel] = pi;
          if (st.cap === sel) st.cap = k; else if (st.cap === k) st.cap = sel;
          const from = sel; sel = null; ctx.save(); return paint(k, from);
        }
        if (pi == null) { MF.toast(t('noSlot'), 'bad'); return; }
        sel = k; return paint();
      }
      if (pi != null) { sel = k; return paint(); }
      openPick(k);
    }

    function paint(pop, pop2) {
      const done = ctx.finished();
      const r = st.form ? rate(st.team, st.form) : null;
      const nFilled = st.team.filter((x) => x != null).length;
      stepPill.textContent = st.phase === 'form' ? t('fdForm') : st.phase === 'cap' ? t('fdCaptain') : t('fdStep') + ' ' + nFilled + '/11';
      // campo
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
        const canMove = sel != null && sel !== k && fits(P[st.team[sel]], pos) && (pi == null || fits(P[pi], f.s[sel][0]));
        const cls = 'fd-slot' + (pi != null ? ' on' : '') + (sel === k ? ' sel' : '') + (canMove ? ' can' : '') + (pop === k || pop2 === k ? ' pop' : '') + (openSlot === k ? ' open' : '');
        const label = MF.pos(pos) + (pi != null ? ' · ' + P[pi].n + ' ' + P[pi].r + ' · ' + t('chemistry') + ' ' + r.pchem[k] : '');
        const inner = pi != null
          ? [card(pi, { mini: true, pos }), h('span', { class: 'fd-chem c' + Math.min(3, Math.floor((r.pchem[k] || 0) / 3.4)) }, r.pchem[k]), st.cap === k ? h('span', { class: 'fd-capt', title: t('fdCap') }, 'C') : null]
          : [h('span', { class: 'fd-plus', 'aria-hidden': 'true' }, '+'), h('span', { class: 'fd-pos' }, MF.pos(pos))];
        pitch.appendChild(h('button', { type: 'button', class: cls, style: { left: x + '%', top: y + '%' }, disabled: done || st.phase !== 'xi', 'aria-label': label, 'aria-pressed': sel === k ? 'true' : null, onclick: () => tapSlot(k) }, inner));
      });
      // painel lateral (resumo, como o "Draft Summary")
      MF.clear(side);
      const stat = (n, l, cls) => h('div', { class: 'fd-stat' + (cls ? ' ' + cls : '') }, h('strong', null, n), h('span', null, l));
      side.appendChild(h('div', { class: 'fd-stats' }, stat(r ? r.ovr : 0, t('fdRating')), stat(r ? r.chem : 0, t('chemistry')), stat(r ? r.score : 0, t('fdDraft'), 'big')));
      side.appendChild(h('p', { class: 'fd-formula' }, t('fdFormula')));
      if (r) side.appendChild(h('div', { class: 'fd-counts' }, h('span', null, h('b', null, r.nLeagues), ' ', t('fdLeagues')), h('span', null, h('b', null, r.nClubs), ' ', t('fdClubs')), h('span', null, h('b', null, r.nNations), ' ', t('fdNations'))));
      if (!done) {
        const msg = st.phase !== 'xi' ? '' : sel != null ? t('fdMove').replace('{p}', P[st.team[sel]].n) : nFilled < 11 ? t('fdTapSlot') + ' ' + t('fdSwapHint') : t('fdSwapHint');
        if (msg) side.appendChild(h('p', { class: 'fd-msg', 'aria-live': 'polite' }, msg));
        if (st.form) side.appendChild(h('p', { class: 'fd-legend' }, h('i', { class: 'lg-g' }), ' ', h('i', { class: 'lg-o' }), ' ', h('i', { class: 'lg-r' }), ' ', t('fdLinks')));
        finishBtn.disabled = nFilled < 11;
        finishBtn.title = nFilled < 11 ? t('fdNeed') : '';
        side.appendChild(h('div', { class: 'fd-actions' }, finishBtn, flag));
      } else if (r) {
        side.appendChild(h('p', { class: 'stars', 'aria-label': r.stars + '/5' }, h('span', { class: 'stars-row' }, Array.from({ length: 5 }, (_, i) => MF.icon(i < r.stars ? 'star' : 'starOff', 22))), ' ', h('span', null, r.label)));
      }
      // seletores obrigatórios
      if (!done && st.phase === 'form') formSheet();
      else if (!done && st.phase === 'cap') capSheet();
      else if (openSlot == null && !sheet.hidden) closeSheet();
    }
    function end(complete) {
      if (ctx.finished()) return;
      closeSheet(); sel = null;
      const r = rate(st.team, st.form || st.forms[0]);
      const ok = complete && st.team.every((x) => x != null);
      st.scoreLabel = t('fdDraft') + ': ' + r.score + ' (' + r.ovr + ' + ' + r.chem + ')';
      const line = '⭐'.repeat(r.stars) + '☆'.repeat(5 - r.stars) + '\n' + (st.form || '') + ' · ' + t('fdRating') + ' ' + r.ovr + ' · ' + t('chemistry') + ' ' + r.chem + ' · ' + t('fdDraft') + ' ' + r.score;
      ctx.finish(ok, ok ? r.score : 0, line, { r: { ovr: r.ovr, chem: r.chem, score: r.score, stars: r.stars, label: r.label, nLeagues: r.nLeagues, nClubs: r.nClubs, nNations: r.nNations } });
      paint();
    }
    ctx.onTimeUp = () => end(false);
    sheet.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openSlot != null) { const k = openSlot; closeSheet(); paint(); const b = pitch.querySelectorAll('.fd-slot')[k]; if (b) b.focus(); return; }
      if (e.key !== 'Tab') return;
      const els = [...sheet.querySelectorAll('button:not(:disabled)')];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    board.appendChild(h('div', { class: 'bar' }, stepPill, h('span', { class: 'pill' }, t('season') + ' 26/27'), ctx.timerEl));
    board.appendChild(h('div', { class: 'draft-layout fd-layout' }, pitch, side));
    board.appendChild(sheet);
    paint();
  }

  MF.rateDraft = rate;
  MF._draftForms = FORMS;
  MF._draftOffer = offerFor; // usado nos testes
})();
