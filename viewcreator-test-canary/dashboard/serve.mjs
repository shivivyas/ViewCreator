#!/usr/bin/env node

/**
 * ViewCreator Test Canary — Dashboard Server
 *
 * Serves the custom HTML dashboard + test artifacts (screenshots, videos).
 * Completely independent from the main application.
 *
 * Usage:
 *   node dashboard/serve.mjs
 *   npm run dashboard
 */

import { createServer } from "node:http";
import { stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, ".."); // package root (viewcreator-test-canary/)
const PORT = 4400;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".zip": "application/zip",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    let url = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);

    // Default to dashboard
    if (url === "/") url = "/dashboard/index.html";

    const filePath = join(ROOT, url);

    // Security: prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    // Check if file exists
    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    if (fileStat.isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": mimeType,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });

    const stream = createReadStream(filePath);
    stream.pipe(res);
    stream.on("error", () => {
      res.writeHead(500);
      res.end("Stream error");
    });
  } catch (err) {
    console.error("Server error:", err.message);
    res.writeHead(500);
    res.end("Internal server error");
  }
});

server.listen(PORT, () => {
  console.log("");
  console.log("  🧪  ViewCreator Test Canary Dashboard");
  console.log("  ──────────────────────────────────────");
  console.log(`  Server:  http://localhost:${PORT}`);
  console.log("  Press   Ctrl+C  to stop");
  console.log("");
});
