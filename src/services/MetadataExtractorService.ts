// Metadata Extractor Service - Extracts complete audio metadata (duration, artwork, etc)
// Uses react-native-get-music-files for reliable metadata extraction
import RNFS from 'react-native-fs';
import { Track } from '@/types';

// Import MusicFiles with defensive check - native module may not be available
let MusicFiles: any = null;
try {
    MusicFiles = require('react-native-get-music-files').default;
} catch (e) {
    console.warn('[MetadataExtractor] react-native-get-music-files not available:', e);
}

export interface AudioMetadata {
    path: string;
    title: string;
    artist: string;
    album: string;
    duration: number; // milliseconds
    artwork?: string; // base64 or file URI
    genre?: string;
    year?: number;
    albumArtist?: string;
}

class MetadataExtractorService {
    private static instance: MetadataExtractorService;
    private metadataCache: Map<string, AudioMetadata> = new Map();

    private constructor() { }

    static getInstance(): MetadataExtractorService {
        if (!MetadataExtractorService.instance) {
            MetadataExtractorService.instance = new MetadataExtractorService();
        }
        return MetadataExtractorService.instance;
    }

    /**
     * Extract metadata from a single audio file
     */
    async extractMetadata(filePath: string): Promise<AudioMetadata> {
        // Check cache first
        if (this.metadataCache.has(filePath)) {
            return this.metadataCache.get(filePath)!;
        }

        try {
            // Try to get metadata using getMusicFiles for a single file
            const metadata = await this.extractFromFile(filePath);

            // Cache the result
            this.metadataCache.set(filePath, metadata);

            return metadata;
        } catch (error) {
            console.warn(`Failed to extract metadata from ${filePath}:`, error);

            // Return basic metadata from filename
            return this.createBasicMetadata(filePath);
        }
    }

    /**
     * Extract metadata from audio file
     */
    private async extractFromFile(filePath: string): Promise<AudioMetadata> {
        // Check if MusicFiles native module is available
        if (!MusicFiles || typeof MusicFiles.getAll !== 'function') {
            console.warn('[MetadataExtractor] MusicFiles native module not available');
            return this.createBasicMetadata(filePath);
        }

        try {
            // Get the directory of the file
            const dir = filePath.substring(0, filePath.lastIndexOf('/'));
            const filename = filePath.substring(filePath.lastIndexOf('/') + 1);

            // Use MusicFiles to read metadata from the directory
            // This is the most reliable way to get ID3/metadata info
            const musicFilesResult = await MusicFiles.getAll({
                coverQuality: 50,
            });

            // Handle string error response
            if (typeof musicFilesResult === 'string') {
                console.warn('MusicFiles error:', musicFilesResult);
                return this.createBasicMetadata(filePath);
            }

            const musicFiles = musicFilesResult || [];

            // Find our file in the results
            // Song interface uses 'url' not 'path'
            const foundFile = musicFiles.find((f: any) => {
                const fpath = f.url || f.path || '';
                const fname = fpath.substring(fpath.lastIndexOf('/') + 1);
                return fname === filename || fpath === filePath;
            });

            if (foundFile) {
                return this.mapMusicFileToMetadata(foundFile, filePath);
            }

            // Fallback: extract from filename
            return this.createBasicMetadata(filePath);
        } catch (error) {
            console.warn('Error in extractFromFile:', error);
            throw error;
        }
    }

    /**
     * Map react-native-get-music-files format to our metadata format
     */
    private mapMusicFileToMetadata(file: any, filePath: string): AudioMetadata {
        // Song interface uses 'cover' not 'artwork'
        return {
            path: filePath,
            title: file.title || this.getTitleFromPath(filePath),
            artist: file.artist || 'Unknown Artist',
            album: file.album || 'Unknown Album',
            duration: file.duration ? Math.round(file.duration) : 0, // Convert to ms if needed
            artwork: file.cover || file.artwork || undefined,
            genre: file.genre || undefined,
            year: file.year ? parseInt(file.year) : undefined,
            albumArtist: file.album_artist || undefined,
        };
    }

    /**
     * Create basic metadata from file path if extraction fails
     */
    private createBasicMetadata(filePath: string): AudioMetadata {
        const filename = filePath.substring(filePath.lastIndexOf('/') + 1);
        const title = filename.substring(0, filename.lastIndexOf('.')) || filename;

        return {
            path: filePath,
            title,
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            duration: 0,
            artwork: undefined,
        };
    }

    /**
     * Extract title from file path
     */
    private getTitleFromPath(filePath: string): string {
        const filename = filePath.substring(filePath.lastIndexOf('/') + 1);
        return filename.substring(0, filename.lastIndexOf('.')) || filename;
    }

    /**
     * Convert artwork (base64 or URI) to usable format
     */
    async getArtworkUri(artwork: string | undefined): Promise<string | undefined> {
        if (!artwork) {
            return undefined;
        }

        // If it's already a data URI or file path, return as-is
        if (artwork.startsWith('data:') || artwork.startsWith('file://')) {
            return artwork;
        }

        // If it's base64, convert to data URI
        if (artwork.length > 0 && !artwork.includes('/')) {
            return `data:image/jpeg;base64,${artwork}`;
        }

        return artwork;
    }

    /**
     * Clear cache to force fresh extraction
     */
    clearCache(): void {
        this.metadataCache.clear();
    }

    /**
     * Clear cache for specific file
     */
    clearCacheForFile(filePath: string): void {
        this.metadataCache.delete(filePath);
    }
}

export const metadataExtractorService = MetadataExtractorService.getInstance();
export default metadataExtractorService;
