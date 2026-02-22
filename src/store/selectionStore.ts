/**
 * Universal Selection Store
 * 
 * Manages global multi-select state across all list views.
 * Selection state persists when navigating between screens.
 */

import { create } from 'zustand';
import { Track } from '@/store/types';

interface SelectionStoreState {
    // Global selection state
    selectedTrackIds: Set<string>;
    isSelectionMode: boolean;

    // Methods
    enterSelectionMode: (track: Track) => void;
    exitSelectionMode: () => void;
    toggleTrack: (trackId: string) => void;
    selectAll: (tracks: Track[]) => void;
    deselectAll: () => void;
    invertSelection: (trackIds: string[]) => void;
    selectRange: (trackIds: string[]) => void;
    getSelectedTracks: (allTracks: Track[]) => Track[];
    getSelectedIds: () => string[];

    // Get selection count
    readonly selectionCount: number;
}

export const useSelectionStore = create<SelectionStoreState>((set, get) => ({
    selectedTrackIds: new Set(),
    isSelectionMode: false,
    get selectionCount() {
        return get().selectedTrackIds.size;
    },

    enterSelectionMode: (track: Track) => {
        set({
            isSelectionMode: true,
            selectedTrackIds: new Set([track.id]),
        });
    },

    exitSelectionMode: () => {
        set({
            isSelectionMode: false,
            selectedTrackIds: new Set(),
        });
    },

    toggleTrack: (trackId: string) => {
        set(state => {
            const next = new Set(state.selectedTrackIds);
            if (next.has(trackId)) {
                next.delete(trackId);
            } else {
                next.add(trackId);
            }
            // Auto-exit if nothing selected
            if (next.size === 0) {
                return {
                    selectedTrackIds: next,
                    isSelectionMode: false,
                };
            }
            return { selectedTrackIds: next };
        });
    },

    selectAll: (tracks: Track[]) => {
        set({
            selectedTrackIds: new Set(tracks.map(t => t.id)),
        });
    },

    deselectAll: () => {
        set({
            selectedTrackIds: new Set(),
            isSelectionMode: false,
        });
    },

    invertSelection: (trackIds: string[]) => {
        set(state => {
            const next = new Set<string>();
            const currentSet = new Set(state.selectedTrackIds);

            trackIds.forEach(id => {
                if (!currentSet.has(id)) {
                    next.add(id);
                }
            });

            return { selectedTrackIds: next };
        });
    },

    selectRange: (trackIds: string[]) => {
        set({
            selectedTrackIds: new Set(trackIds),
        });
    },

    getSelectedTracks: (allTracks: Track[]) => {
        const selectedIds = get().selectedTrackIds;
        return allTracks.filter(t => selectedIds.has(t.id));
    },

    getSelectedIds: () => {
        return Array.from(get().selectedTrackIds);
    },
}));
