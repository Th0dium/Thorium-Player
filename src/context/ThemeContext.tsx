// Theme Provider - Dynamic theme support based on user preferences
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore, ThemeOption } from '@/store/settingsStore';

// Dark theme colors (default)
const darkColors = {
    // Primary colors
    primary: '#7C4DFF',
    primaryLight: '#B47CFF',
    primaryDark: '#3F1DCB',

    // Accent colors
    accent: '#00E5FF',
    accentLight: '#6EFFFF',
    accentDark: '#00B2CC',

    // Background colors
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

// AMOLED Black theme — pure black for OLED screens
const amoledColors: ThemeColors = {
    ...darkColors,
    background: '#000000',
    backgroundSecondary: '#0A0A0A',
    backgroundTertiary: '#111111',
    surface: '#0A0A0A',
    surfaceElevated: '#141414',
    surfaceVariant: '#1A1A1A',
    border: '#222222',
    playerBackground: '#000000',
    seekBarBackground: '#222222',
};

// Light theme colors
const lightColors = {
    // Primary colors
    primary: '#6200EE',
    primaryLight: '#9D46FF',
    primaryDark: '#3700B3',

    // Accent colors
    accent: '#03DAC6',
    accentLight: '#66FFF9',
    accentDark: '#00A896',

    // Background colors
    background: '#FAFAFA',
    backgroundSecondary: '#F5F5F5',
    backgroundTertiary: '#EEEEEE',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceVariant: '#E0E0E0',

    // Border colors
    border: '#E0E0E0',

    // Text colors
    text: '#000000',
    textPrimary: '#212121',
    textSecondary: '#666666',
    textTertiary: '#9E9E9E',
    textMuted: '#9E9E9E',
    textDisabled: '#BDBDBD',

    // Status colors
    success: '#00C853',
    warning: '#FF9100',
    error: '#D50000',
    info: '#2962FF',

    // Player specific
    playerBackground: '#F5F5F5',
    seekBar: '#6200EE',
    seekBarBackground: '#E0E0E0',

    // AI feature colors
    aiPrimary: '#03DAC6',
    aiSecondary: '#6200EE',
    aiGradientStart: '#6200EE',
    aiGradientEnd: '#03DAC6',
};

export type ThemeColors = typeof darkColors;

interface ThemeContextType {
    colors: ThemeColors;
    isDark: boolean;
    theme: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType>({
    colors: darkColors,
    isDark: true,
    theme: 'dark',
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
    children: React.ReactNode;
}

// Helper to lighten a hex color
const lightenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xFF) + Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// Helper to darken a hex color
const darkenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xFF) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0xFF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0xFF) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// Apply custom accent color to a theme palette
const applyAccentColor = (baseColors: ThemeColors, accent: string): ThemeColors => ({
    ...baseColors,
    primary: accent,
    primaryLight: lightenColor(accent, 0.25),
    primaryDark: darkenColor(accent, 0.25),
    seekBar: accent,
    aiSecondary: accent,
    aiGradientStart: accent,
});

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const themePreference = useSettingsStore(s => s.theme);
    const accentColor = useSettingsStore(s => s.accentColor);

    const { colors, isDark } = useMemo(() => {
        let isDark: boolean;
        let baseColors: ThemeColors;

        switch (themePreference) {
            case 'light':
                isDark = false;
                baseColors = lightColors;
                break;
            case 'amoled':
                isDark = true;
                baseColors = amoledColors;
                break;
            case 'dark':
                isDark = true;
                baseColors = darkColors;
                break;
            case 'system':
            default:
                isDark = systemColorScheme === 'dark';
                baseColors = isDark ? darkColors : lightColors;
                break;
        }

        // Apply custom accent color if set
        const colors = accentColor ? applyAccentColor(baseColors, accentColor) : baseColors;

        return { colors, isDark };
    }, [themePreference, systemColorScheme, accentColor]);

    const value = useMemo(() => ({
        colors,
        isDark,
        theme: themePreference,
    }), [colors, isDark, themePreference]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// Export color constants for static usage (will use dark theme)
export { darkColors as colors, lightColors };
export default ThemeProvider;
