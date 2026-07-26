import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  ArrowRight,
  Brain,
  Briefcase,
  Buildings,
  ChartLineUp,
  Check,
  ClipboardText,
  EnvelopeSimple,
  FilePdf,
  FolderOpen,
  GraduationCap,
  ListChecks,
  MagnifyingGlass,
  PaperPlaneTilt,
  Play,
  PresentationChart,
  ShieldCheck,
  Sparkle,
  SpinnerGap,
  Target,
  UserFocus,
  UsersThree,
  X,
} from "@phosphor-icons/react";

const ACTION_GROUPS = [
  {
    id: "decide",
    label: "发现与决策",
    description: "找到值得投入的机会，并把判断落进统一漏斗。",
    actions: [
      { id: "evaluate", label: "评估当前岗位", caption: "匹配度、风险与行动建议", kicker: "判断", tone: "blue", icon: Target, role: true },
      { id: "scan", label: "扫描新机会", caption: "从配置的招聘源发现岗位", kicker: "发现", tone: "amber", icon: MagnifyingGlass },
      { id: "pipeline", label: "处理岗位队列", caption: "处理待评估链接与 JD", kicker: "队列", tone: "mint", icon: ListChecks },
      { id: "batch", label: "批量评估", caption: "一次比较多个候选岗位", kicker: "比较", tone: "violet", icon: PresentationChart, input: "每行粘贴一个岗位链接或一段 JD" },
      { id: "tracker", label: "整理求职漏斗", caption: "检查状态、重复与下一步", kicker: "进度", tone: "sky", icon: ChartLineUp },
    ],
  },
  {
    id: "apply",
    label: "材料与投递",
    description: "所有内容都从已核验事实出发，提交权始终留给你。",
    actions: [
      { id: "pdf", label: "定制简历", caption: "生成岗位定向 PDF", kicker: "PDF 输出", tone: "coral", icon: FilePdf, role: true },
      { id: "cover", label: "求职信草稿", caption: "基于岗位与公司生成初稿", kicker: "叙事", tone: "amber", icon: ClipboardText, role: true },
      { id: "email", label: "申请邮件草稿", caption: "主题、正文与附件清单", kicker: "邮件", tone: "sky", icon: EnvelopeSimple, role: true },
      { id: "apply", label: "准备申请", caption: "预填问题但绝不自动提交", kicker: "关键动作", tone: "blue", icon: PaperPlaneTilt, role: true, guarded: true, featured: true },
      { id: "deep", label: "公司深研", caption: "战略、业务、文化与候选人角度", kicker: "研究", tone: "violet", icon: Buildings, role: true },
      { id: "contacto", label: "寻找关键联系人", caption: "识别值得联系的人并起草消息", kicker: "关系", tone: "violet", icon: UsersThree, role: true },
      { id: "followup", label: "跟进节奏", caption: "找出到期事项并生成草稿", kicker: "节奏", tone: "mint", icon: ArrowClockwise },
    ],
  },
  {
    id: "interview",
    label: "面试与 Offer",
    description: "把准备、练习和复盘连接成一条可积累的能力链。",
    actions: [
      { id: "interview-prep", label: "面试准备包", caption: "公司、岗位、题目与故事库", kicker: "准备", tone: "blue", icon: Briefcase, role: true },
      { id: "interview-plan", label: "训练计划", caption: "按真实轮次排准备优先级", kicker: "计划", tone: "amber", icon: ListChecks, role: true },
      { id: "interview-practice", label: "模拟面试", caption: "逐题练习与直接反馈", kicker: "练习", tone: "violet", icon: UserFocus, role: true, featured: true, input: "可粘贴上一题和你的回答；首次开始可以留空" },
      { id: "interview-debrief", label: "面试复盘", caption: "还原问题、表现与下一轮重点", kicker: "复盘", tone: "coral", icon: Brain, role: true, input: "粘贴真实面试问题、回答、面试官反馈和结果" },
      { id: "offer-prep", label: "Offer 阅读准备", caption: "逐条提取并整理待确认问题", kicker: "核对", tone: "mint", icon: ShieldCheck, input: "输入本地 Offer 文件路径与已知承诺；结果不构成法律意见" },
    ],
  },
  {
    id: "grow",
    label: "定位与成长",
    description: "用真实求职结果校准方向，不用抽象的焦虑代替行动。",
    actions: [
      { id: "upskill", label: "能力缺口地图", caption: "区分已具备能力与真实缺口", kicker: "诊断", tone: "blue", icon: ChartLineUp, role: true },
      { id: "patterns", label: "复盘求职表现", caption: "从漏斗结果寻找稳定模式", kicker: "模式", tone: "violet", icon: PresentationChart },
      { id: "project", label: "作品集评估", caption: "判断项目证据与 80/20 改进项", kicker: "证据", tone: "coral", icon: Sparkle, featured: true, input: "粘贴项目链接、项目说明或需要评估的证据" },
      { id: "training", label: "课程价值评估", caption: "判断课程是否值得投入时间", kicker: "投入", tone: "amber", icon: GraduationCap, input: "粘贴课程或证书链接、价格与预计投入时间" },
      { id: "titles", label: "相邻岗位探索", caption: "拓宽岗位名但不偏离主线", kicker: "方向", tone: "mint", icon: Target },
    ],
  },
];

const PREPARE_SECTIONS = [
  { id: "apply", label: "申请材料", icon: FilePdf },
  { id: "interview", label: "面试训练", icon: UserFocus },
  { id: "grow", label: "能力成长", icon: ChartLineUp },
];

const SURFACE_ACTIONS = {
  discovery: new Set(["scan", "pipeline", "batch", "titles"]),
  library: new Set(["deep"]),
  role: new Set(["evaluate", "followup"]),
  prepare: new Set([
    "pdf",
    "cover",
    "email",
    "apply",
    "contacto",
    "followup",
    "interview-prep",
    "interview-plan",
    "interview-practice",
    "interview-debrief",
    "offer-prep",
    "upskill",
    "patterns",
    "project",
    "training",
    "titles",
  ]),
};

const SURFACE_COPY = {
  discovery: {
    eyebrow: "CAREER OPS · DISCOVERY",
    title: "把机会发现变成可判断的候选池",
    description: "扫描、处理和比较新岗位，确认值得投入后再加入岗位库。",
  },
  library: {
    eyebrow: "CAREER OPS · RESEARCH",
    title: "继续深化这条岗位情报",
    description: "在已有来源之上补充公司、业务和候选人视角。",
  },
  role: {
    eyebrow: "CAREER OPS · POSITION",
    title: "推进当前岗位",
    description: "只呈现与当前岗位状态直接相关的判断和跟进动作。",
  },
  prepare: {
    eyebrow: "CODEX × CAREER OPS",
    title: "准备申请、面试与长期能力",
    description: "材料、训练和成长各自成组，不再和岗位发现混在一起。",
  },
};

const SURFACE_GROUP_COPY = {
  discovery: {
    label: "机会检索与筛选",
    description: "新机会先进入候选队列，完成来源核验与比较后再加入岗位库。",
  },
  library: {
    label: "情报深化",
    description: "围绕当前岗位继续补充公司、业务和候选人视角。",
  },
  role: {
    label: "岗位推进",
    description: "评估匹配度，并检查当前岗位是否到了需要跟进的时间。",
  },
};

async function api(path, options) {
  const response = await fetch(path, options);
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || "请求失败");
  return value;
}

function formatTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function TaskStatus({ task }) {
  if (task.status === "running") return <span className="career-task-status is-running"><SpinnerGap /> 正在运行</span>;
  if (task.status === "completed") return <span className="career-task-status is-complete"><Check /> 已完成</span>;
  if (task.status === "cancelled") return <span className="career-task-status">已停止</span>;
  return <span className="career-task-status is-failed">需要处理</span>;
}

export default function CareerOpsView({ selectedRole, roles, surface = "prepare", embedded = false }) {
  const [snapshot, setSnapshot] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [input, setInput] = useState("");
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [prepareSection, setPrepareSection] = useState("apply");

  const load = async () => {
    try {
      const [nextSnapshot, nextTasks] = await Promise.all([
        api("/api/career-ops/snapshot"),
        api("/api/career-ops/tasks"),
      ]);
      setSnapshot(nextSnapshot);
      setTasks(nextTasks);
      setActiveTaskId((current) => current || nextTasks[0]?.id || null);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const hasRunningTask = tasks.some((task) => task.status === "running");
    if (!hasRunningTask) return undefined;
    const timer = window.setInterval(load, 1200);
    return () => window.clearInterval(timer);
  }, [tasks]);

  const activeTask = tasks.find((task) => task.id === activeTaskId) || tasks[0] || null;
  const copy = SURFACE_COPY[surface] || SURFACE_COPY.prepare;
  const visibleGroups = useMemo(() => {
    const filteredGroups = ACTION_GROUPS.map((group) => ({
      ...group,
      actions: group.actions.filter((action) => SURFACE_ACTIONS[surface]?.has(action.id)),
    }))
    .filter((group) => group.actions.length)
    .filter((group) => surface !== "prepare" || group.id === prepareSection);
    if (surface === "prepare") return filteredGroups;
    const copyForGroup = SURFACE_GROUP_COPY[surface];
    return [{
      id: surface,
      label: copyForGroup?.label || copy.title,
      description: copyForGroup?.description || copy.description,
      actions: filteredGroups.flatMap((group) => group.actions),
    }];
  }, [copy.description, copy.title, prepareSection, surface]);

  const openAction = (action) => {
    setSelectedAction(action);
    setInput("");
    setError("");
  };

  const runAction = async () => {
    if (!selectedAction) return;
    if (selectedAction.role && !selectedRole) {
      setError("请先在总览中选择一个岗位");
      return;
    }
    try {
      const task = await api("/api/career-ops/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedAction.id,
          input,
          role: selectedRole ? {
            company: selectedRole.name,
            team: selectedRole.team,
            role: selectedRole.role,
            location: selectedRole.location,
            jd: selectedRole.jd,
          } : null,
        }),
      });
      setSelectedAction(null);
      setActiveTaskId(task.id);
      setTasks((current) => [task, ...current]);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const cancelTask = async (id) => {
    try {
      await api(`/api/career-ops/tasks/${id}`, { method: "DELETE" });
      await load();
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  const openLocation = async (target) => {
    try {
      await api("/api/career-ops/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  if (loading) {
    return (
      <section className={`career-page career-loading ${embedded ? "is-embedded" : "page"}`}>
        <SpinnerGap />
        <span>正在连接 Career Ops</span>
      </section>
    );
  }

  if (!snapshot?.connected) {
    return (
      <section className={`career-page ${embedded ? "is-embedded" : "page"}`}>
        <section className="career-disconnected">
          <span><Briefcase /></span>
          <h1>还没有连接 Career Ops</h1>
          <p>up 会优先寻找“文档/秋招/career-ops”，连接后直接读取它的用户层数据。</p>
          <button className="secondary-button" onClick={load}><ArrowClockwise /> 重新检查</button>
        </section>
      </section>
    );
  }

  return (
    <section className={`career-page career-page--${surface} ${surface === "prepare" ? `career-section-${prepareSection}` : ""} ${embedded ? "is-embedded" : "page"}`}>
      <header className="career-hero">
        <div>
          <span className="career-eyebrow"><Sparkle /> {copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>
            {copy.description}
            {selectedRole && surface !== "discovery" ? ` 当前上下文：${selectedRole.name} · ${selectedRole.role}。` : ""}
          </p>
        </div>
        <div className="career-connection">
          <span className={snapshot.codexReady && !snapshot.missing.length ? "is-ready" : ""} />
          <div>
            <strong>{snapshot.codexReady ? "Codex 已连接" : "Codex 未连接"}</strong>
            <small>career-ops {snapshot.version ? `v${snapshot.version}` : "本地版"}</small>
          </div>
          <button onClick={load} aria-label="刷新 Career Ops"><ArrowClockwise /></button>
        </div>
      </header>

      {error && <div className="career-alert" role="alert"><ShieldCheck /><span>{error}</span><button onClick={() => setError("")}><X /></button></div>}

      {surface === "prepare" && (
        <div className="career-workspace-tabs" role="tablist" aria-label="准备空间">
          {PREPARE_SECTIONS.map(({ id, label, icon: SectionIcon }) => (
            <button
              role="tab"
              aria-selected={prepareSection === id}
              className={prepareSection === id ? "is-active" : ""}
              key={id}
              onClick={() => setPrepareSection(id)}
            >
              <SectionIcon />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="career-layout">
        <div className="career-main">
          {visibleGroups.map((group) => (
            <section className="career-action-group" key={group.id}>
              <header>
                <div>
                  <h2>{group.label}</h2>
                  <p>{group.description}</p>
                </div>
                <span>{String(group.actions.length).padStart(2, "0")}</span>
              </header>
              <div className="career-action-grid">
                {group.actions.map((action) => {
                  const Icon = action.icon;
                  const disabled = action.role && !selectedRole;
                  return (
                    <button
                      className={`career-action-card tone-${action.tone || "blue"} ${action.featured ? "is-featured" : ""} ${action.guarded ? "is-guarded" : ""}`}
                      key={action.id}
                      onClick={() => openAction(action)}
                      disabled={disabled}
                    >
                      <span className="career-action-icon"><Icon /></span>
                      <span className="career-action-copy">
                        <span className="career-action-kicker">{action.kicker}</span>
                        <strong>{action.label}</strong>
                        <small>{disabled ? "先在总览选择岗位" : action.caption}</small>
                      </span>
                      {action.guarded && <em className="career-action-guard"><ShieldCheck /> 人工确认</em>}
                      <ArrowRight />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="career-side">
          {surface === "prepare" && <section className="career-panel career-assets">
            <header>
              <div><h2>求职资产</h2><p>报告、简历与面试材料</p></div>
              <button onClick={() => openLocation("root")}><FolderOpen /></button>
            </header>
            <div className="career-asset-counts">
              <button onClick={() => openLocation("reports")}><strong>{snapshot.assetCounts?.reports ?? snapshot.reports.length}</strong><span>评估报告</span></button>
              <button onClick={() => openLocation("outputs")}><strong>{snapshot.assetCounts?.outputs ?? snapshot.outputs.length}</strong><span>生成材料</span></button>
              <button onClick={() => openLocation("interviews")}><strong>{snapshot.assetCounts?.interviews ?? snapshot.interviewFiles.length}</strong><span>面试档案</span></button>
            </div>
          </section>}

          <section className="career-panel career-runs">
            <header>
              <div><h2>运行中心</h2><p>每一步都可见、可停止、可复查</p></div>
              {tasks.some((task) => task.status === "running") && <SpinnerGap className="spin" />}
            </header>
            <div className="career-run-list">
              {tasks.length ? tasks.slice(0, 8).map((task) => (
                <button
                  key={task.id}
                  className={task.id === activeTask?.id ? "is-active" : ""}
                  onClick={() => setActiveTaskId(task.id)}
                >
                  <span><strong>{task.title}</strong><small>{formatTime(task.createdAt)}</small></span>
                  <TaskStatus task={task} />
                </button>
              )) : <p className="career-panel-empty">运行记录会保留在当前 up 会话中。</p>}
            </div>
          </section>
        </aside>
      </div>

      {activeTask && (
        <section className={`career-result ${activeTask.status === "running" ? "is-running" : ""}`}>
          <header>
            <div>
              <TaskStatus task={activeTask} />
              <h2>{activeTask.title}</h2>
              <p>{formatTime(activeTask.createdAt)} · 由 Codex 调用 career-ops</p>
            </div>
            {activeTask.status === "running" && (
              <button className="secondary-button" onClick={() => cancelTask(activeTask.id)}>停止任务</button>
            )}
          </header>
          <div className="career-result-body">
            {activeTask.output ? (
              <pre>{activeTask.output}</pre>
            ) : activeTask.error ? (
              <p className="career-result-error">{activeTask.error}</p>
            ) : (
              <div className="career-result-progress">
                <span><SpinnerGap /></span>
                <div>
                  <strong>Codex 正在工作</strong>
                  <p>{activeTask.log?.at(-1) || "正在读取候选人档案和岗位上下文…"}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {selectedAction && (
        <>
          <button className="career-sheet-backdrop" aria-label="关闭动作面板" onClick={() => setSelectedAction(null)} />
          <aside className="career-command-sheet" role="dialog" aria-modal="true" aria-labelledby="career-command-title">
            <header>
              <div>
                <span>CAREER OPS ACTION</span>
                <h2 id="career-command-title">{selectedAction.label}</h2>
                <p>{selectedAction.caption}</p>
              </div>
              <button className="icon-button bordered" onClick={() => setSelectedAction(null)} aria-label="关闭"><X /></button>
            </header>

            <div className="career-command-body">
              {selectedAction.role && selectedRole && (
                <section className="career-context-card">
                  <span><Briefcase /></span>
                  <div>
                    <strong>{selectedRole.name} · {selectedRole.role}</strong>
                    <small>{selectedRole.team}{selectedRole.location ? ` · ${selectedRole.location}` : ""}</small>
                  </div>
                  <em>{selectedRole.jd ? "JD 已就绪" : "JD 未补充"}</em>
                </section>
              )}

              {selectedAction.input && (
                <label className="career-command-input">
                  补充上下文
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={selectedAction.input}
                    autoFocus
                  />
                </label>
              )}

              <section className="career-guardrail">
                <ShieldCheck />
                <div>
                  <strong>你始终拥有最后决定权</strong>
                  <p>up 会把任务交给 Codex 和 career-ops。消息只生成草稿，申请只做准备，未经你确认不会发送或提交。</p>
                </div>
              </section>
            </div>

            <footer>
              <button className="secondary-button" onClick={() => setSelectedAction(null)}>取消</button>
              <button
                className="primary-button"
                onClick={runAction}
                disabled={!snapshot.codexReady || tasks.some((task) => task.status === "running")}
              >
                <Play weight="fill" /> 开始运行
              </button>
            </footer>
          </aside>
        </>
      )}
    </section>
  );
}
