import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { DataSource } from 'typeorm';

type HealthResponse = {
  status: 'ok';
};

@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verificar a disponibilidade da API e do PostgreSQL' })
  @ApiOkResponse({
    description: 'API e banco disponíveis.',
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ok'], example: 'ok' } },
    },
  })
  @ApiResponse({ status: 503, description: 'Banco indisponível; sem detalhes internos da falha.' })
  async check(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Service temporarily unavailable.');
    }
  }
}
