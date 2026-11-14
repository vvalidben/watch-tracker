import '../api'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Self-hosted fonts — no network dependency, works fully offline.
import '@fontsource/dela-gothic-one/latin-400.css'
import '@fontsource/dela-gothic-one/latin-ext-400.css'
import '@fontsource/dela-gothic-one/japanese-400.css'
import '@fontsource/zen-kaku-gothic-new/latin-400.css'
import '@fontsource/zen-kaku-gothic-new/latin-500.css'
import '@fontsource/zen-kaku-gothic-new/latin-700.css'
import '@fontsource/zen-kaku-gothic-new/latin-ext-400.css'
import '@fontsource/zen-kaku-gothic-new/latin-ext-500.css'
import '@fontsource/zen-kaku-gothic-new/latin-ext-700.css'
import '@fontsource/zen-kaku-gothic-new/japanese-400.css'
import '@fontsource/zen-kaku-gothic-new/japanese-500.css'
import '@fontsource/zen-kaku-gothic-new/japanese-700.css'
import './assets/main.css'
import './assets/neon.css'
import './assets/auth.css'
import './assets/themes.css'
import './assets/appearances.css'
import './assets/showcase.css'
import './assets/atmosphere-enhancements.css'
import './assets/discovery.css'
// Side-effect imports: apply the saved theme and label preferences to <html>
// immediately, before the first paint, so neither flashes the wrong state.
import './lib/theme'
import './lib/visualStyle'
import './lib/japaneseLabels'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

import './assets/web.css'
if('serviceWorker'in navigator)window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js').catch(()=>{})})
