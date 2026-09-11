# Talking-Points Script — 5 min (pre-demo)

> Delivery notes: named-not-walked. You are setting up *why the chokepoint
> matters*, not teaching MCP internals. Keep it to time; the demo is the proof.

## 1. Adoption risk — 30s
> "Here's how most orgs onboard an MCP server today: a README, a config block,
> a token. No review, no version pinning, no provenance check. You paste it in
> and your agent trusts it completely. We normalized `curl | bash` for AI tools
> and called it developer experience."

## 2. The four attack classes — named, not walked — 90s
One sentence each. Cite sources for credibility, then move on.
- **Tool poisoning** — hidden instructions in a tool *description* steer the
  agent into leaking secrets or misusing other tools. *(Invariant Labs, "MCP
  Security Notification: Tool Poisoning Attacks," April 2025 — the canonical
  public example; ⚠️ confirm the exact OWASP MCP Top-10 identifier before you
  put "MCP03:2025" on a slide.)*
- **Tool shadowing** — a malicious server redefines or overrides a trusted
  tool, so calls you think are going to the good tool hit the bad one.
- **Rug pulls** — a server behaves during review, then swaps its behavior after
  it's approved and trusted.
- **Over-broad token scopes** — the agent hands a server credentials far
  wider than the task needs; one compromised server, blast radius everywhere.

## 3. The chokepoint pitch — 90s
> "You don't solve four different problems four different ways. You put **one
> control point** in front of every MCP interaction — a gateway where every
> registration and every call is **authenticated, authorized, and logged**.
> A curated catalog of servers you've actually vetted. Default-deny on anything
> you haven't. The agent gets one endpoint; the org gets policy and an audit
> trail."

Key honesty beat (say it out loud — a security room will respect it):
> "And to be precise: this governs by **identity and registration**, not by
> reading tool descriptions for bad intent. No AI-detects-the-poison magic.
> The unvetted server is stopped because it was never let in — which is a
> stronger, more auditable guarantee than hoping a scanner catches the payload."

## 4. Bridge into the demo — 30s
> "So let's watch it. First ungoverned — an unvetted server poisons the agent
> and a secret walks out. Then the same server through the governed gateway —
> denied on identity. Then an approved server doing the same kind of work —
> allowed and logged. The only thing that changes is policy."

→ go to `runbook.md`, Beat 0.

---

### Citations to verify before slides
- Invariant Labs, *MCP Security Notification: Tool Poisoning Attacks* (Apr 2025).
- OWASP MCP Top-10 tool-poisoning entry — **verify the exact ID/edition**; the
  "MCP03:2025" numbering may be community, not canonical OWASP.
- Docker docs: MCP access policies, network policies, governance, audit logging
  (docs.docker.com/ai/sandboxes/governance/…).
