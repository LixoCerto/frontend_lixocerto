from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'raw' / 'screenshots'
OUT = ROOT / 'figuras' / 'figura-03-guia.png'

# Recortes somente de leitura da homologação, sem cabeçalho ou identidade administrativa.
search_source = Image.open(RAW / '13-guia-publicado-busca.png').convert('L')
detail_source = Image.open(RAW / '14-guia-publicado-ficha.png').convert('L')
search = search_source.crop((0, 0, 330, 430))
detail = detail_source.crop((0, 0, 220, 500))

pad = 20
canvas = Image.new('L', (search.width + pad + detail.width, max(search.height, detail.height)), 255)
canvas.paste(search, (0, 0))
canvas.paste(detail, (search.width + pad, 0))
canvas.save(OUT, optimize=True)
print(f'output={OUT} dimensions={canvas.width}x{canvas.height}')
