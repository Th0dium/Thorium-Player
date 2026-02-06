// Player Controls Component - Main playback controls with animated feedback
import React, { useRef, useCallback, memo } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePlayerStore } from '@/store/playerStore';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Animated button wrapper for scale feedback
const AnimatedButton: React.FC<{
    onPress: () => void;
    style?: any;
    children: React.ReactNode;
    scaleDown?: number;
    hitSlop?: { top: number; bottom: number; left: number; right: number };
    activeOpacity?: number;
}> = ({ onPress, style, children, scaleDown = 0.85, hitSlop, activeOpacity = 1 }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(scale, {
            toValue: scaleDown,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    }, [scale, scaleDown]);

    const handlePressOut = useCallback(() => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 8,
        }).start();
    }, [scale]);

    return (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={activeOpacity}
            hitSlop={hitSlop}
        >
            <Animated.View style={[style, { transform: [{ scale }] }]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
};

interface PlayerControlsProps {
    size?: 'small' | 'medium' | 'large';
    showShuffleRepeat?: boolean;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
    size = 'large',
    showShuffleRepeat = true,
}) => {
    const { colors } = useTheme();
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const repeatMode = usePlayerStore(s => s.repeatMode);
    const shuffleMode = usePlayerStore(s => s.shuffleMode);
    const togglePlayPause = usePlayerStore(s => s.togglePlayPause);
    const skipNext = usePlayerStore(s => s.skipNext);
    const skipPrevious = usePlayerStore(s => s.skipPrevious);
    const toggleRepeat = usePlayerStore(s => s.toggleRepeat);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);

    const getIconSize = () => {
        switch (size) {
            case 'small':
                return { play: 32, skip: 24, mode: 20 };
            case 'medium':
                return { play: 48, skip: 32, mode: 24 };
            case 'large':
            default:
                return { play: 64, skip: 40, mode: 28 };
        }
    };

    const iconSizes = getIconSize();

    const getRepeatIcon = () => {
        switch (repeatMode) {
            case 'one':
                return 'repeat-once';
            case 'all':
                return 'repeat';
            default:
                return 'repeat-off';
        }
    };

    const isRepeatActive = repeatMode !== 'off';
    const isShuffleActive = shuffleMode === 'on';

    return (
        <View style={styles.container}>
            {showShuffleRepeat && (
                <AnimatedButton
                    onPress={toggleShuffle}
                    style={styles.modeButton}
                    scaleDown={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon
                        name="shuffle-variant"
                        size={iconSizes.mode}
                        color={isShuffleActive ? colors.primary : colors.textSecondary}
                    />
                </AnimatedButton>
            )}

            <AnimatedButton
                onPress={skipPrevious}
                style={styles.skipButton}
                scaleDown={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Icon
                    name="skip-previous"
                    size={iconSizes.skip}
                    color={colors.textPrimary}
                />
            </AnimatedButton>

            <AnimatedButton
                onPress={togglePlayPause}
                style={[
                    styles.playButton,
                    {
                        width: iconSizes.play + 16,
                        height: iconSizes.play + 16,
                        backgroundColor: colors.primary,
                        shadowColor: colors.primary,
                    }
                ]}
                scaleDown={0.88}
                activeOpacity={0.8}
            >
                <Icon
                    name={isPlaying ? 'pause' : 'play'}
                    size={iconSizes.play}
                    color={colors.background}
                />
            </AnimatedButton>

            <AnimatedButton
                onPress={skipNext}
                style={styles.skipButton}
                scaleDown={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Icon
                    name="skip-next"
                    size={iconSizes.skip}
                    color={colors.textPrimary}
                />
            </AnimatedButton>

            {showShuffleRepeat && (
                <AnimatedButton
                    onPress={toggleRepeat}
                    style={styles.modeButton}
                    scaleDown={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon
                        name={getRepeatIcon()}
                        size={iconSizes.mode}
                        color={isRepeatActive ? colors.primary : colors.textSecondary}
                    />
                </AnimatedButton>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
    },
    playButton: {
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.lg,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    skipButton: {
        padding: spacing.sm,
    },
    modeButton: {
        padding: spacing.sm,
    },
});

export default memo(PlayerControls);
