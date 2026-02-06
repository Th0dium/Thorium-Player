// Track Item Component - List item for displaying a track
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Track } from '@/types';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface TrackItemProps {
    track: Track;
    index?: number;
    isPlaying?: boolean;
    showArtwork?: boolean;
    showDuration?: boolean;
    onPress: () => void;
    onLongPress?: () => void;
    onOptionsPress?: () => void;
}

const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TrackItem: React.FC<TrackItemProps> = ({
    track,
    index,
    isPlaying = false,
    showArtwork = true,
    showDuration = true,
    onPress,
    onLongPress,
    onOptionsPress,
}) => {
    return (
        <TouchableOpacity
            style={[styles.container, isPlaying && styles.containerPlaying]}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
        >
            {index !== undefined && (
                <View style={styles.indexContainer}>
                    {isPlaying ? (
                        <Icon name="volume-high" size={16} color={colors.primary} />
                    ) : (
                        <Text style={styles.indexText}>{index + 1}</Text>
                    )}
                </View>
            )}

            {showArtwork && (
                <View style={styles.artworkContainer}>
                    {track.albumArt ? (
                        <Image source={{ uri: track.albumArt }} style={styles.artwork} />
                    ) : (
                        <View style={styles.artworkPlaceholder}>
                            <Icon name="music-note" size={24} color={colors.textTertiary} />
                        </View>
                    )}
                    {isPlaying && (
                        <View style={styles.playingOverlay}>
                            <Icon name="equalizer" size={20} color={colors.primary} />
                        </View>
                    )}
                </View>
            )}

            <View style={styles.infoContainer}>
                <Text
                    style={[styles.title, isPlaying && styles.titlePlaying]}
                    numberOfLines={1}
                >
                    {track.title}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {track.artist}
                </Text>
                {track.aiTags.length > 0 && (
                    <View style={styles.tagsContainer}>
                        {track.aiTags.slice(0, 3).map((tag, idx) => (
                            <View
                                key={tag.id}
                                style={[styles.tag, { backgroundColor: tag.color + '30' }]}
                            >
                                <Text style={[styles.tagText, { color: tag.color }]}>
                                    {tag.name}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <View style={styles.rightContainer}>
                {showDuration && (
                    <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
                )}
                {onOptionsPress && (
                    <TouchableOpacity
                        onPress={onOptionsPress}
                        style={styles.optionsButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="dots-vertical" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: 'transparent',
    },
    containerPlaying: {
        backgroundColor: colors.primary + '15',
        borderRadius: borderRadius.md,
    },
    indexContainer: {
        width: 30,
        alignItems: 'center',
    },
    indexText: {
        fontSize: typography.sizes.sm,
        color: colors.textTertiary,
    },
    artworkContainer: {
        width: 50,
        height: 50,
        marginRight: spacing.md,
        position: 'relative',
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
        backgroundColor: colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
        color: colors.textPrimary,
        marginBottom: 2,
    },
    titlePlaying: {
        color: colors.primary,
    },
    artist: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    tagsContainer: {
        flexDirection: 'row',
        marginTop: 4,
        flexWrap: 'wrap',
    },
    tag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginRight: 4,
    },
    tagText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    duration: {
        fontSize: typography.sizes.sm,
        color: colors.textTertiary,
        marginRight: spacing.sm,
    },
    optionsButton: {
        padding: spacing.xs,
    },
});

export default TrackItem;
