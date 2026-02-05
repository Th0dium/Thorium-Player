This setup phase is the most critical part of the "clean-room" build. Musicolet’s onboarding is famously fast because it doesn't wait for the user to "learn" the app—it lets the user define the app during the first 60 seconds.

Here is the expanded, high-detail setup blueprint for your project.

Module: The Onboarding & Setup Framework
Phase 1: The "Identity" Handshake (Privacy & Permissions)
Musicolet establishes its "No-Internet" identity immediately to build trust.

Splash/Intro Screen.

The Permission Guard: * Logic: Trigger a system prompt for READ_MEDIA_AUDIO (Android 13+) or READ_EXTERNAL_STORAGE (Legacy).

UX Note: If the user denies, show a "Why we need this" modal explaining that the app cannot "see" music without this access.

Phase 2: Music Discovery Engine (The Import Logic)
This is where the user controls how their library is built.

Auto-Detect (Recommended): The app crawls standard directories: /Music, /Downloads, and the root of the SD card.

Manual Selective Scan: Opens a File Picker. The user must explicitly select the folders they want (e.g., Internal Storage > MyRecords).

The "Blacklist" Filter: During import, offer a setting to "Ignore Short Files."

Default: Ignore any file under 30 seconds (prevents ringtones and notification sounds from cluttering the library).

Background Indexing: The scan must run as a Foreground Service with a progress bar in the notification tray so the user can use the app while it indexes metadata.

After file confirmation, start detect and profiling music files.
Phase 3: Basic UI Preferences (Defining the UX)
Musicolet lets users choose their navigation style before they even see the home screen.

Category Selector: A checklist of tabs the user wants to see in their horizontal top bar.

Options: Folders, Albums, Artists, Playlists, Genres, Composers, Recently Added.

Folder Structure Preference: A toggle between:

Linear View: Shows all folders containing music in one list (e.g., Classic, Rock, Workouts).

Hierarchical View: The actual file tree (e.g., Root > Media > Music > Rock).

Initial Theme Selection: Toggle between System Default, Light, Dark, or AMOLED Black.

Phase 4: App Configuration & Logic (The "Smart" Defaults)
Queue Behavior: Ask the user if they want to "Close app when the queue ends" or "Keep app open."

Earphone Plug-in Logic: * Checkbox: "Resume playback when headset is connected."

Checkbox: "Pause playback when headset is disconnected."

Scanned Files Update: A setting for "Auto-Sync Library."

Logic: Every time the app starts, it checks for new files in the "Whitelisted Folders" without requiring a full manual rescan.






1. Core UI Architecture & Navigation
Musicolet uses a "Flat Information Architecture" designed to minimize "click-depth."

Horizontal Main Tabs: A scrollable row at the top containing all library categories.

Categories: [Main Player], [Queues], [Folders], [Albums], [Artists], [Playlists], [Genres], [Songs].

Interaction: Tabs are always accessible. Tapping swaps the list view below immediately without loading screens.

The Mini-Player: A persistent 60dp high bar at the bottom.

Features: Play/Pause, Skip, and a "Current Queue" progress indicator.

Gesture: Swiping up on the mini-player expands the "Now Playing" screen.

Multi-Select Engine: Deep integration of a "Select" mode.

Actions: Invert selection, "Select all in folder," and batch-action buttons (Play Next, Add to Playlist, Edit Tags).

2. Module: Multiple Queue Logic (USP)
This is the most complex backend logic to copy.

Parallel State Management: The app must support up to 20 independent queues.

Queue Data Object: Each queue must store:

list_of_tracks (Ordered IDs)

current_track_index

playback_position_ms

shuffle_state (On/Off)

Switching Logic: Changing from Queue 1 to Queue 2 does not clear Queue 1. It "pauses" the state so the user can return to the exact millisecond later.

3. Module: Library & File Management
Musicolet treats the file system as the "Source of Truth," not just a database.

Folder View Types:

Linear View: A flat list of every folder containing at least one audio file.

Hierarchical View: A traditional "PC-style" directory tree.

Library Filtering (The Gatekeeper):

Whitelist: Only scan folders explicitly added by the user.

Ignore/Blacklist: Option to ignore folders shorter than X seconds (to filter out notification sounds or game assets).

In-App File Operations: Logic to Rename, Move, or Copy physical files on the storage directly from the UI.

4. Module: The "Tag Editor+" & Metadata
Batch Editing: Select 50 songs → Edit "Album Name" or "Artist" for all at once.

Lyrics Engine:

Embedded: Read/Write ID3 tags inside the .mp3.

External (.LRC): Sync-playback support. If Song.mp3 exists, look for Song.lrc in the same folder.

Lyrics Editor: A built-in tool to "Time-stamp" lyrics. The user taps a "Sync" button while the music plays to mark when each line should appear.

5. Module: Audio Engine & Playback
Gapless Playback: Pre-loading the next track in the buffer 500ms before the current one ends.

Playback Speed: A high-quality pitch-shifting engine (0.5x to 5.0x).

Earphone Intelligence:

1 Click: Play/Pause.

2 Clicks: Next.

3 Clicks: Previous.

4+ Clicks: User-defined (e.g., Fast Forward or "Read Title aloud").

Dual Decoder: Toggle between System Decoder (Battery efficient) and App Decoder (Supports more formats like FLAC/ALAC).

6. Setup & Customization Flow (Settings Tree)
Step 1: The "Onboarding" Wizard
Permission Request: Clear explanation of why READ_MEDIA_AUDIO is needed.

Privacy Badge: Explicitly state "No Internet Permission = No Data Tracking."

Scanner Setup: "Do you want to scan all folders or pick specific ones?"

Step 2: App Configurations
Interface Settings:

Tab Manager: Checkboxes to hide/show specific tabs.

Themes: Light, Dark, and "AMOLED Black."

Color Accent: Manual hex-code entry or "Material You" wallpaper matching.

Backup & Restore:

Generate a .zip file containing: settings.json, playlists.db, and play_counts.db.

Auto-Backup: Option to trigger a backup every 7 days.