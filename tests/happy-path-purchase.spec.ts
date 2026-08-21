import { test, expect } from '../fixtures/pages.fixture';
import { CHECKOUT_INFO, HAPPY_PATH_PRODUCTS } from '../data/users';
import { parseMoney, toCents } from '../utils/money';
import type { Product } from '../pages/InventoryPage';

/**
 * TC-01 - Happy Path, data-driven sobre un conjunto REPRESENTATIVO de productos (no todo el
 * catálogo): "Sauce Labs Backpack" (caso normal) y "Test.allTheThings() T-Shirt (Red)" (caso
 * borde de nombre — paréntesis y punto). Ver data/users.ts (HAPPY_PATH_PRODUCTS) para el
 * criterio completo de por qué esos dos y no los 6.
 *
 * Absorbe lo que antes era un spec aparte (product-data-propagation.spec.ts, que corría el
 * resto del catálogo solo hasta el Overview): "¿el happy path completo funciona?" y "¿el dato
 * correcto viaja por todo el flujo?" son, en el fondo, la misma pregunta — no hacía falta
 * responderla dos veces con dos profundidades distintas en dos specs separados. Cada
 * iteración de acá hace el flujo COMPLETO (hasta la confirmación), no solo hasta el Overview.
 *
 * Va más allá de "llegué a la pantalla final": valida que el nombre/precio del producto
 * viajan sin corromperse por Inventory -> Cart -> Checkout Overview, que la matemática del
 * resumen de compra cuadra (Item total + Tax = Total), y que el mensaje de confirmación es
 * el texto literal exacto — no una coincidencia parcial.
 *
 * Los pasos comunes (login, agregar-producto-y-llegar-a-checkout, completar envío, finalizar)
 * están factorizados en fixtures/purchaseFlow.ts — un test() por producto (loop a nivel de
 * módulo, mismo patrón que ya se usaba en el data-driven anterior) para que, si un producto
 * falla, los demás igual terminen de correr y reporten su resultado por separado.
 */
test.describe('E2E purchase flow', () => {
  for (const productName of HAPPY_PATH_PRODUCTS) {
    test(`TC-01 - "${productName}": a standard user can complete a purchase end to end`, async ({
      purchaseFlow,
      checkoutPage,
    }) => {
      let product: Product;

      await test.step('Login with valid credentials', async () => {
        await purchaseFlow.loginAsStandardUser();
      });

      await test.step('Add the product to the cart and reach checkout', async () => {
        // purchaseFlow.addProductAndReachCheckout ya confirma que el producto capturado
        // (nombre/precio real leído del DOM) aparece igual en el carrito.
        product = await purchaseFlow.addProductAndReachCheckout(productName);
      });

      await test.step('Fill shipping information and continue', async () => {
        await purchaseFlow.fillShippingAndContinue(CHECKOUT_INFO.valid);
      });

      await test.step('Verify the overview shows the same product, and the totals add up', async () => {
        await purchaseFlow.verifyProductInOverview(product);

        // Aserción de nivel de negocio, no solo de navegación: Item total + Tax debe cuadrar
        // con Total. Se compara en centavos (enteros) para no depender de precisión de floats.
        const totals = await checkoutPage.readTotals();
        expect(toCents(totals.subtotal) + toCents(totals.tax)).toBe(toCents(totals.total));
        // El subtotal, además, tiene que coincidir con el precio real del producto (qty=1).
        expect(totals.subtotal).toBe(parseMoney(product.price));
      });

      await test.step('Finish the order and see the confirmation', async () => {
        await purchaseFlow.finishAndConfirm();
      });
    });
  }
});
