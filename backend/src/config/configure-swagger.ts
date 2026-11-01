import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Agendamento de Exames de Imagem')
    .setDescription(
      'API REST para consulta de exames, médicos, disponibilidade e criação de agendamentos.',
    )
    .setVersion('0.1.0')
    .build();

  const documentFactory = () => {
    const document = SwaggerModule.createDocument(app, config);
    const requestBody = document.paths['/api/appointments']?.post?.requestBody;

    if (!requestBody || !('content' in requestBody)) {
      throw new Error('POST /api/appointments must have an OpenAPI request body.');
    }

    const jsonContent = requestBody.content['application/json'];

    if (!jsonContent) {
      throw new Error('POST /api/appointments must accept application/json.');
    }

    jsonContent.example = {
      patientName: 'Paciente Teste',
      examId: 17,
      doctorId: 1,
      startAt: '2030-01-10T09:20:00-03:00',
    };

    return document;
  };

  SwaggerModule.setup('api/docs', app, documentFactory, {
    jsonDocumentUrl: 'api/openapi.json',
  });
}
