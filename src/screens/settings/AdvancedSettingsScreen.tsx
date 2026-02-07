/**
 * Advanced Settings Folder
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getSettingsFolders } from '../../config/settingsConfig';
import { SettingItem } from '../../components/SettingItem';

export const AdvancedSettingsScreen: React.FC = () => {
    const { colors } = useTheme();
    const folders = getSettingsFolders();
    const folder = folders.find(f => f.id === 'advanced')!;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView>
                {folder.sections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        {section.title && (
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                                {section.title}
                            </Text>
                        )}
                        <View style={[styles.itemsContainer, { backgroundColor: colors.surface }]}>
                            {section.items.map((item) => (
                                <SettingItem key={item.id} item={item} />
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginLeft: 16,
    },
    itemsContainer: {
        borderRadius: 12,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
});
