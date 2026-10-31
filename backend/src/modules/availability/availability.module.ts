import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Appointment } from '../appointments/entities/appointment.entity.js';
import { DoctorShift } from '../doctors/entities/doctor-shift.entity.js';
import { Doctor } from '../doctors/entities/doctor.entity.js';
import { Exam } from '../exams/entities/exam.entity.js';

import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      Exam,
      DoctorShift,
      Appointment,
    ]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
