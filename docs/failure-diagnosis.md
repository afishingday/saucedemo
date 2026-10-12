# Diagnóstico de fallos — demostración

## Cómo se reproduce el fallo

A diferencia de una primera versión de esta demo (que rompía a mano el selector real de
[`pages/LoginPage.ts`](../pages/LoginPage.ts) y había que revertir después), el fallo ahora es
**reproducible bajo demanda** sin tocar el POM real: [`tests/diagnostics/forced-failure-demo.spec.ts`](../tests/diagnostics/forced-failure-demo.spec.ts)
define su propio selector roto a propósito (`getByPlaceholder('User name')`, con espacio, en vez
del `Username` real) y lo usa directamente, sin pasar por `LoginPage`.

Corrida con:

```bash
npm run test:failure-demo
```

Este caso está tageado `@demo-failure` y excluido de `npm test` (ver `package.json`) — está
diseñado para fallar siempre, así que no puede convivir con los 3 casos reales en la corrida
principal.

Con `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'` y
`video: { mode: 'on', size: { width: 1920, height: 1080 } }` ya configurados en
[`playwright.config.ts`](../playwright.config.ts), Playwright retiene automáticamente los tres
(el video, además, se graba en toda corrida — pass y fail — no solo en el fallo).

## El panel de evidencia

Antes de volver a lanzar el error (para que Playwright siga tratando el test como fallido), el
spec pinta un panel fijo en el borde derecho de la página —
[`utils/evidenceReveal.ts`](../utils/evidenceReveal.ts) — con **qué se probó, qué se esperaba,
qué se encontró y el veredicto**, todo en español, y lo deja en pantalla ~2 segundos antes de que
el test termine. Así el screenshot y el video quedan autoexplicativos por sí solos, sin depender
de tener el reporte de Playwright abierto al lado. Mismo patrón visual (panel oscuro,
monoespaciado, franja angosta a la derecha) que ya se usa en los demás proyectos QA, portado acá.

## Evidencia generada

Guardada en [`evidence/`](./evidence/):

- `demo-01-selector-username-roto-fuerza-fallo-real-failed-screenshot.png` — captura en 1920×1080 real, con el panel visible.
- `demo-01-selector-username-roto-fuerza-fallo-real-failed-video.webm` — video HD (1920×1080 real, no upscalado) de principio a fin: intento de login → timeout → panel de diagnóstico.
- `demo-01-selector-username-roto-fuerza-fallo-real-failed-trace.zip` — trace completo, abrible con `npx playwright show-trace`.
- `demo-01-selector-username-roto-fuerza-fallo-real-failed-error-context.md` — snapshot de accesibilidad + log de error que Playwright genera automáticamente al fallar.

**Nota sobre el formato de video:** queda en `.webm` (formato nativo de Playwright — reproducible
en cualquier navegador moderno y en GitHub); no se agregó conversión a `.mp4` para este ejercicio.

## Log de error (tal cual lo emitió Playwright)

```
TimeoutError: locator.fill: Timeout 10000ms exceeded.
Call log:
  - waiting for getByPlaceholder('User name')

    at tests\diagnostics\forced-failure-demo.spec.ts:30

    29 |     try {
  > 30 |       await usernameInputRoto.fill(USERS.standard.username, { timeout: 10_000 });
       |                               ^
    31 |     } catch (error) {
```

El `error-context.md` que Playwright adjunta automáticamente también incluye el snapshot de
accesibilidad de la página en ese instante:

```yaml
- generic [ref=e9]:
  - textbox "Username" [ref=e11]
  - textbox "Password" [ref=e13]
  - button "Login" [ref=e15]
```

## Diagnóstico (IA — Claude Code) y análisis propio

**Causa raíz:** el DOM real de `saucedemo.com` expone el campo de usuario con
`placeholder="Username"` (una sola palabra, confirmado por el `textbox "Username"` del snapshot
de accesibilidad). El selector roto pedía `getByPlaceholder('User name')` (dos palabras), que no
matchea ningún elemento. `getByPlaceholder` no lanza un error inmediato de "elemento no
encontrado": como toda acción de Playwright, reintenta el matching durante el timeout configurado
(10 s, pasado explícitamente en la demo) esperando a que aparezca algo que cumpla la condición;
al no aparecer nunca, `.fill()` finalmente lanza `TimeoutError: locator.fill: Timeout 10000ms
exceeded`. El mensaje por sí solo no dice *por qué* no matchea — para eso hace falta el snapshot
de accesibilidad adjunto, que expone el texto real del placeholder y permite comparar contra el
selector usado.

**Solución:** en el POM real (`pages/LoginPage.ts`) el selector correcto ya es
`getByPlaceholder('Username')` — la demo nunca lo toca, solo reproduce el mismo typo en su propio
selector local para poder fallar bajo demanda sin poner en riesgo el código que usan los otros 3
tests.

**Mejora estructural que ya está en el diseño:** los tres specs reales comparten sus Page Objects
vía `fixtures/pages.fixture.ts`, así que un typo real en `LoginPage.ts` haría fallar los tres
tests que dependen de login (no solo uno) — imposible de pasar desapercibido en una corrida
completa de `npm test`.

**Verificación:** `npm test` (los 3 casos reales, sin la demo) sigue en verde — ver
[`playwright-report/`](../playwright-report/) generado por la última corrida.
