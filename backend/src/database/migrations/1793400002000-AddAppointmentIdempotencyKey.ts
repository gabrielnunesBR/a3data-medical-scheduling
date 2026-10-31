import {
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class AddAppointmentIdempotencyKey1793400002000
  implements MigrationInterface
{
  name = 'AddAppointmentIdempotencyKey1793400002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE appointments
      ADD COLUMN idempotency_key uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE appointments
      ADD CONSTRAINT uq_appointments_idempotency_key
      UNIQUE (idempotency_key)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE appointments
      DROP CONSTRAINT uq_appointments_idempotency_key
    `);

    await queryRunner.query(`
      ALTER TABLE appointments
      DROP COLUMN idempotency_key
    `);
  }
}
