// Progress Bar Component - Smooth 60fps animations with Reanimated & Gesture Handler
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
    useDerivedValue,
} from 'react-native-reanimated';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { ABRepeatState } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = 16;
const TRACK_HEIGHT = 4;

interface ProgressBarProps {
    width?: number;
    abRepeat?: ABRepeatState | null;
    pointA?: number | null;
}

const formatTime = (seconds: number): string => {
    'worklet';
    if (seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ProgressBar: React.FC<ProgressBarProps> = ({ width = SCREEN_WIDTH - 48, abRepeat, pointA }) => {
    const { colors } = useTheme();
    // Update progress every 250ms for a balance between smoothness and bridge traffic
    const { position, duration } = useProgress(250); 
    
    const isScrubbing = useSharedValue(false);
    const progressSv = useSharedValue(0); // 0 to 1
    const [displayTime, setDisplayTime] = useState('0:00');
    
    // Sync shared value with player progress when not scrubbing
    useEffect(() => {
        if (!isScrubbing.value && duration > 0) {
            progressSv.value = position / duration;
        }
    }, [position, duration]);

    // Update display time (JS thread) separately to avoid heavy re-renders
    // We update this locally during scrub, or use the prop when playing
    useEffect(() => {
        if (!isScrubbing.value) {
            setDisplayTime(formatTime(position));
        }
    }, [position]);

    const handleSeek = useCallback(async (seekTime: number) => {
        await TrackPlayer.seekTo(seekTime);
    }, []);

    const updateTimeDisplay = (progress: number) => {
        // This function runs on JS thread invoked from UI thread
        const currentTime = progress * duration;
        setDisplayTime(formatTime(currentTime));
    };

    const pan = Gesture.Pan()
        .onStart((e) => {
            isScrubbing.value = true;
            const newProgress = Math.max(0, Math.min(1, e.x / width));
            progressSv.value = newProgress;
            runOnJS(updateTimeDisplay)(newProgress);
        })
        .onUpdate((e) => {
            const newProgress = Math.max(0, Math.min(1, e.x / width));
            progressSv.value = newProgress;
            runOnJS(updateTimeDisplay)(newProgress);
        })
        .onEnd(() => {
            const seekTime = progressSv.value * duration;
            runOnJS(handleSeek)(seekTime);
            isScrubbing.value = false;
        });

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progressSv.value * 100}%`,
    }));

    const animatedThumbStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: progressSv.value * width - THUMB_SIZE / 2 },
            { scale: isScrubbing.value ? 1.5 : 1 },
        ],
    }));

    return (
        <View style={[styles.container, { width }]}>
            <View style={styles.timeRow}>
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                    {displayTime}
                </Text>
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                    {formatTime(duration)}
                </Text>
            </View>

            <GestureDetector gesture={pan}>
                <View style={[styles.touchArea, { width }]}>
                    <View style={[styles.track, { backgroundColor: colors.seekBarBackground }]}>
                        {/* A-B Repeat Highlight */}
                        {abRepeat?.isActive && duration > 0 && (
                            <View
                                style={[
                                    styles.abRegion,
                                    {
                                        left: `${(abRepeat.startPosition / 1000 / duration) * 100}%`,
                                        width: `${((abRepeat.endPosition - abRepeat.startPosition) / 1000 / duration) * 100}%`,
                                        backgroundColor: colors.primary + '30',
                                    },
                                ]}
                            />
                        )}
                        
                        <Animated.View
                            style={[
                                styles.progress,
                                { backgroundColor: colors.primary },
                                animatedProgressStyle,
                            ]}
                        />
                    </View>

                    {/* Markers */}
                    {pointA !== null && duration > 0 && (
                        <View
                            style={[
                                styles.marker,
                                {
                                    left: (pointA / duration) * width,
                                    backgroundColor: '#FFA500', // Orange for Point A
                                },
                            ]}
                        />
                    )}
                    
                    {abRepeat?.isActive && duration > 0 && (
                        <>
                            <View
                                style={[
                                    styles.marker,
                                    {
                                        left: (abRepeat.startPosition / 1000 / duration) * width,
                                        backgroundColor: colors.primary,
                                    },
                                ]}
                            />
                            <View
                                style={[
                                    styles.marker,
                                    {
                                        left: (abRepeat.endPosition / 1000 / duration) * width,
                                        backgroundColor: colors.primary,
                                    },
                                ]}
                            />
                        </>
                    )}

                    <Animated.View
                        style={[
                            styles.thumb,
                            { 
                                backgroundColor: colors.primary,
                                shadowColor: colors.primary, 
                            },
                            animatedThumbStyle,
                        ]}
                    />
                </View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    time: {
        fontSize: typography.sizes.sm,
        fontVariant: ['tabular-nums'], // Monospace numbers to prevent jumping
        width: 45, // Fixed width for stability
        textAlign: 'center',
    },
    touchArea: {
        height: 30, // Larger touch target
        justifyContent: 'center',
    },
    track: {
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        overflow: 'hidden',
        width: '100%',
    },
    progress: {
        height: '100%',
        borderRadius: TRACK_HEIGHT / 2,
    },
    thumb: {
        position: 'absolute',
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        top: (30 - THUMB_SIZE) / 2, // Center vertically in touchArea
        left: 0, // Controlled by translateX
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
    abRegion: {
        position: 'absolute',
        height: '100%',
    },
    marker: {
        position: 'absolute',
        width: 2,
        height: 12,
        top: (30 - 12) / 2,
        borderRadius: 1,
    },
});

export default ProgressBar;