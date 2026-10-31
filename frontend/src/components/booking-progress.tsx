const steps = ['Exame', 'Horário', 'Confirmação'] as const;

export function BookingProgress() {
  return (
    <nav aria-label="Etapas do agendamento">
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const isCurrent = index === 0;

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
                  isCurrent
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 text-muted-ink',
                ].join(' ')}
              >
                {index + 1}
              </span>

              <span
                className={[
                  'min-w-0 text-xs font-medium sm:text-sm',
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
