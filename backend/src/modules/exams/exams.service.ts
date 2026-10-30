import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, type Repository } from 'typeorm';

import { Exam } from './entities/exam.entity.js';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examsRepository: Repository<Exam>,
  ) {}

  async findAll(search?: string): Promise<Exam[]> {
    const term = search?.trim();

    if (!term) {
      return this.examsRepository.find({
        order: { name: 'ASC' },
      });
    }

    const escapedTerm = term.replace(/[\\%_]/g, '\\$&');

    return this.examsRepository.find({
      where: {
        name: ILike(`%${escapedTerm}%`),
      },
      order: {
        name: 'ASC',
      },
    });
  }
}
