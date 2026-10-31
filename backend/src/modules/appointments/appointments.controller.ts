import { Body, Controller, Post } from '@nestjs/common';

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
  create(
    @Body({ schema: createAppointmentSchema })
    dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(dto);
  }
}
