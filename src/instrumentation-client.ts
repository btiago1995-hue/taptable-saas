import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://a53c1efc5c8f08f126f406dee69646cc@o4511081992749056.ingest.de.sentry.io/4511082111041616",

  // 100% in development, slower in production
  tracesSampleRate: 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  debug: false, // Voltamos a false agora que está validado
});
