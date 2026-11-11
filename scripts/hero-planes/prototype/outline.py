# PROTOTYPE: bake a white ring (sticker) and a soft white glow (rim) from the
# cleaned subject matte, faded out at each singer's lower body where the
# matte is cut. usage: outline.py <work-dir> <out-dir>
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
d, out = sys.argv[1:3]
S = np.asarray(Image.open(f'{d}/hero-subject.png'))[:, :, 3].astype(np.float32) / 255
H, W = S.shape
ys = np.arange(H, dtype=np.float32)[:, None]
hard = Image.fromarray(((S > 0.5) * 255).astype(np.uint8))
pad = Image.new('L', (W + 2, H + 2), 0); pad.paste(hard, (1, 1)); ImageDraw.floodfill(pad, (0, 0), 128)
filled = (np.asarray(pad)[1:-1, 1:-1] != 128).astype(np.float32)
filled = (np.asarray(Image.fromarray((filled*255).astype(np.uint8)).filter(ImageFilter.MinFilter(13)).filter(ImageFilter.MaxFilter(13)), np.float32) / 255 > 0.5).astype(np.float32) * 0 + np.maximum(np.asarray(Image.fromarray((filled*255).astype(np.uint8)).filter(ImageFilter.MinFilter(13)).filter(ImageFilter.MaxFilter(13)), np.float32) / 255, 0)
def L(a): return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
def F(img): return np.asarray(img, np.float32) / 255
# per-singer fade above the matte's cut line
cols = [(300, 715, 750), (715, 990, 740), (990, 1265, 970), (1265, 1490, 1090), (1490, 1800, 830)]
fade = np.ones((H, W), np.float32)
for x0, x1, f0 in cols:
    fade[:, x0:x1] = np.clip((f0 - 30 - ys) / 90, 0, 1)
smooth = F(L(filled).filter(ImageFilter.GaussianBlur(1.5)))
for name, r, blur, a in (('ring', 7, 1.2, 1.0), ('rim', 4, 10, 0.55)):
    dil = F(L(filled).filter(ImageFilter.MaxFilter(2 * r + 1)).filter(ImageFilter.GaussianBlur(blur)))
    ring = np.clip(dil - smooth, 0, 1) * fade * a
    rgba = np.zeros((H, W, 4), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = (ring * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(f'{out}/hero-{name}.png')
print('ok')
