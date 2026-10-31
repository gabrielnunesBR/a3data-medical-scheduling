import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { configureApp } from './config/configure-app.js';
import { configureSwagger } from './config/configure-swagger.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      logLevels: ['log', 'warn', 'error', 'fatal'],
    }),
  });

  configureApp(app);
  configureSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
