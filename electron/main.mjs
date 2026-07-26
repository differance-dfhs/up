import { app, BrowserWindow, protocol, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const intelligenceSchedule = "每天 22:30";
const careerTasks = new Map();
const careerOpsCandidates = [
  process.env.CAREER_OPS_DIR,
  path.join(app.getPath("documents"), "秋招", "career-ops"),
].filter(Boolean);
const codexCandidates = [
  process.env.CODEX_EXECUTABLE,
  "/Applications/ChatGPT.app/Contents/Resources/codex",
  "/Applications/Codex.app/Contents/Resources/codex",
  "/usr/local/bin/codex",
  "/opt/homebrew/bin/codex",
].filter(Boolean);

const careerModes = {
  evaluate: {
    title: "岗位评估",
    prompt: "Run the career-ops auto-pipeline evaluation for the role context below. Generate the evaluation report and tracker entry, but never submit an application.",
  },
  scan: {
    title: "扫描新机会",
    prompt: "Run the career-ops scan mode. Focus on the configured target roles and summarize only newly discovered, live opportunities.",
  },
  pipeline: {
    title: "处理岗位队列",
    prompt: "Run the career-ops pipeline mode for data/pipeline.md. Process pending URLs according to the repository rules.",
  },
  batch: {
    title: "批量评估",
    prompt: "Run the career-ops batch mode for the supplied roles. Preserve the human review gate and do not submit any application.",
  },
  pdf: {
    title: "生成定制简历",
    prompt: "Run the career-ops pdf mode for the supplied role. Use only verified user-layer facts and generate the tailored CV artifact.",
  },
  cover: {
    title: "生成求职信",
    prompt: "Run the career-ops cover mode for the supplied role. Produce a draft for review and do not send it.",
  },
  email: {
    title: "申请邮件草稿",
    prompt: "Run the career-ops email mode for the supplied role. Produce a draft-only subject, body and attachment checklist. Never send, submit or click anything.",
  },
  deep: {
    title: "公司深研",
    prompt: "Run the career-ops deep mode for the supplied company and role. Produce sourced company research and a candidate angle.",
  },
  contacto: {
    title: "寻找关键联系人",
    prompt: "Run the career-ops contacto mode for the supplied company and role. Find relevant contact types and draft outreach. Do not send any message.",
  },
  apply: {
    title: "准备申请",
    prompt: "Run the career-ops apply mode for the supplied role as a preparation-only workflow. Fill or draft answers only where the mode allows it. Never submit, send, or perform the final application action.",
  },
  tracker: {
    title: "整理求职漏斗",
    prompt: "Run the career-ops tracker mode and summarize current statuses, integrity issues and the next useful actions.",
  },
  followup: {
    title: "跟进节奏",
    prompt: "Run the career-ops followup mode. Produce due follow-up drafts, but do not record any draft as sent and do not send anything.",
  },
  patterns: {
    title: "复盘求职漏斗",
    prompt: "Run the career-ops patterns mode. Analyze outcomes with causal humility and surface the most actionable targeting changes.",
  },
  "interview-prep": {
    title: "面试准备包",
    prompt: "Run the career-ops interview-prep mode for the supplied company and role. Build a sourced preparation package without inventing candidate facts.",
  },
  "interview-plan": {
    title: "面试训练计划",
    prompt: "Run the career-ops interview/plan mode for the supplied company and role. Produce a prioritized preparation plan.",
  },
  "interview-practice": {
    title: "模拟面试",
    prompt: "Run the career-ops interview/practice mode for the supplied company and role. Use any supplied answer as the candidate response, give direct evidence-bounded feedback, and finish with exactly one next interview question.",
  },
  "interview-debrief": {
    title: "面试复盘",
    prompt: "Run the career-ops interview/debrief mode using the supplied notes. Separate facts from inference and propose the next preparation priorities.",
  },
  project: {
    title: "作品集评估",
    prompt: "Run the career-ops project mode for the supplied project. Evaluate it as candidate evidence and propose an 80/20 improvement plan.",
  },
  training: {
    title: "课程价值评估",
    prompt: "Run the career-ops training mode for the supplied course or certification. Judge its opportunity cost against the target roles.",
  },
  upskill: {
    title: "能力缺口地图",
    prompt: "Run the career-ops upskill mode. Distinguish verified existing skills from actual gaps and propose a prioritized learning plan.",
  },
  titles: {
    title: "相邻岗位探索",
    prompt: "Run the career-ops titles mode. Suggest adjacent titles without changing any profile or scanner configuration unless the user later confirms.",
  },
  "offer-prep": {
    title: "Offer 阅读准备",
    prompt: "Run the career-ops offer-prep mode for the supplied document context. Respect every legal and extraction gate. This is not legal advice.",
  },
};

const emptyWorkspace = {
  version: 1,
  updatedAt: null,
  companies: [],
};

const emptyIntelligence = {
  generatedAt: null,
  opportunities: [],
  roleBriefs: {},
  updates: [],
  automation: {
    name: "秋招情报 Loop",
    schedule: intelligenceSchedule,
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

function normalizeIntelligence(value) {
  if (!value || typeof value !== "object") return emptyIntelligence;
  return {
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : null,
    opportunities: Array.isArray(value.opportunities) ? value.opportunities : [],
    roleBriefs: value.roleBriefs && typeof value.roleBriefs === "object" && !Array.isArray(value.roleBriefs)
      ? value.roleBriefs
      : {},
    updates: Array.isArray(value.updates) ? value.updates : [],
    automation: {
      name: value.automation?.name || "秋招情报 Loop",
      schedule: value.automation?.schedule || intelligenceSchedule,
      status: value.automation?.status === "active" ? "active" : "not_configured",
    },
  };
}

function firstExistingPath(candidates) {
  return candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || null;
}

function careerOpsPath() {
  return firstExistingPath(careerOpsCandidates);
}

function codexExecutable() {
  return firstExistingPath(codexCandidates);
}

function readText(filePath, fallback = "") {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

function markdownTableRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\s*\|/.test(line))
    .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 6 && !/^#$/i.test(cells[0]) && !/^[-:]+$/.test(cells[0]));
}

function parseApplications(root) {
  const rows = markdownTableRows(readText(path.join(root, "data", "applications.md")));
  return rows.map((cells) => {
    const [number, date, company, role, score, status, pdf, report, ...notes] = cells;
    return {
      number,
      date,
      company,
      role,
      score,
      status,
      pdf: pdf || "",
      report: report || "",
      notes: notes.join(" | "),
    };
  });
}

function listFiles(directory, extensions = []) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && (!extensions.length || extensions.includes(path.extname(entry.name).toLowerCase())))
      .map((entry) => {
        const filePath = path.join(directory, entry.name);
        const stat = fs.statSync(filePath);
        return {
          name: entry.name,
          path: filePath,
          updatedAt: stat.mtime.toISOString(),
          size: stat.size,
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function countPipelineItems(root) {
  const content = readText(path.join(root, "data", "pipeline.md"));
  const matches = content.match(/https?:\/\/\S+/g) || [];
  return new Set(matches.map((value) => value.replace(/[),.;]+$/, ""))).size;
}

function careerSnapshot() {
  const root = careerOpsPath();
  const codex = codexExecutable();
  if (!root) {
    return {
      connected: false,
      codexReady: Boolean(codex),
      path: null,
      version: null,
      missing: ["career-ops"],
      applications: [],
      reports: [],
      outputs: [],
      interviewFiles: [],
      pipelineCount: 0,
    };
  }

  const required = [
    ["cv.md", "简历"],
    ["config/profile.yml", "候选人档案"],
    ["modes/_profile.md", "岗位画像"],
    ["portals.yml", "岗位来源"],
  ];
  const missing = required.filter(([relativePath]) => !fs.existsSync(path.join(root, relativePath))).map(([, label]) => label);
  const applications = parseApplications(root);
  const reports = listFiles(path.join(root, "reports"), [".md"]).filter((file) => file.name !== ".gitkeep");
  const outputs = listFiles(path.join(root, "output"), [".pdf", ".html", ".docx"]).filter((file) => file.name !== ".gitkeep");
  const interviewFiles = listFiles(path.join(root, "interview-prep"), [".md"])
    .filter((file) => !["README.md", ".gitkeep"].includes(file.name));

  return {
    connected: true,
    codexReady: Boolean(codex),
    path: root,
    codexPath: codex,
    version: readText(path.join(root, "VERSION")).trim().split(/\s+/)[0] || null,
    missing,
    applications,
    reports: reports.slice(0, 24),
    outputs: outputs.slice(0, 24),
    interviewFiles: interviewFiles.slice(0, 24),
    assetCounts: {
      reports: reports.length,
      outputs: outputs.length,
      interviews: interviewFiles.length,
    },
    pipelineCount: countPipelineItems(root),
    taskCounts: {
      running: [...careerTasks.values()].filter((task) => task.status === "running").length,
      completed: [...careerTasks.values()].filter((task) => task.status === "completed").length,
      failed: [...careerTasks.values()].filter((task) => task.status === "failed").length,
    },
  };
}

function taskForClient(task) {
  if (!task) return null;
  const { child, ...safeTask } = task;
  return safeTask;
}

function careerTaskPrompt(mode, payload) {
  const definition = careerModes[mode];
  const role = payload.role && typeof payload.role === "object" ? payload.role : {};
  const context = [
    role.company && `Company: ${role.company}`,
    role.team && `Team: ${role.team}`,
    role.role && `Role: ${role.role}`,
    role.location && `Location: ${role.location}`,
    role.jd && `Job description:\n${String(role.jd).slice(0, 16000)}`,
    payload.input && `User input:\n${String(payload.input).slice(0, 16000)}`,
  ].filter(Boolean).join("\n\n");

  return [
    definition.prompt,
    "Write all user-facing output in Simplified Chinese.",
    "Follow AGENTS.md and the career-ops data contract. Use only verified user-layer facts for candidate claims.",
    "Never send a message, submit an application, or record a draft as sent/applied. Keep the user in control of external actions.",
    context || "Use the current career-ops profile and tracker as context.",
    "At the end, summarize what changed on disk, what still needs human review, and the most useful next action.",
  ].join("\n\n");
}

function parseCodexLine(task, line) {
  let value;
  try {
    value = JSON.parse(line);
  } catch {
    if (line.trim()) task.log.push(line.trim());
    return;
  }

  if (value.type === "thread.started" && value.thread_id) task.threadId = value.thread_id;
  if (value.type === "item.completed" && value.item?.type === "agent_message" && value.item?.text) {
    task.output = value.item.text;
  }
  if (value.type === "item.completed" && value.item?.type === "reasoning" && value.item?.text) {
    task.log.push(value.item.text);
  }
  if (value.type === "error" && value.message) task.log.push(value.message);
  if (task.log.length > 80) task.log = task.log.slice(-80);
}

function startCareerTask(payload) {
  const mode = String(payload?.mode || "");
  const definition = careerModes[mode];
  if (!definition) throw new Error("未知的 Career Ops 动作");
  const root = careerOpsPath();
  const codex = codexExecutable();
  if (!root) throw new Error("未找到 career-ops");
  if (!codex) throw new Error("未找到 Codex CLI");
  if ([...careerTasks.values()].some((task) => task.status === "running")) {
    throw new Error("已有一个 AI 任务正在运行，请等待它完成");
  }

  const id = `career-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const task = {
    id,
    mode,
    title: definition.title,
    status: "running",
    createdAt: new Date().toISOString(),
    completedAt: null,
    output: "",
    log: ["正在连接 Codex 与 career-ops…"],
    error: "",
    threadId: null,
    child: null,
  };
  careerTasks.set(id, task);

  const child = spawn(codex, [
    "exec",
    "--json",
    "--ephemeral",
    "--skip-git-repo-check",
    "--sandbox",
    "workspace-write",
    "-C",
    root,
    careerTaskPrompt(mode, payload),
  ], {
    cwd: root,
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  task.child = child;

  let stdoutBuffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || "";
    lines.forEach((line) => parseCodexLine(task, line));
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    const text = chunk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line
        && !line.includes("failed to load skill")
        && !line.includes("codex_core::session"))
      .join("\n");
    if (text) task.log.push(text.slice(0, 2000));
    if (task.log.length > 80) task.log = task.log.slice(-80);
  });
  child.on("error", (error) => {
    task.status = "failed";
    task.error = error.message;
    task.completedAt = new Date().toISOString();
  });
  child.on("close", (code) => {
    if (stdoutBuffer.trim()) parseCodexLine(task, stdoutBuffer);
    if (task.status === "cancelled") return;
    task.status = code === 0 ? "completed" : "failed";
    task.error = code === 0 ? "" : (task.log.at(-1) || `Codex 退出，状态码 ${code}`);
    task.completedAt = new Date().toISOString();
    task.child = null;
  });

  return taskForClient(task);
}

function cancelCareerTask(id) {
  const task = careerTasks.get(id);
  if (!task || task.status !== "running" || !task.child) return false;
  task.status = "cancelled";
  task.completedAt = new Date().toISOString();
  task.child.kill("SIGTERM");
  task.child = null;
  return true;
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

function contentTypeForPath(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".otf": "font/otf",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".webp": "image/webp",
  }[extension] || "application/octet-stream";
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
    return jsonResponse(normalizeIntelligence(readJson(paths.intelligence, emptyIntelligence)));
  }

  if (pathname === "/api/career-ops/snapshot" && request.method === "GET") {
    return jsonResponse(careerSnapshot());
  }

  if (pathname === "/api/career-ops/tasks" && request.method === "GET") {
    return jsonResponse([...careerTasks.values()]
      .map(taskForClient)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20));
  }

  if (pathname.startsWith("/api/career-ops/tasks/") && request.method === "GET") {
    const id = pathname.split("/").at(-1);
    const task = taskForClient(careerTasks.get(id));
    return task ? jsonResponse(task) : jsonResponse({ error: "Task not found" }, 404);
  }

  if (pathname.startsWith("/api/career-ops/tasks/") && request.method === "DELETE") {
    const id = pathname.split("/").at(-1);
    return cancelCareerTask(id)
      ? jsonResponse({ cancelled: true })
      : jsonResponse({ error: "Task is not running" }, 409);
  }

  if (pathname === "/api/career-ops/run" && request.method === "POST") {
    try {
      const payload = await request.json();
      return jsonResponse(startCareerTask(payload), 202);
    } catch (error) {
      return jsonResponse({ error: error.message || "无法启动任务" }, 400);
    }
  }

  if (pathname === "/api/career-ops/open" && request.method === "POST") {
    const root = careerOpsPath();
    if (!root) return jsonResponse({ error: "未找到 career-ops" }, 404);
    try {
      const payload = await request.json();
      const locations = {
        root,
        reports: path.join(root, "reports"),
        outputs: path.join(root, "output"),
        interviews: path.join(root, "interview-prep"),
        tracker: path.join(root, "data", "applications.md"),
      };
      const target = locations[payload.target];
      if (!target || !target.startsWith(root)) return jsonResponse({ error: "Invalid target" }, 400);
      const result = await shell.openPath(target);
      return result ? jsonResponse({ error: result }, 500) : jsonResponse({ opened: true });
    } catch (error) {
      return jsonResponse({ error: error.message || "无法打开位置" }, 400);
    }
  }

  const relativePath = pathname.replace(/^\/+/, "") || "index.html";
  const targetPath = path.resolve(webRoot, relativePath);
  if (!targetPath.startsWith(`${webRoot}${path.sep}`) && targetPath !== webRoot) {
    return new Response("Forbidden", { status: 403 });
  }

  const existingPath = fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()
    ? targetPath
    : path.join(webRoot, "index.html");
  return new Response(fs.readFileSync(existingPath), {
    headers: { "Content-Type": contentTypeForPath(existingPath) },
  });
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
