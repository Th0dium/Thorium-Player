// Audio Service - Core audio playback engine using react-native-track-player
import TrackPlayer, {
    Capability,
    AppKilledPlaybackBehavior,
    RepeatMode as TPRepeatMode,
    State,
    Event,
    Track as TPTrack,
} from 'react-native-track-player';
import { Track, RepeatMode } from '@/types';

class AudioService {
    private static instance: AudioService;
    private isInitialized = false;

    private constructor() { }

    static getInstance(): AudioService {
        if (!AudioService.instance) {
            AudioService.instance = new AudioService();
        }
        return AudioService.instance;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        await TrackPlayer.setupPlayer({
            autoHandleInterruptions: true,
        });

        await TrackPlayer.updateOptions({
            android: {
                appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
            },
            capabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.Stop,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.SeekTo,
                Capability.SetRating,
            ],
            compactCapabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
            ],
            progressUpdateEventInterval: 1,
        });

        this.isInitialized = true;
    }

    // Playback controls
    async play(): Promise<void> {
        await TrackPlayer.play();
    }

    async pause(): Promise<void> {
        await TrackPlayer.pause();
    }

    async stop(): Promise<void> {
        await TrackPlayer.stop();
    }

    async seekTo(position: number): Promise<void> {
        await TrackPlayer.seekTo(position);
    }

    async skipToNext(): Promise<void> {
        await TrackPlayer.skipToNext();
    }

    async skipToPrevious(): Promise<void> {
        await TrackPlayer.skipToPrevious();
    }

    async skipToTrack(index: number): Promise<void> {
        await TrackPlayer.skip(index);
    }

    // Queue management
    async setQueue(tracks: Track[]): Promise<void> {
        const tpTracks: TPTrack[] = tracks.map(this.convertToTPTrack);
        await TrackPlayer.reset();
        await TrackPlayer.add(tpTracks);
    }

    async addToQueue(track: Track, insertBeforeIndex?: number): Promise<void> {
        const tpTrack = this.convertToTPTrack(track);
        if (insertBeforeIndex !== undefined) {
            await TrackPlayer.add(tpTrack, insertBeforeIndex);
        } else {
            await TrackPlayer.add(tpTrack);
        }
    }

    async addTracksToQueue(tracks: Track[], insertBeforeIndex?: number): Promise<void> {
        const tpTracks = tracks.map(this.convertToTPTrack);
        if (insertBeforeIndex !== undefined) {
            await TrackPlayer.add(tpTracks, insertBeforeIndex);
        } else {
            await TrackPlayer.add(tpTracks);
        }
    }

    async removeFromQueue(index: number): Promise<void> {
        await TrackPlayer.remove(index);
    }

    async clearQueue(): Promise<void> {
        await TrackPlayer.reset();
    }

    async getQueue(): Promise<TPTrack[]> {
        return await TrackPlayer.getQueue();
    }

    async getCurrentTrackIndex(): Promise<number | undefined> {
        return await TrackPlayer.getActiveTrackIndex();
    }

    // Repeat and shuffle
    async setRepeatMode(mode: RepeatMode): Promise<void> {
        const tpMode = this.convertRepeatMode(mode);
        await TrackPlayer.setRepeatMode(tpMode);
    }

    // Volume
    async setVolume(volume: number): Promise<void> {
        await TrackPlayer.setVolume(Math.max(0, Math.min(1, volume)));
    }

    async getVolume(): Promise<number> {
        return await TrackPlayer.getVolume();
    }

    // Playback speed
    async setPlaybackRate(rate: number): Promise<void> {
        await TrackPlayer.setRate(rate);
    }

    async getPlaybackRate(): Promise<number> {
        return await TrackPlayer.getRate();
    }

    // State
    async getState(): Promise<State> {
        return await TrackPlayer.getState();
    }

    async getProgress(): Promise<{ position: number; duration: number; buffered: number }> {
        const progress = await TrackPlayer.getProgress();
        return {
            position: progress.position,
            duration: progress.duration,
            buffered: progress.buffered,
        };
    }

    // Helpers
    private convertToTPTrack(track: Track): TPTrack {
        return {
            id: track.id,
            url: track.url || track.path,
            title: track.title,
            artist: track.artist,
            album: track.album,
            artwork: track.albumArt,
            duration: track.duration,
        };
    }

    private convertRepeatMode(mode: RepeatMode): TPRepeatMode {
        switch (mode) {
            case 'off':
                return TPRepeatMode.Off;
            case 'all':
                return TPRepeatMode.Queue;
            case 'one':
                return TPRepeatMode.Track;
            default:
                return TPRepeatMode.Off;
        }
    }
}

export const audioService = AudioService.getInstance();
export default audioService;
