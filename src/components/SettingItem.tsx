/**
 * Generic Setting Item Component
 * Renders different setting types based on config
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { SettingItem as SettingItemType } from '../config/settingsConfig';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigation';

interface SettingItemProps {
    item: SettingItemType;
}

export const SettingItem: React.FC<SettingItemProps> = ({ item }) => {
    const { colors } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [currentValue, setCurrentValue] = useState<any>(item.getValue?.());

    // Subscribe to value changes
    useEffect(() => {
        const updateValue = () => {
            setCurrentValue(item.getValue?.());
        };
        updateValue();
        const interval = setInterval(updateValue, 500); // Poll for changes
        return () => clearInterval(interval);
    }, [item.id]);

    const handlePress = () => {
        if (!item.implemented) {
            // Show toast or alert that feature is not implemented
            return;
        }

        if (item.type === 'navigation' && item.navigationTarget) {
            navigation.navigate(item.navigationTarget as any);
        } else if (item.type === 'link' && item.url) {
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
                        value={currentValue ?? false}
                        onValueChange={(value) => {
                            setCurrentValue(value);
                            item.onChange?.(value);
                        }}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor="#FFFFFF"
                    />
                );

            case 'navigation':
            case 'value':
                const displayValue = currentValue || item.subtitle;
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
                const actionSubtitle = currentValue || item.subtitle;
                return actionSubtitle ? (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {actionSubtitle}
                    </Text>
                ) : null;

            case 'info':
                const infoValue = currentValue || item.subtitle;
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
        item.type === 'action' ||
        item.type === 'navigation' ||
        item.type === 'value' ||
        item.type === 'link';

    // For toggles, don't disable the entire wrapper - let Switch handle interaction
    const isToggle = item.type === 'toggle';

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
            disabled={!item.implemented || (!isInteractive && !isToggle)}
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
                    {item.description && (
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            {item.description}
                        </Text>
                    )}
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
        alignItems: 'flex-start',
        flex: 1,
    },
    icon: {
        marginRight: 16,
        width: 24,
        marginTop: 4,
    },
    textContent: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
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
