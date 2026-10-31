import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';

import { AvailabilityService } from '../availability/availability.service.js';
import { Exam } from '../exams/entities/exam.entity.js';

import { AppointmentsService } from './appointments.service.js';
import { Appointment } from './entities/appointment.entity.js';

describe('AppointmentsService', () => {
  const examsRepository = {
    findOneBy: vi.fn(),
  };

  const appointmentsRepository = {
    existsBy: vi.fn(),
    save: vi.fn(),
  };

  const availabilityService = {
    findAvailableSlots: vi.fn(),
  };

  const dto = {
    patientName: 'João Silva',
    examId: 17,
    doctorId: 1,
    startAt: '2030-01-07T09:20:00-03:00',
  };

  let service: AppointmentsService;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));

    examsRepository.findOneBy.mockResolvedValue({
      id: 17,
      durationMinutes: 40,
    });

    availabilityService.findAvailableSlots.mockResolvedValue(['08:00', '08:40', '09:20', '10:00']);

    appointmentsRepository.existsBy.mockResolvedValue(false);

    appointmentsRepository.save.mockImplementation(async (appointment) => ({
      id: 1,
      ...appointment,
      createdAt: new Date(),
    }));

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
});
