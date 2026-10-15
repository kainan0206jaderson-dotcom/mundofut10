/* MUNDOFUT10 — critérios por dificuldade (pedido de 15/10/2026), valem em todos os jogos, menos no "Jogou por onde?" (só lendas)
   e no nível Lendário (cada jogo mantém a sua base).

   CLUBES
   - Fácil:   só clubes conhecidos, famosos e principais do esporte;
   - Normal:  campeões da Champions League + os clubes do Fácil;
   - Difícil: campeões da Champions, campeões da Europa League (Copa da UEFA) e clubes que estão na 1ª divisão em 2026/27;
   - Lendário: a base de cada jogo (o mais difícil possível).

   JOGADORES
   - Fácil:   só jogadores conhecidos na mídia (craques, Bola de Ouro, ícones);
   - Normal:  jogadores conhecidos que jogam hoje na 1ª divisão das principais ligas;
   - Difícil: jogadores das principais ligas + lendas aposentadas (de 1990 a 2026); nas respostas, nada escancarado
              (sem os craques mais óbvios), mas sem ficar impossível;
   - Lendário: a base de cada jogo.

   As listas de clubes e de elencos 2026/27 ficam em data/games.json ("levels", gerado por tools/build_levels.py).
   Os desafios do dia só mudam de critério a partir do desafio nº 5 (16/10/2026), para não trocar a resposta no meio do dia.
   Para ver antes, abra o site com ?novo no endereço. */
(function () {
  'use strict';
  const MF = (window.MF = window.MF || {});

  MF.NEW_FROM = 4; // MF.today() do dia em que os critérios novos entram (16/10/2026)
  MF.isNew = () => MF.today() >= MF.NEW_FROM || /[?&]novo\b/.test(location.search);

  let S = null;
  function sets() {
    if (S) return S;
    const L = (MF.data && MF.data.games && MF.data.games.levels) || {};
    const set = (k) => new Set(L[k] || []);
    const famous = set('famous'), ucl = set('ucl'), uel = set('uel'), top = set('top');
    const union = (...a) => { const s = new Set(); a.forEach((x) => x.forEach((v) => s.add(v))); return s; };
    S = {
      famous, ucl, uel, top, now: set('now'),
      club: { easy: famous, normal: union(famous, ucl), hard: union(ucl, uel, top), legend: null },
    };
    return S;
  }
  MF.levelSets = sets;

  // ------------------------------------------------------------------ clubes
  /** conjunto de clubes (índices) aceitos no nível; null = sem filtro (Lendário) */
  MF.clubSet = (lvl) => sets().club[lvl] || null;
  MF.clubOk = (lvl, ci) => { const s = MF.clubSet(lvl); return !s || s.has(ci); };

  // ------------------------------------------------------------------ jogadores
  // clube atual: última passagem que chega a 2025 ou depois (aposentado não tem)
  MF.curClub = (p) => {
    if (p.retired || !p.st || !p.st.length) return null;
    let best = null;
    for (const s of p.st) if (!best || s[2] > best[2] || (s[2] === best[2] && s[1] > best[1])) best = s;
    return best && best[2] >= 2025 ? best[0] : null;
  };
  // joga hoje na 1ª divisão das principais ligas (elencos 2026/27 ou clube atual na 1ª divisão)
  MF.inMain = (p) => {
    const s = sets();
    if (s.now.has(p.i)) return true;
    const c = MF.curClub(p);
    return c != null && s.top.has(c);
  };
  // conhecido na mídia: craques (nota MUNDOFUT 86+), top 10 da Bola de Ouro e ícones
  MF.mediatic = (p) => p.r >= 86 || p.bo || p.bow || p.icon;
  // conhecido: nota 83+ ou marcado como famoso/lenda/top 10 da Bola de Ouro com nota 80+
  MF.known = (p) => p.r >= 83 || ((p.famous || p.legend || p.bo) && p.r >= 80);
  // lenda aposentada de 1990 a 2026 (nada de nome perdido: lenda da curadoria, ícone, Bola de Ouro, campeão do mundo ou nota 84+)
  MF.retLegend = (p) => p.retired && p.lastY >= 1990 && (((p.legend || p.wc) && p.r >= 80) || p.icon || p.bo || p.r >= 84);
  // óbvio demais para ser a resposta no Difícil
  MF.obvious = (p) => p.bow || p.r >= 92 || ['lionel messi', 'cristiano ronaldo'].includes(p.key);

  /** jogador aceito no nível. opt.answer = é a resposta do desafio (no Difícil tira os óbvios) */
  MF.playerOk = (lvl, p, opt) => {
    if (!p || p.ext) return lvl === 'legend';
    if (lvl === 'easy') return MF.mediatic(p);
    if (lvl === 'normal') return MF.known(p) && MF.inMain(p);
    if (lvl === 'hard') {
      if (opt && opt.answer && MF.obvious(p)) return false;
      return (MF.inMain(p) && p.r >= 79) || MF.retLegend(p);
    }
    return true;
  };
  // ------------------------------------------------------------------ ajuda única (como a da Pirâmide)
  const HT = {
    pt: { initials: 'Ajuda: o nome é {m}', noFit: 'Ajuda: {p} não encaixa em nenhuma casa livre — pule.', fitHere: 'Ajuda: {p} encaixa nas casas destacadas.',
      letter: 'Ajuda: a {n}ª letra é {l}', impostor: 'Ajuda: um impostor foi revelado.', draftTip: 'Ajuda: tente {p} ({pos})', cell: 'Ajuda: uma resposta da casa destacada começa com {m}',
      clubLetter: 'Ajuda: o clube é {m}', boInit: 'Ajuda: as iniciais dos que faltam apareceram.', noTip: 'Nada para ajudar agora.' },
    en: { initials: 'Help: the name is {m}', noFit: 'Help: {p} fits no open square — skip.', fitHere: 'Help: {p} fits the highlighted squares.',
      letter: 'Help: letter {n} is {l}', impostor: 'Help: one impostor was revealed.', draftTip: 'Help: try {p} ({pos})', cell: 'Help: an answer for the highlighted square starts with {m}',
      clubLetter: 'Help: the club is {m}', boInit: 'Help: the initials of the missing players are shown.', noTip: 'Nothing to help with right now.' },
    es: { initials: 'Ayuda: el nombre es {m}', noFit: 'Ayuda: {p} no encaja en ninguna casilla libre — salta.', fitHere: 'Ayuda: {p} encaja en las casillas resaltadas.',
      letter: 'Ayuda: la letra {n} es {l}', impostor: 'Ayuda: se reveló un impostor.', draftTip: 'Ayuda: prueba con {p} ({pos})', cell: 'Ayuda: una respuesta de la casilla resaltada empieza por {m}',
      clubLetter: 'Ayuda: el club es {m}', boInit: 'Ayuda: aparecen las iniciales de los que faltan.', noTip: 'Nada que ayudar ahora.' },
  };
  MF.ht = (k, vars) => {
    let s = (HT[MF.lang] || HT.pt)[k] || HT.pt[k] || k;
    for (const [a, b] of Object.entries(vars || {})) s = s.split('{' + a + '}').join(b);
    return s;
  };
  // máscara do nome: primeira letra de cada palavra + pontos (ex.: "K•••• M••••")
  MF.mask = (name) => (name || '').trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + '•'.repeat(Math.max(0, [...w].length - 1))).join(' ');
  /**
   * Botão "Ajuda (1)": uma vez por partida. use() aplica a ajuda e devolve o texto a mostrar (ou false se não deu para ajudar agora).
   * O texto fica salvo em state.helpText e aparece embaixo do botão.
   */
  MF.helpButton = (ctx, use) => {
    const h = MF.h, t = MF.t, st = ctx.state;
    const note = h('p', { class: 'help-note', 'aria-live': 'polite' });
    const btn = h('button', { class: 'btn btn-ghost help-btn', type: 'button', onclick: () => {
      if (st.help || ctx.finished()) return;
      const r = use();
      if (r === false) return MF.toast(MF.ht('noTip'));
      st.help = true;
      st.helpText = typeof r === 'string' ? r : '';
      ctx.save();
      refresh();
      if (st.helpText) MF.toast(st.helpText);
    } });
    const refresh = () => {
      btn.disabled = !!st.help || ctx.finished();
      btn.textContent = st.help ? t('helpUsed') : t('help') + ' (1)';
      note.textContent = st.help && st.helpText && !ctx.finished() ? st.helpText : '';
      note.hidden = !note.textContent;
    };
    refresh();
    btn.refresh = refresh;
    btn.note = note;
    return btn;
  };

  /** filtra uma lista pelo critério do nível; se sobrar pouco (< min), devolve a lista original */
  MF.byLevel = (lvl, list, get, opt) => {
    if (lvl === 'legend' || !MF.isNew()) return list;
    const g = get || ((x) => x);
    const out = list.filter((x) => MF.playerOk(lvl, g(x), opt));
    return out.length >= ((opt && opt.min) || 12) ? out : list;
  };
})();
