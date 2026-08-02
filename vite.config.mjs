import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const developmentDataDirectory = process.env.UP_DEV_DATA_DIR
  ? path.resolve(process.env.UP_DEV_DATA_DIR)
  : path.resolve("data");
const workspacePath = path.join(developmentDataDirectory, "workspace.json");
const intelligencePath = path.join(developmentDataDirectory, "intelligence.json");
const loopRunsPath = path.join(developmentDataDirectory, "loop-runs.json");
const resumePath = path.join(developmentDataDirectory, "resume.json");
const careerOpsPath = process.env.CAREER_OPS_DIR
  ? path.resolve(process.env.CAREER_OPS_DIR)
  : path.join(process.env.HOME || "", "Documents", "秋招", "career-ops");
const readOnlyDevelopmentData = Boolean(process.env.UP_DEV_DATA_DIR);

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

function listFiles(directory, extensions) {
  try {
    return fs.readdirSync(directory)
      .filter((name) => extensions.includes(path.extname(name).toLowerCase()))
      .map((name) => {
        const filePath = path.join(directory, name);
        const stat = fs.statSync(filePath);
        return { name, path: filePath, updatedAt: stat.mtime.toISOString(), size: stat.size };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function careerSnapshot() {
  const reports = listFiles(path.join(careerOpsPath, "reports"), [".md"]);
  const outputs = listFiles(path.join(careerOpsPath, "output"), [".pdf", ".html", ".docx"]);
  const interviewFiles = listFiles(path.join(careerOpsPath, "interview-prep"), [".md"]);
  const resume = readJson(resumePath, {});
  let source = null;
  try {
    if (resume.sourcePath) {
      const stat = fs.statSync(resume.sourcePath);
      source = { name: path.basename(resume.sourcePath), path: resume.sourcePath, size: stat.size, updatedAt: stat.mtime.toISOString() };
    }
  } catch {
    source = null;
  }
  return {
    connected: fs.existsSync(careerOpsPath),
    codexReady: true,
    missing: [],
    version: null,
    applications: [],
    reports,
    outputs,
    interviewFiles,
    resume: { source, latestAnalysis: resume.latestAnalysis || null },
    assetCounts: { reports: reports.length, outputs: outputs.length, interviews: interviewFiles.length },
    pipelineCount: 0,
  };
}

function upWorkspaceBridge() {
  function handler(req, res, next) {
    if (req.url === "/api/workspace" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(readJson(workspacePath, { version: 1, companies: [] })));
      return;
    }
    if (req.url === "/api/intelligence" && req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(readJson(intelligencePath, { generatedAt: null, opportunities: [], roleBriefs: {} })));
      return;
    }
    if (req.url === "/api/loop-runs" && req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(readJson(loopRunsPath, { version: 1, runs: [] })));
      return;
    }
    if (req.url === "/api/career-ops/snapshot" && req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(careerSnapshot()));
      return;
    }
    if (req.url === "/api/career-ops/tasks" && req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end("[]");
      return;
    }
    if (req.url === "/api/workspace" && req.method === "PUT") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        try {
          const value = JSON.parse(body);
          if (!Array.isArray(value.companies)) throw new Error("companies must be an array");
          if (!readOnlyDevelopmentData) writeJson(workspacePath, value);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(careerSnapshot()));
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
      ignored: ["**/data/workspace.json", "**/data/intelligence.json", "**/data/loop-runs.json", "**/data/*.tmp"],
    },
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(), upWorkspaceBridge()],
});
