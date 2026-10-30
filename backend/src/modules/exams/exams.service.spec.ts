import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike } from 'typeorm';

import { Exam } from './entities/exam.entity.js';
import { ExamsService } from './exams.service.js';

describe('ExamsService', () => {
  const repository = {
    find: vi.fn(),
  };

  let service: ExamsService;

  beforeEach(async () => {
    repository.find.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExamsService,
        {
          provide: getRepositoryToken(Exam),
          useValue: repository,
        },
      ],
    }).compile();

    service = moduleRef.get(ExamsService);
  });

  it('should list all exams ordered by name', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll();

    expect(repository.find).toHaveBeenCalledWith({
      order: { name: 'ASC' },
    });
  });

  it('should search exam names ignoring case', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll('TOMOGRAFIA');

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        name: ILike('%TOMOGRAFIA%'),
      },
      order: {
        name: 'ASC',
      },
    });
  });

  it('should treat blank searches as no filter', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll('   ');

    expect(repository.find).toHaveBeenCalledWith({
      order: { name: 'ASC' },
    });
  });

  it('should escape SQL LIKE wildcards', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll('100%');

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        name: ILike('%100\\%%'),
      },
      order: {
        name: 'ASC',
      },
    });
  });
});
