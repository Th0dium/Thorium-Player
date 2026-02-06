// Master Layout - Musicolet-style three-zone architecture
// Zone A: Navigation Header (Top tabs)
// Zone B: Dynamic Content Area
// Zone C: Persistent Mini-Player
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Animated,
    StatusBar,
    TextInput,
    LayoutAnimation,
    UIManager,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Screens
import NowPlayingScreen from '@/screens/NowPlayingScreen';
import QueueScreen from '@/screens/QueueScreen';
import LibraryScreen from '@/screens/LibraryScreen';
import SongsListScreen, { FilterType } from '@/screens/SongsListScreen';
import FoldersScreen from '@/screens/FoldersScreen';
import AlbumsScreen from '@/screens/AlbumsScreen';
import ArtistsScreen from '@/screens/ArtistsScreen';
import PlaylistsScreen from '@/screens/PlaylistsScreen';
import GenresScreen from '@/screens/GenresScreen';
import SongsScreen from '@/screens/SongsScreen';

// Components
import MiniPlayer from '@/components/MiniPlayer';
import AppMenu from '@/components/AppMenu';

// Stores & Theme
import { useSettingsStore, TabId, MAIN_TABS } from '@/store/settingsStore';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 64;
const TAB_BAR_HEIGHT = 48;

const MasterLayout: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const selectedTabs = useSettingsStore(state => state.selectedTabs);
    // Only subscribe to whether there's a track, not the track object itself
    // This prevents re-renders when track metadata updates
    const hasCurrentTrack = usePlayerStore(state => state.currentTrack !== null);

    const [activeTab, setActiveTab] = useState<TabId>('library');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    // Library sub-navigation state
    const [librarySubScreen, setLibrarySubScreen] = useState<string | null>(null);
    const [librarySubTitle, setLibrarySubTitle] = useState<string>('');

    const contentFade = useRef(new Animated.Value(1)).current;

    // Use main tabs (Queue, Playing, Library)
    const visibleTabs = MAIN_TABS;

    // Handle tab press with content fade animation
    const handleTabPress = useCallback((tabId: TabId) => {
        if (tabId === activeTab) return;
        // Fade out, switch, fade in
        Animated.timing(contentFade, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(tabId);
            setSearchQuery('');
            setIsSearchVisible(false);
            // Clear sub-screen when switching tabs
            setLibrarySubScreen(null);
            setLibrarySubTitle('');
            Animated.timing(contentFade, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start();
        });
    }, [activeTab, contentFade]);

    // Handle library navigation
    const handleLibraryNavigate = useCallback((screenId: string, params?: { title?: string }) => {
        setLibrarySubScreen(screenId);
        setLibrarySubTitle(params?.title || '');
    }, []);

    // Handle back from library sub-screen
    const handleLibraryBack = useCallback(() => {
        setLibrarySubScreen(null);
        setLibrarySubTitle('');
    }, []);

    // Handle mini-player press - switch to Playing tab
    const handleMiniPlayerPress = useCallback(() => {
        handleTabPress('nowPlaying');
    }, [handleTabPress]);

    // Toggle search visibility with animation
    const handleSearchToggle = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsSearchVisible(prev => !prev);
        if (isSearchVisible) {
            setSearchQuery('');
        }
    }, [isSearchVisible]);

    // Render the active screen content
    const renderContent = () => {
        // If Now Playing tab is selected, show the full player
        if (activeTab === 'nowPlaying') {
            return <NowPlayingScreen />;
        }

        const screenProps = {
            searchQuery,
            isSearchActive: isSearchVisible && searchQuery.length > 0,
        };

        // Check if we're in a sub-screen (works from any tab)
        if (librarySubScreen) {
            // Handle category screens
            const categoryFilters: Record<string, FilterType> = {
                'all-songs': 'all-songs',
                'favorites': 'favorites',
                'recently-added': 'recently-added',
                'recently-played': 'recently-played',
                'most-played': 'most-played',
                'not-played': 'not-played',
            };

            if (categoryFilters[librarySubScreen]) {
                return (
                    <SongsListScreen
                        filter={categoryFilters[librarySubScreen]}
                        title={librarySubTitle}
                        searchQuery={searchQuery}
                        isSearchActive={isSearchVisible && searchQuery.length > 0}
                        onBack={handleLibraryBack}
                    />
                );
            }

            // Handle playlist screens
            if (librarySubScreen.startsWith('playlist-')) {
                return (
                    <SongsListScreen
                        filter="playlist"
                        playlistId={librarySubScreen.replace('playlist-', '')}
                        title={librarySubTitle}
                        searchQuery={searchQuery}
                        isSearchActive={isSearchVisible && searchQuery.length > 0}
                        onBack={handleLibraryBack}
                    />
                );
            }

            // Handle album screens
            if (librarySubScreen.startsWith('album-')) {
                return (
                    <SongsListScreen
                        filter="album"
                        albumId={librarySubScreen.replace('album-', '')}
                        title={librarySubTitle}
                        searchQuery={searchQuery}
                        isSearchActive={isSearchVisible && searchQuery.length > 0}
                        onBack={handleLibraryBack}
                    />
                );
            }

            // Handle artist screens
            if (librarySubScreen.startsWith('artist-')) {
                return (
                    <SongsListScreen
                        filter="artist"
                        artistId={librarySubScreen.replace('artist-', '')}
                        title={librarySubTitle}
                        searchQuery={searchQuery}
                        isSearchActive={isSearchVisible && searchQuery.length > 0}
                        onBack={handleLibraryBack}
                    />
                );
            }

            // Handle genre screens
            if (librarySubScreen.startsWith('genre-')) {
                return (
                    <SongsListScreen
                        filter="genre"
                        genreId={librarySubScreen.replace('genre-', '')}
                        title={librarySubTitle}
                        searchQuery={searchQuery}
                        isSearchActive={isSearchVisible && searchQuery.length > 0}
                        onBack={handleLibraryBack}
                    />
                );
            }
        }

        switch (activeTab) {
            case 'queue':
                return <QueueScreen {...screenProps} />;
            case 'library':
                return <LibraryScreen {...screenProps} onNavigate={handleLibraryNavigate} />;
            case 'folders':
                return <FoldersScreen {...screenProps} />;
            case 'albums':
                return <AlbumsScreen {...screenProps} onAlbumPress={(album) => {
                    handleLibraryNavigate(`album-${album.id}`, { title: album.name });
                }} />;
            case 'artists':
                return <ArtistsScreen {...screenProps} onArtistPress={(artist) => {
                    handleLibraryNavigate(`artist-${artist.id}`, { title: artist.name });
                }} />;
            case 'playlists':
                return <PlaylistsScreen {...screenProps} onPlaylistPress={(playlist) => {
                    handleLibraryNavigate(`playlist-${playlist.id}`, { title: playlist.name });
                }} />;
            case 'genres':
                return <GenresScreen {...screenProps} onGenrePress={(genre) => {
                    handleLibraryNavigate(`genre-${genre.id}`, { title: genre.name });
                }} />;
            case 'songs':
                return <SongsScreen {...screenProps} />;
            default:
                return <LibraryScreen {...screenProps} onNavigate={handleLibraryNavigate} />;
        }
    };

    // Calculate mini-player visibility - hide on Playing tab
    const showMiniPlayer = hasCurrentTrack && activeTab !== 'nowPlaying';

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />

            {/* Zone A: Navigation Header */}
            <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.background }]}>
                <View style={styles.headerContent}>
                    {/* Tab Bar - Left side */}
                    <View style={styles.tabBar}>
                        {visibleTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    style={[
                                        styles.tab,
                                        isActive && [styles.tabActive, { borderBottomColor: colors.primary }],
                                    ]}
                                    onPress={() => handleTabPress(tab.id)}
                                    activeOpacity={0.7}
                                >
                                    <Icon
                                        name={tab.icon}
                                        size={22}
                                        color={isActive ? colors.primary : colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Header Actions - Right side */}
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleSearchToggle}
                        >
                            <Icon
                                name="magnify"
                                size={22}
                                color={colors.textPrimary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => setIsMenuVisible(true)}
                        >
                            <Icon
                                name="dots-vertical"
                                size={22}
                                color={colors.textPrimary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar (collapsible) */}
                {isSearchVisible && (
                    <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                        <Icon name="magnify" size={20} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.textPrimary }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={`Search ${visibleTabs.find(t => t.id === activeTab)?.label || 'library'}...`}
                            placeholderTextColor={colors.textTertiary}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Icon name="close-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </SafeAreaView>

            {/* Zone B: Dynamic Content Area */}
            <Animated.View style={[
                styles.content,
                {
                    paddingBottom: showMiniPlayer ? MINI_PLAYER_HEIGHT : 0,
                    opacity: contentFade,
                }
            ]}>
                {renderContent()}
            </Animated.View>

            {/* Zone C: Persistent Mini-Player */}
            {showMiniPlayer && (
                <View style={[
                    styles.miniPlayerContainer,
                    {
                        backgroundColor: colors.surfaceElevated,
                        paddingBottom: insets.bottom,
                    }
                ]}>
                    <MiniPlayer onPress={handleMiniPlayerPress} />
                </View>
            )}

            {/* App Menu */}
            <AppMenu
                visible={isMenuVisible}
                onClose={() => setIsMenuVisible(false)}
                onScan={() => {
                    useLibraryStore.getState().scanForMusic();
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        height: TAB_BAR_HEIGHT,
        paddingHorizontal: spacing.sm,
    },
    tabBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomWidth: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        padding: spacing.sm,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.sizes.md,
        marginLeft: spacing.sm,
        padding: 0,
    },
    content: {
        flex: 1,
    },
    miniPlayerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
});

export default MasterLayout;