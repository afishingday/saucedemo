#!/usr/bin/env node
/**
 * scripts/serve-dashboard.mjs
 *
 * Servidor estático mínimo (sin dependencias) para abrir metrics-dashboard.html correctamente.
 *
 * Por qué hace falta: el dashboard usa `fetch('./metrics.json')` para poder refrescarse solo
 * recargando la página después de cada `npm run metrics`, sin tener que regenerar el HTML. Pero
 * al abrir el archivo con doble clic (protocolo `file://`), Chrome/Edge bloquean el fetch a otro
 * archivo local por CORS — el dashboard cae al fallback de datos de ejemplo, no porque falten los
 * JSON, sino por la forma en que se abrió el archivo. Serviéndolo por http:// ese bloqueo no
 * existe. (Firefox sí permite fetch bajo file://, así que ahí este paso es opcional.)
 *
 * Uso: npm run metrics:serve   -> abre http://localhost:4173/metrics-dashboard.html
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 4173;
const ROOT = process.cwd();

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const requestedPath = urlPath === '/' ? '/metrics-dashboard.html' : urlPath;
  const filePath = path.join(ROOT, requestedPath);

  // No servir nada fuera de la carpeta del proyecto (path traversal básico).
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`No encontrado: ${requestedPath}`);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`✓ Dashboard disponible en http://localhost:${PORT}/metrics-dashboard.html`);
  console.log('  (Ctrl+C para detener)');
});
