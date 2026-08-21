import { type Locator, type Page } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItems = page.locator('.cart_item');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
  }

  cartItemByName(productName: string): Locator {
    return this.cartItems.filter({ hasText: productName });
  }

  /** Precio mostrado en el carrito para ese producto — para comparar contra el precio capturado en Inventory. */
  cartItemPrice(productName: string): Locator {
    return this.cartItemByName(productName).locator('[data-test="inventory-item-price"]');
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
