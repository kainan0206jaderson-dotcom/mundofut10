/* Jogo 2 — Lista Ballon d'Or (top 10 da Bola de Ouro de um ano) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  function boIndex() {
    if (MF._bo) return MF._bo;
    const { games } = MF.data;
    const names = new Map();
    for (const rows of Object.values(games.ballon)) for (const r of rows) names.set(MF.norm(r[1]), r);
    const extra = []; // nomes da Bola de Ouro que não estão na base de jogadores
    for (const [k, r] of names) {
      const p = MF.resolvePlayer(r[1]);
      if (!p || p.nat !== r[2]) extra.push({ key: k, name: r[1], nat: r[2] });
    }
    return (MF._bo = { extra });
  }

  MF.registerGame({
    num: 2, slug: 'lista-ballon-dor',
    rules: {
      pt: ['Um ano da Bola de Ouro é sorteado (1990 a 2025; em 2020 não houve prêmio).', 'Descubra os 10 primeiros colocados. A bandeira de cada um aparece como dica.', 'Palpites livres: erre quantas vezes quiser. Termine a lista ou toque em Desistir. Empates no 10º lugar também contam.'],
      en: ['A Ballon d’Or year is drawn (1990 to 2025; there was no award in 2020).', 'Find the top 10. Each player’s flag is shown as a hint.', 'Unlimited guesses: miss as often as you like. Finish the list or tap Give up. Ties for 10th place count too.'],
      es: ['Se sortea un año del Balón de Oro (1990 a 2025; en 2020 no hubo premio).', 'Descubre a los 10 primeros. La bandera de cada uno aparece como pista.', 'Intentos libres: falla cuantas veces quieras. Completa la lista o toca Rendirse. Los empates en el 10.º puesto también cuentan.'],
    },
    options: [MF.timerOpt([0, 120, 60])],
    preview() {
      return h('div', { class: 'pv-list' }, [1, 2, 3].map((n) => h('span', null, h('b', null, n), '· · · · ·')));
    },
    play(board, ctx) {
      const { games, P } = MF.data;
      const years = Object.keys(games.ballon).sort();
      const year = years[MF.daily('g2-ballon', years.length)];
      const rows = games.ballon[year];
      const st = ctx.state;
      st.found = st.found || [];
      st.miss = st.miss || [];
      const LIVES = 3;
      const keyMap = new Map();
      rows.forEach((r, i) => {
        keyMap.set(MF.norm(r[1]), i);
        const p = MF.resolvePlayer(r[1]);
        if (p && p.nat === r[2]) p.keys.forEach((k) => keyMap.set(k, i));
      });
      const hasPts = rows.some((r) => r[4] != null);
      const pct = +year >= 2010 && +year <= 2015;

      const list = h('ol', { class: 'bo-list' });
      const lives = h('span', { class: 'pill' });
      const found = h('span', { class: 'pill' });
      function paint(hit) {
        MF.clear(list);
        const done = ctx.finished();
        rows.forEach((r, i) => {
          const ok = st.found.includes(i);
          const show = ok || done;
          list.appendChild(h('li', { class: 'bo-row' + (ok ? ' ok' : show ? ' missed' : '') + (hit === i ? ' pop' : '') },
            h('span', { class: 'bo-rank' }, r[0] + 'º'),
            MF.flag(r[2]),
            h('span', { class: 'bo-name' }, show ? [MF.photo(r[1], '', 26), r[1]] : ' '),
            h('span', { class: 'bo-club' }, show ? [MF.crest(r[3], 16), r[3]] : ''),
            hasPts ? h('span', { class: 'bo-pts' }, show && r[4] != null ? (pct ? r[4].toFixed(2) + '%' : r[4] + ' pts') : '') : null));
        });
        lives.textContent = t('misses') + ': ' + st.miss.length;
        found.textContent = t('found') + ': ' + st.found.length + '/' + rows.length;
      }
      function guess(key, label) {
        if (ctx.finished()) return;
        const i = keyMap.get(key);
        if (i != null) {
          if (st.found.includes(i)) return MF.toast(t('already'));
          st.found.push(i);
          ctx.save();
          paint(i);
          if (st.found.length === rows.length) end();
          return;
        }
        if (st.miss.includes(key)) return MF.toast(t('already'));
        st.miss.push(key);
        ctx.save();
        MF.toast(t('wrong') + ': ' + label, 'bad');
        MF.anim(list, 'shake');
        paint();
      }
      function end() {
        const n = st.found.length;
        const line = rows.map((r, i) => (st.found.includes(i) ? '🟨' : '⬛')).join('') + ' ' + n + '/' + rows.length + ' · ' + year;
        st.scoreLabel = t('score') + ': ' + n + '/' + rows.length;
        ctx.finish(n === rows.length, n, line);
        paint();
        ac.hidden = true;
      }
      ctx.onTimeUp = () => end();
      const extra = boIndex().extra;
      const ac = MF.autocomplete({
        source: (q) => {
          const nq = MF.norm(q);
          const fromDb = MF.playerSource()(q).slice(0, 6);
          const ex = nq.length < 2 ? [] : extra.filter((e) => e.key.split(' ').some((w) => w.startsWith(nq)) || e.key.startsWith(nq)).slice(0, 3)
            .map((e) => ({ id: 'x:' + e.key, label: e.name, key: e.key }));
          return [...ex, ...fromDb];
        },
        onPick: (it) => {
          if (typeof it.id === 'string') return guess(it.key, it.label);
          const p = P[it.id];
          const hit = p.keys.find((k) => keyMap.has(k));
          guess(hit || p.key, p.n);
        },
        extra: h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => end() }, t('giveUp')),
      });
      board.appendChild(h('div', { class: 'bar' }, h('span', { class: 'year-badge' }, 'Ballon d’Or ' + year), found, lives, ctx.timerEl));
      board.appendChild(list);
      board.appendChild(ac);
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
  });
})();
