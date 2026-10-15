"""Gera docs/img/tex/*.webp (nuvens e gramado do estádio 3D) a partir das próprias funções de stadium.js.
Assim a abertura não gasta CPU desenhando essas texturas. Rodar de novo se mudar puffCanvas/pitchBase
e trocar o ?v= em index.html e stadium.js.
Uso: python3 tools/bake_textures.py   (precisa do Playwright com Chromium)"""
import base64, http.server, os, socketserver, threading
from functools import partial
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs')
OUT = os.path.join(ROOT, 'img', 'tex')
os.makedirs(OUT, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = partial(Quiet, directory=ROOT)
srv = socketserver.TCPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.route(lambda u: not u.startswith(f'http://127.0.0.1:{port}'), lambda r: r.abort())
    pg.goto(f'http://127.0.0.1:{port}/index.html?nobake')
    pg.wait_for_function('window.MF && MF.Stadium && MF.Stadium._bake && MF.rng')
    data = pg.evaluate("""() => { const o = MF.Stadium._bake(), r = {};
      for (const k in o) r[k] = o[k].toDataURL('image/webp', k === 'pitch' ? 0.9 : 0.92); return r; }""")
    b.close()
for k, url in data.items():
    raw = base64.b64decode(url.split(',', 1)[1])
    assert url.startswith('data:image/webp'), k
    open(os.path.join(OUT, k + '.webp'), 'wb').write(raw)
    print(k, len(raw) // 1024, 'KB')
srv.shutdown()
