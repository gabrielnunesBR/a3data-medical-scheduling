import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Doctor } from './doctor.entity.js';

@Unique('uq_doctor_shifts_slot', ['doctorId', 'weekday', 'startTime', 'endTime'])
@Entity('doctor_shifts')
export class DoctorShift {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ name: 'doctor_id', type: 'integer' })
  doctorId!: number;

  @ManyToOne(() => Doctor, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ type: 'smallint' })
  weekday!: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;
}
