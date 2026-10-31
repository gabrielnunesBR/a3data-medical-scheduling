import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Appointment } from '../appointments/entities/appointment.entity.js';
import { DoctorShift } from '../doctors/entities/doctor-shift.entity.js';
import { Doctor } from '../doctors/entities/doctor.entity.js';
import { Exam } from '../exams/entities/exam.entity.js';

import { AvailabilityService } from './availability.service.js';

describe('AvailabilityService', () => {
  const doctorsRepository = {
    findOneBy: vi.fn(),
  };

  const examsRepository = {
    findOneBy: vi.fn(),
  };

  const shiftsRepository = {
    find: vi.fn(),
  };

  const appointmentsRepository = {
    find: vi.fn(),
  };

  let service: AvailabilityService;

  beforeEach(async () => {
    vi.resetAllMocks();

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getRepositoryToken(Doctor),
          useValue: doctorsRepository,
        },
        {
          provide: getRepositoryToken(Exam),
          useValue: examsRepository,
        },
        {
          provide: getRepositoryToken(DoctorShift),
          useValue: shiftsRepository,
        },
        {
          provide: getRepositoryToken(Appointment),
          useValue: appointmentsRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(AvailabilityService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reject invalid dates', async () => {
    await expect(
      service.findAvailableSlots(1, 1, '2030-02-30'),
    ).rejects.toThrow(BadRequestException);

    expect(doctorsRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('should reject a nonexistent doctor', async () => {
    doctorsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.findAvailableSlots(999, 1, '2030-01-07'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject a nonexistent exam', async () => {
    doctorsRepository.findOneBy.mockResolvedValue({
      id: 1,
    });

    examsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.findAvailableSlots(1, 999, '2030-01-07'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return no slots when the doctor has no shifts', async () => {
    doctorsRepository.findOneBy.mockResolvedValue({
      id: 1,
    });

    examsRepository.findOneBy.mockResolvedValue({
      id: 1,
      durationMinutes: 40,
    });

    shiftsRepository.find.mockResolvedValue([]);

    const result = await service.findAvailableSlots(
      1,
      1,
      '2030-01-07',
    );

    expect(result).toEqual([]);

    expect(appointmentsRepository.find).not.toHaveBeenCalled();
  });

  it('should filter existing appointments using real exam duration', async () => {
    doctorsRepository.findOneBy.mockResolvedValue({
      id: 1,
    });

    examsRepository.findOneBy.mockResolvedValue({
      id: 17,
      durationMinutes: 40,
    });

    shiftsRepository.find.mockResolvedValue([
      {
        weekday: 1,
        startTime: '08:00:00',
        endTime: '12:00:00',
      },
    ]);

    appointmentsRepository.find.mockResolvedValue([
      {
        startAt: new Date('2030-01-07T12:20:00Z'),
        endAt: new Date('2030-01-07T13:00:00Z'),
      },
    ]);

    const result = await service.findAvailableSlots(
      1,
      17,
      '2030-01-07',
    );

    expect(result).toEqual([
      '08:00',
      '08:40',
      '10:00',
      '10:40',
      '11:20',
    ]);

    expect(shiftsRepository.find).toHaveBeenCalledWith({
      where: {
        doctorId: 1,
        weekday: 1,
      },
      order: {
        startTime: 'ASC',
      },
    });

    expect(appointmentsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          doctorId: 1,
        }),
      }),
    );
  });
});
