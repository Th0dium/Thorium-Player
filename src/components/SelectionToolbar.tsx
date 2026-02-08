/**
 * SelectionToolbar - Displayed when multi-select mode is active
 * Shows selection count and batch action buttons
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Modal,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { useQueueStore } from '@/store/queueStore';
import { useLibraryStore } from '@/store/libraryStore';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { Track } from '@/types';
import { spacing, typography } from '@/constants/theme';

interface SelectionToolbarProps {
    /** Number of selected items */
    selectionCount: number;
    /** Total number of items in the list */
    totalCount: number;
    /** Callback to close selection mode */
    onClose: () => void;
    /** Callback to select all items */
    onSelectAll: () => void;
    /** Get the currently selected tracks for batch actions */
    getSelectedTracks: () => Track[];
    /** Called after a batch action completes to exit selection mode */
    onActionComplete: () => void;
    /** Optional callback for delete action - if not provided, toolbar won't show delete */
    onDeleteTracks?: (tracks: Track[]) => Promise<void>;
    /** Optional callback for marking as favorite */
    onToggleFavorite?: (tracks: Track[], favorite: boolean) => Promise<void>;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
    selectionCount,
    totalCount,
    onClose,
    onSelectAll,
    getSelectedTracks,
    onActionComplete,
    onDeleteTracks,
    onToggleFavorite,
}) => {
    const { colors } = useTheme();
    const addToQueue = useQueueStore(state => state.addToQueue);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const isAllSelected = selectionCount === totalCount && totalCount > 0;

    const handleAddToQueue = async () => {
        const tracks = getSelectedTracks();
        if (tracks.length > 0) {
            await addToQueue(tracks);
        }
        onActionComplete();
    };

    const handleAddToPlaylist = () => {
        setShowPlaylistModal(true);
    };

    const handleClosePlaylistModal = () => {
        setShowPlaylistModal(false);
        onActionComplete();
    };

    const handleDeleteTracks = async () => {
        const tracks = getSelectedTracks();
        if (tracks.length === 0) return;

        Alert.alert(
            'Delete Tracks',
            `Remove ${tracks.length} track${tracks.length !== 1 ? 's' : ''} from the queue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (onDeleteTracks) {
                                await onDeleteTracks(tracks);
                            }
                            onActionComplete();
                            setShowMoreMenu(false);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete tracks');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleFavorite = async () => {
        const tracks = getSelectedTracks();
        if (tracks.length === 0) return;

        const allFavorited = tracks.every(t => t.isFavorite);
        try {
            if (onToggleFavorite) {
                await onToggleFavorite(tracks, !allFavorited);
            }
            onActionComplete();
            setShowMoreMenu(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to update favorites');
        }
    };

    // Get first selected track for AddToPlaylistModal (it handles the rest via trackIds)
    const selectedTracks = getSelectedTracks();

    return (
        <>
            <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                {/* Left: Close button + count */}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Icon name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.count, { color: colors.textPrimary }]}>
                    {selectionCount} selected
                </Text>

                {/* Right: Actions */}
                <View style={styles.actions}>
                    {/* Select All Toggle */}
                    <TouchableOpacity
                        onPress={isAllSelected ? onClose : onSelectAll}
                        style={styles.actionButton}
                    >
                        <Icon
                            name={isAllSelected ? 'checkbox-multiple-marked' : 'checkbox-multiple-blank-outline'}
                            size={22}
                            color={colors.textPrimary}
                        />
                    </TouchableOpacity>

                    {/* Add to Playlist */}
                    <TouchableOpacity
                        onPress={handleAddToPlaylist}
                        style={styles.actionButton}
                        disabled={selectionCount === 0}
                    >
                        <Icon
                            name="playlist-plus"
                            size={22}
                            color={selectionCount > 0 ? colors.primary : colors.textTertiary}
                        />
                    </TouchableOpacity>

                    {/* Add to Queue */}
                    <TouchableOpacity
                        onPress={handleAddToQueue}
                        style={styles.actionButton}
                        disabled={selectionCount === 0}
                    >
                        <Icon
                            name="plus-circle-outline"
                            size={22}
                            color={selectionCount > 0 ? colors.primary : colors.textTertiary}
                        />
                    </TouchableOpacity>

                    {/* More Actions Menu */}
                    <TouchableOpacity
                        onPress={() => setShowMoreMenu(true)}
                        style={styles.actionButton}
                        disabled={selectionCount === 0}
                    >
                        <Icon
                            name="dots-vertical"
                            size={22}
                            color={selectionCount > 0 ? colors.textSecondary : colors.textTertiary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Add to Playlist Modal (batch mode) */}
            <AddToPlaylistModal
                visible={showPlaylistModal}
                tracks={selectedTracks}
                onClose={handleClosePlaylistModal}
            />

            {/* More Actions Menu Modal */}
            <Modal
                visible={showMoreMenu}
                transparent
                animationType="slide"
                onRequestClose={() => setShowMoreMenu(false)}
            >
                <View style={[styles.menuOverlay, { backgroundColor: colors.overlay }]}>
                    <View style={[styles.menuContent, { backgroundColor: colors.surface }]}>
                        {/* Header */}
                        <View style={styles.menuHeader}>
                            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                                Actions
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowMoreMenu(false)}
                                style={styles.menuCloseButton}
                            >
                                <Icon name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Items */}
                        <ScrollView style={styles.menuItems}>
                            {/* Toggle Favorite */}
                            {onToggleFavorite && (
                                <TouchableOpacity
                                    style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                    onPress={handleToggleFavorite}
                                >
                                    <Icon
                                        name={selectedTracks.some(t => t.isFavorite) ? 'heart' : 'heart-outline'}
                                        size={24}
                                        color={colors.primary}
                                        style={styles.menuItemIcon}
                                    />
                                    <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                                        {selectedTracks.some(t => t.isFavorite) ? 'Remove from Favorites' : 'Add to Favorites'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Delete */}
                            {onDeleteTracks && (
                                <TouchableOpacity
                                    style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                    onPress={handleDeleteTracks}
                                >
                                    <Icon
                                        name="delete-outline"
                                        size={24}
                                        color={colors.error}
                                        style={styles.menuItemIcon}
                                    />
                                    <Text style={[styles.menuItemText, { color: colors.error }]}>
                                        Delete ({selectionCount})
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: spacing.sm,
    },
    count: {
        flex: 1,
        fontSize: typography.sizes.md,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: spacing.sm,
    },
    menuOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    menuContent: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '80%',
        paddingTop: spacing.md,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    menuTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: '700',
    },
    menuCloseButton: {
        padding: spacing.sm,
    },
    menuItems: {
        paddingHorizontal: spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
    },
    menuItemIcon: {
        marginRight: spacing.md,
    },
    menuItemText: {
        fontSize: typography.sizes.md,
        fontWeight: '500',
        flex: 1,
    },
});

export default SelectionToolbar;
