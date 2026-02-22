/**
 * SelectionControlPanel - Advanced control panel for multi-select mode
 * Provides: Cancel, Advanced Selection Assist, More Options menu
 * 
 * Advanced Select includes:
 * - Select All
 * - Deselect All
 * - Invert Selection
 * - Select Range (First to Last Selected)
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { Track } from '@/store/types';
import { spacing, typography } from '@/constants/theme';

interface SelectionControlPanelProps {
    /** Selection count */
    selectionCount: number;
    /** Total number of items */
    totalCount: number;
    /** Currently selected track IDs */
    selectedTracks: Set<string>;
    /** All tracks in current view */
    allTracks: Track[];
    /** Callback to cancel selection mode */
    onCancel: () => void;
    /** Callback to select all */
    onSelectAll: () => void;
    /** Callback to deselect all */
    onDeselectAll: () => void;
    /** Callback to invert selection */
    onInvertSelection: (trackIds: string[]) => void;
    /** Callback to select range (first to last) */
    onSelectRange: (trackIds: string[]) => void;
    /** Callback for more options menu */
    onMoreOptions: () => void;
}

const SelectionControlPanel: React.FC<SelectionControlPanelProps> = ({
    selectionCount,
    totalCount,
    selectedTracks,
    allTracks,
    onCancel,
    onSelectAll,
    onDeselectAll,
    onInvertSelection,
    onSelectRange,
    onMoreOptions,
}) => {
    const { colors } = useTheme();
    const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);

    const isAllSelected = selectionCount === totalCount && totalCount > 0;
    const hasSelection = selectionCount > 0;

    // Get first and last selected track indices
    const selectRangeIndices = useMemo(() => {
        const selectedIndices: number[] = [];
        allTracks.forEach((track, idx) => {
            if (selectedTracks.has(track.id)) {
                selectedIndices.push(idx);
            }
        });

        if (selectedIndices.length < 2) {
            return { first: -1, last: -1 };
        }

        return {
            first: selectedIndices[0],
            last: selectedIndices[selectedIndices.length - 1],
        };
    }, [selectedTracks, allTracks]);

    const canSelectRange = selectRangeIndices.first >= 0 && selectRangeIndices.last > selectRangeIndices.first;

    const handleSelectRange = () => {
        if (!canSelectRange) return;

        const rangeTrackIds: string[] = [];
        for (let i = selectRangeIndices.first; i <= selectRangeIndices.last; i++) {
            if (allTracks[i]) {
                rangeTrackIds.push(allTracks[i].id);
            }
        }
        onSelectRange(rangeTrackIds);
        setShowAdvancedMenu(false);
    };

    const handleInvertSelection = () => {
        const allTrackIds = allTracks.map(t => t.id);
        onInvertSelection(allTrackIds);
        setShowAdvancedMenu(false);
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            onDeselectAll();
        } else {
            onSelectAll();
        }
        setShowAdvancedMenu(false);
    };

    return (
        <>
            <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                {/* Left: Cancel Button */}
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onCancel}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                {/* Center: Selection Counter */}
                <View style={styles.counterContainer}>
                    <Text style={[styles.selectionCounter, { color: colors.textPrimary }]}>
                        {selectionCount} / {totalCount}
                    </Text>
                </View>

                {/* Right: Advanced Select & More Options */}
                <View style={styles.actionButtons}>
                    {/* Advanced Select Menu */}
                    <TouchableOpacity
                        style={[styles.iconButton, { opacity: hasSelection ? 1 : 0.5 }]}
                        onPress={() => setShowAdvancedMenu(true)}
                        disabled={!hasSelection && totalCount === 0}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon
                            name="tune-vertical"
                            size={24}
                            color={hasSelection ? colors.primary : colors.textTertiary}
                        />
                    </TouchableOpacity>

                    {/* More Options Menu */}
                    <TouchableOpacity
                        style={[styles.iconButton, { opacity: hasSelection ? 1 : 0.5 }]}
                        onPress={onMoreOptions}
                        disabled={!hasSelection}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon
                            name="dots-vertical"
                            size={24}
                            color={hasSelection ? colors.textSecondary : colors.textTertiary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Advanced Selection Menu Modal */}
            <Modal
                visible={showAdvancedMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAdvancedMenu(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAdvancedMenu(false)}
                >
                    {/* Menu Content */}
                    <View
                        style={[styles.menuContent, { backgroundColor: colors.surface }]}
                        onStartShouldSetResponder={() => true}
                    >
                        {/* Menu Header */}
                        <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                                Advanced Selection
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowAdvancedMenu(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Icon name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Items */}
                        <ScrollView style={styles.menuItems}>
                            {/* Select/Deselect All */}
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                onPress={handleSelectAll}
                            >
                                <Icon
                                    name={isAllSelected ? 'checkbox-multiple-marked' : 'checkbox-multiple-blank-outline'}
                                    size={24}
                                    color={colors.primary}
                                    style={styles.menuItemIcon}
                                />
                                <View style={styles.menuItemContent}>
                                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                                        {isAllSelected ? 'Deselect All' : 'Select All'}
                                    </Text>
                                    <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                                        {isAllSelected ? `Deselect all ${totalCount} items` : `Select all ${totalCount} items`}
                                    </Text>
                                </View>
                                <Icon
                                    name="chevron-right"
                                    size={20}
                                    color={colors.textTertiary}
                                    style={styles.menuItemChevron}
                                />
                            </TouchableOpacity>

                            {/* Invert Selection */}
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                onPress={handleInvertSelection}
                            >
                                <Icon
                                    name="swap-vertical"
                                    size={24}
                                    color={colors.primary}
                                    style={styles.menuItemIcon}
                                />
                                <View style={styles.menuItemContent}>
                                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                                        Invert Selection
                                    </Text>
                                    <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                                        Swap selected and unselected items
                                    </Text>
                                </View>
                                <Icon
                                    name="chevron-right"
                                    size={20}
                                    color={colors.textTertiary}
                                    style={styles.menuItemChevron}
                                />
                            </TouchableOpacity>

                            {/* Select Range (First to Last) */}
                            <TouchableOpacity
                                style={[
                                    styles.menuItem,
                                    { borderBottomColor: colors.border, opacity: canSelectRange ? 1 : 0.5 },
                                ]}
                                onPress={handleSelectRange}
                                disabled={!canSelectRange}
                            >
                                <Icon
                                    name="selection-multiple"
                                    size={24}
                                    color={canSelectRange ? colors.primary : colors.textTertiary}
                                    style={styles.menuItemIcon}
                                />
                                <View style={styles.menuItemContent}>
                                    <Text
                                        style={[
                                            styles.menuItemTitle,
                                            { color: canSelectRange ? colors.textPrimary : colors.textTertiary },
                                        ]}
                                    >
                                        Select Range
                                    </Text>
                                    <Text
                                        style={[
                                            styles.menuItemSubtitle,
                                            { color: canSelectRange ? colors.textSecondary : colors.textTertiary },
                                        ]}
                                    >
                                        Select all items between first & last selected
                                    </Text>
                                </View>
                                {canSelectRange && (
                                    <Icon
                                        name="chevron-right"
                                        size={20}
                                        color={colors.textTertiary}
                                        style={styles.menuItemChevron}
                                    />
                                )}
                            </TouchableOpacity>

                            {/* Info Section */}
                            <View style={[styles.infoSection, { borderTopColor: colors.border }]}>
                                <Icon
                                    name="information"
                                    size={16}
                                    color={colors.textTertiary}
                                    style={styles.infoIcon}
                                />
                                <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                                    {selectionCount} selected {totalCount > selectionCount ? `out of ${totalCount}` : ''}
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    cancelButton: {
        padding: spacing.sm,
        marginRight: spacing.sm,
    },
    counterContainer: {
        flex: 1,
        alignItems: 'center',
    },
    selectionCounter: {
        fontSize: typography.sizes.md,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    iconButton: {
        padding: spacing.sm,
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContent: {
        width: '80%',
        maxHeight: '70%',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    menuTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: '700',
    },
    menuItems: {
        paddingVertical: spacing.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
    },
    menuItemIcon: {
        marginRight: spacing.md,
    },
    menuItemContent: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: typography.sizes.md,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    menuItemSubtitle: {
        fontSize: typography.sizes.sm,
    },
    menuItemChevron: {
        marginLeft: spacing.sm,
    },
    infoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        marginTop: spacing.sm,
    },
    infoIcon: {
        marginRight: spacing.sm,
    },
    infoText: {
        fontSize: typography.sizes.sm,
        lineHeight: 16,
    },
});

export default SelectionControlPanel;
