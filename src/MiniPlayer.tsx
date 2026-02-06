// Mini Player Component - Compact player bar at bottom of screen
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePlayerStore } from '@/store/playerStore';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MiniPlayerProps {
    onPress: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
    const {
        currentTrack,
        isPlaying,
        position,
        duration,
        togglePlayPause,
        skipNext,
    } = usePlayerStore();

    if (!currentTrack) return null;

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.95}
        >
            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>

            <View style={styles.content}>
                {/* Album artwork */}
                <View style={styles.artworkContainer}>
                    {currentTrack.albumArt ? (
                        <Image
                            source={{ uri: currentTrack.albumArt }}
                            style={styles.artwork}
                        />
                    ) : (
                        <View style={styles.artworkPlaceholder}>
                            <Icon name="music-note" size={20} color={colors.textTertiary} />
                        </View>
                    )}
                </View>

                {/* Track info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentTrack.title}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {currentTrack.artist}
                    </Text>
                </View>

                {/* Controls */}
                <View style={styles.controlsContainer}>
                    <TouchableOpacity
                        onPress={togglePlayPause}
                        style={styles.controlButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon
                            name={isPlaying ? 'pause' : 'play'}
                            size={28}
                            color={colors.textPrimary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={skipNext}
                        style={styles.controlButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="skip-next" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surfaceElevated,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
        ...shadows.medium,
    },
    progressContainer: {
        height: 2,
        backgroundColor: colors.seekBarBackground,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    artworkContainer: {
        width: 44,
        height: 44,
        marginRight: spacing.md,
    },
    artwork: {
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.sm,
    },
    artworkPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.sm,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
        color: colors.textPrimary,
    },
    artist: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButton: {
        padding: spacing.sm,
    },
});

export default MiniPlayer;
