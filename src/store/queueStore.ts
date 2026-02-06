// Queue Store - Manages multiple playback queues (dynamic)
import { create } from 'zustand';
import { Queue, Track, QueueSource } from '@/types';
import { databaseService } from '@/services/DatabaseService';
import { audioService } from '@/services/AudioService';
import { usePlayerStore } from './playerStore';
import { useLibraryStore } from './libraryStore';

let nextQueueId = 1;

interface QueueStore {
    // State
    queues: Queue[];
    currentQueue: Queue | null;
    currentIndex: number;
    activeQueueIndex: number; // Index in the queues array (not queue ID)
    shuffledOrder: number[] | null;

    // Actions
    loadQueues: () => Promise<void>;
    createQueue: (tracks: Track[], source: QueueSource, startIndex?: number) => Promise<Queue>;
    switchToQueue: (queueId: string, startFromIndex?: number) => Promise<void>;
    switchQueue: (index: number) => Promise<void>; // Switch by index in queues array
    deleteQueue: (queueId: string) => Promise<void>;
    clearCurrentQueue: () => Promise<void>;
    clearQueue: () => Promise<void>; // Alias for clearCurrentQueue

    // Queue manipulation
    addToCurrentQueue: (tracks: Track[], insertAfterCurrent?: boolean) => Promise<void>;
    addToQueue: (tracks: Track[]) => Promise<void>; // Alias - add to end
    playNext: (tracks: Track[]) => Promise<void>; // Alias - add after current
    removeFromCurrentQueue: (index: number) => Promise<void>;
    removeFromQueue: (index: number) => Promise<void>; // Alias
    moveInCurrentQueue: (fromIndex: number, toIndex: number) => Promise<void>;
    moveInQueue: (fromIndex: number, toIndex: number) => Promise<void>; // Alias
    reorderQueue: (newTrackIds: string[]) => Promise<void>;

    // Index sync
    updateCurrentIndex: (index: number) => void;

    // Shuffle
    shuffleQueue: () => void;
    unshuffleQueue: () => void;

    // Playback
    playTrackAtIndex: (index: number) => Promise<void>;
    getCurrentTrackIndex: () => number;
    getNextTrack: () => Track | null;
    getPreviousTrack: () => Track | null;
    getQueueTracks: () => Track[];
}

export const useQueueStore = create<QueueStore>((set, get) => ({
    // Initial state
    queues: [],
    currentQueue: null,
    currentIndex: 0,
    activeQueueIndex: -1,
    shuffledOrder: null,

    // Load saved queues from database
    loadQueues: async () => {
        const savedQueues = await databaseService.getAllQueues();
        const lastQueue = await databaseService.getLastPlayedQueue();

        // Set nextQueueId based on highest existing ID
        if (savedQueues.length > 0) {
            const maxId = Math.max(...savedQueues.map(q => {
                const idNum = parseInt(q.id.replace('queue_', ''), 10);
                return isNaN(idNum) ? 0 : idNum;
            }));
            nextQueueId = maxId + 1;
        }

        const activeIndex = lastQueue
            ? savedQueues.findIndex(q => q.id === lastQueue.id)
            : -1;

        set({
            queues: savedQueues,
            currentQueue: lastQueue || null,
            activeQueueIndex: activeIndex >= 0 ? activeIndex : -1,
        });

        // Hydrate AudioService if we have a current queue
        if (lastQueue && lastQueue.trackIds.length > 0) {
            try {
                // We need full track objects for the player
                const allTracks = await databaseService.getAllTracks();
                const trackMap = new Map(allTracks.map(t => [t.id, t]));
                const queueTracks = lastQueue.trackIds
                    .map(id => trackMap.get(id))
                    .filter((t): t is Track => t !== undefined);

                if (queueTracks.length > 0) {
                    await audioService.setQueue(queueTracks);

                    // Set the current track in playerStore based on the queue's currentIndex
                    const currentTrackIndex = lastQueue.currentIndex ?? 0;
                    if (currentTrackIndex >= 0 && currentTrackIndex < queueTracks.length) {
                        // Skip to the last played track in the audio service
                        await audioService.skipToTrack(currentTrackIndex);
                        // Update the playerStore to match
                        usePlayerStore.getState().setCurrentTrack(queueTracks[currentTrackIndex]);
                    }

                    // Queue is set up at the correct position but not playing
                    // User will resume playback from mini-player or now-playing screen
                }
            } catch (error) {
                console.warn('[QueueStore] Failed to hydrate player queue on load:', error);
            }
        }
    },

    // Create a new queue and start playing
    createQueue: async (tracks, source, startIndex = 0) => {
        const { queues, deleteQueue } = get();

        // Find if a queue with same name and same source type already exists
        const existingQueue = queues.find(q =>
            q.name === source.name &&
            q.source.type === source.type &&
            (source.id ? q.source.id === source.id : true)
        );

        if (existingQueue) {
            // Delete the old one silently before creating new
            await deleteQueue(existingQueue.id);
        }

        const queueId = `queue_${nextQueueId++}`;

        const queue: Queue = {
            id: queueId,
            name: source.name,
            trackIds: tracks.map(t => t.id),
            currentIndex: startIndex,
            lastPlayed: Date.now(),
            source,
        };

        // Add to queues array and update local state (optimistic)
        set(state => ({
            queues: [...state.queues, queue],
            currentQueue: queue,
            activeQueueIndex: state.queues.length, // New queue is at the end
            currentIndex: startIndex,
            shuffledOrder: null,
        }));

        // Set up audio player
        await audioService.setQueue(tracks);
        if (startIndex > 0) {
            await audioService.skipToTrack(startIndex);
        }

        // Update player store
        usePlayerStore.getState().setCurrentTrack(tracks[startIndex]);
        usePlayerStore.getState().setCurrentQueueId(queue.id);

        // Save to database
        databaseService.saveQueue(queue).catch(e => console.warn('[QueueStore] Failed to save queue:', e));
        databaseService.setLastPlayedQueue(queue.id).catch(e => console.warn('[QueueStore] Failed to set last played:', e));

        // Start playing
        await audioService.play();
        usePlayerStore.getState().setIsPlaying(true);

        return queue;
    },

    // Switch to a different queue
    switchToQueue: async (queueId, startFromIndex) => {
        const queue = await databaseService.getQueue(queueId);
        if (!queue) return;

        // Use library store's cached tracks instead of loading all from DB
        const libraryTracks = useLibraryStore.getState().tracks;
        const trackMap = new Map(libraryTracks.map(t => [t.id, t]));
        const queueTracks = queue.trackIds
            .map(id => trackMap.get(id))
            .filter((t): t is Track => t !== undefined);

        if (queueTracks.length === 0) return;

        const playIndex = startFromIndex ?? queue.currentIndex;

        // Set up audio player
        await audioService.setQueue(queueTracks);
        await audioService.skipToTrack(playIndex);

        // Update state optimistically
        queue.currentIndex = playIndex;
        queue.lastPlayed = Date.now();

        usePlayerStore.getState().setCurrentTrack(queueTracks[playIndex]);
        usePlayerStore.getState().setCurrentQueueId(queueId);

        const queueIndex = get().queues.findIndex(q => q.id === queueId);

        set({
            currentQueue: queue,
            currentIndex: playIndex,
            activeQueueIndex: queueIndex >= 0 ? queueIndex : get().activeQueueIndex,
            shuffledOrder: null,
        });

        // Fire-and-forget persistence
        databaseService.saveQueue(queue).catch(e => console.warn('[QueueStore] Failed to save queue:', e));
        databaseService.setLastPlayedQueue(queueId).catch(e => console.warn('[QueueStore] Failed to set last played:', e));

        await audioService.play();
        usePlayerStore.getState().setIsPlaying(true);
    },

    // Switch queue by index
    switchQueue: async (index) => {
        const { queues } = get();
        if (index < 0 || index >= queues.length) return;

        const queue = queues[index];

        // Update active queue index first
        set({ activeQueueIndex: index });

        // If queue has tracks, switch to it and play
        if (queue.trackIds.length > 0) {
            await get().switchToQueue(queue.id, queue.currentIndex);
        } else {
            // Empty queue - just update the current queue reference
            set({ currentQueue: queue, currentIndex: 0 });
        }
    },

    // Delete a queue
    deleteQueue: async (queueId) => {
        await databaseService.deleteQueue(queueId);
        set(state => {
            const newQueues = state.queues.filter(q => q.id !== queueId);
            const deletedIndex = state.queues.findIndex(q => q.id === queueId);
            let newActiveIndex = state.activeQueueIndex;

            // Adjust active queue index if needed
            if (deletedIndex < newActiveIndex) {
                newActiveIndex--;
            } else if (deletedIndex === newActiveIndex) {
                // Active queue was deleted, switch to another
                newActiveIndex = Math.min(newActiveIndex, newQueues.length - 1);
            }

            return {
                queues: newQueues,
                activeQueueIndex: newActiveIndex,
                currentQueue: state.currentQueue?.id === queueId ? (newQueues[newActiveIndex] || null) : state.currentQueue,
            };
        });
    },

    // Clear current queue
    clearCurrentQueue: async () => {
        await audioService.clearQueue();
        usePlayerStore.getState().setCurrentTrack(null);
        usePlayerStore.getState().setIsPlaying(false);
        set({ currentQueue: null, currentIndex: 0, shuffledOrder: null });
    },

    // Alias for clearCurrentQueue
    clearQueue: async () => {
        await get().clearCurrentQueue();
    },

    // Add tracks to current queue
    addToCurrentQueue: async (tracks, insertAfterCurrent = true) => {
        const { currentQueue } = get();
        if (!currentQueue) {
            // Create new queue if none exists
            await get().createQueue(tracks, { type: 'all', name: 'Queue' });
            return;
        }

        const insertIndex = insertAfterCurrent
            ? currentQueue.currentIndex + 1
            : currentQueue.trackIds.length;

        // Add to audio player
        await audioService.addTracksToQueue(tracks, insertIndex);

        // Update queue immutably (optimistic)
        const newTrackIds = [...currentQueue.trackIds];
        newTrackIds.splice(insertIndex, 0, ...tracks.map(t => t.id));
        const updatedQueue = { ...currentQueue, trackIds: newTrackIds };

        set({ currentQueue: updatedQueue });

        // Fire-and-forget persistence
        databaseService.saveQueue(updatedQueue).catch(e =>
            console.warn('[QueueStore] Failed to save queue:', e)
        );
    },

    // Alias - add to end of queue
    addToQueue: async (tracks) => {
        await get().addToCurrentQueue(tracks, false);
    },

    // Alias - add after current track
    playNext: async (tracks) => {
        await get().addToCurrentQueue(tracks, true);
    },

    // Remove track from current queue
    removeFromCurrentQueue: async (index) => {
        const { currentQueue } = get();
        if (!currentQueue) return;

        await audioService.removeFromQueue(index);

        const newTrackIds = currentQueue.trackIds.filter((_, i) => i !== index);

        // Adjust current index if needed
        let newCurrentIndex = currentQueue.currentIndex;
        if (index < currentQueue.currentIndex) {
            newCurrentIndex--;
        }

        const updatedQueue = { ...currentQueue, trackIds: newTrackIds, currentIndex: newCurrentIndex };

        // Optimistic update
        set({ currentQueue: updatedQueue });

        // Fire-and-forget persistence
        databaseService.saveQueue(updatedQueue).catch(e =>
            console.warn('[QueueStore] Failed to save queue:', e)
        );
    },

    // Alias for removeFromCurrentQueue
    removeFromQueue: async (index) => {
        await get().removeFromCurrentQueue(index);
    },

    // Move track in queue
    moveInCurrentQueue: async (fromIndex, toIndex) => {
        const { currentQueue } = get();
        if (!currentQueue) return;

        const newTrackIds = [...currentQueue.trackIds];
        const [moved] = newTrackIds.splice(fromIndex, 1);
        newTrackIds.splice(toIndex, 0, moved);

        // Update current index
        let newCurrentIndex = currentQueue.currentIndex;
        if (fromIndex === currentQueue.currentIndex) {
            newCurrentIndex = toIndex;
        } else if (fromIndex < currentQueue.currentIndex && toIndex >= currentQueue.currentIndex) {
            newCurrentIndex--;
        } else if (fromIndex > currentQueue.currentIndex && toIndex <= currentQueue.currentIndex) {
            newCurrentIndex++;
        }

        const updatedQueue = { ...currentQueue, trackIds: newTrackIds, currentIndex: newCurrentIndex };

        // Optimistic update
        set({ currentQueue: updatedQueue });

        // Fire-and-forget persistence
        databaseService.saveQueue(updatedQueue).catch(e =>
            console.warn('[QueueStore] Failed to save queue:', e)
        );
    },

    // Alias for moveInCurrentQueue
    moveInQueue: async (fromIndex, toIndex) => {
        await get().moveInCurrentQueue(fromIndex, toIndex);
    },

    // Reorder entire queue with new order
    reorderQueue: async (newTrackIds) => {
        const { currentQueue } = get();
        if (!currentQueue) return;

        // Find current track ID
        const currentTrackId = currentQueue.trackIds[currentQueue.currentIndex];

        // Update track order and maintain same playing track
        const newCurrentIndex = newTrackIds.indexOf(currentTrackId);
        const updatedQueue = { ...currentQueue, trackIds: newTrackIds, currentIndex: newCurrentIndex };

        // Optimistic update
        set({ currentQueue: updatedQueue });

        // Fire-and-forget persistence
        databaseService.saveQueue(updatedQueue).catch(e =>
            console.warn('[QueueStore] Failed to save queue:', e)
        );
    },

    // Update current index - called when TrackPlayer changes track
    updateCurrentIndex: (index) => {
        const { currentQueue } = get();
        if (!currentQueue || index < 0 || index >= currentQueue.trackIds.length) return;

        const updatedQueue = { ...currentQueue, currentIndex: index };
        set({ currentQueue: updatedQueue, currentIndex: index });

        // Persist the queue position to database
        databaseService.updateQueuePosition(currentQueue.id, index).catch(e =>
            console.warn('[QueueStore] Failed to save queue position:', e)
        );
    },

    // Shuffle queue
    shuffleQueue: () => {
        const { currentQueue } = get();
        if (!currentQueue) return;

        const indices = currentQueue.trackIds.map((_, i) => i);
        const currentIdx = currentQueue.currentIndex;

        // Remove current track from shuffle and add to front
        indices.splice(currentIdx, 1);

        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        // Current track stays first
        indices.unshift(currentIdx);

        set({ shuffledOrder: indices });
    },

    // Unshuffle
    unshuffleQueue: () => {
        set({ shuffledOrder: null });
    },

    // Play specific track in queue
    playTrackAtIndex: async (index) => {
        const { currentQueue, shuffledOrder } = get();
        if (!currentQueue) return;

        const actualIndex = shuffledOrder ? shuffledOrder[index] : index;
        await audioService.skipToTrack(actualIndex);

        const updatedQueue = { ...currentQueue, currentIndex: actualIndex };

        // Use library store's cached tracks instead of loading all from DB
        const libraryTracks = useLibraryStore.getState().tracks;
        const trackId = currentQueue.trackIds[actualIndex];
        const track = libraryTracks.find(t => t.id === trackId);
        if (track) {
            usePlayerStore.getState().setCurrentTrack(track);
        }

        set({ currentQueue: updatedQueue });

        // Fire-and-forget persistence
        databaseService.updateQueuePosition(currentQueue.id, actualIndex).catch(e =>
            console.warn('[QueueStore] Failed to update queue position:', e)
        );
    },

    // Get current track index
    getCurrentTrackIndex: () => {
        const { currentQueue, shuffledOrder } = get();
        if (!currentQueue) return -1;

        if (shuffledOrder) {
            return shuffledOrder.indexOf(currentQueue.currentIndex);
        }
        return currentQueue.currentIndex;
    },

    // Get next track
    getNextTrack: () => {
        const { currentQueue, shuffledOrder } = get();
        if (!currentQueue) return null;

        const currentIdx = get().getCurrentTrackIndex();
        const nextIdx = currentIdx + 1;

        if (nextIdx >= currentQueue.trackIds.length) return null;

        const actualIdx = shuffledOrder ? shuffledOrder[nextIdx] : nextIdx;
        const trackId = currentQueue.trackIds[actualIdx];
        if (!trackId) return null;

        const tracks = useLibraryStore.getState().tracks;
        return tracks.find(t => t.id === trackId) || null;
    },

    // Get previous track
    getPreviousTrack: () => {
        const { currentQueue, shuffledOrder } = get();
        if (!currentQueue) return null;

        const currentIdx = get().getCurrentTrackIndex();
        const prevIdx = currentIdx - 1;

        if (prevIdx < 0) return null;

        const actualIdx = shuffledOrder ? shuffledOrder[prevIdx] : prevIdx;
        const trackId = currentQueue.trackIds[actualIdx];
        if (!trackId) return null;

        const tracks = useLibraryStore.getState().tracks;
        return tracks.find(t => t.id === trackId) || null;
    },

    // Get all tracks in current queue
    getQueueTracks: () => {
        const { currentQueue } = get();
        if (!currentQueue) return [];

        const tracks = useLibraryStore.getState().tracks;
        const trackMap = new Map(tracks.map(t => [t.id, t]));
        return currentQueue.trackIds
            .map(id => trackMap.get(id))
            .filter((t): t is Track => t !== undefined);
    },
}));

export default useQueueStore;
