
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AvailabilityModule } from '../availability/availability.module.js';
import { Exam } from '../exams/entities/exam.entity.js';

import { AppointmentsController } from './appointments.controller.js';
import { Appointment } from './entities/appointment.entity.js';
import { AppointmentsService } from './appointments.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, Appointment]),
    AvailabilityModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
