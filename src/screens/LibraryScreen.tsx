// Library Screen - Musicolet-style library browser
// Shows: All songs, Favorites, Recently added, Recently played, Most played, Not played
// Plus user playlists section at bottom
import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/context/ThemeContext';
import { useLibraryStore } from '@/store/libraryStore';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface LibraryItem {
    id: string;
    title: string;
    icon: string;
    type: 'category' | 'playlist' | 'section-header';
    count?: number;
}

interface LibraryScreenProps {
    searchQuery?: string;
    isSearchActive?: boolean;
    onNavigate?: (screen: string, params?: any) => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({
    searchQuery = '',
    isSearchActive = false,
    onNavigate,
}) => {
    const { colors } = useTheme();
    const tracks = useLibraryStore(state => state.tracks);
    const playlists = useLibraryStore(state => state.playlists);
    const [playlistSearch, setPlaylistSearch] = useState('');

    // Calculate counts for each category in a single pass
    const categoryCounts = useMemo(() => {
        const now = Date.now();
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

        let favorites = 0;
        let recentlyAdded = 0;
        let recentlyPlayed = 0;
        let mostPlayed = 0;
        let notPlayed = 0;

        for (let i = 0; i < tracks.length; i++) {
            const t = tracks[i];
            if (t.isFavorite) favorites++;
            if (t.dateAdded && t.dateAdded > oneWeekAgo) recentlyAdded++;
            if (t.lastPlayed && t.lastPlayed > oneWeekAgo) recentlyPlayed++;
            if ((t.playCount || 0) >= 5) mostPlayed++;
            if (!t.playCount || t.playCount === 0) notPlayed++;
        }

        return {
            allSongs: tracks.length,
            favorites,
            recentlyAdded,
            recentlyPlayed,
            mostPlayed,
            notPlayed,
        };
    }, [tracks]);

    // Build the library items list
    const libraryItems = useMemo(() => {
        const items: LibraryItem[] = [
            // Main categories
            {
                id: 'all-songs',
                title: 'All songs',
                icon: 'music-note-outline',
                type: 'category',
                count: categoryCounts.allSongs,
            },
            {
                id: 'favorites',
                title: 'Favorites',
                icon: 'heart',
                type: 'category',
                count: categoryCounts.favorites,
            },
            {
                id: 'recently-added',
                title: 'Recently added',
                icon: 'clock-plus-outline',
                type: 'category',
                count: categoryCounts.recentlyAdded,
            },
            {
                id: 'recently-played',
                title: 'Recently played',
                icon: 'history',
                type: 'category',
                count: categoryCounts.recentlyPlayed,
            },
            {
                id: 'most-played',
                title: 'Most played',
                icon: 'fire',
                type: 'category',
                count: categoryCounts.mostPlayed,
            },
            {
                id: 'not-played',
                title: 'Not played',
                icon: 'cancel',
                type: 'category',
                count: categoryCounts.notPlayed,
            },
            // Section header for playlists
            {
                id: 'playlists-header',
                title: 'Your playlists',
                icon: '',
                type: 'section-header',
            },
            // User playlists
            ...playlists
                .filter(p => !playlistSearch || p.name.toLowerCase().includes(playlistSearch.toLowerCase()))
                .map(playlist => ({
                    id: `playlist-${playlist.id}`,
                    title: playlist.name,
                    icon: 'playlist-music',
                    type: 'playlist' as const,
                    count: playlist.trackIds?.length || 0,
                })),
        ];

        // Filter by search query if active
        if (isSearchActive && searchQuery) {
            const query = searchQuery.toLowerCase();
            return items.filter(item =>
                item.type === 'section-header' ||
                item.title.toLowerCase().includes(query)
            );
        }

        return items;
    }, [categoryCounts, playlists, searchQuery, isSearchActive, playlistSearch]);

    const handleItemPress = useCallback((item: LibraryItem) => {
        if (item.type === 'section-header') return;

        if (onNavigate) {
            onNavigate(item.id, { title: item.title });
        }
    }, [onNavigate]);

    const renderItem = useCallback(({ item }: { item: LibraryItem }) => {
        if (item.type === 'section-header') {
            return (
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>
                        {item.title}
                    </Text>
                </View>
            );
        }

        return (
            <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
                    <Icon
                        name={item.icon}
                        size={24}
                        color={item.id === 'favorites' ? colors.error : colors.textSecondary}
                    />
                </View>
                <View style={styles.itemContent}>
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }, [colors, handleItemPress]);

    const keyExtractor = useCallback((item: LibraryItem) => item.id, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={libraryItems}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    <View style={styles.searchPlaylistContainer}>
                        <View style={[styles.searchPlaylistButton, { backgroundColor: colors.surface }]}>
                            <Icon name="magnify" size={20} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchPlaylistInput, { color: colors.textPrimary }]}
                                placeholder="Search a playlist..."
                                placeholderTextColor={colors.textTertiary}
                                value={playlistSearch}
                                onChangeText={setPlaylistSearch}
                            />
                        </View>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingVertical: spacing.sm,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        minHeight: 56,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontSize: typography.sizes.md,
        fontWeight: '500',
    },
    sectionHeader: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    sectionHeaderText: {
        fontSize: typography.sizes.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    searchPlaylistContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    searchPlaylistButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    searchPlaylistInput: {
        flex: 1,
        fontSize: typography.sizes.md,
        marginLeft: spacing.sm,
        paddingVertical: spacing.sm,
    },
});

export default LibraryScreen;
