// Type definitions for Thorium Player

// ============ SONG METADATA (Extended Profile) ============
export interface SongMetadata {
    filePath: string;          // Primary Key - unique identifier for the song
    playCount: number;          // Increments at 90% completion
    lastPlayedTimestamp: number | null;  // Exact date/time last opened
    dateAddedToApp: number;     // When added to Thorium (different from file date)
    isFavorite: boolean;        // Quick toggle for Favorites playlist
    bookmarkPosition: number | null;  // Milliseconds where user left off
    totalListenTime: number;    // Total seconds listened to this track
    skipCount: number;          // Times skipped before completion
    rating: number | null;      // User rating 1-5 stars (null = unrated)
}

// ============ PLAYLIST ENTRY (Many-to-Many Relationship) ============
export interface PlaylistEntry {
    playlistId: string;
    songFilePath: string;
    entryOrder: number;
    addedAt: number;           // When added to this playlist
}

// ============ BACKUP TYPES ============
export interface BackupMetadata {
    backupDate: number;
    appVersion: string;
    deviceName: string;
    trackCount: number;
    playlistCount: number;
    checksum: string;          // For integrity verification
}

export interface BackupPackage {
    metadata: BackupMetadata;
    database: {
        songMetadata: SongMetadata[];
        playlistEntries: PlaylistEntry[];
        playlists: Playlist[];
        queues: Queue[];
    };
    preferences: {
        settings: Settings;
        uiSettings: any;       // From settingsStore
    };
    pathMappings: {
        originalRoot: string;
        relativePaths: string[];
    };
}

export interface PathMapping {
    originalPath: string;
    relativePath: string;      // [ROOT]/Music/Song.mp3
    newPath?: string;          // After restore, mapped to new location
}

// ============ A-B REPEAT STATE ============
export interface ABRepeatState {
    trackId: string;
    startPosition: number;     // Milliseconds
    endPosition: number;       // Milliseconds
    isActive: boolean;
}

// ============ TEMPORARY PLAYBACK STATE ============
export interface PlaybackState {
    trackId: string;
    position: number;
    timestamp: number;
    abRepeat: ABRepeatState | null;
}

export interface Track {
    id: string;
    path: string;
    url: string; // For TrackPlayer
    title: string;
    artist: string;
    album: string;
    duration: number; // in seconds
    albumArt?: string;
    artwork?: string; // alias for albumArt
    genre?: string;
    year?: number;
    playCount: number;
    lastPlayed?: number; // timestamp
    dateAdded?: number; // timestamp when added to library
    bookmarks: Bookmark[];
    // Extended metadata
    isFavorite?: boolean;
    bookmarkPosition?: number; // Resume position
    totalListenTime?: number;
    skipCount?: number;
    rating?: number;
    // AI-generated tags
    aiTags: AITag[];
    taggedAt?: number; // timestamp of last AI tagging
}

export interface Bookmark {
    id: string;
    position: number; // in seconds
    note?: string;
    createdAt: number;
}

export interface AITag {
    id: string;
    name: string;
    category: AITagCategory;
    color: string;
    confidence?: number; // 0-1, how confident the AI is
}

export type AITagCategory = 'mood' | 'genre' | 'activity' | 'era' | 'custom';

export interface Playlist {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    trackIds: string[];
    artwork?: string;
    trackCount?: number;
    tracks?: Track[];
    // AI playlist specific
    isAIGenerated: boolean;
    aiPrompt?: string;
    isDynamic?: boolean; // Auto-updates based on library changes
}

export interface Queue {
    id: string;
    name: string;
    trackIds: string[];
    currentIndex: number;
    lastPlayed?: number;
    source: QueueSource;
}

export interface QueueSource {
    type: 'folder' | 'album' | 'artist' | 'playlist' | 'all' | 'search' | 'ai' | 'genre' | 'custom';
    id?: string;
    name: string;
}

export interface Folder {
    id: string;
    path: string;
    name: string;
    trackCount: number;
    subfolders: string[];
}

export interface Album {
    id: string;
    name: string;
    artist: string;
    artwork?: string;
    year?: number;
    trackIds: string[];
    trackCount?: number;
    tracks?: Track[];
}

export interface Artist {
    id: string;
    name: string;
    artwork?: string;
    trackIds: string[];
    albumIds: string[];
    trackCount?: number;
    albumCount?: number;
    tracks?: Track[];
}

export interface Genre {
    id: string;
    name: string;
    trackIds: string[];
    trackCount?: number;
    tracks?: Track[];
}

export interface Settings {
    // Audio settings
    gaplessPlayback: boolean;
    crossfadeDuration: number; // in seconds, 0 = disabled
    playbackSpeed: number;

    // Library settings
    scanFolders: string[];
    excludeFolders: string[];
    autoScanOnStartup: boolean;

    // Appearance
    theme: 'dark' | 'light' | 'system';
    accentColor: string;

    // AI settings
    aiApiKey?: string;
    aiProvider: 'openai' | 'gemini' | 'ollama';
    autoTagEnabled: boolean;

    // Sleep timer
    sleepTimerDuration?: number; // in minutes
    sleepTimerFadeOut: boolean;

    // Equalizer
    equalizerEnabled: boolean;
    equalizerPreset: string;
    equalizerBands: number[];
}

export type RepeatMode = 'off' | 'all' | 'one';

export type ShuffleMode = 'off' | 'on';

export interface PlayerState {
    isPlaying: boolean;
    currentTrack: Track | null;
    currentQueueId: string | null;
    position: number;
    duration: number;
    buffered: number;
    repeatMode: RepeatMode;
    shuffleMode: ShuffleMode;
    volume: number;
}

// AI Service types
export interface AITagRequest {
    trackId: string;
    title: string;
    artist: string;
    album?: string;
    genre?: string;
}

export interface AITagResponse {
    trackId: string;
    tags: AITag[];
    suggestedTags: string[];
}

export interface AIPlaylistRequest {
    prompt: string;
    maxTracks?: number;
    excludeTrackIds?: string[];
}

export interface AIPlaylistResponse {
    name: string;
    trackIds: string[];
    explanation: string;
    matchReasons: { [trackId: string]: string };
}
