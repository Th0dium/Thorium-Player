// Library Screen - Main library browser with tabs for tracks, albums, artists
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    RefreshControl,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLibraryStore } from '@/store/libraryStore';
import { useQueueStore } from '@/store/queueStore';
import { usePlayerStore } from '@/store/playerStore';
import TrackItem from '@/components/TrackItem';
import { Track } from '@/types';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

type TabType = 'tracks' | 'albums' | 'artists' | 'folders';

interface LibraryScreenProps {
    navigation: any;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState<TabType>('tracks');
    const [isSearching, setIsSearching] = useState(false);

    const {
        tracks,
        albums,
        artists,
        folders,
        isLoading,
        isScanning,
        searchQuery,
        searchResults,
        loadLibrary,
        scanForMusic,
        search,
        setSearchQuery,
    } = useLibraryStore();

    const { createQueue } = useQueueStore();
    const { currentTrack } = usePlayerStore();

    useEffect(() => {
        loadLibrary();
    }, []);

    const handleTrackPress = async (track: Track, index: number) => {
        const tracksToPlay = isSearching ? searchResults : tracks;
        await createQueue(tracksToPlay, {
            type: 'all',
            name: isSearching ? 'Search Results' : 'All Tracks',
        }, index);
    };

    const handleRefresh = async () => {
        await scanForMusic();
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        search(text);
    };

    const tabs: { key: TabType; label: string; icon: string }[] = [
        { key: 'tracks', label: 'Tracks', icon: 'music-note' },
        { key: 'albums', label: 'Albums', icon: 'album' },
        { key: 'artists', label: 'Artists', icon: 'account-music' },
        { key: 'folders', label: 'Folders', icon: 'folder-music' },
    ];

    const displayTracks = isSearching && searchQuery ? searchResults : tracks;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Library</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setIsSearching(!isSearching)}
                    >
                        <Icon
                            name={isSearching ? 'close' : 'magnify'}
                            size={24}
                            color={colors.textPrimary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Icon name="cog" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            {isSearching && (
                <View style={styles.searchContainer}>
                    <Icon name="magnify" size={20} color={colors.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search tracks, artists, albums..."
                        placeholderTextColor={colors.textTertiary}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Icon name="close-circle" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Tabs */}
            {!isSearching && (
                <View style={styles.tabsContainer}>
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Icon
                                name={tab.icon}
                                size={20}
                                color={activeTab === tab.key ? colors.primary : colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === tab.key && styles.tabTextActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Content */}
            {activeTab === 'tracks' || isSearching ? (
                <FlatList
                    data={displayTracks}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => (
                        <TrackItem
                            track={item}
                            isPlaying={currentTrack?.id === item.id}
                            onPress={() => handleTrackPress(item, index)}
                            onOptionsPress={() => {
                                // Show options modal
                            }}
                        />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={isScanning}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="music-note" size={48} color={colors.textTertiary} />
                            <Text style={styles.emptyText}>
                                {isLoading ? 'Loading...' : 'No tracks found'}
                            </Text>
                            <TouchableOpacity
                                style={styles.scanButton}
                                onPress={handleRefresh}
                            >
                                <Text style={styles.scanButtonText}>Scan for Music</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            ) : (
                <View style={styles.placeholderContainer}>
                    <Icon name={tabs.find(t => t.key === activeTab)?.icon || 'album'} size={48} color={colors.textTertiary} />
                    <Text style={styles.placeholderText}>
                        {activeTab === 'albums' && `${albums.length} Albums`}
                        {activeTab === 'artists' && `${artists.length} Artists`}
                        {activeTab === 'folders' && `${folders.length} Folders`}
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        color: colors.textPrimary,
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerButton: {
        padding: spacing.sm,
        marginLeft: spacing.sm,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    tabActive: {
        backgroundColor: colors.primary + '20',
    },
    tabText: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: typography.weights.medium,
    },
    listContent: {
        paddingBottom: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontSize: typography.sizes.lg,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    scanButton: {
        marginTop: spacing.lg,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
    },
    scanButtonText: {
        color: colors.textPrimary,
        fontWeight: typography.weights.medium,
    },
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        fontSize: typography.sizes.lg,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
});

export default LibraryScreen;
