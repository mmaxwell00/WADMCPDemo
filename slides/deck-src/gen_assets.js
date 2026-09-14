// Generate the raster assets a Docker deck needs: the white logo PNG, the three
// gradient background PNGs, and a set of cyan icon PNGs (from react-icons).
//
// Run once per deck workspace (icons + logo + bg are reused across slides):
//   NODE_PATH=$(npm root -g) node scripts/gen_assets.js [assetsDir]
//
// Requires global packages: sharp, react-icons, react, react-dom.
// (npm install -g sharp react-icons react react-dom)
//
// Icon color is cyan by default so it sits on the dark theme. Pass a different
// hex below if you build a non-default palette. Add/replace icons freely — the
// map keys are the filenames the deck references.

// Make globally-installed modules (sharp, react-icons, …) resolvable even when
// NODE_PATH isn't set, so `node gen_assets.js` just works.
try {
  const root = require("child_process").execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] })
    .toString().split(/\r?\n/).map((s) => s.trim()).find((l) => l.endsWith("node_modules"));
  if (root && !module.paths.includes(root)) module.paths.push(root);
} catch (_) {}

const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa");
const fs = require("fs");
const path = require("path");

const ASSETS = process.argv[2] || path.join(__dirname, "..", "assets");
const ICON_COLOR = "#7FD4FF"; // cyan; readable on every dark palette

async function svgToPng(svgPath, outPng, width) {
  await sharp(svgPath, { density: 300 }).resize({ width }).png().toFile(outPng);
}
async function iconPng(IconComponent, out, color = ICON_COLOR) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(IconComponent, { color, size: "256" }));
  await sharp(Buffer.from(svg)).resize({ width: 512 }).png().toFile(path.join(ASSETS, out));
}

(async () => {
  // logo (official white Docker mark). Trim transparent padding so it sits tight,
  // then size to a wide raster. T.logo() in theme.js assumes this trimmed ratio.
  await sharp(path.join(ASSETS, "docker_logo.svg"), { density: 400 })
    .trim().resize({ width: 1800 }).png().toFile(path.join(ASSETS, "docker_logo.png"));

  // backgrounds (whichever SVGs are present)
  for (const name of ["bg_navy", "bg_blue", "bg_purple"]) {
    const svg = path.join(ASSETS, name + ".svg");
    if (fs.existsSync(svg)) await sharp(fs.readFileSync(svg), { density: 200 }).png().toFile(path.join(ASSETS, name + ".png"));
  }

  // common icon set — extend as needed
  const icons = {
    "ic_shield.png": fa.FaShieldAlt,
    "ic_cloud.png": fa.FaCloudDownloadAlt,
    "ic_cube.png": fa.FaCube,
    "ic_network.png": fa.FaNetworkWired,
    "ic_chip.png": fa.FaMicrochip,
    "ic_sitemap.png": fa.FaSitemap,
    "ic_chat.png": fa.FaCommentDots,
    "ic_policy.png": fa.FaBalanceScale,
    "ic_lock.png": fa.FaLock,
    "ic_check.png": fa.FaCheckCircle,
    "ic_server.png": fa.FaServer,
    "ic_robot.png": fa.FaRobot,
    "ic_cogs.png": fa.FaCogs,
    "ic_users.png": fa.FaUsers,
    "ic_rocket.png": fa.FaRocket,
  };
  for (const [out, comp] of Object.entries(icons)) await iconPng(comp, out);

  console.log("assets generated in", ASSETS);
})();
