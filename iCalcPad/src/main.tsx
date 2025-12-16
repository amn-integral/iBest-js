/// <reference types="vite/client" />

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const CONTAINER_ID = 'react-root';

function bootstrap() {
  const container = document.getElementById(CONTAINER_ID);

  if (!container) {
    if (import.meta.env.DEV === true) {
      console.warn(`[iCalcPad] No element with id="${CONTAINER_ID}" found. React app not mounted.`);
    }
    return;
  }

  const root = createRoot(container);

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

bootstrap();
