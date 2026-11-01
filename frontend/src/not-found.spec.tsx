import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotFound } from './not-found';

describe('NotFound', () => {
  it('explains the invalid route and offers safe navigation', () => {
    render(<NotFound />);

    expect(
      screen.getByRole('heading', { name: 'Página não encontrada', level: 1 }),
    ).toBeInTheDocument();

    expect(screen.getByText('ERRO 404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao agendamento' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.queryByRole('link', { name: 'Ver Swagger' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute(
      'href',
      '#conteudo-principal',
    );
  });
});
