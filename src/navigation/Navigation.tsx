// Navigation - App navigation with MasterLayout
// Musicolet-style: Top tabs + Content + Mini-player
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Master Layout
import MasterLayout from './MasterLayout';

// Screens for stack navigation (detail screens)
import NowPlayingScreen from '@/screens/NowPlayingScreen';

// Store & Theme
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/context/ThemeContext';

// Settings screens
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { AppearanceSettingsScreen } from '@/screens/settings/AppearanceSettingsScreen';
import { PlaybackSettingsScreen } from '@/screens/settings/PlaybackSettingsScreen';
import { LibrarySettingsScreen } from '@/screens/settings/LibrarySettingsScreen';
import { DataBackupSettingsScreen } from '@/screens/settings/DataBackupSettingsScreen';
import { AdvancedSettingsScreen } from '@/screens/settings/AdvancedSettingsScreen';
import { UnsortedSettingsScreen } from '@/screens/settings/UnsortedSettingsScreen';
import { ThemePickerScreen } from '@/screens/settings/ThemePickerScreen';
import { AccentColorPickerScreen } from '@/screens/settings/AccentColorPickerScreen';
import { FolderSelectionScreen } from '@/screens/settings/FolderSelectionScreen';

// Type definitions for navigation
export type RootStackParamList = {
    Main: undefined;
    NowPlaying: undefined;
    Settings: undefined;
    AppearanceSettings: undefined;
    PlaybackSettings: undefined;
    LibrarySettings: undefined;
    DataBackupSettings: undefined;
    AdvancedSettings: undefined;
    UnsortedSettings: undefined;
    ThemePickerScreen: undefined;
    AccentColorPickerScreen: undefined;
    FolderSelection: undefined;
    AlbumDetail: { albumId: string };
    ArtistDetail: { artistId: string };
    PlaylistDetail: { playlistId: string };
    FolderBrowser: { path: string };
    GenreDetail: { genreName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigation: React.FC = () => {
    const loadSettings = useSettingsStore(state => state.loadSettings);
    const isLoaded = useSettingsStore(state => state.isLoaded);
    const reducedAnimations = useSettingsStore(state => state.reducedAnimations);
    const { colors, isDark } = useTheme();

    useEffect(() => {
        loadSettings();
    }, []);

    if (!isLoaded) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <NavigationContainer
                theme={{
                    dark: isDark,
                    colors: {
                        primary: colors.primary,
                        background: colors.background,
                        card: colors.surface,
                        text: colors.textPrimary,
                        border: colors.backgroundSecondary,
                        notification: colors.primary,
                    },
                }}
            >
                <Stack.Navigator
                    screenOptions={{
                        headerShown: true,
                        animation: reducedAnimations ? 'none' : 'simple_push',
                        headerStyle: {
                            backgroundColor: colors.surface,
                        },
                        headerTintColor: colors.text,
                        headerTitleStyle: {
                            fontWeight: '600',
                        },
                    }}
                >
                    <Stack.Screen
                        name="Main"
                        component={MasterLayout}
                        options={{ headerShown: false }}
                    />

                    {/* Settings Screens */}
                    <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{ title: 'Settings' }}
                    />
                    <Stack.Screen
                        name="AppearanceSettings"
                        component={AppearanceSettingsScreen}
                        options={{ title: 'Appearance' }}
                    />
                    <Stack.Screen
                        name="PlaybackSettings"
                        component={PlaybackSettingsScreen}
                        options={{ title: 'Playback' }}
                    />
                    <Stack.Screen
                        name="LibrarySettings"
                        component={LibrarySettingsScreen}
                        options={{ title: 'Library' }}
                    />
                    <Stack.Screen
                        name="DataBackupSettings"
                        component={DataBackupSettingsScreen}
                        options={{ title: 'Data & Backup' }}
                    />
                    <Stack.Screen
                        name="AdvancedSettings"
                        component={AdvancedSettingsScreen}
                        options={{ title: 'Advanced' }}
                    />
                    <Stack.Screen
                        name="UnsortedSettings"
                        component={UnsortedSettingsScreen}
                        options={{ title: 'Miscellaneous' }}
                    />
                    <Stack.Screen
                        name="ThemePickerScreen"
                        component={ThemePickerScreen}
                        options={{ title: 'Select Theme' }}
                    />
                    <Stack.Screen
                        name="AccentColorPickerScreen"
                        component={AccentColorPickerScreen}
                        options={{ title: 'Select Accent Color' }}
                    />
                    <Stack.Screen
                        name="FolderSelection"
                        component={FolderSelectionScreen}
                        options={{ title: 'Select Folders to Scan' }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default Navigation;
