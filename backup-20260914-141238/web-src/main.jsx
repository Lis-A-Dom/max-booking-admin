import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Миграция: принудительный сброс кэша при обновлении версии
const APP_VERSION = 'v2.1.0'
const saved = localStorage.getItem('lis_app_version')
if (saved !== APP_VERSION) {
  localStorage.setItem('lis_app_version', APP_VERSION)
  // Сброс service worker если был
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
  }
  // Жёсткий reload без кэша
  if (window.location.reload) {
    window.location.reload(true)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
