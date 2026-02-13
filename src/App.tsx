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
    // This declares a functional component named 'App'. 'React.FC' is a TypeScript type for functional components.
    // The arrow function '() => {}' defines the component's body, which will return JSX (the UI).
    const [isInitializing, setIsInitializing] = useState(true);
    // 'useState' is a React hook that creates state. It returns [currentValue, setterFunction].
    // 'isInitializing' starts as 'true' (boolean). 'setIsInitializing' changes it later.
    // This tracks if the app is still loading.
    const [initError, setInitError] = useState<string | null>(null);
    // Another useState for error messages. Type is 'string | null' (string or nothing).
    // Starts as 'null', meaning no error yet.

    const [showOnboarding, setShowOnboarding] = useState(false);
    // Boolean state for whether to show the onboarding screen. Starts false.
    const [onboardingChecked, setOnboardingChecked] = useState(false);
    // Tracks if we've checked onboarding status. Starts false.
    const initializePlayer = usePlayerStore(state => state.initialize);
    // 'usePlayerStore' is a Zustand hook for global state. It selects 'initialize' function from the store.
    // This is for setting up the audio player.
    const loadLibrary = useLibraryStore(state => state.loadLibrary);
    // Selects 'loadLibrary' from the library store to load music data.
    const loadQueues = useQueueStore(state => state.loadQueues);
    // Selects 'loadQueues' to load playback queues.
    const loadSettings = useSettingsStore(state => state.loadSettings);
    // Selects 'loadSettings' to load user settings.
    const { autoScanOnStartup } = useSettingsStore();
    // Destructures 'autoScanOnStartup' from settings store. This is a value, not a function.
    useEffect(() => {
        // 'useEffect' is a hook that runs side effects. The function inside runs when the component mounts.
        // Empty dependency array '[]' means it runs only once, like componentDidMount in class components.
        checkOnboarding();
        // Calls the 'checkOnboarding' function to see if user has completed setup.
    }, []);
    const checkOnboarding = async () => {
        // 'const' declares a constant function. 'async' means it can use 'await' for promises (async operations).
        // This function checks if the user has finished the onboarding process.
        try {
            // 'try' block for error handling. Code inside runs, and 'catch' handles errors.
            const onboardingComplete = await checkOnboardingComplete();
            // 'await' waits for the promise to resolve. 'checkOnboardingComplete' returns true/false.
            console.log('[App] Onboarding complete:', onboardingComplete);
            // 'console.log' prints to the console for debugging.
            if (onboardingComplete) {
                // 'if' statement: if true, run this block.
                setShowOnboarding(false);
                // Calls the setter to hide onboarding.
                setOnboardingChecked(true);
                // Marks that we've checked onboarding.
                initializeApp();
                // Calls another function to start the app.
            } else {
                // 'else' runs if the condition is false.
                setShowOnboarding(true);
                setOnboardingChecked(true);
                setIsInitializing(false);
                // Stops the loading state.
            }
        } catch (error) {
            // 'catch' runs if an error occurs in 'try'.
            console.error('[App] Error checking onboarding:', error);
            // Logs the error.
            setShowOnboarding(true);
            setOnboardingChecked(true);
            setIsInitializing(false);
            // Fallback: show onboarding and stop loading.
        }
    };
    const handleOnboardingComplete = () => {
        // This function runs when onboarding finishes. It's passed to the OnboardingNavigator.
        setShowOnboarding(false);
        // Hides the onboarding screen.
        setIsInitializing(true);
        // Starts the initialization process.
        initializeApp();
        // Calls the main app setup function.
    };
    const initializeApp = async () => {
        // 'async' function for asynchronous operations. Uses 'await' to wait for promises.
        try {
            // 'try' for error handling.
            console.log('[App] Starting initialization...');
            // Logs a message for debugging.
            // Request notification permission FIRST (Android 13+/API 33+)
            // Must happen before TrackPlayer.setupPlayer() so the foreground service
            // notification is allowed to display from the very first playback
            if (Platform.OS === 'android' && (Platform.Version as number) >= 33) {
                // 'if' checks platform and version. 'Platform.OS' is 'android' or 'ios'.
                console.log('[App] Requesting notification permission...');
                const result = await PermissionsAndroid.request(
                    // 'await' waits for user permission response.
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    // Object with permission details.
                    {
                        title: 'Playback Notification',
                        message: 'Thorium needs notification access to show playback controls when playing music.',
                        buttonPositive: 'Allow',
                        buttonNegative: 'Deny',
                    }
                );
                console.log('[App] Notification permission:', result);
                // Logs the result.
            }

            // Initialize database
            console.log('[App] Initializing database...');
            await databaseService.initialize();
            // Calls service method asynchronously.
            console.log('[App] Database initialized');

            // Load UI settings from settingsStore
            console.log('[App] Loading UI settings...');
            await loadSettings();
            console.log('[App] UI settings loaded');

            // Initialize audio player
            console.log('[App] Initializing audio player...');
            await initializePlayer();
            // Calls the store function.
            console.log('[App] Audio player initialized');

            // Load settings and configure AI services
            console.log('[App] Loading app settings...');
            const settings = await databaseService.getSettings();
            // 'const' declares a variable. 'await' gets settings from database.
            console.log('[App] App settings loaded');

            if (settings.aiApiKey) {
                // 'if' checks if AI key exists.
                console.log('[App] Configuring AI services...');
                aiTagService.configure(settings.aiApiKey, settings.aiProvider);
                // Calls configure method on service.
                aiPlaylistService.configure(settings.aiApiKey, settings.aiProvider);
            }

            // Load library and queues
            console.log('[App] Loading library and queues...');
            await Promise.all([loadLibrary(), loadQueues()]);
            // 'Promise.all' runs multiple async functions in parallel.
            console.log('[App] Library and queues loaded');

            // Auto-scan if enabled in UI settings
            const uiSettings = useSettingsStore.getState();
            // Gets current state from store (not a hook, direct access).
            if (uiSettings.autoScanOnStartup) {
                console.log('[App] Starting auto-scan (user preference enabled)...');
                useLibraryStore.getState().scanForMusic(settings.scanFolders);
                // Calls scan method if setting is true.
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
            // Calls service to handle audio interruptions.
            console.log('[App] Audio focus service started');

            console.log('[App] Initialization complete');
            setIsInitializing(false);
            // Sets loading to false, app is ready.
        } catch (error) {
            // 'catch' handles any errors in 'try'.
            console.error('[App] Initialization error:', error);
            console.error('[App] Error details:', (error as any)?.message);
            // Logs error details.
            setInitError('Failed to initialize app. Please restart.');
            // Sets error message.
            setIsInitializing(false);
            // Stops loading.
        }
    };

    // Show onboarding if not completed
    if (onboardingChecked && showOnboarding) {
        // 'if' for conditional rendering: if onboarding not done, show this UI.
        return (
            // 'return' sends JSX to render. Parentheses allow multi-line.
            <GestureHandlerRootView style={styles.container}>
                // JSX element with 'style' prop (references StyleSheet).
                <StatusBar barStyle="light-content" backgroundColor={colors.background} />
                // Component for status bar styling.
                <OnboardingNavigator onComplete={handleOnboardingComplete} />
                // Custom component, passes 'onComplete' prop (function).
            </GestureHandlerRootView>
        );
    }

    if (isInitializing) {
        // Another conditional: if still loading, show loading screen.
        return (
            <View style={styles.loadingContainer}>
                // 'View' container with style.
                <StatusBar barStyle="light-content" />
                <Text style={styles.appName}>Thorium</Text>
                // 'Text' for displaying text, with style.
                <Text style={styles.appTagline}>Music Player</Text>
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                // Spinner component with props.
                <Text style={styles.loadingText}>Initializing...</Text>
            </View>
        );
    }

    if (initError) {
        // Conditional for error state.
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.errorText}>{initError}</Text>
                // Displays the error message from state.
            </View>
        );
    }

    return (
        // Main app UI: if no errors/loading/onboarding, show this.
        <GestureHandlerRootView style={styles.container}>
            // Root wrapper for gestures.
            <SafeAreaProvider>
                // Provider for safe area (notches).
                <ThemeProvider>
                    // Context provider for theme.
                    <ToastProvider>
                        // Provider for toast notifications.
                        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
                        <Navigation />
                        // Main navigation component.
                    </ToastProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    // 'StyleSheet.create' optimizes styles. Object with style objects.
    container: {
        flex: 1,  // 'flex: 1' makes it take full space.
        backgroundColor: colors.background,  // References theme constant.
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',  // Centers children horizontally.
        justifyContent: 'center',  // Centers vertically.
    },
    appName: {
        fontSize: typography.sizes.display,  // Font size from theme.
        fontWeight: typography.weights.bold,
        color: colors.primary,
        marginBottom: 4,  // Spacing.
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
        padding: 24,  // Padding around content.
    },
    errorText: {
        fontSize: typography.sizes.md,
        color: colors.error,
        textAlign: 'center',  // Centers text.
    },
});

export default App;
// 'export default' makes 'App' the main export of this file.
