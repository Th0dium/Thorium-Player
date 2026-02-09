// Songs Screen - Full track list with alphabet scroller
// Displays all songs from library with search and sorting
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLibraryStore } from '@/store/libraryStore';
import { useQueueStore } from '@/store/queueStore';
import { usePlayerStore } from '@/store/playerStore';
import TrackListItem from '@/components/TrackListItem';
import SelectionToolbar from '@/components/SelectionToolbar';
import { TrackActionsModal } from '@/components/TrackActionsModal';
import AlphabetScroller from '@/components/AlphabetScroller';
import EmptyState from '@/components/EmptyState';
import SkeletonList from '@/components/SkeletonLoader';
import SortMenu from '@/components/SortMenu';
import { useSort } from '@/hooks/useSort';
import { useTrackSelection } from '@/hooks/useTrackSelection';
import { useTheme } from '@/context/ThemeContext';
import { Track, SortOption } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface SongsScreenProps {
    searchQuery?: string;
    onPlay?: () => void;
}

const SongsScreen: React.FC<SongsScreenProps> = ({ searchQuery = '', onPlay }) => {
    const { colors } = useTheme();
    const flatListRef = useRef<FlatList>(null);
    const { sortBy, sortAsc, handleSortChange, sortTracks } = useSort('title', true, 'all-songs');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showTrackActions, setShowTrackActions] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

    // Track selection state
    const selection = useTrackSelection();

    // Extract only the selection state values we need to trigger re-renders
    // when selection state changes
    const selectionState = useMemo(() => ({
        isSelectionMode: selection.isSelectionMode,
        selectedTracks: selection.selectedTracks,
    }), [selection.isSelectionMode, selection.selectedTracks]);

    // Use individual selectors to prevent re-renders when unrelated state changes
    const tracks = useLibraryStore(state => state.tracks);
    const isLoading = useLibraryStore(state => state.isLoading);
    const isScanning = useLibraryStore(state => state.isScanning);
    const loadLibrary = useLibraryStore(state => state.loadLibrary);
    const scanForMusic = useLibraryStore(state => state.scanForMusic);

    const createQueue = useQueueStore(state => state.createQueue);
    const addToQueue = useQueueStore(state => state.addToQueue);
    // Only subscribe to the specific values we need to minimize re-renders
    const currentTrackId = usePlayerStore(state => state.currentTrack?.id);
    const isPlaying = usePlayerStore(state => state.isPlaying);

    useEffect(() => {
        loadLibrary();
    }, []);

    // Filter and sort tracks
    const filteredAndSortedTracks = useMemo(() => {
        let result = [...tracks];

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(track =>
                track.title.toLowerCase().includes(query) ||
                track.artist?.toLowerCase().includes(query) ||
                track.album?.toLowerCase().includes(query)
            );
        }

        // Sort tracks using the hook's logic
        return sortTracks(result);
    }, [tracks, searchQuery, sortTracks]);

    // Get alphabet index for scroller
    const alphabetIndex = useMemo(() => {
        const index: { [key: string]: number } = {};
        const field = sortBy === 'artist' ? 'artist' : sortBy === 'album' ? 'album' : 'title';

        filteredAndSortedTracks.forEach((track, i) => {
            const value = track[field] || '';
            const firstChar = value.charAt(0).toUpperCase();
            const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
            if (!(letter in index)) {
                index[letter] = i;
            }
        });

        return index;
    }, [filteredAndSortedTracks, sortBy]);

    const activeLetters = useMemo(() => Object.keys(alphabetIndex), [alphabetIndex]);

    const handleLetterChange = useCallback((letter: string) => {
        const index = alphabetIndex[letter];
        if (index !== undefined && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: false });
        }
    }, [alphabetIndex]);

    const handleTrackPress = useCallback(async (track: Track, index: number) => {
        if (selection.isSelectionMode) {
            selection.toggleTrack(track.id);
            return;
        }

        await createQueue(filteredAndSortedTracks, {
            type: 'all',
            name: searchQuery ? 'Search Results' : 'All Songs',
        }, index, sortBy, sortAsc);
        onPlay?.();
    }, [filteredAndSortedTracks, selection, searchQuery, createQueue, onPlay, sortBy, sortAsc]);

    const handleTrackLongPress = useCallback((track: Track) => {
        // Only enter selection mode on long-press if NOT already in selection mode
        if (!selection.isSelectionMode) {
            selection.enterSelectionMode(track);
        }
    }, [selection]);

    const handleRefresh = useCallback(async () => {
        await scanForMusic();
    }, [scanForMusic]);

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

    const renderItem = useCallback(({ item, index }: { item: Track; index: number }) => (
        <TrackListItem
            track={item}
            index={index}
            isPlaying={currentTrackId === item.id && isPlaying}
            isSelected={selectionState.selectedTracks.has(item.id)}
            showSelection={selectionState.isSelectionMode}
            onPress={() => handleTrackPress(item, index)}
            onLongPress={() => handleTrackLongPress(item)}
            onMorePress={handleMorePress}
        />
    ), [currentTrackId, isPlaying, selectionState, handleTrackPress, handleTrackLongPress, handleMorePress]);

    const keyExtractor = useCallback((item: Track) => item.id, []);

    const getItemLayout = useCallback((_data: any, index: number) => ({
        length: 64,
        offset: 64 * index,
        index,
    }), []);

    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            {/* Sort bar - Always visible */}
            <View style={styles.sortBar}>
                <Text style={styles.trackCount}>{filteredAndSortedTracks.length} songs</Text>
                <TouchableOpacity
                    style={styles.sortButton}
                    onPress={() => setShowSortMenu(!showSortMenu)}
                >
                    <Icon name="sort" size={20} color={colors.textSecondary} />
                    <Text style={styles.sortLabel}>{sortBy}</Text>
                    <Icon
                        name={sortAsc ? 'arrow-up' : 'arrow-down'}
                        size={16}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>

            {/* Track list */}
            {isLoading && filteredAndSortedTracks.length === 0 ? (
                <SkeletonList count={10} />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={filteredAndSortedTracks}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    // Performance optimizations for large lists
                    initialNumToRender={15}
                    maxToRenderPerBatch={15}
                    windowSize={7}
                    removeClippedSubviews={true}
                    updateCellsBatchingPeriod={50}
                    getItemLayout={getItemLayout}
                    refreshControl={
                        <RefreshControl
                            refreshing={isScanning}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                    contentContainerStyle={styles.listContent}
                    onScrollToIndexFailed={(info) => {
                        // Handle scroll failure gracefully
                        setTimeout(() => {
                            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                        }, 500);
                    }}
                    ListEmptyComponent={
                        <EmptyState
                            icon="music-note-off"
                            title={isLoading ? 'Loading...' : searchQuery ? 'No songs found' : 'No music yet'}
                            subtitle={!isLoading && !searchQuery ? 'Pull down to scan for music' : undefined}
                        />
                    }
                />
            )}

            {/* Alphabet scroller */}
            {filteredAndSortedTracks.length > 20 && !selection.isSelectionMode && (
                <AlphabetScroller
                    onLetterChange={handleLetterChange}
                    activeLetters={activeLetters}
                />
            )}

            {/* Sort Menu */}
            <SortMenu
                visible={showSortMenu}
                onClose={() => setShowSortMenu(false)}
                sortBy={sortBy}
                sortAsc={sortAsc}
                onSortChange={handleSortChange}
            />

            {/* Track Actions Modal */}
            {/* Track Actions Modal */}
            <TrackActionsModal
                visible={showTrackActions}
                track={selectedTrack}
                onClose={() => setShowTrackActions(false)}
                onAddToQueue={(track) => addToQueue([track])}
            />

            {/* Selection Toolbar */}
            {selection.isSelectionMode && (
                <SelectionToolbar
                    selectionCount={selection.selectionCount}
                    totalCount={filteredAndSortedTracks.length}
                    onClose={selection.exitSelectionMode}
                    onSelectAll={() => selection.selectAll(filteredAndSortedTracks)}
                    onDeselectAll={selection.deselectAll}
                    onInvertSelection={handleInvertSelection}
                    onSelectRange={handleSelectRange}
                    getSelectedTracks={() => selection.getSelectedTracks(filteredAndSortedTracks)}
                    getAllTrackIds={() => filteredAndSortedTracks.map(t => t.id)}
                    onActionComplete={selection.exitSelectionMode}
                />
            )}
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    selectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    selectionButton: {
        padding: spacing.sm,
    },
    selectionCount: {
        flex: 1,
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
    },
    sortBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    trackCount: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.surface,
    },
    sortLabel: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginHorizontal: spacing.xs,
        textTransform: 'capitalize',
    },
    listContent: {
        paddingBottom: 120,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.medium as any,
        color: colors.textSecondary,
        marginTop: spacing.lg,
    },
    emptySubtitle: {
        fontSize: typography.sizes.sm,
        color: colors.textTertiary,
        marginTop: spacing.sm,
    },
});

export default SongsScreen;
