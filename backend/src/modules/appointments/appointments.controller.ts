import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import {
  createAppointmentSchema,
  type CreateAppointmentDto,
} from './dto/create-appointment.dto.js';
import { AppointmentsService } from './appointments.service.js';

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
  ) {
    return this.appointmentsService.create(dto);
  }
}
