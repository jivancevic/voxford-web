"""Build the home hero planes (far, subject, front) from the 1800x1200 crop and
the per-tile Vision mattes that scripts/hero-planes/build.sh writes into <work>."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

d = sys.argv[1]
crop = Image.open(f'{d}/crop.png').convert('RGB')
W, H = crop.size
ys = np.arange(H, dtype=np.float32)[:, None]

def ramp(a, b):  # 1 above a, 0 below b
    return np.clip((b - ys) / (b - a), 0, 1)

def ramp_down(a, b):  # 0 above a, 1 below b
    return 1 - ramp(a, b)

# Singers: tile x offset, tile y offset, column x0..x1, fade start..end
singers = [
    (1, 300, 230, 300, 715, 750, 810),    # singer 1 (stage left)
    (2, 640, 230, 715, 990, 740, 800),    # singer 2
    (3, 940, 230, 990, 1265, 970, 1040),   # singer 3
    (4, 1180, 230, 1265, 1490, 1090, 1150),  # singer 4
    (5, 1420, 230, 1490, 1800, 830, 890),  # singer 5
]
subject = np.zeros((H, W), np.float32)
for i, tx, ty, x0, x1, f0, f1 in singers:
    m = np.asarray(Image.open(f'{d}/tmask{i}.png').convert('L'), np.float32) / 255
    full = np.zeros((H, W), np.float32)
    h, w = m.shape
    full[ty:ty + h, tx:tx + w] = m[: H - ty, : W - tx]
    col = np.zeros((1, W), np.float32)
    col[0, x0:x1] = 1
    full *= col * ramp(f0, f1)
    subject = np.maximum(subject, full)
# singer 4's white drape hangs off her shoulder; Vision leaves it out. Take its
# bright pixels inside a box around it.
lum = np.asarray(crop.convert('L'), np.float32) / 255
drape = np.zeros((H, W), np.float32)
drape[500:800, 1395:1480] = np.clip((lum[500:800, 1395:1480] - 0.42) / 0.18, 0, 1)
subject = np.maximum(subject, drape * ramp(1090, 1150))
# A sharp patch of the gold sponsor banner sits in singer 4's tile matte beside
# her microphone; drop its yellow pixels.
box = (slice(455, 545), slice(1235, 1310))
rgbf = np.asarray(crop, np.float32)[box]
gold = (rgbf[..., 0] - rgbf[..., 2] > 50) & (rgbf[..., 0] > 100)
subject[box][gold] = 0

# Clean the matte: drop faint noise, keep soft edges. Vision's outlines are
# crisp; its faint values sit inside dark clothes and on the microphones, so a
# low, steep ramp makes those solid without growing a halo.
subject = np.clip((subject - 0.04) / 0.16, 0, 1)
# Fill what the matte still encloses (singer 4's dark trousers): a hole there
# showed the far plane through her.
hard = Image.fromarray(((subject > 0.5) * 255).astype(np.uint8))
pad = Image.new('L', (W + 2, H + 2), 0)
pad.paste(hard, (1, 1))
ImageDraw.floodfill(pad, (0, 0), 128)
holes = (np.asarray(pad, np.uint8)[1:-1, 1:-1] == 0).astype(np.float32)
subject = np.maximum(subject, holes)
subject = np.asarray(Image.fromarray((subject * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255

# Front: the audience. Vision finds the lit heads on the left; the dark band
# below the stage line covers the rest.
aud = np.zeros((H, W), np.float32)
for x in (0, 400, 800, 1200):
    m = np.asarray(Image.open(f'{d}/bmask{x}.png').convert('L'), np.float32) / 255
    h, w = m.shape
    aud[630:630 + h, x:x + w] = np.maximum(aud[630:630 + h, x:x + w], m[: H - 630, : W - x])
aud *= ramp_down(690, 770)
band = ramp_down(890, 1010)
front = np.maximum(aud, band) * (1 - subject)
front = np.asarray(Image.fromarray((front * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), np.float32) / 255

rgb = np.asarray(crop)
for name, a in (('subject', subject), ('front', front)):
    rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])
    Image.fromarray(rgba, 'RGBA').save(f'{d}/hero-{name}.png')

# Far: the whole frame, defocused, dimmed and a little desaturated so the
# sponsor banners read as light, not logos.
# The singers are taken out first: blurred in place they left a soft ghost
# around each sharp singer, which read as a cut-out halo. Their area is filled
# from the backdrop around it (normalised blur), then the whole frame is defocused.
hole = np.asarray(Image.fromarray((subject * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4)), np.float32) / 255
src = np.asarray(crop, np.float32)
known = hole < 0.02
fill = src * known[:, :, None]
def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32)
for r in (8, 16, 32, 64, 128):
    num = blur(fill, r)
    den = blur(known.astype(np.float32) * 255, r)[:, :, None] / 255
    est = num / np.maximum(den, 1e-3)
    reached = (den[:, :, 0] > 0.05) & ~known
    fill[reached] = est[reached]
    known = known | reached
clean = Image.fromarray(np.clip(src * (1 - hole[:, :, None]) + fill * hole[:, :, None], 0, 255).astype(np.uint8))
far = clean.resize((1600, 1067), Image.LANCZOS).filter(ImageFilter.GaussianBlur(14))
arr = np.asarray(far, np.float32)
grey = arr.mean(axis=2, keepdims=True)
arr = (grey + (arr - grey) * 0.75) * 0.78
Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(f'{d}/hero-far.png')
print('ok')
