// Backup & Restore Screen - UI for managing app backups
// Allows creating backups, viewing backup history, and restoring data
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DocumentPicker from 'react-native-document-picker';
import Share from 'react-native-share';
import { useTheme } from '@/context/ThemeContext';
import { backupService } from '@/services/BackupService';
import { BackupMetadata } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface BackupItem {
    path: string;
    metadata: BackupMetadata;
}

interface BackupRestoreScreenProps {
    navigation?: any;
}

const BackupRestoreScreen: React.FC<BackupRestoreScreenProps> = ({ navigation }) => {
    const { colors } = useTheme();
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [backupName, setBackupName] = useState('');
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null);
    const [restoreOptions, setRestoreOptions] = useState({
        restoreSettings: true,
        restorePlaylists: true,
        restoreQueues: true,
    });
    const [newMusicRoot, setNewMusicRoot] = useState('');

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        try {
            const backupList = await backupService.listBackups();
            setBackups(backupList);
        } catch (error) {
            console.error('Error loading backups:', error);
        }
    };

    const handleCreateBackup = useCallback(async () => {
        setShowCreateModal(false);
        setIsLoading(true);
        setLoadingMessage('Creating backup...');

        try {
            const backupPath = await backupService.createBackup(backupName || undefined);
            Alert.alert(
                'Backup Created',
                'Your backup has been created successfully.',
                [
                    { text: 'OK' },
                    {
                        text: 'Share',
                        onPress: () => handleShareBackup(backupPath),
                    },
                ]
            );
            setBackupName('');
            await loadBackups();
        } catch (error) {
            Alert.alert('Error', 'Failed to create backup. Please try again.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [backupName]);

    const handleShareBackup = async (backupPath: string) => {
        try {
            await Share.open({
                url: `file://${backupPath}`,
                type: 'application/octet-stream',
                title: 'Share Thorium Backup',
            });
        } catch (error) {
            if ((error as any).message !== 'User did not share') {
                Alert.alert('Error', 'Failed to share backup.');
            }
        }
    };

    const handleImportBackup = async () => {
        try {
            const result = await DocumentPicker.pick({
                type: [DocumentPicker.types.allFiles],
            });

            if (result[0]) {
                setIsLoading(true);
                setLoadingMessage('Validating backup...');

                const validation = await backupService.validateBackup(result[0].uri);

                if (validation.valid && validation.metadata) {
                    setSelectedBackup({
                        path: result[0].uri,
                        metadata: validation.metadata,
                    });
                    setShowRestoreModal(true);
                } else {
                    Alert.alert('Invalid Backup', validation.error || 'The selected file is not a valid backup.');
                }
            }
        } catch (error) {
            if (!DocumentPicker.isCancel(error)) {
                Alert.alert('Error', 'Failed to import backup file.');
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleRestoreBackup = async () => {
        if (!selectedBackup) return;

        setShowRestoreModal(false);
        setIsLoading(true);
        setLoadingMessage('Restoring backup...');

        try {
            const result = await backupService.restoreBackup(
                selectedBackup.path,
                newMusicRoot || undefined,
                restoreOptions
            );

            if (result.success) {
                let message = 'Backup restored successfully!';
                if (result.remappedCount > 0) {
                    message += `\n${result.remappedCount} files were found and linked.`;
                }
                if (result.unmappedPaths.length > 0) {
                    message += `\n${result.unmappedPaths.length} files could not be found.`;
                }

                Alert.alert('Restore Complete', message, [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Reload the app or navigate to library
                            if (navigation) {
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Main' }],
                                });
                            }
                        },
                    },
                ]);
            } else {
                Alert.alert('Restore Failed', result.error || 'Unknown error occurred.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to restore backup.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
            setSelectedBackup(null);
            setNewMusicRoot('');
        }
    };

    const handleDeleteBackup = (backup: BackupItem) => {
        Alert.alert(
            'Delete Backup',
            `Are you sure you want to delete this backup from ${formatDate(backup.metadata.backupDate)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await backupService.deleteBackup(backup.path);
                        await loadBackups();
                    },
                },
            ]
        );
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatSize = (trackCount: number) => {
        if (trackCount < 100) return `${trackCount} tracks`;
        if (trackCount < 1000) return `${trackCount} tracks`;
        return `${(trackCount / 1000).toFixed(1)}k tracks`;
    };

    const styles = createStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Backup & Restore</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Icon name="information" size={24} color={colors.primary} />
                    <Text style={styles.infoText}>
                        Backups include your playlists, play counts, favorites, ratings, and settings.
                        Music files are not included - only the metadata and references.
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        onPress={() => setShowCreateModal(true)}
                    >
                        <Icon name="cloud-upload" size={24} color="#FFF" />
                        <Text style={styles.actionButtonText}>Create Backup</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                        onPress={handleImportBackup}
                    >
                        <Icon name="cloud-download" size={24} color={colors.textPrimary} />
                        <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                            Import Backup
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Backup History */}
                <Text style={styles.sectionTitle}>Backup History</Text>

                {backups.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="backup-restore" size={48} color={colors.textTertiary} />
                        <Text style={styles.emptyText}>No backups yet</Text>
                        <Text style={styles.emptySubtext}>Create a backup to protect your library data</Text>
                    </View>
                ) : (
                    backups.map((backup, index) => (
                        <View key={index} style={styles.backupItem}>
                            <View style={styles.backupIcon}>
                                <Icon name="archive" size={24} color={colors.primary} />
                            </View>
                            <View style={styles.backupInfo}>
                                <Text style={styles.backupDate}>{formatDate(backup.metadata.backupDate)}</Text>
                                <Text style={styles.backupMeta}>
                                    {formatSize(backup.metadata.trackCount)} • {backup.metadata.playlistCount} playlists
                                </Text>
                                <Text style={styles.backupDevice}>{backup.metadata.deviceName}</Text>
                            </View>
                            <View style={styles.backupActions}>
                                <TouchableOpacity
                                    style={styles.backupActionButton}
                                    onPress={() => {
                                        setSelectedBackup(backup);
                                        setShowRestoreModal(true);
                                    }}
                                >
                                    <Icon name="restore" size={20} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.backupActionButton}
                                    onPress={() => handleShareBackup(backup.path)}
                                >
                                    <Icon name="share-variant" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.backupActionButton}
                                    onPress={() => handleDeleteBackup(backup)}
                                >
                                    <Icon name="delete" size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Loading Overlay */}
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContent}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>{loadingMessage}</Text>
                    </View>
                </View>
            )}

            {/* Create Backup Modal */}
            <Modal visible={showCreateModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <Text style={styles.modalTitle}>Create Backup</Text>
                        <Text style={styles.modalSubtitle}>
                            Give your backup a name (optional)
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                            placeholder="Backup name (optional)"
                            placeholderTextColor={colors.textTertiary}
                            value={backupName}
                            onChangeText={setBackupName}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.surfaceVariant }]}
                                onPress={() => setShowCreateModal(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleCreateBackup}
                            >
                                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Restore Backup Modal */}
            <Modal visible={showRestoreModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <Text style={styles.modalTitle}>Restore Backup</Text>

                        {selectedBackup && (
                            <View style={styles.restoreInfo}>
                                <Text style={styles.restoreInfoText}>
                                    From: {formatDate(selectedBackup.metadata.backupDate)}
                                </Text>
                                <Text style={styles.restoreInfoText}>
                                    {selectedBackup.metadata.trackCount} tracks • {selectedBackup.metadata.playlistCount} playlists
                                </Text>
                            </View>
                        )}

                        <Text style={styles.restoreLabel}>What to restore:</Text>

                        <TouchableOpacity
                            style={styles.checkboxRow}
                            onPress={() => setRestoreOptions(o => ({ ...o, restoreSettings: !o.restoreSettings }))}
                        >
                            <Icon
                                name={restoreOptions.restoreSettings ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                size={24}
                                color={colors.primary}
                            />
                            <Text style={styles.checkboxLabel}>Settings & preferences</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.checkboxRow}
                            onPress={() => setRestoreOptions(o => ({ ...o, restorePlaylists: !o.restorePlaylists }))}
                        >
                            <Icon
                                name={restoreOptions.restorePlaylists ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                size={24}
                                color={colors.primary}
                            />
                            <Text style={styles.checkboxLabel}>Playlists</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.checkboxRow}
                            onPress={() => setRestoreOptions(o => ({ ...o, restoreQueues: !o.restoreQueues }))}
                        >
                            <Icon
                                name={restoreOptions.restoreQueues ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                size={24}
                                color={colors.primary}
                            />
                            <Text style={styles.checkboxLabel}>Playback queues</Text>
                        </TouchableOpacity>

                        <Text style={[styles.restoreLabel, { marginTop: spacing.lg }]}>
                            Music folder path (if files moved):
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
                            placeholder="/storage/emulated/0/Music"
                            placeholderTextColor={colors.textTertiary}
                            value={newMusicRoot}
                            onChangeText={setNewMusicRoot}
                        />
                        <Text style={styles.pathHint}>
                            Leave empty if music is in the same location
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.surfaceVariant }]}
                                onPress={() => {
                                    setShowRestoreModal(false);
                                    setSelectedBackup(null);
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleRestoreBackup}
                            >
                                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Restore</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        flex: 1,
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold as any,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 32,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.md,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.primary + '15',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    infoText: {
        flex: 1,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
        lineHeight: 20,
    },
    actionSection: {
        flexDirection: 'row',
        marginBottom: spacing.xl,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        marginHorizontal: spacing.xs,
    },
    actionButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold as any,
        color: '#FFF',
        marginLeft: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold as any,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.medium as any,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    emptySubtext: {
        fontSize: typography.sizes.sm,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },
    backupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    backupIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backupInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    backupDate: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
        color: colors.textPrimary,
    },
    backupMeta: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    backupDevice: {
        fontSize: typography.sizes.xs,
        color: colors.textTertiary,
        marginTop: 2,
    },
    backupActions: {
        flexDirection: 'row',
    },
    backupActionButton: {
        padding: spacing.sm,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContent: {
        alignItems: 'center',
    },
    loadingText: {
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
        marginTop: spacing.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        width: '100%',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold as any,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    modalSubtitle: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    modalInput: {
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.sizes.md,
        marginBottom: spacing.md,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.md,
    },
    modalButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        marginLeft: spacing.sm,
    },
    modalButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
    },
    restoreInfo: {
        backgroundColor: colors.surfaceVariant,
        padding: spacing.md,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.lg,
    },
    restoreInfoText: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    restoreLabel: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium as any,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    checkboxLabel: {
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
    },
    pathHint: {
        fontSize: typography.sizes.xs,
        color: colors.textTertiary,
        marginTop: -spacing.xs,
    },
});

export default BackupRestoreScreen;
