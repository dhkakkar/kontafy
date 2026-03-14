import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry for error tracking and performance monitoring.
 * Call this before NestFactory.create() in main.ts.
 *
 * Requires SENTRY_DSN environment variable to be set.
 * If not set, Sentry will not initialize and the app runs without tracking.
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('[Sentry] SENTRY_DSN not set — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '0.1.0',

    // Performance tracing
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      nodeProfilingIntegration(),
    ],

    // Filter out health check transactions
    beforeSendTransaction(event) {
      if (event.transaction?.includes('/health')) {
        return null;
      }
      return event;
    },

    // Scrub sensitive data
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
      return event;
    },
  });

  console.log(`[Sentry] Initialized (env: ${process.env.NODE_ENV || 'development'})`);
}

/**
 * Capture an exception in Sentry with optional context.
 */
export function captureException(
  error: Error,
  context?: {
    userId?: string;
    orgId?: string;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  },
) {
  if (context?.userId) {
    Sentry.setUser({ id: context.userId });
  }

  if (context?.orgId) {
    Sentry.setTag('org_id', context.orgId);
  }

  if (context?.tags) {
    for (const [key, value] of Object.entries(context.tags)) {
      Sentry.setTag(key, value);
    }
  }

  Sentry.captureException(error, {
    extra: context?.extra,
  });
}

/**
 * Set user context on the current Sentry scope.
 * Called by auth middleware after authentication.
 */
export function setSentryUser(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email: email || undefined,
  });
}

export { Sentry };
