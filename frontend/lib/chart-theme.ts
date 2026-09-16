// Recharts renders via inline SVG/style attributes, so it can't read the
// Tailwind CSS custom properties defined in globals.css directly. These
// values mirror that palette — if the design tokens in globals.css ever
// change, update them here too.
export const CHART_THEME = {
  paper: "#fbf6ec",
  rule: "#ddd0ac",
  ink: "#22301f",
  inkMuted: "#63705f",
  inkFaint: "#9aa392",
  income: "#2f6f4e",
  expense: "#a13d34",
  info: "#345170",
} as const;

export const chartTooltipStyle = {
  background: CHART_THEME.paper,
  border: `1px solid ${CHART_THEME.rule}`,
  borderRadius: 12,
  fontSize: 12,
  color: CHART_THEME.ink,
} as const;

export const chartAxisTick = {
  fill: CHART_THEME.inkFaint,
  fontSize: 11,
} as const;
