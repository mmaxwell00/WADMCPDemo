# Cedar MCP policy — configure & verify

## Who configures it, who demos it
- **Configure (owner only):** the MCP access editor is visible only to org
  **owners**. In `YOUR_ORG` that's **`OWNER_ACCOUNT`
  (<owner-email>)**. Sign into [Docker Home](https://app.docker.com)
  as that account → **AI Platform → MCP access → Create policy**.
- **Demo (governed developer):** run the `sbx` CLI as **`DEVELOPER_ACCOUNT`**. It holds
  an AI Governance seat (Members → Licenses: AI Governance 2/5 assigned), so its
  sandboxes are subject to the enforced org policy.

> The `DEVELOPER_ACCOUNT` account is a **Developer**, not an owner — which is why the
> MCP access editor doesn't appear when you're signed in as it. That's expected;
> configure as the owner, demo as the developer.

## 1. Pin real identities (do this before pasting the policy)
The servers are remote endpoints, so Cedar can pin `identityURL`. Register the
approved server once and read its actual identity:
```bash
sbx mcp add approved-downloader --url http://localhost:7802/mcp --skip-ssrf-check
sbx mcp inspect approved-downloader     # copy the identityURL it reports
```
Paste that exact `identityURL` into `org-mcp-policy.cedar` (and the poisoned
server's, `http://localhost:7801/mcp`, if it differs from the assumed value).

## 2. Load & enforce
As owner: **AI Platform → MCP access → Create policy**, paste
`org-mcp-policy.cedar`, and enforce it for the demo user/org.

## 3. Verify both states before you present
```bash
# Beat 0 banner — should flip to org-managed once enforced for DEVELOPER_ACCOUNT
sbx mcp ls
# Deny (poisoned)
sbx mcp add poisoned-demo --url http://localhost:7801/mcp --skip-ssrf-check   # → denied
# Allow (approved) already registered in step 1; confirm a tool call succeeds
```
✅ `sbx mcp ls` shows org-managed governance (not "managed by you").
✅ Poisoned add is **denied**; the audit entry's `deny_reason` references
   **identity/registration**, not content scanning.
✅ Approved register + `npm_download` (npm pack) is **allowed** and logged.

## Where the MCP decision is audited (Beat 2's payoff)
Not in `sbx policy log` — that stream is **network/filesystem only**
(`--type all|network|filesystem`). MCP allow/deny decisions land in the
**AI Governance audit log** in Docker Home (owner view): fields include
`audit_event_id, timestamp, category, decision, username, org_id, action_type,
deny_reason` (metadata only — no prompt or parameter content). Exportable to
CSV / SIEM / JSON Lines. Recorded only for licensed users under an enforced org
policy — which `YOUR_ORG` has (AI Governance, 5 seats, active).
