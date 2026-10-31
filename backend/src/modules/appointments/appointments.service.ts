import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import {
  LessThan,
  MoreThan,
  QueryFailedError,
  Repository,
} from 'typeorm';

import { AvailabilityService } from '../availability/availability.service.js';
import { CLINIC_TIME_ZONE } from '../availability/availability.constants.js';
import { Exam } from '../exams/entities/exam.entity.js';

import type { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { Appointment } from './entities/appointment.entity.js';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examsRepository: Repository<Exam>,

    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,

    private readonly availabilityService: AvailabilityService,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    const start = DateTime.fromISO(dto.startAt, {
      setZone: true,
    });

    if (!start.isValid) {
      throw new BadRequestException('Invalid appointment date.');
    }

    const localStart = start.setZone(CLINIC_TIME_ZONE);

    if (localStart.second !== 0 || localStart.millisecond !== 0) {
      throw new UnprocessableEntityException(
        'Appointment time must have minute precision.',
      );
    }

    if (start.toMillis() < Date.now()) {
      throw new UnprocessableEntityException(
        'Cannot schedule an appointment in the past.',
      );
    }

    const exam = await this.examsRepository.findOneBy({
      id: dto.examId,
    });

    if (!exam) {
      throw new NotFoundException('Exam not found.');
    }

    const date = localStart.toISODate();

    if (!date) {
      throw new BadRequestException('Invalid appointment date.');
    }

    const startTime = localStart.toFormat('HH:mm');

    const end = start.plus({
      minutes: exam.durationMinutes,
    });

    const startAt = start.toJSDate();
    const endAt = end.toJSDate();

    const availableSlots =
      await this.availabilityService.findAvailableSlots(
        dto.doctorId,
        dto.examId,
        date,
      );

    if (!availableSlots.includes(startTime)) {
      const hasConflict = await this.appointmentsRepository.existsBy({
        doctorId: dto.doctorId,
        startAt: LessThan(endAt),
        endAt: MoreThan(startAt),
      });

      if (hasConflict) {
        throw new ConflictException(
          'The selected time slot is no longer available.',
        );
      }

      throw new UnprocessableEntityException(
        'The selected time is outside the available schedule.',
      );
    }

    try {
      return await this.appointmentsRepository.save({
        patientName: dto.patientName,
        examId: dto.examId,
        doctorId: dto.doctorId,
        startAt,
        endAt,
      });
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23P01'
      ) {
        throw new ConflictException(
          'The selected time slot is no longer available.',
        );
      }

      throw error;
    }
  }
}
