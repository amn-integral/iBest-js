/// <reference types="vite/client" />

import type { SaveWidgetConfig } from '../storage/SaveButton';

export {};

declare global {
  interface Window {
    ibestSaveConfig?: SaveWidgetConfig;
  }
}
