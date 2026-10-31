import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { configureApp } from './config/configure-app.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      logLevels: ['log', 'warn', 'error', 'fatal'],
    }),
  });

  configureApp(app);

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
