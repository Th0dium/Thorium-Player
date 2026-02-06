// Scanner Setup Screen - Configure music discovery settings
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
    ScrollView,
    Switch,
    ActivityIndicator,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { fileSystemService } from '@/services/FileSystemService';
import FolderBrowser from '@/components/FolderBrowser';

interface ScannerSetupScreenProps {
    onNext: (settings: any) => void;
    onBack: () => void;
}

interface DetectedFolder {
    path: string;
    name: string;
    selected: boolean;
    estimatedCount?: number;
}

const ScannerSetupScreen: React.FC<ScannerSetupScreenProps> = ({ onNext, onBack }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [detectedFolders, setDetectedFolders] = useState<DetectedFolder[]>([]);
    const [excludeRingtones, setExcludeRingtones] = useState(true);
    const [excludeNotifications, setExcludeNotifications] = useState(true);
    const [excludeShortFiles, setExcludeShortFiles] = useState(true);
    const [minDuration, setMinDuration] = useState(30); // seconds
    const [showFolderBrowser, setShowFolderBrowser] = useState(false);

    useEffect(() => {
        detectMusicFolders();
    }, []);

    const detectMusicFolders = async () => {
        setIsScanning(true);
        try {
            // Common music directories
            const commonPaths = [
                '/storage/emulated/0/Music',
                '/storage/emulated/0/Download',
                '/storage/emulated/0/Downloads',
                '/storage/emulated/0/DCIM',
                '/storage/emulated/0/Podcasts',
            ];

            const folders: DetectedFolder[] = [];
            for (const path of commonPaths) {
                try {
                    const exists = await fileSystemService.exists(path);
                    if (exists) {
                        folders.push({
                            path,
                            name: path.split('/').pop() || path,
                            selected: path.includes('Music'),
                        });
                    }
                } catch (e) {
                    // Folder doesn't exist or no access
                }
            }

            setDetectedFolders(folders);
        } catch (error) {
            console.error('Error detecting folders:', error);
        }
        setIsScanning(false);
    };

    const toggleFolder = (index: number) => {
        setDetectedFolders(prev =>
            prev.map((folder, i) =>
                i === index ? { ...folder, selected: !folder.selected } : folder
            )
        );
    };

    const handleManualFolderSelect = (path: string) => {
        // Add the selected folder if not already in list
        const exists = detectedFolders.some(f => f.path === path);
        if (!exists) {
            const folderName = path.split('/').pop() || path;
            setDetectedFolders([
                ...detectedFolders,
                {
                    path,
                    name: folderName,
                    selected: true,
                    estimatedCount: 0,
                }
            ]);
        }
        setShowFolderBrowser(false);
    };

    const removeFolder = (index: number) => {
        setDetectedFolders(prev => prev.filter((_, i) => i !== index));
    };

    const handleContinue = () => {
        // Save settings to store/database
        const settings = {
            folderPaths: detectedFolders.filter(f => f.selected).map(f => f.path),
            excludeRingtones,
            excludeNotifications,
            excludeShortFiles,
            minDuration,
        };
        console.log('Scanner settings:', settings);
        onNext(settings);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>

                {/* Progress indicator */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                    <View style={styles.progressDot} />
                </View>

                {/* Title */}
                <Text style={styles.title}>Music Discovery</Text>
                <Text style={styles.description}>
                    Select folders where your music is stored
                </Text>

                {/* Music Folders */}
                <View style={styles.foldersSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Music Folders</Text>
                        <TouchableOpacity
                            style={styles.addFolderButton}
                            onPress={() => setShowFolderBrowser(true)}
                        >
                            <Icon name="plus" size={20} color={colors.background} />
                            <Text style={styles.addFolderButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {isScanning ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.loadingText}>Scanning for music folders...</Text>
                        </View>
                    ) : detectedFolders.length > 0 ? (
                        detectedFolders.map((folder, index) => (
                            <View key={folder.path} style={styles.folderItem}>
                                <TouchableOpacity
                                    style={styles.folderCheckbox}
                                    onPress={() => toggleFolder(index)}
                                >
                                    <Icon
                                        name={folder.selected ? "checkbox-marked" : "checkbox-blank-outline"}
                                        size={24}
                                        color={folder.selected ? colors.primary : colors.textSecondary}
                                    />
                                </TouchableOpacity>
                                <View style={styles.folderInfo}>
                                    <View style={styles.folderTextContainer}>
                                        <Icon name="folder-music" size={20} color={colors.primary} />
                                        <Text style={styles.folderName}>{folder.name}</Text>
                                    </View>
                                    <Text style={styles.folderPath} numberOfLines={1}>
                                        {folder.path}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeFolderButton}
                                    onPress={() => removeFolder(index)}
                                >
                                    <Icon name="close" size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyFoldersContainer}>
                            <Icon name="folder-open" size={40} color={colors.textSecondary} />
                            <Text style={styles.emptyFoldersText}>
                                No folders selected yet
                            </Text>
                            <Text style={styles.emptyFoldersSubtext}>
                                Tap "Add" to select where your music is stored
                            </Text>
                        </View>
                    )}
                </View>

                {/* Filter Options */}
                <View style={styles.filtersSection}>
                    <Text style={styles.sectionTitle}>Smart Filters</Text>
                    <Text style={styles.sectionDescription}>
                        Automatically exclude non-music audio
                    </Text>

                    <View style={styles.filterItem}>
                        <View style={styles.filterInfo}>
                            <Icon name="bell-off" size={20} color={colors.textSecondary} />
                            <Text style={styles.filterText}>Exclude Ringtones</Text>
                        </View>
                        <Switch
                            value={excludeRingtones}
                            onValueChange={setExcludeRingtones}
                            trackColor={{ false: colors.surface, true: colors.primary + '50' }}
                            thumbColor={excludeRingtones ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    <View style={styles.filterItem}>
                        <View style={styles.filterInfo}>
                            <Icon name="message-badge-outline" size={20} color={colors.textSecondary} />
                            <Text style={styles.filterText}>Exclude Notifications</Text>
                        </View>
                        <Switch
                            value={excludeNotifications}
                            onValueChange={setExcludeNotifications}
                            trackColor={{ false: colors.surface, true: colors.primary + '50' }}
                            thumbColor={excludeNotifications ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    <View style={styles.filterItem}>
                        <View style={styles.filterInfo}>
                            <Icon name="timer-sand" size={20} color={colors.textSecondary} />
                            <Text style={styles.filterText}>Skip files under 30 seconds</Text>
                        </View>
                        <Switch
                            value={excludeShortFiles}
                            onValueChange={setExcludeShortFiles}
                            trackColor={{ false: colors.surface, true: colors.primary + '50' }}
                            thumbColor={excludeShortFiles ? colors.primary : colors.textSecondary}
                        />
                    </View>
                </View>

                {/* Info note */}
                <View style={styles.infoNote}>
                    <Icon name="information" size={16} color={colors.textMuted} />
                    <Text style={styles.infoNoteText}>
                        You can change these settings anytime in the app settings
                    </Text>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Icon name="arrow-right" size={20} color={colors.background} />
                </TouchableOpacity>
            </View>

            {/* Folder Browser Modal */}
            <Modal
                visible={showFolderBrowser}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setShowFolderBrowser(false)}
            >
                <FolderBrowser
                    onSelectFolder={handleManualFolderSelect}
                    onClose={() => setShowFolderBrowser(false)}
                    currentPath="/storage/emulated/0"
                />
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    backButton: {
        padding: spacing.sm,
        marginLeft: -spacing.sm,
        marginBottom: spacing.lg,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.surface,
        marginHorizontal: spacing.xs,
    },
    progressDotActive: {
        backgroundColor: colors.primary,
    },
    title: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    modeContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    modeOption: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    modeOptionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    modeTitle: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    modeTitleActive: {
        color: colors.text,
    },
    modeDescription: {
        fontSize: typography.sizes.xs,
        color: colors.textMuted,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    modeCheck: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
    },
    foldersSection: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    sectionDescription: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    addFolderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    addFolderButtonText: {
        color: colors.background,
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        marginLeft: spacing.xs,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    loadingText: {
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    folderCheckbox: {
        paddingRight: spacing.sm,
    },
    folderInfo: {
        flex: 1,
    },
    folderTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    folderName: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
        color: colors.text,
    },
    folderPath: {
        fontSize: typography.sizes.xs,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    removeFolderButton: {
        padding: spacing.sm,
    },
    emptyFoldersContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
    },
    emptyFoldersText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    emptyFoldersSubtext: {
        fontSize: typography.sizes.sm,
        color: colors.textMuted,
        marginTop: spacing.sm,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
    },
    noFoldersText: {
        fontSize: typography.sizes.sm,
        color: colors.textMuted,
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },
    filtersSection: {
        marginBottom: spacing.xl,
    },
    filterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    filterInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterText: {
        fontSize: typography.sizes.md,
        color: colors.text,
        marginLeft: spacing.md,
    },
    infoNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xxl,
    },
    infoNoteText: {
        fontSize: typography.sizes.xs,
        color: colors.textMuted,
        marginLeft: spacing.xs,
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    continueButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButtonText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.background,
        marginRight: spacing.sm,
    },
});

export default ScannerSetupScreen;
