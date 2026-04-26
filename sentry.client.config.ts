// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f9cb2741b6017a800c94e0279ea1a3e5@o4511284396687360.ingest.us.sentry.io/4511284398915584",

  tracesSampleRate: 1,

  enableLogs: true,

  sendDefaultPii: true,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [Sentry.replayIntegration()],
});
