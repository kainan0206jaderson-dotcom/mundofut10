"""MUNDOFUT10 — etapa 5: seleção principal de cada jogador (jogos e gols), pelos dados do Transfermarkt (salimt).
Cada país tem várias equipes (principal, sub-21, sub-20...): a principal é a de maior número de jogos por atleta."""
import collections, json
import pandas as pd
from tm_load import DS, WORK

def main():
    n = pd.read_csv(f'{DS}/football-datasets/datalake/transfermarkt/player_national_performances/player_national_performances.csv')
    p = pd.read_csv(f'{DS}/football-datasets/datalake/transfermarkt/player_profiles/player_profiles.csv', low_memory=False, usecols=['player_id', 'citizenship', 'date_of_birth'])
    p['c1'] = p.citizenship.astype(str).str.split('  ').str[0]
    m = n.merge(p, on='player_id', how='left')
    team_cty = {}
    stats = []
    for tid, g in m.groupby('team_id'):
        cty = g.c1.value_counts()
        if not len(cty): continue
        c = cty.index[0]
        share = cty.iloc[0] / len(g)
        stats.append((c, tid, g.matches.max(), g.matches.quantile(0.9), len(g), share))
    df = pd.DataFrame(stats, columns=['cty', 'tid', 'mx', 'q90', 'n', 'share'])
    df = df[df.share > 0.5]
    senior = {}
    for c, g in df.groupby('cty'):
        g = g.sort_values(['mx', 'q90'], ascending=False)
        senior[int(g.iloc[0].tid)] = c
    print(len(senior))
    out = {}
    for r in n.itertuples():
        if r.team_id in senior:
            out[int(r.player_id)] = [senior[r.team_id], int(r.matches), int(r.goals), r.career_state]
    json.dump(out, open(f'{WORK}/natteam.json', 'w'))
    top = sorted(out.items(), key=lambda kv: -kv[1][1])[:15]
    print(top)
    print({k: v for k, v in senior.items() if v in ('Brazil', 'Argentina', 'Italy', 'France', 'Germany', 'Spain', 'England', 'Portugal')})

main()
