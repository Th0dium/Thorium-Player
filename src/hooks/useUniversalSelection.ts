/**
 * useUniversalSelection Hook
 * 
 * Provides access to global selection state across all screens.
 * Selection persists when navigating between list views.
 */

import { useCallback, useMemo } from 'react';
import { useSelectionStore } from '@/store/selectionStore';
import { Track } from '@/store/types';

export interface UniversalSelectionState {
    /** Currently selected track IDs (global across all screens) */
    selectedTracks: Set<string>;
    /** Whether selection mode is active */
    isSelectionMode: boolean;
    /** Enter selection mode with the given track */
    enterSelectionMode: (track: Track) => void;
    /** Exit selection mode and clear selection */
    exitSelectionMode: () => void;
    /** Toggle a track's selection state */
    toggleTrack: (trackId: string) => void;
    /** Select all tracks from a given list */
    selectAll: (tracks: Track[]) => void;
    /** Deselect all tracks (but stay in selection mode) */
    deselectAll: () => void;
    /** Invert selection: select unselected, deselect selected */
    invertSelection: (trackIds: string[]) => void;
    /** Select specific range of tracks by ID */
    selectRange: (trackIds: string[]) => void;
    /** Get selected tracks from a track list */
    getSelectedTracks: (allTracks: Track[]) => Track[];
    /** Get selected track IDs as array */
    getSelectedIds: () => string[];
    /** Number of selected tracks */
    selectionCount: number;
}

export function useUniversalSelection(): UniversalSelectionState {
    const selectedTracks = useSelectionStore(state => state.selectedTrackIds);
    const isSelectionMode = useSelectionStore(state => state.isSelectionMode);
    const selectionCount = useSelectionStore(state => state.selectionCount);

    // Selection methods (from store)
    const enterSelectionMode = useSelectionStore(state => state.enterSelectionMode);
    const exitSelectionMode = useSelectionStore(state => state.exitSelectionMode);
    const toggleTrack = useSelectionStore(state => state.toggleTrack);
    const selectAll = useSelectionStore(state => state.selectAll);
    const deselectAll = useSelectionStore(state => state.deselectAll);
    const invertSelection = useSelectionStore(state => state.invertSelection);
    const selectRange = useSelectionStore(state => state.selectRange);
    const getSelectedTracks = useSelectionStore(state => state.getSelectedTracks);
    const getSelectedIds = useSelectionStore(state => state.getSelectedIds);

    // Memoize the returned object to maintain stable reference
    // This is important for components that depend on this hook
    const state = useMemo((): UniversalSelectionState => ({
        selectedTracks,
        isSelectionMode,
        selectionCount,
        enterSelectionMode,
        exitSelectionMode,
        toggleTrack,
        selectAll,
        deselectAll,
        invertSelection,
        selectRange,
        getSelectedTracks,
        getSelectedIds,
    }), [selectedTracks, isSelectionMode, selectionCount, enterSelectionMode, exitSelectionMode, toggleTrack, selectAll, deselectAll, invertSelection, selectRange, getSelectedTracks, getSelectedIds]);

    return state;
}
