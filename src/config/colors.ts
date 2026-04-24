// Base color palette — Grab brand palette
export const colorPalette = {
  // Neutral colors
  white: "rgb(255, 255, 255)",
  black: "rgb(0, 0, 0)",
  nearBlack: "rgb(31, 41, 55)", // Charcoal #1F2937

  // Gray scale
  darkGray: "rgb(31, 41, 55)",
  mediumGray: "rgb(107, 114, 128)",
  mediumLightGray: "rgb(229, 231, 235)",
  lightGray: "rgb(243, 244, 246)",
  lighterGray: "rgb(249, 250, 251)",

  // Grab Green scale
  grabGreen: "rgb(0, 177, 79)",       // #00B14F — Grab primary green
  grabGreenDark: "rgb(0, 150, 64)",   // #009640 — darker hover
  grabGreenLight: "rgb(230, 247, 236)", // #E6F7EC — light accent

  // Status colors
  red: "rgb(225, 29, 72)",            // #E11D48 — Grab danger
  darkRed: "rgb(190, 18, 60)",
  orange: "rgb(255, 184, 0)",         // #FFB800 — Grab warning
  green: "rgb(0, 177, 79)",           // alias — same as Grab green for success
  darkGreen: "rgb(0, 150, 64)",
} as const;

// Semantic color configuration — all keys preserved for downstream consumers
export const colorConfig = {
  // Primary colors — Grab Green
  primaryColor: colorPalette.grabGreen,
  primaryForegroundColor: colorPalette.white,
  primaryHoverColor: colorPalette.grabGreenDark,

  // Secondary colors
  secondaryColor: colorPalette.lightGray,
  secondaryForegroundColor: colorPalette.darkGray,

  // Background colors
  backgroundColor: colorPalette.white,
  foregroundColor: colorPalette.nearBlack,
  backgroundSecondary: colorPalette.lighterGray,

  // Danger/Error colors
  dangerColor: colorPalette.red,
  dangerForegroundColor: colorPalette.white,
  dangerHoverColor: colorPalette.darkRed,

  // Warning colors
  warningColor: colorPalette.orange,
  warningForegroundColor: colorPalette.white,

  // Success colors — Grab Green
  successColor: colorPalette.green,
  successForegroundColor: colorPalette.white,
  successHoverColor: colorPalette.darkGreen,

  // Info colors
  infoColor: colorPalette.grabGreenLight,
  infoForegroundColor: colorPalette.grabGreen,

  // Border colors
  borderColor: colorPalette.mediumLightGray,
  borderColorHover: colorPalette.mediumGray,

  // Text colors
  textPrimary: colorPalette.nearBlack,
  textSecondary: colorPalette.darkGray,
  textMuted: colorPalette.mediumGray,

  // Extra Grab accent (available for new components)
  accentLight: colorPalette.grabGreenLight,
} as const;
