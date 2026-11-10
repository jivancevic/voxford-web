#!/usr/bin/env bash
#
# Upload the encoded top videos to the R2 bucket `voxford-media` (ticket E).
#
#   scripts/upload-media.sh --local  [MEDIA_DIR]   # wrangler dev's local bucket (.wrangler/state)
#   scripts/upload-media.sh --remote [MEDIA_DIR]   # the production bucket (needs `wrangler login`)
#
# MEDIA_DIR is scripts/encode-top-videos.sh's output, default ~/voxford-media.
# Each top/<slug>/<file> goes to the key top/<slug>/<VERSION>/<file> (VERSION
# from the encode), served by the Worker at /media/top/<slug>/<VERSION>/<file>
# and cached as immutable. Re-running overwrites the same keys (idempotent).
# The reels/ prefix is the daily sync's: this script never touches it.
set -euo pipefail

MODE="${1:-}"
case "$MODE" in --local|--remote) ;; *) sed -n '3,12p' "$0" >&2; exit 1 ;; esac
DIR="${2:-$HOME/voxford-media}"
BUCKET=voxford-media
cd "$(dirname "$0")/.."

[[ -d "$DIR/top" ]] || { echo "nothing to upload: $DIR/top is missing (run scripts/encode-top-videos.sh)" >&2; exit 1; }

type_of() {
  case "$1" in
    *.mp4) echo video/mp4 ;;
    *.jpg) echo image/jpeg ;;
    *) echo "unknown type: $1" >&2; return 1 ;;
  esac
}

count=0
while IFS= read -r -d '' file; do
  slug_dir=$(dirname "$file")
  slug=$(basename "$slug_dir")
  [[ -s "$slug_dir/VERSION" ]] || { echo "no VERSION in $slug_dir: re-run scripts/encode-top-videos.sh" >&2; exit 1; }
  key="top/$slug/$(tr -d '[:space:]' < "$slug_dir/VERSION")/$(basename "$file")"
  npx wrangler r2 object put "$BUCKET/$key" "$MODE" --file "$file" </dev/null \
    --content-type "$(type_of "$file")" --cache-control 'public, max-age=31536000, immutable' >/dev/null
  echo "  ✓ $key ($(du -h "$file" | cut -f1))"
  count=$((count + 1))
done < <(find "$DIR/top" -type f \( -name '*.mp4' -o -name '*.jpg' \) ! -name '*.tmp.*' -print0 | sort -z)

echo "Uploaded $count files to $BUCKET (${MODE#--})."
