/**
 * Config-driven settings definition
 * Centralized configuration for all app settings
 */

import { useSettingsStore } from '../store/settingsStore';
import { useLibraryStore } from '../store/libraryStore';

export type SettingType =
    | 'toggle'
    | 'navigation'
    | 'value'
    | 'slider'
    | 'segmented'
    | 'action'
    | 'info'
    | 'link';

export interface SettingItem {
    id: string;
    type: SettingType;
    label: string;
    icon?: string;
    subtitle?: string;
    implemented: boolean;
    destructive?: boolean;

    // For different types
    getValue?: () => any;
    onPress?: () => void;
    onChange?: (value: any) => void;

    // For value/segmented types
    options?: Array<{ label: string; value: any }>;

    // For slider type
    min?: number;
    max?: number;
    step?: number;
    unit?: string;

    // For navigation type
    screen?: string;
    badge?: string | (() => string);

    // For link type
    url?: string;
}

export interface SettingsFolder {
    id: string;
    title: string;
    icon: string;
    description?: string;
    sections: Array<{
        title?: string;
        items: SettingItem[];
    }>;
}

// Settings Folders Configuration
export const getSettingsFolders = (): SettingsFolder[] => [
    {
        id: 'appearance',
        title: 'Appearance',
        icon: '🎨',
        description: 'Customize how Thorium looks',
        sections: [
            {
                items: [
                    {
                        id: 'theme',
                        type: 'navigation',
                        label: 'Theme',
                        icon: 'moon-outline',
                        implemented: true,
                        getValue: () => {
                            const theme = useSettingsStore.getState().theme;
                            return theme.charAt(0).toUpperCase() + theme.slice(1);
                        },
                        screen: 'ThemePicker',
                    },
                    {
                        id: 'accent_color',
                        type: 'navigation',
                        label: 'Accent Color',
                        icon: 'color-palette-outline',
                        implemented: true,
                        getValue: () => {
                            const color = useSettingsStore.getState().accentColor;
                            return color ? 'Custom' : 'Default';
                        },
                        screen: 'AccentColorPicker',
                    },
                    {
                        id: 'font_size',
                        type: 'segmented',
                        label: 'Font Size',
                        icon: 'text-outline',
                        implemented: false,
                        options: [
                            { label: 'Small', value: 'small' },
                            { label: 'Medium', value: 'medium' },
                            { label: 'Large', value: 'large' },
                        ],
                    },
                    {
                        id: 'album_art_quality',
                        type: 'value',
                        label: 'Album Art Quality',
                        icon: 'image-outline',
                        implemented: false,
                        subtitle: 'Full',
                        options: [
                            { label: 'Thumbnail', value: 'thumbnail' },
                            { label: 'Optimized', value: 'optimized' },
                            { label: 'Full Quality', value: 'full' },
                        ],
                    },
                    {
                        id: 'show_lyrics_default',
                        type: 'toggle',
                        label: 'Show Lyrics by Default',
                        icon: 'musical-notes-outline',
                        implemented: false,
                    },
                ],
            },
        ],
    },

    {
        id: 'playback',
        title: 'Playback',
        icon: '▶️',
        description: 'Control playback behavior',
        sections: [
            {
                title: 'Speed & Timing',
                items: [
                    {
                        id: 'default_speed',
                        type: 'value',
                        label: 'Default Playback Speed',
                        icon: 'speedometer-outline',
                        implemented: false,
                        subtitle: '1.0x',
                        options: [
                            { label: '0.5x', value: 0.5 },
                            { label: '0.75x', value: 0.75 },
                            { label: '1.0x', value: 1.0 },
                            { label: '1.25x', value: 1.25 },
                            { label: '1.5x', value: 1.5 },
                            { label: '2.0x', value: 2.0 },
                        ],
                    },
                    {
                        id: 'skip_forward',
                        type: 'value',
                        label: 'Skip Forward Interval',
                        icon: 'play-forward-outline',
                        implemented: false,
                        subtitle: '10s',
                        options: [
                            { label: '5 seconds', value: 5 },
                            { label: '10 seconds', value: 10 },
                            { label: '15 seconds', value: 15 },
                            { label: '30 seconds', value: 30 },
                        ],
                    },
                    {
                        id: 'skip_backward',
                        type: 'value',
                        label: 'Skip Backward Interval',
                        icon: 'play-back-outline',
                        implemented: false,
                        subtitle: '10s',
                        options: [
                            { label: '5 seconds', value: 5 },
                            { label: '10 seconds', value: 10 },
                            { label: '15 seconds', value: 15 },
                            { label: '30 seconds', value: 30 },
                        ],
                    },
                ],
            },
            {
                title: 'Behavior',
                items: [
                    {
                        id: 'close_on_queue_end',
                        type: 'toggle',
                        label: 'Close on Queue End',
                        icon: 'exit-outline',
                        implemented: true,
                        getValue: () => useSettingsStore.getState().closeOnQueueEnd,
                        onChange: (value: boolean) => useSettingsStore.getState().setCloseOnQueueEnd(value),
                    },
                    {
                        id: 'gapless_playback',
                        type: 'toggle',
                        label: 'Gapless Playback',
                        icon: 'swap-horizontal-outline',
                        implemented: true,
                        getValue: () => useSettingsStore.getState().gaplessPlayback,
                        onChange: (value: boolean) => useSettingsStore.getState().setGaplessPlayback(value),
                    },
                    {
                        id: 'crossfade',
                        type: 'slider',
                        label: 'Crossfade Duration',
                        icon: 'git-merge-outline',
                        implemented: false,
                        min: 0,
                        max: 10,
                        step: 1,
                        unit: 's',
                    },
                    {
                        id: 'resume_position',
                        type: 'toggle',
                        label: 'Resume from Last Position',
                        icon: 'play-circle-outline',
                        implemented: false,
                    },
                ],
            },
            {
                title: 'Audio Effects',
                items: [
                    {
                        id: 'equalizer',
                        type: 'navigation',
                        label: 'Equalizer',
                        icon: 'stats-chart-outline',
                        implemented: false,
                        subtitle: 'Flat',
                        screen: 'Equalizer',
                    },
                    {
                        id: 'bass_boost',
                        type: 'toggle',
                        label: 'Bass Boost',
                        icon: 'pulse-outline',
                        implemented: false,
                    },
                    {
                        id: 'virtualizer',
                        type: 'toggle',
                        label: 'Virtualizer',
                        icon: 'radio-outline',
                        implemented: false,
                    },
                ],
            },
        ],
    },

    {
        id: 'library',
        title: 'Library',
        icon: '📚',
        description: 'Manage your music library',
        sections: [
            {
                title: 'Scanning',
                items: [
                    {
                        id: 'folders_to_scan',
                        type: 'navigation',
                        label: 'Folders to Scan',
                        icon: 'folder-open-outline',
                        implemented: false,
                        badge: '4 folders',
                        screen: 'FolderSelection',
                    },
                    {
                        id: 'auto_scan_startup',
                        type: 'toggle',
                        label: 'Auto-scan on Startup',
                        icon: 'refresh-outline',
                        implemented: true,
                        getValue: () => useSettingsStore.getState().autoScanOnStartup,
                        onChange: (value: boolean) => useSettingsStore.getState().setAutoScanOnStartup(value),
                    },
                    {
                        id: 'rescan_library',
                        type: 'action',
                        label: 'Rescan Library',
                        icon: 'sync-outline',
                        implemented: true,
                        onPress: () => useLibraryStore.getState().scanForMusic(),
                    },
                    {
                        id: 'last_scan',
                        type: 'info',
                        label: 'Last Scan',
                        icon: 'time-outline',
                        implemented: true,
                        getValue: () => {
                            const tracks = useLibraryStore.getState().tracks;
                            return `${tracks.length} tracks`;
                        },
                    },
                ],
            },
            {
                title: 'Metadata',
                items: [
                    {
                        id: 'supported_formats',
                        type: 'navigation',
                        label: 'Supported Formats',
                        icon: 'musical-note-outline',
                        implemented: false,
                        subtitle: 'mp3, m4a, flac, wav',
                        screen: 'FileFormats',
                    },
                    {
                        id: 'auto_tag_ai',
                        type: 'toggle',
                        label: 'Auto-tag with AI',
                        icon: 'sparkles-outline',
                        implemented: false,
                    },
                    {
                        id: 'min_duration',
                        type: 'value',
                        label: 'Track Minimum Duration',
                        icon: 'hourglass-outline',
                        implemented: false,
                        subtitle: '30s',
                        options: [
                            { label: '10 seconds', value: 10 },
                            { label: '30 seconds', value: 30 },
                            { label: '1 minute', value: 60 },
                            { label: 'No minimum', value: 0 },
                        ],
                    },
                ],
            },
        ],
    },

    {
        id: 'data_backup',
        title: 'Data & Backup',
        icon: '💾',
        description: 'Manage your data and backups',
        sections: [
            {
                title: 'Backup',
                items: [
                    {
                        id: 'backup_library',
                        type: 'action',
                        label: 'Backup Library',
                        icon: 'cloud-upload-outline',
                        implemented: true,
                        subtitle: 'Last: Jan 5, 2026',
                    },
                    {
                        id: 'restore_backup',
                        type: 'action',
                        label: 'Restore from Backup',
                        icon: 'cloud-download-outline',
                        implemented: true,
                    },
                    {
                        id: 'auto_backup',
                        type: 'toggle',
                        label: 'Auto-backup',
                        icon: 'sync-circle-outline',
                        implemented: false,
                    },
                    {
                        id: 'backup_frequency',
                        type: 'value',
                        label: 'Backup Frequency',
                        icon: 'calendar-outline',
                        implemented: false,
                        subtitle: 'Weekly',
                        options: [
                            { label: 'Daily', value: 'daily' },
                            { label: 'Weekly', value: 'weekly' },
                            { label: 'Monthly', value: 'monthly' },
                        ],
                    },
                ],
            },
            {
                title: 'Data Management',
                items: [
                    {
                        id: 'export_stats',
                        type: 'action',
                        label: 'Export Statistics',
                        icon: 'download-outline',
                        implemented: false,
                    },
                    {
                        id: 'clear_cache',
                        type: 'action',
                        label: 'Clear Cache',
                        icon: 'trash-outline',
                        implemented: false,
                        destructive: true,
                        subtitle: '124 MB',
                    },
                    {
                        id: 'storage_location',
                        type: 'info',
                        label: 'Storage Location',
                        icon: 'folder-outline',
                        implemented: true,
                        subtitle: '/storage/emulated/0/Thorium',
                    },
                ],
            },
        ],
    },

    {
        id: 'advanced',
        title: 'Advanced',
        icon: '⚙️',
        description: 'Advanced settings and tools',
        sections: [
            {
                title: 'Performance',
                items: [
                    {
                        id: 'debug_mode',
                        type: 'toggle',
                        label: 'Debug Mode',
                        icon: 'bug-outline',
                        implemented: false,
                    },
                    {
                        id: 'performance_mode',
                        type: 'toggle',
                        label: 'Performance Mode',
                        icon: 'rocket-outline',
                        implemented: true,
                        subtitle: 'Reduce animations',
                        getValue: () => useSettingsStore.getState().reducedAnimations,
                        onChange: (value: boolean) => useSettingsStore.getState().setReducedAnimations(value),
                    },
                ],
            },
            {
                title: 'Controls',
                items: [
                    {
                        id: 'headphone_controls',
                        type: 'navigation',
                        label: 'Headphone Controls',
                        icon: 'headset-outline',
                        implemented: false,
                        subtitle: 'Remap multi-click',
                        screen: 'HeadphoneControls',
                    },
                ],
            },
            {
                title: 'System',
                items: [
                    {
                        id: 'battery_optimization',
                        type: 'info',
                        label: 'Battery Optimization',
                        icon: 'battery-charging-outline',
                        implemented: false,
                        subtitle: 'Tap to configure',
                    },
                    {
                        id: 'background_restrictions',
                        type: 'info',
                        label: 'Background Restrictions',
                        icon: 'shield-outline',
                        implemented: false,
                        subtitle: 'Learn more',
                    },
                    {
                        id: 'reset_settings',
                        type: 'action',
                        label: 'Reset All Settings',
                        icon: 'refresh-circle-outline',
                        implemented: false,
                        destructive: true,
                    },
                ],
            },
        ],
    },

    {
        id: 'unsorted',
        title: '%UNSORTED SETTINGS%',
        icon: '📦',
        description: 'Uncategorized settings',
        sections: [
            {
                title: 'Sleep Timer',
                items: [
                    {
                        id: 'sleep_timer_default',
                        type: 'value',
                        label: 'Default Duration',
                        icon: 'moon-outline',
                        implemented: false,
                        subtitle: '30 min',
                        options: [
                            { label: '15 minutes', value: 15 },
                            { label: '30 minutes', value: 30 },
                            { label: '45 minutes', value: 45 },
                            { label: '60 minutes', value: 60 },
                        ],
                    },
                    {
                        id: 'sleep_timer_fadeout',
                        type: 'toggle',
                        label: 'Fade-out Enabled',
                        icon: 'volume-low-outline',
                        implemented: false,
                    },
                ],
            },
            {
                title: 'Lyrics',
                items: [
                    {
                        id: 'lyrics_auto_fetch',
                        type: 'toggle',
                        label: 'Auto-fetch Online',
                        icon: 'cloud-outline',
                        implemented: false,
                    },
                    {
                        id: 'lyrics_provider',
                        type: 'value',
                        label: 'Search Provider',
                        icon: 'search-outline',
                        implemented: false,
                        subtitle: 'LRCLIB',
                        options: [
                            { label: 'LRCLIB', value: 'lrclib' },
                            { label: 'Genius', value: 'genius' },
                            { label: 'Manual', value: 'manual' },
                        ],
                    },
                ],
            },
            {
                title: 'Queue',
                items: [
                    {
                        id: 'smart_shuffle',
                        type: 'toggle',
                        label: 'Smart Shuffle',
                        icon: 'shuffle-outline',
                        implemented: false,
                        subtitle: 'Avoid artist repeats',
                    },
                    {
                        id: 'track_plays_threshold',
                        type: 'slider',
                        label: 'Track Plays After',
                        icon: 'play-outline',
                        implemented: false,
                        min: 50,
                        max: 100,
                        step: 5,
                        unit: '%',
                    },
                    {
                        id: 'queue_limit',
                        type: 'value',
                        label: 'Queue Limit',
                        icon: 'list-outline',
                        implemented: false,
                        subtitle: '20 queues',
                        options: [
                            { label: '5 queues', value: 5 },
                            { label: '10 queues', value: 10 },
                            { label: '20 queues', value: 20 },
                            { label: 'Unlimited', value: -1 },
                        ],
                    },
                ],
            },
            {
                title: 'About',
                items: [
                    {
                        id: 'version',
                        type: 'info',
                        label: 'Version',
                        icon: 'information-circle-outline',
                        implemented: true,
                        subtitle: '1.0.0 (Build 42)',
                    },
                    {
                        id: 'github',
                        type: 'link',
                        label: 'GitHub Repository',
                        icon: 'logo-github',
                        implemented: true,
                        url: 'https://github.com/yourusername/thorium-player',
                    },
                    {
                        id: 'licenses',
                        type: 'navigation',
                        label: 'Open Source Licenses',
                        icon: 'book-outline',
                        implemented: false,
                        screen: 'Licenses',
                    },
                ],
            },
        ],
    },
];
