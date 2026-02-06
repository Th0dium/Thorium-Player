// Songs List Screen - Shows filtered list of songs
// Used for: All songs, Favorites, Recently added, Recently played, Most played, Not played
import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/context/ThemeContext';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore';
import { useQueueStore } from '@/store/queueStore';
import TrackListItem from '@/components/TrackListItem';
import EmptyState from '@/components/EmptyState';
import { Track } from '@/types';
import { spacing, typography } from '@/constants/theme';

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

    // Filter tracks based on the filter type
    const filteredTracks = useMemo(() => {
        const now = Date.now();
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

        let result: Track[] = [];

        switch (filter) {
            case 'all-songs':
                result = [...tracks];
                break;
            case 'favorites':
                result = tracks.filter(t => t.isFavorite);
                break;
            case 'recently-added':
                result = tracks
                    .filter(t => t.dateAdded && t.dateAdded > oneWeekAgo)
                    .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
                break;
            case 'recently-played':
                result = tracks
                    .filter(t => t.lastPlayed && t.lastPlayed > oneWeekAgo)
                    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
                break;
            case 'most-played':
                result = tracks
                    .filter(t => (t.playCount || 0) >= 1)
                    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
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

        // Apply search filter if active
        if (isSearchActive && searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title?.toLowerCase().includes(query) ||
                t.artist?.toLowerCase().includes(query) ||
                t.album?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [tracks, playlists, albums, artists, genres, playlistId, albumId, artistId, genreId, filter, searchQuery, isSearchActive]);

    const handleTrackPress = useCallback((track: Track, index: number) => {
        // Don't await - let it happen asynchronously for instant UI response
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

    const renderItem = useCallback(({ item, index }: { item: Track; index: number }) => (
        <TrackListItem
            track={item}
            isPlaying={currentTrackId === item.id}
            onPress={() => handleTrackPress(item, index)}
        />
    ), [currentTrackId, handleTrackPress]);

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
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        {filteredTracks.length} songs
                    </Text>
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
    headerSubtitle: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    listContent: {
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyText: {
        fontSize: typography.sizes.md,
        marginTop: spacing.md,
    },
});

export default SongsListScreen;
