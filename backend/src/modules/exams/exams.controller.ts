import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { listExamsQuerySchema, type ListExamsQuery } from './dto/list-exams-query.dto.js';
import { ExamsService } from './exams.service.js';

@ApiTags('Exames')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar e pesquisar exames',
    description:
      'O parâmetro search é opcional. A busca parcial ignora maiúsculas, minúsculas e acentos. A resposta é ordenada pelo nome do exame.',
  })
  @ApiOkResponse({
    description: 'Catálogo de exames, eventualmente filtrado pelo nome.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'durationMinutes'],
        properties: {
          id: { type: 'integer', example: 17 },
          name: { type: 'string', example: 'Ressonância Magnética' },
          durationMinutes: { type: 'integer', example: 40 },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Parâmetro search inválido (máximo de 100 caracteres).' })
  findAll(@Query({ schema: listExamsQuerySchema }) query: ListExamsQuery) {
    return this.examsService.findAll(query.search);
  }
}
