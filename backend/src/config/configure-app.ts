import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { httpRequestLogger } from './http-request-logger.js';
import { SafeHttpExceptionFilter } from './safe-http-exception.filter.js';

export function configureApp(app: INestApplication): void {
  app.useSecurityHeaders();

  app.use(httpRequestLogger);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new StandardSchemaValidationPipe());

  const { httpAdapter } = app.get(HttpAdapterHost);

  app.useGlobalFilters(new SafeHttpExceptionFilter(httpAdapter));
}
