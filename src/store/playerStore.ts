// Player Store - Global state for audio playback using Zustand
import { create } from 'zustand';
import { Track, RepeatMode, ShuffleMode, PlayerState, ABRepeatState } from '@/types';
import { audioService } from '@/services/AudioService';
import { databaseService } from '@/services/DatabaseService';
import { playbackTracker } from '@/services/PlaybackTracker';

interface PlayerStore extends PlayerState {
    // Extended state
    abRepeat: ABRepeatState | null;
    bookmarkPosition: number | null; // For resume playback

    // Actions
    setCurrentTrack: (track: Track | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setPosition: (position: number) => void;
    setDuration: (duration: number) => void;
    setRepeatMode: (mode: RepeatMode) => void;
    setShuffleMode: (mode: ShuffleMode) => void;
    setVolume: (volume: number) => void;
    setCurrentQueueId: (queueId: string | null) => void;

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

    // Setters
    setCurrentTrack: (track) => set({ currentTrack: track }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setPosition: (position) => set({ position }),
    setDuration: (duration) => set({ duration }),
    setRepeatMode: (mode) => set({ repeatMode: mode }),
    setShuffleMode: (mode) => set({ shuffleMode: mode }),
    setVolume: (volume) => set({ volume }),
    setCurrentQueueId: (queueId) => set({ currentQueueId: queueId }),

    // Playback actions
    play: async () => {
        await audioService.play();
        set({ isPlaying: true });
    },

    pause: async () => {
        await audioService.pause();
        set({ isPlaying: false });
    },

    togglePlayPause: async () => {
        const { isPlaying } = get();
        if (isPlaying) {
            await get().pause();
        } else {
            await get().play();
        }
    },

    seekTo: async (position) => {
        await audioService.seekTo(position);
        set({ position });
    },

    skipNext: async () => {
        await audioService.skipToNext();
    },

    skipPrevious: async () => {
        const { position } = get();
        // If more than 3 seconds in, restart track instead of going previous
        if (position > 3) {
            await audioService.seekTo(0);
        } else {
            await audioService.skipToPrevious();
        }
    },

    skipToIndex: async (index) => {
        await audioService.skipToTrack(index);
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
        await audioService.setRepeatMode(newMode);
        set({ repeatMode: newMode });
    },

    toggleShuffle: () => {
        const { shuffleMode } = get();
        set({ shuffleMode: shuffleMode === 'off' ? 'on' : 'off' });
    },

    // Extended features

    toggleFavorite: async () => {
        const { currentTrack } = get();
        if (!currentTrack) return false;

        const isFavorite = await databaseService.toggleFavorite(currentTrack.path);
        set({ currentTrack: { ...currentTrack, isFavorite } });
        return isFavorite;
    },

    setRating: async (rating) => {
        const { currentTrack } = get();
        if (!currentTrack) return;

        await databaseService.setRating(currentTrack.path, rating);
        set({ currentTrack: { ...currentTrack, rating: rating || undefined } });
    },

    saveBookmark: async () => {
        const { currentTrack, position } = get();
        if (!currentTrack) return;

        await playbackTracker.saveBookmark(position);
        set({ bookmarkPosition: position });
    },

    clearBookmark: async () => {
        await playbackTracker.clearBookmark();
        set({ bookmarkPosition: null });
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

        await databaseService.setABRepeat(currentTrack.id, start * 1000, end * 1000);
        set({ abRepeat: abState });
    },

    clearABRepeat: async () => {
        await databaseService.clearABRepeat();
        set({ abRepeat: null });
    },

    toggleABRepeat: async () => {
        const { abRepeat } = get();
        if (!abRepeat) return;

        const isActive = await databaseService.toggleABRepeat();
        set({ abRepeat: { ...abRepeat, isActive } });
    },

    initialize: async () => {
        await audioService.initialize();
        await playbackTracker.initialize();

        const volume = await audioService.getVolume();
        const abRepeat = await databaseService.getABRepeat();
        const playbackState = await databaseService.getPlaybackState();

        set({
            volume,
            abRepeat,
            bookmarkPosition: playbackState?.position || null,
        });
    },
}));

export default usePlayerStore;
