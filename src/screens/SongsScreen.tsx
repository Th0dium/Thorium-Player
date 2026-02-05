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
    Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLibraryStore } from '@/store/libraryStore';
import { useQueueStore } from '@/store/queueStore';
import { usePlayerStore } from '@/store/playerStore';
import TrackListItem from '@/components/TrackListItem';
import AlphabetScroller from '@/components/AlphabetScroller';
import { useTheme } from '@/context/ThemeContext';
import { Track } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

type SortOption = 'title' | 'artist' | 'album' | 'dateAdded' | 'duration';

interface SongsScreenProps {
    searchQuery?: string;
}

const SongsScreen: React.FC<SongsScreenProps> = ({ searchQuery = '' }) => {
    const { colors } = useTheme();
    const flatListRef = useRef<FlatList>(null);
    const [sortBy, setSortBy] = useState<SortOption>('title');
    const [sortAsc, setSortAsc] = useState(true);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const {
        tracks,
        isLoading,
        isScanning,
        loadLibrary,
        scanForMusic,
    } = useLibraryStore();

    const { createQueue, addToQueue } = useQueueStore();
    const { currentTrack, isPlaying } = usePlayerStore();

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

        // Sort tracks
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'title':
                    comparison = (a.title || '').localeCompare(b.title || '');
                    break;
                case 'artist':
                    comparison = (a.artist || '').localeCompare(b.artist || '');
                    break;
                case 'album':
                    comparison = (a.album || '').localeCompare(b.album || '');
                    break;
                case 'duration':
                    comparison = (a.duration || 0) - (b.duration || 0);
                    break;
                case 'dateAdded':
                    comparison = (a.dateAdded || 0) - (b.dateAdded || 0);
                    break;
            }
            return sortAsc ? comparison : -comparison;
        });

        return result;
    }, [tracks, searchQuery, sortBy, sortAsc]);

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
        if (isSelectionMode) {
            toggleTrackSelection(track.id);
            return;
        }

        await createQueue(filteredAndSortedTracks, {
            type: 'all',
            name: searchQuery ? 'Search Results' : 'All Songs',
        }, index);
    }, [filteredAndSortedTracks, isSelectionMode, searchQuery, createQueue]);

    const handleTrackLongPress = useCallback((track: Track) => {
        setIsSelectionMode(true);
        setSelectedTracks(new Set([track.id]));
    }, []);

    const toggleTrackSelection = useCallback((trackId: string) => {
        setSelectedTracks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(trackId)) {
                newSet.delete(trackId);
            } else {
                newSet.add(trackId);
            }
            if (newSet.size === 0) {
                setIsSelectionMode(false);
            }
            return newSet;
        });
    }, []);

    const exitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedTracks(new Set());
    }, []);

    const selectAll = useCallback(() => {
        setSelectedTracks(new Set(filteredAndSortedTracks.map(t => t.id)));
    }, [filteredAndSortedTracks]);

    const handleRefresh = useCallback(async () => {
        await scanForMusic();
    }, [scanForMusic]);

    const handleAddSelectedToQueue = useCallback(async () => {
        const selectedTrackList = filteredAndSortedTracks.filter(t => selectedTracks.has(t.id));
        for (const track of selectedTrackList) {
            await addToQueue(track);
        }
        exitSelectionMode();
    }, [filteredAndSortedTracks, selectedTracks, addToQueue, exitSelectionMode]);

    const sortOptions: { key: SortOption; label: string; icon: string }[] = [
        { key: 'title', label: 'Title', icon: 'sort-alphabetical-ascending' },
        { key: 'artist', label: 'Artist', icon: 'account-music' },
        { key: 'album', label: 'Album', icon: 'album' },
        { key: 'duration', label: 'Duration', icon: 'timer' },
        { key: 'dateAdded', label: 'Date Added', icon: 'calendar' },
    ];

    const styles = createStyles(colors);

    return (
        <View style={styles.container}>
            {/* Selection header */}
            {isSelectionMode && (
                <View style={styles.selectionHeader}>
                    <TouchableOpacity onPress={exitSelectionMode} style={styles.selectionButton}>
                        <Icon name="close" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.selectionCount}>{selectedTracks.size} selected</Text>
                    <TouchableOpacity onPress={selectAll} style={styles.selectionButton}>
                        <Icon name="select-all" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddSelectedToQueue} style={styles.selectionButton}>
                        <Icon name="playlist-plus" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Sort bar */}
            {!isSelectionMode && (
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
            )}

            {/* Sort menu dropdown */}
            {showSortMenu && (
                <View style={styles.sortMenu}>
                    {sortOptions.map(option => (
                        <TouchableOpacity
                            key={option.key}
                            style={[
                                styles.sortOption,
                                sortBy === option.key && { backgroundColor: colors.primary + '20' }
                            ]}
                            onPress={() => {
                                if (sortBy === option.key) {
                                    setSortAsc(!sortAsc);
                                } else {
                                    setSortBy(option.key);
                                    setSortAsc(true);
                                }
                                setShowSortMenu(false);
                            }}
                        >
                            <Icon
                                name={option.icon}
                                size={20}
                                color={sortBy === option.key ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[
                                styles.sortOptionText,
                                sortBy === option.key && { color: colors.primary }
                            ]}>
                                {option.label}
                            </Text>
                            {sortBy === option.key && (
                                <Icon
                                    name={sortAsc ? 'arrow-up' : 'arrow-down'}
                                    size={16}
                                    color={colors.primary}
                                />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Track list */}
            <FlatList
                ref={flatListRef}
                data={filteredAndSortedTracks}
                keyExtractor={item => item.id}
                renderItem={({ item, index }) => (
                    <TrackListItem
                        track={item}
                        isPlaying={currentTrack?.id === item.id && isPlaying}
                        isSelected={selectedTracks.has(item.id)}
                        showSelection={isSelectionMode}
                        onPress={() => handleTrackPress(item, index)}
                        onLongPress={() => handleTrackLongPress(item)}
                        onMenuPress={() => {
                            // Show track options modal
                        }}
                    />
                )}
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
                    <View style={styles.emptyContainer}>
                        <Icon name="music-note-off" size={64} color={colors.textTertiary} />
                        <Text style={styles.emptyTitle}>
                            {isLoading ? 'Loading...' : searchQuery ? 'No songs found' : 'No music yet'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {!isLoading && !searchQuery && 'Pull down to scan for music'}
                        </Text>
                    </View>
                }
            />

            {/* Alphabet scroller */}
            {filteredAndSortedTracks.length > 20 && !isSelectionMode && (
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
    sortMenu: {
        position: 'absolute',
        top: 100,
        right: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.xs,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 1000,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        minWidth: 160,
    },
    sortOptionText: {
        flex: 1,
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
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
