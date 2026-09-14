#!/usr/bin/env bash
# capture.sh — run one demo command in a pseudo-TTY (so colors survive) and save
# the exact command + output for rendering into a presentation screenshot.
#   screenshots/capture.sh <slug> '<command as typed on stage>'
set -uo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SLUG="$1"; CMD="$2"
OUT="$REPO_DIR/screenshots/raw"; mkdir -p "$OUT"
printf '%s\n' "$CMD" > "$OUT/$SLUG.cmd"
cd "$REPO_DIR"
# macOS script(1): -q quiet, -F flush; runs the command under a real TTY.
script -q -F "$OUT/$SLUG.txt" bash -lc "$CMD" >/dev/null 2>&1
STATUS=$?
# normalise CRLF from the pty
perl -pi -e 's/\r\n/\n/g; s/\r//g' "$OUT/$SLUG.txt"
printf '\n$ %s\n' "$CMD"
cat "$OUT/$SLUG.txt"
exit $STATUS
