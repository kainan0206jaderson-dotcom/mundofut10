"""MUNDOFUT10 — etapa final: monta docs/data/db.json (base principal) e docs/data/ext.json (todos os demais jogadores).

Junta: carreiras do Transfermarkt (etapas 1–4), seleções (tm_nat), valor de mercado (mv.json),
a base curada antiga (lendas anteriores a 1992, apelidos, prêmios) e os elencos 2026/27 (draft.json).

Formato de cada jogador (db.json, lista "players"):
  0 nome, 1 apelidos/nomes completos, 2 nome de guerra, 3 seleção, 4 ano de nascimento, 5 posição, 6 posições ("A/B"),
  7 nota MUNDOFUT (0–99, calculada; não é nota de videogame), 8 passagens [[clube, início, fim, flags]],
  9 marcas (1 lenda, 2 famoso, 4 top-10 Bola de Ouro, 8 venceu a Bola de Ouro, 16 campeão do mundo, 32 aposentado),
  10 altura, 11 pé, 12 (reservado), 13 jogos pela seleção, 14 gols pela seleção, 15 maior valor de mercado (€ mi), 16 ID Transfermarkt
flags da passagem: 1 início aproximado, 2 fim aproximado, 4 empréstimo
"""
import collections, json, math, os, re, sys
import pandas as pd
from tm_load import WORK, DS, norm
from tm_names import ALIAS, short

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'docs', 'data')
OLD = json.load(open(os.path.join(OUT, 'db.json')))  # base curada anterior (fica preservada em tools/legacy_db.json)
LEG_PATH = os.path.join(ROOT, 'tools', 'legacy_db.json')
if 'tm' in OLD.get('v', ''):
    OLD = json.load(open(LEG_PATH))
else:
    json.dump(OLD, open(LEG_PATH, 'w'), ensure_ascii=False)
DRAFT = json.load(open(os.path.join(ROOT, 'tools', 'legacy_draft.json')))  # elencos 2026/27 (EA FC 27 + Wikipedia): só o clube atual
for _f in ('games', 'trophies'):
    _p = os.path.join(ROOT, 'tools', 'legacy_' + _f + '.json')
    if not os.path.exists(_p):
        json.dump(json.load(open(os.path.join(OUT, _f + '.json'))), open(_p, 'w'), ensure_ascii=False)

from countries import canon, INFO
cfix = canon

# ligas cobertas pelas transferências (nome no Transfermarkt + país) -> id de liga da base
LEAGUE_ID = {
    ('Premier League', 'England'): 13, ('Laliga', 'Spain'): 53, ('Primera Division', 'Spain'): 53, ('LaLiga', 'Spain'): 53,
    ('Serie A', 'Italy'): 31, ('Bundesliga', 'Germany'): 19, ('1.Bundesliga', 'Germany'): 19, ('Ligue 1', 'France'): 16,
    ('Eredivisie', 'Netherlands'): 10, ('Süper Lig', 'Turkey'): 68, ('Super Lig', 'Turkey'): 68, ('Saudi Pro League', 'Saudi Arabia'): 350,
    ('Saudi Professional League', 'Saudi Arabia'): 350, ('Liga Portugal', 'Portugal'): 308, ('Liga NOS', 'Portugal'): 308, ('Liga Nos', 'Portugal'): 308,
    ('Major League Soccer', 'United States'): 39, ('Campeonato Brasileiro Serie A', 'Brazil'): 7, ('Chinese Super League', 'China PR'): 2012,
    ('Premier Liga', 'Russia'): 67, ('J1 League', 'Japan'): 349, ('Liga MX Apertura', 'Mexico'): 341, ('Liga MX', 'Mexico'): 341,
    ('Superliga', 'Argentina'): 353, ('Jupiler Pro League', 'Belgium'): 4, ('Pro League', 'Belgium'): 4, ('K League 1', 'Korea Republic'): 83, ('K-League 1', 'Korea Republic'): 83,
    ('Scottish Premiership', 'Scotland'): 50, ('Premiership', 'Scotland'): 50, ('Super League', 'Switzerland'): 189, ('Bundesliga', 'Austria'): 80,
    ('Superligaen', 'Denmark'): 1, ('Liga Dimayor I', 'Colombia'): 336, ('Liga Dimayor Apertura', 'Colombia'): 336, ('Allsvenskan', 'Sweden'): 56,
    ('Eliteserien', 'Norway'): 41, ('Championship', 'England'): 14,
}
# país -> liga da base (para clubes de ligas não cobertas pelas transferências)
COUNTRY_LEAGUE = {
    'England': 13, 'Spain': 53, 'Italy': 31, 'Germany': 19, 'France': 16, 'Netherlands': 10, 'Turkey': 68, 'Saudi Arabia': 350, 'Portugal': 308,
    'United States': 39, 'Brazil': 7, 'China PR': 2012, 'Russia': 67, 'Japan': 349, 'Mexico': 341, 'Argentina': 353, 'Belgium': 4, 'Korea Republic': 83,
    'Scotland': 50, 'Switzerland': 189, 'Austria': 80, 'Denmark': 1, 'Colombia': 336, 'Sweden': 56, 'Norway': 41, 'Greece': 63, 'Poland': 66,
    'Croatia': 317, 'Czech Republic': 319, 'Romania': 330, 'Ukraine': 332, 'Chile': 335, 'Paraguay': 337, 'Uruguay': 338, 'Australia': 351,
    'Bolivia': 2017, 'Ecuador': 2018, 'Peru': 2020, 'United Arab Emirates': 2013, 'Qatar': 9002, 'Canada': 39,
}
PT_COUNTRY = {
    'Serbia': 'Sérvia', 'Hungary': 'Hungria', 'Bulgaria': 'Bulgária', 'Slovakia': 'Eslováquia', 'Slovenia': 'Eslovênia', 'Cyprus': 'Chipre', 'Israel': 'Israel',
    'Kazakhstan': 'Cazaquistão', 'Belarus': 'Belarus', 'Finland': 'Finlândia', 'Iceland': 'Islândia', 'Ireland': 'Irlanda', 'Wales': 'País de Gales',
    'Northern Ireland': 'Irlanda do Norte', 'Venezuela': 'Venezuela', 'Iran': 'Irã', 'Egypt': 'Egito', 'Morocco': 'Marrocos', 'Tunisia': 'Tunísia',
    'Algeria': 'Argélia', 'South Africa': 'África do Sul', 'India': 'Índia', 'Thailand': 'Tailândia', 'Indonesia': 'Indonésia', 'Malaysia': 'Malásia',
    'Kuwait': 'Kuwait', 'Bahrain': 'Bahrein', 'Oman': 'Omã', 'Iraq': 'Iraque', 'Lithuania': 'Lituânia', 'Latvia': 'Letônia', 'Estonia': 'Estônia',
    'Georgia': 'Geórgia', 'Armenia': 'Armênia', 'Azerbaijan': 'Azerbaijão', 'Moldova': 'Moldávia', 'Bosnia and Herzegovina': 'Bósnia', 'North Macedonia': 'Macedônia do Norte',
    'Montenegro': 'Montenegro', 'Albania': 'Albânia', 'Malta': 'Malta', 'Luxembourg': 'Luxemburgo', 'Costa Rica': 'Costa Rica', 'Honduras': 'Honduras',
    'Guatemala': 'Guatemala', 'Panama': 'Panamá', 'El Salvador': 'El Salvador', 'Jamaica': 'Jamaica', 'Hong Kong': 'Hong Kong', 'Vietnam': 'Vietnã',
    'Singapore': 'Singapura', 'Uzbekistan': 'Uzbequistão', 'Nigeria': 'Nigéria', 'Ghana': 'Gana', 'Senegal': 'Senegal', 'Cameroon': 'Camarões', 'Ivory Coast': 'Costa do Marfim',
    'Faroe Islands': 'Ilhas Faroé', 'Andorra': 'Andorra', 'San Marino': 'San Marino', 'Gibraltar': 'Gibraltar', 'New Zealand': 'Nova Zelândia', 'Lebanon': 'Líbano',
    'Jordan': 'Jordânia', 'Syria': 'Síria', 'Libya': 'Líbia', 'Angola': 'Angola', 'Mozambique': 'Moçambique', 'Kenya': 'Quênia', 'Tanzania': 'Tanzânia',
    'Zambia': 'Zâmbia', 'Zimbabwe': 'Zimbábue', 'DR Congo': 'RD Congo', 'Mali': 'Mali', 'Guinea': 'Guiné', 'Burkina Faso': 'Burkina Faso', 'Ethiopia': 'Etiópia',
    'Sudan': 'Sudão', 'Trinidad and Tobago': 'Trinidad e Tobago', 'Haiti': 'Haiti', 'Cuba': 'Cuba', 'Puerto Rico': 'Porto Rico', 'Dominican Republic': 'Rep. Dominicana',
    'Nicaragua': 'Nicarágua', 'Philippines': 'Filipinas', 'Myanmar': 'Mianmar', 'Cambodia': 'Camboja', 'Tajikistan': 'Tadjiquistão', 'Kyrgyzstan': 'Quirguistão',
    'Turkmenistan': 'Turcomenistão', 'Mongolia': 'Mongólia', 'Bangladesh': 'Bangladesh', 'Nepal': 'Nepal', 'Sri Lanka': 'Sri Lanka', 'Pakistan': 'Paquistão',
    'Afghanistan': 'Afeganistão', 'Palestine': 'Palestina', 'Yemen': 'Iêmen', 'Rwanda': 'Ruanda', 'Uganda': 'Uganda', 'Benin': 'Benin', 'Togo': 'Togo',
    'Gabon': 'Gabão', 'Congo': 'Congo', 'Liberia': 'Libéria', 'Sierra Leone': 'Serra Leoa', 'Gambia': 'Gâmbia', 'Cape Verde': 'Cabo Verde',
    'Guinea-Bissau': 'Guiné-Bissau', 'Equatorial Guinea': 'Guiné Equatorial', 'Mauritania': 'Mauritânia', 'Niger': 'Níger', 'Chad': 'Chade', 'Madagascar': 'Madagascar',
    'Botswana': 'Botsuana', 'Namibia': 'Namíbia', 'Malawi': 'Malaui', 'Lesotho': 'Lesoto', 'Eswatini': 'Essuatíni', 'Burundi': 'Burundi', 'Somalia': 'Somália',
    'Kosovo': 'Kosovo', 'Liechtenstein': 'Liechtenstein', 'Monaco': 'Mônaco',
}


def main():
    cinfo = {int(k): v for k, v in json.load(open(f'{WORK}/club_info.json')).items()}
    players = pd.read_pickle(f'{WORK}/players_car.pkl')
    nat = {int(k): v for k, v in json.load(open(f'{WORK}/natteam.json')).items()}
    mv = {int(k): v for k, v in json.load(open(f'{WORK}/mv.json')).items()}
    prof = pd.read_csv(f'{DS}/football-datasets/datalake/transfermarkt/player_profiles/player_profiles.csv', low_memory=False,
                       usecols=['player_id', 'height', 'foot', 'name_in_home_country', 'position', 'current_club_name', 'date_of_death'])
    prof = {int(r.player_id): r for r in prof.itertuples()}
    name2g = {}
    for k, v in cinfo.items():
        for n in v['names']:
            name2g.setdefault(n, k)
    td = pd.read_csv(f'{DS}/football-datasets/datalake/transfermarkt/team_details/team_details.csv')
    for r in td.itertuples():
        nm = re.sub(r'\s*\(\d+\)$', '', str(r.club_name))
        g = name2g.get(nm)
        if g is not None and not cinfo[g].get('tmid'):
            cinfo[g]['tmid'] = str(r.club_id)

    # ---------------------------------------------------------------- clubes
    old_clubs = OLD['clubs']
    old2g = {}
    for i, (n, l) in enumerate(old_clubs):
        t = ALIAS.get(n, n)
        g = name2g.get(t)
        if g is None:
            cands = [k for k, v in cinfo.items() if not v['youth'] and any(norm(short(x)) == norm(n) or norm(x) == norm(n) for x in v['names'])]
            if len(cands) == 1:
                g = cands[0]
        if g is not None:
            old2g[i] = g
    g2old = {g: i for i, g in old2g.items()}

    def league_of(g):
        v = cinfo[g]
        cty = cfix(v['country'])
        best, bn = None, 0
        for ln, n in v['leagues'].items():
            lid = LEAGUE_ID.get((ln, cty))
            if lid is None and ln == 'Bundesliga':
                lid = 19 if cty == 'Germany' else 80 if cty == 'Austria' else None
            if lid is None and ln == 'Serie A':
                lid = 31 if cty == 'Italy' else None
            if lid is not None and n > bn:
                best, bn = lid, n
        if best is None:
            best = COUNTRY_LEAGUE.get(cty)
        return best, cty

    leagues = {int(k): v for k, v in OLD['leagues'].items()}
    extra_league = {}

    def league_for_country(cty):
        if cty in COUNTRY_LEAGUE:
            return COUNTRY_LEAGUE[cty]
        if not cty:
            return 0
        if cty not in extra_league:
            lid = 20000 + len(extra_league)
            extra_league[cty] = lid
            leagues[lid] = 'Liga de ' + INFO[cty][1] if cty in INFO else 'Liga (' + cty + ')'
        return extra_league[cty]

    clubs = []  # [nome, liga, país, tmid]
    g2c = {}

    def club_index(g):
        if g in g2c:
            return g2c[g]
        v = cinfo[g]
        lid, cty = league_of(g)
        if lid is None:
            lid = league_for_country(cty)
        if g in g2old:
            name = old_clubs[g2old[g]][0]
            lid = old_clubs[g2old[g]][1] or lid
        else:
            name = short(v['names'][0])
            # nome sem país igual ao de um clube conhecido (ex.: 'Arsenal'): é o mesmo clube
            if not cty:
                for j, (on, ol) in enumerate(old_clubs):
                    if on == name and j in old2g and old2g[j] != g:
                        g2c[g] = club_index(old2g[j])
                        return g2c[g]
        g2c[g] = len(clubs)
        clubs.append([name, lid, cty, v.get('tmid'), g, g in g2old])
        return g2c[g]

    # ---------------------------------------------------------------- base curada: índice por nome
    OP = OLD['players']
    old_idx = collections.defaultdict(list)
    for i, r in enumerate(OP):
        keys = {norm(r[0]), norm(r[2])} | {norm(a) for a in r[1]}
        for k in keys:
            if k: old_idx[k].append(i)

    # ---------------------------------------------------------------- elencos 2026/27
    dclubs = DRAFT['clubs']
    draft_by = collections.defaultdict(list)
    for j, r in enumerate(DRAFT['players']):
        for k in {norm(r[0]), norm(r[1])}:
            if k: draft_by[k].append(j)

    def draft_g(c):
        n = dclubs[c][0]
        t = ALIAS.get(n, n)
        g = name2g.get(t)
        if g is None:
            for i, (on, l) in enumerate(old_clubs):
                if on == n and i in old2g:
                    return old2g[i]
            cands = [k for k, v in cinfo.items() if not v['youth'] and any(norm(short(x)) == norm(n) for x in v['names'])]
            if len(cands) >= 1:
                return max(cands, key=lambda k: cinfo[k]['n'])
        return g

    # ---------------------------------------------------------------- jogadores do Transfermarkt
    out = []
    used_old = set()
    used_draft = set()
    POSLINE = {'GK': 'GK', 'CB': 'DF', 'LB': 'DF', 'RB': 'DF', 'CDM': 'MF', 'CM': 'MF', 'CAM': 'MF', 'LM': 'MF', 'RM': 'MF', 'LW': 'FW', 'RW': 'FW', 'CF': 'FW', 'ST': 'FW'}
    for p in players:
        pid = p['id']
        born = int(p['born']) if p['born'] else None
        st = [[g, a, b, f] for g, a, b, f in p['st'] if g in cinfo and not cinfo[g]['youth']]
        if not st:
            continue
        if not isinstance(p['name'], str):
            alt = [x for x in p['names'] if isinstance(x, str)]
            if not alt:
                continue
            p['name'] = alt[0]
        rec = {
            'n': p['name'], 'alias': [], 'fn': p['name'], 'nat': cfix(p['nat']), 'nat2': cfix(p.get('nat2')), 'born': born, 'pos': p['pos'] or 'CM',
            'allpos': [x for x in dict.fromkeys([p['pos']] + p['poss']) if x] or ['CM'], 'st': st, 'flags': 0, 'h': 0, 'foot': '',
            'caps': 0, 'ng': 0, 'mv': 0, 'tm': pid if pid < 10_000_000 else 0, 'fee': (p['maxfee'] if p['maxfee'] == p['maxfee'] else 0) or 0, 'leagues': p['leagues'],
            'retired': p.get('retired'), 'old': None,
        }
        pr = prof.get(pid)
        if pr is not None:
            try:
                rec['h'] = int(float(pr.height)) if pr.height and float(pr.height) > 140 else 0
            except (TypeError, ValueError):
                pass
            rec['foot'] = {'right': 'R', 'left': 'L', 'both': 'B'}.get(str(pr.foot), '')
            if isinstance(pr.name_in_home_country, str) and pr.name_in_home_country != rec['n']:
                rec['alias'].append(pr.name_in_home_country)
            if str(pr.current_club_name) == 'Retired' and not rec['retired']:
                rec['retired'] = max(s[2] for s in st)
        if pid in nat:
            ents = nat[pid]
            mine = [e for e in ents if cfix(e[0]) == rec['nat']]
            e = max(mine or ents, key=lambda e: e[1])
            rec['caps'], rec['ng'] = e[1], e[2]
            if not rec['nat'] or not mine:
                rec['nat'] = cfix(e[0]) if e[1] >= 3 or not rec['nat'] else rec['nat']
        if pid in mv:
            rec['mv'] = mv[pid][0]
        mm = p.get('maxmv') or 0
        rec['mv'] = max(rec['mv'], mm if mm == mm else 0)
        out.append(rec)
    print('jogadores TM', len(out))

    # ---------------------------------------------------------------- liga com a base curada
    by_key = collections.defaultdict(list)
    for k, r in enumerate(out):
        for x in {norm(r['n'])} | {norm(a) for a in r['alias']}:
            by_key[x].append(k)
    old_map = {}
    for i, r in enumerate(OP):
        keys = [norm(r[0]), norm(r[2])] + [norm(a) for a in r[1]]
        best, bd = None, 9
        for k in keys:
            for j in by_key.get(k, ()):
                q = out[j]
                if q['born'] is None:
                    continue
                d = abs(q['born'] - r[4])
                if q['nat'] and q['nat'] != r[3]:
                    d += 1.5
                if d < bd:
                    best, bd = j, d
        if best is not None and bd <= 1.6:
            if best in old_map.values():
                continue
            old_map[i] = best
    print('curados ligados ao Transfermarkt', len(old_map), 'de', len(OP))

    def old_stints(r):
        res = []
        for c, a, b in r[8]:
            g = old2g.get(c)
            res.append([('g', g) if g is not None else ('o', c), a, b, 0])
        return res

    for i, r in enumerate(OP):
        ost = old_stints(r)
        if i in old_map:
            q = out[old_map[i]]
            q['old'] = i
            q['fn'] = r[2] or q['fn']
            q['alias'] = list(dict.fromkeys([r[0]] + r[1] + q['alias']))
            q['n'] = r[0]  # nome como o brasileiro conhece (ex.: 'Ronaldo Fenômeno' fica no apelido)
            q['nat'] = r[3] or q['nat']
            q['flags'] |= r[9] & (4 | 8 | 16)
            q['oldr'] = r[7]
            q['oldflags'] = r[9]
            if r[10]: q['h'] = q['h'] or r[10]
            if r[11]: q['foot'] = q['foot'] or r[11]
            # completa a carreira com a curada: datas aproximadas e passagens antes de 1992
            tm_clubs = {s[0] for s in q['st']}
            first_exact = min([s[1] for s in q['st'] if not s[3] & 1] or [9999])
            for s in q['st']:
                for o in ost:
                    if o[0] == ('g', s[0]):
                        if s[3] & 1 and o[1] < s[1] and o[2] >= s[1] - 1:
                            s[1] = o[1]; s[3] &= ~1
                        if s[3] & 2 and abs(o[2] - s[2]) <= 3 and o[1] <= s[2]:
                            s[2] = o[2]; s[3] &= ~2
            add = []
            for o in ost:
                key = o[0]
                if key[0] == 'g' and key[1] in tm_clubs:
                    continue
                if o[2] < first_exact or o[1] < 1992:
                    add.append(o)
            q['st'] = sorted([['g', s[0], s[1], s[2], s[3]] for s in q['st']] + [[k[0], k[1], a, b, f] for k, a, b, f in add], key=lambda s: (s[2], s[3]))
        else:
            out.append({
                'n': r[0], 'alias': r[1], 'fn': r[2], 'nat': r[3], 'nat2': None, 'born': r[4], 'pos': r[5], 'allpos': r[6].split('/'),
                'st': [[k[0], k[1], a, b, f] for k, a, b, f in ost], 'flags': r[9] & (4 | 8 | 16), 'h': r[10], 'foot': r[11],
                'caps': 0, 'ng': 0, 'mv': 0, 'tm': 0, 'fee': 0, 'leagues': {}, 'retired': None, 'old': i, 'oldr': r[7], 'oldflags': r[9],
            })
    for q in out:
        if q['st'] and len(q['st'][0]) == 4:
            q['st'] = [['g', s[0], s[1], s[2], s[3]] for s in q['st']]

    # ---------------------------------------------------------------- elencos 2026/27 (clube atual)
    by_key = collections.defaultdict(list)
    for k, r in enumerate(out):
        for x in {norm(r['n']), norm(r['fn'] or '')} | {norm(a) for a in r['alias']}:
            if x: by_key[x].append(k)
    added = moved = 0
    for j, d in enumerate(DRAFT['players']):
        name, full, dnat, pos, alt, rr, c, est = d
        g = draft_g(c)
        if g is None:
            continue
        cands = []
        for x in {norm(name), norm(full)}:
            for k in by_key.get(x, ()):
                q = out[k]
                if q['nat'] == dnat and (q['born'] is None or q['born'] >= 1980) and not q['retired']:
                    cands.append(k)
        cands = sorted(set(cands), key=lambda k: -(out[k]['st'][-1][3] if out[k]['st'] else 0))
        same = [k for k in cands if out[k]['st'] and out[k]['st'][-1][0] == 'g' and out[k]['st'][-1][1] == g]
        if len(cands) > 1:
            cands = same if same else [k for k in cands if out[k]['st'][-1][3] >= 2024]
            if len(cands) != 1:
                continue
        if cands:
            q = out[cands[0]]
            q['draft_r'] = rr
            last = q['st'][-1]
            if not (last[0] == 'g' and last[1] == g):
                if last[3] >= 2025:
                    last[3] = max(last[2], 2025 if last[3] >= 2026 else last[3])
                q['st'].append(['g', g, 2025 if last[3] <= 2025 else 2026, 2026, 1])
                moved += 1
            else:
                last[3] = 2026
        else:
            out.append({
                'n': name, 'alias': [full] if full else [], 'fn': name, 'nat': dnat, 'nat2': None, 'born': None, 'pos': pos, 'allpos': alt.split('/'),
                'st': [['g', g, 2025, 2026, 1]], 'flags': 0, 'h': 0, 'foot': '', 'caps': 0, 'ng': 0, 'mv': 0, 'tm': 0, 'fee': 0, 'leagues': {},
                'retired': None, 'old': None, 'draft_r': rr,
            })
            added += 1
    print('elencos 26/27: novos', added, 'mudaram de clube', moved)

    # ---------------------------------------------------------------- nacionalidade que falta: país dos clubes (carreira toda num país só)
    guessed = 0
    for q in out:
        if q['nat']:
            continue
        yrs = collections.Counter()
        for s_ in q['st']:
            if s_[0] == 'g':
                yrs[cfix(cinfo[s_[1]]['country'])] += s_[3] - s_[2] + 1
        yrs.pop(None, None)
        if yrs:
            c, n = yrs.most_common(1)[0]
            if n / sum(yrs.values()) >= 0.85:
                q['nat'] = c
                q['flags'] |= 64
                guessed += 1
    print('nacionalidade pelo país dos clubes', guessed)

    # ---------------------------------------------------------------- limpa passagens: datas coerentes, sem sobreposição no mesmo clube
    for q in out:
        st = []
        for s_ in sorted(q['st'], key=lambda s_: (s_[2], s_[3])):
            if s_[3] < s_[2]:
                s_[3] = s_[2]
            prev = next((p for p in reversed(st) if p[0] == s_[0] and p[1] == s_[1] and s_[2] <= p[3] + (0 if (s_[4] | p[4]) & 4 else 1)), None)
            if prev is not None and (prev is st[-1] or s_[2] <= prev[3]):
                prev[3] = max(prev[3], s_[3])
                prev[4] = (prev[4] & 1) | (s_[4] & 2) if s_[3] >= prev[3] else prev[4]
                continue
            st.append(list(s_))
        q['st'] = st

    # ---------------------------------------------------------------- nota MUNDOFUT e marcas
    BIG = {13, 53, 31, 19, 16}
    BIGCLUB = set()
    for n in ['Real Madrid', 'Barcelona', 'Atlético de Madrid', 'Manchester United', 'Manchester City', 'Liverpool', 'Chelsea', 'Arsenal', 'Tottenham', 'Bayern de Munique',
              'Borussia Dortmund', 'Juventus', 'Milan', 'Inter de Milão', 'Roma', 'Napoli', 'Lazio', 'Paris Saint-Germain', 'Olympique de Marseille', 'Lyon', 'Ajax', 'PSV',
              'Benfica', 'Porto', 'Sporting', 'Flamengo', 'Palmeiras', 'Corinthians', 'São Paulo', 'Santos', 'Boca Juniors', 'River Plate', 'Valencia', 'Sevilla']:
        for i, (on, l) in enumerate(old_clubs):
            if on == n and i in old2g:
                BIGCLUB.add(old2g[i])
    for q in out:
        yrs_big = 0
        yrs_bigclub = 0
        for s in q['st']:
            if s[0] == 'g':
                lid, _ = league_of(s[1])
                ln = s[3] - s[2] + (0 if s[4] & 3 else 1)
                if lid in BIG: yrs_big += max(0, ln)
                if s[1] in BIGCLUB: yrs_bigclub += max(0, ln)
        sig = [55.0]
        if q['mv']: sig.append(62 + 12.5 * math.log10(1 + q['mv']))
        if q['fee']: sig.append(61 + 11.5 * math.log10(1 + q['fee']))
        if q['caps']: sig.append(58 + 9 * math.log10(1 + q['caps']) + 3.5 * math.log10(1 + q['ng']))
        sig.append(54 + 1.1 * min(yrs_big, 14) + 0.9 * min(yrs_bigclub, 10))
        if q.get('oldr'): sig.append(q['oldr'])
        if q.get('draft_r'): sig.append(q['draft_r'] - 1)
        r = max(sig)
        if q['flags'] & 4: r += 2
        if q['flags'] & 8: r += 3
        q['r'] = int(round(min(99, r)))
        q['ybig'] = yrs_big
        q['ybc'] = yrs_bigclub
        last = max(s[3] for s in q['st']) if q['st'] else 0
        if q['retired'] or last <= 2022 and (q['born'] or 2000) <= 1988 or (q['born'] or 2000) <= 1982:
            q['flags'] |= 32
        if q['r'] >= 84 or q['caps'] >= 60 or q['flags'] & 4 or (q.get('oldflags') or 0) & 2:
            q['flags'] |= 2
        of = q.get('oldflags') or 0
        if of & 1 and (q['flags'] & 32 or (q['born'] or 2000) < 1990):
            q['flags'] |= 128  # lenda da curadoria (as maiores)
        if q['flags'] & 32 and (of & 1 or q['flags'] & 4 or (q.get('oldr') or 0) >= 86 or q['mv'] >= 50
                                or (q['caps'] >= 70 and q['ybc'] >= 4) or (q['caps'] >= 40 and q['ybc'] >= 8)):
            q['flags'] |= 1

    # ---------------------------------------------------------------- separa: base principal x estendida
    def core_ok(q):
        return q['old'] is not None or (q.get('draft_r') or 0) >= 74 or q['r'] >= 76 or q['caps'] >= 25 or q['ybig'] >= 9 or q['ybc'] >= 5
    core = [q for q in out if core_ok(q)]
    ext = [q for q in out if not core_ok(q)]
    print('principal', len(core), 'estendida', len(ext))

    # clubes: os da base principal primeiro (os índices antigos não importam mais)
    def stints(q):
        res = []
        for kind, x, a, b, f in q['st']:
            if kind == 'g':
                ci = club_index(x)
            else:
                on, ol = old_clubs[x]
                key = ('old', x)
                if key not in g2c:
                    g2c[key] = len(clubs)
                    clubs.append([on, ol, None, None, None, True])
                ci = g2c[key]
            res.append([ci, int(a), int(b), int(f)] if f else [ci, int(a), int(b)])
        return res

    def row(q):
        return [q['n'], q['alias'][:3], q['fn'] or q['n'], q['nat'] or '', q['born'] or 0, q['pos'], '/'.join(q['allpos'][:3]), q['r'], stints(q),
                q['flags'], q['h'] or 0, q['foot'] or '', 0, q['caps'], q['ng'], round(q['mv'], 1), q['tm'], round(q['fee'] or 0, 1)]

    core.sort(key=lambda q: -q['r'])
    core_rows = [row(q) for q in core]
    old2new = {q['old']: k for k, q in enumerate(core) if q['old'] is not None}
    def club_new(oc):
        g = old2g.get(oc)
        if g is not None:
            return club_index(g)
        key = ('old', oc)
        if key not in g2c:
            on, ol = old_clubs[oc]
            g2c[key] = len(clubs)
            clubs.append([on, ol, None, None, None, True])
        return g2c[key]
    games = json.load(open(os.path.join(ROOT, 'tools', 'legacy_games.json')))
    games['statdle'] = [[old2new[r[0]]] + r[1:] for r in games['statdle'] if r[0] in old2new]
    games['cards'] = [[old2new[r[0]], r[1], r[2], r[3], club_new(r[4])] + r[5:] for r in games['cards'] if r[0] in old2new]
    games['brasil'] = [r[:2] + [club_new(r[2])] + r[3:] for r in games['brasil']]
    games['coaches'] = [r[:1] + [club_new(r[1])] + r[2:] for r in games['coaches']]
    json.dump(games, open(os.path.join(OUT, 'games.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    tro = json.load(open(os.path.join(ROOT, 'tools', 'legacy_trophies.json')))
    for k in ('lib', 'euro'):
        tro[k] = {str(old2new[int(i)]): v for i, v in tro.get(k, {}).items() if int(i) in old2new}
    json.dump(tro, open(os.path.join(OUT, 'trophies.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('games/trophies remapeados', len(games['statdle']), len(games['cards']))
    ext_rows = [[q['n'], q['born'] or 0, q['nat'] or '', q['pos'], q['r'], [s for s in stints(q)]] for q in ext]
    # nomes repetidos (ex.: dois 'Nacional'): acrescenta estado ou país
    cnt = collections.Counter(c[0] for c in clubs)
    for c in clubs:
        if cnt[c[0]] > 1 and not c[5] and c[4] is not None:
            full = cinfo[c[4]]['names'][0]
            nm = short(full, keep_state=True)
            if nm == c[0]:
                nm = c[0] + ' (' + (c[2] or '?')[:3].upper() + ')'
            c[0] = nm
    for lid in {c[1] for c in clubs}:
        if lid not in leagues and lid:
            leagues[lid] = 'Outra'
    db = {'v': 'tm-2026.10', 'source': 'Transfermarkt (perfis, transferências e seleções) + base curada MUNDOFUT10', 'leagues': {str(k): v for k, v in leagues.items()},
          'clubs': [[c[0], c[1], c[2] or '', c[3] or ''] for c in clubs], 'players': core_rows}
    json.dump(db, open(os.path.join(OUT, 'db.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'v': db['v'], 'players': ext_rows}, open(os.path.join(OUT, 'ext.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('clubes', len(clubs))
    for f in ('db.json', 'ext.json'):
        print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB')


if __name__ == '__main__':
    main()
