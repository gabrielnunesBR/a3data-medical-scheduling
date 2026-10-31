import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Search,
  ScanLine,
} from 'lucide-react';

import {
  fetchExams,
  type Exam,
} from './exams.api';

type ExamSearchProps = {
  selectedExamId: number | null;
  onSelect: (exam: Exam) => void;
};

export function ExamSearch({
  selectedExamId,
  onSelect,
}: ExamSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(inputValue.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [inputValue]);

  const {
    data: exams = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['exams', search],
    queryFn: ({ signal }) => fetchExams(search, signal),
    staleTime: 60_000,
  });

  const isWaiting = inputValue.trim() !== search;
  const isLoading = isWaiting || isPending;

  return (
    <div className="mt-7">
      <label
        htmlFor="exam-search"
        className="block text-sm font-semibold text-ink"
      >
        Buscar exame pelo nome
      </label>

      <div className="relative mt-2">
        <Search
          size={20}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2
            left-4 -translate-y-1/2 text-muted-ink"
        />

        <input
          id="exam-search"
          type="search"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Ex.: ressonância magnética"
          autoComplete="off"
          aria-describedby="exam-search-help"
          className="min-h-12 w-full rounded-xl border
          border-line bg-white py-3 pr-4 pl-12
            text-base text-ink placeholder:text-muted-ink
            transition-colors
          focus:border-brand focus:outline-none
            focus:ring-2 focus:ring-brand/15
            focus-visible:outline-none"
        />
      </div>

      <p
        id="exam-search-help"
        className="mt-2 text-sm text-muted-ink"
      >
        Pesquise pelo nome ou escolha um exame na lista.
      </p>

      <div className="mt-6">
        {isLoading ? (
          <div
            role="status"
            className="space-y-3"
          >
            <p className="text-sm text-muted-ink">
              Buscando exames...
            </p>

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                aria-hidden="true"
                className="h-20 rounded-xl bg-slate-100
                  motion-safe:animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200
              bg-red-50 p-5"
          >
            <p className="font-medium text-danger">
              Não foi possível carregar os exames.
            </p>

            <p className="mt-2 text-sm text-muted-ink">
              Verifique sua conexão e tente novamente.
            </p>

            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 min-h-11 rounded-lg bg-brand
                px-4 font-semibold text-white
                hover:bg-brand-strong"
            >
              Tentar novamente
            </button>
          </div>
        ) : exams.length === 0 ? (
          <div
            role="status"
            className="rounded-xl border border-line
              bg-canvas px-6 py-10 text-center"
          >
            <p className="font-medium text-ink">
              Nenhum exame encontrado
            </p>

            <p className="mt-2 text-sm text-muted-ink">
              Tente pesquisar usando outro termo.
            </p>
          </div>
        ) : (
          <>
            <p
              role="status"
              className="mb-4 text-sm text-muted-ink"
            >
              {exams.length}{' '}
              {exams.length === 1
                ? 'exame encontrado'
                : 'exames encontrados'}
            </p>

            <ul
              aria-label="Exames encontrados"
              className="max-h-96 space-y-3 overflow-y-auto
                pr-1"
            >
              {exams.map((exam) => {
                const selected = selectedExamId === exam.id;

                return (
                  <li key={exam.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelect(exam)}
                      className={[
                        'flex min-h-20 w-full items-center',
                        'gap-3 rounded-xl border p-4',
                        'text-left transition-colors',
                        'focus-visible:outline-2',
                        'focus-visible:outline-offset-2',
                        'focus-visible:outline-focus',
                        selected
                          ? 'border-brand bg-brand-subtle'
                          : 'border-line bg-white hover:border-brand',
                      ].join(' ')}
                    >
                      <span
                        className="flex size-10 shrink-0
                          items-center justify-center rounded-lg
                          bg-canvas text-brand-strong"
                      >
                        <ScanLine
                          size={20}
                          aria-hidden="true"
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-ink">
                          {exam.name}
                        </span>

                        <span
                          className="mt-1 block text-sm
                            text-muted-ink"
                        >
                          {exam.durationMinutes} minutos
                        </span>
                      </span>

                      {selected ? (
                        <span className="flex shrink-0 items-center
                          gap-1 text-sm font-semibold text-brand-strong">
                          <CheckCircle2
                            size={19}
                            aria-hidden="true"
                          />
                          <span className="hidden sm:inline">
                            Selecionado
                          </span>
                        </span>
                      ) : (
                        <span className="hidden shrink-0 text-sm
                          font-medium text-brand-strong sm:inline">
                          Selecionar
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
