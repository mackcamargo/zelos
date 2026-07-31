import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';

// Google Analytics initialization
function initializeGoogleAnalytics() {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-MP6SWJVQGV';
    document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
    function gtag() {
          window.dataLayer.push(arguments);
    }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'G-MP6SWJVQGV');
}

// Initialize GA when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGoogleAnalytics);
} else {
    initializeGoogleAnalytics();
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider>
              <App />
        </ThemeProvider>ThemeProvider>
    </StrictMode>StrictMode>,
  );</StrictMode>
