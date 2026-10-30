
import { Controller, Get } from '@nestjs/common';

import { DoctorsService } from './doctors.service.js';

@Controller('doctors')
export class DoctorsController {
  constructor(
    private readonly doctorsService: DoctorsService,
  ) {}

  @Get()
  findAll() {
    return this.doctorsService.findAll();
  }
}
