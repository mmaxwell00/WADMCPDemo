/**
 * DEMO — Approved MCP server (tool factory).
 * A boring, legitimate tool: download a package tarball from the npm registry
 * via `npm pack`, into the workspace, and report the tarball path + size +
 * shasum + integrity. Honest description, no poison. This is the curated-catalog
 * "npm-wrapping" download tool that Cedar policy permits by identity.
 *
 * Why `npm pack`: it fetches the package tarball from the registry WITHOUT
 * running the package's lifecycle scripts — a real "download a file via npm"
 * that's safe to run in a demo. We shell out via execFile (arg array, no shell)
 * so the package spec can't inject commands.
 *
 * Optional allowlist: NPM_ALLOWLIST (comma-separated package names) restricts
 * which packages may be fetched.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const execFileP = promisify(execFile);

const allowlist = (process.env.NPM_ALLOWLIST ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// npm package spec: optional @scope, name, optional @version/tag/range.
// execFile (no shell) already prevents injection; this just rejects nonsense.
const SPEC_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[a-zA-Z0-9-._^~><=|* ]+)?$/i;

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

function packageName(spec: string): string {
  // strip a trailing @version (but keep a leading @scope)
  const at = spec.lastIndexOf("@");
  return at > 0 ? spec.slice(0, at) : spec;
}

export function buildServer(): Server {
  const server = new Server(
    { name: "approved-downloader", version: "0.2.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "npm_download",
        description:
          "Download an npm package tarball from the registry via `npm pack` " +
          "into the local workspace, and return its path, size, shasum, and " +
          "integrity hash. Does not run the package's install scripts.",
        inputSchema: {
          type: "object",
          properties: {
            package: {
              type: "string",
              description: "npm package spec, e.g. \"left-pad\" or \"left-pad@1.3.0\".",
            },
            dest: {
              type: "string",
              description: "Destination directory within the workspace (default: ./downloads).",
            },
          },
          required: ["package"],
        },
        // Writes a tarball, so NOT read-only. Honest annotation.
        annotations: { title: "npm Download (npm pack)", readOnlyHint: false },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const args = (req.params.arguments ?? {}) as { package?: string; dest?: string };
    const spec = (args.package ?? "").trim();
    if (!spec) return errorResult("Missing required argument: package");
    if (!SPEC_RE.test(spec)) return errorResult(`Invalid npm package spec: ${spec}`);
    if (allowlist.length && !allowlist.includes(packageName(spec))) {
      return errorResult(
        `Package ${packageName(spec)} is not in NPM_ALLOWLIST (${allowlist.join(", ")}).`,
      );
    }

    const dest = resolve(process.cwd(), args.dest ?? "downloads");
    await mkdir(dest, { recursive: true });

    try {
      const { stdout } = await execFileP(
        "npm",
        ["pack", spec, "--pack-destination", dest, "--json"],
        { timeout: 60_000, maxBuffer: 16 * 1024 * 1024 },
      );
      // --json prints an array; parse defensively in case of stray output.
      const json = stdout.slice(stdout.indexOf("["), stdout.lastIndexOf("]") + 1);
      const info = JSON.parse(json)[0] as {
        filename: string;
        size?: number;
        unpackedSize?: number;
        shasum?: string;
        integrity?: string;
      };
      return {
        content: [
          {
            type: "text",
            text:
              `npm pack ${spec}\n` +
              `  file:      ${resolve(dest, info.filename)}\n` +
              `  size:      ${info.size ?? "?"} bytes (packed)\n` +
              `  unpacked:  ${info.unpackedSize ?? "?"} bytes\n` +
              `  shasum:    ${info.shasum ?? "?"}\n` +
              `  integrity: ${info.integrity ?? "?"}`,
          },
        ],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return errorResult(`npm pack failed for "${spec}": ${msg}`);
    }
  });

  return server;
}
