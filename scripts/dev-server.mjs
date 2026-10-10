// Yerli sınaq serveri: public/ statik faylları və api/*.js funksiyaları (Vercel Node imzası ilə). node scripts/dev-server.mjs [port]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2] || process.env.PORT || 3000);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.status = (c) => ((res.statusCode = c), res);
    res.json = (d) => {
      if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(d));
    };
    try {
      const m = url.pathname.match(/^\/api\/([a-z0-9-]+)\/?$/);
      if (m && fs.existsSync(path.join(root, "api", m[1] + ".js"))) {
        req.query = Object.fromEntries(url.searchParams);
        const mod = await import(pathToFileURL(path.join(root, "api", m[1] + ".js")).href);
        return await mod.default(req, res);
      }
      let rel = decodeURIComponent(url.pathname);
      for (const r of vercel.rewrites || []) {
        const re = new RegExp("^" + r.source.replace(/:\w+\*/g, ".*").replace(/:\w+/g, "[^/]+") + "$");
        if (re.test(rel) && !fs.existsSync(path.join(root, "public", rel)) ) { rel = r.destination; break; }
      }
      let file = path.join(root, "public", rel);
      if (!file.startsWith(path.join(root, "public"))) return res.status(403).end();
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html"; // cleanUrls
      if (!fs.existsSync(file)) return res.status(404).end("not found");
      res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.status(500).json({ error: String(e.message || e) });
    }
  })
  .listen(port, () => console.log("Nibras Library: http://localhost:" + port));
