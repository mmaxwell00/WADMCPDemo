#!/usr/bin/env bash
# Render a .pptx to per-slide JPGs for visual QA, and recompress the file.
# Usage: bash render_qa.sh <deck.pptx> [dpi]
#
# pptxgenjs writes an uncompressed zip, so we re-zip first (smaller file).
# Then LibreOffice headless -> PDF -> pdftoppm -> slide-N.jpg in the deck's folder.
# Inspect the JPGs with a fresh-eyes subagent (see SKILL.md) — text overflow and
# overlaps are the usual defects and they are always visible in the render.

set -euo pipefail
DECK="${1:?usage: render_qa.sh <deck.pptx> [dpi]}"
DPI="${2:-100}"
DIR="$(cd "$(dirname "$DECK")" && pwd)"
BASE="$(basename "$DECK" .pptx)"

# Locate LibreOffice (CLI on PATH, or the macOS app bundle).
SOFFICE="$(command -v soffice || command -v libreoffice || true)"
[ -z "$SOFFICE" ] && [ -x "/Applications/LibreOffice.app/Contents/MacOS/soffice" ] && SOFFICE="/Applications/LibreOffice.app/Contents/MacOS/soffice"
if [ -z "$SOFFICE" ]; then
  echo "LibreOffice not found. Install: brew install --cask libreoffice" >&2; exit 1
fi
command -v pdftoppm >/dev/null || { echo "pdftoppm not found. Install: brew install poppler" >&2; exit 1; }

# Recompress (optional; skip silently if a rezip helper isn't around).
python3 - "$DECK" <<'PY' 2>/dev/null || true
import sys, zipfile, shutil, os
src = sys.argv[1]; tmp = src + ".tmp"
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for it in zin.infolist():
        if it.filename.endswith("/"):
            continue
        zout.writestr(it, zin.read(it.filename))
shutil.move(tmp, src)
PY

cd "$DIR"
"$SOFFICE" --headless --convert-to pdf "$BASE.pptx" >/dev/null 2>&1
find . -maxdepth 1 -name 'slide-*.jpg' -delete 2>/dev/null || true
pdftoppm -jpeg -r "$DPI" "$BASE.pdf" slide
echo "Rendered slides:"
ls -1 "$DIR"/slide-*.jpg
