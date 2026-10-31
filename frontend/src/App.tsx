import { useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ScanLine,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { BookingProgress } from './components/booking-progress';
import {
  type Doctor,
} from './features/booking/availability.api';
import {
  formatClinicDate,
} from './features/booking/booking-dates';
import {
  DoctorAvailability,
} from './features/booking/doctor-availability';
import { ExamSearch } from './features/exams/exam-search';
import type { Exam } from './features/exams/exams.api';

function App() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  function handleExamChange(exam: Exam) {
    if (selectedExam?.id !== exam.id) {
      setSelectedDoctor(null);
      setSelectedDate(null);
      setSelectedTime(null);
    }

    setSelectedExam(exam);
  }

  function handleDoctorChange(doctor: Doctor | null) {
    setSelectedDoctor(doctor);
    setSelectedDate(null);
    setSelectedTime(null);
  }

  function handleDateChange(date: string | null) {
    setSelectedDate(date);
    setSelectedTime(null);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#conteudo-principal"
        className="sr-only rounded-lg bg-white px-4 py-2
          text-brand-strong focus:not-sr-only"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between
          px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center
              rounded-xl bg-brand text-white">
              <ScanLine size={24} aria-hidden="true" />
            </div>

            <div>
              <p className="text-base font-bold tracking-tight">
                Agendamento de exames
              </p>

              <p className="text-xs text-muted-ink">
                Exames de imagem
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-sm
            text-muted-ink sm:flex">
            <ShieldCheck size={18} aria-hidden="true" />
            Agendamento online
          </div>
        </div>
      </header>

      <main
        id="conteudo-principal"
        className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14"
      >
        <div className="mb-9 max-w-2xl">
          <p className="mb-3 text-sm font-semibold text-brand-strong">
            AGENDAMENTO ONLINE
          </p>

          <h1 className="text-3xl font-bold tracking-tight
            text-ink sm:text-4xl">
            Agende seu exame com facilidade
          </h1>

          <p className="mt-4 text-base leading-7 text-muted-ink">
            Escolha o exame, encontre um horário disponível
            e confirme seu agendamento em poucos passos.
          </p>
        </div>

        <div className="grid items-start gap-6
          lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
          <section
            aria-labelledby="booking-step-heading"
            className="rounded-2xl border border-line bg-surface
              p-5 shadow-sm sm:p-8"
          >
            <BookingProgress currentStep={currentStep} />

            <div className="mt-9 border-t border-line pt-8">
              {currentStep === 1 ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0
                      items-center justify-center rounded-xl
                      bg-brand-subtle text-brand-strong">
                      <Search size={22} aria-hidden="true" />
                    </div>

                    <div>
                      <h2
                        id="booking-step-heading"
                        className="text-xl font-semibold tracking-tight
                          sm:text-2xl"
                      >
                        Qual exame você deseja agendar?
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-muted-ink">
                        Encontre o procedimento pelo nome
                        e selecione uma opção para continuar.
                      </p>
                    </div>
                  </div>

                  <ExamSearch
                    selectedExamId={selectedExam?.id ?? null}
                    onSelect={handleExamChange}
                  />

                  <div className="mt-8 flex justify-end
                    border-t border-line pt-6">
                    <button
                      type="button"
                      disabled={!selectedExam}
                      onClick={() => setCurrentStep(2)}
                      className="min-h-12 rounded-xl bg-brand px-6
                        font-semibold text-white transition-colors
                        hover:bg-brand-strong
                        disabled:cursor-not-allowed
                        disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      Escolher médico e horário
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="mb-6 inline-flex min-h-11 items-center
                      gap-2 text-sm font-semibold text-brand-strong
                      hover:underline"
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                    Voltar para exames
                  </button>

                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0
                      items-center justify-center rounded-xl
                      bg-brand-subtle text-brand-strong">
                      <CalendarDays size={22} aria-hidden="true" />
                    </div>

                    <div>
                      <h2
                        id="booking-step-heading"
                        className="text-xl font-semibold tracking-tight
                          sm:text-2xl"
                      >
                        Escolha o médico, a data e o horário
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-muted-ink">
                        Confira a agenda do profissional e escolha
                        um horário disponível para seu exame.
                      </p>
                    </div>
                  </div>

                  {selectedExam && (
                    <DoctorAvailability
                      examId={selectedExam.id}
                      doctor={selectedDoctor}
                      date={selectedDate}
                      time={selectedTime}
                      onDoctorChange={handleDoctorChange}
                      onDateChange={handleDateChange}
                      onTimeChange={setSelectedTime}
                    />
                  )}

                  {selectedTime && (
                    <div className="mt-8 rounded-xl border
                      border-line bg-brand-subtle p-4">
                      <p className="text-sm font-medium
                        text-brand-ink">
                        Horário selecionado. Na próxima etapa,
                        você poderá revisar os dados e confirmar
                        o agendamento.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside
            aria-labelledby="summary-heading"
            className="rounded-2xl border border-line
              bg-surface p-6 shadow-sm lg:sticky lg:top-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center
                justify-center rounded-xl bg-brand-subtle
                text-brand-strong">
                <CalendarDays size={20} aria-hidden="true" />
              </div>

              <h2
                id="summary-heading"
                className="text-lg font-semibold"
              >
                Seu agendamento
              </h2>
            </div>

            <dl className="mt-6 divide-y divide-line">
              <div className="py-4">
                <dt className="text-sm text-muted-ink">
                  Exame
                </dt>

                <dd className="mt-1 font-medium text-ink">
                  {selectedExam?.name ?? 'Não selecionado'}

                  {selectedExam && (
                    <span className="mt-1 block text-sm
                      font-normal text-muted-ink">
                      Duração: {selectedExam.durationMinutes} minutos
                    </span>
                  )}
                </dd>
              </div>

              <div className="py-4">
                <dt className="text-sm text-muted-ink">
                  Profissional
                </dt>

                <dd className="mt-1 font-medium text-ink">
                  {selectedDoctor?.name ?? 'Não selecionado'}
                </dd>
              </div>

              <div className="py-4">
                <dt className="text-sm text-muted-ink">
                  Data e horário
                </dt>

                <dd className="mt-1 font-medium text-ink">
                  {selectedDate
                    ? formatClinicDate(selectedDate)
                    : 'Não selecionados'}

                  {selectedTime && (
                    <span className="mt-1 block text-sm
                      font-semibold text-brand-strong">
                      {selectedTime}
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-5 text-muted-ink">
              Os horários são apresentados no horário de Brasília.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
