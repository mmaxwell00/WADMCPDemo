# Docker MCP Governance — Live Demo

Live demo showing MCP governance (Docker Sandboxes + MCP gateway + Cedar policy)
as the sole control point for an agent that uses an MCP server to download a file
via npm. Audience: technical / security-literate.
**~5 min talk + 5–7 min demo + 3–5 min Q&A ≈ 13–17 min.**
Built against **`sbx` v0.42.1**.

> ⚠️ **Isolated demo environment only.** The poisoned server carries a real
> tool-poisoning pattern and exfiltrates a **decoy** credential. Never run it
> where real secrets live on disk.

## Requirements (read before you plan a demo)
- **Docker AI Governance** — a **separately licensed** add-on. Organization MCP
  policy and the audit log **do not exist without it**.
- **Two accounts in the same org**: an **owner** (creates policies, views the
  audit log — the MCP access editor is owner-only) and a **developer** holding an
  AI Governance seat (runs the CLI during the demo).
- **Docker Desktop**, **`sbx`**, **Node 18+**, ports **7801**/**7802** free, and
  outbound access to the **public npm registry** (Beat 3 really downloads).

**Start here → [`DEMO-DAY.md`](DEMO-DAY.md)** for the one-time setup and the
step-by-step run.

## Placeholders — substitute your own values
| Placeholder | Meaning |
|---|---|
| `YOUR_ORG` | your Docker organization |
| `OWNER_ACCOUNT` / `<owner-email>` | an org **owner** — configures policy in Docker Home |
| `DEVELOPER_ACCOUNT` | the governed **developer** account that runs the demo CLI |

The policies referenced throughout — `mcp-governance-demo` (MCP access) and
`mcp-demo-workspace` (Filesystem access) — **you create yourself**; see
[`policy/`](policy/). They do not exist until you make them.

## Layout
```
DEMO-DAY.md                One page to follow when presenting (start here)
runbook.md                 Keystroke-level, timed beat script + fallbacks
talking-points.md          5-minute speaker script + Q&A prep
slides/                    mcp-governance.pptx — the talk deck
demo/setup.sh              Build, start servers, dry-run deny+allow (idempotent)
demo/reset.sh              Full teardown
demo/run-sandbox-beat.sh   Beat 3 — governed sandbox calls npm_download via gateway
servers/poisoned-server/   Unapproved server w/ poisoned tool description (Beats 1–2)
                           src/server.ts  tool factory (the poison)
                           src/index.ts   streamable-HTTP host (:7801/mcp)
                           src/harness.ts deterministic Beat-1 "compromised agent"
servers/approved-server/   Legitimate npm-pack download server (Beat 3), :7802/mcp
                           npm_download tool → `npm pack <package>` (default: left-pad)
sandbox-workspace/         Mounted into the sandbox; holds gateway-client.mjs
policy/org-mcp-policy.cedar Default-deny org policy: permit approved, forbid poisoned
policy/README.md           Who configures vs demos, identity pinning, audit location
```

## Quick start
```bash
demo/setup.sh     # builds, starts both servers, and dry-runs the deny AND the allow
```
Wait for `✓ READY`. Then follow [`DEMO-DAY.md`](DEMO-DAY.md).
Requires the two org policies to exist first — see [`policy/README.md`](policy/README.md).

## The story in one line
All beats go through the gateway; **the only variable is policy.**
Ungoverned → the poison works. Governed → the unvetted server is denied **on
identity** (not content scanning). Approved server → pulls the npm package, logged.

## What's been verified (on the author's tenant)
- ✅ Both servers build and pass an end-to-end streamable-HTTP round-trip
  (Beat 1 exfil + Beat 3 `npm pack left-pad` with shasum/integrity).
- ✅ Registration deny/allow and the in-sandbox `npm_download → ALLOW` both appear
  in the AI Governance audit log.
- ✅ Servers register as **`--url` remote endpoints** → a real `identityURL` for
  Cedar to pin, so an endpoint swap under the approved name is refused.

## Accuracy guardrails (keep these true on stage)
- The gateway denies by **identity / registration**, not by detecting the poison.
- The `sbx mcp ls` banner reads **`managed by you` even when org policy is
  enforcing** — never use it as your enforcement signal; prove it by behavior.
- Durable MCP audit logging is the **AI Governance** feature (Docker Home), not
  the local `sbx policy log` (network/filesystem only).
- OWASP citation: **MCP03:2025 – Tool Poisoning** is an official
  [OWASP MCP Top 10](https://owasp.org/www-project-mcp-top-10/) entry; the project
  is currently in **beta** — say so if pressed.
