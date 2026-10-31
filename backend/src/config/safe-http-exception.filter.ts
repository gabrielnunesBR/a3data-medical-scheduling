import { Catch, HttpException, HttpStatus, Logger, type ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { ServerResponse } from 'node:http';
import { QueryFailedError } from 'typeorm';

@Catch()
export class SafeHttpExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(SafeHttpExceptionFilter.name);

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof HttpException) {
      super.catch(exception, host);
      return;
    }

    const response = host.switchToHttp().getResponse<ServerResponse>();
    const requestId = response.getHeader('X-Request-ID');

    this.logger.error('unhandled_http_exception', {
      requestId: typeof requestId === 'string' ? requestId : 'unavailable',
      errorCategory: exception instanceof QueryFailedError ? 'database_error' : 'unexpected_error',
    });

    super.catch(
      new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
      host,
    );
  }
}
