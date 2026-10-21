/* MUNDOFUT10 — critérios por dificuldade (pedido de 15/10/2026), valem em todos os jogos, menos no "Jogou por onde?" (só lendas)
   e no nível Lendário (cada jogo mantém a sua base).

   CLUBES
   - Fácil:   só clubes conhecidos, famosos e principais do esporte;
   - Normal:  campeões da Champions League + os clubes do Fácil;
   - Difícil: campeões da Champions, campeões da Europa League (Copa da UEFA) e clubes conhecidos que estão na 1ª divisão em 2026/27
              (sem time desconhecido: recém-promovidos e clubes pequenos ficam de fora);
   - Lendário: a base de cada jogo (o mais difícil possível).

   JOGADORES
   - Fácil:   só jogadores conhecidos na mídia (craques, Bola de Ouro, ícones);
   - Normal:  jogadores conhecidos que jogam hoje na 1ª divisão das principais ligas;
   - Difícil: jogadores das principais ligas + lendas aposentadas (de 1990 a 2026); nas respostas, nada escancarado
              (sem os craques mais óbvios), mas sem ficar impossível;
   - Lendário: a base de cada jogo.

   REVISÃO DE 21/10/2026 (Normal e Difícil mais acessíveis, como no Futbol11, cujo Difícil do Grid só usa gigantes):
   - clubes em faixas fixas e conhecidas (MF.tierSet): Fácil = famosos; Normal = famosos + grandes conhecidos da Europa e do
     Brasil (Marseille, PSV, Sevilla, Lazio, Leverkusen, Grêmio, Cruzeiro…); Difícil = Normal + clubes tradicionais da
     1ª divisão (Fiorentina, Everton, Real Betis, Leipzig, Braga…). Sem time de Série B/C ou desconhecido fora do Lendário.
     Vale no Grid, no Impostor e no Desafio do elenco. O Draft continua com MF.clubSet (pedido: o Draft está bom como está).
   - jogadores: Normal = conhecidos (nota 84+, ou famoso/lenda/Bola de Ouro 83+) que jogam hoje num clube dessas faixas
     (ou craques 87+ em qualquer clube); Difícil = jogadores 80+ dos clubes das faixas, 84+ das principais ligas e lendas
     que pararam de 2010 para cá. Quem está sem clube ou faleceu não conta como "joga hoje".

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
    if (S && S.ready) return S;
    const L = (MF.data && MF.data.games && MF.data.games.levels) || {};
    const set = (k) => new Set(L[k] || []);
    const famous = set('famous'), ucl = set('ucl'), uel = set('uel'), top = set('top');
    const union = (...a) => { const s = new Set(); a.forEach((x) => x.forEach((v) => s.add(v))); return s; };
    // Difícil sem time desconhecido (15/10/2026): dos clubes da 1ª divisão, só os que têm muitos jogadores relevantes na base
    // (30+ com nota 78+; no Brasil e na Argentina, 15+). Fica de fora quem ninguém conhece (recém-promovidos, Arábia menor etc.).
    const topKnown = new Set();
    if (MF.data && MF.data.byClub) {
      const { P, clubs, byClub } = MF.data;
      for (const c of top) {
        const g = (byClub[c] || []).filter((i) => P[i].r >= 78).length;
        const sa = clubs[c] && (clubs[c].cty === 'Brazil' || clubs[c].cty === 'Argentina');
        if (g >= 30 || (sa && g >= 15)) topKnown.add(c);
      }
    }
    S = {
      ready: !!(MF.data && MF.data.byClub), famous, ucl, uel, top, topKnown, now: set('now'),
      club: { easy: famous, normal: union(famous, ucl), hard: union(famous, ucl, uel, topKnown), legend: null },
    };
    return S;
  }
  MF.levelSets = sets;

  // ------------------------------------------------------------------ faixas de clubes (21/10/2026)
  const TIER_N = ['Olympique de Marseille', 'PSV', 'Feyenoord', 'Celtic', 'Aston Villa', 'Sevilla', 'Valencia', 'Lazio', 'Bayer Leverkusen',
    'Sporting', 'Lyon', 'Monaco', 'Newcastle', 'Galatasaray', 'Fenerbahçe', 'Villarreal', 'Atalanta', 'Grêmio', 'Cruzeiro', 'Internacional',
    'Atlético Mineiro', 'Fluminense', 'Botafogo', 'Vasco da Gama'];
  const TIER_H = ['Fiorentina', 'Schalke 04', 'Everton', 'West Ham', 'Leicester City', 'Real Sociedad', 'Athletic Bilbao', 'Real Betis',
    'RB Leipzig', 'Eintracht Frankfurt', 'Lille', 'Olympiacos', 'Beşiktaş', 'Shakhtar Donetsk', 'Racing Club', 'Independiente', 'Werder Bremen',
    'VfB Stuttgart', 'Wolfsburg', "Borussia M'gladbach", 'Torino', 'Udinese', 'Bologna', 'Parma', 'Nice', 'Rennes', 'Zenit', 'Rangers', 'Braga',
    'Anderlecht', 'Brighton', 'Crystal Palace', 'Nottingham Forest', 'Leeds United', 'Hamburgo', 'Estudiantes de La Plata', 'Club Brugge',
    'Dínamo de Kiev', 'Bahia', 'Wolverhampton', 'Hoffenheim', 'Sampdoria', 'Genoa', 'Lens'];
  // clubes que não entram no Grid/Impostor/Elenco por nome, mas onde jogador conhecido de hoje conta como "joga num clube conhecido"
  const TIER_PLAY = ['Napoli', 'Inter Miami', 'Al-Hilal', 'Al-Nassr', 'Al-Ittihad', 'Al-Ahli'];
  let T = null;
  function tiers() {
    if (T) return T;
    const clubs = (MF.data && MF.data.clubs) || [];
    const id = new Map();
    for (const c of clubs) if (!id.has(c.n)) id.set(c.n, c.i);
    const add = (base, names) => { const s = new Set(base); names.forEach((n) => id.has(n) && s.add(id.get(n))); return s; };
    const easy = sets().famous;
    const normal = add(easy, TIER_N), hard = add(normal, TIER_H);
    T = { easy, normal, hard, legend: null, play: add(hard, TIER_PLAY) };
    return T;
  }
  /** faixa de clubes do nível (Grid, Impostor, Desafio do elenco); null = sem filtro (Lendário) */
  MF.tierSet = (lvl) => tiers()[lvl] || null;
  MF.tierOk = (lvl, ci) => { const s = MF.tierSet(lvl); return !s || s.has(ci); };

  // ------------------------------------------------------------------ clubes
  /** conjunto de clubes (índices) aceitos no nível; null = sem filtro (Lendário) */
  MF.clubSet = (lvl) => sets().club[lvl] || null;
  MF.clubOk = (lvl, ci) => { const s = MF.clubSet(lvl); return !s || s.has(ci); };

  // ------------------------------------------------------------------ jogadores
  // clube atual: última passagem que chega a 2025 ou depois (aposentado não tem)
  MF.curClub = (p) => {
    if (p.retired || p.stop || !p.st || !p.st.length) return null;
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
  // (21/10/2026) joga hoje num clube conhecido (faixas) — base do Normal e do Difícil
  MF.inTier = (p) => { const c = MF.curClub(p); return c != null && tiers().play.has(c); };
  MF.known2 = (p) => p.r >= 84 || ((p.famous || p.legend || p.bo) && p.r >= 83);
  // lenda que parou de 2010 para cá (o Difícil não pede lenda dos anos 90)
  MF.recentLegend = (p) => p.retired && p.lastY >= 2010 && (((p.legend || p.icon || p.bo || p.wc) && p.r >= 83) || p.r >= 87);
  // em atividade: tem clube agora (aposentado, falecido ou sem clube não conta)
  MF.active = (p) => !p.retired && !p.stop && (MF.curClub(p) != null || sets().now.has(p.i));
  // lenda aposentada de 1990 a 2026 (nada de nome perdido: lenda da curadoria, ícone, Bola de Ouro, campeão do mundo ou nota 84+)
  MF.retLegend = (p) => p.retired && p.lastY >= 1990 && (((p.legend || p.wc) && p.r >= 80) || p.icon || p.bo || p.r >= 84);
  // óbvio demais para ser a resposta no Difícil
  MF.obvious = (p) => p.bow || p.r >= 92 || ['lionel messi', 'cristiano ronaldo'].includes(p.key);

  /** jogador aceito no nível. opt.answer = é a resposta do desafio (no Difícil tira os óbvios) */
  MF.REV = 9; // MF.today() de 21/10/2026 (desafio nº 10): a revisão vale já hoje, a pedido do usuário
  MF.isRev = () => MF.today() >= MF.REV;
  MF.playerOk = (lvl, p, opt) => {
    if (!p || p.ext) return lvl === 'legend';
    if (opt && opt.answer && MF.isCanon && !MF.isCanon(p)) return false; // ficha repetida não vira resposta
    if (lvl === 'easy') return MF.mediatic(p);
    if (!MF.isRev()) {
      if (lvl === 'normal') return MF.known(p) && MF.inMain(p);
      if (lvl === 'hard') {
        if (opt && opt.answer && MF.obvious(p)) return false;
        return (MF.inMain(p) && p.r >= 79) || MF.retLegend(p);
      }
      return true;
    }
    if (lvl === 'normal') return MF.known2(p) && (MF.inTier(p) || (p.r >= 87 && MF.curClub(p) != null));
    if (lvl === 'hard') {
      if (opt && opt.answer && MF.obvious(p)) return false;
      return (MF.inTier(p) && p.r >= 80) || (MF.inMain(p) && p.r >= 84) || MF.recentLegend(p);
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
