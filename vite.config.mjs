import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const workspacePath = path.resolve("data/workspace.json");
const intelligencePath = path.resolve("data/intelligence.json");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporaryPath, filePath);
}

function upWorkspaceBridge() {
  function handler(req, res, next) {
    if (req.url === "/api/workspace" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(readJson(workspacePath, { version: 1, companies: [] })));
      return;
    }
    if (req.url === "/api/intelligence" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(readJson(intelligencePath, { generatedAt: null, opportunities: [], roleBriefs: {} })));
      return;
    }
    if (req.url === "/api/workspace" && req.method === "PUT") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        try {
          const value = JSON.parse(body);
          if (!Array.isArray(value.companies)) throw new Error("companies must be an array");
          writeJson(workspacePath, value);
          res.statusCode = 204;
          res.end();
        } catch (error) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }
    next();
  }

  return {
    name: "up-workspace-bridge",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    watch: {
      ignored: ["**/data/workspace.json", "**/data/intelligence.json", "**/data/*.tmp"],
    },
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(), upWorkspaceBridge()],
});
