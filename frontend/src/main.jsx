import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './api/config'   // dirección del backend (VITE_API_BASE_URL); debe cargarse antes que la app
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
