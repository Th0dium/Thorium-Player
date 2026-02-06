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

// Type definitions for navigation
export type RootStackParamList = {
    Main: undefined;
    NowPlaying: undefined;
    Settings: undefined;
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
                        headerShown: false,
                        animation: 'fade',
                    }}
                >
                    <Stack.Screen name="Main" component={MasterLayout} />
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
