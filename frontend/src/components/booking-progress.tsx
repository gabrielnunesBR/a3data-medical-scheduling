import { Check } from 'lucide-react';

const steps = ['Exame', 'Horário', 'Confirmação'] as const;

type BookingProgressProps = {
  currentStep: 1 | 2 | 3;
};

export function BookingProgress({ currentStep }: BookingProgressProps) {
  return (
    <nav aria-label="Etapas do agendamento" className="w-full min-w-0">
      <ol className="grid w-full min-w-0 grid-cols-3 gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:gap-2"
            >
              <span
                className={[
                  'flex size-9 shrink-0 items-center justify-center',
                  'rounded-full text-sm font-semibold',
                  isCurrent || isCompleted ? 'bg-brand text-white' : 'bg-slate-100 text-muted-ink',
                ].join(' ')}
              >
                {isCompleted ? (
                  <>
                    <Check size={18} aria-hidden="true" />
                    <span className="sr-only">Etapa concluída</span>
                  </>
                ) : (
                  stepNumber
                )}
              </span>

              <span
                className={[
                  'min-w-0 max-w-full text-center text-[11px]',
                  'leading-tight font-medium',
                  'wrap-anywhere',
                  'sm:text-left sm:text-sm',
                  isCurrent ? 'text-brand-strong' : 'text-muted-ink',
                ].join(' ')}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
