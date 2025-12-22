import { useState } from 'react';
import styles from './SaveButton.module.css';
import { useSaveToIndexedDB } from '../storage/hooks';

interface SaveButtonProps {
  appName: string;
  getData: () => unknown; // Function that returns app-specific data to save
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function SaveButton({ appName, getData, className, position = 'bottom-right' }: SaveButtonProps) {
  const { saveData } = useSaveToIndexedDB();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('Default');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = getData();
      await saveData({
        appName,
        project: project || 'Default',
        url: window.location.href,
        title: title || `${appName} - ${new Date().toLocaleString()}`,
        data,
        metadata: {
          notes,
          userAgent: navigator.userAgent,
          version: '1.0'
        }
      });
      setIsOpen(false);
      setTitle('');
      setProject('Default');
      setNotes('');
      alert('Saved successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.container} ${styles[position]} ${className || ''}`}>
      {!isOpen ? (
        <button
          className={styles.fab}
          onClick={() => {
            try {
              const data = getData();
              const pageTitle =
                typeof data === 'object' && data !== null && 'title' in data && typeof (data as { title: string }).title === 'string'
                  ? (data as { title: string }).title
                  : '';
              setTitle(pageTitle || document.title || `${appName} - ${new Date().toLocaleString()}`);
            } catch {
              setTitle(document.title || `${appName} - ${new Date().toLocaleString()}`);
            }
            setIsOpen(true);
          }}
          title="Save to IndexedDB"
        >
          💾
        </button>
      ) : (
        <div className={styles.dialog}>
          <h3>Save Page State</h3>
          <input type="text" placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
          <input type="text" placeholder="Project" value={project} onChange={e => setProject(e.target.value)} />
          <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          <div className={styles.actions}>
            <button
              onClick={() => {
                void handleSave();
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setIsOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
