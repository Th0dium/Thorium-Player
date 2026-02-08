/**
 * Track Actions Modal
 * Shows a menu of actions for a selected track
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Track } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useQueueStore } from '@/store/queueStore';
import { spacing, typography } from '@/constants/theme';
import { AddToPlaylistModal } from './AddToPlaylistModal';

interface TrackActionsModalProps {
    visible: boolean;
    track: Track | null;
    onClose: () => void;
    onAddToQueue?: (track: Track) => void;
    onPlayNext?: (track: Track) => void;
    onAddToPlaylist?: (track: Track) => void;
    onRemove?: (track: Track) => void;
    onViewArtist?: (track: Track) => void;
    onViewAlbum?: (track: Track) => void;
    showRemove?: boolean;
}

export const TrackActionsModal: React.FC<TrackActionsModalProps> = ({
    visible,
    track,
    onClose,
    onAddToQueue,
    onPlayNext,
    onAddToPlaylist,
    onRemove,
    onViewArtist,
    onViewAlbum,
    showRemove = false,
}) => {
    const { colors } = useTheme();
    const addToQueue = useQueueStore(state => state.addToQueue);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);

    if (!track) return null;

    const handleAddToQueue = () => {
        onAddToQueue?.(track) || addToQueue([track]);
        onClose();
    };

    const handlePlayNext = () => {
        onPlayNext?.(track);
        onClose();
    };

    const handleAddToPlaylist = () => {
        setShowPlaylistModal(true);
    };

    const handleClosePlaylistModal = () => {
        setShowPlaylistModal(false);
        onClose(); // Also close the main modal
    };

    const handleRemove = () => {
        onRemove?.(track);
        onClose();
    };

    const handleViewArtist = () => {
        onViewArtist?.(track);
        onClose();
    };

    const handleViewAlbum = () => {
        onViewAlbum?.(track);
        onClose();
    };

    // If playlist modal is showing, only render that modal
    if (showPlaylistModal) {
        return (
            <AddToPlaylistModal
                visible={true}
                track={track}
                onClose={handleClosePlaylistModal}
            />
        );
    }

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                style={[styles.overlay, { backgroundColor: colors.background + 'CC' }]}
                onPress={onClose}
            >
                <SafeAreaView style={styles.container}>
                    <View style={[styles.modal, { backgroundColor: colors.surface }]}>
                        {/* Track Info Header */}
                        <View style={styles.header}>
                            <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
                                {track.title}
                            </Text>
                            <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                                {track.artist}
                            </Text>
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        {/* Actions */}
                        <View style={styles.actions}>
                            {/* Add to Queue */}
                            <TouchableOpacity
                                style={[styles.action, { borderBottomColor: colors.border }]}
                                onPress={handleAddToQueue}
                            >
                                <Icon name="plus-circle-outline" size={22} color={colors.primary} />
                                <Text style={[styles.actionText, { color: colors.text }]}>Add to Queue</Text>
                            </TouchableOpacity>

                            {/* Play Next */}
                            <TouchableOpacity
                                style={[styles.action, { borderBottomColor: colors.border }]}
                                onPress={handlePlayNext}
                            >
                                <Icon name="fast-forward-10" size={22} color={colors.primary} />
                                <Text style={[styles.actionText, { color: colors.text }]}>Play Next</Text>
                            </TouchableOpacity>

                            {/* Add to Playlist */}
                            <TouchableOpacity
                                style={[styles.action, { borderBottomColor: colors.border }]}
                                onPress={handleAddToPlaylist}
                            >
                                <Icon name="playlist-plus" size={22} color={colors.primary} />
                                <Text style={[styles.actionText, { color: colors.text }]}>Add to Playlist</Text>
                            </TouchableOpacity>

                            {/* View Artist */}
                            {track.artist && track.artist !== 'Unknown Artist' && (
                                <TouchableOpacity
                                    style={[styles.action, { borderBottomColor: colors.border }]}
                                    onPress={handleViewArtist}
                                >
                                    <Icon name="account-music-outline" size={22} color={colors.primary} />
                                    <Text style={[styles.actionText, { color: colors.text }]}>View Artist</Text>
                                </TouchableOpacity>
                            )}

                            {/* View Album */}
                            {track.album && track.album !== 'Unknown Album' && (
                                <TouchableOpacity
                                    style={[styles.action, { borderBottomColor: colors.border }]}
                                    onPress={handleViewAlbum}
                                >
                                    <Icon name="album" size={22} color={colors.primary} />
                                    <Text style={[styles.actionText, { color: colors.text }]}>View Album</Text>
                                </TouchableOpacity>
                            )}

                            {/* Remove */}
                            {showRemove && (
                                <TouchableOpacity
                                    style={[styles.action, styles.actionDanger]}
                                    onPress={handleRemove}
                                >
                                    <Icon name="trash-can-outline" size={22} color={colors.error} />
                                    <Text style={[styles.actionText, { color: colors.error }]}>Remove</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            style={[styles.cancelButton, { backgroundColor: colors.backgroundTertiary }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modal: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: spacing.lg,
        maxHeight: '80%',
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    trackTitle: {
        fontSize: typography.sizes.md,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    trackArtist: {
        fontSize: typography.sizes.sm,
    },
    divider: {
        height: 1,
        marginVertical: spacing.md,
    },
    actions: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingRight: spacing.md,
        borderBottomWidth: 1,
        gap: spacing.md,
    },
    actionDanger: {
        borderBottomWidth: 0,
    },
    actionText: {
        fontSize: typography.sizes.md,
        fontWeight: '500',
        flex: 1,
    },
    cancelButton: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: typography.sizes.md,
        fontWeight: '600',
    },
});
