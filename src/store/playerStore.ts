// Player Store - Global state for audio playback using Zustand
import { create } from 'zustand';
import { Track, RepeatMode, ShuffleMode, PlayerState, ABRepeatState } from '@/store/types';
import { audioService } from '@/services/AudioService';
import { databaseService } from '@/services/DatabaseService';
import { playbackTracker } from '@/services/PlaybackTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlayerStore extends PlayerState {
    // Extended state
    abRepeat: ABRepeatState | null;
    bookmarkPosition: number | null; // For resume playback
    playbackSpeed: number;

    // Actions
    setCurrentTrack: (track: Track | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setPosition: (position: number) => void;
    setDuration: (duration: number) => void;
    setRepeatMode: (mode: RepeatMode) => void;
    setShuffleMode: (mode: ShuffleMode) => void;
    setVolume: (volume: number) => void;
    setCurrentQueueId: (queueId: string | null) => void;
    setPlaybackSpeed: (speed: number) => Promise<void>;

    // Playback actions
    play: () => Promise<void>;
    pause: () => Promise<void>;
    togglePlayPause: () => Promise<void>;
    seekTo: (position: number) => Promise<void>;
    skipNext: () => Promise<void>;
    skipPrevious: () => Promise<void>;
    skipToIndex: (index: number) => Promise<void>;
    toggleRepeat: () => Promise<void>;
    toggleShuffle: () => void;

    // Extended features
    toggleFavorite: () => Promise<boolean>;
    setRating: (rating: number | null) => Promise<void>;
    saveBookmark: () => Promise<void>;
    clearBookmark: () => Promise<void>;
    setABRepeat: (start: number, end: number) => Promise<void>;
    clearABRepeat: () => Promise<void>;
    toggleABRepeat: () => Promise<void>;

    // Initialize
    initialize: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
    // Initial state
    isPlaying: false,
    currentTrack: null,
    currentQueueId: null,
    position: 0,
    duration: 0,
    buffered: 0,
    repeatMode: 'off',
    shuffleMode: 'off',
    volume: 1,
    abRepeat: null,
    bookmarkPosition: null,
    playbackSpeed: 1.0,

    // Setters
    setCurrentTrack: (track) => set({ currentTrack: track }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setPosition: (position) => set({ position }),
    setDuration: (duration) => set({ duration }),
    setRepeatMode: (mode) => set({ repeatMode: mode }),
    setShuffleMode: (mode) => set({ shuffleMode: mode }),
    setVolume: (volume) => set({ volume }),
    setCurrentQueueId: (queueId) => set({ currentQueueId: queueId }),

    setPlaybackSpeed: async (speed) => {
        set({ playbackSpeed: speed });
        // Fire and forget — don't block UI
        audioService.setPlaybackRate(speed).catch(e =>
            console.warn('[PlayerStore] Failed to set playback rate:', e)
        );
        // Persist in background
        AsyncStorage.setItem('@thorium/playback_speed', speed.toString()).catch(e =>
            console.warn('[PlayerStore] Failed to persist playback speed:', e)
        );
    },

    // Playback actions - Use optimistic updates (set state BEFORE async call for instant UI response)
    play: async () => {
        set({ isPlaying: true }); // Optimistic update
        audioService.play().catch(() => set({ isPlaying: false })); // Fire and forget with rollback on error
    },

    pause: async () => {
        set({ isPlaying: false }); // Optimistic update
        audioService.pause().catch(() => set({ isPlaying: true })); // Fire and forget with rollback on error
    },

    togglePlayPause: async () => {
        const { isPlaying } = get();
        const newState = !isPlaying;
        set({ isPlaying: newState }); // Optimistic update

        if (newState) {
            audioService.play().catch(() => set({ isPlaying: false }));
        } else {
            audioService.pause().catch(() => set({ isPlaying: true }));
        }
    },

    seekTo: async (position) => {
        set({ position }); // Optimistic update
        audioService.seekTo(position); // Fire and forget
    },

    skipNext: async () => {
        audioService.skipToNext(); // Fire and forget - track change handled by event listener
    },

    skipPrevious: async () => {
        const { position } = get();
        // If more than 3 seconds in, restart track instead of going previous
        if (position > 3) {
            set({ position: 0 }); // Optimistic update
            audioService.seekTo(0);
        } else {
            audioService.skipToPrevious(); // Fire and forget - track change handled by event listener
        }
    },

    skipToIndex: async (index) => {
        audioService.skipToTrack(index); // Fire and forget - track change handled by event listener
    },

    toggleRepeat: async () => {
        const { repeatMode } = get();
        let newMode: RepeatMode;
        switch (repeatMode) {
            case 'off':
                newMode = 'all';
                break;
            case 'all':
                newMode = 'one';
                break;
            case 'one':
            default:
                newMode = 'off';
        }
        set({ repeatMode: newMode }); // Optimistic update
        audioService.setRepeatMode(newMode); // Fire and forget
    },

    toggleShuffle: () => {
        const { shuffleMode } = get();
        const newMode = shuffleMode === 'off' ? 'on' : 'off';
        set({ shuffleMode: newMode });

        // Actually shuffle/unshuffle the queue
        const queueStore = require('./queueStore').useQueueStore.getState();
        if (newMode === 'on') {
            queueStore.shuffleQueue();
        } else {
            queueStore.unshuffleQueue();
        }
    },

    // Extended features

    toggleFavorite: async () => {
        const { currentTrack } = get();
        if (!currentTrack) return false;

        // Optimistic update — show result instantly
        const newFavorite = !currentTrack.isFavorite;
        set({ currentTrack: { ...currentTrack, isFavorite: newFavorite } });

        // Persist in background
        databaseService.toggleFavorite(currentTrack.path).catch(e => {
            console.warn('[PlayerStore] Failed to persist favorite:', e);
            // Rollback on error
            set({ currentTrack: { ...currentTrack, isFavorite: !newFavorite } });
        });
        return newFavorite;
    },

    setRating: async (rating) => {
        const { currentTrack } = get();
        if (!currentTrack) return;

        // Optimistic update
        const oldRating = currentTrack.rating;
        set({ currentTrack: { ...currentTrack, rating: rating || undefined } });

        // Persist in background
        databaseService.setRating(currentTrack.path, rating).catch(e => {
            console.warn('[PlayerStore] Failed to persist rating:', e);
            set({ currentTrack: { ...currentTrack, rating: oldRating } });
        });
    },

    saveBookmark: async () => {
        const { currentTrack, position } = get();
        if (!currentTrack) return;

        // Optimistic update
        set({ bookmarkPosition: position });

        // Persist in background
        playbackTracker.saveBookmark(position).catch(e =>
            console.warn('[PlayerStore] Failed to save bookmark:', e)
        );
    },

    clearBookmark: async () => {
        // Optimistic update
        set({ bookmarkPosition: null });

        // Persist in background
        playbackTracker.clearBookmark().catch(e =>
            console.warn('[PlayerStore] Failed to clear bookmark:', e)
        );
    },

    setABRepeat: async (start, end) => {
        const { currentTrack } = get();
        if (!currentTrack) return;

        const abState: ABRepeatState = {
            trackId: currentTrack.id,
            startPosition: start * 1000, // Convert to ms
            endPosition: end * 1000,
            isActive: true,
        };

        // Optimistic update
        set({ abRepeat: abState });

        // Persist in background
        databaseService.setABRepeat(currentTrack.id, start * 1000, end * 1000).catch(e =>
            console.warn('[PlayerStore] Failed to persist AB repeat:', e)
        );
    },

    clearABRepeat: async () => {
        const oldAbRepeat = get().abRepeat;
        // Optimistic update
        set({ abRepeat: null });

        // Persist in background
        databaseService.clearABRepeat().catch(e => {
            console.warn('[PlayerStore] Failed to clear AB repeat:', e);
            set({ abRepeat: oldAbRepeat });
        });
    },

    toggleABRepeat: async () => {
        const { abRepeat } = get();
        if (!abRepeat) return;

        // Optimistic update
        const newIsActive = !abRepeat.isActive;
        set({ abRepeat: { ...abRepeat, isActive: newIsActive } });

        // Persist in background
        databaseService.toggleABRepeat().catch(e => {
            console.warn('[PlayerStore] Failed to toggle AB repeat:', e);
            set({ abRepeat: { ...abRepeat, isActive: !newIsActive } });
        });
    },

    initialize: async () => {
        await audioService.initialize();
        await playbackTracker.initialize();

        // Parallelize independent init operations
        const [volume, abRepeat, playbackState, savedSpeed] = await Promise.all([
            audioService.getVolume(),
            databaseService.getABRepeat(),
            databaseService.getPlaybackState(),
            AsyncStorage.getItem('@thorium/playback_speed').catch(() => null),
        ]);

        // Restore playback speed
        let playbackSpeed = 1.0;
        if (savedSpeed) {
            playbackSpeed = parseFloat(savedSpeed);
            audioService.setPlaybackRate(playbackSpeed).catch(e =>
                console.warn('[PlayerStore] Failed to restore playback rate:', e)
            );
        }

        set({
            volume,
            abRepeat,
            playbackSpeed,
            bookmarkPosition: playbackState?.position || null,
        });
    },
}));

export default usePlayerStore;
