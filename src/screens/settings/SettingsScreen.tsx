/**
 * Main Settings Screen
 * Hub for 6 settings folders
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getSettingsFolders } from '../../config/settingsConfig';
import { NavigationProp } from '@react-navigation/native';

interface SettingsScreenProps {
    navigation: NavigationProp<any>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
    const { colors } = useTheme();
    const settingsFolders = getSettingsFolders();

    const navigateToFolder = (folderId: string) => {
        // Map folder IDs to screen names
        const screenMap: Record<string, string> = {
            appearance: 'AppearanceSettings',
            playback: 'PlaybackSettings',
            library: 'LibrarySettings',
            data_backup: 'DataBackupSettings',
            advanced: 'AdvancedSettings',
            unsorted: 'UnsortedSettings',
        };

        const screenName = screenMap[folderId];
        if (screenName) {
            navigation.navigate(screenName);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView>
                <View style={[styles.listContainer, { backgroundColor: colors.surface }]}>
                    {settingsFolders.map((folder, index) => (
                        <TouchableOpacity
                            key={folder.id}
                            style={[
                                styles.folderItem,
                                {
                                    borderBottomColor: colors.border,
                                    borderBottomWidth: index < settingsFolders.length - 1 ? StyleSheet.hairlineWidth : 0,
                                },
                            ]}
                            onPress={() => navigateToFolder(folder.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.folderTitle, { color: colors.text }]}>
                                {folder.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        marginTop: 24,
        marginHorizontal: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    folderItem: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    folderTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
});