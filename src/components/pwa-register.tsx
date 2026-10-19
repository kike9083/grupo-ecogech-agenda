'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (spec `pwa` → "Installable app").
 *
 * Production only: in development the worker would sit between Turbopack's
 * hot reload and the browser and serve a stale shell, which reads as "my
 * change did nothing". Installability is a production concern anyway.
 *
 * Registration is deferred to `load` so it never competes with the first
 * render for bandwidth, and a failure is swallowed on purpose — the app works
 * perfectly without a worker, and a thrown error here would surface as a
 * console crash on browsers that block storage in private mode.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const register = (): void => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installability is a progressive enhancement; nothing to recover.
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => {
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}
