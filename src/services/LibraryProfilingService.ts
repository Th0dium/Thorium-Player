// Library Profiling Service - Extracts metadata for music library
// Per-file extraction using native MediaMetadataRetriever
import { Track as AppTrack } from '@/types';
import { metadataExtractorService, AudioMetadata } from './MetadataExtractorService';
import { databaseService } from './DatabaseService';
import { NativeModules, Platform } from 'react-native';

// Our custom MediaMetadata native module
const MediaMetadata = NativeModules.MediaMetadata;

/**
 * Extract metadata from a single file using MediaMetadataRetriever
 * This is the Muziki approach - per-file extraction
 */
async function extractFileMetadata(filePath: string): Promise<AudioMetadata | null> {
    if (!MediaMetadata) {
        console.warn('[LibraryProfiling] MediaMetadata native module not available');
        return null;
    }

    try {
        const metadata = await MediaMetadata.getMetadata(filePath);

        return {
            path: filePath,
            title: metadata.title || '',
            artist: metadata.artist || '',
            album: metadata.album || '',
            duration: metadata.duration || 0, // Already in milliseconds
            artwork: metadata.artwork || undefined,
            genre: metadata.genre || undefined,
            year: metadata.year ? parseInt(metadata.year) : undefined,
        };
    } catch (error) {
        // Silent fail - file may not have metadata or be corrupted
        return null;
    }
}

/**
 * Try to get MusicFiles module with multiple fallback approaches
 * The native module can be accessed in different ways depending on linking
 */
async function getMusicFilesData(): Promise<any[]> {
    if (__DEV__) {
        console.log('[LibraryProfiling] Attempting to get music files data...');
    }

    // Approach 1: Try require with default export
    try {
        const MusicFilesModule = require('react-native-get-music-files');
        const MusicFiles = MusicFilesModule.default || MusicFilesModule;

        if (MusicFiles && typeof MusicFiles.getAll === 'function') {
            if (__DEV__) {
                console.log('[LibraryProfiling] Using react-native-get-music-files (require)');
            }
            // Configure to scan ALL audio files, not just default folders
            const result = await MusicFiles.getAll({
                blured: false,  // Don't blur artwork
                artist: true,   // Get artist info
                duration: true, // Get duration
                genre: true,    // Get genre
                title: true,    // Get title
                cover: true,    // Get cover art
                coverQuality: 80, // Higher quality artwork
                minimumSongDuration: 1000, // Minimum 1 second
                coverFolder: '/storage/emulated/0/', // Scan from root storage
            });

            if (result && typeof result !== 'string' && Array.isArray(result)) {
                if (__DEV__) {
                    console.log(`[LibraryProfiling] Got ${result.length} files from react-native-get-music-files`);
                    // Debug: Log first result to see structure
                    if (result.length > 0) {
                        const sample = result[0];
                        const coverPreview = sample.cover ? sample.cover.substring(0, 100) + '...' : 'none';
                        console.log('[LibraryProfiling] Sample metadata:', JSON.stringify({
                            ...sample,
                            cover: coverPreview, // Don't log full base64
                        }, null, 2));
                    }
                }
                return result;
            }
        }
    } catch (e) {
        if (__DEV__) {
            console.log('[LibraryProfiling] require approach failed:', e);
        }
    }

    // Approach 2: Try NativeModules.RNAndroidAudioStore (the actual native module name)
    try {
        const nativeModule = NativeModules.RNAndroidAudioStore;
        if (nativeModule && typeof nativeModule.getAll === 'function') {
            if (__DEV__) {
                console.log('[LibraryProfiling] Using NativeModules.RNAndroidAudioStore');
            }
            const result = await nativeModule.getAll({
                blured: false,
                artist: true,
                duration: true,
                genre: true,
                title: true,
                cover: true,
                coverQuality: 80,
                minimumSongDuration: 1000,
                coverFolder: '/storage/emulated/0/',
            });
            if (result && Array.isArray(result)) {
                if (__DEV__) {
                    console.log(`[LibraryProfiling] Got ${result.length} files from NativeModules.RNAndroidAudioStore`);
                }
                return result;
            }
        }
    } catch (e) {
        if (__DEV__) {
            console.log('[LibraryProfiling] NativeModules.RNAndroidAudioStore not available:', e);
        }
    }

    // Approach 3: Try NativeModules.MusicFiles
    try {
        const nativeModule = NativeModules.MusicFiles;
        if (nativeModule && typeof nativeModule.getAll === 'function') {
            if (__DEV__) {
                console.log('[LibraryProfiling] Using NativeModules.MusicFiles');
            }
            const result = await nativeModule.getAll({
                blured: false,
                artist: true,
                duration: true,
                genre: true,
                title: true,
                cover: true,
                coverQuality: 80,
                minimumSongDuration: 1000,
                coverFolder: '/storage/emulated/0/',
            });
            if (result && Array.isArray(result)) {
                console.log(`[LibraryProfiling] Got ${result.length} files from NativeModules.MusicFiles`);
                return result;
            }
        }
    } catch (e) {
        console.log('[LibraryProfiling] NativeModules.MusicFiles not available:', e);
    }

    console.log('[LibraryProfiling] No native metadata module available, will use filename extraction');
    console.log('[LibraryProfiling] Available NativeModules:', Object.keys(NativeModules).join(', '));
    return [];
}

/**
 * Normalize file path by removing file:// prefix if present
 * This ensures consistent path handling across the app
 */
function normalizePath(path: string | undefined | null): string {
    if (!path) return '';
    return path.replace(/^file:\/\//, '');
}

/**
 * Extract metadata from filename when no native module available
 * Handles common naming patterns:
 * - "Artist - Title.mp3"
 * - "01 - Title.mp3" (track number prefix)
 * - "01. Title.mp3" (track number with dot)
 * - "Title.mp3" (just title)
 */
function extractMetadataFromFilename(filePath: string): { title: string; artist: string; album: string } {
    const filename = filePath.substring(filePath.lastIndexOf('/') + 1);
    let filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;

    // Remove track number prefix like "01 - ", "01. ", "01 ", "1 - ", etc.
    filenameWithoutExt = filenameWithoutExt.replace(/^\d{1,3}[\s.\-_]+/, '').trim();

    // Try to extract album from folder name (parent directory)
    const pathParts = filePath.split('/');
    const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '';

    // Try to get artist from grandparent folder (common structure: Artist/Album/Song.mp3)
    const grandparentFolder = pathParts.length > 2 ? pathParts[pathParts.length - 3] : '';

    // Try to parse "Artist - Title" format
    const dashIndex = filenameWithoutExt.indexOf(' - ');
    if (dashIndex > 0) {
        const artist = filenameWithoutExt.substring(0, dashIndex).trim();
        let title = filenameWithoutExt.substring(dashIndex + 3).trim();

        // Remove track number from title if present after dash
        title = title.replace(/^\d{1,3}[\s.\-_]+/, '').trim();

        return {
            title: title || filenameWithoutExt,
            artist: artist,
            album: isValidFolderName(folderName) ? folderName : 'Unknown Album',
        };
    }

    // No artist-title separator found, use folder structure
    const skipFolders = ['music', 'download', 'downloads', 'audio', 'media', 'storage', 'emulated', '0'];
    const album = isValidFolderName(folderName) ? folderName : 'Unknown Album';
    const artist = isValidFolderName(grandparentFolder) ? grandparentFolder : 'Unknown Artist';

    return {
        title: filenameWithoutExt,
        artist: artist,
        album: album,
    };
}

/**
 * Check if a folder name is valid for use as album/artist name
 */
function isValidFolderName(name: string): boolean {
    if (!name) return false;
    const skipFolders = ['music', 'download', 'downloads', 'audio', 'media', 'storage', 'emulated', '0', 'sdcard'];
    return !skipFolders.includes(name.toLowerCase()) && name.length > 1;
}

class LibraryProfilingService {
    private static instance: LibraryProfilingService;
    private cachedMusicFiles: any[] | null = null;
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute cache

    private constructor() { }

    static getInstance(): LibraryProfilingService {
        if (!LibraryProfilingService.instance) {
            LibraryProfilingService.instance = new LibraryProfilingService();
        }
        return LibraryProfilingService.instance;
    }

    /**
     * Get all music files from device (with caching to avoid repeated calls)
     * Uses multiple fallback approaches to access the native module
     */
    private async getAllMusicFiles(): Promise<any[]> {
        const now = Date.now();

        // Return cached if valid
        if (this.cachedMusicFiles && (now - this.cacheTimestamp) < this.CACHE_TTL) {
            console.log('[LibraryProfiling] Using cached music files');
            return this.cachedMusicFiles;
        }

        try {
            const musicFiles = await getMusicFilesData();
            this.cachedMusicFiles = musicFiles;
            this.cacheTimestamp = now;
            return musicFiles;
        } catch (error) {
            console.warn('[LibraryProfiling] Error fetching music files:', error);
            return [];
        }
    }

    /**
     * Clear the music files cache (call after scanning completes)
     */
    clearCache(): void {
        this.cachedMusicFiles = null;
        this.cacheTimestamp = 0;
    }

    /**
     * Profile all tracks with per-file metadata extraction
     * Uses MediaMetadataRetriever (like Muziki) for each file
     */
    async profileLibrary(
        tracks: AppTrack[],
        onProgress?: (current: number, total: number) => void
    ): Promise<AppTrack[]> {
        const profiledTracks: AppTrack[] = [];
        const totalTracks = tracks.length;

        console.log(`[LibraryProfiling] Starting to profile ${totalTracks} tracks using per-file extraction`);

        // Check if our native module is available
        const hasNativeModule = !!MediaMetadata;
        console.log(`[LibraryProfiling] MediaMetadata native module: ${hasNativeModule ? 'Available' : 'Not available'}`);

        // Profile each track
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];

            try {
                const profiled = await this.profileTrackPerFile(track, hasNativeModule);
                profiledTracks.push(profiled);
            } catch (error) {
                console.warn(`Failed to profile ${track.path}:`, error);
                const fallbackTrack = await this.profileWithFilenameOnly(track);
                profiledTracks.push(fallbackTrack);
            }

            // Report progress
            onProgress?.(i + 1, totalTracks);

            // Log progress every 50 files
            if ((i + 1) % 50 === 0 || i === 0) {
                console.log(`[LibraryProfiling] Progress: ${i + 1}/${totalTracks} tracks processed`);
            }
        }

        console.log(`[LibraryProfiling] Completed profiling ${profiledTracks.length} tracks`);
        return profiledTracks;
    }

    /**
     * Profile track using only filename when no native metadata available
     */
    private async profileWithFilenameOnly(track: AppTrack): Promise<AppTrack> {
        const normalizedPath = normalizePath(track.path);
        const extracted = extractMetadataFromFilename(normalizedPath);

        // Check if track has real metadata or just placeholder values
        const hasRealArtist = track.artist && track.artist !== 'Unknown Artist';
        const hasRealAlbum = track.album && track.album !== 'Unknown Album';
        const hasRealTitle = track.title && !normalizedPath.endsWith(track.title + '.mp3') &&
            !normalizedPath.endsWith(track.title + '.m4a') &&
            !normalizedPath.endsWith(track.title + '.flac');

        try {
            const playMetadata = await databaseService.getSongMetadata(normalizedPath);

            return {
                ...track,
                id: track.id,
                path: normalizedPath,
                url: track.url || `file://${normalizedPath}`,
                title: hasRealTitle ? track.title : extracted.title,
                artist: hasRealArtist ? track.artist : extracted.artist,
                album: hasRealAlbum ? track.album : extracted.album,
                duration: track.duration || 0,
                playCount: playMetadata.playCount,
                isFavorite: playMetadata.isFavorite,
                bookmarkPosition: playMetadata.bookmarkPosition || undefined,
                totalListenTime: playMetadata.totalListenTime,
                skipCount: playMetadata.skipCount,
                rating: playMetadata.rating || undefined,
                lastPlayed: playMetadata.lastPlayedTimestamp || undefined,
                dateAdded: playMetadata.dateAddedToApp,
                bookmarks: track.bookmarks || [],
                aiTags: track.aiTags || [],
            };
        } catch (error) {
            return {
                ...track,
                path: normalizedPath,
                title: hasRealTitle ? track.title : extracted.title,
                artist: hasRealArtist ? track.artist : extracted.artist,
                album: hasRealAlbum ? track.album : extracted.album,
            };
        }
    }

    /**
     * Profile a single track using per-file metadata extraction
     * This is the Muziki approach - extract metadata from each file individually
     */
    private async profileTrackPerFile(track: AppTrack, hasNativeModule: boolean): Promise<AppTrack> {
        const normalizedPath = normalizePath(track.path);
        const filename = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1);

        // Try to extract metadata using native module
        let metadata: AudioMetadata | null = null;

        if (hasNativeModule) {
            metadata = await extractFileMetadata(normalizedPath);
        }

        // Get play statistics from database
        const playMetadata = await databaseService.getSongMetadata(normalizedPath);

        if (metadata && metadata.title) {
            // Successfully extracted metadata
            const durationInSeconds = metadata.duration > 0 ? metadata.duration / 1000 : 0;

            return {
                ...track,
                path: normalizedPath,
                url: track.url || `file://${normalizedPath}`,
                title: metadata.title,
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                duration: durationInSeconds,
                albumArt: metadata.artwork,
                artwork: metadata.artwork,
                genre: metadata.genre,
                year: metadata.year,
                playCount: playMetadata.playCount,
                isFavorite: playMetadata.isFavorite,
                bookmarkPosition: playMetadata.bookmarkPosition || undefined,
                totalListenTime: playMetadata.totalListenTime,
                skipCount: playMetadata.skipCount,
                rating: playMetadata.rating || undefined,
                lastPlayed: playMetadata.lastPlayedTimestamp || undefined,
                dateAdded: playMetadata.dateAddedToApp,
                bookmarks: track.bookmarks || [],
                aiTags: track.aiTags || [],
            };
        }

        // Fallback to filename extraction
        const extracted = extractMetadataFromFilename(normalizedPath);

        return {
            ...track,
            path: normalizedPath,
            url: track.url || `file://${normalizedPath}`,
            title: extracted.title,
            artist: extracted.artist,
            album: extracted.album,
            duration: track.duration || 0,
            playCount: playMetadata.playCount,
            isFavorite: playMetadata.isFavorite,
            bookmarkPosition: playMetadata.bookmarkPosition || undefined,
            totalListenTime: playMetadata.totalListenTime,
            skipCount: playMetadata.skipCount,
            rating: playMetadata.rating || undefined,
            lastPlayed: playMetadata.lastPlayedTimestamp || undefined,
            dateAdded: playMetadata.dateAddedToApp,
            bookmarks: track.bookmarks || [],
            aiTags: track.aiTags || [],
        };
    }

    /**
     * Add play statistics to a track from the database
     */
    private async addPlayStatsToTrack(track: AppTrack): Promise<AppTrack> {
        try {
            const playMetadata = await databaseService.getSongMetadata(track.path || '');
            return {
                ...track,
                playCount: playMetadata.playCount,
                isFavorite: playMetadata.isFavorite,
                bookmarkPosition: playMetadata.bookmarkPosition || undefined,
                totalListenTime: playMetadata.totalListenTime,
                skipCount: playMetadata.skipCount,
                rating: playMetadata.rating || undefined,
            };
        } catch (error) {
            return track;
        }
    }

    /**
     * Create a map of file metadata for quick lookup
     * Uses NORMALIZED paths (no file:// prefix) as keys
     */
    private createMetadataMap(musicFiles: any[]): Map<string, AudioMetadata> {
        const map = new Map<string, AudioMetadata>();

        console.log(`[LibraryProfiling] Creating metadata map for ${musicFiles.length} files`);

        // Log first few entries to debug path matching
        if (musicFiles.length > 0) {
            const sample = musicFiles[0];
            const coverPreview = sample.cover ? `${sample.cover.substring(0, 50)}... (${sample.cover.length} chars)` : 'none';
            console.log('[LibraryProfiling] Sample file data:', JSON.stringify({
                url: sample.url,
                path: sample.path,
                title: sample.title,
                artist: sample.artist,
                album: sample.album,
                duration: sample.duration,
                cover: coverPreview, // Just show preview, not full base64
            }, null, 2));
        }

        for (const file of musicFiles) {
            // Song interface uses 'url' for path and 'cover' for artwork
            const rawPath = file.url || file.path || '';
            const normalizedPath = normalizePath(rawPath);

            if (!normalizedPath) continue;

            const metadata: AudioMetadata = {
                path: normalizedPath,
                title: file.title || this.getTitleFromPath(normalizedPath),
                artist: file.artist || 'Unknown Artist',
                album: file.album || 'Unknown Album',
                duration: file.duration || 0,
                artwork: file.cover || file.artwork || undefined,
                genre: file.genre || undefined,
                year: file.year ? parseInt(file.year) : undefined,
                albumArtist: file.album_artist || undefined,
            };

            map.set(normalizedPath, metadata);
        }

        console.log(`[LibraryProfiling] Metadata map created with ${map.size} entries`);
        // Log a few sample paths to help debug
        const samplePaths = Array.from(map.keys()).slice(0, 3);
        console.log('[LibraryProfiling] Sample paths in map:', samplePaths);
        return map;
    }

    /**
     * Profile a single track using pre-extracted metadata
     * Falls back to filename extraction if metadata not found
     */
    private async profileTrackWithMetadata(
        track: AppTrack,
        metadataMap: Map<string, AudioMetadata>
    ): Promise<AppTrack> {
        try {
            // Normalize the track path for lookup
            const normalizedTrackPath = normalizePath(track.path);
            const filename = normalizedTrackPath.substring(normalizedTrackPath.lastIndexOf('/') + 1);

            // Try to find metadata - first by full path, then by filename
            let metadata = metadataMap.get(normalizedTrackPath);

            // Try filename lookup as fallback (in case paths don't match exactly)
            if (!metadata) {
                for (const [path, meta] of metadataMap.entries()) {
                    if (path.endsWith(filename)) {
                        metadata = meta;
                        break;
                    }
                }
            }

            // Get play statistics from database
            const playMetadata = await databaseService.getSongMetadata(normalizedTrackPath);

            if (metadata) {
                console.log(`[LibraryProfiling] ✓ Found metadata for: ${filename}`);
                console.log(`[LibraryProfiling]   Title: ${metadata.title}, Artist: ${metadata.artist}, Duration: ${metadata.duration}ms, Artwork: ${metadata.artwork ? 'Yes' : 'No'}`);

                // Artwork is already base64 from native module, use it directly
                const artwork = metadata.artwork;

                // Duration from MusicFiles is in milliseconds, convert to seconds
                const durationInSeconds = metadata.duration > 0
                    ? metadata.duration / 1000
                    : 0; return {
                        ...track,
                        path: normalizedTrackPath, // Store normalized path
                        url: track.url || `file://${normalizedTrackPath}`,
                        title: metadata.title,
                        artist: metadata.artist,
                        album: metadata.album,
                        duration: durationInSeconds,
                        albumArt: artwork,
                        artwork: artwork,
                        genre: metadata.genre,
                        year: metadata.year,
                        playCount: playMetadata.playCount,
                        isFavorite: playMetadata.isFavorite,
                        bookmarkPosition: playMetadata.bookmarkPosition || undefined,
                        totalListenTime: playMetadata.totalListenTime,
                        skipCount: playMetadata.skipCount,
                        rating: playMetadata.rating || undefined,
                        lastPlayed: playMetadata.lastPlayedTimestamp || undefined,
                        dateAdded: playMetadata.dateAddedToApp,
                        bookmarks: track.bookmarks || [],
                        aiTags: track.aiTags || [],
                    };
            }

            // Fallback to filename extraction
            console.log(`[LibraryProfiling] ✗ No metadata found for: ${normalizedTrackPath}`);
            console.log(`[LibraryProfiling]   Track path: ${normalizedTrackPath}`);
            console.log(`[LibraryProfiling]   Looking for filename: ${filename}`);
            const extracted = extractMetadataFromFilename(normalizedTrackPath);

            // Check if track has real metadata or just placeholder values
            const hasRealArtist = track.artist && track.artist !== 'Unknown Artist';
            const hasRealAlbum = track.album && track.album !== 'Unknown Album';

            return {
                ...track,
                path: normalizedTrackPath,
                url: track.url || `file://${normalizedTrackPath}`,
                title: extracted.title, // Always use extracted title from filename
                artist: hasRealArtist ? track.artist : extracted.artist,
                album: hasRealAlbum ? track.album : extracted.album,
                playCount: playMetadata.playCount,
                isFavorite: playMetadata.isFavorite,
                bookmarkPosition: playMetadata.bookmarkPosition || undefined,
                totalListenTime: playMetadata.totalListenTime,
                skipCount: playMetadata.skipCount,
                rating: playMetadata.rating || undefined,
                lastPlayed: playMetadata.lastPlayedTimestamp || undefined,
                dateAdded: playMetadata.dateAddedToApp,
                bookmarks: track.bookmarks || [],
                aiTags: track.aiTags || [],
            };
        } catch (error) {
            console.warn(`Error profiling track ${track.path}:`, error);
            return this.profileWithFilenameOnly(track);
        }
    }

    /**
     * Extract title from file path
     */
    private getTitleFromPath(filePath: string): string {
        const filename = filePath.substring(filePath.lastIndexOf('/') + 1);
        return filename.substring(0, filename.lastIndexOf('.')) || filename;
    }
}

export const libraryProfilingService = LibraryProfilingService.getInstance();
export default libraryProfilingService;
