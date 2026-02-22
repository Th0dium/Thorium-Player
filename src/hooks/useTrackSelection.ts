/**
 * useTrackSelection - Shared hook for multi-select track mode
 * 
 * Long-press a track to enter selection mode.
 * Tap tracks to toggle selection. Provides batch actions.
 */

import { useState, useCallback } from 'react';
import { Track } from '@/store/types';

export interface TrackSelectionState {
    /** Currently selected track IDs */
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

export function useTrackSelection(): TrackSelectionState {
    const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const enterSelectionMode = useCallback((track: Track) => {
        setIsSelectionMode(true);
        setSelectedTracks(new Set([track.id]));
    }, []);

    const exitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedTracks(new Set());
    }, []);

    const toggleTrack = useCallback((trackId: string) => {
        setSelectedTracks(prev => {
            const next = new Set(prev);
            if (next.has(trackId)) {
                next.delete(trackId);
            } else {
                next.add(trackId);
            }
            // Auto-exit if nothing selected
            if (next.size === 0) {
                setIsSelectionMode(false);
            }
            return next;
        });
    }, []);

    const selectAll = useCallback((tracks: Track[]) => {
        setSelectedTracks(new Set(tracks.map(t => t.id)));
    }, []);

    const deselectAll = useCallback(() => {
        setSelectedTracks(new Set());
        setIsSelectionMode(false);
    }, []);

    const invertSelection = useCallback((trackIds: string[]) => {
        setSelectedTracks(prev => {
            const next = new Set<string>();
            const currentSet = new Set(prev);

            // For each track, if it was selected, deselect; if unselected, select
            trackIds.forEach(id => {
                if (currentSet.has(id)) {
                    // Remove from selection
                } else {
                    // Add to selection
                    next.add(id);
                }
            });

            return next;
        });
    }, []);

    const selectRange = useCallback((trackIds: string[]) => {
        setSelectedTracks(new Set(trackIds));
    }, []);

    const getSelectedTracks = useCallback((allTracks: Track[]) => {
        return allTracks.filter(t => selectedTracks.has(t.id));
    }, [selectedTracks]);

    const getSelectedIds = useCallback(() => {
        return Array.from(selectedTracks);
    }, [selectedTracks]);

    return {
        selectedTracks,
        isSelectionMode,
        enterSelectionMode,
        exitSelectionMode,
        toggleTrack,
        selectAll,
        deselectAll,
        invertSelection,
        selectRange,
        getSelectedTracks,
        getSelectedIds,
        selectionCount: selectedTracks.size,
    };
}
