# Genera las imágenes de arranque de iOS (apple-touch-startup-image): mismo fondo y logo que la pantalla de bienvenida (#splash de index.html).
# Uso: python3 scripts/gen-splash.py   (escribe public/splash/*.jpg e imprime las etiquetas <link> para index.html)
from PIL import Image, ImageFilter
import numpy as np

# (ancho css, alto css, dpr)
DEVICES = [
    (440, 956, 3), (420, 912, 3), (402, 874, 3), (430, 932, 3), (393, 852, 3), (428, 926, 3),
    (390, 844, 3), (414, 896, 3), (414, 896, 2), (375, 812, 3), (360, 780, 3), (414, 736, 3), (375, 667, 2),
]
logo = Image.open('public/logo-dba.png').convert('RGBA')

def background(w, h):
    # radial-gradient(60% 45% at 50% 50%, #0d2a52 0%, #07101f 55%, #04070d 100%)
    y, x = np.mgrid[0:h, 0:w].astype('float32')
    d = np.sqrt(((x - w / 2) / (0.60 * w)) ** 2 + ((y - h / 2) / (0.45 * h)) ** 2)
    stops = [(0.0, (13, 42, 82)), (0.55, (7, 16, 31)), (1.0, (4, 7, 13))]
    out = np.zeros((h, w, 3), 'float32')
    d = np.clip(d, 0, 1)
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        m = (d >= a) & (d <= b)
        t = ((d - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - t) + np.array(cb) * t
    return Image.fromarray(out.astype('uint8'), 'RGB')

tags = []
for cw, ch, dpr in DEVICES:
    w, h = cw * dpr, ch * dpr
    img = background(w, h).convert('RGBA')
    size = int(min(0.52 * cw, 220) * dpr)
    l = logo.resize((size, size), Image.LANCZOS)
    pos = ((w - size) // 2, (h - size) // 2)
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    mask = Image.new('L', (w, h), 0)
    mask.paste(l.split()[3], pos)
    mask = mask.filter(ImageFilter.GaussianBlur(14 * dpr)).point(lambda v: int(v * 0.45))
    glow.paste(Image.new('RGBA', (w, h), (26, 167, 255, 255)), (0, 0), mask)
    img.alpha_composite(glow)
    img.alpha_composite(l, pos)
    name = f'splash/{w}x{h}.jpg'
    img.convert('RGB').save('public/' + name, quality=90, subsampling=0, optimize=True)
    tags.append(f'    <link rel="apple-touch-startup-image" href="/{name}" media="(device-width: {cw}px) and (device-height: {ch}px) and (-webkit-device-pixel-ratio: {dpr}) and (orientation: portrait)" />')
print('\n'.join(tags))
