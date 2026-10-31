import { Controller, Get, Param, Query } from '@nestjs/common';

import { AvailabilityService } from './availability.service.js';
import {
  getAvailabilityQuerySchema,
  positiveIdSchema,
  type GetAvailabilityQuery,
} from './dto/get-availability-query.dto.js';

@Controller('doctors')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':id/availability')
  findAvailableSlots(
    @Param('id', { schema: positiveIdSchema }) doctorId: number,
    @Query({ schema: getAvailabilityQuerySchema })
    query: GetAvailabilityQuery,
  ): Promise<string[]> {
    return this.availabilityService.findAvailableSlots(doctorId, query.examId, query.date);
  }
}
