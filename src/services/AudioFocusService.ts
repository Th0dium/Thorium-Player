// Audio Focus Service - Handle headphone/Bluetooth events based on user preferences
import { NativeEventEmitter, NativeModules, Platform, DeviceEventEmitter } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { usePlayerStore } from '@/store/playerStore';

class AudioFocusService {
    private static instance: AudioFocusService;
    private isListening = false;
    private wasPlayingBeforeUnplug = false;

    private constructor() { }

    static getInstance(): AudioFocusService {
        if (!AudioFocusService.instance) {
            AudioFocusService.instance = new AudioFocusService();
        }
        return AudioFocusService.instance;
    }

    /**
     * Start listening for audio focus events (headphone plug/unplug, Bluetooth connect/disconnect)
     * This should be called after the app initializes
     */
    startListening(): void {
        if (this.isListening) return;

        if (Platform.OS === 'android') {
            this.setupAndroidListeners();
        } else if (Platform.OS === 'ios') {
            this.setupiOSListeners();
        }

        this.isListening = true;
        console.log('[AudioFocusService] Started listening for audio events');
    }

    /**
     * Stop listening for audio focus events
     */
    stopListening(): void {
        if (!this.isListening) return;
        // Note: React Native doesn't provide a clean way to remove all listeners
        // In a real app, you'd store subscription references and remove them
        this.isListening = false;
        console.log('[AudioFocusService] Stopped listening for audio events');
    }

    private setupAndroidListeners(): void {
        // Listen for headphone state changes via DeviceEventEmitter
        // Note: This requires a native module in a production app
        // For now, we'll use a workaround with audio becoming noisy event

        // The 'audioBecomingNoisy' event fires when headphones are unplugged
        // This is handled by react-native-track-player internally, but we can add custom logic

        DeviceEventEmitter.addListener('onAudioBecomingNoisy', () => {
            this.handleHeadphoneUnplug();
        });

        // For Bluetooth, we'd need to listen to BluetoothAdapter state changes
        // This typically requires a native module like react-native-bluetooth-state-manager
        DeviceEventEmitter.addListener('onBluetoothHeadsetConnected', () => {
            this.handleBluetoothConnect();
        });

        DeviceEventEmitter.addListener('onBluetoothHeadsetDisconnected', () => {
            this.handleBluetoothDisconnect();
        });
    }

    private setupiOSListeners(): void {
        // iOS handles audio route changes differently
        // AVAudioSession route change notifications
        // This would typically be done via a native module

        const eventEmitter = new NativeEventEmitter(NativeModules.AudioSession || {});

        eventEmitter.addListener('audioRouteChanged', (event: any) => {
            if (event.reason === 'oldDeviceUnavailable') {
                // Headphones unplugged
                this.handleHeadphoneUnplug();
            } else if (event.reason === 'newDeviceAvailable') {
                // New audio device connected (could be Bluetooth)
                if (event.isBluetoothDevice) {
                    this.handleBluetoothConnect();
                }
            }
        });
    }

    private handleHeadphoneUnplug(): void {
        const { pauseOnUnplug } = useSettingsStore.getState();
        const { isPlaying, pause } = usePlayerStore.getState();

        console.log('[AudioFocusService] Headphone unplugged, pauseOnUnplug:', pauseOnUnplug);

        if (pauseOnUnplug && isPlaying) {
            this.wasPlayingBeforeUnplug = true;
            pause();
            console.log('[AudioFocusService] Paused playback due to headphone unplug');
        }
    }

    private handleBluetoothConnect(): void {
        const { resumeOnBluetooth } = useSettingsStore.getState();
        const { isPlaying, play } = usePlayerStore.getState();

        console.log('[AudioFocusService] Bluetooth connected, resumeOnBluetooth:', resumeOnBluetooth);

        if (resumeOnBluetooth && this.wasPlayingBeforeUnplug && !isPlaying) {
            play();
            this.wasPlayingBeforeUnplug = false;
            console.log('[AudioFocusService] Resumed playback due to Bluetooth connect');
        }
    }

    private handleBluetoothDisconnect(): void {
        const { pauseOnUnplug } = useSettingsStore.getState();
        const { isPlaying, pause } = usePlayerStore.getState();

        console.log('[AudioFocusService] Bluetooth disconnected, pauseOnUnplug:', pauseOnUnplug);

        // Treat Bluetooth disconnect same as headphone unplug
        if (pauseOnUnplug && isPlaying) {
            this.wasPlayingBeforeUnplug = true;
            pause();
            console.log('[AudioFocusService] Paused playback due to Bluetooth disconnect');
        }
    }
}

export const audioFocusService = AudioFocusService.getInstance();
export default audioFocusService;
