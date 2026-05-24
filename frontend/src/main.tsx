import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TranslationProvider } from './context/TranslationContext.tsx'
import { AudioProvider } from './context/AudioContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TranslationProvider>
      <AudioProvider>
        <App />
      </AudioProvider>
    </TranslationProvider>
  </StrictMode>,
)
