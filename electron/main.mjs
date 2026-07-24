import { app, BrowserWindow, net, protocol, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "up",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(currentDirectory, "../dist/client");

const emptyWorkspace = {
  version: 1,
  updatedAt: null,
  companies: [],
};

const emptyIntelligence = {
  generatedAt: null,
  opportunities: [],
  roleBriefs: {},
  automation: {
    name: "秋招情报 Loop",
    schedule: "每天 12:00",
    status: "not_configured",
  },
};

function dataPaths() {
  const directory = path.join(app.getPath("userData"), "data");
  return {
    directory,
    workspace: path.join(directory, "workspace.json"),
    intelligence: path.join(directory, "intelligence.json"),
  };
}

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
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function ensureCleanDataFiles() {
  const paths = dataPaths();
  fs.mkdirSync(paths.directory, { recursive: true });
  if (!fs.existsSync(paths.workspace)) writeJson(paths.workspace, emptyWorkspace);
  if (!fs.existsSync(paths.intelligence)) writeJson(paths.intelligence, emptyIntelligence);
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function handleAppRequest(request) {
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname);
  const paths = dataPaths();

  if (pathname === "/api/workspace" && request.method === "GET") {
    return jsonResponse(readJson(paths.workspace, emptyWorkspace));
  }

  if (pathname === "/api/workspace" && request.method === "PUT") {
    try {
      const value = await request.json();
      if (!Array.isArray(value.companies)) return jsonResponse({ error: "Invalid workspace" }, 400);
      writeJson(paths.workspace, value);
      return new Response(null, { status: 204 });
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }
  }

  if (pathname === "/api/intelligence" && request.method === "GET") {
    return jsonResponse(readJson(paths.intelligence, emptyIntelligence));
  }

  const relativePath = pathname.replace(/^\/+/, "") || "index.html";
  const targetPath = path.resolve(webRoot, relativePath);
  if (!targetPath.startsWith(`${webRoot}${path.sep}`) && targetPath !== webRoot) {
    return new Response("Forbidden", { status: 403 });
  }

  const existingPath = fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()
    ? targetPath
    : path.join(webRoot, "index.html");
  return net.fetch(pathToFileURL(existingPath).toString());
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: "up",
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("up://")) {
      event.preventDefault();
      if (url.startsWith("https://")) shell.openExternal(url);
    }
  });
  window.loadURL("up://app/index.html");
}

app.whenReady().then(() => {
  ensureCleanDataFiles();
  protocol.handle("up", handleAppRequest);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
