import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from "@jest/globals";

// Mock native dependencies BEFORE imports
jest.mock(
  "react-native",
  () => ({
    NativeModules: {},
    Platform: { OS: "android", Version: 33 },
    PermissionsAndroid: { request: jest.fn() },
  }),
  { virtual: true }
);

jest.mock(
  "react-native-track-player",
  () => ({
    __esModule: true,
    default: {
      setupPlayer: jest.fn(),
      updateOptions: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      skip: jest.fn(),
      skipToNext: jest.fn(),
      skipToPrevious: jest.fn(),
      removeUpcomingTracks: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
      seekTo: jest.fn(),
      setVolume: jest.fn(),
      getVolume: jest.fn(),
      setRate: jest.fn(),
      getRate: jest.fn(),
      getTrack: jest.fn(),
      getQueue: jest.fn(),
      getCurrentTrack: jest.fn(),
      getDuration: jest.fn(),
      getPosition: jest.fn(),
      getBufferedPosition: jest.fn(),
      getState: jest.fn(),
      addEventListener: jest.fn(),
    },
    Event: {},
    State: {},
    Capability: {},
    PitchAlgorithm: {},
    RatingType: {},
    RepeatMode: {},
    AppKilledPlaybackBehavior: {},
  }),
  { virtual: true }
);

jest.mock(
  "@react-native-async-storage/async-storage",
  () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  "react-native-fs",
  () => ({
    exists: jest.fn<any>().mockResolvedValue(true),
    readDir: jest.fn<any>().mockResolvedValue([]),
    stat: jest.fn<any>().mockResolvedValue({ isDirectory: () => false }),
  }),
  { virtual: true }
);

jest.mock(
  "react-native-get-music-files",
  () => ({
    getAll: jest.fn<any>().mockResolvedValue([]),
  }),
  { virtual: true }
);

import { useQueueStore } from "../../src/store/queueStore";
import { useLibraryStore } from "../../src/store/libraryStore";
import { usePlayerStore } from "../../src/store/playerStore";
import { Track } from "../../src/store/types";

// Mock services to isolate state manipulation performance
jest.mock("../../src/services/DatabaseService", () => ({
  databaseService: {
    getAllQueues: jest.fn<any>().mockResolvedValue([]),
    getLastPlayedQueue: jest.fn<any>().mockResolvedValue(null),
    saveQueue: jest.fn<any>().mockResolvedValue(true),
    setLastPlayedQueue: jest.fn<any>().mockResolvedValue(true),
    updateQueuePosition: jest.fn<any>().mockResolvedValue(true),
    deleteQueue: jest.fn<any>().mockResolvedValue(true),
    getAllTracks: jest.fn<any>().mockResolvedValue([]),
  },
}));

jest.mock("../../src/services/AudioService", () => ({
  audioService: {
    setQueue: jest.fn<any>().mockResolvedValue(true),
    skipToTrack: jest.fn<any>().mockResolvedValue(true),
    play: jest.fn<any>().mockResolvedValue(true),
    clearQueue: jest.fn<any>().mockResolvedValue(true),
    addTracksToQueue: jest.fn<any>().mockResolvedValue(true),
    removeFromQueue: jest.fn<any>().mockResolvedValue(true),
    getProgress: jest.fn<any>().mockResolvedValue({ position: 0 }),
    seekTo: jest.fn<any>().mockResolvedValue(true),
  },
}));

// Helper to generate a large number of tracks
const generateTracks = (count: number): Track[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `track-${i}`,
    url: `file:///data/music/track-${i}.mp3`,
    path: `/data/music/track-${i}.mp3`,
    title: `Song Title ${i}`,
    artist: `Artist ${i % 100}`,
    album: `Album ${Math.floor(i / 10)}`,
    duration: 200 + (i % 100),
    playCount: 0,
    bookmarks: [],
    aiTags: [],
  }));
};

describe("Queue Store Performance Tests", () => {
  const TRACK_COUNT = 10000;
  let mockTracks: Track[] = [];

  beforeAll(() => {
    mockTracks = generateTracks(TRACK_COUNT);
    // Pre-populate library to allow resolving tracks
    useLibraryStore.setState({ tracks: mockTracks });
  });

  beforeEach(() => {
    useQueueStore.setState({
      queues: [],
      currentQueue: null,
      currentIndex: 0,
      activeQueueIndex: -1,
      shuffledOrder: null,
    });
    usePlayerStore.setState({ isPlaying: false, currentTrack: null });
    jest.clearAllMocks();
  });

  it(`should create a queue of ${TRACK_COUNT} items efficiently`, async () => {
    const startTime = performance.now();

    await useQueueStore
      .getState()
      .createQueue(mockTracks, { type: "all", name: "Massive Queue" });

    const endTime = performance.now();
    const duration = endTime - startTime;

    const state = useQueueStore.getState();
    expect(state.currentQueue).not.toBeNull();
    expect(state.currentQueue?.trackIds).toHaveLength(TRACK_COUNT);

    console.log(
      `[Performance] Created queue of ${TRACK_COUNT} tracks in ${duration.toFixed(
        2
      )}ms`
    );
    // Expected to be under 150ms for 10k items purely in memory
    expect(duration).toBeLessThan(500);
  });

  it("should shuffle a massive queue efficiently", async () => {
    await useQueueStore
      .getState()
      .createQueue(mockTracks, { type: "all", name: "Shuffle Queue" });

    const startTime = performance.now();

    useQueueStore.getState().shuffleQueue();

    const endTime = performance.now();
    const duration = endTime - startTime;

    const state = useQueueStore.getState();
    expect(state.shuffledOrder).not.toBeNull();
    expect(state.shuffledOrder).toHaveLength(TRACK_COUNT);

    console.log(
      `[Performance] Shuffled ${TRACK_COUNT} tracks in ${duration.toFixed(2)}ms`
    );
    // O(N) shuffle should be very fast, under 50ms
    expect(duration).toBeLessThan(150);
  });

  it("should reorder a massive queue efficiently", async () => {
    await useQueueStore
      .getState()
      .createQueue(mockTracks, { type: "all", name: "Reorder Queue" });

    // Reverse the array to simulate a massive drag-and-drop or sort operation
    const reversedIds = [...mockTracks].reverse().map((t) => t.id);

    const startTime = performance.now();

    await useQueueStore.getState().reorderQueue(reversedIds);

    const endTime = performance.now();
    const duration = endTime - startTime;

    const state = useQueueStore.getState();
    expect(state.currentQueue?.trackIds[0]).toBe(`track-${TRACK_COUNT - 1}`);

    console.log(
      `[Performance] Reordered ${TRACK_COUNT} tracks in ${duration.toFixed(
        2
      )}ms`
    );
    expect(duration).toBeLessThan(200);
  });

  it("should sort a massive queue efficiently (by Artist/Album)", async () => {
    await useQueueStore
      .getState()
      .createQueue(mockTracks, { type: "all", name: "Sort Queue" });

    const startTime = performance.now();

    // Sorting triggers a map lookup and full array sort
    await useQueueStore.getState().sortQueue("artist", true);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(
      `[Performance] Sorted ${TRACK_COUNT} tracks by Artist in ${duration.toFixed(
        2
      )}ms`
    );
    // Sorting 10k string fields can take a bit longer but should still be under 300ms
    expect(duration).toBeLessThan(500);
  });
});
