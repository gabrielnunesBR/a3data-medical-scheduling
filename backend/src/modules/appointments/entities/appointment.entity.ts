import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Doctor } from '../../doctors/entities/doctor.entity.js';
import { Exam } from '../../exams/entities/exam.entity.js';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ name: 'patient_name', type: 'varchar', length: 160 })
  patientName!: string;

  @Column({ name: 'exam_id', type: 'integer' })
  examId!: number;

  @ManyToOne(() => Exam, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'exam_id' })
  exam!: Exam;

  @Column({ name: 'doctor_id', type: 'integer' })
  doctorId!: number;

  @ManyToOne(() => Doctor, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt!: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
