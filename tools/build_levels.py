"""MUNDOFUT10 — critérios por dificuldade (15/10/2026). Grava em docs/data/games.json:

  "levels": {
    "famous": clubes famosos e principais do esporte          -> Fácil
    "ucl":    campeões da Champions / Copa dos Campeões        -> Normal = famous + ucl
    "uel":    campeões da Europa League / Copa da UEFA         -> Difícil = ucl + uel + top
    "top":    clubes na 1ª divisão em 2026/27 (8 ligas dos elencos do Draft + 1ª divisão de outras ligas conhecidas)
    "now":    jogadores (índice na base) em elencos 2026/27 dessas 8 ligas (EA FC 27 + Brasileirão 2026)
  }
  "tops": listas Top 10 da Pirâmide (tools/tops.json)
"""
import collections, json, os, re, unicodedata

ROOT = os.path.join(os.path.dirname(__file__), '..')
DB = os.path.join(ROOT, 'docs', 'data', 'db.json')
GAMES = os.path.join(ROOT, 'docs', 'data', 'games.json')


def norm(s):
    s = unicodedata.normalize('NFD', s or '')
    s = re.sub(r'[̀-ͯ]', '', s).replace('ø', 'o').replace('ß', 'ss').replace('ı', 'i').replace('ł', 'l').replace('đ', 'd').lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', '', s)).strip()


FAMOUS = ['Real Madrid', 'Barcelona', 'Atlético de Madrid', 'Manchester United', 'Manchester City', 'Liverpool', 'Chelsea', 'Arsenal', 'Tottenham',
          'Bayern de Munique', 'Borussia Dortmund', 'Juventus', 'Milan', 'Inter de Milão', 'Roma', 'Napoli', 'Paris Saint-Germain', 'Paris SG',
          'Benfica', 'Porto', 'Ajax', 'Flamengo', 'Palmeiras', 'Corinthians', 'São Paulo', 'Santos', 'Boca Juniors', 'River Plate']
UCL = ['Real Madrid', 'Milan', 'Bayern de Munique', 'Liverpool', 'Barcelona', 'Ajax', 'Inter de Milão', 'Manchester United', 'Juventus', 'Benfica',
       'Chelsea', 'Nottingham Forest', 'Porto', 'Celtic', 'Hamburgo', 'Steaua Bucharest', 'FCSB', 'Olympique de Marseille', 'Borussia Dortmund',
       'Feyenoord', 'Aston Villa', 'PSV', 'Red Star Belgrade', 'Manchester City', 'Paris Saint-Germain', 'Paris SG']
UEL = ['Tottenham', 'Feyenoord', "Borussia M'gladbach", "Bor. M'gladbach", 'Liverpool', 'Juventus', 'PSV', 'Eintracht Frankfurt', 'IFK Göteborg',
       'Ipswich Town', 'Ipswich', 'Anderlecht', 'Real Madrid', 'Bayer Leverkusen', 'Napoli', 'Inter de Milão', 'Ajax', 'Parma', 'Schalke 04',
       'Bayern de Munique', 'Galatasaray', 'Galatasaray A.S.', 'Valencia', 'Porto', 'CSKA Moscou', 'Sevilla', 'Zenit', 'Shakhtar Donetsk',
       'Atlético de Madrid', 'Chelsea', 'Manchester United', 'Villarreal', 'Atalanta', 'Aston Villa']
# 1ª divisão 2026/27 de ligas fora dos elencos do Draft (Portugal, Holanda, Turquia, Escócia, Bélgica, Grécia, Áustria, Suíça, EUA...)
TOP_EXTRA = ['Benfica', 'Porto', 'Sporting', 'Braga', 'Vitória de Guimarães', 'Ajax', 'PSV', 'Feyenoord', 'AZ Alkmaar', 'FC Twente', 'FC Utrecht',
             'Galatasaray', 'Galatasaray A.S.', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor', 'Celtic', 'Rangers', 'Club Brugge', 'Anderlecht', 'Olympiacos',
             'Panathinaikos', 'Panathinaikos (GRE)', 'Dínamo Zagreb', 'Salzburg', 'Shakhtar Donetsk', 'Slavia Praha', 'Sparta Praha', 'Basel', 'Young Boys',
             'Inter Miami', 'LA Galaxy', 'Red Star Belgrade', 'Zenit', 'Spartak Moscou', 'CSKA Moscou']
# nomes dos elencos 2026/27 que estão escritos de outro jeito na base
ALIAS = {'Stuttgart': 'VfB Stuttgart', 'Celta': 'Celta de Vigo', 'Bournemouth': 'AFC Bournemouth', 'Borussia Mönchengladbach': "Borussia M'gladbach",
         'Hamburger SV': 'Hamburgo', 'Al-Fateh': 'Al Fateh', 'Neom': 'NEOM', 'Paris FC': 'Paris', 'Al-Faisaly': 'Al-Faisaly (SAU)',
         'Gimnasia de Mendoza': 'Gimnasia y Esgrima de Mendoza', 'Talleres': 'Talleres Córdoba', 'Augsburg': 'FC Augsburg', 'Le Mans': 'Le Mans Union Club 72',
         'Angers': 'Angers SCO', 'Independiente Rivadavia': 'Independiente Rivadavia (ARG)', 'Platense': 'Platense (ARG)', 'Atlético Tucumán': 'Tucumán',
         'SV Elversberg': '07 Elversberg', 'Al-Kholood': 'Al-Kholood Club', 'Central Córdoba': 'Central Córdoba (SdE)',
         'Estudiantes de Río Cuarto': 'AA Estudiantes (Río Cuarto)', 'Remo': 'do Remo'}
TWINS = {'Angers SCO': ['Angers SCO (FRA)'], 'Paris Saint-Germain': ['Paris SG'], 'Galatasaray': ['Galatasaray A.S.'], "Borussia M'gladbach": ["Bor. M'gladbach"]}


def main():
    db = json.load(open(DB))
    games = json.load(open(GAMES))
    draft = json.load(open(os.path.join(ROOT, 'tools', 'legacy_draft.json')))
    clubs = db['clubs']
    byname = collections.defaultdict(list)
    for i, c in enumerate(clubs):
        byname[c[0]].append(i)

    def ids(names):
        out = []
        for n in names:
            if n not in byname:
                raise SystemExit('clube não encontrado: ' + n)
            out += byname[n]
            for tw in TWINS.get(n, []):
                out += byname.get(tw, [])
        return sorted(set(out))

    # clube recém-promovido que ainda não tem ninguém na base (ex.: Al-Diriyah) fica de fora
    cur = [n for n in (ALIAS.get(c[0], c[0]) for c in draft['clubs']) if n in byname]
    top = ids(cur + TOP_EXTRA)

    # jogadores dos elencos 2026/27 -> índice na base (nome + seleção; nome único como reserva)
    keys = collections.defaultdict(list)
    for i, p in enumerate(db['players']):
        for k in {norm(p[0]), norm(p[2])} | {norm(a) for a in p[1]}:
            if k:
                keys[k].append(i)
    P = db['players']
    active = lambda i: not (P[i][9] & 32) and P[i][8] and max(s[2] for s in P[i][8]) >= 2024
    toks = lambda i: set(' '.join({norm(P[i][0]), norm(P[i][2])} | {norm(a) for a in P[i][1]}).split())
    # jogadores atuais de cada clube da base (última passagem) para o par por sobrenome
    lastclub = collections.defaultdict(list)
    for i, p in enumerate(P):
        if active(i):
            lastclub[max(p[8], key=lambda s: (s[2], s[1]))[0]].append(i)
    dclub = [byname.get(ALIAS.get(c[0], c[0]), []) for c in draft['clubs']]
    now, miss = set(), 0
    for r in draft['players']:
        pick = []
        for nm in (r[0], r[1]):
            cand = [i for i in keys.get(norm(nm), []) if active(i)]
            pick = [i for i in cand if P[i][3] == r[2]] or (cand if len(cand) == 1 else [])
            if pick:
                break
        if not pick:
            want = set(norm(r[0]).split()) | set(norm(r[1]).split())
            want = {w for w in want if len(w) >= 3}
            pick = [i for c in dclub[r[6]] for i in lastclub.get(c, []) if P[i][3] == r[2] and toks(i) & want]
        if pick:
            now.add(max(pick, key=lambda i: P[i][7]))
        else:
            miss += 1
    games['levels'] = {'famous': ids(FAMOUS), 'ucl': ids(UCL), 'uel': ids(UEL), 'top': top, 'now': sorted(now)}
    tops = os.path.join(ROOT, 'tools', 'tops.json')
    if os.path.exists(tops):
        games['tops'] = json.load(open(tops))
    json.dump(games, open(GAMES, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('famous', len(games['levels']['famous']), 'ucl', len(games['levels']['ucl']), 'uel', len(games['levels']['uel']), 'top', len(top),
          'now', len(now), 'sem par', miss, 'tops', len(games.get('tops', [])))


if __name__ == '__main__':
    main()
