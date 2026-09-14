// render.mjs — turn screenshots/raw/<slug>.{cmd,txt} into terminal-styled PNGs
// for the slide deck. Usage:  node screenshots/render.mjs   (from repo root)
// Needs: `npm install` in screenshots/ (ansi-to-html) and Google Chrome.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Convert from "ansi-to-html";

const here = dirname(fileURLToPath(import.meta.url));
const raw = resolve(here, "raw");
const out = resolve(here, "png");
const html = resolve(here, "html");
mkdirSync(out, { recursive: true });
mkdirSync(html, { recursive: true });

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WIDTH = 1600;              // CSS px; rendered at 2x for crisp projection
const LINE_PX = 34;              // matches font-size 22px / line-height 1.55

const convert = new Convert({
  fg: "#e5f2fc", bg: "#0b1118", newline: false, escapeXML: true,
  colors: { 1: "#f7768e", 2: "#9ece6a", 3: "#e0af68", 4: "#7aa2f7", 6: "#7dcfff" },
});

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function clean(txt) {
  // Collapse spinner redraws: a line beginning with ESC[1A (cursor up) replaces
  // the line before it, exactly as the terminal showed it.
  const lines = [];
  for (let line of txt.split("\n")) {
    while (/^\x1b\[\d*A/.test(line)) { lines.pop(); line = line.replace(/^\x1b\[\d*A/, ""); }
    lines.push(line);
  }
  txt = lines.join("\n");
  return txt
    .replace(/^\^D/, "")                    // script(1) EOF echo
    .replace(/\x1b\[\d*G/g, "")             // cursor-column moves
    .replace(/\x1b\[\d*K/g, "")             // erase-line
    .replace(/\\$/gm, "")                   // stray trailing backslash from the pty
    .replace(/\n{3,}$/g, "\n")
    .trimEnd();
}

// Highlight the verdict lines so the back row reads the punchline first.
function emphasise(h) {
  return h
    .replace(/(ERROR: registration denied[^\n]*)/g, '<span class="deny">$1</span>')
    .replace(/(policy denied \/mcp-add: implicit)/g, '<span class="deny">$1</span>')
    .replace(/(\[!! EXFILTRATION SIMULATED !!\][^\n]*)/g, '<span class="exfil">$1</span>')
    .replace(/(npm_FAKEDEMOTOKEN\w+)/g, '<span class="exfil">$1</span>')
    .replace(/(MCP server &quot;approved-downloader&quot; registered[^\n]*)/g, '<span class="allow">$1</span>')
    .replace(/(shasum:[^\n]*|integrity:[^\n]*)/g, '<span class="allow">$1</span>')
    .replace(/(&lt;IMPORTANT&gt;[\s\S]*?&lt;\/IMPORTANT&gt;)/g, '<span class="poison">$1</span>');
}

const page = (cmd, body, lines) => `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;background:#0b1118}
  .win{width:${WIDTH}px;box-sizing:border-box;background:#0b1118;border-radius:14px;overflow:hidden;
       font-family:"SF Mono","JetBrains Mono",Menlo,monospace;font-size:22px;line-height:1.55;color:#e5f2fc}
  .bar{height:44px;background:#1a222c;display:flex;align-items:center;padding:0 18px;gap:10px}
  .dot{width:14px;height:14px;border-radius:50%}
  .title{margin-left:auto;margin-right:auto;color:#8a97a6;font-size:16px;font-family:-apple-system,Helvetica,sans-serif}
  pre{margin:0;padding:26px 32px 30px;white-space:pre-wrap;word-break:break-all}
  .prompt{color:#9ece6a}.cmd{color:#fff;font-weight:600}
  .deny{color:#f7768e;font-weight:700}.allow{color:#9ece6a;font-weight:700}
  .exfil{color:#ff9e64;font-weight:700}.poison{color:#e0af68}
</style>
<div class="win">
  <div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span class="title">WADMCPDemo — zsh</span></div>
  <pre><span class="prompt">~/sandboxes/WADMCPDemo %</span> <span class="cmd">${esc(cmd)}</span>
${body}</pre>
</div>`;

for (const f of readdirSync(raw).filter((n) => n.endsWith(".cmd")).sort()) {
  const slug = f.replace(/\.cmd$/, "");
  const cmd = readFileSync(resolve(raw, f), "utf8").trim();
  const txt = clean(readFileSync(resolve(raw, `${slug}.txt`), "utf8"));
  const body = emphasise(convert.toHtml(txt));
  const lines = txt.split("\n").length + 1;
  const htmlPath = resolve(html, `${slug}.html`);
  writeFileSync(htmlPath, page(cmd, body, lines));
  const height = Math.min(44 + 56 + lines * LINE_PX + 40, 2400);
  execFileSync(CHROME, [
    "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=2",
    `--window-size=${WIDTH},${height}`, `--screenshot=${resolve(out, `${slug}.png`)}`,
    `file://${htmlPath}`,
  ], { stdio: "ignore" });
  console.log(`✓ ${slug}.png  (${lines} lines)`);
}
