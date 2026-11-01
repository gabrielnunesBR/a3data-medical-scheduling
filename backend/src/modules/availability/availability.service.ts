import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { type EntityManager, LessThan, MoreThan, Repository } from 'typeorm';

import { Appointment } from '../appointments/entities/appointment.entity.js';
import { DoctorShift } from '../doctors/entities/doctor-shift.entity.js';
import { Doctor } from '../doctors/entities/doctor.entity.js';
import { Exam } from '../exams/entities/exam.entity.js';

import { CLINIC_TIME_ZONE } from './availability.constants.js';
import { getAvailableSlots } from './get-available-slots.js';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,

    @InjectRepository(Exam)
    private readonly examsRepository: Repository<Exam>,

    @InjectRepository(DoctorShift)
    private readonly shiftsRepository: Repository<DoctorShift>,

    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
  ) {}

  async findAvailableSlots(
    doctorId: number,
    examOrId: number | Exam,
    date: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const doctorsRepository = manager?.getRepository(Doctor) ?? this.doctorsRepository;

    const examsRepository = manager?.getRepository(Exam) ?? this.examsRepository;

    const shiftsRepository = manager?.getRepository(DoctorShift) ?? this.shiftsRepository;

    const appointmentsRepository =
      manager?.getRepository(Appointment) ?? this.appointmentsRepository;

    const selectedDate = DateTime.fromISO(date, {
      zone: CLINIC_TIME_ZONE,
    });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !selectedDate.isValid) {
      throw new BadRequestException('Invalid date. Expected YYYY-MM-DD.');
    }

    const doctor = await doctorsRepository.findOneBy({
      id: doctorId,
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found.');
    }

    // Booking already loaded the exam; API queries still resolve it by ID.
    const exam =
      typeof examOrId === 'number' ? await examsRepository.findOneBy({ id: examOrId }) : examOrId;

    if (!exam) {
      throw new NotFoundException('Exam not found.');
    }

    const shifts = await shiftsRepository.find({
      where: {
        doctorId,
        weekday: selectedDate.weekday,
      },
      order: {
        startTime: 'ASC',
      },
    });

    if (shifts.length === 0) {
      return [];
    }

    const dayStart = selectedDate.startOf('day');
    const dayEnd = dayStart.plus({ days: 1 });

    const appointments = await appointmentsRepository.find({
      where: {
        doctorId,
        startAt: LessThan(dayEnd.toJSDate()),
        endAt: MoreThan(dayStart.toJSDate()),
      },
      select: {
        startAt: true,
        endAt: true,
      },
    });

    const occupiedIntervals = appointments.map((appointment) => ({
      startTime: DateTime.fromJSDate(appointment.startAt)
        .setZone(CLINIC_TIME_ZONE)
        .toFormat('HH:mm'),

      endTime: DateTime.fromJSDate(appointment.endAt).setZone(CLINIC_TIME_ZONE).toFormat('HH:mm'),
    }));

    return getAvailableSlots({
      date,
      durationMinutes: exam.durationMinutes,
      shifts,
      occupiedIntervals,
    });
  }
}
