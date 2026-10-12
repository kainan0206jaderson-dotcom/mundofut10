/* Jogo 8 — Modo impostor (marque quem pertence à categoria) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const notable = (p) => p.famous || p.r >= 83;
  const BIG_LEAGUES = [13, 53, 31, 19, 16, 7];

  function categories() {
    if (MF._imp) return MF._imp;
    const { P, clubs, byClub, leagues } = MF.data;
    const N = P.filter(notable);
    const cats = [];
    for (const c of clubs) {
      const ins = byClub[c.i].filter((i) => notable(P[i]));
      if (ins.length >= 8) cats.push({ key: 'c' + c.i, kind: 'club', club: c.n, label: { pt: 'Jogou no ' + c.n, en: 'Played for ' + c.n, es: 'Jugó en el ' + c.n }, test: (p) => p.clubs.includes(c.i) });
    }
    const nats = {};
    for (const p of N) nats[p.nat] = (nats[p.nat] || 0) + 1;
    for (const [n, k] of Object.entries(nats)) if (k >= 10) cats.push({ key: 'n' + n, kind: 'nat', nat: n, label: { pt: () => 'Seleção: ' + MF.country(n), en: () => 'Nation: ' + n, es: () => 'Selección: ' + MF.country(n) }, test: (p) => p.nat === n });
    for (const l of BIG_LEAGUES) cats.push({ key: 'l' + l, kind: 'league', label: { pt: 'Jogou na ' + leagues[l], en: 'Played in the ' + leagues[l], es: 'Jugó en la ' + leagues[l] }, test: (p) => p.leagues.includes(l) });
    cats.push({ key: 'bow', kind: 'award', label: { pt: 'Venceu a Bola de Ouro', en: 'Won the Ballon d’Or', es: 'Ganó el Balón de Oro' }, test: (p) => p.bow });
    cats.push({ key: 'bo', kind: 'award', label: { pt: 'Ficou no top 10 da Bola de Ouro (1990–2025)', en: 'Ballon d’Or top 10 (1990–2025)', es: 'Top 10 del Balón de Oro (1990–2025)' }, test: (p) => p.bo });
    cats.push({ key: 'wc', kind: 'award', label: { pt: 'Campeão da Copa do Mundo (1994–2026)', en: 'World Cup winner (1994–2026)', es: 'Campeón del Mundial (1994–2026)' }, test: (p) => p.wc, safe: (p) => !['Brazil', 'France', 'Italy', 'Spain', 'Germany', 'Argentina'].includes(p.nat) });
    cats.push({ key: 'gk', kind: 'pos', label: { pt: 'Goleiros', en: 'Goalkeepers', es: 'Porteros' }, test: (p) => p.pos === 'GK' });
    const ok = cats.filter((c) => N.filter(c.test).length >= 6 && N.filter((p) => !c.test(p)).length >= 10);
    return (MF._imp = { cats: ok, N });
  }
  const labelOf = (c) => { const l = c.label[MF.lang] || c.label.pt; return typeof l === 'function' ? l() : l; };

  MF.registerGame({
    num: 8, slug: 'modo-impostor',
    rules: {
      pt: ['A categoria do dia fica no centro e 10 jogadores aparecem em volta.', 'Marque todos que pertencem à categoria. Quem não pertence é impostor.', 'Normal: marque todos e confirme. Um por um: cada toque vale, e um impostor encerra o jogo.'],
      en: ['Today’s category is in the middle with 10 players around it.', 'Pick everyone who fits the category. Those who don’t are impostors.', 'Normal: pick them all and confirm. One by one: every tap counts and one impostor ends the game.'],
      es: ['La categoría del día está en el centro con 10 jugadores alrededor.', 'Marca a todos los que encajan en la categoría. Los que no, son impostores.', 'Normal: márcalos todos y confirma. Uno a uno: cada toque cuenta y un impostor termina el juego.'],
    },
    options: [
      { key: 'mode', label: () => t('mode'), def: 'normal', choices: () => [{ v: 'normal', label: t('normal') }, { v: 'one', label: t('oneByOne') }] },
      MF.timerOpt([0, 60, 40]),
    ],
    preview() { return h('div', { class: 'pv-imp' }, Array.from({ length: 6 }, (_, i) => h('b', { class: i === 2 ? 'bad' : '' }))); },
    play(board, ctx) {
      const { cats, N } = categories();
      const cat = cats[MF.daily('g8-impostor', cats.length)];
      const rnd = MF.rng('imp:' + MF.today());
      const ins = N.filter(cat.test);
      const outs = N.filter((p) => !cat.test(p) && (!cat.safe || cat.safe(p)));
      const k = 4 + Math.floor(rnd() * 3);
      const good = MF.sample(ins.sort((a, b) => b.r - a.r).slice(0, 40), k, rnd);
      // impostores parecidos: mesma geração e, se possível, mesma liga/seleção dos corretos
      const era = good.reduce((s, p) => s + p.born, 0) / good.length;
      const near = outs.filter((p) => Math.abs(p.born - era) <= 10 && (good.some((g) => g.nat === p.nat || g.leagues.some((l) => p.leagues.includes(l)))));
      const bad = MF.sample((near.length >= 10 - k ? near : outs).sort((a, b) => b.r - a.r).slice(0, 60), 10 - k, rnd);
      const ring = MF.shuffle([...good, ...bad], rnd).map((p) => p.i);
      const goodSet = new Set(good.map((p) => p.i));
      const st = ctx.state;
      st.sel = st.sel || [];
      const one = st.opts.mode === 'one';

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
          const cls = 'imp-p' + (on ? ' on' : '') + (done ? (isGood ? ' good' : ' imp-bad') : one && on ? (isGood ? ' good' : ' imp-bad') : '') + (pop === i ? ' pop' : '');
          const ang = (n / ring.length) * Math.PI * 2 - Math.PI / 2;
          wrap.appendChild(h('button', {
            type: 'button', class: cls, style: { '--x': (50 + 41 * Math.cos(ang)).toFixed(2) + '%', '--y': (50 + 41 * Math.sin(ang)).toFixed(2) + '%' },
            'aria-pressed': on ? 'true' : 'false', disabled: done || (one && on), onclick: () => tap(i),
          }, h('span', null, p.n)));
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
        ctx.finish(win, hits, line);
        paint();
      }
      ctx.onTimeUp = () => end();
      board.appendChild(h('div', { class: 'bar' }, counter, ctx.timerEl));
      board.appendChild(wrap);
      board.appendChild(h('div', { class: 'row-btns center' }, confirm));
      paint();
    },
  });
})();
