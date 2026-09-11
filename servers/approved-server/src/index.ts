/**
 * DEMO — Streamable-HTTP host for the approved MCP server.
 * Exposes MCP at http://localhost:<PORT>/mcp so it registers with a real
 * identity:  sbx mcp add approved-downloader --url http://localhost:7802/mcp --skip-ssrf-check
 */
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 7802);
const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[approved-downloader] request error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

for (const method of ["get", "delete"] as const) {
  app[method]("/mcp", (_req, res) => {
    res.status(405).set("Allow", "POST").json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  });
}

app.listen(PORT, () => {
  console.error(`[approved-downloader] streamable-HTTP MCP on http://localhost:${PORT}/mcp`);
});
