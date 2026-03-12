import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './liquid-glass/liquid-glass.css';
import './liquid-glass/navbar-glass.css';
import './liquid-glass/liquid-glass--card.css';
import './liquid-glass/liquid-glass.js';
import './liquid-glass/liquid-glass--card.js';
import { MainApp } from './components/MainApp';

const rootElement = document.getElementById('root');

function LiquidGlassInit() {
  useEffect(() => {
    const w = typeof window !== 'undefined' ? window : null;
    if (w && (w as any).LiquidGlass) {
      (w as any).LiquidGlass.init({
        root: document,
        maxDisplacement: 20,
        pressDuration: 320,
        returnDuration: 520,
        useFilter: true,
      });
    }
  }, []);
  return null;
}
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LiquidGlassInit />
    <MainApp />
  </React.StrictMode>
);

