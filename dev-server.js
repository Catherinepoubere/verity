// Local dev server: serves public/ and routes POST /api/check to the same handler Vercel runs.
// Usage: npm run dev  (reads .env if present), then open http://localhost:3000 or /?booth=1
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "./api/check.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "public");
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".js": "text/javascript", ".css": "text/css" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/check") return handler(req, res);
  const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const file = path.join(root, path.normalize(rel));
  if (!file.startsWith(root)){ res.statusCode = 403; return res.end(); }
  try{
    const body = await readFile(file);
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(body);
  }catch(e){ res.statusCode = 404; res.end("Not found"); }
}).listen(PORT, () => console.log(`Verity dev server on http://localhost:${PORT}`));
