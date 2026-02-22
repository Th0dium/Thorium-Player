/**
 * SelectionManager - Wraps track lists with consistent multi-select behavior
 * Provides: long-press entry, selection toolbar, batch action coordination
 * 
 * Usage:
 * <SelectionManager
 *   tracks={tracks}
 *   renderTrack={(track, idx, isSelected, onPress, onLongPress) => ...}
 *   onTrackPress={(track, idx) => playTrack(track, idx)}
 * />
 */

import React, { useCallback } from 'react';
import { View, FlatList, ViewStyle } from 'react-native';
import { useUniversalSelection } from '@/hooks/useUniversalSelection';
import SelectionToolbar from './SelectionToolbar';
import { Track } from '@/store/types';

interface SelectionManagerProps {
    /** Tracks displayed in the list */
    tracks: Track[];

    /** Render function for track items
     * Receives: track, index, isSelected, onPress, onLongPress
     * Should return a single TrackListItem or custom component
     */
    renderTrack: (
        track: Track,
        index: number,
        isSelected: boolean,
        onPress: () => void,
        onLongPress: () => void
    ) => React.ReactNode;

    /** Callback when track is pressed in normal mode (play, navigate, etc.) */
    onTrackPress?: (track: Track, index: number) => void;

    /** Called with selected tracks after batch action completes */
    onBatchActionComplete?: (selectedTracks: Track[]) => void;

    /** List key extractor */
    keyExtractor?: (item: Track, index: number) => string;

    /** Empty state component */
    ListEmptyComponent?: React.ComponentType<any> | null;

    /** Additional FlatList props */
    flatListProps?: any;

    /** Container style */
    containerStyle?: ViewStyle;

    /** Show/hide the selection toolbar (for cases where parent manages it) */
    showToolbar?: boolean;

    /** If true, passes selection state to parent instead of managing internally */
    externalManagement?: boolean;

    /** Parent-managed selection state (when externalManagement=true) */
    externalIsSelectionMode?: boolean;
    externalSelectedTracks?: Set<string>;
}

export const SelectionManager: React.FC<SelectionManagerProps> = ({
    tracks,
    renderTrack,
    onTrackPress,
    onBatchActionComplete,
    keyExtractor = (track) => track.id,
    ListEmptyComponent,
    flatListProps = {},
    containerStyle,
    showToolbar = true,
    externalManagement = false,
    externalIsSelectionMode,
    externalSelectedTracks,
}) => {
    const selection = useUniversalSelection();

    const handleTrackPress = useCallback((track: Track, index: number) => {
        if (selection.isSelectionMode) {
            // In selection mode: toggle selection
            selection.toggleTrack(track.id);
        } else {
            // Normal mode: delegate to parent
            onTrackPress?.(track, index);
        }
    }, [selection, onTrackPress]);

    const handleTrackLongPress = useCallback((track: Track, index: number) => {
        if (!selection.isSelectionMode) {
            // Enter selection mode with this track
            selection.enterSelectionMode(track);
        } else {
            // Already in selection mode, treat as toggle
            selection.toggleTrack(track.id);
        }
    }, [selection]);

    const handleSelectAll = useCallback(() => {
        selection.selectAll(tracks);
    }, [selection, tracks]);

    const handleDeselectAll = useCallback(() => {
        selection.deselectAll();
    }, [selection]);

    const handleInvertSelection = useCallback(() => {
        selection.invertSelection(tracks.map(t => t.id));
    }, [selection, tracks]);

    const handleSelectRange = useCallback(() => {
        selection.selectRange(tracks.map(t => t.id));
    }, [selection, tracks]);

    const handleActionComplete = useCallback(() => {
        const selectedTracks = selection.getSelectedTracks(tracks);
        selection.exitSelectionMode();
        onBatchActionComplete?.(selectedTracks);
    }, [selection, tracks, onBatchActionComplete]);

    const isSelectionMode = externalManagement ? externalIsSelectionMode : selection.isSelectionMode;
    const selectedTracks = externalManagement ? externalSelectedTracks : selection.selectedTracks;
    const selectionCount = selectedTracks?.size || 0;

    return (
        <View style={[{ flex: 1 }, containerStyle]}>
            <FlatList
                {...flatListProps}
                data={tracks}
                keyExtractor={keyExtractor}
                renderItem={({ item, index }) =>
                    renderTrack(
                        item,
                        index,
                        selectedTracks?.has(item.id) || false,
                        () => handleTrackPress(item, index),
                        () => handleTrackLongPress(item, index)
                    )
                }
                ListEmptyComponent={ListEmptyComponent}
                scrollEnabled={flatListProps.scrollEnabled !== false}
            />

            {/* Show toolbar when in selection mode */}
            {showToolbar && isSelectionMode && (
                <SelectionToolbar
                    selectionCount={selectionCount}
                    totalCount={tracks.length}
                    onClose={selection.exitSelectionMode}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    onInvertSelection={handleInvertSelection}
                    onSelectRange={handleSelectRange}
                    getSelectedTracks={() => selection.getSelectedTracks(tracks)}
                    getAllTrackIds={() => tracks.map(t => t.id)}
                    onActionComplete={handleActionComplete}
                />
            )}
        </View>
    );
};

export default SelectionManager;
