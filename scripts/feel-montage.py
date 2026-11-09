# Feel team helper: tile PNGs side by side for quick review. usage: python3 scripts/feel-montage.py out.png a.png b.png ...
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
h = max(i.size[1] for i in ims)
ims = [i.resize((int(i.size[0] * h / i.size[1]), h)) for i in ims]
w = sum(i.size[0] for i in ims) + 10 * (len(ims) - 1)
o = Image.new('RGB', (w, h), 'white')
x = 0
for i in ims:
    o.paste(i, (x, 0)); x += i.size[0] + 10
o.save(out)
