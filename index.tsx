
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Shim for process.env to prevent ReferenceError: process is not defined
// in browser environments while strictly adhering to SDK requirements.
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
