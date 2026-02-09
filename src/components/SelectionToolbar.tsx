/**
 * SelectionToolbar - Displayed when multi-select mode is active
 * Shows selection count and batch action buttons
 */

import React, { useState, useCallback, useMemo } from 'react';
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
    /** Callback to deselect all items */
    onDeselectAll: () => void;
    /** Callback to invert selection */
    onInvertSelection: (trackIds: string[]) => void;
    /** Callback to select range */
    onSelectRange: (trackIds: string[]) => void;
    /** Get the currently selected tracks for batch actions */
    getSelectedTracks: () => Track[];
    /** Get all track IDs for advanced selection operations */
    getAllTrackIds?: () => string[];
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
    onDeselectAll,
    onInvertSelection,
    onSelectRange,
    getSelectedTracks,
    getAllTrackIds,
    onActionComplete,
    onDeleteTracks,
    onToggleFavorite,
}) => {
    const { colors } = useTheme();
    const addToQueue = useQueueStore(state => state.addToQueue);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [showBatchActionsMenu, setShowBatchActionsMenu] = useState(false);
    const [showAdvancedSelectMenu, setShowAdvancedSelectMenu] = useState(false);

    // Memoize selected tracks to avoid recalculating on every render
    const selectedTracks = useMemo(() => getSelectedTracks(), [getSelectedTracks]);

    const handleAddToQueue = useCallback(async () => {
        const tracks = getSelectedTracks();
        if (tracks.length > 0) {
            try {
                await addToQueue(tracks);
                onActionComplete();
            } catch (error) {
                Alert.alert('Error', 'Failed to add tracks to queue');
            }
        }
    }, [getSelectedTracks, addToQueue, onActionComplete]);

    const handleAddToPlaylist = useCallback(() => {
        setShowPlaylistModal(true);
    }, []);

    const handleClosePlaylistModal = useCallback(() => {
        setShowPlaylistModal(false);
        onActionComplete();
    }, [onActionComplete]);

    const handleDeleteTracks = useCallback(() => {
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
                            setShowBatchActionsMenu(false);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete tracks');
                        }
                    },
                },
            ]
        );
    }, [getSelectedTracks, onDeleteTracks, onActionComplete]);

    const handleToggleFavorite = useCallback(() => {
        const tracks = getSelectedTracks();
        if (tracks.length === 0) return;

        const allFavorited = tracks.every(t => t.isFavorite);
        try {
            if (onToggleFavorite) {
                onToggleFavorite(tracks, !allFavorited).then(() => {
                    onActionComplete();
                    setShowBatchActionsMenu(false);
                });
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update favorites');
        }
    }, [getSelectedTracks, onToggleFavorite, onActionComplete]);

    return (
        <>
            {/* Floating Dynamic Island Toolbar - Redesigned for balance and clarity */}
            <View style={styles.floatingContainer}>
                <View
                    style={[
                        styles.dynamicIsland,
                        { backgroundColor: colors.surface, shadowColor: colors.textPrimary }
                    ]}
                >
                    {/* LEFT: Selection Count Badge */}
                    <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.countText, { color: colors.primary }]}>
                            {selectionCount}
                        </Text>
                        <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
                            {selectionCount === 1 ? 'Item' : 'Items'}
                        </Text>
                    </View>

                    {/* DIVIDER */}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* CENTER: Action Buttons - Select, Options, Cancel */}
                    <View style={styles.actionsContainer}>
                        {/* Advanced Select Button */}
                        <TouchableOpacity
                            onPress={() => setShowAdvancedSelectMenu(true)}
                            style={styles.actionButtonWrapper}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.6}
                        >
                            <View style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                                <Icon name="tune-vertical" size={18} color="#FFF" />
                            </View>
                            <Text style={[styles.actionLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                                Select
                            </Text>
                        </TouchableOpacity>

                        {/* Batch Actions Options Button */}
                        <TouchableOpacity
                            onPress={() => setShowBatchActionsMenu(true)}
                            disabled={selectionCount === 0}
                            style={styles.actionButtonWrapper}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.6}
                        >
                            <View
                                style={[
                                    styles.actionButton,
                                    {
                                        backgroundColor: selectionCount > 0 ? colors.primary : colors.backgroundTertiary
                                    }
                                ]}
                            >
                                <Icon
                                    name="dots-vertical"
                                    size={18}
                                    color={selectionCount > 0 ? '#FFF' : colors.textTertiary}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.actionLabel,
                                    {
                                        color: selectionCount > 0 ? colors.textPrimary : colors.textTertiary
                                    }
                                ]}
                                numberOfLines={1}
                            >
                                Actions
                            </Text>
                        </TouchableOpacity>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.actionButtonWrapper}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.6}
                        >
                            <View style={[styles.actionButton, { backgroundColor: colors.error }]}>
                                <Icon name="close" size={18} color="#FFF" />
                            </View>
                            <Text style={[styles.actionLabel, { color: colors.error }]} numberOfLines={1}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
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
                visible={showBatchActionsMenu}
                transparent
                animationType="slide"
                onRequestClose={() => setShowBatchActionsMenu(false)}
            >
                <View style={[styles.menuOverlay, { backgroundColor: colors.overlay }]}>
                    <View style={[styles.menuContent, { backgroundColor: colors.surface }]}>
                        {/* Header */}
                        <View style={styles.menuHeader}>
                            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                                Actions
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowBatchActionsMenu(false)}
                                style={styles.menuCloseButton}
                            >
                                <Icon name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Items */}
                        <ScrollView style={styles.menuItems}>
                            {/* Add to Queue */}
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    handleAddToQueue();
                                    setShowBatchActionsMenu(false);
                                }}
                            >
                                <Icon
                                    name="plus-circle"
                                    size={24}
                                    color={colors.primary}
                                    style={styles.menuItemIcon}
                                />
                                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                                    Add to Queue
                                </Text>
                            </TouchableOpacity>

                            {/* Add to Playlist */}
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    handleAddToPlaylist();
                                    setShowBatchActionsMenu(false);
                                }}
                            >
                                <Icon
                                    name="playlist-plus"
                                    size={24}
                                    color={colors.primary}
                                    style={styles.menuItemIcon}
                                />
                                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                                    Add to Playlist
                                </Text>
                            </TouchableOpacity>

                            {/* Toggle Favorite */}
                            {onToggleFavorite && (
                                <TouchableOpacity
                                    style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        handleToggleFavorite();
                                        setShowBatchActionsMenu(false);
                                    }}
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
                                    onPress={() => {
                                        handleDeleteTracks();
                                        setShowBatchActionsMenu(false);
                                    }}
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

            {/* Advanced Selection Menu Modal */}
            <Modal
                visible={showAdvancedSelectMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAdvancedSelectMenu(false)}
            >
                <View style={[styles.menuOverlay, { backgroundColor: colors.overlay }]}>
                    <View style={[styles.advancedMenuCard, { backgroundColor: colors.surface }]}>
                        {/* Header */}
                        <View style={styles.advancedMenuHeader}>
                            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                                Advanced Selection
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowAdvancedSelectMenu(false)}
                                style={styles.menuCloseButton}
                            >
                                <Icon name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Items */}
                        <ScrollView style={styles.advancedMenuItems}>
                            {/* Select All */}
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    onSelectAll();
                                    setShowAdvancedSelectMenu(false);
                                }}
                            >
                                <Icon
                                    name="checkbox-multiple-marked"
                                    size={24}
                                    color={colors.primary}
                                    style={styles.menuItemIcon}
                                />
                                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                                    Select All
                                </Text>
                            </TouchableOpacity>

                            {/* Deselect All */}
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    onDeselectAll();
                                    setShowAdvancedSelectMenu(false);
                                }}
                            >
                                <Icon
                                    name="checkbox-multiple-blank-outline"
                                    size={24}
                                    color={colors.primary}
                                    style={styles.menuItemIcon}
                                />
                                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                                    Deselect All
                                </Text>
                            </TouchableOpacity>

                            {/* Invert Selection */}
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    if (getAllTrackIds) {
                                        onInvertSelection(getAllTrackIds());
                                    }
                                    setShowAdvancedSelectMenu(false);
                                }}
                            >
                                <Icon
                                    name="swap-horizontal"
                                    size={24}
                                    color={colors.primary}
                                    style={styles.menuItemIcon}
                                />
                                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                                    Invert Selection
                                </Text>
                            </TouchableOpacity>

                            {/* Select Range */}
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    if (getAllTrackIds) {
                                        onSelectRange(getAllTrackIds());
                                    }
                                    setShowAdvancedSelectMenu(false);
                                }}
                            >
                                <Icon
                                    name="format-list-bulleted-square"
                                    size={24}
                                    color={colors.primary}
                                    style={styles.menuItemIcon}
                                />
                                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                                    Select Range
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    floatingContainer: {
        position: 'absolute',
        bottom: 20,
        left: 12,
        right: 12,
        alignItems: 'center',
        pointerEvents: 'box-none',
        zIndex: 999,
    },
    dynamicIsland: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: 24,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 15,
        width: '100%',
        maxWidth: 360,
    },
    countBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 50,
    },
    countText: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 20,
    },
    countLabel: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 32,
        marginHorizontal: spacing.sm,
        opacity: 0.3,
    },
    actionsContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: spacing.xs,
    },
    actionButtonWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xs,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    actionLabel: {
        fontSize: 9,
        fontWeight: '600',
        textAlign: 'center',
        minWidth: 40,
    },
    closeButtonWrapper: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginLeft: spacing.xs,
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
    advancedMenuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    advancedMenuCard: {
        borderRadius: 16,
        maxHeight: '65%',
        marginHorizontal: spacing.md,
        overflow: 'hidden',
    },
    advancedMenuItems: {
        paddingHorizontal: spacing.sm,
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
