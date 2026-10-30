import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  crm!: string;
}
