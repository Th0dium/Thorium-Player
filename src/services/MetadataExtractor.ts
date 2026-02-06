// Metadata Extractor - Reads ID3 tags and metadata from audio files
import { Track } from '@/types';
import { Platform } from 'react-native';

// Import MusicFiles dynamically to handle native module issues
let MusicFiles: any = null;
try {
    MusicFiles = require('react-native-get-music-files').default;
} catch (e) {
    console.warn('[MetadataExtractor] react-native-get-music-files not available');
}

interface MusicFileMetadata {
    id: string;
    title: string;
    author?: string;
    artist?: string;
    album?: string;
    duration: string;
    cover?: string;
    artwork?: string;
    genre?: string;
    fileName: string;
    path: string;
    url?: string;
}

class MetadataExtractor {
    private static instance: MetadataExtractor;

    private constructor() { }

    static getInstance(): MetadataExtractor {
        if (!MetadataExtractor.instance) {
            MetadataExtractor.instance = new MetadataExtractor();
        }
        return MetadataExtractor.instance;
    }

    /**
     * Scan directory and get all music files with metadata
     */
    async scanDirectory(path: string): Promise<Partial<Track>[]> {
        try {
            // Check if MusicFiles module is available
            if (!MusicFiles || typeof MusicFiles.getAll !== 'function') {
                console.warn('[MetadataExtractor] MusicFiles native module not available');
                return [];
            }

            const results = await MusicFiles.getAll({
                coverQuality: 50,
            });

            // Handle string error response
            if (typeof results === 'string') {
                console.warn('[MetadataExtractor] MusicFiles returned error:', results);
                return [];
            }

            if (!Array.isArray(results)) {
                console.warn('[MetadataExtractor] MusicFiles returned non-array:', typeof results);
                return [];
            }

            console.log(`[MetadataExtractor] Found ${results.length} audio files`);

            return results.map((file: any) => this.convertToTrack(file as MusicFileMetadata));
        } catch (error) {
            console.error('[MetadataExtractor] Error scanning:', error);
            return [];
        }
    }

    /**
     * Get metadata for a single file
     */
    async getMetadata(filePath: string): Promise<Partial<Track> | null> {
        try {
            // react-native-get-music-files doesn't support single file lookup
            // So we'll return null and let the bulk scan handle it
            return null;
        } catch (error) {
            console.error('[MetadataExtractor] Error getting metadata:', error);
            return null;
        }
    }

    /**
     * Convert MusicFiles result to Track object
     */
    private convertToTrack(file: MusicFileMetadata): Partial<Track> {
        const durationMs = parseInt(file.duration || '0', 10);
        const durationSeconds = Math.floor(durationMs / 1000);
        const filePath = file.path || file.url || '';
        const fileName = file.fileName || filePath.substring(filePath.lastIndexOf('/') + 1);

        return {
            id: this.generateId(filePath),
            path: filePath,
            url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
            title: file.title || this.getFileNameWithoutExtension(fileName),
            artist: file.artist || file.author || 'Unknown Artist',
            album: file.album || 'Unknown Album',
            duration: durationSeconds,
            albumArt: file.cover || file.artwork,
            genre: file.genre,
            playCount: 0,
            bookmarks: [],
            aiTags: [],
        };
    }

    /**
     * Generate unique ID from file path
     */
    private generateId(path: string): string {
        let hash = 0;
        for (let i = 0; i < path.length; i++) {
            const char = path.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `track_${Math.abs(hash).toString(16)}`;
    }

    /**
     * Get filename without extension
     */
    private getFileNameWithoutExtension(filename: string): string {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(0, lastDot) : filename;
    }
}

export const metadataExtractor = MetadataExtractor.getInstance();
export default metadataExtractor;
