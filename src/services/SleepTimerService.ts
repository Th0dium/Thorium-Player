// Sleep Timer Service - Countdown timer that pauses/stops playback
// Supports time-based (minutes) and track-based (after N songs) modes
// Optional fade-out: gradually reduces volume over last 30 seconds
import TrackPlayer, { Event } from 'react-native-track-player';
import { create } from 'zustand';

export type SleepTimerMode = 'time' | 'tracks';

export interface SleepTimerState {
    isActive: boolean;
    mode: SleepTimerMode;
    // Time-based
    remainingMs: number;       // Milliseconds remaining
    totalMs: number;           // Total duration set
    // Track-based
    tracksRemaining: number;
    totalTracks: number;
    // Options
    fadeOut: boolean;           // Gradually reduce volume in last 30s
    // Computed
    displayTime: string;       // "MM:SS" formatted
}

interface SleepTimerStore extends SleepTimerState {
    // Actions
    startTimer: (minutes: number, fadeOut?: boolean) => void;
    startTrackTimer: (trackCount: number, fadeOut?: boolean) => void;
    cancel: () => void;
    extendTimer: (minutes: number) => void;
    tick: () => void;           // Called every second by interval
    onTrackChange: () => void;  // Called when track changes
}

const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const DEFAULT_STATE: SleepTimerState = {
    isActive: false,
    mode: 'time',
    remainingMs: 0,
    totalMs: 0,
    tracksRemaining: 0,
    totalTracks: 0,
    fadeOut: false,
    displayTime: '0:00',
};

let timerInterval: ReturnType<typeof setInterval> | null = null;
let originalVolume = 1.0;
let trackChangeSubscription: any = null;

export const useSleepTimerStore = create<SleepTimerStore>((set, get) => ({
    ...DEFAULT_STATE,

    startTimer: (minutes, fadeOut = false) => {
        const state = get();
        // Cancel any existing timer
        if (state.isActive) {
            get().cancel();
        }

        const totalMs = minutes * 60 * 1000;

        // Store original volume for fade-out restore
        TrackPlayer.getVolume().then(v => { originalVolume = v; });

        set({
            isActive: true,
            mode: 'time',
            remainingMs: totalMs,
            totalMs,
            fadeOut,
            displayTime: formatTime(totalMs),
        });

        // Start 1-second interval
        timerInterval = setInterval(() => {
            get().tick();
        }, 1000);
    },

    startTrackTimer: (trackCount, fadeOut = false) => {
        const state = get();
        if (state.isActive) {
            get().cancel();
        }

        TrackPlayer.getVolume().then(v => { originalVolume = v; });

        set({
            isActive: true,
            mode: 'tracks',
            tracksRemaining: trackCount,
            totalTracks: trackCount,
            fadeOut,
            displayTime: `${trackCount} track${trackCount !== 1 ? 's' : ''}`,
        });

        // Listen for track changes
        trackChangeSubscription = TrackPlayer.addEventListener(
            Event.PlaybackActiveTrackChanged,
            () => {
                get().onTrackChange();
            }
        );
    },

    cancel: () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (trackChangeSubscription) {
            trackChangeSubscription.remove();
            trackChangeSubscription = null;
        }

        // Restore volume if fade was in progress
        TrackPlayer.setVolume(originalVolume).catch(() => { });

        set({ ...DEFAULT_STATE });
    },

    extendTimer: (minutes) => {
        const { isActive, mode, remainingMs } = get();
        if (!isActive || mode !== 'time') return;

        const newRemaining = remainingMs + minutes * 60 * 1000;
        set({
            remainingMs: newRemaining,
            totalMs: get().totalMs + minutes * 60 * 1000,
            displayTime: formatTime(newRemaining),
        });
    },

    tick: () => {
        const { isActive, mode, remainingMs, fadeOut } = get();
        if (!isActive || mode !== 'time') return;

        const newRemaining = remainingMs - 1000;

        if (newRemaining <= 0) {
            // Timer expired — pause playback
            TrackPlayer.pause();
            // Restore volume if we faded
            if (fadeOut) {
                TrackPlayer.setVolume(originalVolume).catch(() => { });
            }
            get().cancel();
            return;
        }

        // Fade-out: gradually reduce volume in last 30 seconds
        if (fadeOut && newRemaining <= 30000) {
            const fadeProgress = newRemaining / 30000; // 1.0 → 0.0
            TrackPlayer.setVolume(originalVolume * fadeProgress).catch(() => { });
        }

        set({
            remainingMs: newRemaining,
            displayTime: formatTime(newRemaining),
        });
    },

    onTrackChange: () => {
        const { isActive, mode, tracksRemaining, fadeOut } = get();
        if (!isActive || mode !== 'tracks') return;

        const newRemaining = tracksRemaining - 1;

        if (newRemaining <= 0) {
            // Last track finished — pause at end of this track
            // We let the current track finish playing, then pause
            TrackPlayer.pause();
            if (fadeOut) {
                TrackPlayer.setVolume(originalVolume).catch(() => { });
            }
            get().cancel();
            return;
        }

        set({
            tracksRemaining: newRemaining,
            displayTime: `${newRemaining} track${newRemaining !== 1 ? 's' : ''}`,
        });
    },
}));

export default useSleepTimerStore;
