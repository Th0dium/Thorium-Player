// Progress Bar Component - Seek bar with time display
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    PanResponder,
    Dimensions,
} from 'react-native';
import { useProgress } from 'react-native-track-player';
import { usePlayerStore } from '@/store/playerStore';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProgressBarProps {
    width?: number;
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ProgressBar: React.FC<ProgressBarProps> = ({ width = SCREEN_WIDTH - 48 }) => {
    const { position, duration } = useProgress();
    const { seekTo } = usePlayerStore();
    const progress = duration > 0 ? position / duration : 0;

    const panResponder = React.useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onPanResponderGrant: (evt) => {
                    const x = evt.nativeEvent.locationX;
                    const newProgress = Math.max(0, Math.min(1, x / width));
                    seekTo(newProgress * duration);
                },
                onPanResponderMove: (evt) => {
                    const x = evt.nativeEvent.locationX;
                    const newProgress = Math.max(0, Math.min(1, x / width));
                    seekTo(newProgress * duration);
                },
            }),
        [width, duration, seekTo]
    );

    return (
        <View style={styles.container}>
            <View style={styles.timeRow}>
                <Text style={styles.time}>{formatTime(position)}</Text>
                <Text style={styles.time}>{formatTime(duration)}</Text>
            </View>

            <View
                style={[styles.trackContainer, { width }]}
                {...panResponder.panHandlers}
            >
                <View style={styles.track}>
                    <View style={[styles.progress, { width: `${progress * 100}%` }]} />
                </View>
                <View
                    style={[
                        styles.thumb,
                        { left: progress * width - 8 },
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    time: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    trackContainer: {
        height: 24,
        justifyContent: 'center',
    },
    track: {
        height: 4,
        backgroundColor: colors.seekBarBackground,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progress: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    thumb: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
});

export default ProgressBar;
