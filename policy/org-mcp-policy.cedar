// ===========================================================================
// Docker Sandboxes — Organization MCP policy (Cedar, MCP namespace)
// Org: YOUR_ORG   |   Configure as an ORG OWNER in Docker Home →
// AI Platform → MCP access → Create policy.
//
// Semantics (verified live): org MCP policy is default-deny and ADDITIVE — this
// policy unions with any other org policy (e.g. npm-installer-demo). With
// enforcement active, register/invoke with NO matching permit is denied
// ("no registration policy rule permits this server"); a matching `forbid`
// overrides ANY `permit`.
//
// IDENTITY-PINNED: the register permit binds the approved NAME to a specific
// endpoint (identityURL). Verified live — the correct endpoint ALLOWs; the
// approved name at a WRONG endpoint is DENIED, so an endpoint swap under the
// approved name fails policy (the rug-pull defense).
// ===========================================================================

// --- APPROVED SERVER: allow registration (IDENTITY-PINNED) + tool calls ------
permit (
  principal,
  action == MCP::Action::"register",
  resource
)
when {
  resource in MCP::Server::"approved-downloader" &&
  resource.identityURL == "http://localhost:7802/mcp"
};

permit (
  principal,
  action == MCP::Action::"invokeTool",
  resource
)
when { resource in MCP::Server::"approved-downloader" };

// --- POISONED SERVER: explicit, identity-scoped deny ------------------------
// Default-deny already blocks it; this gives an unambiguous audit line and
// demonstrates forbid-overrides-permit.
forbid (
  principal,
  action,
  resource
)
when { resource in MCP::Server::"poisoned-demo" };

// ===========================================================================
// PORTABILITY: identityURL is the exact registration URL. On another machine /
// in production, pin YOUR endpoint here (e.g. https://mcp.company.com/...).
// The demo uses http://localhost:7802/mcp. To confirm the value: register the
// server, then `sbx mcp inspect approved-downloader` (shows it as `url`).
// (The poisoned `forbid` is intentionally by name — an over-broad DENY is safe;
//  an over-broad PERMIT is the risk, which is why only the permit is pinned.)
// ===========================================================================

// ===========================================================================
// OPTIONAL — human-in-the-loop. Swap the plain invokeTool permit for this to
// force a live MCP elicitation before any non-read-only call.
// ===========================================================================
// @requireApproval("Confirm file download from approved server")
// permit (principal, action == MCP::Action::"invokeTool", resource)
// when {
//   resource in MCP::Server::"approved-downloader" &&
//   resource.readOnly == false
// };
