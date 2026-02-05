// Master Layout - Musicolet-style three-zone architecture
// Zone A: Navigation Header (Top tabs)
// Zone B: Dynamic Content Area
// Zone C: Persistent Mini-Player
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ScrollView,
    Animated,
    StatusBar,
    TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import NowPlayingScreen from '@/screens/NowPlayingScreen';
import QueueScreen from '@/screens/QueueScreen';
import FoldersScreen from '@/screens/FoldersScreen';
import AlbumsScreen from '@/screens/AlbumsScreen';
import ArtistsScreen from '@/screens/ArtistsScreen';
import PlaylistsScreen from '@/screens/PlaylistsScreen';
import GenresScreen from '@/screens/GenresScreen';
import SongsScreen from '@/screens/SongsScreen';

// Components
import MiniPlayer from '@/components/MiniPlayer';

// Stores & Theme
import { useSettingsStore, TabId, ALL_TABS } from '@/store/settingsStore';
import { usePlayerStore } from '@/store/playerStore';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 64;
const TAB_BAR_HEIGHT = 48;

const MasterLayout: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { selectedTabs } = useSettingsStore();
    const { currentTrack } = usePlayerStore();

    const [activeTab, setActiveTab] = useState<TabId>(selectedTabs[0] || 'nowPlaying');
    const [isNowPlayingExpanded, setIsNowPlayingExpanded] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const tabScrollRef = useRef<ScrollView>(null);
    const nowPlayingAnim = useRef(new Animated.Value(0)).current;

    // Get visible tabs configuration
    const visibleTabs = useMemo(() => {
        return ALL_TABS.filter(tab => selectedTabs.includes(tab.id));
    }, [selectedTabs]);

    // Check if we need compact mode (icons only)
    const useCompactTabs = visibleTabs.length > 5;

    // Handle tab press
    const handleTabPress = useCallback((tabId: TabId) => {
        setActiveTab(tabId);
        setSearchQuery('');
        setIsSearchVisible(false);
    }, []);

    // Handle mini-player press - expand to full Now Playing
    const handleMiniPlayerPress = useCallback(() => {
        setIsNowPlayingExpanded(true);
        Animated.spring(nowPlayingAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, [nowPlayingAnim]);

    // Handle Now Playing collapse
    const handleNowPlayingCollapse = useCallback(() => {
        Animated.timing(nowPlayingAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setIsNowPlayingExpanded(false);
        });
    }, [nowPlayingAnim]);

    // Toggle search visibility
    const handleSearchToggle = useCallback(() => {
        setIsSearchVisible(prev => !prev);
        if (isSearchVisible) {
            setSearchQuery('');
        }
    }, [isSearchVisible]);

    // Render the active screen content
    const renderContent = () => {
        // If Now Playing tab is selected
        if (activeTab === 'nowPlaying') {
            return <NowPlayingScreen isExpanded={false} onCollapse={() => { }} />;
        }

        const screenProps = {
            searchQuery,
            isSearchActive: isSearchVisible && searchQuery.length > 0,
        };

        switch (activeTab) {
            case 'queue':
                return <QueueScreen {...screenProps} />;
            case 'folders':
                return <FoldersScreen {...screenProps} />;
            case 'albums':
                return <AlbumsScreen {...screenProps} />;
            case 'artists':
                return <ArtistsScreen {...screenProps} />;
            case 'playlists':
                return <PlaylistsScreen {...screenProps} />;
            case 'genres':
                return <GenresScreen {...screenProps} />;
            case 'songs':
                return <SongsScreen {...screenProps} />;
            default:
                return <SongsScreen {...screenProps} />;
        }
    };

    // Calculate mini-player visibility
    const showMiniPlayer = currentTrack && activeTab !== 'nowPlaying';

    // Animated styles for full-screen Now Playing overlay
    const nowPlayingTranslateY = nowPlayingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />

            {/* Zone A: Navigation Header */}
            <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.background }]}>
                <View style={styles.headerContent}>
                    {/* Tab Bar */}
                    <ScrollView
                        ref={tabScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.tabBar}
                        contentContainerStyle={styles.tabBarContent}
                    >
                        {visibleTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    style={[
                                        styles.tab,
                                        useCompactTabs && styles.tabCompact,
                                        isActive && [styles.tabActive, { borderBottomColor: colors.primary }],
                                    ]}
                                    onPress={() => handleTabPress(tab.id)}
                                    activeOpacity={0.7}
                                >
                                    <Icon
                                        name={tab.icon}
                                        size={useCompactTabs ? 22 : 18}
                                        color={isActive ? colors.primary : colors.textSecondary}
                                    />
                                    {!useCompactTabs && (
                                        <Text
                                            style={[
                                                styles.tabLabel,
                                                { color: isActive ? colors.primary : colors.textSecondary },
                                                isActive && styles.tabLabelActive,
                                            ]}
                                        >
                                            {tab.label}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Header Actions */}
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleSearchToggle}
                        >
                            <Icon
                                name={isSearchVisible ? 'close' : 'magnify'}
                                size={22}
                                color={colors.textPrimary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerButton}>
                            <Icon name="dots-vertical" size={22} color={colors.textPrimary} />
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
            <View style={[
                styles.content,
                { paddingBottom: showMiniPlayer ? MINI_PLAYER_HEIGHT : 0 }
            ]}>
                {renderContent()}
            </View>

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

            {/* Full-screen Now Playing Overlay */}
            {isNowPlayingExpanded && (
                <Animated.View
                    style={[
                        styles.nowPlayingOverlay,
                        {
                            transform: [{ translateY: nowPlayingTranslateY }],
                        },
                    ]}
                >
                    <NowPlayingScreen
                        isExpanded={true}
                        onCollapse={handleNowPlayingCollapse}
                    />
                </Animated.View>
            )}
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
    },
    tabBar: {
        flex: 1,
    },
    tabBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginRight: spacing.xs,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabCompact: {
        paddingHorizontal: spacing.md,
    },
    tabActive: {
        borderBottomWidth: 2,
    },
    tabLabel: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        marginLeft: spacing.xs,
    },
    tabLabelActive: {
        fontWeight: typography.weights.semibold,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: spacing.sm,
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
    nowPlayingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
});

export default MasterLayout;