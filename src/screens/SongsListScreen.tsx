// Songs List Screen - Shows filtered list of songs
// Used for: All songs, Favorites, Recently added, Recently played, Most played, Not played
import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/context/ThemeContext';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { useQueueStore } from '@/store/queueStore';
import { useTrackSelection } from '@/hooks/useTrackSelection';
import TrackListItem from '@/components/TrackListItem';
import SelectionToolbar from '@/components/SelectionToolbar';
import { TrackActionsModal } from '@/components/TrackActionsModal';
import EmptyState from '@/components/EmptyState';
import SortMenu from '@/components/SortMenu';
import { useSort } from '@/hooks/useSort';
import { Track, SortOption } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

export type FilterType = 'all-songs' | 'favorites' | 'recently-added' | 'recently-played' | 'most-played' | 'not-played' | 'playlist' | 'album' | 'artist' | 'genre';

interface SongsListScreenProps {
    filter: FilterType;
    title: string;
    playlistId?: string;
    albumId?: string;
    artistId?: string;
    genreId?: string;
    searchQuery?: string;
    isSearchActive?: boolean;
    onBack?: () => void;
    onPlay?: () => void;
}

const SongsListScreen: React.FC<SongsListScreenProps> = ({
    filter,
    title,
    playlistId,
    albumId,
    artistId,
    genreId,
    searchQuery = '',
    isSearchActive = false,
    onBack,
    onPlay,
}) => {
    const { colors } = useTheme();
    const tracks = useLibraryStore(state => state.tracks);
    const playlists = useLibraryStore(state => state.playlists);
    const albums = useLibraryStore(state => state.albums);
    const artists = useLibraryStore(state => state.artists);
    const genres = useLibraryStore(state => state.genres);
    const currentTrackId = usePlayerStore(state => state.currentTrack?.id);
    const createQueue = useQueueStore(state => state.createQueue);

    const { sortBy, sortAsc, handleSortChange, sortTracks } = useSort(
        filter === 'most-played' ? 'playCount' : (filter === 'recently-added' || filter === 'recently-played' ? 'dateAdded' : 'title'),
        filter !== 'most-played' && filter !== 'recently-added' && filter !== 'recently-played',
        `list-${filter}-${playlistId || albumId || artistId || genreId || 'default'}`
    );
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showTrackActions, setShowTrackActions] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

    // Track selection state
    const selection = useTrackSelection();

    // Filter and sort tracks
    const filteredTracks = useMemo(() => {
        const now = Date.now();
        const oneWeekAgo = now - 30 * 24 * 60 * 60 * 1000;

        let result: Track[] = [];

        // 1. Initial Filtering
        switch (filter) {
            case 'all-songs':
                result = [...tracks];
                break;
            case 'favorites':
                result = tracks.filter(t => t.isFavorite);
                break;
            case 'recently-added':
                result = tracks.filter(t => t.dateAdded && t.dateAdded > oneWeekAgo);
                break;
            case 'recently-played':
                result = tracks.filter(t => t.lastPlayed && t.lastPlayed > oneWeekAgo);
                break;
            case 'most-played':
                result = tracks.filter(t => (t.playCount || 0) >= 1);
                break;
            case 'not-played':
                result = tracks.filter(t => !t.playCount || t.playCount === 0);
                break;
            case 'playlist': {
                const playlist = playlists.find(p => p.id === playlistId);
                if (playlist) {
                    const trackMap = new Map(tracks.map(t => [t.id, t]));
                    result = playlist.trackIds
                        .map(id => trackMap.get(id))
                        .filter((t): t is Track => t !== undefined);
                }
                break;
            }
            case 'album': {
                const album = albums.find(a => a.id === albumId);
                if (album) {
                    const trackMap = new Map(tracks.map(t => [t.id, t]));
                    result = album.trackIds
                        .map(id => trackMap.get(id))
                        .filter((t): t is Track => t !== undefined);
                }
                break;
            }
            case 'artist': {
                const artist = artists.find(a => a.id === artistId);
                if (artist) {
                    const trackMap = new Map(tracks.map(t => [t.id, t]));
                    result = artist.trackIds
                        .map(id => trackMap.get(id))
                        .filter((t): t is Track => t !== undefined);
                }
                break;
            }
            case 'genre': {
                const genre = genres.find(g => g.id === genreId);
                if (genre) {
                    const trackMap = new Map(tracks.map(t => [t.id, t]));
                    result = genre.trackIds
                        .map(id => trackMap.get(id))
                        .filter((t): t is Track => t !== undefined);
                }
                break;
            }
            default:
                result = [...tracks];
        }

        // 2. Sorting
        result = sortTracks(result);

        // 3. Search Filtering
        if (isSearchActive && searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title?.toLowerCase().includes(query) ||
                t.artist?.toLowerCase().includes(query) ||
                t.album?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [tracks, playlists, albums, artists, genres, playlistId, albumId, artistId, genreId, filter, searchQuery, isSearchActive, sortTracks]);

    const handleTrackPress = useCallback((track: Track, index: number) => {
        // If in selection mode, toggle selection instead of playing
        if (selection.isSelectionMode) {
            selection.toggleTrack(track.id);
            return;
        }

        const sourceTypeMap: Record<FilterType, string> = {
            'all-songs': 'all',
            'favorites': 'custom',
            'recently-added': 'custom',
            'recently-played': 'custom',
            'most-played': 'custom',
            'not-played': 'custom',
            'playlist': 'playlist',
            'album': 'album',
            'artist': 'artist',
            'genre': 'genre',
        };
        createQueue(filteredTracks, {
            type: sourceTypeMap[filter] as any,
            name: title,
            id: playlistId || albumId || artistId || genreId,
        }, index, sortBy, sortAsc);
        onPlay?.();
    }, [filteredTracks, createQueue, filter, title, playlistId, albumId, artistId, genreId, onPlay, sortBy, sortAsc, selection]);

    const handleTrackLongPress = useCallback((track: Track) => {
        if (!selection.isSelectionMode) {
            selection.enterSelectionMode(track);
        } else {
            selection.toggleTrack(track.id);
        }
    }, [selection]);

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
            isPlaying={currentTrackId === item.id}
            isSelected={selection.selectedTracks.has(item.id)}
            showSelection={selection.isSelectionMode}
            onPress={() => handleTrackPress(item, index)}
            onLongPress={() => handleTrackLongPress(item)}
            onMorePress={handleMorePress}
            rightElement={filter === 'most-played' || sortBy === 'playCount' ? (
                <Text style={{
                    color: colors.textTertiary,
                    fontSize: typography.sizes.sm,
                    fontWeight: 'bold',
                    opacity: 0.8
                }}>
                    {item.playCount || 0}
                </Text>
            ) : undefined}
        />
    ), [currentTrackId, handleTrackPress, filter, sortBy, colors, typography, handleMorePress]);

    const keyExtractor = useCallback((item: Track) => item.id, []);

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: 72,
        offset: 72 * index,
        index,
    }), []);

    const getSortLabel = (option: SortOption) => {
        switch (option) {
            case 'title': return 'Title';
            case 'artist': return 'Artist';
            case 'album': return 'Album';
            case 'dateAdded': return 'Date Added';
            case 'duration': return 'Duration';
            case 'playCount': return 'Play Count';
            default: return option;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header with back button - Always visible */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={onBack}
                    activeOpacity={0.7}
                >
                    <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {title}
                    </Text>
                    <View style={styles.headerSubtitleRow}>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            {filteredTracks.length} songs
                        </Text>
                        <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
                        <TouchableOpacity
                            style={styles.sortToggleButton}
                            onPress={() => setShowSortMenu(true)}
                        >
                            <Text style={[styles.sortText, { color: colors.primary }]}>
                                {getSortLabel(sortBy)}
                            </Text>
                            <Icon
                                name={sortAsc ? 'arrow-up' : 'arrow-down'}
                                size={14}
                                color={colors.primary}
                                style={{ marginLeft: 2 }}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Songs list */}
            <FlatList
                data={filteredTracks}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <EmptyState
                        icon="music-note-off"
                        iconSize={48}
                        title="No songs found"
                    />
                }
            />

            {/* Sort Menu */}
            <SortMenu
                visible={showSortMenu}
                onClose={() => setShowSortMenu(false)}
                sortBy={sortBy}
                sortAsc={sortAsc}
                onSortChange={handleSortChange}
            />

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
                    totalCount={filteredTracks.length}
                    onClose={selection.exitSelectionMode}
                    onSelectAll={() => selection.selectAll(filteredTracks)}
                    onDeselectAll={selection.deselectAll}
                    onInvertSelection={handleInvertSelection}
                    onSelectRange={handleSelectRange}
                    getSelectedTracks={() => selection.getSelectedTracks(filteredTracks)}
                    getAllTrackIds={() => filteredTracks.map(t => t.id)}
                    onActionComplete={selection.exitSelectionMode}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: spacing.sm,
        marginRight: spacing.xs,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: '600',
    },
    headerSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    headerSubtitle: {
        fontSize: typography.sizes.sm,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: spacing.sm,
        opacity: 0.5,
    },
    sortToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sortText: {
        fontSize: typography.sizes.sm,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 100,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
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

export default SongsListScreen;