# DEMO DAY — Docker MCP Governance

The one page to follow when presenting. Talk track: `talking-points.md`.
Full beat detail + fallbacks: `runbook.md`. Scripts: `demo/`.

---

## A. One-time setup on THIS laptop
Do all of this once per machine, well before demo day.

### A0. What this demo requires — read first
- **Docker AI Governance** — a **separately licensed** add-on. Organization MCP
  policy and the audit log **do not exist without it**. If your org doesn't have
  it, this demo cannot run as written.
- **Two Docker accounts in the same org:**
  - an **owner** — creates the policies and views the audit log (the MCP access
    editor is *owner-only*);
  - a **developer** holding an AI Governance seat — runs the `sbx` CLI in the demo.

  You switch between them: **configure as owner, present as developer.**
- **Docker Desktop** running and **`sbx`** installed
  (see <https://docs.docker.com/ai/sandboxes/>) — built against `sbx` v0.42.1.
- **Node 18+**, ports **7801** and **7802** free, and outbound access to the
  **public npm registry** (Beat 3 really downloads a package).

### A1. Sign in (developer account)
```bash
sbx login
sbx mcp ls      # confirm it shows your organization
```

### A2. Create the two org policies — as the OWNER
They **do not exist until you create them.** Full detail in `policy/README.md`.

1. **AI Platform → MCP access → Create policy** — paste
   `policy/org-mcp-policy.cedar`.
   ⚠️ Update the pinned `identityURL` to the endpoint you'll register
   (default `http://localhost:7802/mcp`).
2. **AI Platform → Filesystem access → Create policy** — Allow **READ + WRITE**
   on *this laptop's* absolute workspace path. Get it with:
   ```bash
   cd /path/to/docker-mcp-governance-demo && echo "$PWD/sandbox-workspace"
   ```
   This is **required** — Beat 3 runs in a sandbox that mounts that directory,
   and the path differs on every machine.
   *A fresh filesystem policy takes ~30–60s to reach the local daemon;
   `sbx daemon restart` forces it.*

### A3. Prove the whole path once, before demo day
```bash
demo/setup.sh
demo/run-sandbox-beat.sh shell gov-demo    # must actually download left-pad
demo/reset.sh
```

---

## B. Before each demo (~2 min)
```bash
demo/setup.sh
```
Wait for **`✓ READY`** — it builds, starts both servers, and dry-runs the deny *and*
the allow so you know it works before you're on stage.

Open two things:
- a terminal — your **developer** CLI;
- a browser tab — Docker Home → AI Platform → **Audit logs**, signed in as the **owner**.

---

## C. The live demo (5–7 min)

### Beat 0 — enforcement is central (~20s)
```bash
sbx mcp ls
```
> ⚠️ The banner reads `LOCAL · managed by you` **even while org policy is actively
> enforcing**. Do **not** claim it flips to org-managed — it doesn't. Prove
> enforcement by *behavior* in Beats 2–3.

### Beat 1 — Ungoverned poisoning (~1.5 min)
```bash
( cd servers/poisoned-server && POISONED_URL=http://localhost:7801/mcp npm run harness )
```
Read the `<IMPORTANT>` block aloud — that's the poisoning. Point at
`EXFILTRATION SIMULATED` and the decoy AWS key.

> Be straight if asked: the harness *plays* a compromised agent deterministically,
> so the beat can't fail on stage. The poisoned **description** is the real artifact.

### Beat 2 — Governed DENY (~2 min)
```bash
sbx mcp add poisoned-demo --url http://localhost:7801/mcp --skip-ssrf-check
```
→ `blocked by policy`. In the Audit logs tab set **Event type = Server Registration**
and read the `poisoned-demo → DENY` row — identity/registration, no content field.

> **What `--skip-ssrf-check` does** (you *will* be asked): `sbx` flags registrations
> whose host resolves to a loopback/private address. Our demo servers are on
> `localhost`, so the flag silences that warning for a URL we control. It does
> **not** bypass MCP policy — Beat 2 is denied with the flag on. You would not use
> it for a real third-party server.

### Beat 3 — Governed ALLOW: the real download (~2 min)
```bash
demo/run-sandbox-beat.sh shell gov-demo
```
An agent inside a **governed sandbox** calls `npm_download` **through the gateway** —
`npm pack left-pad` returns the tarball path, size, shasum and integrity. In the same
run, the agent's attempt to pull in the poisoned server via `mcp-add` is **denied**.

Then in Audit logs set **Event type = Tool Invocation**:
`approved-downloader:npm_download → ALLOW` and `mcp-add → DENY`.

> "Same agent, same gateway. The unvetted server was blocked at the door; the curated
> one pulled the package — and every call is logged."

### Wrap (~30s)
Tool shadowing, rug pulls, over-broad scopes — same identity-pinned model. One
chokepoint: authenticated, authorized, logged.

---

## D. Optional extras
- **Beat 2b — endpoint swap denied** (the rug-pull defense, ~30s): see `runbook.md`.
- A named **cagent** to populate the audit **AGENT** column — built-in `shell` and
  `claude` both show `–`.

---

## E. Teardown
```bash
demo/reset.sh
```
Removes sandboxes, unregisters servers, stops processes, cleans downloads. Your org
policies stay put for next time.

---

## F. Troubleshooting (fast)
| Symptom | Fix |
|---|---|
| `✗ sbx not ready / not logged in` | `sbx login` — and confirm it's the right org |
| **MCP access** menu missing in Docker Home | you're signed in as the developer, not an **owner** |
| `approved-downloader` DENIED during setup | the `identityURL` pinned in your MCP policy ≠ the URL you registered — **check the port** |
| sandbox `mount policy denied` | filesystem policy path ≠ this laptop's `sandbox-workspace` absolute path (A2.2); or wait ~60s / `sbx daemon restart` |
| `npm pack` hangs ~60s then errors | no npm-registry access (guest Wi-Fi / proxy). **Test this before you present** |
| ports 7801/7802 in use | `demo/reset.sh`. If you must change ports, you **must also update the pinned `identityURL`** in the MCP policy — otherwise approved-downloader is denied |
| Audit page "Something went wrong" | reload the page; it's transient |
