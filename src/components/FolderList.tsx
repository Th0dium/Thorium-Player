/**
 * FolderList Component
 * Reusable folder list UI for adding and removing folders
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { DetectedFolder } from '../hooks/useFolderDetection';

interface FolderListProps {
    folders: DetectedFolder[];
    isScanning: boolean;
    onRemoveFolder: (index: number) => void;
    onAddCustomFolder: () => void;
}

export const FolderList: React.FC<FolderListProps> = ({
    folders,
    isScanning,
    onRemoveFolder,
    onAddCustomFolder,
}) => {
    const { colors } = useTheme();

    if (isScanning && folders.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>Scanning for folders...</Text>
            </View>
        );
    }

    return (
        <>
            {/* Folder list */}
            <View style={styles.folderList}>
                {folders.map((folder, index) => (
                    <View
                        key={folder.path}
                        style={[
                            styles.folderItem,
                            {
                                backgroundColor: colors.surface,
                                borderBottomColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.folderTouchable}>
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

                        <TouchableOpacity
                            style={[styles.removeButton, { borderLeftColor: colors.border }]}
                            onPress={() => onRemoveFolder(index)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Icon name="close-circle-outline" size={20} color={colors.error} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* Add custom folder button */}
            <TouchableOpacity
                style={[styles.addCustomButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                onPress={onAddCustomFolder}
                activeOpacity={0.7}
            >
                <Icon name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addCustomButtonText, { color: colors.primary }]}>Add Folder</Text>
            </TouchableOpacity>

            {/* Empty state */}
            {folders.length === 0 && !isScanning && (
                <View style={styles.emptyContainer}>
                    <Icon name="folder-open" size={40} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>
                        No folders added yet
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                        Tap "Add Folder" to start scanning
                    </Text>
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    loadingText: {
        fontSize: 16,
        marginTop: 12,
    },
    folderList: {
        paddingVertical: 8,
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        justifyContent: 'space-between',
    },
    folderTouchable: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
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
    removeButton: {
        paddingHorizontal: 8,
        paddingLeft: 12,
        borderLeftWidth: StyleSheet.hairlineWidth,
    },
    addCustomButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        gap: 8,
    },
    addCustomButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 4,
    },
});
