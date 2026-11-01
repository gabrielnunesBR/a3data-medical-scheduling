import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';

import { DoctorShift } from './entities/doctor-shift.entity.js';
import { Doctor } from './entities/doctor.entity.js';
import { DoctorsService } from './doctors.service.js';

describe('DoctorsService', () => {
  const doctorsRepository = { find: vi.fn() };
  const shiftsRepository = { find: vi.fn() };

  let service: DoctorsService;

  beforeEach(async () => {
    doctorsRepository.find.mockReset();
    shiftsRepository.find.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DoctorsService,
        { provide: getRepositoryToken(Doctor), useValue: doctorsRepository },
        { provide: getRepositoryToken(DoctorShift), useValue: shiftsRepository },
      ],
    }).compile();

    service = moduleRef.get(DoctorsService);
  });

  it('should list doctors with unique, sorted working weekdays using one shifts query', async () => {
    const doctors = [
      { id: 1, name: 'Dra. Helena Marques', crm: 'CRM-MG 11111' },
      { id: 2, name: 'Dr. Rafael Teixeira', crm: 'CRM-MG 22222' },
    ];

    doctorsRepository.find.mockResolvedValue(doctors);
    shiftsRepository.find.mockResolvedValue([
      { doctorId: 1, weekday: 5 },
      { doctorId: 2, weekday: 2 },
      { doctorId: 1, weekday: 1 },
      { doctorId: 1, weekday: 5 }, // Two shifts on the same day.
      { doctorId: 2, weekday: 1 },
    ]);

    expect(await service.findAll()).toEqual([
      { ...doctors[0], workingWeekdays: [1, 5] },
      { ...doctors[1], workingWeekdays: [1, 2] },
    ]);

    expect(doctorsRepository.find).toHaveBeenCalledWith({
      select: { id: true, name: true, crm: true },
      order: { name: 'ASC' },
    });
    expect(shiftsRepository.find).toHaveBeenCalledOnce();
    expect(shiftsRepository.find).toHaveBeenCalledWith({
      select: { doctorId: true, weekday: true },
      where: { doctorId: In([1, 2]) },
    });
  });

  it('should return an empty array without querying shifts when no doctors exist', async () => {
    doctorsRepository.find.mockResolvedValue([]);

    expect(await service.findAll()).toEqual([]);
    expect(shiftsRepository.find).not.toHaveBeenCalled();
  });

  it('should return no working weekdays for a doctor without shifts', async () => {
    doctorsRepository.find.mockResolvedValue([
      { id: 9, name: 'Dr. Sem Turnos', crm: 'CRM-MG 99999' },
    ]);
    shiftsRepository.find.mockResolvedValue([]);

    expect(await service.findAll()).toEqual([
      { id: 9, name: 'Dr. Sem Turnos', crm: 'CRM-MG 99999', workingWeekdays: [] },
    ]);
  });
});
