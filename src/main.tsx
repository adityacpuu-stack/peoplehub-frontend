import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const isProd = import.meta.env.MODE === 'production';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Lower default sample rates in production to reduce data volume + cost.
    // Override via VITE_SENTRY_TRACES_SAMPLE_RATE / VITE_SENTRY_REPLAY_SAMPLE_RATE.
    tracesSampleRate: parseFloat(
      (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string) ?? (isProd ? '0.1' : '1.0')
    ),
    replaysSessionSampleRate: parseFloat(
      (import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE as string) ?? '0.1'
    ),
    replaysOnErrorSampleRate: parseFloat(
      (import.meta.env.VITE_SENTRY_ERROR_REPLAY_SAMPLE_RATE as string) ?? '1.0'
    ),
    // Do not capture default PII; explicit Sentry.setUser() in App.tsx handles user context.
    sendDefaultPii: false,
    ignoreErrors: [
      'MetaMask',
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'Non-Error promise rejection',
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
  })
} else if (isProd) {
  // eslint-disable-next-line no-console
  console.warn('[Sentry] VITE_SENTRY_DSN not set in production — error reporting disabled.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
