#!/usr/bin/env node
/**
 * scripts/generate-metrics.mjs
 *
 * Parsea el reporter JSON de Playwright (results.json, configurado en playwright.config.ts)
 * y produce dos archivos:
 *
 *   - metrics.json          snapshot completo de la última corrida (KPIs, top 5 más lentos,
 *                            fallos por causa raíz, cobertura por tipo de escenario, detalle
 *                            por test con su estabilidad histórica).
 *   - metrics-history.json  un resumen de ESTA corrida, agregado a las últimas 20 (histórico
 *                            para graficar tendencia — ver metrics-dashboard.html).
 *
 * Uso: npm run metrics   (después de `npm test`, que ya genera results.json)
 *
 * Por qué existe este script y no solo el HTML report nativo de Playwright: el HTML report es
 * excelente para investigar UNA corrida test por test, pero no responde "¿estamos mejorando o
 * empeorando con el tiempo?", "¿qué tipo de fallo predomina?" ni "¿qué test es crónicamente
 * inestable aunque hoy haya pasado?" — que es justamente lo que un equipo de QA necesita para
 * priorizar qué arreglar primero. Ver README § "Métricas de la suite" para el detalle de cada
 * métrica y por qué es accionable (no una métrica de vanidad).
 */
import fs from 'node:fs';

const RESULTS_FILE = 'results.json';
const METRICS_FILE = 'metrics.json';
const HISTORY_FILE = 'metrics-history.json';
const HISTORY_LIMIT = 20;

// ---------------------------------------------------------------------------------------------
// 1. Cargar el reporter JSON crudo de Playwright
// ---------------------------------------------------------------------------------------------

if (!fs.existsSync(RESULTS_FILE)) {
  console.error(
    `✗ No se encontró ${RESULTS_FILE}. Corré la suite primero (npm test) — el reporter 'json' ` +
      `ya está configurado en playwright.config.ts.`,
  );
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

// ---------------------------------------------------------------------------------------------
// 2. Aplanar suites anidadas -> un registro por test (título, archivo, proyecto, estado,
//    duración, retries, error)
// ---------------------------------------------------------------------------------------------

/** Los mensajes de error de Playwright traen códigos ANSI de color — se limpian para que la
 * tabla del dashboard y la categorización por regex no tengan que lidiar con ellos. */
function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return (text ?? '').replace(/\[[0-9;]*m/g, '');
}

/** Recorre suites anidadas (Playwright anida un suite por archivo y otro por describe()) y
 * va entregando cada `spec` (= un `test()` en el código, antes de expandirse por proyecto). */
function* walkSpecs(suite) {
  for (const spec of suite.specs ?? []) yield spec;
  for (const child of suite.suites ?? []) yield* walkSpecs(child);
}

/**
 * Clasifica el mensaje de error en una causa raíz "de un vistazo". El ORDEN de los checks
 * importa — no son mutuamente excluyentes por texto:
 *   1) Assertion primero: un `expect(locator).toBeVisible()` que agota su timeout también
 *      contiene la palabra "Timeout" en el mensaje, pero es conceptualmente una aserción que
 *      nunca se cumplió, no una acción "en crudo" que no encontró su elemento.
 *   2) Locator no encontrado: acciones directas (.click/.fill/etc.) que loguean
 *      "waiting for getByX(...)" sin nunca matchear — el patrón real que dispara
 *      docs/failure-diagnosis.md en este mismo repo.
 *   3) Navegación/red: fallos de goto/navegación o errores de red del navegador.
 *   4) Timeout/espera: cualquier otro timeout que no cayó en los buckets más específicos de
 *      arriba.
 *   5) Otro: catch-all.
 */
function categorizeError(message) {
  if (!message) return 'Otro';
  if (/^error: expect\(/i.test(message) || /\bexpected\b[\s\S]*\breceived\b/i.test(message)) {
    return 'Assertion';
  }
  if (
    /waiting for (locator|getby|frame)/i.test(message) ||
    /strict mode violation/i.test(message) ||
    /resolved to \d+ elements/i.test(message)
  ) {
    return 'Locator no encontrado';
  }
  if (/net::err|err_connection|err_name_not_resolved|navigation (failed|timeout)|page\.goto/i.test(message)) {
    return 'Navegación/red';
  }
  if (/timeout/i.test(message)) return 'Timeout/espera';
  return 'Otro';
}

/**
 * Heurística por nombre para separar happy path de casos límite/error — todavía no hay un
 * sistema de tags de escenario (se podría migrar a @happy / @edge en el título del test, el
 * mismo mecanismo que Playwright ya usa para @demo-failure). Se documenta como heurística, no
 * como fuente de verdad perfecta — ver README.
 */
function classifyScenario(title) {
  if (/TC-01|DATA-01|happy path/i.test(title)) return 'happy';
  if (/TC-0[23]|inv[aá]lid|incompleto|bloqueado|locked out|\berror\b/i.test(title)) return 'edge';
  return 'otro';
}

const flatTests = [];
for (const rootSuite of raw.suites ?? []) {
  for (const spec of walkSpecs(rootSuite)) {
    for (const test of spec.tests ?? []) {
      const results = test.results ?? [];
      const lastResult = results[results.length - 1];

      const skipped = test.status === 'skipped';
      const flaky = test.status === 'flaky'; // label propio de Playwright: terminó en verde
      // pero tuvo >=1 intento fallido en el camino — exactamente la definición pedida.
      const passed = lastResult?.status === 'passed';
      const finalStatus = skipped ? 'skipped' : passed ? 'passed' : 'failed';

      // Costo real de CI: se suman TODOS los intentos, no solo el último. Un test que
      // reintenta 2 veces cuesta 3x el tiempo de CI aunque termine en verde — para
      // identificar bottlenecks eso es lo que importa, no solo la duración del intento final.
      const durationMs = results.reduce((sum, r) => sum + (r.duration ?? 0), 0);

      // Si terminó mal (o si flaqueó), el intento fallido es el interesante para diagnosticar
      // — el intento final "passed" de un test flaky no tiene error que mostrar.
      const failedAttempt = [...results].reverse().find((r) => r.status !== 'passed');
      const errorMessage = failedAttempt
        ? stripAnsi(failedAttempt.error?.message ?? failedAttempt.errors?.[0]?.message ?? null)
        : null;

      flatTests.push({
        // Clave estable entre corridas para el histórico — renombrar el test o moverlo de
        // archivo le "resetea" el historial de estabilidad, tradeoff aceptado por simplicidad.
        key: `${spec.file}::${test.projectName}::${spec.title}`,
        title: spec.title,
        file: spec.file,
        project: test.projectName,
        status: finalStatus,
        flaky,
        durationMs,
        retries: Math.max(0, results.length - 1),
        attempts: results.length,
        errorMessage,
        errorCategory: finalStatus === 'failed' || flaky ? categorizeError(errorMessage) : null,
        scenarioType: classifyScenario(spec.title),
      });
    }
  }
}

// ---------------------------------------------------------------------------------------------
// 3/4. KPIs de la corrida: pass rate, flaky rate, duración (total/promedio/p95), top 5 lentos
// ---------------------------------------------------------------------------------------------

const executed = flatTests.filter((t) => t.status !== 'skipped');
const passedCount = executed.filter((t) => t.status === 'passed').length;
const failedCount = executed.filter((t) => t.status === 'failed').length;
const flakyCount = executed.filter((t) => t.flaky).length;
const skippedCount = flatTests.length - executed.length;

const passRate = executed.length ? passedCount / executed.length : 0;
const flakyRate = executed.length ? flakyCount / executed.length : 0;

/**
 * Percentil "nearest-rank": ordena ascendente y toma el elemento en la posición
 * ceil(p/100 * n) - 1. No interpola entre dos valores — el resultado siempre es una
 * duración real que efectivamente ocurrió, así se puede señalar "este test específico es
 * el p95", no un número sintético que no corresponde a ninguna corrida real.
 */
function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedAsc.length) - 1;
  return sortedAsc[Math.min(Math.max(idx, 0), sortedAsc.length - 1)];
}

const durationsAsc = executed.map((t) => t.durationMs).sort((a, b) => a - b);
const totalDurationMs = durationsAsc.reduce((a, b) => a + b, 0);
const avgDurationMs = durationsAsc.length ? totalDurationMs / durationsAsc.length : 0;
const p95DurationMs = percentile(durationsAsc, 95);
const totalRetries = executed.reduce((sum, t) => sum + t.retries, 0);

const top5Slowest = [...executed]
  .sort((a, b) => b.durationMs - a.durationMs)
  .slice(0, 5)
  .map((t) => ({ title: t.title, file: t.file, project: t.project, durationMs: t.durationMs }));

// ---------------------------------------------------------------------------------------------
// Fallos por causa raíz + cobertura por tipo de escenario
// ---------------------------------------------------------------------------------------------

const failureCategories = {};
for (const t of executed) {
  if (t.errorCategory) failureCategories[t.errorCategory] = (failureCategories[t.errorCategory] ?? 0) + 1;
}

const scenarioCoverage = {};
for (const t of flatTests) {
  scenarioCoverage[t.scenarioType] = (scenarioCoverage[t.scenarioType] ?? 0) + 1;
}

// ---------------------------------------------------------------------------------------------
// 5. Histórico: append del resumen de esta corrida a metrics-history.json (tope: últimas 20)
// ---------------------------------------------------------------------------------------------

let history = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    if (!Array.isArray(history)) history = [];
  } catch {
    history = []; // archivo corrupto o vacío — se arranca de nuevo en vez de romper el script
  }
}

const runEntry = {
  date: new Date().toISOString(),
  testCount: executed.length,
  passed: passedCount,
  failed: failedCount,
  flaky: flakyCount,
  skipped: skippedCount,
  passRate,
  flakyRate,
  totalDurationMs,
  // Mapa compacto test -> resultado de ESTA corrida. Es lo que habilita el punto 6 (estabilidad
  // por test): sin esto, el histórico solo podría graficar tendencia agregada, no decir CUÁL
  // test es el crónicamente inestable.
  tests: Object.fromEntries(flatTests.map((t) => [t.key, t.flaky ? 'flaky' : t.status])),
};

history.push(runEntry);
if (history.length > HISTORY_LIMIT) history = history.slice(-HISTORY_LIMIT);
fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

// ---------------------------------------------------------------------------------------------
// 6. Estabilidad por test usando el histórico (incluye la corrida recién agregada)
// ---------------------------------------------------------------------------------------------

/**
 * % de corridas históricas en las que este test pasó LIMPIO (sin necesitar ningún retry).
 *
 * A propósito NO cuenta "flaky" como verde acá, aunque un test flaky técnicamente termine en
 * passed: si contara, un test que flaquea en el 100% de sus corridas mostraría 100% de
 * estabilidad (pasó todas las veces... a la segunda) — exactamente lo opuesto de lo que este
 * punto tiene que detectar. Estabilidad mide confiabilidad, no "si finalmente pasó".
 */
function computeStability(testKey) {
  let cleanPasses = 0;
  let flakyRuns = 0;
  let failedRuns = 0;
  let total = 0;
  for (const run of history) {
    const outcome = run.tests?.[testKey];
    if (outcome === undefined || outcome === 'skipped') continue; // no corrió esa vez, no cuenta
    total++;
    if (outcome === 'passed') cleanPasses++;
    else if (outcome === 'flaky') flakyRuns++;
    else if (outcome === 'failed') failedRuns++;
  }
  return {
    stabilityPercent: total > 0 ? Math.round((cleanPasses / total) * 100) : null,
    runsObserved: total,
    flakyRuns,
    failedRuns,
  };
}

for (const t of flatTests) {
  const { stabilityPercent, runsObserved, flakyRuns, failedRuns } = computeStability(t.key);
  t.stabilityPercent = stabilityPercent;
  t.runsObserved = runsObserved;
  t.historicalFlakyRuns = flakyRuns;
  t.historicalFailedRuns = failedRuns;
  // "Crónico" != "falló una vez": exige al menos 2 corridas observadas para no etiquetar de
  // inestable a un test que recién se agregó y todavía no tiene historial real.
  t.chronicallyUnstable = stabilityPercent !== null && stabilityPercent < 100 && runsObserved >= 2;
}

const trend = history.map((r) => ({
  date: r.date,
  passRate: r.passRate,
  flakyRate: r.flakyRate,
  testCount: r.testCount,
}));

// ---------------------------------------------------------------------------------------------
// 7. Ensamblar y escribir metrics.json
// ---------------------------------------------------------------------------------------------

const metrics = {
  generatedAt: new Date().toISOString(),
  summary: {
    testCount: executed.length,
    passed: passedCount,
    failed: failedCount,
    flaky: flakyCount,
    skipped: skippedCount,
    passRate,
    flakyRate,
    totalDurationMs,
    avgDurationMs,
    p95DurationMs,
    totalRetries,
  },
  top5Slowest,
  failureCategories,
  scenarioCoverage,
  tests: flatTests,
  trend,
};

fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));

console.log(
  `✓ ${METRICS_FILE} generado — ${executed.length} tests, ` +
    `pass rate ${(passRate * 100).toFixed(1)}%, flaky rate ${(flakyRate * 100).toFixed(1)}%, ` +
    `p95 ${(p95DurationMs / 1000).toFixed(1)}s`,
);
console.log(`✓ ${HISTORY_FILE} actualizado (${history.length}/${HISTORY_LIMIT} corridas guardadas)`);
if (Object.keys(failureCategories).length) {
  console.log(`  Fallos por causa raíz: ${JSON.stringify(failureCategories)}`);
}
const unstable = flatTests.filter((t) => t.chronicallyUnstable);
if (unstable.length) {
  console.log(`  ⚠ ${unstable.length} test(s) crónicamente inestable(s): ${unstable.map((t) => t.title).join(', ')}`);
}
