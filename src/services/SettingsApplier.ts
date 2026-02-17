// Applies user preferences to native modules (TrackPlayer, AudioService, etc.) on startup and change
import TrackPlayer, { Capability } from 'react-native-track-player';
import { useSettingsStore } from '@/store/settingsStore';
import { audioService } from './AudioService';

class SettingsApplier {
    private static instance: SettingsApplier;

    private constructor() { }

    static getInstance(): SettingsApplier {
        if (!SettingsApplier.instance) {
            SettingsApplier.instance = new SettingsApplier();
        }
        return SettingsApplier.instance;
    }

    /**
     * Apply all current settings to runtime systems on app startup
     */
    async initialize(): Promise<void> {
        try {
            const {
                theme,
                showTrackNotification,
                gaplessPlayback,
            } = useSettingsStore.getState();

            await this.applyTheme(theme);
            await this.applyNotifications(showTrackNotification);
            await this.applyGaplessPlayback(gaplessPlayback);

            if (__DEV__) {
                console.log('[SettingsApplier] All settings applied at startup');
            }
        } catch (error) {
            console.error('[SettingsApplier] Error during initialization:', error);
        }
    }

    /**
     * Handle individual setting changes at runtime
     */
    async onSettingChange(key: string, value: any): Promise<void> {
        try {
            switch (key) {
                case 'showTrackNotification':
                    await this.applyNotifications(value);
                    break;
                case 'theme':
                case 'accentColor':
                    const { theme } = useSettingsStore.getState();
                    await this.applyTheme(theme);
                    break;
                case 'gaplessPlayback':
                    await this.applyGaplessPlayback(value);
                    break;
                case 'reducedAnimations':
                    // Already reactive via UI components
                    if (__DEV__) {
                        console.log('[SettingsApplier] Reduced animations:', value);
                    }
                    break;
                default:
                    if (__DEV__) {
                        console.log('[SettingsApplier] Setting not handled:', key);
                    }
            }
        } catch (error) {
            console.warn(`[SettingsApplier] Error applying setting "${key}":`, error);
        }
    }

    /**
     * Apply notification visibility/capabilities based on user preference
     */
    async applyShowTrackNotification(showNotifications: boolean): Promise<void> {
        await this.applyNotifications(showNotifications);
    }

    /**
     * Apply theme to audio service (notification colors)
     */
    async applyThemeChange(theme: string): Promise<void> {
        await this.applyTheme(theme);
    }

    /**
     * Apply gapless playback setting
     */
    async applyGaplessPlaybackChange(enabled: boolean): Promise<void> {
        await this.applyGaplessPlayback(enabled);
    }

    /**
     * Handle reduced animations setting
     */
    async applyReducedAnimationsChange(enabled: boolean): Promise<void> {
        if (__DEV__) {
            console.log('[SettingsApplier] Reduced animations:', enabled ? 'enabled' : 'disabled');
        }
    }

    /**
     * Apply notification visibility/capabilities based on user preference
     */
    private async applyNotifications(showNotifications: boolean): Promise<void> {
        try {
            if (!showNotifications) {
                // Hide notifications by removing capabilities
                await TrackPlayer.updateOptions({
                    capabilities: [],
                    compactCapabilities: [],
                });
                if (__DEV__) {
                    console.log('[SettingsApplier] Track notifications disabled');
                }
            } else {
                // Show full notification capabilities
                await TrackPlayer.updateOptions({
                    capabilities: [
                        Capability.Play,
                        Capability.Pause,
                        Capability.SkipToNext,
                        Capability.SkipToPrevious,
                        Capability.SeekTo,
                        Capability.JumpForward,
                        Capability.JumpBackward,
                        Capability.Stop,
                    ],
                    compactCapabilities: [
                        Capability.Play,
                        Capability.Pause,
                        Capability.SkipToNext,
                        Capability.SkipToPrevious,
                    ],
                });
                if (__DEV__) {
                    console.log('[SettingsApplier] Track notifications enabled');
                }
            }
        } catch (error) {
            console.warn('[SettingsApplier] Failed to apply notification settings:', error);
        }
    }

    /**
     * Apply theme to audio service (notification colors)
     */
    private async applyTheme(theme: string): Promise<void> {
        try {
            const isDark = theme === 'dark' || theme === 'amoled';
            await audioService.updateNotificationOptions(isDark);
            if (__DEV__) {
                console.log('[SettingsApplier] Theme applied to audio service:', theme);
            }
        } catch (error) {
            console.warn('[SettingsApplier] Failed to apply theme:', error);
        }
    }

    /**
     * Apply gapless playback setting
     * Note: react-native-track-player handles gapless by default;
     * this is a placeholder for custom implementation if needed
     */
    private async applyGaplessPlayback(enabled: boolean): Promise<void> {
        if (__DEV__) {
            console.log('[SettingsApplier] Gapless playback:', enabled ? 'enabled' : 'disabled');
        }
        // Custom gapless logic could be implemented here if needed
    }
}

export const settingsApplier = SettingsApplier.getInstance();
export default settingsApplier;
