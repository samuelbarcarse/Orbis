// Register @arcgis/map-components custom elements (<arcgis-map>, <arcgis-zoom>, …)
// Must happen before React renders anything that uses them.
import { defineCustomElements } from '@arcgis/map-components/dist/loader';
defineCustomElements(window);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from '@/App.jsx';
import '@/index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
);
