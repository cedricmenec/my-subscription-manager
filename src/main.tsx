import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { db } from './data/db'
import './styles.css'

// Expose db for console debugging
;(window as any).db = db

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
