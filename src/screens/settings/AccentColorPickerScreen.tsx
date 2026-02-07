/**
 * Accent Color Picker Screen
 * Allows user to select from preset colors or enter custom hex color
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsStore } from '../../store/settingsStore';

const PRESET_COLORS = [
    { name: 'Purple (Default)', value: null },
    { name: 'Blue', value: '#0066FF' },
    { name: 'Cyan', value: '#00B4FF' },
    { name: 'Green', value: '#00CC88' },
    { name: 'Yellow', value: '#FFCC00' },
    { name: 'Orange', value: '#FF8800' },
    { name: 'Red', value: '#FF3333' },
    { name: 'Pink', value: '#FF0099' },
];

export const AccentColorPickerScreen: React.FC = () => {
    const { colors } = useTheme();
    const currentColor = useSettingsStore((state) => state.accentColor);
    const setAccentColor = useSettingsStore((state) => state.setAccentColor);
    const [customHex, setCustomHex] = useState(currentColor || '');

    const handleColorSelect = (color: string | null) => {
        setAccentColor(color);
        if (color) {
            setCustomHex(color);
        }
    };

    const handleCustomColor = () => {
        if (!customHex.match(/^#[0-9A-F]{6}$/i)) {
            Alert.alert('Invalid Color', 'Please enter a valid hex color (e.g., #FF0000)');
            return;
        }
        handleColorSelect(customHex);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView>
                <View style={styles.content}>
                    {/* Preset Colors */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        Preset Colors
                    </Text>

                    {PRESET_COLORS.map((preset) => {
                        const isSelected = currentColor === preset.value;
                        return (
                            <TouchableOpacity
                                key={preset.name}
                                style={[
                                    styles.colorOption,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                        borderWidth: isSelected ? 2 : 1,
                                    },
                                ]}
                                onPress={() => handleColorSelect(preset.value)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.colorPreview}>
                                    {preset.value && (
                                        <View
                                            style={[
                                                styles.colorCircle,
                                                { backgroundColor: preset.value },
                                            ]}
                                        />
                                    )}
                                    {!preset.value && (
                                        <View
                                            style={[
                                                styles.colorCircle,
                                                {
                                                    backgroundColor: colors.primary,
                                                    borderWidth: 1,
                                                    borderColor: colors.border,
                                                },
                                            ]}
                                        />
                                    )}
                                </View>

                                <View style={styles.colorInfo}>
                                    <Text style={[styles.colorName, { color: colors.text }]}>
                                        {preset.name}
                                    </Text>
                                    {preset.value && (
                                        <Text style={[styles.colorCode, { color: colors.textSecondary }]}>
                                            {preset.value}
                                        </Text>
                                    )}
                                </View>

                                {isSelected && (
                                    <View style={{ marginLeft: 'auto' }}>
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

                    {/* Custom Color Input */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        Custom Color
                    </Text>

                    <View style={[styles.customColorSection, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.label, { color: colors.text }]}>
                            Hex Code (e.g., #FF0000)
                        </Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[
                                    styles.hexInput,
                                    {
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                        borderColor: colors.border,
                                    },
                                ]}
                                placeholder="#XXXXXX"
                                placeholderTextColor={colors.textSecondary}
                                value={customHex}
                                onChangeText={setCustomHex}
                                maxLength={7}
                            />
                            {customHex && (
                                <View
                                    style={[
                                        styles.previewCircle,
                                        { backgroundColor: customHex },
                                    ]}
                                />
                            )}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.applyButton,
                                { backgroundColor: colors.primary },
                            ]}
                            onPress={handleCustomColor}
                        >
                            <Text style={styles.applyButtonText}>Apply Custom Color</Text>
                        </TouchableOpacity>
                    </View>
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
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginTop: 16,
    },
    colorOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    colorPreview: {
        marginRight: 12,
    },
    colorCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    colorInfo: {
        flex: 1,
    },
    colorName: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    colorCode: {
        fontSize: 12,
    },
    customColorSection: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    hexInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        fontWeight: '500',
    },
    previewCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginLeft: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    applyButton: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
