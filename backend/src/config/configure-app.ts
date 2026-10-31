import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';

import { httpRequestLogger } from './http-request-logger.js';

export function configureApp(app: INestApplication): void {
  app.useSecurityHeaders();

  app.use(httpRequestLogger);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new StandardSchemaValidationPipe());
}
