// Artists Screen - Artist list with avatars and album/track counts
import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EmptyState from '@/components/EmptyState';
import { useLibraryStore } from '@/store/libraryStore';
import { useTheme } from '@/context/ThemeContext';
import { Artist } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import AlphabetScroller from '@/components/AlphabetScroller';

type SortOption = 'name' | 'albumCount' | 'trackCount';

interface ArtistsScreenProps {
    searchQuery?: string;
    onArtistPress?: (artist: Artist) => void;
}

const ArtistsScreen: React.FC<ArtistsScreenProps> = ({ searchQuery = '', onArtistPress }) => {
    const { colors } = useTheme();
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const flatListRef = React.useRef<FlatList>(null);

    const artists = useLibraryStore(state => state.artists);
    const isScanning = useLibraryStore(state => state.isScanning);
    const scanForMusic = useLibraryStore(state => state.scanForMusic);

    // Filter and sort artists
    const filteredAndSortedArtists = useMemo(() => {
        let result = [...artists];

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(artist =>
                artist.name.toLowerCase().includes(query)
            );
        }

        // Sort artists
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'albumCount':
                    return (b.albumCount || 0) - (a.albumCount || 0);
                case 'trackCount':
                    return (b.trackCount || 0) - (a.trackCount || 0);
                default:
                    return 0;
            }
        });

        return result;
    }, [artists, searchQuery, sortBy]);

    // Alphabet index
    const alphabetIndex = useMemo(() => {
        const index: { [key: string]: number } = {};
        filteredAndSortedArtists.forEach((artist, i) => {
            const firstChar = (artist.name || '').charAt(0).toUpperCase();
            const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
            if (!(letter in index)) {
                index[letter] = i;
            }
        });
        return index;
    }, [filteredAndSortedArtists]);

    const activeLetters = useMemo(() => Object.keys(alphabetIndex), [alphabetIndex]);

    const handleLetterChange = useCallback((letter: string) => {
        const index = alphabetIndex[letter];
        if (index !== undefined && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: false });
        }
    }, [alphabetIndex]);

    const handleRefresh = useCallback(async () => {
        await scanForMusic();
    }, [scanForMusic]);

    const handleArtistPress = useCallback((artist: Artist) => {
        if (onArtistPress) {
            onArtistPress(artist);
        }
    }, [onArtistPress]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvatarColor = (name: string) => {
        const hue = name.charCodeAt(0) * 10 % 360;
        return `hsl(${hue}, 50%, 40%)`;
    };

    const renderArtistItem = ({ item }: { item: Artist }) => (
        <TouchableOpacity
            style={[styles.artistItem, { borderBottomColor: colors.border }]}
            onPress={() => handleArtistPress(item)}
            activeOpacity={0.7}
        >
            {/* Avatar */}
            <View style={styles.avatar}>
                {item.artwork ? (
                    <Image
                        source={{ uri: item.artwork }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor(item.name) }]}>
                        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                    </View>
                )}
            </View>

            {/* Info */}
            <View style={styles.artistInfo}>
                <Text style={[styles.artistName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={[styles.artistMeta, { color: colors.textSecondary }]}>
                    {item.albumCount || 0} album{(item.albumCount || 0) !== 1 ? 's' : ''} • {item.trackCount || 0} song{(item.trackCount || 0) !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Chevron */}
            <Icon name="chevron-right" size={24} color={colors.textTertiary} />
        </TouchableOpacity>
    );

    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            {/* Header bar */}
            <View style={styles.headerBar}>
                <Text style={styles.artistCount}>{filteredAndSortedArtists.length} artists</Text>
                <TouchableOpacity
                    style={styles.sortButton}
                    onPress={() => {
                        const options: SortOption[] = ['name', 'albumCount', 'trackCount'];
                        const currentIndex = options.indexOf(sortBy);
                        const nextIndex = (currentIndex + 1) % options.length;
                        setSortBy(options[nextIndex]);
                    }}
                >
                    <Icon name="sort" size={20} color={colors.textSecondary} />
                    <Text style={styles.sortLabel}>
                        {sortBy === 'albumCount' ? 'albums' : sortBy === 'trackCount' ? 'songs' : sortBy}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Artist list */}
            <FlatList
                ref={flatListRef}
                data={filteredAndSortedArtists}
                keyExtractor={item => item.id}
                renderItem={renderArtistItem}
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
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                    }, 500);
                }}
                ListEmptyComponent={
                    <EmptyState
                        icon="account-music"
                        title={searchQuery ? 'No artists found' : 'No artists yet'}
                        subtitle={!searchQuery ? 'Scan your music library to find artists' : undefined}
                    />
                }
            />

            {/* Alphabet scroller */}
            {filteredAndSortedArtists.length > 20 && sortBy === 'name' && (
                <AlphabetScroller
                    onLetterChange={handleLetterChange}
                    activeLetters={activeLetters}
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
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    artistCount: {
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
        marginLeft: spacing.xs,
        textTransform: 'capitalize',
    },
    listContent: {
        paddingBottom: 120,
    },
    artistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold as any,
        color: '#FFF',
    },
    artistInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    artistName: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
    },
    artistMeta: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
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

export default ArtistsScreen;
