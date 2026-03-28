# RE_Thorium Development Roadmap

Comprehensive guide to rebuilding Thorium music player from scratch.

## Architecture Overview

```
RE_Thorium/
├── src/
│   ├── screens/          # Full-screen views
│   ├── components/       # Reusable UI pieces
│   ├── store/           # Zustand state management
│   ├── services/        # Business logic & native integration
│   ├── navigation/      # Tab navigation system
│   └── constants/       # Theme, spacing, colors
├── App.tsx              # Entry point
└── package.json         # Dependencies
```

## Core Concepts

**[5] State Management**: Zustand stores (player, library, queue, settings)
**[5] Audio Playback**: react-native-track-player integration
**[4] Navigation**: Custom swipeable tab system
**[4] File System**: Scan device for music files
**[3] UI Components**: Reusable buttons, lists, modals

---

## Phase 1: Foundation (Steps 1-5)
**Goal**: Basic app structure with visible output

### Step 1: Hello World Screen
**Checkpoint**: See text on screen

**Concepts**:
- React Native basics: View, Text, StyleSheet
- Component structure
- Running the app

**Files to create**:
- `src/screens/HomeScreen.tsx` - Simple screen with text

**What you'll learn**:
- How React Native components work
- JSX syntax
- Basic styling

**Test**: Run app → See "Hello World"

---

### Step 2: Simple Song List
**Checkpoint**: See list of hardcoded songs

**Concepts**:
- FlatList for rendering lists
- Data arrays
- Item rendering

**Files to create**:
- `src/screens/SongsScreen.tsx` - List of songs
- Hardcoded song data (array of objects)

**What you'll learn**:
- How to render lists efficiently
- Key prop importance
- Item separators

**Test**: Run app → See scrollable list of 5 songs

---

### Step 3: Zustand Store (Global State)
**Checkpoint**: State shared across components

**Concepts**:
- Global state management
- Zustand basics
- Store creation and usage

**Files to create**:
- `src/store/playerStore.ts` - Player state (isPlaying, currentTrack)
- Update SongsScreen to use store

**What you'll learn**:
- Why global state is needed
- How Zustand differs from useState
- Store subscription pattern

**Test**: Change state in one place → See update everywhere

---

### Step 4: Play/Pause Button
**Checkpoint**: Button toggles play/pause state

**Concepts**:
- Event handling
- State updates
- Conditional rendering (show play or pause icon)

**Files to create**:
- `src/components/PlayButton.tsx` - Toggle button
- Update playerStore with togglePlayPause action

**What you'll learn**:
- Event handlers (onPress)
- How state drives UI
- Icon libraries

**Test**: Tap button → Icon changes between play/pause

---

### Step 5: Track Player Integration (Real Audio)
**Checkpoint**: Actual music plays from device

**Concepts**:
- Native modules
- Async operations
- Audio service wrapper

**Dependencies**:
```json
"react-native-track-player": "^4.0.0"
```

**Files to create**:
- `src/services/AudioService.ts` - Wrapper for track player
- Update playerStore to call AudioService

**What you'll learn**:
- How React Native talks to native code
- Async/await pattern
- Service layer pattern

**Test**: Tap play → Hear music from device

---

## Phase 2: Core Features (Steps 6-10)
**Goal**: Functional music player

### Step 6: Now Playing Screen
**Checkpoint**: Full screen showing current song with controls

**Concepts**:
- Screen layout
- Multiple components composition
- Progress bar

**Files to create**:
- `src/screens/NowPlayingScreen.tsx` - Full player UI
- `src/components/ProgressBar.tsx` - Seek bar
- `src/components/PlayerControls.tsx` - Play/pause/skip buttons

**What you'll learn**:
- Component composition
- Layout with flexbox
- Progress tracking

**Test**: Play song → See album art, title, progress bar

---

### Step 7: Queue System
**Checkpoint**: List of upcoming songs

**Concepts**:
- Queue data structure
- Add/remove from queue
- Current track index

**Files to create**:
- `src/store/queueStore.ts` - Queue state
- `src/screens/QueueScreen.tsx` - Queue list UI

**What you'll learn**:
- Array manipulation
- Queue vs stack
- Index tracking

**Test**: Add 3 songs to queue → See them listed

---

### Step 8: Skip Next/Previous
**Checkpoint**: Navigate through queue

**Concepts**:
- Queue navigation
- Track transitions
- Edge cases (first/last track)

**Files to update**:
- `src/store/queueStore.ts` - Add skipNext/skipPrevious
- `src/components/PlayerControls.tsx` - Wire up skip buttons

**What you'll learn**:
- State transitions
- Boundary conditions
- Audio service coordination

**Test**: Play queue → Skip forward/back → Correct song plays

---

### Step 9: Library Screen (Categories)
**Checkpoint**: Browse by albums, artists, playlists

**Concepts**:
- Data grouping
- Navigation between views
- Category screens

**Files to create**:
- `src/screens/LibraryScreen.tsx` - Category grid
- `src/screens/AlbumsScreen.tsx` - Album list
- `src/screens/ArtistsScreen.tsx` - Artist list
- `src/store/libraryStore.ts` - Library data

**What you'll learn**:
- Data transformation (tracks → albums)
- Navigation patterns
- Grid layouts

**Test**: Tap "Albums" → See album list

---

### Step 10: File System Scanner
**Checkpoint**: Load music from device storage

**Concepts**:
- File system access
- Permissions
- Metadata extraction

**Dependencies**:
```json
"react-native-fs": "^2.20.0",
"@react-native-community/music-files": "^1.0.0"
```

**Files to create**:
- `src/services/FileSystemService.ts` - Scan directories
- `src/services/MetadataExtractor.ts` - Read ID3 tags
- Update libraryStore with scanForMusic action

**What you'll learn**:
- File system APIs
- Permission handling
- Async file operations

**Test**: Tap "Scan" → App finds music files on device

---

## Phase 3: Navigation (Steps 11-13)
**Goal**: Multi-screen app with tabs

### Step 11: Tab Navigation Setup
**Checkpoint**: Swipe between 3 tabs

**Concepts**:
- Horizontal scrolling
- Tab bar
- Active tab indicator

**Files to create**:
- `src/navigation/MasterLayout.tsx` - Tab container
- `src/navigation/TopTabBar.tsx` - Tab buttons

**What you'll learn**:
- FlatList horizontal mode
- Scroll synchronization
- Tab state management

**Test**: Swipe left/right → Switch between Queue/Playing/Library

---

### Step 12: Tab Indicator Animation
**Checkpoint**: Animated line follows active tab

**Concepts**:
- Animated.Value
- useRef for animation
- Transform animations

**Files to update**:
- `src/navigation/TopTabBar.tsx` - Add animated indicator

**What you'll learn**:
- React Native Animated API
- Transform: translateX
- Scroll-driven animations

**Test**: Swipe tabs → Line smoothly follows

---

### Step 13: Mini Player
**Checkpoint**: Persistent player at bottom of non-Playing tabs

**Concepts**:
- Absolute positioning
- Conditional rendering
- Component reuse

**Files to create**:
- `src/components/MiniPlayer.tsx` - Compact player
- Update MasterLayout to show mini player

**What you'll learn**:
- Position: absolute
- Z-index layering
- Responsive layouts

**Test**: Go to Library tab → See mini player at bottom

---

## Phase 4: Advanced Features (Steps 14-18)
**Goal**: Professional polish

### Step 14: Search Functionality
**Checkpoint**: Filter songs by text

**Concepts**:
- Text input
- Array filtering
- Debouncing

**Files to update**:
- Add search bar to MasterLayout
- Update screens to filter by searchQuery

**What you'll learn**:
- TextInput component
- String matching
- Performance optimization

**Test**: Type "rock" → See only matching songs

---

### Step 15: Playlists
**Checkpoint**: Create and manage playlists

**Concepts**:
- CRUD operations
- Modal dialogs
- Data persistence

**Files to create**:
- `src/screens/PlaylistsScreen.tsx` - Playlist list
- `src/components/AddToPlaylistModal.tsx` - Create/add dialog
- Update libraryStore with playlist actions

**What you'll learn**:
- Modal component
- Form handling
- Data relationships

**Test**: Create playlist → Add songs → See in playlist screen

---

### Step 16: Favorites & Ratings
**Checkpoint**: Mark songs as favorites, rate 1-5 stars

**Concepts**:
- Track metadata
- Toggle actions
- Star rating UI

**Files to create**:
- `src/components/TrackActionsModal.tsx` - Actions menu
- Update playerStore with toggleFavorite, setRating

**What you'll learn**:
- Action sheets
- Optimistic updates
- Icon states

**Test**: Long-press song → Mark favorite → See heart icon

---

### Step 17: Shuffle & Repeat
**Checkpoint**: Shuffle queue, repeat modes

**Concepts**:
- Array shuffling algorithm
- Repeat modes (off/all/one)
- Queue manipulation

**Files to update**:
- Update queueStore with shuffle/unshuffle
- Update playerStore with repeat modes
- Add buttons to PlayerControls

**What you'll learn**:
- Fisher-Yates shuffle
- State machines (repeat modes)
- Queue preservation

**Test**: Enable shuffle → Queue reorders randomly

---

### Step 18: Theme System
**Checkpoint**: Dark/light/AMOLED themes

**Concepts**:
- Theme context
- Color schemes
- Dynamic styling

**Files to create**:
- `src/context/ThemeContext.tsx` - Theme provider
- `src/constants/theme.ts` - Color definitions
- Update all screens to use theme colors

**What you'll learn**:
- React Context API
- Theme switching
- Color management

**Test**: Change theme → All screens update colors

---

## Phase 5: Polish (Steps 19-22)
**Goal**: Production-ready app

### Step 19: Loading States
**Checkpoint**: Show spinners during async operations

**Concepts**:
- Loading indicators
- Skeleton screens
- Error states

**Files to create**:
- `src/components/SkeletonLoader.tsx` - Placeholder UI
- Update screens with loading states

**What you'll learn**:
- ActivityIndicator
- Conditional rendering
- UX best practices

**Test**: Start scan → See loading spinner

---

### Step 20: Error Handling
**Checkpoint**: Graceful error messages

**Concepts**:
- Try/catch blocks
- Toast notifications
- Error boundaries

**Files to create**:
- `src/components/Toast.tsx` - Toast notification
- Add error handling to all async operations

**What you'll learn**:
- Error propagation
- User feedback
- Defensive programming

**Test**: Trigger error → See toast message

---

### Step 21: Performance Optimization
**Checkpoint**: Smooth scrolling with 1000+ songs

**Concepts**:
- FlatList optimization
- Memoization
- Virtualization

**Files to update**:
- Add getItemLayout to FlatLists
- Use React.memo for list items
- Optimize re-renders

**What you'll learn**:
- React.memo
- useCallback
- useMemo

**Test**: Scroll large list → No lag

---

### Step 22: Persistence
**Checkpoint**: App remembers state after restart

**Concepts**:
- AsyncStorage
- State hydration
- Database (SQLite)

**Dependencies**:
```json
"@react-native-async-storage/async-storage": "^1.19.0",
"react-native-sqlite-storage": "^6.0.1"
```

**Files to create**:
- `src/services/DatabaseService.ts` - SQLite wrapper
- Update stores to persist/restore state

**What you'll learn**:
- AsyncStorage API
- SQLite basics
- Data migration

**Test**: Close app → Reopen → Queue and position restored

---

## Dependencies Summary

### Core Dependencies
```json
{
  "react": "18.2.0",
  "react-native": "0.72.0",
  "zustand": "^4.4.0",
  "react-native-track-player": "^4.0.0",
  "react-native-vector-icons": "^10.0.0"
}
```

### File System & Metadata
```json
{
  "react-native-fs": "^2.20.0",
  "@react-native-community/music-files": "^1.0.0"
}
```

### Storage
```json
{
  "@react-native-async-storage/async-storage": "^1.19.0",
  "react-native-sqlite-storage": "^6.0.1"
}
```

### Navigation & UI
```json
{
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/native-stack": "^6.9.0",
  "react-native-safe-area-context": "^4.7.0",
  "react-native-gesture-handler": "^2.13.0"
}
```

---

## Feature Comparison: Simple vs Full App

| Feature | Simple Version (Phase 1-3) | Full App (Phase 4-5) |
|---------|---------------------------|----------------------|
| Play/Pause | ✅ Local state | ✅ Global state + persistence |
| Queue | ✅ Basic array | ✅ Shuffle, repeat, reorder |
| Library | ✅ Hardcoded songs | ✅ File system scan + metadata |
| Navigation | ✅ 3 tabs | ✅ Sub-navigation, back handling |
| UI | ✅ Basic styling | ✅ Themes, animations, polish |
| Data | ✅ In-memory | ✅ SQLite database |
| Search | ❌ | ✅ Full-text search |
| Playlists | ❌ | ✅ Create, edit, delete |
| Favorites | ❌ | ✅ Toggle, filter |
| Performance | ⚠️ Works for <100 songs | ✅ Optimized for 1000+ songs |

---

## Testing Checkpoints

After each step, verify:
- ✅ Code compiles without errors
- ✅ App runs without crashes
- ✅ Feature works as expected
- ✅ No console warnings
- ✅ Ready for next step

If any checkpoint fails, stop and debug before continuing.

---

## Reference Files (Original App)

When implementing each step, compare with:

**Phase 1-2**: 
- `src/store/playerStore.ts` - Player state patterns
- `src/services/AudioService.ts` - Audio integration
- `src/components/PlayerControls.tsx` - Control UI

**Phase 3**:
- `src/navigation/MasterLayout.tsx` - Tab system architecture
- `src/navigation/TopTabBar.tsx` - Tab bar implementation
- `src/components/MiniPlayer.tsx` - Mini player design

**Phase 4-5**:
- `src/store/libraryStore.ts` - Library management
- `src/services/FileSystemService.ts` - File scanning
- `src/services/DatabaseService.ts` - Data persistence

---

## Next Steps

1. Review this roadmap
2. Ask questions about any unclear concepts
3. Start with Step 1: Hello World Screen
4. Build incrementally, testing after each step
5. Compare with reference app when needed

Ready to start building? 🚀
