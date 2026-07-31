import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';

// Google Analytics
const script = document.createElement('script');
script.async = true;
script.src = "https://www.googletagmanager.com/gtag/js?id=G-MP6SWJVQGV";
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-MP6SWJVQGV');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
