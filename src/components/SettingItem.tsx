/**
 * Generic Setting Item Component
 * Renders different setting types based on config
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { SettingItem as SettingItemType } from '../config/settingsConfig';

interface SettingItemProps {
    item: SettingItemType;
}

export const SettingItem: React.FC<SettingItemProps> = ({ item }) => {
    const { colors } = useTheme();

    const handlePress = () => {
        if (!item.implemented) {
            // Show toast or alert that feature is not implemented
            return;
        }

        if (item.type === 'link' && item.url) {
            Linking.openURL(item.url);
        } else if (item.onPress) {
            item.onPress();
        }
    };

    const renderRightElement = () => {
        if (!item.implemented) {
            return (
                <Text style={[styles.comingSoon, { color: colors.textSecondary }]}>
                    Coming Soon
                </Text>
            );
        }

        switch (item.type) {
            case 'toggle':
                return (
                    <Switch
                        value={item.getValue?.() ?? false}
                        onValueChange={item.onChange}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor="#FFFFFF"
                    />
                );

            case 'navigation':
            case 'value':
                const displayValue = item.getValue?.() || item.subtitle;
                return (
                    <View style={styles.rightContent}>
                        {displayValue && (
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                {displayValue}
                            </Text>
                        )}
                        {item.badge && (
                            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.badgeText}>
                                    {typeof item.badge === 'function' ? item.badge() : item.badge}
                                </Text>
                            </View>
                        )}
                        <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                );

            case 'link':
                return (
                    <Icon name="open-outline" size={20} color={colors.textSecondary} />
                );

            case 'action':
                const actionSubtitle = item.getValue?.() || item.subtitle;
                return actionSubtitle ? (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {actionSubtitle}
                    </Text>
                ) : null;

            case 'info':
                const infoValue = item.getValue?.() || item.subtitle;
                return infoValue ? (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {infoValue}
                    </Text>
                ) : null;

            default:
                return null;
        }
    };

    const isInteractive =
        item.type === 'navigation' ||
        item.type === 'value' ||
        item.type === 'action' ||
        item.type === 'link';

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.border,
                },
                !item.implemented && styles.disabled,
            ]}
            onPress={(isInteractive && item.implemented) ? handlePress : undefined}
            activeOpacity={0.7}
            disabled={!item.implemented || !isInteractive}
        >
            <View style={styles.leftContent}>
                {item.icon && (
                    <Icon
                        name={item.icon as any}
                        size={24}
                        color={
                            !item.implemented
                                ? colors.textSecondary
                                : item.destructive
                                    ? '#FF3B30'
                                    : colors.primary
                        }
                        style={styles.icon}
                    />
                )}
                <View style={styles.textContent}>
                    <Text
                        style={[
                            styles.label,
                            { color: item.destructive ? '#FF3B30' : colors.text },
                            !item.implemented && { color: colors.textSecondary },
                        ]}
                    >
                        {item.label}
                    </Text>
                </View>
            </View>

            {renderRightElement()}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        minHeight: 56,
    },
    disabled: {
        opacity: 0.5,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        marginRight: 16,
        width: 24,
    },
    textContent: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    subtitle: {
        fontSize: 14,
        marginRight: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    comingSoon: {
        fontSize: 13,
        fontStyle: 'italic',
    },
});
