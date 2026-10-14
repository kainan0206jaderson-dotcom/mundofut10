"""MUNDOFUT10 — bandeiras (PNG 40×29 em data URI) para todos os países da base, a partir do pacote aberto lipis/flag-icons (MIT)."""
import base64, json, os, sys
from playwright.sync_api import sync_playwright
from countries import INFO, canon
ROOT = os.path.join(os.path.dirname(__file__), '..')
SVG = os.environ.get('MF_FLAGS', '/tmp/claude-0/ds/flag-icons/flags/4x3')
out_path = os.path.join(ROOT, 'docs', 'data', 'flags.json')
old = json.load(open(os.path.join(ROOT, 'tools', 'legacy_flags.json')))
db = json.load(open(os.path.join(ROOT, 'docs', 'data', 'db.json')))
ext = json.load(open(os.path.join(ROOT, 'docs', 'data', 'ext.json')))
used = {p[3] for p in db['players']} | {p[2] for p in ext['players']} | {c[2] for c in db['clubs']}
used.discard('')
fl = {'map': dict(old['map']), 'img': dict(old['img']), 'names': {}}
need = []
for c in sorted(used):
    if c not in INFO:
        print('sem informação:', c); continue
    code, pt, es = INFO[c]
    fl['names'][c] = [pt, es]
    if not code:
        if c == 'Yugoslavia':
            fl['map'][c] = 'yu'
            if 'yu' not in fl['img']: need.append('yu')
        continue
    fl['map'][c] = code
    if code and code not in fl['img'] and os.path.exists(f'{SVG}/{code}.svg'):
        need.append(code)
# Iugoslávia (bandeira histórica: azul, branco e vermelho com estrela vermelha)
YU = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 29"><rect width="40" height="9.7" fill="#0c4076"/><rect y="9.7" width="40" height="9.7" fill="#fff"/><rect y="19.3" width="40" height="9.7" fill="#c6363c"/><path d="M20 7.5l2.4 7.4h7.7l-6.2 4.5 2.4 7.3-6.3-4.5-6.3 4.5 2.4-7.3-6.2-4.5h7.7z" fill="#c6363c" stroke="#f4c430" stroke-width=".8" transform="translate(20 15) scale(.62) translate(-20 -17)"/></svg>'
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 40, 'height': 29}, device_scale_factor=1)
    for code in need:
        svg = YU if code == 'yu' else open(f'{SVG}/{code}.svg').read()
        pg.set_content(f'<html><body style="margin:0"><img src="data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()}" style="width:40px;height:29px;display:block;object-fit:cover"></body></html>')
        pg.wait_for_timeout(30)
        png = pg.screenshot(type='png', clip={'x': 0, 'y': 0, 'width': 40, 'height': 29})
        fl['img'][code] = 'data:image/png;base64,' + base64.b64encode(png).decode()
    b.close()
json.dump(fl, open(out_path, 'w'), ensure_ascii=False, separators=(',', ':'))
print('bandeiras novas', len(need), 'total', len(fl['img']), os.path.getsize(out_path) // 1024, 'KB')
