// Playback Service - Background playback handler for react-native-track-player
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { BackHandler } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { usePlayerStore } from '@/store/playerStore';
import { useQueueStore } from '@/store/queueStore';
import { useLibraryStore } from '@/store/libraryStore';

// Track if we were playing before audio becoming noisy
let wasPlayingBeforeNoisy = false;

module.exports = async function () {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());

    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());

    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());

    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());

    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        TrackPlayer.seekTo(event.position);
    });

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
        const position = await TrackPlayer.getProgress().then(p => p.position);
        await TrackPlayer.seekTo(position + event.interval);
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
        const position = await TrackPlayer.getProgress().then(p => p.position);
        await TrackPlayer.seekTo(Math.max(0, position - event.interval));
    });

    // Handle audio becoming noisy (headphones unplugged)
    // This respects the user's pauseOnUnplug setting
    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
        if (event.paused) {
            // Audio focus lost temporarily (e.g., phone call)
            const state = await TrackPlayer.getPlaybackState();
            if (state.state === 'playing') {
                wasPlayingBeforeNoisy = true;
                await TrackPlayer.pause();
            }
        } else if (event.permanent) {
            // Audio focus lost permanently (e.g., another app took over)
            await TrackPlayer.pause();
            wasPlayingBeforeNoisy = false;
        } else {
            // Audio focus regained
            if (wasPlayingBeforeNoisy) {
                // Check if resumeOnBluetooth is enabled before auto-resuming
                try {
                    const { resumeOnBluetooth } = useSettingsStore.getState();
                    if (resumeOnBluetooth) {
                        await TrackPlayer.play();
                    }
                } catch (e) {
                    // Settings store might not be available in service context
                    if (__DEV__) {
                        console.log('[PlaybackService] Could not check settings for auto-resume');
                    }
                }
                wasPlayingBeforeNoisy = false;
            }
        }
    });

    // Handle playback ending
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
        if (__DEV__) {
            console.log('Queue ended', event);
        }
        try {
            const { closeOnQueueEnd } = useSettingsStore.getState();
            if (closeOnQueueEnd) {
                if (__DEV__) {
                    console.log('[PlaybackService] Queue ended - closing app per user setting');
                }
                await TrackPlayer.stop();
                BackHandler.exitApp();
            }
        } catch (e) {
            console.warn('[PlaybackService] Error handling queue end:', e);
        }
    });

    // Handle track change - sync player store and queue store with TrackPlayer
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
        if (event.track && event.index !== undefined) {
            if (__DEV__) {
                console.log('[PlaybackService] Track changed:', event.track.title, 'index:', event.index);
            }
            try {
                // Update queue store's current index
                const queueState = useQueueStore.getState();
                if (queueState.currentQueue) {
                    queueState.updateCurrentIndex(event.index);

                    // Find the full track object from the library
                    const trackId = queueState.currentQueue.trackIds[event.index];
                    if (trackId) {
                        const libraryTracks = useLibraryStore.getState().tracks;
                        const fullTrack = libraryTracks.find(t => t.id === trackId);
                        if (fullTrack) {
                            usePlayerStore.getState().setCurrentTrack(fullTrack);
                        }
                    }
                }
            } catch (e) {
                console.warn('[PlaybackService] Error syncing track change:', e);
            }
        }
    });

    // Handle playback state changes - sync isPlaying to playerStore
    // Only respond to settled states (Playing/Paused/Stopped) to avoid
    // unnecessary re-renders from transient states like Buffering/Ready
    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        try {
            if (event.state === State.Playing) {
                usePlayerStore.getState().setIsPlaying(true);
            } else if (event.state === State.Paused || event.state === State.Stopped || event.state === State.None) {
                usePlayerStore.getState().setIsPlaying(false);
            }
            // Ignore transient states: Buffering, Ready, Connecting, etc.
        } catch (e) {
            // Store might not be available
        }
    });

    // Handle errors
    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('Playback error:', event);
    });
};
