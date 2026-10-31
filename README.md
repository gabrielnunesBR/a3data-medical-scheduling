# Agendamento de Exames de Imagem

Aplicação full-stack desenvolvida para o desafio técnico da A3Data.

## Tecnologias

- Node.js 24
- NestJS
- TypeScript
- React
- Vite
- npm Workspaces

## Estrutura

- `backend/`: API REST em NestJS
- `frontend/`: aplicação web em React
- `challenge/`: arquivos originais do desafio

## Requisitos

- Node.js 24 (recomendado)
- npm
- Git

## Instalação

Na raiz do projeto:

```bash
npm install
```

## Desenvolvimento

Backend:

```bash
npm run dev:api
```

Frontend (outro terminal):

```bash
npm run dev:web
```

## Build

```bash
npm run build
```

## Estado do projeto

Estrutura inicial em desenvolvimento.

As regras de negócio, a persistência e os testes
serão documentados conforme forem implementados.


## Banco de dados

O projeto utiliza PostgreSQL 17, executado localmente
com Docker Compose.

### Configuração

Na raiz do repositório:

```bash
cp .env.example .env
```

Defina uma senha local em `POSTGRES_PASSWORD`.

### Inicialização

```bash
docker compose up -d db
```

### Verificar o estado

```bash
docker compose ps
```

### Encerrar

```bash
docker compose down
```

O volume persistente é preservado ao encerrar
os containers com `docker compose down`.

### Configurações locais

- Host: `localhost`
- Porta padrão publicada: `5433`
- Database: `medical_scheduling`
- Usuário: `medical_app`

As credenciais são configuradas no arquivo `.env`,
que não deve ser versionado.


## Backend e persistência

A API utiliza NestJS, TypeORM e PostgreSQL.

As configurações de conexão são fornecidas por
variáveis de ambiente e validadas com Zod.

O TypeORM está configurado com sincronização
automática desabilitada. A evolução do schema
será controlada por migrations.

### Testes do backend

Testes unitários:

    npm run test --workspace=backend -- --run

Testes de integração (requerem PostgreSQL):

    docker compose up -d db
    npm run test:e2e --workspace=backend -- --run

### Compilação

    npm run build --workspace=backend


### Importação do catálogo de exames

Após executar as migrations:

    npm run seed:exams --workspace=backend

O comando importa os exames a partir do arquivo
`challenge/dados/exames.csv`.

O seed preserva os IDs originais e pode ser
executado novamente sem duplicar ou sobrescrever
registros existentes.


### Importação de médicos e agendas

Após executar as migrations:

    npm run seed:doctors --workspace=backend

O comando importa os cinco médicos e seus 36 turnos
semanais, conforme o arquivo `challenge/dados/medicos.md`.

As agendas são representadas por dados estruturados
em TypeScript.

O seed é transacional e idempotente, não duplicando
nem sobrescrevendo registros existentes.


### Consultar disponibilidade médica

GET /api/doctors/:id/availability

Parâmetros:
- id: identificador do médico (URL)
- examId: identificador do exame (query)
- date: data YYYY-MM-DD (query)

Exemplo:

    curl "http://localhost:3000/api/doctors/1/availability?examId=17&date=2030-01-07"

Retorna uma lista de horários disponíveis no formato HH:mm.

Os horários são calculados utilizando a duração
do exame, os turnos semanais do médico e os
agendamentos já existentes.

O fuso adotado é America/Sao_Paulo.
```

O ID `1` é apenas ilustrativo; o identificador real deve ser consultado em `/api/doctors`.

## 10. Commit

Depois de confirmar o funcionamento:

```bash
git add backend/src/modules/availability \
  backend/test/availability.e2e-spec.ts \
  README.md

git commit -m "feat: expose medical availability API with validation and e2e tests"

git push
```

## Checklist de conclusão

{@body const checks=["Schema Zod dos parâmetros criado","AvailabilityController implementado","Controller registrado no AvailabilityModule","GET /api/doctors/:id/availability funcionando","IDs e datas inválidas tratados","Horários retornados conforme duração e turnos","Testes E2E passando com PostgreSQL","Build e testes unitários passando","README atualizado","Commit e push realizados"]}
{@body const [done,setDone]=DIL.useState([])}
<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    **Sprint 2 — Task 5**
    <text color="secondary" size="xs" tabularNums>{done.length}/{checks.length}</text>
  </row>
  {#each checks as item}
    <checkbox key={item} checked={done.includes(item)} onChange={v=>setDone(p=>v?[...p,item]:p.filter(x=>x!==item))} lineThrough={false}>{item}</checkbox>
  {/each}
</box>

---

## Próxima etapa — Sprint 3: Agendamento de exames

Quando esta task estiver validada, teremos duas das três funcionalidades principais da API concluídas: busca de exames e consulta de disponibilidade.

A próxima sprint será dedicada à **criação de agendamentos**.

Começaremos isolando os testes de integração em um banco próprio. Depois implementaremos a confirmação de agendamentos, a validação completa das regras de negócio e o tratamento dos conflitos de concorrência.

A prioridade será garantir que dois pacientes não consigam reservar intervalos sobrepostos para o mesmo médico, mesmo com requisições simultâneas.

Por enquanto, implemente apenas a Task 5. Quando você confirmar que os testes e as requisições HTTP passaram, avançaremos.


## Banco de testes

Os testes E2E utilizam uma instância PostgreSQL
isolada do ambiente de desenvolvimento.

### Configuração

Na raiz do repositório:

    cp .env.test.example .env.test

Configure POSTGRES_PASSWORD com a mesma senha
utilizada no .env local.

### Inicializar PostgreSQL de testes

    docker compose --profile test up -d db_test

### Preparar o schema

    NODE_ENV=test npm run migration:run --workspace=backend

### Importar dados de referência

    NODE_ENV=test npm run seed:exams --workspace=backend
    NODE_ENV=test npm run seed:doctors --workspace=backend

### Executar testes E2E

    npm run test:e2e --workspace=backend

O banco de testes utiliza a porta 5434 e o nome
medical_scheduling_test.

Nenhum teste E2E deve modificar os registros do
banco de desenvolvimento.
