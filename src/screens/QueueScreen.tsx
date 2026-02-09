// Queue Screen - View and manage current playback queue with Multi-Queue support
// Musicolet-style: Queue switcher as list, per-queue name from source, drag reorder
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { useTrackSelection } from '@/hooks/useTrackSelection';
import TrackListItem from '@/components/TrackListItem';
import SelectionToolbar from '@/components/SelectionToolbar';
import { TrackActionsModal } from '@/components/TrackActionsModal';
import SortMenu from '@/components/SortMenu';
import { Track, Queue, SortOption } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QueueScreenProps {
    searchQuery?: string;
    isSearchActive?: boolean;
    isFocused?: boolean;
}

const QueueScreen: React.FC<QueueScreenProps> = ({ searchQuery = '', isSearchActive = false, isFocused = false }) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList<any>>(null);

    const queues = useQueueStore(state => state.queues);
    const currentQueue = useQueueStore(state => state.currentQueue);
    const currentIndex = useQueueStore(state => state.currentIndex);
    const activeQueueIndex = useQueueStore(state => state.activeQueueIndex);
    const removeFromQueue = useQueueStore(state => state.removeFromQueue);
    const switchQueue = useQueueStore(state => state.switchQueue);
    const moveInQueue = useQueueStore(state => state.moveInQueue);
    const sortQueue = useQueueStore(state => state.sortQueue);
    const skipToIndex = usePlayerStore(state => state.skipToIndex);
    const tracks = useLibraryStore(state => state.tracks);

    const [showQueueSwitcher, setShowQueueSwitcher] = useState(false);
    const [editingQueueIndex, setEditingQueueIndex] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    // Sorting state
    const [sortBy, setSortBy] = useState<SortOption>(currentQueue?.sortBy || 'title');
    const [sortAsc, setSortAsc] = useState(currentQueue?.sortAsc ?? true);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showTrackActions, setShowTrackActions] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

    // Track selection state
    const selection = useTrackSelection();

    // Selection more options menu
    const [showSelectionOptions, setShowSelectionOptions] = useState(false);

    // Sync sorting state when queue changes
    useEffect(() => {
        if (currentQueue) {
            setSortBy(currentQueue.sortBy || 'title');
            setSortAsc(currentQueue.sortAsc ?? true);
        }
    }, [currentQueue?.id]);

    // Track measured heights of rendered items for accurate scrollToIndex
    const itemHeights = useRef(new Map<number, number>());

    // Get tracks from current queue — must come before scrollToCurrentTrack
    const queueTracks = useMemo(() => {
        if (!currentQueue || currentQueue.trackIds.length === 0) return [];

        // Use a Map for O(1) lookups
        const trackMap = new Map(tracks.map(t => [t.id, t]));
        return currentQueue.trackIds
            .map(id => trackMap.get(id))
            .filter((t): t is Track => t !== undefined);
    }, [currentQueue?.trackIds, tracks]); // Only re-run if track IDs or the library changes

    // Filter tracks based on search
    const filteredTracks = useMemo(() => {
        if (!isSearchActive || !searchQuery) return queueTracks;
        const query = searchQuery.toLowerCase();
        return queueTracks.filter(track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query)
        );
    }, [queueTracks, searchQuery, isSearchActive]);

    // Scroll to current index when queue changes or initial load
    // Works with dynamic height measurement via onLayout callbacks
    const scrollToCurrentTrack = useCallback(() => {
        if (!currentQueue || currentQueue.trackIds.length === 0 || currentIndex < 0) return;

        // Map currentIndex (position in queue.trackIds) to actual position in rendered list
        // This is needed because queueTracks filters out missing tracks
        const currentTrackId = currentQueue.trackIds[currentIndex];
        const visualIndex = filteredTracks.findIndex(t => t.id === currentTrackId);

        if (visualIndex === -1) return; // Track not found in filtered list

        // Check if this item's height has been measured
        if (!itemHeights.current.has(visualIndex)) {
            // Item not yet rendered/measured, try again with a small delay
            setTimeout(scrollToCurrentTrack, 50);
            return;
        }

        // viewPosition: 0 puts the current track at the top of the list
        requestAnimationFrame(() => {
            flatListRef.current?.scrollToIndex({
                index: visualIndex,
                animated: true,
                viewPosition: 0,
            });
        });
    }, [currentQueue, currentIndex, filteredTracks]);

    useEffect(() => {
        if (isFocused && currentQueue && currentQueue.trackIds.length > 0 && currentIndex >= 0) {
            scrollToCurrentTrack();
        }
    }, [isFocused, currentQueue?.id, currentIndex, scrollToCurrentTrack]);

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

    const handleSortOptionPress = useCallback(async (option: SortOption) => {
        let newSortAsc = sortAsc;
        if (sortBy === option) {
            newSortAsc = !sortAsc;
            setSortAsc(newSortAsc);
        } else {
            setSortBy(option);
            newSortAsc = option === 'title' || option === 'artist' || option === 'album';
            setSortAsc(newSortAsc);
        }
        setShowSortMenu(false);

        // Apply sorting to queue store
        await sortQueue(option, newSortAsc);
    }, [sortBy, sortAsc, sortQueue]);

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

    // Memoize the total duration of the current queue
    const totalQueueDuration = useMemo(() => {
        return formatTotalDuration(queueTracks);
    }, [queueTracks]);

    // Get queues with metadata pre-calculated
    const queuesWithMetadata = useMemo(() => {
        const trackMap = new Map(tracks.map(t => [t.id, t]));
        return queues.map((queue, index) => {
            const hasContent = queue.trackIds.length > 0;
            if (!hasContent) return { queue, index, duration: '0s', trackCount: 0 };

            const qTracks = queue.trackIds
                .map(id => trackMap.get(id))
                .filter((t): t is Track => t !== undefined);

            return {
                queue,
                index,
                duration: formatTotalDuration(qTracks),
                trackCount: queue.trackIds.length,
                displayName: getQueueDisplayName(queue, index)
            };
        });
    }, [queues, tracks, getQueueDisplayName]);

    // Get queues that have tracks (non-empty)
    const nonEmptyQueues = useMemo(() => {
        return queuesWithMetadata.filter(q => q.trackCount > 0);
    }, [queuesWithMetadata]);

    const handleDragEnd = useCallback(({ data, from, to }: { data: Track[]; from: number; to: number }) => {
        if (from === to) return;
        // Don't allow drag reorder when search is active — indices don't match
        if (isSearchActive && searchQuery) return;
        moveInQueue(from, to);
    }, [moveInQueue, isSearchActive, searchQuery]);

    // Compute layout based on measured heights, with fallback to average
    const getItemLayout = useCallback((data: any, index: number) => {
        const height = itemHeights.current.get(index) || 80; // Fallback to ~80px if not measured yet
        let offset = 0;

        // Sum heights of all previous items
        for (let i = 0; i < index; i++) {
            offset += itemHeights.current.get(i) || 80;
        }

        return { length: height, offset, index };
    }, []);

    const handleTrackPress = useCallback(async (filteredIndex: number) => {
        // If in selection mode, toggle selection instead of playing
        if (selection.isSelectionMode) {
            const track = filteredTracks[filteredIndex];
            if (track) {
                selection.toggleTrack(track.id);
            }
            return;
        }

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
    }, [skipToIndex, isSearchActive, searchQuery, filteredTracks, queueTracks, selection]);

    const handleTrackLongPress = useCallback((filteredIndex: number) => {
        const track = filteredTracks[filteredIndex];
        if (!track) return;

        if (!selection.isSelectionMode) {
            // Enter selection mode
            selection.enterSelectionMode(track);
        } else {
            // Already in selection mode, toggle selection
            selection.toggleTrack(track.id);
        }
    }, [filteredTracks, selection]);

    const handleDeleteSelectedTracks = useCallback(async (tracks: Track[]) => {
        // Delete tracks from queue by their IDs
        const removeFromQueueFn = useQueueStore.getState().removeFromQueue;
        tracks.forEach((track) => {
            const index = queueTracks.findIndex(t => t.id === track.id);
            if (index >= 0) {
                removeFromQueueFn(index);
            }
        });
    }, [queueTracks]);

    const handleInvertSelection = useCallback((trackIds: string[]) => {
        selection.invertSelection(trackIds);
    }, [selection]);

    const handleSelectRange = useCallback((trackIds: string[]) => {
        selection.selectRange(trackIds);
    }, [selection]);

    const handleMorePress = useCallback((track: Track) => {
        setSelectedTrack(track);
        setShowTrackActions(true);
    }, []);

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
        const isSelected = selection.selectedTracks.has(item.id);

        return (
            <View
                style={isDragging ? {
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    transform: [{ scale: 1.03 }],
                    zIndex: 999,
                    borderRadius: 8,
                    opacity: 0.95,
                } : undefined}
                onLayout={(e) => {
                    // Measure and store the actual height of this item
                    const height = e.nativeEvent.layout.height;
                    if (height > 0) {
                        itemHeights.current.set(filteredIndex, height);
                    }
                }}
            >
                <TrackListItem
                    track={item}
                    index={realIndex}
                    isPlaying={isPlaying}
                    isSelected={isSelected}
                    showSelection={selection.isSelectionMode}
                    isPast={isPast}
                    showArtwork={true}
                    showDragHandle={!isSearching && !selection.isSelectionMode}
                    drag={isSearching || selection.isSelectionMode ? undefined : drag}
                    onPress={() => handleTrackPress(filteredIndex)}
                    onLongPress={() => handleTrackLongPress(filteredIndex)}
                    onMorePress={handleMorePress}
                />
            </View>
        );
    }, [currentIndex, handleTrackPress, handleTrackLongPress, handleMorePress, isSearchActive, searchQuery, queueTracks, selection]);

    // --- Render Queue Switcher Modal Item ---
    const renderQueueSwitcherItem = useCallback(({ item: meta }: { item: typeof queuesWithMetadata[0] }) => {
        const { queue, index, duration, trackCount, displayName } = meta;
        const isActive = index === activeQueueIndex;
        const isEditing = editingQueueIndex === index;

        // Skip empty queues
        if (trackCount === 0) return null;

        return (
            <TouchableOpacity
                key={queue.id}
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
                            {displayName}
                        </Text>
                    )}
                    <View style={styles.bsSubtitleContainer}>
                        <Text style={[styles.bsSubtitle, { color: colors.textSecondary }]}>
                            {trackCount} {trackCount === 1 ? 'song' : 'songs'}
                        </Text>
                        <View style={[styles.bsDot, { backgroundColor: colors.textTertiary }]} />
                        <Text style={[styles.bsSubtitle, { color: colors.textSecondary }]}>
                            {duration}
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
    }, [activeQueueIndex, editingQueueIndex, editingName, colors, handleSwitchQueue, handleStartRename, handleRemoveQueue, handleSaveRename]);

    return (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* QUEUE HEADER - Always visible */}
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

                {currentQueue && queueTracks.length > 1 && (
                    <TouchableOpacity
                        style={[styles.sortToggleButton, { backgroundColor: colors.surface }]}
                        onPress={() => setShowSortMenu(true)}
                    >
                        <Icon name="sort" size={20} color={colors.textSecondary} />
                        <Icon
                            name={sortAsc ? 'arrow-up' : 'arrow-down'}
                            size={14}
                            color={colors.primary}
                            style={styles.sortArrow}
                        />
                    </TouchableOpacity>
                )}
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
                            {totalQueueDuration}
                        </Text>
                    </View>
                </View>
            )}

            {/* Queue List */}
            {queueTracks.length > 0 ? (
                <DraggableFlatList
                    ref={flatListRef}
                    data={filteredTracks}
                    keyExtractor={(item) => item.id}
                    renderItem={renderQueueItem}
                    onDragEnd={handleDragEnd}
                    containerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    activationDistance={10}
                    // Dynamic height measurement (onLayout) enables aggressive lazy rendering
                    // Items report their height as they render, populating itemHeights Map
                    // getItemLayout uses these real measurements for accurate scrollToIndex
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={7}
                    removeClippedSubviews={true}
                    getItemLayout={getItemLayout}
                    onScrollToIndexFailed={(info) => {
                        // Fallback: scroll to offset, wait for render, then retry
                        flatListRef.current?.scrollToOffset({
                            offset: info.averageItemLength * info.index,
                            animated: false,
                        });
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                flatListRef.current?.scrollToIndex({
                                    index: info.index,
                                    animated: true,
                                    viewPosition: 0,
                                });
                            }, 100);
                        });
                    }}
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
                            data={queuesWithMetadata}
                            keyExtractor={(item) => item.queue.id}
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

            {/* Sort Menu */}
            <SortMenu
                visible={showSortMenu}
                onClose={() => setShowSortMenu(false)}
                sortBy={sortBy}
                sortAsc={sortAsc}
                onSortChange={handleSortOptionPress}
                title="Sort Queue by"
            />

            {/* Track Actions Modal */}
            <TrackActionsModal
                visible={showTrackActions}
                track={selectedTrack}
                onClose={() => setShowTrackActions(false)}
                onRemove={(track) => {
                    const index = queueTracks.findIndex(t => t.id === track.id);
                    if (index >= 0) removeFromQueue(index);
                }}
                showRemove={true}
            />

            {/* Selection Toolbar */}
            {selection.isSelectionMode && (
                <SelectionToolbar
                    selectionCount={selection.selectionCount}
                    totalCount={queueTracks.length}
                    onClose={selection.exitSelectionMode}
                    onSelectAll={() => selection.selectAll(queueTracks)}
                    onDeselectAll={selection.deselectAll}
                    onInvertSelection={handleInvertSelection}
                    onSelectRange={handleSelectRange}
                    getSelectedTracks={() => selection.getSelectedTracks(queueTracks)}
                    getAllTrackIds={() => queueTracks.map(t => t.id)}
                    onActionComplete={selection.exitSelectionMode}
                    onDeleteTracks={handleDeleteSelectedTracks}
                    onToggleFavorite={async (tracks, isFavorite) => {
                        // Implement if needed
                    }}
                />
            )}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    queueSwitcherButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    sortToggleButton: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    sortArrow: {
        position: 'absolute',
        right: 6,
        bottom: 8,
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
    sortMenu: {
        width: '80%',
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuTitle: {
        fontSize: typography.sizes.md,
        fontWeight: 'bold',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        marginBottom: spacing.xs,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    sortOptionLabel: {
        fontSize: typography.sizes.md,
        marginLeft: spacing.md,
    },
});

export default QueueScreen;