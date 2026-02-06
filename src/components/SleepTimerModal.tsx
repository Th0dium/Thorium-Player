// Sleep Timer Modal - Select timer duration or track count
// Presets: 15, 30, 45, 60 min + custom + track-based
import React, { memo, useCallback, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { useSleepTimerStore } from '@/services/SleepTimerService';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface SleepTimerModalProps {
    visible: boolean;
    onClose: () => void;
}

const PRESETS = [
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '45 min', minutes: 45 },
    { label: '60 min', minutes: 60 },
    { label: '90 min', minutes: 90 },
    { label: '2 hours', minutes: 120 },
];

const TRACK_PRESETS = [1, 2, 3, 5, 10];

const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();
    const isActive = useSleepTimerStore(s => s.isActive);
    const displayTime = useSleepTimerStore(s => s.displayTime);
    const mode = useSleepTimerStore(s => s.mode);
    const startTimer = useSleepTimerStore(s => s.startTimer);
    const startTrackTimer = useSleepTimerStore(s => s.startTrackTimer);
    const cancel = useSleepTimerStore(s => s.cancel);
    const extendTimer = useSleepTimerStore(s => s.extendTimer);

    const [customMinutes, setCustomMinutes] = useState('');
    const [fadeOut, setFadeOut] = useState(true);

    const handlePreset = useCallback((minutes: number) => {
        startTimer(minutes, fadeOut);
        onClose();
    }, [startTimer, fadeOut, onClose]);

    const handleTrackPreset = useCallback((tracks: number) => {
        startTrackTimer(tracks, fadeOut);
        onClose();
    }, [startTrackTimer, fadeOut, onClose]);

    const handleCustom = useCallback(() => {
        const mins = parseInt(customMinutes, 10);
        if (mins > 0) {
            startTimer(mins, fadeOut);
            setCustomMinutes('');
            onClose();
        }
    }, [customMinutes, startTimer, fadeOut, onClose]);

    const handleCancel = useCallback(() => {
        cancel();
        onClose();
    }, [cancel, onClose]);

    const handleExtend = useCallback((minutes: number) => {
        extendTimer(minutes);
    }, [extendTimer]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.surface }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Icon name="timer-outline" size={24} color={colors.primary} />
                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            Sleep Timer
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Active timer display */}
                        {isActive && (
                            <View style={[styles.activeSection, { backgroundColor: colors.primary + '15' }]}>
                                <Icon name="timer-sand" size={28} color={colors.primary} />
                                <View style={styles.activeInfo}>
                                    <Text style={[styles.activeLabel, { color: colors.textSecondary }]}>
                                        {mode === 'time' ? 'Time remaining' : 'Tracks remaining'}
                                    </Text>
                                    <Text style={[styles.activeTime, { color: colors.primary }]}>
                                        {displayTime}
                                    </Text>
                                </View>
                                <View style={styles.activeActions}>
                                    {mode === 'time' && (
                                        <TouchableOpacity
                                            style={[styles.extendButton, { borderColor: colors.primary }]}
                                            onPress={() => handleExtend(5)}
                                        >
                                            <Text style={[styles.extendText, { color: colors.primary }]}>+5 min</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.cancelButton, { backgroundColor: colors.error + '20' }]}
                                        onPress={handleCancel}
                                    >
                                        <Text style={[styles.cancelText, { color: colors.error }]}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Fade-out toggle */}
                        <TouchableOpacity
                            style={styles.fadeOutRow}
                            onPress={() => setFadeOut(!fadeOut)}
                        >
                            <Icon
                                name={fadeOut ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                size={22}
                                color={fadeOut ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[styles.fadeOutLabel, { color: colors.textPrimary }]}>
                                Fade out (30s)
                            </Text>
                        </TouchableOpacity>

                        {/* Time presets */}
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                            STOP AFTER TIME
                        </Text>
                        <View style={styles.presetGrid}>
                            {PRESETS.map(preset => (
                                <TouchableOpacity
                                    key={preset.minutes}
                                    style={[styles.presetButton, { backgroundColor: colors.surfaceElevated }]}
                                    onPress={() => handlePreset(preset.minutes)}
                                >
                                    <Text style={[styles.presetText, { color: colors.textPrimary }]}>
                                        {preset.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Custom time */}
                        <View style={styles.customRow}>
                            <TextInput
                                style={[styles.customInput, {
                                    color: colors.textPrimary,
                                    backgroundColor: colors.surfaceElevated,
                                    borderColor: colors.border,
                                }]}
                                placeholder="Custom (min)"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="number-pad"
                                value={customMinutes}
                                onChangeText={setCustomMinutes}
                            />
                            <TouchableOpacity
                                style={[styles.customButton, {
                                    backgroundColor: customMinutes ? colors.primary : colors.surfaceElevated,
                                }]}
                                onPress={handleCustom}
                                disabled={!customMinutes}
                            >
                                <Text style={[styles.customButtonText, {
                                    color: customMinutes ? '#fff' : colors.textTertiary,
                                }]}>
                                    Start
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Track-based presets */}
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                            STOP AFTER TRACKS
                        </Text>
                        <View style={styles.presetGrid}>
                            {TRACK_PRESETS.map(count => (
                                <TouchableOpacity
                                    key={count}
                                    style={[styles.presetButton, { backgroundColor: colors.surfaceElevated }]}
                                    onPress={() => handleTrackPreset(count)}
                                >
                                    <Text style={[styles.presetText, { color: colors.textPrimary }]}>
                                        {count} {count === 1 ? 'track' : 'tracks'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ height: spacing.xl }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        gap: spacing.sm,
    },
    title: {
        fontSize: typography.sizes.xl,
        fontWeight: '700',
        flex: 1,
    },
    closeButton: {
        padding: spacing.xs,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
    },
    activeSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    activeInfo: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    activeLabel: {
        fontSize: typography.sizes.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activeTime: {
        fontSize: typography.sizes.xxl,
        fontWeight: '700',
    },
    activeActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    extendButton: {
        borderWidth: 1,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    extendText: {
        fontSize: typography.sizes.sm,
        fontWeight: '600',
    },
    cancelButton: {
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    cancelText: {
        fontSize: typography.sizes.sm,
        fontWeight: '600',
    },
    fadeOutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    fadeOutLabel: {
        fontSize: typography.sizes.md,
    },
    sectionTitle: {
        fontSize: typography.sizes.xs,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginTop: spacing.sm,
    },
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    presetButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        minWidth: 90,
        alignItems: 'center',
    },
    presetText: {
        fontSize: typography.sizes.md,
        fontWeight: '500',
    },
    customRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    customInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.sizes.md,
    },
    customButton: {
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        justifyContent: 'center',
    },
    customButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: '600',
    },
});

export default memo(SleepTimerModal);
