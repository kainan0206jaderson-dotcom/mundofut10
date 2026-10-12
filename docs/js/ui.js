/* MUNDOFUT10 — componentes de interface */
(function () {
  'use strict';
  const MF = (window.MF = window.MF || {});
  const t = (k) => MF.t(k);

  // ------------------------------------------------------------------ DOM
  const h = (MF.h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
        else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'html') el.innerHTML = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return el;
  });
  MF.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  MF.reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  MF.anim = (el, cls) => {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  };

  // ------------------------------------------------------------------ bandeiras e escudos
  MF.flag = (nat, size) => {
    const code = MF.data && MF.data.flags.map[nat];
    const src = code && MF.data.flags.img[code];
    if (!src) return h('span', { class: 'flag flag-missing', title: MF.country(nat), 'aria-label': MF.country(nat) }, (nat || '?').slice(0, 3).toUpperCase());
    return h('img', { class: 'flag' + (size ? ' flag-' + size : ''), src, alt: MF.country(nat), title: MF.country(nat), width: 28, height: 19 });
  };

  const CLUB_COLORS = {
    'Real Madrid': ['#f5f3ee', '#2a2d7c'], 'Barcelona': ['#a50044', '#004d98'], 'Atlético de Madrid': ['#cb3524', '#f5f3ee'],
    'Manchester United': ['#da291c', '#fbe122'], 'Manchester City': ['#6cabdd', '#1c2c5b'], 'Liverpool': ['#c8102e', '#00b2a9'],
    'Chelsea': ['#034694', '#f5f3ee'], 'Arsenal': ['#ef0107', '#f5f3ee'], 'Tottenham': ['#f5f3ee', '#132257'],
    'Bayern de Munique': ['#dc052d', '#f5f3ee'], 'Borussia Dortmund': ['#fde100', '#111111'], 'Bayer Leverkusen': ['#e32221', '#111111'],
    'Juventus': ['#111111', '#f5f3ee'], 'Milan': ['#fb090b', '#111111'], 'Inter de Milão': ['#0068a8', '#111111'], 'Roma': ['#8e1f2f', '#f0bc42'],
    'Napoli': ['#12a0d7', '#f5f3ee'], 'Lazio': ['#87d8f7', '#f5f3ee'], 'Fiorentina': ['#482e92', '#f5f3ee'], 'Parma': ['#fdd600', '#1b3f8b'],
    'Paris Saint-Germain': ['#004170', '#da291c'], 'Lyon': ['#f5f3ee', '#1b3f8b'], 'Olympique de Marseille': ['#2faee0', '#f5f3ee'], 'Monaco': ['#e51b22', '#f5f3ee'],
    'Ajax': ['#d2122e', '#f5f3ee'], 'PSV': ['#ed1c24', '#f5f3ee'], 'Feyenoord': ['#e30613', '#f5f3ee'],
    'Benfica': ['#e83030', '#f5f3ee'], 'Porto': ['#1c3d8e', '#f5f3ee'], 'Sporting': ['#008057', '#f5f3ee'],
    'Flamengo': ['#c52613', '#111111'], 'Palmeiras': ['#006437', '#f5f3ee'], 'Corinthians': ['#f5f3ee', '#111111'], 'São Paulo': ['#f5f3ee', '#e30613'],
    'Santos': ['#f5f3ee', '#111111'], 'Grêmio': ['#0d80bf', '#111111'], 'Internacional': ['#e30613', '#f5f3ee'], 'Cruzeiro': ['#2f529e', '#f5f3ee'],
    'Atlético Mineiro': ['#111111', '#f5f3ee'], 'Fluminense': ['#7a1437', '#006b3f'], 'Botafogo': ['#111111', '#f5f3ee'], 'Vasco da Gama': ['#111111', '#f5f3ee'],
    'Athletico Paranaense': ['#c8102e', '#111111'], 'Bahia': ['#0057a6', '#e30613'], 'Fortaleza': ['#0058a7', '#e30613'], 'Coritiba': ['#00544e', '#f5f3ee'],
    'Red Bull Bragantino': ['#f5f3ee', '#d6001c'], 'Vitória': ['#e30613', '#111111'], 'Sport': ['#e30613', '#111111'], 'Guarani': ['#00843d', '#f5f3ee'],
    'Boca Juniors': ['#103f79', '#f3b229'], 'River Plate': ['#f5f3ee', '#e30613'], 'Valencia': ['#f5f3ee', '#ee3524'], 'Sevilla': ['#f5f3ee', '#d4021d'],
    'Villarreal': ['#ffe667', '#005187'], 'Real Betis': ['#00954c', '#f5f3ee'], 'Athletic Bilbao': ['#ee2523', '#f5f3ee'], 'Real Sociedad': ['#0067b1', '#f5f3ee'],
    'Newcastle': ['#111111', '#f5f3ee'], 'Everton': ['#003399', '#f5f3ee'], 'Aston Villa': ['#670e36', '#95bfe5'], 'West Ham': ['#7a263a', '#1bb1e7'],
    'Leicester City': ['#003090', '#fdbe11'], 'Galatasaray': ['#a90432', '#fdb912'], 'Fenerbahçe': ['#163962', '#ffed00'], 'Al-Nassr': ['#fcd116', '#003da5'],
    'Al-Hilal': ['#005eb8', '#f5f3ee'], 'Zenit': ['#0093d0', '#f5f3ee'], 'Celtic': ['#018749', '#f5f3ee'], 'Schalke 04': ['#004d9d', '#f5f3ee'],
    'Wolfsburg': ['#65b32e', '#f5f3ee'], 'Inter Miami': ['#f7b5cd', '#231f20'], 'LA Galaxy': ['#00245d', '#ffd200'], 'New York Cosmos': ['#00a650', '#f5f3ee'],
  };
  MF.clubColors = (name) => {
    if (CLUB_COLORS[name]) return CLUB_COLORS[name];
    const hsh = MF.hash(name || '?');
    const hue = hsh % 360;
    return [`hsl(${hue} 55% 42%)`, `hsl(${(hue + 160) % 360} 30% 88%)`];
  };
  // cor de texto legível sobre a cor de fundo do escudo
  MF.contrastOn = (col) => {
    let r, g, b;
    const m = /^#([0-9a-f]{6})$/i.exec(col);
    if (m) { const n = parseInt(m[1], 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
    else { const hm = /hsl\((\d+) (\d+)% (\d+)%\)/.exec(col); if (!hm) return '#0d0c09'; return +hm[3] > 55 ? '#0d0c09' : '#f4ecd2'; }
    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#0d0c09' : '#f4ecd2';
  };
  MF.initials = (name) => {
    const w = (name || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter((x) => x && !/^(fc|cf|ac|sc|de|da|do|the|club|united|city)$/i.test(x));
    if (!w.length) return (name || '?').slice(0, 2).toUpperCase();
    return (w.length === 1 ? w[0].slice(0, 3) : w.slice(0, 2).map((x) => x[0]).join('')).toUpperCase();
  };
  // escudo genérico desenhado (sem logos oficiais): cores do clube + iniciais
  MF.crest = (clubName, size = 28) => {
    const [a, b] = MF.clubColors(clubName);
    const ini = MF.initials(clubName);
    const txt = MF.contrastOn(a);
    const span = h('span', { class: 'crest', style: { width: size + 'px', height: size * 1.15 + 'px' }, title: clubName, 'aria-hidden': 'true' });
    span.innerHTML = `<svg viewBox="0 0 40 46" width="${size}" height="${size * 1.15}"><path d="M20 1 L38 7 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V7 Z" fill="${a}" stroke="${b}" stroke-width="2.5"/><path d="M2 22 H38" stroke="${b}" stroke-width="0" /><text x="20" y="27" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="${ini.length > 2 ? 11 : 14}" fill="${txt}">${ini}</text></svg>`;
    // escudo real (Wikimedia Commons via Wikidata), quando existir
    if (MF.media && clubName) MF.media.club(clubName).then((url) => { if (url) MF.media.swapImg(span, url, clubName, 'crest-img'); });
    return span;
  };

  // silhueta de jogador (sem fotos reais)
  MF.silhouette = (cls, name, hint) => {
    const s = h('span', { class: 'sil ' + (cls || ''), 'aria-hidden': 'true' });
    s.innerHTML = '<svg viewBox="0 0 100 110"><circle cx="50" cy="32" r="20"/><path d="M12 108 C14 74 30 60 50 60 C70 60 86 74 88 108 Z"/></svg>';
    if (name && MF.media) MF.media.player(name, hint).then((url) => { if (url) MF.media.swapImg(s, url, name, 'sil-photo'); });
    return s;
  };
  // avatar redondo de jogador (foto livre da Wikipedia; silhueta enquanto carrega ou se não houver foto)
  MF.photo = (name, hint, size) => {
    const s = h('span', { class: 'pph', style: { '--ph': (size || 32) + 'px' }, 'aria-hidden': 'true' });
    s.innerHTML = '<svg viewBox="0 0 100 100"><circle cx="50" cy="38" r="19"/><path d="M14 100 C16 72 31 60 50 60 C69 60 84 72 86 100 Z"/></svg>';
    if (name && MF.media) MF.media.player(name, hint).then((url) => { if (url) MF.media.swapImg(s, url, '', 'pph-img'); });
    return s;
  };

  // ------------------------------------------------------------------ imagens livres (Wikipedia / Wikimedia Commons)
  // Busca no navegador, 4 por vez, com cache no aparelho. Só imagens de licença livre (pilicense=free) e logos do Wikidata.
  (function () {
    const V = 'mf10:img1:';
    const memo = new Map(), queue = [];
    let active = 0;
    const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    const pump = () => { while (active < 4 && queue.length) { const [fn, res] = queue.shift(); active++; fn().then(res, () => res(undefined)).finally(() => { active--; pump(); }); } };
    const run = (fn) => new Promise((res) => { queue.push([fn, res]); pump(); });
    const getJSON = (u) => fetch(u, { mode: 'cors' }).then((r) => (r.ok ? r.json() : null));
    const search = (host, q, thumb) => getJSON('https://' + host + '/w/api.php?origin=*&format=json&formatversion=2&action=query&generator=search&gsrlimit=4&gsrnamespace=0&gsrsearch=' +
      encodeURIComponent(q) + '&prop=pageimages|pageprops&piprop=thumbnail&pithumbsize=' + thumb + '&pilicense=free&ppprop=wikibase_item')
      .then((j) => ((j && j.query && j.query.pages) || []).sort((a, b) => a.index - b.index));
    const toks = (s) => MF.norm(s).split(' ').filter((x) => x.length > 2 && !['club', 'clube', 'futebol', 'football', 'fc', 'the'].includes(x));
    const matches = (title, name) => { const tn = MF.norm(title); const tk = toks(name); return !tk.length || tk.some((x) => tn.includes(x)); };
    function lookup(kind, key, fn) {
      const k = V + kind + ':' + key;
      if (memo.has(k)) return memo.get(k);
      const cached = lsGet(k);
      const p = cached !== null ? Promise.resolve(cached || null) : run(fn).then((url) => { if (url !== undefined) lsSet(k, url || ''); return url || null; });
      memo.set(k, p);
      return p;
    }
    MF.media = {
      player(name, hint) {
        if (!name || typeof fetch !== 'function') return Promise.resolve(null);
        return lookup('p', MF.norm(name + '|' + (hint || '')), async () => {
          const pages = await search('en.wikipedia.org', name + ' footballer' + (hint ? ' ' + hint : ''), 240);
          let pg = pages.find((x) => matches(x.title, name));
          if (!pg && hint) { const p2 = await search('en.wikipedia.org', name + ' footballer', 240); pg = p2.find((x) => matches(x.title, name)); }
          return pg && pg.thumbnail ? pg.thumbnail.source : null;
        });
      },
      club(name) {
        if (!name || typeof fetch !== 'function') return Promise.resolve(null);
        return lookup('c', MF.norm(name), async () => {
          const pages = await search('pt.wikipedia.org', name + ' futebol clube', 64);
          for (const pg of pages.slice(0, 3)) {
            const q = pg.pageprops && pg.pageprops.wikibase_item;
            if (!q || !matches(pg.title, name)) continue;
            const j = await getJSON('https://www.wikidata.org/w/api.php?origin=*&format=json&action=wbgetentities&props=claims&ids=' + q);
            const cl = j && j.entities && j.entities[q] && j.entities[q].claims;
            const logo = cl && cl.P154 && cl.P154[0] && cl.P154[0].mainsnak.datavalue && cl.P154[0].mainsnak.datavalue.value;
            if (logo) return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(logo) + '?width=96';
          }
          return null;
        });
      },
      // troca o conteúdo pelo <img> só depois que a imagem carregou (sem piscar nem quebrar)
      swapImg(el, url, alt, cls) {
        const img = new Image();
        img.decoding = 'async'; img.alt = alt || ''; img.className = cls || ''; img.referrerPolicy = 'no-referrer';
        img.onload = () => { MF.clear(el); el.appendChild(img); el.classList.add('has-img'); };
        img.src = url;
      },
    };
  })();

  // ------------------------------------------------------------------ toasts e modal
  let toastEl;
  MF.toast = (msg, kind) => {
    if (!toastEl) { toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.className = 'toast show ' + (kind || '');
    clearTimeout(MF._toastT);
    MF._toastT = setTimeout(() => (toastEl.className = 'toast'), 2600);
  };
  MF.modal = (title, body, actions) => {
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const wrap = h('div', { class: 'modal-wrap', onclick: (e) => { if (e.target === wrap) close(); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'modal-head' }, h('h2', null, title), h('button', { class: 'icon-btn', 'aria-label': t('close'), onclick: close }, MF.icon('close'))),
        h('div', { class: 'modal-body' }, body),
        actions ? h('div', { class: 'modal-actions' }, actions) : null));
    document.body.appendChild(wrap);
    document.addEventListener('keydown', onKey);
    setTimeout(() => { const b = wrap.querySelector('button'); b && b.focus(); }, 30);
    return close;
  };

  // ------------------------------------------------------------------ controles segmentados
  MF.segmented = (label, choices, value, onChange) => {
    const group = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
    const render = () => {
      MF.clear(group);
      for (const c of choices) {
        group.appendChild(h('button', {
          type: 'button', role: 'radio', 'aria-checked': c.v === value ? 'true' : 'false', class: c.v === value ? 'on' : '',
          onclick: () => { value = c.v; render(); onChange(c.v); },
        }, c.label));
      }
    };
    render();
    return h('div', { class: 'seg-row' }, h('span', { class: 'seg-label' }, label), group);
  };

  // ------------------------------------------------------------------ autocompletar
  /**
   * opts: { placeholder, source(q)->[{id,label,sub,flag}], onPick(item), button }
   */
  MF.autocomplete = (opts) => {
    const id = 'ac-' + Math.random().toString(36).slice(2, 8);
    const input = h('input', {
      id, name: id, type: 'text', enterkeyhint: 'go', class: 'ac-input', placeholder: opts.placeholder || t('typePlayer'), autocomplete: 'off', autocapitalize: 'off',
      spellcheck: 'false', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': id + '-list', 'aria-autocomplete': 'list',
    });
    const list = h('ul', { class: 'ac-list', id: id + '-list', role: 'listbox', hidden: true });
    let items = [], active = -1;
    const pick = (it) => { input.value = ''; close(); opts.onPick(it); };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
    const render = () => {
      MF.clear(list);
      items.forEach((it, i) => {
        list.appendChild(h('li', {
          role: 'option', id: id + '-o' + i, class: i === active ? 'on' : '', 'aria-selected': i === active ? 'true' : 'false',
          onmousedown: (e) => { e.preventDefault(); pick(it); },
        }, it.flag ? MF.flag(it.flag) : null, it.crest ? MF.crest(it.crest, 18) : null, h('span', { class: 'ac-name' }, it.label), it.sub ? h('span', { class: 'ac-sub' }, it.sub) : null));
      });
      list.hidden = !items.length;
      input.setAttribute('aria-expanded', items.length ? 'true' : 'false');
      if (active >= 0) input.setAttribute('aria-activedescendant', id + '-o' + active); else input.removeAttribute('aria-activedescendant');
    };
    input.addEventListener('input', () => { items = opts.source(input.value); active = items.length ? 0 : -1; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { active = (active + 1) % items.length; render(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { active = (active - 1 + items.length) % items.length; render(); } }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (active >= 0 && items[active]) pick(items[active]);
        else if (opts.onFree && input.value.trim()) { const v = input.value; input.value = ''; close(); opts.onFree(v); }
      } else if (e.key === 'Escape') close();
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
    const wrap = h('div', { class: 'ac' }, h('label', { class: 'sr-only', for: id }, opts.placeholder || t('typePlayer')), input, list);
    if (opts.extra) [].concat(opts.extra).forEach((x) => wrap.appendChild(x));
    wrap.focus = () => input.focus();
    wrap.input = input;
    return wrap;
  };
  // fonte padrão: jogadores da base
  MF.playerSource = (filter) => (q) =>
    MF.searchPlayers(q, 8, filter).map((i) => {
      const p = MF.data.P[i];
      return { id: i, label: p.n, sub: String(p.born), flag: null };
    });

  // ------------------------------------------------------------------ cronômetro
  MF.timer = (seconds, onEnd) => {
    const el = h('div', { class: 'timer', role: 'timer', 'aria-live': 'off' });
    if (!seconds) { el.textContent = '∞'; el.classList.add('inf'); el.title = t('noTimer'); return { el, stop() {}, left: () => Infinity }; }
    let left = seconds, running = true;
    const fmt = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const paint = () => {
      el.textContent = fmt(left);
      el.classList.toggle('low', left <= 10);
      el.style.setProperty('--p', (left / seconds).toFixed(3));
    };
    paint();
    const iv = setInterval(() => {
      if (!running) return;
      left--; paint();
      if (left <= 0) { clearInterval(iv); running = false; onEnd && onEnd(); }
    }, 1000);
    return { el, stop() { running = false; clearInterval(iv); }, left: () => left };
  };

  MF.fmtCountdown = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return [hh, mm, ss].map((x) => String(x).padStart(2, '0')).join(':');
  };

  // ------------------------------------------------------------------ comemoração
  MF.confetti = () => {
    if (MF.reduced()) return;
    const c = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const W = (c.width = innerWidth), H = (c.height = innerHeight);
    const colors = ['#ffd400', '#f4eed6', '#ffb800', '#39d98a', '#ffffff'];
    const parts = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
      r: Math.random() * 6 + 3, c: colors[(Math.random() * colors.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4,
    }));
    let f = 0;
    const step = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
      }
      if (++f < 150) requestAnimationFrame(step); else c.remove();
    };
    requestAnimationFrame(step);
  };

  // ------------------------------------------------------------------ compartilhar
  MF.shareBox = (text) => {
    const pre = h('textarea', { class: 'share-text', readonly: true, rows: Math.min(8, text.split('\n').length + 1), 'aria-label': t('share') }, text);
    const btn = h('button', {
      class: 'btn btn-ghost', type: 'button',
      onclick: () => {
        const ok = () => MF.toast(t('copied'), 'ok');
        const fail = () => { pre.hidden = false; pre.select(); MF.toast(t('copyFail')); };
        try { navigator.clipboard.writeText(text).then(ok, fail); } catch (e) { fail(); }
      },
    }, t('share'));
    pre.hidden = true;
    return h('div', { class: 'share' }, btn, pre);
  };
  // ícones desenhados (traço único, 24px), no lugar de emoji
  const ICONS = {
    flag: '<path d="M5.5 21V3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5.5 4.5c2.6-1.6 4.8 1.2 7.4-.2s4.2-1 6 .1v8.4c-1.8-1.1-3.4-1.5-6-.1s-4.8-1.4-7.4.2z" fill="currentColor" fill-opacity=".22" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z" fill="currentColor"/>',
    starOff: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  };
  MF.icon = (name, size) => {
    const s = MF.h('span', { class: 'ico ico-' + name, 'aria-hidden': 'true' });
    s.innerHTML = '<svg viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '">' + ICONS[name] + '</svg>';
    return s;
  };
})();
