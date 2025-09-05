import React from 'react'
import { createRoot } from 'react-dom/client'
import AppRoutesWithAuth from './router/Route'
import './index.css'

function Root() {
  return <AppRoutesWithAuth />
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
