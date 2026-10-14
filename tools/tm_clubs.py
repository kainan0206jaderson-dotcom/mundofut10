"""MUNDOFUT10 — etapa 2: identifica os clubes (o Transfermarkt escreve o mesmo clube de formas diferentes:
'Cruzeiro Esporte Clube' na página do clube e 'Cruzeiro' na lista de transferências de outro).

Aprende as equivalências pelos pares espelhados (a mesma transferência aparece na página dos dois clubes),
pelos IDs de clube do Transfermarkt (d2ski / salimt) e pelo nome normalizado + país.
Saída: work/clubs.pkl  (raw -> id canônico) e work/club_info.json (id -> nome, país, ligas)
"""
import collections, json, os, re
import pandas as pd
from tm_load import WORK, DS, norm

PLACEHOLDER = re.compile(r'^(without club|retired|unknown|career break|ban|own youth|disqualified|pause|vereinslos|karriereende|unbekannt|\?|-|nan|none|)$', re.I)
YOUTH = re.compile(r'(\bU ?-?\d{2}\b|\bSub ?-?\d{2}\b|\bUnder ?\d{2}\b|\bYouth\b|\bYth\b|\bReserves?\b|\bJuvenil\b|\bJuniores\b|\bPrimavera\b|\bCastilla\b|\bAtl[eè]tic\b|\bAcademy\b|\bAcademia\b|\bNext Gen\b|\bAmateure?\b|^Jong\b|\bB$|\bII$|\bIII$|\bC$|\bU\d{2}\b|\bInferiores\b|\bBase\b$|\bOlympic\b|\bSquad\b|\bYouth Team\b|\b2$|\bJgd\b|\bJugend\b|\bReserva\b|\bFilial\b|\bAspirantes\b|^Sevilla Atl[eé]tico$|^Bilbao Athletic$|Atl[eé]tico Madrile[nñ]o|^Betis Deportivo|Valencia CF Mestalla|^Valencia Mestalla|Deportivo Fabril|Real Oviedo Vetusta|C[aá]diz CF Mirandilla|M[aá]laga Atl[eé]tico|Real Madrid C\b|Juventus Next Gen|Milan Futuro|Atalanta U23|Sporting CP B|Bayern Munich II|Borussia Dortmund II|\bI{2,3}$)', re.I)
def is_youth(s):
    return YOUTH.search(strip_extra(s))


GENERIC = set('fc cf sc ac acf as ss us ssd asd usd cd ca cr se ec sl sk fk nk sv afc ssc rcd ud sd club calcio de do da del la le el the of'.split())
# palavras que, sozinhas, não identificam um clube (precisam do país)
AMBIG = set('nacional nacional nacional racing union universidad independiente olimpia guarani sporting atletico deportivo real sport america cerro defensor liverpool everton arsenal juventud bolivar'.split())


def strip_extra(s):
    return re.sub(r'\s*\(\s*-\s*\d{4}\s*\)|\s*\(diss\.\)', '', str(s)).strip()


def core(s):
    toks = [t for t in norm(strip_extra(s)).split() if t not in GENERIC and not re.fullmatch(r'(18|19|20)\d\d', t)]
    return ' '.join(toks)


class UF:
    def __init__(self):
        self.p = {}
    def f(self, x):
        p = self.p
        p.setdefault(x, x)
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x
    def u(self, a, b):
        if bool(is_youth(a)) != bool(is_youth(b)):
            return
        a, b = self.f(a), self.f(b)
        if a != b:
            self.p[b] = a


COUNTRY_OF_LEAGUE = {
    'Premier League': 'England', 'Laliga': 'Spain', 'Serie A': 'Italy', 'Bundesliga': 'Germany', 'Ligue 1': 'France',
    'Eredivisie': 'Netherlands', 'Super Lig': 'Turkey', 'Süper Lig': 'Turkey', 'Saudi Pro League': 'Saudi Arabia', 'Liga Portugal': 'Portugal',
}


def main():
    df = pd.read_pickle(f'{WORK}/rows.pkl')
    df['ccountry'] = df.ccountry.fillna(df.league.map(COUNTRY_OF_LEAGUE))
    # Bundesliga da eordo é alemã; a da tim-hy (bundesliga.csv) é austríaca e já traz país
    country = collections.defaultdict(collections.Counter)
    for c, k in zip(df.club, df.ccountry):
        if isinstance(k, str): country[c][k] += 1
    for c, k in zip(df.cpt, df.cptcountry):
        if isinstance(k, str): country[c][k] += 1
    uf = UF()
    tmid = {}
    # 1) IDs do Transfermarkt (d2ski)
    if 'club_id' in df:
        for a, i in zip(df.club, df.club_id):
            if isinstance(i, str) and i: tmid.setdefault(a, i)
        for a, i in zip(df.cpt, df.cpt_id):
            if isinstance(i, str) and i: tmid.setdefault(a, i)
    by_id = collections.defaultdict(list)
    for a, i in tmid.items(): by_id[i].append(a)
    for i, names in by_id.items():
        for n in names[1:]: uf.u(names[0], n)
    def ctry(x):
        c = country.get(x)
        return c.most_common(1)[0][0] if c else None
    # 2) mesmo nome normalizado (sem marcas de clube extinto "(- 2015)")
    allnames = set(df.club) | set(df.cpt)
    bynorm = collections.defaultdict(list)
    for a in allnames:
        bynorm[norm(re.sub(r'\(\s*-\s*\d{4}\)|\(diss\.\)', '', a))].append(a)
    for k, names in bynorm.items():
        if not k: continue
        for n in names[1:]: uf.u(names[0], n)
    # 3) mesmo núcleo do nome + mesmo país (ou núcleo inconfundível)
    bykey = collections.defaultdict(list)
    for a in allnames:
        if PLACEHOLDER.match(a):
            continue
        k = core(a)
        if not k:
            continue
        c = ctry(a)
        if c and (' ' in k or k not in AMBIG):
            bykey[(k, c)].append(a)
    for (k, c), names in bykey.items():
        for n in names[1:]: uf.u(names[0], n)
    # segunda passada, mais solta, dentro do mesmo país (ex.: 'CA Independiente' = 'Club Atlético Independiente')
    LOOSE = GENERIC | set('clube esporte futebol sociedade esportiva football futbol associacao asociacion regatas foot ball'.split())
    bykey2 = collections.defaultdict(list)
    for a in allnames:
        if PLACEHOLDER.match(a) or is_youth(a): continue
        c = ctry(a)
        k = re.sub(r'^(club|clube) atletico ', 'ca ', norm(strip_extra(a)))
        k = ' '.join(t for t in k.split() if t not in LOOSE and not re.fullmatch(r'(18|19|20)\d\d', t))
        if c and k: bykey2[(k, c)].append(a)
    for names in bykey2.values():
        for n in names[1:]: uf.u(names[0], n)
    # nomes sem país: junta ao único grupo com país que tem o mesmo núcleo
    ck = collections.defaultdict(set)
    for (k, c) in bykey: ck[k].add(c)
    for a in allnames:
        if PLACEHOLDER.match(a) or ctry(a): continue
        k = core(a)
        if k and k not in AMBIG and len(ck.get(k, ())) == 1:
            uf.u(bykey[(k, next(iter(ck[k])))][0], a)
    groups = collections.defaultdict(list)
    for a in allnames:
        if PLACEHOLDER.match(a):
            continue
        groups[uf.f(a)].append(a)
    # informação por grupo
    ids = {}
    info = {}
    freq = collections.Counter(list(df.club) + list(df.cpt))
    leagues = collections.defaultdict(collections.Counter)
    cov = {}
    for c, l, s in zip(df.club, df.league, df.season):
        leagues[c][l] += 1
        cov[c] = min(cov.get(c, 9999), int(s))
    for gi, (root, names) in enumerate(sorted(groups.items(), key=lambda kv: -sum(freq[n] for n in kv[1]))):
        cid = gi
        for n in names: ids[n] = cid
        cc = collections.Counter()
        lg = collections.Counter()
        for n in names:
            cc.update(country.get(n, {}))
            lg.update(leagues.get(n, {}))
        youth = all(is_youth(n) for n in names)
        info[cid] = {
            'names': sorted(names, key=lambda n: -freq[n]), 'country': cc.most_common(1)[0][0] if cc else None,
            'leagues': dict(lg), 'n': sum(freq[n] for n in names), 'youth': bool(youth),
            'tmid': next((tmid[n] for n in names if n in tmid), None),
            'cov': min([cov[n] for n in names if n in cov] or [None]) if any(n in cov for n in names) else None,
        }
    pd.to_pickle(ids, f'{WORK}/club_ids.pkl')
    json.dump(info, open(f'{WORK}/club_info.json', 'w'), ensure_ascii=False)
    print('nomes', len(allnames), 'clubes', len(info), 'juvenis', sum(1 for v in info.values() if v['youth']))
    for cid in list(info)[:60]:
        v = info[cid]
        print(cid, v['country'], v['n'], v['youth'], v['names'][:6])


if __name__ == '__main__':
    main()
