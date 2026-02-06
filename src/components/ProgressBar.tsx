// Progress Bar Component - Seek bar with time display and animated thumb
import React, { useRef, useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    PanResponder,
    Dimensions,
    Animated,
} from 'react-native';
import { useProgress } from 'react-native-track-player';
import { usePlayerStore } from '@/store/playerStore';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

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
    const { colors } = useTheme();
    const { position, duration } = useProgress(500);
    const seekTo = usePlayerStore(state => state.seekTo);
    const thumbScale = useRef(new Animated.Value(1)).current;
    const isSeeking = useRef(false);
    const seekProgress = useRef(0);
    const [localPosition, setLocalPosition] = useState<number | null>(null);

    // Use local position while seeking, real position otherwise
    const displayPosition = isSeeking.current && localPosition !== null ? localPosition : position;
    const progress = duration > 0 ? displayPosition / duration : 0;

    const expandThumb = useCallback(() => {
        Animated.spring(thumbScale, {
            toValue: 1.5,
            useNativeDriver: true,
            speed: 50,
            bounciness: 8,
        }).start();
    }, [thumbScale]);

    const shrinkThumb = useCallback(() => {
        Animated.spring(thumbScale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 6,
        }).start();
    }, [thumbScale]);

    const panResponder = React.useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onPanResponderGrant: (evt) => {
                    isSeeking.current = true;
                    expandThumb();
                    const x = evt.nativeEvent.locationX;
                    const newProgress = Math.max(0, Math.min(1, x / width));
                    seekProgress.current = newProgress;
                    setLocalPosition(newProgress * duration);
                },
                onPanResponderMove: (evt) => {
                    const x = evt.nativeEvent.locationX;
                    const newProgress = Math.max(0, Math.min(1, x / width));
                    seekProgress.current = newProgress;
                    setLocalPosition(newProgress * duration);
                },
                onPanResponderRelease: () => {
                    // Only seek on release to avoid audio stuttering
                    seekTo(seekProgress.current * duration);
                    isSeeking.current = false;
                    setLocalPosition(null);
                    shrinkThumb();
                },
            }),
        [width, duration, seekTo, expandThumb, shrinkThumb]
    );

    return (
        <View style={styles.container}>
            <View style={styles.timeRow}>
                <Text style={[styles.time, { color: colors.textSecondary }]}>{formatTime(displayPosition)}</Text>
                <Text style={[styles.time, { color: colors.textSecondary }]}>{formatTime(duration)}</Text>
            </View>

            <View
                style={[styles.trackContainer, { width }]}
                {...panResponder.panHandlers}
            >
                <View style={[styles.track, { backgroundColor: colors.seekBarBackground }]}>
                    <View style={[styles.progress, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
                </View>
                <Animated.View
                    style={[
                        styles.thumb,
                        {
                            left: progress * width - 8,
                            backgroundColor: colors.primary,
                            shadowColor: colors.primary,
                            transform: [{ scale: thumbScale }],
                        },
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
    },
    trackContainer: {
        height: 24,
        justifyContent: 'center',
    },
    track: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progress: {
        height: '100%',
        borderRadius: 2,
    },
    thumb: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
});

export default ProgressBar;
