import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Coloque o seu DSN aqui ou utilize uma Variável de Ambiente: NEXT_PUBLIC_SENTRY_DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
