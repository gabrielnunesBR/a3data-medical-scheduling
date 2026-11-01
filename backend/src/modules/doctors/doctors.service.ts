import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { DoctorShift } from './entities/doctor-shift.entity.js';
import { Doctor } from './entities/doctor.entity.js';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,

    @InjectRepository(DoctorShift)
    private readonly shiftsRepository: Repository<DoctorShift>,
  ) {}

  async findAll(): Promise<Array<Doctor & { workingWeekdays: number[] }>> {
    const doctors = await this.doctorsRepository.find({
      select: {
        id: true,
        name: true,
        crm: true,
      },
      order: {
        name: 'ASC',
      },
    });

    if (doctors.length === 0) {
      return [];
    }

    // One query for all shifts, rather than one query for each doctor.
    const shifts = await this.shiftsRepository.find({
      select: {
        doctorId: true,
        weekday: true,
      },
      where: {
        doctorId: In(doctors.map(({ id }) => id)),
      },
    });

    const weekdaysByDoctor = new Map<number, Set<number>>();

    for (const shift of shifts) {
      const weekdays = weekdaysByDoctor.get(shift.doctorId) ?? new Set<number>();
      weekdays.add(shift.weekday);
      weekdaysByDoctor.set(shift.doctorId, weekdays);
    }

    return doctors.map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      crm: doctor.crm,
      workingWeekdays: [...(weekdaysByDoctor.get(doctor.id) ?? [])].sort((a, b) => a - b),
    }));
  }
}
