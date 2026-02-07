// Song Scan Progress Screen - Shows scanning and profiling progress
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import ProgressBarAndroid from '@react-native-community/progress-bar-android';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { ScanProgress, ScanResults } from '@/services/SongScannerService';

interface ScanProgressScreenProps {
    progress: ScanProgress;
    onComplete: (results: ScanResults) => void;
    isBackgroundScan?: boolean;
}

const ScanProgressScreen: React.FC<ScanProgressScreenProps> = ({
    progress,
    onComplete,
    isBackgroundScan = false,
}) => {
    const [status, setStatus] = useState(isBackgroundScan ? 'Scanning in background...' : 'Initializing scan...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Update status based on progress
        if (progress.totalFound === 0) {
            setStatus('Scanning folders...');
        } else if (progress.profiled === 0) {
            setStatus(`Found ${progress.totalFound} files, starting profiling...`);
        } else {
            setStatus(`Profiled ${progress.profiled} of ${progress.totalFound} files`);
        }

        // Call onComplete when scan finishes
        if (!progress.inProgress && progress.profiled > 0) {
            setTimeout(() => {
                onComplete({
                    newTracks: [],
                    updatedTracks: [],
                    removedTracks: [],
                    totalScanned: progress.profiled,
                    durationMs: 0,
                });
            }, 500);
        }
    }, [progress, onComplete]);

    if (error) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle="light-content" />
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={64} color={colors.error} />
                    <Text style={styles.errorTitle}>Scan Failed</Text>
                    <Text style={styles.errorMessage}>{error}</Text>
                    <Text style={styles.retryHint}>Please check folder access and try again</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />
            <View style={styles.content}>
                {/* Icon */}
                <Icon name="music-box-multiple" size={80} color={colors.primary} />

                {/* Title */}
                <Text style={styles.title}>Scanning Music Library</Text>
                <Text style={styles.description}>
                    {isBackgroundScan ? 'Indexing your music in the background...' : 'Finding and profiling your music files...'}
                </Text>

                {/* Progress stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Files Found</Text>
                        <Text style={styles.statValue}>{progress.totalFound}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Profiled</Text>
                        <Text style={styles.statValue}>{progress.profiled}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Progress</Text>
                        <Text style={styles.statValue}>{progress.percentage}%</Text>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressSection}>
                    {progress.inProgress ? (
                        <>
                            <ProgressBarAndroid
                                styleAttr="Horizontal"
                                indeterminate={false}
                                progress={progress.percentage / 100}
                                color={colors.primary}
                                style={styles.progressBar}
                            />
                            <ActivityIndicator size="small" color={colors.primary} />
                        </>
                    ) : (
                        <View style={styles.completeContainer}>
                            <Icon name="check-circle" size={48} color={colors.success} />
                            <Text style={styles.completeText}>Scan Complete!</Text>
                        </View>
                    )}
                </View>

                {/* Current file */}
                {progress.currentFile && (
                    <View style={styles.currentFileContainer}>
                        <Icon name="file-music" size={20} color={colors.textSecondary} />
                        <Text style={styles.currentFile} numberOfLines={2}>
                            {progress.currentFile}
                        </Text>
                    </View>
                )}

                {/* Status text */}
                <Text style={styles.statusText}>{status}</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
    },
    title: {
        ...typography.headingLarge,
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: spacing.xl,
        gap: spacing.md,
    },
    statBox: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
    },
    statLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    statValue: {
        ...typography.headingMedium,
        color: colors.primary,
    },
    progressSection: {
        width: '100%',
        marginBottom: spacing.xl,
        gap: spacing.md,
    },
    progressBar: {
        width: '100%',
        height: 6,
        borderRadius: borderRadius.sm,
    },
    currentFileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
        gap: spacing.md,
    },
    currentFile: {
        ...typography.caption,
        color: colors.text,
        flex: 1,
    },
    statusText: {
        ...typography.body,
        color: colors.text,
        textAlign: 'center',
        marginTop: spacing.lg,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    errorTitle: {
        ...typography.headingMedium,
        color: colors.error,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
    },
    errorMessage: {
        ...typography.body,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    retryHint: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    completeContainer: {
        alignItems: 'center',
        gap: spacing.md,
    },
    completeText: {
        ...typography.body,
        color: colors.text,
    },
});

export default ScanProgressScreen;
