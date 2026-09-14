# Screenshots — the no-typing edition of the demo

Real terminal output from a full run of every beat, rendered as large-font
terminal images for slides. Use these when you would rather not type live.
The deck built from them is `slides/MCP-Governance-Demo-Screenshots.pptx`.

| Path | What it is |
|---|---|
| `png/beat0-mcp-ls.png` | Beat 0 — `sbx mcp ls` (only `approved-downloader` registered) |
| `png/beat1-harness.png` | Beat 1 — poisoned description + `EXFILTRATION SIMULATED` |
| `png/beat2-deny.png` | Beat 2 — `registration denied … blocked by policy` |
| `png/beat2b-rm.png`, `png/beat2b-swap-deny.png`, `png/beat2b-restore-allow.png` | Beat 2b — the three-line endpoint swap |
| `png/beat3a-sbx-run.png`, `png/beat3b-mcp-load.png`, `png/beat3c-exec.png` | Beat 3 as typed by hand — `sbx run` (fresh sandbox), `sbx mcp load`, then `sbx exec … gateway-client.mjs` showing `npm_download` ALLOW and the agent's `mcp-add` DENY |
| `png/audit-server-registration.png`, `png/audit-tool-invocation.png` | Docker Home → AI Platform → Audit logs (owner view), filtered by event type, cropped from a window capture |
| `raw/<slug>.cmd` / `raw/<slug>.txt` | The exact command and its captured output (ANSI colours kept) |
| `capture.sh` | Runs one command under a pseudo-TTY and saves it to `raw/` |
| `render.mjs` | Turns `raw/` into `png/` with headless Chrome (needs `npm install` here) |

## Recapture after a change
Run from the **repo root** with the demo in its ready state (`demo/setup.sh`):
```bash
screenshots/capture.sh beat2-deny 'sbx mcp add poisoned-demo --url http://localhost:7801/mcp --skip-ssrf-check'
( cd screenshots && npm install )      # once
node screenshots/render.mjs             # rewrites every png/
```
If a capture's line count changes, update its pixel size in
`slides/deck-src/build_deck.js` (the `PX` table) and rebuild the deck.

> The captures show the presenter's local paths and Docker org. Recapture on
> your own machine before presenting under a different identity.
