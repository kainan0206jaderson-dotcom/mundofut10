"""MUNDOFUT10 — correções da base (21/10/2026). Roda depois do tm_build.py:

    python3 tools/fix_data.py [caminho/player_profiles.csv]

1. Clubes repetidos com outro nome (ex.: "Man Utd", "Spurs", "Galatasaray A.S.", "Leicester"): as passagens vão para o
   clube principal e passagens do mesmo clube que se encostam viram uma só. Vale para db.json e ext.json.
2. Passagens cortadas (fim aproximado): corrigidas pela base antiga curada (tools/legacy_db.json), que tem o fim certo das
   passagens dos jogadores conhecidos até 2023 (ex.: Robertson no Liverpool, Casemiro no Porto só em 2014).
3. Correções manuais de jogadores conhecidos (FIX abaixo).
4. Situação atual pelos perfis do Transfermarkt (salimt/football-datasets, player_profiles.csv, set/2026):
   falecidos viram aposentados (bit 32); sem clube / carreira interrompida ganham o bit 256 ("parado"), para não serem o
   jogador do dia em modos que pedem quem ainda joga.
"""
import csv, json, os, re, sys, unicodedata

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(ROOT, 'docs', 'data')
PROFILES = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('MF_PROFILES', '')

# clube repetido -> clube principal (índices de db.json "clubs"; conferidos por jogadores em comum e nome)
ALIAS = {
    69: 17, 115: 49, 129: 73, 175: 140, 184: 183, 253: 252, 272: 46, 301: 107, 308: 30, 372: 370, 384: 242, 394: 41,
    395: 121, 396: 144, 414: 192, 428: 427, 454: 273, 476: 11, 517: 42, 578: 128, 579: 217, 581: 580, 595: 594, 635: 47,
    644: 611, 650: 7, 681: 680, 722: 156, 744: 743, 782: 258, 795: 369, 798: 246, 799: 246, 841: 1, 877: 55, 883: 430,
    890: 889, 893: 161, 918: 393, 953: 1254, 962: 742, 986: 163, 987: 238, 1000: 18, 1046: 434, 1055: 493, 1075: 879,
    1093: 47, 1137: 603, 1142: 122, 1143: 1054, 1219: 425, 1220: 188, 1233: 37, 1318: 323, 1331: 204, 1349: 234, 1398: 779,
    1404: 216, 1444: 1443, 1452: 359, 1505: 1495, 1556: 51, 1563: 1564, 1571: 1570, 1592: 66, 1644: 1643, 1659: 1658,
    1802: 976, 1813: 1812, 1814: 862, 1840: 291, 1901: 158, 2042: 941, 2143: 1720, 2306: 2307, 2379: 1820, 2503: 451,
    2525: 840, 2561: 1426, 2689: 2688, 2721: 2720, 2724: 679, 2768: 1664, 2931: 2765, 3100: 2881, 3186: 3185, 3461: 2635,
}
# (nome, nascimento) -> {clube: (início, fim)} — passagens conhecidas que a fonte cortou
FIX = {
    ('Éverton Ribeiro', 1989): {'Flamengo': (2017, 2023)},
}


def norm(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', s.lower())).strip()


def merge(st):
    """passagens do mesmo clube que se sobrepõem ou se encostam (sem ser empréstimo) viram uma só"""
    st = sorted(st, key=lambda s: (s[1], s[2]))
    out = []
    for s in st:
        f = s[3] if len(s) > 3 else 0
        prev = next((p for p in reversed(out) if p[0] == s[0]), None)
        if prev is not None and s[1] <= prev[2] + 1 and not ((f | (prev[3] if len(prev) > 3 else 0)) & 4) and prev is out[-1]:
            prev[2] = max(prev[2], s[2])
            continue
        if prev is not None and s[1] >= prev[1] and s[2] <= prev[2] and not (f & 4):
            continue  # passagem repetida dentro de outra
        out.append(list(s))
    return out


def remap(st):
    changed = any(s[0] in ALIAS for s in st)
    out = merge([[ALIAS.get(s[0], s[0])] + list(s[1:]) for s in st])
    return out, changed or len(out) != len(st)


def main():
    db = json.load(open(os.path.join(DATA, 'db.json')))
    ext = json.load(open(os.path.join(DATA, 'ext.json')))
    clubs = db['clubs']
    cid = {}
    for i, c in enumerate(clubs):
        cid.setdefault(norm(c[0]), i)
    n_alias = 0
    for p in db['players']:
        p[8], ch = remap(p[8]); n_alias += ch
    for p in ext['players']:
        p[5], ch = remap(p[5]); n_alias += ch

    # 2. base antiga curada (só para o jogador de maior nota com aquele nome e nascimento)
    leg = json.load(open(os.path.join(ROOT, 'tools', 'legacy_db.json')))
    lclubs = leg['clubs']
    lmap = {(norm(q[0]), q[4]): q for q in leg['players']}
    best = {}
    for i, p in enumerate(db['players']):
        k = (norm(p[0]), p[4])
        if k not in best or db['players'][best[k]][7] < p[7]:
            best[k] = i
    n_leg = 0
    for i, p in enumerate(db['players']):
        k = (norm(p[0]), p[4]); q = lmap.get(k)
        if not q or best[k] != i:
            continue
        lst = [(cid.get(norm(lclubs[s[0]][0])), s[1], s[2]) for s in q[8]]
        for s in p[8]:
            f = s[3] if len(s) > 3 else 0
            if not f & 2:
                continue
            m = [t for t in lst if t[0] == s[0] and abs(t[1] - s[1]) <= 1]
            if not m:
                continue
            e = max(t[2] for t in m)
            if e == 2023 and s[2] > 2023:
                continue  # a base antiga para em 2023
            if e != s[2] and e >= s[1]:
                s[2] = e; s[3] = f & ~2; n_leg += 1

    # 3. correções manuais
    n_fix = 0
    for p in db['players']:
        fx = FIX.get((p[0], p[4]))
        if not fx:
            continue
        for name, (a, b) in fx.items():
            c = cid[norm(name)]
            s = next((s for s in p[8] if s[0] == c), None)
            if s is None:
                p[8].append([c, a, b]); p[8].sort(key=lambda s: (s[1], s[2]))
            else:
                s[1], s[2] = a, b
                if len(s) > 3:
                    s[3] &= ~3
            n_fix += 1

    # 4. situação atual pelo perfil do Transfermarkt
    n_dead = n_stop = 0
    if PROFILES and os.path.exists(PROFILES):
        prof = {int(r['player_id']): r for r in csv.DictReader(open(PROFILES, newline='', encoding='utf-8'))}
        for p in db['players']:
            q = prof.get(p[16] if len(p) > 16 else 0)
            if not q:
                continue
            p[9] &= ~256
            dead = (q.get('date_of_death') or '').strip() not in ('', '-', 'nan')
            if dead and not p[9] & 32:
                p[9] |= 32; n_dead += 1
            elif not p[9] & 32 and q['current_club_name'] in ('Without Club', '---', 'Career break'):
                p[9] |= 256; n_stop += 1
    else:
        print('sem player_profiles.csv: passo 4 pulado')

    db['v'] = str(db.get('v', '')) + '+fix1021' if '+fix1021' not in str(db.get('v', '')) else db['v']
    json.dump(db, open(os.path.join(DATA, 'db.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump(ext, open(os.path.join(DATA, 'ext.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'clubes repetidos: {n_alias} jogadores · passagens pela base antiga: {n_leg} · manuais: {n_fix} · '
          f'falecidos: {n_dead} · sem clube/parados: {n_stop}')


if __name__ == '__main__':
    main()
