// Song Scanner Service - Scans device for audio files and profiles them with metadata
// Generates fingerprints, reads metadata, and stores extended song information
import RNFS from 'react-native-fs';
import TrackPlayer, { Track } from 'react-native-track-player';
import { Track as AppTrack, SongMetadata } from '@/types';
import { databaseService } from './DatabaseService';
import { fileSystemService } from './FileSystemService';
import { libraryProfilingService } from './LibraryProfilingService';

export interface ScanProgress {
    totalFound: number;
    profiled: number;
    inProgress: boolean;
    currentFile: string;
    percentage: number;
}

export interface ScanCallback {
    onProgress: (progress: ScanProgress) => void;
    onComplete: (results: ScanResults) => void;
    onError: (error: Error) => void;
}

export interface ScanResults {
    newTracks: AppTrack[];
    updatedTracks: AppTrack[];
    removedTracks: string[]; // Track IDs that no longer exist
    totalScanned: number;
    durationMs: number;
}

class SongScannerService {
    private static instance: SongScannerService;
    private isScanning = false;
    private cancelRequested = false;

    private constructor() { }

    static getInstance(): SongScannerService {
        if (!SongScannerService.instance) {
            SongScannerService.instance = new SongScannerService();
        }
        return SongScannerService.instance;
    }

    /**
     * Scan specified folders for audio files and profile them
     */
    async scanAndProfile(
        folderPaths: string[],
        options: {
            excludeFolders?: string[];
            excludeRingtones?: boolean;
            excludeNotifications?: boolean;
            minDuration?: number; // seconds
        } = {},
        callback?: ScanCallback
    ): Promise<ScanResults> {
        if (this.isScanning) {
            throw new Error('Scan already in progress');
        }

        const startTime = Date.now();
        this.isScanning = true;
        this.cancelRequested = false;

        try {
            const results: ScanResults = {
                newTracks: [],
                updatedTracks: [],
                removedTracks: [],
                totalScanned: 0,
                durationMs: 0,
            };

            // Get all tracks from device
            const deviceTracks: AppTrack[] = [];
            let foundCount = 0;

            for (const folderPath of folderPaths) {
                if (this.cancelRequested) break;

                const scanResult = await fileSystemService.scanDirectory(
                    folderPath,
                    true,
                    options.excludeFolders || []
                );

                deviceTracks.push(
                    ...scanResult.tracks.map(track => ({
                        ...track,
                        id: track.id || this.generateTrackId(track.path || ''),
                        playCount: 0,
                        bookmarks: [],
                        aiTags: [],
                    } as AppTrack))
                );

                foundCount += scanResult.tracks.length;

                callback?.onProgress({
                    totalFound: foundCount,
                    profiled: 0,
                    inProgress: true,
                    currentFile: folderPath,
                    percentage: 0,
                });
            }

            // Get existing tracks from database
            const existingTracks = await databaseService.getAllTracks();
            const existingTrackMap = new Map(existingTracks.map(t => [t.path, t]));

            // Batch profile all found tracks (more efficient than one-by-one)
            const profiledTracks = await libraryProfilingService.profileLibrary(
                deviceTracks,
                (current, total) => {
                    callback?.onProgress({
                        totalFound: foundCount,
                        profiled: current,
                        inProgress: true,
                        currentFile: deviceTracks[current]?.title || '',
                        percentage: Math.round((current / total) * 100),
                    });
                }
            );

            // Save profiled tracks
            let profiledCount = 0;

            for (const profiled of profiledTracks) {
                if (this.cancelRequested) break;

                try {
                    const existingTrack = existingTrackMap.get(profiled.path || '');

                    if (existingTrack) {
                        // Track exists - update with profiled metadata
                        const updated = { ...existingTrack, ...profiled };
                        results.updatedTracks.push(updated);
                        await databaseService.saveTrack(updated);
                    } else {
                        // New track
                        results.newTracks.push(profiled);
                        await databaseService.saveTrack(profiled);
                    }

                    profiledCount++;
                } catch (error) {
                    console.warn(`Failed to save track: ${profiled.path}`, error);
                }
            }

            // Find removed tracks (existed before but not found now)
            for (const [path, existingTrack] of existingTrackMap.entries()) {
                if (!deviceTracks.find(t => t.path === path)) {
                    results.removedTracks.push(existingTrack.id);
                    await databaseService.deleteTrack(existingTrack.id);
                }
            }

            results.totalScanned = profiledCount;
            results.durationMs = Date.now() - startTime;

            callback?.onComplete(results);
            return results;
        } catch (error) {
            callback?.onError(error as Error);
            throw error;
        } finally {
            this.isScanning = false;
            this.cancelRequested = false;
        }
    }

    /**
     * Cancel ongoing scan
     */
    cancelScan(): void {
        this.cancelRequested = true;
    }

    /**
     * Check if scan is in progress
     */
    getIsScanning(): boolean {
        return this.isScanning;
    }

    /**
     * Generate track ID from path
     */
    private generateTrackId(path: string): string {
        return this.simpleHash(path);
    }

    /**
     * Simple hash function for generating fingerprints and IDs
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).substring(0, 16);
    }
}

export default SongScannerService.getInstance();
