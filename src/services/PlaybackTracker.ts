// Playback Tracker - Tracks listening statistics and triggers play count updates
// Implements: Play count at 90% completion or 30+ seconds listened
import TrackPlayer, { Event, State, Progress } from 'react-native-track-player';
import { databaseService } from './DatabaseService';
import { Track } from '@/store/types';

const PLAY_COUNT_PERCENTAGE = 0.9; // 90% of track duration
const PLAY_COUNT_MIN_SECONDS = 30; // Minimum 30 seconds for short tracks

interface TrackingState {
    currentTrackPath: string | null;
    startPosition: number;
    totalListenedTime: number;
    hasCountedPlay: boolean;
    lastUpdateTime: number;
    isPlaying: boolean;
}

/**
 * Normalize file path by removing file:// prefix if present
 * This ensures consistent path handling across the app
 */
function normalizePath(path: string | undefined | null): string | null {
    if (!path) return null;
    return path.replace(/^file:\/\//, '');
}

class PlaybackTracker {
    private static instance: PlaybackTracker;
    private trackingState: TrackingState = {
        currentTrackPath: null,
        startPosition: 0,
        totalListenedTime: 0,
        hasCountedPlay: false,
        lastUpdateTime: Date.now(),
        isPlaying: false,
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

        if (__DEV__) {
            console.log('[PlaybackTracker] Initialized');
        }
    }

    /**
     * Handle track change - save stats for previous track, reset for new track
     */
    private async handleTrackChange(event: { index?: number; track?: any }): Promise<void> {
        // Fire-and-forget save for the previous track (don't block new track setup)
        if (this.trackingState.currentTrackPath) {
            this.saveCurrentTrackStats(true).catch(e =>
                console.warn('[PlaybackTracker] Failed to save stats for previous track:', e)
            );
        }

        // Reset tracking for new track immediately
        if (event.track) {
            const trackPath = normalizePath(event.track.url || event.track.path);

            this.trackingState = {
                currentTrackPath: trackPath,
                startPosition: 0,
                totalListenedTime: 0,
                hasCountedPlay: false,
                lastUpdateTime: Date.now(),
                isPlaying: false,
            };

            // Fire-and-forget lastPlayed update
            if (trackPath) {
                databaseService.updateLastPlayed(trackPath).catch(e =>
                    console.warn('[PlaybackTracker] Failed to update lastPlayed:', e)
                );
                if (__DEV__) {
                    console.log('[PlaybackTracker] Now tracking:', event.track.title);
                }
            }
        } else {
            // No track - reset state completely
            this.trackingState = {
                currentTrackPath: null,
                startPosition: 0,
                totalListenedTime: 0,
                hasCountedPlay: false,
                lastUpdateTime: Date.now(),
                isPlaying: false,
            };
        }
    }

    /**
     * Handle playback state changes (play, pause, stop)
     */
    private async handlePlaybackStateChange(event: { state: State }): Promise<void> {
        const wasPlaying = this.trackingState.isPlaying;
        const isNowPlaying = event.state === State.Playing;

        if (isNowPlaying && !wasPlaying) {
            // Resuming playback - reset the timer to avoid counting paused time
            this.trackingState.lastUpdateTime = Date.now();
            this.trackingState.isPlaying = true;
        } else if (!isNowPlaying && wasPlaying) {
            // Pausing or stopping - save accumulated time first
            this.trackingState.isPlaying = false;
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
                const isPlaying = state.state === State.Playing;

                // Update our local playing state
                this.trackingState.isPlaying = isPlaying;

                if (!isPlaying) return;

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
    private updateProgress(progress: Progress): void {
        if (!this.trackingState.currentTrackPath || !this.trackingState.isPlaying) return;

        const now = Date.now();
        const elapsed = (now - this.trackingState.lastUpdateTime) / 1000;

        // Only count time if it's reasonable (< 2 seconds to handle interval drift)
        // This prevents counting huge chunks of time if the app was backgrounded
        if (elapsed > 0 && elapsed < 2) {
            this.trackingState.totalListenedTime += elapsed;
        }
        this.trackingState.lastUpdateTime = now;

        // Check if we should count this as a play
        if (!this.trackingState.hasCountedPlay) {
            const duration = progress.duration;
            const position = progress.position;

            // Count play if:
            // 1. Position is >= 90% of duration, OR
            // 2. Total listened time >= 30 seconds (per DATA SYSTEM spec)
            const reachedPercentage = duration > 0 && (position / duration) >= PLAY_COUNT_PERCENTAGE;
            const reachedMinTime = this.trackingState.totalListenedTime >= PLAY_COUNT_MIN_SECONDS;

            if (reachedPercentage || reachedMinTime) {
                this.incrementPlayCount();
            }
        }
    }

    /**
     * Increment play count for current track
     */
    private incrementPlayCount(): void {
        if (!this.trackingState.currentTrackPath || this.trackingState.hasCountedPlay) return;

        this.trackingState.hasCountedPlay = true;
        // Fire-and-forget
        databaseService.incrementPlayCount(this.trackingState.currentTrackPath).catch(e =>
            console.warn('[PlaybackTracker] Failed to increment play count:', e)
        );

        if (__DEV__) {
            console.log('[PlaybackTracker] Play count incremented for:', this.trackingState.currentTrackPath);
        }
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
            if (__DEV__) {
                console.log('[PlaybackTracker] Skip recorded for:', this.trackingState.currentTrackPath);
            }
        }
    }

    /**
     * Save accumulated stats for current track
     */
    private async saveCurrentTrackStats(isFinalSave: boolean): Promise<void> {
        if (!this.trackingState.currentTrackPath) return;

        const listenTime = this.trackingState.totalListenedTime;

        // Parallelize independent DB writes
        const promises: Promise<void>[] = [];

        if (listenTime > 0) {
            promises.push(
                databaseService.addListenTime(this.trackingState.currentTrackPath, Math.floor(listenTime))
            );
        }

        // Check if this was a skip
        if (isFinalSave && !this.trackingState.hasCountedPlay && listenTime >= 3) {
            promises.push(this.recordSkip());
        }

        if (promises.length > 0) {
            await Promise.all(promises);
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
