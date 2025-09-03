import React from 'react'
import { createRoot } from 'react-dom/client'
import AppRoutes from './router/Route'
import './index.css'

function Root() {
  return <AppRoutes />
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
