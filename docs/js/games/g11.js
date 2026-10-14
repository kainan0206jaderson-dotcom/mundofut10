/* Jogo 11 — Jogou por onde? (clube de cada jogador do futebol mundial naquele período) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  const F = {
    '4-4-2': [['GK', 50, 89], ['RB', 87, 67], ['CB', 62, 73], ['CB', 38, 73], ['LB', 13, 67], ['CM', 37, 50], ['CM', 63, 50], ['RM', 86, 33], ['LM', 14, 33], ['ST', 37, 13], ['ST', 63, 13]],
    '4-3-3': [['GK', 50, 88], ['RB', 87, 68], ['CB', 63, 74], ['CB', 37, 74], ['LB', 13, 68], ['CDM', 50, 55], ['CM', 74, 43], ['CM', 26, 43], ['RW', 85, 17], ['ST', 50, 12], ['LW', 15, 17]],
    '3-5-2': [['GK', 50, 89], ['CB', 77, 72], ['CB', 50, 74], ['CB', 23, 72], ['RM', 88, 52], ['CDM', 50, 55], ['CM', 70, 36], ['CAM', 30, 36], ['LM', 12, 52], ['ST', 36, 13], ['ST', 64, 13]],
    '4-2-3-1': [['GK', 50, 89], ['RB', 87, 67], ['CB', 62, 73], ['CB', 38, 73], ['LB', 13, 67], ['CDM', 37, 53], ['CDM', 63, 53], ['RW', 86, 32], ['CAM', 50, 34], ['LW', 14, 32], ['ST', 50, 12]],
  };
  const ACC = { GK: ['GK'], RB: ['RB', 'RWB'], LB: ['LB', 'LWB'], CB: ['CB'], CDM: ['CDM', 'CM'], CM: ['CM', 'CDM', 'CAM'], CAM: ['CAM', 'CM', 'CF'], RM: ['RM', 'RW'], LM: ['LM', 'LW'], RW: ['RW', 'RM', 'CF'], LW: ['LW', 'LM', 'CF'], ST: ['ST', 'CF'] };
  const per = (a, b) => (a === b ? String(a % 100).padStart(2, '0') : String(a % 100).padStart(2, '0') + '/' + String(b % 100).padStart(2, '0'));
  // só lendas: aposentados que marcaram época entre os anos 70 e 2000 (inclui quem parou há pouco)
  const TOP = { easy: 110, normal: 260, hard: 520, legend: 5000 };
  const MINLEN = { easy: 3, normal: 2, hard: 1, legend: 0 };
  function legends() {
    if (MF._ondeLeg) return MF._ondeLeg;
    const { P, byClub } = MF.data;
    // ordem de prestígio: lendas da curadoria e premiados primeiro
    const score = (p) => p.r + (p.icon ? 6 : 0) + (p.bow ? 4 : p.bo ? 2 : 0) + (p.wc ? 1 : 0) + Math.min(3, (p.caps || 0) / 40);
    const out = P.slice(0, MF.CORE_N).filter((p) => (p.legend || p.icon) && (p.retired || p.icon) && p.first <= 2008 && p.lastY >= 1970 && p.st.length)
      .sort((a, b) => score(b) - score(a));
    return (MF._ondeLeg = out);
  }
  function pool(lvl) {
    MF._ondePool = MF._ondePool || {};
    if (MF._ondePool[lvl]) return MF._ondePool[lvl];
    const { byClub } = MF.data;
    const out = [];
    for (const p of legends().slice(0, TOP[lvl])) {
      // passagens com datas confiáveis; no Fácil e no Normal só clubes conhecidos
      const st = p.st.filter((s) => MF.exact(s) && s[2] - s[1] >= MINLEN[lvl] && (lvl === 'legend' || lvl === 'hard' || byClub[s[0]].length >= (lvl === 'easy' ? 60 : 30)));
      if (st.length) out.push({ i: p.i, pos: p.pos, st, w: out.length < TOP[lvl] / 3 ? 2 : 1 });
    }
    return (MF._ondePool[lvl] = out);
  }

  function lineup(seedNo, lvl) {
    const rnd = MF.rng('onde3:' + lvl + ':' + seedNo);
    const forms = Object.keys(F);
    const form = forms[Math.floor(rnd() * forms.length)];
    const pl = pool(lvl);
    const used = new Set(), usedClub = new Map();
    const slots = F[form].map(([pos, x, y]) => {
      let cand = pl.filter((c) => ACC[pos].includes(c.pos) && !used.has(c.i));
      if (!cand.length) cand = pl.filter((c) => MF.line(c.pos) === MF.line(pos) && !used.has(c.i));
      if (!cand.length) cand = pl.filter((c) => !used.has(c.i));
      // metade de famosos garantida: prioriza lendas/famosos
      const fam = cand.filter((c) => c.w === 2);
      if (fam.length && rnd() < 0.7) cand = fam;
      const c = MF.pick(cand, rnd);
      used.add(c.i);
      // evita repetir o mesmo clube mais de 2 vezes no time
      const opts = c.st.filter(([ci]) => (usedClub.get(ci) || 0) < 2);
      const s = MF.pick(opts.length ? opts : c.st, rnd);
      usedClub.set(s[0], (usedClub.get(s[0]) || 0) + 1);
      return { pos, x, y, pi: c.i, club: s[0], a: s[1], b: s[2] };
    });
    return { form, slots };
  }

  function allClubs() {
    if (MF._allClubs) return MF._allClubs;
    const { clubs, byClub } = MF.data;
    return (MF._allClubs = clubs.filter((c) => byClub[c.i].length).map((c) => ({ i: c.i, n: c.n, k: MF.norm(c.n), sz: byClub[c.i].length })));
  }

  MF.registerGame({
    num: 11, slug: 'jogou-por-onde',
    rules: {
      pt: ['Só lendas: um time de craques aposentados que marcaram época dos anos 70 aos 2000 (e quem parou há pouco), numa formação sorteada, com o período ao lado do nome (ex.: 97/02 = de 1997 a 2002).', 'Digite o clube onde o jogador destacado atuava naquele período. Vale qualquer clube em que ele jogou nesses anos. Toque em outro jogador para mudar a ordem.', 'Fácil: as maiores lendas, passagens longas por clubes grandes e a bandeira do país do clube como dica. Normal: lendas conhecidas e passagens de 2 anos ou mais. Difícil: mais lendas e qualquer passagem. Lendário: qualquer lenda, inclusive passagens curtas e clubes menores.', 'Tentativas livres: erre quantas vezes quiser, pule ou toque na bandeira branca para encerrar. Acerte todos para vencer.'],
      en: ['Legends only: a team of retired greats from the 70s to the 2000s (and recent retirees), in a random formation, with the period next to the name (e.g. 97/02 = 1997 to 2002).', 'Type the club where the highlighted player was in that period. Any club he played for in those years counts. Tap another player to change the order.', 'Easy: the biggest legends, long spells at big clubs and the club’s country flag as a hint. Normal: well-known legends and spells of 2+ years. Hard: more legends and any spell. Legendary: any legend, including short spells and smaller clubs.', 'Unlimited tries: miss as often as you like, skip or tap the white flag to end. Get them all to win.'],
      es: ['Solo leyendas: un equipo de cracks retirados que marcaron época de los 70 a los 2000 (y quienes se retiraron hace poco), en una formación sorteada, con el periodo junto al nombre (ej.: 97/02 = de 1997 a 2002).', 'Escribe el club donde jugaba el jugador destacado en ese periodo. Vale cualquier club en el que jugó en esos años. Toca otro jugador para cambiar el orden.', 'Fácil: las mayores leyendas, etapas largas en clubes grandes y la bandera del país del club como pista. Normal: leyendas conocidas y etapas de 2 años o más. Difícil: más leyendas y cualquier etapa. Legendario: cualquier leyenda, incluso etapas cortas y clubes pequeños.', 'Intentos libres: falla cuantas veces quieras, salta o toca la bandera blanca para terminar. Acierta todos para ganar.'],
    },
    options: [MF.levelOpt(), MF.timerOpt([0, 120, 90, 60])],
    preview() { return h('div', { class: 'pv-draft br' }, F['4-3-3'].map(([, x, y]) => h('b', { style: { left: x + '%', top: y + '%' } }))); },
    play(board, ctx) {
      const { P, clubs } = MF.data;
      const st = ctx.state;
      const lvl = MF.level(st);
      const L = lineup(MF.daily('g11-onde-lendas:' + lvl, 900), lvl);
      const items = L.slots.map((s) => ({ ...s, name: P[s.pi].n, nat: P[s.pi].nat }));
      // aceita qualquer clube do jogador cuja passagem toque o período mostrado
      const okClubs = items.map((it) => {
        const s = new Set([it.club]);
        P[it.pi].st.forEach(([c, a, b]) => { if (a <= it.b && b >= it.a) s.add(c); });
        // mesmo clube com outro nome na base (ex.: grafias diferentes)
        const nm = MF.norm(clubs[it.club].n);
        clubs.forEach((c) => { if (MF.norm(c.n) === nm) s.add(c.i); });
        return s;
      });
      st.res = st.res || items.map(() => null); // 'ok' | 'miss'
      st.tries = st.tries || items.map(() => 0);
      let active = st.res.findIndex((r) => r == null);

      const pitch = h('div', { class: 'mini-pitch br' });
      const now = h('div', { class: 'draft-now', 'aria-live': 'polite' });
      const score = h('span', { class: 'pill' });
      function slotBtn(it, k, extraCls) {
        const r = st.res[k];
        const done = ctx.finished();
        const showClub = r != null || done;
        return h('button', {
          type: 'button', class: 'slot br-slot ' + (extraCls || '') + (r ? ' ' + r : '') + (k === active && !done ? ' active' : ''),
          style: { left: it.x + '%', top: it.y + '%' }, disabled: r != null || done,
          'aria-label': MF.pos(it.pos) + ' ' + it.name + ' ' + per(it.a, it.b), onclick: () => { active = k; paint(); ac.focus && ac.focus(); },
        }, h('span', { class: 'slot-pos' }, MF.pos(it.pos)),
          showClub ? MF.photo(it.name, clubs[it.club].n, 22) : null, h('span', { class: 'slot-name' }, it.name), h('span', { class: 'slot-per' }, per(it.a, it.b)),
          showClub ? h('span', { class: 'slot-club' }, MF.crest(clubs[it.club].n, 14), clubs[it.club].n) : null);
      }
      function paint(pop) {
        MF.clear(pitch);
        pitch.insertAdjacentHTML('beforeend', '<svg class="pitch-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96"/><line x1="2" y1="50" x2="98" y2="50"/><circle cx="50" cy="50" r="10"/><rect x="26" y="2" width="48" height="15"/><rect x="26" y="83" width="48" height="15"/></svg>');
        items.forEach((it, k) => pitch.appendChild(slotBtn(it, k, pop === k ? 'pop' : '')));
        MF.clear(now);
        if (!ctx.finished() && active >= 0) {
          const it = items[active];
          now.appendChild(h('div', { class: 'draft-club' }, h('span', { class: 'slot-pos big' }, MF.pos(it.pos)), h('strong', null, it.name), h('span', null, MF.flag(it.nat)), h('span', { class: 'per-big' }, per(it.a, it.b))));
          if (lvl === 'easy' && clubs[it.club].cty) now.appendChild(h('p', { class: 'tries' }, t('clubCountry') + ' ', MF.flag(clubs[it.club].cty), ' ' + MF.country(clubs[it.club].cty)));
          if (st.tries[active]) now.appendChild(h('p', { class: 'tries' }, st.tries[active] + ' ' + t('missesWord')));
        }
        const ok = st.res.filter((r) => r === 'ok').length;
        score.textContent = ok + '/' + items.length;
      }
      function nextActive() {
        const order = items.map((_, k) => (active + 1 + k) % items.length);
        active = order.find((k) => st.res[k] == null);
        if (active == null) { active = -1; end(); }
      }
      function guess(ci) {
        if (ctx.finished() || active < 0) return;
        const k = active;
        if (okClubs[k].has(ci)) {
          st.res[k] = 'ok';
          ctx.save();
          nextActive();
          if (!ctx.finished()) paint(k);
          return;
        }
        st.tries[k]++;
        MF.toast(t('wrong') + ': ' + clubs[ci].n, 'bad');
        MF.anim(now, 'shake');
        ctx.save();
        paint();
      }
      function end() {
        if (ctx.finished()) return;
        const ok = st.res.filter((r) => r === 'ok').length;
        items.forEach((_, k) => { if (st.res[k] == null) st.res[k] = 'miss'; });
        const errs = st.tries.reduce((a, b) => a + b, 0);
        const line = items.map((_, k) => (st.res[k] === 'ok' ? '🟩' : '🟥')).join('') + ' ' + ok + '/' + items.length + ' · ' + errs + ' ' + t('missesWord') + ' · ' + L.form;
        st.scoreLabel = t('score') + ': ' + ok + '/' + items.length;
        ctx.finish(ok === items.length, ok, line);
        ac.hidden = true;
        paint();
      }
      ctx.onTimeUp = () => end();
      const list = allClubs();
      const ac = MF.autocomplete({
        placeholder: t('typeClub'),
        // busca só por nome: nunca mostra escudo
        source: (q) => {
          const nq = MF.norm(q); if (nq.length < 2) return [];
          return list.filter((c) => c.k.startsWith(nq) || c.k.split(/[\s-]/).some((w) => w.startsWith(nq)))
            .sort((a, b) => (b.k.startsWith(nq) - a.k.startsWith(nq)) || b.sz - a.sz).slice(0, 8).map((c) => ({ id: c.i, label: c.n }));
        },
        onPick: (it) => guess(it.id),
        extra: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { if (ctx.finished()) return; nextActive(); paint(); } }, t('skip')), h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end() }, MF.icon('flag'))],
      });
      board.appendChild(h('div', { class: 'bar' }, h('span', { class: 'pill' }, t('formation') + ' ' + L.form), score, ctx.timerEl));
      board.appendChild(h('div', { class: 'draft-layout' }, h('div', null, pitch), h('div', { class: 'draft-side' }, now, ac)));
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
  });
})();
