import { test, expect } from '../fixtures/pages.fixture';
import { USERS } from '../data/users';

/**
 * TC-02 - Negative: locked-out account cannot log in.
 * See docs/test-case-matrix.md.
 */
test.describe('Login validation', () => {
  test('TC-02 - a locked-out user is blocked with an explicit error', async ({
    page,
    loginPage,
  }) => {
    await loginPage.goto();
    await loginPage.login(USERS.lockedOut.username, USERS.lockedOut.password);

    // Texto literal exacto (confirmado contra el DOM real), no una coincidencia parcial.
    await expect(loginPage.errorMessage).toHaveText(
      'Epic sadface: Sorry, this user has been locked out.'
    );
    // Must stay on the login screen - no session should be granted.
    await expect(page).toHaveURL(/saucedemo\.com\/?$/);
  });
});
