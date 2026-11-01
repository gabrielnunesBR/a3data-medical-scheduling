import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Exam } from './entities/exam.entity.js';
import { ExamsService } from './exams.service.js';

const catalog = [
  { id: 24, name: 'Densitometria Óssea', durationMinutes: 30 },
  { id: 1, name: 'Raio-X de Tórax', durationMinutes: 20 },
  { id: 20, name: 'Ressonância Magnética de Crânio', durationMinutes: 40 },
  { id: 17, name: 'Tomografia Computadorizada de Crânio', durationMinutes: 40 },
];

describe('ExamsService', () => {
  const repository = {
    find: vi.fn(),
  };

  let service: ExamsService;

  beforeEach(async () => {
    repository.find.mockReset();
    repository.find.mockResolvedValue(catalog);

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

  it('should list all exams in the repository order when search is absent', async () => {
    expect(await service.findAll()).toEqual(catalog);
    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
  });

  it('should treat blank searches as no filter', async () => {
    expect(await service.findAll('   ')).toEqual(catalog);
    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
  });

  it.each(['RESSONANCIA', 'ressonância', 'ReSsOnÂnCiA', '  ressonancia  '])(
    'should find exams regardless of case, accents and surrounding spaces: %s',
    async (search) => {
      const result = await service.findAll(search);

      expect(result.map(({ id }) => id)).toEqual([20]);
      expect(repository.find).toHaveBeenCalledTimes(1);
      expect(repository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    },
  );

  it.each([
    { search: 'cranio', expectedIds: [20, 17] },
    { search: 'TORAX', expectedIds: [1] },
    { search: 'ossea', expectedIds: [24] },
  ])(
    'should normalize Portuguese characters in search $search',
    async ({ search, expectedIds }) => {
      const result = await service.findAll(search);

      expect(result.map(({ id }) => id)).toEqual(expectedIds);
    },
  );

  it('should accept decomposed Unicode accents', async () => {
    const result = await service.findAll('Crânio'.normalize('NFD'));

    expect(result.map(({ id }) => id)).toEqual([20, 17]);
  });

  it.each(['%', '_', '\\'])(
    'should treat SQL wildcard characters literally: %s',
    async (search) => {
      expect(await service.findAll(search)).toEqual([]);
    },
  );

  it('should return no exams when the name does not contain the search term', async () => {
    expect(await service.findAll('exame-inexistente')).toEqual([]);
  });
});
