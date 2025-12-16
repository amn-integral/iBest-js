/**
 * Standalone IndexedDB Save Widget for Django Templates
 *
 * Usage in Django template:
 * 1. Include script tag: {% vite_js 'widgets/save-widget.ts' 'iUIComponents/dist' %}
 * 2. Configure: window.ibestSaveConfig = { appName: 'iCubicle', getDataCallback: () => {...} }
 * 3. Widget auto-initializes on DOMContentLoaded
 */

import { SavedPage, IBestDatabase } from '../storage/db';

const db = new IBestDatabase();

export interface SaveWidgetConfig {
  appName: string;
  getDataCallback?: () => unknown; // Custom data serialization function
  onRestore?: (data: unknown) => void; // Called when restoring saved state from iCalcPad
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  buttonText?: string;
  buttonEmoji?: string;
}

class SaveWidget {
  private config: SaveWidgetConfig;
  private container: HTMLDivElement;
  private isOpen = false;

  constructor(config: SaveWidgetConfig) {
    this.config = {
      position: 'bottom-right',
      buttonEmoji: '💾',
      buttonText: '',
      ...config
    };
    this.container = this.createContainer();
    this.render();
    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'ibest-save-widget';
    container.style.cssText = this.getPositionStyles();
    return container;
  }

  private getPositionStyles(): string {
    const base = 'position: fixed; z-index: 9999;';
    const positions = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;'
    };
    return base + positions[this.config.position || 'bottom-right'];
  }

  private render() {
    if (!this.isOpen) {
      this.renderButton();
    } else {
      this.renderDialog();
    }
  }

  private renderButton() {
    this.container.innerHTML = `
			<button id="ibest-save-btn" style="
				width: 56px;
				height: 56px;
				border-radius: 50%;
				background: #007bff;
				color: white;
				border: none;
				font-size: 24px;
				cursor: pointer;
				box-shadow: 0 2px 8px rgba(0,0,0,0.3);
				transition: all 0.3s;
			" title="Save to IndexedDB">
				${this.config.buttonEmoji}${this.config.buttonText}
			</button>
		`;

    const btn = this.container.querySelector('#ibest-save-btn') as HTMLButtonElement;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#0056b3';
      btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#007bff';
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', () => {
      this.isOpen = true;
      this.render();
    });
  }

  private renderDialog() {
    let defaultTitle = document.title || `${this.config.appName} - ${new Date().toLocaleString()}`;

    // Try to get title from data callback
    try {
      if (this.config.getDataCallback && typeof this.config.getDataCallback === 'function') {
        const data = this.config.getDataCallback() as { title?: string };
        if (data?.title) {
          defaultTitle = data.title;
        }
      }
    } catch (err) {
      console.warn('[SaveWidget] Could not extract title from data:', err);
    }

    this.container.innerHTML = `
			<div style="
				background: white;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 4px 16px rgba(0,0,0,0.2);
				min-width: 320px;
			">
				<h3 style="margin: 0 0 15px 0; font-family: sans-serif;">Save Page State</h3>
				<input id="ibest-title" type="text" placeholder="Title (optional)" value="${defaultTitle}" style="
					width: 100%;
					padding: 8px;
					margin-bottom: 10px;
					border: 1px solid #ccc;
					border-radius: 4px;
					box-sizing: border-box;
					font-family: sans-serif;
				" />
				<input id="ibest-project" type="text" placeholder="Project Name (Default)" style="
					width: 100%;
					padding: 8px;
					margin-bottom: 10px;
					border: 1px solid #ccc;
					border-radius: 4px;
					box-sizing: border-box;
					font-family: sans-serif;
				" />
				<textarea id="ibest-notes" placeholder="Notes (optional)" rows="3" style="
					width: 100%;
					padding: 8px;
					margin-bottom: 10px;
					border: 1px solid #ccc;
					border-radius: 4px;
					box-sizing: border-box;
					font-family: sans-serif;
					resize: vertical;
				"></textarea>
				<div style="display: flex; gap: 10px; justify-content: flex-end;">
					<button id="ibest-save" style="
						padding: 8px 16px;
						border: none;
						border-radius: 4px;
						cursor: pointer;
						background: #28a745;
						color: white;
						font-family: sans-serif;
					">Save</button>
					<button id="ibest-cancel" style="
						padding: 8px 16px;
						border: none;
						border-radius: 4px;
						cursor: pointer;
						background: #6c757d;
						color: white;
						font-family: sans-serif;
					">Cancel</button>
				</div>
			</div>
		`;

    const saveBtn = this.container.querySelector('#ibest-save') as HTMLButtonElement;
    const cancelBtn = this.container.querySelector('#ibest-cancel') as HTMLButtonElement;
    const titleInput = this.container.querySelector('#ibest-title') as HTMLInputElement;
    const projectInput = this.container.querySelector('#ibest-project') as HTMLInputElement;
    const notesInput = this.container.querySelector('#ibest-notes') as HTMLTextAreaElement;

    saveBtn.addEventListener('click', () => {
      void this.handleSave(titleInput.value, projectInput.value, notesInput.value);
    });
    cancelBtn.addEventListener('click', () => {
      this.isOpen = false;
      this.render();
    });
  }

  private async handleSave(title: string, project: string, notes: string) {
    try {
      if (!this.config.getDataCallback || typeof this.config.getDataCallback !== 'function') {
        alert('❌ No getDataCallback configured. Cannot save.');
        return;
      }

      const data = this.config.getDataCallback();

      await db.savedPages.add({
        appName: this.config.appName,
        project: project || 'Default',
        url: window.location.href,
        title: title || `${this.config.appName} - ${new Date().toLocaleString()}`,
        timestamp: Date.now(),
        data,
        metadata: {
          notes,
          userAgent: navigator.userAgent,
          version: '1.0'
        }
      });

      alert('✅ Saved successfully to IndexedDB!');
      this.isOpen = false;
      this.render();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('❌ Failed to save. Check console for details.');
    }
  }
}

// Auto-initialize when DOM is ready
function initWidget() {
  const config = window.ibestSaveConfig as SaveWidgetConfig;

  if (!config || !config.appName) {
    console.error('SaveWidget: Missing window.ibestSaveConfig.appName');
    return;
  }

  new SaveWidget(config);

  // Check for restore state from iCalcPad
  checkAndRestoreState(config);
}

// Check sessionStorage for state to restore
function checkAndRestoreState(config: SaveWidgetConfig) {
  try {
    const restoreDataStr = sessionStorage.getItem('ibest_restore_state');
    if (!restoreDataStr) return;

    const restoreData = JSON.parse(restoreDataStr) as Partial<SavedPage>;

    // Verify this restore is for the current app
    if (restoreData.appName !== config.appName || !restoreData.timestamp) return;

    // Check timestamp (only restore if within last 30 seconds to prevent stale restores)
    const age = Date.now() - restoreData.timestamp;
    if (age > 30000) {
      sessionStorage.removeItem('ibest_restore_state');
      return;
    }

    // Clear the restore data immediately to prevent re-restore on refresh
    sessionStorage.removeItem('ibest_restore_state');

    console.log(`[SaveWidget] Restoring state for ${config.appName}:`, restoreData.data);

    // Call the onRestore callback if provided
    const onRestore = config.onRestore;

    if (typeof onRestore === 'function') {
      // Wait a bit for the page to fully load
      setTimeout(() => {
        onRestore(restoreData.data);
      }, 500);
    } else {
      console.warn('[SaveWidget] No onRestore callback found in window.ibestSaveConfig');
    }
  } catch (err) {
    console.error('[SaveWidget] Error restoring state:', err);
    sessionStorage.removeItem('ibest_restore_state');
  }
}

// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
