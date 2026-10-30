import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Doctor } from './entities/doctor.entity.js';
import { DoctorsService } from './doctors.service.js';

describe('DoctorsService', () => {
  const repository = {
    find: vi.fn(),
  };

  let service: DoctorsService;

  beforeEach(async () => {
    repository.find.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: getRepositoryToken(Doctor),
          useValue: repository,
        },
      ],
    }).compile();

    service = moduleRef.get(DoctorsService);
  });

  it('should list doctors ordered by name', async () => {
    const doctors = [
      {
        id: 1,
        name: 'Dra. Helena Marques',
        crm: 'CRM-MG 11111',
      },
    ];

    repository.find.mockResolvedValue(doctors);

    const result = await service.findAll();

    expect(result).toEqual(doctors);

    expect(repository.find).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        crm: true,
      },
      order: {
        name: 'ASC',
      },
    });
  });

  it('should return an empty array when no doctors exist', async () => {
    repository.find.mockResolvedValue([]);

    const result = await service.findAll();

    expect(result).toEqual([]);
  });
});
