import '@fontsource-variable/jetbrains-mono';
import './assets/main.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bootstrap } from './lib/bootstrap';

const root = createRoot(document.getElementById('root')!);

bootstrap().then(
  () =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  (error: Error) =>
    root.render(
      <div className="bg-bg text-ink flex h-screen flex-col items-center justify-center gap-4 p-10 text-center">
        <h1 className="font-display text-4xl">Could not open your archive</h1>
        <p className="max-w-lg">
          Your existing data was left untouched, so nothing is lost. Restart the app to try again.
        </p>
        <pre className="border-ink max-w-lg overflow-x-auto border-2 p-4 text-left font-mono text-[0.75rem]">
          {error.message}
        </pre>
      </div>,
    ),
);
