# Cedar MCP policy — configure & verify

> **Prerequisite:** your org must have the **Docker AI Governance** licence.
> Without it there is no MCP access editor and no audit log.

## Who configures it, who demos it
- **Configure (owner only):** the MCP access editor is visible only to org
  **owners** (`OWNER_ACCOUNT` / `<owner-email>`). Sign into
  [Docker Home](https://app.docker.com) as an owner →
  **AI Platform → MCP access → Create policy**.
- **Demo (governed developer):** run the `sbx` CLI as `DEVELOPER_ACCOUNT`. That
  account must hold an **AI Governance seat** (Docker Home → Members → Licenses)
  or its sandboxes won't be governed and the demo won't deny anything.

> The developer account is **not** an owner — which is why the MCP access editor
> doesn't appear when you're signed in as it. That's expected: configure as the
> owner, demo as the developer.

## 1. Pin the real identity (before pasting the policy)
The servers are remote endpoints, so Cedar can pin `identityURL`. Register the
approved server once and read its actual identity:
```bash
sbx mcp add approved-downloader --url http://localhost:7802/mcp --skip-ssrf-check
sbx mcp inspect approved-downloader     # note the url it reports
```
Paste that exact value into the `identityURL` clause in `org-mcp-policy.cedar`.

> ⚠️ If you ever change the approved server's **port**, you must update this
> pinned `identityURL` too — otherwise `approved-downloader` will be **denied**.

## 2. Create the policy
As owner: **AI Platform → MCP access → Create policy**, paste
`org-mcp-policy.cedar` (Organization scope).

You also need a **Filesystem access** policy allowing READ+WRITE on this laptop's
absolute `sandbox-workspace` path — Beat 3 mounts it. See `DEMO-DAY.md` §A2.2.

## 3. Verify before you present
```bash
# Deny (poisoned)
sbx mcp add poisoned-demo --url http://localhost:7801/mcp --skip-ssrf-check   # → denied
# Allow (approved) — registered in step 1
sbx mcp ls
```
✅ Poisoned add is **denied**; the audit row shows `poisoned-demo → DENY` under
   **Event type = Server Registration** — identity/registration, not content scanning.
✅ Approved register is **allowed**, and `npm_download` (npm pack) succeeds and is
   logged under **Event type = Tool Invocation** when you run Beat 3.

> ⚠️ **Do not use the `sbx mcp ls` banner to confirm enforcement.** It reads
> `LOCAL · managed by you` *even while org policy is actively enforcing*. Prove
> enforcement by behavior: the poisoned add is denied.

## Where the MCP decision is audited (Beat 2's payoff)
Not in `sbx policy log` — that stream is **network/filesystem only**
(`--type all|network|filesystem`). MCP allow/deny decisions land in the
**AI Governance audit log** in Docker Home (owner view): fields include
`audit_event_id, timestamp, category, decision, username, org_id, action_type,
deny_reason` (metadata only — no prompt or parameter content). Exportable to
CSV / SIEM / JSON Lines. Recorded only for licensed users under an enforced
organization policy.
