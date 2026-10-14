/* Jogo 3 — FUT10 Wordle (Wordle com o nome de guerra do jogador) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const up = (s) => MF.norm(s).replace(/ /g, '').toUpperCase();

  // palavra do dia por dificuldade (jogadores de 1990 em diante):
  // fácil = craques muito conhecidos, com dicas; normal = famosos; difícil = conhecidos; lendário = qualquer jogador relevante
  const LV = {
    easy: [(p) => (p.famous || p.legend) && p.r >= 86, 4, 7, 6],
    normal: [(p) => p.famous || p.r >= 83, 4, 8, 6],
    hard: [(p) => p.r >= 79, 4, 9, 5],
    legend: [(p) => p.r >= 75, 4, 10, 5],
  };
  // nome de guerra: o apelido curado; senão o nome de uma palavra (Casemiro) ou o sobrenome (Haaland)
  function warName(p) {
    const fn = (p.fn || '').trim();
    if (fn && !/\s/.test(fn)) return fn;
    const toks = p.n.trim().split(/\s+/);
    if (toks.length === 1) return toks[0];
    if (toks.length === 2 && !['Brazil', 'Portugal'].includes(p.nat) && !/^(junior|júnior|jr\.?|filho|neto)$/i.test(toks[1])) return toks[1];
    return null;
  }
  function pools(lvl) {
    MF._w2 = MF._w2 || {};
    if (MF._w2[lvl]) return MF._w2[lvl];
    const [ok, lo, hi] = LV[lvl] || LV.normal;
    const words = new Map();
    for (const p of MF.data.P.slice(0, MF.CORE_N)) {
      if (!MF.era(p) || !ok(p)) continue;
      const nm = warName(p);
      if (!nm || !/^[a-zà-ÿ'.-]+$/i.test(nm)) continue;
      const w = up(nm);
      if (w.length < lo || w.length > hi) continue;
      if (!words.has(w) || words.get(w).r < p.r) words.set(w, p);
    }
    const list = [...words.keys()].sort();
    return (MF._w2[lvl] = { list, map: words });
  }

  MF.registerGame({
    num: 3, slug: 'craque-secreto', tag: () => t('wdChances'),
    rules: {
      pt: ['Descubra o nome de guerra do jogador (como ele é conhecido no futebol, ex.: KAKÁ, ROMÁRIO, MESSI). Só jogadores de 1990 para cá.', 'Escreva qualquer palavra com o número certo de letras — vale até errar de propósito para descobrir letras. Verde: letra certa no lugar certo. Amarelo: a letra existe em outro lugar. Cinza: não está no nome. Acentos não contam.', 'Fácil: craques muito conhecidos, com seleção, posição e último clube como dica, e 6 chances. Normal: jogadores famosos, com a posição como dica, e 6 chances. Difícil: jogadores conhecidos, sem dicas, 5 chances. Lendário: qualquer jogador relevante, sem dicas, 5 chances e o teclado não mostra cores.'],
      en: ['Find the player’s football name (how he is known, e.g. KAKÁ, ROMÁRIO, MESSI). Only players from 1990 on.', 'Type any word with the right number of letters — you can even miss on purpose to find letters. Green: right letter, right spot. Yellow: the letter is elsewhere. Grey: not in the name. Accents do not matter.', 'Easy: very well-known stars, with nation, position and last club as hints, and 6 chances. Normal: famous players, position as a hint, 6 chances. Hard: known players, no hints, 5 chances. Legendary: any relevant player, no hints, 5 chances and the keyboard shows no colours.'],
      es: ['Descubre el nombre futbolístico del jugador (cómo se le conoce, ej.: KAKÁ, ROMÁRIO, MESSI). Solo jugadores de 1990 en adelante.', 'Escribe cualquier palabra con el número correcto de letras — vale incluso fallar a propósito para descubrir letras. Verde: letra correcta en su lugar. Amarillo: la letra está en otro lugar. Gris: no está en el nombre. Las tildes no cuentan.', 'Fácil: cracks muy conocidos, con selección, posición y último club como pista, y 6 oportunidades. Normal: jugadores famosos, la posición como pista, 6 oportunidades. Difícil: jugadores conocidos, sin pistas, 5 oportunidades. Legendario: cualquier jugador relevante, sin pistas, 5 oportunidades y el teclado no muestra colores.'],
    },
    options: [
      MF.levelOpt(),
      MF.timerOpt([0, 180, 90]),
    ],
    preview() {
      const row = (w, c) => h('span', { class: 'pv-row' }, [...w].map((l, i) => h('b', { class: c[i] }, l)));
      return h('div', { class: 'pv-wordle' }, row('PELE', ['y', 'g', '', '']), row('MESSI', ['g', 'g', 'g', 'g', 'g']));
    },
    play(board, ctx) {
      const lvl = MF.level(ctx.state);
      const { list, map } = pools(lvl);
      const word = MF.dailyPick('g3-wordle3', lvl, (l) => pools(l).list);
      const player = map.get(word);
      const L = word.length, ROWS = LV[lvl][3];
      const st = ctx.state;
      st.guesses = st.guesses || [];
      let cur = '';

      const grid = h('div', { class: 'wd-grid', style: { '--n': L }, role: 'grid', 'aria-label': t('attempts') });
      const kb = h('div', { class: 'kb' });
      const score = (g) => {
        const res = Array(L).fill('x');
        const cnt = {};
        for (let i = 0; i < L; i++) if (g[i] === word[i]) res[i] = 'g'; else cnt[word[i]] = (cnt[word[i]] || 0) + 1;
        for (let i = 0; i < L; i++) if (res[i] !== 'g' && cnt[g[i]] > 0) { res[i] = 'y'; cnt[g[i]]--; }
        return res;
      };
      function paint(revealRow) {
        MF.clear(grid);
        for (let r = 0; r < ROWS; r++) {
          const row = h('div', { class: 'wd-row', role: 'row' });
          const g = st.guesses[r];
          const sc = g ? score(g) : null;
          for (let c = 0; c < L; c++) {
            const ch = g ? g[c] : r === st.guesses.length ? cur[c] || '' : '';
            row.appendChild(h('div', {
              class: 'wd-cell' + (sc ? ' s-' + sc[c] : ch ? ' typed' : '') + (r === revealRow ? ' flip' : ''),
              style: r === revealRow ? { animationDelay: c * 110 + 'ms' } : null, role: 'gridcell',
            }, ch));
          }
          grid.appendChild(row);
        }
        // teclado
        const best = {};
        if (lvl !== 'legend') st.guesses.forEach((g) => score(g).forEach((s, i) => {
          const k = g[i], rank = { g: 3, y: 2, x: 1 };
          if (!best[k] || rank[s] > rank[best[k]]) best[k] = s;
        }));
        MF.clear(kb);
        ['QWERTYUIOP', 'ASDFGHJKL', '↵ZXCVBNM⌫'].forEach((line) => {
          kb.appendChild(h('div', { class: 'kb-row' }, [...line].map((k) => h('button', {
            type: 'button', class: 'key' + (best[k] ? ' s-' + best[k] : '') + (k === '↵' || k === '⌫' ? ' wide' : ''),
            'aria-label': k === '↵' ? 'Enter' : k === '⌫' ? 'Apagar' : k, onclick: () => press(k),
          }, k === '↵' ? 'ENTER' : k))));
        });
      }
      function press(k) {
        if (ctx.finished()) return;
        if (k === '⌫') cur = cur.slice(0, -1);
        else if (k === '↵') return submit();
        else if (/^[A-Z]$/.test(k) && cur.length < L) cur += k;
        paint();
      }
      function submit() {
        // qualquer palavra com o tamanho certo vale (dá para errar de propósito e descobrir letras)
        if (cur.length !== L) { MF.anim(grid.children[st.guesses.length], 'shake'); return MF.toast(L + ' ' + t('letters')); }
        st.guesses.push(cur);
        cur = '';
        ctx.save();
        paint(st.guesses.length - 1);
        if (st.guesses[st.guesses.length - 1] === word) return setTimeout(() => end(true), MF.reduced() ? 0 : L * 110 + 300);
        if (st.guesses.length >= ROWS) setTimeout(() => end(false), MF.reduced() ? 0 : L * 110 + 300);
      }
      function end(win) {
        const em = { g: '🟩', y: '🟨', x: '⬛' };
        const line = (win ? st.guesses.length : 'X') + '/' + ROWS + '\n' + st.guesses.map((g) => score(g).map((s) => em[s]).join('')).join('\n');
        st.scoreLabel = word;
        ctx.finish(win, win ? ROWS + 1 - st.guesses.length : 0, line, { pi: player.i });
        document.removeEventListener('keydown', onKey);
      }
      const onKey = (e) => {
        if (!document.body.contains(grid)) return document.removeEventListener('keydown', onKey);
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Enter') { e.preventDefault(); press('↵'); }
        else if (e.key === 'Backspace') press('⌫');
        else if (/^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
      };
      document.addEventListener('keydown', onKey);
      board.appendChild(h('div', { class: 'bar' }, h('span', { class: 'pill' }, L + ' ' + t('letters')),
        lvl === 'easy' ? h('span', { class: 'pill' }, MF.flag(player.nat), ' ', MF.pos(player.pos), ' · ', lastClub(player)) : lvl === 'normal' ? h('span', { class: 'pill' }, MF.pos(player.pos)) : null,
        h('span', { class: 'pill' }, ROWS + ' ' + t('chancesWord')), ctx.timerEl));
      board.appendChild(grid);
      board.appendChild(kb);
      paint();
    },
    renderDetail(d) { return MF.playerReveal(d.pi); },
  });
  function lastClub(p) {
    const s = p.st.slice().sort((a, b) => b[2] - a[2] || b[1] - a[1])[0];
    return s ? MF.data.clubs[s[0]].n : '';
  }
})();
