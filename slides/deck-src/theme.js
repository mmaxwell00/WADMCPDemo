// Docker dark-deck theme module.
// Usage:
//   const pptxgen = require("pptxgenjs");
//   const pres = new pptxgen(); pres.layout = "LAYOUT_WIDE";
//   const T = require("./theme")(pres, __dirname + "/../assets/", "navy");
//   const s = pres.addSlide(); T.bg(s); T.card(s, 1, 1, 4, 1.5);
//
// The third arg picks a palette: "navy" (default), "purple", or "blue".
// All three share the white Docker logo and the glowing-card / dashed-envelope motif.

const PALETTES = {
  // deep navy + cyan glow  (the default Docker AI Governance look)
  navy: {
    bg: "bg_navy.png",
    WHITE: "FFFFFF", ACCENT: "5BC8FF", ACCENT_LIGHT: "8FDAFF",
    SUB: "C2D2EE", MUTED: "8AA0C8",
    CARD: "0E2350", CARD2: "143063", LINE: "3E80C4",
    FOUNDATION_FILL: "10498A", GLOW: "3FA9E8",
    TITLE: "FFFFFF", TITLE_GLOW: null,
  },
  // royal blue + bright cyan glow (Docker Model Runner look)
  blue: {
    bg: "bg_blue.png",
    WHITE: "FFFFFF", ACCENT: "5FC8FF", ACCENT_LIGHT: "BFE6FF",
    SUB: "D6E6FB", MUTED: "A6C4ED",
    CARD: "0E3A86", CARD2: "1A56AE", LINE: "4FA8E8",
    FOUNDATION_FILL: "1E63C8", GLOW: "4FC8FF",
    TITLE: "BFE6FF", TITLE_GLOW: "4FC8FF", // glowing light-cyan title
  },
  // deep purple/indigo + violet neon (Docker Sandboxes look)
  purple: {
    bg: "bg_purple.png",
    WHITE: "FFFFFF", ACCENT: "4FA8F5", ACCENT_LIGHT: "CBC2EE",
    SUB: "CBC2EE", MUTED: "9A8FC8",
    CARD: "1B1147", CARD2: "2A1A5E", LINE: "6E4FC0",
    FOUNDATION_FILL: "4A2AA6", GLOW: "8A5CF0",
    TITLE: "FFFFFF", TITLE_GLOW: null,
  },
};

module.exports = function (pres, assetsDir, paletteName = "navy") {
  const P = PALETTES[paletteName] || PALETTES.navy;
  const FONT = "Arial";
  // Shadow factories — pptxgenjs MUTATES option objects in place, so every
  // shape needs a FRESH object. Always call these as functions, never reuse.
  // A blurred outer shadow with offset:0 reads as an even neon GLOW.
  const glow = () => ({ type: "outer", color: P.GLOW, blur: 16, offset: 0, opacity: 0.58 });
  const glowSoft = () => ({ type: "outer", color: P.GLOW, blur: 10, offset: 0, opacity: 0.38 });
  const textGlow = () => ({ type: "outer", color: P.GLOW, blur: 11, offset: 0, opacity: 0.7 });

  return {
    pres, P, FONT, glow, glowSoft, textGlow,

    // Full-bleed gradient background image (dark; the host slide has no other bg).
    bg(slide) { slide.background = { path: assetsDir + P.bg }; },

    // Official white Docker logo (whale + wordmark). w in inches; height
    // preserves the trimmed mark's aspect ratio (612/2700).
    logo(slide, x, y, w) {
      slide.addImage({ path: assetsDir + "docker_logo.png", x, y, w, h: w * (612 / 2700) });
    },

    // Glowing rounded card. opts: {fill, line, lw, transparency, soft, glow:false}
    card(slide, x, y, w, h, opts = {}) {
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w, h, rectRadius: 0.12,
        fill: { color: opts.fill || P.CARD, transparency: opts.transparency ?? 20 },
        line: { color: opts.line || P.LINE, width: opts.lw || 1.25 },
        shadow: opts.glow === false ? undefined : (opts.soft ? glowSoft() : glow()),
      });
    },

    // Glowing rounded square holding a centered icon PNG (icon is ~46% of the square).
    iconBadge(slide, iconFile, x, y, s) {
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w: s, h: s, rectRadius: 0.14,
        fill: { color: P.CARD2, transparency: 10 }, line: { color: P.ACCENT, width: 1.5 }, shadow: glow(),
      });
      const ip = s * 0.46;
      slide.addImage({ path: assetsDir + iconFile, x: x + (s - ip) / 2, y: y + (s - ip) / 2, w: ip, h: ip });
    },

    // Connector arrow. (x,y) is the start; (w,h) is the vector to the end.
    // Horizontal: h=0, w=length. Vertical down: w=0, h=length. both=true => double-headed.
    arrow(slide, x, y, w, h, both = false) {
      slide.addShape(pres.shapes.LINE, {
        x, y, w, h,
        line: { color: P.ACCENT, width: 2.25, endArrowType: "triangle", beginArrowType: both ? "triangle" : "none" },
      });
    },
  };
};
