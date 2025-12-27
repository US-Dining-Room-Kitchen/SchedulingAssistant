/**
 * FolderSyncService - Manages folder-based database sync
 * 
 * Handles:
 * - Scanning folders for .base and .db files
 * - Cleaning up old .bak files (>3 days)
 * - Creating working files from base
 * - Archiving working files after merge
 * - Detecting when checkpoint is needed (solo user >3 days)
 */

export interface FolderScanResult {
  /** The base file handle, if found */
  baseFile: FileSystemFileHandle | null;
  /** Working .db files (e.g., schedule.john@co.db) */
  workingFiles: WorkingFileInfo[];
  /** Backup files found */
  backupFiles: FileSystemFileHandle[];
  /** Whether a merge is needed (multiple working files or others' files) */
  needsMerge: boolean;
  /** The current user's working file, if it exists */
  myWorkingFile: FileSystemFileHandle | null;
}

export interface WorkingFileInfo {
  handle: FileSystemFileHandle;
  email: string;
  fileName: string;
}

const BASE_FILE_NAME = 'schedule.base';
const BACKUP_EXTENSION = '.bak';
const MERGE_LOCK_FILE = 'schedule.merge-lock';
const WORKING_FILE_PATTERN = /^schedule\.(.+)\.db$/;
const BACKUP_FILE_PATTERN = /^schedule\..+\.db\.bak\.(\d{4}-\d{2}-\d{2})$/;

export interface MergeLockInfo {
  email: string;
  startedAt: string;
  workingFiles: string[];
}

/**
 * Generates a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Extracts email from a working file name
 * e.g., "schedule.john@company.com.db" → "john@company.com"
 */
export function extractEmailFromFileName(fileName: string): string | null {
  const match = fileName.match(WORKING_FILE_PATTERN);
  return match ? match[1] : null;
}

/**
 * Creates a working file name for a given email
 * e.g., "john@company.com" → "schedule.john@company.com.db"
 */
export function createWorkingFileName(email: string): string {
  return `schedule.${email}.db`;
}

/**
 * Creates a backup file name with today's date
 * e.g., "schedule.john@company.com.db" → "schedule.john@company.com.db.bak.2025-12-26"
 */
export function createBackupFileName(workingFileName: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${workingFileName}${BACKUP_EXTENSION}.${today}`;
}

/**
 * Parses the date from a backup file name
 */
export function parseBackupDate(fileName: string): Date | null {
  const match = fileName.match(BACKUP_FILE_PATTERN);
  if (!match) return null;
  const dateStr = match[1];
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Scans a folder for base, working, and backup files
 */
export async function scanFolder(
  folderHandle: FileSystemDirectoryHandle,
  currentUserEmail: string
): Promise<FolderScanResult> {
  let baseFile: FileSystemFileHandle | null = null;
  const workingFiles: WorkingFileInfo[] = [];
  const backupFiles: FileSystemFileHandle[] = [];
  let myWorkingFile: FileSystemFileHandle | null = null;

  for await (const [name, handle] of folderHandle.entries()) {
    if (handle.kind !== 'file') continue;

    const fileHandle = handle as FileSystemFileHandle;

    // Check for base file
    if (name === BASE_FILE_NAME) {
      baseFile = fileHandle;
      continue;
    }

    // Check for working files
    const email = extractEmailFromFileName(name);
    if (email) {
      workingFiles.push({
        handle: fileHandle,
        email,
        fileName: name,
      });
      if (email.toLowerCase() === currentUserEmail.toLowerCase()) {
        myWorkingFile = fileHandle;
      }
      continue;
    }

    // Check for backup files
    if (name.includes(BACKUP_EXTENSION)) {
      backupFiles.push(fileHandle);
    }
  }

  // Determine if merge is needed:
  // - Multiple working files exist, OR
  // - Working files exist that aren't mine
  const othersWorkingFiles = workingFiles.filter(
    wf => wf.email.toLowerCase() !== currentUserEmail.toLowerCase()
  );
  const needsMerge = othersWorkingFiles.length > 0;

  return {
    baseFile,
    workingFiles,
    backupFiles,
    needsMerge,
    myWorkingFile,
  };
}

/**
 * Cleans up backup files older than the specified number of days
 */
export async function cleanupOldBackups(
  folderHandle: FileSystemDirectoryHandle,
  maxAgeDays: number = 3
): Promise<number> {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);
  let deletedCount = 0;

  for await (const [name, handle] of folderHandle.entries()) {
    if (handle.kind !== 'file') continue;
    if (!name.includes(BACKUP_EXTENSION)) continue;

    const backupDate = parseBackupDate(name);
    if (backupDate && backupDate < cutoffDate) {
      try {
        await folderHandle.removeEntry(name);
        deletedCount++;
        console.log(`[FolderSync] Deleted old backup: ${name}`);
      } catch (e) {
        console.warn(`[FolderSync] Failed to delete backup ${name}:`, e);
      }
    }
  }

  return deletedCount;
}

/**
 * Checks if a solo-user checkpoint is needed (no other users for >3 days)
 */
export function shouldCheckpoint(
  lastCheckpointStr: string | null,
  maxDays: number = 3
): boolean {
  if (!lastCheckpointStr) return true;

  try {
    const lastCheckpoint = new Date(lastCheckpointStr);
    const now = new Date();
    const daysSince = (now.getTime() - lastCheckpoint.getTime()) / (24 * 60 * 60 * 1000);
    return daysSince >= maxDays;
  } catch {
    return true;
  }
}

/**
 * Creates a new working file from the base file
 */
export async function createWorkingFileFromBase(
  folderHandle: FileSystemDirectoryHandle,
  baseHandle: FileSystemFileHandle,
  email: string
): Promise<FileSystemFileHandle> {
  const workingFileName = createWorkingFileName(email);
  
  // Read base file
  const baseFile = await baseHandle.getFile();
  const baseData = await baseFile.arrayBuffer();

  // Create working file
  const workingHandle = await folderHandle.getFileHandle(workingFileName, { create: true });
  const writable = await workingHandle.createWritable();
  await writable.write(baseData);
  await writable.close();

  console.log(`[FolderSync] Created working file: ${workingFileName}`);
  return workingHandle;
}

/**
 * Creates a new empty base file
 */
export async function createEmptyBase(
  folderHandle: FileSystemDirectoryHandle,
  initialDbData: Uint8Array
): Promise<FileSystemFileHandle> {
  const baseHandle = await folderHandle.getFileHandle(BASE_FILE_NAME, { create: true });
  const writable = await baseHandle.createWritable();
  await writable.write(initialDbData);
  await writable.close();

  console.log(`[FolderSync] Created new base file`);
  return baseHandle;
}

/**
 * Updates the base file with merged data
 */
export async function updateBase(
  baseHandle: FileSystemFileHandle,
  mergedData: Uint8Array
): Promise<void> {
  const writable = await baseHandle.createWritable();
  await writable.write(mergedData);
  await writable.close();

  console.log(`[FolderSync] Updated base file`);
}

/**
 * Archives a working file by renaming it to .bak with today's date
 */
export async function archiveWorkingFile(
  folderHandle: FileSystemDirectoryHandle,
  workingFile: WorkingFileInfo
): Promise<void> {
  const backupFileName = createBackupFileName(workingFile.fileName);

  // Read working file data
  const file = await workingFile.handle.getFile();
  const data = await file.arrayBuffer();

  // Create backup file
  const backupHandle = await folderHandle.getFileHandle(backupFileName, { create: true });
  const writable = await backupHandle.createWritable();
  await writable.write(data);
  await writable.close();

  // Delete original working file
  await folderHandle.removeEntry(workingFile.fileName);

  console.log(`[FolderSync] Archived ${workingFile.fileName} → ${backupFileName}`);
}

/**
 * Saves data to a working file
 */
export async function saveToWorkingFile(
  workingHandle: FileSystemFileHandle,
  data: Uint8Array
): Promise<void> {
  const writable = await workingHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * Reads a database file and returns its ArrayBuffer
 */
export async function readDatabaseFile(
  handle: FileSystemFileHandle
): Promise<ArrayBuffer> {
  const file = await handle.getFile();
  return file.arrayBuffer();
}

/**
 * Gets the last modified time of a file
 */
export async function getFileLastModified(
  handle: FileSystemFileHandle
): Promise<number> {
  const file = await handle.getFile();
  return file.lastModified;
}

/**
 * Creates a merge lock file to indicate a merge is in progress
 * This helps with crash recovery - if the lock exists on next open,
 * the user is warned that a previous merge may have failed
 */
export async function createMergeLock(
  folderHandle: FileSystemDirectoryHandle,
  email: string,
  workingFileNames: string[]
): Promise<void> {
  const lockInfo: MergeLockInfo = {
    email,
    startedAt: new Date().toISOString(),
    workingFiles: workingFileNames,
  };

  try {
    const lockHandle = await folderHandle.getFileHandle(MERGE_LOCK_FILE, { create: true });
    const writable = await lockHandle.createWritable();
    await writable.write(JSON.stringify(lockInfo, null, 2));
    await writable.close();
    console.log('[FolderSync] Created merge lock');
  } catch (e) {
    console.warn('[FolderSync] Failed to create merge lock:', e);
  }
}

/**
 * Removes the merge lock file after successful merge
 */
export async function removeMergeLock(
  folderHandle: FileSystemDirectoryHandle
): Promise<void> {
  try {
    await folderHandle.removeEntry(MERGE_LOCK_FILE);
    console.log('[FolderSync] Removed merge lock');
  } catch (e) {
    // Lock may not exist, which is fine
    console.log('[FolderSync] Merge lock not found (already removed or never created)');
  }
}

/**
 * Checks if a merge lock exists (indicates previous merge may have crashed)
 * Returns the lock info if found, null otherwise
 */
export async function checkMergeLock(
  folderHandle: FileSystemDirectoryHandle
): Promise<MergeLockInfo | null> {
  try {
    const lockHandle = await folderHandle.getFileHandle(MERGE_LOCK_FILE);
    const file = await lockHandle.getFile();
    const text = await file.text();
    const lockInfo = JSON.parse(text) as MergeLockInfo;
    
    // Check if lock is stale (older than 1 hour - merge should never take that long)
    const lockAge = Date.now() - new Date(lockInfo.startedAt).getTime();
    const oneHour = 60 * 60 * 1000;
    
    if (lockAge > oneHour) {
      console.log('[FolderSync] Found stale merge lock (>1 hour old), will remove');
      await removeMergeLock(folderHandle);
      return null;
    }
    
    return lockInfo;
  } catch {
    // Lock doesn't exist
    return null;
  }
}
