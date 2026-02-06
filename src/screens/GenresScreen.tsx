// Genres Screen - Browse music by genre tags
import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EmptyState from '@/components/EmptyState';
import { useLibraryStore } from '@/store/libraryStore';
import { useQueueStore } from '@/store/queueStore';
import { useTheme } from '@/context/ThemeContext';
import { Genre } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface GenresScreenProps {
    searchQuery?: string;
    onGenrePress?: (genre: Genre) => void;
    onPlay?: () => void;
}

const GenresScreen: React.FC<GenresScreenProps> = ({ searchQuery = '', onGenrePress, onPlay }) => {
    const { colors } = useTheme();

    const genres = useLibraryStore(state => state.genres);
    const isScanning = useLibraryStore(state => state.isScanning);
    const scanForMusic = useLibraryStore(state => state.scanForMusic);
    const createQueue = useQueueStore(state => state.createQueue);

    // Filter genres
    const filteredGenres = useMemo(() => {
        if (!searchQuery.trim()) return genres;
        const query = searchQuery.toLowerCase();
        return genres.filter(genre => genre.name.toLowerCase().includes(query));
    }, [genres, searchQuery]);

    const handleRefresh = useCallback(async () => {
        await scanForMusic();
    }, [scanForMusic]);

    const handleGenrePress = useCallback((genre: Genre) => {
        if (onGenrePress) {
            onGenrePress(genre);
        }
    }, [onGenrePress]);

    const handlePlayGenre = useCallback(async (genre: Genre) => {
        if (genre.tracks && genre.tracks.length > 0) {
            await createQueue(genre.tracks, {
                type: 'genre',
                name: genre.name,
            }, 0);
            onPlay?.();
        }
    }, [createQueue, onPlay]);

    // Genre icon mapping
    const getGenreIcon = (name: string): string => {
        const lower = name.toLowerCase();
        if (lower.includes('rock')) return 'guitar-electric';
        if (lower.includes('pop')) return 'star';
        if (lower.includes('jazz')) return 'saxophone';
        if (lower.includes('classical')) return 'violin';
        if (lower.includes('hip') || lower.includes('rap')) return 'microphone-variant';
        if (lower.includes('electronic') || lower.includes('edm')) return 'sine-wave';
        if (lower.includes('country')) return 'guitar-acoustic';
        if (lower.includes('r&b') || lower.includes('soul')) return 'heart-pulse';
        if (lower.includes('metal')) return 'lightning-bolt';
        if (lower.includes('folk')) return 'music-clef-treble';
        if (lower.includes('blues')) return 'piano';
        if (lower.includes('indie')) return 'flower';
        if (lower.includes('dance')) return 'human-female-dance';
        if (lower.includes('ambient')) return 'cloud';
        return 'music-circle';
    };

    // Genre color based on name
    const getGenreColor = (name: string): string => {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
        ];
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const renderGenreItem = ({ item }: { item: Genre }) => {
        const genreColor = getGenreColor(item.name);

        return (
            <TouchableOpacity
                style={[styles.genreItem, { borderBottomColor: colors.border }]}
                onPress={() => handleGenrePress(item)}
                activeOpacity={0.7}
            >
                {/* Genre icon */}
                <View style={[styles.genreIcon, { backgroundColor: genreColor + '20' }]}>
                    <Icon name={getGenreIcon(item.name)} size={28} color={genreColor} />
                </View>

                {/* Info */}
                <View style={styles.genreInfo}>
                    <Text style={[styles.genreName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={[styles.genreMeta, { color: colors.textSecondary }]}>
                        {item.trackCount || 0} song{(item.trackCount || 0) !== 1 ? 's' : ''}
                    </Text>
                </View>

                {/* Play button */}
                <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handlePlayGenre(item)}
                    disabled={!item.tracks || item.tracks.length === 0}
                >
                    <Icon
                        name="play-circle"
                        size={36}
                        color={item.tracks && item.tracks.length > 0 ? colors.primary : colors.textDisabled}
                    />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.genreCount}>{filteredGenres.length} genres</Text>
            </View>

            {/* Genre list */}
            <FlatList
                data={filteredGenres}
                keyExtractor={item => item.id}
                renderItem={renderGenreItem}
                refreshControl={
                    <RefreshControl
                        refreshing={isScanning}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <EmptyState
                        icon="music-circle"
                        title={searchQuery ? 'No genres found' : 'No genres yet'}
                        subtitle="Genre tags are read from your music file metadata"
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    genreCount: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    listContent: {
        paddingBottom: 120,
    },
    genreItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    genreIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    genreInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    genreName: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
    },
    genreMeta: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    playButton: {
        padding: spacing.sm,
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
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
});

export default GenresScreen;
