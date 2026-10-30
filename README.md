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
