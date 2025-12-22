import { useState, useMemo } from 'react';
import { useIndexedDBData, useSaveToIndexedDB, useIndexedDBStats, type SavedPage, db } from './storage';
import styles from './App.module.css';

function App() {
  console.log('iCalcPad App component starting...');

  const allData: SavedPage[] = useIndexedDBData();

  console.log('Fetched allData from IndexedDB:', allData);

  const stats = useIndexedDBStats();
  const { deleteData, updateData } = useSaveToIndexedDB();

  const [filterApp, setFilterApp] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedPage | null>(null);
  const [isEditingJson, setIsEditingJson] = useState(false);
  const [editedJson, setEditedJson] = useState('');

  console.log('iCalcPad render: allData =', allData, 'length =', allData?.length, 'stats =', stats);

  // Get unique app and project names for filters
  const { appNames, projectNames }: { appNames: string[]; projectNames: string[] } = useMemo(() => {
    const apps = new Set<string>();
    const projects = new Set<string>();

    for (const item of allData) {
      if (item.appName) apps.add(item.appName);
      if (item.project) projects.add(item.project);
    }

    console.log('Computed appNames and projectNames', { apps, projects });
    return {
      appNames: Array.from(apps).sort(),
      projectNames: Array.from(projects).sort()
    };
  }, [allData]);

  // Filter and search data
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allData.filter(item => {
      const matchesApp = filterApp === 'all' || item.appName === filterApp;

      const matchesProject = filterProject === 'all' || item.project === filterProject; // keep whichever field you actually use

      const matchesSearch =
        q === '' ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.url || '').toLowerCase().includes(q) ||
        (item.metadata?.notes || '').toLowerCase().includes(q);

      return matchesApp && matchesProject && matchesSearch;
    });
  }, [allData, filterApp, filterProject, searchQuery]);

  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this saved page?')) {
      await deleteData(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  const handleExport = (item: SavedPage) => {
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.appName}-${item.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const data = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      total: allData.length,
      data: allData
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iCalcPad-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        
        // Handle both single item and batch exports
        const items = Array.isArray(imported.data) ? imported.data : [imported];
        
        let imported_count = 0;
        for (const item of items) {
          // Remove id to let IndexedDB auto-assign
          const { id, ...itemData } = item;
          await db.savedPages.add(itemData);
          imported_count++;
        }
        
        alert(`✅ Successfully imported ${imported_count} item(s)!`);
      } catch (error) {
        console.error('Import failed:', error);
        alert('❌ Failed to import. Invalid JSON format.');
      }
    };
    input.click();
  };

  const handleEditJson = () => {
    if (!selectedItem) return;
    setEditedJson(JSON.stringify(selectedItem.data, null, 2));
    setIsEditingJson(true);
  };

  const handleSaveJson = async () => {
    if (!selectedItem?.id) return;
    
    try {
      const parsed = JSON.parse(editedJson);
      await updateData(selectedItem.id, { data: parsed });
      setIsEditingJson(false);
      alert('✅ Data updated successfully!');
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      alert('❌ Invalid JSON. Please fix errors and try again.');
    }
  };

  // Show loading state while data is being fetched
  const isLoading = allData === undefined || stats === undefined;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>📊 iCalcPad - IndexedDB Manager</h1>
        <div className={styles.headerActions}>
          <button onClick={handleExportAll} disabled={allData.length === 0} className={styles.actionBtn}>
            📥 Export All
          </button>
          <button onClick={handleImport} className={styles.actionBtn}>
            📤 Import JSON
          </button>
        </div>
        <div className={styles.stats}>
          {isLoading ? (
            <span>Loading...</span>
          ) : stats ? (
            <>
              <span>Total Saved: {stats.total}</span>
              {Object.entries(stats.byApp).map(([app, count]) => (
                <span key={app}>
                  {app}: {count}
                </span>
              ))}
            </>
          ) : (
            <span>No data</span>
          )}
        </div>
      </header>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search by title, URL, or notes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={styles.search}
        />
        <select value={filterApp} onChange={e => setFilterApp(e.target.value)} className={styles.filter}>
          <option value="all">All Apps</option>
          {appNames.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className={styles.filter}>
          <option value="all">All Projects</option>
          {projectNames.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.content}>
        <div className={styles.list}>
          {filteredData.length === 0 ? (
            <div className={styles.empty}>
              {searchQuery || filterApp !== 'all' ? (
                <>
                  <p>No matching saved pages found.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterApp('all');
                    }}
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <h3>📭 No Saved Data Yet</h3>
                  <p>This is the IndexedDB Manager for all iBEST apps.</p>
                  <p>To save data:</p>
                  <ol style={{ textAlign: 'left', maxWidth: '400px', margin: '20px auto' }}>
                    <li>
                      Visit an app like{' '}
                      <a href="/iGSDOF/" style={{ color: '#007bff' }}>
                        iGSDOF
                      </a>
                    </li>
                    <li>Fill in some parameters</li>
                    <li>Click the 💾 save button (bottom-right corner)</li>
                    <li>Come back here to view your saved data</li>
                  </ol>
                </>
              )}
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.id} className={`${styles.listItem} ${selectedItem?.id === item.id ? styles.selected : ''}`} onClick={() => setSelectedItem(item)}>
                <div className={styles.itemHeader}>
                  <strong>{item.title}</strong>
                  <span className={styles.badge}>{item.appName}</span>
                </div>
                <div className={styles.itemMeta}>{new Date(item.timestamp).toLocaleString()}</div>
                <div className={styles.itemUrl}>{item.url}</div>
              </div>
            ))
          )}
        </div>

        <div className={styles.details}>
          {selectedItem ? (
            <>
              <div className={styles.detailsHeader}>
                <h2>{selectedItem.title}</h2>
                <div className={styles.detailsActions}>
                  <button onClick={handleEditJson}>✏️ Edit JSON</button>
                  <button onClick={() => handleExport(selectedItem)}>📥 Export JSON</button>
                  <button
                    onClick={() => {
                      // Store state in sessionStorage for the target page to restore
                      sessionStorage.setItem(
                        'ibest_restore_state',
                        JSON.stringify({
                          appName: selectedItem.appName,
                          data: selectedItem.data,
                          timestamp: Date.now()
                        })
                      );
                      window.open(selectedItem.url, '_blank');
                    }}
                  >
                    🔗 Open URL
                  </button>
                  <button onClick={() => void handleDelete(selectedItem.id)} className={styles.dangerBtn}>
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <div className={styles.detailsContent}>
                <section>
                  <h3>Metadata</h3>
                  <dl>
                    <dt>App:</dt>
                    <dd>{selectedItem.appName}</dd>
                    <dt>Saved:</dt>
                    <dd>{new Date(selectedItem.timestamp).toLocaleString()}</dd>
                    <dt>URL:</dt>
                    <dd>
                      <a href={selectedItem.url} target="_blank">
                        {selectedItem.url}
                      </a>
                    </dd>
                    {selectedItem.metadata?.version && (
                      <>
                        <dt>Version:</dt>
                        <dd>{selectedItem.metadata.version}</dd>
                      </>
                    )}
                    {selectedItem.metadata?.notes && (
                      <>
                        <dt>Notes:</dt>
                        <dd>{selectedItem.metadata.notes}</dd>
                      </>
                    )}
                  </dl>
                </section>

                <section>
                  <h3>Saved Data</h3>
                  {isEditingJson ? (
                    <div className={styles.jsonEditor}>
                      <textarea
                        value={editedJson}
                        onChange={(e) => setEditedJson(e.target.value)}
                        className={styles.jsonTextarea}
                        rows={20}
                      />
                      <div className={styles.editorActions}>
                        <button onClick={handleSaveJson} className={styles.saveBtn}>
                          💾 Save Changes
                        </button>
                        <button onClick={() => setIsEditingJson(false)} className={styles.cancelBtn}>
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <pre className={styles.dataPreview}>{JSON.stringify(selectedItem.data, null, 2)}</pre>
                  )}
                </section>
              </div>
            </>
          ) : (
            <div className={styles.detailsEmpty}>Select a saved page to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
