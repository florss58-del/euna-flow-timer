import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'

// DevTools / 우클릭 차단
document.addEventListener('contextmenu', (e) => e.preventDefault())
document.addEventListener('keydown', (e) => {
  if (e.key === 'F12') e.preventDefault()
  if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) e.preventDefault()
  if (e.ctrlKey && e.key.toUpperCase() === 'U') e.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
