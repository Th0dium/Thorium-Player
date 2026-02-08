/**
 * Add to Playlist Modal
 * Shows existing playlists and allows creating a new one
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TextInput,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Playlist, Track } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useLibraryStore } from '@/store/libraryStore';
import { spacing, typography } from '@/constants/theme';

interface AddToPlaylistModalProps {
    visible: boolean;
    track: Track | null;
    onClose: () => void;
    onSuccess?: (playlist: Playlist) => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
    visible,
    track,
    onClose,
    onSuccess,
}) => {
    const { colors } = useTheme();
    const playlists = useLibraryStore(state => state.playlists);
    const createPlaylist = useLibraryStore(state => state.createPlaylist);
    const addToPlaylist = useLibraryStore(state => state.addToPlaylist);

    const [showCreateMode, setShowCreateMode] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!track) return null;

    const handleSelectPlaylist = async (playlist: Playlist) => {
        if (isLoading) return;
        
        setIsLoading(true);
        try {
            await addToPlaylist(playlist.id, [track.id]);
            Alert.alert('Success', `Added to "${playlist.name}"`);
            onSuccess?.(playlist);
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to add track to playlist');
            console.error('Error adding to playlist:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAndAdd = async () => {
        if (!newPlaylistName.trim()) {
            Alert.alert('Error', 'Please enter a playlist name');
            return;
        }

        if (isLoading) return;

        setIsLoading(true);
        try {
            const playlist = await createPlaylist(newPlaylistName.trim(), [track.id]);
            Alert.alert('Success', `Created "${playlist.name}" and added track`);
            onSuccess?.(playlist);
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to create playlist');
            console.error('Error creating playlist:', error);
        } finally {
            setIsLoading(false);
            setNewPlaylistName('');
            setShowCreateMode(false);
        }
    };

    const renderPlaylistItem = ({ item: playlist }: { item: Playlist }) => (
        <TouchableOpacity
            style={[styles.playlistItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
            onPress={() => handleSelectPlaylist(playlist)}
            disabled={isLoading}
            activeOpacity={0.7}
        >
            <Icon name="playlist-music" size={24} color={colors.primary} style={styles.playlistIcon} />
            <View style={styles.playlistInfo}>
                <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>
                    {playlist.name}
                </Text>
                <Text style={[styles.playlistCount, { color: colors.textSecondary }]}>
                    {playlist.tracks?.length || 0} tracks
                </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <TouchableOpacity 
                        onPress={onClose}
                        disabled={isLoading}
                    >
                        <Icon name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {showCreateMode ? 'Create Playlist' : 'Add to Playlist'}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                {showCreateMode ? (
                    // Create new playlist mode
                    <View style={styles.createContainer}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                            Playlist Name
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }
                            ]}
                            placeholder="Enter playlist name"
                            placeholderTextColor={colors.textTertiary}
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            editable={!isLoading}
                        />

                        <TouchableOpacity
                            style={[styles.createButton, { backgroundColor: colors.primary }]}
                            onPress={handleCreateAndAdd}
                            disabled={isLoading || !newPlaylistName.trim()}
                            activeOpacity={0.7}
                        >
                            {isLoading ? (
                                <Text style={[styles.createButtonText, { opacity: 0.6 }]}>Creating...</Text>
                            ) : (
                                <Text style={styles.createButtonText}>Create & Add</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.backButton, { backgroundColor: colors.backgroundTertiary }]}
                            onPress={() => setShowCreateMode(false)}
                            disabled={isLoading}
                        >
                            <Icon name="arrow-left" size={20} color={colors.text} />
                            <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Playlist list mode
                    <>
                        <FlatList
                            data={playlists}
                            renderItem={renderPlaylistItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={true}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Icon name="playlist-remove" size={48} color={colors.textSecondary} />
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        No playlists yet
                                    </Text>
                                </View>
                            }
                        />

                        {/* Create new playlist button */}
                        <TouchableOpacity
                            style={[styles.createNewButton, { backgroundColor: colors.primary }]}
                            onPress={() => setShowCreateMode(true)}
                            disabled={isLoading}
                        >
                            <Icon name="plus-circle" size={20} color="#FFF" />
                            <Text style={styles.createNewButtonText}>Create New Playlist</Text>
                        </TouchableOpacity>
                    </>
                )}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: '600',
    },
    listContent: {
        paddingVertical: spacing.xs,
        paddingBottom: spacing.xl,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
    },
    playlistIcon: {
        marginRight: spacing.md,
    },
    playlistInfo: {
        flex: 1,
    },
    playlistName: {
        fontSize: typography.sizes.md,
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    playlistCount: {
        fontSize: typography.sizes.sm,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontSize: typography.sizes.md,
        marginTop: spacing.md,
    },
    createNewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 8,
        gap: spacing.sm,
    },
    createNewButtonText: {
        color: '#FFF',
        fontSize: typography.sizes.md,
        fontWeight: '600',
    },
    createContainer: {
        flex: 1,
        padding: spacing.lg,
    },
    label: {
        fontSize: typography.sizes.md,
        fontWeight: '500',
        marginBottom: spacing.sm,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.sizes.md,
        marginBottom: spacing.lg,
    },
    createButton: {
        paddingVertical: spacing.md,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    createButtonText: {
        color: '#FFF',
        fontSize: typography.sizes.md,
        fontWeight: '600',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: 8,
        gap: spacing.sm,
    },
    backButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: '500',
    },
});
