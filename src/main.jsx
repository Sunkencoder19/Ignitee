import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App.jsx'
import { AuthProvider } from '@/context/AuthContext'
import { ProgressProvider } from '@/context/ProgressContext'
import '@/styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Opt into v7 behaviour now so the upgrade later changes nothing */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ProgressProvider>
          <App />
        </ProgressProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
