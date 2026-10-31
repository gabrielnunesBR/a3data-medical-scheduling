# Agendamento de Exames de Imagem

Aplicação full-stack desenvolvida para o desafio técnico da **A3Data**. Permite pesquisar exames de imagem, selecionar um médico, consultar horários disponíveis e confirmar agendamentos, respeitando os turnos de atendimento e impedindo reservas sobrepostas.

O fluxo principal está implementado no **backend NestJS** e no **frontend React**, com testes unitários, de integração HTTP e de ponta a ponta em navegador real.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Backend | Node.js 24, NestJS, TypeScript, TypeORM |
| Banco de dados | PostgreSQL 17 |
| Validação e datas | Zod, Luxon |
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form, React DayPicker |
| Testes do backend | Vitest, Supertest |
| Testes do frontend | Vitest, React Testing Library, MSW, Playwright (Chromium) |
| Infraestrutura | Docker Compose, npm Workspaces |

## Funcionalidades

- Busca de exames por nome, com duração do procedimento.
- Listagem de médicos e consulta da disponibilidade por data e exame.
- Agendamento com nome do paciente, médico, exame e horário selecionado.
- Validação de expediente, duração, horários passados e conflitos de reserva.
- Proteção contra agendamentos simultâneos sobrepostos no PostgreSQL.
- Fluxo web responsivo em **português brasileiro**, com revisão e confirmação do agendamento.
- Limitação de requisições ao endpoint público de criação de agendamentos.

## Estrutura do projeto

```text
a3data-medical-scheduling/
├── backend/                 # API REST, regras de negócio, migrations e seeds
├── frontend/                # Interface React e testes de navegador
├── challenge/               # Enunciado e arquivos originais do desafio
│   └── dados/
│       ├── exames.csv
│       └── medicos.md
├── docs/
│   └── ux-ui-decisions.md  # Diretrizes e decisões de design
├── compose.yaml             # PostgreSQL de desenvolvimento e de testes
├── .env.example
├── .env.test.example
└── README.md
```

### Documentação complementar

As decisões sobre a jornada do paciente, o design system, as cores, a tipografia, a responsividade e a acessibilidade estão registradas em [Diretrizes de UX/UI](docs/ux-ui-decisions.md).

## Pré-requisitos

- **Node.js 24** e npm.
- **Docker** com Docker Compose.
- Git, para clonar e versionar o projeto.
- Chromium do Playwright, somente para executar os testes de navegador (instruções abaixo).

## Instalação e execução local

Execute os comandos a seguir **na raiz do repositório**, salvo indicação contrária.

### 1. Instalar as dependências

```bash
npm install
```

### 2. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e defina uma senha local em `POSTGRES_PASSWORD`. Não versione arquivos com credenciais.

### 3. Iniciar o banco de desenvolvimento

```bash
docker compose up -d db
```

| Parâmetro | Valor padrão |
| --- | --- |
| Host | `127.0.0.1` |
| Porta publicada | `5433` |
| Banco | `medical_scheduling` |
| Usuário | `medical_app` |
| Senha | Configurada em `.env` |

### 4. Aplicar as migrations

```bash
npm run migration:run --workspace=backend
```

A estrutura do PostgreSQL é controlada por migrations do TypeORM; a opção `synchronize` permanece desabilitada. Para verificar o histórico:

```bash
npm run migration:show --workspace=backend
```

### 5. Importar os dados de referência

```bash
npm run seed:exams --workspace=backend
npm run seed:doctors --workspace=backend
```

Os seeds importam **30 exames** de `challenge/dados/exames.csv`, preservando seus IDs, e **5 médicos com 36 turnos semanais**, conforme `challenge/dados/medicos.md`.

Ambos são idempotentes: podem ser executados novamente sem duplicar ou sobrescrever os registros existentes. A importação dos médicos e turnos é transacional.

### 6. Iniciar backend e frontend

Em um terminal:

```bash
npm run dev:api
```

Em outro terminal:

```bash
npm run dev:web
```

| Serviço | Endereço padrão |
| --- | --- |
| API NestJS | `http://localhost:3000` |
| Frontend React | `http://localhost:5173` |

Durante o desenvolvimento, o Vite encaminha as chamadas a `/api` para o backend por meio de seu proxy local.

### Compilação

```bash
npm run build
```

Para compilar separadamente:

```bash
npm run build --workspace=backend
npm run build --workspace=frontend
```

## API REST

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `GET` | `/api/exams?search=...` | Listar ou pesquisar exames pelo nome |
| `GET` | `/api/doctors` | Listar médicos |
| `GET` | `/api/doctors/:id/availability?examId=...&date=...` | Consultar horários disponíveis |
| `POST` | `/api/appointments` | Confirmar um agendamento |

### Buscar exames

```bash
curl "http://localhost:3000/api/exams?search=ressonancia"
```

O parâmetro `search` é opcional. Sem ele, a API retorna o catálogo de exames.

### Listar médicos

```bash
curl "http://localhost:3000/api/doctors"
```

A resposta contém os identificadores dos médicos, necessários para consultar disponibilidade e criar agendamentos.

### Consultar disponibilidade

```bash
curl "http://localhost:3000/api/doctors/1/availability?examId=17&date=2030-01-07"
```

| Parâmetro | Local | Descrição |
| --- | --- | --- |
| `id` | URL | Identificador inteiro positivo do médico |
| `examId` | Query string | Identificador inteiro positivo do exame |
| `date` | Query string | Data no formato `YYYY-MM-DD` |

O ID `1` é ilustrativo; consulte o ID real em `GET /api/doctors`.

Exemplo **ilustrativo** de resposta para um turno das 08h às 12h e exame de 40 minutos, sem agendamentos existentes:

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

A API retorna horários no formato `HH:mm`, considerando a duração do exame, os turnos do médico, os agendamentos existentes e o instante atual. Quando não há horários disponíveis, retorna `200 OK` com `[]`.

**Fuso horário da clínica:** `America/Sao_Paulo` (horário de Brasília).

### Criar agendamento

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

| Campo | Descrição |
| --- | --- |
| `patientName` | Nome do paciente, com até 160 caracteres |
| `examId` | Identificador do exame |
| `doctorId` | Identificador do médico |
| `startAt` | Data e hora ISO 8601 com fuso explícito (`-03:00` ou `Z`) |

O horário de término (`endAt`) é calculado **no backend** a partir da duração cadastrada para o exame. Em caso de sucesso, a API retorna `201 Created`, incluindo o ID da reserva, os dados do agendamento e a data de criação. Os instantes podem ser serializados em UTC.

| Código HTTP | Situação |
| --- | --- |
| `201 Created` | Agendamento confirmado |
| `400 Bad Request` | Dados de entrada inválidos |
| `404 Not Found` | Médico ou exame inexistente |
| `409 Conflict` | Horário ocupado ou conflito com outra reserva |
| `422 Unprocessable Entity` | Horário passado, fora do expediente ou fora da grade válida |
| `429 Too Many Requests` | Limite de tentativas de agendamento excedido |

## Regras de negócio e integridade

- Cada exame possui uma duração utilizada para gerar os horários possíveis.
- A grade é calculada **a partir do início de cada turno**, em incrementos iguais à duração do exame.
- O exame deve caber integralmente dentro do turno.
- Horários passados ou fora do expediente não podem ser reservados.
- Todos os médicos cadastrados podem realizar todos os exames do desafio.
- A disponibilidade é revalidada no momento da confirmação, pois pode mudar após a consulta.
- Dois agendamentos do **mesmo médico** não podem possuir intervalos sobrepostos.
- **Médicos diferentes** podem atender simultaneamente.
- Agendamentos consecutivos são permitidos, desde que não haja sobreposição.

### Concorrência no PostgreSQL

Além das validações da aplicação, a tabela `appointments` utiliza uma **exclusion constraint GiST**:

```sql
EXCLUDE USING GIST (
  doctor_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
```

Ela impede que duas requisições concorrentes confirmem horários conflitantes para o mesmo médico. O PostgreSQL retorna SQLSTATE `23P01` quando a restrição é violada, e a API converte o erro em `409 Conflict`.

A tabela também possui `CHECK (start_at < end_at)`, impedindo intervalos com duração nula ou negativa.

### Proteção contra excesso de requisições

O endpoint `POST /api/appointments` utiliza `@nestjs/throttler` para aplicar **20 requisições por minuto por endereço IP**. Ao exceder o limite, retorna `429 Too Many Requests`. Os endpoints de consulta não recebem esse limite nesta configuração.

O contador atual utiliza armazenamento **em memória**, adequado ao ambiente do desafio com uma única instância. Uma implantação distribuída exigiria armazenamento compartilhado ou rate limiting na infraestrutura. Atrás de um reverse proxy, a identificação do IP precisa considerar apenas proxies confiáveis.

Essa proteção reduz abuso, mas não substitui mecanismos de verificação de identidade, controle de acesso ou prevenção de reservas fraudulentas em uma aplicação real.

## Testes automatizados

O projeto possui três níveis de testes:

| Tipo | Ferramentas | Escopo |
| --- | --- | --- |
| Unitários e componentes | Vitest, React Testing Library, MSW | Regras de negócio, formulários e estados da interface |
| E2E HTTP | Vitest, Supertest, PostgreSQL | Endpoints, persistência, validações e concorrência |
| E2E no navegador | Playwright, Chromium | Jornada real entre React, NestJS e PostgreSQL |

### 1. Preparar o banco de testes

O ambiente de testes usa uma instância PostgreSQL independente. Na raiz do repositório:

```bash
cp .env.test.example .env.test
```

Configure `POSTGRES_PASSWORD` com a mesma senha local usada no `.env` e mantenha o arquivo fora do Git.

```bash
docker compose --profile test up -d db_test
```

| Parâmetro | Valor |
| --- | --- |
| Host | `127.0.0.1` |
| Porta publicada | `5434` |
| Banco | `medical_scheduling_test` |
| Volume | `postgres_test_data` |

Aplique as mesmas migrations e seeds no ambiente isolado:

```bash
NODE_ENV=test npm run migration:run --workspace=backend
NODE_ENV=test npm run seed:exams --workspace=backend
NODE_ENV=test npm run seed:doctors --workspace=backend
```

Os testes com escrita usam o banco `medical_scheduling_test` e possuem verificações para recusar conexões com o banco de desenvolvimento. As suítes de agendamento fazem limpeza direcionada dos registros que criam.

### 2. Testes unitários e de componentes

```bash
npm run test --workspace=backend -- --run
npm run test --workspace=frontend
```

### 3. Testes E2E da API

```bash
npm run test:e2e --workspace=backend -- --run
```

Para executar somente os testes de concorrência:

```bash
NODE_ENV=test npm exec --workspace=backend -- vitest run \
  --config vitest.config.e2e.ts \
  test/appointments-concurrency.e2e-spec.ts
```

Entre os cenários cobertos estão: requisições concorrentes para o mesmo horário, sobreposições com durações diferentes, horários consecutivos, atendimentos simultâneos por médicos diferentes e a restrição `23P01` do PostgreSQL.

### 4. Testes E2E no navegador

Instale o navegador de testes (na primeira execução do ambiente):

```bash
npm exec --workspace=frontend -- playwright install chromium
```

Execute:

```bash
npm run test:browser --workspace=frontend
```

Para acompanhar o navegador visualmente:

```bash
npm run test:browser --workspace=frontend -- --headed
```

O Playwright inicia automaticamente a API de testes na **porta 3100** e o frontend na **porta 5174**, utilizando o PostgreSQL isolado na porta **5434**. A configuração não reaproveita servidores previamente iniciados nessas portas.

Os cenários cobrem seleção de exame, médico, data e horário; revisão; confirmação e persistência; atualização da disponibilidade; e tratamento real de `409 Conflict`. Os agendamentos criados são identificados individualmente e removidos após cada cenário, quando a execução conclui normalmente.

### 5. Build e lint

```bash
npm run build
npm run lint --workspace=frontend
```

## Comandos úteis

Verificar os containers:

```bash
docker compose --profile test ps
```

Encerrar os serviços:

```bash
docker compose down
```

`docker compose down`, sem a opção `-v`, **preserva os volumes nomeados** do PostgreSQL. Evite `docker compose down -v` se desejar conservar os dados locais.

## Notas sobre escopo e produção

O projeto foi desenvolvido para o escopo do desafio técnico. Os endpoints de consulta e criação de agendamentos são públicos, **sem autenticação ou autorização de usuários**. A interface utiliza pt-BR; erros HTTP conhecidos são traduzidos em mensagens amigáveis, sem exibir textos técnicos da API diretamente ao paciente.

Para uso com pacientes reais, seriam necessárias avaliações e medidas adicionais de segurança, privacidade e operação, incluindo controles adequados de identidade, tratamento de dados pessoais, observabilidade e infraestrutura. A **idempotência das requisições de criação** ainda não foi implementada e permanece como possível evolução.

Os materiais originais do desafio foram preservados em `challenge/`.

---

Projeto desenvolvido como parte do desafio técnico da **A3Data**.
