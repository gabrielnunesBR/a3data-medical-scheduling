import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { LessThan, MoreThan, QueryFailedError, type EntityManager, Repository } from 'typeorm';

import { CLINIC_TIME_ZONE } from '../availability/availability.constants.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { Exam } from '../exams/entities/exam.entity.js';

import type { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { Appointment } from './entities/appointment.entity.js';

export type AppointmentResult = Pick<
  Appointment,
  'id' | 'patientName' | 'examId' | 'doctorId' | 'startAt' | 'endAt' | 'createdAt'
>;

function toAppointmentResult(appointment: Appointment): AppointmentResult {
  return {
    id: appointment.id,
    patientName: appointment.patientName,
    examId: appointment.examId,
    doctorId: appointment.doctorId,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    createdAt: appointment.createdAt,
  };
}

function matchesRequest(appointment: Appointment, dto: CreateAppointmentDto): boolean {
  return (
    appointment.patientName === dto.patientName.trim() &&
    appointment.examId === dto.examId &&
    appointment.doctorId === dto.doctorId &&
    appointment.startAt.getTime() === new Date(dto.startAt).getTime()
  );
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examsRepository: Repository<Exam>,

    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,

    private readonly availabilityService: AvailabilityService,
  ) {}

  async create(dto: CreateAppointmentDto, idempotencyKey?: string): Promise<AppointmentResult> {
    try {
      if (!idempotencyKey) {
        return await this.createNew(dto, null);
      }

      return await this.appointmentsRepository.manager.transaction(async (manager) => {
        await manager.query(
          `SELECT pg_advisory_xact_lock(
              hashtextextended($1::text, 0)
            )`,
          [idempotencyKey],
        );

        const repository = manager.getRepository(Appointment);

        const existing = await repository.findOneBy({
          idempotencyKey,
        });

        if (existing) {
          if (!matchesRequest(existing, dto)) {
            throw new ConflictException({
              code: 'IDEMPOTENCY_KEY_REUSED',
              message: 'Idempotency key was already used with different data.',
            });
          }

          return toAppointmentResult(existing);
        }

        return this.createNew(dto, idempotencyKey, manager);
      });
    } catch (error: unknown) {
      // A deadlock aborts the PostgreSQL transaction: retry only in a NEW request.
      // The client retains its Idempotency-Key for an identical retry.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '40P01'
      ) {
        throw new ServiceUnavailableException({
          code: 'BOOKING_TEMPORARILY_UNAVAILABLE',
          message: 'Temporary database contention. Retry the same operation.',
        });
      }

      throw error;
    }
  }

  private async createNew(
    dto: CreateAppointmentDto,
    idempotencyKey: string | null,
    manager?: EntityManager,
  ): Promise<AppointmentResult> {
    const start = DateTime.fromISO(dto.startAt, {
      setZone: true,
    });

    if (!start.isValid) {
      throw new BadRequestException('Invalid appointment date.');
    }

    const localStart = start.setZone(CLINIC_TIME_ZONE);

    if (localStart.second !== 0 || localStart.millisecond !== 0) {
      throw new UnprocessableEntityException('Appointment time must have minute precision.');
    }

    if (start.toMillis() < Date.now()) {
      throw new UnprocessableEntityException('Cannot schedule an appointment in the past.');
    }

    const examsRepository = manager?.getRepository(Exam) ?? this.examsRepository;

    const appointmentsRepository =
      manager?.getRepository(Appointment) ?? this.appointmentsRepository;

    const exam = await examsRepository.findOneBy({
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

    const availableSlots = manager
      ? await this.availabilityService.findAvailableSlots(dto.doctorId, dto.examId, date, manager)
      : await this.availabilityService.findAvailableSlots(dto.doctorId, dto.examId, date);

    if (!availableSlots.includes(startTime)) {
      const hasConflict = await appointmentsRepository.existsBy({
        doctorId: dto.doctorId,
        startAt: LessThan(endAt),
        endAt: MoreThan(startAt),
      });

      if (hasConflict) {
        throw new ConflictException('The selected time slot is no longer available.');
      }

      throw new UnprocessableEntityException(
        'The selected time is outside the available schedule.',
      );
    }

    // The selected slot may expire while the availability query is running.
    if (start.toMillis() < Date.now()) {
      throw new UnprocessableEntityException('Cannot schedule an appointment in the past.');
    }

    try {
      const appointment = await appointmentsRepository.save({
        patientName: dto.patientName.trim(),
        examId: dto.examId,
        doctorId: dto.doctorId,
        startAt,
        endAt,
        idempotencyKey,
      });

      return toAppointmentResult(appointment);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as {
          code?: string;
          constraint?: string;
        };

        if (driverError.code === '23P01') {
          throw new ConflictException('The selected time slot is no longer available.');
        }

        if (
          driverError.code === '23505' &&
          driverError.constraint === 'uq_appointments_idempotency_key'
        ) {
          throw new ConflictException('Idempotency key is already in use.');
        }
      }

      throw error;
    }
  }
}
