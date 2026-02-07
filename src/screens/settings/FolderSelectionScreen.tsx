/**
 * Folder Selection Screen
 * Allows users to select which folders to scan for music files
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsStore } from '../../store/settingsStore';
import { fileSystemService } from '../../services/FileSystemService';

interface FolderItem {
    path: string;
    name: string;
    selected: boolean;
}

export const FolderSelectionScreen: React.FC = () => {
    const { colors } = useTheme();
    const scanFolders = useSettingsStore((state) => state.scanFolders);
    const setScanFolders = useSettingsStore((state) => state.setScanFolders);

    const defaultPaths = fileSystemService.getDefaultMusicPaths();
    const [folders, setFolders] = useState<FolderItem[]>(
        defaultPaths.map(path => ({
            path,
            name: path.split('/').pop() || path,
            selected: scanFolders.includes(path),
        }))
    );

    const handleToggle = (path: string) => {
        setFolders(prev =>
            prev.map(f =>
                f.path === path ? { ...f, selected: !f.selected } : f
            )
        );
    };

    const handleSave = () => {
        const selectedPaths = folders.filter(f => f.selected).map(f => f.path);

        if (selectedPaths.length === 0) {
            Alert.alert('No Folders Selected', 'Please select at least one folder to scan for music.');
            return;
        }

        setScanFolders(selectedPaths);
        Alert.alert('Success', `Configured ${selectedPaths.length} folder${selectedPaths.length === 1 ? '' : 's'} to scan`);
    };

    const selectedCount = folders.filter(f => f.selected).length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Selected count */}
                <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerText, { color: colors.text }]}>
                        {selectedCount === 0 ? 'No folders selected' : `${selectedCount} folder${selectedCount === 1 ? '' : 's'} selected`}
                    </Text>
                </View>

                {/* Folder list */}
                <View style={styles.folderList}>
                    {folders.map((folder) => (
                        <TouchableOpacity
                            key={folder.path}
                            style={[
                                styles.folderItem,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                },
                                folder.selected && {
                                    borderLeftColor: colors.primary,
                                    borderLeftWidth: 4,
                                }
                            ]}
                            onPress={() => handleToggle(folder.path)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.folderInfo}>
                                <Icon
                                    name="folder-outline"
                                    size={24}
                                    color={colors.primary}
                                    style={styles.folderIcon}
                                />
                                <View style={styles.folderDetails}>
                                    <Text style={[styles.folderName, { color: colors.text }]}>
                                        {folder.name}
                                    </Text>
                                    <Text style={[styles.folderPath, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {folder.path}
                                    </Text>
                                </View>
                            </View>

                            {folder.selected && (
                                <Icon
                                    name="checkmark-circle"
                                    size={24}
                                    color={colors.primary}
                                />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Info text */}
                <View style={styles.infoSection}>
                    <Icon name="information-circle-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Selected folders will be scanned for music files when you tap "Rescan Library"
                    </Text>
                </View>
            </ScrollView>

            {/* Save button */}
            <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                activeOpacity={0.8}
            >
                <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingBottom: 80,
    },
    header: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerText: {
        fontSize: 16,
        fontWeight: '600',
    },
    folderList: {
        paddingVertical: 8,
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    folderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    folderIcon: {
        marginRight: 12,
    },
    folderDetails: {
        flex: 1,
    },
    folderName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    folderPath: {
        fontSize: 13,
    },
    infoSection: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 8,
    },
    infoText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    saveButton: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
