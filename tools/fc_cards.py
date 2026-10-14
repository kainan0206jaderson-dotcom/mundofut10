"""MUNDOFUT10 — acrescenta as cartas do EA FC 25 e do EA FC 26 ao "Descubra o card" (games.json → "cards").

Fontes (bases públicas no GitHub, com os dados oficiais das cartas):
  - EA FC 26: github.com/ismailoksuz/EAFC26-DataHub  (data/players.csv, formato sofifa, atualização de 19/09/2025)
  - EA FC 25: github.com/PabloJRW/FC25-Players-ETL   (extraction/raw_data/fc25players_10_21_2024.csv, API oficial da EA)

Uso: MF_DS2=/pasta/com/os/repos python3 tools/fc_cards.py
Carta: [jogador, edição, nota, posição, clube, valor (€ mi ou null), idade, [6 atributos], camisa (ou null)]
O FC 25 não traz valor nem número da camisa: a dica mostra só a idade.
"""
import json, os, re, sys, unicodedata
import pandas as pd

ROOT = os.path.join(os.path.dirname(__file__), '..')
DB_PATH = os.path.join(ROOT, 'docs', 'data', 'db.json')
GAMES_PATH = os.path.join(ROOT, 'docs', 'data', 'games.json')
DS2 = os.environ.get('MF_DS2', '/tmp/claude-0/ds2')
FC26 = os.path.join(DS2, 'EAFC26-DataHub', 'data', 'players.csv')
FC25 = os.path.join(DS2, 'fc25', 'extraction', 'raw_data', 'fc25players_10_21_2024.csv')

TOP = 50        # cartas mais fortes de cada edição (como nas edições antigas)
YOUNG = 30      # promessas famosas (até 23 anos, nota 74–85) para o nível Lendário
EXTRA_GK = 10   # goleiros entre os melhores (as edições antigas têm ~10 por edição)


def norm(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.replace('ø', 'o').replace('ß', 'ss').replace('ı', 'i').replace('ł', 'l').replace('đ', 'd').replace('æ', 'ae')
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()


db = json.load(open(DB_PATH))
P, CLUBS = db['players'], db['clubs']
games = json.load(open(GAMES_PATH))

# índice de nomes da base: nome, apelidos, nome de guerra → [(índice, ano de nascimento)]
NAMES = {}
for i, p in enumerate(P):
    for n in {p[0], p[2], *(p[1] or [])}:
        if n:
            NAMES.setdefault(norm(n), []).append(i)


def find_player(names, year, nat):
    best = None
    for n in names:
        for i in NAMES.get(norm(n), []):
            p = P[i]
            if p[4] and abs(p[4] - year) > 1:
                continue
            latin = all(ord(ch) < 0x370 for ch in p[0])  # evita as duplicatas com nome em outro alfabeto (ex.: '久保 Kubo')
            score = (p[4] == year) * 2 + (norm(p[3]) == norm(nat)) + latin * 3 + p[7] / 100
            if best is None or score > best[0]:
                best = (score, i)
    return best[1] if best else None


def tokens(s):
    stop = {'fc', 'cf', 'sc', 'ac', 'afc', 'club', 'de', 'the', 'ssc', 'as', 'rc', 'cd', 'sl', 'ud', 'sd', 'calcio', 'football', 'futbol', 'clube', 'de', 'des'}
    return {t for t in norm(s).split() if t not in stop}


# nomes da EA → nome da base, quando as palavras não batem
CLUB_FIX = {
    'fc bayern munchen': 'Bayern de Munique', 'bayern munchen': 'Bayern de Munique', 'inter': 'Inter de Milão', 'internazionale': 'Inter de Milão',
    'spurs': 'Tottenham', 'atletico de madrid': 'Atlético de Madrid', 'atl tico madrid': 'Atlético de Madrid', 'paris sg': 'Paris Saint-Germain',
    'man utd': 'Manchester United', 'manchester utd': 'Manchester United', 'man city': 'Manchester City', 'leverkusen': 'Bayer Leverkusen',
    'olympique de marseille': 'Olympique de Marseille', 'om': 'Olympique de Marseille', 'ol': 'Lyon', 'sporting cp': 'Sporting', 'al nassr': 'Al-Nassr',
    'al hilal': 'Al-Hilal', 'al ittihad': 'Al-Ittihad', 'al ahli': 'Al-Ahli', 'napoli': 'Napoli', 'lazio': 'Lazio', 'roma': 'Roma',
    'lombardia fc': 'Inter de Milão', 'milano fc': 'Milan', 'latium': 'Lazio', 'bergamo calcio': 'Atalanta',  # nomes sem licença no FC 25
    'borussia dortmund': 'Borussia Dortmund', 'rb leipzig': 'RB Leipzig', 'newcastle utd': 'Newcastle', 'aston villa': 'Aston Villa',
}
CLUB_IDX = {}
for i, c in enumerate(CLUBS):
    CLUB_IDX.setdefault(norm(c[0]), i)


def find_club(pi, ea_name, season):
    """Clube da carta: de preferência a passagem do jogador na temporada (início = season), conferida pelo nome da EA."""
    want = tokens(ea_name)
    cands = []
    for s in P[pi][8]:
        ci, a, b = s[0], s[1], s[2]
        if a <= season + 1 and b >= season:
            overlap = len(want & tokens(CLUBS[ci][0]))
            fixed = CLUB_FIX.get(norm(ea_name))
            hit = bool(overlap > 0 or (fixed and CLUBS[ci][0] == fixed))
            cands.append((hit, b >= season + 1, overlap, -(s[3] & 4 if len(s) > 3 else 0), ci))
    cands.sort(reverse=True)
    if cands and cands[0][0]:
        return cands[0][-1]
    fixed = CLUB_FIX.get(norm(ea_name))
    if fixed and norm(fixed) in CLUB_IDX:
        return CLUB_IDX[norm(fixed)]
    if norm(ea_name) in CLUB_IDX:
        return CLUB_IDX[norm(ea_name)]
    return None


POS_MAP = {'LWB': 'LB', 'RWB': 'RB'}


def build(rows, ver, season):
    cards, miss = [], []
    for r in rows:
        pi = find_player(r['names'], r['year'], r['nat'])
        if pi is None:
            miss.append(r['names'][0])
            continue
        ci = find_club(pi, r['club'], season)
        if ci is None:
            miss.append(r['names'][0] + ' @ ' + r['club'])
            continue
        if any(c[0] == pi for c in cards):
            continue
        cards.append([pi, ver, int(r['ovr']), POS_MAP.get(r['pos'], r['pos']), ci, r['val'], int(r['age']), [int(x) for x in r['stats']], r['num']])
    return cards, miss


def pick(rows):
    """Mesmo critério das edições antigas: as cartas mais fortes + goleiros + promessas famosas."""
    rows = sorted(rows, key=lambda r: -r['ovr'])
    top = rows[:TOP]
    gks = [r for r in rows if r['pos'] == 'GK' and r not in top][:max(0, EXTRA_GK - sum(r['pos'] == 'GK' for r in top))]
    young = []
    for r in rows:
        if r in top or r in gks or not (74 <= r['ovr'] <= 85) or r['age'] > 23:
            continue
        pi = find_player(r['names'], r['year'], r['nat'])
        if pi is not None and (P[pi][9] & 3) and len(young) < YOUNG:
            young.append(r)
    return top + gks + young


def age_at(dob, year):
    """idade no lançamento do jogo (fim de setembro do ano)"""
    b = pd.to_datetime(dob)
    return year - b.year - ((b.month, b.day) > (9, 26))


# ---------- EA FC 26 ----------
d = pd.read_csv(FC26, low_memory=False)
rows26 = []
for _, x in d.iterrows():
    gk = str(x['player_positions']).split(',')[0].strip() == 'GK'
    stats = ([x['goalkeeping_diving'], x['goalkeeping_handling'], x['goalkeeping_kicking'], x['goalkeeping_reflexes'], x['goalkeeping_speed'], x['goalkeeping_positioning']]
             if gk else [x['pace'], x['shooting'], x['passing'], x['dribbling'], x['defending'], x['physic']])
    if any(pd.isna(s) for s in stats) or pd.isna(x['club_name']):
        continue
    rows26.append({
        'names': [x['long_name'], x['short_name']], 'year': int(str(x['dob'])[:4]), 'nat': x['nationality_name'],
        'ovr': int(x['overall']), 'pos': str(x['player_positions']).split(',')[0].strip(), 'club': x['club_name'],
        'val': round(float(x['value_eur']) / 1e6, 1) if not pd.isna(x['value_eur']) else None, 'age': age_at(x['dob'], 2025), 'stats': stats,
        'num': int(x['club_jersey_number']) if not pd.isna(x['club_jersey_number']) else None,
    })

# ---------- EA FC 25 ----------
d = pd.read_csv(FC25, low_memory=False)
d = d[d['gender_id'] == 0]
rows25 = []
for _, x in d.iterrows():
    pos = x['position_short_label']
    # na API da EA os 6 atributos da frente da carta já vêm prontos (no goleiro: DIV, MAN, CHU, REF, VEL, POS)
    stats = [x['stat_pac'], x['stat_sho'], x['stat_pas'], x['stat_dri'], x['stat_def'], x['stat_phy']]
    if any(pd.isna(s) for s in stats) or pd.isna(x['team']):
        continue
    b = pd.to_datetime(x['birthdate'])
    age = age_at(b, 2024)
    common = x['common_name'] if isinstance(x['common_name'], str) else None
    full = (str(x['first_name']) + ' ' + str(x['last_name'])).strip()
    rows25.append({
        # nome oriental: sobrenome primeiro (ex.: Son Heung-min)
        'names': [n for n in (common, full, (str(x['last_name']) + ' ' + str(x['first_name'])).strip()) if n],  'year': b.year, 'nat': x['nationality'],
        'ovr': int(x['overall_rating']), 'pos': pos, 'club': x['team'], 'val': None, 'age': age, 'stats': stats, 'num': None,
    })

new25, miss25 = build(pick(rows25), 25, 2024)
new26, miss26 = build(pick(rows26), 26, 2025)
print('FC 25:', len(new25), 'cartas; sem par na base:', miss25)
print('FC 26:', len(new26), 'cartas; sem par na base:', miss26)

old = [c for c in games['cards'] if c[1] < 25]
games['cards'] = old + new25 + new26
if '--dry' not in sys.argv:
    json.dump(games, open(GAMES_PATH, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('games.json gravado:', len(games['cards']), 'cartas no total')
for c in (new25 + new26):
    print(c[1], P[c[0]][0], c[2], c[3], CLUBS[c[4]][0], c[5], c[6], c[7])
