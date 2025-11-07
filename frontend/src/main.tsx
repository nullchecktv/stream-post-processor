import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import awsconfig from './aws-exports'
import './index.css'
import App from './App.tsx'

Amplify.configure(awsconfig)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
