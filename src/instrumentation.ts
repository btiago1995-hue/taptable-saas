import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://a53c1efc5c8f08f126f406dee69646cc@o4511081992749056.ingest.de.sentry.io/4511082111041616";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
      includeLocalVariables: true,
      enableLogs: true,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
      enableLogs: true,
    });
  }
}

// Automatically captures all unhandled server-side request errors
export const onRequestError = Sentry.captureRequestError;
