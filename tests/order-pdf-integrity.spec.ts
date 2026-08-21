import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import { test, expect } from '../fixtures/pages.fixture';
import { CHECKOUT_INFO, PRODUCT } from '../data/users';
import { parseMoney, toCents } from '../utils/money';

/**
 * Test avanzado de integridad de datos end-to-end: el botón "Generate PDF order" descarga
 * un Order Receipt. No alcanza con comprobar que el archivo se descargó — hay que
 * demostrar que el PDF CONTIENE los mismos datos que el usuario vio y tipeó en pantalla.
 *
 * Estrategia: capturar los valores esperados ANTES de generar el PDF (nombre/precio del
 * producto, Ship To, Postal Code, y los 3 totales del overview), y comparar el texto real
 * extraído del PDF (pdf-parse) contra esos valores capturados en vivo — nunca contra un
 * literal fijo en el test, que podría "coincidir" con el PDF sin que el dato realmente
 * haya viajado correctamente desde el checkout hasta el documento.
 *
 * Login y agregar-producto-y-llegar-a-checkout están factorizados en
 * fixtures/purchaseFlow.ts — lo específico de este test es todo lo que pasa DESPUÉS de
 * finalizar la orden (descargar y parsear el PDF), que ningún otro spec hace.
 */
test('PDF-01 - el Order Receipt contiene los mismos datos que se vieron en el checkout', async ({
  purchaseFlow,
  checkoutPage,
}, testInfo) => {
  await purchaseFlow.loginAsStandardUser();
  const product = await purchaseFlow.addProductAndReachCheckout(PRODUCT.backpack);

  const { firstName, lastName, postalCode } = CHECKOUT_INFO.valid;
  await purchaseFlow.fillShippingAndContinue({ firstName, lastName, postalCode });

  // Se capturan los 3 totales ACÁ, mientras todavía se ven en el overview — son el "ground
  // truth" contra el que se va a comparar el PDF más abajo.
  const totals = await checkoutPage.readTotals();
  // Sanity check en la propia UI antes de generar el PDF: si esto no cuadra acá, no tiene
  // sentido seguir comparando contra el documento.
  expect(toCents(totals.subtotal) + toCents(totals.tax)).toBe(toCents(totals.total));

  await purchaseFlow.finishAndConfirm();

  const [download] = await Promise.all([
    checkoutPage.page.waitForEvent('download'),
    checkoutPage.generatePdfButton.click(),
  ]);
  // testInfo.outputPath() en vez de un path fijo ("test-results/order-receipt.pdf"): da un
  // directorio único por test/worker, así una corrida en paralelo no pisa el archivo de
  // otro run. Se conserva el PDF como evidencia adjunta al reporte, no se borra.
  const pdfPath = testInfo.outputPath('order-receipt.pdf');
  await download.saveAs(pdfPath);
  await testInfo.attach('order-receipt.pdf', { path: pdfPath, contentType: 'application/pdf' });

  const parser = new PDFParse({ data: await readFile(pdfPath) });
  const { text } = await parser.getText();
  await parser.destroy();

  await test.step('El PDF menciona el producto correcto, con su precio correcto', async () => {
    expect(text).toContain(product.name);
    expect(text).toContain(product.price);
  });

  await test.step('El PDF tiene el Ship To y el Postal Code que se tipearon en checkout', async () => {
    // El PDF junta First+Last en una sola línea "Ship To", sin labels — confirmado contra
    // un PDF real antes de escribir esta aserción.
    expect(text).toContain(`${firstName} ${lastName}`);
    expect(text).toContain(postalCode);
  });

  await test.step('Los 3 totales del PDF son idénticos a los del checkout overview', async () => {
    // El PDF imprime "Item total $29.99" (sin los dos puntos que sí tiene la UI) — mismo
    // monto, formato levemente distinto; confirmado contra el PDF real.
    expect(text).toContain(`Item total $${totals.subtotal.toFixed(2)}`);
    expect(text).toContain(`Tax $${totals.tax.toFixed(2)}`);
    expect(text).toContain(`Total $${totals.total.toFixed(2)}`);
  });

  await test.step('La matemática cuadra usando los números que imprime el PDF (no los de la UI)', async () => {
    // Re-extrae los montos del propio texto del PDF: así esta aserción no depende de que
    // "el PDF haya copiado bien el HTML", sino de que el contenido del documento sea
    // matemáticamente consistente por sí mismo.
    const pdfSubtotal = parseMoney(text.match(/Item total \$[\d.]+/)?.[0] ?? '');
    const pdfTax = parseMoney(text.match(/Tax \$[\d.]+/)?.[0] ?? '');
    const pdfTotal = parseMoney(text.match(/Total \$[\d.]+/)?.[0] ?? '');
    expect(toCents(pdfSubtotal) + toCents(pdfTax)).toBe(toCents(pdfTotal));
  });
});
