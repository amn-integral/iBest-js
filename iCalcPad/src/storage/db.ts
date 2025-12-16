import Dexie, { Table } from 'dexie';

export interface SavedPage {
  id?: number; // Auto-increment primary key
  appName: string; // 'iCubicle', 'iGSDOF', etc.
  project: string; // Optional project/category name
  url: string; // Full URL when saved
  timestamp: number; // Date.now()
  title: string; // User-provided or auto-generated title
  data: Map<string, unknown>; // App-specific serialized state (JSON)
  metadata?: {
    version?: string; // App version
    userAgent?: string; // Browser info
    notes?: string; // User notes
  };
}

export class IBestDatabase extends Dexie {
  savedPages!: Table<SavedPage, number>;

  constructor() {
    super('iBestDatabase');
    // Schema version 1
    this.version(1).stores({
      savedPages: '++id, appName, project, timestamp, url'
    });
  }
}

export const db = new IBestDatabase();
