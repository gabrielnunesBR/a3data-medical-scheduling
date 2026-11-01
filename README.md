# Agendamento de Exames de Imagem

Aplicação full-stack desenvolvida para o desafio técnico da **A3Data**. Permite pesquisar exames, consultar a agenda de médicos e confirmar agendamentos, com validação de expediente, duração variável e proteção contra reservas sobrepostas.

**Stack:** React + TypeScript (Vite), NestJS + TypeScript e PostgreSQL. O projeto utiliza **Docker Compose** para simplificar a avaliação.

**Para executar e avaliar, siga a [instalação com Docker Compose](#1-execução-rápida-com-docker-compose--recomendada).** O [desenvolvimento local com Node.js e Vite](#8-desenvolvimento-local--opcional) é uma alternativa: não é necessário realizar os dois procedimentos.

### Roteiro de leitura

| Objetivo                                     | Seção                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Clonar, iniciar e verificar a aplicação      | [Execução rápida](#1-execução-rápida-com-docker-compose--recomendada)                                 |
| Conhecer a interface e as funcionalidades    | [Visão da aplicação](#2-visão-da-aplicação) · [Funcionalidades](#3-funcionalidades-implementadas)     |
| Entender as decisões técnicas e as premissas | [Resumo da arquitetura](#4-arquitetura-e-premissas) · [Detalhes de arquitetura](docs/architecture.md) |
| Encontrar código e testes                    | [Estrutura do projeto](#5-estrutura-do-projeto)                                                       |
| Executar testes e consultar o CI             | [Testes](#6-testes-e-qualidade) · [Guia completo de testes](docs/testing.md)                          |
| Explorar Swagger, Postman e exemplos HTTP    | [API REST](#7-api-rest) · [Referência completa](docs/api.md)                                          |
| Executar React/NestJS diretamente            | [Desenvolvimento local — opcional](#8-desenvolvimento-local--opcional)                                |
| Ver o que ficou fora do escopo               | [Limitações](#9-limitações-e-próximos-passos)                                                         |

---

## 1. Execução rápida com Docker Compose — recomendada

Este é o **caminho recomendado para avaliar o projeto**. Ele inicia o frontend React, a API NestJS e o PostgreSQL sem exigir instalação de Node.js ou npm na máquina. Requer apenas **Git, Docker Engine e Docker Compose** para subir a aplicação. **Não é necessário seguir também a seção de desenvolvimento local com Node.js e Vite.**

### 1. Clonar o repositório

```bash
git clone https://github.com/gabrielnunesBR/a3data-medical-scheduling.git
cd a3data-medical-scheduling
```

### 2. Configurar o ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e defina uma senha local para `POSTGRES_PASSWORD`. Não versione esse arquivo nem compartilhe credenciais. O Compose configura automaticamente a comunicação interna dos containers; não é necessário alterar `POSTGRES_HOST` para `db` no `.env` usado pelo desenvolvimento local.

### 3. Construir e iniciar a aplicação

```bash
docker compose up -d --build
```

O Compose aguarda o PostgreSQL ficar saudável, executa as **3 migrations** e importa **30 exames, 5 médicos e 36 turnos** antes de disponibilizar a API e o frontend.

Verifique o estado dos serviços:

```bash
docker compose ps -a
```

O esperado é `db`, `api` e `web` como **healthy** e `db-init` como **exited (0)**. O `db-init` é uma tarefa de preparação de execução única, não um serviço que precisa permanecer ativo. O banco `db_test` não sobe na execução padrão, pois está no perfil `test`.

| Serviço                   | Endereço padrão                    |
| ------------------------- | ---------------------------------- |
| Aplicação React (Nginx)   | `http://localhost:8080`            |
| Swagger / OpenAPI         | `http://localhost:8080/api/docs`   |
| Health check              | `http://localhost:8080/api/health` |
| PostgreSQL (acesso local) | `127.0.0.1:5433`                   |

**Agora abra `http://localhost:8080` e faça um agendamento pela interface.** A API não publica a porta `3000` no host: o Nginx encaminha as requisições `/api` pela rede interna do Docker. Para alterar a porta da aplicação, defina `WEB_PORT` no `.env` (por exemplo, `WEB_PORT=8081`). A porta local do banco continua configurável por `POSTGRES_PORT`.

**Rotas:** a interface de agendamento está na raiz (`/`); o Swagger fica em **`/api/docs`**, e não em `/docs`. Endereços desconhecidos, como `/docs`, exibem a página 404 do projeto (com status HTTP `404` no Nginx). As rotas `/api/*` continuam sendo tratadas pela API NestJS.

### 4. Conferir a execução (smoke test)

Com os containers ativos, execute na raiz do repositório:

```bash
bash scripts/docker-smoke.sh
```

O script verifica a conclusão do `db-init`, o health check da API, a entrega do HTML React pelo Nginx, o Swagger em `/api/docs`, o HTTP 404 para URLs desconhecidas e a presença de **30 exames** e **5 médicos**. Não cria agendamentos. Para executá-lo manualmente, o computador também precisa de Bash, `curl` e Python 3; essas ferramentas não são necessárias apenas para abrir a aplicação pelo Docker. O mesmo smoke test é executado automaticamente no GitHub Actions.

Se você alterou `WEB_PORT` no `.env`, informe a mesma porta ao smoke test. Por exemplo, para `WEB_PORT=8081`:

```bash
SMOKE_BASE_URL=http://127.0.0.1:8081 bash scripts/docker-smoke.sh
```

O script usa `http://127.0.0.1:8080` por padrão e **não lê automaticamente** `WEB_PORT` do arquivo `.env`.

### Logs e encerramento (opcional)

```bash
docker compose logs --tail=100 db-init api web
docker compose down
```

O comando `docker compose down` preserva os volumes e os dados do PostgreSQL. Para **reinicialização destrutiva** do ambiente local (inclusive os dados do banco de testes), use somente se tiver certeza de que deseja apagar os dados:

```bash
docker compose --profile test down --remove-orphans --volumes
```

> **Escopo de execução:** este Compose facilita a avaliação local e usa HTTP em `127.0.0.1`; não representa um deploy público pronto para produção. O backend confia no único Nginx configurado como proxy (`TRUST_PROXY_HOPS=1`). Uma implantação pública exigiria revisar a cadeia de proxies, configurar HTTPS, gerenciamento de segredos e demais controles de produção.

## 2. Visão da aplicação

### Desktop — seleção de médico, data e horário

![Interface desktop com seleção de médico, calendário e horários de agendamento](docs/screenshots/app-desktop-booking.png)

### Mobile — revisão e confirmação

<table>
  <tr>
    <td align="center" valign="top" width="50%">
      <img src="docs/screenshots/app-mobile-review.png" width="260" alt="Revisão do agendamento no mobile">
    </td>
    <td align="center" valign="top" width="50%">
      <img src="docs/screenshots/app-mobile-success.png" width="260" alt="Confirmação do agendamento no mobile">
    </td>
  </tr>
</table>

### Swagger — documentação interativa da API

![Swagger UI com os cinco endpoints documentados da API de agendamento](docs/screenshots/api-swagger.png)

A documentação interativa da API está disponível em [`http://localhost:8080/api/docs`](http://localhost:8080/api/docs) com Docker Compose completo ou em [`http://localhost:3000/api/docs`](http://localhost:3000/api/docs) com o backend executado localmente.

As capturas mostram a interface para o paciente e a documentação interativa da API. As imagens são demonstrativas; o fluxo pode ser experimentado pelo navegador após iniciar o Compose.

## 3. Funcionalidades implementadas

- Busca de exames por nome, ignorando maiúsculas, minúsculas e acentos, com indicação da duração do procedimento.
- Listagem de médicos e consulta da disponibilidade por data e exame, com bloqueio de dias sem expediente no calendário.
- Agendamento com nome do paciente, médico, exame e horário selecionado.
- Validação de expediente, duração, horários passados e conflitos de reserva.
- Proteção contra agendamentos simultâneos sobrepostos no PostgreSQL.
- Fluxo web responsivo em **português brasileiro**, com revisão e confirmação do agendamento.
- Comprovante na tela de sucesso com opção de imprimir/salvar em PDF pelo navegador e copiar o número da reserva.
- Exportação pontual do compromisso para o Google Calendar (link pré-preenchido) ou arquivo `.ics` compatível com outros calendários.
- Limitação de requisições ao endpoint público de criação de agendamentos.
- Suporte a chaves de idempotência para recuperar reservas já confirmadas sem duplicá-las.
- Endpoint de saúde da API com verificação de conectividade do PostgreSQL.
- Documentação interativa Swagger e coleção de requisições Postman/Insomnia.
- Logs HTTP estruturados e identificação de requisições para diagnóstico.
- Página 404 responsiva para endereços inválidos, com retorno ao agendamento.

O comprovante pode ser impresso ou salvo como PDF **após a confirmação**, enquanto a tela de sucesso
estiver aberta. Não há consulta pública de comprovantes por número do agendamento; a aplicação não oferece
recuperação após recarregar a página.

A exportação para calendário também fica disponível **após a confirmação**, enquanto a tela de sucesso
estiver aberta. O Google Calendar abre uma nova guia com os dados do evento preenchidos, mas o paciente
deve confirmar o salvamento. O arquivo `.ics` pode ser importado em aplicativos compatíveis. Por privacidade,
o evento utiliza um título genérico e não inclui nome do paciente nem tipo de exame. A exportação não
cria sincronização contínua com o agendamento.

## 4. Arquitetura e premissas

O projeto usa **monorepo com npm Workspaces** (`backend/` e `frontend/`). O Nginx serve a aplicação React e encaminha `/api` ao NestJS; o backend valida as regras de agenda e persiste os agendamentos no PostgreSQL. O React não grava diretamente no banco.

| Decisão                            | Justificativa                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| **NestJS + PostgreSQL**            | Regras de negócio centralizadas na API e integridade transacional.                 |
| **Restrição GiST no banco**        | Impede horários sobrepostos do mesmo médico, inclusive em requisições simultâneas. |
| **Chaves de idempotência**         | Permitem recuperar a mesma reserva quando uma resposta à criação é inconclusiva.   |
| **TypeORM + migrations**           | Schema versionado, com `synchronize: false`.                                       |
| **React + Vite + TanStack Query**  | SPA simples, consultas remotas e invalidação de disponibilidade.                   |
| **Fuso `America/Sao_Paulo`**       | Horários exibidos no fuso da clínica; instantes serializados com fuso explícito.   |
| **Docker multi-stage + `db-init`** | Builds separados; migrations e seeds automáticos antes da API.                     |

**Premissas:** todos os cinco médicos realizam qualquer um dos 30 exames; os turnos são semanais e não contemplam feriados, férias ou afastamentos. Os slots são gerados a partir do início de cada turno, em passos iguais à duração de cada exame (20, 30 ou 40 minutos). O horário deve caber integralmente no turno, não estar no passado e não conflitar com outra reserva. Dias sem expediente são desabilitados no calendário, mas um dia com expediente continua selecionável mesmo sem vagas.

**Confiabilidade:** o backend revalida a disponibilidade na confirmação; a restrição GiST protege contra concorrência. O frontend preserva a chave de idempotência em tentativas da mesma operação enquanto a tela permanece montada. O timeout de 15 segundos **não cancela** uma reserva já confirmada no servidor.

Para detalhes de módulos, concorrência, segurança, observabilidade, versões Docker e decisões de produção, consulte **[Arquitetura e decisões técnicas](docs/architecture.md)**. As escolhas de design e acessibilidade estão em **[Decisões UX/UI](docs/ux-ui-decisions.md)**.

## 5. Estrutura do projeto

Árvore resumida dos principais diretórios e arquivos usados na avaliação:

```text
a3data-medical-scheduling/
├── backend/                              # API NestJS
│   ├── src/
│   │   ├── config/                       # Ambiente, segurança, logs e Swagger
│   │   ├── database/                     # Migrations, seeds e conexão TypeORM
│   │   └── modules/
│   │       ├── appointments/             # Criação de reservas, concorrência e idempotência
│   │       ├── availability/             # Geração e filtragem de horários disponíveis
│   │       ├── doctors/                  # Médicos e turnos de atendimento
│   │       ├── exams/                    # Catálogo e busca de exames
│   │       └── health/                   # Verificação de conectividade da API
│   ├── test/                             # Testes E2E HTTP com PostgreSQL
│   └── Dockerfile                        # Build da API e runtime Node.js
├── frontend/                             # SPA React + TypeScript
│   ├── src/
│   │   ├── components/                  # Componentes compartilhados e cabeçalho
│   │   ├── features/
│   │   │   ├── booking/                 # Etapas de agendamento e regras da interface
│   │   │   └── exams/                   # Busca e seleção de exames
│   │   ├── test/                        # Configuração e mocks de testes
│   │   ├── App.tsx                      # Fluxo principal de agendamento
│   │   ├── main.tsx                     # Entrada React e seleção entre aplicação e 404
│   │   └── not-found.tsx                # Página 404 personalizada
│   ├── e2e/                              # Testes Playwright, incluindo rotas inválidas
│   ├── public/                           # Ícones e recursos estáticos
│   ├── index.html                        # Metadados e ícones do navegador
│   ├── nginx.conf                        # SPA, proxy /api e tratamento HTTP 404
│   └── Dockerfile                        # Build React e runtime Nginx
├── challenge/                            # Enunciado e dados originais
│   └── dados/
│       ├── exames.csv                   # Fonte dos 30 exames
│       └── medicos.md                   # Fonte dos 5 médicos e 36 turnos
├── docs/
│   ├── architecture.md                  # Arquitetura, segurança e limitações
│   ├── testing.md                       # Testes, E2E e CI
│   ├── api.md                           # Contratos HTTP e exemplos curl
│   ├── ux-ui-decisions.md               # Design system e decisões UX/UI
│   ├── postman/
│   │   └── medical-scheduling.postman_collection.json
│   └── screenshots/                      # Capturas desktop, mobile e Swagger
├── scripts/
│   └── docker-smoke.sh                  # Validação operacional do Compose
├── .github/workflows/
│   └── ci.yml                           # Qualidade, testes E2E e Docker smoke
├── .dockerignore                        # Exclui arquivos desnecessários do build Docker
├── .env.example                         # Configuração local de exemplo
├── .env.test.example                    # Configuração de testes de exemplo
├── compose.yaml                         # Serviços e perfil isolado de testes
├── package.json                         # Monorepo npm Workspaces
├── package-lock.json                    # Dependências reproduzíveis
└── README.md                            # Guia principal para o avaliador
```

As diretrizes sobre acessibilidade, tipografia, cores, componentes e jornada do paciente estão documentadas em [`docs/ux-ui-decisions.md`](docs/ux-ui-decisions.md). O [enunciado e os arquivos originais do desafio](challenge/) foram preservados no repositório.

## 6. Testes e qualidade

Os testes cobrem regras de negócio, validação HTTP, concorrência real no PostgreSQL, idempotência, componentes React, jornada Playwright, acessibilidade e inicialização pelo Docker. O CI possui **três jobs**: qualidade/unitários, integração PostgreSQL/Playwright e smoke test Docker.

**Para reproduzir os testes localmente**, instale Node.js 24 e npm. Na raiz do repositório, com `.env` configurado conforme a [seção 1](#1-execução-rápida-com-docker-compose--recomendada):

```bash
npm ci
npm run test --workspace=backend -- --run
npm run test --workspace=frontend -- --run
npm run build
npm run lint --workspace=backend
npm run lint --workspace=frontend
npx prettier . --check
```

**Testes E2E de API e navegador:** exigem o banco de testes isolado e a preparação de migrations e seeds. Siga o procedimento completo em **[Testes e integração contínua](docs/testing.md)** antes de executar:

```bash
npm run test:e2e --workspace=backend -- --run
npm exec --workspace=frontend -- playwright install chromium
npm run test:browser --workspace=frontend
```

Os E2E utilizam o PostgreSQL de testes na porta `5434`; o Playwright inicia a API em `3100` e o frontend em `5174`. Os testes automatizados de acessibilidade não substituem uma auditoria manual.

## 7. API REST

Os endereços abaixo utilizam o **Docker Compose recomendado**, em `http://localhost:8080`. Ao executar diretamente o NestJS, utilize a porta `3000`.

| Método | Rota                                                | Finalidade                                                |
| ------ | --------------------------------------------------- | --------------------------------------------------------- |
| `GET`  | `/api/exams?search=...`                             | Pesquisar exames (sem distinção de caixa ou acentos)      |
| `GET`  | `/api/doctors`                                      | Listar médicos e `workingWeekdays` (1=segunda, 7=domingo) |
| `GET`  | `/api/doctors/:id/availability?examId=...&date=...` | Consultar horários livres                                 |
| `POST` | `/api/appointments`                                 | Criar agendamento; aceita `Idempotency-Key` opcional      |
| `GET`  | `/api/health`                                       | Verificar conectividade com PostgreSQL                    |

**Swagger:** `http://localhost:8080/api/docs` · **OpenAPI JSON:** `http://localhost:8080/api/openapi.json`.

**Postman/Insomnia:** [coleção pronta para importação](docs/postman/medical-scheduling.postman_collection.json). A variável `baseUrl` usa `http://localhost:8080` com Docker; se executar a API diretamente, altere-a para `http://localhost:3000`.

Exemplos para conferir a API:

```bash
curl "http://localhost:8080/api/exams?search=cranio"
curl "http://localhost:8080/api/doctors"
curl "http://localhost:8080/api/doctors/1/availability?examId=17&date=2030-01-07"
```

Para os payloads de criação, códigos HTTP, regras de idempotência, exemplos de resposta e instruções do Postman, consulte **[Referência completa da API](docs/api.md)**. **A execução de `POST /api/appointments` cria uma reserva real** no banco configurado.

## 8. Desenvolvimento local — opcional

**Esta seção é alternativa ao Docker completo.** Se já executou `docker compose up -d --build`, pode ignorá-la. Para este fluxo, são necessários Git, **Node.js 24**, npm e Docker Compose (para o PostgreSQL).

Na raiz do repositório clonado conforme a [seção 1](#1-execução-rápida-com-docker-compose--recomendada):

```bash
npm ci
cp .env.example .env
# Defina POSTGRES_PASSWORD no arquivo .env
docker compose up -d db
npm run migration:run --workspace=backend
npm run seed:exams --workspace=backend
npm run seed:doctors --workspace=backend
```

A partir daí, inicie os serviços **em dois terminais separados**, na raiz do projeto:

```bash
# Terminal 1 — API NestJS
npm run dev:api
```

```bash
# Terminal 2 — interface React / Vite
npm run dev:web
```

| Serviço          | Endereço padrão                                            |
| ---------------- | ---------------------------------------------------------- |
| React / Vite     | `http://localhost:5173`                                    |
| NestJS e Swagger | `http://localhost:3000` · `http://localhost:3000/api/docs` |
| PostgreSQL       | `127.0.0.1:5433`                                           |

O Vite encaminha `/api` ao NestJS por proxy local. Para compilar ambos os workspaces, use `npm run build`. Este fluxo não exige executar também os containers `api` e `web`.

## 9. Limitações e próximos passos

O projeto foi desenvolvido para **avaliação técnica local**, não para atender pacientes reais em produção. Permaneceram fora do escopo: autenticação/autorização; consulta de histórico, cancelamento e reagendamento; exceções para feriados, férias e afastamentos; notificações por e-mail ou SMS; painel administrativo; e implantação pública.

**Recuperação após recarregar a página:** a chave de idempotência é persistida no PostgreSQL, mas mantida **somente em memória no React**. Em caso de resposta inconclusiva, a mesma operação pode ser repetida enquanto a tela de confirmação estiver montada; após recarregar a página, essa recuperação pelo frontend não está disponível. A proteção contra sobreposições permanece válida.

**Em produção**, seriam necessários autenticação, controles de acesso e privacidade/LGPD, HTTPS, gerenciamento de segredos, backups, monitoramento e rate limiting compartilhado para múltiplas instâncias. A aplicação atual utiliza rate limiting em memória, suficiente apenas para o cenário de instância única deste desafio.

Consulte [Arquitetura — limitações e considerações para produção](docs/architecture.md#limitações-e-considerações-para-produção) para a discussão completa. O [enunciado e os dados originais](challenge/) estão preservados no repositório.

---

Projeto desenvolvido como parte do desafio técnico da **A3Data**.
