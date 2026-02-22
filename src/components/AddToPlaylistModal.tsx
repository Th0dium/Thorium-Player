/**
 * Add to Playlist Modal
 * Centered modal for managing playlist membership
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    Alert,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Track, Playlist } from '@/store/types';
import { useTheme } from '@/context/ThemeContext';
import { useLibraryStore } from '@/store/libraryStore';
import { spacing, typography } from '@/constants/theme';

interface AddToPlaylistModalProps {
    visible: boolean;
    track: Track | null;
    onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
    visible,
    track,
    onClose,
}) => {
    const { colors } = useTheme();
    const playlists = useLibraryStore(state => state.playlists);
    const addToPlaylist = useLibraryStore(state => state.addToPlaylist);
    const removeFromPlaylist = useLibraryStore(state => state.removeFromPlaylist);
    const createPlaylist = useLibraryStore(state => state.createPlaylist);

    const [showCreateNew, setShowCreateNew] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Get playlists that contain this track
    const playlistsWithTrack = useMemo(() => {
        if (!track) return new Set<string>();
        return new Set(
            playlists
                .filter(p => p.trackIds.includes(track.id))
                .map(p => p.id)
        );
    }, [playlists, track]);

    const handleTogglePlaylist = useCallback(async (playlist: Playlist) => {
        if (!track) return;

        const isInPlaylist = playlistsWithTrack.has(playlist.id);

        try {
            if (isInPlaylist) {
                await removeFromPlaylist(playlist.id, track.id);
            } else {
                await addToPlaylist(playlist.id, [track.id]);
            }
        } catch (error) {
            console.error('Error toggling playlist:', error);
            Alert.alert('Error', 'Failed to update playlist');
        }
    }, [track, playlistsWithTrack, addToPlaylist, removeFromPlaylist]);

    const handleCreateNewPlaylist = useCallback(async () => {
        if (!track || !newPlaylistName.trim()) {
            Alert.alert('Error', 'Please enter a playlist name');
            return;
        }

        setIsCreating(true);
        try {
            await createPlaylist(newPlaylistName.trim(), [track.id]);
            setNewPlaylistName('');
            setShowCreateNew(false);
        } catch (error) {
            console.error('Error creating playlist:', error);
            Alert.alert('Error', 'Failed to create playlist');
        } finally {
            setIsCreating(false);
        }
    }, [track, newPlaylistName, createPlaylist]);

    const renderPlaylistItem = useCallback(({ item: playlist }: { item: Playlist }) => {
        const isChecked = playlistsWithTrack.has(playlist.id);

        return (
            <TouchableOpacity
                style={[styles.playlistItem, { borderBottomColor: colors.border }]}
                onPress={() => handleTogglePlaylist(playlist)}
                activeOpacity={0.7}
            >
                <View style={styles.playlistInfo}>
                    <Icon name="playlist-music" size={20} color={colors.primary} />
                    <View style={styles.playlistText}>
                        <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>
                            {playlist.name}
                        </Text>
                        <Text style={[styles.playlistCount, { color: colors.textSecondary }]}>
                            {playlist.trackCount || playlist.trackIds.length} songs
                        </Text>
                    </View>
                </View>
                <View style={[
                    styles.checkbox,
                    { borderColor: isChecked ? colors.primary : colors.border },
                    isChecked && { backgroundColor: colors.primary }
                ]}>
                    {isChecked && (
                        <Icon name="check" size={16} color="#FFF" />
                    )}
                </View>
            </TouchableOpacity>
        );
    }, [playlistsWithTrack, colors, handleTogglePlaylist]);

    const keyExtractor = useCallback((item: Playlist) => item.id, []);

    if (!track) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                onPress={onClose}
            >
                <View style={styles.centeredView}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => { }}
                        style={[styles.modal, { backgroundColor: colors.surface }]}
                    >
                        {/* Header with Save Button */}
                        <View style={styles.header}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                Add to Playlist
                            </Text>
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                onPress={onClose}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Track Info */}
                        <Text style={[styles.trackInfo, { color: colors.textSecondary }]} numberOfLines={2}>
                            {track.title} • {track.artist}
                        </Text>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        {/* Content Area */}
                        {showCreateNew ? (
                            // Create New Playlist Form
                            <View style={styles.content}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                    New Playlist
                                </Text>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: colors.backgroundTertiary,
                                        color: colors.text,
                                        borderColor: colors.border
                                    }]}
                                    placeholder="Playlist name"
                                    placeholderTextColor={colors.textTertiary}
                                    value={newPlaylistName}
                                    onChangeText={setNewPlaylistName}
                                    autoFocus
                                    returnKeyType="done"
                                    onSubmitEditing={handleCreateNewPlaylist}
                                />
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
                                        onPress={() => {
                                            setShowCreateNew(false);
                                            setNewPlaylistName('');
                                        }}
                                    >
                                        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.primary }]}
                                        onPress={handleCreateNewPlaylist}
                                        disabled={isCreating || !newPlaylistName.trim()}
                                    >
                                        <Text style={styles.buttonTextPrimary}>
                                            {isCreating ? 'Creating...' : 'Create'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            // Playlist List
                            <View style={styles.content}>
                                {playlists.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Icon name="playlist-music-outline" size={40} color={colors.textTertiary} />
                                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                            No playlists yet
                                        </Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={playlists}
                                        renderItem={renderPlaylistItem}
                                        keyExtractor={keyExtractor}
                                        scrollEnabled={true}
                                        showsVerticalScrollIndicator={false}
                                    />
                                )}
                            </View>
                        )}

                        {/* Footer Buttons */}
                        {!showCreateNew && (
                            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                                <TouchableOpacity
                                    style={[styles.footerButton, { backgroundColor: colors.backgroundTertiary }]}
                                    onPress={() => setShowCreateNew(true)}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="plus" size={18} color={colors.primary} />
                                    <Text style={[styles.footerButtonText, { color: colors.primary }]}>
                                        New Playlist
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        width: '100%',
    },
    modal: {
        borderRadius: 12,
        width: '100%',
        maxWidth: 420,
        maxHeight: '70%',
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    modalTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: '600',
        flex: 1,
    },
    trackInfo: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
        fontSize: typography.sizes.sm,
        marginBottom: spacing.md,
    },
    divider: {
        height: StyleSheet.hairlineWidth * 2,
    },
    content: {
        maxHeight: 300,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    playlistInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: spacing.md,
    },
    playlistText: {
        marginLeft: spacing.md,
        flex: 1,
    },
    playlistName: {
        fontSize: typography.sizes.md,
        fontWeight: '500',
        marginBottom: 2,
    },
    playlistCount: {
        fontSize: typography.sizes.sm,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    emptyText: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: typography.sizes.md,
        fontWeight: '600',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    input: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        fontSize: typography.sizes.md,
        borderWidth: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        gap: spacing.sm,
    },
    button: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSecondary: {
        borderWidth: 1,
    },
    buttonPrimary: {
        // backgroundColor set via inline style
    },
    buttonText: {
        fontSize: typography.sizes.md,
        fontWeight: '600',
    },
    buttonTextPrimary: {
        color: '#FFF',
        fontSize: typography.sizes.md,
        fontWeight: '600',
    },
    footer: {
        borderTopWidth: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: 8,
        gap: spacing.sm,
    },
    footerButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: '600',
    },
    saveButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: typography.sizes.md,
        fontWeight: '600',
    },
});
