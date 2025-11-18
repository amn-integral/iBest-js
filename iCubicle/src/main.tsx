// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const CONTAINER_ID = 'react-root';

function bootstrap() {
  const container = document.getElementById(CONTAINER_ID);

  if (!container) {
    // In production we silently skip; in dev we log a warning
    if (import.meta.env.DEV) {
      console.warn(
        `[iCubicle] No element with id="${CONTAINER_ID}" found. React app not mounted.`
      );
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
