import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DoctorsService } from './doctors.service.js';

@ApiTags('Médicos')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar médicos disponíveis para agendamento' })
  @ApiOkResponse({
    description: 'Lista de médicos em ordem alfabética.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'crm', 'workingWeekdays'],
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Dra. Helena Marques' },
          crm: { type: 'string', example: 'CRM-MG 11111' },
          workingWeekdays: {
            type: 'array',
            description: 'Dias de atendimento: 1 = segunda-feira, 7 = domingo.',
            uniqueItems: true,
            items: { type: 'integer', minimum: 1, maximum: 7 },
            example: [1, 2, 3, 4, 5],
          },
        },
      },
    },
  })
  findAll() {
    return this.doctorsService.findAll();
  }
}
