#!/usr/bin/env bash
#
# Encode the top videos for the web (ticket E). Repeatable: skips outputs that
# already exist unless --force.
#
#   scripts/encode-top-videos.sh [--force] [SOURCE_DIR] [OUT_DIR]
#
# SOURCE_DIR  the originals (vertical HEVC from the phone); default ~/Downloads/voxford-top-videos
# OUT_DIR     where the encoded files go, OUTSIDE the repo; default ~/voxford-media
#
# For each row of scripts/top-videos.tsv it writes OUT_DIR/top/<slug>/:
#   loop.av1.mp4, loop.h264.mp4   540×960, muted, a short loop for cards and rails
#   full.av1.mp4, full.h264.mp4   1080×1920 with sound, for the watch page
#   poster.jpg                    1080×1920 frame at poster_at seconds
#   VERSION                       8 hex chars of the files' SHA-256
# copies poster.jpg to src/assets/videos/<slug>.jpg (the `videos` collection's
# poster; Astro makes AVIF/WebP from it) and sets `media` in
# src/content/videos/<slug>.json to top/<slug>/<VERSION>, the R2 prefix the
# files are uploaded under. New content → new version → new URLs, so the files
# can be cached as immutable. HLG HDR originals are converted to SDR BT.709.
# Upload with scripts/upload-media.sh.
#
# Needs ffmpeg with libsvtav1 and libx264.
set -euo pipefail

FORCE=0
if [[ "${1:-}" == "--force" ]]; then FORCE=1; shift; fi
SRC="${1:-$HOME/Downloads/voxford-top-videos}"
OUT="${2:-$HOME/voxford-media}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LIST="$REPO/scripts/top-videos.tsv"
POSTERS="$REPO/src/assets/videos"

case "$OUT" in "$REPO"|"$REPO"/*) echo "OUT_DIR must be outside the repo (videos never go in git)" >&2; exit 1 ;; esac
for enc in libsvtav1 libx264; do
  ffmpeg -hide_banner -encoders 2>/dev/null | grep -q " $enc " || { echo "ffmpeg lacks $enc" >&2; exit 1; }
done

# SDR BT.709 output; HLG/BT.2020 sources get a colour-space conversion first.
color_filter() {
  local trc
  trc=$(ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer -of csv=p=0 "$1" </dev/null)
  if [[ "$trc" == "arib-std-b67" || "$trc" == "smpte2084" ]]; then
    echo "format=yuv420p10le,colorspace=all=bt709:iall=bt2020:itrc=bt2020-10:format=yuv420p,"
  fi
}

COLOR_TAGS=(-color_primaries bt709 -color_trc bt709 -colorspace bt709)
H264=(-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart "${COLOR_TAGS[@]}")
AV1=(-c:v libsvtav1 -preset 6 -g 240 -pix_fmt yuv420p -movflags +faststart "${COLOR_TAGS[@]}")

# encode OUTFILE FFMPEG_ARGS… runs ffmpeg unless the output exists (or --force).
encode() {
  local out="$1"; shift
  if [[ -s "$out" && $FORCE -eq 0 ]]; then echo "  = $(basename "$out") (exists)"; return; fi
  ffmpeg -nostdin -v error -stats -y "$@" "$out.tmp.${out##*.}" && mv "$out.tmp.${out##*.}" "$out"
  echo "  ✓ $(basename "$out") $(du -h "$out" | cut -f1)"
}

mkdir -p "$POSTERS"
grep -vE '^\s*(#|$)' "$LIST" | while read -r original slug poster_at loop_start loop_len; do
  in="$SRC/$original"
  [[ -f "$in" ]] || { echo "missing original: $in" >&2; exit 1; }
  dir="$OUT/top/$slug"
  mkdir -p "$dir"
  cf=$(color_filter "$in")
  echo "▸ $slug ($original)"

  encode "$dir/poster.jpg" -ss "$poster_at" -i "$in" -frames:v 1 \
    -vf "${cf}scale=1080:1920:flags=lanczos" -q:v 3
  cp "$dir/poster.jpg" "$POSTERS/$slug.jpg"

  loop_vf="${cf}fps=30,scale=540:960:flags=lanczos"
  encode "$dir/loop.h264.mp4" -ss "$loop_start" -t "$loop_len" -i "$in" -an -vf "$loop_vf" "${H264[@]}" -crf 26
  encode "$dir/loop.av1.mp4" -ss "$loop_start" -t "$loop_len" -i "$in" -an -vf "$loop_vf" "${AV1[@]}" -crf 40

  full_vf="${cf}fps=30,scale=1080:1920:flags=lanczos"
  audio=(-c:a aac -b:a 160k -ac 2)
  encode "$dir/full.h264.mp4" -i "$in" -vf "$full_vf" "${H264[@]}" -crf 26 "${audio[@]}"
  encode "$dir/full.av1.mp4" -i "$in" -vf "$full_vf" "${AV1[@]}" -crf 34 "${audio[@]}"

  version=$(cd "$dir" && cat loop.av1.mp4 loop.h264.mp4 full.av1.mp4 full.h264.mp4 poster.jpg | shasum -a 256 | cut -c1-8)
  printf '%s\n' "$version" > "$dir/VERSION"
  entry="$REPO/src/content/videos/$slug.json"
  if [[ -f "$entry" ]]; then
    node -e 'const f=process.argv[1],fs=require("fs"),d=JSON.parse(fs.readFileSync(f,"utf8"));d.media=process.argv[2];fs.writeFileSync(f,JSON.stringify(d,null,2)+"\n")' \
      "$entry" "top/$slug/$version"
    echo "  media top/$slug/$version → $(basename "$entry")"
  else
    echo "  media top/$slug/$version (add src/content/videos/$slug.json)"
  fi
  printf '  duration %ss\n' "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$dir/full.h264.mp4" </dev/null)"
done

echo "Done: $OUT/top. Next: scripts/upload-media.sh --local (dev) or --remote (production)."
