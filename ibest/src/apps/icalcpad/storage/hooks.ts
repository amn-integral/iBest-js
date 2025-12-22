import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SavedPage } from './db';

/**
 * Hook to fetch all saved pages, optionally filtered by app name
 */
export function useIndexedDBData(appName?: string, project?: string): SavedPage[] {
  const data = useLiveQuery(async () => {
    if (appName && project) {
      return await db.savedPages.where('[appName+project]').equals([appName, project]).reverse().sortBy('timestamp');
    } else if (appName) {
      return await db.savedPages.where('appName').equals(appName).reverse().sortBy('timestamp');
    } else if (project) {
      return await db.savedPages.where('project').equals(project).reverse().sortBy('timestamp');
    }
    return await db.savedPages.orderBy('timestamp').reverse().toArray();
  }, [appName, project]);

  return data ?? [];
}

/**
 * Hook to save data to IndexedDB
 */
export function useSaveToIndexedDB() {
  const saveData = async (entry: Omit<SavedPage, 'id' | 'timestamp'>) => {
    const id = await db.savedPages.add({
      ...entry,
      timestamp: Date.now()
    });
    return id;
  };

  const deleteData = async (id: number) => {
    await db.savedPages.delete(id);
  };

  const updateData = async (id: number, changes: Partial<SavedPage>) => {
    await db.savedPages.update(id, changes);
  };

  return { saveData, deleteData, updateData };
}

/**
 * Hook to get statistics about saved data
 */
export function useIndexedDBStats() {
  const stats = useLiveQuery(async () => {
    const all = await db.savedPages.toArray();
    const projectCounts = all.reduce(
      (acc, page) => {
        const key = page.project;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const byApp = all.reduce(
      (acc, page) => {
        acc[page.appName] = (acc[page.appName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total: all.length,
      byApp,
      byProject: projectCounts,
      oldestTimestamp: all.length ? Math.min(...all.map(p => p.timestamp)) : null,
      newestTimestamp: all.length ? Math.max(...all.map(p => p.timestamp)) : null
    };
  });

  return stats;
}
