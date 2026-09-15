import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Self-hosted variable font — no network dependency, works fully offline.
import '@fontsource-variable/inter'
import './assets/main.css'
// Side-effect import: applies the saved theme class to <html> immediately,
// before the first paint, so there's no flash of the wrong theme.
import './lib/theme'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
