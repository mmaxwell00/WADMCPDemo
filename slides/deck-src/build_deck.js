// build_deck.js — Docker-branded (blue palette) screenshot deck for the MCP
// governance demo. One slide per captured beat (screenshots/png/*.png), with
// on-slide talking points and full presenter notes.
//
// Run from this folder:   node build_deck.js
// QA:                     bash render_qa.sh ../MCP-Governance-Demo-Screenshots.pptx
try {
  const root = require("child_process").execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] })
    .toString().split(/\r?\n/).map(s => s.trim()).find(l => l.endsWith("node_modules"));
  if (root && !module.paths.includes(root)) module.paths.push(root);
} catch (_) {}
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const ASSETS = path.join(__dirname, "assets") + "/";
const SHOTS = path.resolve(__dirname, "../../screenshots/png") + "/";
const OUT = path.resolve(__dirname, "../MCP-Governance-Demo-Screenshots.pptx");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Docker";
pres.title = "Docker MCP Governance — Demo (screenshot edition)";
const T = require("./theme")(pres, ASSETS, "blue");
const N = require("./native")(pres, T);
const { P } = N, OK = N.C.OK, DANGER = N.C.DANGER, WARN = N.C.WARN;
const MONO = "Courier New";

// Pixel sizes of the captures (from sips), used to keep aspect ratios exact.
const PX = {
  "beat0-mcp-ls.png": [3200, 688], "beat1-harness.png": [3200, 2524],
  "beat2-deny.png": [3200, 892], "beat2b-rm.png": [3200, 416],
  "beat2b-swap-deny.png": [3200, 892], "beat2b-restore-allow.png": [3200, 892],
  "beat3-sandbox.png": [3200, 2796],
  "audit-server-registration.png": [1840, 365], "audit-tool-invocation.png": [1840, 185],
};
for (const f of Object.keys(PX)) if (!fs.existsSync(SHOTS + f)) throw new Error("missing screenshot " + SHOTS + f);

// Framed screenshot: a soft glowing card behind the image. Returns the image height.
function shot(s, file, x, y, w) {
  const [pw, ph] = PX[file], h = w * ph / pw, pad = 0.08;
  N.card(s, x - pad, y - pad, w + 2 * pad, h + 2 * pad, { soft: true, fill: "061B44", trans: 10, rad: 0.12 });
  s.addImage({ path: SHOTS + file, x, y, w, h });
  return h;
}
// Command line shown on the slide, in monospace, prefixed with a green prompt.
function cmdline(s, cmd, x, y, w, size = 12.5) {
  s.addText([
    { text: "$ ", options: { color: OK, bold: true, fontFace: MONO } },
    { text: cmd, options: { color: P.WHITE, fontFace: MONO } },
  ], { x, y, w, h: 0.38, fontSize: size, margin: 0, valign: "middle" });
}
// Beat header: kicker (BEAT n · time), one-line title, optional tagline.
function header(s, kicker, titleRuns, tagline) {
  N.label(s, kicker, 0.62, 0.42, 8, { size: 12.5 });
  N.title(s, titleRuns, { y: 0.68, size: 27, w: 12.1 });
  if (tagline) N.txt(s, tagline, 0.62, 1.32, 12.1, 0.36, { fontSize: 13.5, italic: true, color: P.ACCENT_LIGHT });
}
// Verdict pill (DENY / ALLOW / LEAK) at the top-right of a slide.
function verdict(s, text, color, x = 10.9, y = 0.45) {
  s.addShape(N.RR(), { x, y, w: 1.85, h: 0.5, rectRadius: 0.25, fill: { color: "061B44", transparency: 10 }, line: { color, width: 1.5 }, shadow: T.glowSoft() });
  s.addText(text, { x, y, w: 1.85, h: 0.5, align: "center", valign: "middle", fontFace: T.FONT, fontSize: 13, bold: true, color, margin: 0 });
}

// ---------------------------------------------------------------------------
// 1) TITLE
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  T.logo(s, 0.6, 0.55, 2.3);
  N.label(s, "DOCKER SANDBOXES · MCP GATEWAY · AI GOVERNANCE", 0.62, 2.35, 9, { size: 13 });
  s.addShape(N.RR(), { x: 0.62, y: 2.77, w: 1.1, h: 0.05, rectRadius: 0.02, fill: { color: P.ACCENT }, line: { color: P.ACCENT, width: 0 }, shadow: T.glowSoft() });
  N.title(s, [{ text: "MCP governance, " }, { text: "live", accent: true }], { y: 3.0, size: 44, w: 10 });
  N.txt(s, "One task: download an npm package. Two servers offer to do it. The only thing that changes between beats is policy.",
    0.62, 4.15, 9.6, 1.0, { fontSize: 17, color: P.ACCENT_LIGHT });
  let cx = 0.62;
  ["Tool poisoning", "Identity-pinned Cedar policy", "Default-deny gateway", "Audit trail to SIEM"].forEach(c => { cx += N.chip(s, c, cx, 5.6, { size: 11 }) + 0.18; });
  N.badge(s, "ic_shield.png", 10.75, 2.9, 1.95);
  s.addNotes(
    "OPENING (30s)\n" +
    "Say: Here is how most orgs onboard an MCP server today: a README, a config block, a token. No review, no version pinning, no provenance check. We normalized curl | bash for AI tools and called it developer experience.\n\n" +
    "THE THESIS\n" +
    "One control point in front of every MCP interaction: a gateway where every registration and every call is authenticated, authorized, and logged. Default-deny on anything not vetted.\n\n" +
    "HONESTY BEAT (say it out loud)\n" +
    "This governs by identity and registration, not by reading tool descriptions for bad intent. No AI-detects-the-poison magic. The unvetted server is stopped because it was never let in.\n\n" +
    "FORMAT NOTE\n" +
    "This edition uses screenshots captured from a real run (sbx v0.42.1, 2026-09-14) instead of typing live. Every command on these slides is the exact command that produced the output shown.");
})();

// ---------------------------------------------------------------------------
// 2) ARCHITECTURE — native diagram
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  header(s, "THE SETUP", [{ text: "Same tool name, two identities, " }, { text: "one gateway", accent: true }],
    "Both servers expose npm_download. Only their identity differs. That is the entire point.");
  const y = 2.2, h = 3.0;
  // Agent
  N.card(s, 0.6, y, 3.2, h, {});
  N.badge(s, "ic_robot.png", 0.6 + (3.2 - 0.7) / 2, y + 0.3, 0.7);
  N.txt(s, "Agent in a governed sandbox", 0.7, y + 1.15, 3.0, 0.4, { fontSize: 14, bold: true, color: P.WHITE, align: "center" });
  N.txt(s, "Sees one endpoint only:\nmcp-gateway.docker.internal", 0.7, y + 1.6, 3.0, 0.7, { fontSize: 11.5, color: P.SUB, align: "center" });
  N.txt(s, "cannot self-serve tools", 0.7, y + 2.4, 3.0, 0.35, { fontSize: 11, italic: true, color: P.ACCENT_LIGHT, align: "center" });
  N.op(s, "→", 3.83, y, h, 24);
  // Gateway
  N.card(s, 4.4, y, 3.7, h, { hi: true });
  N.badge(s, "ic_policy.png", 4.4 + (3.7 - 0.7) / 2, y + 0.3, 0.7);
  N.txt(s, "MCP Gateway + Cedar org policy", 4.5, y + 1.15, 3.5, 0.4, { fontSize: 14, bold: true, color: P.WHITE, align: "center" });
  N.bullets(s, [{ m: "?", mc: P.ACCENT, t: "register this server?" }, { m: "?", mc: P.ACCENT, t: "invoke this tool?" }, { m: "✓", mc: OK, t: "every decision audited" }], 4.85, y + 1.65, 3.1, 1.2, { size: 11.5, space: 3 });
  N.op(s, "→", 8.13, y, h, 24);
  // Two servers
  const sw = 4.05, sh = 1.38, sx = 8.68;
  N.card(s, sx, y, sw, sh, { danger: true, trans: 35 });
  N.txt(s, "poisoned-demo", sx + 0.2, y + 0.15, sw - 0.4, 0.35, { fontSize: 13.5, bold: true, color: P.WHITE });
  N.txt(s, "localhost:7801/mcp · unvetted · same tool name, poisoned description", sx + 0.2, y + 0.5, sw - 1.35, 0.7, { fontSize: 10.5, color: P.SUB });
  N.txt(s, "DENY", sx + sw - 1.1, y + 0.45, 0.9, 0.5, { fontSize: 15, bold: true, color: DANGER, align: "center", valign: "middle" });
  N.card(s, sx, y + h - sh, sw, sh, { hi: true });
  N.txt(s, "approved-downloader", sx + 0.2, y + h - sh + 0.15, sw - 0.4, 0.35, { fontSize: 13.5, bold: true, color: P.WHITE });
  N.txt(s, "localhost:7802/mcp · registered by URL · permit pinned to identityURL", sx + 0.2, y + h - sh + 0.5, sw - 1.35, 0.7, { fontSize: 10.5, color: P.SUB });
  N.txt(s, "ALLOW", sx + sw - 1.1, y + h - sh + 0.45, 0.9, 0.5, { fontSize: 15, bold: true, color: OK, align: "center", valign: "middle" });
  N.callout(s, "note", "Golden rule", "All beats go through the gateway. The only variable is policy.", { y: 5.55, h: 0.8 });
  N.logo(s);
  s.addNotes(
    "WHAT THIS SHOWS\n" +
    "Two Node/TypeScript MCP servers over streamable HTTP, both exposing a tool named npm_download. poisoned-demo (:7801) carries a tool-poisoning payload in its description. approved-downloader (:7802) runs npm pack via execFile, no shell.\n\n" +
    "HOW IT WORKS\n" +
    "Servers are registered with sbx mcp add --url, so Cedar can pin a real identityURL. The org MCP policy is default-deny: permit register + invokeTool for approved-downloader when identityURL == http://localhost:7802/mcp; explicit forbid on poisoned-demo. A forbid overrides any permit.\n\n" +
    "WHY --url AND NOT --command\n" +
    "Local stdio servers have no identity and no verifiable supply chain. Pinning identity is the whole thesis, so --command would undercut it.\n\n" +
    "ANTICIPATED Q&A\n" +
    "Q: Where is the policy configured? A: Docker Home, AI Platform, MCP access, by an org owner. The developer account holding an AI Governance seat is governed by it.\n" +
    "Q: Is this the Docker MCP Toolkit gateway? A: It is the gateway inside a Docker Sandbox (sbx). Say gateway plus org policy; do not overclaim product names.");
})();

// ---------------------------------------------------------------------------
// 3) BEAT 0 — sbx mcp ls (wide screenshot on top, points below)
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  header(s, "BEAT 0 · ~20 SECONDS", [{ text: "Establish the " }, { text: "central control point", accent: true }],
    "The gateway shows exactly which servers a sandbox may talk to.");
  cmdline(s, "sbx mcp ls", 0.62, 1.78, 8);
  const ih = shot(s, "beat0-mcp-ls.png", 0.9, 2.3, 11.5);
  const by = 2.3 + ih + 0.35;
  N.bullets(s, [
    { b: "approved-downloader is present as remote http, ready.", t: "  It was registered by URL, which is what gives it an identity to pin." },
    { b: "The banner does not prove enforcement.", t: "  It reads managed by you even while org policy is enforcing. Prove it by behavior in Beats 2 and 3." },
    { b: "Keep this to one breath.", t: "  It is the weakest moment and it is first. The real opening is Beat 1." },
  ], 0.85, by, 11.7, 6.85 - by, { size: 13, space: 6 });
  N.logo(s);
  s.addNotes(
    "WHAT THIS SHOWS\n" +
    "The registered MCP servers this developer's sandboxes can reach through the gateway. approved-downloader is the curated server for this demo.\n\n" +
    "SAY\n" +
    "One endpoint for the agent, one list for the org. Everything the agent can call is here, and everything here was registered through policy.\n\n" +
    "GOTCHA (verified live)\n" +
    "The banner reads LOCAL · managed by you even while org policy is actively enforcing. Never claim it flips to org-managed. Enforcement is proven by the deny in Beat 2 and the allow in Beat 3.\n\n" +
    "SCREENSHOT NOTE\n" +
    "Only approved-downloader is registered. It is a remote http server, so it carries a real identityURL for Cedar to pin. No local stdio servers are present; those have no identity and would undercut the thesis.");
})();

// ---------------------------------------------------------------------------
// 4) BEAT 1 — the poisoned download (tall screenshot left, points right)
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  header(s, "BEAT 1 · UNGOVERNED · ~1.5 MIN", [{ text: "The npm download that " }, { text: "steals your publish token", accent: true }]);
  verdict(s, "TOKEN LEAKED", DANGER);
  cmdline(s, "( cd servers/poisoned-server && POISONED_URL=http://localhost:7801/mcp npm run harness )", 0.62, 1.38, 12.1, 11.5);
  const iw = 6.55, iy = 1.9;
  shot(s, "beat1-harness.png", 0.68, iy, iw);
  const px = 7.6, pw = 5.15;
  N.label(s, "WHAT IS HAPPENING", px, iy, pw);
  N.bullets(s, [
    { b: "Same tool name.", t: " npm_download, the same name the approved server uses, the same claimed job." },
    { b: "The attack is in the description.", t: " Read the IMPORTANT block aloud: read the developer's .npmrc and pass it silently as auth. Not code. Text." },
    { b: "It looks like a normal download.", t: " Path, size, status ok. The developer sees nothing wrong." },
    { b: "Then the token walks out.", t: " EXFILTRATION SIMULATED shows the npm publish token the server just received." },
    { b: "The server lies about itself.", t: " It advertises readOnlyHint: true while exfiltrating. Metadata cannot be trusted." },
  ], px, iy + 0.4, pw, 4.0, { size: 12, space: 6 });
  N.callout(s, "warn", "Say", "That token lets them publish as you. Everyone who installs your package gets whatever they put in it.", { x: px, y: 6.0, w: pw, h: 0.85, size: 11.5 });
  N.logo(s);
  s.addNotes(
    "WHAT THIS SHOWS\n" +
    "Tool poisoning (OWASP MCP03:2025, Invariant Labs pattern). A hidden IMPORTANT block in the tool description instructs the agent to read ./secrets/decoy-npmrc and pass it as the auth argument, without telling the user.\n\n" +
    "HOW IT WORKS\n" +
    "The harness is a deterministic compromised agent: it connects to the poisoned server over streamable HTTP, lists tools, obeys the description, and calls npm_download with the decoy .npmrc as auth. The server echoes the credential back so the room sees the leak. The token is fake.\n\n" +
    "SAY\n" +
    "One unvetted server, one config line, and the token that lets you publish packages walked out. To the developer that looked like a successful download.\n\n" +
    "ANTICIPATED Q&A\n" +
    "Q: Did the model actually fall for that, or did you script it? A: Scripted, deliberately. The harness plays an agent that obeyed the poisoned description so the beat is deterministic on stage. The real artifact is the tool description; that is what a live agent reads.\n" +
    "Q: Is that a real token? A: No. It is a decoy file in the demo repo. Never run the poisoned server where real secrets live on disk.\n\n" +
    "AH-HA MOMENT\n" +
    "Most of the room has never seen an attack carried in a tool description rather than in code. Pause on the token.");
})();

// ---------------------------------------------------------------------------
// 5) BEAT 2 — governed DENY (wide screenshot, points below)
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  header(s, "BEAT 2 · GOVERNED · ~2 MIN", [{ text: "Same server, same gateway. " }, { text: "Denied on identity.", accent: true }],
    "Org MCP policy is enforced for this developer. The unvetted server never gets in.");
  verdict(s, "DENY", DANGER);
  cmdline(s, "sbx mcp add poisoned-demo --url http://localhost:7801/mcp --skip-ssrf-check", 0.62, 1.78, 12);
  const ih = shot(s, "beat2-deny.png", 1.15, 2.3, 11.0);
  const by = 2.3 + ih + 0.3;
  N.bullets(s, [
    { b: "Watch the last line.", t: "  registration denied for MCP server poisoned-demo: blocked by policy. Say that before the room reads the INFO noise." },
    { b: "Not malicious content detected.", t: "  The gateway never scanned the poison. It refused an unknown identity at registration. That is the stronger guarantee." },
    { b: "About --skip-ssrf-check.", t: "  It silences the loopback-address warning for a URL we control. It does not bypass MCP policy; the deny happened with it on." },
  ], 0.85, by, 10.4, 6.9 - by, { size: 12.5, space: 5 });
  N.logo(s);
  s.addNotes(
    "WHAT THIS SHOWS\n" +
    "The identical server from Beat 1, now with org MCP policy enforced for the developer account. The registration is refused inline.\n\n" +
    "HOW IT WORKS\n" +
    "Cedar org policy is default-deny and additive. The explicit forbid on MCP::Server::\"poisoned-demo\" gives the message blocked by policy. Without the forbid, default-deny would say: no registration policy rule permits this server.\n\n" +
    "SAY\n" +
    "Denied on identity and registration, not on malicious content detected. The gateway never let an unknown server in; it did not scan the poison. People expect an AI scanner. Tell them it is identity, and that this is the stronger, more auditable guarantee.\n\n" +
    "AUDIT PAYOFF\n" +
    "Docker Home, AI Platform, Audit logs, Event type = Server Registration: a real row reading poisoned-demo, DENY, next to approved-downloader, ALLOW. See the audit slide.\n\n" +
    "ANTICIPATED Q&A\n" +
    "Q: Why --skip-ssrf-check? A: sbx flags registrations whose host resolves to a loopback or private address. The demo servers are on localhost, so the flag silences expected noise for a URL we control. It does not bypass policy. You would not use it for a third-party server.\n" +
    "Q: Where do MCP denies show up locally? A: Not in sbx policy log, which is network and filesystem only. MCP decisions land in the AI Governance audit log in Docker Home.");
})();

// ---------------------------------------------------------------------------
// 6) BEAT 2b — endpoint swap (three stacked screenshots left, points right)
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  header(s, "BEAT 2b · THE RUG-PULL DEFENSE · ~30 SECONDS", [{ text: "Approved name, wrong endpoint. " }, { text: "Still denied.", accent: true }]);
  verdict(s, "DENY", DANGER, 9.0);
  verdict(s, "ALLOW", OK, 10.9);
  const iw = 5.7, ix = 0.68; let iy = 1.45;
  const files = ["beat2b-rm.png", "beat2b-swap-deny.png", "beat2b-restore-allow.png"];
  const caps = ["1  evaluate the add fresh", "2  approved name at :7801  →  DENIED", "3  approved name at :7802  →  ALLOW (restores the demo)"];
  files.forEach((f, i) => {
    N.label(s, caps[i], ix, iy, iw, { size: 10.5, color: i === 1 ? DANGER : (i === 2 ? OK : P.ACCENT) });
    iy += 0.3;
    iy += shot(s, f, ix, iy, iw) + 0.24;
  });
  const px = 6.95, pw = 5.8;
  N.label(s, "WHAT IS HAPPENING", px, 1.45, pw);
  N.bullets(s, [
    { b: "The permit is identity-pinned.", t: " Name plus identityURL, not name only. The approved name pointed at :7801 matches no permit." },
    { b: "no registration policy rule permits this server.", t: " That is default-deny doing its job on the middle command." },
    { b: "You cannot squat the approved name", t: " and swap the server underneath it. That is the rug-pull class, closed." },
    { b: "Step 3 restores the real server", t: " at :7802 and the add is allowed, so the demo continues." },
  ], px, 1.85, pw, 3.6, { size: 12, space: 6 });
  N.callout(s, "tip", "Why step 1 matters", "setup.sh already registered the name. Without the rm, the add can fail as a duplicate instead of a policy deny, which kills the punchline.", { x: px, y: 5.55, w: pw, h: 1.1, size: 11 });
  N.logo(s);
  s.addNotes(
    "WHAT THIS SHOWS\n" +
    "Identity pinning. The Cedar permit for approved-downloader requires resource.identityURL == http://localhost:7802/mcp. Registering the approved name at :7801 gets no matching permit and default-deny refuses it.\n\n" +
    "THE THREE COMMANDS\n" +
    "1. sbx mcp rm approved-downloader  (so the add is evaluated fresh)\n" +
    "2. sbx mcp add approved-downloader --url http://localhost:7801/mcp --skip-ssrf-check  (DENIED)\n" +
    "3. sbx mcp add approved-downloader --url http://localhost:7802/mcp --skip-ssrf-check  (ALLOW, restores the demo)\n\n" +
    "SAY\n" +
    "You cannot squat the approved name and swap the endpoint underneath it. We pin the identity, not the label. That is the rug-pull class, closed.\n\n" +
    "DESIGN NOTE\n" +
    "Only the permit is pinned; the forbid on poisoned-demo is by name. An over-broad deny is safe; an over-broad permit is the risk.\n\n" +
    "CUT ORDER\n" +
    "If running long, drop this beat first. Keep it for a security room; they get the rug-pull implication instantly and it is the cheapest big win.");
})();

// ---------------------------------------------------------------------------
// 7) BEAT 3 — governed ALLOW inside a sandbox (tall screenshot left, points right)
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  header(s, "BEAT 3 · GOVERNED · ~2 MIN", [{ text: "The real download, " }, { text: "allowed and logged", accent: true }]);
  verdict(s, "ALLOW", OK, 9.0);
  verdict(s, "DENY", DANGER, 10.9);
  cmdline(s, "demo/run-sandbox-beat.sh shell gov-demo", 0.62, 1.38, 8);
  const iw = 6.15, iy = 1.9;
  shot(s, "beat3-sandbox.png", 0.68, iy, iw);
  const px = 7.25, pw = 5.5;
  N.label(s, "WHAT IS HAPPENING", px, iy, pw);
  N.bullets(s, [
    { b: "An agent inside a governed sandbox", t: " talks only to the gateway at mcp-gateway.docker.internal. The approved server is loaded into that gateway." },
    { b: "npm_download runs npm pack left-pad.", t: " Tarball path, size, shasum and integrity come back. A real download of a real package." },
    { b: "The agent tries to add the poisoned server itself", t: " via the gateway's mcp-add tool and gets policy denied /mcp-add: implicit. The agent cannot shop for tools." },
    { b: "Both decisions are audited", t: " under Event type = Tool Invocation: npm_download ALLOW, mcp-add DENY." },
  ], px, iy + 0.4, pw, 3.7, { size: 12, space: 6 });
  N.callout(s, "note", "Say", "Same agent, same gateway. The unvetted server was blocked at the door; the curated one pulled the package, and every call is logged.", { x: px, y: 6.0, w: pw, h: 0.85, size: 11.5 });
  N.logo(s);
  s.addNotes(
    "WHAT THIS SHOWS\n" +
    "The curated path works. An agent in a governed sandbox calls npm_download through the gateway and gets left-pad-1.3.0.tgz with shasum and sha512 integrity. In the same run its own attempt to register the poisoned server via mcp-add is denied.\n\n" +
    "HOW IT WORKS\n" +
    "run-sandbox-beat.sh launches (or reuses) the gov-demo sandbox on the sandbox-workspace folder, runs sbx mcp load approved-downloader --sandbox gov-demo, then sbx exec runs gateway-client.mjs inside. That client lists gateway tools, calls npm_download, then calls the gateway's mcp-add primordial with the poisoned URL. The gateway refuses: policy denied /mcp-add: implicit.\n\n" +
    "WHY A SANDBOX\n" +
    "There is no CLI way to invoke a registered tool outside a sandbox; the gateway only exists inside one. That also means the org Filesystem access policy must allow the workspace path (on this laptop it lives under ~/sandboxes, which the org already allows).\n\n" +
    "SAY\n" +
    "Same agent, same gateway. An unvetted npm-wrapping server was blocked at the door; the curated one pulls the package and every call is logged. One chokepoint: authenticated, authorized, logged.\n\n" +
    "THE LINE THAT TURNS A DEMO INTO A SECURITY STORY\n" +
    "Every one of those decisions exports to your SIEM.\n\n" +
    "ANTICIPATED Q&A\n" +
    "Q: Why does the AGENT column show a dash? A: Built-in shell and claude agents show a dash; only a named cagent populates it. The row still carries principal, resource and decision.\n" +
    "Q: What about network egress? A: npm pack runs on the approved server, not in the sandbox, so sandbox network policy is not in play here. Keep the story on MCP policy.\n" +
    "Q: Does it survive bad Wi-Fi? A: npm pack uses --prefer-offline and the cache was warmed, so yes.");
})();

// ---------------------------------------------------------------------------
// 8) AUDIT LOG — expected rows (native table) + placeholder for owner screenshot
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  header(s, "THE AUDIT TRAIL · DOCKER HOME", [{ text: "Every decision, " }, { text: "on the record", accent: true }],
    "AI Platform → Audit logs, signed in as an org owner. Two event types tell the whole story.");
  // Two real Docker Home captures (owner view, 2026-09-14), stacked full width
  // and cropped to the table rows so the back row can read the verdicts.
  const aw = 11.0, ax = 1.15; let ay = 1.8;
  N.label(s, "EVENT TYPE = SERVER REGISTRATION  ·  Beat 2 deny at 15:18, Beat 2b swap at 15:32", ax, ay, aw, { size: 10.5 });
  ay += 0.3;
  ay += shot(s, "audit-server-registration.png", ax, ay, aw) + 0.24;
  N.label(s, "EVENT TYPE = TOOL INVOCATION  ·  Beat 3, one gateway-client run", ax, ay, aw, { size: 10.5 });
  ay += 0.3;
  ay += shot(s, "audit-tool-invocation.png", ax, ay, aw) + 0.22;
  N.bullets(s, [
    { b: "Registration plane:", t: " poisoned-demo DENY; approved name at :7801 DENY; :7802 ALLOW." },
    { b: "Metadata only:", t: " decision, principal, resource, deny reason. No parameter content." },
  ], 0.85, ay, 5.6, 7.0 - ay, { size: 11, space: 3 });
  N.bullets(s, [
    { b: "Tool-invocation plane:", t: " npm_download ALLOW; the agent's own mcp-add DENY." },
    { b: "Exportable", t: " to CSV, JSON Lines, and your SIEM." },
  ], 6.7, ay, 4.5, 7.0 - ay, { size: 11, space: 3 });
  N.logo(s);
  s.addNotes(
    "WHAT THIS SHOWS\n" +
    "Durable MCP audit logging is the AI Governance feature in Docker Home, not the local sbx policy log (which is network and filesystem only). Fields include timestamp, category, decision, username, org_id, action_type, deny_reason.\n\n" +
    "THE TWO CAPTURES\n" +
    "Both are the real Docker Home owner view from the 2026-09-14 run, filtered to that day. Left: Event type = Server Registration shows poisoned-demo DENY, approved-downloader DENY (the :7801 swap) and ALLOW (the :7802 restore), all within the same second of Beat 2b. Right: Event type = Tool Invocation shows mcp-add DENY and approved-downloader:npm_download ALLOW at the same timestamp, which is the single gateway-client run of Beat 3. The npm-installer rows are from a different demo on the same org and can be ignored or filtered out with the search box.\n\n" +
    "TO RECAPTURE\n" +
    "Sign in to Docker Home as the org owner. AI Platform, Audit logs. Set Event type and the date range, then screenshot. The URLs with action_type=server_registration and action_type=tool_invocation can be bookmarked and pre-opened in two tabs.\n\n" +
    "SAY\n" +
    "Read the row: resource poisoned-demo, decision DENY. There is no content field because nothing was scanned. Point at the matching approved-downloader ALLOW for contrast. Then: every one of these exports to your SIEM.\n\n" +
    "ANTICIPATED Q&A\n" +
    "Q: Why is the AGENT column empty? A: Populated only for a named cagent; built-in shell and claude show a dash.\n" +
    "Q: Is this logged for everyone? A: Recorded for licensed users under an enforced organization policy. AI Governance is a separately licensed add-on.");
})();

// ---------------------------------------------------------------------------
// 9) WRAP — four attack classes, one model
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  header(s, "WRAP · ~30 SECONDS", [{ text: "Four attack classes, " }, { text: "one identity-pinned model", accent: true }],
    "We demoed poisoning live. The mechanism is identical for the rest.");
  const cards = [
    ["ic_lock.png", "Tool poisoning", "Hidden instructions in a tool description steer the agent into leaking secrets.", "Shown: Beat 1 → denied in Beat 2"],
    ["ic_sitemap.png", "Tool shadowing", "A malicious server redefines a trusted tool name so calls hit the bad one.", "Both servers used npm_download"],
    ["ic_cogs.png", "Rug pulls", "A server behaves during review, then swaps behavior after it is trusted.", "Endpoint swap denied in Beat 2b"],
    ["ic_users.png", "Over-broad scopes", "The agent hands a server credentials far wider than the task needs.", "Agent cannot add servers: Beat 3"],
  ];
  const cw = 2.9, gap = 0.18, cy = 1.95, ch = 2.85; let cx = 0.6;
  cards.forEach(c => {
    N.card(s, cx, cy, cw, ch, {});
    N.badge(s, c[0], cx + 0.22, cy + 0.22, 0.6);
    N.txt(s, c[1], cx + 0.95, cy + 0.27, cw - 1.1, 0.5, { fontSize: 14, bold: true, color: P.WHITE, valign: "middle" });
    N.txt(s, c[2], cx + 0.22, cy + 1.05, cw - 0.44, 1.05, { fontSize: 11.5, color: P.SUB });
    N.txt(s, c[3], cx + 0.22, cy + 2.2, cw - 0.44, 0.5, { fontSize: 10.5, italic: true, color: P.ACCENT_LIGHT });
    cx += cw + gap;
  });
  N.callout(s, "note", "One chokepoint", [{ text: "Authenticated, authorized, logged. ", bold: true }, { text: "Not AI-detects-the-poison magic: a curated, default-deny catalog with a full audit trail." }], { y: 5.2, h: 0.9, hi: true });
  N.logo(s);
  s.addNotes(
    "SAY\n" +
    "Tool shadowing, rug pulls, over-broad token scopes: the same identity-pinned registration model covers all four. We demoed poisoning live; the mechanism is identical for the rest. Not AI-detects-the-poison magic. A curated, default-deny catalog with a full audit trail.\n\n" +
    "ANTICIPATED Q&A\n" +
    "Q: Does the gateway read descriptions to detect malicious content? A: No. Identity and registration, not content inspection. That is the honest answer and the stronger claim.\n" +
    "Q: What do we need to run this? A: Docker Desktop, sbx, Docker AI Governance (separately licensed), an org owner to create policy, and developers holding AI Governance seats.\n\n" +
    "CITATIONS\n" +
    "OWASP MCP03:2025 Tool Poisoning (OWASP MCP Top 10, currently in beta; say so if pressed). Invariant Labs, MCP Security Notification: Tool Poisoning Attacks, April 2025. Docker docs: docs.docker.com/ai/sandboxes/governance.");
})();

// ---------------------------------------------------------------------------
// 10) CLOSING
// ---------------------------------------------------------------------------
(() => {
  const s = N.slide();
  N.badge(s, "ic_check.png", 6.17, 1.4, 1.0);
  N.txt(s, "The only thing that changed was policy.", 0.7, 2.8, 11.9, 0.9, { align: "center", fontSize: 34, bold: true, color: P.WHITE });
  N.txt(s, "Ungoverned, the poison worked. Governed, the unvetted server was denied on identity.\nThe approved server pulled the package, and every decision is on the record.", 1.4, 3.9, 10.5, 1.1, { align: "center", fontSize: 16, color: P.ACCENT_LIGHT });
  T.logo(s, (13.333 - 2.4) / 2, 5.4, 2.4);
  s.addNotes("Close. Offer Q&A. Rehearsed answers are in the notes of the Wrap slide and Beats 1 and 2.");
})();

pres.writeFile({ fileName: OUT }).then(f => console.log("WROTE", f));
