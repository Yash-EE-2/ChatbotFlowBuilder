/**
 * @file main.jsx
 * @description React DOM entry point.
 *
 * Mounts the root <App /> component into the #root div defined in index.html.
 * Once the app renders, the full-page loader overlay (#page-loader) is faded out
 * so users see meaningful UI instead of a blank screen during the JS parse phase.
 *
 * <React.StrictMode> is enabled to surface potential issues during development:
 *   • Highlights components with legacy lifecycle methods.
 *   • Detects unexpected side-effects by intentionally double-invoking
 *     render functions and certain lifecycle hooks (dev only).
 *   • Warns about deprecated Context API usage and string refs.
 *
 * Note: StrictMode has NO effect in production builds.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // global styles: Tailwind directives + React Flow overrides

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

/* ── Dismiss the loader overlay once React has finished its first render ── */
requestAnimationFrame(() => {
    const loader = document.getElementById('page-loader');
    if (loader) {
        // Small delay ensures the painted frame is visible before we hide the loader
        setTimeout(() => loader.classList.add('hidden'), 350);
    }
});
