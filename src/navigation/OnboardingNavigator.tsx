import React, { useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    WelcomeScreen,
    PermissionScreen,
    ScannerSetupScreen,
    UIPreferencesScreen,
    ConfigurationScreen,
    ScanProgressScreen,
} from '@/screens/onboarding';
import { colors } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';
// Zustand hook for settings state.
import songScannerService, { ScanProgress, ScanResults } from '@/services/SongScannerService';
// Service for scanning songs, with types for progress and results.

type OnboardingStep = 'welcome' | 'permission' | 'scanner' | 'ui' | 'config' | 'scanProgress';
// TypeScript union type: defines possible step values (like an enum).

interface OnboardingNavigatorProps {
    onComplete: () => void;
    // Interface for props: onComplete is a function called when onboarding finishes.
}

const ONBOARDING_COMPLETE_KEY = '@thorium_onboarding_complete';
// Constant string key for storing onboarding status in AsyncStorage.

export const checkOnboardingComplete = async (): Promise<boolean> => {
    // Exported async function: checks if onboarding is done. Returns a Promise<boolean>.
    try {
        // Try block for error handling.
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        // AsyncStorage.getItem retrieves stored value.
        return value === 'true';
        // Returns true if stored value is 'true', else false.
    } catch {
        // Catch ignores errors, returns false on failure.
        return false;
    }
};

export const setOnboardingComplete = async (): Promise<void> => {
    // Exported async function: marks onboarding as complete. Returns Promise<void> (no value).
    try {
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        // Stores 'true' in AsyncStorage.
    } catch (error) {
        console.error('Error saving onboarding state:', error);
        // Logs error if storage fails.
    }
};

const OnboardingNavigator: React.FC<OnboardingNavigatorProps> = ({ onComplete }) => {
    // Functional component with TypeScript: takes props (onComplete function).
    // Destructures onComplete from props.
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
    // useState hook: currentStep tracks the active onboarding screen, starts at 'welcome'.
    const [scannerSettings, setScannerSettings] = useState<{
        folderPaths: string[];
        excludeFolders?: string[];
        excludeRingtones?: boolean;
        excludeNotifications?: boolean;
        minDuration?: number;
    } | null>(null);
    // State for scanner config: object with folder paths, exclusions, etc. Starts null.
    const [scanProgress, setScanProgress] = useState<ScanProgress>({
        totalFound: 0,
        profiled: 0,
        inProgress: false,
        currentFile: '',
        percentage: 0,
    });
    // State for scan progress: tracks found files, progress percentage, etc.
    const [scanResults, setScanResults] = useState<ScanResults | null>(null);
    // State for scan results: final data from scan, starts null.
    const backgroundScanRef = useRef<Promise<ScanResults> | null>(null);
    // useRef: mutable ref to hold the background scan promise, persists across renders.

    const handleComplete = async () => {
        // Async function: called when onboarding finishes.
        // Save the selected scan folders to settings for future use
        if (scannerSettings?.folderPaths) {
            // Optional chaining: if scannerSettings exists and has folderPaths.
            useSettingsStore.getState().setScanFolders(scannerSettings.folderPaths);
            // Direct store access (not hook): saves folders to settings.
        }
        await setOnboardingComplete();
        // Calls exported function to mark onboarding as done.
        onComplete();
        // Calls prop function to notify parent (App) that onboarding is complete.
    };

    const handleScannerNext = (settings: any) => {
        // Function: called when user finishes scanner setup. 'settings' is config object.
        setScannerSettings(settings);
        // Saves settings to state.
        // Start background scan immediately
        startBackgroundScan(settings);
        // Calls function to start scanning in background.
        setCurrentStep('ui');
        // Moves to next step: UI preferences.
    };

    const startBackgroundScan = (settings: any) => {
        // Function: starts music scan asynchronously in background.
        // Start scan in background - don't wait for it
        backgroundScanRef.current = songScannerService.scanAndProfile(
            // Calls service method: scans and profiles songs.
            settings.folderPaths,
            // Folders to scan.
            {
                excludeFolders: settings.excludeFolders,
                excludeRingtones: settings.excludeRingtones,
                excludeNotifications: settings.excludeNotifications,
                minDuration: settings.minDuration,
            },
            // Options: exclusions and filters.
            {
                onProgress: (progress: ScanProgress) => {
                    setScanProgress(progress);
                    // Callback: updates progress state.
                },
                onComplete: (results: ScanResults) => {
                    setScanResults(results);
                    // Callback: saves results and stops progress.
                    setScanProgress(prev => ({ ...prev, inProgress: false }));
                },
                onError: (error: Error) => {
                    console.error('Background scan error:', error);
                    // Callback: logs error and stops progress.
                    setScanProgress(prev => ({ ...prev, inProgress: false }));
                },
            }
        );
        // Assigns the promise to ref for tracking.
    };

    const handleConfigNext = () => {
        // Function: called after config screen. Decides next step based on scan status.
        // If scan is still running, show progress screen
        if (scanProgress.inProgress) {
            // If scan is ongoing, go to progress screen.
            setCurrentStep('scanProgress');
        } else {
            // Else, finish onboarding.
            handleComplete();
        }
    };

    const handleScanComplete = () => {
        // Function: called when scan progress screen is done.
        handleComplete();
        // Finishes onboarding.
    };

    const renderScreen = () => {
        // Function: returns the JSX for the current onboarding step.
        switch (currentStep) {
            // Switch statement: checks currentStep and returns matching screen.
            case 'welcome':
                return (
                    <WelcomeScreen
                        onGetStarted={() => setCurrentStep('permission')}
                    // Prop: function to go to next step.
                    />
                );
            case 'permission':
                return (
                    <PermissionScreen
                        onNext={() => setCurrentStep('scanner')}
                        onBack={() => setCurrentStep('welcome')}
                    // Props: next and back functions.
                    />
                );
            case 'scanner':
                return (
                    <ScannerSetupScreen
                        onNext={handleScannerNext}
                        onBack={() => setCurrentStep('permission')}
                    // onNext calls custom handler.
                    />
                );
            case 'ui':
                return (
                    <UIPreferencesScreen
                        onNext={() => setCurrentStep('config')}
                        onBack={() => setCurrentStep('scanner')}
                    />
                );
            case 'config':
                return (
                    <ConfigurationScreen
                        onComplete={handleConfigNext}
                        onBack={() => setCurrentStep('ui')}
                    // onComplete calls handler to check scan status.
                    />
                );
            case 'scanProgress':
                return (
                    <ScanProgressScreen
                        progress={scanProgress}
                        isBackgroundScan={true}
                        onComplete={handleScanComplete}
                    // Props: progress data, background flag, complete handler.
                    />
                );
            default:
                // Default case: fallback to welcome if step is invalid.
                return (
                    <WelcomeScreen
                        onGetStarted={() => setCurrentStep('permission')}
                    />
                );
        }
    };

    return (
        // Main return: renders a View with the current screen.
        <View style={styles.container}>
            // View container with style.
            {renderScreen()}
            // Calls renderScreen to get the JSX for current step.
        </View>
    );
};

const styles = StyleSheet.create({
    // StyleSheet.create: optimizes styles for React Native.
    container: {
        flex: 1,  // Takes full available space.
        backgroundColor: colors.background,  // Uses theme color.
    },
});

export default OnboardingNavigator;
// Export default: makes the component importable as the main export.
