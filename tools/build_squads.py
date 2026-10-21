"""MUNDOFUT10 — Desafio do elenco (jogo 7, 18/10/2026). Grava docs/data/squads.json.

Cada desafio = um clube numa temporada + as nacionalidades do elenco (com os nomes, mostrados no fim):
  {"c": [índices do clube na base], "s": ano de início da temporada, "cal": 1 se a liga é de ano-calendário (Brasil/Argentina),
   "n": [[seleção, [nomes...]], ...] (da maior para a menor fatia)}

- 2026/27: elencos reais da temporada (tools/legacy_draft.json: EA SPORTS FC 27 + Brasileirão 2026).
- Temporadas anteriores (1995/96 a 2025/26): montadas pelas passagens do Transfermarkt (db.json + ext.json).
  Cada jogador conta num clube só por temporada (a passagem mais recente que cobre a temporada, então empréstimo vence o clube dono).
  Só entram elencos de tamanho plausível (20 a 36) e com 3+ seleções, de clubes famosos, campeões europeus e grandes da 1ª divisão.
"""
import collections, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from build_levels import ALIAS, TWINS, FAMOUS, UCL, UEL, TOP_EXTRA  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..')
DATA = os.path.join(ROOT, 'docs', 'data')
CAL = {'Brazil', 'Argentina'}
HIST_FROM, CUR = 1995, 2026


def main():
    db = json.load(open(os.path.join(DATA, 'db.json')))
    ext = json.load(open(os.path.join(DATA, 'ext.json')))
    draft = json.load(open(os.path.join(ROOT, 'tools', 'legacy_draft.json')))
    clubs = db['clubs']
    byname = collections.defaultdict(list)
    for i, c in enumerate(clubs):
        byname[c[0]].append(i)

    def idx(name):
        out = list(byname.get(name, []))
        for tw in TWINS.get(name, []):
            out += byname.get(tw, [])
        return sorted(set(out))

    out = []
    # ---------------- 2026/27: elencos reais
    for ci, c in enumerate(draft['clubs']):
        ids = idx(ALIAS.get(c[0], c[0]))
        if not ids:
            continue
        g = collections.defaultdict(list)
        for p in draft['players']:
            if p[6] == ci and p[2]:
                g[p[2]].append((p[5], p[0]))
        n = sum(len(v) for v in g.values())
        if n < 18:
            continue
        nat = sorted(g.items(), key=lambda kv: (-len(kv[1]), kv[0]))
        out.append({'c': ids, 's': CUR, 'cal': int(clubs[ids[0]][2] in CAL),
                    'n': [[k, [nm for _, nm in sorted(v, reverse=True)]] for k, v in nat]})

    # ---------------- temporadas anteriores: passagens do Transfermarkt
    hist_names = set(FAMOUS + UCL + UEL + TOP_EXTRA)
    hist_ids = {}
    for nm in hist_names:
        ids = idx(nm)
        if ids:
            hist_ids[ids[0]] = ids
    member = {i: ids for ids in hist_ids.values() for i in ids}
    P = [(p[0], p[3], p[7], p[8]) for p in db['players']] + [(p[0], p[2], p[4], p[5]) for p in ext['players']]
    sq = collections.defaultdict(list)  # (clube principal, temporada) -> [(nota, nome, seleção)]
    for name, nat, r, st in P:
        if not nat or not st:
            continue
        for S in range(HIST_FROM, CUR):
            best = None
            for s in st:
                if s[1] <= S and s[2] >= S + 1 and (best is None or (s[1], -s[2]) > (best[1], -best[2])):
                    best = s
            if best and best[0] in member:
                sq[(member[best[0]][0], S)].append((r, name, nat))
    for (c0, S), pl in sq.items():
        # ficha repetida do mesmo jogador (mesmo nome) conta uma vez só (21/10/2026)
        uniq = {}
        for r, nm, nat in pl:
            if nm not in uniq or uniq[nm][0] < r:
                uniq[nm] = (r, nat)
        pl = [(r, nm, nat) for nm, (r, nat) in uniq.items()]
        if not 20 <= len(pl) <= 36:
            continue
        g = collections.defaultdict(list)
        for r, nm, nat in pl:
            g[nat].append((r, nm))
        if len(g) < 3:
            continue
        nat = sorted(g.items(), key=lambda kv: (-len(kv[1]), kv[0]))
        out.append({'c': hist_ids[c0], 's': S, 'cal': int(clubs[c0][2] in CAL),
                    'n': [[k, [nm for _, nm in sorted(v, reverse=True)]] for k, v in nat]})

    out.sort(key=lambda x: (x['s'], x['c'][0]))
    json.dump({'v': 'tm-2026.10+fc27', 'q': out}, open(os.path.join(DATA, 'squads.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    cur = sum(1 for x in out if x['s'] == CUR)
    print('desafios', len(out), '2026/27', cur, 'históricos', len(out) - cur,
          'tamanho', os.path.getsize(os.path.join(DATA, 'squads.json')) // 1024, 'KB')


if __name__ == '__main__':
    main()
