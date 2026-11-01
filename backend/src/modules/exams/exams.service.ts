import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { Exam } from './entities/exam.entity.js';

// The reference catalog has only 30 records. Filtering in memory keeps the search
// independent of database extensions and treats characters like % and _ literally.
function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examsRepository: Repository<Exam>,
  ) {}

  async findAll(search?: string): Promise<Exam[]> {
    const exams = await this.examsRepository.find({
      order: { name: 'ASC' },
    });

    const term = search?.trim();

    if (!term) {
      return exams;
    }

    const normalizedTerm = normalizeSearchText(term);

    return exams.filter((exam) => normalizeSearchText(exam.name).includes(normalizedTerm));
  }
}
