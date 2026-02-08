import { useState, useMemo } from 'react';
import { Track, SortOption } from '@/types';
import { useSettingsStore } from '@/store/settingsStore';

export const useSort = (
    initialSortBy: SortOption = 'title', 
    initialSortAsc: boolean = true,
    viewId?: string
) => {
    // Load initial values from settings if viewId is provided
    const settingsStore = useSettingsStore.getState();
    const persistedConfig = viewId ? settingsStore.getSortConfig(viewId, initialSortBy, initialSortAsc) : null;

    const [sortBy, setSortBy] = useState<SortOption>(persistedConfig?.sortBy || initialSortBy);
    const [sortAsc, setSortAsc] = useState<boolean>(persistedConfig?.sortAsc ?? initialSortAsc);

    const sortTracks = useMemo(() => (tracks: Track[]) => {
        return [...tracks].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'artist':
                    comparison = (a.artist || '').localeCompare(b.artist || '');
                    if (comparison === 0) comparison = (a.title || '').localeCompare(b.title || '');
                    break;
                case 'album':
                    comparison = (a.album || '').localeCompare(b.album || '');
                    if (comparison === 0) comparison = (a.title || '').localeCompare(b.title || '');
                    break;
                case 'dateAdded':
                    comparison = (a.dateAdded || 0) - (b.dateAdded || 0);
                    break;
                case 'duration':
                    comparison = (a.duration || 0) - (b.duration || 0);
                    break;
                case 'playCount':
                    comparison = (a.playCount || 0) - (b.playCount || 0);
                    break;
                case 'title':
                default:
                    comparison = (a.title || '').localeCompare(b.title || '');
            }
            return sortAsc ? comparison : -comparison;
        });
    }, [sortBy, sortAsc]);

    const handleSortChange = (option: SortOption, asc: boolean) => {
        setSortBy(option);
        setSortAsc(asc);
        
        if (viewId) {
            useSettingsStore.getState().setSortConfig(viewId, option, asc);
        }
    };

    return {
        sortBy,
        sortAsc,
        setSortBy,
        setSortAsc,
        sortTracks,
        handleSortChange
    };
};