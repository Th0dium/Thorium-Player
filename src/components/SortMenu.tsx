import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { SortOption } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SortMenuProps {
    visible: boolean;
    onClose: () => void;
    sortBy: SortOption;
    sortAsc: boolean;
    onSortChange: (option: SortOption, asc: boolean) => void;
    options?: SortOption[];
    title?: string;
}

const DEFAULT_OPTIONS: SortOption[] = [
    'title',
    'artist',
    'album',
    'dateAdded',
    'duration',
    'playCount',
];

const OPTION_METADATA: Record<SortOption, { label: string; icon: string }> = {
    title: { label: 'Title', icon: 'sort-alphabetical-ascending' },
    artist: { label: 'Artist', icon: 'account-music' },
    album: { label: 'Album', icon: 'album' },
    dateAdded: { label: 'Date Added', icon: 'calendar-plus' },
    duration: { label: 'Duration', icon: 'clock-outline' },
    playCount: { label: 'Play Count', icon: 'chart-bar' },
};

export const SortMenu: React.FC<SortMenuProps> = ({
    visible,
    onClose,
    sortBy,
    sortAsc,
    onSortChange,
    options = DEFAULT_OPTIONS,
    title = 'Sort by',
}) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const handleOptionPress = (option: SortOption) => {
        if (sortBy === option) {
            onSortChange(option, !sortAsc);
        } else {
            const defaultAsc = option === 'title' || option === 'artist' || option === 'album';
            onSortChange(option, defaultAsc);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View 
                            style={[
                                styles.menuContainer, 
                                { 
                                    backgroundColor: colors.surfaceElevated,
                                    paddingBottom: Math.max(spacing.md, insets.bottom)
                                }
                            ]}
                        >
                            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{title}</Text>
                            {options.map((optionKey) => {
                                const meta = OPTION_METADATA[optionKey];
                                const isActive = sortBy === optionKey;

                                return (
                                    <TouchableOpacity
                                        key={optionKey}
                                        style={[
                                            styles.sortOption,
                                            isActive && { backgroundColor: colors.primary + '15' }
                                        ]}
                                        onPress={() => handleOptionPress(optionKey)}
                                    >
                                        <Icon 
                                            name={meta.icon} 
                                            size={20} 
                                            color={isActive ? colors.primary : colors.textSecondary} 
                                        />
                                        <Text style={[
                                            styles.sortOptionLabel,
                                            { color: isActive ? colors.primary : colors.textPrimary }
                                        ]}>
                                            {meta.label}
                                        </Text>
                                        {isActive && (
                                            <Icon 
                                                name={sortAsc ? 'arrow-up' : 'arrow-down'} 
                                                size={18} 
                                                color={colors.primary} 
                                                style={{ marginLeft: 'auto' }}
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        width: '80%',
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuTitle: {
        fontSize: typography.sizes.md,
        fontWeight: 'bold',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        marginBottom: spacing.xs,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    sortOptionLabel: {
        fontSize: typography.sizes.md,
        marginLeft: spacing.md,
    },
});

export default SortMenu;
