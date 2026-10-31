import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { performance } from 'node:perf_hooks';

import { Logger } from '@nestjs/common';

type HttpRequest = IncomingMessage & {
  route?: {
    path?: unknown;
  };
};

const logger = new Logger('HttpRequest');

export function httpRequestLogger(
  request: HttpRequest,
  response: ServerResponse,
  next: () => void,
): void {
  const startedAt = performance.now();
  const requestId = randomUUID();

  response.setHeader('X-Request-ID', requestId);

  let completed = false;

  function getMetadata() {
    return {
      requestId,
      method: request.method ?? 'UNKNOWN',
      route: typeof request.route?.path === 'string' ? request.route.path : 'unmatched',
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    };
  }

  response.once('finish', () => {
    if (completed) {
      return;
    }

    completed = true;

    const metadata = {
      ...getMetadata(),
      statusCode: response.statusCode,
    };

    if (response.statusCode >= 500) {
      logger.error('http_request_completed', metadata);
      return;
    }

    if (response.statusCode >= 400) {
      logger.warn('http_request_completed', metadata);
      return;
    }

    logger.log('http_request_completed', metadata);
  });

  response.once('close', () => {
    if (completed) {
      return;
    }

    completed = true;
    logger.warn('http_request_aborted', {
      ...getMetadata(),
      statusCode: null,
    });
  });

  next();
}
