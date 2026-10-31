import { randomUUID } from 'node:crypto';

import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AvailabilityService } from '../availability/availability.service.js';
import { Exam } from '../exams/entities/exam.entity.js';

import { AppointmentsService } from './appointments.service.js';
import { Appointment } from './entities/appointment.entity.js';

describe('AppointmentsService', () => {
  const examsRepository = {
    findOneBy: vi.fn(),
  };

  const appointmentsRepository = {
    findOneBy: vi.fn(),
    existsBy: vi.fn(),
    save: vi.fn(),
    manager: {
      transaction: vi.fn(),
    },
  };

  const availabilityService = {
    findAvailableSlots: vi.fn(),
  };

  const transactionManager = {
    query: vi.fn(),
    getRepository: vi.fn(),
  };

  const dto = {
    patientName: 'João Silva',
    examId: 17,
    doctorId: 1,
    startAt: '2030-01-07T09:20:00-03:00',
  };

  let service: AppointmentsService;

  function existingAppointment(idempotencyKey: string) {
    return {
      id: 42,
      patientName: dto.patientName,
      examId: dto.examId,
      doctorId: dto.doctorId,
      startAt: new Date(dto.startAt),
      endAt: new Date('2030-01-07T13:00:00Z'),
      createdAt: new Date('2026-10-30T12:00:00Z'),
      idempotencyKey,
    };
  }

  beforeEach(async () => {
    vi.resetAllMocks();

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));

    examsRepository.findOneBy.mockResolvedValue({
      id: 17,
      durationMinutes: 40,
    });

    appointmentsRepository.findOneBy.mockResolvedValue(null);
    appointmentsRepository.existsBy.mockResolvedValue(false);

    appointmentsRepository.save.mockImplementation(async (appointment) => ({
      id: 1,
      ...appointment,
      createdAt: new Date(),
    }));

    availabilityService.findAvailableSlots.mockResolvedValue(['08:00', '08:40', '09:20', '10:00']);

    transactionManager.query.mockResolvedValue(undefined);

    transactionManager.getRepository.mockImplementation((entity) => {
      if (entity === Exam) {
        return examsRepository;
      }

      if (entity === Appointment) {
        return appointmentsRepository;
      }

      throw new Error('Unexpected repository requested.');
    });

    appointmentsRepository.manager.transaction.mockImplementation(
      async (callback: (manager: typeof transactionManager) => Promise<unknown>) =>
        callback(transactionManager),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Exam),
          useValue: examsRepository,
        },
        {
          provide: getRepositoryToken(Appointment),
          useValue: appointmentsRepository,
        },
        {
          provide: AvailabilityService,
          useValue: availabilityService,
        },
      ],
    }).compile();

    service = moduleRef.get(AppointmentsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create a valid appointment', async () => {
    const result = await service.create(dto);

    expect(result.id).toBe(1);

    expect(appointmentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'João Silva',
        examId: 17,
        doctorId: 1,
        startAt: new Date('2030-01-07T12:20:00Z'),
        endAt: new Date('2030-01-07T13:00:00Z'),
      }),
    );

    expect(availabilityService.findAvailableSlots).toHaveBeenCalledWith(1, 17, '2030-01-07');

    expect(appointmentsRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('should reject appointments in the past', async () => {
    await expect(
      service.create({
        ...dto,
        startAt: '2020-01-07T09:20:00-03:00',
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(appointmentsRepository.save).not.toHaveBeenCalled();
  });

  it('should reject times with seconds', async () => {
    await expect(
      service.create({
        ...dto,
        startAt: '2030-01-07T09:20:30-03:00',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('should reject a nonexistent exam', async () => {
    examsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toThrow(NotFoundException);
  });

  it('should reject times outside the available schedule', async () => {
    availabilityService.findAvailableSlots.mockResolvedValue([]);

    await expect(service.create(dto)).rejects.toThrow(UnprocessableEntityException);

    expect(appointmentsRepository.save).not.toHaveBeenCalled();
  });

  it('should reject an already occupied time', async () => {
    availabilityService.findAvailableSlots.mockResolvedValue([]);
    appointmentsRepository.existsBy.mockResolvedValue(true);

    await expect(service.create(dto)).rejects.toThrow(ConflictException);

    expect(appointmentsRepository.save).not.toHaveBeenCalled();
  });

  it('should translate database overlap violations to HTTP 409', async () => {
    const databaseError = new QueryFailedError(
      'INSERT INTO appointments...',
      [],
      Object.assign(new Error('Exclusion violation'), {
        code: '23P01',
      }),
    );

    appointmentsRepository.save.mockRejectedValue(databaseError);

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  it('should not hide unexpected database errors', async () => {
    const error = new Error('Database connection lost');

    appointmentsRepository.save.mockRejectedValue(error);

    await expect(service.create(dto)).rejects.toBe(error);
  });

  it('should create an appointment transactionally with an idempotency key', async () => {
    const key = randomUUID();

    const result = await service.create(dto, key);

    expect(appointmentsRepository.manager.transaction).toHaveBeenCalledOnce();

    expect(transactionManager.query).toHaveBeenCalledWith(
      expect.stringContaining('pg_advisory_xact_lock'),
      [key],
    );

    expect(appointmentsRepository.findOneBy).toHaveBeenCalledWith({
      idempotencyKey: key,
    });

    expect(appointmentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: dto.patientName,
        examId: dto.examId,
        doctorId: dto.doctorId,
        idempotencyKey: key,
      }),
    );

    expect(result.id).toBe(1);
    expect(result).not.toHaveProperty('idempotencyKey');
  });

  it('should replay an existing appointment with the same key and normalized name', async () => {
    const key = randomUUID();
    const existing = existingAppointment(key);

    appointmentsRepository.findOneBy.mockResolvedValue(existing);

    const result = await service.create(
      {
        ...dto,
        patientName: '  João Silva  ',
      },
      key,
    );

    expect(result).toEqual({
      id: existing.id,
      patientName: existing.patientName,
      examId: existing.examId,
      doctorId: existing.doctorId,
      startAt: existing.startAt,
      endAt: existing.endAt,
      createdAt: existing.createdAt,
    });

    expect(appointmentsRepository.save).not.toHaveBeenCalled();

    expect(availabilityService.findAvailableSlots).not.toHaveBeenCalled();

    expect(result).not.toHaveProperty('idempotencyKey');
  });

  it.each([
    {
      field: 'patient name',
      changes: {
        patientName: 'Outro Paciente',
      },
    },
    {
      field: 'exam',
      changes: {
        examId: 1,
      },
    },
    {
      field: 'doctor',
      changes: {
        doctorId: 2,
      },
    },
    {
      field: 'start time',
      changes: {
        startAt: '2030-01-07T10:00:00-03:00',
      },
    },
  ])('should reject reusing an idempotency key with a different $field', async ({ changes }) => {
    const key = randomUUID();

    appointmentsRepository.findOneBy.mockResolvedValue(existingAppointment(key));

    await expect(
      service.create(
        {
          ...dto,
          ...changes,
        },
        key,
      ),
    ).rejects.toThrow(ConflictException);

    expect(appointmentsRepository.save).not.toHaveBeenCalled();

    expect(availabilityService.findAvailableSlots).not.toHaveBeenCalled();
  });

  it('should translate an idempotency unique violation to HTTP 409', async () => {
    const key = randomUUID();

    const databaseError = new QueryFailedError(
      'INSERT INTO appointments...',
      [],
      Object.assign(new Error('Unique constraint violation'), {
        code: '23505',
        constraint: 'uq_appointments_idempotency_key',
      }),
    );

    appointmentsRepository.save.mockRejectedValue(databaseError);

    await expect(service.create(dto, key)).rejects.toThrow(ConflictException);

    expect(appointmentsRepository.manager.transaction).toHaveBeenCalledOnce();

    expect(appointmentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: key,
      }),
    );
  });
});
