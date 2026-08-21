import type { Page } from '@playwright/test';

export type Veredicto = 'PASÓ' | 'FALLÓ' | 'PENDIENTE';

/**
 * Pinta un panel de evidencia sobre la página justo antes de que el test termine, y lo deja
 * en pantalla un par de segundos. Mismo patrón visual usado en los demás proyectos QA
 * (qaagent/e2e/utils/evidenceReveal.ts, inspectoria/e2e/utils/evidenceReveal.ts), portado acá
 * en español.
 *
 * Resuelve dos problemas a la vez:
 *  1. Sin una espera deliberada al final, Playwright corta la grabación apenas se resuelve (o
 *     falla) la última acción — el video termina mostrando solo el último instante, no el
 *     recorrido completo que llevó hasta ahí.
 *  2. El video por sí solo debe demostrar qué se verificó, sin depender de tener el reporte de
 *     Playwright abierto al lado: el panel dice explícitamente qué se probó, qué se esperaba,
 *     qué se encontró y el veredicto.
 */
export async function evidenceReveal(
  page: Page,
  opts: {
    caso: string;
    queSeProbo: string;
    queSeEsperaba: string;
    queSeEncontro: Record<string, unknown>;
    veredicto: Veredicto;
    dwellMs?: number;
  },
): Promise<void> {
  const { caso, queSeProbo, queSeEsperaba, queSeEncontro, veredicto, dwellMs = 2000 } = opts;
  try {
    await page.evaluate(
      ({ caso, queSeProbo, queSeEsperaba, queSeEncontro, veredicto }) => {
        const id = '__evidence_panel';
        document.getElementById(id)?.remove();
        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const colorVeredicto = veredicto === 'PASÓ' ? '#6ee7a0' : veredicto === 'FALLÓ' ? '#f87171' : '#fbbf24';

        const panel = document.createElement('div');
        panel.id = id;
        // Franja angosta anclada al borde derecho — nunca una barra horizontal abajo, que
        // taparía el contenido/formulario que el video está tratando de demostrar.
        panel.style.cssText = [
          'position:fixed', 'top:16px', 'right:16px', 'bottom:16px', 'z-index:2147483647',
          'width:340px', 'overflow:auto', 'overflow-wrap:break-word', 'word-break:break-word',
          'background:rgba(10,12,18,.95)', 'color:#e8e8e8',
          'font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
          'border:1px solid #3d4f66', 'border-radius:10px',
          'box-shadow:0 12px 40px rgba(0,0,0,.65)', 'padding:14px 16px',
        ].join(';');

        const encontradoHtml = Object.entries(queSeEncontro)
          .map(
            ([k, v]) =>
              `<div style="margin-top:6px"><span style="color:#93c5fd">${esc(k)}:</span> ` +
              `<span style="color:#fcd34d">${esc(typeof v === 'string' ? v : JSON.stringify(v))}</span></div>`,
          )
          .join('');

        panel.innerHTML = [
          `<div style="color:#5eead4;font-weight:700;font-size:15px;margin-bottom:4px">${esc(caso)}</div>`,
          `<div style="margin-top:8px"><span style="color:#c4b5fd;font-weight:700">QUÉ SE PROBÓ</span></div>`,
          `<div style="color:#ddd6fe;margin-top:2px">${esc(queSeProbo)}</div>`,
          `<div style="margin-top:10px"><span style="color:#86efac;font-weight:700">RESULTADO ESPERADO</span></div>`,
          `<div style="color:#bbf7d0;margin-top:2px">${esc(queSeEsperaba)}</div>`,
          `<div style="margin-top:10px"><span style="color:#93c5fd;font-weight:700">QUÉ SE ENCONTRÓ</span></div>`,
          encontradoHtml,
          `<div style="margin-top:12px;font-size:15px;font-weight:700;color:${colorVeredicto}">VEREDICTO: ${esc(veredicto)}</div>`,
        ].join('');
        document.body.appendChild(panel);
      },
      { caso, queSeProbo, queSeEsperaba, queSeEncontro, veredicto },
    );
    await page.waitForTimeout(dwellMs);
  } catch {
    /* best-effort — nunca hacer fallar un test solo porque el panel no se pudo pintar */
  }
}
