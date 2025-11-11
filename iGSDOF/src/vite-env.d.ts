/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the GRF API (e.g., http://127.0.0.1:8000) */
  readonly VITE_GRF_API_BASE_URL: string;
  /** API endpoint path (e.g., /api/grf/data/) */
  readonly VITE_GRF_API_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
