import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './ChatWidget';

// Standalone shell — only used when opening localhost:3002 directly for testing.
// spin-core loads ChatWidget via remoteEntry.js container.get('./ChatWidget').
const el = document.getElementById('root');
if (el) {
  createRoot(el).render(<ChatWidget />);
}
