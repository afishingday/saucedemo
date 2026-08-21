# PROMPTS.md — Bitácora de prompts usados con IA

**Herramienta:** Claude Code (Anthropic), usada como agente de desarrollo dentro del
propio repositorio: lee y escribe los archivos del proyecto y ejecuta los comandos
(`npx playwright test`, etc.) bajo mi dirección.

Mi rol en el ejercicio fue el de **QA Architect dirigiendo un agente con skills mediante
prompts de alto nivel**: definí la estrategia de pruebas, la arquitectura (patrón POM,
criterio de selectores, qué casos automatizar y por qué) y validé o corregí cada salida antes
de darla por buena. El agente expandió cada instrucción de alto nivel en la implementación
concreta — código, configuración, verificación contra el sitio real — y aceleró la escritura
de boilerplate; el criterio de calidad detrás de cada decisión es mío.

A continuación, los 7 prompts reales que dirigieron el trabajo, agrupados por las tres fases
del entregable (generación de casos de prueba, creación de selectores/POM, y diagnóstico de
fallos) más las extensiones — refuerzo a nivel senior y dashboard de métricas — marcadas
claramente como cobertura adicional. Para cada uno documento **qué generó la IA** y **qué
ajusté o verifiqué con criterio propio**.

## Prompt 1 — Framework desde el PDF (Fase 2 del enunciado: selectores + POM + estructura)

**Prompt:**
> Te comparto el PDF de la prueba técnica (Prueba Tecnica QA Engineer.pdf). Quiero que crees un
> framework nuevo de automatización basado en lo que pide: Playwright + TypeScript + Node, sobre
> https://www.saucedemo.com/.
>
> Requisitos de arquitectura:
> - Estructura modular con Page Object Model: LoginPage, InventoryPage, CartPage, CheckoutPage.
> - Selectores robustos: priorizá getByRole / getByText / getByPlaceholder. Usá data-test SOLO
>   donde no haya un rol/nombre accesible (ej. el ícono del carrito o el banner de error),
>   y dejalo documentado con un comentario en el código.
> - Un fixture de Playwright que inyecte cada Page Object en los tests, en vez de instanciarlos
>   a mano en cada spec.
> - En playwright.config.ts: trace 'retain-on-failure', screenshot 'only-on-failure', y los
>   reporters html y json habilitados.
> - Repo listo para correr con npm test.

**Resultado de la IA:** proyecto Node + Playwright + TypeScript inicializado (`npx create-playwright`),
las 4 clases de `pages/` (`LoginPage`, `InventoryPage`, `CartPage`, `CheckoutPage`), el fixture
`fixtures/pages.fixture.ts` con `test.extend`, y `playwright.config.ts` con `trace:
'retain-on-failure'`, `screenshot: 'only-on-failure'` y los reporters `html` + `list` + `json`.

**Ajuste propio:** exploré el DOM real de SauceDemo (script descartable con Playwright, no
asumido) antes de fijar los selectores. Encontré que el ícono del carrito
(`[data-test="shopping-cart-link"]`) y el banner de error (`[data-test="error"]`) no exponen un
rol o nombre accesible propio en el DOM — ahí usé `data-test` como excepción explícita,
documentada con un comentario en el propio código, en vez de forzar un `getByRole` que no
aplica.

## Prompt 2 — Matriz de casos de prueba (Fase 1 del enunciado: generación de pruebas)

**Prompt:**
> Ahora creá la matriz de casos de prueba para el flujo de compra E2E y documentala en
> docs/test-case-matrix.md. Debe tener:
> - 1 Happy Path: login → agregar producto → checkout → confirmación.
> - 2 casos de error.
>
> Para los 2 de error quiero credenciales inválidas (locked_out_user) y checkout con datos
> incompletos (Postal Code vacío), en vez de carrito vacío — porque cubren dos capas de
> validación distintas de la app: autenticación y validación de formulario. Dejá esa
> justificación como nota al pie de la matriz.
>
> Cada caso con: precondiciones, pasos, datos de prueba y resultado esperado.

**Resultado de la IA:** `docs/test-case-matrix.md` con TC-01 (happy path), TC-02 (credenciales
inválidas) y TC-03 (checkout incompleto), cada uno con precondiciones/pasos/resultado esperado
en formato tabla, más la nota al pie con la justificación de por qué esos 2 casos límite y no
carrito vacío.

**Ajuste propio:** el prompt ya fijaba el alcance exacto (qué 2 casos, y por qué) — la única
decisión de ejecución propia fue de formato: estructurar la matriz como tabla con una columna
extra "Automatizado en" apuntando al spec real de cada caso, para que el documento de diseño
quede trazable directamente al código, no solo descriptivo.

## Prompt 3 — Automatización de los 3 casos con POM (Fase 2 del enunciado: automatización)

**Prompt:**
> Automatizá los 3 casos de la matriz con Playwright + TypeScript, usando el POM y el fixture.
> - Usá test.step() para que cada fase del flujo se lea clara en el HTML report.
> - Los textos de error asertalos con toHaveText (string literal completo, no parcial), contra
>   el texto real del DOM.
> - Cero waitForTimeout ni sleeps: solo aserciones web-first.
> Corré la suite y dejala en verde.

**Resultado de la IA:** los 3 specs (`happy-path-purchase.spec.ts`, `login-invalid-credentials.spec.ts`,
`checkout-incomplete-data.spec.ts`), usando los Page Objects y el fixture del Prompt 1,
`test.step()` en el happy path, y `toHaveText()` con el string completo en los dos casos de
error.

**Ajuste propio:** confirmé el texto exacto de ambos errores contra el DOM real antes de
escribirlo en el `toHaveText()` — "Epic sadface: Sorry, this user has been locked out." y
"Error: Postal Code is required" — en vez de aproximarlo de memoria. Verifiqué la suite
completa en verde antes de dar el punto por cerrado.

## Prompt 4 — Diagnóstico de fallos (Fase 3 del enunciado: análisis de errores)

**Prompt:**
> Para la parte de diagnóstico de fallos:
> - Rompé a propósito el selector del username en LoginPage para que no matchee nada.
> - Corré el happy path para forzar el fallo.
> - Con el error/traza real que genere Playwright, diagnosticá la causa raíz y la solución.
> - Documentá en docs/failure-diagnosis.md: el error real tal cual, el diagnóstico y el
>   análisis.
> - Conservá la evidencia (screenshot, trace).
> - Dejá esa demo de fallo como un spec aparte, taggeado @demo-failure y EXCLUIDO de npm test,
>   con su propio script (npm run test:failure-demo), para que npm test quede siempre verde.
> Después revertí el selector y confirmá que la suite queda en verde.

**Resultado de la IA:** `docs/failure-diagnosis.md` con el log de error real de Playwright
(`TimeoutError: locator.fill: Timeout 10000ms exceeded... waiting for getByPlaceholder('User name')`),
el diagnóstico de causa raíz, y la demo reproducible `tests/diagnostics/forced-failure-demo.spec.ts`
(tag `@demo-failure`, excluida de `npm test` vía `--grep-invert`, con su propio script
`npm run test:failure-demo`) — usa su propio selector roto local, sin tocar `LoginPage.ts`, para
poder fallar bajo demanda sin arriesgar el POM real.

**Ajuste propio:** El `error-context.md` que genera Playwright incluye el snapshot de
accesibilidad del momento del fallo — mostraba `textbox "Username"` (una palabra); el selector
roto pedía `getByPlaceholder('User name')` (dos palabras), por eso nunca matcheó y Playwright
agotó el timeout de acción antes de lanzar `TimeoutError`. Apliqué el fix, revertí el selector y
confirmé la suite en verde.

## Extensión adicional — Evidencia enriquecida (panel en pantalla + video HD)

_(Fuera del enunciado — pedido posterior mío, sobre la misma demo de diagnóstico del Prompt 4.)_

**Prompt real** (mensaje textual mío, en tono sugerente — no un comando):
> Si analizás cómo hemos trabajado en trabajo previo, podríamos agregar a la evidencia de los
> fallos un frame vertical a la derecha, todo en español, con la información de qué se probó,
> qué se esperaba y qué se encontró. El video puede ser en calidad HD.

_(La cláusula de apertura es una referencia a trabajo previo generalizada por la misma regla de
confidencialidad aplicada al resto de este documento — no es el texto literal original.)_

**Resultado de la IA:** como refinamiento posterior de la demo de diagnóstico, un panel de
evidencia en pantalla (`utils/evidenceReveal.ts`, franja angosta anclada al borde derecho, en
español — QUÉ SE PROBÓ / RESULTADO ESPERADO / QUÉ SE ENCONTRÓ / VEREDICTO) y video en HD real de
la corrida fallida.

**Ajuste propio:** al verificar el video en HD, medí los píxeles reales del screenshot generado
en vez de asumir que la config alcanzaba, y encontré que salía en 1280×720 pese a declarar
`viewport: 1920×1080` — causa: `projects[0].use` pisaba ese valor con el default del preset
`devices['Desktop Chrome']`. Corregí repitiendo el override dentro de `projects[0].use`, y volví
a medir para confirmar 1920×1080 real antes de dar el punto por cerrado.

## Prompt 5 — Refuerzo a nivel senior (cobertura adicional, criterio propio)

**Prompt:**
> Llevá la suite de "correcta" a "nivel senior". Cero waitForTimeout ni sleeps en ningún lado,
> código comentado para poder defenderlo. Al terminar, suite en verde.
>
> 1. Aserciones más fuertes en el happy path:
>    - Texto literal exacto de confirmación ("Thank you for your order!", data-test
>      complete-header).
>    - Propagación de nombre/precio del producto: Inventory → Cart → Checkout Overview.
>    - Matemática del resumen: Item total + Tax = Total (leer los 3 valores y validar la suma).
>
> 2. Happy path DATA-DRIVEN sobre 2 productos representativos (no un click fijo, no random):
>    "Sauce Labs Backpack" (normal) y "Test.allTheThings() T-Shirt (Red)" (nombre con
>    paréntesis y punto, caso borde de string). La validación de propagación vive dentro del
>    happy path; no creés un spec separado de propagación.
>
> 3. Aislamiento de tests: contexto fresco por test; asegurá que el badge del carrito no
>    arrastre estado entre tests (reset de estado). Comentá por qué previene flakiness por
>    order-dependency.
>
> 4. Test de robustez con performance_glitch_user: el mismo happy path, con latencia real
>    inyectada, pasando solo con esperas web-first (demuestra que no hay timeouts
>    hardcodeados).
>
> 5. Validación del PDF de la orden (integridad de datos end-to-end): el botón "Generate PDF
>    order" descarga un Order Receipt. Capturá desde la UI el producto, precio, nombre (Ship
>    To), Postal Code y los 3 totales; disparen la descarga con la API de descargas de
>    Playwright; parseá el PDF con pdf-parse y asertá que coincide todo, incluida la
>    matemática del total.

Cada una de estas cinco decisiones fue **criterio propio de QA Architect**, no una sugerencia
que la IA propuso por su cuenta — incluida la número 2, que fija de entrada la arquitectura
final (data-driven sobre 2 productos representativos, sin spec de propagación separado).

**Resultado de la IA, por área:**
- **Aserciones fuertes:** `checkoutPage.readTotals()` + `utils/money.ts` para parsear "Item
  total: $29.99" → `29.99` y comparar en centavos; `data-test="complete-header"` para el texto
  exacto de confirmación; propagación de nombre/precio verificada en Inventory → Cart →
  Overview.
- **Happy path data-driven:** `tests/happy-path-purchase.spec.ts` parametrizado (`test()` por
  producto, loop a nivel de módulo) sobre `HAPPY_PATH_PRODUCTS` (`data/users.ts`) — "Sauce Labs
  Backpack" y "Test.allTheThings() T-Shirt (Red)". Cada iteración hace el flujo completo hasta
  la confirmación, con las mismas aserciones de propagación y matemática del total.
- **Aislamiento:** comentario de arquitectura en `fixtures/pages.fixture.ts` explicando el
  `BrowserContext` nuevo por test, más `expect(cartBadge).toHaveCount(0)` explícito en los
  tests que dependen de arrancar con el carrito vacío.
- **Robustez de esperas:** `tests/performance-glitch-robustness.spec.ts`, mismo flujo
  compuesto (`fixtures/purchaseFlow.ts`), cero `waitForTimeout` — solo `expect()` web-first con
  `test.setTimeout()` más alto como presupuesto, no como espera fija.
- **Integridad del PDF:** `tests/order-pdf-integrity.spec.ts` con `pdf-parse` v2 (`PDFParse` +
  `.getText()`), adjuntando el PDF al reporte vía `testInfo.attach()`.

**Ajuste propio (verifiqué contra el sitio real antes de escribir cada aserción — no asumí
nada del enunciado):**
- **`pdf-parse@2.4.5` (la versión instalada) tiene una API completamente distinta a la v1
  clásica** (`new PDFParse({ data })` en vez de `pdf(buffer)`) frente al ejemplo conceptual del
  enunciado — lo confirmé corriendo la extracción real contra un PDF descargado antes de
  escribir el test, no copié un ejemplo genérico de internet.
- **El PDF real imprime los totales sin los dos puntos que sí tiene la UI** ("Item total
  $29.99" vs. "Item total: $29.99" en pantalla) — lo descubrí parseando un PDF real, no asumí
  que el formato sería idéntico al de la UI.
- **El "Ship To" del PDF junta First+Last name en una sola línea sin labels**, seguido del
  Postal Code en la línea siguiente — también lo confirmé contra un PDF real antes de escribir
  la aserción, en vez de inferirlo del HTML del checkout.
- **`error_user` también comparte el mismo bug de sort roto que `problem_user`**, un hallazgo
  propio no pedido en el prompt: antes de escribir la tabla de usuarios especiales del README,
  verifiqué cada afirmación contra el sitio real en vez de repetir folklore genérico de
  SauceDemo — confirmé que `problem_user` tiene las 6 imágenes de producto con el mismo `src`
  (rotas) y el selector de orden no reordena, y encontré que `error_user` comparte ese mismo
  bug en la build actual del sitio.
- **Los pasos comunes a los 4 specs que usan este flujo (login, agregar-producto-y-llegar-a-checkout,
  completar envío, finalizar) quedaron factorizados en `fixtures/purchaseFlow.ts`**, no
  copy-paste en cada spec — decisión propia de arquitectura para que cada spec conserve una
  sola razón de negocio para fallar, aunque comparta la "fontanería" con los demás.

## Prompt 6 — Dashboard de métricas (diferenciador)

**Prompt:**
> Construí un dashboard de métricas de la suite con información realmente accionable, no de
> vanidad:
> - scripts/generate-metrics.mjs que parsee el reporter JSON de Playwright y: detecte
>   flakiness (pasó con ≥1 intento fallido), categorice fallos por causa raíz (timeout /
>   assertion / locator no encontrado / navegación / otro), calcule duración total/promedio/p95
>   y top 5 más lentos, mantenga un histórico de las últimas 20 corridas para graficar
>   tendencia, y calcule estabilidad por test (corridas limpias, sin contar flaky como limpia).
> - metrics-dashboard.html self-contained con Chart.js: KPIs (pass rate, flaky rate, duración,
>   p95, retries), tendencia histórica, barras de duración con top 5, dona de causa raíz, tabla
>   con estabilidad, sección de flaky destacada. Que abra standalone con datos de ejemplo si no
>   encuentra los JSON.
> - npm script "metrics". Documentá en el README qué mide cada métrica y por qué es útil.

Igual que en el Prompt 5: qué medir y por qué (causa raíz por sobre "pasó/falló", estabilidad
histórica por sobre snapshot de una sola corrida, corridas limpias — no flaky — como criterio
de estabilidad) fue criterio propio de QA Architect, ya fijado en el propio prompt. Lo que
sigue es dónde la ejecución tuvo que ajustarse contra la realidad del reporter de Playwright y
del navegador.

**Resultado de la IA:** `scripts/generate-metrics.mjs` (aplanado de suites anidadas,
categorización de errores por regex con precedencia explícita, percentil "nearest-rank" para el
p95, `metrics-history.json` acotado a 20 corridas, estabilidad calculada sobre corridas
limpias — sin contar flaky), `metrics-dashboard.html` (5 KPIs, gráfico de tendencia de línea,
barras de duración con el top 5 destacado, dona de causa raíz, tabla ordenable con estabilidad
histórica, sección de flaky destacada) y `scripts/serve-dashboard.mjs` (server estático mínimo,
sin dependencias, para sortear el bloqueo de `fetch()` bajo `file://`).

**Ajuste propio (verifiqué contra el schema real y el navegador real, no asumí nada):**
- **No copié el schema del reporter JSON de Playwright de la documentación** — generé un
  `results.json` real y lo inspeccioné a mano antes de escribir el parser. Así descubrí que
  Playwright ya calcula `test.status === 'flaky'` por su cuenta — lo confirmé forzando un test
  sintético que falla en el primer intento y pasa en el reintento (`--retries=1`).
- **Bug real encontrado y corregido durante el desarrollo, no en el prompt:** la primera
  versión de "estabilidad por test" contaba un resultado `flaky` como corrida limpia (porque
  técnicamente terminó en `passed`), aunque el prompt ya pedía explícitamente lo contrario
  ("corridas limpias, sin contar flaky como limpia"). Lo encontré corriendo el mismo test
  sintético flaky a través del script real y viendo el número mal en `metrics.json`; lo corregí
  para que estabilidad mida corridas *limpias* de verdad, y reintenté el mismo test sintético
  una segunda vez para confirmar el fix (0% de estabilidad, no 100%) antes de cerrarlo.
- **`fetch()` a un archivo local falla bajo `file://`** ("URL scheme 'file' is not supported") —
  lo confirmé abriendo el dashboard con Playwright apuntando directo a una ruta `file://`. Es la
  razón real detrás del fallback a datos de ejemplo que pedía el prompt (no solo "por si el
  archivo no existe"), y motivó agregar `scripts/serve-dashboard.mjs` como solución.
- **El histórico real de este repo no tiene fallos ni flakiness fabricados:** lo construí
  corriendo la suite real varias veces seguidas — la suite hoy es 100% verde y así se refleja.
  Los datos de ejemplo embebidos en el HTML sí incluyen fallos/flaky variados a propósito, para
  que el dashboard se pueda evaluar completo sin depender de que la suite real falle primero.

## Prompt 7 — Documentación (PROMPTS.md + README)

**Prompt:**
> Documentá el proceso:
>
> PROMPTS.md — registrá los prompts REALES que te fui dando en esta sesión, textuales (limpiá
> solo typos), agrupados por las tres fases del entregable: generación de pruebas, creación de
> selectores/POM, y análisis de errores; más las extensiones (refuerzo senior y dashboard)
> claramente marcadas como adicionales. Para cada uno: qué generaste vos y qué ajusté yo con
> criterio propio. Dejá claro en la intro que dirigí un agente con skills mediante prompts de
> alto nivel, y que vos expandiste cada instrucción.
>
> README — separá claramente:
> - Casos REQUERIDOS por la prueba: TC-01 (happy path), TC-02 (credenciales inválidas),
>   TC-03 (checkout incompleto).
> - Cobertura ADICIONAL (criterio propio): robustez con latencia, integridad del PDF, happy
>   path data-driven.
> Incluí: setup (npm install, npx playwright install, npm test), cómo correr la demo de fallo y
> el dashboard, la tabla de specs, decisiones de diseño, y una sección "Observaciones y
> cobertura futura" con los usuarios especiales de saucedemo (problem_user,
> performance_glitch_user, error_user) y qué regresiones atraparían.

**Resultado de la IA:** este mismo archivo (intro reescrita según la instrucción, 7 secciones
agrupadas por fase + extensiones marcadas) y el README (sección "Alcance: requerido vs.
cobertura adicional" con las dos tablas pedidas, "Comandos rápidos", "Observaciones y cobertura
futura" con la tabla de usuarios especiales, y "Decisiones de diseño").

**Ajuste propio:** verifiqué, sección por sección, que ninguna parte de PROMPTS.md ni del
README quedara describiendo archivos o specs que ya no existen en el repo (en particular,
`product-data-propagation.spec.ts`, absorbido por el happy path data-driven del Prompt 5) antes
de dar esta reconciliación por cerrada.
