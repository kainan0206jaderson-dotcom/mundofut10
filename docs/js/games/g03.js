/* Jogo 3 — FUT10 Wordle (Wordle com o nome de guerra do jogador) */
(function () {
  'use strict';
  const MF = window.MF, h = MF.h, t = (k) => MF.t(k);
  const up = (s) => MF.norm(s).replace(/ /g, '').toUpperCase();

  // palavras por dificuldade: fácil = só lendas e craques (nota 88+); normal = famosos; difícil = famosos ou nota 84+;
  // lendário = qualquer jogador conhecido (nota 80+), nomes de até 10 letras
  const LV = {
    easy: [(p) => (p.famous || p.legend) && p.r >= 88, 4, 7],
    normal: [(p) => p.famous, 4, 8],
    hard: [(p) => p.famous || p.r >= 84, 4, 9],
    legend: [(p) => p.famous || p.legend || p.r >= 80, 4, 10],
  };
  function dictionary() {
    if (MF._wdict) return MF._wdict;
    const dict = new Set();
    for (const p of MF.data.P) {
      for (const k of p.keys) for (const w of k.split(' ')) if (w.length >= 3 && w.length <= 10) dict.add(w.toUpperCase());
      const w = up(p.fn);
      if (w.length >= 3) dict.add(w);
    }
    return (MF._wdict = dict);
  }
  function pools(lvl) {
    MF._w = MF._w || {};
    if (MF._w[lvl]) return MF._w[lvl];
    const [ok, lo, hi] = LV[lvl] || LV.normal;
    const words = new Map();
    for (const p of MF.data.P) {
      if (!ok(p) || !/^[a-zà-ÿ'.-]+$/i.test(p.fn.replace(/\s/g, '')) || /\s/.test(p.fn.trim())) continue;
      const w = up(p.fn);
      if (w.length < lo || w.length > hi) continue;
      if (!words.has(w) || words.get(w).r < p.r) words.set(w, p);
    }
    const list = [...words.keys()].sort();
    return (MF._w[lvl] = { list, map: words, dict: dictionary() });
  }

  MF.registerGame({
    num: 3, slug: 'craque-secreto', chances: 5,
    rules: {
      pt: ['Descubra o nome de guerra do jogador (como ele é conhecido no futebol, ex.: KAKÁ, ROMÁRIO, MESSI). Você tem 5 chances; no 5º erro o desafio termina como errado.', 'Verde: letra certa no lugar certo. Amarelo: a letra existe, mas em outro lugar. Cinza: a letra não está no nome.', 'Acentos não contam. Fácil: craques muito conhecidos, com seleção e posição como dica, e vale qualquer palavra. Normal: jogadores famosos; só valem nomes da base. Difícil: mais jogadores, e as letras verdes e amarelas precisam ser usadas nos palpites seguintes. Lendário: qualquer jogador conhecido, mesma regra do difícil e o teclado não mostra cores.'],
      en: ['Find the player’s football name (how he is known, e.g. KAKÁ, ROMÁRIO, MESSI). You have 5 chances; on the 5th miss the challenge ends as lost.', 'Green: right letter, right spot. Yellow: the letter is in another spot. Grey: not in the name.', 'Accents do not matter. Easy: very well-known stars, with nation and position as a hint, and any word is accepted. Normal: famous players; only names from our database. Hard: more players, and green and yellow letters must be reused in later guesses. Legendary: any known player, same rule as hard and the keyboard shows no colours.'],
      es: ['Descubre el nombre futbolístico del jugador (cómo se le conoce, ej.: KAKÁ, ROMÁRIO, MESSI). Tienes 5 oportunidades; al 5.º fallo el desafío termina como perdido.', 'Verde: letra correcta en su lugar. Amarillo: la letra está en otro lugar. Gris: no está en el nombre.', 'Las tildes no cuentan. Fácil: cracks muy conocidos, con selección y posición como pista, y vale cualquier palabra. Normal: jugadores famosos; solo valen nombres de la base. Difícil: más jugadores, y las letras verdes y amarillas deben usarse en los siguientes intentos. Legendario: cualquier jugador conocido, misma regla que difícil y el teclado no muestra colores.'],
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
      const { list, map, dict } = pools(lvl);
      const word = list[MF.daily(lvl === 'normal' ? 'g3-wordle' : 'g3-wordle:' + lvl, list.length)];
      const player = map.get(word);
      const L = word.length, ROWS = 5;
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
        if (cur.length !== L) { MF.anim(grid.children[st.guesses.length], 'shake'); return MF.toast(L + ' ' + t('letters')); }
        if (lvl !== 'easy' && !dict.has(cur)) { MF.anim(grid.children[st.guesses.length], 'shake'); return MF.toast(t('notFound')); }
        if (lvl === 'hard' || lvl === 'legend') {
          // regra difícil: verdes no mesmo lugar e amarelas presentes no palpite
          for (const g of st.guesses) {
            const sc = score(g), need = {};
            for (let i = 0; i < L; i++) {
              if (sc[i] === 'g' && cur[i] !== g[i]) { MF.anim(grid.children[st.guesses.length], 'shake'); return MF.toast(t('wdKeepGreen').replace('{l}', g[i]).replace('{n}', i + 1)); }
              if (sc[i] !== 'x') need[g[i]] = (need[g[i]] || 0) + 1;
            }
            for (const [l, n] of Object.entries(need)) if ([...cur].filter((c) => c === l).length < n) { MF.anim(grid.children[st.guesses.length], 'shake'); return MF.toast(t('wdUseLetter').replace('{l}', l)); }
          }
        }
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
        lvl === 'easy' ? h('span', { class: 'pill' }, MF.flag(player.nat), ' ', MF.pos(player.pos)) : null, ctx.timerEl));
      board.appendChild(grid);
      board.appendChild(kb);
      paint();
    },
    renderDetail(d) { return MF.playerReveal(d.pi); },
  });
})();
