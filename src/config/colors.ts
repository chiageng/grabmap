// Base color palette
export const colorPalette = {
  // Neutral colors
  white: "rgb(255, 255, 255)",
  black: "rgb(0, 0, 0)",
  nearBlack: "rgb(17, 24, 39)",

  // Gray scale
  darkGray: "rgb(31, 41, 55)",
  mediumGray: "rgb(107, 114, 128)",
  mediumLightGray: "rgb(229, 231, 235)",
  lightGray: "rgb(243, 244, 246)",
  lighterGray: "rgb(249, 250, 251)",

  // Blue scale
  blue: "rgb(42, 50, 179)", // Modern vibrant blue
  lightBlue: "rgb(96, 165, 250)",
  darkBlue: "rgb(37, 99, 235)",

  // Status colors
  red: "rgb(239, 68, 68)",
  darkRed: "rgb(220, 38, 38)",
  orange: "rgb(245, 158, 11)",
  green: "rgb(34, 197, 94)",
  darkGreen: "rgb(22, 163, 74)",
} as const;

// Semantic color configuration
export const colorConfig = {
  // Primary colors
  primaryColor: colorPalette.blue,
  primaryForegroundColor: colorPalette.white,
  primaryHoverColor: colorPalette.darkBlue,

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

  // Success colors
  successColor: colorPalette.green,
  successForegroundColor: colorPalette.white,
  successHoverColor: colorPalette.darkGreen,

  // Info colors
  infoColor: colorPalette.lightBlue,
  infoForegroundColor: colorPalette.white,

  // Border colors
  borderColor: colorPalette.mediumLightGray,
  borderColorHover: colorPalette.mediumGray,

  // Text colors
  textPrimary: colorPalette.nearBlack,
  textSecondary: colorPalette.darkGray,
  textMuted: colorPalette.mediumGray,
} as const;
