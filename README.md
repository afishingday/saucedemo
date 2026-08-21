# SauceDemo E2E — Playwright + TypeScript (Prueba Técnica QA Engineer)

[![Playwright Tests](https://github.com/afishingday/saucedemo/actions/workflows/playwright.yml/badge.svg)](https://github.com/afishingday/saucedemo/actions/workflows/playwright.yml)

Suite de automatización del flujo de compra E2E de [saucedemo.com](https://www.saucedemo.com/),
con Page Object Model, generada con asistencia de IA (Claude Code) según lo pedido en el
enunciado de la prueba técnica.

**En vivo (se republica solo en cada push a `master`, vía GitHub Actions + Pages):**
[Reporte HTML](https://afishingday.github.io/saucedemo/report/) ·
[Dashboard de métricas](https://afishingday.github.io/saucedemo/metrics-dashboard.html) ·
[índice](https://afishingday.github.io/saucedemo/)

## Comandos rápidos

| Qué querés hacer | Comando |
|---|---|
| Correr la suite | `npm test` |
| Correr la suite con navegador visible | `npm run test:headed` |
| Abrir el **reporte HTML** de la última corrida | `npm run report` |
| Generar las métricas (después de `npm test`) | `npm run metrics` |
| Abrir el **dashboard de métricas** con datos reales | `npm run metrics:serve` → `http://localhost:4173` |
| Re-generar la demo de diagnóstico de fallos | `npm run test:failure-demo` |

## Alcance: requerido vs. cobertura adicional

**Los 3 casos que pide el enunciado** (fase 1: 1 happy path + 2 límite/error):

| TC | Qué prueba |
|---|---|
| **TC-01** | Happy path — Login → Agregar producto → Checkout → Confirmación. Data-driven sobre 2 productos representativos: uno normal ("Sauce Labs Backpack") y un caso borde de nombre ("Test.allTheThings() T-Shirt (Red)") (`tests/happy-path-purchase.spec.ts`) |
| **TC-02** | Credenciales inválidas — `locked_out_user` bloqueado con el error exacto (`tests/login-invalid-credentials.spec.ts`) |
| **TC-03** | Checkout incompleto — Postal Code vacío bloquea el avance (`tests/checkout-incomplete-data.spec.ts`) |

**Cobertura adicional — criterio propio de QA Architect, no relleno.** Cada spec de acá abajo
prueba algo que los 3 de arriba estructuralmente NO pueden probar, no una repetición con más
pasos. El criterio para decidir qué agregar fue exactamente ese: si mañana falla, ¿hay algún
otro test en la suite que lo hubiera detectado? Si la respuesta es sí, no se agrega.

| Spec | Por qué existe (qué ningún otro test cubre) |
|---|---|
| `performance-glitch-robustness.spec.ts` (ROBUSTNESS-01) | Que las esperas de la suite son web-first (auto-waiting) y no timeouts hardcodeados — corre con `performance_glitch_user` (latencia artificial real) para demostrarlo. Es una dimensión no funcional (resiliencia), no lógica de negocio nueva. |
| `order-pdf-integrity.spec.ts` (PDF-01) | Que el PDF generado (Order Receipt) contiene los mismos datos que se vieron en el checkout — integridad UI → documento. Ningún otro test toca el botón "Generate PDF order" ni parsea un PDF. |

> La propagación de nombre/precio por catálogo (antes un spec aparte, `product-data-propagation.spec.ts`) se absorbió dentro de TC-01: en vez de un happy path de un solo producto + un spec separado que repetía casi los mismos pasos para el resto del catálogo, TC-01 ahora es data-driven sobre 2 productos representativos y hace el flujo completo en cada uno — ver "Decisiones de diseño".

Detalle de diseño de cada uno (por qué esa forma y no otra) en "Observaciones y cobertura
futura" más abajo.

## Stack

- [Playwright Test](https://playwright.dev/) + TypeScript
- Node.js
- Chromium (proyecto único, ver `playwright.config.ts`)

## Estructura del proyecto

```
saucedemo/
├── pages/                      # Page Object Model
│   ├── LoginPage.ts
│   ├── InventoryPage.ts
│   ├── CartPage.ts
│   └── CheckoutPage.ts         # cubre las 3 pantallas del checkout (info/overview/complete)
├── fixtures/
│   ├── pages.fixture.ts        # extiende `test` para inyectar cada Page Object + doc de aislamiento
│   └── purchaseFlow.ts         # login/agregar-y-checkout/finalizar factorizados — ver "Decisiones de diseño"
├── data/
│   └── users.ts                 # credenciales (incluye performance_glitch_user), datos de checkout y HAPPY_PATH_PRODUCTS
├── tests/
│   ├── happy-path-purchase.spec.ts        # TC-01 x2 (requerido) — data-driven sobre 2 productos representativos; texto exacto, propagación de datos, matemática del total
│   ├── login-invalid-credentials.spec.ts  # TC-02 (requerido) — texto de error literal exacto
│   ├── checkout-incomplete-data.spec.ts   # TC-03 (requerido) — texto de error literal exacto
│   ├── performance-glitch-robustness.spec.ts  # ROBUSTNESS-01 (adicional) — happy path con performance_glitch_user, sin esperas fijas
│   ├── order-pdf-integrity.spec.ts        # PDF-01 (adicional) — integridad de datos UI -> PDF del Order Receipt
│   └── diagnostics/
│       └── forced-failure-demo.spec.ts    # DEMO-01, tag @demo-failure — fase 3, reproducible bajo demanda
├── utils/
│   ├── evidenceReveal.ts       # panel de evidencia en español (qué se probó/esperaba/encontró + veredicto)
│   └── money.ts                 # parseo de montos ("$29.99") y comparación en centavos
├── docs/
│   ├── test-case-matrix.md     # matriz de casos de prueba (fase 1 del enunciado)
│   ├── failure-diagnosis.md    # diagnóstico de fallos con IA (fase 3 del enunciado)
│   └── failure-diagnosis/evidence/  # screenshot HD + video HD + trace + log del fallo forzado
├── scripts/
│   ├── generate-metrics.mjs    # parsea results.json -> metrics.json + metrics-history.json
│   ├── serve-dashboard.mjs     # server estático mínimo para metrics-dashboard.html (npm run metrics:serve)
│   └── pages-index.html        # landing page del sitio publicado (report/ + dashboard), usado por el workflow
├── metrics-dashboard.html      # dashboard self-contained (Chart.js) — ver § "Métricas de la suite"
├── PROMPTS.md                  # bitácora de prompts usados con IA
├── playwright.config.ts
└── .github/workflows/playwright.yml   # corre la suite y deploya reporte+dashboard a GitHub Pages en cada push a master
```

`results.json`, `metrics.json` y `metrics-history.json` son generados (gitignored) — no viajan en
el repo, igual que `playwright-report/` y `test-results/`. Se recrean corriendo la suite.

## Cómo correr la suite

**Requisitos:** [Node.js](https://nodejs.org/) 20 o superior (`node -v` para chequear) y npm —
nada más, Playwright instala su propio Chromium en el segundo paso de abajo.

```bash
git clone https://github.com/afishingday/saucedemo.git
cd saucedemo

npm install
npx playwright install chromium   # solo la primera vez
npm test
```

Ver el HTML report de la última corrida:

```bash
npm run report
```

Otros scripts disponibles: `npm run test:headed` (con navegador visible) y
`npm run test:ui` (modo UI interactivo de Playwright).

Para volver a generar la demo de diagnóstico de fallos (fase 3, ver más abajo) sin afectar
`npm test`:

```bash
npm run test:failure-demo
```

## Suite de tests — qué hace cada uno

Generado a partir del código real de cada spec, no de la descripción de arriba — si algo cambia
en el código, esta sección queda desactualizada hasta la próxima revisión, no al revés. Los
pasos marcados con *(purchaseFlow)* corren dentro de `fixtures/purchaseFlow.ts`, no línea por
línea en el spec — ver "Decisiones de diseño" para qué vive ahí y por qué.

### `happy-path-purchase.spec.ts` — TC-01 (Requerido) × 2

**Qué valida:** el flujo de compra completo funciona de punta a punta, y el nombre/precio del
producto viaja sin corromperse por todas las pantallas — corrido dos veces, una por cada
producto representativo (uno normal, uno con paréntesis y punto en el nombre). Detalle del
caso en [`docs/test-case-matrix.md`](docs/test-case-matrix.md).

**Pasos:** login como `standard_user` *(purchaseFlow)* → captura nombre/precio real del
producto del DOM y lo agrega al carrito *(purchaseFlow)* → completa First/Last Name y Postal
Code válidos y avanza *(purchaseFlow)* → finaliza la orden *(purchaseFlow)*.

**Aserciones clave:** URL llega a `inventory.html` y el carrito arranca en 0 *(purchaseFlow)*
· el producto agregado aparece en el carrito con el mismo nombre y precio capturados
*(purchaseFlow)* · URL llega a `checkout-step-one.html` *(purchaseFlow)* · el nombre/precio en
el Checkout Overview coinciden con los capturados · **Item total + Tax = Total** (matemática del
resumen, en centavos) · el subtotal coincide con el precio real del producto · URL llega a
`checkout-complete.html` y el texto de confirmación es exactamente `"Thank you for your order!"`
*(purchaseFlow)*.

### `login-invalid-credentials.spec.ts` — TC-02 (Requerido)

**Qué valida:** un usuario bloqueado (`locked_out_user`) no puede iniciar sesión. Detalle del
caso en [`docs/test-case-matrix.md`](docs/test-case-matrix.md).

**Pasos:** va directo al login (sin pasar por `purchaseFlow.loginAs`, que asume que el login
funciona) → intenta loguearse con `locked_out_user` / `secret_sauce`.

**Aserciones clave:** el mensaje de error es exactamente `"Epic sadface: Sorry, this user has
been locked out."` · la URL se queda en `saucedemo.com` (no se otorga sesión).

### `checkout-incomplete-data.spec.ts` — TC-03 (Requerido)

**Qué valida:** el checkout no avanza si falta el Postal Code. Detalle del caso en
[`docs/test-case-matrix.md`](docs/test-case-matrix.md).

**Pasos:** login como `standard_user` *(purchaseFlow)* → agrega "Sauce Labs Backpack" y llega a
checkout *(purchaseFlow)* → completa First/Last Name pero deja el Postal Code vacío y hace
clic en Continue.

**Aserciones clave:** (heredadas de `purchaseFlow`, igual que en TC-01: login llega a
`inventory.html` con carrito en 0, el producto aparece bien en el carrito, URL llega a
`checkout-step-one.html`) más las específicas de este caso: el error es exactamente
`"Error: Postal Code is required"` · la URL se queda en `checkout-step-one.html` (no avanza).

### `performance-glitch-robustness.spec.ts` — ROBUSTNESS-01 (Adicional)

**Qué valida:** que las esperas de la suite son web-first (auto-waiting) y no timeouts
hardcodeados — corre el mismo flujo compuesto que TC-01, pero con `performance_glitch_user`
(latencia real inyectada por SauceDemo, ~5-6s concentrados en el login), sin agregar ningún
`waitForTimeout`.

**Pasos:** login como `performance_glitch_user` *(purchaseFlow)* → agrega "Sauce Labs Backpack"
y llega a checkout *(purchaseFlow)* → completa datos válidos y avanza *(purchaseFlow)* →
finaliza la orden *(purchaseFlow)*.

**Aserciones clave:** las mismas de login + agregar-y-checkout + finalizar que en TC-01
*(purchaseFlow)* — a propósito **no** repite la verificación de Overview/matemática (eso ya lo
prueba TC-01); el objetivo acá es solo que esas aserciones sobrevivan la latencia sin ayuda.

### `order-pdf-integrity.spec.ts` — PDF-01 (Adicional)

**Qué valida:** que el PDF del Order Receipt contiene los mismos datos que se vieron en el
checkout — integridad de datos UI → documento, no solo que el archivo se descargó.

**Pasos:** login como `standard_user` *(purchaseFlow)* → agrega "Sauce Labs Backpack" y llega a
checkout *(purchaseFlow)* → completa datos válidos y avanza *(purchaseFlow)* → lee los 3
totales del Overview → finaliza la orden *(purchaseFlow)* → dispara la descarga del PDF
(`page.waitForEvent('download')` + clic en "Generate PDF order") → parsea el PDF con
`pdf-parse`.

**Aserciones clave:** sanity check en la UI antes de tocar el PDF (Item total + Tax = Total) ·
el texto del PDF contiene el nombre y el precio del producto · contiene el nombre completo
(Ship To) y el Postal Code tipeados · contiene los 3 totales ("Item total \$X", "Tax \$Y",
"Total \$Z") idénticos a los del Overview · la matemática vuelve a cuadrar usando los montos
re-extraídos del propio texto del PDF (no los de la UI).

### `diagnostics/forced-failure-demo.spec.ts` — DEMO-01 (demo de diagnóstico, fuera de `npm test`)

**Qué valida:** no es un caso de aceptación — es la demostración reproducible del diagnóstico
de fallos que pide el enunciado (fase 3). Corre aparte con `npm run test:failure-demo`, nunca
dentro de `npm test`. Detalle completo en
[`docs/failure-diagnosis.md`](docs/failure-diagnosis.md).

**Pasos:** va al login → intenta completar el username con un selector roto a propósito
(`getByPlaceholder('User name')`, con espacio — el real es `'Username'`) → captura el
`TimeoutError` real que tira Playwright → pinta el panel de evidencia en pantalla.

**Aserciones clave:** ninguna vía `expect()` — su "aserción" es estructural: relanza el error
capturado para que Playwright marque el test como fallido de verdad (así retiene
trace/screenshot/video); si el selector roto alguna vez matcheara algo por accidente, tiene una
línea de seguridad que tira un error distinto avisando que la demo dejó de reproducir el fallo
esperado.

## Qué cubre cada fase del enunciado

1. **Generación de casos de prueba asistida por IA** → [`docs/test-case-matrix.md`](docs/test-case-matrix.md) (1 happy path + 2 casos límite/error) y el detalle de cómo se generaron en [`PROMPTS.md`](PROMPTS.md).
2. **Automatización con Playwright + POM** → `pages/`, `fixtures/pages.fixture.ts` + `fixtures/purchaseFlow.ts` y `tests/`. Selectores priorizando `getByRole` / `getByPlaceholder` (accesibles) sobre CSS frágil; se documenta en el código la única excepción (`data-test`) donde SauceDemo no expone un rol/nombre accesible propio.
3. **Diagnóstico de fallos y reporteo con IA** → `playwright.config.ts` tiene `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'` y video HD real (`1920×1080`, no upscalado) retenido en fallo. La demo reproducible (`tests/diagnostics/forced-failure-demo.spec.ts`), su evidencia (con panel de diagnóstico en español, ver `utils/evidenceReveal.ts`) y el análisis de causa raíz están en [`docs/failure-diagnosis.md`](docs/failure-diagnosis.md).

## Decisiones de diseño

- **`CheckoutPage` cubre las 3 pantallas del checkout** (info, overview, complete) como un solo Page Object, en vez de tres clases separadas, porque el enunciado pide exactamente 4 Page Objects (Login/Inventory/Cart/Checkout) y las 3 pantallas comparten una única responsabilidad de negocio: completar y confirmar una orden.
- **Fixture (`pages.fixture.ts`) en vez de instanciar Page Objects a mano en cada test** — evita boilerplate repetido y es el patrón estándar recomendado por Playwright para POM.
- **`data/users.ts` centraliza credenciales y datos de prueba** — ningún test tiene un string hardcodeado, y un typo en un dato compartido (como el que se fuerza en la demo de diagnóstico) se detecta en todos los tests que lo usan, no en uno aislado.
- **`test.step()` en el happy path** — hace que el HTML report muestre cada fase del flujo de compra por separado, más legible que un solo bloque de aserciones.
- **`fixtures/purchaseFlow.ts` factoriza los pasos multi-pantalla que se repetían copy-paste en 4 de los 5 specs** (login + aislamiento, agregar-producto-y-llegar-a-checkout, completar envío, finalizar-y-confirmar). Qué SÍ vive ahí: aserciones sobre si la acción compuesta funcionó (¿el login llegó a Products?, ¿el producto agregado aparece bien en el carrito?). Qué NO vive ahí: aserciones específicas de cada test (la matemática del total en TC-01, el error de Postal Code en TC-03) — esas se quedan en el spec, así cada uno sigue teniendo una sola razón de negocio para fallar aunque comparta la "fontanería" con los demás.
- **TC-01 es data-driven sobre `HAPPY_PATH_PRODUCTS` (`data/users.ts`) en vez de dos specs separados.** Antes había un happy path de un solo producto (a fondo, hasta la confirmación) y un `product-data-propagation.spec.ts` aparte que repetía casi los mismos pasos para el resto del catálogo, pero solo hasta el Overview. Las dos preguntas — "¿el happy path funciona?" y "¿el dato viaja bien por el flujo?" — son, en el fondo, la misma pregunta hecha con dos profundidades distintas; consolidarlas en un solo spec data-driven (2 productos representativos: uno normal + un caso borde de nombre) elimina esa duplicación sin perder cobertura.

## Observaciones y cobertura futura

Esta sección documenta criterio de arquitectura de pruebas: qué se cubrió con automatización,
qué se dejó fuera a propósito (y por qué), y qué conocimiento de la aplicación bajo prueba (AUT)
justifica esas decisiones — aunque no todo termine convertido en un test.

### Los usuarios especiales de SauceDemo, y qué regresión atraparía cada uno

SauceDemo expone varios usuarios con el mismo flujo pero comportamiento deliberadamente roto —
son, en esencia, regresiones ya inyectadas para practicar detectarlas. Solo se automatizó
`performance_glitch_user` (ver `tests/performance-glitch-robustness.spec.ts`); el resto se dejó
fuera de la suite a propósito porque el ejercicio pide un flujo de compra E2E, no una auditoría
completa del catálogo de usuarios — pero vale la pena dejar registrado qué cubrirían si el alcance
creciera:

| Usuario | Qué rompe (verificado contra el sitio real) | Regresión que atraparía |
|---|---|---|
| `performance_glitch_user` | Introduce ~5-6s de latencia artificial, concentrada en el login | Automatizado — ver más abajo. Regresiones de performance real en el backend (un login que empieza a tardar de verdad, no solo el glitch simulado) |
| `problem_user` | Las 6 imágenes de producto comparten el mismo `src` (rotas/duplicadas); el selector de orden ("Price low to high", etc.) no reordena el listado | Bugs de imágenes rotas o mal enlazadas en el catálogo; un control de sort/filtro que deja de funcionar sin tirar error |
| `error_user` | **Hallazgo propio, no asumido de antemano**: en la build actual del sitio comparte con `problem_user` el mismo bug de sort roto (se verificó explícitamente, no estaba en el guion original) | Mismo control de sort/filtro, más cualquier acción que dependa de reordenar el listado antes de operar sobre él |
| `visual_user` | Introduce regresiones visuales/de layout | Cambios de CSS/maquetación que no rompen ninguna aserción funcional pero sí la experiencia — el punto ciego típico de una suite que solo valida DOM/texto y nunca compara píxeles |

Cómo se escalaría: un test por usuario que corra el mismo happy path y compare explícitamente
contra el comportamiento de `standard_user` (mismo assert, dataset distinto) detectaría
`problem_user`/`error_user` sin escribir aserciones nuevas. `visual_user` es la excepción — ese
necesita comparación visual (screenshot diffing), una categoría de test distinta a todo lo demás
en esta suite, y por eso se dejó fuera del alcance en vez de forzarlo con aserciones de texto que
no lo detectarían igual.

### La aserción del total (Item total + Tax = Total) como control de lógica de negocio

La mayoría de las aserciones de esta suite validan **navegación** (¿llegué a la pantalla
correcta?) o **presencia de datos** (¿el texto está?). `Item total + Tax = Total` es distinta:
valida que la aplicación hizo bien una cuenta. Es el tipo de control que un test "solo de
humo" (¿la página carga?) nunca atrapa, pero sí atraparía un bug real de cálculo de impuestos o
un descuento aplicado mal. Se implementó en centavos enteros (`utils/money.ts`), no en floats,
para que la aserción en sí no introduzca falsos negativos por precisión.

### La validación del PDF como control de integridad de datos UI -> documento

`tests/order-pdf-integrity.spec.ts` no valida "que el PDF se descargó" (eso es lo fácil) — valida
que el **contenido** del PDF es consistente con lo que el usuario vio y tipeó en pantalla,
comparando contra valores capturados en vivo (nunca contra literales fijos en el test). Esta es
la clase de bug que un test end-to-end centrado solo en la UI nunca ve: el checkout puede estar
perfecto y el documento generado igual tener un precio viejo, un total mal formateado, o un dato
que no llegó al motor que arma el PDF. Es, en efecto, un mini test de integración entre dos
sistemas (el frontend y el generador de PDF) disfrazado de test E2E.

## Métricas de la suite

**En CI se publica solo** (`.github/workflows/playwright.yml`): cada push a `master` corre la
suite, regenera métricas y deploya el reporte + el dashboard a GitHub Pages — ver los links al
principio de este README. `metrics-history.json` sigue sin commitearse (ver más abajo), pero el
histórico igual se acumula corrida a corrida en CI: el workflow trae la versión ya publicada
(`curl` a la propia URL de Pages) antes de generar la de la corrida actual, así que el
"histórico" vive en el sitio publicado, no en git.

**Setup de Pages — un paso manual, una sola vez:** el workflow no puede habilitar Pages por su
cuenta; hay que activarlo desde **Settings → Pages → Source: "GitHub Actions"** en el repo antes
del primer deploy (ya está hecho en este repo — se dejó documentado para clonar/reusar el patrón
en otro). Se hizo una vez vía `gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow`,
equivalente a hacerlo a mano en la UI.

**El deploy a Pages está gateado a que los tests pasen** (`deploy` tiene `needs: test`, y el
step `npm test` corre sin `continue-on-error`, así que un test rojo falla el job y bloquea el
deploy). Decisión de diseño explícita: el sitio publicado siempre refleja una corrida verde, así
que el link nunca muestra algo roto por sorpresa — el trade-off aceptado es que **una corrida
fallida no actualiza el reporte/dashboard públicos**, que se quedan mostrando la última corrida
buena hasta el próximo push exitoso. El reporte HTML crudo de esa corrida fallida igual queda
disponible para debug — se sube como artifact descargable de la corrida de Actions
(`actions/upload-artifact`), independiente del deploy a Pages. Ningún deploy sale nunca desde un
`pull_request`, pase lo que pase con los tests.

Para correrlo local:

```bash
npm test              # genera results.json (reporter 'json' en playwright.config.ts)
npm run metrics        # parsea results.json -> metrics.json + metrics-history.json
npm run metrics:serve   # sirve metrics-dashboard.html en http://localhost:4173 (ver nota abajo)
```

`metrics-dashboard.html` se puede abrir directo con doble clic, pero para que cargue los datos
**reales** (no los de ejemplo) hace falta servirlo por `http://`, no `file://`: el dashboard usa
`fetch('./metrics.json')` para poder refrescarse solo recargando la página después de cada
`npm run metrics`, sin regenerar el HTML — y Chrome/Edge bloquean por CORS el `fetch()` a otro
archivo local cuando se abre con `file://`. `npm run metrics:serve` (servidor estático sin
dependencias, `scripts/serve-dashboard.mjs`) resuelve eso. Si no se encuentran los JSON (repo
recién clonado, o sí se abrió por `file://`), el dashboard cae a datos de ejemplo con un aviso
visible — nunca se rompe ni queda en blanco.

Cada métrica existe para responder una pregunta concreta que un equipo de QA necesita, no para
verse bien en una demo:

| Métrica | Qué responde | Por qué importa |
|---|---|---|
| **Pass rate** | ¿Qué porcentaje de la suite está en verde ahora mismo? | La métrica más básica, pero solo tiene sentido leída junto al flaky rate — un 100% con flaky rate alto es una suite verde por casualidad, no por estar sana. |
| **Flaky rate** | ¿Qué porcentaje de tests pasó, pero solo después de reintentar? | Un test flaky consume tiempo de CI (cada retry es tiempo real) y, peor, erosiona la confianza en la suite: la reacción natural a "flakeó, corré de nuevo" es dejar de mirar por qué falló ni siquiera cuando el fallo es real. |
| **Duración total / promedio / p95** | ¿Cuánto tarda la suite, y qué tan parejo es ese tiempo? | El promedio esconde outliers; el p95 no. Si el p95 crece corrida tras corrida (ver tendencia), hay un cuello de botella real antes de que la suite se vuelva dolorosamente lenta en CI. |
| **Top 5 más lentos** | ¿Cuáles tests, específicamente, valdría la pena optimizar primero? | Optimizar "la suite" en abstracto no se puede priorizar; optimizar 5 tests puntuales sí. |
| **Fallos por causa raíz** (Timeout/espera, Assertion, Locator no encontrado, Navegación/red, Otro) | Cuando algo falla, ¿es la app, el selector, la red, o una aserción que dejó de ser cierta? | Sin esto, "3 tests fallaron" no dice nada accionable. Con esto, "3 fallaron por Locator no encontrado" apunta directo a selectores rotos por un cambio de UI — un problema de mantenimiento de la suite — mientras que un pico en "Assertion" apunta a un posible bug real de producto. Son dos investigaciones completamente distintas y esta métrica dice cuál hacer. |
| **Tendencia (pass rate / flaky rate por corrida)** | ¿Estamos mejorando o empeorando con el tiempo? | Un solo reporte de Playwright es una foto; esto es la película. Un pass rate que baja de a poco corrida tras corrida es una señal de alerta temprana que un reporte individual nunca muestra. |
| **Estabilidad por test (histórico)** | De este test puntual, ¿qué porcentaje de las últimas corridas pasó limpio, sin retry? | Distingue "falló hoy, mala suerte" de "este test flaquea 3 de cada 5 corridas" — el segundo es deuda técnica real que hay que arreglar, no un ruido a ignorar. Requiere histórico porque una sola corrida no puede mostrar un patrón. |
| **Tests crónicamente inestables** (`chronicallyUnstable`) | ¿Cuáles tests son inestables de forma repetida, no un evento aislado? | Prioriza la lista de arreglos: un test con 40% de estabilidad en 5 corridas pesa más que uno que falló una sola vez. Exige ≥2 corridas observadas a propósito, para no etiquetar de "inestable" a un test que recién se agregó. |
| **Cobertura por tipo de escenario** (happy / edge / otro) | ¿La suite prueba mayormente el camino feliz, o también casos límite? | Una suite 100% happy-path da falsa confianza — pasa siempre porque nunca prueba dónde la app realmente se rompe. Heurística por nombre del test (documentada en el código); un sistema de tags real (`@happy`/`@edge`, mismo mecanismo que ya usa `@demo-failure`) sería el siguiente paso si esto creciera. |

### Decisiones de diseño de las métricas

- **Duración por test = suma de TODOS los intentos, no solo el último.** Un test que reintenta 2
  veces y al final pasa cuesta 3x el tiempo de CI aunque termine en verde — para identificar
  bottlenecks reales de CI eso es lo que importa, no el tiempo del intento que finalmente pasó.
- **Comparaciones de dinero en centavos enteros, nunca en floats** (`utils/money.ts`, reusado acá
  igual que en los tests) — evita falsos negativos de precisión.
- **`flaky` de Playwright se usa tal cual, no se reimplementa** — Playwright ya calcula
  `test.status === 'flaky'` (pasó, con ≥1 intento fallido) con la definición exacta pedida;
  reimplementarlo a mano solo agregaría una fuente más de bugs.
- **Un test flaky NO cuenta como "estable" en el histórico**, aunque haya terminado en verde —
  bug real encontrado y corregido durante el desarrollo de este script: la primera versión
  contaba cualquier resultado final "passed" (incluido flaky) como corrida limpia, así que un
  test que flaquea el 100% de las veces mostraba 100% de estabilidad. Se corrigió para que
  estabilidad mida corridas *limpias* (sin retry) — ver esta misma sección.
- **El histórico vive en `metrics-history.json`, no se commitea.** Sigue la misma convención que
  ya tiene este repo con `playwright-report/`/`test-results/` (generados, gitignored) en vez de
  hacer una excepción para las métricas. La contrapartida honesta: un clon fresco del repo no
  tiene tendencia real todavía — por eso el dashboard cae a datos de ejemplo en vez de mostrar un
  gráfico vacío o roto.

### Estrategia de aislamiento de tests, y por qué importa

Cada test corre en su propio `BrowserContext` (perfil "incógnito" propio) por default de
Playwright Test — el carrito de SauceDemo, que persiste en `localStorage`, nunca cruza de un
test a otro. El detalle de arquitectura está documentado en `fixtures/pages.fixture.ts`; varios
tests además lo dejan demostrado con `expect(inventoryPage.cartBadge).toHaveCount(0)` justo
después del login. Importa porque la alternativa — reusar un mismo contexto/página entre tests
para "ir más rápido" — es la causa más común de flakiness por order-dependency: un test que pasa
solo, o solo en cierto orden, y falla random en CI. Diseñar para aislamiento total evita esa clase
entera de bug de la suite misma, no solo de la aplicación bajo prueba.
