#!/usr/bin/env bash
# setup.sh — bring the Docker MCP Governance demo to a known-good pre-demo state.
# Idempotent: safe to run repeatedly. Path-independent (derives repo from itself).
#
#   Core demo needs NO sandbox — just this script. The in-sandbox beats are
#   optional (see run-sandbox-beat.sh).
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POISONED_DIR="$REPO_DIR/servers/poisoned-server"
APPROVED_DIR="$REPO_DIR/servers/approved-server"
POISONED_PORT="${POISONED_PORT:-7801}"
APPROVED_PORT="${APPROVED_PORT:-7802}"
# Export so reset.sh sees the same values if you override them in this shell.
# NOTE: changing APPROVED_PORT also requires updating the identityURL pinned in
# your org MCP policy, or approved-downloader will be DENIED.
export POISONED_PORT APPROVED_PORT
POISONED_URL="http://localhost:${POISONED_PORT}/mcp"
APPROVED_URL="http://localhost:${APPROVED_PORT}/mcp"

say(){ printf "\n\033[1m== %s ==\033[0m\n" "$1"; }
ok(){   printf "  \033[32m✓ %s\033[0m\n" "$1"; }
warn(){ printf "  \033[33m! %s\033[0m\n" "$1"; }
fail(){ printf "  \033[31m✗ %s\033[0m\n" "$1"; }

FAILED=0

say "Preflight"
command -v sbx  >/dev/null || { fail "sbx not found — install Docker Sandboxes"; exit 1; }
command -v node >/dev/null || { fail "node not found — install Node 18+"; exit 1; }
command -v curl >/dev/null || { fail "curl not found"; exit 1; }
if ! sbx mcp ls >/dev/null 2>&1; then fail "sbx not ready / not logged in — run: sbx login"; exit 1; fi
ok "sbx $(sbx version 2>/dev/null | awk '{print $3}')  •  node $(node --version)"
ORG_LINE="$(sbx mcp ls 2>/dev/null | head -1)"; ok "governance: ${ORG_LINE}"
warn "^ confirm that is the org your MCP policy lives in (wrong org = confusing denies later)"
# Beat 3 really downloads from the npm registry — catch guest-WiFi/proxy now, not on stage.
if npm view left-pad version >/dev/null 2>&1; then
  ok "npm registry reachable (Beat 3 npm pack will work)"
else
  warn "npm registry NOT reachable — Beat 3 (npm pack) will hang ~60s then fail on this network"
fi

say "Build servers (if needed)"
for d in "$POISONED_DIR" "$APPROVED_DIR"; do
  name="$(basename "$d")"
  if [ -f "$d/dist/index.js" ]; then ok "$name already built"; else
    printf "  building %s ... " "$name"
    if ( cd "$d" && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1 ); then echo "done"; else fail "build failed ($d)"; exit 1; fi
  fi
done

say "Clean prior demo state"
sbx rm gov-demo gov-demo-claude --force >/dev/null 2>&1 && ok "removed old demo sandboxes" || warn "no demo sandboxes to remove"
sbx mcp rm approved-downloader >/dev/null 2>&1 || true
sbx mcp rm poisoned-demo      >/dev/null 2>&1 || true
for p in "$POISONED_PORT" "$APPROVED_PORT"; do
  pids="$(lsof -ti tcp:"$p" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then kill $pids 2>/dev/null && ok "freed port $p"; fi
done
sleep 1

say "Start MCP servers"
# Redirect the whole subshell's fds (not just node's) so a backgrounded server
# never holds a caller's pipe open — setup output stays safe to pipe.
( cd "$POISONED_DIR" && PORT="$POISONED_PORT" exec node dist/index.js ) >/tmp/mcp-poisoned.log 2>&1 </dev/null &
( cd "$APPROVED_DIR" && PORT="$APPROVED_PORT" exec node dist/index.js ) >/tmp/mcp-approved.log 2>&1 </dev/null &
for pair in "poisoned $POISONED_URL" "approved $APPROVED_URL"; do
  set -- $pair; label="$1"; url="$2"; code="000"
  for _ in $(seq 1 30); do code="$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null)"; code="${code:-000}"; [ "$code" != "000" ] && break; sleep 0.3; done
  if [ "$code" != "000" ]; then ok "$label server up ($url → HTTP $code)"; else fail "$label server did not come up ($url)"; FAILED=1; fi
done

say "Verify governance (this is your demo, dry-run)"
# Poisoned must be DENIED.
if sbx mcp add poisoned-demo --url "$POISONED_URL" --skip-ssrf-check >/tmp/mcp-add-poisoned.log 2>&1; then
  fail "poisoned-demo was NOT denied — check the org MCP policy"; sbx mcp rm poisoned-demo >/dev/null 2>&1; FAILED=1
else
  if grep -qiE "denied|blocked by policy" /tmp/mcp-add-poisoned.log; then ok "poisoned-demo correctly DENIED (Beat 2)"; else warn "poisoned add failed for another reason — see /tmp/mcp-add-poisoned.log"; FAILED=1; fi
fi
# Approved must be ALLOWED — leave it registered (pre-staged for Beat 3).
if sbx mcp add approved-downloader --url "$APPROVED_URL" --skip-ssrf-check >/tmp/mcp-add-approved.log 2>&1; then
  ok "approved-downloader registered / ALLOW (Beat 3 pre-staged)"
else
  fail "approved-downloader was DENIED — check the org MCP policy — see /tmp/mcp-add-approved.log"; FAILED=1
fi

say "Result"
if [ "$FAILED" -eq 0 ]; then
  ok "READY. Servers up, poisoned denies, approved allows."
  echo "     Next: follow DEMO-DAY.md.  Audit: app.docker.com → AI Platform → Audit logs"
  echo "     In-sandbox beats (optional): demo/run-sandbox-beat.sh"
else
  fail "NOT ready — resolve the ✗/! items above, then re-run."
  exit 1
fi
