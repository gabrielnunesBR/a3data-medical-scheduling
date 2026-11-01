import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AvailabilityService } from './availability.service.js';
import {
  getAvailabilityQuerySchema,
  positiveIdSchema,
  type GetAvailabilityQuery,
} from './dto/get-availability-query.dto.js';

@ApiTags('Disponibilidade')
@Controller('doctors')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':id/availability')
  @ApiOperation({
    summary: 'Consultar horários disponíveis de um médico',
    description:
      'Os horários seguem o fuso America/Sao_Paulo, respeitam a duração do exame, os turnos e as reservas existentes. Uma agenda vazia retorna 200 com [].',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    type: String,
    format: 'date',
    description: 'Data da consulta no formato YYYY-MM-DD (ano-mês-dia).',
    example: '2030-01-07',
  })
  @ApiOkResponse({
    description: 'Horários disponíveis no formato HH:mm (horário de Brasília).',
    schema: {
      type: 'array',
      items: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$', example: '09:20' },
      example: ['08:00', '08:40', '09:20'],
    },
  })
  @ApiBadRequestResponse({ description: 'ID do médico, examId ou data inválidos.' })
  @ApiNotFoundResponse({ description: 'Médico ou exame não encontrado.' })
  findAvailableSlots(
    @Param('id', { schema: positiveIdSchema }) doctorId: number,
    @Query({ schema: getAvailabilityQuerySchema }) query: GetAvailabilityQuery,
  ): Promise<string[]> {
    return this.availabilityService.findAvailableSlots(doctorId, query.examId, query.date);
  }
}
