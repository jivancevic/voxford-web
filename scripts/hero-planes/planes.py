"""Build the home hero planes (far, subject, front, rim) from the 1800x1200 crop and
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

def to_image(a):  # a 0..1 float array as an 8-bit greyscale image
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

def to_array(img):  # an 8-bit greyscale image as a 0..1 float array
    return np.asarray(img, np.float32) / 255

def filled(mask):  # a boolean mask with every enclosed hole filled
    pad = Image.new('L', (W + 2, H + 2), 0)
    pad.paste(to_image(mask), (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    return np.asarray(pad, np.uint8)[1:-1, 1:-1] != 128

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
    for bi, bx, by in ((2, 690, 380), (3, 975, 330), (4, 1215, 400)):
        if i == bi:
            mb = np.asarray(Image.open(f'{d}/tmask{i}b.png').convert('L'), np.float32) / 255
            hb, wb = mb.shape
            if i == 4:
                # Singer 4's wide tile takes a block of the sponsor banner around
                # her hand and microphone; the tight one alone is clean.
                full[:] = 0
            full[by:by + hb, bx:bx + wb] = np.maximum(full[by:by + hb, bx:bx + wb], mb)
    # Close the narrow gaps a microphone stand cuts through a singer: the
    # stand stands in front of them, so it belongs to this plane.
    closed = to_array(to_image(full > 0.3).filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.MinFilter(25)))
    full = np.maximum(full, closed)
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

# Clean the matte: drop faint noise, keep soft edges. Vision's outlines are
# crisp; its faint values sit inside dark clothes and on the microphones, so a
# low, steep ramp makes those solid without growing a halo.
subject = np.clip((subject - 0.04) / 0.16, 0, 1)
# Fill what the matte still encloses (singer 4's dark trousers): a hole there
# showed the far plane through her.
hard = subject > 0.5
subject = np.maximum(subject, (filled(hard) & ~hard).astype(np.float32))

# Hand fixes, after the hole fill so it cannot close them again.
# Singer 2's tight tile takes in the gold foundation logo beside her hip.
box = (slice(600, 820), slice(860, 990))
rgbf = np.asarray(crop, np.float32)[box]
gold = (rgbf[..., 0] - rgbf[..., 2] > 50) & (rgbf[..., 1] > 80)
subject[box][gold] = 0
# ...and a stand and a dark audience head on either side of her.
subject[560:760, 945:990] = 0
subject[620:800, 700:742] = 0
# Vision takes a block of the sponsor banner (navy ground, logo, lettering)
# around singer 4's hand and microphone. Inside that block keep only the
# microphone and her hand, drawn by hand on the 1800x1200 crop.
keep = Image.new('L', (W, H), 0)
draw = ImageDraw.Draw(keep)
draw.line([(1250, 542), (1332, 488)], fill=255, width=15)
draw.polygon([(1270, 506), (1300, 499), (1303, 522), (1299, 536), (1301, 582), (1270, 582), (1266, 546)], fill=255)
keep = np.asarray(keep.filter(ImageFilter.GaussianBlur(1)), np.float32) / 255
box = (slice(478, 582), slice(1246, 1322))
subject[box] = np.minimum(subject[box], keep[box])
# The lettering runs on under her chin, left of her hair: drop its navy
# ground and pale or yellow letters there; her hair is darker than all three.
box = (slice(518, 550), slice(1299, 1346))
r, g, b = (np.asarray(crop, np.float32)[box][..., k] for k in range(3))
lo, hi = np.minimum(np.minimum(r, g), b), np.maximum(np.maximum(r, g), b)
subject[box][(b > r) | ((lo > 140) & (hi - lo < 70)) | ((r - b > 40) & (g > 100) & (np.abs(r - g) < 50))] = 0
# Above that, beside her chin, one yellow letter and its navy ground.
box = (slice(486, 518), slice(1318, 1340))
r, g, b = (np.asarray(crop, np.float32)[box][..., k] for k in range(3))
subject[box][(b > r) | ((r - b > 40) & (g > 100) & (np.abs(r - g) < 50))] = 0
# Singer 4's tight tile takes in an audience head beside her legs; the front row has it.
subject[860:1150, 1440:1490] = 0
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

# Rim: a soft white back-light around the five, under the subject (#67). Drawn
# from the matte with its holes filled and its specks opened away, and faded
# out above each singer's cut line, where the front row takes over.
solid = to_image(filled(subject > 0.5)).filter(ImageFilter.MinFilter(13)).filter(ImageFilter.MaxFilter(13))
fade = np.ones((H, W), np.float32)
for _, _, _, x0, x1, f0, _ in singers:
    fade[:, x0:x1] = np.clip((f0 - 30 - ys) / 90, 0, 1)
glow = to_array(solid.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(10)))
rim = np.clip(glow - to_array(solid.filter(ImageFilter.GaussianBlur(1.5))), 0, 1) * fade * 0.55
rgba = np.zeros((H, W, 4), np.uint8)
rgba[..., :3] = 255
rgba[..., 3] = (rim * 255).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(f'{d}/hero-rim.png')

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
