import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DoctorShift } from './entities/doctor-shift.entity.js';
import { Doctor } from './entities/doctor.entity.js';
import { DoctorsController } from './doctors.controller.js';
import { DoctorsService } from './doctors.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, DoctorShift])],
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}
