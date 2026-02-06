// Theme configuration for Thorium Player
// Premium dark theme inspired by Musicolet

export const colors = {
    // Primary colors
    primary: '#7C4DFF',
    primaryLight: '#B47CFF',
    primaryDark: '#3F1DCB',

    // Accent colors
    accent: '#00E5FF',
    accentLight: '#6EFFFF',
    accentDark: '#00B2CC',

    // Background colors (Dark theme)
    background: '#0D0D0D',
    backgroundSecondary: '#1A1A1A',
    backgroundTertiary: '#252525',
    surface: '#1E1E1E',
    surfaceElevated: '#2A2A2A',
    surfaceVariant: '#303030',

    // Border colors
    border: '#333333',

    // Text colors
    text: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#B3B3B3',
    textTertiary: '#666666',
    textMuted: '#666666',
    textDisabled: '#444444',

    // Status colors
    success: '#00E676',
    warning: '#FFAB00',
    error: '#FF5252',
    info: '#448AFF',

    // Player specific
    playerBackground: '#0A0A0A',
    seekBar: '#7C4DFF',
    seekBarBackground: '#333333',

    // AI feature colors
    aiPrimary: '#00E5FF',
    aiSecondary: '#7C4DFF',
    aiGradientStart: '#7C4DFF',
    aiGradientEnd: '#00E5FF',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999,
    full: 999,
};

export const typography = {
    // Font sizes
    sizes: {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 20,
        xxl: 24,
        xxxl: 32,
        display: 48,
    },
    // Font weights
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
    // Typography styles
    headingLarge: {
        fontSize: 32,
        fontWeight: '700' as const,
    },
    headingMedium: {
        fontSize: 24,
        fontWeight: '600' as const,
    },
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
    },
    caption: {
        fontSize: 12,
        fontWeight: '400' as const,
    },
};

export const shadows = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.44,
        shadowRadius: 10.32,
        elevation: 8,
    },
};

export const theme = {
    colors,
    spacing,
    borderRadius,
    typography,
    shadows,
};

export type Theme = typeof theme;
export default theme;
