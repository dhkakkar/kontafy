/**
 * Sentry integration — gracefully no-ops if @sentry/node is not installed.
 */

let Sentry: any = null;
let nodeProfilingIntegration: any = null;

try {
  Sentry = require('@sentry/node');
  const profiling = require('@sentry/profiling-node');
  nodeProfilingIntegration = profiling.nodeProfilingIntegration;
} catch {
  // Sentry packages not installed — all exports will be no-ops
}

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn || !Sentry) {
    console.log('[Sentry] SENTRY_DSN not set or @sentry/node not installed — error tracking disabled');
    return;
  }

  const integrations: any[] = [];
  if (nodeProfilingIntegration) {
    integrations.push(nodeProfilingIntegration());
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '0.1.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations,
    beforeSendTransaction(event: any) {
      if (event.transaction?.includes('/health')) {
        return null;
      }
      return event;
    },
    beforeSend(event: any) {
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

export function captureException(
  error: Error,
  context?: {
    userId?: string;
    orgId?: string;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  },
) {
  if (!Sentry) return;

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

export function setSentryUser(userId: string, email?: string) {
  if (!Sentry) return;
  Sentry.setUser({
    id: userId,
    email: email || undefined,
  });
}

export { Sentry };
