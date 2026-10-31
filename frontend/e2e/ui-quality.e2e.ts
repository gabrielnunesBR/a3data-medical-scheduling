import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import type { Exam } from '../src/features/exams/exams.api.js';

const viewports = [
  { width: 320, height: 780 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

type OverflowElement = {
  tag: string;
  id: string;
  className: string;
  left: number;
  right: number;
  width: number;
  scrollWidth: number;
  clientWidth: number;
  text: string;
};

type LayoutDiagnostics = {
  viewportWidth: number;
  innerWidth: number;
  documentClientWidth: number;
  documentScrollWidth: number;
  bodyClientWidth: number;
  bodyScrollWidth: number;
  overflowingElements: OverflowElement[];
};

async function checkAccessibility(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
}

async function getLayoutDiagnostics(page: Page, viewportWidth: number): Promise<LayoutDiagnostics> {
  return (await page.evaluate(`
    (() => {
      const viewportWidth = ${viewportWidth};
      const documentElement = document.documentElement;
      const body = document.body;

      const overflowingElements = Array.from(
        body.querySelectorAll('*'),
      )
        .map((element) => {
          const rect = element.getBoundingClientRect();

          return {
            tag: element.tagName.toLowerCase(),
            id: element.id,
            className:
              typeof element.className === 'string'
                ? element.className.slice(0, 160)
                : '',
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            text: (element.textContent ?? '')
              .trim()
              .slice(0, 80),
          };
        })
        .filter((element) => {
          const outsideViewport =
            element.right > viewportWidth + 1 ||
            element.left < -1;

          const internalOverflow =
            element.scrollWidth > element.clientWidth + 1;

          return outsideViewport || internalOverflow;
        })
        .sort((a, b) => {
          const overflowA = Math.max(
            a.right - viewportWidth,
            a.scrollWidth - a.clientWidth,
          );

          const overflowB = Math.max(
            b.right - viewportWidth,
            b.scrollWidth - b.clientWidth,
          );

          return overflowB - overflowA;
        })
        .slice(0, 15);

      return {
        viewportWidth,
        innerWidth: window.innerWidth,
        documentClientWidth: documentElement.clientWidth,
        documentScrollWidth: documentElement.scrollWidth,
        bodyClientWidth: body.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        overflowingElements,
      };
    })()
  `)) as LayoutDiagnostics;
}

test.describe('UI quality', () => {
  for (const viewport of viewports) {
    test(`does not overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);

      await page.goto('/');

      await expect(
        page.getByRole('heading', {
          name: 'Qual exame você deseja agendar?',
        }),
      ).toBeVisible();

      await expect(page.locator('#exam-search')).toBeVisible();

      await page.waitForFunction('document.fonts.status === "loaded"');

      const diagnostics = await getLayoutDiagnostics(page, viewport.width);

      if (viewport.width === 320 && diagnostics.documentScrollWidth > viewport.width + 1) {
        console.log('Responsive layout diagnostics:', JSON.stringify(diagnostics, null, 2));
      }

      expect(
        diagnostics.documentScrollWidth,
        JSON.stringify(diagnostics, null, 2),
      ).toBeLessThanOrEqual(viewport.width + 1);
    });
  }

  test('has no detected WCAG violations on exam selection', async ({ page, request }) => {
    const response = await request.get('/api/exams');

    expect(response.ok()).toBe(true);

    const exams = (await response.json()) as Exam[];

    if (!exams[0]) {
      throw new Error('Exam seed is missing.');
    }

    await page.goto('/');

    await expect(page.getByRole('button').filter({ hasText: exams[0].name }).first()).toBeVisible();

    await checkAccessibility(page);
  });

  test('has no detected WCAG violations on doctor selection', async ({ page, request }) => {
    const response = await request.get('/api/exams');

    expect(response.ok()).toBe(true);

    const exams = (await response.json()) as Exam[];

    if (!exams[0]) {
      throw new Error('Exam seed is missing.');
    }

    await page.goto('/');

    await page.getByRole('button').filter({ hasText: exams[0].name }).first().click();

    await page
      .getByRole('button', {
        name: 'Escolher médico e horário',
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Escolha o médico, a data e o horário',
      }),
    ).toBeVisible();

    await checkAccessibility(page);
  });

  test('supports keyboard navigation to the main content', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: 'Qual exame você deseja agendar?',
      }),
    ).toBeVisible();

    const skipLink = page.getByRole('link', {
      name: 'Pular para o conteúdo',
    });

    await expect(skipLink).toBeAttached();

    const initialFocus = await page.evaluate('document.activeElement?.outerHTML');

    console.log('Initial focus:', initialFocus);

    await page.keyboard.press('Tab');

    const focusAfterTab = await page.evaluate('document.activeElement?.outerHTML');

    console.log('Focus after Tab:', focusAfterTab);

    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#conteudo-principal$/);
  });
});
