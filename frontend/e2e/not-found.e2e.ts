import { expect, test } from '@playwright/test';

test.describe('Unknown frontend routes', () => {
  test('shows the branded 404 page and returns to booking', async ({ page }) => {
    await page.goto('/pagina-inexistente');

    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await expect(page.getByText('ERRO 404')).toBeVisible();
    await expect(page).toHaveTitle('Página não encontrada | Agendamento de exames');

    await page.getByRole('link', { name: 'Voltar ao agendamento' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: 'Qual exame você deseja agendar?' }),
    ).toBeVisible();
  });

  test('shows the 404 page for /docs without a Swagger link', async ({ page, request }) => {
    await page.goto('/docs');

    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver Swagger' })).toHaveCount(0);

    const response = await request.get('/api/docs');
    expect(response.status()).toBe(200);
  });
});
