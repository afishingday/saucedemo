/**
 * Extrae el monto en dólares de un texto de SauceDemo. Cubre los dos formatos reales
 * observados en el sitio (confirmado contra el DOM real, no asumido):
 *   - UI (checkout overview): "Item total: $29.99", "Tax: $2.40", "Total: $32.39"
 *   - PDF del Order Receipt: "Item total $29.99" (mismo texto, sin los dos puntos)
 * Ambos matchean con la misma regex porque solo nos interesa el "$X.XX" final.
 */
export function parseMoney(text: string): number {
  const match = text.match(/\$([\d,]+\.\d{2})/);
  if (!match) {
    throw new Error(`No se pudo extraer un monto en dólares de: "${text}"`);
  }
  return Number(match[1].replace(/,/g, ''));
}

/**
 * Convierte a centavos (enteros) antes de sumar/comparar — comparar dólares como float
 * (0.1 + 0.2 !== 0.3) puede dar falsos negativos en aserciones de dinero.
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
