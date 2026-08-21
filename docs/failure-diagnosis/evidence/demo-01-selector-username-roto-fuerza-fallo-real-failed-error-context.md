# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: diagnostics\forced-failure-demo.spec.ts >> Diagnóstico de fallos (demo reproducible) >> DEMO-01 @demo-failure - selector de username roto fuerza un fallo real
- Location: tests\diagnostics\forced-failure-demo.spec.ts:20:7

# Error details

```
TimeoutError: locator.fill: Timeout 10000ms exceeded.
Call log:
  - waiting for getByPlaceholder('User name')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]: Swag Labs
    - generic [ref=e5]:
      - generic [ref=e9]:
        - textbox "Username" [ref=e11]
        - textbox "Password" [ref=e13]
        - button "Login" [ref=e15] [cursor=pointer]
      - generic [ref=e17]:
        - generic [ref=e18]:
          - heading "Accepted usernames are:" [level=4] [ref=e19]
          - text: standard_userlocked_out_userproblem_userperformance_glitch_usererror_uservisual_user
        - generic [ref=e20]:
          - heading "Password for all users:" [level=4] [ref=e21]
          - text: secret_sauce
  - generic [ref=e22]:
    - generic [ref=e23]: DEMO-01 — Diagnóstico de fallos
    - generic [ref=e24]: QUÉ SE PROBÓ
    - generic [ref=e25]: Login en SauceDemo usando a propósito un selector roto para el campo de usuario (getByPlaceholder("User name"), con espacio) en vez del selector real del POM.
    - generic [ref=e26]: RESULTADO ESPERADO
    - generic [ref=e27]: El campo de usuario se completa con "standard_user" y el login continúa con normalidad.
    - generic [ref=e28]: QUÉ SE ENCONTRÓ
    - generic [ref=e29]: "error: TimeoutError: locator.fill excedió los 10000ms"
    - generic [ref=e30]: "selector usado: getByPlaceholder(\"User name\")"
    - generic [ref=e31]: "placeholder real en el DOM: Username (una sola palabra, sin espacio)"
    - generic [ref=e32]: "causa raíz: El selector nunca matcheó ningún elemento, así que Playwright esperó todo el actionTimeout y recién ahí lanzó el error"
    - generic [ref=e33]: "evidencia: trace.zip + screenshot adjuntos automáticamente por Playwright a este resultado"
    - generic [ref=e34]: "VEREDICTO: FALLÓ"
```

# Test source

```ts
  1  | import { test } from '../../fixtures/pages.fixture';
  2  | import { USERS } from '../../data/users';
  3  | import { evidenceReveal } from '../../utils/evidenceReveal';
  4  | 
  5  | /**
  6  |  * Fase 3 del enunciado ("Diagnóstico de Fallos y Reporteo con IA"), como spec reproducible.
  7  |  *
  8  |  * A propósito usa un selector de username que no matchea nada del DOM real de SauceDemo (mismo
  9  |  * typo documentado en docs/failure-diagnosis.md: "User name" en vez de "Username") para forzar
  10 |  * un fallo real y dejar la evidencia grabada con el panel de diagnóstico en español. No toca
  11 |  * pages/LoginPage.ts — así la demo se puede volver a correr en cualquier momento sin romper ni
  12 |  * tener que revertir el POM real que usan los otros 3 specs.
  13 |  *
  14 |  * Excluido de `npm test` (tag @demo-failure, ver package.json) porque está diseñado para fallar
  15 |  * siempre — es documentación ejecutable, no un caso de aceptación.
  16 |  *
  17 |  * Correr con: npm run test:failure-demo
  18 |  */
  19 | test.describe('Diagnóstico de fallos (demo reproducible)', () => {
  20 |   test('DEMO-01 @demo-failure - selector de username roto fuerza un fallo real', async ({
  21 |     page,
  22 |     loginPage,
  23 |   }) => {
  24 |     await loginPage.goto();
  25 | 
  26 |     // Selector roto a propósito: no usa loginPage.usernameInput (ese sí matchea).
  27 |     const usernameInputRoto = page.getByPlaceholder('User name');
  28 | 
  29 |     try {
> 30 |       await usernameInputRoto.fill(USERS.standard.username, { timeout: 10_000 });
     |                               ^ TimeoutError: locator.fill: Timeout 10000ms exceeded.
  31 |     } catch (error) {
  32 |       await evidenceReveal(page, {
  33 |         caso: 'DEMO-01 — Diagnóstico de fallos',
  34 |         queSeProbo:
  35 |           'Login en SauceDemo usando a propósito un selector roto para el campo de usuario ' +
  36 |           '(getByPlaceholder("User name"), con espacio) en vez del selector real del POM.',
  37 |         queSeEsperaba:
  38 |           'El campo de usuario se completa con "standard_user" y el login continúa con normalidad.',
  39 |         queSeEncontro: {
  40 |           error: 'TimeoutError: locator.fill excedió los 10000ms',
  41 |           'selector usado': 'getByPlaceholder("User name")',
  42 |           'placeholder real en el DOM': 'Username (una sola palabra, sin espacio)',
  43 |           'causa raíz': 'El selector nunca matcheó ningún elemento, así que Playwright esperó todo el actionTimeout y recién ahí lanzó el error',
  44 |           evidencia: 'trace.zip + screenshot adjuntos automáticamente por Playwright a este resultado',
  45 |         },
  46 |         veredicto: 'FALLÓ',
  47 |       });
  48 |       throw error; // el test debe seguir fallando de verdad para que Playwright retenga trace/screenshot/video
  49 |     }
  50 | 
  51 |     throw new Error(
  52 |       'El selector roto matcheó un elemento real — esta demo dejó de reproducir el fallo esperado y hay que revisarla.',
  53 |     );
  54 |   });
  55 | });
  56 | 
```