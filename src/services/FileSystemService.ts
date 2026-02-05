// File System Service - Scans device for audio files and manages file operations
import RNFS from 'react-native-fs';
import { Track, Folder } from '@/types';
import { Platform } from 'react-native';

// Supported audio formats
const AUDIO_EXTENSIONS = [
    '.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg',
    '.wma', '.opus', '.alac', '.ape', '.dsf', '.dff'
];

class FileSystemService {
    private static instance: FileSystemService;

    private constructor() { }

    static getInstance(): FileSystemService {
        if (!FileSystemService.instance) {
            FileSystemService.instance = new FileSystemService();
        }
        return FileSystemService.instance;
    }

    // Get default music directories based on platform
    getDefaultMusicPaths(): string[] {
        if (Platform.OS === 'android') {
            return [
                RNFS.ExternalStorageDirectoryPath + '/Music',
                RNFS.ExternalStorageDirectoryPath + '/Download',
                RNFS.ExternalStorageDirectoryPath,
            ];
        } else {
            return [RNFS.DocumentDirectoryPath];
        }
    }

    // Check if a file is an audio file
    isAudioFile(filename: string): boolean {
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return AUDIO_EXTENSIONS.includes(ext);
    }

    // Scan a directory for audio files
    async scanDirectory(
        path: string,
        recursive: boolean = true,
        excludePaths: string[] = []
    ): Promise<{ tracks: Partial<Track>[]; folders: Folder[] }> {
        const tracks: Partial<Track>[] = [];
        const folders: Folder[] = [];

        try {
            const exists = await RNFS.exists(path);
            if (!exists) {
                console.warn(`Directory does not exist: ${path}`);
                return { tracks, folders };
            }

            let items = [];
            try {
                items = await RNFS.readDir(path);
            } catch (readError) {
                console.warn(`Cannot read directory ${path}:`, (readError as any)?.message);
                return { tracks, folders };
            }

            const subfolders: string[] = [];
            let trackCount = 0;

            for (const item of items) {
                try {
                    // Skip excluded paths
                    if (excludePaths.some(excluded => item.path.startsWith(excluded))) {
                        continue;
                    }

                    if (item.isDirectory && item.isDirectory()) {
                        subfolders.push(item.path);

                        if (recursive) {
                            const subResult = await this.scanDirectory(item.path, true, excludePaths);
                            tracks.push(...subResult.tracks);
                            folders.push(...subResult.folders);
                        }
                    } else if (item.isFile && item.isFile() && this.isAudioFile(item.name)) {
                        trackCount++;
                        tracks.push({
                            id: this.generateTrackId(item.path),
                            path: item.path,
                            url: Platform.OS === 'android' ? `file://${item.path}` : item.path,
                            title: this.getFilenameWithoutExtension(item.name),
                            artist: 'Unknown Artist',
                            album: 'Unknown Album',
                            duration: 0, // Will be updated when metadata is read
                            playCount: 0,
                            bookmarks: [],
                            aiTags: [],
                        });
                    }
                } catch (itemError) {
                    // Skip problematic items
                    console.debug(`Skipping item in ${path}:`, (itemError as any)?.message);
                    continue;
                }
            }

            // Add current folder to list if it contains audio files
            if (trackCount > 0 || subfolders.length > 0) {
                folders.push({
                    id: this.generateTrackId(path), // Use same hash function for folder ID
                    path,
                    name: this.getFolderName(path),
                    trackCount,
                    subfolders,
                });
            }
        } catch (error) {
            console.error(`Error scanning directory ${path}:`, error);
        }

        return { tracks, folders };
    }

    // Scan multiple directories
    async scanDirectories(
        paths: string[],
        excludePaths: string[] = []
    ): Promise<{ tracks: Partial<Track>[]; folders: Folder[] }> {
        const allTracks: Partial<Track>[] = [];
        const allFolders: Folder[] = [];

        for (const path of paths) {
            const result = await this.scanDirectory(path, true, excludePaths);
            allTracks.push(...result.tracks);
            allFolders.push(...result.folders);
        }

        // Remove duplicates by path
        const uniqueTracks = this.removeDuplicateTracks(allTracks);
        const uniqueFolders = this.removeDuplicateFolders(allFolders);

        return { tracks: uniqueTracks, folders: uniqueFolders };
    }

    // Get folder contents (non-recursive)
    async getFolderContents(path: string): Promise<{
        tracks: Partial<Track>[];
        subfolders: { path: string; name: string }[];
    }> {
        const tracks: Partial<Track>[] = [];
        const subfolders: { path: string; name: string }[] = [];

        try {
            const items = await RNFS.readDir(path);

            for (const item of items) {
                if (item.isDirectory()) {
                    subfolders.push({
                        path: item.path,
                        name: item.name,
                    });
                } else if (item.isFile() && this.isAudioFile(item.name)) {
                    tracks.push({
                        id: this.generateTrackId(item.path),
                        path: item.path,
                        url: Platform.OS === 'android' ? `file://${item.path}` : item.path,
                        title: this.getFilenameWithoutExtension(item.name),
                        artist: 'Unknown Artist',
                        album: 'Unknown Album',
                        duration: 0,
                        playCount: 0,
                        bookmarks: [],
                        aiTags: [],
                    });
                }
            }
        } catch (error) {
            console.error(`Error reading folder ${path}:`, error);
        }

        return { tracks, subfolders };
    }

    // File operations
    async moveFile(source: string, destination: string): Promise<boolean> {
        try {
            await RNFS.moveFile(source, destination);
            return true;
        } catch (error) {
            console.error('Error moving file:', error);
            return false;
        }
    }

    async copyFile(source: string, destination: string): Promise<boolean> {
        try {
            await RNFS.copyFile(source, destination);
            return true;
        } catch (error) {
            console.error('Error copying file:', error);
            return false;
        }
    }

    async deleteFile(path: string): Promise<boolean> {
        try {
            await RNFS.unlink(path);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    async renameFile(path: string, newName: string): Promise<string | null> {
        try {
            const directory = path.substring(0, path.lastIndexOf('/'));
            const newPath = `${directory}/${newName}`;
            await RNFS.moveFile(path, newPath);
            return newPath;
        } catch (error) {
            console.error('Error renaming file:', error);
            return null;
        }
    }

    async createFolder(path: string): Promise<boolean> {
        try {
            await RNFS.mkdir(path);
            return true;
        } catch (error) {
            console.error('Error creating folder:', error);
            return false;
        }
    }

    async renameFolder(path: string, newName: string): Promise<string | null> {
        try {
            const parentDir = path.substring(0, path.lastIndexOf('/'));
            const newPath = `${parentDir}/${newName}`;
            await RNFS.moveFile(path, newPath);
            return newPath;
        } catch (error) {
            console.error('Error renaming folder:', error);
            return null;
        }
    }

    // Check file/folder existence
    async exists(path: string): Promise<boolean> {
        return await RNFS.exists(path);
    }

    // Helpers
    private generateTrackId(path: string): string {
        // Simple hash-like ID from path
        let hash = 0;
        for (let i = 0; i < path.length; i++) {
            const char = path.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `track_${Math.abs(hash).toString(16)}`;
    }

    private getFilenameWithoutExtension(filename: string): string {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(0, lastDot) : filename;
    }

    private getFolderName(path: string): string {
        const parts = path.split('/').filter(p => p.length > 0);
        return parts[parts.length - 1] || path;
    }

    private removeDuplicateTracks(tracks: Partial<Track>[]): Partial<Track>[] {
        const seen = new Set<string>();
        return tracks.filter(track => {
            if (track.path && !seen.has(track.path)) {
                seen.add(track.path);
                return true;
            }
            return false;
        });
    }

    private removeDuplicateFolders(folders: Folder[]): Folder[] {
        const seen = new Set<string>();
        return folders.filter(folder => {
            if (!seen.has(folder.path)) {
                seen.add(folder.path);
                return true;
            }
            return false;
        });
    }
}

export const fileSystemService = FileSystemService.getInstance();
export default fileSystemService;
