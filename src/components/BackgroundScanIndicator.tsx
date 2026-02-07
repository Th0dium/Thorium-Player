// Background Scan Indicator - Subtle progress indicator for onboarding screens
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import ProgressBarAndroid from '@react-native-community/progress-bar-android';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '@/constants/theme';
import { ScanProgress } from '@/services/SongScannerService';

interface BackgroundScanIndicatorProps {
    progress: ScanProgress;
    show: boolean;
}

const BackgroundScanIndicator: React.FC<BackgroundScanIndicatorProps> = ({
    progress,
    show,
}) => {
    if (!show || !progress.inProgress) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator size="small" color={colors.primary} />
                <View style={styles.textContainer}>
                    <Text style={styles.label}>Indexing music...</Text>
                    <Text style={styles.stats}>
                        {progress.profiled} of {progress.totalFound} • {progress.percentage}%
                    </Text>
                </View>
            </View>
            <ProgressBarAndroid
                styleAttr="Horizontal"
                indeterminate={false}
                progress={progress.percentage / 100}
                color={colors.primary}
                style={styles.progressBar}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
        gap: spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    label: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '500',
    },
    stats: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },
    progressBar: {
        height: 2,
        borderRadius: 1,
    },
});

export default BackgroundScanIndicator;
