[← Voltar ao README](../README.md)

# Referência da API REST

**Os comandos `curl` desta seção usam `http://localhost:8080`, o endereço do Docker Compose recomendado.** Se você estiver executando somente o backend diretamente com Node.js, substitua `8080` por `3000`. O Nginx encaminha `/api` para a API pela rede interna do Compose.

| Método | Endpoint                                            | Finalidade                                      |
| ------ | --------------------------------------------------- | ----------------------------------------------- |
| `GET`  | `/api/exams?search=...`                             | Listar ou pesquisar exames pelo nome            |
| `GET`  | `/api/doctors`                                      | Listar médicos                                  |
| `GET`  | `/api/doctors/:id/availability?examId=...&date=...` | Consultar horários disponíveis                  |
| `POST` | `/api/appointments`                                 | Confirmar um agendamento                        |
| `GET`  | `/api/health`                                       | Verificar conectividade da API com o PostgreSQL |

## Swagger / OpenAPI

Com a API em execução, a documentação interativa e a especificação ficam disponíveis em:

- **Swagger UI:** `http://localhost:8080/api/docs`
- **OpenAPI JSON:** `http://localhost:8080/api/openapi.json`

No desenvolvimento local com Node.js, a API e o Swagger são expostos na porta `3000`.

Os schemas de entrada são derivados das validações Zod. O `Idempotency-Key` é opcional, e os exemplos de agendamento são ilustrativos: consulte a disponibilidade antes de executar um `POST`. A especificação é verificada por um teste E2E de contrato (`backend/test/openapi.e2e-spec.ts`).

## Coleção Postman / Insomnia

A coleção pronta para importação está em [`docs/postman/medical-scheduling.postman_collection.json`](postman/medical-scheduling.postman_collection.json). Ela inclui os cinco endpoints, uma requisição adicional de busca de exames, variáveis reutilizáveis e verificações básicas de resposta.

A coleção usa `baseUrl=http://localhost:8080` por padrão, para funcionar após a instalação com Docker Compose. No desenvolvimento local, com a API executada diretamente, altere a variável `baseUrl` da coleção para `http://localhost:3000`. Se configurou `WEB_PORT` diferente no Docker Compose, ajuste `baseUrl` para essa porta.

Importe o JSON no Postman ou Insomnia e consulte **Exames**, **Médicos** e **Disponibilidade** antes de executar **Criar agendamento**. No `POST`, preencha `startAt` com um horário ISO 8601 válido, conforme a disponibilidade retornada; o horário não é preenchido automaticamente pela consulta. O header `Idempotency-Key` é opcional e deve usar um novo UUID para cada nova operação. **Executar o POST grava uma reserva real no banco configurado.**

## Health check

```bash
curl -i "http://localhost:8080/api/health"
```

Com o PostgreSQL acessível, a API retorna `200 OK` e `{"status":"ok"}`. Se uma consulta ao banco falhar enquanto a API estiver em execução, retorna `503 Service Unavailable` com uma mensagem genérica e o header `X-Request-ID`. Como o TypeORM conecta durante o bootstrap, uma falha de banco antes da inicialização pode impedir que a aplicação suba; nesse caso não haverá endpoint disponível para responder.

## Buscar exames

```bash
curl "http://localhost:8080/api/exams?search=Resson%C3%A2ncia"
```

O parâmetro `search` é opcional. Sem ele, a API retorna o catálogo de exames. Os registros são apresentados em ordem alfabética pelo nome; os IDs originais são preservados. A busca é parcial e ignora maiúsculas, minúsculas e acentos: por exemplo, `cranio`, `CRÂNIO` e `CrAnIo` encontram exames com “Crânio”. Os IDs originais e a ordenação por nome são preservados. Caracteres como `%` e `_` são tratados literalmente, não como curingas SQL. Para o catálogo fornecido de 30 exames, a API filtra os nomes normalizados em memória, sem dependência de extensões adicionais do PostgreSQL.

## Listar médicos

```bash
curl "http://localhost:8080/api/doctors"
```

A resposta contém `id`, `name`, `crm` e `workingWeekdays` (array de dias de atendimento, com **1 = segunda-feira** e **7 = domingo**, sem repetição). Os dias são calculados a partir dos turnos cadastrados. Os médicos são listados em ordem alfabética por nome. O frontend utiliza `workingWeekdays` para desabilitar no calendário os dias sem expediente; dias com expediente e sem vagas continuam selecionáveis.

## Consultar disponibilidade

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

## Criar agendamento

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

## Idempotência na criação de agendamentos

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

### Integração com o frontend

O React utiliza `crypto.randomUUID()` para criar uma chave por operação. Enquanto a tela de confirmação permanecer montada:

- Tentativas com os mesmos dados reutilizam a mesma chave.
- Alterações no nome do paciente, exame, médico ou horário geram uma nova chave.
- Em uma falha de rede ou resposta de servidor inconclusiva, o paciente pode repetir manualmente a confirmação com a chave original.
- Não há repetição automática da requisição de criação.
- A chave é descartada após a confirmação bem-sucedida.

As chaves são mantidas **somente em memória**. Recarregar a página encerra a capacidade do cliente de reutilizar a chave anterior; não há persistência em armazenamento do navegador.

A chave identifica a operação, **não** é um mecanismo de autenticação ou autorização. O rate limiting continua contabilizando as requisições, inclusive as repetições com a mesma chave. A garantia de recuperação permanece enquanto o agendamento associado existir no banco.
