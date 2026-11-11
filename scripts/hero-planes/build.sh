#!/usr/bin/env bash
# Rebuild the home hero's three planes from the source frame (#31).
# usage: scripts/hero-planes/build.sh <Unisport_stars_R1JC7655_JC.jpg> <work-dir>
# Needs macOS (Vision), ImageMagick, cwebp, Python 3 with Pillow and NumPy.
# Writes src/assets/photos/home/hero-{far.jpg,subject.webp,front.webp}.
set -euo pipefail
if [ $# -ne 2 ]; then
  echo "usage: $0 <Unisport_stars_R1JC7655_JC.jpg> <work-dir>" >&2
  exit 2
fi
src=$1
work=$2
# The crop and tile offsets below are for the 2400x1600 export on Drive.
size=$(magick identify -format '%wx%h' "$src")
if [ "$size" != 2400x1600 ]; then
  echo "expected a 2400x1600 frame, got $size" >&2
  exit 1
fi
here=$(cd "$(dirname "$0")" && pwd)
out="$here/../../src/assets/photos/home"
mkdir -p "$work"
swiftc -O "$here/matte.swift" -o "$work/matte"

# 1800x1200 (3:2, the scene's frame): the five stand between 22% and 97% of
# its width, their heads at about a third of its height.
magick "$src" -crop 1800x1200+360+268 +repage "$work/crop.png"

# One Vision matte per singer: on the whole frame Vision misses the first
# singer in the dark; on a tile per singer it finds each one cleanly.
i=0
for tile in 460x900+300+230 380x900+640+230 420x960+940+230 360x970+1180+230 380x900+1420+230; do
  i=$((i + 1))
  magick "$work/crop.png" -crop "$tile" +repage "$work/tile$i.png"
  "$work/matte" "$work/tile$i.png" "$work/tmask$i.png"
done
# A second, tighter tile for Vita (2), Ante (3) and Dora (4): on it Vision keeps
# Vita's middle and Ante's left side, which the wide tiles half lose, and leaves
# out the banner block the wide tile takes around Dora's microphone.
magick "$work/crop.png" -crop 330x560+690+380 +repage "$work/tile2b.png"
"$work/matte" "$work/tile2b.png" "$work/tmask2b.png"
magick "$work/crop.png" -crop 330x760+975+330 +repage "$work/tile3b.png"
"$work/matte" "$work/tile3b.png" "$work/tmask3b.png"
magick "$work/crop.png" -crop 300x700+1215+400 +repage "$work/tile4b.png"
"$work/matte" "$work/tile4b.png" "$work/tmask4b.png"
# The audience below the stage line, in four overlapping tiles.
for x in 0 400 800 1200; do
  magick "$work/crop.png" -crop "600x570+$x+630" +repage "$work/btile$x.png"
  "$work/matte" "$work/btile$x.png" "$work/bmask$x.png"
done

python3 -I "$here/planes.py" "$work"
magick "$work/hero-far.png" -strip -quality 82 "$out/hero-far.jpg"
# No -exact: cwebp then blanks the colour under transparent pixels, which
# halves the AVIF that Astro makes from it (60 kB → 34 kB at 1280w).
cwebp -quiet -q 90 -alpha_q 95 -metadata none "$work/hero-subject.png" -o "$out/hero-subject.webp"
# The audience is dark and grainy (high ISO); denoising it costs nothing visible and saves bytes.
magick "$work/hero-front.png" -alpha extract "$work/front-alpha.png"
magick "$work/hero-front.png" -alpha off -wavelet-denoise 6% "$work/front-rgb.png"
magick "$work/front-rgb.png" "$work/front-alpha.png" -compose CopyOpacity -composite "$work/front-dn.png"
cwebp -quiet -q 85 -alpha_q 90 -metadata none "$work/front-dn.png" -o "$out/hero-front.webp"
