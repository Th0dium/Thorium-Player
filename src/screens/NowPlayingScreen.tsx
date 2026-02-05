// Now Playing Screen - Full-screen player with album art and controls
// Musicolet-style: Dynamic background, power-user row, swipe-to-dismiss
import React, { useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
    isExpanded?: boolean;
    onCollapse?: () => void;
}

const NowPlayingScreen: React.FC<NowPlayingScreenProps> = ({
    navigation,
    isExpanded = true,
    onCollapse
}) => {
    const { colors } = useTheme();
    const { currentTrack, volume } = usePlayerStore();
    const panY = useRef(new Animated.Value(0)).current;

    // Pan responder for swipe-down to dismiss
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
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
                // Reset position
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
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: panY }] },
            ]}
            {...panResponder.panHandlers}
        >
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
                            <TouchableOpacity
                                onPress={handleClose}
                                style={styles.headerButton}
                            >
                                <Icon name="chevron-down" size={28} color={colors.textPrimary} />
                            </TouchableOpacity>

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

                    {/* Album Artwork - Tap for lyrics, long-press for art edit */}
                    <TouchableOpacity
                        style={styles.artworkContainer}
                        activeOpacity={0.9}
                        onLongPress={() => {/* TODO: Open album art editor */ }}
                    >
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
                            <TouchableOpacity style={styles.favoriteButton}>
                                <Icon name="heart-outline" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <ProgressBar />

                    {/* Main Controls */}
                    <PlayerControls size="large" showShuffleRepeat={true} />

                    {/* Power User Row (Musicolet-style) */}
                    <View style={styles.powerUserRow}>
                        <TouchableOpacity style={styles.powerButton}>
                            <Icon name="playlist-play" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>Queue</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton}>
                            <Icon name="repeat-variant" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>A-B</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton}>
                            <Icon name="speedometer" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>Speed</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton}>
                            <Icon name="timer-outline" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>Timer</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.powerButton}>
                            <Icon name="tag-edit-outline" size={22} color={colors.textSecondary} />
                            <Text style={[styles.powerButtonLabel, { color: colors.textSecondary }]}>Tags</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </Animated.View>
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
