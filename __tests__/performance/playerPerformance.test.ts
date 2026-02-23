import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
} from "@jest/globals";

jest.mock(
  "react-native",
  () => ({
    NativeModules: {},
    Platform: { OS: "android", Version: 33 },
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
      play: jest.fn(),
      pause: jest.fn(),
      seekTo: jest.fn(),
      getVolume: jest.fn(),
      setVolume: jest.fn(),
    },
    Event: {},
    State: {},
    Capability: {},
    PitchAlgorithm: {},
    RatingType: {},
    RepeatMode: {},
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

jest.mock("../../src/services/DatabaseService", () => ({
  databaseService: {
    getAllTracks: jest.fn<any>().mockResolvedValue([]),
    saveTracks: jest.fn<any>().mockResolvedValue(true),
    saveQueue: jest.fn<any>().mockResolvedValue(true),
    getSettings: jest.fn<any>().mockResolvedValue({}),
  },
}));

import { usePlayerStore } from "../../src/store/playerStore";
import { Track } from "../../src/store/types";

describe("Player Store Performance Tests", () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: null,
      currentQueueId: null,
      position: 0,
      duration: 0,
      buffered: 0,
      repeatMode: "off",
      shuffleMode: "off",
      volume: 1,
    } as any);
    jest.clearAllMocks();
  });

  const mockTrack: Track = {
    id: "track-1",
    url: "file:///data/music/track-1.mp3",
    path: "/data/music/track-1.mp3",
    title: "Song Title",
    artist: "Artist",
    album: "Album",
    duration: 200,
    playCount: 0,
    bookmarks: [],
    aiTags: [],
  };

  it("should handle rapid state updates efficiently without lag (simulating rapid seeking/progress updates)", () => {
    const ITERATIONS = 10000;

    usePlayerStore.getState().setCurrentTrack(mockTrack);

    const startTime = performance.now();

    for (let i = 0; i < ITERATIONS; i++) {
      // Simulate 100ms progress updates for an incredibly long time rapidly
      (usePlayerStore.getState() as any).setPosition(i);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const finalState = usePlayerStore.getState() as any;
    expect(finalState.position).toBe(ITERATIONS - 1);

    console.log(
      `[Performance] Processed ${ITERATIONS} rapid progress updates in ${duration.toFixed(
        2
      )}ms`
    );
    // React Native state updates via Zustand are practically instantaneous.
    // Should take less than 100ms for 10k rapid local memory updates
    expect(duration).toBeLessThan(150);
  });
});
