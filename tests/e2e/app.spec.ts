/**
 * E2E Tests for CopaMundial
 * 
 * Critical user flow tests using Playwright
 */

import { test, expect } from '@playwright/test';

// Test configuration
test.describe('CopaMundial E2E Tests', () => {
  // Base URL for tests
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

  test.describe('Authentication Flow', () => {
    test('should complete full authentication flow', async ({ page }) => {
      // Go to home page
      await page.goto(baseURL);

      // Click sign in button
      await page.click('text=Sign In');

      // Should be on sign in page
      await expect(page).toHaveURL(/.*auth\/signin/);

      // Sign in with credentials (if enabled)
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Should redirect to dashboard or home
      await expect(page).toHaveURL(/.*\/(dashboard|teams)?/);

      // Should see user menu
      await expect(page.locator('text=Sign Out')).toBeVisible();
    });

    test('should handle authentication errors', async ({ page }) => {
      await page.goto(`${baseURL}/auth/signin`);

      // Try invalid credentials
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });

    test('should persist session across page reloads', async ({ page }) => {
      // Sign in
      await page.goto(`${baseURL}/auth/signin`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Wait for redirect
      await page.waitForURL(/.*\/(dashboard|teams)?/);

      // Reload page
      await page.reload();

      // Should still be signed in
      await expect(page.locator('text=Sign Out')).toBeVisible();
    });
  });

  test.describe('Team Management Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in before each team test
      await page.goto(`${baseURL}/auth/signin`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/(dashboard|teams)?/);
    });

    test('should create a new team', async ({ page }) => {
      await page.goto(`${baseURL}/teams`);

      // Click create team button
      await page.click('text=Create Team');

      // Fill team details
      await page.fill('input[name="name"]', 'E2E Test FC');
      await page.fill('textarea[name="bio"]', 'Team created by E2E test');
      await page.fill('input[name="location"]', 'New York, NY');
      await page.selectOption('select[name="formation"]', '4-4-2');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to team page
      await expect(page).toHaveURL(/.*teams\/.+/);

      // Should see team name
      await expect(page.locator('text=E2E Test FC')).toBeVisible();
    });

    test('should validate team creation form', async ({ page }) => {
      await page.goto(`${baseURL}/teams`);

      // Click create team button
      await page.click('text=Create Team');

      // Try to submit without name
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('text=Required')).toBeVisible();
    });

    test('should view team details', async ({ page }) => {
      // Go to teams list
      await page.goto(`${baseURL}/teams`);

      // Click first team
      await page.click('.team-card:first-child');

      // Should see team details
      await expect(page.locator('text=Formation')).toBeVisible();
      await expect(page.locator('text=Members')).toBeVisible();
    });

    test('should edit team settings', async ({ page }) => {
      await page.goto(`${baseURL}/teams`);

      // Click first team
      await page.click('.team-card:first-child');

      // Click edit button
      await page.click('text=Edit Team');

      // Update bio
      await page.fill('textarea[name="bio"]', 'Updated bio from E2E test');

      // Save changes
      await page.click('button[type="submit"]');

      // Should see updated bio
      await expect(page.locator('text=Updated bio from E2E test')).toBeVisible();
    });
  });

  test.describe('Match Scheduling Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in before each match test
      await page.goto(`${baseURL}/auth/signin`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/(dashboard|teams)?/);
    });

    test('should schedule a new match', async ({ page }) => {
      await page.goto(`${baseURL}/matches`);

      // Click schedule match button
      await page.click('text=Schedule Match');

      // Fill match details
      await page.selectOption('select[name="homeTeamId"]', '1');
      await page.selectOption('select[name="awayTeamId"]', '2');
      await page.fill('input[name="date"]', '2026-04-01T15:00');
      await page.fill('input[name="location"]', 'Central Park Field 1');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to match details
      await expect(page).toHaveURL(/.*matches\/.+/);

      // Should see match details
      await expect(page.locator('text=Central Park')).toBeVisible();
    });

    test('should view upcoming matches', async ({ page }) => {
      await page.goto(`${baseURL}/matches`);

      // Should see matches list
      await expect(page.locator('.match-card')).toBeVisible();

      // Should see match date and location
      await expect(page.locator('text=Location')).toBeVisible();
    });
  });

  test.describe('Live Scorekeeping Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in before each test
      await page.goto(`${baseURL}/auth/signin`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/(dashboard|teams)?/);
    });

    test('should update live match score', async ({ page }) => {
      // Go to match with live scorekeeping enabled
      await page.goto(`${baseURL}/matches/live-test`);

      // Should see scorekeeper component
      await expect(page.locator('text=Live Scorekeeper')).toBeVisible();

      // Start timer
      await page.click('text=Start Timer');

      // Wait for timer to start
      await page.waitForTimeout(2000);

      // Add goal for home team
      await page.click('button:has-text("⚽ Goal"):first');

      // Should see score update
      await expect(page.locator('.home-score')).toHaveText('1');
    });

    test('should record match events', async ({ page }) => {
      await page.goto(`${baseURL}/matches/live-test`);

      // Add yellow card
      await page.click('button:has-text("🟨"):first');

      // Should see event in log
      await expect(page.locator('text=Event Log')).toBeVisible();
    });
  });

  test.describe('Player Profile Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${baseURL}/auth/signin`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/(dashboard|teams)?/);
    });

    test('should view player profile', async ({ page }) => {
      await page.goto(`${baseURL}/profile`);

      // Should see profile sections
      await expect(page.locator('text=Profile')).toBeVisible();
      await expect(page.locator('text=Statistics')).toBeVisible();
    });

    test('should update player profile', async ({ page }) => {
      await page.goto(`${baseURL}/profile`);

      // Click edit button
      await page.click('text=Edit Profile');

      // Update bio
      await page.fill('textarea[name="bio"]', 'Updated bio from E2E test');

      // Save changes
      await page.click('button[type="submit"]');

      // Should see success message
      await expect(page.locator('text=Profile updated')).toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${baseURL}/auth/signin`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/(dashboard|teams)?/);
    });

    test('should search for teams', async ({ page }) => {
      await page.goto(`${baseURL}/search`);

      // Enter search query
      await page.fill('input[name="q"]', 'FC');
      await page.press('input[name="q"]', 'Enter');

      // Should see search results
      await expect(page.locator('.search-result')).toBeVisible();
    });

    test('should filter search results', async ({ page }) => {
      await page.goto(`${baseURL}/search`);

      // Select teams only
      await page.click('text=Teams');

      // Enter search query
      await page.fill('input[name="q"]', 'Team');
      await page.press('input[name="q"]', 'Enter');

      // Should only show teams
      await expect(page.locator('.search-result')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(baseURL);

      // Should see mobile navigation
      await expect(page.locator('.mobile-nav')).toBeVisible();

      // Navigation should work
      await page.click('.mobile-nav-button');
      await expect(page.locator('.mobile-menu')).toBeVisible();
    });

    test('should adapt layout for tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(baseURL);

      // Should see tablet-optimized layout
      await expect(page).toHaveScreenshot('tablet-home.png');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 errors gracefully', async ({ page }) => {
      await page.goto(`${baseURL}/nonexistent-page`);

      // Should show 404 page
      await expect(page.locator('text=404')).toBeVisible();
      await expect(page.locator('text=Not Found')).toBeVisible();

      // Should have link back home
      await expect(page.locator('text=Go Home')).toBeVisible();
    });

    test('should handle API errors with user-friendly messages', async ({ page }) => {
      await page.goto(`${baseURL}/teams`);

      // Trigger an error (e.g., network failure simulation)
      await page.route('**/api/teams', route => route.abort('failed'));

      // Refresh to trigger error
      await page.reload();

      // Should show error message
      await expect(page.locator('text=Failed to load')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load home page within 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(baseURL);

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000);
    });

    test('should not have memory leaks during navigation', async ({ page }) => {
      // Navigate multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto(`${baseURL}/teams`);
        await page.goto(`${baseURL}/matches`);
        await page.goto(`${baseURL}/profile`);
      }

      // Should not crash
      await expect(page).toHaveTitle(/CopaMundial/);
    });
  });
});
