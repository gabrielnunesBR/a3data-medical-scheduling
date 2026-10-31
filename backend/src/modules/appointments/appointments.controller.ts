import { BadRequestException, Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';

import {
  createAppointmentSchema,
  type CreateAppointmentDto,
} from './dto/create-appointment.dto.js';
import { AppointmentsService } from './appointments.service.js';

const idempotencyKeySchema = z.uuid();

@ApiTags('Agendamentos')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Criar um agendamento',
    description:
      'O horário é revalidado na confirmação. O backend calcula endAt pela duração do exame. Repetições com a mesma chave de idempotência e os mesmos dados recuperam a reserva original.',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'UUID opcional. Reutilize a mesma chave apenas para repetir a mesma operação.',
    schema: { type: 'string', format: 'uuid' },
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiCreatedResponse({
    description: 'Reserva criada ou recuperada pela mesma chave de idempotência.',
    schema: {
      type: 'object',
      required: ['id', 'patientName', 'examId', 'doctorId', 'startAt', 'endAt', 'createdAt'],
      properties: {
        id: { type: 'integer', example: 123 },
        patientName: { type: 'string', example: 'João Silva' },
        examId: { type: 'integer', example: 17 },
        doctorId: { type: 'integer', example: 1 },
        startAt: { type: 'string', format: 'date-time', example: '2030-01-07T12:20:00.000Z' },
        endAt: { type: 'string', format: 'date-time', example: '2030-01-07T13:00:00.000Z' },
        createdAt: { type: 'string', format: 'date-time', example: '2030-01-01T10:00:00.000Z' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Body inválido ou header Idempotency-Key inválido.' })
  @ApiNotFoundResponse({ description: 'Exame ou médico não encontrado.' })
  @ApiConflictResponse({
    description: 'Horário ocupado ou reutilização da chave de idempotência com dados diferentes.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Horário passado, sem precisão de minuto ou fora da grade disponível.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Limite de 20 tentativas por minuto por IP excedido.',
  })
  create(
    @Body({ schema: createAppointmentSchema }) dto: CreateAppointmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (idempotencyKey !== undefined) {
      const result = idempotencyKeySchema.safeParse(idempotencyKey);

      if (!result.success) {
        throw new BadRequestException('Invalid Idempotency-Key header.');
      }
    }

    return this.appointmentsService.create(dto, idempotencyKey);
  }
}
