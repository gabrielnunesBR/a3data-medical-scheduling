
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, minutes } from '@nestjs/throttler';

import { envSchema } from './config/env.schema.js';
import { ExamsModule } from './modules/exams/exams.module.js';
import { DoctorsModule } from './modules/doctors/doctors.module.js';
import { AvailabilityModule } from './modules/availability/availability.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? '../.env.test'
          : ['../.env', '.env'],
      validationSchema: envSchema,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',

        host: config.getOrThrow<string>('POSTGRES_HOST'),
        port: config.getOrThrow<number>('POSTGRES_PORT'),
        username: config.getOrThrow<string>('POSTGRES_USER'),
        password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
        database: config.getOrThrow<string>('POSTGRES_DB'),

        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,

        retryAttempts: 3,
        retryDelay: 1000,
      }),
    }),

    ThrottlerModule.forRoot([
      {
        ttl: minutes(1),
        limit: 20,
      },
    ]),

    ExamsModule,
    DoctorsModule,
    AvailabilityModule,
    AppointmentsModule,
  ],
})
export class AppModule {}
