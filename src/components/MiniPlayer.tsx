// Mini Player Component - Compact player bar at bottom of screen
// Musicolet-style: slim bar with seek bar at top, song info, and controls
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useProgress } from 'react-native-track-player';
import { usePlayerStore } from '@/store/playerStore';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface MiniPlayerProps {
    onPress: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
    const { colors } = useTheme();
    const { position, duration } = useProgress();
    const {
        currentTrack,
        isPlaying,
        togglePlayPause,
        skipNext,
    } = usePlayerStore();

    if (!currentTrack) return null;

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: colors.surfaceElevated }]}
            onPress={onPress}
            activeOpacity={0.95}
        >
            {/* Seek bar at top of mini-player */}
            <View style={[styles.seekBarContainer, { backgroundColor: colors.seekBarBackground }]}>
                <View style={[styles.seekBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
            </View>

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
                        onPress={(e) => {
                            e.stopPropagation();
                            togglePlayPause();
                        }}
                        style={styles.controlButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon
                            name={isPlaying ? 'pause' : 'play'}
                            size={28}
                            color={colors.textPrimary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            skipNext();
                        }}
                        style={styles.controlButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="skip-next" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
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
    seekBarContainer: {
        height: 3,
        borderTopLeftRadius: borderRadius.md,
        borderTopRightRadius: borderRadius.md,
        overflow: 'hidden',
    },
    seekBar: {
        height: '100%',
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
