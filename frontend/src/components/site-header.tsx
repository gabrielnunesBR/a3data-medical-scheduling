import { ScanLine, ShieldCheck } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand text-white">
            <ScanLine size={24} aria-hidden="true" />
          </div>

          <div>
            <p className="text-base font-bold tracking-tight">Agendamento de exames</p>

            <p className="text-xs text-muted-ink">Exames de imagem</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 text-sm text-muted-ink sm:flex">
          <ShieldCheck size={18} aria-hidden="true" />
          Agendamento online
        </div>
      </div>
    </header>
  );
}
