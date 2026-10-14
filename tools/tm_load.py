"""MUNDOFUT10 — etapa 1: junta as bases do Transfermarkt num único formato de "movimentos".

Fontes (todas raspadas do transfermarkt.com e publicadas no GitHub):
  - tim-hy/tmarkt-transfers   : transferências das 25 principais ligas do mundo (1992–2022), sem ID de jogador
  - eordo/transfermarkt-data  : 8 ligas (1992–2025) com ID do Transfermarkt, nacionalidade e valor de mercado
  - d2ski/football-transfers-data : 7 ligas europeias (2009–2021) com IDs de jogador e de clube
  - salimt/football-datasets  : 92 mil perfis (nascimento, cidadania, posição, clube atual) + seleções

Saída: work/moves.pkl (um movimento por linha: jogador vai de um clube para outro numa janela).
"""
import glob, json, os, re, sys, unicodedata
import pandas as pd

DS = os.environ.get('MF_DS', '/tmp/claude-0/ds')
WORK = os.environ.get('MF_WORK', '/tmp/claude-0/work')
os.makedirs(WORK, exist_ok=True)


def norm(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.replace('ø', 'o').replace('ß', 'ss').replace('ı', 'i').replace('ł', 'l').replace('đ', 'd').replace('æ', 'ae')
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()


def parse_fee(x):
    """'€1.50m' -> 1.5 (milhões de euros); '€500k' -> 0.5; outros -> None"""
    if not isinstance(x, str):
        return None
    m = re.match(r'€\s*([\d.,]+)\s*(m|k|bn)?', x.strip())
    if not m:
        return None
    v = float(m.group(1).replace(',', ''))
    u = m.group(2)
    return v * 1000 if u == 'bn' else v if u == 'm' else v / 1000 if u == 'k' else v / 1e6


def load_timhy():
    rows = []
    for f in sorted(glob.glob(f'{DS}/tmarkt-transfers/data/*.csv')):
        df = pd.read_csv(f, low_memory=False)
        df['src'] = 'T:' + os.path.basename(f)[:-4]
        rows.append(df)
    df = pd.concat(rows, ignore_index=True)
    fee = df.fee.astype(str)
    out = pd.DataFrame({
        'src': df.src, 'pid': None, 'name': df.player_name, 'age': df.age,
        'season': df.year.astype(int), 'win': (df.transfer_period == 'Winter').astype(int),
        'club': df.club_name, 'cpt': df.club_involved_name, 'dir': df.transfer_movement,
        'fee': fee.map(parse_fee), 'loan': fee.str.contains('loan transfer', case=False),
        'eol': fee.str.startswith('End of loan'), 'nat': None, 'postxt': df.position,
        'league': df.league_name, 'ccountry': df.country, 'cptcountry': None, 'mv': None,
    })
    return out


def load_eordo():
    rows = []
    for f in sorted(glob.glob(f'{DS}/transfermarkt-data/*/*.csv')):
        df = pd.read_csv(f, low_memory=False)
        rows.append(df)
    df = pd.concat(rows, ignore_index=True)
    out = pd.DataFrame({
        'src': 'E:' + df.league.astype(str), 'pid': df.player_id.astype('Int64'), 'name': df.player_name, 'age': df.age,
        'season': df.season.astype(int), 'win': (df.window == 'winter').astype(int),
        'club': df.club, 'cpt': df.dealing_club, 'dir': df.movement,
        'fee': df.fee / 1e6, 'loan': df.is_loan == 1, 'eol': False, 'nat': df.nationality, 'postxt': df.position,
        'league': df.league, 'ccountry': None, 'cptcountry': df.dealing_country, 'mv': df.market_value / 1e6,
    })
    return out


def load_d2ski():
    rows = []
    LG = {'GB1': 'Premier League', 'ES1': 'Laliga', 'IT1': 'Serie A', 'L1': 'Bundesliga', 'FR1': 'Ligue 1', 'PO1': 'Liga Portugal', 'NL1': 'Eredivisie'}
    for f in sorted(glob.glob(f'{DS}/football-transfers-data/data/*.json')):
        lg, season, w = os.path.basename(f)[:-5].split('_')
        for team in json.load(open(f)):
            tm = team['team']
            for d in ('in', 'left'):
                for r in team.get(d, []) or []:
                    rows.append({
                        'src': 'D:' + lg, 'pid': int(r['player_id']) if r.get('player_id') else None, 'name': r.get('player_name'),
                        'age': pd.to_numeric(r.get('player_age'), errors='coerce'), 'season': int(season), 'win': int(w == 'w'),
                        'club': tm['team_name'], 'cpt': r.get('counter_team_name'), 'dir': 'in' if d == 'in' else 'out',
                        'fee': parse_fee(r.get('transfer_fee')), 'loan': 'loan' in str(r.get('transfer_fee', '')).lower() and 'end' not in str(r.get('transfer_fee', '')).lower(),
                        'eol': 'end of loan' in str(r.get('transfer_fee', '')).lower(), 'nat': (r.get('player_nat') or [None])[0], 'postxt': r.get('player_pos'),
                        'league': LG.get(lg, lg), 'ccountry': tm.get('team_country'), 'cptcountry': r.get('counter_team_country'),
                        'mv': parse_fee(r.get('market_val')), 'club_id': tm.get('team_id'), 'cpt_id': r.get('counter_team_id'),
                    })
    return pd.DataFrame(rows)


if __name__ == '__main__':
    a, b, c = load_timhy(), load_eordo(), load_d2ski()
    print('tim-hy', len(a), 'eordo', len(b), 'd2ski', len(c))
    df = pd.concat([a, b, c], ignore_index=True)
    df['name'] = df.name.astype(str).str.strip()
    df['club'] = df.club.astype(str).str.strip()
    df['cpt'] = df.cpt.astype(str).str.strip()
    df['nn'] = df.name.map(norm)
    df.to_pickle(f'{WORK}/rows.pkl')
    print(df.shape)
    print(df.src.str[0].value_counts())
