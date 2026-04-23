import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponseShape<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    timestamp?: string;
  };
}

/**
 * ResponseInterceptor — wraps all successful responses in a consistent structure:
 * { success: true, data: ..., meta: ... }
 *
 * If the controller returns { data, meta }, it separates them.
 * Otherwise, the entire return value becomes `data`.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponseShape<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseShape<T>> {
    return next.handle().pipe(
      map((response) => {
        // If response is already shaped, pass through
        if (response && typeof response === 'object' && 'success' in response) {
          return response;
        }

        // If response has data + meta (paginated), extract them. Any other
        // top-level fields (e.g. `stats`) are preserved alongside so callers
        // don't lose information.
        if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
          const { data, meta, ...rest } = response as Record<string, unknown>;
          return {
            success: true,
            data,
            meta: {
              ...(meta as Record<string, unknown>),
              timestamp: new Date().toISOString(),
            },
            ...rest,
          } as ApiResponseShape<T>;
        }

        // Default: wrap in standard shape
        return {
          success: true,
          data: response,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
