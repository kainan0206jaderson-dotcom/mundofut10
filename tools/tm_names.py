"""MUNDOFUT10 — nomes de exibição dos clubes (curtos, como o brasileiro fala) e ligação com os clubes da base antiga."""
import re
from tm_load import norm

# nomes da base antiga (português) -> nome no Transfermarkt
ALIAS = {
    'Bayern de Munique': 'Bayern Munich', 'Inter de Milão': 'Inter Milan', 'Hamburgo': 'Hamburger SV', 'Colônia': '1.FC Köln',
    "Borussia M'gladbach": 'Borussia Mönchengladbach', 'Spartak Moscou': 'Spartak Moscow', 'CSKA Moscou': 'CSKA Moscow',
    'Lokomotiv Moscou': 'Lokomotiv Moscow', 'Dinamo Moscow': 'Dinamo Moscow', 'Dínamo de Kiev': 'Dynamo Kyiv', 'Dínamo Zagreb': 'GNK Dinamo Zagreb',
    'Sparta Praha': 'AC Sparta Prague', 'Slavia Praha': 'SK Slavia Prague', 'Olympique de Marseille': 'Olympique Marseille', 'Lyon': 'Olympique Lyon',
    'Saint-Étienne': 'AS Saint-Étienne', 'Monaco': 'AS Monaco', 'Lille': 'LOSC Lille', 'Bordeaux': 'FC Girondins Bordeaux', 'Nantes': 'FC Nantes',
    'Rennes': 'Stade Rennais FC', 'Toulouse': 'FC Toulouse', 'Auxerre': 'AJ Auxerre', 'Lens': 'RC Lens', 'Stade de Reims': 'Stade Reims', 'Lorient': 'FC Lorient',
    'Bastia': 'SC Bastia', 'Nice': 'OGC Nice', 'Montpellier': 'Montpellier HSC', 'Strasbourg': 'RC Strasbourg Alsace', 'Sochaux': 'FC Sochaux-Montbéliard',
    'Dijon': 'Dijon FCO', 'Angers SCO': 'SCO Angers', 'Évian Thonon Gaillard FC': 'Evian Thonon Gaillard FC', 'Paris Saint-Germain': 'Paris Saint-Germain',
    'Wolfsburg': 'VfL Wolfsburg', 'Hoffenheim': 'TSG 1899 Hoffenheim', 'VfB Stuttgart': 'VfB Stuttgart', 'Bayer Leverkusen': 'Bayer 04 Leverkusen',
    'Eintracht Frankfurt': 'Eintracht Frankfurt', 'Schalke 04': 'FC Schalke 04', 'Werder Bremen': 'SV Werder Bremen', 'Freiburg': 'SC Freiburg',
    'Union Berlin': '1.FC Union Berlin', 'Kaiserslautern': '1.FC Kaiserslautern', 'Mainz 05': '1.FSV Mainz 05', 'Hertha BSC': 'Hertha BSC',
    'Fortuna Düsseldorf': 'Fortuna Düsseldorf', 'FC Augsburg': 'FC Augsburg', 'Nürnberg': '1.FC Nuremberg', 'Karlsruher SC': 'Karlsruher SC',
    'Chelsea': 'Chelsea FC', 'Tottenham': 'Tottenham Hotspur', 'Liverpool': 'Liverpool FC', 'Southampton': 'Southampton FC', 'Arsenal': 'Arsenal FC',
    'Newcastle': 'Newcastle United', 'Wolverhampton': 'Wolverhampton Wanderers', 'West Ham': 'West Ham United', 'Everton': 'Everton FC', 'Burnley': 'Burnley FC',
    'AFC Bournemouth': 'AFC Bournemouth', 'Fulham': 'Fulham FC', 'Sunderland': 'Sunderland AFC', 'Brighton': 'Brighton & Hove Albion', 'Brentford': 'Brentford FC',
    'Watford': 'Watford FC', 'Middlesbrough': 'Middlesbrough FC', 'Barcelona': 'FC Barcelona', 'Villarreal': 'Villarreal CF', 'Deportivo La Coruña': 'Deportivo de La Coruña',
    'Valencia': 'Valencia CF', 'Deportivo Alavés': 'Deportivo Alavés', 'Sevilla': 'Sevilla FC', 'Athletic Bilbao': 'Athletic Bilbao', 'Celta de Vigo': 'Celta de Vigo',
    'Getafe': 'Getafe CF', 'Levante': 'Levante UD', 'Osasuna': 'CA Osasuna', 'Málaga': 'Málaga CF', 'Real Betis': 'Real Betis Balompié', 'Espanyol': 'RCD Espanyol Barcelona',
    'Cádiz': 'Cádiz CF', 'Granada': 'Granada CF', 'SD Eibar': 'SD Eibar', 'Inter Miami': 'Inter Miami CF', 'Toronto': 'Toronto FC', 'Los Angeles FC': 'Los Angeles FC',
    'New England': 'New England Revolution', 'LA Galaxy': 'Los Angeles Galaxy', 'Dallas': 'FC Dallas', 'Saint Louis City': 'St. Louis City SC', 'Chicago Fire': 'Chicago Fire FC',
    'Cincinnati': 'FC Cincinnati', 'DC United': 'D.C. United', 'CF Montréal': 'CF Montréal', 'Orlando City': 'Orlando City SC', 'Al-Ittihad': 'Al-Ittihad Club',
    'Al-Hilal': 'Al-Hilal SFC', 'Al-Nassr': 'Al-Nassr FC', 'Al-Ahli': 'Al-Ahli SFC', 'Al-Shabab': 'Al-Shabab FC', 'Al-Ettifaq': 'Al-Ettifaq FC', 'Al Fateh': 'Al-Fateh SC',
    'Internacional': 'Sport Club Internacional', 'Palmeiras': 'Sociedade Esportiva Palmeiras', 'Athletico Paranaense': 'Club Athletico Paranaense', 'Botafogo': 'Botafogo de Futebol e Regatas',
    'Grêmio': 'Grêmio Foot-Ball Porto Alegrense', 'Santos': 'Santos FC', 'São Paulo': 'São Paulo Futebol Clube', 'Red Bull Bragantino': 'Red Bull Bragantino',
    'Atlético Mineiro': 'Clube Atlético Mineiro', 'Corinthians': 'Sport Club Corinthians Paulista', 'Coritiba': 'Coritiba Foot Ball Club', 'Fluminense': 'Fluminense Football Club',
    'Cruzeiro': 'Cruzeiro Esporte Clube', 'Avaí': 'Avaí Futebol Clube (SC)', 'Vitória': 'Esporte Clube Vitória', 'Goiás': 'Goiás Esporte Clube', 'Flamengo': 'CR Flamengo',
    'Chapecoense': 'Associação Chapecoense de Futebol', 'Figueirense': 'Figueirense Futebol Clube', 'Fortaleza': 'Fortaleza Esporte Clube', 'Sport': 'Sport Club do Recife',
    'América Mineiro': 'América Futebol Clube (MG)', 'CSA': 'Centro Sportivo Alagoano (AL)', 'Santa Cruz': 'Santa Cruz Futebol Clube (PE)', 'Ponte Preta': 'Associação Atlética Ponte Preta',
    'Joinville': 'Joinville Esporte Clube (SC)', 'Criciúma': 'Criciúma Esporte Clube', 'Vasco da Gama': 'Clube de Regatas Vasco da Gama', 'Atlético Goianiense': 'Atlético Clube Goianiense',
    'Paraná': 'Paraná Clube', 'Ceará': 'Ceará Sporting Club', 'Cuiabá': 'Cuiabá Esporte Clube (MT)', 'Juventude': 'Esporte Clube Juventude', 'Bahia': 'Esporte Clube Bahia',
    'Guarani': 'Guarani Futebol Clube (SP)', 'Roma': 'AS Roma', 'Napoli': 'SSC Napoli', 'Udinese': 'Udinese Calcio', 'Sampdoria': 'UC Sampdoria', 'Milan': 'AC Milan',
    'Juventus': 'Juventus FC', 'Brescia': 'Brescia Calcio', 'Cagliari': 'Cagliari Calcio', 'Palermo': 'US Palermo', 'Lazio': 'SS Lazio', 'Atalanta': 'Atalanta BC', 'Parma': 'Parma FC',
    'Sassuolo': 'US Sassuolo', 'Empoli': 'FC Empoli', 'Torino': 'Torino FC', 'Fiorentina': 'ACF Fiorentina', 'SPAL': 'SPAL', 'Genoa': 'Genoa CFC', 'Hellas Verona': 'Hellas Verona',
    'Monza': 'AC Monza', 'Bologna': 'Bologna FC 1909', 'Chievo': 'Chievo Verona', 'Lecce': 'US Lecce', 'Reggiana': 'AC Reggiana 1919', 'Benfica': 'SL Benfica', 'Porto': 'FC Porto',
    'Rio Ave': 'Rio Ave FC', 'Sporting': 'Sporting CP', 'Paços de Ferreira': 'FC Paços de Ferreira', 'Vitória de Guimarães': 'Vitória Guimarães SC', 'Moreirense': 'Moreirense FC',
    'Belenenses': 'CF Os Belenenses', 'Braga': 'SC Braga', 'Famalicão': 'FC Famalicão', 'Portimonense': 'Portimonense SC', 'Marítimo': 'CS Marítimo', 'Nacional': 'CD Nacional',
    'Estoril': 'GD Estoril Praia', 'Vitória de Setúbal': 'Vitória Setúbal FC', 'Boavista': 'Boavista FC', 'Gil Vicente': 'Gil Vicente FC', 'Celtic': 'Celtic FC', 'Aberdeen': 'Aberdeen FC',
    'Rangers': 'Rangers FC', 'Heerenveen': 'SC Heerenveen', 'Willem II': 'Willem II Tilburg', 'Ajax': 'Ajax Amsterdam', 'PSV': 'PSV Eindhoven', 'FC Utrecht': 'FC Utrecht',
    'Feyenoord': 'Feyenoord Rotterdam', 'Vitesse': 'Vitesse Arnhem', 'FC Twente': 'FC Twente Enschede', 'Sparta Rotterdam': 'Sparta Rotterdam', 'NEC': 'NEC Nijmegen',
    'AZ Alkmaar': 'AZ Alkmaar', 'NAC Breda': 'NAC Breda', 'Heracles Almelo': 'Heracles Almelo', 'Groningen': 'FC Groningen', 'Racing Club': 'Racing Club', 'River Plate': 'CA River Plate',
    'Boca Juniors': 'CA Boca Juniors', 'Rosario Central': 'CA Rosario Central', 'Argentinos Juniors': 'Argentinos Juniors', 'San Lorenzo': 'CA San Lorenzo de Almagro',
    'Lanús': 'CA Lanús', 'Talleres Córdoba': 'CA Talleres', 'Banfield': 'CA Banfield', 'Independiente': 'CA Independiente', 'Estudiantes': 'Estudiantes de La Plata',
    'Gimnasia La Plata': 'Gimnasia y Esgrima La Plata', 'Vélez Sarsfield': 'CA Vélez Sarsfield', "Newell's Old Boys": "Newell's Old Boys", 'Huracán': 'CA Huracán',
    'Fenerbahçe': 'Fenerbahce', 'Galatasaray': 'Galatasaray', 'Beşiktaş': 'Besiktas JK', 'Gençlerbirliği': 'Genclerbirligi Ankara', 'Trabzonspor': 'Trabzonspor',
    'İstanbul Başakşehir': 'Basaksehir FK', 'Celtic FC': 'Celtic FC', 'Zenit': 'Zenit St. Petersburg', 'Salzburg': 'Red Bull Salzburg', 'Rapid Wien': 'Rapid Vienna',
    'Basel': 'FC Basel 1893', 'Young Boys': 'BSC Young Boys', 'Club Brugge': 'Club Brugge KV', 'Anderlecht': 'RSC Anderlecht', 'Genk': 'KRC Genk', 'Gent': 'KAA Gent',
    'Olympiacos': 'Olympiacos Piraeus', 'PAOK': 'PAOK Thessaloniki', 'Panathinaikos': 'Panathinaikos Athens', 'Shakhtar Donetsk': 'Shakhtar Donetsk',
    'Guangzhou Evergrande': 'Guangzhou Evergrande Taobao', 'Shanghai Port': 'Shanghai SIPG', 'Jiangsu Suning': 'Jiangsu Suning', 'Junior': 'CD Junior FC',
    'Atlético Nacional': 'Atlético Nacional', 'Peñarol': 'CA Peñarol', 'Colo-Colo': 'CSD Colo-Colo', 'Malmö FF': 'Malmö FF', 'København': 'FC Copenhagen', 'Brøndby': 'Bröndby IF',
    'Al Sadd': 'Al-Sadd SC', 'Al Ain': 'Al-Ain FC', 'Kawasaki Frontale': 'Kawasaki Frontale', 'Urawa Reds': 'Urawa Red Diamonds', 'Kashima Antlers': 'Kashima Antlers',
    'Vissel Kobe': 'Vissel Kobe', 'Cruz Azul': 'Cruz Azul', 'América': 'Club América', 'Tigres UANL': 'Tigres UANL', 'Monterrey': 'CF Monterrey', 'Pumas UNAM': 'Pumas UNAM',
    'Pachuca': 'CF Pachuca', 'Santos Laguna': 'Santos Laguna', 'New York Cosmos': 'New York Cosmos',
    'Bayern München II': 'FC Bayern Munich II', 'Caen': 'SM Caen', 'Jeonbuk Motors': 'Jeonbuk Hyundai Motors', 'FC Twente': 'Twente Enschede FC',
    'Argentinos Juniors': 'AA Argentinos Juniors', 'Heidenheim': '1.FC Heidenheim 1846', 'Antwerp': 'Royal Antwerp FC', 'Brest': 'Stade Brestois 29',
    'Quevilly Rouen': 'Quevilly Rouen Métropole', 'DSC Arminia Bielefeld': 'Arminia Bielefeld', 'US Orléans Loiret Football': 'US Orléans', '1860 München': 'TSV 1860 Munich',
    'Nîmes': 'Nîmes Olympique', 'Rizespor': 'Caykur Rizespor', 'Laval': 'Stade Lavallois', 'Sporting Lokeren': 'KSC Lokeren', 'Gimnasia La Plata': 'Club de Gimnasia y Esgrima La Plata',
    'Évian Thonon Gaillard FC': 'FC Évian Thonon Gaillard', 'Saint Louis City': 'St. Louis CITY SC', 'Abha': 'Abha Club', 'Clermont': 'Clermont Foot 63',
    'Cracovia Kraków': 'Cracovia', 'Pumas UNAM': 'UNAM Pumas', 'Sarmiento': 'CA Sarmiento (Junin)', 'Gaziantep F.K.': 'Gaziantep FK', 'Atlético San Luis': 'Atlético de San Luis',
    'Oriente Petrolero': 'Club Deportivo Oriente Petrolero', 'Tianjin Quanjian FC': 'Tianjin Quanjian', 'Grasshopper': 'Grasshopper Club Zurich', 'Hajduk Split': 'HNK Hajduk Split',
    'Rodez': 'Rodez AF', 'Hebei CFFC': 'Hebei China Fortune', 'FC Ural Yekaterinburg': 'Ural Yekaterinburg', 'Beijing Renhe FC': 'Beijing Renhe', 'Real Salt Lake': 'Real Salt Lake City',
    'VfL Bochum 1848': 'VfL Bochum', 'San Martin de Tucumán': 'Club Atlético San Martín (Tucumán)', 'Athletic Club de Bilbao B': 'Bilbao Athletic', 'Arsenal de Sarandi': 'Arsenal Fútbol Club',
}

LEGAL = r'(?:FC|CF|SC|AC|AS|SS|US|SSC|CD|UD|SD|RCD|CA|SE|EC|CR|AFC|SV|VfL|VfB|TSV|FK|NK|SK|PFC|JK|SFC|BK|IF|FF|KV|KRC|RSC|CSD|SL|GD|CS|ACF|BC|HSC|AJ|RC|OGC|LOSC)'
PREFIXES = ['Sport Club Corinthians Paulista', 'Sociedade Esportiva ', 'Esporte Clube ', 'Futebol Clube ', 'Sport Club ', 'Clube de Regatas do ', 'Clube de Regatas ', 'Club de Regatas ',
            'Clube Atlético ', 'Club Atlético ', 'Associação Atlética ', 'Associação ', 'Club ', 'Clube ', 'Real Club ']
SUFFIXES = [' Futebol Clube', ' Esporte Clube', ' Football Club', ' Foot Ball Club', ' Foot-Ball Club', ' Sporting Club', ' de Futebol e Regatas', ' de Futebol', ' Calcio', ' Balompié']


STATE = r'\s+\((SP|MG|RJ|RS|PR|SC|BA|PE|CE|GO|DF|MT|MS|PA|AM|ES|PB|RN|AL|SE|PI|MA|TO|RO|AC|AP|RR)\)$'


def short(name, keep_state=False):
    s = re.sub(r'\s*\(\s*-\s*\d{4}\s*\)|\s*\(diss\.\)', '', name).strip()
    m = re.search(STATE, s)
    tag = m.group(1) if m else None
    s = re.sub(STATE, '', s)
    SPECIAL = {'Sport Club Corinthians Paulista': 'Corinthians', 'Sport Club do Recife': 'Sport', 'Grêmio Foot-Ball Porto Alegrense': 'Grêmio',
               'Clube de Regatas do Flamengo': 'Flamengo', 'Sport Club Internacional': 'Internacional'}
    if s in SPECIAL:
        return SPECIAL[s]
    s = re.sub(r'^Clube Atlético ', 'Atlético ', s)
    for p in PREFIXES:
        if s.startswith(p) and len(s) > len(p) + 2:
            s = s[len(p):]
            break
    for x in SUFFIXES + [' Esporte Clube', ' Futebol Clube', ' Atlético Clube', ' Sport Club', ' Football Club', ' Esporte Futebol Clube']:
        if s.endswith(x) and len(s) > len(x) + 2:
            s = s[: -len(x)]
            break
    s = re.sub(r'^' + LEGAL + r'\s+', '', s)
    s = re.sub(r'\s+' + LEGAL + r'$', '', s)
    s = s.strip() or name
    return s + ' (' + tag + ')' if keep_state and tag else s
