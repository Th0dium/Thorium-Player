// Configuration Screen - Final setup with app behavior options
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
    ScrollView,
    Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useSettingsStore, QueueBehavior } from '@/store/settingsStore';

interface ConfigurationScreenProps {
    onComplete: () => void;
    onBack: () => void;
}

const ConfigurationScreen: React.FC<ConfigurationScreenProps> = ({ onComplete, onBack }) => {
    const {
        queueBehavior,
        pauseOnUnplug,
        resumeOnBluetooth,
        autoScanOnStartup,
        showTrackNotification,
        gaplessPlayback,
        setQueueBehavior,
        setPauseOnUnplug,
        setResumeOnBluetooth,
        setAutoScanOnStartup,
        setShowTrackNotification,
        setGaplessPlayback,
    } = useSettingsStore();

    const queueOptions: { id: QueueBehavior; label: string; description: string; icon: string }[] = [
        { id: 'addToEnd', label: 'Add to End', description: 'Append songs to queue', icon: 'playlist-plus' },
        { id: 'playNext', label: 'Play Next', description: 'Insert after current song', icon: 'playlist-play' },
        { id: 'clearAndPlay', label: 'Replace', description: 'Clear queue and play', icon: 'playlist-remove' },
    ];

    const handleComplete = () => {
        // Settings are already saved via the store
        onComplete();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>

                {/* Completion badge */}
                <View style={styles.completionBadge}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.completionText}>Final Step</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>App Behavior</Text>
                <Text style={styles.description}>
                    Configure how Thorium works
                </Text>

                {/* Queue Behavior */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Default Queue Action</Text>
                    <Text style={styles.sectionDescription}>
                        What happens when you tap a song
                    </Text>

                    {queueOptions.map(option => (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.queueOption,
                                queueBehavior === option.id && styles.queueOptionActive
                            ]}
                            onPress={() => setQueueBehavior(option.id)}
                        >
                            <Icon
                                name={option.icon}
                                size={24}
                                color={queueBehavior === option.id ? colors.primary : colors.textSecondary}
                            />
                            <View style={styles.queueOptionText}>
                                <Text style={[
                                    styles.queueOptionLabel,
                                    queueBehavior === option.id && styles.queueOptionLabelActive
                                ]}>
                                    {option.label}
                                </Text>
                                <Text style={styles.queueOptionDescription}>
                                    {option.description}
                                </Text>
                            </View>
                            {queueBehavior === option.id && (
                                <Icon name="check-circle" size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Audio Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Audio Controls</Text>

                    <View style={styles.toggleItem}>
                        <View style={styles.toggleInfo}>
                            <Icon name="headphones-off" size={20} color={colors.textSecondary} />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>Pause on Unplug</Text>
                                <Text style={styles.toggleDescription}>
                                    Pause when headphones are disconnected
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={pauseOnUnplug}
                            onValueChange={setPauseOnUnplug}
                            trackColor={{ false: colors.surface, true: colors.primary + '50' }}
                            thumbColor={pauseOnUnplug ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    <View style={styles.toggleItem}>
                        <View style={styles.toggleInfo}>
                            <Icon name="bluetooth-audio" size={20} color={colors.textSecondary} />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>Resume on Bluetooth</Text>
                                <Text style={styles.toggleDescription}>
                                    Auto-resume when Bluetooth reconnects
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={resumeOnBluetooth}
                            onValueChange={setResumeOnBluetooth}
                            trackColor={{ false: colors.surface, true: colors.primary + '50' }}
                            thumbColor={resumeOnBluetooth ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    <View style={styles.toggleItem}>
                        <View style={styles.toggleInfo}>
                            <Icon name="waveform" size={20} color={colors.textSecondary} />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>Gapless Playback</Text>
                                <Text style={styles.toggleDescription}>
                                    Seamless transitions between tracks
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={gaplessPlayback}
                            onValueChange={setGaplessPlayback}
                            trackColor={{ false: colors.surface, true: colors.primary + '50' }}
                            thumbColor={gaplessPlayback ? colors.primary : colors.textSecondary}
                        />
                    </View>
                </View>

                {/* System Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>System</Text>

                    <View style={styles.toggleItem}>
                        <View style={styles.toggleInfo}>
                            <Icon name="refresh-auto" size={20} color={colors.textSecondary} />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>Auto-scan on Startup</Text>
                                <Text style={styles.toggleDescription}>
                                    Check for new music when app opens
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={autoScanOnStartup}
                            onValueChange={setAutoScanOnStartup}
                            trackColor={{ false: colors.surface, true: colors.primary + '50' }}
                            thumbColor={autoScanOnStartup ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    <View style={styles.toggleItem}>
                        <View style={styles.toggleInfo}>
                            <Icon name="bell-ring" size={20} color={colors.textSecondary} />
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleLabel}>Track Notifications</Text>
                                <Text style={styles.toggleDescription}>
                                    Show notification when track changes
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={showTrackNotification}
                            onValueChange={setShowTrackNotification}
                            trackColor={{ false: colors.surface, true: colors.primary + '50' }}
                            thumbColor={showTrackNotification ? colors.primary : colors.textSecondary}
                        />
                    </View>
                </View>

                {/* Ready message */}
                <View style={styles.readyMessage}>
                    <Icon name="rocket-launch" size={24} color={colors.primary} />
                    <Text style={styles.readyText}>
                        You're all set! Thorium is ready to play your music.
                    </Text>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                    <Text style={styles.completeButtonText}>Start Listening</Text>
                    <Icon name="music-note" size={20} color={colors.background} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    backButton: {
        padding: spacing.sm,
        marginLeft: -spacing.sm,
        marginBottom: spacing.md,
    },
    completionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.success + '20',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    completionText: {
        fontSize: typography.sizes.sm,
        color: colors.success,
        fontWeight: typography.weights.semibold,
        marginLeft: spacing.xs,
    },
    title: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    sectionDescription: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    queueOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    queueOptionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    queueOptionText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    queueOptionLabel: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
        color: colors.textSecondary,
    },
    queueOptionLabelActive: {
        color: colors.text,
    },
    queueOptionDescription: {
        fontSize: typography.sizes.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    toggleText: {
        flex: 1,
        marginLeft: spacing.md,
        marginRight: spacing.md,
    },
    toggleLabel: {
        fontSize: typography.sizes.md,
        color: colors.text,
    },
    toggleDescription: {
        fontSize: typography.sizes.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    readyMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary + '10',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xxl,
    },
    readyText: {
        fontSize: typography.sizes.sm,
        color: colors.text,
        marginLeft: spacing.md,
        flex: 1,
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    completeButton: {
        backgroundColor: colors.success,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    completeButtonText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.background,
        marginRight: spacing.sm,
    },
});

export default ConfigurationScreen;
