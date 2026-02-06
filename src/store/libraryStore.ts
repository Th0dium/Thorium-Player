// Library Store - State for music library, albums, artists, and search
import { create } from 'zustand';
import { Track, Album, Artist, Folder, Playlist, Genre } from '@/types';
import { databaseService } from '@/services/DatabaseService';
import { fileSystemService } from '@/services/FileSystemService';
import { libraryProfilingService } from '@/services/LibraryProfilingService';

interface LibraryStore {
    // State
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
    folders: Folder[];
    playlists: Playlist[];
    genres: Genre[];
    isLoading: boolean;
    isScanning: boolean;
    scanProgress: number;
    searchQuery: string;
    searchResults: Track[];

    // Actions
    loadLibrary: () => Promise<void>;
    scanForMusic: (paths?: string[]) => Promise<void>;
    setSearchQuery: (query: string) => void;
    search: (query: string) => void;
    refreshPlaylists: () => Promise<void>;

    // Playlist actions
    createPlaylist: (name: string, trackIds?: string[]) => Promise<Playlist>;
    deletePlaylist: (id: string) => Promise<void>;
    addToPlaylist: (playlistId: string, trackIds: string[]) => Promise<void>;
    removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
    // Initial state
    tracks: [],
    albums: [],
    artists: [],
    folders: [],
    playlists: [],
    genres: [],
    isLoading: false,
    isScanning: false,
    scanProgress: 0,
    searchQuery: '',
    searchResults: [],

    // Load library from database
    loadLibrary: async () => {
        set({ isLoading: true });
        try {
            const [tracks, playlists] = await Promise.all([
                databaseService.getAllTracks(),
                databaseService.getAllPlaylists(),
            ]);

            // Build albums and artists from tracks
            const albumMap = new Map<string, Album>();
            const artistMap = new Map<string, Artist>();

            tracks.forEach(track => {
                // Build album
                const albumKey = `${track.album}_${track.artist}`;
                if (!albumMap.has(albumKey)) {
                    albumMap.set(albumKey, {
                        id: `album_${albumKey.replace(/\s+/g, '_')}`,
                        name: track.album,
                        artist: track.artist,
                        artwork: track.albumArt,
                        year: track.year,
                        trackIds: [],
                    });
                }
                albumMap.get(albumKey)!.trackIds.push(track.id);

                // Build artist
                if (!artistMap.has(track.artist)) {
                    artistMap.set(track.artist, {
                        id: `artist_${track.artist.replace(/\s+/g, '_')}`,
                        name: track.artist,
                        trackIds: [],
                        albumIds: [],
                    });
                }
                artistMap.get(track.artist)!.trackIds.push(track.id);
            });

            // Link albums to artists
            albumMap.forEach(album => {
                const artist = artistMap.get(album.artist);
                if (artist && !artist.albumIds.includes(album.id)) {
                    artist.albumIds.push(album.id);
                }
            });

            // Build genres from tracks
            const genreMap = new Map<string, Genre>();
            tracks.forEach(track => {
                if (track.genre) {
                    const genreName = track.genre.trim();
                    if (!genreMap.has(genreName)) {
                        genreMap.set(genreName, {
                            id: `genre_${genreName.replace(/\s+/g, '_')}`,
                            name: genreName,
                            trackIds: [],
                            tracks: [],
                        });
                    }
                    const genre = genreMap.get(genreName)!;
                    genre.trackIds.push(track.id);
                    genre.tracks!.push(track);
                    genre.trackCount = genre.trackIds.length;
                }
            });

            // Add track counts and tracks to albums
            albumMap.forEach((album, key) => {
                album.trackCount = album.trackIds.length;
                album.tracks = album.trackIds.map(id => tracks.find(t => t.id === id)!).filter(Boolean);
            });

            // Add track/album counts and tracks to artists
            artistMap.forEach(artist => {
                artist.trackCount = artist.trackIds.length;
                artist.albumCount = artist.albumIds.length;
                artist.tracks = artist.trackIds.map(id => tracks.find(t => t.id === id)!).filter(Boolean);
            });

            set({
                tracks,
                albums: Array.from(albumMap.values()),
                artists: Array.from(artistMap.values()),
                genres: Array.from(genreMap.values()),
                playlists,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error loading library:', error);
            set({ isLoading: false });
        }
    },

    // Scan device for music files
    scanForMusic: async (paths?: string[]) => {
        set({ isScanning: true, scanProgress: 0 });
        try {
            const scanPaths = paths || fileSystemService.getDefaultMusicPaths();
            const settings = await databaseService.getSettings();

            console.log('[LibraryStore] Starting scan with paths:', scanPaths);

            // Step 1: Scan filesystem for audio files (30%)
            const { tracks: scannedTracks, folders } = await fileSystemService.scanDirectories(
                scanPaths,
                settings.excludeFolders
            );

            console.log(`[LibraryStore] Found ${scannedTracks.length} audio files`);
            set({ scanProgress: 30 });

            // Step 2: Profile tracks with metadata from MusicFiles API (30% -> 80%)
            // This enriches tracks with title, artist, album, duration, artwork
            const profiledTracks = await libraryProfilingService.profileLibrary(
                scannedTracks as Track[],
                (current, total) => {
                    // Map profiling progress from 30% to 80%
                    const progress = 30 + Math.round((current / total) * 50);
                    set({ scanProgress: progress });
                }
            );

            console.log(`[LibraryStore] Profiled ${profiledTracks.length} tracks`);
            set({ scanProgress: 85 });

            // Step 3: Merge with existing tracks (preserve AI tags)
            const existingTracks = await databaseService.getAllTracks();
            const existingMap = new Map(existingTracks.map(t => [t.path, t]));

            const mergedTracks: Track[] = profiledTracks.map(profiled => {
                const existing = existingMap.get(profiled.path!);
                if (existing) {
                    // Preserve AI tags from existing track
                    return {
                        ...profiled,
                        aiTags: existing.aiTags || profiled.aiTags,
                        taggedAt: existing.taggedAt || profiled.taggedAt,
                    } as Track;
                }
                return profiled as Track;
            });

            set({ scanProgress: 90 });

            // Step 4: Save to database
            await databaseService.saveTracks(mergedTracks);

            set({ scanProgress: 100, folders });
            console.log(`[LibraryStore] Saved ${mergedTracks.length} tracks to database`);

            // Reload library to update UI
            await get().loadLibrary();
        } catch (error) {
            console.error('Error scanning for music:', error);
        } finally {
            set({ isScanning: false, scanProgress: 0 });
        }
    },

    // Search
    setSearchQuery: (query) => set({ searchQuery: query }),

    search: (query) => {
        const { tracks } = get();
        const queryLower = query.toLowerCase();

        if (!query.trim()) {
            set({ searchResults: [], searchQuery: query });
            return;
        }

        const results = tracks.filter(track =>
            track.title.toLowerCase().includes(queryLower) ||
            track.artist.toLowerCase().includes(queryLower) ||
            track.album.toLowerCase().includes(queryLower) ||
            track.aiTags.some(tag => tag.name.toLowerCase().includes(queryLower))
        );

        set({ searchResults: results, searchQuery: query });
    },

    // Playlists
    refreshPlaylists: async () => {
        const playlists = await databaseService.getAllPlaylists();
        set({ playlists });
    },

    createPlaylist: async (name, trackIds = []) => {
        const playlist = await databaseService.createPlaylist(name, trackIds);
        await get().refreshPlaylists();
        return playlist;
    },

    deletePlaylist: async (id) => {
        await databaseService.deletePlaylist(id);
        await get().refreshPlaylists();
    },

    addToPlaylist: async (playlistId, trackIds) => {
        await databaseService.addTracksToPlaylist(playlistId, trackIds);
        await get().refreshPlaylists();
    },

    removeFromPlaylist: async (playlistId, trackId) => {
        await databaseService.removeTrackFromPlaylist(playlistId, trackId);
        await get().refreshPlaylists();
    },
}));

export default useLibraryStore;
