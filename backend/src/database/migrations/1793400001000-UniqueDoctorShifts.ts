import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueDoctorShifts1793400001000
  implements MigrationInterface
{
  name = 'UniqueDoctorShifts1793400001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE doctor_shifts
      ADD CONSTRAINT uq_doctor_shifts_slot
      UNIQUE (doctor_id, weekday, start_time, end_time)
    `);

    await queryRunner.query(`
      DROP INDEX idx_doctor_shifts_doctor_weekday
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX idx_doctor_shifts_doctor_weekday
      ON doctor_shifts (doctor_id, weekday)
    `);

    await queryRunner.query(`
      ALTER TABLE doctor_shifts
      DROP CONSTRAINT uq_doctor_shifts_slot
    `);
  }
}
