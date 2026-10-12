/* Jogo 11 — Jogou por onde? (clube brasileiro de cada jogador naquele período) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  const F = {
    '4-4-2': [['GOL', 50, 89], ['LD', 87, 67], ['ZAG', 62, 73], ['ZAG', 38, 73], ['LE', 13, 67], ['VOL', 37, 50], ['VOL', 63, 50], ['MEI', 86, 33], ['MEI', 14, 33], ['ATA', 37, 13], ['ATA', 63, 13]],
    '4-3-3': [['GOL', 50, 88], ['LD', 87, 68], ['ZAG', 63, 74], ['ZAG', 37, 74], ['LE', 13, 68], ['VOL', 50, 55], ['MC', 74, 43], ['MEI', 26, 43], ['PD', 85, 17], ['ATA', 50, 12], ['PE', 15, 17]],
    '3-5-2': [['GOL', 50, 89], ['ZAG', 77, 72], ['ZAG', 50, 74], ['ZAG', 23, 72], ['LD', 88, 52], ['VOL', 50, 55], ['MC', 70, 36], ['MEI', 30, 36], ['LE', 12, 52], ['ATA', 36, 13], ['ATA', 64, 13]],
    '4-2-3-1': [['GOL', 50, 89], ['LD', 87, 67], ['ZAG', 62, 73], ['ZAG', 38, 73], ['LE', 13, 67], ['VOL', 37, 53], ['VOL', 63, 53], ['PD', 86, 32], ['MEI', 50, 34], ['PE', 14, 32], ['ATA', 50, 12]],
  };
  const ACC = { GOL: ['GOL'], LD: ['LD'], LE: ['LE'], ZAG: ['ZAG'], VOL: ['VOL', 'MC'], MC: ['MC', 'VOL', 'MEI'], MEI: ['MEI', 'MC'], PE: ['PE', 'ATA', 'PD'], PD: ['PD', 'ATA', 'PE'], ATA: ['ATA'] };
  const per = (a, b) => (a === b ? String(a % 100).padStart(2, '0') : String(a % 100).padStart(2, '0') + '/' + String(b % 100).padStart(2, '0'));

  function lineup(seedNo, withCoach) {
    const { games } = MF.data;
    const rnd = MF.rng('onde:' + seedNo);
    const forms = Object.keys(F);
    const form = forms[Math.floor(rnd() * forms.length)];
    const used = new Set();
    const slots = F[form].map(([pos, x, y]) => {
      const cand = games.brasil.map((r, i) => i).filter((i) => ACC[pos].includes(games.brasil[i][1]) && !used.has(games.brasil[i][0]));
      const i = MF.pick(cand, rnd);
      used.add(games.brasil[i][0]);
      return { pos, x, y, row: i };
    });
    const coach = withCoach ? Math.floor(rnd() * games.coaches.length) : null;
    return { form, slots, coach };
  }

  function brClubs() {
    if (MF._brc) return MF._brc;
    const { clubs, games } = MF.data;
    const ids = new Set(clubs.filter((c) => c.l === 7).map((c) => c.i));
    games.brasil.forEach((r) => ids.add(r[2]));
    games.coaches.forEach((r) => ids.add(r[1]));
    return (MF._brc = [...ids].map((i) => clubs[i]).sort((a, b) => a.n.localeCompare(b.n)));
  }

  MF.registerGame({
    num: 11, slug: 'jogou-por-onde',
    rules: {
      pt: ['Um time do futebol brasileiro aparece numa formação sorteada, com o período de cada jogador ao lado do nome (ex.: 02/04 = de 2002 a 2004).', 'Digite na barra abaixo o clube brasileiro onde o jogador destacado atuava naquele período. Toque em outro jogador para mudar a ordem.', 'Tentativas livres: erre quantas vezes quiser, pule para outro jogador ou toque na bandeira branca para encerrar. No modo com técnico, descubra também onde o treinador estava. Acerte todos para vencer.'],
      en: ['A Brazilian football team appears in a random formation, with each player’s period next to the name (e.g. 02/04 = 2002 to 2004).', 'Type in the bar below the Brazilian club where the highlighted player was in that period. Tap another player to change the order.', 'Unlimited tries: miss as often as you like, skip to another player or tap the white flag to end. In manager mode, also find where the coach was. Get them all to win.'],
      es: ['Un equipo del fútbol brasileño aparece en una formación sorteada, con el periodo de cada jugador junto al nombre (ej.: 02/04 = de 2002 a 2004).', 'Escribe en la barra de abajo el club brasileño donde jugaba el jugador destacado en ese periodo. Toca otro jugador para cambiar el orden.', 'Intentos libres: falla cuantas veces quieras, salta a otro jugador o toca la bandera blanca para terminar. En el modo con entrenador, descubre también dónde estaba el técnico. Acierta todos para ganar.'],
    },
    options: [
      { key: 'mode', label: () => t('mode'), def: 'players', choices: () => [{ v: 'players', label: t('playersOnly') }, { v: 'coach', label: t('withCoach') }] },
      MF.timerOpt([0, 90, 60, 40]),
    ],
    preview() { return h('div', { class: 'pv-draft br' }, F['4-3-3'].map(([, x, y]) => h('b', { style: { left: x + '%', top: y + '%' } }))); },
    play(board, ctx) {
      const { games, clubs } = MF.data;
      const st = ctx.state;
      const withCoach = st.opts.mode === 'coach';
      const L = lineup(MF.daily('g11-onde', 600), withCoach);
      const items = L.slots.map((s) => ({ ...s, name: games.brasil[s.row][0], club: games.brasil[s.row][2], a: games.brasil[s.row][3], b: games.brasil[s.row][4] }));
      if (withCoach) { const c = games.coaches[L.coach]; items.push({ pos: 'TEC', coach: true, name: c[0], club: c[1], a: c[2], b: c[3] }); }
      // aceita também outro clube do mesmo jogador cujo período cubra o mostrado
      const okClubs = items.map((it) => {
        const s = new Set([it.club]);
        const src = it.coach ? games.coaches.map((r) => [r[0], null, r[1], r[2], r[3]]) : games.brasil;
        src.forEach((r) => { if (r[0] === it.name && r[3] <= it.a && r[4] >= it.b) s.add(r[2]); });
        return s;
      });
      st.res = st.res || items.map(() => null); // 'ok' | 'miss'
      st.tries = st.tries || items.map(() => 0);
      let active = st.res.findIndex((r) => r == null);

      const pitch = h('div', { class: 'mini-pitch br' });
      const coachBox = h('div', { class: 'coach-box' });
      const now = h('div', { class: 'draft-now', 'aria-live': 'polite' });
      const score = h('span', { class: 'pill' });
      function slotBtn(it, k, extraCls) {
        const r = st.res[k];
        const done = ctx.finished();
        const showClub = r != null || done;
        return h('button', {
          type: 'button', class: 'slot br-slot ' + (extraCls || '') + (r ? ' ' + r : '') + (k === active && !done ? ' active' : ''),
          style: it.coach ? null : { left: it.x + '%', top: it.y + '%' }, disabled: r != null || done,
          'aria-label': (it.coach ? t('coach') : it.pos) + ' ' + it.name + ' ' + per(it.a, it.b), onclick: () => { active = k; paint(); ac.focus && ac.focus(); },
        }, h('span', { class: 'slot-pos' }, it.coach ? 'TEC' : it.pos),
          showClub ? MF.photo(it.name, clubs[it.club].n, 22) : null, h('span', { class: 'slot-name' }, it.name), h('span', { class: 'slot-per' }, per(it.a, it.b)),
          showClub ? h('span', { class: 'slot-club' }, MF.crest(clubs[it.club].n, 14), clubs[it.club].n) : null);
      }
      function paint(pop) {
        MF.clear(pitch);
        pitch.insertAdjacentHTML('beforeend', '<svg class="pitch-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96"/><line x1="2" y1="50" x2="98" y2="50"/><circle cx="50" cy="50" r="10"/><rect x="26" y="2" width="48" height="15"/><rect x="26" y="83" width="48" height="15"/></svg>');
        items.forEach((it, k) => { if (!it.coach) pitch.appendChild(slotBtn(it, k, pop === k ? 'pop' : '')); });
        MF.clear(coachBox);
        if (withCoach) coachBox.appendChild(slotBtn(items[items.length - 1], items.length - 1, 'coach' + (pop === items.length - 1 ? ' pop' : '')));
        MF.clear(now);
        if (!ctx.finished() && active >= 0) {
          const it = items[active];
          now.appendChild(h('div', { class: 'draft-club' }, h('span', { class: 'slot-pos big' }, it.coach ? 'TEC' : it.pos), h('strong', null, it.name), h('span', { class: 'per-big' }, per(it.a, it.b))));
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
      const list = brClubs();
      const ac = MF.autocomplete({
        placeholder: t('typeClub'),
        source: (q) => { const nq = MF.norm(q); if (nq.length < 2) return []; return list.filter((c) => MF.norm(c.n).split(' ').some((w) => w.startsWith(nq)) || MF.norm(c.n).startsWith(nq)).slice(0, 8).map((c) => ({ id: c.i, label: c.n, crest: c.n })); },
        onPick: (it) => guess(it.id),
        extra: [h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { if (ctx.finished()) return; nextActive(); paint(); } }, t('skip')), h('button', { class: 'btn btn-ghost flag-btn', type: 'button', 'aria-label': t('giveUp'), title: t('giveUp'), onclick: () => end() }, MF.icon('flag'))],
      });
      board.appendChild(h('div', { class: 'bar' }, h('span', { class: 'pill' }, t('formation') + ' ' + L.form), score, ctx.timerEl));
      board.appendChild(h('div', { class: 'draft-layout' }, h('div', null, pitch, coachBox), h('div', { class: 'draft-side' }, now, ac)));
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
  });
})();
