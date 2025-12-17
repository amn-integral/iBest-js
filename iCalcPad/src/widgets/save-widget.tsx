/**
 * Standalone Save Widget for Django Templates
 *
 * This file contains everything needed for the save widget:
 * - React component
 * - Utility functions (CSRF filtering)
 * - Auto-mount logic for Django templates
 *
 * Usage in Django template:
 * 1. Include script tag: {% vite_js 'widgets/save-widget-standalone.tsx' 'iUIComponents/dist' %}
 * 2. Configure: window.ibestSaveConfig = { appName: 'iCubicle', getDataCallback: () => {...} }
 * 3. Widget auto-initializes on DOMContentLoaded
 */

import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SavedPage, IBestDatabase } from '../storage/db';

const db = new IBestDatabase();

// ============================================================================
// Types
// ============================================================================

export interface SaveWidgetConfig {
  appName: string;
  getDataCallback?: () => unknown;
  onRestore?: (data: unknown) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  buttonText?: string;
  buttonEmoji?: string;
}

interface SaveWidgetProps {
  config: SaveWidgetConfig;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Filter out sensitive data like CSRF tokens from the data object
 */
function filterSensitiveData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const sensitiveKeys = ['csrfmiddlewaretoken', 'csrf_token', 'authenticity_token'];

  if (Array.isArray(data)) {
    return { items: data.map(item => filterSensitiveData(item)) };
  }

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => sk.toLowerCase() === key.toLowerCase())) {
      continue;
    }

    if (value && typeof value === 'object') {
      filtered[key] = filterSensitiveData(value);
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

// ============================================================================
// React Component
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
const SaveWidget = ({ config }: SaveWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      if (config.getDataCallback && typeof config.getDataCallback === 'function') {
        const data = config.getDataCallback() as { title?: string };
        if (data?.title) {
          setTitle(data.title);
        } else {
          setTitle(document.title || `${config.appName} - ${new Date().toLocaleString()}`);
        }
      }
    } catch (err) {
      console.warn('[SaveWidget] Could not extract title from data:', err);
      setTitle(document.title || `${config.appName} - ${new Date().toLocaleString()}`);
    }
  }, [config, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!config.getDataCallback || typeof config.getDataCallback !== 'function') {
        alert('❌ No getDataCallback configured. Cannot save.');
        return;
      }

      const rawData = config.getDataCallback();
      const data = filterSensitiveData(rawData);

      await db.savedPages.add({
        appName: config.appName,
        project: project || 'Default',
        url: window.location.href,
        title: title || `${config.appName} - ${new Date().toLocaleString()}`,
        timestamp: Date.now(),
        data,
        metadata: {
          notes,
          userAgent: navigator.userAgent,
          version: '1.0'
        }
      });

      alert('✅ Saved successfully to IndexedDB!');
      setIsOpen(false);
      setTitle('');
      setProject('');
      setNotes('');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('❌ Failed to save. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const getPositionStyles = (): React.CSSProperties => {
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' }
    };
    return {
      position: 'fixed',
      zIndex: 9999,
      ...positions[config.position || 'bottom-right']
    };
  };

  if (!isOpen) {
    return (
      <div style={getPositionStyles()}>
        <button
          onClick={() => setIsOpen(true)}
          title="Save to IndexedDB"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#007bff',
            color: 'white',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#0056b3';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#007bff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {config.buttonEmoji || '💾'}
          {config.buttonText || ''}
        </button>
      </div>
    );
  }

  return (
    <div style={getPositionStyles()}>
      <div
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          minWidth: '320px',
          fontFamily: 'sans-serif'
        }}
      >
        <h3 style={{ margin: '0 0 15px 0' }}>Save Page State</h3>
        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
        />
        <input
          type="text"
          placeholder="Project Name (Default)"
          value={project}
          onChange={e => setProject(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
        />
        <textarea
          placeholder="Notes (optional)"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
            resize: 'vertical'
          }}
        />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving ? 'wait' : 'pointer',
              background: '#28a745',
              color: 'white',
              opacity: isSaving ? 0.6 : 1
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: '#6c757d',
              color: 'white'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Session Storage Restore Logic
// ============================================================================

function checkAndRestoreState(config: SaveWidgetConfig) {
  try {
    const restoreDataStr = sessionStorage.getItem('ibest_restore_state');
    if (!restoreDataStr) return;

    const restoreData = JSON.parse(restoreDataStr) as Partial<SavedPage>;

    if (restoreData.appName !== config.appName || !restoreData.timestamp) return;

    const age = Date.now() - restoreData.timestamp;
    if (age > 30000) {
      sessionStorage.removeItem('ibest_restore_state');
      return;
    }

    sessionStorage.removeItem('ibest_restore_state');

    console.log(`[SaveWidget] Restoring state for ${config.appName}:`, restoreData.data);

    if (typeof config.onRestore === 'function') {
      setTimeout(() => {
        config.onRestore!(restoreData.data);
      }, 500);
    } else {
      console.warn('[SaveWidget] No onRestore callback found in window.ibestSaveConfig');
    }
  } catch (err) {
    console.error('[SaveWidget] Error restoring state:', err);
    sessionStorage.removeItem('ibest_restore_state');
  }
}

// ============================================================================
// Auto-mount Logic
// ============================================================================

function initWidget() {
  const config = (window as unknown as { ibestSaveConfig?: SaveWidgetConfig }).ibestSaveConfig;

  if (!config || !config.appName) {
    console.error('SaveWidget: Missing window.ibestSaveConfig.appName');
    return;
  }

  // Create container
  const container = document.createElement('div');
  container.id = 'ibest-save-widget-root';
  document.body.appendChild(container);

  // Mount React component
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <SaveWidget config={config} />
    </StrictMode>
  );

  // Check for restore state
  checkAndRestoreState(config);
}

// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
