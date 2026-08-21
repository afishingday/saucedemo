import { type Locator, type Page } from '@playwright/test';
import { parseMoney } from '../utils/money';

export type OrderTotals = { subtotal: number; tax: number; total: number };

/**
 * Covers all three SauceDemo checkout screens (info -> overview -> complete)
 * as one Page Object, matching the four-page breakdown requested for the
 * exercise (Login / Inventory / Cart / Checkout).
 */
export class CheckoutPage {
  readonly page: Page;

  // Step One - "Checkout: Your Information"
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly errorMessage: Locator;

  // Step Two - "Checkout: Overview"
  readonly finishButton: Locator;
  readonly overviewItemName: Locator;
  readonly overviewItemPrice: Locator;
  readonly subtotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalLabel: Locator;

  // Step Three - "Checkout: Complete!"
  readonly confirmationHeader: Locator;
  readonly generatePdfButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.firstNameInput = page.getByPlaceholder('First Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    this.postalCodeInput = page.getByPlaceholder('Zip/Postal Code');
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.errorMessage = page.locator('[data-test="error"]');

    this.finishButton = page.getByRole('button', { name: 'Finish' });
    // El overview reusa los mismos data-test de nombre/precio que Inventory y Cart, escopeados
    // a la fila del producto — así comparamos "manzanas con manzanas" en las 3 pantallas.
    const overviewItem = page.locator('.cart_item').first();
    this.overviewItemName = overviewItem.locator('[data-test="inventory-item-name"]');
    this.overviewItemPrice = overviewItem.locator('[data-test="inventory-item-price"]');
    this.subtotalLabel = page.locator('[data-test="subtotal-label"]');
    this.taxLabel = page.locator('[data-test="tax-label"]');
    this.totalLabel = page.locator('[data-test="total-label"]');

    // Es un <h2> (confirmado contra el DOM real), así que getByRole('heading', ...) también
    // matchearía — se usa data-test="complete-header" en su lugar porque el enunciado pide
    // verificar puntualmente ese atributo.
    this.confirmationHeader = page.locator('[data-test="complete-header"]');
    this.generatePdfButton = page.locator('[data-test="generate-pdf-order"]');
  }

  async fillInformation(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continueToOverview(): Promise<void> {
    await this.continueButton.click();
  }

  async finishOrder(): Promise<void> {
    await this.finishButton.click();
  }

  /** Lee y parsea los 3 totales del overview ("Item total: $29.99" -> 29.99, etc.). */
  async readTotals(): Promise<OrderTotals> {
    const [subtotalText, taxText, totalText] = await Promise.all([
      this.subtotalLabel.innerText(),
      this.taxLabel.innerText(),
      this.totalLabel.innerText(),
    ]);
    return {
      subtotal: parseMoney(subtotalText),
      tax: parseMoney(taxText),
      total: parseMoney(totalText),
    };
  }
}
