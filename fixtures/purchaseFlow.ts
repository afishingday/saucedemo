import { expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage, type Product } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { USERS } from '../data/users';

/**
 * Compone los 4 Page Objects en los pasos de varios pantallas que se repetían, copy-paste,
 * en casi todos los specs: login, agregar-producto-y-llegar-a-checkout, completar
 * envío-y-continuar, finalizar-y-confirmar.
 *
 * Qué SÍ vive acá (y por qué no rompe "una sola razón para fallar" por spec): son
 * aserciones sobre si la propia ACCIÓN compuesta funcionó (¿login llegó a Products?, ¿el
 * producto agregado aparece bien en el carrito?, ¿el pedido terminó en la pantalla de
 * confirmación con el texto correcto?) — no la razón específica por la que existe cada
 * test. Todo caller de `addProductAndReachCheckout`, sin excepción, necesita que el
 * producto haya quedado bien en el carrito antes de seguir; no es una aserción opcional
 * "de negocio" de un test puntual.
 *
 * Qué NO vive acá: `fillShippingAndContinue` no assertea si avanzó o no, porque lo usan
 * tanto el camino feliz (avanza a Overview) como TC-03 (se queda en step-one con error) —
 * esa aserción sí es específica de cada spec, y ahí se queda.
 * `verifyProductInOverview` es un método aparte (no parte de `fillShippingAndContinue`)
 * por la misma razón: solo tiene sentido llamarlo cuando el checkout efectivamente avanzó.
 */
export class PurchaseFlow {
  private readonly page: Page;

  constructor(
    private readonly loginPage: LoginPage,
    private readonly inventoryPage: InventoryPage,
    private readonly cartPage: CartPage,
    private readonly checkoutPage: CheckoutPage,
  ) {
    this.page = loginPage.page;
  }

  /** Login + confirma que llegamos a Products con el carrito realmente vacío (aislamiento —
   * ver fixtures/pages.fixture.ts). Genérico: lo usa tanto standard_user como
   * performance_glitch_user (ROBUSTNESS-01). */
  async loginAs(username: string, password: string): Promise<void> {
    await this.loginPage.goto();
    await this.loginPage.login(username, password);
    await expect(this.page).toHaveURL(/inventory\.html/);
    await expect(this.inventoryPage.pageTitle).toBeVisible();
    await expect(this.inventoryPage.cartBadge).toHaveCount(0);
  }

  /** Atajo para el caso más común de este repo. */
  async loginAsStandardUser(): Promise<void> {
    await this.loginAs(USERS.standard.username, USERS.standard.password);
  }

  /**
   * Captura nombre/precio real del producto, lo agrega, confirma que aparece bien en el
   * carrito (mismo nombre y precio), y llega a checkout-step-one. Devuelve el producto
   * capturado para que el spec lo siga usando más adelante (overview, matemática, PDF, etc.)
   * sin tener que volver a leerlo del DOM.
   */
  async addProductAndReachCheckout(productName: string): Promise<Product> {
    const product = await this.inventoryPage.productInfo(productName);
    await this.inventoryPage.addProductToCart(productName);
    await expect(this.inventoryPage.cartBadge).toHaveText('1');

    await this.inventoryPage.goToCart();
    await expect(this.cartPage.cartItemByName(product.name)).toBeVisible();
    await expect(this.cartPage.cartItemPrice(product.name)).toHaveText(product.price);

    await this.cartPage.checkout();
    await expect(this.page).toHaveURL(/checkout-step-one\.html/);
    return product;
  }

  /** Completa el formulario de envío e intenta continuar — no assertea el resultado: lo usan
   * tanto el camino feliz (avanza) como TC-03 (se queda en step-one con error). */
  async fillShippingAndContinue(info: { firstName: string; lastName: string; postalCode: string }): Promise<void> {
    await this.checkoutPage.fillInformation(info.firstName, info.lastName, info.postalCode);
    await this.checkoutPage.continueToOverview();
  }

  /** Confirma que el nombre/precio de `product` aparecen igual en el checkout overview.
   * Solo tiene sentido después de un `fillShippingAndContinue` que sí avanzó. */
  async verifyProductInOverview(product: Product): Promise<void> {
    await expect(this.checkoutPage.overviewItemName).toHaveText(product.name);
    await expect(this.checkoutPage.overviewItemPrice).toHaveText(product.price);
  }

  /** Finaliza la orden y confirma el texto exacto de éxito. */
  async finishAndConfirm(): Promise<void> {
    await this.checkoutPage.finishOrder();
    await expect(this.page).toHaveURL(/checkout-complete\.html/);
    await expect(this.checkoutPage.confirmationHeader).toHaveText('Thank you for your order!');
  }
}
