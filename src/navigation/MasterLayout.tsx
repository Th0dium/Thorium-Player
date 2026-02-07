// Master Layout - Thorium Player three-zone architecture
// Zone A: Navigation Header (Top tabs)
// Zone B: Dynamic Content Area (Swipeable)
// Zone C: Mini-Player (Now integrated into Zone B pages for swiping)
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
    FlatList,
    NativeSyntheticEvent,
    NativeScrollEvent,
    BackHandler,
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
import TopTabBar from './TopTabBar';
import { useToast } from '@/components/Toast';

// Stores & Theme
import { useSettingsStore, TabId, MAIN_TABS } from '@/store/settingsStore';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 64;
const TAB_BAR_HEIGHT = 48;

const MasterLayout: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { showToast } = useToast();
    const hasCurrentTrack = usePlayerStore(state => state.currentTrack !== null);

    // Global navigation state from settingsStore
    const librarySubScreen = useSettingsStore(state => state.librarySubScreen);
    const librarySubTitle = useSettingsStore(state => state.librarySubTitle);
    const setLibraryNavigation = useSettingsStore(state => state.setLibraryNavigation);

    // Initialize to nowPlaying if there's a current track, otherwise library
    const [activeTab, setActiveTab] = useState<TabId>(() => hasCurrentTrack ? 'nowPlaying' : 'library');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    const scrollRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const visibleTabs = MAIN_TABS;
    const lastBackButtonPress = useRef(0);

    // Handle tab press - scroll to page
    const handleTabPress = useCallback((tabId: TabId) => {
        const index = visibleTabs.findIndex(t => t.id === tabId);
        if (index !== -1 && scrollRef.current) {
            scrollRef.current.scrollToIndex({ index, animated: true });
        }
    }, [visibleTabs]);

    // Handle scroll end to sync tab state
    const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (index >= 0 && index < visibleTabs.length) {
            const newTabId = visibleTabs[index].id;
            if (newTabId !== activeTab) {
                setActiveTab(newTabId);
                setSearchQuery('');
                setIsSearchVisible(false);
                // WE NO LONGER CLEAR librarySubScreen HERE TO PRESERVE STATE
            }
        }
    };

    // Handle library navigation
    const handleLibraryNavigate = useCallback((screenId: string, params?: { title?: string }) => {
        setLibraryNavigation(screenId, params?.title || '');
    }, [setLibraryNavigation]);

    // Handle back from library sub-screen
    const handleLibraryBack = useCallback(() => {
        setLibraryNavigation(null, '');
    }, [setLibraryNavigation]);

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

    // Handle hardware back button
    useEffect(() => {
        const onBackPress = () => {
            // 1. Close Menu
            if (isMenuVisible) {
                setIsMenuVisible(false);
                return true;
            }

            // 2. Close Search
            if (isSearchVisible) {
                handleSearchToggle();
                return true;
            }

            // 3. Library Sub-navigation
            if (activeTab === 'library' && librarySubScreen) {
                handleLibraryBack();
                return true;
            }

            // 4. Tab Navigation (Back to Home/NowPlaying)
            if (activeTab !== 'nowPlaying') {
                handleTabPress('nowPlaying');
                return true;
            }

            // 5. Double-press Exit logic (The "Popular Way")
            const now = Date.now();
            if (now - lastBackButtonPress.current < 2000) {
                BackHandler.exitApp();
                return true;
            }

            lastBackButtonPress.current = now;
            showToast('Press back again to exit', 'info');
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => subscription.remove();
    }, [isMenuVisible, isSearchVisible, activeTab, librarySubScreen, handleTabPress, handleLibraryBack, handleSearchToggle, showToast]);

    // Initial scroll to the default tab
    useEffect(() => {
        const index = visibleTabs.findIndex(t => t.id === activeTab);
        if (index !== -1 && scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollToIndex({ index, animated: false });
            }, 100);
        }
    }, []);

    // Render a single page content
    const renderPage = ({ item }: { item: typeof MAIN_TABS[0] }) => {
        const tabId = item.id;
        const showMiniPlayerInPage = hasCurrentTrack && tabId !== 'nowPlaying';
        const totalMiniPlayerHeight = MINI_PLAYER_HEIGHT + insets.bottom;

        const handleSongSelect = () => {
            handleTabPress('nowPlaying');
        };

        const screenProps = {
            searchQuery,
            isSearchActive: isSearchVisible && searchQuery.length > 0 && activeTab === tabId,
            onPlay: handleSongSelect,
            isFocused: activeTab === tabId,
        };

        const renderMiniPlayer = () => {
            if (!showMiniPlayerInPage) return null;
            return (
                <View style={[
                    styles.miniPlayerContainer,
                    {
                        backgroundColor: colors.surfaceElevated,
                        paddingBottom: insets.bottom,
                    }
                ]}>
                    <MiniPlayer onPress={handleMiniPlayerPress} />
                </View>
            );
        };

        let content = null;

        // Sub-screen logic (Now persistent)
        if (tabId === 'library' && librarySubScreen) {
            const categoryFilters: Record<string, FilterType> = {
                'all-songs': 'all-songs',
                'favorites': 'favorites',
                'recently-added': 'recently-added',
                'recently-played': 'recently-played',
                'most-played': 'most-played',
                'not-played': 'not-played',
            };

            if (categoryFilters[librarySubScreen]) {
                content = (
                    <SongsListScreen
                        filter={categoryFilters[librarySubScreen]}
                        title={librarySubTitle}
                        searchQuery={searchQuery}
                        isSearchActive={isSearchVisible && searchQuery.length > 0}
                        onBack={handleLibraryBack}
                        onPlay={handleSongSelect}
                    />
                );
            } else {
                let filter: FilterType | null = null;
                let idAttr: string | null = null;

                if (librarySubScreen.startsWith('playlist-')) { filter = 'playlist'; idAttr = librarySubScreen.replace('playlist-', ''); }
                else if (librarySubScreen.startsWith('album-')) { filter = 'album'; idAttr = librarySubScreen.replace('album-', ''); }
                else if (librarySubScreen.startsWith('artist-')) { filter = 'artist'; idAttr = librarySubScreen.replace('artist-', ''); }
                else if (librarySubScreen.startsWith('genre-')) { filter = 'genre'; idAttr = librarySubScreen.replace('genre-', ''); }

                if (filter && idAttr) {
                    content = (
                        <SongsListScreen
                            filter={filter}
                            {...{ [filter + 'Id']: idAttr }}
                            title={librarySubTitle}
                            searchQuery={searchQuery}
                            isSearchActive={isSearchVisible && searchQuery.length > 0}
                            onBack={handleLibraryBack}
                            onPlay={handleSongSelect}
                        />
                    );
                }
            }
        }

        if (!content) {
            switch (tabId) {
                case 'queue': content = <QueueScreen {...screenProps} />; break;
                case 'nowPlaying': content = <NowPlayingScreen />; break;
                case 'library': content = <LibraryScreen {...screenProps} onNavigate={handleLibraryNavigate} />; break;
                case 'folders': content = <FoldersScreen {...screenProps} />; break;
                case 'playlists': content = <PlaylistsScreen {...screenProps} onPlaylistPress={(p) => handleLibraryNavigate(`playlist-${p.id}`, { title: p.name })} />; break;
                case 'genres': content = <GenresScreen {...screenProps} onGenrePress={(g) => handleLibraryNavigate(`genre-${g.id}`, { title: g.name })} />; break;
                case 'songs': content = <SongsScreen {...screenProps} />; break;
                default: content = <LibraryScreen {...screenProps} onNavigate={handleLibraryNavigate} />;
            }
        }

        return (
            <View style={{ width: SCREEN_WIDTH, flex: 1 }} key={tabId}>
                <View style={{ flex: 1, paddingBottom: showMiniPlayerInPage ? totalMiniPlayerHeight : 0 }}>
                    {content}
                </View>
                {renderMiniPlayer()}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />

            {/* Zone A: Navigation Header */}
            <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.background }]}>
                <View style={styles.headerContent}>
                    <TopTabBar
                        tabs={visibleTabs}
                        activeTab={activeTab}
                        onTabPress={handleTabPress}
                        scrollX={scrollX}
                    />

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleSearchToggle}
                        >
                            <Icon name="magnify" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => setIsMenuVisible(true)}
                        >
                            <Icon name="dots-vertical" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

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

            {/* Zone B: Dynamic Content Area (Swipeable) */}
            <View style={styles.content}>
                <Animated.FlatList
                    ref={scrollRef}
                    data={visibleTabs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPage}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: true }
                    )}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    directionalLockEnabled={true}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_WIDTH,
                        offset: SCREEN_WIDTH * index,
                        index,
                    })}
                    windowSize={visibleTabs.length}
                    initialNumToRender={visibleTabs.length}
                    removeClippedSubviews={false}
                    scrollEventThrottle={16}
                />
            </View>

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
