[← Voltar ao README](../README.md)

# Arquitetura e decisões técnicas

O projeto utiliza um **monorepo com npm Workspaces**, separando a API NestJS (`backend/`) da interface React (`frontend/`). Essa organização permite manter as duas aplicações e seus testes no mesmo repositório, com dependências e comandos de execução próprios.

## Principais decisões e justificativas

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

As decisões de interface, acessibilidade e design system estão detalhadas em [`docs/ux-ui-decisions.md`](ux-ui-decisions.md). As regras de concorrência, idempotência e limites de produção são desenvolvidas nas seções seguintes.

## Como as partes trabalham juntas

No Docker Compose, o **Nginx** é a entrada única: entrega a SPA React e encaminha as chamadas de `/api` para o NestJS. A API consulta o PostgreSQL, aplica as regras de agenda e persiste as reservas. **O frontend não grava diretamente no banco**, e os agendamentos não são controlados apenas pelo estado da interface.

A integridade tem duas camadas complementares: o serviço revalida disponibilidade e a restrição de exclusão **GiST no PostgreSQL** rejeita intervalos sobrepostos mesmo quando duas requisições chegam juntas. A **idempotência** resolve outro problema: se o usuário não receber a resposta após criar a reserva, pode repetir a mesma operação sem duplicá-la. O timeout de 15 segundos do frontend **encerra a espera**, mas não desfaz uma reserva já registrada. Por isso, a próxima tentativa mantém a mesma chave para os mesmos dados.

O `db-init` prepara o banco automaticamente com migrations e seeds antes da API. Assim, quem avalia não precisa executar comandos manuais de banco no fluxo principal. O monorepo concentra código, documentação e CI em um único repositório, enquanto os serviços mantêm **processos, builds e containers independentes**.

## Backend

- **NestJS e TypeScript:** organização por módulos, injeção de dependências e separação entre controllers, services e regras de negócio.
- **PostgreSQL:** persistência relacional e garantias de integridade transacional. A _exclusion constraint_ GiST impede agendamentos sobrepostos para um mesmo médico, inclusive sob concorrência.
- **TypeORM:** mapeamento das entidades e evolução do schema por migrations, mantendo `synchronize: false`.
- **Zod:** validação dos dados recebidos pela API.
- **Luxon:** tratamento de instantes, datas e fuso horário da clínica.
- **OpenAPI/Swagger:** contratos HTTP derivados dos schemas Zod e complementados com respostas, descrições e exemplos.
- **Observabilidade básica:** logs HTTP estruturados em JSON, `X-Request-ID` por requisição e sanitização de exceções inesperadas.
- **Health check:** consulta `SELECT 1` ao PostgreSQL, com retorno `503` quando a verificação falha após a aplicação estar iniciada.

## Frontend

- **React, TypeScript e Vite:** aplicação de página única com inicialização rápida em desenvolvimento, sem necessidade de renderização no servidor para o fluxo solicitado.
- **Identidade visual:** favicon com o mesmo símbolo `ScanLine` do cabeçalho e as cores do design system, sem marca fictícia de clínica.
- **TanStack Query:** consultas, cache, invalidação e atualização da disponibilidade.
- **React Hook Form e Zod:** gerenciamento e validação do formulário de confirmação.
- **Tailwind CSS:** estilização responsiva, com componentes e padrões visuais próprios do projeto.
- **React DayPicker:** seleção de datas considerando o fuso horário da clínica. O calendário acompanha a virada do dia em `America/Sao_Paulo`, mesmo depois que uma aba suspensa volta ao primeiro plano.

O fluxo é dividido em seleção de exame, escolha de médico/data/horário, revisão e confirmação, e apresentação do resultado. As diretrizes visuais e de acessibilidade estão descritas em [`docs/ux-ui-decisions.md`](ux-ui-decisions.md).

## Premissas adotadas

- Todos os médicos podem realizar todos os exames fornecidos no desafio.
- Os turnos representam agendas semanais recorrentes; não foram fornecidas exceções específicas para férias, feriados ou afastamentos. O calendário desabilita datas passadas e dias da semana sem expediente do médico, mas permite selecionar datas com expediente mesmo quando todos os horários estão ocupados.
- Cada exame ocupa integralmente a duração informada no catálogo.
- Os horários candidatos são gerados a partir do **início de cada turno**, em intervalos iguais à duração do exame, sem ultrapassar o fim do expediente.
- O fuso horário da clínica é `America/Sao_Paulo`. Os instantes são transmitidos com indicação explícita de fuso e podem ser persistidos ou serializados em UTC.
- O horário de término é calculado exclusivamente no backend.
- O frontend utiliza o proxy `/api` do Vite durante o desenvolvimento; no Docker Compose, o Nginx encaminha `/api` para a API na rede interna.

## Tecnologias utilizadas

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

Ela impede que duas requisições concorrentes confirmem horários conflitantes para o mesmo médico. O PostgreSQL retorna SQLSTATE `23P01` quando a restrição é violada, e a API converte o erro em `409 Conflict`. Um deadlock detectado durante a operação (`40P01`) é tratado como `503 Service Unavailable`, com código `BOOKING_TEMPORARILY_UNAVAILABLE`. A transação é revertida pelo PostgreSQL; não há retry automático dentro dela. O cliente pode tentar novamente com os mesmos dados e a mesma chave de idempotência.

A tabela também possui `CHECK (start_at < end_at)`, impedindo intervalos com duração nula ou negativa.

## Segurança e confiabilidade

### Logs estruturados, Request ID e exceções seguras

A API produz logs HTTP em JSON, com método, padrão de rota, status de resposta, duração e identificador `requestId`. O mesmo UUID gerado pelo servidor é devolvido no header `X-Request-ID`, inclusive em respostas HTTP de erro. IDs enviados pelo cliente não são utilizados como identificadores confiáveis.

```bash
curl -i "http://localhost:8080/api/health"
```

A instrumentação HTTP não registra o corpo das requisições, parâmetros de URL completos, headers de autenticação ou nomes dos pacientes. O filtro global preserva respostas de erro HTTP esperadas (como 400, 409 e 422) e, para exceções inesperadas, registra somente o `requestId` e uma categoria genérica; a resposta permanece `500 Internal server error`. Isso evita que SQL, parâmetros da consulta e stack traces dessas exceções sejam registrados pelo tratamento HTTP padrão.

Essa medida **não representa uma auditoria de todos os logs de dependências ou da inicialização da aplicação**. Em produção, seriam necessários controles adicionais de retenção, acesso e tratamento de dados pessoais.

### Cabeçalhos HTTP de segurança

A API utiliza os cabeçalhos HTTP de segurança nativos do NestJS para reforçar a proteção das respostas. Entre as proteções estão:

- `Content-Security-Policy`;
- `X-Content-Type-Options`;
- `X-Frame-Options`;
- `Referrer-Policy`;
- remoção do cabeçalho `X-Powered-By`.

Esses cabeçalhos são aplicados às respostas de sucesso e também às respostas de erro. A configuração exige NestJS 12.1 ou superior e o registro de `app.useSecurityHeaders()` antes da inicialização da aplicação.

O frontend utiliza o proxy `/api` no ambiente de desenvolvimento. Configurações de CORS e proxies devem ser adaptadas às origens e à infraestrutura da implantação; os cabeçalhos descritos acima se referem à **API**, não ao servidor de desenvolvimento do Vite.

### Proteção contra excesso de requisições

Na confirmação, o frontend limita a espera da requisição a **15 segundos**. Se ocorrer timeout, o resultado pode ser desconhecido; por isso, uma nova tentativa com os mesmos dados reutiliza a mesma chave de idempotência. O timeout não cancela nem desfaz uma reserva que já tenha sido confirmada no servidor.

O endpoint `POST /api/appointments` utiliza `@nestjs/throttler` para aplicar **20 requisições por minuto por endereço IP**. Ao exceder o limite, retorna `429 Too Many Requests`. Os endpoints de consulta não recebem esse limite nesta configuração.

O contador atual utiliza armazenamento **em memória**, adequado ao ambiente do desafio com uma única instância. Uma implantação distribuída exigiria armazenamento compartilhado ou rate limiting na infraestrutura. Atrás de um reverse proxy, a identificação do IP precisa considerar apenas proxies confiáveis.

Essa proteção reduz abuso, mas não substitui mecanismos de verificação de identidade, controle de acesso ou prevenção de reservas fraudulentas em uma aplicação real.

## Imagens Docker e versionamento

O Compose constrói as imagens do projeto com a tag **`0.1.0`** por padrão:

```text
a3data-medical-backend:0.1.0
a3data-medical-web:0.1.0
```

Os Dockerfiles utilizam imagens-base por tags: `node:24-bookworm-slim` para a compilação e execução do backend e para a compilação do frontend; e `nginx:stable-alpine` para servir a aplicação React. Essas tags podem receber atualizações e, portanto, builds feitos em datas diferentes podem utilizar revisões distintas das imagens oficiais. O PostgreSQL no Compose também utiliza uma tag atualizável: `postgres:17`. Para uma implantação que exija maior reprodutibilidade, seria possível fixar as imagens-base por digests OCI e revisar esses digests periodicamente.

A versão `0.1.0` também identifica o projeto, os workspaces e a documentação OpenAPI. Se quiser identificar outra versão das imagens, acrescente `IMAGE_TAG=0.2.0` ao `.env` antes de construir. Essa variável **altera apenas as tags das imagens construídas localmente**, sem modificar automaticamente a versão do código nem publicar nada em um registry. Um deploy real utilizaria imagens previamente testadas e publicadas, preferencialmente referenciadas por digest imutável.

---

## Limitações e considerações para produção

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
