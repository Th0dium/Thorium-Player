// Queue Screen - View and manage current playback queue with Multi-Queue support
// Musicolet-style: Queue switcher (20 queues), per-queue shuffle/repeat state, drag reorder
import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQueueStore } from '@/store/queueStore';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useTheme } from '@/context/ThemeContext';
import { Track } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QueueScreenProps {
    searchQuery?: string;
    isSearchActive?: boolean;
}

const QueueScreen: React.FC<QueueScreenProps> = ({ searchQuery = '', isSearchActive = false }) => {
    const { colors } = useTheme();
    const {
        queues,
        currentQueue,
        currentIndex,
        activeQueueIndex,
        removeFromQueue,
        clearQueue,
        switchQueue,
    } = useQueueStore();
    const { currentTrack, skipToIndex, repeatMode, shuffleMode } = usePlayerStore();
    const { tracks } = useLibraryStore();

    const [showQueueSwitcher, setShowQueueSwitcher] = useState(false);

    // Get tracks from current queue
    const queueTracks = useMemo(() => {
        if (!currentQueue) return [];
        return currentQueue.trackIds
            .map(id => tracks.find(t => t.id === id))
            .filter((t): t is Track => t !== undefined);
    }, [currentQueue, tracks]);

    // Filter tracks based on search
    const filteredTracks = useMemo(() => {
        if (!isSearchActive || !searchQuery) return queueTracks;
        const query = searchQuery.toLowerCase();
        return queueTracks.filter(track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query)
        );
    }, [queueTracks, searchQuery, isSearchActive]);

    const handleTrackPress = useCallback(async (index: number) => {
        if (isSearchActive && searchQuery) {
            const track = filteredTracks[index];
            const actualIndex = queueTracks.findIndex(t => t.id === track.id);
            await skipToIndex(actualIndex);
        } else {
            await skipToIndex(index);
        }
    }, [skipToIndex, isSearchActive, searchQuery, filteredTracks, queueTracks]);

    const handleRemoveTrack = useCallback(async (index: number) => {
        await removeFromQueue(index);
    }, [removeFromQueue]);

    const handleSwitchQueue = useCallback((index: number) => {
        switchQueue(index);
        setShowQueueSwitcher(false);
    }, [switchQueue]);

    const renderQueueItem = useCallback(({ item, index }: { item: Track; index: number }) => {
        const actualIndex = isSearchActive ? queueTracks.findIndex(t => t.id === item.id) : index;
        const isPlaying = actualIndex === currentIndex;
        const isPast = actualIndex < currentIndex;

        return (
            <TouchableOpacity
                style={[
                    styles.queueItem,
                    { backgroundColor: colors.surface },
                    isPlaying && [styles.queueItemPlaying, { backgroundColor: colors.primary + '20', borderLeftColor: colors.primary }],
                    isPast && styles.queueItemPast,
                ]}
                onPress={() => handleTrackPress(index)}
                activeOpacity={0.7}
            >
                {/* Drag Handle */}
                <TouchableOpacity style={styles.dragHandle}>
                    <Icon name="drag-horizontal-variant" size={20} color={colors.textTertiary} />
                </TouchableOpacity>

                {/* Index/Playing indicator */}
                <View style={styles.queueIndex}>
                    {isPlaying ? (
                        <Icon name="volume-high" size={20} color={colors.primary} />
                    ) : (
                        <Text style={[styles.indexText, { color: colors.textSecondary }, isPast && { color: colors.textTertiary }]}>
                            {actualIndex + 1}
                        </Text>
                    )}
                </View>

                {/* Track Info */}
                <View style={styles.trackInfo}>
                    <Text
                        style={[
                            styles.trackTitle,
                            { color: colors.textPrimary },
                            isPlaying && { color: colors.primary },
                            isPast && { color: colors.textSecondary },
                        ]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    <Text
                        style={[styles.trackArtist, { color: colors.textSecondary }, isPast && { color: colors.textTertiary }]}
                        numberOfLines={1}
                    >
                        {item.artist} • {formatDuration(item.duration)}
                    </Text>
                </View>

                {/* Remove Button */}
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveTrack(actualIndex)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="close" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    }, [colors, currentIndex, isSearchActive, queueTracks, handleTrackPress, handleRemoveTrack]);

    const upNextCount = queueTracks.length - currentIndex - 1;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Queue Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Queue</Text>

                    {/* Queue Switcher Button */}
                    <TouchableOpacity
                        style={[styles.queueSwitcherButton, { backgroundColor: colors.surface }]}
                        onPress={() => setShowQueueSwitcher(true)}
                    >
                        <Text style={[styles.queueSwitcherText, { color: colors.textPrimary }]}>
                            {activeQueueIndex + 1}/{queues.length}
                        </Text>
                        <Icon name="chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Header Actions */}
                <View style={styles.headerActions}>
                    {queueTracks.length > 0 && (
                        <TouchableOpacity style={styles.headerButton} onPress={clearQueue}>
                            <Icon name="playlist-remove" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Queue Stats Bar */}
            {currentQueue && queueTracks.length > 0 && (
                <View style={[styles.statsBar, { backgroundColor: colors.surface }]}>
                    <View style={styles.statsLeft}>
                        <Text style={[styles.queueName, { color: colors.textPrimary }]}>
                            {currentQueue.name || 'Now Playing'}
                        </Text>
                        <Text style={[styles.queueStats, { color: colors.textSecondary }]}>
                            {queueTracks.length} songs • {upNextCount > 0 ? `${upNextCount} up next` : 'Last song'}
                        </Text>
                    </View>
                    <View style={styles.statsRight}>
                        <View style={[styles.stateBadge, shuffleMode !== 'off' && { backgroundColor: colors.primary + '30' }]}>
                            <Icon
                                name="shuffle-variant"
                                size={16}
                                color={shuffleMode !== 'off' ? colors.primary : colors.textTertiary}
                            />
                        </View>
                        <View style={[styles.stateBadge, repeatMode !== 'off' && { backgroundColor: colors.primary + '30' }]}>
                            <Icon
                                name={repeatMode === 'one' ? 'repeat-once' : 'repeat'}
                                size={16}
                                color={repeatMode !== 'off' ? colors.primary : colors.textTertiary}
                            />
                        </View>
                    </View>
                </View>
            )}

            {/* Queue List */}
            {queueTracks.length > 0 ? (
                <FlatList
                    data={filteredTracks}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={renderQueueItem}
                    contentContainerStyle={styles.listContent}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Icon name="playlist-play" size={64} color={colors.textTertiary} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Queue is empty</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Play some music to see your queue here
                    </Text>
                </View>
            )}

            {/* Queue Switcher Modal */}
            <Modal
                visible={showQueueSwitcher}
                transparent
                animationType="fade"
                onRequestClose={() => setShowQueueSwitcher(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowQueueSwitcher(false)}
                >
                    <View style={[styles.queueSwitcherModal, { backgroundColor: colors.surfaceElevated }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            Switch Queue
                        </Text>
                        <View style={styles.queueGrid}>
                            {queues.map((queue, index) => (
                                <TouchableOpacity
                                    key={queue.id}
                                    style={[
                                        styles.queueGridItem,
                                        { backgroundColor: colors.surface },
                                        index === activeQueueIndex && {
                                            backgroundColor: colors.primary + '20',
                                            borderColor: colors.primary,
                                            borderWidth: 2,
                                        },
                                    ]}
                                    onPress={() => handleSwitchQueue(index)}
                                >
                                    <Text style={[
                                        styles.queueGridNumber,
                                        { color: index === activeQueueIndex ? colors.primary : colors.textPrimary }
                                    ]}>
                                        {index + 1}
                                    </Text>
                                    <Text
                                        style={[styles.queueGridName, { color: colors.textSecondary }]}
                                        numberOfLines={1}
                                    >
                                        {queue.trackIds.length > 0 ? `${queue.trackIds.length} songs` : 'Empty'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
                            onPress={() => setShowQueueSwitcher(false)}
                        >
                            <Text style={[styles.modalCloseText, { color: colors.textPrimary }]}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
    },
    queueSwitcherButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: spacing.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    queueSwitcherText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        marginRight: spacing.xs,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        padding: spacing.sm,
    },
    statsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    statsLeft: {
        flex: 1,
    },
    queueName: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
    },
    queueStats: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    statsRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stateBadge: {
        padding: spacing.xs,
        borderRadius: borderRadius.sm,
        marginLeft: spacing.xs,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 100,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.xs,
    },
    queueItemPlaying: {
        borderLeftWidth: 3,
    },
    queueItemPast: {
        opacity: 0.5,
    },
    dragHandle: {
        padding: spacing.xs,
        marginRight: spacing.xs,
    },
    queueIndex: {
        width: 28,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    indexText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    trackInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    trackTitle: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
    },
    trackArtist: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    removeButton: {
        padding: spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.semibold,
        marginTop: spacing.lg,
    },
    emptySubtitle: {
        fontSize: typography.sizes.md,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    queueSwitcherModal: {
        width: SCREEN_WIDTH - 48,
        maxHeight: '70%',
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    modalTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    queueGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    queueGridItem: {
        width: '23%',
        aspectRatio: 1,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    queueGridNumber: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    queueGridName: {
        fontSize: typography.sizes.xs,
        marginTop: 2,
    },
    modalCloseButton: {
        marginTop: spacing.md,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
    },
});

export default QueueScreen;
