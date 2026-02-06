// Settings Store - UI preferences, navigation tabs, and app behavior settings
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@thorium/ui_settings';

export type TabId = 'queue' | 'nowPlaying' | 'library' | 'folders' | 'albums' | 'artists' | 'playlists' | 'genres' | 'songs';
export type ThemeOption = 'dark' | 'light' | 'system';
export type FolderViewOption = 'linear' | 'hierarchical';
export type QueueBehavior = 'addToEnd' | 'playNext' | 'clearAndPlay';

export interface TabConfig {
    id: TabId;
    label: string;
    icon: string;
}

// Main navigation tabs (shown in top bar)
export const MAIN_TABS: TabConfig[] = [
    { id: 'queue', label: 'Queue', icon: 'playlist-play' },
    { id: 'nowPlaying', label: 'Playing', icon: 'play-circle' },
    { id: 'library', label: 'Library', icon: 'music-box-multiple' },
];

// All available tabs (for customization)
export const ALL_TABS: TabConfig[] = [
    { id: 'queue', label: 'Queue', icon: 'playlist-play' },
    { id: 'nowPlaying', label: 'Playing', icon: 'play-circle' },
    { id: 'library', label: 'Library', icon: 'music-box-multiple' },
    { id: 'folders', label: 'Folders', icon: 'folder-music' },
    { id: 'albums', label: 'Albums', icon: 'album' },
    { id: 'artists', label: 'Artists', icon: 'account-music' },
    { id: 'playlists', label: 'Playlists', icon: 'playlist-music' },
    { id: 'genres', label: 'Genres', icon: 'music-box-multiple' },
    { id: 'songs', label: 'Songs', icon: 'music-note' },
];

interface UISettings {
    // Navigation
    selectedTabs: TabId[];

    // Appearance
    theme: ThemeOption;
    folderView: FolderViewOption;

    // Behavior
    queueBehavior: QueueBehavior;
    pauseOnUnplug: boolean;
    resumeOnBluetooth: boolean;
    autoScanOnStartup: boolean;
    showTrackNotification: boolean;
    gaplessPlayback: boolean;

    // Navigation state persistence
    librarySubScreen: string | null;
    librarySubTitle: string;
}

interface SettingsStore extends UISettings {
    isLoaded: boolean;

    // Actions
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;

    // Setters
    setSelectedTabs: (tabs: TabId[]) => void;
    setTheme: (theme: ThemeOption) => void;
    setFolderView: (view: FolderViewOption) => void;
    setQueueBehavior: (behavior: QueueBehavior) => void;
    setPauseOnUnplug: (value: boolean) => void;
    setResumeOnBluetooth: (value: boolean) => void;
    setAutoScanOnStartup: (value: boolean) => void;
    setShowTrackNotification: (value: boolean) => void;
    setGaplessPlayback: (value: boolean) => void;
    setLibraryNavigation: (screen: string | null, title?: string) => void;

    // Bulk update
    updateSettings: (settings: Partial<UISettings>) => void;

    // Helpers
    getTabConfig: () => TabConfig[];
}

const DEFAULT_SETTINGS: UISettings = {
    selectedTabs: ['queue', 'nowPlaying', 'library'],
    theme: 'dark',
    folderView: 'hierarchical',
    queueBehavior: 'clearAndPlay',
    pauseOnUnplug: true,
    resumeOnBluetooth: false,
    autoScanOnStartup: false,
    showTrackNotification: true,
    gaplessPlayback: true,
    librarySubScreen: null,
    librarySubTitle: '',
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
    // Initial state
    ...DEFAULT_SETTINGS,
    isLoaded: false,

    // Load settings from storage
    loadSettings: async () => {
        try {
            const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<UISettings>;
                // Don't persist sub-screens across app restarts by default if preferred, 
                // but for session persistence it's fine.
                set({ ...DEFAULT_SETTINGS, ...parsed, isLoaded: true });
            } else {
                set({ isLoaded: true });
            }
        } catch (error) {
            console.error('[SettingsStore] Error loading settings:', error);
            set({ isLoaded: true });
        }
    },

    // Save settings to storage
    saveSettings: async () => {
        try {
            const state = get();
            const settings: UISettings = {
                selectedTabs: state.selectedTabs,
                theme: state.theme,
                folderView: state.folderView,
                queueBehavior: state.queueBehavior,
                pauseOnUnplug: state.pauseOnUnplug,
                resumeOnBluetooth: state.resumeOnBluetooth,
                autoScanOnStartup: state.autoScanOnStartup,
                showTrackNotification: state.showTrackNotification,
                gaplessPlayback: state.gaplessPlayback,
                librarySubScreen: state.librarySubScreen,
                librarySubTitle: state.librarySubTitle,
            };
            await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('[SettingsStore] Error saving settings:', error);
        }
    },

    // Individual setters
    setSelectedTabs: (tabs) => {
        set({ selectedTabs: tabs });
        get().saveSettings();
    },

    setTheme: (theme) => {
        set({ theme });
        get().saveSettings();
    },

    setFolderView: (view) => {
        set({ folderView: view });
        get().saveSettings();
    },

    setQueueBehavior: (behavior) => {
        set({ queueBehavior: behavior });
        get().saveSettings();
    },

    setPauseOnUnplug: (value) => {
        set({ pauseOnUnplug: value });
        get().saveSettings();
    },

    setResumeOnBluetooth: (value) => {
        set({ resumeOnBluetooth: value });
        get().saveSettings();
    },

    setAutoScanOnStartup: (value) => {
        set({ autoScanOnStartup: value });
        get().saveSettings();
    },

    setShowTrackNotification: (value) => {
        set({ showTrackNotification: value });
        get().saveSettings();
    },

    setGaplessPlayback: (value) => {
        set({ gaplessPlayback: value });
        get().saveSettings();
    },

    setLibraryNavigation: (screen, title = '') => {
        set({ librarySubScreen: screen, librarySubTitle: title });
        get().saveSettings();
    },

    // Bulk update (used by onboarding)
    updateSettings: (settings) => {
        set(settings);
        get().saveSettings();
    },

    // Get tab configs for selected tabs (maintains order)
    getTabConfig: () => {
        const { selectedTabs } = get();
        return selectedTabs
            .map(id => ALL_TABS.find(tab => tab.id === id))
            .filter((tab): tab is TabConfig => tab !== undefined);
    },
}));
