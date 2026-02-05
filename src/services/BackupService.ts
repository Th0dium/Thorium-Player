// Backup Service - Handles backup creation, restoration, and path re-mapping
// Creates a .mus (ZIP) file containing database, preferences, and metadata
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { zip, unzip } from 'react-native-zip-archive';
import {
    BackupMetadata,
    BackupPackage,
    PathMapping,
    SongMetadata,
    PlaylistEntry,
    Track,
    Playlist,
    Queue,
    Settings,
} from '@/types';
import { databaseService } from './DatabaseService';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

const APP_VERSION = '1.0.0';
const BACKUP_EXTENSION = '.mus';
const ROOT_PLACEHOLDER = '[ROOT]';

class BackupService {
    private static instance: BackupService;

    private constructor() { }

    static getInstance(): BackupService {
        if (!BackupService.instance) {
            BackupService.instance = new BackupService();
        }
        return BackupService.instance;
    }

    // ============ BACKUP CREATION ============

    /**
     * Creates a full backup of the app state
     * Returns the path to the backup file
     */
    async createBackup(customName?: string): Promise<string> {
        try {
            const timestamp = Date.now();
            const deviceName = await DeviceInfo.getDeviceName();

            // Gather all data
            const tracks = await databaseService.getAllTracks();
            const playlists = await databaseService.getAllPlaylists();
            const queues = await databaseService.getAllQueues();
            const settings = await databaseService.getSettings();

            // Get UI settings from AsyncStorage
            const uiSettingsJson = await AsyncStorage.getItem('@thorium/ui_settings');
            const uiSettings = uiSettingsJson ? JSON.parse(uiSettingsJson) : {};

            // Build song metadata from tracks
            const songMetadata: SongMetadata[] = tracks.map(track => ({
                filePath: track.path,
                playCount: track.playCount || 0,
                lastPlayedTimestamp: track.lastPlayed || null,
                dateAddedToApp: track.dateAdded || timestamp,
                isFavorite: track.isFavorite || false,
                bookmarkPosition: track.bookmarkPosition || null,
                totalListenTime: track.totalListenTime || 0,
                skipCount: track.skipCount || 0,
                rating: track.rating || null,
            }));

            // Build playlist entries
            const playlistEntries: PlaylistEntry[] = [];
            playlists.forEach(playlist => {
                playlist.trackIds.forEach((trackId, index) => {
                    const track = tracks.find(t => t.id === trackId);
                    if (track) {
                        playlistEntries.push({
                            playlistId: playlist.id,
                            songFilePath: track.path,
                            entryOrder: index,
                            addedAt: playlist.createdAt,
                        });
                    }
                });
            });

            // Determine common root path for path re-mapping
            const allPaths = tracks.map(t => t.path);
            const commonRoot = this.findCommonRoot(allPaths);
            const relativePaths = allPaths.map(p => this.toRelativePath(p, commonRoot));

            // Calculate checksum
            const dataString = JSON.stringify({ songMetadata, playlistEntries, playlists, queues });
            const checksum = this.calculateChecksum(dataString);

            // Build backup package
            const backupPackage: BackupPackage = {
                metadata: {
                    backupDate: timestamp,
                    appVersion: APP_VERSION,
                    deviceName,
                    trackCount: tracks.length,
                    playlistCount: playlists.length,
                    checksum,
                },
                database: {
                    songMetadata,
                    playlistEntries,
                    playlists,
                    queues,
                },
                preferences: {
                    settings,
                    uiSettings,
                },
                pathMappings: {
                    originalRoot: commonRoot,
                    relativePaths,
                },
            };

            // Create backup directory
            const backupDir = `${RNFS.DocumentDirectoryPath}/backups`;
            await RNFS.mkdir(backupDir);

            // Create temp directory for backup files
            const tempDir = `${RNFS.CachesDirectoryPath}/backup_temp_${timestamp}`;
            await RNFS.mkdir(tempDir);

            // Write backup files
            await RNFS.writeFile(
                `${tempDir}/database_export.json`,
                JSON.stringify(backupPackage.database, null, 2),
                'utf8'
            );
            await RNFS.writeFile(
                `${tempDir}/preferences.json`,
                JSON.stringify(backupPackage.preferences, null, 2),
                'utf8'
            );
            await RNFS.writeFile(
                `${tempDir}/metadata.json`,
                JSON.stringify(backupPackage.metadata, null, 2),
                'utf8'
            );
            await RNFS.writeFile(
                `${tempDir}/path_mappings.json`,
                JSON.stringify(backupPackage.pathMappings, null, 2),
                'utf8'
            );

            // Create ZIP file
            const backupName = customName || `thorium_backup_${this.formatDate(timestamp)}`;
            const backupPath = `${backupDir}/${backupName}${BACKUP_EXTENSION}`;

            await zip(tempDir, backupPath);

            // Clean up temp directory
            await RNFS.unlink(tempDir);

            console.log('[BackupService] Backup created:', backupPath);
            return backupPath;
        } catch (error) {
            console.error('[BackupService] Error creating backup:', error);
            throw error;
        }
    }

    // ============ BACKUP RESTORATION ============

    /**
     * Validates a backup file without restoring it
     */
    async validateBackup(backupPath: string): Promise<{ valid: boolean; metadata?: BackupMetadata; error?: string }> {
        try {
            const tempDir = `${RNFS.CachesDirectoryPath}/backup_validate_${Date.now()}`;
            await RNFS.mkdir(tempDir);

            // Extract backup
            await unzip(backupPath, tempDir);

            // Read metadata
            const metadataJson = await RNFS.readFile(`${tempDir}/metadata.json`, 'utf8');
            const metadata: BackupMetadata = JSON.parse(metadataJson);

            // Read database for checksum verification
            const databaseJson = await RNFS.readFile(`${tempDir}/database_export.json`, 'utf8');
            const database = JSON.parse(databaseJson);

            // Verify checksum
            const dataString = JSON.stringify({
                songMetadata: database.songMetadata,
                playlistEntries: database.playlistEntries,
                playlists: database.playlists,
                queues: database.queues,
            });
            const calculatedChecksum = this.calculateChecksum(dataString);

            // Clean up
            await RNFS.unlink(tempDir);

            if (calculatedChecksum !== metadata.checksum) {
                return { valid: false, error: 'Backup file is corrupted (checksum mismatch)' };
            }

            return { valid: true, metadata };
        } catch (error) {
            return { valid: false, error: `Invalid backup file: ${error}` };
        }
    }

    /**
     * Restores a backup with optional path re-mapping
     */
    async restoreBackup(
        backupPath: string,
        newMusicRoot?: string,
        options: { restoreSettings?: boolean; restorePlaylists?: boolean; restoreQueues?: boolean } = {}
    ): Promise<{ success: boolean; remappedCount: number; unmappedPaths: string[]; error?: string }> {
        const { restoreSettings = true, restorePlaylists = true, restoreQueues = true } = options;

        try {
            // Validate first
            const validation = await this.validateBackup(backupPath);
            if (!validation.valid) {
                return { success: false, remappedCount: 0, unmappedPaths: [], error: validation.error };
            }

            const tempDir = `${RNFS.CachesDirectoryPath}/backup_restore_${Date.now()}`;
            await RNFS.mkdir(tempDir);

            // Extract backup
            await unzip(backupPath, tempDir);

            // Read all backup data
            const databaseJson = await RNFS.readFile(`${tempDir}/database_export.json`, 'utf8');
            const preferencesJson = await RNFS.readFile(`${tempDir}/preferences.json`, 'utf8');
            const pathMappingsJson = await RNFS.readFile(`${tempDir}/path_mappings.json`, 'utf8');

            const database = JSON.parse(databaseJson);
            const preferences = JSON.parse(preferencesJson);
            const pathMappings = JSON.parse(pathMappingsJson);

            // Perform path re-mapping if new root is provided
            let remappedCount = 0;
            const unmappedPaths: string[] = [];

            if (newMusicRoot) {
                const pathMap = await this.createPathRemapping(
                    pathMappings.originalRoot,
                    newMusicRoot,
                    pathMappings.relativePaths
                );

                // Update song metadata paths
                for (const metadata of database.songMetadata) {
                    const newPath = pathMap.get(this.toRelativePath(metadata.filePath, pathMappings.originalRoot));
                    if (newPath && await RNFS.exists(newPath)) {
                        metadata.filePath = newPath;
                        remappedCount++;
                    } else {
                        unmappedPaths.push(metadata.filePath);
                    }
                }

                // Update playlist entries
                for (const entry of database.playlistEntries) {
                    const relativePath = this.toRelativePath(entry.songFilePath, pathMappings.originalRoot);
                    const newPath = pathMap.get(relativePath);
                    if (newPath) {
                        entry.songFilePath = newPath;
                    }
                }
            }

            // Restore song metadata to existing tracks
            const existingTracks = await databaseService.getAllTracks();
            const trackPathMap = new Map(existingTracks.map(t => [t.path, t]));

            for (const metadata of database.songMetadata) {
                const track = trackPathMap.get(metadata.filePath);
                if (track) {
                    // Merge metadata into existing track
                    track.playCount = Math.max(track.playCount || 0, metadata.playCount);
                    track.lastPlayed = metadata.lastPlayedTimestamp || track.lastPlayed;
                    track.dateAdded = metadata.dateAddedToApp;
                    track.isFavorite = metadata.isFavorite;
                    track.bookmarkPosition = metadata.bookmarkPosition || undefined;
                    track.totalListenTime = (track.totalListenTime || 0) + (metadata.totalListenTime || 0);
                    track.skipCount = (track.skipCount || 0) + (metadata.skipCount || 0);
                    track.rating = metadata.rating || track.rating;
                }
            }

            // Save updated tracks
            await databaseService.saveTracks(existingTracks);

            // Restore playlists
            if (restorePlaylists) {
                for (const playlist of database.playlists) {
                    // Find matching track IDs for the playlist
                    const playlistTrackIds: string[] = [];
                    const entries = database.playlistEntries
                        .filter((e: PlaylistEntry) => e.playlistId === playlist.id)
                        .sort((a: PlaylistEntry, b: PlaylistEntry) => a.entryOrder - b.entryOrder);

                    for (const entry of entries) {
                        const track = Array.from(trackPathMap.values()).find(t => t.path === entry.songFilePath);
                        if (track) {
                            playlistTrackIds.push(track.id);
                        }
                    }

                    // Create or update playlist
                    playlist.trackIds = playlistTrackIds;
                    await databaseService.createPlaylist(playlist.name, playlistTrackIds, playlist.isAIGenerated, playlist.aiPrompt);
                }
            }

            // Restore queues
            if (restoreQueues) {
                for (const queue of database.queues) {
                    await databaseService.saveQueue(queue);
                }
            }

            // Restore settings
            if (restoreSettings) {
                await databaseService.updateSettings(preferences.settings);
                await AsyncStorage.setItem('@thorium/ui_settings', JSON.stringify(preferences.uiSettings));
            }

            // Clean up
            await RNFS.unlink(tempDir);

            console.log('[BackupService] Backup restored successfully');
            return { success: true, remappedCount, unmappedPaths };
        } catch (error) {
            console.error('[BackupService] Error restoring backup:', error);
            return { success: false, remappedCount: 0, unmappedPaths: [], error: String(error) };
        }
    }

    // ============ PATH RE-MAPPING ============

    /**
     * Scans a directory for music files and creates a mapping from relative paths to actual paths
     */
    async createPathRemapping(
        originalRoot: string,
        newRoot: string,
        relativePaths: string[]
    ): Promise<Map<string, string>> {
        const pathMap = new Map<string, string>();

        // Scan the new root for all audio files
        const audioExtensions = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma'];
        const foundFiles = await this.scanDirectoryRecursive(newRoot, audioExtensions);

        // Build a map from filename to full path for quick lookup
        const filenameMap = new Map<string, string[]>();
        for (const filePath of foundFiles) {
            const filename = filePath.split('/').pop()?.toLowerCase() || '';
            if (!filenameMap.has(filename)) {
                filenameMap.set(filename, []);
            }
            filenameMap.get(filename)!.push(filePath);
        }

        // Map relative paths to new paths
        for (const relativePath of relativePaths) {
            const filename = relativePath.split('/').pop()?.toLowerCase() || '';
            const candidates = filenameMap.get(filename) || [];

            if (candidates.length === 1) {
                // Exact match by filename
                pathMap.set(relativePath, candidates[0]);
            } else if (candidates.length > 1) {
                // Multiple matches - try to match by partial path
                const relativeDir = relativePath.replace(ROOT_PLACEHOLDER, '').toLowerCase();
                const bestMatch = candidates.find(c => c.toLowerCase().includes(relativeDir));
                if (bestMatch) {
                    pathMap.set(relativePath, bestMatch);
                }
            }
        }

        return pathMap;
    }

    /**
     * Bulk update paths in the database when files have moved
     */
    async bulkUpdatePaths(pathUpdates: Map<string, string>): Promise<number> {
        const tracks = await databaseService.getAllTracks();
        let updatedCount = 0;

        for (const track of tracks) {
            const newPath = pathUpdates.get(track.path);
            if (newPath) {
                track.path = newPath;
                track.url = `file://${newPath}`;
                updatedCount++;
            }
        }

        await databaseService.saveTracks(tracks);
        return updatedCount;
    }

    // ============ BACKUP MANAGEMENT ============

    /**
     * Lists all available backups
     */
    async listBackups(): Promise<{ path: string; metadata: BackupMetadata }[]> {
        const backupDir = `${RNFS.DocumentDirectoryPath}/backups`;

        try {
            const exists = await RNFS.exists(backupDir);
            if (!exists) {
                return [];
            }

            const files = await RNFS.readDir(backupDir);
            const backups: { path: string; metadata: BackupMetadata }[] = [];

            for (const file of files) {
                if (file.name.endsWith(BACKUP_EXTENSION)) {
                    try {
                        const validation = await this.validateBackup(file.path);
                        if (validation.valid && validation.metadata) {
                            backups.push({ path: file.path, metadata: validation.metadata });
                        }
                    } catch (e) {
                        // Skip invalid backups
                    }
                }
            }

            return backups.sort((a, b) => b.metadata.backupDate - a.metadata.backupDate);
        } catch (error) {
            console.error('[BackupService] Error listing backups:', error);
            return [];
        }
    }

    /**
     * Deletes a backup file
     */
    async deleteBackup(backupPath: string): Promise<boolean> {
        try {
            await RNFS.unlink(backupPath);
            return true;
        } catch (error) {
            console.error('[BackupService] Error deleting backup:', error);
            return false;
        }
    }

    /**
     * Exports backup to external storage (for sharing)
     */
    async exportBackup(backupPath: string, destinationDir?: string): Promise<string> {
        const dest = destinationDir || RNFS.DownloadDirectoryPath;
        const filename = backupPath.split('/').pop() || `thorium_backup${BACKUP_EXTENSION}`;
        const exportPath = `${dest}/${filename}`;

        await RNFS.copyFile(backupPath, exportPath);
        return exportPath;
    }

    // ============ UTILITY METHODS ============

    private findCommonRoot(paths: string[]): string {
        if (paths.length === 0) return '';
        if (paths.length === 1) return paths[0].substring(0, paths[0].lastIndexOf('/'));

        const segments = paths[0].split('/');
        let commonPath = '';

        for (let i = 0; i < segments.length; i++) {
            const testPath = segments.slice(0, i + 1).join('/');
            if (paths.every(p => p.startsWith(testPath + '/'))) {
                commonPath = testPath;
            } else {
                break;
            }
        }

        return commonPath;
    }

    private toRelativePath(absolutePath: string, root: string): string {
        if (absolutePath.startsWith(root)) {
            return ROOT_PLACEHOLDER + absolutePath.substring(root.length);
        }
        return absolutePath;
    }

    private fromRelativePath(relativePath: string, newRoot: string): string {
        return relativePath.replace(ROOT_PLACEHOLDER, newRoot);
    }

    private async scanDirectoryRecursive(dir: string, extensions: string[]): Promise<string[]> {
        const results: string[] = [];

        try {
            const items = await RNFS.readDir(dir);

            for (const item of items) {
                if (item.isDirectory()) {
                    const subResults = await this.scanDirectoryRecursive(item.path, extensions);
                    results.push(...subResults);
                } else if (extensions.some(ext => item.name.toLowerCase().endsWith(ext))) {
                    results.push(item.path);
                }
            }
        } catch (error) {
            // Ignore permission errors
        }

        return results;
    }

    private calculateChecksum(data: string): string {
        // Simple checksum using string hash
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    private formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toISOString().split('T')[0].replace(/-/g, '');
    }
}

export const backupService = BackupService.getInstance();
export default backupService;
