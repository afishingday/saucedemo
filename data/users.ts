/**
 * SauceDemo publishes these fixed credentials on its own login page.
 * Centralized here so no test hardcodes a literal string.
 */
export const USERS = {
  standard: { username: 'standard_user', password: 'secret_sauce' },
  lockedOut: { username: 'locked_out_user', password: 'secret_sauce' },
  // Introduce latencia artificial (confirmado: ~5-6s extra en el login, el resto del flujo
  // corre a velocidad normal). Se usa para demostrar que las esperas del framework son
  // "web-first" (auto-waiting) y no timeouts hardcodeados — ver tests/performance-glitch-robustness.spec.ts.
  performanceGlitch: { username: 'performance_glitch_user', password: 'secret_sauce' },
} as const;

export const CHECKOUT_INFO = {
  valid: { firstName: 'Luis', lastName: 'Montoya', postalCode: '110111' },
  missingPostalCode: { firstName: 'Luis', lastName: 'Montoya', postalCode: '' },
} as const;

export const PRODUCT = {
  backpack: 'Sauce Labs Backpack',
  allTheThings: 'Test.allTheThings() T-Shirt (Red)',
} as const;

/**
 * Conjunto REPRESENTATIVO (no exhaustivo) para el happy path data-driven de TC-01
 * (tests/happy-path-purchase.spec.ts): un producto normal + un caso borde de nombre
 * (paréntesis y punto — el tipo de string que rompe un selector/regex mal armado). El
 * objetivo de variar el producto es probar que el flujo no depende de un string particular;
 * con estos dos alcanza para eso sin pagar el costo de correr las 6 combinaciones del
 * catálogo completo. Si aparece un producto con otro tipo de dato problemático (precio con
 * miles, nombre con unicode, etc.), se agrega acá como un tercer elemento, no un spec nuevo.
 */
export const HAPPY_PATH_PRODUCTS = [PRODUCT.backpack, PRODUCT.allTheThings] as const;
