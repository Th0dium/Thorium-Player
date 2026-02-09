/**
 * SelectionModeHeader - Replaces normal header when multi-select is active
 * Provides primary controls for selection operations
 * 
 * Controls:
 * - Cancel: Exit selection mode
 * - Counter: Display selection count
 * - Advanced Select: Menu with select all, invert, range, deselect all
 * - Options: Batch action menu
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { Track } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface SelectionModeHeaderProps {
    /** Number of selected items */
    selectionCount: number;
    /** Total items available */
    totalCount: number;
    /** Selected track IDs */
    selectedTracks: Set<string>;
    /** All tracks in view */
    allTracks: Track[];
    /** Exit selection mode */
    onCancel: () => void;
    /** Callback for select all */
    onSelectAll: () => void;
    /** Callback for deselect all */
    onDeselectAll: () => void;
    /** Callback for invert selection */
    onInvertSelection: (trackIds: string[]) => void;
    /** Callback for select range (first to last) */
    onSelectRange: (trackIds: string[]) => void;
    /** Open options menu */
    onOpenOptions: () => void;
}

const SelectionModeHeader: React.FC<SelectionModeHeaderProps> = ({
    selectionCount,
    totalCount,
    selectedTracks,
    allTracks,
    onCancel,
    onSelectAll,
    onDeselectAll,
    onInvertSelection,
    onSelectRange,
    onOpenOptions,
}) => {
    const { colors } = useTheme();
    const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);

    const isAllSelected = selectionCount === totalCount && totalCount > 0;
    const hasSelection = selectionCount > 0;

    // Calculate range selection capability
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

    const handleInvert = () => {
        const allTrackIds = allTracks.map(t => t.id);
        onInvertSelection(allTrackIds);
        setShowAdvancedMenu(false);
    };

    const handleSelectAllToggle = () => {
        if (isAllSelected) {
            onDeselectAll();
        } else {
            onSelectAll();
        }
        setShowAdvancedMenu(false);
    };

    return (
        <>
            {/* Main Selection Header */}
            <View style={[styles.header, {
                backgroundColor: colors.primary,
                borderBottomColor: colors.primary + '80'
            }]}>
                {/* Left: Cancel Button */}
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onCancel}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Icon name="close" size={28} color="#FFF" />
                </TouchableOpacity>

                {/* Center: Counter */}
                <View style={styles.counterSection}>
                    <Text style={styles.counterText}>
                        {selectionCount}
                    </Text>
                    <Text style={styles.counterSubtext}>
                        {totalCount === selectionCount ? 'All Selected' : `of ${totalCount}`}
                    </Text>
                </View>

                {/* Right: Action Buttons */}
                <View style={styles.actionBtns}>
                    {/* Advanced Select Menu */}
                    <TouchableOpacity
                        style={[styles.actionBtn, { opacity: hasSelection || totalCount > 0 ? 1 : 0.4 }]}
                        onPress={() => setShowAdvancedMenu(true)}
                        disabled={totalCount === 0}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Icon name="tune-vertical" size={24} color="#FFF" />
                    </TouchableOpacity>

                    {/* More Options */}
                    <TouchableOpacity
                        style={[styles.actionBtn, { opacity: hasSelection ? 1 : 0.4 }]}
                        onPress={onOpenOptions}
                        disabled={!hasSelection}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Icon name="dots-vertical" size={24} color="#FFF" />
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
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setShowAdvancedMenu(false)}
                >
                    <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
                        {/* Header */}
                        <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                                Selection Options
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowAdvancedMenu(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Icon name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Options */}
                        <ScrollView style={styles.menuOptions}>
                            {/* Option 1: Select All / Deselect All */}
                            <TouchableOpacity
                                style={[styles.menuOption, { borderBottomColor: colors.border }]}
                                onPress={handleSelectAllToggle}
                            >
                                <View style={styles.optionContent}>
                                    <Icon
                                        name={isAllSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                        size={28}
                                        color={colors.primary}
                                        style={styles.optionIcon}
                                    />
                                    <View>
                                        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                                            {isAllSelected ? 'Deselect All' : 'Select All'}
                                        </Text>
                                        <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                                            {isAllSelected ? `Deselect all ${totalCount} items` : `Select all ${totalCount} items`}
                                        </Text>
                                    </View>
                                </View>
                                <Icon name="chevron-right" size={20} color={colors.textTertiary} />
                            </TouchableOpacity>

                            {/* Option 2: Invert Selection */}
                            <TouchableOpacity
                                style={[styles.menuOption, { borderBottomColor: colors.border }]}
                                onPress={handleInvert}
                            >
                                <View style={styles.optionContent}>
                                    <Icon
                                        name="swap-vertical"
                                        size={28}
                                        color={colors.primary}
                                        style={styles.optionIcon}
                                    />
                                    <View>
                                        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                                            Invert
                                        </Text>
                                        <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                                            Swap selected and unselected
                                        </Text>
                                    </View>
                                </View>
                                <Icon name="chevron-right" size={20} color={colors.textTertiary} />
                            </TouchableOpacity>

                            {/* Option 3: Select Range */}
                            <TouchableOpacity
                                style={[
                                    styles.menuOption,
                                    {
                                        borderBottomColor: colors.border,
                                        opacity: canSelectRange ? 1 : 0.5
                                    }
                                ]}
                                onPress={handleSelectRange}
                                disabled={!canSelectRange}
                            >
                                <View style={styles.optionContent}>
                                    <Icon
                                        name="selection-multiple"
                                        size={28}
                                        color={canSelectRange ? colors.primary : colors.textTertiary}
                                        style={styles.optionIcon}
                                    />
                                    <View>
                                        <Text style={[
                                            styles.optionTitle,
                                            { color: canSelectRange ? colors.textPrimary : colors.textTertiary }
                                        ]}>
                                            Select Range
                                        </Text>
                                        <Text style={[
                                            styles.optionDesc,
                                            { color: canSelectRange ? colors.textSecondary : colors.textTertiary }
                                        ]}>
                                            Fill gap between first & last
                                        </Text>
                                    </View>
                                </View>
                                {canSelectRange && (
                                    <Icon name="chevron-right" size={20} color={colors.textTertiary} />
                                )}
                            </TouchableOpacity>

                            {/* Option 4: Clear Selection */}
                            {selectionCount > 0 && (
                                <TouchableOpacity
                                    style={[styles.menuOption, { borderBottomColor: colors.border }]}
                                    onPress={onDeselectAll}
                                >
                                    <View style={styles.optionContent}>
                                        <Icon
                                            name="close-circle-outline"
                                            size={28}
                                            color={colors.error}
                                            style={styles.optionIcon}
                                        />
                                        <View>
                                            <Text style={[styles.optionTitle, { color: colors.error }]}>
                                                Clear Selection
                                            </Text>
                                            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                                                Deselect all {selectionCount} items
                                            </Text>
                                        </View>
                                    </View>
                                    <Icon name="chevron-right" size={20} color={colors.textTertiary} />
                                </TouchableOpacity>
                            )}

                            {/* Info Footer */}
                            <View style={[styles.menuFooter, { borderTopColor: colors.border }]}>
                                <Icon name="information-outline" size={16} color={colors.textTertiary} />
                                <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                                    {selectionCount} of {totalCount} selected
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 2,
    },
    cancelBtn: {
        padding: spacing.sm,
        marginRight: spacing.md,
    },
    counterSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
    },
    counterText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFF',
        lineHeight: 36,
    },
    counterSubtext: {
        fontSize: typography.sizes.sm,
        color: '#FFF',
        opacity: 0.9,
        marginTop: 2,
    },
    actionBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    actionBtn: {
        padding: spacing.sm,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    menuCard: {
        borderRadius: borderRadius.xl,
        maxHeight: '75%',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 12,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
    },
    menuTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: '700',
    },
    menuOptions: {
        paddingVertical: spacing.sm,
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
    },
    optionContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionIcon: {
        marginRight: spacing.md,
    },
    optionTitle: {
        fontSize: typography.sizes.md,
        fontWeight: '600',
        marginBottom: 2,
    },
    optionDesc: {
        fontSize: typography.sizes.sm - 1,
        marginTop: 2,
    },
    menuFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    infoText: {
        fontSize: typography.sizes.sm,
        flex: 1,
    },
});

export default SelectionModeHeader;
