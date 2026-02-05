// Folder Browser - Component for selecting folders manually
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface FolderItem {
    name: string;
    path: string;
    isDirectory: boolean;
}

interface FolderBrowserProps {
    onSelectFolder: (path: string) => void;
    onClose: () => void;
    currentPath?: string;
}

const FolderBrowser: React.FC<FolderBrowserProps> = ({
    onSelectFolder,
    onClose,
    currentPath = '/storage/emulated/0',
}) => {
    const [items, setItems] = useState<FolderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [path, setPath] = useState(currentPath);
    const [pathHistory, setPathHistory] = useState<string[]>([currentPath]);

    useEffect(() => {
        loadDirectory(path);
    }, [path]);

    const loadDirectory = async (dirPath: string) => {
        setIsLoading(true);
        try {
            const files = await RNFS.readDir(dirPath);
            const folders = files
                .filter(file => file.isDirectory())
                .map(file => ({
                    name: file.name,
                    path: file.path,
                    isDirectory: true,
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            setItems(folders);
        } catch (error) {
            console.error('Error reading directory:', error);
            setItems([]);
        }
        setIsLoading(false);
    };

    const handleFolderPress = (folderPath: string) => {
        setPath(folderPath);
        setPathHistory([...pathHistory, folderPath]);
    };

    const handleBack = () => {
        if (pathHistory.length > 1) {
            const newHistory = pathHistory.slice(0, -1);
            const previousPath = newHistory[newHistory.length - 1];
            setPath(previousPath);
            setPathHistory(newHistory);
        }
    };

    const handleSelectCurrentFolder = () => {
        onSelectFolder(path);
    };

    const canGoBack = pathHistory.length > 1;
    const pathParts = path.split('/').filter(p => p);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Select Folder</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Breadcrumb Navigation */}
            <View style={styles.breadcrumb}>
                <TouchableOpacity
                    style={styles.breadcrumbItem}
                    onPress={() => {
                        setPath('/storage/emulated/0');
                        setPathHistory(['/storage/emulated/0']);
                    }}
                >
                    <Icon name="home" size={16} color={colors.primary} />
                    <Text style={styles.breadcrumbText}>Home</Text>
                </TouchableOpacity>

                {pathParts.map((part, index) => {
                    const itemPath = '/' + pathParts.slice(0, index + 1).join('/');
                    const isLast = index === pathParts.length - 1;

                    return (
                        <View key={itemPath}>
                            <Text style={styles.breadcrumbSeparator}>/</Text>
                            <TouchableOpacity
                                style={[
                                    styles.breadcrumbItem,
                                    isLast && styles.breadcrumbItemActive,
                                ]}
                                onPress={() => {
                                    setPath(itemPath);
                                    const newHistory = ['/storage/emulated/0', ...pathParts.slice(0, index + 1).map((_, i) => '/' + pathParts.slice(0, i + 1).join('/'))];
                                    setPathHistory(newHistory);
                                }}
                            >
                                <Text style={[
                                    styles.breadcrumbText,
                                    isLast && styles.breadcrumbTextActive,
                                ]}>
                                    {part}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>

            {/* Folders List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading folders...</Text>
                </View>
            ) : items.length > 0 ? (
                <FlatList
                    data={items}
                    keyExtractor={item => item.path}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.folderItem}
                            onPress={() => handleFolderPress(item.path)}
                        >
                            <Icon name="folder" size={24} color={colors.primary} />
                            <Text style={styles.folderName}>{item.name}</Text>
                            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Icon name="folder-open" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>No folders found</Text>
                </View>
            )}

            {/* Footer - Action Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                    disabled={!canGoBack}
                >
                    <Icon
                        name="arrow-left"
                        size={20}
                        color={canGoBack ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.buttonText,
                        !canGoBack && styles.buttonTextDisabled,
                    ]}>
                        Back
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.selectButton}
                    onPress={handleSelectCurrentFolder}
                >
                    <Icon name="check" size={20} color={colors.background} />
                    <Text style={styles.selectButtonText}>Select This Folder</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomColor: colors.backgroundSecondary,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: spacing.sm,
    },
    title: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomColor: colors.backgroundSecondary,
        borderBottomWidth: 1,
    },
    breadcrumbItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    breadcrumbItemActive: {
        backgroundColor: colors.primary + '15',
        borderRadius: borderRadius.sm,
    },
    breadcrumbText: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    breadcrumbTextActive: {
        color: colors.primary,
        fontWeight: typography.weights.medium,
    },
    breadcrumbSeparator: {
        color: colors.textSecondary,
        marginHorizontal: spacing.xs,
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        marginVertical: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
    },
    folderName: {
        flex: 1,
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
        marginLeft: spacing.md,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: spacing.md,
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopColor: colors.backgroundSecondary,
        borderTopWidth: 1,
        gap: spacing.md,
    },
    backButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        borderColor: colors.primary,
        borderWidth: 1,
    },
    buttonText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
        color: colors.primary,
        marginLeft: spacing.sm,
    },
    buttonTextDisabled: {
        color: colors.textSecondary,
    },
    selectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.primary,
    },
    selectButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
        color: colors.background,
        marginLeft: spacing.sm,
    },
});

export default FolderBrowser;
