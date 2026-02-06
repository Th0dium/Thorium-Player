// EmptyState - Animated empty state component with icon bounce
// Used across all list screens when no data is available
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface EmptyStateProps {
    icon: string;
    iconSize?: number;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    actionIcon?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    iconSize = 64,
    title,
    subtitle,
    actionLabel,
    actionIcon,
    onAction,
}) => {
    const { colors } = useTheme();
    const bounceAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();

        // Single entrance bounce, not a continuous loop
        Animated.sequence([
            Animated.timing(bounceAnim, {
                toValue: -16,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(bounceAnim, {
                toValue: 0,
                useNativeDriver: true,
                speed: 12,
                bounciness: 8,
            }),
        ]).start();
    }, [bounceAnim, fadeAnim]);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
                <Icon name={icon} size={iconSize} color={colors.textTertiary} />
            </Animated.View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
                {title}
            </Text>
            {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {subtitle}
                </Text>
            ) : null}
            {actionLabel && onAction ? (
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={onAction}
                    activeOpacity={0.8}
                >
                    {actionIcon && <Icon name={actionIcon} size={20} color="#FFF" />}
                    <Text style={styles.actionText}>{actionLabel}</Text>
                </TouchableOpacity>
            ) : null}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl * 2,
        paddingHorizontal: spacing.lg,
    },
    title: {
        fontSize: typography.sizes.md,
        fontWeight: '600' as const,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.xs,
        textAlign: 'center',
        lineHeight: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 24,
        marginTop: spacing.lg,
        gap: spacing.xs,
    },
    actionText: {
        color: '#FFF',
        fontSize: typography.sizes.sm,
        fontWeight: '600' as const,
    },
});

export default EmptyState;
