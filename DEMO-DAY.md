# DEMO DAY — Docker MCP Governance

The one page to follow when presenting. Talk track: `talking-points.md`.
Full beat detail + fallbacks: `runbook.md`. Scripts: `demo/`.

> ▶️ **Run every `demo/*.sh` command from the repo root**, e.g.
> `cd /path/to/docker-mcp-governance-demo` first. They resolve paths relative to
> the repo, so `demo/setup.sh` fails with *no such file or directory* from anywhere else.

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
> ⚠️ **Sessions expire.** Log in again the **morning of** the talk, not the week
> before — this expired twice during testing. `setup.sh` catches it, but find out
> at your desk, not on stage.
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
the allow so you know it works before you're on stage. It **keeps** an already-running
`gov-demo` sandbox (that's your pre-warm), so this is safe to re-run before the talk.

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

### Beat 1 — Ungoverned: the npm download that steals your token (~1.5 min)
```bash
( cd servers/poisoned-server && POISONED_URL=http://localhost:7801/mcp npm run harness )
```
This server offers **`npm_download` — the same tool name the approved server uses**,
the same claimed job. Read the `<IMPORTANT>` block aloud: it tells the agent to read
the developer's `.npmrc` first and smuggle it along. The output then looks like a
perfectly normal successful download — followed by `EXFILTRATION SIMULATED` and the
**npm publish token**.

> "That token is what lets you publish packages. They can publish as you now — and
> everyone who installs your package gets whatever they put in it." 

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

### Beat 2b — the endpoint swap (~30s) — **keep this for a security room**
```bash
sbx mcp rm approved-downloader
sbx mcp add approved-downloader --url http://localhost:7801/mcp --skip-ssrf-check   # → DENIED
sbx mcp add approved-downloader --url http://localhost:7802/mcp --skip-ssrf-check   # → ALLOW (restore)
```
The **approved name** pointed at a different endpoint is refused.
> "You can't squat an approved name and swap the server underneath it. We pin the
> identity, not the label — that's the rug-pull class, closed."

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

---

## G. Presenting to a ROOM (30–40 people)
Stage-proofing that matters far more with an audience than at a desk.

### Before you walk in
- **Pre-warm, and do NOT reset afterwards.** On the venue network run:
  ```bash
  demo/setup.sh && demo/run-sandbox-beat.sh shell gov-demo
  ```
  This warms the npm cache *and* leaves `gov-demo` running. Beat 3 then reuses the
  live sandbox (no 30–60s cold start) and packs from cache — so **Beat 3 survives
  the room's Wi-Fi dying.** Running `reset.sh` before the talk throws both away.
- **Terminal at ~18–20pt**, high contrast. Your back row is 40 feet away.
- **Pre-open the audit log already filtered**, in two tabs — don't fight the filter
  dropdowns live, they're fiddly:
  - Registrations: `…/admin/ai-governance/audit-logs?action_type=server_registration`
  - Tool calls: `…/admin/ai-governance/audit-logs?action_type=tool_invocation`

  Browser zoom ~150%.
- **Screenshot both audit views as a fallback.** The console throws a transient
  "Something went wrong" occasionally — if it does that on stage, show the still
  and keep moving rather than reloading in silence.

### During
- `sbx mcp add` prints several INFO lines before the verdict. Say *"watch the last
  line"* **before** you press enter, so 40 people aren't reading proxy noise.
- The decoy key in Beat 1 is the visual punchline — pause on it.
- If anything stalls, narrate the architecture rather than watching a spinner; you
  have the diagram slide for exactly this.

### Cut order if you're running long
Drop Beat 2b first, then the Tool-Invocation audit view (keep the Server
Registration deny — it's the core claim). Never cut Beat 1.

### Where the "ah-ha" moments actually are
Land these four; everything else is connective tissue.
1. **The `<IMPORTANT>` block (Beat 1).** The attack is in the tool *description*,
   not in code. Most of the room has never seen that. Read it aloud, then show the key.
2. **"It never let the server in" (Beat 2).** The reframe: the gateway did **not**
   detect the poison. People expect an AI scanner — tell them it's identity, and
   that this is the *stronger* guarantee. This is the intellectual payoff.
3. **The endpoint swap (Beat 2b).** Same approved *name*, different endpoint, still
   denied. Security folks get the rug-pull implication instantly. Cheapest big win.
4. **The agent can't shop for tools (Beat 3).** Its own `mcp-add` is denied — the
   agent cannot self-serve an unapproved server. Then: "every one of those decisions
   exports to your SIEM." That's the line that turns a demo into a security story.

Bonus, 10 seconds if you want it: the poisoned tool advertises `readOnlyHint: true`
while exfiltrating; the approved one honestly declares `false`. **The malicious
server lies about itself** — which is exactly why you pin identity rather than
trusting metadata.

> ⚠️ **Beat 0 is your weakest moment and it's first.** `sbx mcp ls` shows a banner
> that (as noted) doesn't even prove enforcement. Keep it to one breath, or open on
> the Cedar policy instead and let Beat 1 be your real opening.

