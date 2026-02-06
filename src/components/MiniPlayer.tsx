// Mini Player Component - Compact player bar at bottom of screen
// Musicolet-style: slim bar with seek bar at top, song info, and controls
import React, { memo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useProgress } from 'react-native-track-player';
import { usePlayerStore } from '@/store/playerStore';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface MiniPlayerProps {
    onPress: () => void;
}

// Separate progress bar component that handles frequent updates
// This prevents the entire MiniPlayer from re-rendering on every position update
const MiniPlayerProgress = memo(() => {
    const { colors } = useTheme();
    // useProgress updates frequently - isolate it here
    const { position, duration } = useProgress(200); // Update every 200ms instead of default
    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <View style={[progressStyles.container, { backgroundColor: colors.seekBarBackground }]}>
            <View style={[progressStyles.bar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
        </View>
    );
});

const progressStyles = StyleSheet.create({
    container: {
        height: 3,
        borderTopLeftRadius: borderRadius.md,
        borderTopRightRadius: borderRadius.md,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
    },
});

MiniPlayerProgress.displayName = 'MiniPlayerProgress';

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
    const { colors } = useTheme();
    // Only subscribe to what we need from the store
    const currentTrack = usePlayerStore(state => state.currentTrack);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const togglePlayPause = usePlayerStore(state => state.togglePlayPause);
    const skipNext = usePlayerStore(state => state.skipNext);

    const containerScale = useRef(new Animated.Value(1)).current;
    const playScale = useRef(new Animated.Value(1)).current;
    const skipScale = useRef(new Animated.Value(1)).current;

    const animatePress = useCallback((anim: Animated.Value, down: boolean) => {
        Animated.spring(anim, {
            toValue: down ? 0.92 : 1,
            useNativeDriver: true,
            speed: down ? 50 : 30,
            bounciness: down ? 4 : 8,
        }).start();
    }, []);

    const handlePlayPause = useCallback((e: any) => {
        e.stopPropagation();
        togglePlayPause();
    }, [togglePlayPause]);

    const handleSkipNext = useCallback((e: any) => {
        e.stopPropagation();
        skipNext();
    }, [skipNext]);

    if (!currentTrack) return null;

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: colors.surfaceElevated }]}
            onPress={onPress}
            onPressIn={() => animatePress(containerScale, true)}
            onPressOut={() => animatePress(containerScale, false)}
            activeOpacity={1}
        >
            <Animated.View style={{ transform: [{ scale: containerScale }] }}>
                {/* Seek bar at top of mini-player - isolated component */}
                <MiniPlayerProgress />

                <View style={styles.content}>
                    {/* Album artwork */}
                    <View style={styles.artworkContainer}>
                        {currentTrack.albumArt ? (
                            <Image
                                source={{ uri: currentTrack.albumArt }}
                                style={styles.artwork}
                            />
                        ) : (
                            <View style={[styles.artworkPlaceholder, { backgroundColor: colors.surface }]}>
                                <Icon name="music-note" size={18} color={colors.textTertiary} />
                            </View>
                        )}
                    </View>

                    {/* Track info */}
                    <View style={styles.infoContainer}>
                        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                            {currentTrack.title}
                        </Text>
                        <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
                            {currentTrack.artist}
                        </Text>
                    </View>

                    {/* Controls */}
                    <View style={styles.controlsContainer}>
                        <TouchableOpacity
                            onPress={handlePlayPause}
                            onPressIn={() => animatePress(playScale, true)}
                            onPressOut={() => animatePress(playScale, false)}
                            style={styles.controlButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={1}
                        >
                            <Animated.View style={{ transform: [{ scale: playScale }] }}>
                                <Icon
                                    name={isPlaying ? 'pause' : 'play'}
                                    size={28}
                                    color={colors.textPrimary}
                                />
                            </Animated.View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSkipNext}
                            onPressIn={() => animatePress(skipScale, true)}
                            onPressOut={() => animatePress(skipScale, false)}
                            style={styles.controlButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={1}
                        >
                            <Animated.View style={{ transform: [{ scale: skipScale }] }}>
                                <Icon name="skip-next" size={24} color={colors.textPrimary} />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 64,
        borderTopLeftRadius: borderRadius.md,
        borderTopRightRadius: borderRadius.md,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    artworkContainer: {
        width: 44,
        height: 44,
        marginRight: spacing.md,
    },
    artwork: {
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.sm,
    },
    artworkPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: typography.sizes.sm,
        fontWeight: '600',
    },
    artist: {
        fontSize: typography.sizes.xs,
        marginTop: 1,
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButton: {
        padding: spacing.sm,
    },
});

export default MiniPlayer;
