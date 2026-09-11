#!/usr/bin/env bash
# reset.sh — tear the demo back down to nothing. Safe to run anytime.
# Leaves the ORG POLICIES in place (those live in Docker Home, delete manually).
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say(){ printf "\n\033[1m== %s ==\033[0m\n" "$1"; }
ok(){  printf "  \033[32m✓ %s\033[0m\n" "$1"; }

say "Remove demo sandboxes"
removed=0
for s in gov-demo gov-demo-claude; do
  sbx rm "$s" --force >/dev/null 2>&1 && removed=1 || true
done
[ "$removed" -eq 1 ] && ok "demo sandboxes removed" || ok "no demo sandboxes to remove"

say "Unregister demo MCP servers"
sbx mcp rm approved-downloader >/dev/null 2>&1 && ok "approved-downloader unregistered" || ok "approved-downloader not registered"
sbx mcp rm poisoned-demo      >/dev/null 2>&1 && ok "poisoned-demo unregistered"      || ok "poisoned-demo not registered"

say "Stop MCP servers"
stopped=0
for p in "${POISONED_PORT:-7801}" "${APPROVED_PORT:-7802}"; do
  pids="$(lsof -ti tcp:"$p" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then kill $pids 2>/dev/null; stopped=1; fi
done
[ "$stopped" -eq 1 ] && ok "servers stopped" || ok "no servers running"

say "Clean download artifacts"
rm -rf "$REPO_DIR/servers/approved-server/downloads" "$REPO_DIR/sandbox-workspace/downloads" >/dev/null 2>&1 || true
ok "cleaned"

printf "\n\033[1mReset complete.\033[0m Org policies (mcp-governance-demo, mcp-demo-workspace) are untouched.\n"
