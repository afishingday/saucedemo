import { test } from '../../fixtures/pages.fixture';
import { USERS } from '../../data/users';
import { evidenceReveal } from '../../utils/evidenceReveal';

/**
 * Fase 3 del enunciado ("Diagnóstico de Fallos y Reporteo con IA"), como spec reproducible.
 *
 * A propósito usa un selector de username que no matchea nada del DOM real de SauceDemo (mismo
 * typo documentado en docs/failure-diagnosis.md: "User name" en vez de "Username") para forzar
 * un fallo real y dejar la evidencia grabada con el panel de diagnóstico en español. No toca
 * pages/LoginPage.ts — así la demo se puede volver a correr en cualquier momento sin romper ni
 * tener que revertir el POM real que usan los otros 3 specs.
 *
 * Excluido de `npm test` (tag @demo-failure, ver package.json) porque está diseñado para fallar
 * siempre — es documentación ejecutable, no un caso de aceptación.
 *
 * Correr con: npm run test:failure-demo
 */
test.describe('Diagnóstico de fallos (demo reproducible)', () => {
  test('DEMO-01 @demo-failure - selector de username roto fuerza un fallo real', async ({
    page,
    loginPage,
  }) => {
    await loginPage.goto();

    // Selector roto a propósito: no usa loginPage.usernameInput (ese sí matchea).
    const usernameInputRoto = page.getByPlaceholder('User name');

    try {
      await usernameInputRoto.fill(USERS.standard.username, { timeout: 10_000 });
    } catch (error) {
      await evidenceReveal(page, {
        caso: 'DEMO-01 — Diagnóstico de fallos',
        queSeProbo:
          'Login en SauceDemo usando a propósito un selector roto para el campo de usuario ' +
          '(getByPlaceholder("User name"), con espacio) en vez del selector real del POM.',
        queSeEsperaba:
          'El campo de usuario se completa con "standard_user" y el login continúa con normalidad.',
        queSeEncontro: {
          error: 'TimeoutError: locator.fill excedió los 10000ms',
          'selector usado': 'getByPlaceholder("User name")',
          'placeholder real en el DOM': 'Username (una sola palabra, sin espacio)',
          'causa raíz': 'El selector nunca matcheó ningún elemento, así que Playwright esperó todo el actionTimeout y recién ahí lanzó el error',
          evidencia: 'trace.zip + screenshot adjuntos automáticamente por Playwright a este resultado',
        },
        veredicto: 'FALLÓ',
      });
      throw error; // el test debe seguir fallando de verdad para que Playwright retenga trace/screenshot/video
    }

    throw new Error(
      'El selector roto matcheó un elemento real — esta demo dejó de reproducir el fallo esperado y hay que revisarla.',
    );
  });
});
