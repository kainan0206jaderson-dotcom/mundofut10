/* MUNDOFUT10 — estádio 3D (Three.js r128).
   A câmera desce das nuvens, passa sobre a torcida e pousa na pose da tela inicial:
   a própria cena vira a escalação (sem corte). As 11 camisas são malhas de "tecido" no gramado. */
(function () {
  'use strict';
  const MF = (window.MF = window.MF || {});
  const S = (MF.Stadium = { ok: false });

  const SPOT = {
    1: [50, 91], 2: [90, 62], 3: [70, 74], 4: [30, 74], 6: [10, 62],
    5: [50, 52], 8: [77, 38], 10: [23, 38], 7: [85, 13], 9: [50, 9], 11: [15, 13],
  };
  const PITCH_W = 68, PITCH_L = 105;
  const SA = 57, SB = 80; // semi-eixos internos da arquibancada (gramado + área de escape cabem inteiros)
  const spotToWorld = (n) => { const [x, y] = SPOT[n]; return { x: (x / 100 - 0.5) * PITCH_W * 0.92, z: (y / 100 - 0.5) * PITCH_L * 0.9 }; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOutBack = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  // texturas pesadas já prontas em WebP (geradas por tools/bake_textures.py a partir das funções abaixo);
  // começam a baixar e decodificar junto com a base de dados, então a abertura não gasta CPU desenhando-as
  const BAKED = {};
  if (!/[?&]nobake\b/.test(location.search)) {
    for (const k of ['puff1', 'puff2', 'puff3', 'puff4', 'pitch']) {
      const img = new Image();
      img.decoding = 'async';
      img.src = 'img/tex/' + k + '.webp?v=1';
      BAKED[k] = { img, ok: false };
      (img.decode ? img.decode() : new Promise((r, j) => { img.onload = r; img.onerror = j; })).then(() => (BAKED[k].ok = true), () => {});
    }
  }
  const baked = (k) => (BAKED[k] && BAKED[k].ok && BAKED[k].img.naturalWidth ? BAKED[k].img : null);

  S.supported = () => {
    if (!window.THREE) return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
  };

  // ------------------------------------------------------------------ ruído (montanha)
  function makeNoise(seed) {
    const rnd = MF.rng(seed), P = new Uint8Array(512), G = [];
    for (let i = 0; i < 256; i++) { P[i] = i; const a = rnd() * Math.PI * 2; G.push([Math.cos(a), Math.sin(a)]); }
    for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [P[i], P[j]] = [P[j], P[i]]; }
    for (let i = 0; i < 256; i++) P[i + 256] = P[i];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const grad = (h, x, y) => { const g = G[h & 255]; return g[0] * x + g[1] * y; };
    const n2 = (x, y) => {
      const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255;
      const u = fade(xf), v = fade(yf);
      const a = grad(P[P[xi] + yi], xf, yf), b = grad(P[P[xi + 1] + yi], xf - 1, yf), c = grad(P[P[xi] + yi + 1], xf, yf - 1), d = grad(P[P[xi + 1] + yi + 1], xf - 1, yf - 1);
      return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v; // −0.7..0.7
    };
    const fbm = (x, y, o) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < (o || 5); i++) { s += a * n2(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
    const ridged = (x, y, o) => { let s = 0, a = 0.5, f = 1, w = 1; for (let i = 0; i < (o || 5); i++) { let r = 1 - Math.abs(n2(x * f, y * f) * 1.4); r *= r * w; w = Math.min(1, r * 1.6); s += a * r; f *= 2.1; a *= 0.5; } return s; };
    return { n2, fbm, ridged };
  }

  // montanha rochosa: o estádio fica num platô no cume; as encostas descem e somem no mar de nuvens
  const SUMMIT = 1.075;   // borda do platô (em raios do estádio)
  const CLOUD_Y = -150;   // nível do mar de nuvens
  function mountainGeometry(T, A, B, mobile) {
    const N = makeNoise('montanha-mf10');
    const RINGS = mobile ? 84 : 130, SEG = mobile ? 200 : 320, EMAX = 26;
    const pos = [], idx = [], ee = [];
    const E0 = 1.13, E1 = 1.5, E2 = 1.64, E3 = 2.25, E4 = 4.3;
    // perfil: praça de concreto, gramado, beirada, paredão quase vertical, encosta de pedras soltas, base larga sob as nuvens
    const prof = (e) => {
      if (e <= E1) return -0.35;
      if (e <= E2) { const t = (e - E1) / (E2 - E1); return -0.35 - 4 * t * t; }
      if (e <= E3) { const t = (e - E2) / (E3 - E2); return -4.35 - 78 * Math.pow(t, 0.55); }
      if (e <= E4) { const t = (e - E3) / (E4 - E3); return -82.35 - 105 * Math.pow(t, 0.9); }
      return -187.35 - 520 * Math.pow((e - E4) / (EMAX - E4), 0.62);
    };
    const ring = (i) => (i === 0 ? 0.97 : i === 1 ? E0 : i === 2 ? 1.3 : E1 + (EMAX - E1) * Math.pow((i - 3) / (RINGS - 3), 2.2));
    for (let i = 0; i <= RINGS; i++) {
      const e0 = ring(i);
      for (let j = 0; j < SEG; j++) {
        const a = (j / SEG) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        // contrafortes radiais e vales: o raio efetivo varia com o ângulo
        const spur = N.fbm(ca * 1.4 + 7.1, sa * 1.4 - 3.3, 4) * 0.7 + (N.ridged(ca * 2.6 + 1.7, sa * 2.6 + 9.4, 4) - 0.35) * 0.5;
        const k0 = Math.max(0, Math.min(1, (e0 - E1) * 1.6));
        const rim = (N.fbm(ca * 3.1 + 2.2, sa * 3.1 + 5.5, 4)) * 0.16;            // beirada irregular
        const e = e0 <= E1 - 0.04 ? e0 : e0 * (1 - rim * Math.min(1, (e0 - E1 + 0.04) * 6)) + (e0 - E1) * spur * k0;
        const x = ca * A * e0, z = sa * B * e0;
        let y = prof(e);
        if (e0 > E2) {
          const k = Math.min(1, (e0 - E2) / 0.7);
          y += (N.ridged(x * 0.011, z * 0.011, 6) - 0.42) * 46 * k;                // cristas e ravinas
          y += N.fbm(x * 0.06, z * 0.06, 3) * 7 * k;                                // pedras
          // bancadas de rocha (estratos) para dar paredões
          const step = 14, tt = y / step, fl = Math.floor(tt), fr = tt - fl;
          y = (fl + Math.pow(fr, 2.6)) * step * 0.3 + y * 0.7;
        } else if (e0 > E0) {
          y += N.fbm(x * 0.03, z * 0.03, 3) * 0.6 * Math.min(1, (e0 - E0) * 4);
          // afloramentos de rocha perto da beirada
          const out = N.ridged(x * 0.05 + 11, z * 0.05 - 4, 3);
          if (e > E1 - 0.12 && out > 0.62) y += (out - 0.62) * 10;
        }
        pos.push(x, y, z); ee.push(e0);
      }
    }
    for (let i = 0; i < RINGS; i++) {
      const b0 = i * SEG, b1 = (i + 1) * SEG;
      for (let j = 0; j < SEG; j++) { const j1 = (j + 1) % SEG; idx.push(b0 + j, b0 + j1, b1 + j, b0 + j1, b1 + j1, b1 + j); }
    }
    const gm = new T.BufferGeometry();
    gm.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    gm.setIndex(idx);
    gm.computeVertexNormals();
    // cores pela inclinação: plano = grama/neve, íngreme = rocha; praça de concreto em volta do estádio
    const nrm = gm.attributes.normal.array, col = new Float32Array(pos.length);
    const c = new T.Color(), tmp = new T.Color();
    const PLAZA = new T.Color(0x5e5b55), GRASS = new T.Color(0x41592a), GRASS2 = new T.Color(0x2b3d1b), DRY = new T.Color(0x5e5840);
    const ROCK = new T.Color(0x4f4943), ROCK_D = new T.Color(0x2b2724), ROCK_W = new T.Color(0x695e52), SNOW = new T.Color(0xc4ccd6), SCREE = new T.Color(0x57514a);
    for (let v = 0; v < pos.length / 3; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], e0 = ee[v], ny = nrm[v * 3 + 1];
      const nn = N.fbm(x * 0.035 + 40, z * 0.035, 4), fine = N.fbm(x * 0.2, z * 0.2, 2);
      if (e0 <= E0 + 0.01) c.copy(PLAZA).multiplyScalar(0.92 + fine * 0.2);
      else if (ny > 0.8 && e0 < E2 + 0.02 || e0 < E1) c.copy(GRASS).lerp(GRASS2, Math.min(1, Math.max(0, 0.45 + nn * 1.2))).lerp(DRY, Math.max(0, (e0 - E1) / (E2 - E1)) * 0.5);
      else {
        const steep = 1 - Math.min(1, Math.max(0, (ny - 0.35) / 0.45));       // 1 = parede
        const strata = 0.5 + 0.5 * Math.sin(y * 0.55 + nn * 6);
        c.copy(ROCK_D).lerp(ROCK, strata * 0.8 + fine * 0.3).lerp(ROCK_W, Math.max(0, nn) * 0.9);
        tmp.copy(SCREE).lerp(GRASS2, Math.max(0, nn + 0.15) * (y > -60 ? 0.9 : 0.4));
        c.lerp(tmp, (1 - steep) * 0.75);
        // neve: só nas saliências planas da parte alta
        const snow = (1 - steep) * Math.max(0, Math.min(1, (y + 115) / 60)) * Math.max(0, Math.min(1, (nn + fine * 0.5 + 0.05) * 4));
        if (y < -14) c.lerp(SNOW, Math.min(0.8, snow * 0.9));
      }
      col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
    }
    gm.setAttribute('color', new T.BufferAttribute(col, 3));
    return gm;
  }

  // ------------------------------------------------------------------ texturas desenhadas em canvas
  // nuvem cúmulo sombreada: topo iluminado, base azulada, contorno em couve-flor
  function puffTexture(T, seed) {
    const img = baked('puff' + seed);
    return new T.CanvasTexture(img || puffCanvas(seed));
  }
  function puffCanvas(seed) {
    // cúmulo mais natural: muitas bolhas pequenas e macias (base reta, topo em couve-flor), bordas desfiadas, sombra azulada embaixo
    const W = 512, H = 320;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); const rnd = MF.rng('cumulo2:' + seed);
    const N = makeNoise('cumulo-ruido:' + seed);
    const base = H * 0.8;
    const blobs = [];
    // silhueta: altura do topo varia ao longo da largura (2–3 torres)
    const towers = [0.3 + rnd() * 0.15, 0.5 + rnd() * 0.1, 0.68 + rnd() * 0.12].map((x) => [x * W, 0.45 + rnd() * 0.5]);
    const top = (x) => towers.reduce((m, [tx, th]) => Math.max(m, th * Math.exp(-Math.pow((x - tx) / (W * 0.16), 2))), 0.18);
    for (let i = 0; i < 260; i++) {
      const x = W * (0.1 + rnd() * 0.8), ht = top(x) * (base - 20);
      const y = base - rnd() * ht, r = 10 + rnd() * 26 * (0.6 + ht / base);
      if (y + r * 0.4 > base + 6) continue;
      blobs.push([x, y, r]);
    }
    blobs.sort((p, q) => q[1] - p[1]);
    for (const [x, y, r] of blobs) {
      const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.05, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.55, 'rgba(250,251,255,.7)'); gr.addColorStop(1, 'rgba(240,244,252,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    // bordas desfiadas e transparência irregular (ruído)
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = (y * W + x) * 4, a = d[k + 3] / 255;
      if (!a) continue;
      const n = N.fbm(x * 0.018, y * 0.018, 4) + 0.35 * N.fbm(x * 0.07, y * 0.07, 2);
      const aa = Math.min(1, Math.max(0, (a - 0.08 + n * 0.55) * 1.25));
      const below = Math.max(0, Math.min(1, (y - base * 0.55) / (base * 0.45)));
      const shade = 1 - 0.38 * below - 0.12 * Math.max(0, -n);
      d[k] = Math.round(d[k] * shade * 0.97); d[k + 1] = Math.round(d[k + 1] * shade * 0.985); d[k + 2] = Math.round(d[k + 2] * (shade * 0.9 + 0.1));
      d[k + 3] = Math.round(aa * 255 * (y > base ? Math.max(0, 1 - (y - base) / 10) : 1));
    }
    g.putImageData(img, 0, 0);
    // luz quente no topo
    g.globalCompositeOperation = 'source-atop';
    const hl = g.createRadialGradient(W * 0.42, H * 0.15, 4, W * 0.42, H * 0.2, W * 0.45);
    hl.addColorStop(0, 'rgba(255,250,236,.45)'); hl.addColorStop(1, 'rgba(255,250,236,0)');
    g.fillStyle = hl; g.fillRect(0, 0, W, H);
    return c;
  }
  function glowTexture(T, inner, outer) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.18, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  // gramado elíptico inteiro (campo + área de escape até o muro da arquibancada), 10 px por metro
  const PK = 10, PW = SA * 2 * PK, PH = SB * 2 * PK;
  function pitchTexture(T, maxAniso) {
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    const img = baked('pitch');
    if (img) c.getContext('2d').drawImage(img, 0, 0, PW, PH); else pitchBase(c);
    pitchText(c);
    const tx = new T.CanvasTexture(c);
    tx.anisotropy = Math.min(maxAniso || 4, 8);
    return tx;
  }
  // pinta "MUNDOFUT10" atrás dos gols (refeito só se a fonte chegar depois)
  function pitchText(c) {
    const g = c.getContext('2d'), K = PK;
    const P = (x, z) => [(x + SA) * K, (z + SB) * K];
    for (const [z, rot] of [[55.6, 0], [-55.6, Math.PI]]) {
      g.save(); g.font = `900 ${3.4 * K}px "Big Shoulders Display", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,212,0,.16)';
      g.translate(...P(0, z)); if (rot) g.rotate(rot); g.fillText('MUNDOFUT10', 0, 0); g.restore();
    }
  }
  function pitchBase(c) {
    const K = PK, W = PW, H = PH;
    const g = c.getContext('2d');
    const P = (x, z) => [(x + SA) * K, (z + SB) * K];
    g.fillStyle = '#163418'; g.fillRect(0, 0, W, H);
    // faixas de corte contínuas (14 no campo, seguindo o mesmo passo até o muro)
    const band = (PITCH_L / 14) * K, z0 = (SB - PITCH_L / 2) * K;
    for (let i = -6; i < 20; i++) { g.fillStyle = i % 2 ? '#1c4120' : '#17381a'; g.fillRect(0, z0 + i * band, W, band + 1); }
    // corte cruzado bem sutil dentro do campo
    g.save(); g.beginPath(); g.rect(...P(-34, -52.5), 68 * K, 105 * K); g.clip();
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.018)' : 'rgba(0,0,0,.025)'; g.fillRect(P(-34 + i * 6.8, 0)[0], 0, 6.8 * K, H); }
    g.restore();
    // granulação
    const rnd = MF.rng('grama');
    for (let i = 0; i < 70000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.02 + rnd() * 0.035})`; g.fillRect(rnd() * W, rnd() * H, 2, 2); }
    // desgaste: pequena área, marca do pênalti e círculo central
    const wear = (x, z, rx, rz, a) => { const [cx, cz] = P(x, z); const gr = g.createRadialGradient(cx, cz, 0, cx, cz, rx * K); gr.addColorStop(0, `rgba(122,104,62,${a})`); gr.addColorStop(1, 'rgba(122,104,62,0)'); g.save(); g.translate(cx, cz); g.scale(1, rz / rx); g.translate(-cx, -cz); g.fillStyle = gr; g.beginPath(); g.arc(cx, cz, rx * K, 0, 7); g.fill(); g.restore(); };
    for (const s2 of [-1, 1]) { wear(0, s2 * 50.5, 5, 2.4, 0.32); wear(0, s2 * 41.5, 2, 2, 0.18); wear(0, s2 * 46, 9, 4, 0.1); }
    wear(0, 0, 6, 6, 0.08);
    // aquecimento atrás dos gols e corredor dos bandeiras
    for (const s2 of [-1, 1]) { wear(-25, s2 * 55, 8, 1.4, 0.12); wear(25, s2 * 55, 8, 1.4, 0.12); wear(36, s2 * 20, 0.8, 22, 0.1); }
    // sombra junto ao muro (oclusão) e luz dos refletores
    g.save(); g.translate(W / 2, H / 2); g.scale(1, SB / SA);
    const og = g.createRadialGradient(0, 0, SA * K * 0.72, 0, 0, SA * K);
    og.addColorStop(0, 'rgba(0,0,0,0)'); og.addColorStop(1, 'rgba(0,0,0,.42)');
    g.fillStyle = og; g.beginPath(); g.arc(0, 0, SA * K, 0, 7); g.fill(); g.restore();
    for (const [x, y] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) {
      const gr = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, W * 0.85);
      gr.addColorStop(0, 'rgba(255,244,210,.08)'); gr.addColorStop(1, 'rgba(255,244,210,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    // marcações
    g.strokeStyle = 'rgba(246,242,228,.9)'; g.lineWidth = 1.2 * K * 0.12 * 3; g.lineCap = 'round';
    const rect = (x1, z1, x2, z2) => { const [a2, b2] = P(x1, z1), [c2, d2] = P(x2, z2); g.strokeRect(a2, b2, c2 - a2, d2 - b2); };
    rect(-34, -52.5, 34, 52.5);
    g.beginPath(); g.moveTo(...P(-34, 0)); g.lineTo(...P(34, 0)); g.stroke();
    g.beginPath(); g.arc(...P(0, 0), 9.15 * K, 0, 7); g.stroke();
    g.fillStyle = 'rgba(246,242,228,.95)'; g.beginPath(); g.arc(...P(0, 0), 0.3 * K, 0, 7); g.fill();
    for (const s2 of [-1, 1]) {
      rect(-20.15, s2 > 0 ? 36 : -52.5, 20.15, s2 > 0 ? 52.5 : -36);
      rect(-9.15, s2 > 0 ? 47 : -52.5, 9.15, s2 > 0 ? 52.5 : -47);
      g.beginPath(); g.arc(...P(0, s2 * 41.5), 0.3 * K, 0, 7); g.fill();
      g.beginPath(); const a0 = Math.acos(5.5 / 9.15);
      if (s2 > 0) g.arc(...P(0, 41.5), 9.15 * K, Math.PI + a0, 2 * Math.PI - a0); else g.arc(...P(0, -41.5), 9.15 * K, a0, Math.PI - a0);
      g.stroke();
      for (const sx of [-1, 1]) { g.beginPath(); const [cx, cz] = P(sx * 34, s2 * 52.5); const st = sx < 0 ? (s2 < 0 ? 0 : -Math.PI / 2) : (s2 < 0 ? Math.PI / 2 : Math.PI); g.arc(cx, cz, 1 * K, st, st + Math.PI / 2); g.stroke(); }
    }
    // área técnica (tracejada) diante dos bancos, lado oeste
    g.setLineDash([0.9 * K, 0.7 * K]); g.lineWidth = 2;
    rect(-39, -15, -35, -3.5); rect(-39, 3.5, -35, 15);
    g.setLineDash([]);
    return c;
  }
  // usado só por tools/bake_textures.py
  S._bake = () => {
    const pc = document.createElement('canvas'); pc.width = PW; pc.height = PH;
    return { puff1: puffCanvas(1), puff2: puffCanvas(2), puff3: puffCanvas(3), puff4: puffCanvas(4), pitch: pitchBase(pc) };
  };
  // fachada: nervuras verticais de concreto, dois pisos de janelas e faixa amarela no topo
  function facadeTextures(T) {
    const mk = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; return [c, c.getContext('2d')]; };
    const [c1, g] = mk(), [c2, e] = mk();
    g.fillStyle = '#2a2925'; g.fillRect(0, 0, 256, 256);
    e.fillStyle = '#000'; e.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
      const gr = g.createLinearGradient(x, 0, x + 32, 0);
      gr.addColorStop(0, '#3a3832'); gr.addColorStop(0.18, '#55524a'); gr.addColorStop(0.32, '#2d2c27'); gr.addColorStop(1, '#232220');
      g.fillStyle = gr; g.fillRect(x, 0, 32, 256);
    }
    for (const y of [96, 168]) {
      g.fillStyle = '#121211'; g.fillRect(0, y, 256, 26);
      for (let x = 6; x < 256; x += 32) { g.fillStyle = '#1b1c1e'; g.fillRect(x + 4, y + 5, 18, 16); e.fillStyle = '#ffd7a0'; e.globalAlpha = 0.55; e.fillRect(x + 4, y + 5, 18, 16); e.globalAlpha = 1; }
    }
    g.fillStyle = '#ffd400'; g.fillRect(0, 10, 256, 9); e.fillStyle = '#ffd400'; e.fillRect(0, 10, 256, 9);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 236, 256, 20);
    const t1 = new T.CanvasTexture(c1), t2 = new T.CanvasTexture(c2);
    for (const t of [t1, t2]) { t.wrapS = T.RepeatWrapping; t.repeat.set(46, 1); }
    return [t1, t2];
  }
  function netTexture(T) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
    for (let i = 0; i <= 64; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  function drawLed(c) {
    const g = c.getContext('2d');
    g.fillStyle = '#0b0b09'; g.fillRect(0, 0, 1024, 64);
    g.font = '900 44px "Big Shoulders Display", Impact, sans-serif'; g.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const x = i * 256 + 18;
      g.fillStyle = '#ffd400'; g.fillText('MUNDOFUT', x, 34);
      const w = g.measureText('MUNDOFUT').width;
      g.fillStyle = '#ffd400'; g.fillRect(x + w + 6, 10, 46, 46);
      g.fillStyle = '#0b0b09'; g.fillText('10', x + w + 10, 35);
    }
  }
  function ledTexture(T) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 64; drawLed(c);
    const tx = new T.CanvasTexture(c); tx.wrapS = T.RepeatWrapping;
    return tx;
  }
  // ------------------------------------------------------------------ telão (placar de LED) com o relógio de Brasília
  // Pendurado na cobertura atrás do gol do fundo. No lugar do placar do jogo: horas × minutos; segundos como
  // cronômetro da partida (1º tempo de manhã, 2º tempo de tarde/noite). A textura só é redesenhada quando o
  // relógio muda ou durante uma animação (varredura dos dígitos, pisca do minuto, GOOOL na virada da hora).
  const BOARD = { W: 1024, H: 400, w: 62, h: 24.2 };
  const BLINK = [[0, 1], [0.16, 1], [0.18, 0.12], [0.34, 0.12], [0.36, 1], [0.52, 1], [0.54, 0.12], [0.7, 0.12], [0.72, 1], [1, 1]];
  const blinkAt = (p) => { for (let i = BLINK.length - 1; i >= 0; i--) if (p >= BLINK[i][0]) return BLINK[i][1]; return 1; };
  function boardDots() {
    // grade de pontos de LED: escurece o espaço entre os "pixels" do painel
    const c = document.createElement('canvas'); c.width = BOARD.W; c.height = BOARD.H;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    for (let y = 3; y < c.height; y += 6) for (let x = 3; x < c.width; x += 6) { g.beginPath(); g.arc(x, y, 2.3, 0, 6.2832); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    const sh = g.createLinearGradient(0, 0, c.width * 0.3, c.height);
    sh.addColorStop(0, 'rgba(255,255,255,.07)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function drawBoard(st, now) {
    const c = st.canvas, g = c.getContext('2d'), W = BOARD.W, H = BOARD.H, k = st.c;
    const LED = '#ffd400', LED2 = '#ffa31a', GREEN = '#3ae58e';
    g.setTransform(1, 0, 0, 1, 0, 0);
    const bg = g.createRadialGradient(W / 2, -40, 40, W / 2, H * 0.4, W * 0.7);
    bg.addColorStop(0, '#1a1912'); bg.addColorStop(0.6, '#070706'); bg.addColorStop(1, '#030302');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.textBaseline = 'alphabetic';
    const glowText = (txt, x, y, col, glow, blur, align) => {
      g.textAlign = align || 'center';
      g.shadowColor = glow; g.shadowBlur = blur; g.fillStyle = col; g.fillText(txt, x, y);
      g.shadowBlur = 0;
    };
    const wipeP = (key) => { const t0 = st.wipe[key]; if (t0 == null) return 1; const p = Math.min(1, (now - t0) / 220); return Math.ceil(p * 6 - 1e-6) / 6; };
    // um dígito de LED: o "8" apagado por baixo e o número aceso por cima (com varredura quando muda)
    const digit = (key, ch, x, yBase, size, col, glow, off, alpha) => {
      g.font = `900 ${size}px "Big Shoulders Display", Impact, sans-serif`;
      glowText('8', x, yBase, off, 'transparent', 0);
      const p = wipeP(key);
      if (p <= 0) return;
      g.save();
      g.globalAlpha = alpha;
      g.beginPath(); g.rect(x - size, yBase - size * 0.95, size * 2, size * 1.05 * p); g.clip();
      glowText(ch, x, yBase, col, glow, size * 0.12);
      g.restore();
    };
    const goal = st.goal != null && now - st.goal < 5200;
    // faixa de cima: tempo (1º/2º), segundos no cronômetro, sol ou lua
    g.font = '800 58px "Big Shoulders Display", Impact, sans-serif';
    glowText(st.half, 44, 82, LED2, 'rgba(255,150,0,.8)', 14, 'left');
    g.strokeStyle = 'rgba(255,163,26,.45)'; g.lineWidth = 3;
    g.fillStyle = 'rgba(255,163,26,.07)';
    g.beginPath(); g.roundRect ? g.roundRect(W / 2 - 62, 22, 124, 74, 10) : g.rect(W / 2 - 62, 22, 124, 74); g.fill(); g.stroke();
    digit('s0', k.s[0], W / 2 - 25, 86, 72, LED2, 'rgba(255,150,0,.85)', 'rgba(255,163,26,.1)', 1);
    digit('s1', k.s[1], W / 2 + 25, 86, 72, LED2, 'rgba(255,150,0,.85)', 'rgba(255,163,26,.1)', 1);
    g.save();
    g.translate(W - 70, 58);
    if (st.day) {
      g.shadowColor = 'rgba(255,150,0,.8)'; g.shadowBlur = 14; g.fillStyle = LED2;
      g.beginPath(); g.arc(0, 0, 13, 0, 6.2832); g.fill();
      g.strokeStyle = LED2; g.lineWidth = 5; g.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.2832; g.beginPath(); g.moveTo(Math.cos(a) * 21, Math.sin(a) * 21); g.lineTo(Math.cos(a) * 29, Math.sin(a) * 29); g.stroke(); }
    } else {
      g.shadowColor = 'rgba(170,190,255,.85)'; g.shadowBlur = 14; g.fillStyle = '#cdd8ff';
      g.beginPath(); g.arc(0, 0, 26, 0, 6.2832); g.fill();
      g.shadowBlur = 0; g.fillStyle = '#080807';   // a "mordida" da lua pinta o fundo do painel (sem furar a textura)
      g.beginPath(); g.arc(13, -10, 24, 0, 6.2832); g.fill();
    }
    g.restore();
    // linha principal: MUN [hh] : [mm] FUT — ou o GOOOL correndo pelo painel
    const yB = 300;
    if (goal) {
      const el = now - st.goal, loop = (el % 2600) / 2600;
      g.font = '900 190px "Big Shoulders Display", Impact, sans-serif';
      const txt = st.goalTxt, tw = g.measureText(txt).width;
      glowText(txt, W - loop * (W + tw), yB - 8, LED, 'rgba(255,200,0,.85)', 26, 'left');
    } else {
      const bl = st.blink != null && now - st.blink < 1100 ? blinkAt((now - st.blink) / 1100) : 1;
      // caixas dos placares
      g.strokeStyle = 'rgba(255,212,0,.24)'; g.lineWidth = 3; g.fillStyle = 'rgba(255,212,0,.04)';
      for (const x of [W / 2 - 236, W / 2 + 36]) { g.beginPath(); g.roundRect ? g.roundRect(x, 118, 200, 200, 14) : g.rect(x, 118, 200, 200); g.fill(); g.stroke(); }
      const off = 'rgba(255,212,0,.08)', glow = 'rgba(255,190,0,.9)';
      digit('h0', k.h[0], W / 2 - 184, yB, 210, LED, glow, off, bl);
      digit('h1', k.h[1], W / 2 - 88, yB, 210, LED, glow, off, bl);
      digit('m0', k.m[0], W / 2 + 88, yB, 210, LED, glow, off, bl);
      digit('m1', k.m[1], W / 2 + 184, yB, 210, LED, glow, off, bl);
      // dois-pontos piscando a cada segundo
      if (st.colon) { g.fillStyle = LED; g.shadowColor = glow; g.shadowBlur = 16; for (const y of [182, 256]) { g.beginPath(); g.arc(W / 2, y, 11, 0, 6.2832); g.fill(); } g.shadowBlur = 0; }
      g.font = '800 74px "Big Shoulders Display", Impact, sans-serif';
      glowText('MUN', 76, 246, '#f6efd6', 'rgba(255,240,200,.6)', 12, 'left');
      glowText('FUT', W - 76, 246, '#f6efd6', 'rgba(255,240,200,.6)', 12, 'right');
      g.shadowBlur = 14;
      g.shadowColor = LED; g.fillStyle = LED; g.fillRect(44, 192, 18, 62);
      g.shadowColor = GREEN; g.fillStyle = GREEN; g.fillRect(W - 62, 192, 18, 62);
      g.shadowBlur = 0;
    }
    // barra de segundos (60 gomos)
    const seg = (W - 88) / 60, filled = +k.s + 1;
    for (let i = 0; i < 60; i++) {
      g.fillStyle = i < filled ? LED : 'rgba(255,212,0,.1)';
      if (i < filled) { g.shadowColor = 'rgba(255,190,0,.7)'; g.shadowBlur = 6; }
      g.fillRect(44 + i * seg, 350, seg - 4, 16);
      g.shadowBlur = 0;
    }
    g.drawImage(st.dots, 0, 0);
  }
  function buildBoard(T, A, rOut, hTop) {
    const st = { canvas: document.createElement('canvas'), dots: boardDots(), wipe: {}, blink: null, goal: null, key: '', drawn: 0, colon: true, op: 0, target: 1 };
    st.canvas.width = BOARD.W; st.canvas.height = BOARD.H;
    st.tex = new T.CanvasTexture(st.canvas);
    st.tex.anisotropy = 4;
    const grp = new T.Group();
    const metal = new T.MeshLambertMaterial({ color: 0x24221d, transparent: true });
    const trim = new T.MeshBasicMaterial({ color: 0xffd400, transparent: true });
    const screenMat = new T.MeshBasicMaterial({ map: st.tex, transparent: true });
    const { w, h } = BOARD;
    const box = new T.Mesh(new T.BoxGeometry(w + 3.2, h + 4.4, 1.6), metal); box.position.set(0, 0.6, -0.9); grp.add(box);
    const rim = new T.Mesh(new T.PlaneGeometry(w + 1.3, h + 1.3), trim); rim.position.z = 0.02; grp.add(rim);
    const scr = new T.Mesh(new T.PlaneGeometry(w, h), screenMat); scr.position.z = 0.06; grp.add(scr);
    // fileira de lâmpadas na moldura de cima
    const bulbGeo = new T.CircleGeometry(0.42, 10), bulbs = [];
    for (let i = 0; i < 16; i++) {
      const m = new T.MeshBasicMaterial({ color: 0xffd400, transparent: true });
      const b = new T.Mesh(bulbGeo, m); b.position.set(-w / 2 + 2.4 + (i * (w - 4.8)) / 15, h / 2 + 1.55, 0.04); grp.add(b); bulbs.push(m);
    }
    // pendurado na borda interna da cobertura por cabos de aço, sobre a arquibancada atrás do gol do fundo,
    // inclinado para a câmera
    grp.position.set(0, hTop - 4.2, -95);
    grp.rotation.x = -0.42;
    grp.updateMatrixWorld(true);
    const cable = new T.MeshLambertMaterial({ color: 0x55524a, transparent: true });
    const cables = [];
    const yRoof = hTop + 7.7;
    for (const x of [-w * 0.36, w * 0.36]) {
      const a = new T.Vector3(x, h / 2 + 2.6, -0.9).applyMatrix4(grp.matrixWorld);
      const zr = -SB * (rOut - 0.17) * Math.sqrt(Math.max(0, 1 - Math.pow(x / (A * (rOut - 0.17)), 2)));
      const b = new T.Vector3(x, yRoof, zr);
      const len = a.distanceTo(b);
      const cb = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, len, 5), cable);
      cb.position.copy(a).add(b).multiplyScalar(0.5);
      cb.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      cables.push(cb);
    }
    st.group = grp; st.cables = cables; st.mats = [metal, trim, screenMat, cable, ...bulbs]; st.bulbs = bulbs;
    // cantos (mundo) para o enquadramento da câmera
    st.corners = [[-w / 2 - 1.6, h / 2 + 2.8], [w / 2 + 1.6, h / 2 + 2.8], [-w / 2 - 1.6, -h / 2 - 1.6], [w / 2 + 1.6, -h / 2 - 1.6]].map(([x, y]) => new T.Vector3(x, y, 0).applyMatrix4(grp.matrixWorld));
    return st;
  }
  S.boardTick = (now) => {
    const st = S.board;
    if (!st) return;
    // aparece/desaparece suave (o placar da interface assume nas telas estreitas)
    const dtOp = st.target - st.op;
    if (Math.abs(dtOp) > 0.001) {
      st.op += dtOp * 0.12; if (Math.abs(st.target - st.op) < 0.01) st.op = st.target;
      st.mats.forEach((m) => (m.opacity = st.op));
    }
    st.group.visible = st.op > 0.01;
    st.cables.forEach((cb) => (cb.visible = st.group.visible));
    if (!st.group.visible) return;
    const anim = !MF.reduced();
    // lâmpadas acendendo em sequência (mais rápido no GOOOL)
    const goal = st.goal != null && now - st.goal < 5200;
    const per = goal ? 480 : 2400, lit = per * 0.22;
    st.bulbs.forEach((m, i) => { const ph = anim ? ((now + i * (goal ? 30 : 150)) % per) : 0; m.color.setRGB(1, 0.83, 0).multiplyScalar(!anim ? 0.55 : ph < lit ? 1 : 0.22); });
    // o relógio só é consultado a cada 100 ms (o dois-pontos pisca a cada meio segundo)
    const busy = (st.blink != null && now - st.blink < 1150) || goal || Object.values(st.wipe).some((t0) => now - t0 < 260);
    if (!busy && now - (st.checked || 0) < 100) return;
    st.checked = now;
    const c = MF.clockParts ? MF.clockParts() : null;
    if (!c) return;
    const key = c.h + c.m + c.s;
    let dirty = false;
    if (key !== st.key) {
      const prev = st.c;
      if (prev && anim) {
        for (const [d, a, b] of [['h0', prev.h[0], c.h[0]], ['h1', prev.h[1], c.h[1]], ['m0', prev.m[0], c.m[0]], ['m1', prev.m[1], c.m[1]]]) if (a !== b) st.wipe[d] = now;   // segundos trocam direto: textura redesenhada ~2× por segundo
        if (prev.m !== c.m) {
          if (prev.h !== c.h) { st.goal = now; st.goalTxt = (MF.t ? MF.t('goal') : 'GOOOL!') + '  ' + c.h + ':00'; }
          else st.blink = now;
        }
      }
      st.c = c; st.key = key; st.half = MF.halfLabel ? MF.halfLabel(c) : (c.half === 1 ? '1ºT' : '2ºT');
      st.day = S.day == null ? true : S.day > 0.5;
      st.tick = now;
      dirty = true;
    }
    const colon = !anim || now - (st.tick || now) < 500;
    if (colon !== st.colon) { st.colon = colon; dirty = true; }
    const active = (st.blink != null && now - st.blink < 1150) || (st.goal != null && now - st.goal < 5300) ||
      Object.values(st.wipe).some((t0) => now - t0 < 260);
    if (active && now - st.drawn > 33) dirty = true;
    if (!dirty) return;
    drawBoard(st, now);
    st.drawn = now;
    st.tex.needsUpdate = true;
  };
  S.setBoard = (on) => { if (S.board) S.board.target = on ? 1 : 0; };

  const SHIRT = 'M20 3 L8 8 L1 22 L11 27 L13 23 V57 H51 V23 L53 27 L63 22 L56 8 L44 3 C42 9 37 12 32 12 C27 12 22 9 20 3 Z';
  function shirtCanvas(num, status) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.translate(12, 22); g.scale(3.6, 3.6);
    const path = new Path2D(SHIRT);
    const pal = status === 'won' ? ['#2c6b47', '#1a4a30', '#9ff0c4'] : status === 'lost' ? ['#7a2a22', '#4e1912', '#ffb2a9'] : ['#ffe14a', '#f0b800', '#0d0c09'];
    const gr = g.createLinearGradient(0, 0, 64, 60);
    gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
    g.fillStyle = gr; g.fill(path);
    // dobras do tecido
    g.save(); g.clip(path);
    for (const [x, a] of [[18, 0.10], [30, -0.08], [44, 0.09]]) {
      const fg = g.createLinearGradient(x - 6, 0, x + 6, 0);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.5, a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`); fg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fg; g.fillRect(x - 6, 0, 12, 60);
    }
    // gola e punhos
    g.fillStyle = status === 'won' || status === 'lost' ? 'rgba(0,0,0,.35)' : '#0d0c09';
    g.beginPath(); g.moveTo(20, 3); g.bezierCurveTo(22, 9, 27, 12, 32, 12); g.bezierCurveTo(37, 12, 42, 9, 44, 3); g.lineTo(41, 3); g.bezierCurveTo(39, 7, 36, 9, 32, 9); g.bezierCurveTo(28, 9, 25, 7, 23, 3); g.closePath(); g.fill();
    g.fillRect(0, 19, 12, 3.2); g.fillRect(52, 19, 12, 3.2);
    g.restore();
    g.lineWidth = 1.1; g.strokeStyle = 'rgba(0,0,0,.55)'; g.stroke(path);
    g.fillStyle = pal[2];
    g.font = '900 25px "Big Shoulders Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(String(num), 32, 46);
    if (status === 'won' || status === 'lost') {
      g.fillStyle = status === 'won' ? '#3ddc8a' : '#ff5d4d';
      g.beginPath(); g.arc(53, 50, 7, 0, 7); g.fill();
      g.strokeStyle = '#0d0c09'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath();
      if (status === 'won') { g.moveTo(49.5, 50); g.lineTo(52.5, 53); g.lineTo(57, 47.5); } else { g.moveTo(50, 47); g.lineTo(56, 53); g.moveTo(56, 47); g.lineTo(50, 53); }
      g.stroke();
    }
    return c;
  }

  // ------------------------------------------------------------------ shaders
  const CROWD_VS = `
    attribute float aPhase; attribute vec3 aColor;
    uniform float uTime; uniform float uDensity; uniform float uLight; uniform float uNight;
    varying vec3 vColor; varying float vFog; varying float vFlash;
    void main(){
      vec3 p = position;
      float jumper = step(0.72, fract(aPhase * 13.17));
      p.y += jumper * max(0.0, sin(uTime * 5.2 + aPhase * 6.2831)) * 0.38;
      vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float shade = 0.62 + 0.38 * clamp(normal.y * 0.6 + normal.z * 0.4 + 0.4, 0.0, 1.0);
      vColor = aColor * shade * uLight;
      float f = uDensity * -mv.z; vFog = 1.0 - exp(-f * f);
      vFlash = uNight * step(0.9985, fract(sin(aPhase * 91.7 + floor(uTime * 6.0) * 12.9898) * 43758.5453));
    }`;
  const CROWD_FS = `
    uniform vec3 uFog; varying vec3 vColor; varying float vFog; varying float vFlash;
    void main(){ vec3 c = mix(vColor, vec3(1.0), vFlash); gl_FragColor = vec4(mix(c, uFog, vFog), 1.0); }`;
  // mar de nuvens volumétrico (altura por ruído com domínio deformado, relevo real no vértice, luz do sol/lua no fragmento)
  const CLOUD_GLSL = `
    uniform float uTime;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(1.7, 9.2); a *= 0.5; } return v; }
    float cloudH(vec2 q){
      vec2 p = q * 0.0042 + uTime * vec2(0.0035, 0.002);
      p += (vec2(noise(p * 0.55 + 3.1), noise(p * 0.55 + 8.7)) - 0.5) * 1.2;
      float n = fbm(p);
      return smoothstep(0.3, 0.84, n);
    }`;
  const SEA_VS = CLOUD_GLSL + `
    uniform vec2 uStad;
    varying vec3 vW; varying vec3 vN;
    void main(){
      vec4 w = modelMatrix * vec4(position, 1.0);
      float h = cloudH(w.xz);
      float hx = cloudH(w.xz + vec2(5.0, 0.0)), hz = cloudH(w.xz + vec2(0.0, 5.0));
      vN = vec3(-(hx - h) * 7.0, 1.0, -(hz - h) * 7.0);
      float e = length(w.xz / uStad);
      float hug = 13.0 * exp(-pow((e - 1.08) / 0.32, 2.0));        // nuvens sobem e abraçam a base
      w.y += h * 28.0 + hug - 4.0 * smoothstep(0.9, 0.0, e);
      vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const SEA_FS = CLOUD_GLSL + `
    uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uDeep; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uGlow;
    uniform float uFogD; uniform float uGlowAmt; uniform float uSilver; uniform float uShadowAmt; uniform vec2 uStad;
    varying vec3 vW; varying vec3 vN;
    void main(){
      vec2 q = vW.xz;
      float h = cloudH(q);
      vec3 N = normalize(vN);
      vec3 L = normalize(vec3(uSun.x, max(uSun.y, 0.12), uSun.z));
      float lam = clamp(dot(N, L) * 0.85 + 0.15, 0.0, 1.0);
      vec3 col = mix(uShade, uLit, clamp(lam * 0.78 + h * 0.32, 0.0, 1.0));
      col = mix(uDeep, col, smoothstep(0.0, 0.3, h));                       // vales profundos entre os cúmulos
      col += uLit * pow(1.0 - clamp(N.y, 0.0, 1.0), 1.4) * uSilver * lam;   // borda prateada contra o sol
      col += (uShade - col) * 0.12 * (1.0 - h);                              // céu refletido nas sombras
      // sombra do estádio projetada sobre as nuvens
      vec2 off = -L.xz / max(L.y, 0.25) * 24.0;
      float es = length((q - off) / (uStad * 1.05));
      col *= 1.0 - uShadowAmt * (1.0 - smoothstep(0.8, 1.35, es));
      // brilho dos refletores à noite
      float er = length(q / uStad);
      col += uGlow * uGlowAmt * exp(-max(er - 0.9, 0.0) * 1.6);
      // perspectiva aérea até a linha do horizonte
      float d = distance(cameraPosition, vW);
      float f = 1.0 - exp(-pow(d * uFogD, 1.5));
      gl_FragColor = vec4(mix(col, uHorizon, f), 1.0);
    }`;
  const SHIRT_VS = `
    uniform float uTime; uniform float uAmp; uniform float uSeed;
    varying vec2 vUv; varying vec3 vN; varying vec3 vView;
    void main(){
      vUv = uv;
      vec3 p = position;
      float hang = 1.0 - uv.y;                 // preso nos ombros, mais solto embaixo
      float k1 = 1.15, k2 = 1.6, t = uTime + uSeed;
      float w1 = sin(p.x * k1 + t * 3.1), w2 = sin(p.y * k2 - t * 2.4 + p.x * 0.6);
      float a = uAmp * (0.25 + hang);
      p.z += a * (0.55 * w1 + 0.45 * w2);
      p.x += a * 0.18 * sin(p.y * 1.2 + t * 2.0);
      float dzdx = a * (0.55 * k1 * cos(p.x * k1 + t * 3.1) + 0.45 * 0.6 * cos(p.y * k2 - t * 2.4 + p.x * 0.6));
      float dzdy = a * 0.45 * k2 * cos(p.y * k2 - t * 2.4 + p.x * 0.6);
      vec3 n = normalize(vec3(-dzdx, -dzdy, 1.0));
      vN = normalize(normalMatrix * n);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const SHIRT_FS = `
    uniform sampler2D map; uniform float uDark; uniform float uGlow;
    varying vec2 vUv; varying vec3 vN; varying vec3 vView;
    void main(){
      vec4 tx = texture2D(map, vUv);
      if (tx.a < 0.5) discard;
      vec3 N = gl_FrontFacing ? vN : -vN;
      vec3 L = normalize(vec3(-0.35, 0.75, 0.6));
      float dif = max(dot(N, L), 0.0);
      float rim = pow(1.0 - max(dot(N, vView), 0.0), 2.5);
      float spec = pow(max(dot(reflect(-L, N), vView), 0.0), 18.0) * 0.25;
      vec3 c = tx.rgb * (0.86 + 0.34 * dif) + rim * vec3(1.0, 0.92, 0.6) * 0.3 + spec + uGlow * vec3(0.22, 0.18, 0.0);
      gl_FragColor = vec4(c * (1.0 - uDark), 1.0);
    }`;

  // ------------------------------------------------------------------ montagem da cena
  S.init = () => {
    if (S.ok) return true;
    if (!S.supported()) return false;
    const T = window.THREE;
    const mobile = Math.min(innerWidth, innerHeight) < 700;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    // resolução interna: começa no teto do aparelho e o loop ajusta sozinho (S.quality)
    const dpr = window.devicePixelRatio || 1, qMax = Math.min(dpr, mobile ? 1.5 : 1.75);
    S.q = { max: qMax, cur: qMax, min: Math.min(qMax, mobile ? 0.8 : 0.9), acc: 0, n: 0, hold: 0, ups: 0, low: false };
    renderer.setPixelRatio(qMax);
    renderer.setClearColor(0x060708);
    const scene = new T.Scene();
    const FOG = new T.Color(0x0a0e18);
    scene.fog = new T.FogExp2(FOG, 0.00085);
    const camera = new T.PerspectiveCamera(40, 1, 0.5, 6000);
    const rnd = MF.rng('estadio3d');
    const uTime = { value: 0 };

    // céu (gradiente noturno) + estrelas
    const sky = new T.Mesh(new T.SphereGeometry(4200, 32, 16), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(0x050914) }, mid: { value: new T.Color(0x14213a) }, low: { value: new T.Color(0x2a2a2e) }, sunDir: { value: new T.Vector3(0, -1, 0) }, sunCol: { value: new T.Color(0xffd27a) }, sunAmt: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.55)) : mix(mid, low, clamp(-h * 3.0, 0.0, 1.0)); float d = max(dot(vP, normalize(sunDir)), 0.0); c += sunCol * (pow(d, 900.0) * 3.0 + pow(d, 12.0) * 0.35) * sunAmt; gl_FragColor = vec4(c, 1.0); }',
    }));
    scene.add(sky);
    {
      const n = 1400, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const th = rnd() * 6.283, ph = rnd() * 1.2; pos.set([Math.cos(th) * Math.sin(ph) * 3800, Math.cos(ph) * 3800, Math.sin(th) * Math.sin(ph) * 3800], i * 3); }
      const gm = new T.BufferGeometry(); gm.setAttribute('position', new T.BufferAttribute(pos, 3));
      S._stars = new T.PointsMaterial({ color: 0xcfd8ff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 });
      scene.add(new T.Points(gm, S._stars));
    }
    // mar de nuvens: malha polar (mais densa perto do estádio) com relevo real
    const seaGeo = (() => {
      const R = 4300, RINGS = mobile ? 90 : 128, SEG = mobile ? 160 : 224, pos = [0, 0, 0], idx = [];
      for (let i = 1; i <= RINGS; i++) { const r = R * Math.pow(i / RINGS, 2.15); for (let j = 0; j < SEG; j++) { const a = (j / SEG) * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
      for (let j = 0; j < SEG; j++) idx.push(0, 1 + ((j + 1) % SEG), 1 + j);
      for (let i = 1; i < RINGS; i++) { const b0 = 1 + (i - 1) * SEG, b1 = 1 + i * SEG; for (let j = 0; j < SEG; j++) { const j1 = (j + 1) % SEG; idx.push(b0 + j, b0 + j1, b1 + j, b0 + j1, b1 + j1, b1 + j); } }
      const gm = new T.BufferGeometry(); gm.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); gm.setIndex(idx); return gm;
    })();
    const stad = new T.Vector2(SA * 1.6, SB * 1.6);
    const sea = new T.Mesh(seaGeo, new T.ShaderMaterial({
      uniforms: { uTime, uStad: { value: stad }, uLit: { value: new T.Color(0xfffaf0) }, uShade: { value: new T.Color(0x93a9c6) }, uDeep: { value: new T.Color(0x5f7ea6) },
        uHorizon: { value: new T.Color(0xa8cdf0) }, uSun: { value: new T.Vector3(0.3, 0.8, 0.4) }, uGlow: { value: new T.Color(0xffc879) },
        uFogD: { value: 0.00078 }, uGlowAmt: { value: 0 }, uSilver: { value: 0.3 }, uShadowAmt: { value: 0.3 } },
      vertexShader: SEA_VS, fragmentShader: SEA_FS, side: T.DoubleSide,
    }));
    sea.position.y = CLOUD_Y; sea.frustumCulled = false; scene.add(sea);
    const ground = sea;
    // a montanha: platô de grama no cume, paredões de rocha com neve nas reentrâncias, base engolida pelas nuvens
    const OUT = 1 + 24 * 0.024 + 0.04; // raio externo da fachada (em raios do gramado)
    const mountain = new T.Mesh(mountainGeometry(T, SA * OUT, SB * OUT, mobile), new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.96, metalness: 0 }));
    mountain.position.y = -0.05; scene.add(mountain); S._mountainMat = mountain.material;
    // o mar de nuvens abraça a montanha onde ela o encontra
    stad.set(SA * OUT * 4.1, SB * OUT * 4.1);
    // cúmulos (sprites sombreados) abraçando a base do estádio e torres de nuvem no horizonte
    const puffTxs = [puffTexture(T, 1), puffTexture(T, 2), puffTexture(T, 3), puffTexture(T, 4)];
    const puffs = [];
    const addPuff = (x, y, z, size, op, fog) => {
      const m = new T.SpriteMaterial({ map: puffTxs[(rnd() * puffTxs.length) | 0], transparent: true, depthWrite: false, opacity: op, fog: fog !== false });
      const sp = new T.Sprite(m); sp.position.set(x, y, z); sp.scale.set(size * (rnd() < 0.5 ? 1 : -1), size * 0.625, 1);
      sp.userData = { y, ph: rnd() * 6.283 };
      scene.add(sp); puffs.push(sp);
    };
    // cúmulos que abraçam a montanha no nível das nuvens
    for (let i = 0, n = mobile ? 50 : 76; i < n; i++) {
      const a = (i / n) * 6.283 + (rnd() - 0.5) * 0.14, rr = 6.3 + Math.pow(rnd(), 2) * 1.8, size = 90 + Math.pow(rnd(), 1.5) * 170;
      addPuff(Math.cos(a) * rr * SA, CLOUD_Y + 6 + rnd() * 14 + size * 0.05, Math.sin(a) * rr * SB, size, 0.95);
    }
    // véus de nuvem subindo pelos paredões (meio transparentes)
    for (let i = 0, n = mobile ? 14 : 24; i < n; i++) {
      const a = rnd() * 6.283, rr = 4.4 + rnd() * 1.6, size = 60 + rnd() * 90;
      addPuff(Math.cos(a) * rr * SA, CLOUD_Y + 40 + rnd() * 45, Math.sin(a) * rr * SB, size, 0.42 + rnd() * 0.25);
    }
    for (let i = 0, n = mobile ? 26 : 40; i < n; i++) {
      const a = rnd() * 6.283, rr = 520 + Math.pow(rnd(), 0.8) * 1000, size = 140 + rnd() * 240;
      addPuff(Math.cos(a) * rr, CLOUD_Y + 10 + size * 0.12, Math.sin(a) * rr * 1.1, size, 1);
    }
    for (let i = 0, n = mobile ? 12 : 18; i < n; i++) {
      const a = (i / n) * 6.283 + rnd() * 0.3, rr = 1300 + rnd() * 1500, size = 460 + rnd() * 560;
      addPuff(Math.cos(a) * rr, CLOUD_Y + size * 0.22, Math.sin(a) * rr, size, 1);
    }
    // brilho do estádio visto de longe
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(T, 'rgba(255,225,150,.55)', 'rgba(255,210,120,.18)'), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    halo.scale.set(520, 520, 1); halo.position.set(0, 18, 0); halo.material.depthTest = false; scene.add(halo);

    // luzes
    const hemi = new T.HemisphereLight(0x9fb4ff, 0x1a1a10, 0.55); scene.add(hemi);
    const key = new T.DirectionalLight(0xfff2d0, 0.9); key.position.set(-60, 120, 80); scene.add(key);

    // gramado + entorno
    const pitch = new T.Mesh(new T.CircleGeometry(1, 160), new T.MeshBasicMaterial({ map: pitchTexture(T, renderer.capabilities.getMaxAnisotropy()) }));
    S._pitch = pitch.material;
    pitch.rotation.x = -Math.PI / 2; pitch.scale.set(SA + 0.4, SB + 0.4, 1); scene.add(pitch);
    // placas de LED
    const led = ledTexture(T);
    const ledMat = new T.MeshBasicMaterial({ map: led });
    S._leds = [led];
    for (const [w, x, z, ry] of [[72, 0, -57.5, 0], [72, 0, 57.5, Math.PI], [36, -39.5, -34, Math.PI / 2], [36, -39.5, 34, Math.PI / 2], [104, 39.5, 0, -Math.PI / 2]]) {
      const tx = led.clone(); tx.needsUpdate = true; tx.repeat.set(w / 26, 1); S._leds.push(tx);
      const m = new T.Mesh(new T.PlaneGeometry(w, 1.4), new T.MeshBasicMaterial({ map: tx }));
      m.position.set(x, 0.75, z); m.rotation.y = ry; scene.add(m);
    }
    // arquibancadas em degraus (torno elíptico)
    const A = SA, B = SB, TIERS = 24, STEP_R = 0.024, STEP_H = 1.05;
    const prof = [new T.Vector2(1.0, 0)];
    for (let i = 0; i < TIERS; i++) { const r = 1 + i * STEP_R; prof.push(new T.Vector2(r, 1.2 + i * STEP_H)); prof.push(new T.Vector2(r + STEP_R, 1.2 + i * STEP_H)); }
    const rOut = 1 + TIERS * STEP_R, hTop = 1.2 + TIERS * STEP_H;
    prof.push(new T.Vector2(rOut + 0.02, hTop + 4)); prof.push(new T.Vector2(rOut + 0.03, 0));
    const stands = new T.Mesh(new T.LatheGeometry(prof, 120), new T.MeshLambertMaterial({ color: 0x1d1c19, side: T.DoubleSide })); S._standMat = stands.material;
    stands.scale.set(A, 1, B); scene.add(stands);
    // cobertura (anel em balanço) e estrutura
    const roofProf = [new T.Vector2(rOut + 0.03, hTop + 4), new T.Vector2(rOut - 0.16, hTop + 7.5), new T.Vector2(rOut - 0.17, hTop + 8.2), new T.Vector2(rOut + 0.04, hTop + 5)];
    const roof = new T.Mesh(new T.LatheGeometry(roofProf, 120), new T.MeshLambertMaterial({ color: 0x2a2924, side: T.DoubleSide })); S._roofMat = roof.material;
    roof.scale.set(A, 1, B); scene.add(roof);
    // fachada com nervuras e base sólida pousada nas nuvens
    const [facTx, facEm] = facadeTextures(T);
    const facH = hTop + 4.4;
    const facade = new T.Mesh(new T.CylinderGeometry(1, 1, facH, 180, 1, true), new T.MeshLambertMaterial({ map: facTx, emissiveMap: facEm, emissive: 0xffffff, emissiveIntensity: 0.6 }));
    facade.scale.set(A * (rOut + 0.04), 1, B * (rOut + 0.04)); facade.position.y = facH / 2 - 0.2; scene.add(facade);
    S._facade = facade.material;
    const baseProf = [new T.Vector2(0, -15), new T.Vector2(0.5, -14.4), new T.Vector2(rOut - 0.2, -9), new T.Vector2(rOut + 0.04, -3.5), new T.Vector2(rOut + 0.04, 0)];
    const base = new T.Mesh(new T.LatheGeometry(baseProf, 120), new T.MeshLambertMaterial({ color: 0x24231f }));
    base.scale.set(A, 1, B); scene.add(base); S._baseMat = base.material;
    // traves com rede
    const white = new T.MeshLambertMaterial({ color: 0xf6f4ee });
    const netMat = new T.MeshBasicMaterial({ map: netTexture(T), transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false });
    for (const sg of [-1, 1]) {
      const gz = sg * 52.5, goal = new T.Group();
      const post = (x) => { const m = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 2.44, 8), white); m.position.set(x, 1.22, 0); goal.add(m); };
      post(-3.66); post(3.66);
      const bar = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 7.56, 8), white); bar.rotation.z = Math.PI / 2; bar.position.y = 2.44; goal.add(bar);
      const nm = (w, h, rx, ry, x, y, z, rep2) => { const m2 = netMat.clone(); m2.map = netMat.map.clone(); m2.map.needsUpdate = true; m2.map.repeat.set(rep2[0], rep2[1]); const m = new T.Mesh(new T.PlaneGeometry(w, h), m2); m.rotation.set(rx, ry, 0); m.position.set(x, y, z); goal.add(m); };
      nm(7.32, 2.6, -0.35, 0, 0, 1.2, 2.1, [12, 4]);
      nm(7.32, 2.0, Math.PI / 2, 0, 0, 2.44, 1.0, [12, 3]);
      nm(2.0, 2.44, 0, Math.PI / 2, -3.66, 1.22, 1.0, [3, 4]); nm(2.0, 2.44, 0, Math.PI / 2, 3.66, 1.22, 1.0, [3, 4]);
      goal.position.set(0, 0, gz); if (sg < 0) goal.rotation.y = Math.PI; scene.add(goal);
    }
    // bancos de reservas, túnel e bandeirinhas de escanteio (lado oeste)
    const dark = new T.MeshLambertMaterial({ color: 0x1c1b18 }), seatMat = new T.MeshLambertMaterial({ color: 0xffd400 });
    const glass = new T.MeshLambertMaterial({ color: 0xa9c2d6, transparent: true, opacity: 0.38, depthWrite: false });
    for (const sg of [-1, 1]) {
      const dug = new T.Group();
      const back = new T.Mesh(new T.BoxGeometry(0.2, 2.3, 10), dark); back.position.set(-1.2, 1.15, 0); dug.add(back);
      const floor = new T.Mesh(new T.BoxGeometry(2.6, 0.12, 10), dark); floor.position.set(0, 0.06, 0); dug.add(floor);
      const roofG = new T.Mesh(new T.BoxGeometry(2.8, 0.1, 10.2), glass); roofG.position.set(0.1, 2.35, 0); roofG.rotation.z = -0.12; dug.add(roofG);
      for (let k = 0; k < 8; k++) { const st = new T.Mesh(new T.BoxGeometry(0.6, 0.9, 0.9), seatMat); st.position.set(-0.6, 0.55, -4.1 + k * 1.17); dug.add(st); }
      dug.position.set(-43.5, 0, sg * 9.5); scene.add(dug);
    }
    const tunnel = new T.Group();
    const tBox = new T.Mesh(new T.BoxGeometry(5.5, 2.3, 7), dark); tBox.position.y = 1.15; tunnel.add(tBox);
    const tMouth = new T.Mesh(new T.PlaneGeometry(3.4, 2.0), new T.MeshBasicMaterial({ color: 0x050505 })); tMouth.rotation.y = Math.PI / 2; tMouth.position.set(2.76, 1.0, 0); tunnel.add(tMouth);
    tunnel.position.set(-53, 0, 0); scene.add(tunnel);
    for (const [x, z] of [[-34, -52.5], [34, -52.5], [-34, 52.5], [34, 52.5]]) {
      const pole = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1.6, 6), white); pole.position.set(x, 0.8, z); scene.add(pole);
      const flag = new T.Mesh(new T.PlaneGeometry(0.6, 0.42), new T.MeshBasicMaterial({ color: 0xffd400, side: T.DoubleSide })); flag.position.set(x + 0.3, 1.38, z); scene.add(flag);
    }
    // anel de luz sob a cobertura
    const ringPts = [];
    for (let k = 0; k <= 160; k++) { const a = (k / 160) * 6.283; ringPts.push(new T.Vector3(Math.cos(a) * (rOut - 0.15) * A, hTop + 7.3, Math.sin(a) * (rOut - 0.15) * B)); }
    S._ring = new T.LineBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.85 });
    scene.add(new T.Line(new T.BufferGeometry().setFromPoints(ringPts), S._ring));
    // telão com o relógio (placar de LED)
    S.board = buildBoard(T, A, rOut, hTop);
    scene.add(S.board.group); S.board.cables.forEach((cb) => scene.add(cb));

    // torcida: caixinhas instanciadas nos degraus, com mosaico amarelo/preto atrás dos gols
    const seats = [];
    const spacing = mobile ? 1.35 : 1.05;
    for (let i = 0; i < TIERS; i++) {
      const r = 1 + i * STEP_R + STEP_R * 0.5;
      const a = r * A, b = r * B;
      const per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
      const n = Math.floor(per / spacing);
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2;
        const deg = ((ang * 180) / Math.PI) % 30;
        if (deg < 1.3) continue; // escadas
        seats.push([Math.cos(ang) * a, 1.2 + i * STEP_H + 0.45, Math.sin(ang) * b, ang, i]);
      }
    }
    const nS = seats.length;
    const crowdGeo = new T.BoxGeometry(0.62, 0.9, 0.5);
    const aPhase = new Float32Array(nS), aColor = new Float32Array(nS * 3);
    const PAL = [[1, 0.83, 0], [1, 0.83, 0], [0.95, 0.75, 0], [0.96, 0.93, 0.82], [0.1, 0.1, 0.09], [0.16, 0.15, 0.13], [0.07, 0.07, 0.06], [0.22, 0.2, 0.15], [0.9, 0.88, 0.8], [0.05, 0.25, 0.12]];
    const crowd = new T.InstancedMesh(crowdGeo, new T.ShaderMaterial({
      uniforms: { uTime, uDensity: { value: 0.00085 }, uFog: { value: FOG }, uLight: { value: 1 }, uNight: { value: 1 } }, vertexShader: CROWD_VS, fragmentShader: CROWD_FS,
    }), nS);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), sc = new T.Vector3(1, 1, 1), ps = new T.Vector3();
    seats.forEach(([x, y, z, ang, tier], i) => {
      q.setFromAxisAngle(up, -ang + Math.PI / 2);
      sc.set(0.85 + rnd() * 0.3, 0.85 + rnd() * 0.35, 1);
      m4.compose(ps.set(x, y, z), q, sc);
      crowd.setMatrixAt(i, m4);
      aPhase[i] = rnd();
      const behindGoal = Math.abs(Math.sin(ang)) > 0.86;
      const c = behindGoal ? (Math.floor(tier / 3) % 2 ? [1, 0.83, 0] : [0.06, 0.06, 0.05]) : PAL[Math.floor(rnd() * PAL.length)];
      aColor.set(c, i * 3);
    });
    crowdGeo.setAttribute('aPhase', new T.InstancedBufferAttribute(aPhase, 1));
    crowdGeo.setAttribute('aColor', new T.InstancedBufferAttribute(aColor, 3));
    crowd.frustumCulled = false;
    scene.add(crowd);

    // torres de refletores
    const glowTx = glowTexture(T, 'rgba(255,252,235,1)', 'rgba(255,236,180,.45)');
    S._lights = [];
    for (const [x, z] of [[-97, -132], [97, -132], [-97, 132], [97, 132]]) {
      const tower = new T.Mesh(new T.CylinderGeometry(0.7, 1.1, 46, 8), new T.MeshLambertMaterial({ color: 0x2b2a26 }));
      tower.position.set(x, 23, z); scene.add(tower);
      const head = new T.Group();
      const housing = new T.Mesh(new T.BoxGeometry(9, 4.6, 1.4), new T.MeshLambertMaterial({ color: 0x2f2d27 }));
      head.add(housing);
      for (let r = 0; r < 2; r++) for (let cc = 0; cc < 4; cc++) {
        const lamp = new T.Mesh(new T.PlaneGeometry(1.7, 1.6), new T.MeshBasicMaterial({ color: 0xfffbe8 }));
        lamp.position.set(-3.15 + cc * 2.1, -1 + r * 2, 0.72); head.add(lamp);
      }
      head.position.set(x, 47, z); head.lookAt(0, 0, 0); scene.add(head);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTx, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      glow.position.set(x, 47, z); glow.scale.set(48, 48, 1); scene.add(glow); S._lights.push(glow.material);
      // feixe de luz
      const cone = new T.Mesh(new T.CylinderGeometry(2, 34, 70, 24, 1, true), new T.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.035, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
      S._cones = S._cones || []; S._cones.push(cone.material);
      const mid = new T.Vector3(x * 0.45, 22, z * 0.45);
      cone.position.copy(mid);
      cone.lookAt(x, 47, z); cone.rotateX(Math.PI / 2);
      scene.add(cone);
    }

    // nuvens (o voo atravessa a camada)
    const clouds = [];
    for (let i = 0; i < (mobile ? 34 : 46); i++) {
      const y = 520 + rnd() * 620;
      const spread = 420 + y * 0.8;
      const s = new T.Sprite(new T.SpriteMaterial({ map: puffTxs[i % 3], transparent: true, depthWrite: false, opacity: 0.8, fog: false }));
      const size = 260 + rnd() * 420;
      s.position.set((rnd() - 0.5) * spread * 2, y, (rnd() - 0.5) * spread * 2 + 120);
      s.scale.set(size, size * 0.62, 1);
      s.userData = { base: 0.3 + rnd() * 0.38, size, drift: (rnd() - 0.5) * 6 };
      scene.add(s); clouds.push(s);
    }

    // sombra suave sob as camisas
    const shadowTx = glowTexture(T, 'rgba(0,0,0,.65)', 'rgba(0,0,0,.35)');

    Object.assign(S, { T, renderer, scene, camera, uTime, clouds, puffs, sea, halo, sky, hemi, key, ground, crowdMat: crowd.material, FOG, shadowTx, mobile, jerseys: [], ok: true, running: false, mode: 'home' });
    renderer.domElement.className = 'stage-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    S.pose = { pos: new T.Vector3(0, 60, 95), target: new T.Vector3(0, 0, -6) };
    S.camLook = new T.Vector3();
    S.pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    addEventListener('pointermove', (e) => { S.pointer.x = (e.clientX / innerWidth) * 2 - 1; S.pointer.y = (e.clientY / innerHeight) * 2 - 1; });
    addEventListener('resize', () => S.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) S.stop(); else if (S.mounted) S.start(); });
    S._fontsOk = fontsReady();
    S.warm();
    return true;
  };
  const fontsReady = () => { try { return !document.fonts || document.fonts.check('900 34px "Big Shoulders Display"'); } catch (e) { return true; } };
  // aquecimento: compila todos os shaders e envia todas as texturas à GPU antes do primeiro quadro,
  // em vez de engasgar no meio do voo quando cada objeto aparece pela primeira vez
  S.warm = () => {
    const { renderer, scene, camera } = S;
    try {
      camera.updateMatrixWorld();
      renderer.compile(scene, camera);
      const seen = new Set();
      const up = (t) => { if (t && t.isTexture && !seen.has(t)) { seen.add(t); renderer.initTexture(t); } };
      scene.traverse((o) => {
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of ms) {
          up(m.map); up(m.emissiveMap);
          if (m.uniforms) for (const k in m.uniforms) up(m.uniforms[k] && m.uniforms[k].value);
        }
      });
    } catch (e) { /* aquecimento é só otimização */ }
    S.q && (S.q.hold = performance.now() + 700);
  };

  // ------------------------------------------------------------------ dia e noite pelo horário de Brasília
  // posição do sol (algoritmo solar simplificado) para Brasília/DF
  S.sun = (date) => {
    const rad = Math.PI / 180, lat = -15.79 * rad, lon = -47.88;
    const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
    const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
    const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
    const ha = ((gmst + lon / 15) * 15) * rad - ra;
    const elev = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
    const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha));
    return { elev: elev / rad, az };
  };
  S.setTimeOfDay = (date) => {
    if (!S.ok) return;
    const { T } = S;
    const sun = S.sun(date || new Date());
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const day = smooth(-7, 8, sun.elev);               // 0 noite → 1 dia
    const dusk = Math.exp(-Math.pow(sun.elev / 6, 2)); // pico no nascer/pôr do sol
    S.night = 1 - day; S.day = day; S.dusk = dusk;
    const mix = (a, b, t) => new T.Color(a).lerp(new T.Color(b), t);
    const u = S.sky.material.uniforms;
    u.top.value.copy(mix(0x050914, 0x2a66cf, day));
    const hz = mix(0x1c2645, 0xa8cdf0, day).lerp(new T.Color(0xf2a679), dusk * 0.6);
    u.mid.value.copy(hz);
    u.low.value.copy(hz);
    const dir = new T.Vector3(Math.sin(sun.az) * Math.cos(sun.elev * Math.PI / 180), Math.sin(sun.elev * Math.PI / 180), Math.cos(sun.az) * Math.cos(sun.elev * Math.PI / 180));
    u.sunDir.value.copy(dir);
    u.sunCol.value.copy(mix(0xff9a4a, 0xfff3d0, day));
    u.sunAmt.value = smooth(-4, 2, sun.elev);
    const fog = hz.clone();
    S.FOG.copy(fog); S.scene.fog.color.copy(fog); S.renderer.setClearColor(fog);
    S._stars.opacity = 0.85 * (1 - day);
    const su = S.sea.material.uniforms;
    su.uLit.value.copy(mix(0x8e9cc4, 0xfffaf0, day).lerp(new T.Color(0xffc48a), dusk * 0.6));
    su.uShade.value.copy(mix(0x2b3555, 0x93a9c6, day).lerp(new T.Color(0x8a6f9e), dusk * 0.5));
    su.uDeep.value.copy(mix(0x121828, 0x5f7ea6, day).lerp(new T.Color(0x4b4a78), dusk * 0.5));
    su.uHorizon.value.copy(hz);
    su.uSun.value.copy(sun.elev > -2 ? dir : new T.Vector3(0.45, 0.62, -0.5));   // à noite, luz da lua
    su.uSilver.value = 0.2 + 0.9 * dusk;
    su.uShadowAmt.value = 0.32 * smooth(0, 18, sun.elev);
    const puffCol = mix(0x8d9ac0, 0xffffff, day).lerp(new T.Color(0xffd2b0), dusk * 0.55);
    S.puffs.forEach((p) => p.material.color.copy(puffCol));
    const lightsOn = 1 - smooth(2, 12, sun.elev);      // refletores acendem no fim da tarde
    S._lights.forEach((m) => (m.opacity = lightsOn));
    (S._cones || []).forEach((m) => (m.opacity = 0.035 * lightsOn));
    S._ring.opacity = 0.3 + 0.55 * lightsOn;
    su.uGlowAmt.value = 0.38 * lightsOn;
    S._facade.emissiveIntensity = 0.12 + 0.75 * lightsOn;
    S._facade.color.copy(mix(0x8d8a80, 0xd8d4c8, day));
    S._baseMat.color.copy(mix(0x1a1916, 0x56544c, day));
    if (S._mountainMat) S._mountainMat.color.copy(mix(0x2c3344, 0xa9a9a9, day).lerp(new T.Color(0xd09a78), dusk * 0.3));
    S.hemi.intensity = 0.55 + 0.55 * day;
    S.hemi.color.copy(mix(0x9fb4ff, 0xdfeeff, day));
    S.key.intensity = 0.9 + 0.5 * day;
    if (sun.elev > 0) S.key.position.copy(dir).multiplyScalar(200);
    S.key.color.copy(mix(0xfff2d0, 0xffe2b0, dusk));
    S.crowdMat.uniforms.uLight.value = 0.95 + 0.3 * day;
    S.crowdMat.uniforms.uNight.value = lightsOn;
    S._pitch.color.copy(mix(0xb9c6b4, 0xffffff, day));
    S._standMat.color.copy(mix(0x1d1c19, 0x4e4c46, day));
    S._roofMat.color.copy(mix(0x2a2924, 0x34332f, day).lerp(new T.Color(0xc9875a), dusk * 0.35));
    S.clouds.forEach((c) => c.material.color.copy(puffCol));
    if (S.host) S.host.classList.toggle('is-day', day > 0.5);
    return { elev: sun.elev, day };
  };

  // ------------------------------------------------------------------ camisas
  S.setJerseys = (items, layer) => {
    const { T, scene } = S;
    for (const j of S.jerseys) { scene.remove(j.group); scene.remove(j.shadow); const tx = j.mat.uniforms.map.value; if (tx) tx.dispose(); }
    S.jerseys = [];
    S.layer = layer;
    items.forEach((it, idx) => {
      const tex = new T.CanvasTexture(shirtCanvas(it.num, it.status));
      const mat = new T.ShaderMaterial({
        uniforms: { map: { value: tex }, uTime: S.uTime, uAmp: { value: 0.12 }, uSeed: { value: it.num * 1.7 }, uDark: { value: 0 }, uGlow: { value: 0 } },
        vertexShader: SHIRT_VS, fragmentShader: SHIRT_FS, side: T.DoubleSide,
      });
      const back = mat.clone(); back.uniforms = { ...mat.uniforms, uDark: { value: 0.45 } };
      const geo = new T.PlaneGeometry(11, 11, 24, 24);
      const front = new T.Mesh(geo, mat);
      const thick = new T.Mesh(geo, back); thick.position.z = -0.28;
      const shirt = new T.Group(); shirt.add(thick); shirt.add(front);
      const group = new T.Group(); group.add(shirt);
      const w = spotToWorld(it.num);
      group.position.set(w.x, 0, w.z);
      const shadow = new T.Mesh(new T.PlaneGeometry(12, 6), new T.MeshBasicMaterial({ map: S.shadowTx, transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.set(w.x, 0.05, w.z);
      scene.add(shadow);
      scene.add(group);
      const j = { ...it, idx, group, shirt, shadow, mat, front, hover: 0, hoverT: 0, enter: S.introDone ? 1 : 0, base: w, el: it.el };
      S.jerseys.push(j);
      // ligar o link acessível (DOM) à camisa 3D
      it.el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') j.hoverT = 1; });
      it.el.addEventListener('pointerleave', () => (j.hoverT = 0));
      it.el.addEventListener('focus', () => (j.hoverT = 1));
      it.el.addEventListener('blur', () => (j.hoverT = 0));
    });
    // ao trocar de jogadores, a sombra antiga sai junto
    S._shadows && S._shadows.forEach((s) => scene.remove(s));
    S._shadows = S.jerseys.map((j) => j.shadow);
    S.warm();
  };

  S.refreshTextures = () => {
    if (!S.ok || S._fontsOk) return;
    S._fontsOk = true;
    const jobs = (S._jobs = S._jobs || []);
    if (S._leds) jobs.push(() => { drawLed(S._leds[0].image); S._leds.forEach((t) => (t.needsUpdate = true)); });
    if (S._pitch && S._pitch.map) jobs.push(() => { const nt = pitchTexture(S.T, S.renderer.capabilities.getMaxAnisotropy()); S.renderer.initTexture(nt); const old = S._pitch.map; S._pitch.map = nt; old.dispose(); });
    for (const j of S.jerseys) jobs.push(() => { const tx = j.mat.uniforms.map.value; tx.image = shirtCanvas(j.num, j.status); tx.needsUpdate = true; });
    if (!S.running) while (jobs.length) jobs.shift()();
  };

  // ------------------------------------------------------------------ enquadramento responsivo da pose final
  S.fitPose = () => {
    const { T, camera } = S;
    const r = S.fitRect || { x0: -0.95, x1: 0.95, y0: -0.95, y1: 0.95 };
    const target = new T.Vector3(0, 0, 0);
    const dir = new T.Vector3(0, S.mobile ? 1.25 : 1.05, 1).normalize();
    camera.clearViewOffset();
    const solve = (pts) => {
      let d = 220, bb;
      for (let it = 0; it < 18; it++) {
        camera.position.copy(target).addScaledVector(dir, d);
        camera.lookAt(target); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
        bb = { x0: 9, x1: -9, y0: 9, y1: -9 };
        for (const p of pts) { const v = p.clone().project(camera); bb.x0 = Math.min(bb.x0, v.x); bb.x1 = Math.max(bb.x1, v.x); bb.y0 = Math.min(bb.y0, v.y); bb.y1 = Math.max(bb.y1, v.y); }
        const s = Math.max((bb.x1 - bb.x0) / (r.x1 - r.x0), (bb.y1 - bb.y0) / (r.y1 - r.y0));
        d *= 0.35 + 0.65 * s;
      }
      const a = new T.Vector3(-34, 0, 0).project(camera), b = new T.Vector3(34, 0, 0).project(camera);
      return { bb, pitchPx: ((b.x - a.x) / 2) * S.W };
    };
    // o estádio inteiro (com nuvens em volta) quando o gramado continua legível; senão aproxima só o necessário
    const minPitch = S.mobile ? Math.min(300, S.W * 0.74) : Math.min(262, S.W * 0.5);
    let res;
    for (const fr of [1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0]) {
      const pts = fr ? [] : [[-36, 0, -56], [36, 0, -56], [-36, 0, 56], [36, 0, 56]].map((q) => new T.Vector3(...q));
      const yTop = fr >= 1.55 ? 34 : Math.max(0, 1.2 + ((fr - 1) / 0.024) * 1.05);
      for (let k = 0; fr && k < 32; k++) {
        const an = (k / 32) * Math.PI * 2, x = Math.cos(an) * SA * fr, z = Math.sin(an) * SB * fr;
        pts.push(new T.Vector3(x, yTop, z)); if (fr >= 1.55) pts.push(new T.Vector3(x, 0, z));
      }
      for (const j of S.jerseys) pts.push(new T.Vector3(j.base.x, 12.5, j.base.z));
      if (S.boardFit && S.board) pts.push(...S.board.corners);
      res = solve(pts);
      if (res.pitchPx >= minPitch) break;
    }
    const bb = res.bb;
    S._bb = bb; S.pose.pos.copy(camera.position); S.pose.target.copy(target);
    // desloca a imagem para centralizar o estádio na área livre (ao lado do painel / abaixo do título)
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    const rcx = (r.x0 + r.x1) / 2, rcy = (r.y0 + r.y1) / 2;
    S.viewOffset = [-(rcx - cx) / 2 * S.W, (rcy - cy) / 2 * S.H];
  };
  S.applyOffset = (k) => {
    const o = S.viewOffset || [0, 0];
    S.camera.setViewOffset(S.W, S.H, o[0] * k, o[1] * k, S.W, S.H);
  };

  S.resize = () => {
    if (!S.ok || !S.host) return;
    const r = S.host.getBoundingClientRect();
    S.W = Math.max(1, r.width); S.H = Math.max(1, r.height);
    S.renderer.setSize(S.W, S.H, false);
    S.camera.aspect = S.W / S.H;
    S.camera.updateProjectionMatrix();
    S.computeFitRect && S.computeFitRect();
    S.fitPose();
  };

  // ------------------------------------------------------------------ voo da câmera
  S.mount = (host, computeFitRect) => {
    S.host = host;
    S.setTimeOfDay(S.debugDate || new Date());
    clearInterval(S._todIv);
    S._todIv = setInterval(() => S.setTimeOfDay(S.debugDate || new Date()), 60000);
    S.computeFitRect = computeFitRect;
    host.insertBefore(S.renderer.domElement, host.firstChild);
    S.mounted = true;
    S.offscreen = false;
    if (S._io) S._io.disconnect();
    if ('IntersectionObserver' in window) {
      S._io = new IntersectionObserver(([en]) => {
        S.offscreen = !en.isIntersecting;
        if (S.offscreen) S.stop(); else if (S.mounted && !document.hidden) S.start();
      });
      S._io.observe(host);
    }
    S.resize();
    S.start();
  };
  S.unmount = () => { S.mounted = false; S.stop(); if (S._io) { S._io.disconnect(); S._io = null; } S.offscreen = false; };

  S.playIntro = (onReveal, onEnd) => {
    const { T } = S;
    const P = S.pose.pos, G = S.pose.target;
    // descida direta: a câmera mira sempre o centro do estádio e só inclina até o ângulo da escalação
    const endDir = P.clone().sub(G);
    S.introPath = { G: G.clone(), dEnd: endDir.length(), dStart: 1500, endDir: endDir.normalize(), startDir: new T.Vector3(0, 1, 0.12).normalize(), dir: new T.Vector3() };
    // relógio próprio do voo (soma de quadros, não o relógio da parede): um engasgo do navegador não vira salto na câmera
    S.intro = { el: 0, dur: S.mobile ? 7600 : 8400, onReveal, onEnd, revealed: false, skip: null };
    S.introDone = false;
    if (S.board) S.board.target = 1;   // o telão faz parte do voo em todas as telas
    S.start();
  };
  S.skipIntro = () => { if (S.intro && S.intro.skip == null) S.intro.skip = S.intro.el; };
  S.showHome = () => { S.intro = null; S.introDone = true; S.jerseys.forEach((j) => (j.enter = 1)); S.start(); };

  // ------------------------------------------------------------------ qualidade adaptável
  // mede o tempo real dos quadros e ajusta a resolução interna (pixel ratio) para manter a animação lisa;
  // no limite mais baixo também desliga os desfoques de fundo (backdrop-filter) por cima do canvas
  S.quality = (now, raw) => {
    const q = S.q;
    if (!q || raw > 250) return;          // aba voltando do segundo plano: ignora
    if (now < q.hold) return;             // período de aquecimento / depois de uma troca
    q.acc += raw; q.n++;
    if (q.n < 24) return;
    const avg = q.acc / q.n; q.acc = 0; q.n = 0;
    let next = q.cur;
    if (avg > 20.5 && q.cur > q.min) next = Math.max(q.min, q.cur - (avg > 30 ? 0.3 : 0.15));
    else if (avg < 12.5 && q.cur < q.max && q.ups < 3) { next = Math.min(q.max, q.cur + 0.1); q.ups++; }
    if (avg > 24 && q.cur <= q.min + 0.01 && !q.low) { q.low = true; document.body.classList.add('lowfx'); }
    if (Math.abs(next - q.cur) > 0.001) {
      q.cur = next;
      S.renderer.setPixelRatio(next);
      S.renderer.setSize(S.W, S.H, false);
      q.hold = now + 900;
    }
  };

  // ------------------------------------------------------------------ loop
  S.start = () => {
    if (S.running || !S.ok || S.offscreen) return;
    S.running = true; S.last = performance.now(); requestAnimationFrame(S.frame);
  };
  S.stop = () => { S.running = false; };
  const _v = { a: null };
  const setStyle = (el, key, val) => { const c = el._mf || (el._mf = {}); if (c[key] !== val) { c[key] = val; if (key === '--sz') el.style.setProperty('--sz', val); else el.style[key] = val; } };
  S.frame = (now) => {
    if (!S.running) return;
    requestAnimationFrame(S.frame);
    const raw = now - S.last; S.last = now;
    const dt = Math.min(0.05, Math.max(0, raw) / 1000);
    S.quality(now, raw);
    // trabalho de texturas adiado (fonte que chegou depois): uma por quadro, nunca tudo de uma vez
    if (S._jobs && S._jobs.length) S._jobs.shift()();
    S.uTime.value += dt;
    const { camera, T } = S;
    let k = 1, fog = 0;
    if (S.intro) {
      const I = S.intro;
      I.el += Math.min(100, Math.max(0, raw));   // até 10 qps o voo dura o mesmo; engasgos maiores não pulam a câmera
      let p = S.debugP != null ? S.debugP : I.el / I.dur;
      if (I.skip != null) { I.skipFrom = I.skipFrom ?? p; p = I.skipFrom + (1 - I.skipFrom) * clamp((I.el - I.skip) / 900, 0, 1); }
      p = clamp(p, 0, 1);
      const e = easeInOut(p);
      const ip = S.introPath;
      const dist = ip.dEnd * Math.pow(ip.dStart / ip.dEnd, 1 - e); // aproximação contínua (zoom constante)
      const tilt = clamp((e - 0.45) / 0.55, 0, 1); // inclina só na reta final
      const dir = ip.dir.copy(ip.startDir).lerp(ip.endDir, tilt * tilt * (3 - 2 * tilt)).normalize();
      camera.position.copy(ip.G).addScaledVector(dir, dist);
      camera.up.set(0, 1, 0);
      camera.lookAt(ip.G);
      k = clamp((p - 0.7) / 0.3, 0, 1);
      // jogadores sobem no gramado quando a câmera chega
      S.jerseys.forEach((j, i) => { j.enter = clamp((p - 0.74 - i * 0.012) / 0.16, 0, 1); });
      if (p > 0.8 && !I.revealed) { I.revealed = true; I.onReveal && I.onReveal(); }
      if (p >= 1) { S.intro = null; S.introDone = true; camera.up.set(0, 1, 0); I.onEnd && I.onEnd(); MF.introEnded && MF.introEnded(); }
      // névoa de nuvem na tela
      for (const c of S.clouds) {
        const dd = c.position.distanceTo(camera.position) / c.userData.size;
        if (dd < 0.45) fog = Math.max(fog, ((0.45 - dd) / 0.45) * c.userData.base * 0.8);
      }
    } else {
      // tela inicial: leve paralaxe com o mouse (sensação de 3D), suavizada pelo tempo do quadro
      const pt = S.pointer, a = 1 - Math.pow(0.96, dt * 60);
      pt.sx += (pt.x - pt.sx) * a; pt.sy += (pt.y - pt.sy) * a;
      const drift = Math.sin(now / 5200) * 0.6;
      camera.position.set(S.pose.pos.x + pt.sx * 3.2 + drift, S.pose.pos.y - pt.sy * 1.6, S.pose.pos.z);
      camera.up.set(0, 1, 0);
      camera.lookAt(S.pose.target);
    }
    S.applyOffset(k);
    S.halo.material.opacity = clamp((camera.position.length() - 380) / 500, 0, 1) * (S.night ?? 1);
    // nuvens somem perto da câmera (as altas só importam durante o voo)
    const flying = !!S.intro || !S._cloudsSettled;
    if (flying) {
      for (const c of S.clouds) {
        const d = c.position.distanceTo(camera.position);
        c.material.opacity = c.userData.base * clamp((d - c.userData.size * 0.12) / (c.userData.size * 0.55), 0, 1);
        c.position.x += c.userData.drift * dt;
      }
      if (!S.intro) S._cloudsSettled = true;
    }
    for (const p of S.puffs) p.position.y = p.userData.y + Math.sin(S.uTime.value * 0.4 + p.userData.ph) * 0.8;
    if (S.fogEl) setStyle(S.fogEl, 'opacity', fog > 0.002 ? fog.toFixed(3) : '0');
    // camisas: entrada com mola, flutuação, rotação para a câmera, tecido ao passar o mouse
    const tt = S.uTime.value, ease = 1 - Math.pow(0.88, dt * 60);
    for (const j of S.jerseys) {
      j.hover += (j.hoverT - j.hover) * ease;
      const e = easeOutBack(j.enter);
      const vis = j.enter > 0;
      j.group.visible = vis; j.shadow.visible = vis;
      if (!vis) continue;
      const yaw = Math.atan2(camera.position.x - j.base.x, camera.position.z - j.base.z);
      j.group.position.set(j.base.x, 6 * e + 0.5 * Math.sin(tt * 1.3 + j.num) + j.hover * 2, j.base.z);
      j.group.rotation.set(-0.12 - j.hover * 0.06, yaw + 0.16 * Math.sin(tt * 0.7 + j.num * 0.8) * (1 - j.hover), 0.04 * Math.sin(tt * 0.9 + j.num));
      const s = Math.max(0.001, e) * (1 + j.hover * 0.14);
      j.group.scale.set(s, s, s);
      j.mat.uniforms.uAmp.value = 0.1 + j.hover * 0.75;
      j.mat.uniforms.uGlow.value = j.hover * 0.6;
      const sh = clamp(e, 0, 1) * (1 - j.hover * 0.25);
      j.shadow.scale.set(sh, sh, sh);
    }
    S.boardTick(now);
    S.renderer.render(S.scene, camera);
    // posiciona os links (DOM) sobre as camisas — só escreve no DOM o que mudou
    if (S.layer) {
      const v = _v.a || (_v.a = new T.Vector3());
      for (const j of S.jerseys) {
        const op = clamp(j.enter * 1.4 - 0.4, 0, 1);
        setStyle(j.el, 'opacity', op ? op.toFixed(3) : '0');
        if (!op) continue;
        v.set(j.base.x, j.group.position.y, j.base.z).project(camera);
        const x = (v.x * 0.5 + 0.5) * S.W, y = (-v.y * 0.5 + 0.5) * S.H;
        v.set(j.base.x, j.group.position.y + 5.3 * j.group.scale.y, j.base.z).project(camera);
        const top = (-v.y * 0.5 + 0.5) * S.H;
        const hgt = Math.max(24, (y - top) * 2);
        setStyle(j.el, 'transform', `translate3d(${x.toFixed(1)}px, ${(y - hgt / 2).toFixed(1)}px, 0)`);
        setStyle(j.el, '--sz', (Math.round(hgt * 2) / 2) + 'px');
      }
    }
  };
})();
