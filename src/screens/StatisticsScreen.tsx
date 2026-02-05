// Statistics Screen - Display listening statistics and library insights
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { useLibraryStore } from '@/store/libraryStore';
import { databaseService } from '@/services/DatabaseService';
import { Track } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StatisticsScreenProps {
    navigation?: any;
}

interface Stats {
    totalTracks: number;
    totalListenTime: number;
    totalPlays: number;
    favoritesCount: number;
    averageRating: number;
    ratedCount: number;
    mostPlayedTrack: Track | null;
    recentlyPlayed: Track[];
    topArtists: { name: string; playCount: number }[];
    topGenres: { name: string; count: number }[];
}

const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ navigation }) => {
    const { colors } = useTheme();
    const { tracks, artists } = useLibraryStore();
    const [stats, setStats] = useState<Stats | null>(null);
    const [activeSection, setActiveSection] = useState<'overview' | 'mostPlayed' | 'recent' | 'favorites'>('overview');

    useEffect(() => {
        calculateStats();
    }, [tracks]);

    const calculateStats = async () => {
        const favorites = await databaseService.getFavorites();
        const recentlyPlayed = await databaseService.getRecentlyPlayed(10);
        const mostPlayed = await databaseService.getMostPlayed(10);

        // Calculate totals
        let totalListenTime = 0;
        let totalPlays = 0;
        let ratedCount = 0;
        let totalRating = 0;

        const artistPlayCounts = new Map<string, number>();
        const genreCounts = new Map<string, number>();

        tracks.forEach(track => {
            totalListenTime += track.totalListenTime || 0;
            totalPlays += track.playCount || 0;

            if (track.rating) {
                ratedCount++;
                totalRating += track.rating;
            }

            // Count plays by artist
            if (track.artist) {
                const current = artistPlayCounts.get(track.artist) || 0;
                artistPlayCounts.set(track.artist, current + (track.playCount || 0));
            }

            // Count by genre
            if (track.genre) {
                const current = genreCounts.get(track.genre) || 0;
                genreCounts.set(track.genre, current + 1);
            }
        });

        // Sort artists by play count
        const topArtists = Array.from(artistPlayCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, playCount]) => ({ name, playCount }));

        // Sort genres by count
        const topGenres = Array.from(genreCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        setStats({
            totalTracks: tracks.length,
            totalListenTime,
            totalPlays,
            favoritesCount: favorites.length,
            averageRating: ratedCount > 0 ? totalRating / ratedCount : 0,
            ratedCount,
            mostPlayedTrack: mostPlayed[0] || null,
            recentlyPlayed,
            topArtists,
            topGenres,
        });
    };

    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const formatTimeDetailed = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days} days, ${hours % 24}h`;
        }
        if (hours > 0) return `${hours} hours, ${minutes} mins`;
        return `${minutes} minutes`;
    };

    const renderStatCard = (icon: string, label: string, value: string, color?: string) => (
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: (color || colors.primary) + '20' }]}>
                <Icon name={icon} size={24} color={color || colors.primary} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const renderTrackItem = (track: Track, index: number) => (
        <View style={[styles.trackItem, { borderBottomColor: colors.border }]} key={track.id}>
            <Text style={styles.trackRank}>{index + 1}</Text>
            <View style={styles.trackCover}>
                {track.albumArt ? (
                    <Image source={{ uri: track.albumArt }} style={styles.trackImage} />
                ) : (
                    <View style={[styles.trackPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
                        <Icon name="music-note" size={20} color={colors.textTertiary} />
                    </View>
                )}
            </View>
            <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
            </View>
            <View style={styles.trackStats}>
                <Text style={styles.trackPlayCount}>{track.playCount || 0}</Text>
                <Icon name="play" size={14} color={colors.textTertiary} />
            </View>
        </View>
    );

    const styles = createStyles(colors);

    if (!stats) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loading}>
                    <Text style={styles.loadingText}>Calculating statistics...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Statistics</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content}>
                {/* Overview Section */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.statsGrid}>
                    {renderStatCard('music-note', 'Total Tracks', stats.totalTracks.toString())}
                    {renderStatCard('play-circle', 'Total Plays', stats.totalPlays.toString(), '#4CAF50')}
                    {renderStatCard('heart', 'Favorites', stats.favoritesCount.toString(), '#E91E63')}
                    {renderStatCard('clock-outline', 'Listen Time', formatTime(stats.totalListenTime), '#FF9800')}
                </View>

                {/* Listen Time Card */}
                <View style={[styles.bigStatCard, { backgroundColor: colors.primary + '20' }]}>
                    <Icon name="headphones" size={48} color={colors.primary} />
                    <View style={styles.bigStatInfo}>
                        <Text style={styles.bigStatValue}>{formatTimeDetailed(stats.totalListenTime)}</Text>
                        <Text style={styles.bigStatLabel}>Total listening time</Text>
                    </View>
                </View>

                {/* Most Played Track */}
                {stats.mostPlayedTrack && (
                    <>
                        <Text style={styles.sectionTitle}>Most Played Track</Text>
                        <View style={[styles.featuredCard, { backgroundColor: colors.surface }]}>
                            <View style={styles.featuredCover}>
                                {stats.mostPlayedTrack.albumArt ? (
                                    <Image source={{ uri: stats.mostPlayedTrack.albumArt }} style={styles.featuredImage} />
                                ) : (
                                    <View style={[styles.featuredPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
                                        <Icon name="music-note" size={40} color={colors.textTertiary} />
                                    </View>
                                )}
                            </View>
                            <View style={styles.featuredInfo}>
                                <Text style={styles.featuredTitle} numberOfLines={2}>
                                    {stats.mostPlayedTrack.title}
                                </Text>
                                <Text style={styles.featuredArtist} numberOfLines={1}>
                                    {stats.mostPlayedTrack.artist}
                                </Text>
                                <View style={styles.featuredStats}>
                                    <Icon name="play" size={16} color={colors.primary} />
                                    <Text style={styles.featuredPlayCount}>
                                        {stats.mostPlayedTrack.playCount} plays
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </>
                )}

                {/* Top Artists */}
                {stats.topArtists.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Top Artists</Text>
                        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
                            {stats.topArtists.map((artist, index) => (
                                <View key={artist.name} style={[styles.listItem, { borderBottomColor: colors.border }]}>
                                    <Text style={styles.listRank}>{index + 1}</Text>
                                    <View style={[styles.artistAvatar, { backgroundColor: getArtistColor(artist.name) }]}>
                                        <Text style={styles.artistInitial}>{artist.name[0]}</Text>
                                    </View>
                                    <Text style={styles.listName} numberOfLines={1}>{artist.name}</Text>
                                    <Text style={styles.listCount}>{artist.playCount} plays</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* Top Genres */}
                {stats.topGenres.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Top Genres</Text>
                        <View style={styles.genreGrid}>
                            {stats.topGenres.map((genre, index) => (
                                <View key={genre.name} style={[styles.genreChip, { backgroundColor: getGenreColor(index) }]}>
                                    <Text style={styles.genreName}>{genre.name}</Text>
                                    <Text style={styles.genreCount}>{genre.count} tracks</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* Recently Played */}
                {stats.recentlyPlayed.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Recently Played</Text>
                        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
                            {stats.recentlyPlayed.slice(0, 5).map((track, index) => renderTrackItem(track, index))}
                        </View>
                    </>
                )}

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
};

const getArtistColor = (name: string): string => {
    const hue = name.charCodeAt(0) * 10 % 360;
    return `hsl(${hue}, 50%, 40%)`;
};

const getGenreColor = (index: number): string => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    return colors[index % colors.length];
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        flex: 1,
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold as any,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 32,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold as any,
        color: colors.textPrimary,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing.xs,
    },
    statCard: {
        width: (SCREEN_WIDTH - spacing.md * 2 - spacing.xs * 4) / 2,
        padding: spacing.md,
        margin: spacing.xs,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    statValue: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold as any,
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    bigStatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginTop: spacing.lg,
    },
    bigStatInfo: {
        marginLeft: spacing.lg,
    },
    bigStatValue: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold as any,
        color: colors.textPrimary,
    },
    bigStatLabel: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    featuredCard: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    featuredCover: {
        width: 100,
        height: 100,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
    },
    featuredImage: {
        width: '100%',
        height: '100%',
    },
    featuredPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featuredInfo: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    featuredTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold as any,
        color: colors.textPrimary,
    },
    featuredArtist: {
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    featuredStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    featuredPlayCount: {
        fontSize: typography.sizes.md,
        color: colors.primary,
        fontWeight: typography.weights.semibold as any,
        marginLeft: spacing.xs,
    },
    listCard: {
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
    },
    listRank: {
        width: 24,
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.bold as any,
        color: colors.textTertiary,
    },
    artistAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    artistInitial: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold as any,
        color: '#FFF',
    },
    listName: {
        flex: 1,
        fontSize: typography.sizes.md,
        color: colors.textPrimary,
    },
    listCount: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    genreGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing.xs,
    },
    genreChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.round,
        margin: spacing.xs,
    },
    genreName: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold as any,
        color: '#FFF',
    },
    genreCount: {
        fontSize: typography.sizes.xs,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
    },
    trackRank: {
        width: 24,
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.bold as any,
        color: colors.textTertiary,
    },
    trackCover: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
        marginRight: spacing.md,
    },
    trackImage: {
        width: '100%',
        height: '100%',
    },
    trackPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackInfo: {
        flex: 1,
    },
    trackTitle: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
        color: colors.textPrimary,
    },
    trackArtist: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    trackStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trackPlayCount: {
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginRight: spacing.xs,
    },
    bottomSpacer: {
        height: 100,
    },
});

export default StatisticsScreen;
