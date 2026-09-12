# Live Demo Runbook — Docker MCP Governance

**Total live-demo budget: 5–7 min.** Everything above "BEAT 0" is done *before*
you present. On stage you run only the numbered commands.

**Ground truth (verified in `YOUR_ORG`, `sbx` v0.42.1):**
- Two identities. **Configure** the org MCP policy signed into Docker Home as the
  **owner** (`<owner-email>` / `OWNER_ACCOUNT`). **Demo** with the
  `sbx` CLI as the governed developer (`DEVELOPER_ACCOUNT`) — it holds an AI Governance
  seat, so its sandboxes fall under the enforced policy.
- Servers are registered as **remote endpoints** (`--url`), so Cedar pins a real
  `identityURL`. (Local `--command` servers have "no identity" — avoid them here;
  they'd undercut the whole thesis.)
- The MCP deny is **NOT** in `sbx policy log` (that's network/filesystem only).
  It surfaces (a) **inline** when the gateway refuses the call, and (b) in the
  **AI Governance audit log in Docker Home** (owner view). Beat 2 uses both.

Golden rule: **all beats run through the gateway; only policy changes.** No
"direct" connections — that drags network policy into the story.

---

## PRE-STAGE (before the room is watching)

```bash
# 1. Build both servers
( cd servers/poisoned-server && npm install && npm run build )
( cd servers/approved-server && npm install && npm run build )

# 2. Start both HTTP MCP servers (leave running; two terminals or use &)
( cd servers/poisoned-server && PORT=7801 npm start )   # poisoned  -> :7801/mcp
( cd servers/approved-server && PORT=7802 npm start )    # approved  -> :7802/mcp

# 3. Smoke-test Beat 1 deterministically (proves the gotcha fires on cue):
( cd servers/poisoned-server && POISONED_URL=http://localhost:7801/mcp npm run harness )
#   → prints the poisoned description + "EXFILTRATION SIMULATED" with the fake npm token.

# 4. As OWNER in Docker Home → AI Platform → MCP access → Create policy:
#    paste policy/org-mcp-policy.cedar and enforce it for the demo user.
#    FIRST: register the approved server once and read its real identity —
( cd servers/approved-server && sbx mcp inspect approved-downloader ) 2>/dev/null
#    grab identityURL, paste the exact value into the Cedar file, then enforce.

# 5. Pre-verify BOTH governed states so nothing is written live (see below),
#    and confirm the deny appears in the Docker Home audit log. Keep that audit
#    view open in a browser tab, pre-scrolled to the latest entries.
```

**Screen layout:** terminal (CLI as `DEVELOPER_ACCOUNT`) + browser tab on the Docker
Home **audit log** (as owner). The audience should see the deny land in both.

---

## BEAT 0 — Establish central enforcement (~20s)

```bash
sbx mcp ls
```
> ⚠️ VERIFIED LIVE: the banner reads `LOCAL · managed by you` **even while org
> policy is actively enforcing** — do NOT claim it flips to org-managed (it
> doesn't). Establish enforcement by **behavior**, not the banner: only
> catalog-approved servers are present/ready, and Beat 2 shows an unapproved one
> denied by org policy. Optional source-of-truth: show the policy in Docker Home
> → AI Platform → MCP access.

---

## BEAT 1 — Ungoverned (~1.5 min)

The poisoned server isn't in the curated catalog / policy not yet applied.

**Reliable path (recommended):** the harness stands in for a compromised agent,
so timing never depends on a live model obeying the poison.
```bash
( cd servers/poisoned-server && POISONED_URL=http://localhost:7801/mcp npm run harness )
```
- Note the tool is called `npm_download` — **the same name the approved server
  uses**, same claimed job. Only the identity differs.
- Read the `<IMPORTANT>` block aloud — *this* is tool poisoning. It asks the agent
  to read the developer's `.npmrc` and pass it along silently.
- The output looks like a normal successful download, then
  `EXFILTRATION SIMULATED` shows the **npm publish token**. "One unvetted server,
  one config line, and the token that lets you publish packages walked out."

**Live-agent path (optional):** register the poisoned server and drive your
agent to call `npm_download`; the poisoned description does the rest.

---

## BEAT 2 — Governed, DENY (~2 min)

Same server, same gateway — org MCP policy enforced (VERIFIED live).
```bash
sbx mcp add poisoned-demo --url http://localhost:7801/mcp --skip-ssrf-check
```
→ **Denied inline.** Exact messages captured in the dry run:
> • with our explicit forbid → `registration denied for MCP server "poisoned-demo": blocked by policy`
> • (default-deny, no forbid) → `... : no registration policy rule permits this server`
>
> "Denied on **identity / registration** — not 'malicious content detected.' The
> gateway never let an unknown server in; it didn't scan the poison."

**Optional Beat 2b — endpoint swap denied (the rug-pull defense, ~30s).** The
permit is IDENTITY-pinned (name + `identityURL`), not name-only. Prove it:
```bash
sbx mcp rm approved-downloader                                                     # evaluate the add fresh
sbx mcp add approved-downloader --url http://localhost:7801/mcp --skip-ssrf-check  # → DENIED
sbx mcp add approved-downloader --url http://localhost:7802/mcp --skip-ssrf-check  # → ALLOW (restores the demo)
```
→ The middle command is refused ("no registration policy rule permits this
server") — the *approved name* pointed at a different endpoint gets no matching
permit.
> "You can't squat the approved name and swap the endpoint underneath it — we
> pin the identity, not just the label. That's the rug-pull class, closed."

⚠️ **The `rm` line matters.** `setup.sh` already registered this name, and an add
over an existing registration may return a name/duplicate error instead of the
policy deny — which would kill the punchline. The deny itself was verified live,
but *with* the `rm` first. **Run this exact three-line sequence in your dry run**
before using it on stage.

**Audit-log payoff — VERIFIED.** Docker Home → AI Platform → **Audit logs**,
set **Event type = Server Registration** (or Decision = Deny). Your CLI deny
lands as a real row:
```
Server Registration │ DEVELOPER_ACCOUNT │ poisoned-demo │ DENY
Server Registration │ DEVELOPER_ACCOUNT │ approved-downloader │ ALLOW
```
Read it: **resource = `poisoned-demo`, decision = DENY** — identity/registration,
no content field. Point out the matching `approved-downloader → ALLOW` for
contrast. (Audited event types also include Tool Invocation, Resource Read,
Prompt, Network Egress, Filesystem Mount — the whole gateway is logged.)

> The **AGENT** column shows `–` for a CLI registration. To populate it with an
> agent name you'd drive the poisoned attempt from an agent inside a sandbox —
> but launching a local sandbox as `DEVELOPER_ACCOUNT` is itself blocked by the
> **Filesystem access** policy (team-scoped to dockerinfosec/callcenteragents;
> no Developers/org mount permit). That's an optional enhancement, and a nice
> bonus point: governance is layered — network, filesystem, AND MCP.

(Explicit `forbid` also demonstrates forbid-overrides-permit; the pre-policy
`approved-downloader → DENY` row shows default-deny before the permit existed.)

**TWO AUDIT PLANES — both verified live in YOUR_ORG:**
- *Registration plane* (Event type = Server Registration): `poisoned-demo → DENY`,
  `approved-downloader → ALLOW`. This is the crispest identity-pinned story.
- *In-sandbox tool plane* (Event type = Tool Invocation): drive it from an agent
  in a governed sandbox (see the in-sandbox recipe below). Verified rows:
  `approved-downloader:npm_download → ALLOW` and the agent's `mcp-add` attempt to
  pull in the poisoned server → `DENY` ("policy denied /mcp-add: implicit").
  The gateway locks down dynamic server-add; only curated servers are available.

> **AGENT column:** VERIFIED — shows `–` for built-in agents (`shell` AND
> `claude`, even when the real claude agent itself makes the tool call). It is
> populated ONLY by a named **cagent** — that's why your Victoria rows read
> "Victoria". So either accept `–` (the row still shows principal + resource +
> decision, which is the substance), or drive Beat 3 through a named cagent to
> get a name on screen. Built-in `sbx run claude`/`shell` will NOT populate it.

### In-sandbox recipe (agent-attributed beats) — VERIFIED
Requires an org **Filesystem access** allow rule (READ+WRITE) for this laptop's
absolute `sandbox-workspace` path — you create it; see `DEMO-DAY.md` §A2.2.
`demo/run-sandbox-beat.sh` does all of the below for you; the raw steps are:
```bash
REPO="$(pwd)"    # run from the repo root
sbx run shell -d --name gov-demo "$REPO/sandbox-workspace"
sbx mcp load approved-downloader --sandbox gov-demo          # attach approved to the gateway
sbx exec gov-demo -- node "$REPO/sandbox-workspace/gateway-client.mjs"
#   → lists gateway tools, calls npm_download → pulls left-pad (ALLOW), attempts mcp-add poisoned (DENY)
```
Inside the sandbox the gateway is `MCP_GATEWAY_URL=http://mcp-gateway.docker.internal/mcp`.
Note: a fresh org fs policy can take ~30–60s to reach the local daemon
(`sbx daemon restart` forces it); retry the `sbx run` if the first mount is denied.

---

## BEAT 3 — Governed, ALLOW (~2–2.5 min)

An agent **inside a governed sandbox** calls `npm_download` through the gateway —
the requirement's "download a file via npm":
```bash
demo/run-sandbox-beat.sh shell gov-demo
```
→ `npm pack left-pad` returns the tarball path, size, shasum + integrity. The same
run also shows the agent's `mcp-add` of the poisoned server **denied**.

Audit log (**Event type = Tool Invocation**):
`approved-downloader:npm_download → ALLOW` and `mcp-add → DENY`.
> "Same agent, same gateway. An unvetted npm-wrapping server was blocked at the
> door; the curated one pulls the package and every call is logged. One
> chokepoint: authenticated, authorized, logged."

**Prereq:** the org **Filesystem access** policy must allow this laptop's
`sandbox-workspace` absolute path (`DEMO-DAY.md` §A2.2). There is no CLI way to
invoke a registered tool outside a sandbox — the gateway only exists inside one,
which is why Beat 3 is the sandbox path.

---

## WRAP (~30s)

> "Tool shadowing, rug pulls, over-broad token scopes — same identity-pinned
> registration model covers all four. We demoed poisoning live; the mechanism is
> identical for the rest. Not AI-detects-the-poison magic — a curated,
> default-deny catalog with a full audit trail."

---

## TRIM PLAN (if Beat 2 runs long)
Beat 3 collapses to: one `npm_download` call → point at the single allow entry.
Do **not** cut Beat 2's audit read — the deny line is the whole point.

## FAILURE FALLBACKS
- Live agent won't obey the poison → use the harness (pre-tested).
- Beat 2 didn't deny → the MCP policy isn't enforced for your developer account;
  confirm the policy exists and that the account holds an AI Governance seat.
  **Never use the `sbx mcp ls` banner as your enforcement signal** — it reads
  "managed by you" whether or not org policy is enforcing.
- Sandbox `mount policy denied` → filesystem policy path ≠ this laptop's
  `sandbox-workspace`; or wait ~60s / `sbx daemon restart`.
- `npm pack` hangs then errors → no npm-registry access from this network.
- `identityURL` mismatch → the pinned value must equal what `sbx mcp inspect`
  reports; re-paste and re-enforce.
- Audit entry slow to appear → have a screenshot from your dry run ready.
