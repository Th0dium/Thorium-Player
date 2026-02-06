// Database Service - Local storage for playlists, queues, settings, and track data
// Implements extended song profiling as per DATA SYSTEM specification
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, Playlist, Queue, Settings, AITag, SongMetadata, PlaylistEntry, PlaybackState, ABRepeatState } from '@/types';

const STORAGE_KEYS = {
    TRACKS: '@thorium/tracks',
    PLAYLISTS: '@thorium/playlists',
    QUEUES: '@thorium/queues',
    SETTINGS: '@thorium/settings',
    AI_TAGS: '@thorium/ai_tags',
    LAST_QUEUE: '@thorium/last_queue',
    BACKUP: '@thorium/backup',
    SONG_METADATA: '@thorium/song_metadata',
    PLAYLIST_ENTRIES: '@thorium/playlist_entries',
    PLAYBACK_STATE: '@thorium/playback_state',
    AB_REPEAT: '@thorium/ab_repeat',
};

const DEFAULT_SETTINGS: Settings = {
    gaplessPlayback: true,
    crossfadeDuration: 0,
    playbackSpeed: 1.0,
    scanFolders: [],
    excludeFolders: ['/storage/emulated/0/Android', '/storage/emulated/0/.'],
    autoScanOnStartup: false,
    theme: 'dark',
    accentColor: '#7C4DFF',
    aiProvider: 'openai',
    autoTagEnabled: false,
    sleepTimerFadeOut: true,
    equalizerEnabled: false,
    equalizerPreset: 'flat',
    equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

class DatabaseService {
    private static instance: DatabaseService;
    private cache: {
        tracks: Map<string, Track>;
        playlists: Map<string, Playlist>;
        queues: Map<string, Queue>;
        settings: Settings | null;
        songMetadata: Map<string, SongMetadata>;
        playlistEntries: PlaylistEntry[];
        playbackState: PlaybackState | null;
        abRepeat: ABRepeatState | null;
    } = {
            tracks: new Map(),
            playlists: new Map(),
            queues: new Map(),
            settings: null,
            songMetadata: new Map(),
            playlistEntries: [],
            playbackState: null,
            abRepeat: null,
        };

    private constructor() { }

    static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    // Initialize and load cache
    async initialize(): Promise<void> {
        await this.loadCache();
    }

    private async loadCache(): Promise<void> {
        try {
            const [tracksJson, playlistsJson, queuesJson, settingsJson, metadataJson, entriesJson, playbackJson, abRepeatJson] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.TRACKS),
                AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS),
                AsyncStorage.getItem(STORAGE_KEYS.QUEUES),
                AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
                AsyncStorage.getItem(STORAGE_KEYS.SONG_METADATA),
                AsyncStorage.getItem(STORAGE_KEYS.PLAYLIST_ENTRIES),
                AsyncStorage.getItem(STORAGE_KEYS.PLAYBACK_STATE),
                AsyncStorage.getItem(STORAGE_KEYS.AB_REPEAT),
            ]);

            if (tracksJson) {
                const tracks: Track[] = JSON.parse(tracksJson);
                tracks.forEach(t => this.cache.tracks.set(t.id, t));
            }

            if (playlistsJson) {
                const playlists: Playlist[] = JSON.parse(playlistsJson);
                playlists.forEach(p => this.cache.playlists.set(p.id, p));
            }

            if (queuesJson) {
                const queues: Queue[] = JSON.parse(queuesJson);
                queues.forEach(q => this.cache.queues.set(q.id, q));
            }

            if (metadataJson) {
                const metadata: SongMetadata[] = JSON.parse(metadataJson);
                metadata.forEach(m => this.cache.songMetadata.set(m.filePath, m));
            }

            if (entriesJson) {
                this.cache.playlistEntries = JSON.parse(entriesJson);
            }

            if (playbackJson) {
                this.cache.playbackState = JSON.parse(playbackJson);
            }

            if (abRepeatJson) {
                this.cache.abRepeat = JSON.parse(abRepeatJson);
            }

            this.cache.settings = settingsJson ? JSON.parse(settingsJson) : { ...DEFAULT_SETTINGS };
        } catch (error) {
            console.error('Error loading cache:', error);
            this.cache.settings = { ...DEFAULT_SETTINGS };
        }
    }

    // ============ TRACKS ============
    async saveTracks(tracks: Track[]): Promise<void> {
        tracks.forEach(t => this.cache.tracks.set(t.id, t));
        await this.persistTracks();
    }

    async saveTrack(track: Track): Promise<void> {
        this.cache.tracks.set(track.id, track);
        await this.persistTracks();
    }

    async getTrack(id: string): Promise<Track | undefined> {
        return this.cache.tracks.get(id);
    }

    async getAllTracks(): Promise<Track[]> {
        return Array.from(this.cache.tracks.values());
    }

    async deleteTrack(id: string): Promise<void> {
        this.cache.tracks.delete(id);
        await this.persistTracks();
    }

    async updateTrackPlayCount(id: string): Promise<void> {
        const track = this.cache.tracks.get(id);
        if (track) {
            track.playCount += 1;
            track.lastPlayed = Date.now();
            await this.persistTracks();
        }
    }

    async updateTrackTags(id: string, tags: AITag[]): Promise<void> {
        const track = this.cache.tracks.get(id);
        if (track) {
            track.aiTags = tags;
            track.taggedAt = Date.now();
            await this.persistTracks();
        }
    }

    private async persistTracks(): Promise<void> {
        const tracks = Array.from(this.cache.tracks.values());
        await AsyncStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(tracks));
    }

    // ============ SONG METADATA (Extended Profiles) ============

    /**
     * Get or create song metadata for a track
     */
    async getSongMetadata(filePath: string): Promise<SongMetadata> {
        let metadata = this.cache.songMetadata.get(filePath);
        if (!metadata) {
            metadata = {
                filePath,
                playCount: 0,
                lastPlayedTimestamp: null,
                dateAddedToApp: Date.now(),
                isFavorite: false,
                bookmarkPosition: null,
                totalListenTime: 0,
                skipCount: 0,
                rating: null,
            };
            this.cache.songMetadata.set(filePath, metadata);
            await this.persistSongMetadata();
        }
        return metadata;
    }

    /**
     * Update song metadata when playback reaches 90% or 30 seconds
     * Triggered by PlaybackService
     */
    async incrementPlayCount(filePath: string): Promise<void> {
        const metadata = await this.getSongMetadata(filePath);
        metadata.playCount += 1;
        metadata.lastPlayedTimestamp = Date.now();

        // Also update the track record
        const track = Array.from(this.cache.tracks.values()).find(t => t.path === filePath);
        if (track) {
            track.playCount = metadata.playCount;
            track.lastPlayed = metadata.lastPlayedTimestamp;
            await this.persistTracks();
        }

        await this.persistSongMetadata();
        console.log(`[DatabaseService] Play count incremented for: ${filePath}, new count: ${metadata.playCount}`);
    }

    /**
     * Update lastPlayed timestamp when a track starts playing
     * Called immediately when playback begins (per DATA SYSTEM: "onStartCommand of the Media Player")
     */
    async updateLastPlayed(filePath: string): Promise<void> {
        const metadata = await this.getSongMetadata(filePath);
        metadata.lastPlayedTimestamp = Date.now();

        // Also update the track record
        const track = Array.from(this.cache.tracks.values()).find(t => t.path === filePath);
        if (track) {
            track.lastPlayed = metadata.lastPlayedTimestamp;
            await this.persistTracks();
        }

        await this.persistSongMetadata();
    }

    /**
     * Record when a song is skipped (didn't complete)
     */
    async incrementSkipCount(filePath: string): Promise<void> {
        const metadata = await this.getSongMetadata(filePath);
        metadata.skipCount += 1;

        const track = Array.from(this.cache.tracks.values()).find(t => t.path === filePath);
        if (track) {
            track.skipCount = metadata.skipCount;
            await this.persistTracks();
        }

        await this.persistSongMetadata();
    }

    /**
     * Add listening time to a track
     * Only adds time if it's a valid positive number
     */
    async addListenTime(filePath: string, seconds: number): Promise<void> {
        // Validate input - only add positive, reasonable time values
        if (seconds <= 0 || seconds > 3600) return; // Max 1 hour per call to prevent bugs

        const metadata = await this.getSongMetadata(filePath);
        metadata.totalListenTime += Math.floor(seconds);

        const track = Array.from(this.cache.tracks.values()).find(t => t.path === filePath);
        if (track) {
            track.totalListenTime = metadata.totalListenTime;
            await this.persistTracks();
        }

        await this.persistSongMetadata();
    }

    /**
     * Toggle favorite status for a track
     */
    async toggleFavorite(filePath: string): Promise<boolean> {
        const metadata = await this.getSongMetadata(filePath);
        metadata.isFavorite = !metadata.isFavorite;

        const track = Array.from(this.cache.tracks.values()).find(t => t.path === filePath);
        if (track) {
            track.isFavorite = metadata.isFavorite;
            await this.persistTracks();
        }

        await this.persistSongMetadata();
        return metadata.isFavorite;
    }

    /**
     * Set favorite status for a track
     */
    async setFavorite(filePath: string, isFavorite: boolean): Promise<void> {
        const metadata = await this.getSongMetadata(filePath);
        metadata.isFavorite = isFavorite;

        const track = Array.from(this.cache.tracks.values()).find(t => t.path === filePath);
        if (track) {
            track.isFavorite = isFavorite;
            await this.persistTracks();
        }

        await this.persistSongMetadata();
    }

    /**
     * Save bookmark position (for podcasts/long tracks)
     */
    async saveBookmarkPosition(filePath: string, positionMs: number): Promise<void> {
        const metadata = await this.getSongMetadata(filePath);
        metadata.bookmarkPosition = positionMs;

        const track = Array.from(this.cache.tracks.values()).find(t => t.path === filePath);
        if (track) {
            track.bookmarkPosition = positionMs;
            await this.persistTracks();
        }

        await this.persistSongMetadata();
    }

    /**
     * Get bookmark position for a track
     */
    async getBookmarkPosition(filePath: string): Promise<number | null> {
        const metadata = await this.getSongMetadata(filePath);
        return metadata.bookmarkPosition;
    }

    /**
     * Clear bookmark position
     */
    async clearBookmarkPosition(filePath: string): Promise<void> {
        const metadata = await this.getSongMetadata(filePath);
        metadata.bookmarkPosition = null;

        const track = Array.from(this.cache.tracks.values()).find(t => t.path === filePath);
        if (track) {
            track.bookmarkPosition = undefined;
            await this.persistTracks();
        }

        await this.persistSongMetadata();
    }

    /**
     * Set user rating for a track (1-5 stars)
     */
    async setRating(filePath: string, rating: number | null): Promise<void> {
        const metadata = await this.getSongMetadata(filePath);
        metadata.rating = rating;

        const track = Array.from(this.cache.tracks.values()).find(t => t.path === filePath);
        if (track) {
            track.rating = rating || undefined;
            await this.persistTracks();
        }

        await this.persistSongMetadata();
    }

    /**
     * Get all favorite tracks
     */
    async getFavorites(): Promise<Track[]> {
        return Array.from(this.cache.tracks.values()).filter(t => t.isFavorite);
    }

    /**
     * Get most played tracks
     */
    async getMostPlayed(limit: number = 50): Promise<Track[]> {
        return Array.from(this.cache.tracks.values())
            .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
            .slice(0, limit);
    }

    /**
     * Get recently played tracks
     */
    async getRecentlyPlayed(limit: number = 50): Promise<Track[]> {
        return Array.from(this.cache.tracks.values())
            .filter(t => t.lastPlayed)
            .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
            .slice(0, limit);
    }

    /**
     * Get recently added tracks
     */
    async getRecentlyAdded(limit: number = 50): Promise<Track[]> {
        return Array.from(this.cache.tracks.values())
            .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
            .slice(0, limit);
    }

    /**
     * Get all song metadata
     */
    async getAllSongMetadata(): Promise<SongMetadata[]> {
        return Array.from(this.cache.songMetadata.values());
    }

    private async persistSongMetadata(): Promise<void> {
        const metadata = Array.from(this.cache.songMetadata.values());
        await AsyncStorage.setItem(STORAGE_KEYS.SONG_METADATA, JSON.stringify(metadata));
    }

    // ============ PLAYLIST ENTRIES (Many-to-Many) ============

    /**
     * Get all entries for a playlist
     */
    async getPlaylistEntries(playlistId: string): Promise<PlaylistEntry[]> {
        return this.cache.playlistEntries
            .filter(e => e.playlistId === playlistId)
            .sort((a, b) => a.entryOrder - b.entryOrder);
    }

    /**
     * Add a track to a playlist using the entry system
     */
    async addPlaylistEntry(playlistId: string, filePath: string, order?: number): Promise<void> {
        const existingEntries = await this.getPlaylistEntries(playlistId);
        const entryOrder = order ?? existingEntries.length;

        const entry: PlaylistEntry = {
            playlistId,
            songFilePath: filePath,
            entryOrder,
            addedAt: Date.now(),
        };

        this.cache.playlistEntries.push(entry);
        await this.persistPlaylistEntries();
    }

    /**
     * Remove a track from a playlist
     */
    async removePlaylistEntry(playlistId: string, filePath: string): Promise<void> {
        this.cache.playlistEntries = this.cache.playlistEntries.filter(
            e => !(e.playlistId === playlistId && e.songFilePath === filePath)
        );

        // Re-order remaining entries
        const remaining = this.cache.playlistEntries
            .filter(e => e.playlistId === playlistId)
            .sort((a, b) => a.entryOrder - b.entryOrder);

        remaining.forEach((entry, index) => {
            entry.entryOrder = index;
        });

        await this.persistPlaylistEntries();
    }

    /**
     * Reorder a playlist entry
     */
    async reorderPlaylistEntry(playlistId: string, fromIndex: number, toIndex: number): Promise<void> {
        const entries = await this.getPlaylistEntries(playlistId);
        const [moved] = entries.splice(fromIndex, 1);
        entries.splice(toIndex, 0, moved);

        entries.forEach((entry, index) => {
            entry.entryOrder = index;
        });

        await this.persistPlaylistEntries();
    }

    /**
     * Get all playlists that contain a specific track
     */
    async getPlaylistsContainingTrack(filePath: string): Promise<string[]> {
        const entries = this.cache.playlistEntries.filter(e => e.songFilePath === filePath);
        return [...new Set(entries.map(e => e.playlistId))];
    }

    private async persistPlaylistEntries(): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.PLAYLIST_ENTRIES, JSON.stringify(this.cache.playlistEntries));
    }

    // ============ PLAYBACK STATE ============

    /**
     * Save current playback state (for resume)
     */
    async savePlaybackState(trackId: string, position: number): Promise<void> {
        this.cache.playbackState = {
            trackId,
            position,
            timestamp: Date.now(),
            abRepeat: this.cache.abRepeat,
        };
        await AsyncStorage.setItem(STORAGE_KEYS.PLAYBACK_STATE, JSON.stringify(this.cache.playbackState));
    }

    /**
     * Get last playback state
     */
    async getPlaybackState(): Promise<PlaybackState | null> {
        return this.cache.playbackState;
    }

    /**
     * Clear playback state
     */
    async clearPlaybackState(): Promise<void> {
        this.cache.playbackState = null;
        await AsyncStorage.removeItem(STORAGE_KEYS.PLAYBACK_STATE);
    }

    // ============ A-B REPEAT ============

    /**
     * Set A-B repeat markers
     */
    async setABRepeat(trackId: string, startPosition: number, endPosition: number): Promise<void> {
        this.cache.abRepeat = {
            trackId,
            startPosition,
            endPosition,
            isActive: true,
        };
        await AsyncStorage.setItem(STORAGE_KEYS.AB_REPEAT, JSON.stringify(this.cache.abRepeat));
    }

    /**
     * Get current A-B repeat state
     */
    async getABRepeat(): Promise<ABRepeatState | null> {
        return this.cache.abRepeat;
    }

    /**
     * Toggle A-B repeat active state
     */
    async toggleABRepeat(): Promise<boolean> {
        if (this.cache.abRepeat) {
            this.cache.abRepeat.isActive = !this.cache.abRepeat.isActive;
            await AsyncStorage.setItem(STORAGE_KEYS.AB_REPEAT, JSON.stringify(this.cache.abRepeat));
            return this.cache.abRepeat.isActive;
        }
        return false;
    }

    /**
     * Clear A-B repeat
     */
    async clearABRepeat(): Promise<void> {
        this.cache.abRepeat = null;
        await AsyncStorage.removeItem(STORAGE_KEYS.AB_REPEAT);
    }

    // ============ PLAYLISTS ============
    async createPlaylist(name: string, trackIds: string[] = [], isAIGenerated: boolean = false, aiPrompt?: string): Promise<Playlist> {
        const playlist: Playlist = {
            id: `playlist_${Date.now()}`,
            name,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            trackIds,
            isAIGenerated,
            aiPrompt,
        };
        this.cache.playlists.set(playlist.id, playlist);
        await this.persistPlaylists();
        return playlist;
    }

    async getPlaylist(id: string): Promise<Playlist | undefined> {
        return this.cache.playlists.get(id);
    }

    async getAllPlaylists(): Promise<Playlist[]> {
        return Array.from(this.cache.playlists.values());
    }

    async updatePlaylist(id: string, updates: Partial<Playlist>): Promise<void> {
        const playlist = this.cache.playlists.get(id);
        if (playlist) {
            Object.assign(playlist, updates, { updatedAt: Date.now() });
            await this.persistPlaylists();
        }
    }

    async addTracksToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
        const playlist = this.cache.playlists.get(playlistId);
        if (playlist) {
            playlist.trackIds = [...playlist.trackIds, ...trackIds];
            playlist.updatedAt = Date.now();
            await this.persistPlaylists();
        }
    }

    async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
        const playlist = this.cache.playlists.get(playlistId);
        if (playlist) {
            playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
            playlist.updatedAt = Date.now();
            await this.persistPlaylists();
        }
    }

    async deletePlaylist(id: string): Promise<void> {
        this.cache.playlists.delete(id);
        await this.persistPlaylists();
    }

    private async persistPlaylists(): Promise<void> {
        const playlists = Array.from(this.cache.playlists.values());
        await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    }

    // ============ QUEUES ============
    async saveQueue(queue: Queue): Promise<void> {
        // Limit to 20 queues
        if (this.cache.queues.size >= 20 && !this.cache.queues.has(queue.id)) {
            // Remove oldest queue
            const oldest = Array.from(this.cache.queues.values())
                .sort((a, b) => (a.lastPlayed || 0) - (b.lastPlayed || 0))[0];
            if (oldest) {
                this.cache.queues.delete(oldest.id);
            }
        }
        this.cache.queues.set(queue.id, queue);
        await this.persistQueues();
    }

    async getQueue(id: string): Promise<Queue | undefined> {
        return this.cache.queues.get(id);
    }

    async getAllQueues(): Promise<Queue[]> {
        return Array.from(this.cache.queues.values());
    }

    async updateQueuePosition(id: string, currentIndex: number): Promise<void> {
        const queue = this.cache.queues.get(id);
        if (queue) {
            queue.currentIndex = currentIndex;
            queue.lastPlayed = Date.now();
            await this.persistQueues();
        }
    }

    async deleteQueue(id: string): Promise<void> {
        this.cache.queues.delete(id);
        await this.persistQueues();
    }

    async setLastPlayedQueue(queueId: string): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_QUEUE, queueId);
    }

    async getLastPlayedQueue(): Promise<Queue | undefined> {
        const queueId = await AsyncStorage.getItem(STORAGE_KEYS.LAST_QUEUE);
        return queueId ? this.cache.queues.get(queueId) : undefined;
    }

    private async persistQueues(): Promise<void> {
        const queues = Array.from(this.cache.queues.values());
        await AsyncStorage.setItem(STORAGE_KEYS.QUEUES, JSON.stringify(queues));
    }

    // ============ SETTINGS ============
    async getSettings(): Promise<Settings> {
        return this.cache.settings || { ...DEFAULT_SETTINGS };
    }

    async updateSettings(updates: Partial<Settings>): Promise<void> {
        this.cache.settings = { ...this.cache.settings, ...updates } as Settings;
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.cache.settings));
    }

    async resetSettings(): Promise<void> {
        this.cache.settings = { ...DEFAULT_SETTINGS };
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.cache.settings));
    }

    // ============ BACKUP & RESTORE ============
    async createBackup(): Promise<string> {
        const backup = {
            version: 1,
            timestamp: Date.now(),
            tracks: Array.from(this.cache.tracks.values()),
            playlists: Array.from(this.cache.playlists.values()),
            queues: Array.from(this.cache.queues.values()),
            settings: this.cache.settings,
        };
        return JSON.stringify(backup);
    }

    async restoreBackup(backupJson: string): Promise<boolean> {
        try {
            const backup = JSON.parse(backupJson);

            if (backup.tracks) {
                this.cache.tracks.clear();
                backup.tracks.forEach((t: Track) => this.cache.tracks.set(t.id, t));
                await this.persistTracks();
            }

            if (backup.playlists) {
                this.cache.playlists.clear();
                backup.playlists.forEach((p: Playlist) => this.cache.playlists.set(p.id, p));
                await this.persistPlaylists();
            }

            if (backup.queues) {
                this.cache.queues.clear();
                backup.queues.forEach((q: Queue) => this.cache.queues.set(q.id, q));
                await this.persistQueues();
            }

            if (backup.settings) {
                this.cache.settings = backup.settings;
                await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.cache.settings));
            }

            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }

    // Clear all data
    async clearAll(): Promise<void> {
        this.cache.tracks.clear();
        this.cache.playlists.clear();
        this.cache.queues.clear();
        this.cache.settings = { ...DEFAULT_SETTINGS };

        await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    }
}

export const databaseService = DatabaseService.getInstance();
export default databaseService;
