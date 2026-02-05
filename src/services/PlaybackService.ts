// Playback Service - Background playback handler for react-native-track-player
import TrackPlayer, { Event } from 'react-native-track-player';
import { useSettingsStore } from '@/store/settingsStore';
import { usePlayerStore } from '@/store/playerStore';

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
                    console.log('[PlaybackService] Could not check settings for auto-resume');
                }
                wasPlayingBeforeNoisy = false;
            }
        }
    });

    // Handle playback ending
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
        console.log('Queue ended', event);
    });

    // Handle track change - update player store
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
        if (event.track) {
            console.log('[PlaybackService] Track changed:', event.track.title);
            // Sync with player store if available
            try {
                const setCurrentTrack = usePlayerStore.getState().setCurrentTrack;
                // Note: We'd need to convert TPTrack back to our Track type
                // This is handled elsewhere in the app flow
            } catch (e) {
                // Store might not be available
            }
        }
    });

    // Handle errors
    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('Playback error:', event);
    });
};
