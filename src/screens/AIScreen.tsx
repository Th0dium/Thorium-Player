// AI Screen - AI tag management and smart playlist creation
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { aiTagService } from '@/services/AITagService';
import { aiPlaylistService } from '@/services/AIPlaylistService';
import { useLibraryStore } from '@/store/libraryStore';
import { databaseService } from '@/services/DatabaseService';
import { Track, AITag } from '@/types';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

type TabType = 'create' | 'tags' | 'settings';

interface AIScreenProps {
    navigation: any;
}

const AIScreen: React.FC<AIScreenProps> = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState<TabType>('create');
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [allTags, setAllTags] = useState<AITag[]>([]);
    const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
    const [isTagging, setIsTagging] = useState(false);

    const tracks = useLibraryStore(state => state.tracks);
    const playlists = useLibraryStore(state => state.playlists);
    const refreshPlaylists = useLibraryStore(state => state.refreshPlaylists);

    useEffect(() => {
        loadTags();
    }, []);

    const loadTags = async () => {
        const tags = await aiTagService.getAllTags();
        setAllTags(tags);
    };

    const handleCreatePlaylist = async () => {
        if (!prompt.trim()) {
            Alert.alert('Error', 'Please enter a description for your playlist');
            return;
        }

        setIsGenerating(true);
        try {
            const playlist = await aiPlaylistService.createAndSavePlaylist({
                prompt: prompt.trim(),
                maxTracks: 25,
            });

            await refreshPlaylists();
            Alert.alert(
                'Playlist Created! 🎉',
                `"${playlist.name}" with ${playlist.trackIds.length} tracks`,
                [
                    { text: 'OK', onPress: () => setPrompt('') },
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to create playlist. Make sure you have an AI API key configured.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTagAllTracks = async () => {
        const untaggedTracks = tracks.filter(t => t.aiTags.length === 0);

        if (untaggedTracks.length === 0) {
            Alert.alert('Info', 'All tracks are already tagged!');
            return;
        }

        Alert.alert(
            'Tag All Tracks',
            `This will generate AI tags for ${untaggedTracks.length} untagged tracks. This may take a while and requires an API key.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start',
                    onPress: async () => {
                        setIsTagging(true);
                        try {
                            await aiTagService.generateTagsBatch(
                                untaggedTracks.map(t => ({
                                    trackId: t.id,
                                    title: t.title,
                                    artist: t.artist,
                                    album: t.album,
                                    genre: t.genre,
                                }))
                            );
                            await loadTags();
                            Alert.alert('Success', `Tagged ${untaggedTracks.length} tracks!`);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to tag tracks. Check your API key.');
                        } finally {
                            setIsTagging(false);
                        }
                    },
                },
            ]
        );
    };

    const promptSuggestions = [
        'Upbeat songs for morning workout',
        'Chill vibes for studying',
        'Late night drive playlist',
        'Romantic dinner music',
        'Party bangers',
        'Relaxing Sunday morning',
    ];

    const tagCategories = [
        { name: 'Mood', icon: 'emoticon-happy', color: colors.primary },
        { name: 'Genre', icon: 'guitar-electric', color: '#00E5FF' },
        { name: 'Activity', icon: 'run', color: '#FF9800' },
        { name: 'Era', icon: 'clock-outline', color: '#E91E63' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={[colors.aiGradientStart, colors.aiGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Icon name="robot" size={28} color={colors.textPrimary} />
                    <Text style={styles.headerTitle}>AI Features</Text>
                </View>
            </LinearGradient>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {[
                    { key: 'create' as TabType, label: 'Create Playlist', icon: 'playlist-plus' },
                    { key: 'tags' as TabType, label: 'Manage Tags', icon: 'tag-multiple' },
                    { key: 'settings' as TabType, label: 'Settings', icon: 'cog' },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Icon
                            name={tab.icon}
                            size={20}
                            color={activeTab === tab.key ? colors.aiPrimary : colors.textSecondary}
                        />
                        <Text
                            style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Create Playlist Tab */}
            {activeTab === 'create' && (
                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Create Smart Playlist</Text>
                    <Text style={styles.sectionSubtitle}>
                        Describe the mood, activity, or vibe you're looking for
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Energetic songs for a morning run"
                            placeholderTextColor={colors.textTertiary}
                            value={prompt}
                            onChangeText={setPrompt}
                            multiline
                            maxLength={200}
                        />
                        <TouchableOpacity
                            style={[styles.generateButton, !prompt.trim() && styles.generateButtonDisabled]}
                            onPress={handleCreatePlaylist}
                            disabled={isGenerating || !prompt.trim()}
                        >
                            {isGenerating ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <>
                                    <Icon name="sparkles" size={20} color={colors.background} />
                                    <Text style={styles.generateButtonText}>Generate</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.suggestionsTitle}>Try these:</Text>
                    <View style={styles.suggestionsContainer}>
                        {promptSuggestions.map((suggestion, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.suggestionChip}
                                onPress={() => setPrompt(suggestion)}
                            >
                                <Text style={styles.suggestionText}>{suggestion}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* AI Playlists */}
                    <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                        AI-Generated Playlists
                    </Text>
                    <FlatList
                        data={playlists.filter(p => p.isAIGenerated)}
                        keyExtractor={item => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.playlistCard}>
                                <LinearGradient
                                    colors={[colors.aiGradientStart + '40', colors.aiGradientEnd + '40']}
                                    style={styles.playlistGradient}
                                >
                                    <Icon name="playlist-music" size={32} color={colors.aiPrimary} />
                                    <Text style={styles.playlistName} numberOfLines={2}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.playlistCount}>
                                        {item.trackIds.length} tracks
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No AI playlists yet</Text>
                        }
                    />
                </View>
            )}

            {/* Tags Tab */}
            {activeTab === 'tags' && (
                <View style={styles.content}>
                    <View style={styles.tagStatsContainer}>
                        {tagCategories.map(category => {
                            const count = allTags.filter(
                                t => t.category.toLowerCase() === category.name.toLowerCase()
                            ).length;
                            return (
                                <View key={category.name} style={styles.tagStatCard}>
                                    <Icon name={category.icon} size={24} color={category.color} />
                                    <Text style={styles.tagStatCount}>{count}</Text>
                                    <Text style={styles.tagStatLabel}>{category.name}</Text>
                                </View>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        style={styles.tagAllButton}
                        onPress={handleTagAllTracks}
                        disabled={isTagging}
                    >
                        {isTagging ? (
                            <ActivityIndicator color={colors.textPrimary} />
                        ) : (
                            <>
                                <Icon name="auto-fix" size={20} color={colors.textPrimary} />
                                <Text style={styles.tagAllButtonText}>Tag All Untagged Tracks</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                        All Tags ({allTags.length})
                    </Text>
                    <View style={styles.allTagsContainer}>
                        {allTags.slice(0, 30).map(tag => (
                            <View
                                key={tag.id}
                                style={[styles.tagChip, { backgroundColor: tag.color + '30' }]}
                            >
                                <Text style={[styles.tagChipText, { color: tag.color }]}>
                                    {tag.name}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>AI Configuration</Text>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>API Provider</Text>
                            <Text style={styles.settingValue}>OpenAI</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={colors.textTertiary} />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>API Key</Text>
                            <Text style={styles.settingValue}>Not configured</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={colors.textTertiary} />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Auto-tag new tracks</Text>
                            <Text style={styles.settingValue}>Disabled</Text>
                        </View>
                        <Icon name="toggle-switch-off" size={32} color={colors.textTertiary} />
                    </View>
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
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
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
        backgroundColor: colors.aiPrimary + '20',
    },
    tabText: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    tabTextActive: {
        color: colors.aiPrimary,
        fontWeight: typography.weights.medium,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    sectionSubtitle: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    inputContainer: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    input: {
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.aiPrimary,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        marginTop: spacing.md,
    },
    generateButtonDisabled: {
        opacity: 0.5,
    },
    generateButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
        color: colors.background,
        marginLeft: spacing.xs,
    },
    suggestionsTitle: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    suggestionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    suggestionChip: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
    },
    suggestionText: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    playlistCard: {
        width: 140,
        height: 160,
        marginRight: spacing.md,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    playlistGradient: {
        flex: 1,
        padding: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playlistName: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    playlistCount: {
        fontSize: typography.sizes.xs,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    emptyText: {
        fontSize: typography.sizes.sm,
        color: colors.textTertiary,
        fontStyle: 'italic',
    },
    tagStatsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    tagStatCard: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginHorizontal: spacing.xs,
    },
    tagStatCount: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
        color: colors.textPrimary,
        marginTop: spacing.xs,
    },
    tagStatLabel: {
        fontSize: typography.sizes.xs,
        color: colors.textSecondary,
    },
    tagAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    tagAllButtonText: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
    },
    allTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.sm,
    },
    tagChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.round,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
    },
    tagChipText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
    },
    settingInfo: {
        flex: 1,
    },
    settingLabel: {
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
    },
    settingValue: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
});

export default AIScreen;
