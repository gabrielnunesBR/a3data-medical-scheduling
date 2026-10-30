import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import {
  listExamsQuerySchema,
  type ListExamsQuery,
} from './dto/list-exams-query.dto.js';

import { ExamsService } from './exams.service.js';

@Controller('exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
  ) {}

  @Get()
  findAll(
    @Query({ schema: listExamsQuerySchema })
    query: ListExamsQuery,
  ) {
    return this.examsService.findAll(query.search);
  }
}
