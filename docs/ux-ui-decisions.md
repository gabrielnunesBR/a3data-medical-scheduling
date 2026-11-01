[← Voltar ao README](../README.md)

# Diretrizes de UX/UI — Agendamento de Exames de Imagem

**Projeto:** desafio técnico A3Data  
**Data da pesquisa:** 30 de outubro de 2026  
**Status:** registro das decisões de UX/UI adotadas no projeto. Os testes automatizados de acessibilidade fazem parte da implementação; permanece recomendada uma avaliação manual de usabilidade e acessibilidade.

## Objetivo

Criar um fluxo de agendamento de exames de imagem claro, acessível, responsivo e confiável, atendendo aos requisitos centrais do desafio: pesquisar exames, consultar horários e confirmar reservas. Melhorias complementares de experiência, como comprovante, exportação para calendários e página 404 personalizada, devem apoiar essa jornada sem prometer operações que não estejam implementadas.

## Evidências e interpretação

| Referência                         | Evidência observada                                                              | Implicação no produto                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Rede D'Or, campanha de agendamento | Seleção de exame, data/horário, dados do paciente e revisão antes da confirmação | Fluxo progressivo e revisão final                                                                                    |
| Fleury, agendamento digital        | Escolha dos procedimentos, local, dia e horário                                  | Selecionar opções relevantes em uma sequência orientada; não criar campos de unidade ou convênio ausentes do desafio |
| Doctoralia                         | Escolha de profissional, dia e horário                                           | Disponibilidade claramente vinculada ao médico                                                                       |
| NHS Service Manual                 | Labels explícitas, semântica, mensagens de erro ligadas aos inputs, foco visível | Acessibilidade como requisito de construção, não correção posterior                                                  |
| NN/g, Date Input                   | Calendário é adequado para datas próximas; preservar escolhas e reduzir erros    | Calendário pt-BR, dias passados indisponíveis, evitar digitação ambígua                                              |
| Material Design 3                  | Cores organizadas por funções e tokens semânticos                                | Tokens de primária, superfície, texto, borda, erro e seleção                                                         |
| WCAG 2.2                           | Contraste mínimo, navegação por teclado e tamanho mínimo dos alvos               | Objetivo WCAG 2.2 AA e controles principais de 44–48 px                                                              |

## Jornada de agendamento

1. **Escolher exame:** pesquisar por nome, sem diferenciar maiúsculas, minúsculas ou acentos; exibir duração; selecionar exame.
2. **Escolher médico e horário:** listar médicos, desabilitar no calendário dias passados ou sem expediente, escolher uma data e um horário retornado pela API; refletir carregamento, ausência de agenda e indisponibilidade.
3. **Revisar e confirmar:** mostrar resumo, pedir somente o nome do paciente, permitir edição, enviar `POST /api/appointments` e tratar erros.
4. **Sucesso:** exibir ID de confirmação e dados retornados pela API; permitir imprimir/salvar o comprovante em PDF e exportar o compromisso para Google Calendar ou `.ics`, sem prometer envio de e-mail/SMS ou sincronização contínua.

Regras de consistência: mudar exame limpa horário escolhido; mudar médico ou data também limpa o horário; a API é a fonte de verdade da disponibilidade; conflito HTTP 409 exige atualizar a lista e escolher outro horário.

## Layout

- **Mobile-first:** conteúdo em uma coluna, sem barra lateral fixa; botões grandes e resumo na etapa final ou depois do conteúdo.
- **Desktop (>= 1024 px):** conteúdo centralizado até 1120 px; coluna principal (~65%) e resumo (~35%).
- **Cabeçalho compacto:** nome do sistema e identificação de agendamento online, sem links fictícios.
- **Rotas inexistentes:** página 404 com identidade visual consistente e ação para voltar ao agendamento, sem exibir ferramentas técnicas ao paciente.
- **Indicador de progresso:** Exame → Horário → Confirmação, com `aria-current="step"`.
- **Formulários e estados:** cartões discretos, títulos claros, seleção de horários bem diferenciada, foco visível, estados carregando/vazio/erro/sucesso.
- Evitar fotografias genéricas de profissionais, carrosséis promocionais, convênios, unidades e custos que não estão nos dados do desafio.

## Tokens semânticos

| Token          | Hex       | Uso                                                         |
| -------------- | --------- | ----------------------------------------------------------- |
| `brand`        | `#0F766E` | ação primária, seleção e destaques                          |
| `brand-strong` | `#115E59` | hover/ênfase                                                |
| `brand-soft`   | `#CCFBF1` | superfície selecionada                                      |
| `brand-ink`    | `#134E4A` | texto sobre teal claro                                      |
| `canvas`       | `#F6F9FC` | fundo geral                                                 |
| `surface`      | `#FFFFFF` | cartões e campos                                            |
| `ink`          | `#172B4D` | texto principal                                             |
| `muted-ink`    | `#475569` | texto secundário                                            |
| `line`         | `#D9E2EC` | bordas discretas; não usar como único indicador de controle |
| `danger`       | `#B42318` | mensagens de erro                                           |
| `success`      | `#166534` | sucesso                                                     |
| `focus`        | `#0F766E` | anel de foco                                                |

Contrastes calculados: branco/brand = 5,47:1; branco/brand-strong = 7,58:1; ink/branco = 14,10:1; muted-ink/canvas = 7,17:1; danger/branco = 6,57:1. Testar outros pares na implementação.

## Tipografia e espaçamento

- Inter Variable, auto-hospedada via Fontsource, uma família para toda a UI.
- H1 30 px mobile / 36 px desktop, peso 700; seções 22–24 px, peso 600; texto base 16 px; auxiliares 14 px.
- Espaçamento em múltiplos de 4 px; botões/campos principais com no mínimo 48 px de altura; raio dos cartões 16 px.
- Animações discretas (150–200 ms) respeitando `prefers-reduced-motion`.

## Acessibilidade e linguagem

- Objetivo WCAG 2.2 AA, a verificar com teclado, leitor de tela e testes automatizados.
- HTML `lang="pt-BR"`; navegação semântica, `label`/`htmlFor`, mensagens de erro específicas, `aria-live` para atualizações relevantes.
- Todos os textos visíveis em pt-BR; formatos com `Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo'})`.
- Não instalar framework i18n enquanto só houver um idioma; concentrar textos reutilizados e mensagens de erro no frontend para futura extensão.
- Exibir mensagens orientadas ao usuário por código HTTP/erro, sem imprimir textos técnicos internos do backend.

## Privacidade

Nome do paciente associado a tipo de exame exige cautela por envolver informação de saúde. Não persistir nome do paciente em `localStorage` ou URL; evitar logs contendo payloads, analytics invasivo e terceiros desnecessários. Não apresentar selo de conformidade LGPD: implantação real exige análise de controles de segurança, base legal, retenção e demais obrigações.

## Stack implementada e plano original

As tecnologias abaixo estão presentes na implementação. A sequência de etapas ao final desta seção registra o planejamento original e não representa uma lista de tarefas pendentes.

- **React + Vite + TypeScript:** já presentes no monorepo.
- **Tailwind CSS v4 + tokens semânticos:** estilo.
- **Fontsource Inter Variable:** tipografia auto-hospedada.
- **Lucide React:** ícones pontuais.
- **TanStack Query:** chamadas HTTP e cache por parâmetros.
- **React DayPicker:** calendário localizado para seleção de datas.
- **React Hook Form + Zod:** formulário e validação da confirmação do agendamento.
- **Vitest + Testing Library + MSW:** testes de interface e comportamento; **Playwright:** testes E2E no navegador.
- **Vite proxy `/api` → backend:** desenvolvimento; produção exigirá configuração equivalente de proxy/reverse proxy.

### Etapas previstas no planejamento inicial

1. Fundação visual, estilos, estrutura responsiva e proxy.
2. Busca de exames integrada à API, com estados de carregamento e erro.
3. Seleção de médico, calendário e horários, com invalidação de seleção dependente.
4. Dados do paciente e revisão, criação via API e tratamento de 409.
5. Testes, responsividade, acessibilidade e documentação final.

## Referências consultadas

- [Rede D'Or — campanha de agendamento de exames](https://www.rededorsaoluiz.com.br/campanha-agendamento-exame)
- [Fleury — agendamento digital](https://agendamento.fleury.com.br/)
- [Doctoralia — agendamentos](https://www.doctoralia.com.br/)
- [NHS Service Manual — Design System](https://service-manual.nhs.uk/design-system)
- [NHS — Acessibilidade](https://service-manual.nhs.uk/accessibility/design)
- [Nielsen Norman Group — Date Input](https://www.nngroup.com/articles/date-input/)
- [Material Design 3 — Color roles](https://m3.material.io/styles/color/the-color-system)
- [W3C — WCAG 2.2](https://www.w3.org/TR/wcag/)
- [W3C Brasil — WCAG 2.2](https://www.w3c.br/traducoes/wcag/wcag22-pt-BR/)
- [Ministério da Saúde — dado pessoal sensível](https://www.gov.br/saude/pt-br/acesso-a-informacao/lgpd/glossario/d)
- [ANPD — Guia de segurança da informação](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte)
- [Tailwind — Instalação com Vite](https://tailwindcss.com/docs/installation/using-vite)
- [Fontsource — Inter](https://fontsource.org/fonts/inter/about)
- [Vite — server.proxy](https://vite.dev/config/server-options)
- [React DayPicker](https://daypicker.dev/v9)
