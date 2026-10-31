import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';

type HealthResponse = {
  status: 'ok';
};

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');

      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Service temporarily unavailable.');
    }
  }
}
