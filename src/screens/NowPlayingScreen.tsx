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
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    const handleSpeedPress = useCallback(() => {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const buttons = speeds.map(s => ({
            text: `${s}x${s === playbackSpeed ? ' ✓' : ''}`,
            onPress: () => {
                TrackPlayer.setRate(s);
                setPlaybackSpeed(s);
            },
        }));
        buttons.push({ text: 'Cancel', onPress: () => { } });
        Alert.alert('Playback Speed', 'Select speed', buttons);
    }, [playbackSpeed]);

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
                                <Image
                                    source={{ uri: currentTrack.albumArt }}
                                    style={styles.artwork}
                                />
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
                    <ProgressBar />

                    {/* Main Controls */}
                    <PlayerControls size="large" showShuffleRepeat={true} />

                    {/* Power User Row (Musicolet-style) */}
                    <View style={styles.powerUserRow}>
                        <TouchableOpacity style={styles.powerButton} onPress={() => Alert.alert('Queue View', 'Switch to Queue tab to manage queue')}>
                            <Icon name="playlist-play" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>Queue</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton} onPress={() => Alert.alert('A-B Repeat', 'Coming soon')}>
                            <Icon name="repeat-variant" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>A-B</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton} onPress={handleSpeedPress}>
                            <Icon name="speedometer" size={22} color={playbackSpeed !== 1.0 ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: playbackSpeed !== 1.0 ? colors.primary : colors.textSecondary }]}>
                                {playbackSpeed !== 1.0 ? `${playbackSpeed}x` : 'Speed'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton} onPress={() => Alert.alert('Sleep Timer', 'Coming soon')}>
                            <Icon name="timer-outline" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>Timer</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton} onPress={() => Alert.alert('Tag Editor', 'Coming soon')}>
                            <Icon name="tag-multiple" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>Tags</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
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
    artwork: {
        width: ARTWORK_SIZE,
        height: ARTWORK_SIZE,
        borderRadius: borderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 16,
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
