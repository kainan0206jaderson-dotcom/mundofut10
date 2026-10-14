"""MUNDOFUT10 — dados de Copa do Mundo para Pirâmide e Impostor (sem nada de videogame).

Fontes: jfjelstul/worldcup (gols, jogos e elencos de todas as Copas até 2022) e openfootball/worldcup.json (Copa 2026).
Grava em docs/data/games.json:
  wcg   = {ano: [[índice do jogador ou -1, nome, seleção, gols], ...]}   (artilharia de cada Copa, 1990–2026)
  wcapp = {índice do jogador: [[ano, jogos, gols], ...]}               (participações em Copas, 1990–2026)
"""
import collections, json, os, re
import pandas as pd
from tm_load import norm
from countries import canon

ROOT = os.path.join(os.path.dirname(__file__), '..')
DS = os.environ.get('MF_DS', '/tmp/claude-0/ds')
OUT = os.path.join(ROOT, 'docs', 'data')
db = json.load(open(os.path.join(OUT, 'db.json')))
games = json.load(open(os.path.join(OUT, 'games.json')))
P = db['players']
TEAM = {'West Germany': 'Germany', 'Soviet Union': 'Russia', 'South Korea': 'Korea Republic', 'China': 'China PR', 'Republic of Ireland': 'Republic of Ireland',
        'Ivory Coast': "Côte d'Ivoire", 'Serbia and Montenegro': 'Serbia', 'FR Yugoslavia': 'Serbia', 'Yugoslavia': 'Serbia', 'Czechoslovakia': 'Czech Republic',
        'United States': 'United States', 'Iran': 'Iran', 'DR Congo': 'Congo DR', 'Zaire': 'Congo DR', 'Dutch East Indies': 'Indonesia', 'East Germany': 'Germany',
        'Türkiye': 'Turkey', 'Cape Verde': 'Cape Verde', 'Curaçao': 'Curaçao', 'Czechia': 'Czech Republic', 'Bosnia-Herzegovina': 'Bosnia and Herzegovina'}
team = lambda t: TEAM.get(t, canon(t) or t)

idx = collections.defaultdict(list)
for i, r in enumerate(P):
    for k in {norm(r[0]), norm(r[2])} | {norm(a) for a in r[1]}:
        if k: idx[k].append(i)
# sobrenome + seleção (para "Romário" x "Romário de Souza Faria" etc.)
last = collections.defaultdict(list)
for i, r in enumerate(P):
    toks = norm(r[0]).split()
    if toks: last[(toks[-1], r[3])].append(i)


def find(name, nat, year, given=None, family=None):
    cands = []
    for k in [norm(name), norm(family or '') if not given else None]:
        if k:
            cands += [i for i in idx.get(k, []) if P[i][3] == nat]
    if not cands and family:
        cands = [i for i in last.get((norm(family).split()[-1] if norm(family) else '', nat), [])]
    # quem estava em atividade naquele ano
    cands = [i for i in dict.fromkeys(cands) if P[i][4] and 16 <= year - P[i][4] <= 42]
    if len(cands) > 1:
        cands.sort(key=lambda i: -P[i][7])
    return cands[0] if cands else -1


jf = f'{DS}/jf-worldcup/data-csv'
goals = pd.read_csv(f'{jf}/goals.csv')
goals = goals[(goals.own_goal == 0) & goals.tournament_name.str.contains("Men's")]
goals['year'] = goals.tournament_name.str[:4].astype(int)
goals = goals[goals.year >= 1990]
apps = pd.read_csv(f'{jf}/player_appearances.csv')
apps = apps[apps.tournament_name.str.contains("Men's")]
apps['year'] = apps.tournament_name.str[:4].astype(int)
apps = apps[apps.year >= 1990]


def fullname(g, f):
    g = '' if not isinstance(g, str) or g == 'not applicable' else g
    return (g + ' ' + (f if isinstance(f, str) else '')).strip()


pid_map = {}
wcg = collections.defaultdict(collections.Counter)
meta = {}
for r in goals.itertuples():
    nm = fullname(r.given_name, r.family_name)
    nat = team(r.player_team_name)
    key = (r.year, r.player_id)
    if key not in pid_map:
        pid_map[key] = find(nm, nat, r.year, r.given_name if isinstance(r.given_name, str) and r.given_name != 'not applicable' else None, r.family_name)
    wcg[r.year][r.player_id] += 1
    meta[(r.year, r.player_id)] = (nm, nat)
wcapp = collections.defaultdict(dict)
for (y, pid), g in apps.groupby(['year', 'player_id']):
    r = g.iloc[0]
    nm = fullname(r.given_name, r.family_name)
    nat = team(r.team_name)
    i = pid_map.get((y, pid))
    if i is None:
        i = find(nm, nat, y, r.given_name if isinstance(r.given_name, str) and r.given_name != 'not applicable' else None, r.family_name)
        pid_map[(y, pid)] = i
    if i >= 0:
        wcapp[i][y] = [y, len(g), int(wcg[y].get(pid, 0))]

out_g = {}
for y, c in wcg.items():
    out_g[str(y)] = sorted([[pid_map[(y, pid)], meta[(y, pid)][0], meta[(y, pid)][1], n] for pid, n in c.items()], key=lambda x: -x[3])

# Copa 2026 (openfootball): gols por nome
w26 = json.load(open(f'{DS}/worldcup.json/2026/worldcup.json'))
c26 = collections.Counter()
team26 = {}
for m in w26['matches']:
    for side, t in (('goals1', m['team1']), ('goals2', m['team2'])):
        for g in m.get(side, []) or []:
            if g.get('owngoal'):
                continue
            c26[g['name']] += 1
            team26[g['name']] = team(t)
rows = []
for nm, n in c26.items():
    i = find(nm, team26[nm], 2026)
    rows.append([i, nm if i < 0 else P[i][0], team26[nm], n])
    if i >= 0:
        wcapp[i][2026] = [2026, wcapp[i].get(2026, [2026, 0, 0])[1], n]
out_g['2026'] = sorted(rows, key=lambda x: -x[3])

games['wcg'] = out_g
games['wcapp'] = {str(i): sorted(v.values()) for i, v in wcapp.items()}
json.dump(games, open(os.path.join(OUT, 'games.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
miss = sum(1 for y in out_g for r in out_g[y] if r[0] < 0)
tot = sum(len(out_g[y]) for y in out_g)
print('artilheiros ligados', tot - miss, 'de', tot, '| jogadores com Copa', len(wcapp))
for y in ('1994', '2002', '2014', '2026'):
    print(y, [(r[1], r[3], r[0] >= 0) for r in out_g[y][:12]])
print('sem ligação (mais gols):', sorted([(r[3], r[1], y) for y in out_g for r in out_g[y] if r[0] < 0], reverse=True)[:25])
