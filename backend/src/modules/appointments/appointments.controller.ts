import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';

import {
  createAppointmentSchema,
  type CreateAppointmentDto,
} from './dto/create-appointment.dto.js';
import { AppointmentsService } from './appointments.service.js';

const idempotencyKeySchema = z.uuid();

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  create(
    @Body({ schema: createAppointmentSchema })
    dto: CreateAppointmentDto,

    @Headers('idempotency-key')
    idempotencyKey?: string,
  ) {
    if (idempotencyKey !== undefined) {
      const result = idempotencyKeySchema.safeParse(
        idempotencyKey,
      );

      if (!result.success) {
        throw new BadRequestException(
          'Invalid Idempotency-Key header.',
        );
      }
    }

    return this.appointmentsService.create(
      dto,
      idempotencyKey,
    );
  }
}
