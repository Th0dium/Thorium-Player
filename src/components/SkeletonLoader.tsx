// SkeletonLoader - Animated loading placeholder with shimmer effect
// Shows pulsing placeholder content while data is loading
// Optimized: Single shared animation drives all skeleton items
import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Animated,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';

// Shared pulse hook - one animation per list, not per item
const useSharedPulse = () => {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    return pulseAnim;
};

interface SkeletonTrackItemProps {
    showArtwork?: boolean;
    pulseAnim?: Animated.Value;
}

const SkeletonTrackItem: React.FC<SkeletonTrackItemProps> = ({ showArtwork = true, pulseAnim: externalPulse }) => {
    const { colors } = useTheme();
    // Use external shared pulse if provided, otherwise create own (for standalone usage)
    const ownPulse = useSharedPulse();
    const pulseAnim = externalPulse || ownPulse;

    const bgColor = colors.backgroundTertiary || colors.surface;

    return (
        <View style={styles.trackItem}>
            {showArtwork && (
                <Animated.View
                    style={[
                        styles.artwork,
                        { backgroundColor: bgColor, opacity: pulseAnim },
                    ]}
                />
            )}
            <View style={styles.textContainer}>
                <Animated.View
                    style={[
                        styles.titleBar,
                        { backgroundColor: bgColor, opacity: pulseAnim },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.subtitleBar,
                        { backgroundColor: bgColor, opacity: pulseAnim },
                    ]}
                />
            </View>
            <Animated.View
                style={[
                    styles.durationBar,
                    { backgroundColor: bgColor, opacity: pulseAnim },
                ]}
            />
        </View>
    );
};

interface SkeletonListProps {
    count?: number;
    showArtwork?: boolean;
}

const SkeletonList: React.FC<SkeletonListProps> = ({
    count = 8,
    showArtwork = true,
}) => {
    // Single shared animation for all items
    const pulseAnim = useSharedPulse();

    return (
        <View style={styles.container}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonTrackItem key={i} showArtwork={showArtwork} pulseAnim={pulseAnim} />
            ))}
        </View>
    );
};

// Grid skeleton for album/artist views
interface SkeletonGridItemProps {
    pulseAnim?: Animated.Value;
}

const SkeletonGridItem: React.FC<SkeletonGridItemProps> = ({ pulseAnim: externalPulse }) => {
    const { colors } = useTheme();
    const ownPulse = useSharedPulse();
    const pulseAnim = externalPulse || ownPulse;

    const bgColor = colors.backgroundTertiary || colors.surface;

    return (
        <View style={styles.gridItem}>
            <Animated.View
                style={[
                    styles.gridImage,
                    { backgroundColor: bgColor, opacity: pulseAnim },
                ]}
            />
            <Animated.View
                style={[
                    styles.gridTitle,
                    { backgroundColor: bgColor, opacity: pulseAnim },
                ]}
            />
            <Animated.View
                style={[
                    styles.gridSubtitle,
                    { backgroundColor: bgColor, opacity: pulseAnim },
                ]}
            />
        </View>
    );
};

interface SkeletonGridProps {
    count?: number;
    columns?: number;
}

const SkeletonGrid: React.FC<SkeletonGridProps> = ({
    count = 6,
    columns = 2,
}) => {
    // Single shared animation for all grid items
    const pulseAnim = useSharedPulse();

    return (
        <View style={[styles.gridContainer, { gap: spacing.md }]}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={{ width: `${(100 / columns) - 3}%` as any }}>
                    <SkeletonGridItem pulseAnim={pulseAnim} />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.sm,
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        gap: spacing.md,
    },
    artwork: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.sm,
    },
    textContainer: {
        flex: 1,
        gap: spacing.xs,
    },
    titleBar: {
        height: 14,
        borderRadius: 4,
        width: '70%',
    },
    subtitleBar: {
        height: 12,
        borderRadius: 4,
        width: '45%',
    },
    durationBar: {
        height: 12,
        borderRadius: 4,
        width: 35,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.md,
    },
    gridItem: {
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    gridImage: {
        aspectRatio: 1,
        borderRadius: borderRadius.md,
        width: '100%',
    },
    gridTitle: {
        height: 14,
        borderRadius: 4,
        width: '80%',
    },
    gridSubtitle: {
        height: 12,
        borderRadius: 4,
        width: '50%',
    },
});

export { SkeletonList, SkeletonGrid, SkeletonTrackItem, SkeletonGridItem };
export default SkeletonList;
