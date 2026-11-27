import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Always show the BuildSoftware title and icon in the browser tab, even if the
// browser cached another app's tab details for this localhost port.
document.title = 'BuildSoftware CRM';
document.querySelectorAll("link[rel~='icon'], link[rel='shortcut icon']").forEach((el) => el.remove());
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = '/crm-logo.png';
document.head.appendChild(favicon);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
