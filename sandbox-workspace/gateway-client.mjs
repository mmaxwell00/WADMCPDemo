// Runs INSIDE the sandbox (via `sbx exec`). Talks MCP to the governed gateway
// at $MCP_GATEWAY_URL. Lists tools, calls the approved npm_download tool, and
// (if a dynamic register/primordial tool exists) attempts the poisoned server so
// we can see an AGENT-attributed decision in the audit log.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = new URL(process.env.MCP_GATEWAY_URL);
const transport = new StreamableHTTPClientTransport(url);
const client = new Client({ name: "sandbox-agent-sim", version: "0.1.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log("=== TOOLS VISIBLE THROUGH THE GOVERNED GATEWAY ===");
for (const t of tools) console.log(` - ${t.name}  ::  ${(t.description || "").split("\n")[0].slice(0, 70)}`);

// Approved npm-download tool (name may be namespaced by the gateway).
const dl = tools.find((t) => t.name === "npm_download" || t.name.endsWith("npm_download"));
console.log("\n=== BEAT 3: pull an npm package through the gateway (npm_download) ===");
if (dl) {
  try {
    const r = await client.callTool({
      name: dl.name,
      arguments: { package: "left-pad", dest: "downloads" },
    });
    for (const b of r.content) if (b.type === "text") console.log(b.text);
  } catch (e) {
    console.log("npm_download ERROR:", e.message);
  }
} else {
  console.log("npm_download not found in gateway tool list");
}

// Look for a primordial/dynamic register tool so an agent could add a server.
const reg = tools.find((t) => /add|register|mcp/i.test(t.name));
console.log("\n=== BEAT 2 (agent-attributed): attempt poisoned via gateway ===");
if (reg) {
  console.log("primordial register tool:", reg.name);
  try {
    const r = await client.callTool({
      name: reg.name,
      arguments: { name: "poisoned-demo", url: "http://localhost:7801/mcp" },
    });
    console.log("register result:", JSON.stringify(r).slice(0, 300));
  } catch (e) {
    console.log("register attempt ERROR (expected if denied):", e.message);
  }
} else {
  console.log("no dynamic register/primordial tool exposed to the agent (static-mcp mode)");
}

await client.close();
