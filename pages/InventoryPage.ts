import { type Locator, type Page } from '@playwright/test';

export type Product = { name: string; price: string };

export class InventoryPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly productCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByText('Products', { exact: true });
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    this.productCards = page.locator('.inventory_item');
  }

  /** Scopes to the single product card so "Add to cart" resolves to the right item. */
  private productCard(productName: string): Locator {
    return this.productCards.filter({ hasText: productName });
  }

  async addProductToCart(productName: string): Promise<void> {
    await this.productCard(productName)
      .getByRole('button', { name: 'Add to cart' })
      .click();
  }

  /** Nombre y precio de un producto puntual, leídos del DOM (nunca hardcodeados en un test). */
  async productInfo(productName: string): Promise<Product> {
    const card = this.productCard(productName);
    const name = await card.locator('[data-test="inventory-item-name"]').innerText();
    const price = await card.locator('[data-test="inventory-item-price"]').innerText();
    return { name, price };
  }

  /**
   * Nombre y precio de TODOS los productos del listado, en el orden real del DOM (el sort
   * por defecto de SauceDemo es "Name (A to Z)", así que este orden es estable/determinista
   * entre corridas — es lo que habilita el test data-driven a ser reproducible).
   */
  async allProducts(): Promise<Product[]> {
    return this.productCards.evaluateAll((cards) =>
      cards.map((card) => ({
        name: card.querySelector('[data-test="inventory-item-name"]')?.textContent?.trim() ?? '',
        price: card.querySelector('[data-test="inventory-item-price"]')?.textContent?.trim() ?? '',
      })),
    );
  }

  async goToCart(): Promise<void> {
    await this.cartLink.click();
  }
}
