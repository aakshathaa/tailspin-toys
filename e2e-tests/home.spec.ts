import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('filters the game list by more than one category', async ({ page }) => {
    await test.step('Select multiple categories and submit the form', async () => {
      await page.getByLabel('Filter by Strategy').check();
      await page.getByLabel('Filter by Puzzle').check();
      await page.getByTestId('apply-filters').click();
    });

    await test.step('Verify only matching games remain visible', async () => {
      await expect(page).toHaveURL(/category=1/);
      await expect(page).toHaveURL(/category=2/);
      const gameCards = page.locator('[data-testid^="game-card-"]');
      const visibleCards = await gameCards.evaluateAll((cards) =>
        cards.filter((card) => window.getComputedStyle(card).display !== 'none').length
      );
      expect(visibleCards).toBe(8);
      await expect(page.getByRole('heading', { name: 'DevOps Dominion', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Code Puzzle Chronicles', exact: true })).toBeVisible();
    });
  });

  test('combines category filters with a publisher filter', async ({ page }) => {
    await test.step('Apply a combined filter set', async () => {
      await page.getByLabel('Filter by Strategy').check();
      await page.getByLabel('Filter by Puzzle').check();
      await page.getByLabel('Filter games by publisher').selectOption({ label: 'CodeForge Studios' });
      await page.getByTestId('apply-filters').click();
    });

    await test.step('Verify the combined filter narrows the results', async () => {
      await expect(page).toHaveURL(/category=1/);
      await expect(page).toHaveURL(/category=2/);
      await expect(page).toHaveURL(/publisher=1/);
      const gameCards = page.locator('[data-testid^="game-card-"]');
      const visibleCards = await gameCards.evaluateAll((cards) =>
        cards.filter((card) => window.getComputedStyle(card).display !== 'none').length
      );
      expect(visibleCards).toBe(2);
      await expect(page.getByRole('heading', { name: 'DevOps Dominion', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Code Puzzle Chronicles', exact: true })).toBeVisible();
    });
  });
});
