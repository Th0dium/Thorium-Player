// Track List Item - Reusable track item component with consistent styling
// Supports: Long press for multi-select, swipe actions, playback indicator
import React, { memo, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Track } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface TrackListItemProps {
    track: Track;
    index: number;
    isPlaying?: boolean;
    isSelected?: boolean;
    showIndex?: boolean;
    showArtwork?: boolean;
    onPress: (track: Track, index: number) => void;
    onLongPress?: (track: Track, index: number) => void;
    onMorePress?: (track: Track) => void;
}

const TrackListItem: React.FC<TrackListItemProps> = memo(({
    track,
    index,
    isPlaying = false,
    isSelected = false,
    showIndex = false,
    showArtwork = true,
    onPress,
    onLongPress,
    onMorePress,
}) => {
    const { colors } = useTheme();

    const handlePress = useCallback(() => {
        onPress(track, index);
    }, [track, index, onPress]);

    const handleLongPress = useCallback(() => {
        onLongPress?.(track, index);
    }, [track, index, onLongPress]);

    const handleMorePress = useCallback(() => {
        onMorePress?.(track);
    }, [track, onMorePress]);

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: colors.surface },
                isPlaying && [styles.containerPlaying, { backgroundColor: colors.primary + '15' }],
                isSelected && [styles.containerSelected, { backgroundColor: colors.primary + '25' }],
            ]}
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
            delayLongPress={300}
        >
            {/* Index or Playing Indicator */}
            {showIndex && (
                <View style={styles.indexContainer}>
                    {isPlaying ? (
                        <Icon name="volume-high" size={18} color={colors.primary} />
                    ) : (
                        <Text style={[styles.indexText, { color: colors.textTertiary }]}>
                            {index + 1}
                        </Text>
                    )}
                </View>
            )}

            {/* Artwork */}
            {showArtwork && (
                <View style={styles.artworkContainer}>
                    {track.albumArt ? (
                        <Image source={{ uri: track.albumArt }} style={styles.artwork} />
                    ) : (
                        <View style={[styles.artworkPlaceholder, { backgroundColor: colors.backgroundTertiary }]}>
                            <Icon name="music-note" size={20} color={colors.textTertiary} />
                        </View>
                    )}
                    {isPlaying && (
                        <View style={[styles.playingOverlay, { backgroundColor: colors.primary + '80' }]}>
                            <Icon name="play" size={16} color="#FFF" />
                        </View>
                    )}
                </View>
            )}

            {/* Track Info */}
            <View style={styles.infoContainer}>
                <Text
                    style={[
                        styles.title,
                        { color: colors.textPrimary },
                        isPlaying && { color: colors.primary },
                    ]}
                    numberOfLines={1}
                >
                    {track.title}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {track.artist} • {formatDuration(track.duration)}
                </Text>
            </View>

            {/* Selection Indicator or More Button */}
            {isSelected ? (
                <View style={[styles.checkContainer, { backgroundColor: colors.primary }]}>
                    <Icon name="check" size={16} color="#FFF" />
                </View>
            ) : onMorePress ? (
                <TouchableOpacity
                    style={styles.moreButton}
                    onPress={handleMorePress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="dots-vertical" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
            ) : null}
        </TouchableOpacity>
    );
});

const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    containerPlaying: {
        borderLeftWidth: 3,
    },
    containerSelected: {
        borderWidth: 1,
    },
    indexContainer: {
        width: 28,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    indexText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    artworkContainer: {
        position: 'relative',
        marginRight: spacing.md,
    },
    artwork: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.sm,
    },
    artworkPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: borderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
    },
    subtitle: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    checkContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreButton: {
        padding: spacing.xs,
    },
});

TrackListItem.displayName = 'TrackListItem';

export default TrackListItem;
