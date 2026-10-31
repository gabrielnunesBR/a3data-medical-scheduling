# Agendamento de Exames de Imagem

Aplicação full-stack desenvolvida para o desafio técnico da **A3Data**. O sistema permite buscar exames, consultar a disponibilidade dos médicos e agendar exames de imagem, respeitando os turnos de atendimento e impedindo reservas sobrepostas.

> **Estado atual:** a API REST está implementada, com testes unitários e E2E. A interface web em React está em desenvolvimento.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Backend | Node.js 24, NestJS, TypeScript, TypeORM |
| Banco de dados | PostgreSQL 17 |
| Validação e datas | Zod, Luxon |
| Frontend | React, TypeScript, Vite |
| Testes | Vitest, Supertest |
| Infraestrutura | Docker Compose, npm Workspaces |

## Estrutura do projeto

```text
a3data-medical-scheduling/
├── backend/           # API REST e regras de negócio
├── frontend/          # Interface web React (em desenvolvimento)
├── challenge/         # Enunciado e arquivos originais do desafio
│   └── dados/
│       ├── exames.csv
│       └── medicos.md
├── compose.yaml       # PostgreSQL de desenvolvimento e de testes
├── .env.example
├── .env.test.example
└── README.md
```

## Documentação

### Diretrizes de UX/UI

As decisões de design da interface estão documentadas em
[Diretrizes de UX/UI](docs/ux-ui-decisions.md).

O documento apresenta as referências utilizadas na pesquisa,
a jornada de agendamento, o design system, a paleta de cores,
a tipografia, os padrões de acessibilidade e as diretrizes
de responsividade e experiência do usuário.

## Pré-requisitos

- Node.js 24 (recomendado) e npm;
- Docker com Docker Compose;
- Git (para clonar e versionar o projeto).

## Instalação e execução local

Todos os comandos abaixo devem ser executados na **raiz do repositório**, salvo indicação em contrário.

### 1. Instalar as dependências

```bash
npm install
```

### 2. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e defina uma senha local para `POSTGRES_PASSWORD`. Não versione esse arquivo.

### 3. Iniciar o PostgreSQL

```bash
docker compose up -d db
```

Configuração padrão de desenvolvimento:

| Parâmetro | Valor |
| --- | --- |
| Host | `127.0.0.1` |
| Porta publicada | `5433` |
| Banco | `medical_scheduling` |
| Usuário | `medical_app` |
| Senha | Definida em `.env` |

### 4. Aplicar as migrations

```bash
npm run migration:run --workspace=backend
```

O projeto utiliza TypeORM com `synchronize: false`. Portanto, a estrutura do banco é mantida por **migrations**, e não pela sincronização automática de entidades.

Para consultar o estado das migrations:

```bash
npm run migration:show --workspace=backend
```

### 5. Importar os dados iniciais

```bash
npm run seed:exams --workspace=backend
npm run seed:doctors --workspace=backend
```

Os seeds importam:

- **30 exames**, a partir de `challenge/dados/exames.csv`, preservando os IDs originais;
- **5 médicos e 36 turnos semanais**, conforme `challenge/dados/medicos.md`.

Os dois seeds são **idempotentes**: podem ser executados novamente sem duplicar ou sobrescrever registros existentes. O seed dos médicos e turnos é transacional.

### 6. Iniciar a aplicação

API NestJS:

```bash
npm run dev:api
```

Frontend React (em outro terminal):

```bash
npm run dev:web
```

A API utiliza, por padrão, `http://localhost:3000`. A interface React ainda está em desenvolvimento.

### Build

```bash
npm run build
```

Para compilar somente o backend:

```bash
npm run build --workspace=backend
```

## API REST

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/exams?search=...` | Listar e buscar exames pelo nome |
| `GET` | `/api/doctors` | Listar médicos |
| `GET` | `/api/doctors/:id/availability?examId=...&date=...` | Consultar horários disponíveis |
| `POST` | `/api/appointments` | Criar um agendamento |

### Buscar exames

```bash
curl "http://localhost:3000/api/exams?search=ressonancia"
```

O parâmetro `search` é opcional. A busca é realizada pelo nome do exame.

### Listar médicos

```bash
curl "http://localhost:3000/api/doctors"
```

A resposta contém os identificadores necessários para consultar a disponibilidade e criar agendamentos.

### Consultar disponibilidade

```http
GET /api/doctors/:id/availability?examId=17&date=2030-01-07
```

Parâmetros:

| Campo | Local | Descrição |
| --- | --- | --- |
| `id` | URL | Identificador do médico |
| `examId` | Query | Identificador do exame |
| `date` | Query | Data no formato `YYYY-MM-DD` |

Exemplo (substitua `1` pelo ID real do médico):

```bash
curl "http://localhost:3000/api/doctors/1/availability?examId=17&date=2030-01-07"
```

Exemplo ilustrativo de resposta, para um médico com turno das 08h às 12h e exame de 40 minutos, sem reservas existentes:

```json
[
  "08:00",
  "08:40",
  "09:20",
  "10:00",
  "10:40",
  "11:20"
]
```

Os horários são retornados no formato `HH:mm`, considerando a duração do exame, a grade de turnos do médico, os agendamentos já realizados e a data atual. Se não houver horários disponíveis, a API retorna `[]` com HTTP 200.

**Fuso horário da clínica:** `America/Sao_Paulo`.

### Criar agendamento

```http
POST /api/appointments
Content-Type: application/json
```

Exemplo de corpo JSON:

```json
{
  "patientName": "João Silva",
  "examId": 17,
  "doctorId": 1,
  "startAt": "2030-01-07T09:20:00-03:00"
}
```

O campo `startAt` deve ser uma data e hora ISO 8601 com fuso explícito (por exemplo, `-03:00` ou `Z`). O horário de término (`endAt`) é calculado **exclusivamente no backend**, com base na duração do exame.

Exemplo de requisição:

```bash
curl -i -X POST "http://localhost:3000/api/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "João Silva",
    "examId": 17,
    "doctorId": 1,
    "startAt": "2030-01-07T09:20:00-03:00"
  }'
```

Em caso de sucesso, a API retorna **HTTP 201**, com o identificador do agendamento, os dados do paciente, médico, exame, instantes de início e término e data de criação. Os instantes podem ser serializados em UTC.

#### Respostas e erros

| HTTP | Significado |
| --- | --- |
| `201 Created` | Agendamento confirmado |
| `400 Bad Request` | Dados de entrada inválidos |
| `404 Not Found` | Médico ou exame inexistente |
| `409 Conflict` | Horário ocupado ou conflito de reserva |
| `422 Unprocessable Entity` | Horário passado, fora do expediente ou fora da grade de horários |

## Regras de negócio e integridade

- Cada exame possui duração própria, utilizada para calcular seus horários possíveis.
- Os horários candidatos são gerados **a partir do início de cada turno**, em incrementos iguais à duração do exame.
- Um exame deve caber integralmente no turno do médico.
- Não são oferecidos horários passados nem horários incompatíveis com o expediente.
- O início solicitado deve pertencer à grade válida do exame; não basta haver um intervalo livre arbitrário.
- Todos os médicos podem realizar todos os exames previstos no desafio.
- **Um médico não pode possuir agendamentos com intervalos sobrepostos.**
- **Médicos diferentes podem atender simultaneamente.**
- Agendamentos consecutivos são permitidos quando não há sobreposição.
- A disponibilidade é reavaliada na criação do agendamento, pois pode mudar entre a consulta e a confirmação.

### Proteção contra concorrência

Além das validações de negócio no NestJS, o PostgreSQL possui uma **exclusion constraint GiST** na tabela `appointments`, baseada na igualdade de `doctor_id` e na sobreposição de intervalos `tstzrange(start_at, end_at, '[)')`.

Essa restrição impede que duas requisições concorrentes confirmem agendamentos conflitantes para o mesmo médico. Uma violação da constraint (SQLSTATE `23P01`) é traduzida pela API para **HTTP 409 Conflict**.

Também existe uma restrição `CHECK (start_at < end_at)` para garantir a validade dos intervalos armazenados.

## Testes automatizados

O backend utiliza **Vitest** para testes unitários e **Supertest** para testes HTTP E2E. Os testes que acessam o PostgreSQL utilizam um banco separado do ambiente de desenvolvimento.

### Testes unitários

```bash
npm run test --workspace=backend -- --run
```

### Configurar o banco de testes

Crie o arquivo de ambiente:

```bash
cp .env.test.example .env.test
```

Configure `POSTGRES_PASSWORD` em `.env.test` com a mesma senha utilizada em `.env`. O arquivo `.env.test` não deve ser versionado.

Inicie o banco de testes:

```bash
docker compose --profile test up -d db_test
```

Configuração do ambiente de testes:

| Parâmetro | Valor |
| --- | --- |
| Host | `127.0.0.1` |
| Porta publicada | `5434` |
| Banco | `medical_scheduling_test` |
| Volume | `postgres_test_data` |

Prepare o schema e os dados de referência **no banco de testes**:

```bash
NODE_ENV=test npm run migration:run --workspace=backend
NODE_ENV=test npm run seed:exams --workspace=backend
NODE_ENV=test npm run seed:doctors --workspace=backend
```

O ambiente de testes possui proteção para impedir que a aplicação utilize o banco de desenvolvimento quando `NODE_ENV=test`.

### Executar os testes E2E

```bash
npm run test:e2e --workspace=backend -- --run
```

O script `test:e2e` configura `NODE_ENV=test` e utiliza o PostgreSQL isolado. Testes que criam agendamentos fazem a limpeza dos registros identificados por cada execução, sem excluir os dados de referência.

Para executar somente os testes de concorrência:

```bash
NODE_ENV=test npm exec --workspace=backend -- vitest run \
  --config vitest.config.e2e.ts \
  test/appointments-concurrency.e2e-spec.ts
```

Os testes de concorrência verificam:

- Múltiplas requisições tentando reservar o mesmo horário;
- Sobreposição entre exames com durações diferentes;
- Agendamentos consecutivos sem conflito;
- Médicos diferentes atendendo no mesmo horário;
- Rejeição direta de sobreposição pelo PostgreSQL com SQLSTATE `23P01`.

### Validação completa do backend

```bash
npm run test --workspace=backend -- --run
npm run test:e2e --workspace=backend -- --run
npm run build --workspace=backend
```

## Comandos úteis do Docker Compose

Verificar os containers:

```bash
docker compose --profile test ps
```

Encerrar os serviços de desenvolvimento:

```bash
docker compose down
```

O comando `docker compose down`, sem `-v`, **preserva os volumes nomeados** do PostgreSQL. Evite `docker compose down -v` se desejar manter os dados locais.

## Arquivos originais do desafio

Os arquivos fornecidos para o desafio estão preservados em `challenge/`, incluindo o catálogo de exames (`challenge/dados/exames.csv`) e a definição dos médicos e respectivos turnos (`challenge/dados/medicos.md`).

---

**Projeto desenvolvido como parte do desafio técnico da A3Data.**
