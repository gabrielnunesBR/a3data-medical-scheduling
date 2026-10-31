import { Check } from 'lucide-react';

const steps = ['Exame', 'Horário', 'Confirmação'] as const;

type BookingProgressProps = {
  currentStep: 1 | 2 | 3;
};

export function BookingProgress({
  currentStep,
}: BookingProgressProps) {
  return (
    <nav aria-label="Etapas do agendamento">
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex min-w-0 items-center gap-2"
            >
              <span
                className={[
                  'flex size-9 shrink-0 items-center justify-center',
                  'rounded-full text-sm font-semibold',
                  isCurrent || isCompleted
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 text-muted-ink',
                ].join(' ')}
              >
                {isCompleted ? (
                  <>
                    <Check size={18} aria-hidden="true" />
                    <span className="sr-only">
                      Etapa concluída
                    </span>
                  </>
                ) : (
                  stepNumber
                )}
              </span>

              <span
                className={[
                  'min-w-0 text-xs font-medium sm:text-sm',
                  isCurrent
                    ? 'text-brand-strong'
                    : 'text-muted-ink',
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
