// Track List Item - Reusable track item component with consistent styling
// Supports: Long press for multi-select, swipe actions, playback indicator
// Performance: memo'd, minimal animated values, no entrance animation
import React, { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Track } from '@/store/types';
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

    // Animation for shadow overlay fade in/out
    const shadowOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(shadowOpacity, {
            toValue: showSelection && !isSelected ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [showSelection, isSelected, shadowOpacity]);

    // Memoize style calculations to prevent re-renders
    const containerStyle = useMemo(() => {
        const baseColor = isPlaying ? colors.primary + '20' : (isSelected ? colors.primary + '15' : colors.surface);
        const borderColor = isSelected ? colors.primary : 'transparent';
        const borderLeftColor = isPlaying ? colors.primary : 'transparent';
        return { backgroundColor: baseColor, borderColor, borderLeftColor };
    }, [isPlaying, isSelected, colors]);

    const shadowOverlayStyle = useMemo(() => ({
        backgroundColor: colors.background + 'CC'
    }), [colors]);

    const checkboxSelectedStyle = useMemo(() => ({
        backgroundColor: colors.primary,
        borderColor: colors.primary
    }), [colors.primary]);

    const indexTextStyle = useMemo(() => ({
        color: isPast ? colors.textTertiary : colors.textSecondary
    }), [isPast, colors.textTertiary, colors.textSecondary]);

    const artworkPlaceholderStyle = useMemo(() => ({
        backgroundColor: colors.backgroundTertiary
    }), [colors.backgroundTertiary]);

    const playingOverlayStyle = useMemo(() => ({
        backgroundColor: colors.primary + '80'
    }), [colors.primary]);

    const titleStyle = useMemo(() => [
        styles.title,
        { color: colors.textPrimary },
        isPlaying && { color: colors.primary },
        isPast && { color: colors.textSecondary },
    ], [isPlaying, isPast, colors]);

    const subtitleStyle = useMemo(() => [
        styles.subtitle,
        { color: colors.textSecondary },
        isPast && { color: colors.textTertiary }
    ], [isPast, colors]);

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
                containerStyle,
                isPast && styles.containerPast,
            ]}
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
            delayLongPress={300}
        >
            {/* Shadow overlay for non-selected items in selection mode */}
            <Animated.View
                style={[
                    styles.shadowOverlay,
                    shadowOverlayStyle,
                    { opacity: shadowOpacity }
                ]}
                pointerEvents="none"
            />

            {/* Drag Handle OR Selection Checkbox (same position to preserve layout) */}
            {(showDragHandle || showSelection) && (
                <View style={styles.dragHandle}>
                    {showSelection ? (
                        <View style={[
                            styles.checkbox,
                            isSelected && checkboxSelectedStyle
                        ]}>
                            {isSelected && <Icon name="check" size={16} color="#FFF" />}
                        </View>
                    ) : showDragHandle ? (
                        <TouchableOpacity
                            onLongPress={drag}
                            delayLongPress={0}
                        >
                            <Icon name="drag-horizontal-variant" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            )}

            {/* Index or Playing Indicator */}
            {showIndex && (
                <View style={styles.indexContainer}>
                    {isPlaying ? (
                        <Icon name="volume-high" size={18} color={colors.primary} />
                    ) : (
                        <Text style={[styles.indexText, indexTextStyle]}>
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
                        <View style={[styles.artworkPlaceholder, artworkPlaceholderStyle]}>
                            <Icon name="music-note" size={20} color={colors.textTertiary} />
                        </View>
                    )}
                    {isPlaying && (
                        <View style={[
                            styles.playingOverlay,
                            playingOverlayStyle,
                        ]}>
                            <Icon name="play" size={16} color="#FFF" />
                        </View>
                    )}
                </View>
            )}

            {/* Track Info */}
            <View style={styles.infoContainer}>
                <Text
                    style={titleStyle}
                    numberOfLines={1}
                >
                    {track.title}
                </Text>
                <Text style={subtitleStyle} numberOfLines={1}>
                    {track.artist}{track.album && track.album !== 'Unknown Album' ? ` • ${track.album}` : ''}{track.duration > 0 ? ` • ${formatDuration(track.duration)}` : ''}
                </Text>
            </View>

            {/* Right Element, Remove Button, or More Button (selection check now at left) */}
            {rightElement ? (
                <View style={styles.rightElementContainer}>
                    {rightElement}
                </View>
            ) : showRemoveButton ? (
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={handleRemove}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="close" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
            ) : !showSelection && onMorePress ? (
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
        prevProps.showSelection === nextProps.showSelection &&
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
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderLeftWidth: 3,
        borderColor: 'transparent',
        borderLeftColor: 'transparent',
    },
    containerPast: {
        opacity: 0.5,
    },
    shadowOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: borderRadius.md,
        zIndex: 1,
    },
    dragHandle: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#999',
        alignItems: 'center',
        justifyContent: 'center',
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
