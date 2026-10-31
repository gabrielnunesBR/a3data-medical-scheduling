import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Check, Clock3 } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';

import { fetchAvailability, fetchDoctors, type Doctor } from './availability.api';
import {
  CLINIC_TIME_ZONE,
  formatClinicDate,
  fromClinicDate,
  toClinicDate,
  todayInClinic,
} from './booking-dates';

type DoctorAvailabilityProps = {
  examId: number;
  doctor: Doctor | null;
  date: string | null;
  time: string | null;
  onDoctorChange: (doctor: Doctor | null) => void;
  onDateChange: (date: string | null) => void;
  onTimeChange: (time: string | null) => void;
};

export function DoctorAvailability({
  examId,
  doctor,
  date,
  time,
  onDoctorChange,
  onDateChange,
  onTimeChange,
}: DoctorAvailabilityProps) {
  const {
    data: doctors = [],
    isPending: doctorsPending,
    isError: doctorsError,
    refetch: refetchDoctors,
  } = useQuery({
    queryKey: ['doctors'],
    queryFn: ({ signal }) => fetchDoctors(signal),
    staleTime: 5 * 60_000,
  });

  const {
    data: availableSlots = [],
    isPending: slotsPending,
    isFetching: slotsFetching,
    isError: slotsError,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['availability', doctor?.id, examId, date],
    queryFn: ({ signal }) => {
      if (!doctor || !date) {
        throw new Error('Doctor and date are required.');
      }

      return fetchAvailability({
        doctorId: doctor.id,
        examId,
        date,
        signal,
      });
    },
    enabled: doctor !== null && date !== null,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });

  useEffect(() => {
    if (
      time &&
      (slotsError || (!slotsPending && !slotsFetching && !availableSlots.includes(time)))
    ) {
      onTimeChange(null);
    }
  }, [time, slotsError, slotsPending, slotsFetching, availableSlots, onTimeChange]);

  const today = todayInClinic();
  const loadingSlots = slotsPending || slotsFetching;

  return (
    <div className="mt-7 space-y-8">
      <div>
        <label htmlFor="booking-doctor" className="block text-sm font-semibold text-ink">
          Profissional
        </label>

        <select
          id="booking-doctor"
          value={doctor?.id ?? ''}
          disabled={doctorsPending || doctorsError}
          onChange={(event) => {
            const selected = doctors.find((item) => item.id === Number(event.target.value));

            onDoctorChange(selected ?? null);
          }}
          className="mt-2 min-h-12 w-full rounded-xl border
          border-line bg-white px-4 text-base text-ink
            transition-colors
            disabled:cursor-not-allowed
          disabled:bg-slate-50"
        >
          <option value="">
            {doctorsPending ? 'Carregando profissionais...' : 'Selecione um profissional'}
          </option>

          {doctors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        {doctorsError && (
          <div role="alert" className="mt-3 text-sm">
            <p className="text-danger">Não foi possível carregar os profissionais.</p>

            <button
              type="button"
              onClick={() => void refetchDoctors()}
              className="mt-2 font-semibold text-brand-strong
                underline underline-offset-4"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>

      {!doctor ? (
        <div
          className="rounded-xl border border-line
          bg-canvas p-6 text-center text-sm
          text-muted-ink"
        >
          Selecione um profissional para escolher a data do atendimento.
        </div>
      ) : (
        <>
          <section aria-labelledby="booking-date-heading">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays size={20} className="text-brand-strong" aria-hidden="true" />

              <h3 id="booking-date-heading" className="text-base font-semibold text-ink">
                Data do exame
              </h3>
            </div>

            <div
              className="overflow-x-auto rounded-xl border
            border-line bg-white p-3 sm:p-5"
            >
              <div className="mx-auto w-max">
                <DayPicker
                  mode="single"
                  lang="pt-BR"
                  locale={ptBR}
                  timeZone={CLINIC_TIME_ZONE}
                  weekStartsOn={0}
                  today={today}
                  startMonth={today}
                  disabled={{ before: today }}
                  selected={date ? fromClinicDate(date) : undefined}
                  onSelect={(selected) => {
                    onDateChange(selected ? toClinicDate(selected) : null);
                  }}
                  className="booking-calendar"
                />
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-ink">
              {date
                ? `Data selecionada: ${formatClinicDate(date)}`
                : 'Selecione uma data a partir de hoje.'}
            </p>
          </section>

          <section aria-labelledby="booking-times-heading">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 size={20} className="text-brand-strong" aria-hidden="true" />

              <h3 id="booking-times-heading" className="text-base font-semibold text-ink">
                Horários disponíveis
              </h3>
            </div>

            {!date ? (
              <p
                className="rounded-xl bg-canvas p-5
                text-sm text-muted-ink"
              >
                Escolha uma data para consultar os horários.
              </p>
            ) : loadingSlots ? (
              <div role="status" className="space-y-3">
                <p className="text-sm text-muted-ink">Consultando disponibilidade...</p>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 8 }, (_, index) => (
                    <div
                      key={index}
                      aria-hidden="true"
                      className="h-12 rounded-lg bg-slate-100
                        motion-safe:animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ) : slotsError ? (
              <div
                role="alert"
                className="rounded-xl border
                border-red-200 bg-red-50 p-5"
              >
                <p className="text-sm font-medium text-danger">
                  Não foi possível consultar os horários.
                </p>

                <button
                  type="button"
                  onClick={() => void refetchSlots()}
                  className="mt-3 font-semibold text-brand-strong
                    underline underline-offset-4"
                >
                  Tentar novamente
                </button>
              </div>
            ) : availableSlots.length === 0 ? (
              <div
                role="status"
                className="rounded-xl border
                border-line bg-canvas p-5"
              >
                <p className="font-medium text-ink">Nenhum horário disponível nesta data.</p>

                <p className="mt-2 text-sm text-muted-ink">Escolha outra data ou profissional.</p>
              </div>
            ) : (
              <div
                role="group"
                aria-label="Escolha um horário disponível"
                className="grid grid-cols-3 gap-2 sm:grid-cols-4"
              >
                {availableSlots.map((slot) => {
                  const selected = time === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-label={`Selecionar horário ${slot}`}
                      aria-pressed={selected}
                      onClick={() => onTimeChange(slot)}
                      className={[
                        'flex min-h-12 items-center justify-center',
                        'gap-1 rounded-xl border px-2 py-3',
                        'text-sm font-semibold transition-colors',
                        'focus-visible:outline-2',
                        'focus-visible:outline-offset-2',
                        'focus-visible:outline-focus',
                        selected
                          ? 'border-brand bg-brand-soft text-brand-ink'
                          : 'border-line bg-white text-ink hover:border-brand',
                      ].join(' ')}
                    >
                      {selected && <Check size={16} aria-hidden="true" />}

                      {slot}
                    </button>
                  );
                })}
              </div>
            )}

            {time && !slotsError && !loadingSlots && (
              <p role="status" className="mt-4 text-sm font-medium text-brand-strong">
                Horário selecionado: {time}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
