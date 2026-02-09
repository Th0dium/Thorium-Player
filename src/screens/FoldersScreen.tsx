// Folders Screen - File system folder navigation (Musicolet-style)
// Hierarchical folder browsing with path breadcrumbs
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
import { usePlayerStore } from '@/store/playerStore';
import { useTheme } from '@/context/ThemeContext';
import { useUniversalSelection } from '@/hooks/useUniversalSelection';
import { Folder, Track } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import TrackListItem from '@/components/TrackListItem';
import SelectionToolbar from '@/components/SelectionToolbar';
import { TrackActionsModal } from '@/components/TrackActionsModal';

interface FoldersScreenProps {
    searchQuery?: string;
    onPlay?: () => void;
}

interface FolderItem {
    type: 'folder' | 'track';
    data: Folder | Track;
}

const FoldersScreen: React.FC<FoldersScreenProps> = ({ searchQuery = '', onPlay }) => {
    const { colors } = useTheme();
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [showTrackActions, setShowTrackActions] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

    // Track selection state
    const selection = useUniversalSelection();

    // Extract only the selection state values we need to trigger re-renders
    const selectionState = useMemo(() => ({
        isSelectionMode: selection.isSelectionMode,
        selectedTracks: selection.selectedTracks,
    }), [selection.isSelectionMode, selection.selectedTracks]);

    const folders = useLibraryStore(state => state.folders);
    const tracks = useLibraryStore(state => state.tracks);
    const isScanning = useLibraryStore(state => state.isScanning);
    const scanForMusic = useLibraryStore(state => state.scanForMusic);
    const createQueue = useQueueStore(state => state.createQueue);
    const addToQueue = useQueueStore(state => state.addToQueue);
    const currentTrack = usePlayerStore(state => state.currentTrack);
    const isPlaying = usePlayerStore(state => state.isPlaying);

    // Get current folder contents
    const currentContents = useMemo(() => {
        const items: FolderItem[] = [];

        // Get subfolders for current path
        const currentPathStr = currentPath.join('/');

        folders.forEach(folder => {
            // Check if folder is a direct child of current path
            const folderPath = folder.path || '';
            const relativePath = currentPathStr ? folderPath.replace(currentPathStr + '/', '') : folderPath;

            if (!currentPathStr && !folderPath.includes('/')) {
                // Root level folder
                items.push({ type: 'folder', data: folder });
            } else if (currentPathStr && folderPath.startsWith(currentPathStr + '/') && !relativePath.includes('/')) {
                // Direct child folder
                items.push({ type: 'folder', data: folder });
            }
        });

        // Get tracks in current folder
        tracks.forEach(track => {
            const trackPath = track.url || track.path || '';
            const trackDir = trackPath.substring(0, trackPath.lastIndexOf('/'));

            if (trackDir === currentPathStr || (!currentPathStr && !trackDir.includes('/'))) {
                items.push({ type: 'track', data: track });
            }
        });

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return items.filter(item => {
                if (item.type === 'folder') {
                    return (item.data as Folder).name.toLowerCase().includes(query);
                } else {
                    const track = item.data as Track;
                    return track.title.toLowerCase().includes(query) ||
                        track.artist?.toLowerCase().includes(query);
                }
            });
        }

        // Sort: folders first, then tracks
        return items.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            if (a.type === 'folder') {
                return (a.data as Folder).name.localeCompare((b.data as Folder).name);
            }
            return (a.data as Track).title.localeCompare((b.data as Track).title);
        });
    }, [folders, tracks, currentPath, searchQuery]);

    // Get tracks only for queue creation
    const tracksInCurrentFolder = useMemo(() => {
        return currentContents
            .filter(item => item.type === 'track')
            .map(item => item.data as Track);
    }, [currentContents]);

    const handleRefresh = useCallback(async () => {
        await scanForMusic();
    }, [scanForMusic]);

    const handleFolderPress = useCallback((folder: Folder) => {
        setCurrentPath(prev => [...prev, folder.name]);
    }, []);

    const handleTrackPress = useCallback(async (track: Track, index: number) => {
        // If in selection mode, toggle selection instead of playing
        if (selection.isSelectionMode) {
            selection.toggleTrack(track.id);
            return;
        }

        // Find index within tracks only
        const trackIndex = tracksInCurrentFolder.findIndex(t => t.id === track.id);
        await createQueue(tracksInCurrentFolder, {
            type: 'folder',
            name: currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'Root',
        }, trackIndex);
        onPlay?.();
    }, [tracksInCurrentFolder, currentPath, createQueue, onPlay, selection]);

    const handleTrackLongPress = useCallback((track: Track) => {
        // Only enter selection mode on long-press if NOT already in selection mode
        if (!selection.isSelectionMode) {
            selection.enterSelectionMode(track);
        }
    }, [selection]);

    const handleDeleteSelectedTracks = useCallback(async (tracks: Track[]) => {
        // For FoldersScreen, we just need to notify or remove from queue if needed
        // Actual deletion of files would require additional permissions
        // For now, just close selection mode
    }, []);

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

    const handleBackPress = useCallback(() => {
        setCurrentPath(prev => prev.slice(0, -1));
    }, []);

    const handleBreadcrumbPress = useCallback((index: number) => {
        setCurrentPath(prev => prev.slice(0, index));
    }, []);

    const handlePlayAll = useCallback(async () => {
        if (tracksInCurrentFolder.length > 0) {
            await createQueue(tracksInCurrentFolder, {
                type: 'folder',
                name: currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'All Folders',
            }, 0);
            onPlay?.();
        }
    }, [tracksInCurrentFolder, currentPath, createQueue, onPlay]);

    const handleShuffleAll = useCallback(async () => {
        if (tracksInCurrentFolder.length > 0) {
            const shuffled = [...tracksInCurrentFolder].sort(() => Math.random() - 0.5);
            await createQueue(shuffled, {
                type: 'folder',
                name: currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'All Folders',
            }, 0);
            onPlay?.();
        }
    }, [tracksInCurrentFolder, currentPath, createQueue, onPlay]);

    const renderItem = useCallback(({ item, index }: { item: FolderItem; index: number }) => {
        if (item.type === 'folder') {
            const folder = item.data as Folder;
            return (
                <TouchableOpacity
                    style={[styles.folderItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleFolderPress(folder)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.folderIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Icon name="folder-music" size={28} color={colors.primary} />
                    </View>
                    <View style={styles.folderInfo}>
                        <Text style={[styles.folderName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {folder.name}
                        </Text>
                        <Text style={[styles.folderMeta, { color: colors.textSecondary }]}>
                            {folder.trackCount || 0} songs
                        </Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={colors.textTertiary} />
                </TouchableOpacity>
            );
        } else {
            const track = item.data as Track;
            return (
                <TrackListItem
                    track={track}
                    isPlaying={currentTrack?.id === track.id && isPlaying}
                    isSelected={selectionState.selectedTracks.has(track.id)}
                    showSelection={selectionState.isSelectionMode}
                    onPress={() => handleTrackPress(track, index)}
                    onLongPress={() => handleTrackLongPress(track)}
                    onMorePress={handleMorePress}
                />
            );
        }
    }, [styles, colors, handleFolderPress, currentTrack, isPlaying, selectionState, handleTrackPress, handleTrackLongPress, handleMorePress]);

    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            {/* Breadcrumb navigation */}
            {currentPath.length > 0 && (
                <View style={styles.breadcrumbContainer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBackPress}
                    >
                        <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.breadcrumb}
                        onPress={() => handleBreadcrumbPress(0)}
                    >
                        <Icon name="home" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {currentPath.map((segment, index) => (
                        <React.Fragment key={index}>
                            <Icon name="chevron-right" size={16} color={colors.textTertiary} />
                            <TouchableOpacity
                                style={styles.breadcrumb}
                                onPress={() => handleBreadcrumbPress(index + 1)}
                            >
                                <Text
                                    style={[
                                        styles.breadcrumbText,
                                        { color: index === currentPath.length - 1 ? colors.primary : colors.textSecondary }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {segment}
                                </Text>
                            </TouchableOpacity>
                        </React.Fragment>
                    ))}
                </View>
            )}

            {/* Action bar - Always visible */}
            <View style={styles.actionBar}>
                <Text style={styles.itemCount}>
                    {currentContents.filter(i => i.type === 'folder').length} folders • {tracksInCurrentFolder.length} songs
                </Text>
                {tracksInCurrentFolder.length > 0 && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton} onPress={handlePlayAll}>
                            <Icon name="play" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={handleShuffleAll}>
                            <Icon name="shuffle" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Content list */}
            <FlatList
                data={currentContents}
                keyExtractor={(item, index) =>
                    item.type === 'folder'
                        ? `folder-${(item.data as Folder).id}`
                        : `track-${(item.data as Track).id}`
                }
                renderItem={renderItem}
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
                        icon="folder-open"
                        title={searchQuery ? 'No items found' : 'Folder is empty'}
                        subtitle={!searchQuery && currentPath.length === 0 ? 'Scan your device to find music folders' : undefined}
                    />
                }
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
                    totalCount={tracksInCurrentFolder.length}
                    onClose={selection.exitSelectionMode}
                    onSelectAll={() => selection.selectAll(tracksInCurrentFolder)}
                    onDeselectAll={selection.deselectAll}
                    onInvertSelection={handleInvertSelection}
                    onSelectRange={handleSelectRange}
                    getSelectedTracks={() => selection.getSelectedTracks(tracksInCurrentFolder)}
                    getAllTrackIds={() => tracksInCurrentFolder.map(t => t.id)}
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
    breadcrumbContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.xs,
        marginRight: spacing.sm,
    },
    breadcrumb: {
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xs,
        maxWidth: 100,
    },
    breadcrumbText: {
        fontSize: typography.sizes.sm,
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    itemCount: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: spacing.sm,
        marginLeft: spacing.xs,
    },
    listContent: {
        paddingBottom: 120,
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    folderIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    folderInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    folderName: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
    },
    folderMeta: {
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
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
});

export default FoldersScreen;
