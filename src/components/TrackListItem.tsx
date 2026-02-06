// Track List Item - Reusable track item component with consistent styling
// Supports: Long press for multi-select, swipe actions, playback indicator
// Performance: memo'd, minimal animated values, no entrance animation
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
    index?: number; // Made optional since not all screens provide it
    isPlaying?: boolean;
    isSelected?: boolean;
    isPast?: boolean; // For queue items that have already played
    showIndex?: boolean;
    showArtwork?: boolean;
    showSelection?: boolean; // Alias for selection mode
    showDragHandle?: boolean; // Show drag handle for reordering
    showRemoveButton?: boolean; // Show remove button for queue items
    drag?: () => void; // Drag handler from react-native-draggable-flatlist
    onPress: (track: Track, index?: number) => void;
    onLongPress?: (track: Track, index?: number) => void;
    onMorePress?: (track: Track) => void;
    onMenuPress?: (track: Track) => void; // Alias for onMorePress
    onRemove?: (track: Track, index?: number) => void; // For remove button
    rightElement?: React.ReactNode;
}

const TrackListItem: React.FC<TrackListItemProps> = memo(({
    track,
    index = 0,
    isPlaying = false,
    isSelected = false,
    isPast = false,
    showIndex = false,
    showArtwork = true,
    showSelection = false,
    showDragHandle = false,
    showRemoveButton = false,
    drag,
    onPress,
    onLongPress,
    onMorePress,
    onMenuPress,
    onRemove,
    rightElement,
}) => {
    const { colors } = useTheme();

    const handlePress = useCallback(() => {
        onPress(track, index);
    }, [track, index, onPress]);

    const handleLongPress = useCallback(() => {
        onLongPress?.(track, index);
    }, [track, index, onLongPress]);

    const handleMorePress = useCallback(() => {
        // Use onMenuPress if provided, otherwise onMorePress
        (onMenuPress || onMorePress)?.(track);
    }, [track, onMorePress, onMenuPress]);

    const handleRemove = useCallback(() => {
        onRemove?.(track, index);
    }, [track, index, onRemove]);

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: colors.surface },
                isPlaying && [styles.containerPlaying, { backgroundColor: colors.primary + '15', borderLeftColor: colors.primary }],
                isSelected && [styles.containerSelected, { backgroundColor: colors.primary + '25' }],
                isPast && styles.containerPast,
            ]}
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
            delayLongPress={300}
        >
            {/* Drag Handle */}
            {showDragHandle && (
                <TouchableOpacity
                    style={styles.dragHandle}
                    onLongPress={drag}
                    delayLongPress={0}
                >
                    <Icon name="drag-horizontal-variant" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
            )}

            {/* Index or Playing Indicator */}
            {showIndex && (
                <View style={styles.indexContainer}>
                    {isPlaying ? (
                        <Icon name="volume-high" size={18} color={colors.primary} />
                    ) : (
                        <Text style={[styles.indexText, { color: isPast ? colors.textTertiary : colors.textSecondary }]}>
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
                        <View style={[
                            styles.playingOverlay,
                            { backgroundColor: colors.primary + '80' },
                        ]}>
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
                        isPast && { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                >
                    {track.title}
                </Text>
                <Text style={[
                    styles.subtitle,
                    { color: colors.textSecondary },
                    isPast && { color: colors.textTertiary }
                ]} numberOfLines={1}>
                    {track.artist}{track.album && track.album !== 'Unknown Album' ? ` • ${track.album}` : ''}{track.duration > 0 ? ` • ${formatDuration(track.duration)}` : ''}
                </Text>
            </View>

            {/* Right Element, Selection Indicator, Remove Button, or More Button */}
            {rightElement ? (
                <View style={styles.rightElementContainer}>
                    {rightElement}
                </View>
            ) : isSelected ? (
                <View style={[styles.checkContainer, { backgroundColor: colors.primary }]}>
                    <Icon name="check" size={16} color="#FFF" />
                </View>
            ) : showRemoveButton ? (
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={handleRemove}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="close" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
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
}, (prevProps, nextProps) => {
    // Custom memo comparator - only re-render if these specific props change
    return (
        prevProps.track.id === nextProps.track.id &&
        prevProps.isPlaying === nextProps.isPlaying &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isPast === nextProps.isPast &&
        prevProps.index === nextProps.index &&
        prevProps.showDragHandle === nextProps.showDragHandle &&
        prevProps.showRemoveButton === nextProps.showRemoveButton &&
        prevProps.rightElement === nextProps.rightElement
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
    containerPast: {
        opacity: 0.5,
    },
    dragHandle: {
        paddingRight: spacing.sm,
        paddingVertical: spacing.xs,
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
    removeButton: {
        padding: spacing.xs,
    },
    moreButton: {
        padding: spacing.xs,
    },
    rightElementContainer: {
        paddingLeft: spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

TrackListItem.displayName = 'TrackListItem';

export default TrackListItem;
