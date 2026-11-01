# Agendamento de Exames de Imagem

Aplicação full-stack desenvolvida para o desafio técnico da **A3Data**. Permite pesquisar exames de imagem, selecionar um médico, consultar horários disponíveis e confirmar agendamentos, respeitando os turnos de atendimento e impedindo reservas sobrepostas.

O projeto contém **frontend React, API NestJS e PostgreSQL**, além de testes automatizados e um ambiente reproduzível com Docker Compose.

**Para avaliar a aplicação, siga apenas a [execução rápida com Docker Compose](#1-execução-rápida-com-docker-compose--recomendada).** O [desenvolvimento local com Node.js e Vite](#8-desenvolvimento-local--fluxo-alternativo-opcional) é uma alternativa **opcional** e não precisa ser executada após o Docker.

### Roteiro de leitura

| Quero...                                         | Onde encontrar                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **Clonar, iniciar e acessar o projeto**          | [Execução rápida com Docker](#1-execução-rápida-com-docker-compose--recomendada)       |
| **Conferir se está funcionando**                 | [Smoke test Docker](#4-conferir-a-execução-smoke-test)                                 |
| **Conhecer o que foi implementado**              | [Funcionalidades](#3-funcionalidades-implementadas)                                    |
| **Entender as escolhas técnicas e seus motivos** | [Arquitetura e decisões](#4-arquitetura-e-decisões-técnicas--por-que-desenhamos-assim) |
| **Localizar código e testes**                    | [Estrutura do projeto](#5-estrutura-do-projeto--onde-encontrar-cada-responsabilidade)  |
| **Rodar testes e conferir o CI**                 | [Testes e qualidade](#6-testes-e-qualidade--o-que-foi-verificado-e-como-reproduzir)    |
| **Explorar endpoints e coleção Postman**         | [API REST](#7-api-rest--exemplos-para-docker)                                          |
| **Executar sem o frontend Docker**               | [Desenvolvimento local opcional](#8-desenvolvimento-local--fluxo-alternativo-opcional) |

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

### 4. Conferir a execução (smoke test)

Com os containers ativos, execute na raiz do repositório:

```bash
bash scripts/docker-smoke.sh
```

O script verifica a conclusão do `db-init`, o health check da API, a entrega do HTML React pelo Nginx e a presença de **30 exames** e **5 médicos**. Não cria agendamentos. Para executá-lo manualmente, o computador também precisa de Bash, `curl` e Python 3; essas ferramentas não são necessárias apenas para abrir a aplicação pelo Docker. O mesmo smoke test é executado automaticamente no GitHub Actions.

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

O comprovante pode ser impresso ou salvo como PDF **após a confirmação**, enquanto a tela de sucesso
estiver aberta. Não há consulta pública de comprovantes por número do agendamento; a aplicação não oferece
recuperação após recarregar a página.

A exportação para calendário também fica disponível **após a confirmação**, enquanto a tela de sucesso
estiver aberta. O Google Calendar abre uma nova guia com os dados do evento preenchidos, mas o paciente
deve confirmar o salvamento. O arquivo `.ics` pode ser importado em aplicativos compatíveis. Por privacidade,
o evento utiliza um título genérico e não inclui nome do paciente nem tipo de exame. A exportação não
cria sincronização contínua com o agendamento.

## 4. Arquitetura e decisões técnicas — por que desenhamos assim

O projeto utiliza um **monorepo com npm Workspaces**, separando a API NestJS (`backend/`) da interface React (`frontend/`). Essa organização permite manter as duas aplicações e seus testes no mesmo repositório, com dependências e comandos de execução próprios.

### Principais decisões e justificativas

| Decisão                                           | Motivo e consequência                                                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo com npm Workspaces**                   | Mantém frontend e backend no mesmo repositório, com scripts, dependências e CI reproduzíveis.                                                                          |
| **NestJS como fonte de verdade**                  | Valida expediente, duração, disponibilidade e criação de reservas no servidor; o React não decide se um horário pode ser persistido.                                   |
| **PostgreSQL com restrição GiST**                 | Impede intervalos sobrepostos para o mesmo médico mesmo com requisições simultâneas, independentemente de verificações prévias na API.                                 |
| **Idempotência persistida no banco**              | Evita duplicação em reenvios da mesma operação; chave UUID opcional e controle transacional, sem confundir idempotência com autenticação.                              |
| **TypeORM com migrations e `synchronize: false`** | Evolução explícita e auditável do schema, sem alteração automática de tabelas durante a inicialização da API.                                                          |
| **`America/Sao_Paulo` e instantes UTC**           | Mostra horários no fuso da clínica e mantém timestamps com fuso explícito entre backend, banco e frontend.                                                             |
| **Seeds idempotentes**                            | Repetir a preparação do ambiente não duplica exames, médicos nem turnos.                                                                                               |
| **React SPA e TanStack Query**                    | Separa estado de navegação e dados remotos, com invalidação da disponibilidade após conflitos; não introduz SSR desnecessário.                                         |
| **Nginx como entrada do Compose**                 | Serve o frontend compilado e encaminha `/api` para o NestJS sem publicar a porta da API; o backend confia no único proxy configurado (`TRUST_PROXY_HOPS=1`).           |
| **Builds Docker multi-stage e `db-init`**         | Separam compilação de execução, iniciam a API depois de migrations/seeds e evitam manter a CLI global do npm no runtime do backend.                                    |
| **Logs, Request ID e rate limiting**              | Facilitam diagnóstico sem registrar nomes de pacientes nos logs HTTP e limitam o endpoint de criação; a contagem em memória é adequada apenas à instância única atual. |
| **Sem autenticação e serviços adicionais**        | Mantém o escopo do desafio e a instalação simples; um produto público exigiria autenticação, controles de dados pessoais, HTTPS, segredos e operação distribuída.      |

As decisões de interface, acessibilidade e design system estão detalhadas em [`docs/ux-ui-decisions.md`](docs/ux-ui-decisions.md). As regras de concorrência, idempotência e limites de produção são desenvolvidas nas seções seguintes.

### Como as partes trabalham juntas

No Docker Compose, o **Nginx** é a entrada única: entrega a SPA React e encaminha as chamadas de `/api` para o NestJS. A API consulta o PostgreSQL, aplica as regras de agenda e persiste as reservas. **O frontend não grava diretamente no banco**, e os agendamentos não são controlados apenas pelo estado da interface.

A integridade tem duas camadas complementares: o serviço revalida disponibilidade e a restrição de exclusão **GiST no PostgreSQL** rejeita intervalos sobrepostos mesmo quando duas requisições chegam juntas. A **idempotência** resolve outro problema: se o usuário não receber a resposta após criar a reserva, pode repetir a mesma operação sem duplicá-la. O timeout de 15 segundos do frontend **encerra a espera**, mas não desfaz uma reserva já registrada. Por isso, a próxima tentativa mantém a mesma chave para os mesmos dados.

O `db-init` prepara o banco automaticamente com migrations e seeds antes da API. Assim, quem avalia não precisa executar comandos manuais de banco no fluxo principal. O monorepo concentra código, documentação e CI em um único repositório, enquanto os serviços mantêm **processos, builds e containers independentes**.

### Backend

- **NestJS e TypeScript:** organização por módulos, injeção de dependências e separação entre controllers, services e regras de negócio.
- **PostgreSQL:** persistência relacional e garantias de integridade transacional. A _exclusion constraint_ GiST impede agendamentos sobrepostos para um mesmo médico, inclusive sob concorrência.
- **TypeORM:** mapeamento das entidades e evolução do schema por migrations, mantendo `synchronize: false`.
- **Zod:** validação dos dados recebidos pela API.
- **Luxon:** tratamento de instantes, datas e fuso horário da clínica.
- **OpenAPI/Swagger:** contratos HTTP derivados dos schemas Zod e complementados com respostas, descrições e exemplos.
- **Observabilidade básica:** logs HTTP estruturados em JSON, `X-Request-ID` por requisição e sanitização de exceções inesperadas.
- **Health check:** consulta `SELECT 1` ao PostgreSQL, com retorno `503` quando a verificação falha após a aplicação estar iniciada.

### Frontend

- **React, TypeScript e Vite:** aplicação de página única com inicialização rápida em desenvolvimento, sem necessidade de renderização no servidor para o fluxo solicitado.
- **Identidade visual:** favicon com o mesmo símbolo `ScanLine` do cabeçalho e as cores do design system, sem marca fictícia de clínica.
- **TanStack Query:** consultas, cache, invalidação e atualização da disponibilidade.
- **React Hook Form e Zod:** gerenciamento e validação do formulário de confirmação.
- **Tailwind CSS:** estilização responsiva, com componentes e padrões visuais próprios do projeto.
- **React DayPicker:** seleção de datas considerando o fuso horário da clínica. O calendário acompanha a virada do dia em `America/Sao_Paulo`, mesmo depois que uma aba suspensa volta ao primeiro plano.

O fluxo é dividido em seleção de exame, escolha de médico/data/horário, revisão e confirmação, e apresentação do resultado. As diretrizes visuais e de acessibilidade estão descritas em [`docs/ux-ui-decisions.md`](docs/ux-ui-decisions.md).

### Premissas adotadas

- Todos os médicos podem realizar todos os exames fornecidos no desafio.
- Os turnos representam agendas semanais recorrentes; não foram fornecidas exceções específicas para férias, feriados ou afastamentos. O calendário desabilita datas passadas e dias da semana sem expediente do médico, mas permite selecionar datas com expediente mesmo quando todos os horários estão ocupados.
- Cada exame ocupa integralmente a duração informada no catálogo.
- Os horários candidatos são gerados a partir do **início de cada turno**, em intervalos iguais à duração do exame, sem ultrapassar o fim do expediente.
- O fuso horário da clínica é `America/Sao_Paulo`. Os instantes são transmitidos com indicação explícita de fuso e podem ser persistidos ou serializados em UTC.
- O horário de término é calculado exclusivamente no backend.
- O frontend utiliza o proxy `/api` do Vite durante o desenvolvimento; no Docker Compose, o Nginx encaminha `/api` para a API na rede interna.

### Tecnologias utilizadas

| Camada                         | Tecnologias                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Backend                        | Node.js 24, NestJS, TypeScript, TypeORM, OpenAPI/Swagger                                |
| Banco de dados                 | PostgreSQL 17                                                                           |
| Validação e datas              | Zod, Luxon                                                                              |
| Frontend                       | React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form, React DayPicker |
| Testes do backend              | Vitest, Supertest                                                                       |
| Testes do frontend             | Vitest, React Testing Library, MSW, Playwright (Chromium), axe-core                     |
| Infraestrutura                 | Docker Compose, Nginx, npm Workspaces, GitHub Actions                                   |
| Documentação e observabilidade | Swagger UI, coleção Postman/Insomnia, logs JSON e Request ID                            |

### Regras de negócio e integridade

- Cada exame possui uma duração utilizada para gerar os horários possíveis.
- A grade é calculada **a partir do início de cada turno**, em incrementos iguais à duração do exame.
- O exame deve caber integralmente dentro do turno.
- Horários passados ou fora do expediente não podem ser reservados.
- Todos os médicos cadastrados podem realizar todos os exames do desafio.
- A disponibilidade é revalidada no momento da confirmação, pois pode mudar após a consulta.
- Dois agendamentos do **mesmo médico** não podem possuir intervalos sobrepostos.
- **Médicos diferentes** podem atender simultaneamente.
- Agendamentos consecutivos são permitidos, desde que não haja sobreposição.

#### Concorrência no PostgreSQL

Além das validações da aplicação, a tabela `appointments` utiliza uma **exclusion constraint GiST**:

```sql
EXCLUDE USING GIST (
  doctor_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
```

Ela impede que duas requisições concorrentes confirmem horários conflitantes para o mesmo médico. O PostgreSQL retorna SQLSTATE `23P01` quando a restrição é violada, e a API converte o erro em `409 Conflict`. Um deadlock detectado durante a operação (`40P01`) é tratado como `503 Service Unavailable`, com código `BOOKING_TEMPORARILY_UNAVAILABLE`. A transação é revertida pelo PostgreSQL; não há retry automático dentro dela. O cliente pode tentar novamente com os mesmos dados e a mesma chave de idempotência.

A tabela também possui `CHECK (start_at < end_at)`, impedindo intervalos com duração nula ou negativa.

### Segurança e confiabilidade

#### Logs estruturados, Request ID e exceções seguras

A API produz logs HTTP em JSON, com método, padrão de rota, status de resposta, duração e identificador `requestId`. O mesmo UUID gerado pelo servidor é devolvido no header `X-Request-ID`, inclusive em respostas HTTP de erro. IDs enviados pelo cliente não são utilizados como identificadores confiáveis.

```bash
curl -i "http://localhost:8080/api/health"
```

A instrumentação HTTP não registra o corpo das requisições, parâmetros de URL completos, headers de autenticação ou nomes dos pacientes. O filtro global preserva respostas de erro HTTP esperadas (como 400, 409 e 422) e, para exceções inesperadas, registra somente o `requestId` e uma categoria genérica; a resposta permanece `500 Internal server error`. Isso evita que SQL, parâmetros da consulta e stack traces dessas exceções sejam registrados pelo tratamento HTTP padrão.

Essa medida **não representa uma auditoria de todos os logs de dependências ou da inicialização da aplicação**. Em produção, seriam necessários controles adicionais de retenção, acesso e tratamento de dados pessoais.

#### Cabeçalhos HTTP de segurança

A API utiliza os cabeçalhos HTTP de segurança nativos do NestJS para reforçar a proteção das respostas. Entre as proteções estão:

- `Content-Security-Policy`;
- `X-Content-Type-Options`;
- `X-Frame-Options`;
- `Referrer-Policy`;
- remoção do cabeçalho `X-Powered-By`.

Esses cabeçalhos são aplicados às respostas de sucesso e também às respostas de erro. A configuração exige NestJS 12.1 ou superior e o registro de `app.useSecurityHeaders()` antes da inicialização da aplicação.

O frontend utiliza o proxy `/api` no ambiente de desenvolvimento. Configurações de CORS e proxies devem ser adaptadas às origens e à infraestrutura da implantação; os cabeçalhos descritos acima se referem à **API**, não ao servidor de desenvolvimento do Vite.

#### Proteção contra excesso de requisições

Na confirmação, o frontend limita a espera da requisição a **15 segundos**. Se ocorrer timeout, o resultado pode ser desconhecido; por isso, uma nova tentativa com os mesmos dados reutiliza a mesma chave de idempotência. O timeout não cancela nem desfaz uma reserva que já tenha sido confirmada no servidor.

O endpoint `POST /api/appointments` utiliza `@nestjs/throttler` para aplicar **20 requisições por minuto por endereço IP**. Ao exceder o limite, retorna `429 Too Many Requests`. Os endpoints de consulta não recebem esse limite nesta configuração.

O contador atual utiliza armazenamento **em memória**, adequado ao ambiente do desafio com uma única instância. Uma implantação distribuída exigiria armazenamento compartilhado ou rate limiting na infraestrutura. Atrás de um reverse proxy, a identificação do IP precisa considerar apenas proxies confiáveis.

Essa proteção reduz abuso, mas não substitui mecanismos de verificação de identidade, controle de acesso ou prevenção de reservas fraudulentas em uma aplicação real.

### Imagens Docker e versionamento

O Compose constrói as imagens do projeto com a tag **`0.1.0`** por padrão:

```text
a3data-medical-backend:0.1.0
a3data-medical-web:0.1.0
```

Os Dockerfiles utilizam imagens-base por tags: `node:24-bookworm-slim` para a compilação e execução do backend e para a compilação do frontend; e `nginx:stable-alpine` para servir a aplicação React. Essas tags podem receber atualizações e, portanto, builds feitos em datas diferentes podem utilizar revisões distintas das imagens oficiais. O PostgreSQL no Compose também utiliza uma tag atualizável: `postgres:17`. Para uma implantação que exija maior reprodutibilidade, seria possível fixar as imagens-base por digests OCI e revisar esses digests periodicamente.

A versão `0.1.0` também identifica o projeto, os workspaces e a documentação OpenAPI. Se quiser identificar outra versão das imagens, acrescente `IMAGE_TAG=0.2.0` ao `.env` antes de construir. Essa variável **altera apenas as tags das imagens construídas localmente**, sem modificar automaticamente a versão do código nem publicar nada em um registry. Um deploy real utilizaria imagens previamente testadas e publicadas, preferencialmente referenciadas por digest imutável.

## 5. Estrutura do projeto — onde encontrar cada responsabilidade

A árvore abaixo apresenta os diretórios de interesse para avaliação e manutenção. Ela é **resumida**: arquivos internos de implementação e configuração foram omitidos intencionalmente.

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
│   │   ├── components/                  # Componentes compartilhados
│   │   ├── features/
│   │   │   ├── booking/                 # Etapas de agendamento e regras da interface
│   │   │   └── exams/                   # Busca e seleção de exames
│   │   └── test/                        # Configuração e mocks de testes
│   ├── e2e/                              # Testes Playwright no Chromium
│   ├── public/                           # favicon.svg, favicon.ico, apple-touch-icon.png
│   ├── index.html                        # Metadados e ícones do navegador
│   ├── nginx.conf                        # SPA e proxy reverso /api
│   └── Dockerfile                        # Build React e runtime Nginx
├── challenge/                            # Enunciado e dados originais
│   └── dados/
│       ├── exames.csv                   # Fonte dos 30 exames
│       └── medicos.md                   # Fonte dos 5 médicos e 36 turnos
├── docs/
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

## 6. Testes e qualidade — o que foi verificado e como reproduzir

### Visão geral da cobertura

A suíte automatizada cobre **regras de negócio, API, interface e inicialização da infraestrutura**, não apenas cenários de sucesso. O mapa abaixo resume as verificações implementadas; comandos e detalhes estão em [Comandos de testes](#como-reproduzir-os-testes-automatizados) e [GitHub Actions](#github-actions--integração-contínua).

| Camada                                | Principais cenários verificados                                                                                                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unitários — backend**               | Geração de horários a partir dos turnos, duração dos exames, filtragem de horários ocupados, validação de agendamentos, idempotência, tratamento de erros, configuração de ambiente, saúde da API e logs.                    |
| **Componentes — frontend**            | Busca e seleção de exames, escolha de profissional/data/horário, limpeza de seleções dependentes, validação do paciente, tratamento de conflitos e estados de erro, comprovante e ações de calendário.                       |
| **Integração HTTP — PostgreSQL real** | Endpoints de exames, médicos, disponibilidade e agendamentos; migrations e integridade dos dados; concorrência e exclusão GiST; idempotência, rate limiting, health check, cabeçalhos de segurança e contrato OpenAPI.       |
| **E2E — Playwright**                  | Jornada de agendamento no Chromium, revisão, confirmação, recuperação de falha de resposta, conflitos `409`, impressão/comprovante, download `.ics`, responsividade, teclado e verificações automatizadas de acessibilidade. |
| **Smoke test — Docker Compose**       | Build e inicialização do stack, conclusão do `db-init`, health check da API, frontend servido pelo Nginx e presença dos 30 exames e cinco médicos.                                                                           |
| **Qualidade e CI**                    | Prettier, Oxlint, checagem TypeScript, builds e execução das suítes em três jobs independentes do GitHub Actions.                                                                                                            |

**Cobertura funcional não equivale a percentual de cobertura de linhas ou branches.** O projeto fornece um comando para gerar relatório de cobertura do backend, mas não declara um percentual global sem medição consolidada. Testes automatizados de acessibilidade não substituem uma auditoria manual completa.

### Como reproduzir os testes automatizados

**Pré-requisitos para executar os testes localmente:** diferentemente da execução da aplicação com Docker Compose, os comandos npm abaixo exigem Node.js 24 e npm instalados na máquina. Na raiz do repositório, execute `npm ci` para instalar as dependências. Configure também o arquivo `.env` conforme a seção de instalação. Para os testes E2E com PostgreSQL, siga a preparação do banco de testes descrita abaixo. Esses passos são opcionais para quem deseja apenas executar a aplicação pelo Docker.

#### 1. Preparar o banco de testes — apenas para executar E2E localmente

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

#### 2. Testes unitários e de componentes

```bash
npm run test --workspace=backend -- --run
npm run test --workspace=frontend -- --run
```

##### Cobertura de testes do backend

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

#### 3. Testes E2E da API

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

#### 4. Testes E2E no navegador

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

### Build, lint e formatação

```bash
npm run build
npm run lint --workspace=backend
npm run lint --workspace=frontend
npx prettier . --check
```

O projeto compartilha uma configuração do Prettier para padronizar código no frontend e no backend. O ambiente Docker não modifica a execução local desses comandos.

### GitHub Actions — integração contínua

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) é executado em pushes e pull requests da branch `main` e também permite execução manual. Ele contém **três jobs independentes**:

- **Quality and unit tests:** `npm ci`, Prettier, Oxlint, verificação de tipos TypeScript, testes unitários do backend/frontend e build das duas aplicações.
- **PostgreSQL integration tests:** serviço PostgreSQL 17 temporário, migrations, seeds, E2E HTTP (incluindo o contrato OpenAPI), Chromium e testes Playwright com verificações de acessibilidade.
- **Docker Compose smoke test:** valida a configuração do Compose, constrói e inicializa `db`, `db-init`, `api` e `web`, e executa [`scripts/docker-smoke.sh`](scripts/docker-smoke.sh) para verificar inicialização, health check, HTML do frontend e dados de referência.

O terceiro job utiliza credenciais **descartáveis**, exclusivas do runner, e a tag de imagem `ci-smoke`; não precisa de credenciais de produção nem de uma conta em registry. Em caso de falha, exibe os logs dos containers e remove os recursos temporários ao terminar.

Em caso de falha nos testes Playwright, relatórios e traces são disponibilizados como artifacts por tempo limitado. O smoke test Docker **não substitui** os testes de regras de negócio, concorrência e jornada real: essas responsabilidades continuam cobertas pelos outros jobs.

## 7. API REST — exemplos para Docker

**Os comandos `curl` desta seção usam `http://localhost:8080`, o endereço do Docker Compose recomendado.** Se você estiver executando somente o backend diretamente com Node.js, substitua `8080` por `3000`. O Nginx encaminha `/api` para a API pela rede interna do Compose.

| Método | Endpoint                                            | Finalidade                                      |
| ------ | --------------------------------------------------- | ----------------------------------------------- |
| `GET`  | `/api/exams?search=...`                             | Listar ou pesquisar exames pelo nome            |
| `GET`  | `/api/doctors`                                      | Listar médicos                                  |
| `GET`  | `/api/doctors/:id/availability?examId=...&date=...` | Consultar horários disponíveis                  |
| `POST` | `/api/appointments`                                 | Confirmar um agendamento                        |
| `GET`  | `/api/health`                                       | Verificar conectividade da API com o PostgreSQL |

### Swagger / OpenAPI

Com a API em execução, a documentação interativa e a especificação ficam disponíveis em:

- **Swagger UI:** `http://localhost:8080/api/docs`
- **OpenAPI JSON:** `http://localhost:8080/api/openapi.json`

No desenvolvimento local com Node.js, a API e o Swagger são expostos na porta `3000`.

Os schemas de entrada são derivados das validações Zod. O `Idempotency-Key` é opcional, e os exemplos de agendamento são ilustrativos: consulte a disponibilidade antes de executar um `POST`. A especificação é verificada por um teste E2E de contrato (`backend/test/openapi.e2e-spec.ts`).

### Coleção Postman / Insomnia

A coleção pronta para importação está em [`docs/postman/medical-scheduling.postman_collection.json`](docs/postman/medical-scheduling.postman_collection.json). Ela inclui os cinco endpoints, uma requisição adicional de busca de exames, variáveis reutilizáveis e verificações básicas de resposta.

A coleção usa `baseUrl=http://localhost:8080` por padrão, para funcionar após a instalação com Docker Compose. No desenvolvimento local, com a API executada diretamente, altere a variável `baseUrl` da coleção para `http://localhost:8080`. Se configurou `WEB_PORT` diferente no Docker Compose, ajuste `baseUrl` para essa porta.

Importe o JSON no Postman ou Insomnia e consulte **Exames**, **Médicos** e **Disponibilidade** antes de executar **Criar agendamento**. No `POST`, preencha `startAt` com um horário ISO 8601 válido, conforme a disponibilidade retornada; o horário não é preenchido automaticamente pela consulta. O header `Idempotency-Key` é opcional e deve usar um novo UUID para cada nova operação. **Executar o POST grava uma reserva real no banco configurado.**

### Health check

```bash
curl -i "http://localhost:8080/api/health"
```

Com o PostgreSQL acessível, a API retorna `200 OK` e `{"status":"ok"}`. Se uma consulta ao banco falhar enquanto a API estiver em execução, retorna `503 Service Unavailable` com uma mensagem genérica e o header `X-Request-ID`. Como o TypeORM conecta durante o bootstrap, uma falha de banco antes da inicialização pode impedir que a aplicação suba; nesse caso não haverá endpoint disponível para responder.

### Buscar exames

```bash
curl "http://localhost:8080/api/exams?search=Resson%C3%A2ncia"
```

O parâmetro `search` é opcional. Sem ele, a API retorna o catálogo de exames. Os registros são apresentados em ordem alfabética pelo nome; os IDs originais são preservados. A busca é parcial e ignora maiúsculas, minúsculas e acentos: por exemplo, `cranio`, `CRÂNIO` e `CrAnIo` encontram exames com “Crânio”. Os IDs originais e a ordenação por nome são preservados. Caracteres como `%` e `_` são tratados literalmente, não como curingas SQL. Para o catálogo fornecido de 30 exames, a API filtra os nomes normalizados em memória, sem dependência de extensões adicionais do PostgreSQL.

### Listar médicos

```bash
curl "http://localhost:8080/api/doctors"
```

A resposta contém `id`, `name`, `crm` e `workingWeekdays` (array de dias de atendimento, com **1 = segunda-feira** e **7 = domingo**, sem repetição). Os dias são calculados a partir dos turnos cadastrados. Os médicos são listados em ordem alfabética por nome. O frontend utiliza `workingWeekdays` para desabilitar no calendário os dias sem expediente; dias com expediente e sem vagas continuam selecionáveis.

### Consultar disponibilidade

```bash
curl "http://localhost:8080/api/doctors/1/availability?examId=17&date=2030-01-07"
```

| Parâmetro | Local        | Descrição                                |
| --------- | ------------ | ---------------------------------------- |
| `id`      | URL          | Identificador inteiro positivo do médico |
| `examId`  | Query string | Identificador inteiro positivo do exame  |
| `date`    | Query string | Data no formato `YYYY-MM-DD`             |

O ID `1` é ilustrativo; consulte o ID real em `GET /api/doctors`.

Exemplo **ilustrativo** de resposta para um turno das 08h às 12h e um exame de 40 minutos, sem agendamentos existentes:

```json
["08:00", "08:40", "09:20", "10:00", "10:40", "11:20"]
```

A API retorna horários no formato `HH:mm`, considerando a duração do exame, os turnos do médico, os agendamentos existentes e o instante atual. Quando não há horários disponíveis, retorna `200 OK` com `[]`.

**Fuso horário da clínica:** `America/Sao_Paulo` (horário de Brasília). Os horários livres são exibidos em `HH:mm` no horário da clínica, em ordem cronológica; não são timestamps UTC.

### Criar agendamento

```bash
curl -i -X POST "http://localhost:8080/api/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "João Silva",
    "examId": 17,
    "doctorId": 1,
    "startAt": "2030-01-07T09:20:00-03:00"
  }'
```

| Campo         | Descrição                                                 |
| ------------- | --------------------------------------------------------- |
| `patientName` | Nome do paciente, com até 160 caracteres                  |
| `examId`      | Identificador do exame                                    |
| `doctorId`    | Identificador do médico                                   |
| `startAt`     | Data e hora ISO 8601 com fuso explícito (`-03:00` ou `Z`) |

O horário de término (`endAt`) é calculado **no backend** a partir da duração cadastrada para o exame. Em caso de sucesso, a API retorna `201 Created`, incluindo o ID da reserva, os dados do agendamento e a data de criação. Os instantes são serializados em UTC (`Z`); por exemplo, `08:00-03:00` corresponde a `11:00Z` no mesmo dia.

**Importante:** o payload acima é ilustrativo. Antes de criar uma reserva, consulte os horários disponíveis para o médico, exame e data escolhidos. Uma data válida no formato ISO não garante um horário livre.

A requisição também aceita o header opcional `Idempotency-Key`, detalhado a seguir.

| Código HTTP                | Situação                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `201 Created`              | Agendamento confirmado                                                                            |
| `400 Bad Request`          | Dados de entrada ou header `Idempotency-Key` inválidos                                            |
| `404 Not Found`            | Médico ou exame inexistente                                                                       |
| `409 Conflict`             | Horário ocupado, conflito com outra reserva ou reutilização indevida de uma chave de idempotência |
| `422 Unprocessable Entity` | Horário passado, fora do expediente ou fora da grade válida                                       |
| `429 Too Many Requests`    | Limite de tentativas de agendamento excedido                                                      |
| `503 Service Unavailable`  | Contenção temporária no banco durante a confirmação; tente novamente com a mesma chave            |

### Idempotência na criação de agendamentos

O endpoint `POST /api/appointments` aceita o header **opcional** `Idempotency-Key`, contendo um UUID. A chave identifica uma operação de criação e permite recuperar o resultado de uma reserva já confirmada sem inserir outro registro.

Exemplo de requisição com idempotência:

```bash
curl -i -X POST "http://localhost:8080/api/appointments" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "patientName": "João Silva",
    "examId": 17,
    "doctorId": 1,
    "startAt": "2030-01-07T09:20:00-03:00"
  }'
```

O UUID acima é **apenas ilustrativo**. Para cada nova operação de agendamento, utilize uma chave nova; para repetir a **mesma operação com os mesmos dados**, reutilize a chave original.

| Situação                        | Comportamento                                                             |
| ------------------------------- | ------------------------------------------------------------------------- |
| Chave nova e agendamento válido | Cria a reserva e retorna `201 Created`                                    |
| Mesma chave e mesmos dados      | Retorna `201 Created` com o **mesmo agendamento e ID**, sem nova inserção |
| Mesma chave e dados diferentes  | Retorna `409 Conflict` com o código `IDEMPOTENCY_KEY_REUSED`              |
| Chave ausente                   | Mantém o comportamento convencional de criação de agendamentos            |
| Chave com formato inválido      | Retorna `400 Bad Request`                                                 |

A chave é armazenada na coluna `appointments.idempotency_key` (UUID, aceita `NULL`), protegida por uma restrição `UNIQUE`. Para requisições com chave, a API utiliza **transação e advisory lock transacional do PostgreSQL** antes de consultar ou criar a reserva. Duas requisições simultâneas com a mesma chave são serializadas e podem receber o mesmo resultado.

A idempotência **não substitui** a proteção contra horários sobrepostos: requisições com chaves diferentes ainda estão sujeitas à validação de disponibilidade e à _exclusion constraint_ do PostgreSQL.

#### Integração com o frontend

O React utiliza `crypto.randomUUID()` para criar uma chave por operação. Enquanto a tela de confirmação permanecer montada:

- Tentativas com os mesmos dados reutilizam a mesma chave.
- Alterações no nome do paciente, exame, médico ou horário geram uma nova chave.
- Em uma falha de rede ou resposta de servidor inconclusiva, o paciente pode repetir manualmente a confirmação com a chave original.
- Não há repetição automática da requisição de criação.
- A chave é descartada após a confirmação bem-sucedida.

As chaves são mantidas **somente em memória**. Recarregar a página encerra a capacidade do cliente de reutilizar a chave anterior; não há persistência em armazenamento do navegador.

A chave identifica a operação, **não** é um mecanismo de autenticação ou autorização. O rate limiting continua contabilizando as requisições, inclusive as repetições com a mesma chave. A garantia de recuperação permanece enquanto o agendamento associado existir no banco.

## 8. Desenvolvimento local — fluxo alternativo (opcional)

**Esta seção é opcional. Se você já subiu a aplicação com `docker compose up -d --build`, pode pular toda esta seção.**

Utilize o fluxo abaixo somente se quiser executar a API NestJS e a interface React diretamente na sua máquina, com Vite e recarregamento durante o desenvolvimento. O PostgreSQL ainda é iniciado pelo Docker Compose.

Requer **Node.js 24, npm, Docker com Compose e Git**. Para os testes de navegador, instale também o Chromium do Playwright conforme as [instruções de testes](#6-testes-e-qualidade--o-que-foi-verificado-e-como-reproduzir).

### 1. Clonar o repositório

No terminal, acesse o diretório em que deseja armazenar o projeto e execute:

```bash
git clone https://github.com/gabrielnunesBR/a3data-medical-scheduling.git
cd a3data-medical-scheduling
```

A partir daqui, execute os demais comandos **na raiz do repositório**, salvo indicação contrária.

### 2. Instalar as dependências

```bash
npm ci
```

### 3. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e defina uma senha local em `POSTGRES_PASSWORD`. Não versione arquivos com credenciais.

### 4. Iniciar o banco de desenvolvimento

```bash
docker compose up -d db
```

| Parâmetro       | Valor padrão          |
| --------------- | --------------------- |
| Host            | `127.0.0.1`           |
| Porta publicada | `5433`                |
| Banco           | `medical_scheduling`  |
| Usuário         | `medical_app`         |
| Senha           | Configurada em `.env` |

### 5. Aplicar as migrations

```bash
npm run migration:run --workspace=backend
```

A estrutura do PostgreSQL é controlada por migrations do TypeORM; a opção `synchronize` permanece desabilitada. Para verificar o histórico:

```bash
npm run migration:show --workspace=backend
```

### 6. Importar os dados de referência

```bash
npm run seed:exams --workspace=backend
npm run seed:doctors --workspace=backend
```

Os seeds importam **30 exames** de `challenge/dados/exames.csv`, preservando seus IDs, e **5 médicos com 36 turnos semanais**, conforme `challenge/dados/medicos.md`.

Ambos são idempotentes: podem ser executados novamente sem duplicar ou sobrescrever registros existentes. A importação dos médicos e turnos é transacional.

### 7. Iniciar backend e frontend

Em um terminal:

```bash
npm run dev:api
```

Em outro terminal:

```bash
npm run dev:web
```

| Serviço        | Endereço padrão         |
| -------------- | ----------------------- |
| API NestJS     | `http://localhost:3000` |
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

## 9. Limitações e considerações para produção

A implementação prioriza os requisitos do desafio: busca de exames, disponibilidade por médico e data, agendamento, prevenção de sobreposições e uma interface clara para o paciente.

### Funcionalidades fora do escopo

- Autenticação e autorização de pacientes ou profissionais.
- Cancelamento, reagendamento e consulta do histórico pelo paciente.
- Exceções de expediente para férias, feriados e afastamentos.
- Notificações por e-mail ou SMS.
- Painel administrativo para médicos ou atendentes.
- Implantação em ambiente de produção.

### Considerações para produção

Os endpoints de consulta e criação são públicos e **não possuem autenticação ou autorização de usuários**. Para uso com pacientes reais, seriam necessários controles de identidade e acesso, políticas de privacidade e tratamento de dados pessoais, incluindo avaliação de conformidade com a LGPD.

O rate limiting utiliza armazenamento em memória. Em uma implantação com múltiplas instâncias, seria necessário um mecanismo compartilhado ou limitação de requisições na infraestrutura, com configuração adequada dos proxies confiáveis.

A idempotência é persistida no PostgreSQL, mas o frontend mantém as chaves apenas em memória: após recarregar a página, não é possível reutilizar a chave anterior pelo navegador. A garantia no backend também depende da permanência do agendamento associado à chave.

Também seriam necessários HTTPS, gestão de segredos, coleta e retenção centralizada dos logs, alertas, políticas de backup e recuperação e avaliações adicionais de segurança e acessibilidade. Os logs JSON e o health check atuais são uma base de observabilidade, não uma solução de operação em produção.

### Possíveis evoluções

Uma evolução natural seria incluir autenticação de pacientes e gerenciamento de reservas (consulta, cancelamento e reagendamento), seguida de exceções nas agendas, notificações, painel administrativo e políticas de privacidade adequadas ao uso com pacientes reais.

Para uma implantação em produção, avaliaríamos **Sentry** (monitoramento de erros), **OpenTelemetry** (traces e métricas), **Elastic Stack/ELK** (centralização e consulta de logs) e **Redis ou infraestrutura equivalente** para rate limiting compartilhado. Essas integrações não foram adicionadas porque não são necessárias para executar e avaliar o desafio e aumentariam a complexidade operacional.

Os materiais originais do desafio foram preservados em `challenge/`.

---

Projeto desenvolvido como parte do desafio técnico da **A3Data**.
