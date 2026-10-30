import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('exams')
export class Exam {
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Column({ name: 'duration_minutes', type: 'smallint' })
  durationMinutes!: number;
}
