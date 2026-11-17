#!/usr/bin/env node
// Servidor estatico minimo para ver la documentacion generada (cero dependencias).
// Uso: node serve.mjs [raiz] [--port 4180] [--no-open]
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : Number(process.env.PORT) || 4180;
const noOpen = args.includes("--no-open");
const positional = args.filter((arg, i) => !arg.startsWith("--") && !(portIndex >= 0 && i === portIndex + 1));
const ROOT = resolve(positional[0] || HERE);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

function send(res, status, body, type) {
  res.writeHead(status, { "content-type": type || "text/plain; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

function openBrowser(url) {
  const command =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  try {
    spawn(command[0], command[1], { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* si no se puede abrir, la URL igual queda impresa */
  }
}

const server = createServer((req, res) => {
  const requested = decodeURIComponent((req.url || "/").split("?")[0]);
  let target = normalize(join(ROOT, requested));
  if (!target.startsWith(ROOT)) return send(res, 403, "403 prohibido\n");
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
  if (!existsSync(target)) return send(res, 404, `No encontrado: ${requested}\nVolve al indice: /index.html\n`);
  try {
    send(res, 200, readFileSync(target), TYPES[extname(target).toLowerCase()]);
  } catch (err) {
    send(res, 500, `Error al leer ${requested}: ${err.message}\n`);
  }
});

server.on("error", (err) => {
  console.error(`No se pudo iniciar el servidor en el puerto ${port}: ${err.message}`);
  process.exit(1);
});

server.listen(port, () => {
  const url = `http://localhost:${port}/index.html`;
  console.log(`Documentacion servida en ${url}  (raiz: ${ROOT})`);
  console.log("Ctrl+C para detener el servidor.");
  if (!noOpen) openBrowser(url);
});
