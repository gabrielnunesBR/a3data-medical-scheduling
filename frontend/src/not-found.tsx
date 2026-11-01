import { ArrowLeft, FileQuestion } from 'lucide-react';

import { SiteHeader } from './components/site-header';

export function NotFound() {
  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#conteudo-principal"
        className="sr-only rounded-lg bg-white px-4 py-2 text-brand-strong focus:not-sr-only"
      >
        Pular para o conteúdo
      </a>

      <SiteHeader />

      <main
        id="conteudo-principal"
        className="mx-auto flex max-w-6xl justify-center px-5 py-14 sm:px-8 sm:py-20"
      >
        <section
          aria-labelledby="not-found-heading"
          className="w-full max-w-2xl rounded-2xl border border-line bg-surface px-6 py-12 text-center shadow-sm sm:px-12 sm:py-16"
        >
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-subtle text-brand-strong">
            <FileQuestion size={32} aria-hidden="true" />
          </div>

          <p className="mt-7 text-sm font-semibold tracking-wide text-brand-strong">ERRO 404</p>

          <h1
            id="not-found-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            Página não encontrada
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted-ink">
            O endereço informado não corresponde a uma página desta aplicação. Confira a URL ou
            volte ao início para agendar seu exame.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 font-semibold text-white hover:bg-brand-strong sm:w-auto"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Voltar ao agendamento
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
