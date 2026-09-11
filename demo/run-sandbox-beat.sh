#!/usr/bin/env bash
# run-sandbox-beat.sh — OPTIONAL extended beats: drive the approved + poisoned
# attempts from an AGENT INSIDE a governed sandbox, so decisions are audited as
# Tool Invocations (agent-attributed). Requires the org Filesystem-access policy
# to allow the workspace path below.
#
# Usage:  demo/run-sandbox-beat.sh [agent] [sandbox-name]
#           agent         default: shell   (use "claude" for a real agent)
#           sandbox-name  default: gov-demo
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT="${1:-shell}"
SBX_NAME="${2:-gov-demo}"
# WORKSPACE_DIR must match an ALLOW path in the org "Filesystem access" policy.
WORKSPACE_DIR="${WORKSPACE_DIR:-$REPO_DIR/sandbox-workspace}"
CLIENT_SRC="$REPO_DIR/sandbox-workspace/gateway-client.mjs"

say(){ printf "\n\033[1m== %s ==\033[0m\n" "$1"; }
ok(){  printf "  \033[32m✓ %s\033[0m\n" "$1"; }
warn(){ printf "  \033[33m! %s\033[0m\n" "$1"; }

say "Prepare workspace ($WORKSPACE_DIR)"
mkdir -p "$WORKSPACE_DIR"
[ -f "$WORKSPACE_DIR/gateway-client.mjs" ] || cp "$CLIENT_SRC" "$WORKSPACE_DIR/gateway-client.mjs"
if [ ! -d "$WORKSPACE_DIR/node_modules/@modelcontextprotocol" ]; then
  ( cd "$WORKSPACE_DIR" && npm init -y >/dev/null 2>&1 && npm install @modelcontextprotocol/sdk >/dev/null 2>&1 ) && ok "installed MCP SDK" || { warn "SDK install failed"; exit 1; }
else ok "MCP SDK present"; fi
echo "  Filesystem-access policy MUST allow (READ+WRITE):"
printf "    \033[36m%s\033[0m\n" "$WORKSPACE_DIR"

say "Launch governed sandbox ($SBX_NAME, agent=$AGENT)"
if sbx ls 2>/dev/null | awk -v n="$SBX_NAME" '$1==n && $3=="running"{f=1} END{exit !f}'; then
  ok "reusing the running sandbox '$SBX_NAME' — no cold start (pre-warm before a talk)"
  launched=1
else
sbx rm "$SBX_NAME" --force >/dev/null 2>&1 || true
launched=0
for attempt in 1 2 3; do
  if sbx run "$AGENT" -d --name "$SBX_NAME" "$WORKSPACE_DIR" >/tmp/sbx-run.log 2>&1; then launched=1; break; fi
  if grep -qi "mount policy denied" /tmp/sbx-run.log; then
    warn "mount denied (fs policy not synced yet) — attempt $attempt, waiting 20s… (sbx daemon restart also forces it)"
    sleep 20
  else
    warn "launch failed — see /tmp/sbx-run.log"; tail -3 /tmp/sbx-run.log; exit 1
  fi
done
fi
[ "$launched" -eq 1 ] || { warn "could not launch after retries — is the fs policy path exactly the one printed above?"; exit 1; }
ok "sandbox $SBX_NAME running"

say "Attach approved server to the sandbox gateway"
sbx mcp load approved-downloader --sandbox "$SBX_NAME" >/dev/null 2>&1 && ok "approved-downloader loaded (live)" || { warn "load failed — is approved-downloader registered? run setup.sh"; exit 1; }

say "Drive the gateway from inside the sandbox"
sbx exec "$SBX_NAME" -- node "$WORKSPACE_DIR/gateway-client.mjs"

printf "\n\033[1mDone.\033[0m Check Audit logs → Event type = Tool Invocation:\n"
echo "  approved-downloader:npm_download → ALLOW   |   mcp-add (poisoned) → DENY"
echo "  (AGENT column shows a name ONLY for a named cagent; shell/claude show '–')."
