// Permission Screen - Request storage permissions with clear explanation
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
    Platform,
    PermissionsAndroid,
    Linking,
    AppState,
    type AppStateStatus,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface PermissionScreenProps {
    onNext: () => void;
    onBack: () => void;
}

type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'blocked';

const PermissionScreen: React.FC<PermissionScreenProps> = ({ onNext, onBack }) => {
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
    const [isRequesting, setIsRequesting] = useState(false);

    const getRequiredPermissions = useCallback(() => {
        if (Platform.OS !== 'android') return [];
        const sdkInt = Platform.Version as number;
        const permissions = [];
        
        if (sdkInt >= 33) {
            permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO);
            permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        } else {
            permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }
        
        return permissions;
    }, []);

    const checkPermission = useCallback(async () => {
        try {
            if (Platform.OS === 'ios') {
                setPermissionStatus('granted');
                return;
            }

            const permissions = getRequiredPermissions();
            if (permissions.length === 0) return;

            const results = await Promise.all(
                permissions.map(p => PermissionsAndroid.check(p))
            );
            
            const allGranted = results.every(result => result === true);
            setPermissionStatus(allGranted ? 'granted' : 'undetermined');
        } catch (error) {
            console.error('[Permission] Error checking permission:', error);
        }
    }, [getRequiredPermissions]);

    // Check permission on mount
    useEffect(() => {
        checkPermission();
    }, [checkPermission]);

    // Re-check when app comes back from settings
    useEffect(() => {
        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                checkPermission();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [checkPermission]);

    const requestPermission = async () => {
        if (isRequesting) return;
        setIsRequesting(true);

        try {
            if (Platform.OS !== 'android') {
                setPermissionStatus('granted');
                setIsRequesting(false);
                return;
            }

            const permissions = getRequiredPermissions();
            if (permissions.length === 0) {
                setIsRequesting(false);
                return;
            }

            const results = await PermissionsAndroid.requestMultiple(permissions);
            console.log('[Permission] Request results:', results);

            const allGranted = permissions.every(
                p => results[p] === PermissionsAndroid.RESULTS.GRANTED
            );
            
            const anyBlocked = permissions.some(
                p => results[p] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
            );

            if (allGranted) {
                setPermissionStatus('granted');
            } else if (anyBlocked) {
                setPermissionStatus('blocked');
            } else {
                setPermissionStatus('denied');
            }
        } catch (error) {
            console.error('[Permission] Error requesting permission:', error);
            setPermissionStatus('denied');
        } finally {
            setIsRequesting(false);
        }
    };

    const openSettings = () => {
        Linking.openSettings();
    };

    const handleContinue = () => {
        if (permissionStatus === 'granted') {
            onNext();
        } else if (permissionStatus === 'blocked') {
            openSettings();
        } else {
            requestPermission();
        }
    };

    const getIconName = () => {
        switch (permissionStatus) {
            case 'granted': return 'check';
            case 'blocked': return 'cog';
            case 'denied': return 'folder-music-outline';
            default: return 'folder-music';
        }
    };

    const getTitle = () => {
        switch (permissionStatus) {
            case 'granted': return 'Permission Granted!';
            case 'blocked': return 'Permission Required';
            case 'denied': return 'Permission Denied';
            default: return 'Audio Access';
        }
    };

    const getDescription = () => {
        switch (permissionStatus) {
            case 'granted':
                return 'Great! Thorium can now see your music files.';
            case 'blocked':
                return 'Permission was blocked. Please enable audio access in your device settings to continue.';
            case 'denied':
                return 'Permission was denied. Tap below to try again.';
            default:
                return 'Thorium needs access to your audio files to discover and play your music collection.';
        }
    };

    const getButtonText = () => {
        if (isRequesting) return 'Requesting...';
        switch (permissionStatus) {
            case 'granted': return 'Continue';
            case 'blocked': return 'Open Settings';
            default: return 'Allow Audio Access';
        }
    };

    const getButtonIcon = () => {
        switch (permissionStatus) {
            case 'granted': return 'arrow-right';
            case 'blocked': return 'open-in-new';
            default: return 'shield-check';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.content}>
                {/* Header */}
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>

                {/* Progress indicator */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                    <View style={styles.progressDot} />
                    <View style={styles.progressDot} />
                </View>

                {/* Icon */}
                <View style={styles.iconContainer}>
                    <View style={[
                        styles.iconCircle,
                        permissionStatus === 'granted' && styles.iconCircleGranted,
                        permissionStatus === 'blocked' && styles.iconCircleBlocked,
                        permissionStatus === 'denied' && styles.iconCircleDenied,
                    ]}>
                        <Icon
                            name={getIconName()}
                            size={48}
                            color={
                                permissionStatus === 'granted' ? colors.success :
                                    permissionStatus === 'blocked' ? colors.warning :
                                        permissionStatus === 'denied' ? colors.error :
                                            colors.primary
                            }
                        />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>{getTitle()}</Text>
                <Text style={styles.description}>{getDescription()}</Text>

                {/* What we access info */}
                {permissionStatus !== 'granted' && (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>Thorium needs access to:</Text>
                        <View style={styles.infoItem}>
                            <Icon name="music-note" size={18} color={colors.primary} />
                            <Text style={styles.infoText}>Audio files & metadata</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Icon name="bell-outline" size={18} color={colors.primary} />
                            <Text style={styles.infoText}>Playback notifications</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Icon name="image" size={18} color={colors.primary} />
                            <Text style={styles.infoText}>Album artwork</Text>
                        </View>
                    </View>
                )}

                {/* Privacy note */}
                <View style={styles.privacyNote}>
                    <Icon name="shield-lock" size={16} color={colors.success} />
                    <Text style={styles.privacyText}>
                        Your files stay on your device. We never upload anything.
                    </Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        permissionStatus === 'granted' && styles.continueButtonGranted,
                        permissionStatus === 'blocked' && styles.continueButtonWarning,
                        isRequesting && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={isRequesting}
                    activeOpacity={0.8}
                >
                    <Text style={styles.continueButtonText}>{getButtonText()}</Text>
                    <Icon name={getButtonIcon()} size={20} color={colors.background} />
                </TouchableOpacity>

                {permissionStatus === 'blocked' && (
                    <Text style={styles.settingsHint}>
                        After enabling, return to the app to continue.
                    </Text>
                )}
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
        marginBottom: spacing.lg,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.xxl,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.surface,
        marginHorizontal: spacing.xs,
    },
    progressDotActive: {
        backgroundColor: colors.primary,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
    },
    iconCircleGranted: {
        borderColor: colors.success,
        backgroundColor: colors.success + '20',
    },
    iconCircleBlocked: {
        borderColor: colors.warning,
        backgroundColor: colors.warning + '20',
    },
    iconCircleDenied: {
        borderColor: colors.error,
        backgroundColor: colors.error + '20',
    },
    title: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    description: {
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    infoBox: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    infoTitle: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
        color: colors.text,
        marginBottom: spacing.md,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    infoText: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginLeft: spacing.md,
    },
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    privacyText: {
        fontSize: typography.sizes.sm,
        color: colors.success,
        marginLeft: spacing.sm,
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    continueButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButtonGranted: {
        backgroundColor: colors.success,
    },
    continueButtonWarning: {
        backgroundColor: colors.warning,
    },
    continueButtonDisabled: {
        opacity: 0.7,
    },
    continueButtonText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.background,
        marginRight: spacing.sm,
    },
    settingsHint: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});

export default PermissionScreen;
