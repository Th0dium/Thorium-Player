// Albums Screen - Grid view of albums with cover art
// Musicolet-style album browser with sorting options
import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    Dimensions,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EmptyState from '@/components/EmptyState';
import { useLibraryStore } from '@/store/libraryStore';
import { useTheme } from '@/context/ThemeContext';
import { Album } from '@/store/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const ITEM_MARGIN = spacing.sm;
const ITEM_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - ITEM_MARGIN * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type SortOption = 'name' | 'artist' | 'trackCount' | 'year';

interface AlbumsScreenProps {
    searchQuery?: string;
    onAlbumPress?: (album: Album) => void;
}

const AlbumsScreen: React.FC<AlbumsScreenProps> = ({ searchQuery = '', onAlbumPress }) => {
    const { colors } = useTheme();
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [sortAsc, setSortAsc] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const albums = useLibraryStore(state => state.albums);
    const isScanning = useLibraryStore(state => state.isScanning);
    const scanForMusic = useLibraryStore(state => state.scanForMusic);

    // Filter and sort albums
    const filteredAndSortedAlbums = useMemo(() => {
        let result = [...albums];

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(album =>
                album.name.toLowerCase().includes(query) ||
                album.artist?.toLowerCase().includes(query)
            );
        }

        // Sort albums
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'artist':
                    comparison = (a.artist || '').localeCompare(b.artist || '');
                    break;
                case 'trackCount':
                    comparison = (a.trackCount || 0) - (b.trackCount || 0);
                    break;
                case 'year':
                    comparison = (a.year || 0) - (b.year || 0);
                    break;
            }
            return sortAsc ? comparison : -comparison;
        });

        return result;
    }, [albums, searchQuery, sortBy, sortAsc]);

    const handleRefresh = useCallback(async () => {
        await scanForMusic();
    }, [scanForMusic]);

    const handleAlbumPress = useCallback((album: Album) => {
        if (onAlbumPress) {
            onAlbumPress(album);
        }
    }, [onAlbumPress]);

    const renderGridItem = ({ item }: { item: Album }) => (
        <TouchableOpacity
            style={[styles.gridItem, { width: ITEM_WIDTH }]}
            onPress={() => handleAlbumPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.albumCover, { backgroundColor: colors.surface }]}>
                {item.artwork ? (
                    <Image
                        source={{ uri: item.artwork }}
                        style={styles.coverImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.placeholderCover, { backgroundColor: colors.surfaceVariant }]}>
                        <Icon name="album" size={48} color={colors.textTertiary} />
                    </View>
                )}
            </View>
            <Text style={[styles.albumName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
            </Text>
            <Text style={[styles.albumArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.artist || 'Unknown Artist'}
            </Text>
            <Text style={[styles.trackCount, { color: colors.textTertiary }]}>
                {item.trackCount} {item.trackCount === 1 ? 'song' : 'songs'}
            </Text>
        </TouchableOpacity>
    );

    const renderListItem = ({ item }: { item: Album }) => (
        <TouchableOpacity
            style={[styles.listItem, { borderBottomColor: colors.border }]}
            onPress={() => handleAlbumPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.listCover, { backgroundColor: colors.surface }]}>
                {item.artwork ? (
                    <Image
                        source={{ uri: item.artwork }}
                        style={styles.listCoverImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.listPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
                        <Icon name="album" size={28} color={colors.textTertiary} />
                    </View>
                )}
            </View>
            <View style={styles.listInfo}>
                <Text style={[styles.listAlbumName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={[styles.listAlbumArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.artist || 'Unknown Artist'}
                </Text>
            </View>
            <View style={styles.listMeta}>
                <Text style={[styles.listTrackCount, { color: colors.textTertiary }]}>
                    {item.trackCount}
                </Text>
                <Icon name="chevron-right" size={24} color={colors.textTertiary} />
            </View>
        </TouchableOpacity>
    );

    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            {/* Header bar */}
            <View style={styles.headerBar}>
                <Text style={styles.albumCount}>{filteredAndSortedAlbums.length} albums</Text>
                <View style={styles.headerActions}>
                    {/* View mode toggle */}
                    <TouchableOpacity
                        style={styles.viewToggle}
                        onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    >
                        <Icon
                            name={viewMode === 'grid' ? 'view-list' : 'view-grid'}
                            size={22}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
                    {/* Sort button */}
                    <TouchableOpacity
                        style={styles.sortButton}
                        onPress={() => {
                            // Cycle through sort options
                            const options: SortOption[] = ['name', 'artist', 'trackCount', 'year'];
                            const currentIndex = options.indexOf(sortBy);
                            const nextIndex = (currentIndex + 1) % options.length;
                            setSortBy(options[nextIndex]);
                        }}
                    >
                        <Icon name="sort" size={20} color={colors.textSecondary} />
                        <Text style={styles.sortLabel}>{sortBy}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Album grid/list */}
            <FlatList
                data={filteredAndSortedAlbums}
                keyExtractor={item => item.id}
                renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
                numColumns={viewMode === 'grid' ? NUM_COLUMNS : 1}
                key={viewMode} // Force re-render when switching views
                refreshControl={
                    <RefreshControl
                        refreshing={isScanning}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                contentContainerStyle={[
                    styles.listContent,
                    viewMode === 'grid' && styles.gridContent
                ]}
                ListEmptyComponent={
                    <EmptyState
                        icon="album"
                        title={searchQuery ? 'No albums found' : 'No albums yet'}
                        subtitle={!searchQuery ? 'Scan your music library to find albums' : undefined}
                    />
                }
            />
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    albumCount: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewToggle: {
        padding: spacing.sm,
        marginRight: spacing.xs,
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
        marginLeft: spacing.xs,
        textTransform: 'capitalize',
    },
    listContent: {
        paddingBottom: 120,
    },
    gridContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    // Grid styles
    gridItem: {
        marginBottom: spacing.lg,
        marginRight: ITEM_MARGIN,
    },
    albumCover: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    placeholderCover: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    albumName: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
    },
    albumArtist: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    trackCount: {
        fontSize: typography.sizes.xs,
        marginTop: 2,
    },
    // List styles
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    listCover: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
    },
    listCoverImage: {
        width: '100%',
        height: '100%',
    },
    listPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    listAlbumName: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
    },
    listAlbumArtist: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    listMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listTrackCount: {
        fontSize: typography.sizes.sm,
        marginRight: spacing.xs,
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

export default AlbumsScreen;
