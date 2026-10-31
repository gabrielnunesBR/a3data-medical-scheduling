import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

import { Exam } from '../../modules/exams/entities/exam.entity.js';
import { migrationDataSource } from '../data-source.js';

const examCsvSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    nome: z.string().trim().min(1).max(180),
    duracao_minutos: z.coerce.number().int().positive(),
  })
  .strict();

async function main(): Promise<void> {
  const csvPath = new URL('../../../../challenge/dados/exames.csv', import.meta.url);

  const content = await readFile(csvPath, 'utf8');

  const records: unknown[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  if (records.length === 0) {
    throw new Error('O catálogo de exames está vazio.');
  }

  const exams = records.map((record, index) => {
    const result = examCsvSchema.safeParse(record);

    if (!result.success) {
      throw new Error(`CSV inválido na linha ${index + 2}: ${result.error.message}`);
    }

    return {
      id: result.data.id,
      name: result.data.nome,
      durationMinutes: result.data.duracao_minutos,
    };
  });

  const uniqueIds = new Set(exams.map((exam) => exam.id));

  if (uniqueIds.size !== exams.length) {
    throw new Error('O CSV contém IDs de exames duplicados.');
  }

  try {
    await migrationDataSource.initialize();

    const result = await migrationDataSource
      .getRepository(Exam)
      .createQueryBuilder()
      .insert()
      .values(exams)
      .orIgnore()
      .returning('id')
      .execute();

    console.log(`${exams.length} exames processados.`);
    console.log(`${result.raw.length} exames inseridos.`);
  } finally {
    if (migrationDataSource.isInitialized) {
      await migrationDataSource.destroy();
    }
  }
}

main().catch((error: unknown) => {
  console.error('Falha ao importar exames:', error);
  process.exitCode = 1;
});
