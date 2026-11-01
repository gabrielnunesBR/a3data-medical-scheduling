[← Voltar ao README](../README.md)

# Testes, qualidade e integração contínua

## Visão geral da cobertura

A suíte automatizada cobre **regras de negócio, API, interface e inicialização da infraestrutura**, não apenas cenários de sucesso. O mapa abaixo resume as verificações implementadas; comandos e detalhes estão em [Comandos de testes](#como-reproduzir-os-testes-automatizados) e [GitHub Actions](#github-actions--integração-contínua).

| Camada                                | Principais cenários verificados                                                                                                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unitários — backend**               | Geração de horários a partir dos turnos, duração dos exames, filtragem de horários ocupados, validação de agendamentos, idempotência, tratamento de erros, configuração de ambiente, saúde da API e logs.                    |
| **Componentes — frontend**            | Busca e seleção de exames, escolha de profissional/data/horário, limpeza de seleções dependentes, validação do paciente, tratamento de conflitos e estados de erro, comprovante e ações de calendário.                       |
| **Integração HTTP — PostgreSQL real** | Endpoints de exames, médicos, disponibilidade e agendamentos; migrations e integridade dos dados; concorrência e exclusão GiST; idempotência, rate limiting, health check, cabeçalhos de segurança e contrato OpenAPI.       |
| **E2E — Playwright**                  | Jornada de agendamento no Chromium, revisão, confirmação, recuperação de falha de resposta, conflitos `409`, impressão/comprovante, download `.ics`, responsividade, teclado e verificações automatizadas de acessibilidade. |
| **Smoke test — Docker Compose**       | Build e inicialização do stack, conclusão do `db-init`, health check da API, frontend servido pelo Nginx Swagger em `/api/docs`, status 404 em `/docs` e presença dos 30 exames e cinco médicos.                             |
| **Qualidade e CI**                    | Prettier, Oxlint, checagem TypeScript, builds e execução das suítes em três jobs independentes do GitHub Actions.                                                                                                            |

**Cobertura funcional não equivale a percentual de cobertura de linhas ou branches.** O projeto fornece um comando para gerar relatório de cobertura do backend, mas não declara um percentual global sem medição consolidada. Testes automatizados de acessibilidade não substituem uma auditoria manual completa.

## Como reproduzir os testes automatizados

**Pré-requisitos para executar os testes localmente:** diferentemente da execução da aplicação com Docker Compose, os comandos npm abaixo exigem Node.js 24 e npm instalados na máquina. Na raiz do repositório, execute `npm ci` para instalar as dependências. Configure também o arquivo `.env` conforme a seção de instalação. Para os testes E2E com PostgreSQL, siga a preparação do banco de testes descrita abaixo. Esses passos são opcionais para quem deseja apenas executar a aplicação pelo Docker.

### 1. Preparar o banco de testes — apenas para executar E2E localmente

Os comandos desta seção são **opcionais para quem só deseja usar a aplicação com Docker**. Eles interessam a quem quer reproduzir as suítes automatizadas localmente. O ambiente de testes usa uma instância PostgreSQL independente. Na raiz do repositório:

```bash
cp .env.test.example .env.test
```

Configure `POSTGRES_PASSWORD` com a mesma senha local usada no `.env` e mantenha o arquivo fora do Git.

```bash
docker compose --profile test up -d db_test
```

| Parâmetro       | Valor                     |
| --------------- | ------------------------- |
| Host            | `127.0.0.1`               |
| Porta publicada | `5434`                    |
| Banco           | `medical_scheduling_test` |
| Volume          | `postgres_test_data`      |

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
npm run test --workspace=frontend -- --run
```

#### Cobertura de testes do backend

É possível medir a cobertura das regras centrais de disponibilidade e agendamento usando Vitest e o provedor V8:

```bash
npm run test --workspace=backend -- \
  --run \
  --coverage.enabled \
  --coverage.provider=v8 \
  --coverage.include='src/modules/availability/**/*.ts' \
  --coverage.include='src/modules/appointments/**/*.ts' \
  --coverage.exclude='**/*.spec.ts' \
  --coverage.reporter=text \
  --coverage.reporter=html
```

O relatório HTML é gerado em `backend/coverage/` e não é versionado. Essa medição considera os testes unitários; os E2E HTTP com PostgreSQL são executados separadamente e não são automaticamente incluídos nesses percentuais.

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

Os testes E2E cobrem requisições concorrentes para o mesmo horário, sobreposições com durações diferentes, horários consecutivos, atendimentos simultâneos por médicos diferentes e a restrição `23P01` do PostgreSQL. O tratamento de deadlocks `40P01` durante a gravação e no escopo da transação é validado por testes unitários do serviço; a suíte E2E não provoca deliberadamente um deadlock no PostgreSQL.

Os testes HTTP também cobrem idempotência, reaproveitamento de chaves, rate limiting, Request ID e o contrato OpenAPI dos cinco endpoints. Os testes de cabeçalhos de segurança verificam as respostas `200`, `400` e `404`. Testes específicos verificam o health check (200/503), a classificação dos logs e a sanitização de exceções inesperadas.

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

Os cenários cobrem seleção de exame, médico, data e horário; bloqueio de dias sem expediente e troca de médico; revisão; confirmação e persistência; atualização da disponibilidade; e tratamento real de `409 Conflict`. Também é simulada a perda da resposta após a gravação no PostgreSQL, verificando que a repetição idempotente recupera o mesmo agendamento sem duplicá-lo.

A suíte de qualidade de interface verifica a ausência de transbordamento horizontal em telas de diferentes larguras, a navegação por teclado e violações detectáveis automaticamente das diretrizes WCAG 2.0 e 2.1 (níveis A e AA), usando axe-core. Essas verificações automatizadas não substituem uma auditoria manual completa de acessibilidade.

Os agendamentos criados nos testes são identificados individualmente e removidos após cada cenário, quando a execução conclui normalmente.

## Build, lint e formatação

```bash
npm run build
npm run lint --workspace=backend
npm run lint --workspace=frontend
npx prettier . --check
```

O projeto compartilha uma configuração do Prettier para padronizar código no frontend e no backend. O ambiente Docker não modifica a execução local desses comandos.

## GitHub Actions — integração contínua

O workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) é executado em pushes e pull requests da branch `main` e também permite execução manual. Ele contém **três jobs independentes**:

- **Quality and unit tests:** `npm ci`, Prettier, Oxlint, verificação de tipos TypeScript, testes unitários do backend/frontend e build das duas aplicações.
- **PostgreSQL integration tests:** serviço PostgreSQL 17 temporário, migrations, seeds, E2E HTTP (incluindo o contrato OpenAPI), Chromium e testes Playwright com verificações de acessibilidade.
- **Docker Compose smoke test:** valida a configuração do Compose, constrói e inicializa `db`, `db-init`, `api` e `web`, e executa [`scripts/docker-smoke.sh`](../scripts/docker-smoke.sh) para verificar inicialização, health check, HTML do frontend e dados de referência.

O terceiro job utiliza credenciais **descartáveis**, exclusivas do runner, e a tag de imagem `ci-smoke`; não precisa de credenciais de produção nem de uma conta em registry. Em caso de falha, exibe os logs dos containers e remove os recursos temporários ao terminar.

Em caso de falha nos testes Playwright, relatórios e traces são disponibilizados como artifacts por tempo limitado. O smoke test Docker **não substitui** os testes de regras de negócio, concorrência e jornada real: essas responsabilidades continuam cobertas pelos outros jobs.
