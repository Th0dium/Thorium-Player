/**
 * Theme Picker Screen
 * Allows user to select between Dark, Light, System, and AMOLED themes
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsStore, type ThemeOption } from '../../store/settingsStore';

const THEMES: Array<{ id: ThemeOption; label: string }> = [
    {
        id: 'dark',
        label: 'Dark',
    },
    {
        id: 'light',
        label: 'Light',
    },
    {
        id: 'system',
        label: 'System',
    },
    {
        id: 'amoled',
        label: 'AMOLED Black',
    },
];

export const ThemePickerScreen: React.FC = () => {
    const { colors } = useTheme();
    const currentTheme = useSettingsStore((state) => state.theme);
    const setTheme = useSettingsStore((state) => state.setTheme);

    const handleThemeSelect = (themeId: ThemeOption) => {
        setTheme(themeId);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView>
                <View style={styles.content}>
                    {THEMES.map((theme) => {
                        const isSelected = currentTheme === theme.id;
                        return (
                            <TouchableOpacity
                                key={theme.id}
                                style={[
                                    styles.themeOption,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                        borderWidth: isSelected ? 2 : 1,
                                    },
                                ]}
                                onPress={() => handleThemeSelect(theme.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.themeContent}>
                                    <Text style={[styles.themeLabel, { color: colors.text }]}>
                                        {theme.label}
                                    </Text>
                                </View>

                                {isSelected && (
                                    <View style={{ marginLeft: 12 }}>
                                        <Icon
                                            name="checkmark-circle"
                                            size={24}
                                            color={colors.primary}
                                        />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    themeContent: {
        flex: 1,
    },
    themeLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
});
