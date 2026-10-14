"""MUNDOFUT10 — países: nome canônico (o mesmo da base antiga e das bandeiras), código ISO da bandeira, português, espanhol."""

# variantes vindas do Transfermarkt -> nome canônico
CANON = {
    'South Korea': 'Korea Republic', 'Korea, South': 'Korea Republic', 'China': 'China PR', 'Ireland': 'Republic of Ireland',
    'Ivory Coast': "Côte d'Ivoire", "Cote d'Ivoire": "Côte d'Ivoire", 'DR Congo': 'Congo DR', 'The Gambia': 'Gambia',
    'Hongkong': 'Hong Kong', 'Curacao': 'Curaçao', 'Cape Verde Islands': 'Cape Verde', 'Palästina': 'Palestine', 'Neukaledonien': 'New Caledonia',
    'Jugoslawien (SFR)': 'Yugoslavia', 'Southern Sudan': 'South Sudan', 'St. Vincent & Grenadinen': 'St. Vincent and the Grenadines',
    'St. Kitts & Nevis': 'St. Kitts and Nevis', 'Brunei Darussalam': 'Brunei', 'Chinese Taipei': 'Taiwan', 'Türkiye': 'Turkey',
    'United States of America': 'United States', 'USA': 'United States', 'Czechia': 'Czech Republic', 'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
    'Korea, North': 'North Korea', 'Chinese Taipei (Taiwan)': 'Taiwan', 'Macao': 'Macau', 'United Kingdom': 'England',
}
DROP = {'', 'N/A', 'Ban', 'nan', 'None'}

# nome canônico: [código ISO (flag-icons), português, espanhol]
INFO = {
    'Afghanistan': ['af', 'Afeganistão', 'Afganistán'], 'Albania': ['al', 'Albânia', 'Albania'], 'Algeria': ['dz', 'Argélia', 'Argelia'],
    'American Virgin Islands': ['vi', 'Ilhas Virgens Americanas', 'Islas Vírgenes de EE. UU.'], 'Andorra': ['ad', 'Andorra', 'Andorra'], 'Angola': ['ao', 'Angola', 'Angola'],
    'Anguilla': ['ai', 'Anguila', 'Anguila'], 'Antigua and Barbuda': ['ag', 'Antígua e Barbuda', 'Antigua y Barbuda'], 'Argentina': ['ar', 'Argentina', 'Argentina'],
    'Armenia': ['am', 'Armênia', 'Armenia'], 'Aruba': ['aw', 'Aruba', 'Aruba'], 'Australia': ['au', 'Austrália', 'Australia'], 'Austria': ['at', 'Áustria', 'Austria'],
    'Azerbaijan': ['az', 'Azerbaijão', 'Azerbaiyán'], 'Bahrain': ['bh', 'Bahrein', 'Baréin'], 'Bangladesh': ['bd', 'Bangladesh', 'Bangladés'],
    'Barbados': ['bb', 'Barbados', 'Barbados'], 'Belarus': ['by', 'Belarus', 'Bielorrusia'], 'Belgium': ['be', 'Bélgica', 'Bélgica'], 'Belize': ['bz', 'Belize', 'Belice'],
    'Benin': ['bj', 'Benin', 'Benín'], 'Bermuda': ['bm', 'Bermudas', 'Bermudas'], 'Bolivia': ['bo', 'Bolívia', 'Bolivia'], 'Bonaire': ['bq', 'Bonaire', 'Bonaire'],
    'Bosnia and Herzegovina': ['ba', 'Bósnia', 'Bosnia'], 'Botswana': ['bw', 'Botsuana', 'Botsuana'], 'Brazil': ['br', 'Brasil', 'Brasil'], 'Brunei': ['bn', 'Brunei', 'Brunéi'],
    'Bulgaria': ['bg', 'Bulgária', 'Bulgaria'], 'Burkina Faso': ['bf', 'Burkina Faso', 'Burkina Faso'], 'Burundi': ['bi', 'Burundi', 'Burundi'],
    'Cambodia': ['kh', 'Camboja', 'Camboya'], 'Cameroon': ['cm', 'Camarões', 'Camerún'], 'Canada': ['ca', 'Canadá', 'Canadá'], 'Cape Verde': ['cv', 'Cabo Verde', 'Cabo Verde'],
    'Cayman Islands': ['ky', 'Ilhas Cayman', 'Islas Caimán'], 'Central African Republic': ['cf', 'Rep. Centro-Africana', 'Rep. Centroafricana'], 'Chad': ['td', 'Chade', 'Chad'],
    'Chile': ['cl', 'Chile', 'Chile'], 'China PR': ['cn', 'China', 'China'], 'Colombia': ['co', 'Colômbia', 'Colombia'], 'Comoros': ['km', 'Comores', 'Comoras'],
    'Congo': ['cg', 'Congo', 'Congo'], 'Congo DR': ['cd', 'RD Congo', 'RD Congo'], 'Costa Rica': ['cr', 'Costa Rica', 'Costa Rica'], 'Croatia': ['hr', 'Croácia', 'Croacia'],
    'Cuba': ['cu', 'Cuba', 'Cuba'], 'Curaçao': ['cw', 'Curaçao', 'Curazao'], 'Cyprus': ['cy', 'Chipre', 'Chipre'], 'Czech Republic': ['cz', 'Tchéquia', 'Chequia'],
    "Côte d'Ivoire": ['ci', 'Costa do Marfim', 'Costa de Marfil'], 'Denmark': ['dk', 'Dinamarca', 'Dinamarca'], 'Dominica': ['dm', 'Dominica', 'Dominica'],
    'Dominican Republic': ['do', 'Rep. Dominicana', 'Rep. Dominicana'], 'Ecuador': ['ec', 'Equador', 'Ecuador'], 'Egypt': ['eg', 'Egito', 'Egipto'],
    'El Salvador': ['sv', 'El Salvador', 'El Salvador'], 'England': ['gb-eng', 'Inglaterra', 'Inglaterra'], 'Equatorial Guinea': ['gq', 'Guiné Equatorial', 'Guinea Ecuatorial'],
    'Eritrea': ['er', 'Eritreia', 'Eritrea'], 'Estonia': ['ee', 'Estônia', 'Estonia'], 'Ethiopia': ['et', 'Etiópia', 'Etiopía'], 'Faroe Islands': ['fo', 'Ilhas Faroé', 'Islas Feroe'],
    'Finland': ['fi', 'Finlândia', 'Finlandia'], 'France': ['fr', 'França', 'Francia'], 'French Guiana': ['gf', 'Guiana Francesa', 'Guayana Francesa'],
    'Gabon': ['ga', 'Gabão', 'Gabón'], 'Gambia': ['gm', 'Gâmbia', 'Gambia'], 'Georgia': ['ge', 'Geórgia', 'Georgia'], 'Germany': ['de', 'Alemanha', 'Alemania'],
    'Ghana': ['gh', 'Gana', 'Ghana'], 'Gibraltar': ['gi', 'Gibraltar', 'Gibraltar'], 'Greece': ['gr', 'Grécia', 'Grecia'], 'Grenada': ['gd', 'Granada', 'Granada'],
    'Guadeloupe': ['gp', 'Guadalupe', 'Guadalupe'], 'Guam': ['gu', 'Guam', 'Guam'], 'Guatemala': ['gt', 'Guatemala', 'Guatemala'], 'Guernsey': ['gg', 'Guernsey', 'Guernsey'],
    'Guinea': ['gn', 'Guiné', 'Guinea'], 'Guinea-Bissau': ['gw', 'Guiné-Bissau', 'Guinea-Bisáu'], 'Guyana': ['gy', 'Guiana', 'Guyana'], 'Haiti': ['ht', 'Haiti', 'Haití'],
    'Honduras': ['hn', 'Honduras', 'Honduras'], 'Hong Kong': ['hk', 'Hong Kong', 'Hong Kong'], 'Hungary': ['hu', 'Hungria', 'Hungría'], 'Iceland': ['is', 'Islândia', 'Islandia'],
    'India': ['in', 'Índia', 'India'], 'Indonesia': ['id', 'Indonésia', 'Indonesia'], 'Iran': ['ir', 'Irã', 'Irán'], 'Iraq': ['iq', 'Iraque', 'Irak'],
    'Isle of Man': ['im', 'Ilha de Man', 'Isla de Man'], 'Israel': ['il', 'Israel', 'Israel'], 'Italy': ['it', 'Itália', 'Italia'], 'Jamaica': ['jm', 'Jamaica', 'Jamaica'],
    'Japan': ['jp', 'Japão', 'Japón'], 'Jersey': ['je', 'Jersey', 'Jersey'], 'Jordan': ['jo', 'Jordânia', 'Jordania'], 'Kazakhstan': ['kz', 'Cazaquistão', 'Kazajistán'],
    'Kenya': ['ke', 'Quênia', 'Kenia'], 'Korea Republic': ['kr', 'Coreia do Sul', 'Corea del Sur'], 'Kosovo': ['xk', 'Kosovo', 'Kosovo'], 'Kuwait': ['kw', 'Kuwait', 'Kuwait'],
    'Kyrgyzstan': ['kg', 'Quirguistão', 'Kirguistán'], 'Laos': ['la', 'Laos', 'Laos'], 'Latvia': ['lv', 'Letônia', 'Letonia'], 'Lebanon': ['lb', 'Líbano', 'Líbano'],
    'Lesotho': ['ls', 'Lesoto', 'Lesoto'], 'Liberia': ['lr', 'Libéria', 'Liberia'], 'Libya': ['ly', 'Líbia', 'Libia'], 'Liechtenstein': ['li', 'Liechtenstein', 'Liechtenstein'],
    'Lithuania': ['lt', 'Lituânia', 'Lituania'], 'Luxembourg': ['lu', 'Luxemburgo', 'Luxemburgo'], 'Macau': ['mo', 'Macau', 'Macao'], 'Madagascar': ['mg', 'Madagascar', 'Madagascar'],
    'Malawi': ['mw', 'Malaui', 'Malaui'], 'Malaysia': ['my', 'Malásia', 'Malasia'], 'Mali': ['ml', 'Mali', 'Malí'], 'Malta': ['mt', 'Malta', 'Malta'],
    'Martinique': ['mq', 'Martinica', 'Martinica'], 'Mauritania': ['mr', 'Mauritânia', 'Mauritania'], 'Mauritius': ['mu', 'Maurício', 'Mauricio'], 'Mexico': ['mx', 'México', 'México'],
    'Moldova': ['md', 'Moldávia', 'Moldavia'], 'Monaco': ['mc', 'Mônaco', 'Mónaco'], 'Montenegro': ['me', 'Montenegro', 'Montenegro'], 'Montserrat': ['ms', 'Montserrat', 'Montserrat'],
    'Morocco': ['ma', 'Marrocos', 'Marruecos'], 'Mozambique': ['mz', 'Moçambique', 'Mozambique'], 'Myanmar': ['mm', 'Mianmar', 'Myanmar'], 'Namibia': ['na', 'Namíbia', 'Namibia'],
    'Netherlands': ['nl', 'Holanda', 'Países Bajos'], 'New Caledonia': ['nc', 'Nova Caledônia', 'Nueva Caledonia'], 'New Zealand': ['nz', 'Nova Zelândia', 'Nueva Zelanda'],
    'Nicaragua': ['ni', 'Nicarágua', 'Nicaragua'], 'Niger': ['ne', 'Níger', 'Níger'], 'Nigeria': ['ng', 'Nigéria', 'Nigeria'], 'North Korea': ['kp', 'Coreia do Norte', 'Corea del Norte'],
    'North Macedonia': ['mk', 'Macedônia do Norte', 'Macedonia del Norte'], 'Northern Ireland': ['gb-nir', 'Irlanda do Norte', 'Irlanda del Norte'], 'Norway': ['no', 'Noruega', 'Noruega'],
    'Oman': ['om', 'Omã', 'Omán'], 'Pakistan': ['pk', 'Paquistão', 'Pakistán'], 'Palestine': ['ps', 'Palestina', 'Palestina'], 'Panama': ['pa', 'Panamá', 'Panamá'],
    'Paraguay': ['py', 'Paraguai', 'Paraguay'], 'Peru': ['pe', 'Peru', 'Perú'], 'Philippines': ['ph', 'Filipinas', 'Filipinas'], 'Poland': ['pl', 'Polônia', 'Polonia'],
    'Portugal': ['pt', 'Portugal', 'Portugal'], 'Puerto Rico': ['pr', 'Porto Rico', 'Puerto Rico'], 'Qatar': ['qa', 'Catar', 'Catar'],
    'Republic of Ireland': ['ie', 'Irlanda', 'Irlanda'], 'Romania': ['ro', 'Romênia', 'Rumania'], 'Russia': ['ru', 'Rússia', 'Rusia'], 'Rwanda': ['rw', 'Ruanda', 'Ruanda'],
    'Réunion': ['re', 'Reunião', 'Reunión'], 'Saint-Martin': ['mf', 'São Martinho', 'San Martín'], 'San Marino': ['sm', 'San Marino', 'San Marino'],
    'Sao Tome and Principe': ['st', 'São Tomé e Príncipe', 'Santo Tomé y Príncipe'], 'Saudi Arabia': ['sa', 'Arábia Saudita', 'Arabia Saudí'], 'Scotland': ['gb-sct', 'Escócia', 'Escocia'],
    'Senegal': ['sn', 'Senegal', 'Senegal'], 'Serbia': ['rs', 'Sérvia', 'Serbia'], 'Seychelles': ['sc', 'Seicheles', 'Seychelles'], 'Sierra Leone': ['sl', 'Serra Leoa', 'Sierra Leona'],
    'Singapore': ['sg', 'Singapura', 'Singapur'], 'Slovakia': ['sk', 'Eslováquia', 'Eslovaquia'], 'Slovenia': ['si', 'Eslovênia', 'Eslovenia'], 'Somalia': ['so', 'Somália', 'Somalia'],
    'South Africa': ['za', 'África do Sul', 'Sudáfrica'], 'South Sudan': ['ss', 'Sudão do Sul', 'Sudán del Sur'], 'Spain': ['es', 'Espanha', 'España'],
    'Sri Lanka': ['lk', 'Sri Lanka', 'Sri Lanka'], 'St. Kitts and Nevis': ['kn', 'São Cristóvão e Névis', 'San Cristóbal y Nieves'], 'St. Lucia': ['lc', 'Santa Lúcia', 'Santa Lucía'],
    'St. Vincent and the Grenadines': ['vc', 'São Vicente e Granadinas', 'San Vicente y las Granadinas'], 'Sudan': ['sd', 'Sudão', 'Sudán'], 'Suriname': ['sr', 'Suriname', 'Surinam'],
    'Sweden': ['se', 'Suécia', 'Suecia'], 'Switzerland': ['ch', 'Suíça', 'Suiza'], 'Syria': ['sy', 'Síria', 'Siria'], 'Tahiti': ['pf', 'Taiti', 'Tahití'], 'Taiwan': ['tw', 'Taiwan', 'Taiwán'],
    'Tajikistan': ['tj', 'Tadjiquistão', 'Tayikistán'], 'Tanzania': ['tz', 'Tanzânia', 'Tanzania'], 'Thailand': ['th', 'Tailândia', 'Tailandia'], 'Timor-Leste': ['tl', 'Timor-Leste', 'Timor Oriental'],
    'Togo': ['tg', 'Togo', 'Togo'], 'Trinidad and Tobago': ['tt', 'Trinidad e Tobago', 'Trinidad y Tobago'], 'Tunisia': ['tn', 'Tunísia', 'Túnez'], 'Turkey': ['tr', 'Turquia', 'Turquía'],
    'Turkmenistan': ['tm', 'Turcomenistão', 'Turkmenistán'], 'Uganda': ['ug', 'Uganda', 'Uganda'], 'Ukraine': ['ua', 'Ucrânia', 'Ucrania'],
    'United Arab Emirates': ['ae', 'Emirados Árabes', 'Emiratos Árabes'], 'United States': ['us', 'Estados Unidos', 'Estados Unidos'], 'Uruguay': ['uy', 'Uruguai', 'Uruguay'],
    'Uzbekistan': ['uz', 'Uzbequistão', 'Uzbekistán'], 'Venezuela': ['ve', 'Venezuela', 'Venezuela'], 'Vietnam': ['vn', 'Vietnã', 'Vietnam'], 'Wales': ['gb-wls', 'País de Gales', 'Gales'],
    'Yemen': ['ye', 'Iêmen', 'Yemen'], 'Yugoslavia': [None, 'Iugoslávia', 'Yugoslavia'], 'Zambia': ['zm', 'Zâmbia', 'Zambia'], 'Zimbabwe': ['zw', 'Zimbábue', 'Zimbabue'],
}


def canon(c):
    if not isinstance(c, str):
        return None
    c = c.strip()
    if c in DROP:
        return None
    return CANON.get(c, c)
