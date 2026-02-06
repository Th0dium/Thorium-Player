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
import TrackListItem from '@/components/TrackListItem';
import EmptyState from '@/components/EmptyState';
import { Track } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

export type FilterType = 'all-songs' | 'favorites' | 'recently-added' | 'recently-played' | 'most-played' | 'not-played' | 'playlist' | 'album' | 'artist' | 'genre';
type SortOption = 'title' | 'artist' | 'album' | 'dateAdded' | 'duration' | 'playCount';

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
}) => {
    const { colors } = useTheme();
    const tracks = useLibraryStore(state => state.tracks);
    const playlists = useLibraryStore(state => state.playlists);
    const albums = useLibraryStore(state => state.albums);
    const artists = useLibraryStore(state => state.artists);
    const genres = useLibraryStore(state => state.genres);
    const currentTrackId = usePlayerStore(state => state.currentTrack?.id);
    const createQueue = useQueueStore(state => state.createQueue);

    // Sorting state
    const [sortBy, setSortBy] = useState<SortOption>(() => {
        if (filter === 'most-played') return 'playCount';
        if (filter === 'recently-added') return 'dateAdded';
        if (filter === 'recently-played') return 'dateAdded';
        return 'title';
    });
    const [sortAsc, setSortAsc] = useState(
        filter !== 'most-played' && 
        filter !== 'recently-added' && 
        filter !== 'recently-played'
    );
    const [showSortMenu, setShowSortMenu] = useState(false);

    const sortOptions: { key: SortOption; label: string; icon: string }[] = [
        { key: 'title', label: 'Title', icon: 'sort-alphabetical-ascending' },
        { key: 'artist', label: 'Artist', icon: 'account-music' },
        { key: 'album', label: 'Album', icon: 'album' },
        { key: 'dateAdded', label: 'Date Added', icon: 'calendar-plus' },
        { key: 'duration', label: 'Duration', icon: 'clock-outline' },
        { key: 'playCount', label: 'Play Count', icon: 'chart-bar' },
    ];

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
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'artist':
                    comparison = (a.artist || '').localeCompare(b.artist || '');
                    if (comparison === 0) comparison = (a.title || '').localeCompare(b.title || '');
                    break;
                case 'album':
                    comparison = (a.album || '').localeCompare(b.album || '');
                    if (comparison === 0) comparison = (a.title || '').localeCompare(b.title || '');
                    break;
                case 'dateAdded':
                    comparison = (a.dateAdded || 0) - (b.dateAdded || 0);
                    break;
                case 'duration':
                    comparison = (a.duration || 0) - (b.duration || 0);
                    break;
                case 'playCount':
                    comparison = (a.playCount || 0) - (b.playCount || 0);
                    break;
                case 'title':
                default:
                    comparison = (a.title || '').localeCompare(b.title || '');
            }
            return sortAsc ? comparison : -comparison;
        });

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
    }, [tracks, playlists, albums, artists, genres, playlistId, albumId, artistId, genreId, filter, searchQuery, isSearchActive, sortBy, sortAsc]);

    const handleTrackPress = useCallback((track: Track, index: number) => {
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
        }, index);
    }, [filteredTracks, createQueue, filter, title, playlistId, albumId, artistId, genreId]);

    const handleSortOptionPress = (option: SortOption) => {
        if (sortBy === option) {
            setSortAsc(!sortAsc);
        } else {
            setSortBy(option);
            setSortAsc(option === 'title' || option === 'artist' || option === 'album');
        }
        setShowSortMenu(false);
    };

    const renderItem = useCallback(({ item, index }: { item: Track; index: number }) => (
        <TrackListItem
            track={item}
            isPlaying={currentTrackId === item.id}
            onPress={() => handleTrackPress(item, index)}
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
    ), [currentTrackId, handleTrackPress, filter, sortBy, colors, typography]);

    const keyExtractor = useCallback((item: Track) => item.id, []);

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: 72,
        offset: 72 * index,
        index,
    }), []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header with back button */}
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
                                {sortOptions.find(o => o.key === sortBy)?.label}
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

            {/* Sort Menu Modal */}
            <Modal
                visible={showSortMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSortMenu(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowSortMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.sortMenu, { backgroundColor: colors.surfaceElevated }]}>
                                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Sort by</Text>
                                {sortOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[
                                            styles.sortOption,
                                            sortBy === option.key && { backgroundColor: colors.primary + '15' }
                                        ]}
                                        onPress={() => handleSortOptionPress(option.key)}
                                    >
                                        <Icon 
                                            name={option.icon} 
                                            size={20} 
                                            color={sortBy === option.key ? colors.primary : colors.textSecondary} 
                                        />
                                        <Text style={[
                                            styles.sortOptionLabel,
                                            { color: sortBy === option.key ? colors.primary : colors.textPrimary }
                                        ]}>
                                            {option.label}
                                        </Text>
                                        {sortBy === option.key && (
                                            <Icon 
                                                name={sortAsc ? 'arrow-up' : 'arrow-down'} 
                                                size={18} 
                                                color={colors.primary} 
                                                style={{ marginLeft: 'auto' }}
                                            />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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