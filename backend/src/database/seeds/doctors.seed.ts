import { Doctor } from '../../modules/doctors/entities/doctor.entity.js';
import { DoctorShift } from '../../modules/doctors/entities/doctor-shift.entity.js';
import { migrationDataSource } from '../data-source.js';

type ShiftSeed = {
  weekday: number;
  startTime: string;
  endTime: string;
};

type DoctorSeed = {
  name: string;
  crm: string;
  shifts: ShiftSeed[];
};

function shiftsForDays(weekdays: number[], startTime: string, endTime: string): ShiftSeed[] {
  return weekdays.map((weekday) => ({
    weekday,
    startTime,
    endTime,
  }));
}

const doctors: DoctorSeed[] = [
  {
    name: 'Dra. Helena Marques',
    crm: 'CRM-MG 11111',
    shifts: [
      ...shiftsForDays([1, 2, 3, 4, 5], '08:00', '12:00'),
      ...shiftsForDays([1, 2, 3, 4, 5], '14:00', '18:00'),
    ],
  },
  {
    name: 'Dr. Rafael Teixeira',
    crm: 'CRM-MG 22222',
    shifts: [
      ...shiftsForDays([1, 3, 5], '07:00', '13:00'),
      ...shiftsForDays([2, 4], '13:00', '19:00'),
    ],
  },
  {
    name: 'Dra. Beatriz Nogueira',
    crm: 'CRM-MG 33333',
    shifts: [
      ...shiftsForDays([1, 2, 3, 4], '09:00', '12:00'),
      ...shiftsForDays([1, 2, 3, 4], '18:00', '22:00'),
    ],
  },
  {
    name: 'Dr. Thiago Fontes',
    crm: 'CRM-MG 44444',
    shifts: [
      ...shiftsForDays([2, 3, 4, 5, 6], '08:00', '12:00'),
      ...shiftsForDays([3, 5], '19:00', '22:00'),
    ],
  },
  {
    name: 'Dra. Camila Andrade',
    crm: 'CRM-MG 55555',
    shifts: [
      ...shiftsForDays([1, 2, 3, 4, 5], '10:00', '14:00'),
      ...shiftsForDays([6], '08:00', '12:00'),
    ],
  },
];

async function main(): Promise<void> {
  try {
    await migrationDataSource.initialize();

    const result = await migrationDataSource.transaction(async (manager) => {
      const insertedDoctors = await manager
        .createQueryBuilder()
        .insert()
        .into(Doctor)
        .values(
          doctors.map(({ name, crm }) => ({
            name,
            crm,
          })),
        )
        .orIgnore()
        .returning('id')
        .execute();

      const persistedDoctors = await manager.getRepository(Doctor).find({
        select: {
          id: true,
          crm: true,
        },
        where: doctors.map(({ crm }) => ({ crm })),
      });

      const doctorIds = new Map(persistedDoctors.map(({ id, crm }) => [crm, id]));

      const shifts = doctors.flatMap(({ crm, shifts }) => {
        const doctorId = doctorIds.get(crm);

        if (doctorId === undefined) {
          throw new Error(`Médico não encontrado: ${crm}`);
        }

        return shifts.map((shift) => ({
          ...shift,
          doctorId,
        }));
      });

      const insertedShifts = await manager
        .createQueryBuilder()
        .insert()
        .into(DoctorShift)
        .values(shifts)
        .orIgnore()
        .returning('id')
        .execute();

      return {
        doctorsInserted: (insertedDoctors.raw as Array<{ id: number }>).length,
        shiftsInserted: (insertedShifts.raw as Array<{ id: number }>).length,
      };
    });

    console.log(`${doctors.length} médicos processados.`);
    console.log(`${result.doctorsInserted} médicos inseridos.`);
    console.log(`${result.shiftsInserted} turnos inseridos.`);
  } finally {
    if (migrationDataSource.isInitialized) {
      await migrationDataSource.destroy();
    }
  }
}

main().catch((error: unknown) => {
  console.error('Falha ao importar médicos e turnos:', error);
  process.exitCode = 1;
});
