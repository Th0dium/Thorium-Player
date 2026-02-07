// App Entry Point - Main application component
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, Platform, PermissionsAndroid } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from '@/navigation/Navigation';
import OnboardingNavigator, { checkOnboardingComplete } from '@/navigation/OnboardingNavigator';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useQueueStore } from '@/store/queueStore';
import { useSettingsStore } from '@/store/settingsStore';
import { databaseService } from '@/services/DatabaseService';
import { aiTagService } from '@/services/AITagService';
import { aiPlaylistService } from '@/services/AIPlaylistService';
import { audioFocusService } from '@/services/AudioFocusService';
import { audioService } from '@/services/AudioService';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/Toast';
import { colors, typography } from '@/constants/theme';

const App: React.FC = () => {
    const [isInitializing, setIsInitializing] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingChecked, setOnboardingChecked] = useState(false);

    const initializePlayer = usePlayerStore(state => state.initialize);
    const loadLibrary = useLibraryStore(state => state.loadLibrary);
    const loadQueues = useQueueStore(state => state.loadQueues);
    const loadSettings = useSettingsStore(state => state.loadSettings);
    const { autoScanOnStartup } = useSettingsStore();

    useEffect(() => {
        checkOnboarding();
    }, []);

    const checkOnboarding = async () => {
        try {
            const onboardingComplete = await checkOnboardingComplete();
            console.log('[App] Onboarding complete:', onboardingComplete);
            if (onboardingComplete) {
                setShowOnboarding(false);
                setOnboardingChecked(true);
                initializeApp();
            } else {
                setShowOnboarding(true);
                setOnboardingChecked(true);
                setIsInitializing(false);
            }
        } catch (error) {
            console.error('[App] Error checking onboarding:', error);
            setShowOnboarding(true);
            setOnboardingChecked(true);
            setIsInitializing(false);
        }
    };

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        setIsInitializing(true);
        initializeApp();
    };

    const initializeApp = async () => {
        try {
            console.log('[App] Starting initialization...');

            // Request notification permission FIRST (Android 13+/API 33+)
            // Must happen before TrackPlayer.setupPlayer() so the foreground service
            // notification is allowed to display from the very first playback
            if (Platform.OS === 'android' && (Platform.Version as number) >= 33) {
                console.log('[App] Requesting notification permission...');
                const result = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: 'Playback Notification',
                        message: 'Thorium needs notification access to show playback controls when playing music.',
                        buttonPositive: 'Allow',
                        buttonNegative: 'Deny',
                    }
                );
                console.log('[App] Notification permission:', result);
            }

            // Initialize database
            console.log('[App] Initializing database...');
            await databaseService.initialize();
            console.log('[App] Database initialized');

            // Load UI settings from settingsStore
            console.log('[App] Loading UI settings...');
            await loadSettings();
            console.log('[App] UI settings loaded');

            // Initialize audio player
            console.log('[App] Initializing audio player...');
            await initializePlayer();
            console.log('[App] Audio player initialized');

            // Load settings and configure AI services
            console.log('[App] Loading app settings...');
            const settings = await databaseService.getSettings();
            console.log('[App] App settings loaded');

            if (settings.aiApiKey) {
                console.log('[App] Configuring AI services...');
                aiTagService.configure(settings.aiApiKey, settings.aiProvider);
                aiPlaylistService.configure(settings.aiApiKey, settings.aiProvider);
            }

            // Load library and queues
            console.log('[App] Loading library and queues...');
            await Promise.all([loadLibrary(), loadQueues()]);
            console.log('[App] Library and queues loaded');

            // Auto-scan if enabled in UI settings
            const uiSettings = useSettingsStore.getState();
            if (uiSettings.autoScanOnStartup) {
                console.log('[App] Starting auto-scan (user preference enabled)...');
                useLibraryStore.getState().scanForMusic(settings.scanFolders);
            }

            // Apply gapless playback setting
            if (uiSettings.gaplessPlayback) {
                console.log('[App] Gapless playback enabled');
                // Note: react-native-track-player handles gapless by default
                // Additional configuration would go here for custom implementations
            }

            // Start audio focus service for headphone/Bluetooth handling
            console.log('[App] Starting audio focus service...');
            audioFocusService.startListening();
            console.log('[App] Audio focus service started');

            console.log('[App] Initialization complete');
            setIsInitializing(false);
        } catch (error) {
            console.error('[App] Initialization error:', error);
            console.error('[App] Error details:', (error as any)?.message);
            setInitError('Failed to initialize app. Please restart.');
            setIsInitializing(false);
        }
    };

    // Show onboarding if not completed
    if (onboardingChecked && showOnboarding) {
        return (
            <GestureHandlerRootView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.background} />
                <OnboardingNavigator onComplete={handleOnboardingComplete} />
            </GestureHandlerRootView>
        );
    }

    if (isInitializing) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.appName}>Thorium</Text>
                <Text style={styles.appTagline}>Music Player</Text>
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                <Text style={styles.loadingText}>Initializing...</Text>
            </View>
        );
    }

    if (initError) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.errorText}>{initError}</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <ToastProvider>
                        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
                        <Navigation />
                    </ToastProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appName: {
        fontSize: typography.sizes.display,
        fontWeight: typography.weights.bold,
        color: colors.primary,
        marginBottom: 4,
    },
    appTagline: {
        fontSize: typography.sizes.lg,
        color: colors.textSecondary,
    },
    loader: {
        marginTop: 48,
    },
    loadingText: {
        fontSize: typography.sizes.md,
        color: colors.textTertiary,
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    errorText: {
        fontSize: typography.sizes.md,
        color: colors.error,
        textAlign: 'center',
    },
});

export default App;
