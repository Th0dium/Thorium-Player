// Player Controls Component - Main playback controls with premium design
import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePlayerStore } from '@/store/playerStore';
import { colors, spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlayerControlsProps {
    size?: 'small' | 'medium' | 'large';
    showShuffleRepeat?: boolean;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
    size = 'large',
    showShuffleRepeat = true,
}) => {
    const {
        isPlaying,
        repeatMode,
        shuffleMode,
        togglePlayPause,
        skipNext,
        skipPrevious,
        toggleRepeat,
        toggleShuffle,
    } = usePlayerStore();

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
                <TouchableOpacity
                    onPress={toggleShuffle}
                    style={styles.modeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon
                        name="shuffle-variant"
                        size={iconSizes.mode}
                        color={isShuffleActive ? colors.primary : colors.textSecondary}
                    />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                onPress={skipPrevious}
                style={styles.skipButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Icon
                    name="skip-previous"
                    size={iconSizes.skip}
                    color={colors.textPrimary}
                />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={togglePlayPause}
                style={[styles.playButton, { width: iconSizes.play + 16, height: iconSizes.play + 16 }]}
                activeOpacity={0.8}
            >
                <Icon
                    name={isPlaying ? 'pause' : 'play'}
                    size={iconSizes.play}
                    color={colors.background}
                />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={skipNext}
                style={styles.skipButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Icon
                    name="skip-next"
                    size={iconSizes.skip}
                    color={colors.textPrimary}
                />
            </TouchableOpacity>

            {showShuffleRepeat && (
                <TouchableOpacity
                    onPress={toggleRepeat}
                    style={styles.modeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon
                        name={getRepeatIcon()}
                        size={iconSizes.mode}
                        color={isRepeatActive ? colors.primary : colors.textSecondary}
                    />
                </TouchableOpacity>
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
        backgroundColor: colors.primary,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.lg,
        shadowColor: colors.primary,
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

export default PlayerControls;
