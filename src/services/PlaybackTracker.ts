// Playback Tracker - Tracks listening statistics and triggers play count updates
// Implements: Play count at 90% completion or 30+ seconds listened
import TrackPlayer, { Event, State, Progress } from 'react-native-track-player';
import { databaseService } from './DatabaseService';
import { Track } from '@/types';

const PLAY_COUNT_PERCENTAGE = 0.9; // 90% of track duration
const PLAY_COUNT_MIN_SECONDS = 30; // Minimum 30 seconds for short tracks

interface TrackingState {
    currentTrackPath: string | null;
    startPosition: number;
    totalListenedTime: number;
    hasCountedPlay: boolean;
    lastUpdateTime: number;
}

class PlaybackTracker {
    private static instance: PlaybackTracker;
    private trackingState: TrackingState = {
        currentTrackPath: null,
        startPosition: 0,
        totalListenedTime: 0,
        hasCountedPlay: false,
        lastUpdateTime: Date.now(),
    };
    private progressInterval: NodeJS.Timeout | null = null;
    private isTracking: boolean = false;

    private constructor() { }

    static getInstance(): PlaybackTracker {
        if (!PlaybackTracker.instance) {
            PlaybackTracker.instance = new PlaybackTracker();
        }
        return PlaybackTracker.instance;
    }

    /**
     * Initialize the playback tracker
     * Call this after TrackPlayer is set up
     */
    async initialize(): Promise<void> {
        if (this.isTracking) return;
        this.isTracking = true;

        // Set up event listeners
        TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, this.handleTrackChange.bind(this));
        TrackPlayer.addEventListener(Event.PlaybackState, this.handlePlaybackStateChange.bind(this));

        // Start progress monitoring
        this.startProgressMonitoring();

        console.log('[PlaybackTracker] Initialized');
    }

    /**
     * Handle track change - save stats for previous track, reset for new track
     */
    private async handleTrackChange(event: { index?: number; track?: any }): Promise<void> {
        // Save stats for the previous track
        await this.saveCurrentTrackStats(false);

        // Reset tracking for new track
        if (event.track) {
            const trackPath = event.track.url?.replace('file://', '') || event.track.path;
            this.trackingState = {
                currentTrackPath: trackPath,
                startPosition: 0,
                totalListenedTime: 0,
                hasCountedPlay: false,
                lastUpdateTime: Date.now(),
            };

            // Record that playback started (for lastPlayed timestamp)
            if (trackPath) {
                await databaseService.getSongMetadata(trackPath);
            }

            console.log('[PlaybackTracker] Now tracking:', event.track.title);
        }
    }

    /**
     * Handle playback state changes (play, pause, stop)
     */
    private async handlePlaybackStateChange(event: { state: State }): Promise<void> {
        if (event.state === State.Paused || event.state === State.Stopped) {
            // Save stats when pausing or stopping
            await this.saveCurrentTrackStats(false);
        }
    }

    /**
     * Start monitoring playback progress
     */
    private startProgressMonitoring(): void {
        if (this.progressInterval) return;

        this.progressInterval = setInterval(async () => {
            try {
                const state = await TrackPlayer.getPlaybackState();
                if (state.state !== State.Playing) return;

                const progress = await TrackPlayer.getProgress();
                await this.updateProgress(progress);
            } catch (error) {
                // TrackPlayer might not be ready
            }
        }, 1000); // Check every second
    }

    /**
     * Update progress and check for play count trigger
     */
    private async updateProgress(progress: Progress): Promise<void> {
        if (!this.trackingState.currentTrackPath) return;

        const now = Date.now();
        const elapsed = (now - this.trackingState.lastUpdateTime) / 1000;
        this.trackingState.totalListenedTime += elapsed;
        this.trackingState.lastUpdateTime = now;

        // Check if we should count this as a play
        if (!this.trackingState.hasCountedPlay) {
            const duration = progress.duration;
            const position = progress.position;

            // Count play if:
            // 1. Position is >= 90% of duration, OR
            // 2. Total listened time >= 30 seconds
            const reachedPercentage = duration > 0 && (position / duration) >= PLAY_COUNT_PERCENTAGE;
            const reachedMinTime = this.trackingState.totalListenedTime >= PLAY_COUNT_MIN_SECONDS;

            if (reachedPercentage || reachedMinTime) {
                await this.incrementPlayCount();
            }
        }
    }

    /**
     * Increment play count for current track
     */
    private async incrementPlayCount(): Promise<void> {
        if (!this.trackingState.currentTrackPath || this.trackingState.hasCountedPlay) return;

        this.trackingState.hasCountedPlay = true;
        await databaseService.incrementPlayCount(this.trackingState.currentTrackPath);

        console.log('[PlaybackTracker] Play count incremented for:', this.trackingState.currentTrackPath);
    }

    /**
     * Record a skip (track changed before completion)
     */
    async recordSkip(): Promise<void> {
        if (!this.trackingState.currentTrackPath) return;
        if (this.trackingState.hasCountedPlay) return; // Not a skip if already counted

        // Only count as skip if listened for at least 3 seconds
        if (this.trackingState.totalListenedTime >= 3) {
            await databaseService.incrementSkipCount(this.trackingState.currentTrackPath);
            console.log('[PlaybackTracker] Skip recorded for:', this.trackingState.currentTrackPath);
        }
    }

    /**
     * Save accumulated stats for current track
     */
    private async saveCurrentTrackStats(isFinalSave: boolean): Promise<void> {
        if (!this.trackingState.currentTrackPath) return;

        const listenTime = this.trackingState.totalListenedTime;
        if (listenTime > 0) {
            await databaseService.addListenTime(this.trackingState.currentTrackPath, Math.floor(listenTime));
        }

        // Check if this was a skip
        if (isFinalSave && !this.trackingState.hasCountedPlay && listenTime >= 3) {
            await this.recordSkip();
        }
    }

    /**
     * Save bookmark position for resume later
     */
    async saveBookmark(position: number): Promise<void> {
        if (!this.trackingState.currentTrackPath) return;

        // Only save bookmark for tracks longer than 3 minutes
        const progress = await TrackPlayer.getProgress();
        if (progress.duration > 180) {
            await databaseService.saveBookmarkPosition(
                this.trackingState.currentTrackPath,
                Math.floor(position * 1000) // Convert to milliseconds
            );
        }
    }

    /**
     * Get bookmark position for a track (returns seconds)
     */
    async getBookmark(filePath: string): Promise<number | null> {
        const positionMs = await databaseService.getBookmarkPosition(filePath);
        return positionMs ? positionMs / 1000 : null;
    }

    /**
     * Clear bookmark for current track
     */
    async clearBookmark(): Promise<void> {
        if (!this.trackingState.currentTrackPath) return;
        await databaseService.clearBookmarkPosition(this.trackingState.currentTrackPath);
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        this.isTracking = false;
    }

    /**
     * Get current tracking state (for debugging)
     */
    getTrackingState(): TrackingState {
        return { ...this.trackingState };
    }
}

export const playbackTracker = PlaybackTracker.getInstance();
export default playbackTracker;
