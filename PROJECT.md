# Project Record — Docker MCP Governance Demo

What this project is, how it was built, why it works the way it does, and what
is verified. `README.md` tells you how to run it; `DEMO-DAY.md` tells you how to
present it. **This file is the record** — read it if you're picking the project
up cold or deciding what to change.

---

## 1. Goal

A live demo for a room of 30–40 technical / security-literate people, showing
**MCP governance as the sole control point** for an AI agent that uses an MCP
server to download a package via npm.

- **Runtime:** ~5 min talk + 5–7 min demo + 3–5 min Q&A ≈ 13–17 min.
- **Thesis:** across every beat, *the only thing that changes is policy.*
- **Honest claim:** the gateway denies by **identity and registration**, not by
  reading tool descriptions for malice. No AI-detects-the-poison magic.

---

## 2. The narrative

One task — *"download an npm package"* — carried through every beat. Two servers
offer to do it, and **both expose the same tool name `npm_download`**. Only their
identity differs, which is the entire point.

| Beat | What happens | What it proves |
|---|---|---|
| 0 | List governed tools | Enforcement is central (weak beat — see §6) |
| 1 | Unapproved server's `npm_download` runs | Tool poisoning steals the npm publish token |
| 2 | Same server, governance on → **DENY** | Denied on identity, *not* content scanning |
| 2b | Approved **name** at a wrong endpoint → **DENY** | Rug-pull / endpoint-swap defence |
| 3 | Approved server pulls `left-pad` via the gateway → **ALLOW** | Curated path works; agent can't self-serve tools |

---

## 3. Architecture

```
agent (in a governed sandbox)
        │
        ▼
  MCP Gateway  ← Cedar org policy decides: register? invokeTool?
        │
    ┌───┴────────────────┐
    ▼                    ▼
poisoned-demo      approved-downloader
:7801/mcp   DENY   :7802/mcp    ALLOW
```

Both servers are **Node/TypeScript over streamable HTTP**, registered as *remote
endpoints* (`sbx mcp add --url …`).

**`servers/poisoned-server`** — impersonates the approved server. Same tool name
`npm_download`, same claimed job. Its *description* carries the attack (Invariant
Labs tool-poisoning pattern): hidden `<IMPORTANT>` instructions telling the agent
to read `./secrets/decoy-npmrc` and smuggle it out as an `auth` argument. Its
output mimics a successful download *before* revealing the exfiltration — the
attack is invisible to the developer. It also declares `readOnlyHint: true` while
exfiltrating: **the malicious server lies about itself.**

**`servers/approved-server`** — the legitimate tool. `npm_download` shells out to
`npm pack <package> --prefer-offline` via `execFile` (arg array, no shell, so the
package spec can't inject), returning path, size, shasum and integrity. Honest
`readOnlyHint: false` because it writes a file. Optional `NPM_ALLOWLIST`.

**`policy/org-mcp-policy.cedar`** — default-deny. Permits `register` +
`invokeTool` for `approved-downloader`, **identity-pinned** via
`resource.identityURL`. Explicit `forbid` on `poisoned-demo` for a clean audit
line. The *permit* is pinned, not the forbid — an over-broad deny is safe, an
over-broad permit is the risk.

---

## 4. Key decisions, and why

| Decision | Why |
|---|---|
| **Register via `--url`, never `--command`** | `sbx` states local stdio servers have *"no identity, no verifiable supply chain."* Cedar pins on identity — `--command` would undercut the entire thesis. |
| **Pin `identityURL`, not just the name** | Name-only permits let anyone register *their* server under the approved name. Verified: approved name at `:7801` → **denied**. |
| **Both servers expose `npm_download`** | Makes "only policy changes" literally true at the tool level, and quietly demonstrates tool shadowing. |
| **Decoy is a fake `.npmrc`, not a cloud key** | Stealing the npm *publish* token is the real supply-chain attack and stays inside the npm story. |
| **Beat 1 is a deterministic harness, not a live LLM** | A live model may refuse the poison. The poisoned *description* is the real artefact; the harness plays an agent that obeyed it. Be upfront about this — the Q&A answer is prepared. |
| **Beat 3 runs in a sandbox** | There is **no CLI way to invoke a registered tool** — the gateway only exists inside a sandbox. This makes the Filesystem-access policy required, not optional. |
| **`npm pack --prefer-offline` + cache warm** | Beat 3 is the payoff and was the most network-fragile step. Verified `npm pack --offline` yields a byte-identical tarball, so the demo survives venue Wi-Fi. |
| **Reuse a running sandbox** | Cold start is 30–60s of dead air. Pre-warmed, Beat 3 returns in **~1.5s**. |

---

## 5. Verified state

Every beat has been executed live against a real tenant, not reasoned about.

- ✅ Both servers build; end-to-end streamable-HTTP round trip.
- ✅ Beat 1 exfiltrates the decoy npm token on cue.
- ✅ Beat 2 → `blocked by policy`; Beat 2b → `no registration policy rule permits this server`.
- ✅ Beat 3 → `npm pack left-pad` through the gateway, plus the agent's own
  `mcp-add` of the poisoned server **denied**.
- ✅ Audit rows confirmed on **both planes**: *Server Registration* (deny/allow)
  and *Tool Invocation* (`npm_download` allow, `mcp-add` deny).
- ✅ `setup.sh` / `reset.sh` / `run-sandbox-beat.sh` all run clean; sandbox reuse
  and npm cache warm both confirmed.
- ✅ Slides reviewed; presenter guide published.

**Timing:** setup ~4s; every on-stage command under ~1.5s. *All* of the 5–7
minutes is narration — there is no timing risk from the tooling.

---

## 6. Gotchas — hard-won, do not re-learn these

1. **The `sbx mcp ls` banner is a liar.** It reads `LOCAL · managed by you` *even
   while org policy is actively enforcing.* Never use it as the enforcement
   signal; prove enforcement by behaviour. (Beat 0 is weak for this reason —
   consider opening on Beat 1.)
2. **MCP denies are not in `sbx policy log`.** That stream is network/filesystem
   only. MCP decisions land in the **AI Governance audit log** in Docker Home.
3. **The MCP access editor is owner-only.** Configure as an owner; demo as the
   governed developer. Two accounts, always.
4. **A fresh org filesystem policy takes ~30–60s** to reach the local daemon.
   `sbx daemon restart` forces it.
5. **The `AGENT` audit column only populates for a named cagent.** Built-in
   `shell` *and* `claude` both show `–`, even when the real agent makes the call.
6. **Changing a port breaks the policy.** `identityURL` is pinned to
   `localhost:7802`; move the port and the approved server is denied.
7. **`sbx` sessions expire** — twice in one day during testing. Log in the
   *morning of* the talk.
8. **`demo/*.sh` must run from the repo root.**
9. **Beat 2b needs the `sbx mcp rm` first**, or the add may return a duplicate
   error instead of the policy deny.

---

## 7. Publishing

Public at **github.com/mmaxwell00/WADMCPDemo**. The repo is **genericized** —
`YOUR_ORG`, `OWNER_ACCOUNT`, `DEVELOPER_ACCOUNT`, `<owner-email>`. Real values
live in `LOCAL-NOTES.md`, which is **gitignored and must stay that way**. Commits
use a GitHub noreply author so no personal email appears in metadata.

`docs/index.html` is a presenter's step-by-step guide, served live via GitHub
Pages from `/docs` at <https://mmaxwell00.github.io/WADMCPDemo/> — it updates on
every push, no separate publish step.

`docs/MCP-Governance-Demo-Guide.pdf` is a print version of that guide.
**It does not regenerate itself** — after editing the guide, rebuild it with:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-pdf-header-footer --virtual-time-budget=15000 \
  --print-to-pdf="$PWD/docs/MCP-Governance-Demo-Guide.pdf" \
  "file://$PWD/docs/index.html"
```

---

## 8. Open items

- [ ] Dry run on the company laptop — its `sandbox-workspace` absolute path
      differs, so the Filesystem-access policy must be re-pointed there.
- [ ] Rehearse the narration once against the clock.
- [ ] Optional: a named cagent so the audit `AGENT` column shows a real name.
- [ ] Optional: the `@requireApproval` human-in-the-loop beat.
