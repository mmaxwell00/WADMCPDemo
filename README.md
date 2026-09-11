# Docker MCP Governance — Live Demo

Minimal live demo showing MCP governance (Docker Sandboxes + MCP gateway + Cedar
policy) as the sole control point for an agent that uses an MCP server to
download a file. Audience: technical / security-literate. ~15–18 min total.
Built and verified against **`sbx` v0.42.1** and org **`YOUR_ORG`**.

> ⚠️ **Isolated demo environment only.** The poisoned server carries a real
> tool-poisoning pattern and exfiltrates a **decoy** credential. Never run it
> where real secrets live on disk.

## Placeholders — substitute your own values
This repo is genericized. Wherever the docs say:

| Placeholder | Meaning |
|---|---|
| `YOUR_ORG` | your Docker organization (with AI Governance licensed) |
| `OWNER_ACCOUNT` / `<owner-email>` | an org **owner** — configures the MCP policy in Docker Home |
| `DEVELOPER_ACCOUNT` | the governed **developer** account that runs the demo CLI |

The policy names used throughout — `mcp-governance-demo` (MCP access) and
`mcp-demo-workspace` (Filesystem access) — you create yourself; see [`policy/`](policy/).

## Layout
```
servers/poisoned-server/   Unapproved server w/ poisoned tool description (Beat 1 + 2)
                           src/server.ts  tool factory (the poison)
                           src/index.ts   streamable-HTTP host (:7801/mcp)
                           src/harness.ts deterministic Beat-1 "compromised agent"
servers/approved-server/   Legitimate npm-pack download server (Beat 3), :7802/mcp
                           npm_download tool → `npm pack <package>` (default: left-pad)
policy/org-mcp-policy.cedar Default-deny org policy: permit approved, forbid poisoned
policy/README.md           Who configures vs demos, identity pinning, audit location
runbook.md                 Keystroke-level, timed 3-beat script + trim plan
talking-points.md          5-minute speaker script
```

## Quick start
```bash
( cd servers/poisoned-server && npm install && npm run build )
( cd servers/approved-server && npm install && npm run build )
# start both HTTP servers (own terminals):
( cd servers/poisoned-server && PORT=7801 npm start )
( cd servers/approved-server && PORT=7802 npm start )
# prove Beat 1 fires deterministically:
( cd servers/poisoned-server && POISONED_URL=http://localhost:7801/mcp npm run harness )
```
Then follow `policy/README.md` (configure as owner) and `runbook.md` (demo as
`DEVELOPER_ACCOUNT`).

## The story in one line
All three beats go through the gateway; **the only variable is policy.**
Ungoverned → the poison works. Governed → the unvetted server is denied **on
identity** (not content scanning). Approved server → allowed and logged.

## Status / what's verified
- ✅ Both servers build and pass an end-to-end streamable-HTTP round-trip
  (Beat 1 exfil + Beat 3 `npm pack left-pad` with shasum/integrity).
- ✅ `YOUR_ORG` has **AI Governance licensed** (5 seats; `DEVELOPER_ACCOUNT`
  holds one) — org policy + audit log are available.
- ✅ Servers register as **`--url` remote endpoints** → real `identityURL` for
  Cedar to pin (dissolves the local-stdio Q&A landmine).

## Before demo day — do in your tenant
- [ ] Sign into Docker Home as **owner** (`<owner-email>`) to reach
      AI Platform → MCP access (hidden for the non-owner `DEVELOPER_ACCOUNT`).
- [ ] `sbx mcp inspect approved-downloader` → paste the real `identityURL` into
      the Cedar policy, then enforce it for `DEVELOPER_ACCOUNT`.
- [ ] Confirm `sbx mcp ls` flips to **org-managed** once enforced.
- [ ] Confirm the poisoned deny appears in the **Docker Home audit log** with an
      identity-based `deny_reason` (NOT in `sbx policy log`).
- [ ] Verify the exact OWASP MCP Top-10 citation ID before it goes on a slide.

## Accuracy guardrails (keep these true on stage)
- The gateway denies by **identity / registration**, not by detecting the poison.
- Durable MCP audit logging is the **AI Governance** feature (Docker Home), not
  the local `sbx policy log` (network/filesystem only).
