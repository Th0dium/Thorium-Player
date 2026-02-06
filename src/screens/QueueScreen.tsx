// Queue Screen - View and manage current playback queue with Multi-Queue support
// Musicolet-style: Queue switcher as list, per-queue name from source, drag reorder
import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Dimensions,
    FlatList,
    TextInput,
    Alert,
    Platform,
    StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EmptyState from '@/components/EmptyState';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useQueueStore } from '@/store/queueStore';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useTheme } from '@/context/ThemeContext';
import TrackListItem from '@/components/TrackListItem';
import { Track, Queue } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QueueScreenProps {
    searchQuery?: string;
    isSearchActive?: boolean;
}

const QueueScreen: React.FC<QueueScreenProps> = ({ searchQuery = '', isSearchActive = false }) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const queues = useQueueStore(state => state.queues);
    const currentQueue = useQueueStore(state => state.currentQueue);
    const currentIndex = useQueueStore(state => state.currentIndex);
    const activeQueueIndex = useQueueStore(state => state.activeQueueIndex);
    const removeFromQueue = useQueueStore(state => state.removeFromQueue);
    const switchQueue = useQueueStore(state => state.switchQueue);
    const moveInQueue = useQueueStore(state => state.moveInQueue);
    const skipToIndex = usePlayerStore(state => state.skipToIndex);
    const tracks = useLibraryStore(state => state.tracks);

    const [showQueueSwitcher, setShowQueueSwitcher] = useState(false);
    const [editingQueueIndex, setEditingQueueIndex] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

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

    const handleSwitchQueue = useCallback((index: number) => {
        switchQueue(index);
        setShowQueueSwitcher(false);
    }, [switchQueue]);

    // Start editing a queue name
    const handleStartRename = useCallback((index: number, e?: any) => {
        e?.stopPropagation();
        const queue = queues[index];
        setEditingQueueIndex(index);
        setEditingName(queue?.name || queue?.source?.name || `Queue ${index + 1}`);
    }, [queues]);

    // Save renamed queue
    const handleSaveRename = useCallback(() => {
        if (editingQueueIndex === null) return;
        const queue = queues[editingQueueIndex];
        if (queue && editingName.trim()) {
            // Update queue name in store
            const updatedQueue = { ...queue, name: editingName.trim() };
            useQueueStore.setState(state => {
                const newQueues = [...state.queues];
                newQueues[editingQueueIndex] = updatedQueue;
                return {
                    queues: newQueues,
                    currentQueue: state.currentQueue?.id === queue.id ? updatedQueue : state.currentQueue,
                };
            });
        }
        setEditingQueueIndex(null);
        setEditingName('');
    }, [editingQueueIndex, editingName, queues]);

    // Remove a single queue
    const handleRemoveQueue = useCallback((index: number, e?: any) => {
        e?.stopPropagation();
        const queue = queues[index];
        if (!queue) return;

        const { deleteQueue: deleteQueueAction, switchQueue: switchQueueAction } = useQueueStore.getState();

        // If deleting the active queue, fallback to the last available queue
        if (index === activeQueueIndex) {
            const remainingQueues = queues.filter((_, i) => i !== index);
            if (remainingQueues.length > 0) {
                // Switch to the last remaining queue
                const newActiveIndex = Math.min(index, remainingQueues.length - 1);
                switchQueueAction(newActiveIndex);
            }
        }

        deleteQueueAction(queue.id);
    }, [queues, activeQueueIndex]);

    // Remove all queues except the active one
    const handleRemoveAllOtherQueues = useCallback(() => {
        const queuesToRemove = queues
            .map((q, i) => ({ queue: q, index: i }))
            .filter(({ index }) => index !== activeQueueIndex);

        if (queuesToRemove.length === 0) return;

        Alert.alert(
            'Remove all other queues?',
            `This will delete ${queuesToRemove.length} other queue${queuesToRemove.length > 1 ? 's' : ''}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive', onPress: () => {
                        const { deleteQueue: deleteQueueAction } = useQueueStore.getState();
                        queuesToRemove.forEach(({ queue }) => {
                            deleteQueueAction(queue.id);
                        });
                    }
                },
            ]
        );
    }, [queues, activeQueueIndex]);

    // Get display name for a queue
    const getQueueDisplayName = useCallback((queue: Queue, index: number): string => {
        if (!queue || queue.trackIds.length === 0) return '';
        return queue.name || queue.source?.name || `Queue ${index + 1}`;
    }, []);

    // Get queues that have tracks (non-empty)
    const nonEmptyQueues = useMemo(() => {
        return queues.filter(q => q.trackIds.length > 0);
    }, [queues]);

    const handleDragEnd = useCallback(({ data, from, to }: { data: Track[]; from: number; to: number }) => {
        if (from === to) return;
        // Don't allow drag reorder when search is active — indices don't match
        if (isSearchActive && searchQuery) return;
        moveInQueue(from, to);
    }, [moveInQueue, isSearchActive, searchQuery]);

    const handleTrackPress = useCallback(async (filteredIndex: number) => {
        // Map filtered index back to full queue index when search is active
        let realIndex = filteredIndex;
        if (isSearchActive && searchQuery) {
            const track = filteredTracks[filteredIndex];
            if (track) {
                realIndex = queueTracks.findIndex(t => t.id === track.id);
                if (realIndex === -1) realIndex = filteredIndex;
            }
        }
        // Optimistically update the queue index for instant highlight
        useQueueStore.getState().updateCurrentIndex(realIndex);
        await skipToIndex(realIndex);
        // Ensure playback starts (important if player was paused or on first play)
        await usePlayerStore.getState().play();
    }, [skipToIndex, isSearchActive, searchQuery, filteredTracks, queueTracks]);

    const renderQueueItem = useCallback(({ item, drag, getIndex, isActive: isDragging }: RenderItemParams<Track>) => {
        const filteredIndex = getIndex();
        if (filteredIndex === undefined) return null;

        // Map filtered index to real queue index for correct highlight and operations
        let realIndex = filteredIndex;
        if (isSearchActive && searchQuery) {
            realIndex = queueTracks.findIndex(t => t.id === item.id);
            if (realIndex === -1) realIndex = filteredIndex;
        }

        const isPlaying = realIndex === currentIndex;
        const isPast = realIndex < currentIndex;
        const isSearching = isSearchActive && !!searchQuery;

        return (
            <View style={isDragging ? {
                elevation: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                transform: [{ scale: 1.03 }],
                zIndex: 999,
                borderRadius: 8,
                opacity: 0.95,
            } : undefined}>
                <TrackListItem
                    track={item}
                    index={realIndex}
                    isPlaying={isPlaying}
                    isPast={isPast}
                    showIndex={true}
                    showArtwork={true}
                    showDragHandle={!isSearching}
                    showRemoveButton={true}
                    drag={isSearching ? undefined : drag}
                    onPress={() => handleTrackPress(filteredIndex)}
                    onRemove={() => removeFromQueue(realIndex)}
                />
            </View>
        );
    }, [currentIndex, handleTrackPress, removeFromQueue, isSearchActive, searchQuery, queueTracks]);

    // --- Render Queue Switcher Modal Item ---
    const renderQueueSwitcherItem = ({ item: queue, index }: { item: Queue, index: number }) => {
        const isActive = index === activeQueueIndex;
        const hasContent = queue.trackIds.length > 0;
        const isEditing = editingQueueIndex === index;
        const trackCount = queue.trackIds.length;

        // Calculate total duration for this queue (hooks can't be used here)
        const queueTracksForDuration = queue.trackIds
            .map(id => tracks.find(t => t.id === id))
            .filter((t): t is Track => t !== undefined);
        const queueDuration = formatTotalDuration(queueTracksForDuration);

        // Skip empty queues
        if (!hasContent) return null;

        return (
            <TouchableOpacity
                style={[
                    styles.bsItem,
                    isActive && { backgroundColor: colors.surfaceVariant + '40' }
                ]}
                onPress={() => handleSwitchQueue(index)}
                activeOpacity={0.7}
            >
                {/* Icon / Numbering */}
                <View style={[
                    styles.bsIconContainer,
                    isActive && { backgroundColor: colors.primary + '20' }
                ]}>
                    <Text style={[
                        styles.bsNumber,
                        { color: isActive ? colors.primary : colors.textSecondary }
                    ]}>
                        {index + 1}
                    </Text>
                </View>

                {/* Content */}
                <View style={styles.bsContent}>
                    {isEditing ? (
                        <TextInput
                            style={[styles.bsInput, { color: colors.textPrimary, borderBottomColor: colors.primary }]}
                            value={editingName}
                            onChangeText={setEditingName}
                            onBlur={handleSaveRename}
                            onSubmitEditing={handleSaveRename}
                            autoFocus
                            selectTextOnFocus
                            placeholder="Queue Name"
                            placeholderTextColor={colors.textTertiary}
                        />
                    ) : (
                        <Text style={[
                            styles.bsTitle,
                            { color: isActive ? colors.primary : colors.textPrimary }
                        ]} numberOfLines={1}>
                            {getQueueDisplayName(queue, index)}
                        </Text>
                    )}
                    <View style={styles.bsSubtitleContainer}>
                        <Text style={[styles.bsSubtitle, { color: colors.textSecondary }]}>
                            {trackCount} {trackCount === 1 ? 'song' : 'songs'}
                        </Text>
                        <View style={[styles.bsDot, { backgroundColor: colors.textTertiary }]} />
                        <Text style={[styles.bsSubtitle, { color: colors.textSecondary }]}>
                            {queueDuration}
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.bsActions}>
                    {!isEditing && (
                        <TouchableOpacity
                            style={styles.bsActionButton}
                            onPress={(e) => handleStartRename(index, e)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="pencil-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.bsActionButton, { marginLeft: 4 }]}
                        onPress={(e) => handleRemoveQueue(index, e)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Queue Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.queueSwitcherButton, { backgroundColor: colors.surface }]}
                    onPress={() => setShowQueueSwitcher(true)}
                >
                    <Icon name="playlist-music" size={20} color={colors.primary} />
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {currentQueue && activeQueueIndex >= 0
                            ? `${activeQueueIndex + 1}. ${getQueueDisplayName(currentQueue, activeQueueIndex)}`
                            : 'No Queue'}
                    </Text>
                    <Icon name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Queue Info Bar */}
            {currentQueue && queueTracks.length > 0 && (
                <View style={styles.infoBar}>
                    <View style={styles.infoLeft}>
                        <Icon name="play-circle-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            {currentIndex + 1} / {queueTracks.length}
                        </Text>
                    </View>
                    <View style={styles.infoRight}>
                        <Icon name="clock-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            {formatTotalDuration(queueTracks)}
                        </Text>
                    </View>
                </View>
            )}

            {/* Queue List */}
            {queueTracks.length > 0 ? (
                <DraggableFlatList
                    data={filteredTracks}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={renderQueueItem}
                    onDragEnd={handleDragEnd}
                    containerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    activationDistance={10}
                />
            ) : (
                <EmptyState
                    icon="playlist-play"
                    title="Queue is empty"
                    subtitle="Play some music to see your queue here"
                />
            )}

            {/* NEW Queue Switcher - Bottom Sheet Style */}
            <Modal
                visible={showQueueSwitcher}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    setShowQueueSwitcher(false);
                    setEditingQueueIndex(null);
                }}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        setShowQueueSwitcher(false);
                        setEditingQueueIndex(null);
                    }}
                >
                    <View
                        style={[
                            styles.bottomSheetModal,
                            {
                                backgroundColor: colors.surfaceElevated,
                                paddingBottom: insets.bottom + 20
                            }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        {/* Drag Indicator */}
                        <View style={styles.bsHandleContainer}>
                            <View style={[styles.bsHandle, { backgroundColor: colors.surfaceVariant }]} />
                        </View>

                        {/* Header */}
                        <View style={styles.bsHeader}>
                            <Text style={[styles.bsHeaderTitle, { color: colors.textPrimary }]}>
                                Your Queues
                            </Text>
                            {/* Option to create new queue could go here, but kept simple for now */}
                        </View>

                        {/* List */}
                        <FlatList
                            data={queues}
                            keyExtractor={(item, index) => `queue-${index}`}
                            renderItem={renderQueueSwitcherItem}
                            contentContainerStyle={styles.bsListContent}
                            ListEmptyComponent={
                                <View style={styles.emptyQueueList}>
                                    <Text style={[styles.emptyQueueText, { color: colors.textSecondary }]}>
                                        No active queues.
                                    </Text>
                                </View>
                            }
                        />

                        {/* Footer Actions */}
                        {nonEmptyQueues.length > 1 && (
                            <View style={[styles.bsFooter, { borderTopColor: colors.border }]}>
                                <TouchableOpacity
                                    style={styles.bsDestructiveButton}
                                    onPress={handleRemoveAllOtherQueues}
                                >
                                    <Icon name="delete-sweep-outline" size={20} color={colors.error || '#F44336'} />
                                    <Text style={[styles.bsDestructiveText, { color: colors.error || '#F44336' }]}>
                                        Clear Other Queues
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </GestureHandlerRootView>
    );
};

// Format total duration of queue tracks
const formatTotalDuration = (tracks: Track[]): string => {
    const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    queueSwitcherButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    headerTitle: {
        flex: 1,
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
    },
    closeQueueSwitcher: {
        padding: spacing.xs,
    },
    infoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.xl,
    },
    infoRight: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoText: {
        fontSize: typography.sizes.sm,
        marginLeft: spacing.xs,
        fontWeight: typography.weights.medium,
    },
    listContent: {
        paddingHorizontal: spacing.sm,
    },
    // Modal / Bottom Sheet Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end', // Aligns to bottom
    },
    bottomSheetModal: {
        width: '100%',
        maxHeight: '70%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },
    bsHandleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    bsHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    bsHeader: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
    },
    bsHeaderTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
    },
    bsListContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    // Bottom Sheet Item
    bsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.xs,
        borderRadius: borderRadius.lg,
    },
    bsIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    bsNumber: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.bold,
    },
    bsContent: {
        flex: 1,
        justifyContent: 'center',
    },
    bsTitle: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
        marginBottom: 2,
    },
    bsSubtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bsSubtitle: {
        fontSize: typography.sizes.sm,
    },
    bsDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: spacing.xs,
        opacity: 0.5,
    },
    bsInput: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
        padding: 0,
        borderBottomWidth: 1.5,
        marginBottom: 2,
    },
    bsActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bsActionButton: {
        padding: spacing.xs,
    },
    // Footer
    bsFooter: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        borderTopWidth: 1,
    },
    bsDestructiveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.xs,
    },
    bsDestructiveText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
    },
    emptyQueueList: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
    emptyQueueText: {
        fontSize: typography.sizes.md,
    },
});

export default QueueScreen;