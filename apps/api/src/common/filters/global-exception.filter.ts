import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { captureException } from '../sentry';

interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    path: string;
    timestamp: string;
  };
}

/**
 * GlobalExceptionFilter — catches all unhandled exceptions and returns
 * a structured error response matching the API response shape.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let code: string;
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.statusToCode(status);
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        code = resp.error || this.statusToCode(status);
        details = resp.details || undefined;

        // class-validator returns array of messages
        if (Array.isArray(message)) {
          details = message;
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      } else {
        message = exception.message;
        code = this.statusToCode(status);
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message =
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : exception.message;
      code = 'INTERNAL_ERROR';

      // Log full stack in development
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );

      // Report to Sentry
      const user = request['user'];
      captureException(exception, {
        userId: user?.sub,
        orgId: request.headers?.['x-org-id'] as string,
        extra: {
          path: request.url,
          method: request.method,
        },
      });
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      code = 'INTERNAL_ERROR';
      this.logger.error('Unknown exception type', exception);

      // Report unknown errors to Sentry
      captureException(new Error('Unknown exception type'), {
        extra: { exception, path: request.url },
      });
    }

    const errorResponse: ErrorResponseBody = {
      success: false,
      error: {
        code,
        message,
        details,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(errorResponse);
  }

  private statusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
