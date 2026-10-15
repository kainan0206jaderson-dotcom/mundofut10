"""MUNDOFUT10 — gera docs/sw.js com a lista de arquivos e uma versão nova (o app busca sempre a versão mais nova; cache só sem internet)."""
import hashlib, json, os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'docs')
files = ['./', 'index.html']
for d in ('crests', 'icons', 'img/tex', 'js', 'js/games'):
    files += sorted(f'{d}/{f}' for f in os.listdir(os.path.join(ROOT, d)) if os.path.isfile(os.path.join(ROOT, d, f)))
# ext.json (8 MB, base completa) entra no cache só quando é usado
files += [f'data/{f}' for f in ('crests.json', 'db.json', 'flags.json', 'games.json', 'trophies.json')]
files += ['favicon.png', 'manifest.webmanifest', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js']
h = hashlib.sha1()
for f in files + ['data/ext.json']:
    p = os.path.join(ROOT, f)
    if os.path.isfile(p):
        h.update(open(p, 'rb').read())
ver = h.hexdigest()[:10]
old = open(os.path.join(ROOT, 'sw.js')).read()
body = old[old.index("self.addEventListener('install'"):]
head = f"/* MUNDOFUT10 — cache para abrir rápido e funcionar offline. Versão {ver} */\nconst CACHE = 'mf10-{ver}';\nconst PRECACHE = {json.dumps(files, ensure_ascii=False)};\n"
open(os.path.join(ROOT, 'sw.js'), 'w').write(head + body)
print('sw.js', ver, len(files), 'arquivos')
