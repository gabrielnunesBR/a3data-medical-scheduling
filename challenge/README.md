# Desafio Técnico — Exames e Agendamento Médico

Você vai construir uma aplicação full-stack para marcação de **agendamento de exames de imagem**: um back-end em Node.js com as regras de negócio e um front-end em React que o paciente usa para buscar um exame, ver os horários de um médico e agendar.

---

## 1. O que precisa funcionar

1. **Busca de exames** por nome.
2. **Consulta da agenda** de um médico, mostrando os horários livres de uma data.
3. **Agendamento** de um exame com um médico em um horário disponível.

As três coisas precisam funcionar na API e pela interface em React.

Os dados de apoio estão na pasta `[dados/](./dados)`:

- `[dados/exames.csv](./dados/exames.csv)` — catálogo com 30 exames.
- `[dados/medicos.md](./dados/medicos.md)` — 5 médicos com suas agendas semanais.

---

## 2. Stack

- **Back-end:** API REST em **Node.js**, de preferência **NestJS**.
- **Front-end:** aplicação web em **React**.

Avaliamos as duas pontas e o código. Permitido o uso de IA para auxilixar no processo de desenvolvimento.

---

## 3. Dados fornecidos

### 3.1. Exames (`dados/exames.csv`)

CSV separado por vírgula, com cabeçalho. Colunas:

| Coluna            | Tipo     | Descrição                    |
| ----------------- | -------- | ---------------------------- |
| `id`              | numérico | Identificador único do exame |
| `nome`            | texto    | Nome do exame                |
| `duracao_minutos` | numérico | Duração do exame em minutos  |

### 3.2. Médicos (`dados/medicos.md`)

Texto com os 5 médicos e os turnos de atendimento por dia da semana (há turnos de manhã, tarde e noite). Para este desafio, todos os médicos atendem qualquer exame do catálogo.

---

## 4. Regras de negócio

1. **Duração dinâmica.** Cada exame tem a sua própria duração (coluna `duracao_minutos`: 20, 30 ou 40). Um agendamento ocupa exatamente a duração do exame escolhido.
2. **Geração de horários.** Os horários livres de um médico para um exame saem dos turnos dele: a partir do início de cada turno, gere horários em passos iguais à duração do exame. Um horário é válido se o bloco `[início + duração]` couber inteiro no turno e não se sobrepuser a outro agendamento já marcado para aquele médico.
3. **Sem sobreposição.** Um médico não pode ter dois agendamentos cujos intervalos se cruzem.
4. **Dentro do expediente.** Não é possível agendar fora dos dias e turnos do médico.
5. **Sem passado.** Não é possível agendar em data e hora que já passou.
6. **Dados mínimos de um agendamento:** nome do paciente, id do exame, médico e data/hora de início. O término é derivado (início + duração do exame).

Exemplo de geração de horários no turno `08:00–12:00`:

```
Exame de 40 min → 08:00, 08:40, 09:20, 10:00, 10:40, 11:20
Exame de 30 min → 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
Exame de 20 min → 08:00, 08:20, 08:40, ... , 11:40
```

O último horário vale porque termina em `12:00`, ainda dentro do turno; qualquer início posterior estouraria o turno. Se o médico já tiver um agendamento das `09:20` às `10:00`, os horários que colidem com esse intervalo não são oferecidos.

Decisões não cobertas acima (formato de data, fuso, etc.) ficam a seu critério. Documente as premissas que adotar.

---

## 5. Requisitos técnicos

**Back-end**

- Node.js 18+ e TypeScript.
- NestJS é a stack preferida. Express/Fastify puro é aceito, mas justifique.
- Persistência à sua escolha (em memória, SQLite, Postgres, Mongo).
- Dois pedidos simultâneos para o mesmo horário não podem gerar agendamento duplicado.

**Front-end**

- React, de preferência com TypeScript. Pode usar Vite, Next.js, CRA ou similar; diga qual e por quê.
- Estado e estilização à vontade. Não precisa de design system. Usabilidade e clareza valem mais que enfeite.

**Geral**

- Git com histórico que mostre a evolução do trabalho (evite um único commit "final"). Back e front podem ficar num monorepo (`backend/` e `frontend/`) ou em repositórios separados; explique o arranjo.
- README da entrega com: como rodar as duas pontas, decisões de arquitetura, premissas e o que ficou de fora.

---

## 6. Entregáveis

1. Repositório Git com back-end e front-end.
2. README da entrega com:

- Como instalar e rodar as duas pontas (passo a passo, incluindo banco se houver e a porta que o front espera da API).
- Como rodar os testes.
- O que ficou de fora e seria o próximo passo.

1. Coleção de requisições (Insomnia/Postman) ou exemplos `curl`.

---

## 7. Critérios de avaliação

- Corretude das regras de negócio, na API e no front.
- Qualidade e organização do código.
- Modelagem e arquitetura.
- Testes (presença, qualidade, cobertura do núcleo da regra de negócio).
- Tratamento de erros e validação, de ponta a ponta.
- Front-end: UX, usabilidade e tratamento de estados.
- Documentação e facilidade de rodar.

---
