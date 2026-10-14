"""MUNDOFUT10 — etapa 4: transforma os movimentos de cada jogador em passagens [clube, ano início, ano fim, flags].

flags: 1 = início aproximado, 2 = fim aproximado, 4 = empréstimo
Regras: times B/sub-23/base não contam como o clube principal; "Retired" encerra a carreira;
um movimento que sai de um clube diferente do atual indica uma passagem não registrada (fica aproximada).
"""
import json, math
import pandas as pd
from tm_load import WORK, DS

LAST_YEAR = {'T': 2022, 'E': 2025, 'D': 2021}


def chain(ev):
    """dentro da mesma janela, ordena os movimentos para que cada um saia do clube onde o anterior chegou"""
    out, i = [], 0
    cur = None
    while i < len(ev):
        j = i
        while j < len(ev) and ev[j]['t'] - ev[i]['t'] < 0.3:
            j += 1
        win = ev[i:j]
        while win:
            k = next((k for k, e in enumerate(win) if cur is not None and e['frm'] == cur), None)
            if k is None:
                # um movimento que não sai de nenhum destino desta janela vem primeiro
                tos = {e['to'] for e in win}
                k = next((k for k, e in enumerate(win) if e['frm'] not in tos), 0)
            e = win.pop(k)
            out.append(e)
            cur = e['to']
        i = j
    return out


def careers(players, cinfo, profiles):
    youth = {k for k, v in cinfo.items() if v['youth']}
    real = lambda c: c is not None and c != 'R' and c not in youth
    out = []
    for p in players:
        ev = chain(sorted(p['ev'], key=lambda e: (e['t'], e['eol'])))
        st = []
        cur = None  # [club, start, end, flags]
        retired = None
        born = p['born']
        for e in ev:
            y = int(math.floor(e['t']))  # ano civil do movimento
            if e['frm'] is not None and real(e['frm']):
                if cur is None:
                    cv = cinfo.get(e['frm'], {}).get('cov')
                    if born and cv is not None:
                        s0 = max(int(born + 17), cv - 1) if cv > born + 17 else int(born + 17)
                    else:
                        s0 = max(y - 3, int(born + 17)) if born else y - 2
                    st.append([e['frm'], min(s0, y), y, 1])
                elif cur[0] != e['frm']:
                    cur[2] = y; cur[3] |= 2
                    st.append([e['frm'], y, y, 3])
                else:
                    cur[2] = y
            elif cur is not None:
                cur[2] = y
            cur = None
            if e['to'] == 'R':
                retired = y
                break
            if real(e['to']):
                cur = [e['to'], y, None, 4 if e['loan'] else 0]
                st.append(cur)
        pr = profiles.get(p['id'])
        if cur is not None:
            end = None
            if pr is not None:
                cc = str(pr.current_club_name)
                if cc == 'Retired':
                    try:
                        end = int(str(pr.joined)[:4])
                    except ValueError:
                        end = None
                elif cinfo.get(cur[0]) and cc in cinfo[cur[0]]['names']:
                    end = 2026
            if end is None:
                end = max(cur[1], min(2026, int(born + 38) if born else 2026, max(int(math.floor(e['t'])) for e in ev) + 1))
                cur[3] |= 2
            cur[2] = end
        # perfil: clube atual diferente do último registrado
        if pr is not None and retired is None:
            cc = str(pr.current_club_name)
            try:
                jy = int(str(pr.joined)[:4])
            except ValueError:
                jy = None
            cc_id = p.get('cur_cid')
            if cc_id is not None and real(cc_id) and jy and (not st or st[-1][0] != cc_id):
                if st and st[-1][2] > jy:
                    st[-1][2] = jy
                st.append([cc_id, jy, 2026, 0])
        # limpa: anos coerentes e junta passagens seguidas no mesmo clube
        clean = []
        for s in st:
            if s[2] is None:
                s[2] = s[1]
            if s[2] < s[1]:
                s[2] = s[1]
            if clean and clean[-1][0] == s[0] and s[1] - clean[-1][2] <= 1:
                clean[-1][2] = max(clean[-1][2], s[2])
                clean[-1][3] = (clean[-1][3] & 1) | (s[3] & 2)
                continue
            clean.append(s)
        p['st'] = clean
        p['retired'] = retired
        out.append(p)
    return out


def main():
    players = pd.read_pickle(f'{WORK}/players_raw.pkl')
    cinfo = {int(k): v for k, v in json.load(open(f'{WORK}/club_info.json')).items()}
    cids = pd.read_pickle(f'{WORK}/club_ids.pkl')
    prof = pd.read_csv(f'{DS}/football-datasets/datalake/transfermarkt/player_profiles/player_profiles.csv', low_memory=False)
    profiles = {int(r.player_id): r for r in prof.itertuples()}
    for p in players:
        pr = profiles.get(p['id'])
        if pr is not None:
            p['cur_cid'] = cids.get(str(pr.current_club_name))
    import copy, collections
    res = careers(copy.deepcopy(players), cinfo, profiles)
    # junta jogadores sem ID (só da tim-hy) ao jogador com ID de mesmo nome e nascimento, quando as carreiras se encaixam
    from tm_load import norm
    byname = collections.defaultdict(list)
    for p in res:
        byname[norm(p['name'])].append(p)
    def exact_years(p):
        ys = set()
        for c, a, b, f in p['st']:
            if f & 3:
                continue
            ys.update(range(a + 1, b))  # anos "inteiros" no clube (sem as pontas, que podem ser de transição)
        return ys
    merged = 0
    drop = set()
    for nn, ps in byname.items():
        ids = [p for p in ps if p['id'] < 10_000_000]
        syn = [p for p in ps if p['id'] >= 10_000_000]
        if not ids or not syn:
            continue
        for s in syn:
            if s['born'] is None:
                continue
            cands = [q for q in ids if q['born'] is not None and abs(q['born'] - s['born']) <= 1.0]
            best = None
            for q in cands:
                shared = {x[0] for x in q['st']} & {x[0] for x in s['st']}
                ov = len(exact_years(q) & exact_years(s))
                if shared or ov == 0:
                    best = q if best is None or abs(q['born'] - s['born']) < abs(best['born'] - s['born']) else best
            if best is not None and (len(cands) == 1 or {x[0] for x in best['st']} & {x[0] for x in s['st']}):
                best['ev'] = best['ev'] + s['ev']
                best['leagues'] = {**s['leagues'], **best['leagues']}
                if not best['pos']: best['pos'] = s['pos']
                drop.add(s['id'])
                merged += 1
    print('unidos', merged)
    raw = {p['id']: p for p in players}
    for p in res:
        if p['id'] in drop:
            continue
        raw[p['id']]['ev'] = p['ev']
        raw[p['id']]['leagues'] = p['leagues']
        raw[p['id']]['pos'] = p['pos']
    players = [raw[p['id']] for p in res if p['id'] not in drop]
    res = careers(players, cinfo, profiles)
    pd.to_pickle(res, f'{WORK}/players_car.pkl')
    by = {p['name']: p for p in res}
    def show(n):
        for p in res:
            if p['name'] == n:
                print(n, int(p['born'] or 0), p['nat'], p['pos'], [(cinfo[s[0]]['names'][0], s[1], s[2], s[3]) for s in p['st']])
    for n in ['Lionel Messi', 'Cristiano Ronaldo', 'Ronaldo', 'Zinedine Zidane', 'Patrice Evra', 'Marco Reus', 'Raúl Albiol', 'Ronaldinho', 'Kaká',
              'Neymar', 'Francesco Totti', 'Gabriel Batistuta', 'Romário', 'Zlatan Ibrahimovic', 'Hulk', 'Fred', 'Gabriel Barbosa', 'Ricardo Oliveira', 'Paolo Maldini', 'Rivaldo']:
        show(n)


if __name__ == '__main__':
    main()
