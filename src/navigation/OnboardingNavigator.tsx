// Onboarding Navigator - Handles the initial setup flow
import React, { useState } from 'react';
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

    const handleComplete = async () => {
        await setOnboardingComplete();
        onComplete();
    };

    const handleScannerNext = (settings: any) => {
        setScannerSettings(settings);
        setCurrentStep('ui');
    };

    const handleConfigNext = () => {
        if (scannerSettings && scannerSettings.folderPaths.length > 0) {
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
                if (!scannerSettings) {
                    return <WelcomeScreen onGetStarted={() => setCurrentStep('welcome')} />;
                }
                return (
                    <ScanProgressScreen
                        folderPaths={scannerSettings.folderPaths}
                        options={{
                            excludeFolders: scannerSettings.excludeFolders,
                            excludeRingtones: scannerSettings.excludeRingtones,
                            excludeNotifications: scannerSettings.excludeNotifications,
                            minDuration: scannerSettings.minDuration,
                        }}
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
