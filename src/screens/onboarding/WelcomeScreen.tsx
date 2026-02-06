// Welcome Screen - Privacy-first introduction
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface WelcomeScreenProps {
    onGetStarted: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={[colors.background, colors.backgroundSecondary]}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    {/* Logo/Icon */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoCircle}>
                            <Image 
                                source={require('@/assets/logo.jpg')} 
                                style={styles.logoImage} 
                            />
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Thorium</Text>
                    <Text style={styles.subtitle}>Music Player</Text>

                    {/* Privacy Badge */}
                    <View style={styles.privacyBadge}>
                        <Icon name="shield-check" size={24} color={colors.success} />
                        <View style={styles.privacyText}>
                            <Text style={styles.privacyTitle}>100% Offline & Private</Text>
                            <Text style={styles.privacyDescription}>
                                No internet permission = No data tracking.{'\n'}
                                Your music stays on your device.
                            </Text>
                        </View>
                    </View>

                    {/* Features List */}
                    <View style={styles.featuresList}>
                        <FeatureItem icon="playlist-music" text="Multiple Queue Support" />
                        <FeatureItem icon="robot" text="AI-Powered Playlists" />
                        <FeatureItem icon="tune" text="Gapless Playback" />
                        <FeatureItem icon="folder-music" text="Folder-Based Organization" />
                    </View>
                </View>

                {/* Continue Button */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.continueButton} onPress={onGetStarted}>
                        <Text style={styles.continueButtonText}>Get Started</Text>
                        <Icon name="arrow-right" size={20} color={colors.background} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const FeatureItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
    <View style={styles.featureItem}>
        <Icon name={icon} size={20} color={colors.primary} />
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl * 2,
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: spacing.xl,
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
        overflow: 'hidden',
    },
    logoImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    title: {
        fontSize: 42,
        fontWeight: typography.weights.bold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: typography.sizes.lg,
        color: colors.textSecondary,
        marginBottom: spacing.xxl,
    },
    privacyBadge: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.success + '40',
    },
    privacyText: {
        marginLeft: spacing.md,
        flex: 1,
    },
    privacyTitle: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
        color: colors.success,
        marginBottom: spacing.xs,
    },
    privacyDescription: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    featuresList: {
        width: '100%',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    featureText: {
        fontSize: typography.sizes.md,
        color: colors.text,
        marginLeft: spacing.md,
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
    continueButtonText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.background,
        marginRight: spacing.sm,
    },
});

export default WelcomeScreen;
