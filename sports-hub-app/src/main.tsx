import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { MyClubProvider } from './data/MyClub'
import { router } from './router'
// Fonts ship with the app: no request to Google, nothing leaves Bahrain just to draw text.
import '@fontsource/tajawal/400.css'
import '@fontsource/tajawal/500.css'
import '@fontsource/tajawal/700.css'
import '@fontsource/tajawal/800.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import './index.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* offline shell is optional */ }) })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <MyClubProvider>
        <RouterProvider router={router} />
      </MyClubProvider>
    </AuthProvider>
  </StrictMode>,
)
