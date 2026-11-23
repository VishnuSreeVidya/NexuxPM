import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/index.css'

// HashRouter keeps client-side routes on GitHub Pages, which has no server-side
// SPA fallback (e.g. /NexuxPM/#/dashboard instead of /NexuxPM/dashboard).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
