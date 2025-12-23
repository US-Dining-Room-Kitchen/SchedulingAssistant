# Multi-User Sync System

## Overview

The Scheduling Assistant now supports multi-user editing through an operational log with auto-merge system. Multiple users can edit the same database file simultaneously by storing their changes in separate change files that get merged automatically.

## Architecture

The sync system uses an **Operational Log** approach:

```
Network Drive (Shared Folder):
├── schedule.db              ← Main database file
├── changes/                 ← Change log folder
│   ├── user-a@example.com-2025-12-23-10-30-45.json
│   ├── user-b@example.com-2025-12-23-10-31-02.json
│   └── user-c@example.com-2025-12-23-10-45-30.json
└── sync-state.json          ← Tracks which changes have been applied
```

Instead of overwriting the entire database file, users write their changes to individual JSON files. When saving, the system:
1. Writes the user's changes to a new change file
2. Reads and merges changes from other users
3. Detects conflicts and asks for resolution when needed
4. Applies non-conflicting changes automatically

## Features

### ✅ Change Tracking
- All database operations (INSERT, UPDATE, DELETE) are tracked
- Each change includes: operation type, table, record ID, field, old/new values, and timestamp
- Changes are stored locally until saved

### ✅ Automatic Merging
Changes are merged automatically when they don't conflict:
- **Different rows** → Both changes applied
- **Same row, different fields** → Both changes applied
- **Same field, same value** → Keep one (no conflict)
- **Non-overlapping changes** → Both applied automatically

### ✅ Conflict Detection
Conflicts are detected and shown to users for:
- **Same field, different values** → User chooses which to keep
- **One deleted, one edited** → User decides outcome
- **Duplicate inserts** → User resolves duplication

### ✅ Conflict Resolution UI
When conflicts occur, a user-friendly dialog shows:
- What the user changed vs. what others changed
- Clear options: "Keep Yours", "Keep Theirs", "Skip"
- Count of automatically merged changes
- Simple, non-technical language

### ✅ Background Sync
- Checks for changes from other users every 30 seconds
- Auto-applies non-conflicting changes in the background
- Shows notifications like "Auto-merged 3 changes from other users"
- Visual indicator showing sync status and active users

### ✅ Sync Status Indicator
The UI shows:
- Current sync state (synced, syncing, error)
- Number of pending changes
- Who else is currently editing
- Time since last sync

## Current Limitations

### ⚠️ Manual Initialization Required
The sync system cannot automatically access the parent directory of the database file due to browser security restrictions. Users need to manually initialize sync by:

1. Opening the database file
2. Manually selecting or creating the `changes` folder
3. Granting permission for the app to access it

**Future Enhancement:** Store directory handles in IndexedDB for automatic reconnection.

### ⚠️ Change Tracking Not Fully Integrated
Currently, the sync system is integrated into the save workflow but doesn't automatically track all database operations. The next step is to integrate the change tracker with all database operations in App.tsx.

**Required Next Steps:**
1. Wrap all `run()` calls with tracking
2. Replace direct INSERT/UPDATE/DELETE operations with tracked versions
3. Hook the sync engine's `trackOperation` into database wrappers

### ⚠️ File System Access API Support
The sync system requires the File System Access API, which is supported in:
- Chrome/Edge 86+
- Safari 15.2+ (with limitations)

Not supported in Firefox yet.

## How to Use (When Fully Implemented)

### Initial Setup
1. Save your database file to a shared network drive
2. On first save, the app will create a `changes` folder
3. The app will prompt for your work email (used to identify changes)
4. Sync will start automatically

### Daily Use
1. Open the database file as usual
2. Make your edits (add people, assignments, etc.)
3. Click **Save** - your changes will be:
   - Saved to a change file
   - Merged with others' changes automatically
   - Show conflicts if any need resolution

### When Conflicts Occur
1. A dialog will appear showing the conflicting changes
2. For each conflict, choose:
   - **Keep Yours** - Use your version
   - **Keep Theirs** - Use the other person's version
   - **Skip** - Don't apply this change
3. Click **Apply Resolutions** to continue

### Sync Status
Look at the sync status indicator in the top bar to see:
- ✓ Synced - Everything is up to date
- 🔄 Syncing - Currently merging changes
- ⚠️ Error - Sync problem (check the message)
- Names of other active users

## Implementation Details

### Core Components

**`SyncEngine`** (`src/sync/SyncEngine.ts`)
- Main orchestrator for the sync system
- Coordinates change tracking, merging, and background sync

**`ChangeTracker`** (`src/sync/ChangeTracker.ts`)
- Intercepts database operations
- Stores changes in memory until save

**`MergeEngine`** (`src/sync/MergeEngine.ts`)
- Detects conflicts
- Applies non-conflicting changes
- Implements auto-merge rules

**`ChangeFileManager`** (`src/sync/ChangeFileManager.ts`)
- Reads/writes change files
- Manages sync state
- Handles file cleanup

### UI Components

**`ConflictResolutionDialog`** (`src/components/ConflictResolutionDialog.tsx`)
- User interface for resolving conflicts
- Shows side-by-side comparison of changes

**`SyncStatusIndicator`** (`src/components/SyncStatusIndicator.tsx`)
- Visual indicator of sync state
- Shows who else is editing

### Integration Points

**`useSync` Hook** (`src/sync/useSync.ts`)
- React hook for managing sync state
- Provides clean interface to SyncEngine

**Database Migration 24**
- Adds `sync_version` to meta table
- Tracks database version for sync

## Development Roadmap

### Completed ✅
- [x] Core sync infrastructure (types, trackers, engines)
- [x] UI components (conflict dialog, status indicator)
- [x] Integration with App.tsx save workflow
- [x] Background sync mechanism
- [x] Database version tracking

### Next Steps 🔄
1. Add automatic change tracking to all database operations
2. Create UI for manual sync initialization
3. Store directory handles in IndexedDB
4. Add comprehensive testing
5. Create user documentation with screenshots
6. Handle edge cases (network errors, permissions)

### Future Enhancements 💡
- Offline mode with queued sync
- Change history viewer
- Rollback capabilities
- Sync analytics/metrics
- Conflict resolution presets
- Team collaboration features

## Technical Notes

### Browser Compatibility
- Requires File System Access API
- Modern Chrome/Edge (86+)
- Safari 15.2+ (partial support)
- Firefox: Not yet supported

### Performance
- Background sync runs every 30 seconds
- Change files are small (typically < 10 KB)
- Old change files cleaned up after 7 days
- No impact on single-user performance

### Security
- User email used for identification only
- All data stays on local/network drive
- No cloud services involved
- Existing database lock system can be repurposed or removed

## FAQ

**Q: Can I still use the app if I don't want multi-user sync?**
A: Yes! The app works exactly as before if sync isn't initialized. Just continue using it normally.

**Q: What happens if two people edit at the exact same time?**
A: The second person to save will see a conflict dialog and can choose which changes to keep.

**Q: Will my data be lost if there's a conflict?**
A: No! All changes are preserved in the change files. Even if you skip a conflict, the change file remains and can be reviewed later.

**Q: Can I see who made which changes?**
A: Yes! Each change file is named with the user's email and timestamp. Future versions will include a change history viewer.

**Q: What if the network drive is slow?**
A: Change files are small and quick to read/write. The impact should be minimal compared to saving the full database file.

## Support

For issues or questions:
1. Check this documentation
2. Review the implementation in `src/sync/`
3. Open an issue on GitHub
