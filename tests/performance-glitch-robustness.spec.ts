import { test } from '../fixtures/pages.fixture';
import { USERS, CHECKOUT_INFO, PRODUCT } from '../data/users';

/**
 * performance_glitch_user introduce latencia artificial real (~5-6s, confirmado contra el
 * sitio, concentrada en el login — el resto del flujo corre a velocidad normal).
 *
 * Este test corre exactamente el mismo flujo compuesto que usa TC-01
 * (fixtures/purchaseFlow.ts — login, agregar-producto-y-llegar-a-checkout, completar envío,
 * finalizar), sin reimplementar un solo paso, solo con un usuario distinto. Ningún
 * waitForTimeout ni sleep agregado para "esperar a que cargue": las mismas aserciones
 * web-first que ya usa el flujo (toBeVisible/toHaveURL/toHaveText, que reintentan por su
 * cuenta hasta su propio timeout) son las que tienen que sobrevivir la latencia. Si este
 * test pasa así, demuestra que las esperas son robustas ante latencia real de backend —no
 * timeouts hardcodeados calibrados a mano que se romperían apenas la latencia cambiara.
 *
 * test.setTimeout más alto = más presupuesto total para el test, no una espera fija: sigue
 * sin haber ningún punto del código que se quede parado un tiempo prefijado.
 */
test('ROBUSTNESS-01 - el happy path tolera la latencia de performance_glitch_user sin esperas fijas', async ({
  purchaseFlow,
}) => {
  test.setTimeout(60_000);

  await purchaseFlow.loginAs(USERS.performanceGlitch.username, USERS.performanceGlitch.password);
  await purchaseFlow.addProductAndReachCheckout(PRODUCT.backpack);
  await purchaseFlow.fillShippingAndContinue(CHECKOUT_INFO.valid);
  await purchaseFlow.finishAndConfirm();
});
