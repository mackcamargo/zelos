import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';

createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <ThemeProvider>
                  <App />
            </ThemeProvider>ThemeProvider>
        </StrictMode>StrictMode>,
      );

// Google Analytics - Load after React renders
setTimeout(() => {
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
}, 0);</StrictMode>
