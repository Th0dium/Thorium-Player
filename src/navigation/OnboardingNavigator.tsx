// Onboarding Navigator - Handles the initial setup flow
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
import songScannerService, { ScanProgress, ScanResults } from '@/services/SongScannerService';

type OnboardingStep = 'welcome' | 'permission' | 'scanner' | 'ui' | 'config' | 'scanProgress';

interface OnboardingNavigatorProps {
    onComplete: () => void;
}

const ONBOARDING_COMPLETE_KEY = '@thorium_onboarding_complete';

export const checkOnboardingComplete = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        return value === 'true';
    } catch {
        return false;
    }
};

export const setOnboardingComplete = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch (error) {
        console.error('Error saving onboarding state:', error);
    }
};

const OnboardingNavigator: React.FC<OnboardingNavigatorProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
    const [scannerSettings, setScannerSettings] = useState<{
        folderPaths: string[];
        excludeFolders?: string[];
        excludeRingtones?: boolean;
        excludeNotifications?: boolean;
        minDuration?: number;
    } | null>(null);
    const [scanProgress, setScanProgress] = useState<ScanProgress>({
        totalFound: 0,
        profiled: 0,
        inProgress: false,
        currentFile: '',
        percentage: 0,
    });
    const [scanResults, setScanResults] = useState<ScanResults | null>(null);
    const backgroundScanRef = useRef<Promise<ScanResults> | null>(null);

    const handleComplete = async () => {
        // Save the selected scan folders to settings for future use
        if (scannerSettings?.folderPaths) {
            useSettingsStore.getState().setScanFolders(scannerSettings.folderPaths);
        }
        await setOnboardingComplete();
        onComplete();
    };

    const handleScannerNext = (settings: any) => {
        setScannerSettings(settings);
        // Start background scan immediately
        startBackgroundScan(settings);
        setCurrentStep('ui');
    };

    const startBackgroundScan = (settings: any) => {
        // Start scan in background - don't wait for it
        backgroundScanRef.current = songScannerService.scanAndProfile(
            settings.folderPaths,
            {
                excludeFolders: settings.excludeFolders,
                excludeRingtones: settings.excludeRingtones,
                excludeNotifications: settings.excludeNotifications,
                minDuration: settings.minDuration,
            },
            {
                onProgress: (progress: ScanProgress) => {
                    setScanProgress(progress);
                },
                onComplete: (results: ScanResults) => {
                    setScanResults(results);
                    setScanProgress(prev => ({ ...prev, inProgress: false }));
                },
                onError: (error: Error) => {
                    console.error('Background scan error:', error);
                    setScanProgress(prev => ({ ...prev, inProgress: false }));
                },
            }
        );
    };

    const handleConfigNext = () => {
        // If scan is still running, show progress screen
        if (scanProgress.inProgress) {
            setCurrentStep('scanProgress');
        } else {
            handleComplete();
        }
    };

    const handleScanComplete = () => {
        handleComplete();
    };

    const renderScreen = () => {
        switch (currentStep) {
            case 'welcome':
                return (
                    <WelcomeScreen
                        onGetStarted={() => setCurrentStep('permission')}
                    />
                );
            case 'permission':
                return (
                    <PermissionScreen
                        onNext={() => setCurrentStep('scanner')}
                        onBack={() => setCurrentStep('welcome')}
                    />
                );
            case 'scanner':
                return (
                    <ScannerSetupScreen
                        onNext={handleScannerNext}
                        onBack={() => setCurrentStep('permission')}
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
                    />
                );
            case 'scanProgress':
                return (
                    <ScanProgressScreen
                        progress={scanProgress}
                        isBackgroundScan={true}
                        onComplete={handleScanComplete}
                    />
                );
            default:
                return (
                    <WelcomeScreen
                        onGetStarted={() => setCurrentStep('permission')}
                    />
                );
        }
    };

    return (
        <View style={styles.container}>
            {renderScreen()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
});

export default OnboardingNavigator;
