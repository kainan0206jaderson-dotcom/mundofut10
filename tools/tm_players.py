"""MUNDOFUT10 — etapa 3: identifica os jogadores e monta as carreiras (passagens por clube) a partir das transferências.

Linhas com ID do Transfermarkt (eordo, d2ski) dão a identidade; as linhas da tim-hy (sem ID) são ligadas a um ID
pelo nome + ano de nascimento (temporada − idade na transferência). O que sobrar vira um jogador próprio.
Saída: work/players.pkl (lista de dicts) e work/clubs_final.json
"""
import collections, json, math, re
import pandas as pd
from tm_load import WORK, DS, norm
from tm_clubs import PLACEHOLDER, YOUTH

POSMAP = {
    'goalkeeper': 'GK', 'gk': 'GK', 'centre-back': 'CB', 'cb': 'CB', 'sweeper': 'CB', 'defence': 'CB', 'defender': 'CB',
    'left-back': 'LB', 'lb': 'LB', 'right-back': 'RB', 'rb': 'RB', 'defensive midfield': 'CDM', 'dm': 'CDM',
    'central midfield': 'CM', 'cm': 'CM', 'midfield': 'CM', 'attacking midfield': 'CAM', 'am': 'CAM',
    'left midfield': 'LM', 'lm': 'LM', 'right midfield': 'RM', 'rm': 'RM', 'left winger': 'LW', 'lw': 'LW',
    'right winger': 'RW', 'rw': 'RW', 'second striker': 'CF', 'ss': 'CF', 'centre-forward': 'ST', 'cf': 'ST', 'attack': 'ST', 'forward': 'ST',
}
TOP_LEAGUE_KEYS = {
    # chave da liga -> rótulo curto (ligas cobertas pelas transferências)
    'Premier League': 'ENG', 'Laliga': 'ESP', 'LaLiga': 'ESP', 'Primera Division': 'ESP', 'Serie A': 'ITA', '1.Bundesliga': 'GER', 'Bundesliga': 'GER', 'Ligue 1': 'FRA',
}


def main():
    df = pd.read_pickle(f'{WORK}/rows.pkl')
    cids = pd.read_pickle(f'{WORK}/club_ids.pkl')
    cinfo = {int(k): v for k, v in json.load(open(f'{WORK}/club_info.json')).items()}
    prof = pd.read_csv(f'{DS}/football-datasets/datalake/transfermarkt/player_profiles/player_profiles.csv', low_memory=False)
    prof['nm'] = prof.player_name.str.replace(r'\s*\(\d+\)$', '', regex=True)
    prof['dob'] = pd.to_datetime(prof.date_of_birth, errors='coerce')
    prof['by'] = prof.dob.dt.year + (prof.dob.dt.dayofyear / 366)
    P = {int(r.player_id): r for r in prof.itertuples()}
    print('perfis', len(P))

    # ano de nascimento estimado (decimal) de cada linha
    t_move = df.season + df.win * 0.55 + 0.55  # julho (verão) ou janeiro do ano seguinte (inverno)
    df['t'] = t_move
    df['best'] = t_move - df.age - 0.5
    df.loc[~df.age.between(14, 48), 'best'] = float('nan')

    # ---------------- identidade
    pid_rows = df[df.pid.notna()]
    pid_born = {}
    for pid, grp in pid_rows.groupby('pid'):
        pid = int(pid)
        if pid in P and not math.isnan(P[pid].by):
            pid_born[pid] = P[pid].by
        else:
            b = grp.best.dropna()
            pid_born[pid] = float(b.median()) if len(b) else None
    # perfis sem nenhuma transferência também entram no índice (para dar ID a linhas da tim-hy)
    for pid, r in P.items():
        if pid not in pid_born and not math.isnan(r.by):
            pid_born[pid] = r.by
    name_idx = collections.defaultdict(list)
    for pid, grp in pid_rows.groupby('pid'):
        for nn in set(grp.nn):
            name_idx[nn].append(int(pid))
    for pid, r in P.items():
        name_idx[norm(r.nm)].append(pid)
    for k in name_idx:
        name_idx[k] = list(dict.fromkeys(name_idx[k]))

    # clubes conhecidos de cada ID (para validar nomes de uma palavra só, como 'Ronaldo')
    cids0 = pd.read_pickle(f'{WORK}/club_ids.pkl')
    pid_clubs = collections.defaultdict(set)
    for pid, a, c in zip(pid_rows.pid, pid_rows.club, pid_rows.cpt):
        pid_clubs[int(pid)].add(cids0.get(a)); pid_clubs[int(pid)].add(cids0.get(c))
    for pid, r in P.items():
        pid_clubs[pid].add(cids0.get(str(r.current_club_name)))
    for k in pid_clubs: pid_clubs[k].discard(None)
    ident = [None] * len(df)
    for i, (pid, nn, b, ca, cb) in enumerate(zip(df.pid, df.nn, df.best, df.club, df.cpt)):
        if pid is not None and not pd.isna(pid):
            ident[i] = int(pid)
            continue
        best, bd = None, 9
        for q in name_idx.get(nn, ()):
            pb = pid_born.get(q)
            if pb is None or b != b:
                continue
            d = abs(pb - b)
            if d < bd:
                best, bd = q, d
        if best is not None and bd <= 1.3:
            if ' ' not in nn:
                known = pid_clubs.get(best, set())
                if known and not ({cids0.get(ca), cids0.get(cb)} & known):
                    continue
                if not known and bd > 0.8:
                    continue
            ident[i] = best
    df['ident'] = ident
    print('linhas com ID', df.ident.notna().sum(), 'de', len(df))
    # sem ID: agrupa por nome + nascimento
    rest = df[df.ident.isna()].sort_values(['nn', 'best'])
    syn = 10_000_000
    assign = {}
    for nn, grp in rest.groupby('nn'):
        cur_start, cur_id = None, None
        for idx, b in zip(grp.index, grp.best):
            if b != b:
                b = cur_start if cur_start is not None else -1
            if cur_id is None or b - cur_start > 2.2:
                syn += 1
                cur_id, cur_start = syn, b
            assign[idx] = cur_id
    df.loc[list(assign), 'ident'] = pd.Series(assign)
    df['ident'] = df.ident.astype(int)
    print('jogadores', df.ident.nunique())

    # ---------------- movimentos
    def cid(s):
        if PLACEHOLDER.match(s):
            return 'R' if s.lower() == 'retired' else None
        return cids.get(s)
    df['c_club'] = df.club.map(cid)
    df['c_cpt'] = df.cpt.map(cid)
    frm = df.c_club.where(df.dir == 'out', df.c_cpt)
    to = df.c_cpt.where(df.dir == 'out', df.c_club)
    df['frm'], df['to'] = frm, to
    youth = {k for k, v in cinfo.items() if v['youth']}

    players = []
    for pid, grp in df.groupby('ident'):
        grp = grp.sort_values(['t', 'eol'])
        # deduplica o mesmo movimento vindo de fontes/páginas diferentes
        seen = set()
        ev = []
        for r in grp.itertuples():
            key = (round(r.t, 1), r.frm, r.to)
            if key in seen or (r.frm is None and r.to is None):
                continue
            # mesmo instante e mesmo destino com origem desconhecida: descarta o pior
            if any(abs(e['t'] - r.t) < 0.2 and e['to'] == r.to and (e['frm'] == r.frm or r.frm is None) for e in ev):
                continue
            seen.add(key)
            ev.append({'t': r.t, 'frm': r.frm, 'to': r.to, 'fee': r.fee, 'loan': bool(r.loan), 'eol': bool(r.eol), 'mv': r.mv})
        names = grp.name.value_counts()
        nats = grp.nat.dropna().value_counts()
        poss = grp.postxt.dropna().astype(str).str.lower().map(POSMAP).dropna().value_counts()
        b = pid_born.get(pid) if pid < 10_000_000 else None
        if b is None:
            bb = grp.best.dropna()
            b = float(bb.median()) if len(bb) else None
        pr = P.get(pid)
        players.append({
            'id': pid, 'name': pr.nm if pr is not None else names.index[0], 'names': list(names.index[:3]),
            'born': b, 'dob': str(pr.date_of_birth) if pr is not None else None,
            'nat': nats.index[0] if len(nats) else (str(pr.citizenship).split('  ')[0] if pr is not None and isinstance(pr.citizenship, str) else None),
            'nat2': (str(pr.citizenship).split('  ')[1] if pr is not None and isinstance(pr.citizenship, str) and '  ' in pr.citizenship else None),
            'pos': poss.index[0] if len(poss) else None, 'poss': list(poss.index[:3]),
            'ev': ev, 'maxfee': max([e['fee'] or 0 for e in ev] + [0]), 'maxmv': max([e['mv'] or 0 for e in ev if e['mv'] == e['mv']] + [0]),
            'leagues': dict(grp.league.value_counts()),
            'prof': pr is not None,
        })
    pd.to_pickle(players, f'{WORK}/players_raw.pkl')
    print('ok', len(players))


if __name__ == '__main__':
    main()
