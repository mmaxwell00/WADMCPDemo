// Native, EDITABLE slide helpers for the Docker deck theme.
//
// Every element these produce is a real pptxgenjs text box or shape, so the slide
// stays EDITABLE in PowerPoint AND Google Slides. This is the default way to build
// slides. (Google Slides recompresses full-slide IMAGES on import and softens any
// text baked into them — native text/shapes stay crisp and editable. Only the
// gradient background, the logo, and icon badges are images, and none carry text.)
//
// Usage:
//   const pptxgen = require("pptxgenjs");
//   const pres = new pptxgen(); pres.layout = "LAYOUT_WIDE";
//   const T = require("./theme")(pres, __dirname + "/assets/", "navy");
//   const N = require("./native")(pres, T);
//   const s = N.slide();                       // new slide + gradient background
//   N.title(s, [{ text: "Governed, " }, { text: "sandboxed", accent: true }, { text: " agents" }]);
//   N.card(s, 0.6, 1.8, 5.85, 3.2, { hi: true });
//   N.bullets(s, ["First point", { b: "Bold lead", t: " then normal" }], 0.85, 2.2, 5.3, 2.2);
//   N.logo(s);
//
// Canvas is LAYOUT_WIDE = 13.333 x 7.5 in; all coordinates are inches.

module.exports = function (pres, T) {
  const { P, FONT } = T;
  const RR = () => pres.shapes.ROUNDED_RECTANGLE;
  const DANGER = "FF7A85", OK = "54E0A0", WARN = "FFC15B", DARKRED = "3A1520";

  const slide = () => { const s = pres.addSlide(); T.bg(s); return s; };
  const logo = (s, x = 11.35, y = 6.98, w = 1.5) => T.logo(s, x, y, w);

  // Title with inline accent runs. Pass a string, or [{text, accent?, color?}].
  function title(s, runs, o = {}) {
    const { x = 0.6, y = 0.4, size = 26, w = 12.1 } = o;
    const arr = (typeof runs === "string") ? [{ text: runs }] : runs;
    s.addText(arr.map(r => ({ text: r.text, options: { color: r.color || (r.accent ? P.ACCENT : P.WHITE), bold: true, fontFace: FONT } })),
      { x, y, w, h: 0.7, fontSize: size, margin: 0, valign: "middle" });
  }
  // Small ALL-CAPS accent label / kicker / column header.
  function label(s, text, x, y, w, o = {}) {
    s.addText(text, { x, y, w, h: 0.28, fontFace: FONT, fontSize: o.size || 12, bold: true, color: o.color || P.ACCENT, charSpacing: 1.5, margin: 0, valign: "middle" });
  }
  // Plain text box. Pass margin:0-aligned; default color is body (SUB).
  function txt(s, text, x, y, w, h, o = {}) {
    s.addText(text, { x, y, w, h, fontFace: FONT, margin: 0, valign: o.valign || "top", color: o.color || P.SUB, fontSize: o.fontSize || 13, ...o });
  }
  // Glowing rounded card. opts: {hi, danger, dash, soft, fill, line, lw, trans, noglow, rad}
  function card(s, x, y, w, h, o = {}) {
    s.addShape(RR(), { x, y, w, h, rectRadius: o.rad ?? 0.09,
      fill: { color: o.fill || (o.hi ? P.FOUNDATION_FILL : (o.danger ? DARKRED : P.CARD)), transparency: o.trans ?? (o.hi ? 12 : 26) },
      line: { color: o.line || (o.hi ? P.ACCENT_LIGHT : (o.danger ? DANGER : P.LINE)), width: o.lw ?? 1, dashType: o.dash ? "dash" : "solid" },
      shadow: o.noglow ? undefined : (o.soft || (!o.hi) ? T.glowSoft() : T.glow()) });
  }
  // Pill chip. Returns its width so you can lay a row: let cx=..; cx += chip(...) + gap.
  function chip(s, text, x, y, o = {}) {
    const cw = o.w || (0.34 + text.length * 0.086);
    s.addShape(RR(), { x, y, w: cw, h: o.h || 0.4, rectRadius: 0.2, fill: { color: P.CARD2, transparency: 12 }, line: { color: P.LINE, width: 1 }, shadow: T.glowSoft() });
    s.addText(text, { x, y, w: cw, h: o.h || 0.4, align: "center", valign: "middle", fontFace: FONT, fontSize: o.size || 10.5, color: o.color || P.ACCENT_LIGHT, margin: 0 });
    return cw;
  }
  // Bullet list. Each item: "plain" | {b:"bold lead", t:" rest"} | {m:"✓", mc:OK, t:"marker line"}
  function bullets(s, items, x, y, w, h, o = {}) {
    const size = o.size || 12, color = o.color || P.SUB, space = o.space ?? 5;
    const runs = [];
    items.forEach(it => {
      if (typeof it === "string") runs.push({ text: it, options: { bullet: { code: "2022", indent: 14 }, color, breakLine: true, paraSpaceAfter: space, fontSize: size, fontFace: FONT } });
      else if (it.m) { runs.push({ text: it.m + "  ", options: { color: it.mc || P.ACCENT, bold: true, fontSize: size, fontFace: FONT } }); runs.push({ text: it.t, options: { color, breakLine: true, paraSpaceAfter: space, fontSize: size, fontFace: FONT } }); }
      else { runs.push({ text: it.b, options: { bullet: { code: "2022", indent: 14 }, color: P.WHITE, bold: true, fontSize: size, fontFace: FONT } }); runs.push({ text: it.t, options: { color, breakLine: true, paraSpaceAfter: space, fontSize: size, fontFace: FONT } }); }
    });
    s.addText(runs, { x, y, w, h, valign: "top", margin: 0 });
  }
  // Connector arrow between boxes: arrow(s, x, y, length) draws a horizontal glowing →.
  function arrow(s, x, y, len) { s.addShape(pres.shapes.LINE, { x, y, w: len, h: 0, line: { color: P.ACCENT, width: 2, endArrowType: "triangle" } }); }
  // Dashed vertical boundary line (e.g. an isolation boundary): vline(s, x, y, length).
  function vline(s, x, y, len) { s.addShape(pres.shapes.LINE, { x, y, w: 0, h: len, line: { color: P.ACCENT, width: 1.5, dashType: "dash" } }); }
  // Glowing "→" / "+" / "=" operator, centered in a gutter of height h.
  function op(s, ch, x, y, h, size = 30) { s.addText(ch, { x, y, w: 0.5, h, align: "center", valign: "middle", fontFace: FONT, fontSize: size, bold: true, color: P.ACCENT, margin: 0, shadow: T.textGlow() }); }
  // Glowing icon badge (cyan-bordered rounded square with a centered icon PNG).
  const badge = (s, iconFile, x, y, sz) => T.iconBadge(s, iconFile, x, y, sz);
  // Callout band. kind = warn | tip | note | money. body = string or [{text, color?, bold?}].
  function callout(s, kind, heading, body, o = {}) {
    const x = o.x ?? 0.6, y = o.y, w = o.w ?? 12.13, h = o.h ?? 0.95;
    const col = ({ warn: WARN, tip: OK, note: P.ACCENT, money: WARN })[kind] || P.ACCENT;
    s.addShape(RR(), { x, y, w, h, rectRadius: 0.1, fill: { color: o.hi ? P.FOUNDATION_FILL : "0A1C44", transparency: o.hi ? 12 : 30 }, line: { color: col, width: 1.25, dashType: o.dash ? "dash" : "solid" }, shadow: T.glowSoft() });
    const runs = [{ text: heading + "  ", options: { bold: true, color: col, fontFace: FONT } }].concat(
      (typeof body === "string" ? [{ text: body }] : body).map(r => ({ text: r.text, options: { color: r.color || P.WHITE, bold: r.bold, fontFace: FONT } })));
    s.addText(runs, { x: x + 0.25, y, w: w - 0.5, h, valign: "middle", fontSize: o.size || 13.5, margin: 0 });
  }
  // Real, editable pptx table with a cyan header row. widths[] in inches (sum = table width).
  function table(s, headers, rows, x, y, widths, o = {}) {
    const head = headers.map(t => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: P.ACCENT }, valign: "middle", align: o.align || "left" } }));
    const body = rows.map(r => r.map(c => ({ text: c, options: { color: P.SUB, fill: { color: P.CARD2 }, valign: "middle" } })));
    s.addTable([head, ...body], { x, y, colW: widths, w: widths.reduce((a, b) => a + b, 0), fontFace: FONT, fontSize: o.size || 10.5,
      border: { type: "solid", color: P.LINE, pt: 0.5 }, margin: [3, 6, 3, 6], rowH: o.rowH, valign: "middle", autoPage: false });
  }

  return { P, FONT, C: { DANGER, OK, WARN, DARKRED }, RR, slide, logo, title, label, txt, card, chip, bullets, arrow, vline, op, badge, callout, table };
};
