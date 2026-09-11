# DEMO DAY — Docker MCP Governance

The one page to follow when presenting. Talk track is in `talking-points.md`;
full beat detail + fallbacks in `runbook.md`. Scripts live in `demo/`.

---

## A. One-time setup on THIS laptop
Do this once per machine (e.g. your company laptop), well before demo day.

1. **Prereqs**
   - Docker Desktop running; `sbx` installed (`sbx version`).
   - `sbx login` → sign in so `sbx mcp ls` shows `org: YOUR_ORG`.
     *(This is your `DEVELOPER_ACCOUNT` identity — the governed developer.)*
   - Node 18+ (`node --version`). Ports **7801** and **7802** free.
2. **Get the repo onto the laptop** (any location).
3. **Confirm the org policies exist** in Docker Home → AI Platform → **MCP access**:
   - `mcp-governance-demo` (permits `approved-downloader`, forbids `poisoned-demo`).
   - These are tenant-wide, so they're already there. If missing, see `policy/org-mcp-policy.cedar`.
4. **⚠️ Machine-specific step — Filesystem-access path (only needed for the
   optional in-sandbox beats).** Sandboxes mount a workspace, and the org
   **Filesystem access** policy allows a specific *absolute path*. That path is
   different on every machine/user. Run:
   ```bash
   echo "$(cd "$(dirname demo)"; pwd)/sandbox-workspace"   # or just note the repo path + /sandbox-workspace
   ```
   Then in Docker Home → AI Platform → **Filesystem access** → `mcp-demo-workspace`,
   set the allowed path to **this laptop's** `…/docker-mcp-governance-demo/sandbox-workspace`
   (Allow, READ + WRITE). *A fresh fs policy takes ~30–60s to reach the local
   daemon; `sbx daemon restart` forces it.*
   - **Skip step 4 entirely if you only run the core demo** (Beats 1–3 below need
     no sandbox).

---

## B. Before each demo (bring-up, ~1 min)
```bash
demo/setup.sh
```
Wait for **`✓ READY`**. It builds, starts both servers, and dry-runs the deny/allow
so you *know* it works before you're on stage. If it prints `✗ NOT ready`, fix the
named item (usually: not logged in, or a port in use) and re-run.

Open two things:
- A terminal (this is your `DEVELOPER_ACCOUNT` CLI).
- A browser tab: Docker Home → AI Platform → **Audit logs**.

---

## C. The live demo (5–7 min)

**Beat 0 — enforcement is central (~20s)**
```bash
sbx mcp ls
```
Say: *"Governed by the org."* (Note: the banner reads `managed by you` even when
enforced — prove it by behavior in the next beats, not the banner.)

**Beat 1 — Ungoverned poisoning (~1.5 min)**
```bash
cd servers/poisoned-server && POISONED_URL=http://localhost:7801/mcp npm run harness; cd -
```
Read the `<IMPORTANT>` block aloud; point at `EXFILTRATION SIMULATED` + the decoy key.

**Beat 2 — Governed DENY (~2 min)**
```bash
sbx mcp add poisoned-demo --url http://localhost:7801/mcp --skip-ssrf-check
```
→ `blocked by policy`. In the Audit logs tab, set **Event type = Server
Registration**: read the `poisoned-demo → DENY` row (identity, not content).

**Beat 3 — Governed ALLOW (~2 min)**
`approved-downloader` is already registered (setup pre-staged it). Show the
contrast row: `approved-downloader → ALLOW`. To show a real download live:
```bash
sbx mcp inspect approved-downloader        # it's registered & ready
```
*(Optional live download / agent-attributed version: see section D.)*

**Wrap (~30s)** — tool shadowing / rug pulls / over-broad scopes: same
identity-pinned model. One chokepoint: authenticated, authorized, logged.

---

## D. Optional — in-sandbox, agent-attributed beats
Needs section A step 4 done. Shows the approved tool actually **pulling an npm
package through the gateway** (`npm pack left-pad`) from inside a governed
sandbox, and the agent being blocked from pulling in the poisoned server.
```bash
demo/run-sandbox-beat.sh shell gov-demo
```
Then in Audit logs → **Event type = Tool Invocation**:
`approved-downloader:npm_download → ALLOW` and `mcp-add (poisoned) → DENY`.
*(AGENT column shows a name only for a named cagent; `shell`/`claude` show `–`.)*

---

## E. Teardown
```bash
demo/reset.sh
```
Removes sandboxes, unregisters servers, stops processes, cleans downloads. Org
policies stay put for next time.

---

## F. Troubleshooting (fast)
| Symptom | Fix |
|---|---|
| `setup.sh` says not logged in | `sbx login` (org must be `YOUR_ORG`) |
| approved-downloader DENIED in setup | org `mcp-governance-demo` policy missing/edited — check MCP access |
| Beat 2 poisoned NOT denied | same — the forbid/default-deny isn't in effect |
| sandbox "mount policy denied" | fs policy path ≠ this laptop's workspace path (A.4); or wait ~60s / `sbx daemon restart` |
| Audit page "Something went wrong" | reload the page; it's transient |
| port 7801/7802 in use | `demo/reset.sh`, or set `POISONED_PORT`/`APPROVED_PORT` env before `setup.sh` |
