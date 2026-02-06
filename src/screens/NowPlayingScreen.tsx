// Now Playing Screen - Full-screen player with album art and controls
// Musicolet-style: Dynamic background, power-user row, swipe-to-dismiss
import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    StatusBar,
    PanResponder,
    Animated,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '@/store/playerStore';
import { useTheme } from '@/context/ThemeContext';
import PlayerControls from '@/components/PlayerControls';
import ProgressBar from '@/components/ProgressBar';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { ABRepeatState } from '@/types';
import SleepTimerModal from '@/components/SleepTimerModal';
import { useSleepTimerStore } from '@/services/SleepTimerService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH - 80;
const SWIPE_THRESHOLD = 100;

interface NowPlayingScreenProps {
    navigation?: any;
}

const NowPlayingScreen: React.FC<NowPlayingScreenProps> = ({
    navigation,
}) => {
    const { colors } = useTheme();
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const toggleFavorite = usePlayerStore(s => s.toggleFavorite);
    const skipNext = usePlayerStore(s => s.skipNext);
    const skipPrevious = usePlayerStore(s => s.skipPrevious);
    const abRepeat = usePlayerStore(s => s.abRepeat);
    const setABRepeat = usePlayerStore(s => s.setABRepeat);
    const clearABRepeat = usePlayerStore(s => s.clearABRepeat);
    const toggleABRepeat = usePlayerStore(s => s.toggleABRepeat);
    const playbackSpeed = usePlayerStore(s => s.playbackSpeed);
    const setPlaybackSpeed = usePlayerStore(s => s.setPlaybackSpeed);

    // A-B Repeat state: 'idle' | 'a-set' (waiting for B point)
    const [abMode, setAbMode] = useState<'idle' | 'a-set'>('idle');
    const [pointA, setPointA] = useState<number | null>(null);

    // Sleep timer
    const [showSleepTimer, setShowSleepTimer] = useState(false);
    const sleepTimerActive = useSleepTimerStore(s => s.isActive);
    const sleepTimerDisplay = useSleepTimerStore(s => s.displayTime);
    const artworkScale = useRef(new Animated.Value(0.85)).current;
    const artworkOpacity = useRef(new Animated.Value(0)).current;
    const heartScale = useRef(new Animated.Value(1)).current;
    const prevTrackId = useRef<string | null>(null);

    // Album art entrance + crossfade on track change
    useEffect(() => {
        const trackId = currentTrack?.id || null;
        if (trackId !== prevTrackId.current) {
            prevTrackId.current = trackId;
            artworkScale.setValue(0.85);
            artworkOpacity.setValue(0);
            Animated.parallel([
                Animated.spring(artworkScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 60,
                    friction: 8,
                }),
                Animated.timing(artworkOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [currentTrack?.id, artworkScale, artworkOpacity]);

    // Favorite heart bounce
    const handleFavoritePress = useCallback(() => {
        Animated.sequence([
            Animated.spring(heartScale, {
                toValue: 1.4,
                useNativeDriver: true,
                speed: 50,
                bounciness: 12,
            }),
            Animated.spring(heartScale, {
                toValue: 1,
                useNativeDriver: true,
                speed: 30,
                bounciness: 8,
            }),
        ]).start();
        toggleFavorite();
    }, [heartScale, toggleFavorite]);

    // Playback speed
    const handleSpeedPress = useCallback(() => {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const buttons = speeds.map(s => ({
            text: `${s}x${s === playbackSpeed ? ' ✓' : ''}`,
            onPress: () => {
                setPlaybackSpeed(s);
            },
        }));
        buttons.push({ text: 'Cancel', onPress: () => { } });
        Alert.alert('Playback Speed', 'Select speed', buttons);
    }, [playbackSpeed]);

    // A-B Repeat handler — state machine: idle → A set → A-B active → clear
    const handleABRepeatPress = useCallback(async () => {
        if (abRepeat && abRepeat.isActive) {
            // Currently active — clear it
            await clearABRepeat();
            setAbMode('idle');
            setPointA(null);
        } else if (abMode === 'idle') {
            // Set point A at current position
            const { position } = await TrackPlayer.getProgress();
            setPointA(position);
            setAbMode('a-set');
        } else if (abMode === 'a-set' && pointA !== null) {
            // Set point B and activate loop
            const { position } = await TrackPlayer.getProgress();
            if (position > pointA) {
                await setABRepeat(pointA, position);
            } else {
                // B must be after A — swap if needed
                await setABRepeat(position, pointA);
            }
            setAbMode('idle');
            setPointA(null);
        }
    }, [abRepeat, abMode, pointA, clearABRepeat, setABRepeat]);

    // Long-press to clear A-B repeat
    const handleABRepeatLongPress = useCallback(async () => {
        if (abRepeat || abMode === 'a-set') {
            await clearABRepeat();
            setAbMode('idle');
            setPointA(null);
        }
    }, [abRepeat, abMode, clearABRepeat]);

    // Pan responder for swipe-down to dismiss
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const absX = Math.abs(gestureState.dx);
                const absY = Math.abs(gestureState.dy);
                // Activate only on vertical movement to allow scroll/other interactions if needed
                // dy > 0 ensures we only respond to downward swipes
                return absY > 10 && absY > absX && gestureState.dy > 0;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > SWIPE_THRESHOLD) {
                    // Swipe was far enough - collapse
                    if (onCollapse) {
                        onCollapse();
                    } else if (navigation) {
                        navigation.goBack();
                    }
                }

                // Reset vertical position
                Animated.spring(panY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 10,
                }).start();
            },
        })
    ).current;

    const handleClose = () => {
        if (onCollapse) {
            onCollapse();
        } else if (navigation) {
            navigation.goBack();
        }
    };

    if (!currentTrack) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
                <Icon name="music-note" size={64} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No track playing</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primaryDark, colors.background, colors.background]}
                style={styles.gradient}
            >
                <StatusBar barStyle="light-content" />
                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                    {/* Header with swipe indicator */}
                    <View style={styles.header}>
                        <View style={[styles.swipeIndicator, { backgroundColor: colors.textTertiary }]} />

                        <View style={styles.headerRow}>
                            <View style={styles.headerButton}>
                                {/* Tab navigation handles back - no close button needed */}
                            </View>

                            <View style={styles.headerCenter}>
                                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                                    PLAYING FROM
                                </Text>
                                <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                                    {currentTrack.album || 'Unknown Album'}
                                </Text>
                            </View>

                            <TouchableOpacity style={styles.headerButton}>
                                <Icon name="dots-vertical" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Album Artwork - Animated entrance + crossfade */}
                    <TouchableOpacity
                        style={styles.artworkContainer}
                        activeOpacity={0.9}
                        onLongPress={() => {/* TODO: Open album art editor */ }}
                    >
                        <Animated.View style={{
                            transform: [
                                { scale: artworkScale },
                            ],
                            opacity: artworkOpacity,
                        }}>
                            {currentTrack.albumArt ? (
                                <View style={styles.artworkShadow}>
                                    <Image
                                        source={{ uri: currentTrack.albumArt }}
                                        style={styles.artworkImage}
                                    />
                                </View>
                            ) : (
                                <View style={[styles.artworkPlaceholder, { backgroundColor: colors.surface }]}>
                                    <Icon name="music-note" size={100} color={colors.textTertiary} />
                                </View>
                            )}
                        </Animated.View>
                    </TouchableOpacity>

                    {/* Track Info */}
                    <View style={styles.infoContainer}>
                        <View style={styles.titleRow}>
                            <View style={styles.titleContainer}>
                                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                                    {currentTrack.title}
                                </Text>
                                <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {currentTrack.artist}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.favoriteButton}
                                onPress={handleFavoritePress}
                            >
                                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                                    <Icon
                                        name={currentTrack?.isFavorite ? 'heart' : 'heart-outline'}
                                        size={24}
                                        color={currentTrack?.isFavorite ? colors.primary : colors.textPrimary}
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <ProgressBar abRepeat={abRepeat} pointA={abMode === 'a-set' ? pointA : null} />

                    {/* Main Controls */}
                    <PlayerControls size="large" showShuffleRepeat={true} />

                    {/* Power User Row (Musicolet-style) */}
                    <View style={styles.powerUserRow}>
                        <TouchableOpacity style={styles.powerButton} onPress={() => Alert.alert('Queue View', 'Switch to Queue tab to manage queue')}>
                            <Icon name="playlist-play" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>Queue</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.powerButton}
                            onPress={handleABRepeatPress}
                            onLongPress={handleABRepeatLongPress}
                        >
                            <Icon
                                name="repeat-variant"
                                size={22}
                                color={abRepeat?.isActive ? colors.primary : abMode === 'a-set' ? '#FFA500' : colors.textSecondary}
                            />
                            <Text style={[styles.powerButtonLabel, {
                                color: abRepeat?.isActive ? colors.primary : abMode === 'a-set' ? '#FFA500' : colors.textSecondary,
                            }]}>
                                {abRepeat?.isActive ? 'A↔B' : abMode === 'a-set' ? 'Set B' : 'A-B'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton} onPress={handleSpeedPress}>
                            <Icon name="speedometer" size={22} color={playbackSpeed !== 1.0 ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: playbackSpeed !== 1.0 ? colors.primary : colors.textSecondary }]}>
                                {playbackSpeed !== 1.0 ? `${playbackSpeed}x` : 'Speed'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton} onPress={() => setShowSleepTimer(true)}>
                            <Icon name={sleepTimerActive ? 'timer-sand' : 'timer-outline'} size={22} color={sleepTimerActive ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: sleepTimerActive ? colors.primary : colors.textSecondary }]}>
                                {sleepTimerActive ? sleepTimerDisplay : 'Timer'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton} onPress={() => Alert.alert('Tag Editor', 'Coming soon')}>
                            <Icon name="tag-multiple" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>Tags</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Sleep Timer Modal - only mount when visible */}
            {showSleepTimer && (
                <SleepTimerModal
                    visible={showSleepTimer}
                    onClose={() => setShowSleepTimer(false)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: typography.sizes.lg,
        marginTop: spacing.md,
    },
    header: {
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    swipeIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: spacing.sm,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    headerButton: {
        padding: spacing.sm,
    },
    headerCenter: {
        alignItems: 'center',
        flex: 1,
    },
    headerSubtitle: {
        fontSize: typography.sizes.xs,
        letterSpacing: 1,
    },
    headerTitle: {
        fontSize: typography.sizes.sm,
        fontWeight: '500',
    },
    artworkContainer: {
        alignItems: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
    artworkShadow: {
        width: ARTWORK_SIZE,
        height: ARTWORK_SIZE,
        borderRadius: borderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 16,
    },
    artworkImage: {
        width: ARTWORK_SIZE,
        height: ARTWORK_SIZE,
        borderRadius: borderRadius.lg,
    },
    artworkPlaceholder: {
        width: ARTWORK_SIZE,
        height: ARTWORK_SIZE,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContainer: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titleContainer: {
        flex: 1,
        marginRight: spacing.md,
    },
    title: {
        fontSize: typography.sizes.xxl,
        fontWeight: '700',
    },
    artist: {
        fontSize: typography.sizes.lg,
        marginTop: 4,
    },
    favoriteButton: {
        padding: spacing.sm,
    },
    powerUserRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        marginTop: 'auto',
    },
    powerButton: {
        alignItems: 'center',
        padding: spacing.sm,
    },
    powerButtonLabel: {
        fontSize: typography.sizes.xs,
        marginTop: 4,
    },
});

export default NowPlayingScreen;
