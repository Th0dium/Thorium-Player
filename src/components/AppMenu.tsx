import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface AppMenuProps {
    visible: boolean;
    onClose: () => void;
    onScan?: () => void;
    onSettings?: () => void;
    onSleepTimer?: () => void;
    onEqualizer?: () => void;
    onHelp?: () => void;
}

const AppMenu: React.FC<AppMenuProps> = ({
    visible,
    onClose,
    onScan,
    onSettings,
    onSleepTimer,
    onEqualizer,
    onHelp,
}) => {
    const { colors } = useTheme();

    const closeMenu = () => onClose();

    const menuItems = [
        {
            id: 'scan',
            label: 'Scan Library',
            icon: 'folder-search',
            onPress: () => {
                closeMenu();
                onScan?.();
            },
        },
        {
            id: 'equalizer',
            label: 'Equalizer',
            icon: 'equalizer',
            onPress: () => {
                closeMenu();
                onEqualizer?.();
            },
        },
        {
            id: 'sleepTimer',
            label: 'Sleep Timer',
            icon: 'timer-sand',
            onPress: () => {
                closeMenu();
                onSleepTimer?.();
            },
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: 'cog-outline',
            onPress: () => {
                closeMenu();
                onSettings?.();
            },
        },
        {
            id: 'help',
            label: 'Help & Feedback',
            icon: 'help-circle-outline',
            onPress: () => {
                closeMenu();
                onHelp?.();
            },
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={closeMenu}
        >
            <Pressable
                style={styles.modalOverlay}
                onPress={closeMenu}
            >
                <Pressable
                    style={[
                        styles.menuContainer,
                        {
                            backgroundColor: colors.surfaceElevated,
                            ...Platform.select({
                                ios: {
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                },
                                android: {
                                    elevation: 8,
                                },
                            }),
                        },
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                index === menuItems.length - 1 && styles.menuItemLast,
                            ]}
                            onPress={item.onPress}
                            activeOpacity={0.6}
                        >
                            <Icon
                                name={item.icon}
                                size={22}
                                color={colors.textSecondary}
                                style={styles.menuItemIcon}
                            />
                            <Text
                                style={[
                                    styles.menuItemText,
                                    { color: colors.textPrimary },
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: Platform.OS === 'ios' ? 54 : 48,
        paddingRight: spacing.sm,
    },
    menuContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        minWidth: 200,
        paddingVertical: spacing.xs,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    menuItemLast: {
        // No special styling needed, but keeps structure clean
    },
    menuItemIcon: {
        marginRight: spacing.md,
        width: 24,
    },
    menuItemText: {
        fontSize: typography.sizes.md,
        fontWeight: '400',
    },
});

export default AppMenu;
