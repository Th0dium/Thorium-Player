// Queue Store - Manages multiple playback queues (dynamic)
import { create } from 'zustand';
import { Queue, Track, QueueSource } from '@/types';
import { databaseService } from '@/services/DatabaseService';
import { audioService } from '@/services/AudioService';
import { usePlayerStore } from './playerStore';

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
    },

    // Create a new queue and start playing
    createQueue: async (tracks, source, startIndex = 0) => {
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

        // Get tracks for this queue
        const allTracks = await databaseService.getAllTracks();
        const trackMap = new Map(allTracks.map(t => [t.id, t]));
        const queueTracks = queue.trackIds
            .map(id => trackMap.get(id))
            .filter((t): t is Track => t !== undefined);

        if (queueTracks.length === 0) return;

        const playIndex = startFromIndex ?? queue.currentIndex;

        // Set up audio player
        await audioService.setQueue(queueTracks);
        await audioService.skipToTrack(playIndex);

        // Update state
        queue.currentIndex = playIndex;
        queue.lastPlayed = Date.now();
        await databaseService.saveQueue(queue);
        await databaseService.setLastPlayedQueue(queueId);

        usePlayerStore.getState().setCurrentTrack(queueTracks[playIndex]);
        usePlayerStore.getState().setCurrentQueueId(queueId);

        // Find the index of this queue in the queues array
        const queueIndex = get().queues.findIndex(q => q.id === queueId);

        set({
            currentQueue: queue,
            currentIndex: playIndex,
            activeQueueIndex: queueIndex >= 0 ? queueIndex : get().activeQueueIndex,
            shuffledOrder: null,
        });

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

        // Update queue
        const newTrackIds = [...currentQueue.trackIds];
        newTrackIds.splice(insertIndex, 0, ...tracks.map(t => t.id));
        currentQueue.trackIds = newTrackIds;

        await databaseService.saveQueue(currentQueue);
        set({ currentQueue: { ...currentQueue } });
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
        currentQueue.trackIds = newTrackIds;

        // Adjust current index if needed
        if (index < currentQueue.currentIndex) {
            currentQueue.currentIndex--;
        }

        await databaseService.saveQueue(currentQueue);
        set({ currentQueue: { ...currentQueue } });
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
        currentQueue.trackIds = newTrackIds;

        // Update current index
        if (fromIndex === currentQueue.currentIndex) {
            currentQueue.currentIndex = toIndex;
        } else if (fromIndex < currentQueue.currentIndex && toIndex >= currentQueue.currentIndex) {
            currentQueue.currentIndex--;
        } else if (fromIndex > currentQueue.currentIndex && toIndex <= currentQueue.currentIndex) {
            currentQueue.currentIndex++;
        }

        await databaseService.saveQueue(currentQueue);
        set({ currentQueue: { ...currentQueue } });
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

        // Update track order
        currentQueue.trackIds = newTrackIds;

        // Update current index to maintain same playing track
        currentQueue.currentIndex = newTrackIds.indexOf(currentTrackId);

        await databaseService.saveQueue(currentQueue);
        set({ currentQueue: { ...currentQueue } });
    },

    // Update current index - called when TrackPlayer changes track
    updateCurrentIndex: (index) => {
        const { currentQueue } = get();
        if (!currentQueue || index < 0 || index >= currentQueue.trackIds.length) return;

        currentQueue.currentIndex = index;
        set({ currentQueue: { ...currentQueue }, currentIndex: index });

        // Update the track in playerStore
        const allTracks = usePlayerStore.getState();
        const trackId = currentQueue.trackIds[index];
        // We'll need to find the track - use libraryStore since we have it imported indirectly
        // The PlaybackService will handle setting the current track on playerStore
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

        currentQueue.currentIndex = actualIndex;
        await databaseService.updateQueuePosition(currentQueue.id, actualIndex);

        const allTracks = await databaseService.getAllTracks();
        const track = allTracks.find(t => t.id === currentQueue.trackIds[actualIndex]);
        if (track) {
            usePlayerStore.getState().setCurrentTrack(track);
        }

        set({ currentQueue: { ...currentQueue } });
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
        // Would need to get track from database
        return null;
    },

    // Get previous track
    getPreviousTrack: () => {
        const { currentQueue, shuffledOrder } = get();
        if (!currentQueue) return null;

        const currentIdx = get().getCurrentTrackIndex();
        const prevIdx = currentIdx - 1;

        if (prevIdx < 0) return null;

        const actualIdx = shuffledOrder ? shuffledOrder[prevIdx] : prevIdx;
        return null;
    },

    // Get all tracks in current queue
    getQueueTracks: () => {
        // Would need to be async to get from database
        return [];
    },
}));

export default useQueueStore;
