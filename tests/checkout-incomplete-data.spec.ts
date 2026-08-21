import { test, expect } from '../fixtures/pages.fixture';
import { CHECKOUT_INFO, PRODUCT } from '../data/users';

/**
 * TC-03 - Negative: checkout cannot continue with a missing required field.
 * See docs/test-case-matrix.md.
 *
 * Login y agregar-producto-y-llegar-a-checkout están factorizados en
 * fixtures/purchaseFlow.ts — lo específico de este caso es dejar el Postal Code vacío y
 * verificar que el checkout se queda trabado con el error exacto.
 */
test.describe('Checkout validation', () => {
  test('TC-03 - checkout blocks continue when Postal Code is empty', async ({
    page,
    purchaseFlow,
    checkoutPage,
  }) => {
    await purchaseFlow.loginAsStandardUser();
    await purchaseFlow.addProductAndReachCheckout(PRODUCT.backpack);

    await purchaseFlow.fillShippingAndContinue(CHECKOUT_INFO.missingPostalCode);

    // Texto literal exacto (confirmado contra el DOM real), no una coincidencia parcial.
    await expect(checkoutPage.errorMessage).toHaveText('Error: Postal Code is required');
    // Must stay on step one - the flow cannot advance with invalid data.
    await expect(page).toHaveURL(/checkout-step-one\.html/);
  });
});
