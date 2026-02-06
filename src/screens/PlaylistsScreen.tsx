// Playlists Screen - User playlist management
// Create, edit, reorder playlists with Musicolet-style UI
import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EmptyState from '@/components/EmptyState';
import { useLibraryStore } from '@/store/libraryStore';
import { useQueueStore } from '@/store/queueStore';
import { useTheme } from '@/context/ThemeContext';
import { Playlist } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface PlaylistsScreenProps {
    searchQuery?: string;
    onPlaylistPress?: (playlist: Playlist) => void;
}

const PlaylistsScreen: React.FC<PlaylistsScreenProps> = ({ searchQuery = '', onPlaylistPress }) => {
    const { colors } = useTheme();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const playlists = useLibraryStore(state => state.playlists);
    const createPlaylist = useLibraryStore(state => state.createPlaylist);
    const deletePlaylist = useLibraryStore(state => state.deletePlaylist);
    const createQueue = useQueueStore(state => state.createQueue);

    // Filter playlists
    const filteredPlaylists = searchQuery.trim()
        ? playlists.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : playlists;

    const handleCreatePlaylist = useCallback(async () => {
        if (!newPlaylistName.trim()) {
            Alert.alert('Error', 'Please enter a playlist name');
            return;
        }

        await createPlaylist(newPlaylistName.trim());
        setNewPlaylistName('');
        setShowCreateModal(false);
    }, [newPlaylistName, createPlaylist]);

    const handleDeletePlaylist = useCallback((playlist: Playlist) => {
        Alert.alert(
            'Delete Playlist',
            `Are you sure you want to delete "${playlist.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deletePlaylist(playlist.id),
                },
            ]
        );
    }, [deletePlaylist]);

    const handlePlayPlaylist = useCallback(async (playlist: Playlist) => {
        if (playlist.tracks && playlist.tracks.length > 0) {
            await createQueue(playlist.tracks, {
                type: 'playlist',
                id: playlist.id,
                name: playlist.name,
            }, 0);
        }
    }, [createQueue]);

    const handlePlaylistPress = useCallback((playlist: Playlist) => {
        if (onPlaylistPress) {
            onPlaylistPress(playlist);
        }
    }, [onPlaylistPress]);

    const getPlaylistGradient = (index: number) => {
        const gradients = [
            ['#FF6B6B', '#FF8E53'],
            ['#4ECDC4', '#45B7D1'],
            ['#A18CD1', '#FBC2EB'],
            ['#667eea', '#764ba2'],
            ['#f093fb', '#f5576c'],
            ['#4facfe', '#00f2fe'],
        ];
        return gradients[index % gradients.length];
    };

    const renderPlaylistItem = ({ item, index }: { item: Playlist; index: number }) => {
        const gradient = getPlaylistGradient(index);

        return (
            <TouchableOpacity
                style={[styles.playlistItem, { borderBottomColor: colors.border }]}
                onPress={() => handlePlaylistPress(item)}
                onLongPress={() => handleDeletePlaylist(item)}
                activeOpacity={0.7}
            >
                {/* Playlist cover */}
                <View style={styles.playlistCover}>
                    {item.artwork ? (
                        <Image
                            source={{ uri: item.artwork }}
                            style={styles.coverImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.coverPlaceholder, { backgroundColor: gradient[0] }]}>
                            <Icon name="playlist-music" size={28} color="#FFF" />
                        </View>
                    )}
                </View>

                {/* Info */}
                <View style={styles.playlistInfo}>
                    <Text style={[styles.playlistName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={[styles.playlistMeta, { color: colors.textSecondary }]}>
                        {item.trackCount || 0} song{(item.trackCount || 0) !== 1 ? 's' : ''}
                    </Text>
                </View>

                {/* Actions */}
                <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handlePlayPlaylist(item)}
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
                <Text style={styles.playlistCount}>{filteredPlaylists.length} playlists</Text>
                <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Icon name="plus" size={20} color="#FFF" />
                    <Text style={styles.createButtonText}>New</Text>
                </TouchableOpacity>
            </View>

            {/* Playlist list */}
            <FlatList
                data={filteredPlaylists}
                keyExtractor={item => item.id}
                renderItem={renderPlaylistItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <EmptyState
                        icon="playlist-music"
                        title={searchQuery ? 'No playlists found' : 'No playlists yet'}
                        subtitle="Create a playlist to organize your music"
                        actionLabel="Create Playlist"
                        actionIcon="plus"
                        onAction={() => setShowCreateModal(true)}
                    />
                }
            />

            {/* Create playlist modal */}
            <Modal
                visible={showCreateModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            Create Playlist
                        </Text>
                        <TextInput
                            style={[styles.modalInput, {
                                backgroundColor: colors.background,
                                color: colors.textPrimary,
                                borderColor: colors.border,
                            }]}
                            placeholder="Playlist name"
                            placeholderTextColor={colors.textTertiary}
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.surfaceVariant }]}
                                onPress={() => {
                                    setNewPlaylistName('');
                                    setShowCreateModal(false);
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleCreatePlaylist}
                            >
                                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>
                                    Create
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    playlistCount: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.round,
    },
    createButtonText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium as any,
        color: '#FFF',
        marginLeft: spacing.xs,
    },
    listContent: {
        paddingBottom: 120,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    playlistCover: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playlistInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    playlistName: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
    },
    playlistMeta: {
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
        marginBottom: spacing.lg,
    },
    emptyCreateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.round,
    },
    emptyCreateButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
        color: '#FFF',
        marginLeft: spacing.sm,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        width: '100%',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    modalTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold as any,
        marginBottom: spacing.lg,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.sizes.md,
        marginBottom: spacing.lg,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    modalButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        marginLeft: spacing.sm,
    },
    modalButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
    },
});

export default PlaylistsScreen;
