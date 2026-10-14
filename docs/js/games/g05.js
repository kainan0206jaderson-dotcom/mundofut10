/* Jogo 5 — Futebol grid (3×3 de clubes × clubes/seleções) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);

  const EASY_CLUBS = ['Real Madrid', 'Barcelona', 'Atlético de Madrid', 'Manchester United', 'Manchester City', 'Liverpool', 'Chelsea', 'Arsenal',
    'Tottenham', 'Bayern de Munique', 'Borussia Dortmund', 'Juventus', 'Milan', 'Inter de Milão', 'Paris Saint-Germain', 'Roma', 'Napoli', 'Sevilla', 'Valencia'];
  const EASY_NATS = ['Brazil', 'Argentina', 'France', 'Spain', 'Germany', 'England', 'Portugal', 'Italy', 'Netherlands', 'Belgium'];
  // faixa de clubes (pelo ranking de jogadores na base), mínimo por seleção e mínimo de respostas por casa
const LEVEL = { easy: [0, 25, 0, 6], normal: [0, 80, 60, 3], hard: [40, 260, 25, 2], legend: [120, 700, 10, 1] };

  MF.criteria = (mode) => {
    const key = 'crit:' + mode;
    MF._crit = MF._crit || {};
    if (MF._crit[key]) return MF._crit[key];
    const { P, clubs } = MF.data;
    // só a base principal e jogadores de 1990 para cá (o grid do dia é igual para todos)
    const core = P.slice(0, MF.CORE_N).filter(MF.era);
    const byNat = new Map(), byClub = clubs.map(() => []);
    for (const p of core) {
      if (!p.natGuess) { if (!byNat.has(p.nat)) byNat.set(p.nat, []); byNat.get(p.nat).push(p.i); }
      for (const c of p.clubs) byClub[c].push(p.i);
    }
    const [c0, c1, mn] = LEVEL[mode] || LEVEL.normal;
    let cl, na;
    if (mode === 'easy') {
      cl = clubs.filter((c) => EASY_CLUBS.includes(c.n)).map((c) => ({ type: 'club', id: c.i, label: c.n, set: new Set(byClub[c.i]) }));
      na = EASY_NATS.map((n) => ({ type: 'nat', id: n, label: n, set: new Set(byNat.get(n) || []) }));
    } else {
      const rank = clubs.map((c) => c.i).filter((i) => byClub[i].length >= 8).sort((a, b) => byClub[b].length - byClub[a].length).slice(c0, c1);
      cl = rank.map((i) => ({ type: 'club', id: i, label: clubs[i].n, set: new Set(byClub[i]) }));
      na = [...byNat.entries()].filter(([, v]) => v.length >= mn).map(([n, v]) => ({ type: 'nat', id: n, label: n, set: new Set(v) }));
    }
    return (MF._crit[key] = { cl, na });
  };
  const inter = (a, b) => { let n = 0; const [s, l] = a.size < b.size ? [a, b] : [b, a]; for (const x of s) if (l.has(x)) n++; return n; };
  MF.critLabel = (c, size) => c.type === 'club'
    ? h('span', { class: 'crit' }, MF.crest(MF.data.clubs[c.id].n, size || 26), h('span', null, MF.data.clubs[c.id].n))
    : h('span', { class: 'crit' }, MF.flag(c.id, 'lg'), h('span', null, MF.country(c.id)));

  function buildGrid(mode, seedNo) {
    const { cl, na } = MF.criteria(mode);
    const minCell = (LEVEL[mode] || LEVEL.normal)[3];
    const rnd = MF.rng('grid:' + mode + ':' + seedNo);
    for (let tries = 0; tries < 600; tries++) {
      const rows = MF.sample(cl, 3, rnd);
      // colunas possíveis: critérios com interseção suficiente com as três linhas
      const okCol = (c) => !rows.includes(c) && rows.every((r) => inter(r.set, c.set) >= minCell);
      const nats = na.filter(okCol), cls = cl.filter(okCol);
      const nNat = Math.min(nats.length, 1 + Math.floor(rnd() * 2));
      if (nNat + cls.length < 3 || cls.length < 3 - nNat) continue;
      const cols = MF.shuffle([...MF.sample(nats, nNat, rnd), ...MF.sample(cls, 3 - nNat, rnd)], rnd);
      return { rows, cols };
    }
    return null;
  }

  MF.registerGame({
    num: 5, slug: 'futebol-grid',
    rules: {
      pt: ['Preencha as 9 casas com jogadores que passaram pelo clube da linha e pelo clube ou seleção da coluna.', 'Se o jogador servir em mais de uma casa livre, você escolhe onde colocar; se servir em só uma, ele entra direto.', 'Vale qualquer jogador que atuou de 1990 para cá, da ativa ou aposentado (base completa do Transfermarkt). Palpites livres; cada jogador só entra uma vez. Complete o grid ou toque em Desistir.', 'Dificuldade — Fácil: só gigantes da Europa e grandes seleções, com muitas respostas por casa. Normal: clubes conhecidos. Difícil: clubes menores e casas com poucas respostas. Lendário: qualquer clube ou seleção, e casas que podem ter uma única resposta.'],
      en: ['Fill the 9 squares with players who played for the row club and for the column club or nation.', 'If a player fits more than one open square, you choose; if he fits only one, he goes straight in.', 'Any player active from 1990 on counts, current or retired (full Transfermarkt database). Unlimited guesses; each player can be used once. Complete the grid or tap Give up.', 'Difficulty — Easy: only European giants and big nations, with many answers per square. Normal: well-known clubs. Hard: smaller clubs and squares with few answers. Legendary: any club or nation, and squares that may have a single answer.'],
      es: ['Rellena las 9 casillas con jugadores que pasaron por el club de la fila y por el club o selección de la columna.', 'Si un jugador sirve en más de una casilla libre, eliges dónde; si solo sirve en una, entra directo.', 'Vale cualquier jugador que jugó de 1990 en adelante, en activo o retirado (base completa de Transfermarkt). Intentos libres; cada jugador entra una sola vez. Completa la cuadrícula o toca Rendirse.', 'Dificultad — Fácil: solo gigantes de Europa y grandes selecciones, con muchas respuestas por casilla. Normal: clubes conocidos. Difícil: clubes más pequeños y casillas con pocas respuestas. Legendario: cualquier club o selección, y casillas que pueden tener una sola respuesta.'],
    },
    options: [
      MF.levelOpt(),
      MF.timerOpt([0, 90, 60, 40]),
    ],
    preview() { return h('div', { class: 'pv-grid' }, Array.from({ length: 9 }, (_, i) => h('b', { class: i % 4 === 0 ? 'on' : '' }))); },
    play(board, ctx) {
      const { P } = MF.data;
      const st = ctx.state;
      const mode = MF.level(st);
      // sequência de grids sem repetição: cada dia percorre uma permutação de 500 grids distintos
      const N = 500;
      const no = MF.daily('g5-grid2:' + mode, N);
      let grid = buildGrid(mode, no);
      for (let k = 1; !grid && k < 20; k++) grid = buildGrid(mode, no + '-' + k);
      if (!grid) grid = buildGrid('easy', no);
      const { rows, cols } = grid;
      st.cells = st.cells || Array(9).fill(null);
      st.n = st.n || 0;
      const MAX = 12;
      let choosing = null;

      // vale qualquer jogador da base (principal ou completa) que jogou de 1990 para cá
      const ok = (c, p) => (c.type === 'club' ? p.clubs.includes(c.id) : p.nat === c.id);
      const fits = (pi, cell) => ok(rows[Math.floor(cell / 3)], P[pi]) && ok(cols[cell % 3], P[pi]);
      const table = h('div', { class: 'grid9' });
      const left = h('span', { class: 'pill' });
      const msg = h('p', { class: 'grid-msg', 'aria-live': 'polite' });
      function paint(pop) {
        MF.clear(table);
        const done = ctx.finished();
        table.appendChild(h('div', { class: 'g-corner' }, h('span', { class: 'g-count' }, st.cells.filter((x) => x != null).length + '/9')));
        cols.forEach((c) => table.appendChild(h('div', { class: 'g-head' }, MF.critLabel(c))));
        rows.forEach((r, ri) => {
          table.appendChild(h('div', { class: 'g-head g-row' }, MF.critLabel(r)));
          cols.forEach((c, ci) => {
            const idx = ri * 3 + ci;
            const pi = st.cells[idx];
            const total = inter(r.set, c.set);
            let content;
            if (pi != null) content = [MF.photo(P[pi].n, P[pi].nat, 34), h('span', { class: 'g-name' }, P[pi].n), h('span', { class: 'g-rare' }, total + ' ' + t('rarity'))];
            else if (done) {
              const ex = [...r.set].filter((x) => c.set.has(x)).sort((a, b) => P[b].r - P[a].r)[0];
              content = [h('span', { class: 'g-name ghost' }, ex != null ? P[ex].n : '—'), h('span', { class: 'g-rare' }, total + ' ' + t('rarity'))];
            } else content = h('span', { class: 'g-plus', 'aria-hidden': 'true' }, '+');
            const isChoice = choosing && choosing.cells.includes(idx);
            table.appendChild(h('button', {
              type: 'button', class: 'g-cell' + (pi != null ? ' filled' : '') + (isChoice ? ' choose' : '') + (pop === idx ? ' pop' : ''),
              disabled: !isChoice, 'aria-label': (pi != null ? P[pi].n : isChoice ? t('select') : '') + ' — ' + labelTxt(r) + ' × ' + labelTxt(c),
              onclick: () => { if (isChoice) place(choosing.pi, idx); },
            }, content));
          });
        });
        left.textContent = t('attempts') + ': ' + st.n;
      }
      const labelTxt = (c) => (c.type === 'club' ? MF.data.clubs[c.id].n : MF.country(c.id));
      function place(pi, idx) {
        st.cells[idx] = pi;
        choosing = null;
        msg.textContent = '';
        ctx.save();
        paint(idx);
        check();
      }
      function check() {
        if (st.cells.every((x) => x != null)) end();
      }
      function guess(pi) {
        if (ctx.finished() || choosing) return;
        if (st.cells.includes(pi)) return MF.toast(t('usedAlready'));
        if (!MF.era(P[pi])) return MF.toast(t('eraOnly'), 'bad');
        st.n++;
        const open = [];
        for (let i = 0; i < 9; i++) if (st.cells[i] == null && fits(pi, i)) open.push(i);
        if (!open.length) {
          ctx.save();
          MF.toast(t('fitsNone') + ' (' + P[pi].n + ')', 'bad');
          MF.anim(table, 'shake');
          paint();
          return check();
        }
        if (open.length === 1) return place(pi, open[0]);
        choosing = { pi, cells: open };
        msg.textContent = t('chooseCell');
        ctx.save();
        paint();
      }
      function end() {
        const n = st.cells.filter((x) => x != null).length;
        const line = [0, 1, 2].map((r) => [0, 1, 2].map((c) => (st.cells[r * 3 + c] != null ? '🟨' : '⬛')).join('')).join('\n') + '\n' + n + '/9';
        st.scoreLabel = t('score') + ': ' + n + '/9';
        ctx.finish(n === 9, n, line);
        ac.hidden = true;
        paint();
      }
      ctx.onTimeUp = () => end();
      MF.loadExt && MF.loadExt();
      const ac = MF.autocomplete({ source: MF.playerSource((i) => MF.era(P[i])), onPick: (it) => guess(it.id), extra: h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => end() }, t('giveUp')) });
      board.appendChild(h('div', { class: 'bar' }, h('span', { class: 'pill' }, t((mode))), left, ctx.timerEl));
      board.appendChild(h('div', { class: 'grid-scroll' }, table));
      board.appendChild(msg);
      board.appendChild(ac);
      if (ctx.finished()) ac.hidden = true;
      paint();
    },
  });
})();
