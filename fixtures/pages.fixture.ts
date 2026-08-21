import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { PurchaseFlow } from './purchaseFlow';

type PageObjects = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  // Compone los 4 Page Objects de arriba en los pasos multi-pantalla que se repetían en
  // casi todos los specs (login, agregar-producto-y-llegar-a-checkout, etc.) — ver
  // purchaseFlow.ts para el detalle de qué vive ahí y por qué.
  purchaseFlow: PurchaseFlow;
};

/**
 * Extends Playwright's base test with one ready-to-use instance of each
 * Page Object, so specs never construct them by hand.
 *
 * AISLAMIENTO DE TESTS (por qué el carrito nunca "arrastra" estado entre tests):
 * SauceDemo guarda el carrito en localStorage, que vive atado al origen dentro de un
 * `BrowserContext`. La fixture `page` de Playwright Test crea un `browser.newContext()`
 * nuevo (perfil "incógnito" propio, sin cookies/localStorage previos) para CADA test por
 * defecto — no se comparte entre tests salvo que se configure explícitamente
 * `storageState` o se reutilice el mismo context a mano, y acá no se hace ninguna de las
 * dos cosas. Por eso cada test arranca con el carrito realmente vacío, sin importar el
 * orden en que corran ni si corren en paralelo — la sospecha típica de flakiness por
 * "el test anterior dejó algo en el carrito" queda descartada por diseño, no por
 * convención. `purchaseFlow.loginAs(...)` deja esto demostrado en cada corrida (no solo
 * documentado acá) con `expect(inventoryPage.cartBadge).toHaveCount(0)` justo después del
 * login.
 */
export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  purchaseFlow: async ({ loginPage, inventoryPage, cartPage, checkoutPage }, use) => {
    await use(new PurchaseFlow(loginPage, inventoryPage, cartPage, checkoutPage));
  },
});

export { expect } from '@playwright/test';
