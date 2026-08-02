import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AddressBook,
  Archive,
  ArrowDown,
  ArrowRight,
  Bell,
  BellSimple,
  Briefcase,
  Buildings,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChartBar,
  Check,
  CheckCircle,
  CirclesFour,
  Clock,
  Copy,
  DotsThree,
  EnvelopeSimple,
  File,
  FileText,
  Flag,
  FolderSimple,
  FunnelSimple,
  Gear,
  House,
  ImageSquare,
  IdentificationCard,
  Kanban,
  LinkSimple,
  ListBullets,
  MagnifyingGlass,
  MapPin,
  Note,
  PaperPlaneTilt,
  Plus,
  Rows,
  Sparkle,
  SquaresFour,
  Star,
  Tag,
  Target,
  Trash,
  TrendUp,
  UploadSimple,
  User,
  Users,
  X,
} from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CareerOpsView from "./CareerOps.jsx";

const NAV = [
  ["home", "首页", House],
  ["roles", "岗位", Briefcase],
  ["discovery", "情报", MagnifyingGlass],
  ["loop", "Loop 日报", Sparkle],
  ["schedule", "时间规划", CalendarBlank],
  ["files", "文件", FolderSimple],
  ["prepare", "准备", Target],
];

const STAGES = [
  { id: "wishlist", label: "关注", color: "blue" },
  { id: "applied", label: "已投递", color: "sky" },
  { id: "screening", label: "筛选", color: "purple" },
  { id: "interview", label: "面试", color: "green" },
  { id: "offer", label: "Offer", color: "orange" },
  { id: "closed", label: "已结束", color: "red" },
];

const EMPTY_INTELLIGENCE = {
  generatedAt: null,
  opportunities: [],
  updates: [],
  roleBriefs: {},
  automation: { name: "秋招情报 Loop", schedule: "每天 22:30", status: "not_configured" },
  applicationSync: { records: {}, changes: [], checkedAt: null, status: "not_configured" },
};

const EMPTY_CAREER = {
  connected: false,
  applications: [],
  reports: [],
  outputs: [],
  interviewFiles: [],
  resume: null,
  assetCounts: { reports: 0, outputs: 0, interviews: 0 },
  pipelineCount: 0,
};

const EMPTY_LOOP_RUNS = { version: 1, runs: [] };

const EMPTY_PROFILE = { name: "", title: "", location: "" };

function profileInitial(profile) {
  return String(profile?.name || "你").trim().slice(0, 1) || "你";
}

const LOGO_FILE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const LOGO_FILE_LIMIT = 2 * 1024 * 1024;

function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !LOGO_FILE_TYPES.has(file.type)) {
      reject(new Error("请选择 PNG、JPG 或 WebP 图片"));
      return;
    }
    if (file.size > LOGO_FILE_LIMIT) {
      reject(new Error("Logo 图片不能超过 2MB"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result || "") });
    reader.onerror = () => reject(new Error("无法读取这张图片"));
    reader.readAsDataURL(file);
  });
}

const COMPANY_PRESETS = [
  ["bytedance", ["字节", "豆包", "bytedance"], "/logos/preset-doubao.png"],
  ["alibaba", ["阿里", "千问", "alibaba"], "/logos/preset-alibaba.png"],
  ["tencent", ["腾讯", "tencent"], "/logos/preset-tencent.png"],
  ["xiaohongshu", ["小红书", "rednote"], "/logos/preset-xiaohongshu.png"],
  ["pinduoduo", ["拼多多", "pdd"], "/logos/preset-pinduoduo.jpg"],
  ["jd", ["京东", "jd"], "/logos/preset-jd.png"],
  ["baidu", ["百度", "baidu"], "/logos/preset-baidu.png"],
  ["deepseek", ["deepseek", "深度求索"], "/logos/preset-deepseek.png"],
  ["kimi", ["kimi", "月之暗面"], "/logos/preset-kimi.png"],
  ["minimax", ["minimax", "稀宇"], "/logos/preset-minimax.png"],
  ["zhipu", ["智谱", "zhipu", "glm"], "/logos/preset-zhipu.png"],
  ["kuaishou", ["快手", "kuaishou"], "/logos/preset-kuaishou.png"],
];

const COMPANY_DISPLAY_NAMES = {
  bytedance: "字节跳动",
  alibaba: "阿里巴巴",
  tencent: "腾讯",
  xiaohongshu: "小红书",
  pinduoduo: "拼多多",
  jd: "京东",
  baidu: "百度",
  deepseek: "DeepSeek",
  kimi: "Kimi",
  minimax: "MiniMax",
  zhipu: "智谱",
  kuaishou: "快手",
};

function companyIdentity(value) {
  const text = String(value || "").trim().toLowerCase();
  const preset = COMPANY_PRESETS.find(([, aliases]) => aliases.some((alias) => text.includes(alias.toLowerCase())));
  return preset?.[0] || text.replace(/[^\p{L}\p{N}]+/gu, "");
}

function companyDisplayName(value) {
  const identity = companyIdentity(value);
  return COMPANY_DISPLAY_NAMES[identity] || String(value || "公司未注明").trim();
}

function matchLogo(value) {
  const text = String(value || "").toLowerCase();
  return COMPANY_PRESETS.find(([, aliases]) => aliases.some((alias) => text.includes(alias)))?.[2] || "";
}

function stageFor(company, intelligence) {
  const record = intelligence.applicationSync?.records?.[company.id];
  const nodes = [...(company.timeline || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const latest = nodes.at(-1);
  const text = `${record?.normalizedStage || ""} ${record?.officialStatus || ""} ${latest?.type || ""} ${latest?.title || ""} ${company.status || ""}`;
  if (/入职|hired/i.test(text)) return "closed";
  if (/拒绝|淘汰|未通过|放弃|撤回|结束|rejected|discarded/i.test(text)) return "closed";
  if (/offer/i.test(text)) return "offer";
  if (/面试|一面|二面|三面|终面|hr 面|interview/i.test(text)) return "interview";
  if (/筛选|测评|笔试|沟通|responded|screening|assessment/i.test(text)) return "screening";
  if (/投递|网申|applied/i.test(text)) return "applied";
  return "wishlist";
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function shortDate(value) {
  if (!value) return "未设置";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function relativeTime(value) {
  if (!value) return "时间未记录";
  const delta = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(delta)) return "时间未记录";
  const days = Math.floor(delta / 86400000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  return `${days}天前`;
}

function itemDate(company) {
  return [...(company.timeline || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]?.date || "";
}

function nodeName(node) {
  if (!node) return "尚无下一步";
  return node.type === "自定义" ? (node.title || "自定义节点") : node.type;
}

function nextNode(company) {
  const today = dateKey(new Date());
  return [...(company.timeline || [])]
    .filter((node) => node.date >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] || null;
}

function CompanyLogo({ company, size = "md" }) {
  const src = company.logoUrl || matchLogo(`${company.name} ${company.team}`);
  return (
    <span className={`aw-company-logo size-${size}`}>
      {src ? <img src={src} alt="" /> : <b>{company.mark || company.name?.slice(0, 1) || "?"}</b>}
    </span>
  );
}

function OpportunityLogo({ opportunity }) {
  const name = opportunity.company || opportunity.organization || opportunity.title || "公司";
  return <CompanyLogo company={{ name, team: opportunity.title || opportunity.role || "", mark: name.slice(0, 1) }} size="md" />;
}

function StagePill({ stage }) {
  const value = STAGES.find((item) => item.id === stage) || STAGES[0];
  return <span className={`aw-pill tone-${value.color}`}>{value.label}</span>;
}

function IconButton({ children, label, className = "", ...props }) {
  return <button className={`aw-icon-button ${className}`} aria-label={label} {...props}>{children}</button>;
}

function PageHeader({ title, subtitle, action, onAction, actionIcon: ActionIcon = Plus, children }) {
  return (
    <header className="aw-page-header">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      <div className="aw-page-actions">{children}{action && <button className="aw-black-button" onClick={onAction}><ActionIcon weight="bold" />{action}</button>}</div>
    </header>
  );
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`aw-panel ${className}`}>
      {(title || action) && <header className="aw-panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action || <DotsThree weight="bold" />}</header>}
      {children}
    </section>
  );
}

function SearchField({ value, onChange, placeholder, inputRef }) {
  return (
    <label className="aw-search-field"><MagnifyingGlass /><input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /><kbd>⌘K</kbd></label>
  );
}

function FilterButton({ children }) {
  return <button className="aw-filter-button">{children}<CaretDown /></button>;
}

function EmptyState({ icon: Icon = Archive, title, text, action, onAction }) {
  return <div className="aw-empty"><span><Icon /></span><h3>{title}</h3><p>{text}</p>{action && <button className="aw-outline-button" onClick={onAction}><Plus />{action}</button>}</div>;
}

function Donut({ values, total, center, sub }) {
  const colors = ["#94b4ff", "#9bd7ff", "#8de0a7", "#ffc96c", "#ff898d", "#b7a3ff"];
  const sum = Math.max(total || values.reduce((acc, value) => acc + value, 0), 1);
  let cursor = 0;
  const stops = values.map((value, index) => {
    const start = cursor;
    cursor += (value / sum) * 100;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  }).join(", ");
  return <div className="aw-donut" style={{ background: `conic-gradient(${stops || "#edf0f5 0 100%"})` }}><div><strong>{center ?? total}</strong><small>{sub}</small></div></div>;
}

function Funnel({ counts, compact = false }) {
  const widths = compact ? [92, 76, 61, 45, 30] : [100, 84, 68, 52, 36];
  const values = [counts.applied || 0, counts.screening || 0, counts.interview || 0, counts.offer || 0, counts.closed || 0];
  return <div className={`aw-funnel ${compact ? "is-compact" : ""}`}>{values.map((value, index) => <div key={index} style={{ width: `${widths[index]}%` }}><span>{value}</span></div>)}</div>;
}

function countStages(companies, intelligence) {
  return Object.fromEntries(STAGES.map((stage) => [stage.id, companies.filter((company) => stageFor(company, intelligence) === stage.id).length]));
}

function HomePage({ companies, intelligence, profile, navigate, openAdd, openNotifications }) {
  const counts = countStages(companies, intelligence);
  const appliedTotal = companies.filter((company) => stageFor(company, intelligence) !== "wishlist").length;
  const upcoming = companies.flatMap((company) => (company.timeline || []).map((node) => ({ company, node })))
    .filter(({ node }) => node.date >= dateKey(new Date())).sort((a, b) => a.node.date.localeCompare(b.node.date)).slice(0, 4);
  const recent = [...(intelligence.updates || []), ...(intelligence.applicationSync?.changes || [])]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 4);
  const groups = companies.reduce((map, company) => map.set(company.name, (map.get(company.name) || 0) + 1), new Map());
  const topCompanies = [...groups].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const weekCounts = {
    interviews: upcoming.filter(({ node }) => /面/.test(`${node.type}${node.title}`)).length,
    assessments: upcoming.filter(({ node }) => /笔试|测评/.test(`${node.type}${node.title}`)).length,
    followups: companies.filter((company) => company.jd && !company.timeline?.length).length,
    tasks: upcoming.length,
  };
  return <div className="aw-page aw-home-page">
    <PageHeader title={profile?.name ? `早上好，${profile.name}` : "欢迎回来"} subtitle={`今天有 ${upcoming.length} 个即将到来的求职节点。`} action="添加岗位" onAction={openAdd}>
      <IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton>
    </PageHeader>
    <div className="aw-home-top aw-grid-3">
      <Panel title="申请漏斗"><div className="aw-funnel-card"><Funnel counts={counts} compact /><div className="aw-funnel-legend"><strong>{appliedTotal}<small>有效进程</small></strong>{STAGES.slice(1).map((stage) => <span key={stage.id}><i className={`tone-${stage.color}`} />{stage.label}<b>{counts[stage.id]}</b></span>)}</div></div></Panel>
      <Panel title="申请状态"><div className="aw-donut-card"><Donut values={STAGES.map((stage) => counts[stage.id])} total={companies.length} center={companies.length} sub="全部" /><div className="aw-mini-legend">{STAGES.slice(0, 5).map((stage) => <span key={stage.id}><i className={`tone-${stage.color}`} />{stage.label}<b>{counts[stage.id]}</b></span>)}</div></div></Panel>
      <Panel title="本周"><div className="aw-week-list"><span><i className="blue"><Users /></i><b>{weekCounts.interviews}</b>面试</span><span><i className="purple"><FileText /></i><b>{weekCounts.assessments}</b>测评</span><span><i className="sky"><EnvelopeSimple /></i><b>{weekCounts.followups}</b>待补资料</span><span><i className="gray"><CalendarBlank /></i><b>{weekCounts.tasks}</b>时间节点</span></div></Panel>
    </div>
    <Panel title="岗位进展" className="aw-home-pipeline">
      <div className="aw-home-columns">{STAGES.slice(1).map((stage) => { const items = companies.filter((company) => stageFor(company, intelligence) === stage.id); return <div key={stage.id} className={`aw-home-column tone-${stage.color}`}><header><span>{stage.label}</span><b>{items.length}</b></header>{items.slice(0, 3).map((company) => <button key={company.id} onClick={() => navigate("roles", company.id)}><CompanyLogo company={company} size="sm" /><span><strong>{company.name}</strong><small>{company.role}</small></span><em>{shortDate(itemDate(company))}</em></button>)}{items.length > 3 && <small>+ {items.length - 3} 个岗位</small>}</div>; })}</div>
    </Panel>
    <div className="aw-home-bottom aw-grid-3">
      <Panel title="即将到来">{upcoming.length ? <div className="aw-simple-list">{upcoming.map(({ company, node }) => <button key={`${company.id}-${node.id}`} onClick={() => navigate("schedule")}><span className="aw-soft-icon"><CalendarBlank /></span><span><strong>{nodeName(node)}</strong><small>{company.name}</small></span><em>{shortDate(node.date)} {node.time}</em></button>)}</div> : <EmptyState title="暂无日程" text="添加流程节点后会自动出现在这里。" />}</Panel>
      <Panel title="重点公司"><div className="aw-bar-list">{topCompanies.map(([name, value], index) => <div key={name}><span>{name}</span><i><b style={{ width: `${Math.max(24, 100 - index * 15)}%` }} /></i><strong>{value}</strong></div>)}</div></Panel>
      <Panel title="最近动态">{recent.length ? <div className="aw-activity-list">{recent.map((item, index) => <div key={`${item.id || "update"}-${index}`}><span className="aw-soft-icon"><TrendUp /></span><p><strong>{item.title}</strong><small>{item.summary}</small></p><em>{relativeTime(item.createdAt)}</em></div>)}</div> : <EmptyState title="暂无动态" text="情报 Loop 的更新会显示在这里。" />}</Panel>
    </div>
  </div>;
}

function ApplicationsPage({ companies, intelligence, selectedId, selectCompany, openAdd, openNotifications }) {
  const [stageFilter, setStageFilter] = useState("all");
  const applications = companies.filter((company) => stageFor(company, intelligence) !== "wishlist");
  const filtered = stageFilter === "all" ? applications : applications.filter((company) => stageFor(company, intelligence) === stageFilter);
  const counts = countStages(applications, intelligence);
  const upcoming = applications.map((company) => ({ company, node: nextNode(company) })).filter((item) => item.node).slice(0, 5);
  return <div className="aw-page aw-applications-page">
    <PageHeader title="申请" subtitle="在一个地方跟踪并管理所有求职申请。" action="添加申请" onAction={openAdd}><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader>
    <div className="aw-toolbar"><SearchField value="" onChange={() => {}} placeholder="搜索申请…" /><FilterButton>阶段</FilterButton><FilterButton>岗位</FilterButton><FilterButton>地点</FilterButton><FilterButton>优先级</FilterButton><FilterButton>最近更新</FilterButton><button className="aw-filter-button"><FunnelSimple />筛选</button></div>
    <div className="aw-main-aside">
      <Panel className="aw-table-panel"><div className="aw-table aw-app-table"><div className="aw-tr aw-th"><span>公司</span><span>岗位</span><span>阶段</span><span>地点</span><span>申请日期</span><span>下一步</span><span>状态</span><span /></div>{filtered.map((company) => { const stage = stageFor(company, intelligence); const node = nextNode(company); const record = intelligence.applicationSync?.records?.[company.id]; return <button className={`aw-tr ${company.id === selectedId ? "is-selected" : ""}`} key={company.id} onClick={() => selectCompany(company.id)}><span className="aw-company-cell"><CompanyLogo company={company} size="sm" /><strong>{company.name}</strong></span><span>{company.role}</span><span><StagePill stage={stage} /></span><span><MapPin />{company.location || "未注明"}</span><span>{shortDate(itemDate(company))}</span><span><strong>{node ? nodeName(node) : "待规划"}</strong><small>{node ? `${shortDate(node.date)} ${node.time}` : "补充流程节点"}</small></span><span className="aw-status"><i className={record?.accessStatus === "verified" ? "green" : "blue"} />{record?.officialStatus || "本地记录"}</span><span><DotsThree /></span></button>; })}{!filtered.length && <EmptyState title="没有符合条件的申请" text="调整筛选条件，或添加一条新申请。" action="添加申请" onAction={openAdd} />}</div><footer className="aw-table-footer">共 {filtered.length} 条申请 <div><button><CaretLeft /></button><button className="is-active">1</button><button><CaretRight /></button></div></footer></Panel>
      <aside className="aw-right-stack"><Panel title="申请概览"><div className="aw-summary-list">{STAGES.slice(1).map((stage) => <button key={stage.id} onClick={() => setStageFilter(stageFilter === stage.id ? "all" : stage.id)} className={stageFilter === stage.id ? "is-active" : ""}><span><i className={`tone-${stage.color}`} />{stage.label}</span><b>{counts[stage.id] || 0}</b></button>)}<footer><span>全部申请</span><b>{applications.length}</b></footer></div></Panel><Panel title="近期节点">{upcoming.length ? <div className="aw-followup-list">{upcoming.map(({ company, node }) => <div key={company.id}><CompanyLogo company={company} size="sm" /><span><strong>{company.name}</strong><small>{nodeName(node)}</small></span><em>{shortDate(node.date)}</em></div>)}</div> : <EmptyState title="暂无近期节点" text="在日历或流程中添加安排。" />}</Panel></aside>
    </div>
  </div>;
}

function CompaniesPage({ companies, intelligence, selectCompany, openAdd, openNotifications }) {
  const groups = useMemo(() => {
    const map = new Map();
    companies.forEach((company) => { const key = company.name; if (!map.has(key)) map.set(key, []); map.get(key).push(company); });
    return [...map.entries()];
  }, [companies]);
  const counts = countStages(companies, intelligence);
  const verifiedOpportunities = intelligence.opportunities || [];
  return <div className="aw-page aw-companies-page"><PageHeader title="公司" subtitle="管理目标公司、岗位与研究情报。" action="添加公司" onAction={openAdd}><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader>
    <div className="aw-toolbar"><SearchField value="" onChange={() => {}} placeholder="搜索公司…" /><FilterButton>行业</FilterButton><FilterButton>优先级</FilterButton><FilterButton>状态</FilterButton><FilterButton>保存列表</FilterButton><span className="aw-toolbar-spacer" /><FilterButton>最近更新</FilterButton><button className="aw-view-toggle"><SquaresFour /><Rows /></button></div>
    <div className="aw-company-metrics">{[[Star,"重点公司",groups.length,"purple"],[PaperPlaneTilt,"已投递",counts.applied,"blue"],[Users,"面试中",counts.interview,"green"],[Clock,"等待中",counts.screening,"orange"],[ListBullets,"全部岗位",companies.length,"gray"]].map(([Icon,label,value,tone]) => <div key={label}><i className={tone}><Icon /></i><strong>{value}<small>{label}</small></strong></div>)}</div>
    <div className="aw-company-grid">{groups.map(([name, positions]) => { const company = positions[0]; const bestStage = positions.map((item) => stageFor(item, intelligence)).sort((a,b) => STAGES.findIndex((stage) => stage.id === b) - STAGES.findIndex((stage) => stage.id === a))[0]; return <button className="aw-company-card" key={name} onClick={() => selectCompany(company.id)}><header><CompanyLogo company={company} size="lg" /><span><strong>{name}</strong><small>{positions.length} 个岗位</small></span><DotsThree /></header><StagePill stage={bestStage} /><div className="aw-card-divider" /><p>{company.jd ? company.jd.slice(0, 72) : "尚未补充 JD，可从情报或岗位详情继续完善。"}</p><footer><span><FileText />{positions.filter((item) => item.jd).length} 份 JD</span><span>{shortDate(itemDate(company))}</span></footer></button>; })}</div>
    <Panel title="公司情报" subtitle={`${verifiedOpportunities.length} 条已核验校招机会`} action={<button className="aw-text-button">查看全部 <ArrowRight /></button>}><div className="aw-research-grid">{verifiedOpportunities.slice(0,4).map((item,index) => <article key={item.id || index}><span className={`aw-soft-icon tone-${["green","blue","orange","purple"][index%4]}`}><TrendUp /></span><header><strong>{item.company || item.title}</strong><small>{item.role || item.title}</small></header><p>{item.summary || "已通过官方来源核验。"}</p><footer>{relativeTime(item.verifiedAt || item.updatedAt || intelligence.generatedAt)}</footer></article>)}{!verifiedOpportunities.length && <EmptyState title="暂无已核验机会" text="情报 Loop 完成后会显示在这里。" />}</div></Panel>
  </div>;
}

function answerBlocks(text, synthesis) {
  const source = String(text || "").trim();
  if (!source) return [];
  const markers = [...source.matchAll(/【([^】]+)】/g)];
  if (!markers.length) return [{ title: "经验资料", body: source }];
  const compact = (value) => String(value || "").replace(/\s+/g, "").replace(/[：:，,。.!！?？]/g, "");
  const synthesisKey = compact(synthesis);
  return markers.map((marker, index) => ({
    title: marker[1].trim(),
    body: source.slice(marker.index + marker[0].length, markers[index + 1]?.index ?? source.length).trim(),
  })).filter(({ title, body }) => {
    if (!body) return false;
    if (!["资料结论", "面试官在考什么"].includes(title)) return true;
    const bodyKey = compact(body);
    return !synthesisKey || (!synthesisKey.includes(bodyKey) && !bodyKey.includes(synthesisKey));
  });
}

function RoleIntelligence({ brief }) {
  const sections = useMemo(() => {
    if (Array.isArray(brief?.experienceSections) && brief.experienceSections.length) return brief.experienceSections;
    const questions = Array.isArray(brief?.questions) ? brief.questions : [];
    return questions.length ? [{ id: "questions", title: "问题清单", summary: "根据当前岗位情报整理的问题。", questions: questions.map((question, index) => typeof question === "string" ? { id: `question-${index}`, question, answers: [] } : question) }] : [];
  }, [brief]);
  const [sectionId, setSectionId] = useState("");
  const [questionId, setQuestionId] = useState("");
  useEffect(() => {
    if (!sections.some((section) => (section.id || section.title) === sectionId)) setSectionId(sections[0]?.id || sections[0]?.title || "");
  }, [sections, sectionId]);
  const activeSection = sections.find((section) => (section.id || section.title) === sectionId) || sections[0];
  const questions = activeSection?.questions || [];
  useEffect(() => {
    if (!questions.some((question) => (question.id || question.question) === questionId)) setQuestionId(questions[0]?.id || questions[0]?.question || "");
  }, [questions, questionId]);
  const activeQuestion = questions.find((question) => (question.id || question.question) === questionId) || questions[0];
  if (!brief) return <EmptyState icon={Sparkle} title="还没有岗位情报" text="情报 Loop 会读取最新 JD 和公开来源，把流程、问题与答案归到这里。" />;
  if (!sections.length) return <EmptyState icon={Sparkle} title="还没有可练习的问题" text="下一轮情报 Loop 会按面试环节整理公开经验。" />;
  const totalQuestions = sections.reduce((total, section) => total + (section.questions?.length || 0), 0);
  const sourceMap = new Map((brief.sources || []).map((source) => [source.id, source]));
  const sourceIds = [...new Set((activeQuestion?.answers || []).flatMap((answer) => answer.sourceIds || []))];
  const relatedSources = sourceIds.map((id) => sourceMap.get(id)).filter(Boolean);
  const blocks = (activeQuestion?.answers || []).flatMap((answer) => answerBlocks(answer.text, activeQuestion.synthesis));
  return <div className="aw-role-intelligence">
    <section className="aw-intel-summary"><span><Sparkle /></span><div><small>岗位情报摘要</small><strong>{brief.summary}</strong><p>{brief.updatedAt ? `更新于 ${relativeTime(brief.updatedAt)}` : "更新时间未注明"} · {sections.length} 个环节 · {totalQuestions} 个问题 · {(brief.sources || []).length} 个来源</p></div></section>
    {(brief.signals || []).length > 0 && <div className="aw-signal-row">{brief.signals.map((signal) => <span key={signal}>{signal}</span>)}</div>}
    <div className="aw-intel-reader">
      <aside className="aw-intel-index">
        <header><small>INTERVIEW MAP</small><strong>按环节准备</strong><span>{totalQuestions} 个问题</span></header>
        <nav aria-label="面试环节">{sections.map((section, index) => { const id = section.id || section.title; const active = id === (activeSection.id || activeSection.title); return <button key={id} className={active ? "is-active" : ""} onClick={() => setSectionId(id)} aria-current={active ? "step" : undefined}><i>{String(index + 1).padStart(2, "0")}</i><span><strong>{section.title}</strong><small>{section.questions?.length || 0} 个问题</small></span><CaretRight /></button>; })}</nav>
      </aside>
      <section className="aw-intel-workspace">
        <header className="aw-intel-stage-header"><div><small>当前环节</small><h3>{activeSection.title}</h3><p>{activeSection.summary}</p></div><b>{questions.length}</b></header>
        <div className="aw-intel-stage-body">
          <nav className="aw-question-index" aria-label={`${activeSection.title}问题`}>{questions.map((question, index) => { const id = question.id || question.question; const active = id === (activeQuestion?.id || activeQuestion?.question); return <button key={id} className={active ? "is-active" : ""} onClick={() => setQuestionId(id)} aria-current={active ? "true" : undefined}><i>{String(index + 1).padStart(2, "0")}</i><span>{question.question}</span><CaretRight /></button>; })}</nav>
          <article className="aw-question-reader">
            <header><small>QUESTION {String(Math.max(0, questions.indexOf(activeQuestion)) + 1).padStart(2, "0")}</small><h2>{activeQuestion?.question}</h2></header>
            {activeQuestion?.synthesis && <section className="aw-question-takeaway"><span><Sparkle /></span><div><small>核心判断</small><p>{activeQuestion.synthesis}</p></div></section>}
            <div className="aw-answer-blocks">{blocks.length ? blocks.map((block, index) => <section key={`${block.title}-${index}`}><h3>{block.title}</h3><ReactMarkdown remarkPlugins={[remarkGfm]}>{block.body}</ReactMarkdown></section>) : <p className="aw-answer-empty">该问题暂时只有题目，下一轮情报更新会补充经验与准备建议。</p>}</div>
            {relatedSources.length > 0 && <footer className="aw-question-sources"><small>本题来源</small><div>{relatedSources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id || source.url}><span><strong>{source.title || source.source || "公开来源"}</strong><small>{source.source}{source.year ? ` · ${source.year}` : ""}</small></span><ArrowRight /></a>)}</div></footer>}
          </article>
        </div>
      </section>
    </div>
    {(brief.sources || []).length > relatedSources.length && <details className="aw-role-sources"><summary>查看全部 {(brief.sources || []).length} 个公开来源 <CaretDown /></summary><div>{brief.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id || source.url}><span><strong>{source.title || source.source || "公开来源"}</strong><small>{source.source}{source.year ? ` · ${source.year}` : ""}</small></span><ArrowRight /></a>)}</div></details>}
  </div>;
}

function RolesPage({ companies, intelligence, selectedId, selectedCompany, selectCompany, openAdd, openNotifications, openRoleEditor }) {
  const [localQuery, setLocalQuery] = useState("");
  const [tab, setTab] = useState("overview");
  const groups = useMemo(() => {
    const map = new Map();
    companies.filter((company) => `${company.name} ${company.team} ${company.role} ${company.jd}`.toLowerCase().includes(localQuery.toLowerCase())).forEach((company) => {
      const identity = companyIdentity(company.name);
      if (!map.has(identity)) map.set(identity, { name: companyDisplayName(company.name), positions: [] });
      map.get(identity).positions.push(company);
    });
    return [...map.values()].map(({ name, positions }) => [name, positions]);
  }, [companies, localQuery]);
  const selected = selectedCompany || companies[0] || null;
  const selectedGroup = groups.find(([name]) => companyIdentity(name) === companyIdentity(selected?.name));
  const brief = selected ? intelligence.roleBriefs?.[selected.id] : null;
  const stage = selected ? stageFor(selected, intelligence) : "wishlist";
  const intelligenceQuestionCount = Array.isArray(brief?.experienceSections) && brief.experienceSections.length
    ? brief.experienceSections.reduce((total, section) => total + (section.questions?.length || 0), 0)
    : (brief?.questions?.length || 0);
  const tabs = [["overview","概览"],["jd","详细 JD"],["process","具体流程"],["intelligence","情报与问题"],["notes","笔记"],["prepare","评估与准备"]];
  useEffect(() => { setTab("overview"); }, [selected?.id]);
  return <div className="aw-page aw-roles-page">
    <PageHeader title="岗位" subtitle="以公司为目录，集中管理岗位、JD、流程、情报问题和准备材料。" action="添加岗位" onAction={openAdd}><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader>
    <div className="aw-role-workspace">
      <section className="aw-role-library">
        <div className="aw-role-library-toolbar"><SearchField value={localQuery} onChange={setLocalQuery} placeholder="搜索公司、岗位或 JD" /><span>{groups.length} 家公司 · {companies.length} 个岗位</span></div>
        <nav className="aw-company-nav" aria-label="公司选择">{groups.map(([name, positions]) => {
          const isActive = companyIdentity(name) === companyIdentity(selected?.name);
          const activePosition = isActive && positions.some((position) => position.id === selectedId) ? selected : positions[0];
          return <button key={name} className={isActive ? "is-active" : ""} onClick={() => selectCompany(activePosition.id)} aria-pressed={isActive} aria-label={`${name}，${positions.length} 个岗位，${positions.filter((item) => item.jd).length} 份 JD`}><CompanyLogo company={positions[0]} size="md" /><span><strong>{name}</strong><small>{positions.length} 岗 · {positions.filter((item) => item.jd).length} JD</small></span></button>;
        })}</nav>
        {selectedGroup?.[1]?.length > 1 && <div className="aw-company-role-switcher"><span>{selectedGroup[0]} 的岗位</span>{selectedGroup[1].map((company) => <button key={company.id} className={company.id === selectedId ? "is-active" : ""} onClick={() => selectCompany(company.id)}><strong>{company.role}</strong><StagePill stage={stageFor(company, intelligence)} /></button>)}</div>}
      </section>
      <main className="aw-role-detail">{selected ? <>
        <header className="aw-role-hero"><div><CompanyLogo company={selected} size="lg" /><span><small>{selected.name}</small><h2>{selected.role}</h2><p>{selected.team || "团队未注明"}{selected.location ? ` · ${selected.location}` : ""}</p></span></div><div><StagePill stage={stage} /><button className="aw-outline-button" onClick={() => openRoleEditor(selected)}><FileText />编辑资料</button></div></header>
        <nav className="aw-role-tabs">{tabs.map(([id,label]) => <button key={id} className={tab===id?"is-active":""} onClick={()=>setTab(id)}>{label}{id==="intelligence"&&intelligenceQuestionCount?<b>{intelligenceQuestionCount}</b>:null}</button>)}</nav>
        <div className="aw-role-tab-content">
          {tab === "overview" && <div className="aw-role-overview"><div className="aw-role-overview-grid"><Panel title="岗位资料"><div className="aw-role-facts"><span><FileText /><b>{selected.jd ? "JD 已完整" : "等待补充 JD"}</b></span><span><MapPin /><b>{selected.location || "地点未注明"}</b></span><span><CalendarBlank /><b>{(selected.timeline || []).length} 个个人节点</b></span><span><Sparkle /><b>{brief ? "公开情报已覆盖" : "等待情报更新"}</b></span></div></Panel><Panel title="公开情报"><div className="aw-role-brief-preview"><strong>{brief?.summary || "下一轮情报搜索会围绕这个岗位收集公开流程、经验与来源。"}</strong><button className="aw-text-button" onClick={()=>setTab("intelligence")}>查看问题与答案 <ArrowRight /></button></div></Panel></div><Panel title="岗位描述预览"><div className="aw-role-copy">{selected.jd ? `${selected.jd.slice(0, 700)}${selected.jd.length > 700 ? "…" : ""}` : "尚未补充 JD。点击“编辑资料”粘贴真实职位描述。"}</div></Panel></div>}
          {tab === "jd" && <div className="aw-document-view"><header><div><small>JOB DESCRIPTION</small><h2>{selected.name} · {selected.role}</h2></div><button className="aw-outline-button" onClick={() => openRoleEditor(selected)}><FileText />编辑 JD</button></header><article>{selected.jd || "尚未补充 JD。"}</article></div>}
          {tab === "process" && <div className="aw-process-detail"><Panel title="我的投递时间轴" subtitle="这是你在本地记录的真实进度。"><div className="aw-personal-timeline">{(selected.timeline || []).length ? [...selected.timeline].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map((node,index)=><button key={node.id||index}><i/><span><small>{shortDate(node.date)} {node.time}</small><strong>{nodeName(node)}</strong><p>{node.note || "没有额外备注"}</p></span></button>) : <EmptyState title="还没有个人节点" text="在“时间规划”中添加投递、测评或面试日期。" />}</div></Panel><Panel title="公开招聘流程" subtitle="来自公开职位与候选人经验，仅作为准备参考。"><div className="aw-public-process">{brief?.processTimeline?.length ? brief.processTimeline.map((node,index)=><article key={node.id||index}><span>{String(index+1).padStart(2,"0")}</span><div><header><strong>{node.title}</strong><em className={`confidence-${node.confidence}`}>{node.confidence === "high" ? "高可信" : node.confidence === "medium" ? "中可信" : "低可信"}</em></header><small>{node.dateLabel || "日期待确认"}</small><p>{node.description}</p><footer>{node.basis}</footer></div></article>) : <EmptyState title="还没有公开流程" text="情报 Loop 找到可靠信息后会按阶段整理到这里。" />}</div></Panel></div>}
          {tab === "intelligence" && <RoleIntelligence brief={brief} />}
          {tab === "notes" && <div className="aw-document-view aw-notes-inline"><header><div><small>ROLE NOTES</small><h2>岗位笔记</h2></div><button className="aw-outline-button" onClick={() => openRoleEditor(selected)}><Note />编辑笔记</button></header><article>{selected.notes || "尚未记录个人判断、联系人或准备重点。"}</article></div>}
          {tab === "prepare" && <CareerOpsView key={selected.id} selectedRole={selected} roles={companies} surface="role" embedded />}
        </div>
      </> : <EmptyState title="还没有岗位" text="添加第一个岗位后，可在这里管理 JD、流程、情报与准备。" action="添加岗位" onAction={openAdd} />}</main>
    </div>
  </div>;
}

function PipelinePage({ companies, intelligence, selectCompany, openAdd, openNotifications }) {
  const counts = countStages(companies, intelligence);
  return <div className="aw-page aw-pipeline-page"><PageHeader title="流程" subtitle="在每个阶段跟踪你的申请进展。" action="添加申请" onAction={openAdd}><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader>
    <div className="aw-toolbar"><SearchField value="" onChange={() => {}} placeholder="搜索申请…" /><FilterButton>全部阶段</FilterButton><FilterButton>全部公司</FilterButton><FilterButton>全部优先级</FilterButton><span className="aw-toolbar-spacer" /><button className="aw-view-toggle"><SquaresFour /><Rows /></button></div>
    <div className="aw-stage-strip">{STAGES.map((stage) => <div key={stage.id}><span><i className={`tone-${stage.color}`} />{stage.label}</span><b>{counts[stage.id]}</b><em><i className={`tone-${stage.color}`} style={{ width: `${Math.max(12, counts[stage.id] / Math.max(companies.length,1) * 100)}%` }} /></em></div>)}<strong>{companies.length}<small>全部</small></strong></div>
    <div className="aw-kanban">{STAGES.map((stage) => { const items = companies.filter((company) => stageFor(company, intelligence) === stage.id); return <section key={stage.id} className={`aw-kanban-column tone-${stage.color}`}><header><span><i />{stage.label}</span><b>{items.length}</b><DotsThree /></header>{items.map((company) => { const node = nextNode(company); return <button className="aw-kanban-card" key={company.id} onClick={() => selectCompany(company.id)}><div><CompanyLogo company={company} size="sm" /><span><strong>{company.role}</strong><small>{company.name}</small></span></div><p>{node ? `下一步：${nodeName(node)}` : company.jd ? "岗位资料已就绪" : "待补充岗位资料"}</p><footer><span><CalendarBlank />{node ? shortDate(node.date) : shortDate(itemDate(company))}</span><StagePill stage={stage.id} /></footer></button>; })}<button className="aw-add-inline" onClick={openAdd}><Plus />添加申请</button></section>; })}</div>
  </div>;
}

function buildCalendar(date, companies) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = first.getDay();
  const start = new Date(first); start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); const key = dateKey(day); const events = companies.flatMap((company) => (company.timeline || []).filter((node) => node.date === key).map((node) => ({ company, node }))); return { day, key, events, current: day.getMonth() === date.getMonth() }; });
}

const GANTT_DAY_WIDTH = 58;
const GANTT_ROLE_WIDTH = 210;
const GANTT_WINDOW_DAYS = 112;
const GANTT_PAST_DAYS = 56;
const GANTT_SHIFT_DAYS = 42;
const GANTT_EDGE_DAYS = 8;

function CalendarPage({ companies, intelligence, openNode, openAdd, openNotifications }) {
  const [month, setMonth] = useState(new Date());
  const cells = buildCalendar(month, companies);
  const future = companies.flatMap((company) => (company.timeline || []).map((node) => ({ company, node }))).filter(({node}) => node.date >= dateKey(new Date())).sort((a,b) => a.node.date.localeCompare(b.node.date));
  return <div className="aw-page aw-calendar-page"><PageHeader title="日历" action="新建日程" onAction={() => openNode(companies[0]?.id, dateKey(new Date()))}><SearchField value="" onChange={() => {}} placeholder="搜索日程" /><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader>
    <div className="aw-calendar-tabs"><button className="is-active">月</button><button>周</button><button>日程</button><div><IconButton label="上个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1,1))}><CaretLeft /></IconButton><strong>{month.getFullYear()}年 {month.getMonth()+1}月</strong><IconButton label="下个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1,1))}><CaretRight /></IconButton><button className="aw-outline-button" onClick={() => setMonth(new Date())}>今天</button></div></div>
    <div className="aw-calendar-layout"><Panel className="aw-calendar-main"><div className="aw-weekdays">{["周日","周一","周二","周三","周四","周五","周六"].map((day) => <span key={day}>{day}</span>)}</div><div className="aw-month-grid">{cells.map((cell) => <button key={cell.key} className={`${cell.current ? "" : "is-muted"} ${cell.key === dateKey(new Date()) ? "is-today" : ""}`} onClick={() => openNode(companies[0]?.id, cell.key)}><span>{cell.day.getDate()}</span>{cell.events.slice(0,2).map(({company,node},index) => <em className={`event-${stageFor(company,intelligence)}`} key={`${company.id}-${node.id || index}`} onClick={(event) => { event.stopPropagation(); openNode(company.id, cell.key, node); }}><b>{node.time || nodeName(node)}</b><small>{company.name}</small></em>)}{cell.events.length > 2 && <small>+{cell.events.length-2}</small>}</button>)}</div></Panel>
      <aside className="aw-right-stack"><Panel title="即将到来" action={<button className="aw-text-button">查看全部</button>}>{future.length ? <div className="aw-upcoming-list">{future.slice(0,5).map(({company,node}) => <button key={`${company.id}-${node.id}`} onClick={() => openNode(company.id,node.date,node)}><span className="aw-soft-icon"><CalendarBlank /></span><span><strong>{nodeName(node)}</strong><small>{company.name}</small></span><em>{shortDate(node.date)}<small>{node.time}</small></em></button>)}</div> : <EmptyState title="暂无日程" text="添加面试、测评或截止日期。" />}</Panel><Panel title="今日日程"><EmptyState icon={CalendarBlank} title={cells.find((cell) => cell.key === dateKey(new Date()))?.events.length ? `${cells.find((cell) => cell.key === dateKey(new Date())).events.length} 项安排` : "今天没有日程"} text="保持专注，也给自己留一点空间。" action="新建日程" onAction={() => openNode(companies[0]?.id,dateKey(new Date()))} /></Panel><Panel title="图例"><div className="aw-legend-grid"><span><i className="tone-green" />面试</span><span><i className="tone-orange" />跟进</span><span><i className="tone-purple" />测评</span><span><i className="tone-red" />截止</span></div></Panel></aside>
    </div>
  </div>;
}

function SchedulePage({ companies, intelligence, openNode, openNotifications, selectCompany }) {
  const [mode, setMode] = useState("timeline");
  const [ganttStart, setGanttStart] = useState(() => startOfWeek(addDays(new Date(), -GANTT_PAST_DAYS)));
  const [month, setMonth] = useState(new Date());
  const [visibleIds, setVisibleIds] = useState(() => companies.map((company) => company.id));
  const [visibleRange, setVisibleRange] = useState({ start: "", end: "" });
  const visibleRangeRef = useRef({ start: "", end: "" });
  const ganttScrollRef = useRef(null);
  const ganttPositionedRef = useRef(false);
  const ganttShiftRef = useRef(null);
  const ganttShiftLockedRef = useRef(false);
  useEffect(() => { setVisibleIds((current) => [...new Set([...current, ...companies.map((company) => company.id)])]); }, [companies]);
  const days = useMemo(() => Array.from({ length: GANTT_WINDOW_DAYS }, (_, index) => addDays(ganttStart, index)), [ganttStart]);
  const cells = buildCalendar(month, companies);
  const counts = countStages(companies, intelligence);
  const timelineCompanies = companies.filter((company) => visibleIds.includes(company.id));

  const updateVisibleRange = useCallback((element) => {
    if (!element || !days.length) return;
    const firstIndex = Math.max(0, Math.min(days.length - 1, Math.floor(element.scrollLeft / GANTT_DAY_WIDTH)));
    const visibleDayCount = Math.max(1, Math.ceil((element.clientWidth - GANTT_ROLE_WIDTH) / GANTT_DAY_WIDTH));
    const lastIndex = Math.min(days.length - 1, firstIndex + visibleDayCount - 1);
    const next = { start: dateKey(days[firstIndex]), end: dateKey(days[lastIndex]) };
    if (visibleRangeRef.current.start === next.start && visibleRangeRef.current.end === next.end) return;
    visibleRangeRef.current = next;
    setVisibleRange(next);
  }, [days]);

  const scrollToDay = useCallback((target, behavior = "auto") => {
    const element = ganttScrollRef.current;
    if (!element) return false;
    const targetKey = dateKey(target);
    const index = days.findIndex((day) => dateKey(day) === targetKey);
    if (index < 0) return false;
    const viewportWidth = Math.max(GANTT_DAY_WIDTH, element.clientWidth - GANTT_ROLE_WIDTH);
    element.scrollTo({
      left: Math.max(0, index * GANTT_DAY_WIDTH - viewportWidth / 2 + GANTT_DAY_WIDTH / 2),
      behavior,
    });
    updateVisibleRange(element);
    return true;
  }, [days, updateVisibleRange]);

  useLayoutEffect(() => {
    if (mode !== "timeline") return;
    const element = ganttScrollRef.current;
    if (!element) return;
    const pending = ganttShiftRef.current;
    if (pending?.type === "preserve") {
      element.scrollLeft = Math.max(0, pending.scrollLeft + pending.adjustBy);
      ganttShiftRef.current = null;
      ganttShiftLockedRef.current = false;
      updateVisibleRange(element);
      return;
    }
    if (!pending && ganttPositionedRef.current) {
      updateVisibleRange(element);
      return;
    }
    const target = pending?.target ? new Date(`${pending.target}T12:00:00`) : new Date();
    scrollToDay(target);
    ganttShiftRef.current = null;
    ganttShiftLockedRef.current = false;
    ganttPositionedRef.current = true;
  }, [ganttStart, mode, scrollToDay, updateVisibleRange]);

  const handleGanttScroll = (event) => {
    const element = event.currentTarget;
    updateVisibleRange(element);
    if (ganttShiftLockedRef.current) return;
    const threshold = GANTT_EDGE_DAYS * GANTT_DAY_WIDTH;
    if (element.scrollLeft <= threshold) {
      ganttShiftLockedRef.current = true;
      ganttShiftRef.current = { type: "preserve", scrollLeft: element.scrollLeft, adjustBy: GANTT_SHIFT_DAYS * GANTT_DAY_WIDTH };
      setGanttStart((current) => addDays(current, -GANTT_SHIFT_DAYS));
      return;
    }
    if (element.scrollLeft + element.clientWidth >= element.scrollWidth - threshold) {
      ganttShiftLockedRef.current = true;
      ganttShiftRef.current = { type: "preserve", scrollLeft: element.scrollLeft, adjustBy: -GANTT_SHIFT_DAYS * GANTT_DAY_WIDTH };
      setGanttStart((current) => addDays(current, GANTT_SHIFT_DAYS));
    }
  };

  const scrollGanttByDays = (offset) => {
    const element = ganttScrollRef.current;
    if (!element) return;
    element.scrollBy({ left: offset * GANTT_DAY_WIDTH, behavior: "smooth" });
  };

  const scrollGanttToToday = () => {
    if (scrollToDay(new Date(), "smooth")) return;
    ganttShiftLockedRef.current = true;
    ganttShiftRef.current = { type: "target", target: dateKey(new Date()) };
    setGanttStart(startOfWeek(addDays(new Date(), -GANTT_PAST_DAYS)));
  };

  return <div className="aw-page aw-schedule-page">
    <PageHeader title="时间规划" subtitle="把个人时间轴、甘特图和日历放在同一个连续视图里。" action="添加时间节点" onAction={() => openNode(companies[0]?.id, dateKey(new Date()))}><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader>
    <div className="aw-schedule-toolbar"><div className="aw-segmented"><button className={mode==="timeline"?"is-active":""} onClick={()=>setMode("timeline")}><Kanban />时间轴与甘特图</button><button className={mode==="calendar"?"is-active":""} onClick={()=>setMode("calendar")}><CalendarBlank />日历</button></div>{mode === "timeline" ? <div><IconButton label="向前滚动两周" onClick={()=>scrollGanttByDays(-14)}><CaretLeft /></IconButton><button className="aw-outline-button" onClick={scrollGanttToToday}>今天</button><IconButton label="向后滚动两周" onClick={()=>scrollGanttByDays(14)}><CaretRight /></IconButton></div> : <div><IconButton label="上个月" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><CaretLeft /></IconButton><strong>{month.getFullYear()}年 {month.getMonth()+1}月</strong><IconButton label="下个月" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><CaretRight /></IconButton></div>}</div>
    {mode === "timeline" ? <>
      <div className="aw-timeline-filters"><span>显示岗位</span>{companies.map((company) => <label key={company.id} className={visibleIds.includes(company.id)?"is-active":""}><input type="checkbox" checked={visibleIds.includes(company.id)} onChange={()=>setVisibleIds((current)=>current.includes(company.id)?current.filter((id)=>id!==company.id):[...current,company.id])}/><CompanyLogo company={company} size="sm" /><small>{company.name} · {company.role}</small><Check /></label>)}</div>
      <Panel className="aw-gantt-panel"><div className="aw-gantt-scroll" ref={ganttScrollRef} onScroll={handleGanttScroll}><div className="aw-gantt" style={{"--gantt-days":days.length}}><div className="aw-gantt-corner"><strong>岗位</strong><small>{visibleRange.start ? `${shortDate(visibleRange.start)} 至 ${shortDate(visibleRange.end)}` : "连续时间轴"}</small></div><div className="aw-gantt-dates">{days.map((day)=><div key={dateKey(day)} className={dateKey(day)===dateKey(new Date())?"is-today":""}><small>{["日","一","二","三","四","五","六"][day.getDay()]}</small><strong>{day.getDate()}</strong></div>)}</div>{timelineCompanies.map((company)=><div className="aw-gantt-row" key={company.id}><button className="aw-gantt-role" onClick={()=>selectCompany(company.id)}><CompanyLogo company={company} size="sm" /><span><strong>{company.name}</strong><small>{company.role}</small></span><StagePill stage={stageFor(company,intelligence)}/></button><div className="aw-gantt-track">{days.map((day)=>{const key=dateKey(day);const node=(company.timeline||[]).find((item)=>item.date===key);return <button key={key} className={`${key===dateKey(new Date())?"is-today":""} ${node?"has-node":""}`} onClick={()=>openNode(company.id,key,node)}>{node?<span><i/><strong>{nodeName(node)}</strong><small>{node.time}</small></span>:<Plus/>}</button>;})}</div></div>)}</div></div><footer className="aw-gantt-help"><span><i/>已设置节点</span><span>左右滑动自动加载更多日期</span><span>点击空白日期添加，点击已有节点编辑</span></footer></Panel>
    </> : <div className="aw-calendar-layout aw-calendar-merged"><Panel className="aw-calendar-main"><div className="aw-weekdays">{["周日","周一","周二","周三","周四","周五","周六"].map((day)=><span key={day}>{day}</span>)}</div><div className="aw-month-grid">{cells.map((cell)=><button key={cell.key} className={`${cell.current?"":"is-muted"} ${cell.key===dateKey(new Date())?"is-today":""}`} onClick={()=>openNode(companies[0]?.id,cell.key)}><span>{cell.day.getDate()}</span>{cell.events.slice(0,3).map(({company,node},index)=><em className={`event-${stageFor(company,intelligence)}`} key={`${company.id}-${node.id||index}`} onClick={(event)=>{event.stopPropagation();openNode(company.id,cell.key,node);}}><b>{node.time||nodeName(node)}</b><small>{company.name}</small></em>)}{cell.events.length>3&&<small>+{cell.events.length-3}</small>}</button>)}</div></Panel><aside className="aw-right-stack"><Panel title="阶段概览"><div className="aw-summary-list">{STAGES.slice(1).map((stage)=><div key={stage.id}><span><i className={`tone-${stage.color}`}/>{stage.label}</span><b>{counts[stage.id]}</b></div>)}</div></Panel><Panel title="图例"><div className="aw-legend-grid"><span><i className="tone-green"/>面试</span><span><i className="tone-orange"/>Offer</span><span><i className="tone-purple"/>测评</span><span><i className="tone-red"/>结束</span></div></Panel></aside></div>}
  </div>;
}

function DiscoveryPage({ companies, intelligence, selectedCompany, openNotifications }) {
  const opportunities = intelligence.opportunities || [];
  return <div className="aw-page aw-discovery-page">
    <PageHeader title="情报" subtitle="搜索互联网、核验来源、自动筛选新岗位，并把面试信息整理成可直接准备的问题。"><div className="aw-loop-badge"><i/><span><strong>情报 Loop</strong><small>{intelligence.automation?.status === "active" ? intelligence.automation.schedule : "未启用"}</small></span></div><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader>
    <CareerOpsView selectedRole={selectedCompany} roles={companies} surface="discovery" embedded />
    <div className="aw-discovery-summary"><Panel title="已筛选的新机会" subtitle={`${opportunities.length} 条已核验校招全职岗位`}><div className="aw-opportunity-list">{opportunities.length ? opportunities.map((item,index)=><a href={item.url} target="_blank" rel="noreferrer" key={item.id||index}><OpportunityLogo opportunity={item}/><p><strong>{item.company || "公司未注明"} · {item.title || item.role}</strong><small>{item.summary || "已通过公开来源核验"}</small><em>{item.location || "地点未注明"} · {item.source || "来源已记录"}</em></p><ArrowRight /></a>) : <EmptyState title="还没有已核验的新机会" text="运行上方岗位扫描后，只有符合校招全职范围且来源可靠的岗位会出现在这里。" />}</div></Panel><Panel title="岗位情报覆盖" subtitle={`${Object.keys(intelligence.roleBriefs || {}).length}/${companies.length} 个岗位`}><div className="aw-brief-coverage">{companies.map((company)=><div key={company.id}><CompanyLogo company={company} size="sm"/><span><strong>{company.name}</strong><small>{company.role}</small></span>{intelligence.roleBriefs?.[company.id]?<Check/>:<Clock/>}</div>)}</div></Panel></div>
  </div>;
}

function LoopRunsPage({ loopRuns, openNotifications }) {
  const runs = Array.isArray(loopRuns?.runs) ? loopRuns.runs : [];
  const [selectedId, setSelectedId] = useState(runs[0]?.id || "");
  useEffect(() => { if (!runs.some((run) => run.id === selectedId)) setSelectedId(runs[0]?.id || ""); }, [runs, selectedId]);
  const run = runs.find((item) => item.id === selectedId) || runs[0] || null;
  const counts = run?.counts || {};
  const xhsRoles = run?.xiaohongshu?.roles || [];
  const statusLabel = { success: "已完成", partial: "部分完成", blocked: "受阻", unavailable: "不可用", running: "运行中" };
  const stageStatusLabel = { covered: "已覆盖", partial: "旁证", gap: "待补", blocked: "受阻" };
  return <div className="aw-page aw-loop-page">
    <PageHeader title="Loop 日报" subtitle="查看每天搜到了什么、哪些官网状态有变化，以及每个岗位的面经核验进度。"><div className={`aw-loop-state is-${run?.status || "empty"}`}><i/><span>{run ? statusLabel[run.status] || run.status : "等待首次运行"}</span></div><IconButton label="通知" onClick={openNotifications}><BellSimple/></IconButton></PageHeader>
    {!run ? <EmptyState icon={Sparkle} title="还没有 Loop 日报" text="每日任务完成后，无论成功、受阻还是没有变化，都会在这里留下记录。"/> : <div className="aw-loop-layout">
      <aside className="aw-loop-history"><header><strong>运行记录</strong><span>{runs.length} 次</span></header>{runs.map((item)=><button key={item.id} className={item.id===run.id?"is-active":""} onClick={()=>setSelectedId(item.id)}><i className={`is-${item.status}`}/><span><strong>{new Date(item.completedAt || item.startedAt).toLocaleDateString("zh-CN",{month:"long",day:"numeric"})}</strong><small>{item.summary || statusLabel[item.status] || item.status}</small></span><em>{new Date(item.completedAt || item.startedAt).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}</em></button>)}</aside>
      <main className="aw-loop-report"><section className="aw-loop-hero"><div><small>{new Date(run.completedAt || run.startedAt).toLocaleString("zh-CN")}</small><h2>{run.title || "秋招情报每日同步"}</h2><p>{run.summary}</p></div><span className={`aw-loop-status is-${run.status}`}>{statusLabel[run.status] || run.status}</span></section>
        <div className="aw-loop-metrics">{[["已选岗位",counts.roles ?? xhsRoles.length],["正文已核验",counts.xhsPosts ?? xhsRoles.reduce((sum,item)=>sum+(item.posts?.length || item.verifiedCount || 0),0)],["新增 Pipeline",counts.pipelineAdded ?? 0],["官网变化",counts.applicationChanges ?? 0],["首页提醒",counts.homepageReminders ?? 0]].map(([label,value])=><article key={label}><strong>{value}</strong><span>{label}</span></article>)}</div>
        <Panel title="小红书岗位资料" subtitle="持续检索至新增高价值结果饱和，逐篇打开正文后才计入"><div className="aw-loop-role-list">{xhsRoles.map((item)=><article key={item.id}><header><div><strong>{item.company} · {item.role}</strong><small>{item.priority === "active" ? "已有招聘进展，优先检索" : "已选岗位"}{item.saturation?.status === "saturated" ? " · 检索已饱和" : item.saturation?.status === "expanding" ? " · 扩展检索中" : ""}</small></div><span className={`is-${item.status}`}>{item.posts?.length || item.verifiedCount || 0} 篇已核验</span></header>{item.stageCoverage?.length ? <div className="aw-loop-stage-coverage">{item.stageCoverage.map((stage)=><span key={stage.stage} className={`is-${stage.status}`} title={stage.detail}><b>{stage.stage}</b><small>{stageStatusLabel[stage.status] || stage.status}</small></span>)}</div> : null}{item.posts?.length ? <div className="aw-loop-posts">{item.posts.map((post,index)=><a href={post.url} target="_blank" rel="noreferrer" key={post.id || post.url || index}><b>{index+1}</b><span><strong>{post.title}</strong><small>{post.digest || "正文已核验"}</small></span><ArrowRight/></a>)}</div> : <p className="aw-loop-limitation">{item.limitation || "暂未找到与该岗位严格匹配且正文可读的帖子。"}</p>}</article>)}</div></Panel>
        <div className="aw-loop-detail-grid"><Panel title="官网投递进度">{run.officialProgress?.length ? <div className="aw-loop-notes">{run.officialProgress.map((item,index)=><article key={item.id||index}><strong>{item.company} · {item.role}</strong><p>{item.summary}</p><small>{item.status || "已核验"}</small></article>)}</div> : <EmptyState title="本次没有已核验的状态变化" text="登录失败、空白页或验证码会单独记为受阻，不会写成无更新。"/>}</Panel><Panel title="失败与限制">{run.failures?.length ? <div className="aw-loop-failures">{run.failures.map((item,index)=><p key={index}><Flag/>{typeof item === "string" ? item : item.summary}</p>)}</div> : <EmptyState icon={CheckCircle} title="没有未说明的失败" text="本次可访问范围均已记录。"/>}</Panel></div>
      </main>
    </div>}
  </div>;
}

function RolePicker({ companies, selectedCompany, selectCompany }) {
  const [open, setOpen] = useState(false);
  const selected = selectedCompany || companies[0] || null;
  return <div className="aw-role-picker">
    <button className="aw-current-role" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="listbox"><CompanyLogo company={selected || {name:"?"}} size="sm"/><span><small>当前岗位</small><strong>{selected ? `${selected.name} · ${selected.role}` : "请先选择岗位"}</strong></span><CaretDown/></button>
    {open && <><button className="aw-role-picker-dismiss" aria-label="关闭岗位选择" onClick={() => setOpen(false)}/><div className="aw-role-picker-menu" role="listbox" aria-label="选择分析岗位">{companies.map((company) => <button key={company.id} className={company.id === selected?.id ? "is-active" : ""} onClick={() => { selectCompany(company.id); setOpen(false); }} role="option" aria-selected={company.id === selected?.id}><CompanyLogo company={company} size="sm"/><span><strong>{company.name}</strong><small>{company.role}{company.team ? ` · ${company.team}` : ""}</small></span>{company.id === selected?.id && <Check/>}</button>)}</div></>}
  </div>;
}

function storedFileSize(value) {
  if (!Number.isFinite(value) || value <= 0) return "大小未知";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

const CAREER_FILE_ALIASES = {
  "字节跳动": ["bytedance", "doubao", "豆包"], "京东": ["jingdong", "jd"], "百度": ["baidu"], "小红书": ["xiaohongshu", "rednote"],
  "腾讯": ["tencent"], "DeepSeek": ["deepseek"], "Kimi": ["kimi", "moonshot"], "智谱": ["zhipu", "glm"], "MiniMax": ["minimax"], "阿里": ["alibaba", "qwen", "千问"],
};

function FilesPage({ companies, career, selectedCompany, selectCompany, importRoleFiles, openStoredFile, openCareerFile, openNotifications }) {
  const [query, setQuery] = useState("");
  const selected = selectedCompany || companies[0] || null;
  const storedFiles = (selected?.files || []).filter((file) => file.name.toLowerCase().includes(query.trim().toLowerCase()));
  const aliases = selected ? [selected.name, ...(CAREER_FILE_ALIASES[selected.name] || [])].map((value) => value.toLowerCase()) : [];
  const careerFiles = [...(career.reports || []), ...(career.outputs || []), ...(career.interviewFiles || [])]
    .filter((file) => aliases.some((alias) => file.name.toLowerCase().includes(alias)))
    .filter((file) => file.name.toLowerCase().includes(query.trim().toLowerCase()));
  const totalStored = companies.reduce((sum, company) => sum + (company.files || []).length, 0);
  return <div className="aw-page aw-files-page">
    <PageHeader title="文件" subtitle="把简历、评估报告、面试材料和其他附件按岗位归档。" action="添加文件" onAction={() => importRoleFiles(selected?.id)}><RolePicker companies={companies} selectedCompany={selected} selectCompany={selectCompany}/><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader>
    <div className="aw-file-toolbar"><SearchField value={query} onChange={setQuery} placeholder="搜索当前岗位的文件"/><span>{totalStored} 个已归档文件</span></div>
    <nav className="aw-file-role-nav" aria-label="按岗位查看文件">{companies.map((company) => <button key={company.id} className={company.id === selected?.id ? "is-active" : ""} onClick={() => selectCompany(company.id)}><CompanyLogo company={company} size="sm"/><span><strong>{company.name}</strong><small>{company.role}</small></span><b>{(company.files || []).length}</b></button>)}</nav>
    <section className="aw-file-shelf"><header><div><small>当前岗位</small><h2>{selected ? `${selected.name} · ${selected.role}` : "尚未选择岗位"}</h2><p>{storedFiles.length} 个已归档文件{careerFiles.length ? ` · ${careerFiles.length} 个关联 Career Ops 文件` : ""}</p></div><button className="aw-outline-button" onClick={() => importRoleFiles(selected?.id)}><Plus/>添加文件</button></header>
      {storedFiles.length
        ? <div className="aw-file-grid">{storedFiles.map((file) => <article key={file.id || file.path}><span className="aw-file-type"><File/><b>{file.extension || "FILE"}</b></span><div><h3>{file.name}</h3><p>{storedFileSize(file.size)} · {relativeTime(file.importedAt || file.updatedAt)}</p></div><footer><button onClick={() => openStoredFile(file.path)}><FileText/>打开</button><button onClick={() => openStoredFile(file.path, true)}><FolderSimple/>在 Finder 中显示</button></footer></article>)}</div>
        : <EmptyState icon={FolderSimple} title="这个岗位还没有归档文件" text="添加的文件会复制进 UP 的本地资料库，原文件移动后也不会丢失。" action="添加文件" onAction={() => importRoleFiles(selected?.id)}/>
      }
    </section>
    {careerFiles.length > 0 && <Panel title="关联的 Career Ops 文件" subtitle="根据公司名称匹配到当前岗位；点击即可打开。"><div className="aw-linked-file-list">{careerFiles.map((file) => <button key={file.path} onClick={() => openCareerFile(file.path)}><span className="aw-soft-icon"><FileText/></span><span><strong>{file.name}</strong><small>{storedFileSize(file.size)} · {relativeTime(file.updatedAt)}</small></span><ArrowRight/></button>)}</div></Panel>}
  </div>;
}

function PreparePage({ companies, selectedCompany, selectCompany, openNotifications }) {
  return <div className="aw-page aw-prepare-page"><PageHeader title="准备" subtitle="简历分析、岗位评估、材料定制、面试训练和复盘都在这里。"><RolePicker companies={companies} selectedCompany={selectedCompany} selectCompany={selectCompany}/><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader><CareerOpsView key={selectedCompany?.id || "no-role"} selectedRole={selectedCompany} roles={companies} surface="prepare" embedded /></div>;
}

function TasksPage({ companies, intelligence, navigate, openNode, openNotifications }) {
  const today = dateKey(new Date()); const week = new Date(); week.setDate(week.getDate()+7); const weekKey=dateKey(week);
  const all = companies.flatMap((company) => (company.timeline || []).map((node) => ({ company, node, done: node.date < today })));
  const groups = [{label:"今天",items:all.filter(({node})=>node.date===today),color:"blue"},{label:"本周",items:all.filter(({node})=>node.date>today&&node.date<=weekKey),color:"blue"},{label:"之后",items:all.filter(({node})=>node.date>weekKey),color:"purple"}];
  const overdue = all.filter(({node})=>node.date<today).slice(0,4); const complete=all.filter((item)=>item.done).length;
  return <div className="aw-page aw-tasks-page"><PageHeader title="任务" subtitle="管理行动，让每个求职机会继续向前。" action="添加任务" onAction={() => openNode(companies[0]?.id,today)}><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader><div className="aw-toolbar"><FilterButton>今天</FilterButton><FilterButton>即将到来</FilterButton><FilterButton>优先级</FilterButton><FilterButton>关联公司</FilterButton><button className="aw-icon-button"><DotsThree /></button></div>
    <div className="aw-task-layout"><main className="aw-task-groups">{groups.map((group) => <Panel key={group.label} className="aw-task-group" title={group.label} action={<span>{group.items.length} 项</span>}>{group.items.length ? group.items.map(({company,node}) => <button key={`${company.id}-${node.id}`} onClick={() => openNode(company.id,node.date,node)}><i className="aw-check-ring" /><span><strong>{nodeName(node)}</strong><small>{company.name} · {company.role}</small></span><em><CalendarBlank />{node.date===today ? node.time || "今天" : shortDate(node.date)}</em><StagePill stage={stageFor(company,intelligence)} /><CompanyLogo company={company} size="sm" /></button>) : <EmptyState icon={CheckCircle} title="这一组没有任务" text="新的流程节点会自动成为待办。" />}</Panel>)}</main>
      <aside className="aw-right-stack"><Panel title="进度"><div className="aw-progress-card"><Donut values={[complete,Math.max(all.length-complete,0)]} total={all.length} center={`${all.length ? Math.round(complete/all.length*100):0}%`} sub="已完成" /><div><span><i className="tone-blue" />已完成 <b>{complete}</b></span><span><i className="tone-green" />进行中 <b>{Math.max(all.length-complete,0)}</b></span><span><i className="tone-red" />已逾期 <b>{overdue.length}</b></span></div></div></Panel><Panel title="已逾期">{overdue.length ? <div className="aw-overdue-list">{overdue.map(({company,node}) => <button key={`${company.id}-${node.id}`} onClick={() => openNode(company.id,node.date,node)}><i className="aw-check-ring" /><span><strong>{nodeName(node)}</strong><small>{company.name}</small></span><em>{shortDate(node.date)}</em></button>)}</div> : <EmptyState icon={CheckCircle} title="没有逾期任务" text="当前安排都在计划内。" />}</Panel><Panel title="快捷操作"><div className="aw-quick-list"><button onClick={() => navigate("calendar")}><CalendarBlank /><span><strong>安排面试</strong><small>在日历中添加流程节点</small></span></button><button onClick={() => navigate("applications")}><EnvelopeSimple /><span><strong>跟进申请</strong><small>查看当前投递状态</small></span></button><button onClick={() => navigate("notes")}><Note /><span><strong>添加笔记</strong><small>记录岗位判断与准备</small></span></button></div></Panel></aside>
    </div>
  </div>;
}

function NotesPage({ companies, career, selectedId, selectCompany, openCareerFile, openNotifications }) {
  const notes = companies.filter((company) => company.notes || company.jd).map((company) => ({ type:"company", company, title:`${company.name} · ${company.role}`, body:company.notes || company.jd, updatedAt:itemDate(company) }));
  const reports = (career.reports || []).map((report) => ({type:"report", title:report.name.replace(/\.md$/i,""), body:"Career Ops 评估报告", updatedAt:report.updatedAt, report}));
  const items=[...notes,...reports]; const [selectedKey,setSelectedKey]=useState(""); const selected=items.find((item)=> (item.company?.id || item.report?.path) === (selectedKey || selectedId)) || items[0];
  return <div className="aw-page aw-notes-page"><PageHeader title="笔记" subtitle="整理想法、准备面试并记录求职进展。" action="新建笔记" onAction={() => {}}><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader><div className="aw-toolbar"><SearchField value="" onChange={()=>{}} placeholder="搜索笔记…" /><FilterButton>全部标签</FilterButton><FilterButton>全部类型</FilterButton><button className="aw-icon-button"><FunnelSimple /></button><span className="aw-toolbar-spacer" /><button className="aw-filter-button"><Bell />已置顶</button></div>
    <div className="aw-notes-layout"><aside className="aw-note-nav"><Panel title="集合" action={<Plus />}><button className="is-active"><SquaresFour /><span>岗位笔记</span><b>{notes.length}</b></button><button><FolderSimple /><span>评估报告</span><b>{reports.length}</b></button><button><FileText /><span>全部笔记</span><b>{items.length}</b></button></Panel><Panel title="最近更新">{items.slice(0,4).map((item)=><button key={item.company?.id||item.report?.path} onClick={()=>setSelectedKey(item.company?.id||item.report?.path)}><span>{item.title}</span><small>{relativeTime(item.updatedAt)}</small></button>)}</Panel></aside>
      <Panel title="全部笔记" className="aw-note-list" action={<span>最近更新 <CaretDown /></span>}>{items.length ? items.map((item)=><button className={(item.company?.id||item.report?.path)===(selected?.company?.id||selected?.report?.path)?"is-active":""} key={item.company?.id||item.report?.path} onClick={()=>setSelectedKey(item.company?.id||item.report?.path)}><strong>{item.title}</strong><p>{item.body.slice(0,70)}</p><footer><StagePill stage={item.type==="report"?"screening":"wishlist"}/><span>{relativeTime(item.updatedAt)}</span></footer></button>) : <EmptyState title="还没有笔记" text="为岗位补充 JD 或备注后会显示在这里。" />}</Panel>
      <Panel className="aw-note-editor">{selected ? <><header className="aw-note-title"><div><h2>{selected.title}</h2><span>{selected.type==="report"?"评估报告":"岗位笔记"}</span></div><div><small>保存于 {relativeTime(selected.updatedAt)}</small><DotsThree /></div></header><article>{selected.type==="report" ? <><h2>Career Ops 评估报告</h2><p>这是一份独立的本地报告文件。点击下方按钮可直接打开查看。</p><button className="aw-black-button" onClick={()=>openCareerFile(selected.report.path)}><FileText />打开报告文件</button></> : <><h2>岗位概览</h2><p>{selected.company?.notes || "尚未添加额外备注。"}</p><h2>岗位描述</h2><p className="aw-prewrap">{selected.company?.jd || "尚未补充 JD。"}</p><div className="aw-insight"><Sparkle /><span><strong>准备提示</strong><p>围绕岗位要求，把实习和项目证据整理成可追问的故事。</p></span></div></>}</article></> : <EmptyState title="选择一条笔记" text="内容会显示在这里。" />}</Panel>
    </div>
  </div>;
}

function ContactsPage({ openNotifications }) {
  return <div className="aw-page aw-contacts-page"><PageHeader title="联系人" subtitle="管理招聘者、面试官和内推人的联系记录。" action="添加联系人" onAction={()=>{}}><IconButton label="通知" onClick={openNotifications}><BellSimple /></IconButton></PageHeader><div className="aw-toolbar"><SearchField value="" onChange={()=>{}} placeholder="搜索联系人…"/><button className="aw-tab is-active">全部</button><button className="aw-tab">招聘者</button><button className="aw-tab">面试官</button><button className="aw-tab">内推人</button><span className="aw-toolbar-spacer"/><FilterButton>最近联系</FilterButton><button className="aw-icon-button"><FunnelSimple/></button></div><div className="aw-main-aside"><Panel className="aw-table-panel"><div className="aw-contact-empty-table"><div className="aw-tr aw-th"><span>联系人</span><span>公司</span><span>关系</span><span>最近互动</span><span>下次跟进</span></div><EmptyState icon={AddressBook} title="还没有联系人" text="UP 不会用示例人物填充你的通讯录。添加真实联系人后，这里会按设计稿呈现关系与跟进信息。" action="添加联系人" onAction={()=>{}}/></div></Panel><aside className="aw-right-stack"><Panel title="关系健康"><div className="aw-progress-card"><Donut values={[0,0,0,1]} total={1} center="0" sub="联系人"/><div><span><i className="tone-green"/>良好 <b>0</b></span><span><i className="tone-orange"/>待跟进 <b>0</b></span></div></div></Panel><Panel title="即将跟进"><EmptyState title="暂无跟进" text="添加联系人后即可设置提醒。"/></Panel><Panel title="重点联系人"><EmptyState icon={Star} title="暂无收藏" text="收藏的联系人会显示在这里。"/></Panel></aside></div></div>;
}

function AnalyticsPage({ companies, intelligence, career, openNotifications }) {
  const counts=countStages(companies,intelligence); const applied=companies.filter(c=>stageFor(c,intelligence)!=="wishlist").length; const response=counts.screening+counts.interview+counts.offer+counts.closed; const interview=counts.interview+counts.offer; const offer=counts.offer;
  const categories=companies.reduce((map,c)=>{const key=/管培/.test(c.role)?"管培项目":/AI|ai/.test(c.role)?"AI 产品":"产品岗位";map[key]=(map[key]||0)+1;return map;},{});
  const activity=Array.from({length:12},(_,index)=>companies.filter(c=>(c.timeline||[]).some(n=>new Date(n.date).getMonth()===index)).length);
  return <div className="aw-page aw-analytics-page"><PageHeader title="分析" subtitle="了解求职进展，发现最值得投入的方向。"><button className="aw-filter-button"><CalendarBlank/>全部时间<CaretDown/></button><button className="aw-filter-button"><ArrowDown/>导出</button><IconButton label="通知" onClick={openNotifications}><BellSimple/></IconButton></PageHeader>
    <div className="aw-metric-grid">{[[PaperPlaneTilt,"已投递",applied,"份申请","blue"],[EnvelopeSimple,"推进率",applied?Math.round(response/applied*100):0,"%","green"],[Users,"面试转化",applied?Math.round(interview/applied*100):0,"%","purple"],[Target,"Offer 率",applied?Math.round(offer/applied*100):0,"%","orange"]].map(([Icon,label,value,unit,tone])=><Panel key={label} title={label}><div className="aw-metric"><i className={tone}><Icon/></i><strong>{value}<small>{unit}</small></strong><span><TrendUp/> 基于当前真实记录</span></div></Panel>)}</div>
    <div className="aw-analytics-middle"><Panel title="申请活动趋势" className="aw-line-panel"><div className="aw-chart-legend"><span><i className="tone-blue"/>流程节点</span><span><i className="tone-green"/>有效推进</span></div><div className="aw-line-chart">{activity.map((value,index)=><div key={index}><i style={{height:`${Math.max(8,value*28)}px`}}/><small>{index+1}月</small></div>)}</div></Panel><Panel title="阶段转化漏斗"><div className="aw-funnel-analytics"><Funnel counts={counts}/><div>{STAGES.slice(1).map(stage=><span key={stage.id}><i className={`tone-${stage.color}`}/>{stage.label}<b>{counts[stage.id]}</b></span>)}</div></div></Panel></div>
    <div className="aw-analytics-bottom"><Panel title="重点岗位类型"><div className="aw-bar-list">{Object.entries(categories).sort((a,b)=>b[1]-a[1]).map(([label,value],index)=><div key={label}><span>{label}</span><i><b style={{width:`${100-index*22}%`}}/></i><strong>{value}</strong></div>)}</div></Panel><Panel title="每周活动"><div className="aw-heatmap">{Array.from({length:35},(_,index)=><i key={index} style={{opacity:.16+((index*7+companies.length)%8)/10}}/> )}</div><footer className="aw-heat-legend">较少 <span><i/><i/><i/><i/></span> 较多</footer></Panel><Panel title="洞察"><div className="aw-insight-stack"><div><span className="aw-soft-icon tone-green"><FileText/></span><p><strong>简历分析已连接</strong><small>{career.resume?.latestAnalysis ? `最近得分 ${career.resume.latestAnalysis.output?.match(/\d+\/100/)?.[0] || "已完成"}` : "等待首次分析"}</small></p></div><div><span className="aw-soft-icon tone-orange"><TrendUp/></span><p><strong>情报 Loop</strong><small>{intelligence.automation?.status==="active" ? `${intelligence.automation.schedule} 自动更新` : "尚未启用"}</small></p></div></div></Panel></div>
  </div>;
}

function TemplatesPage({ career, selectedCompany, openCareer, openCareerFile, openNotifications }) {
  const assets=[...(career.reports||[]).map(file=>({...file,type:"report",label:"评估报告"})),...(career.outputs||[]).map(file=>({...file,type:"output",label:"生成材料"})),...(career.interviewFiles||[]).map(file=>({...file,type:"interview",label:"面试准备"}))];
  return <div className="aw-page aw-templates-page"><PageHeader title="模板与材料" subtitle="创建、管理并复用你的求职材料。" action="新建材料" onAction={openCareer}><IconButton label="通知" onClick={openNotifications}><BellSimple/></IconButton></PageHeader><div className="aw-toolbar"><SearchField value="" onChange={()=>{}} placeholder="搜索模板与材料…"/><button className="aw-tab is-active">全部</button><button className="aw-tab">简历</button><button className="aw-tab">评估报告</button><button className="aw-tab">面试准备</button><span className="aw-toolbar-spacer"/><button className="aw-filter-button"><FunnelSimple/>筛选</button></div>
    <Panel title="全部材料" action={<button className="aw-view-toggle"><SquaresFour/><Rows/></button>}><div className="aw-template-grid"><button className="aw-template-card is-resume" onClick={openCareer}><header><span className="aw-soft-icon tone-blue"><FileText/></span><DotsThree/></header><div className="aw-document-preview"><strong>{career.resume?.source?.name || career.resume?.latestAnalysis?.sourceName || "导入 PDF 简历"}</strong><i/><i/><i/><i/><i/></div><h3>PDF 简历分析</h3><div><span className="aw-pill tone-blue">简历</span><span className="aw-pill">Career Ops</span></div><p>{career.resume?.latestAnalysis ? "已有评估结果，点击查看或重新分析" : "直接读取 PDF，逐页完成评估"}</p><footer><span><Target/>开始分析</span><ArrowRight/></footer></button>{assets.slice(0,7).map((file,index)=><button className="aw-template-card" key={file.path} onClick={()=>openCareerFile(file.path)}><header><span className={`aw-soft-icon tone-${["green","orange","purple","blue"][index%4]}`}><File/></span><DotsThree/></header><div className="aw-document-preview"><strong>{file.label}</strong><i/><i/><i/><i/><i/></div><h3>{file.name.replace(/\.(md|html|pdf|docx)$/i,"")}</h3><div><span className="aw-pill tone-green">{file.label}</span></div><p>更新于 {relativeTime(file.updatedAt)}</p><footer><span><FileText/>打开文件</span><ArrowRight/></footer></button>)}</div></Panel>
    <Panel title="推荐操作"><div className="aw-recommended-grid">{[[FileText,"分析当前 PDF 简历","直接读取 PDF 并逐页评估"],[Target,"评估目标岗位",selectedCompany?`${selectedCompany.name} · ${selectedCompany.role}`:"先选择一个岗位"],[Users,"生成面试准备","基于岗位与真实经历整理"],[EnvelopeSimple,"生成沟通草稿","只生成草稿，不自动发送"]].map(([Icon,title,text])=><button key={title} onClick={openCareer}><span className="aw-soft-icon"><Icon/></span><p><strong>{title}</strong><small>{text}</small></p><Copy/></button>)}</div></Panel>
  </div>;
}

function SettingsPage({ intelligence, career, profile = EMPTY_PROFILE, openAdd, openNotifications }) {
  const [settings,setSettings]=useState(()=>{try{return JSON.parse(localStorage.getItem("up-settings")||"{}");}catch{return {};}}); const toggle=(key)=>{const next={...settings,[key]:!settings[key]};setSettings(next);localStorage.setItem("up-settings",JSON.stringify(next));};
  const Toggle=({id,defaultOn=false})=><button className={`aw-switch ${(settings[id]??defaultOn)?"is-on":""}`} onClick={()=>toggle(id)}><i/></button>;
  return <div className="aw-page aw-settings-page"><PageHeader title="设置" subtitle="管理本地偏好并自定义使用体验。" action="添加申请" onAction={openAdd}><IconButton label="通知" onClick={openNotifications}><BellSimple/></IconButton></PageHeader><div className="aw-settings-layout"><aside className="aw-settings-nav">{[[User,"个人资料","本地候选人信息"],[FunnelSimple,"偏好","外观与行为"],[Bell,"通知","应用内提醒"],[LinkSimple,"集成","连接工具"],[IdentificationCard,"数据与隐私","本地数据控制"]].map(([Icon,title,text],index)=><button className={index===0?"is-active":""} key={title}><Icon/><span><strong>{title}</strong><small>{text}</small></span></button>)}</aside>
    <main className="aw-settings-main"><Panel title="个人资料" subtitle="UP 只显示你明确提供的本地信息。"><div className="aw-profile-form"><div className="aw-profile-avatar">{profileInitial(profile)}</div><label>姓名<input value={profile.name} placeholder="请在个人资料中填写" readOnly/></label><label>目标方向<input value={profile.title} placeholder="例如：AI 产品经理" readOnly/></label><label>工作地点<input value={profile.location} placeholder="可选" readOnly/></label></div></Panel><Panel title="偏好"><div className="aw-setting-rows"><label><span><strong>默认视图</strong><small>打开 UP 时首先看到的页面</small></span><button>首页 <CaretDown/></button></label><label><span><strong>日期格式</strong><small>时间轴和日历中的显示方式</small></span><button>系统默认 <CaretDown/></button></label><label><span><strong>语言</strong><small>界面显示语言</small></span><button>简体中文 <CaretDown/></button></label></div></Panel><Panel title="快捷设置"><div className="aw-setting-rows"><label><span><strong>自动读取岗位状态</strong><small>仅同步已配置且可验证的官方入口</small></span><Toggle id="autoStatus" defaultOn/></label><label><span><strong>自动同步日历节点</strong><small>把时间轴安排显示在日历与任务页</small></span><Toggle id="autoCalendar" defaultOn/></label><label><span><strong>深色模式</strong><small>当前 1:1 设计稿仅提供浅色版本</small></span><Toggle id="darkMode"/></label></div></Panel></main>
    <aside className="aw-settings-side"><Panel title="通知"><div className="aw-setting-rows"><label><span><strong>申请状态更新</strong><small>官方进度发生变化时提醒</small></span><Toggle id="statusNotice" defaultOn/></label><label><span><strong>面试提醒</strong><small>在流程节点前提醒</small></span><Toggle id="interviewNotice" defaultOn/></label><label><span><strong>每周摘要</strong><small>汇总最近求职活动</small></span><Toggle id="weeklySummary" defaultOn/></label></div></Panel><Panel title="本地连接"><div className="aw-integration-list"><div><span className="aw-soft-icon tone-green"><Check/></span><p><strong>Career Ops</strong><small>{career.connected?"已连接本地工作区":"未连接"}</small></p><em className={career.connected?"green":""}>{career.connected?"已连接":"检查"}</em></div><div><span className="aw-soft-icon tone-blue"><Sparkle/></span><p><strong>情报 Loop</strong><small>{intelligence.automation?.schedule}</small></p><em className={intelligence.automation?.status==="active"?"green":""}>{intelligence.automation?.status==="active"?"运行中":"未启用"}</em></div></div></Panel><Panel title="数据与隐私"><div className="aw-setting-links"><button>导出我的数据 <CaretRight/></button><button>打开本地数据目录 <CaretRight/></button><button>隐私说明 <CaretRight/></button></div></Panel></aside></div></div>;
}

function NotificationDrawer({ intelligence, onClose }) {
  const items=[...(intelligence.applicationSync?.changes||[]),...(intelligence.updates||[])].sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).slice(0,12);
  return <><button className="aw-backdrop" onClick={onClose} aria-label="关闭通知"/><aside className="aw-notification-drawer"><header><div><span>更新中心</span><h2>通知</h2></div><IconButton label="关闭" onClick={onClose}><X/></IconButton></header><div className="aw-drawer-list">{items.length?items.map((item,index)=><article key={`${item.id||"notification"}-${index}`}><span className="aw-soft-icon"><Bell/></span><p><strong>{item.title}</strong><small>{item.summary}</small><em>{relativeTime(item.createdAt)}</em></p></article>):<EmptyState title="暂无通知" text="情报与申请状态更新会显示在这里。"/>}</div><footer><span><Sparkle/>情报 Loop</span><b>{intelligence.automation?.status==="active"?intelligence.automation.schedule:"未启用"}</b></footer></aside></>;
}

function Modal({ title, onClose, children, footer }) { return <><button className="aw-backdrop" onClick={onClose} aria-label="关闭"/><section className="aw-modal" role="dialog" aria-modal="true"><header><h2>{title}</h2><IconButton label="关闭" onClick={onClose}><X/></IconButton></header><div>{children}</div>{footer&&<footer>{footer}</footer>}</section></>; }

export function AppleWorkspace() {
  const [companies,setCompanies]=useState([]); const [intelligence,setIntelligence]=useState(EMPTY_INTELLIGENCE); const [loopRuns,setLoopRuns]=useState(EMPTY_LOOP_RUNS); const [career,setCareer]=useState(EMPTY_CAREER); const [profile,setProfile]=useState(EMPTY_PROFILE); const [view,setView]=useState("home"); const [query,setQuery]=useState(""); const [selectedId,setSelectedId]=useState(""); const [hydrated,setHydrated]=useState(false); const [modal,setModal]=useState(null); const [nodeDraft,setNodeDraft]=useState(null); const [logoDraft,setLogoDraft]=useState(null); const [notice,setNotice]=useState(""); const [notifications,setNotifications]=useState(false); const searchRef=useRef(null); const persistTimer=useRef(null);
  useEffect(()=>{let active=true;Promise.allSettled([fetch("/api/workspace",{cache:"no-store"}),fetch("/api/intelligence",{cache:"no-store"}),fetch("/api/loop-runs",{cache:"no-store"}),fetch("/api/career-ops/snapshot",{cache:"no-store"})]).then(async(results)=>{if(!active)return;const [workspaceResult,intelligenceResult,loopRunsResult,careerResult]=results;if(workspaceResult.status==="fulfilled"&&workspaceResult.value.ok){const workspace=await workspaceResult.value.json();setCompanies(Array.isArray(workspace.companies)?workspace.companies:[]);setSelectedId(workspace.companies?.[0]?.id||"");setProfile(workspace.profile&&typeof workspace.profile==="object"?{...EMPTY_PROFILE,...workspace.profile}:EMPTY_PROFILE);}if(intelligenceResult.status==="fulfilled"&&intelligenceResult.value.ok){const intel=await intelligenceResult.value.json();setIntelligence({...EMPTY_INTELLIGENCE,...intel,applicationSync:{...EMPTY_INTELLIGENCE.applicationSync,...intel.applicationSync}});}if(loopRunsResult.status==="fulfilled"&&loopRunsResult.value.ok){const value=await loopRunsResult.value.json();setLoopRuns({version:1,runs:Array.isArray(value.runs)?value.runs:[]});}if(careerResult.status==="fulfilled"&&careerResult.value.ok){const snapshot=await careerResult.value.json();setCareer({...EMPTY_CAREER,...snapshot});}}).catch(()=>{}).finally(()=>active&&setHydrated(true));return()=>{active=false;};},[]);
  useEffect(()=>{const handler=(event)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();searchRef.current?.focus();}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[]);
  useEffect(()=>{if(!hydrated)return;clearTimeout(persistTimer.current);persistTimer.current=setTimeout(()=>{const payload={version:1,updatedAt:new Date().toISOString(),profile,companies};localStorage.setItem("up-workspace",JSON.stringify(payload));fetch("/api/workspace",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).then(r=>r.ok?r.json():Promise.reject()).catch(()=>{});},280);return()=>clearTimeout(persistTimer.current);},[companies,profile,hydrated]);
  const filtered=useMemo(()=>{const text=query.trim().toLowerCase();return text?companies.filter(c=>`${c.name}${c.team}${c.role}${c.location}${c.jd}`.toLowerCase().includes(text)):companies;},[companies,query]); const selected=companies.find(c=>c.id===selectedId)||companies[0]||null;
  const flash=(message)=>{setNotice(message);setTimeout(()=>setNotice(""),2800);}; const openAdd=()=>{setLogoDraft(null);setModal("add");}; const closeAdd=()=>{setLogoDraft(null);setModal(null);}; const selectCompany=(id)=>setSelectedId(id); const openRoleEditor=(company)=>{setSelectedId(company.id);setModal("role");};
  const selectLogo=async(event)=>{const file=event.target.files?.[0];if(!file)return;try{setLogoDraft(await readLogoFile(file));}catch(error){event.target.value="";setLogoDraft(null);flash(error.message||"无法读取 Logo");}};
  const openNode=(companyId,date,node=null)=>{if(!companyId){flash("请先添加一个岗位");return;}setNodeDraft({companyId,date,id:node?.id||"",type:node?.type||"自定义",title:node?.title||"",time:node?.time||"",note:node?.note||""});setModal("node");};
  const saveProfile=(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);setProfile({name:String(data.get("name")||"").trim(),title:String(data.get("title")||"").trim(),location:String(data.get("location")||"").trim()});setModal(null);flash("个人资料已保存");};
  const saveCompany=(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);const name=String(data.get("name")||"").trim();const role=String(data.get("role")||"").trim();if(!name||!role)return;const logo=logoDraft?.dataUrl||matchLogo(name);const company={id:`position-${Date.now()}`,name,team:String(data.get("team")||name).trim(),role,location:String(data.get("location")||"").trim(),status:"待开始",mark:name.slice(0,1),logoUrl:logo,jd:String(data.get("jd")||"").trim(),notes:"",timeline:[],files:[]};setCompanies(current=>[...current,company]);setSelectedId(company.id);setLogoDraft(null);setModal(null);flash("岗位已添加");};
  const saveRole=(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);setCompanies(current=>current.map(company=>company.id===selectedId?{...company,name:String(data.get("name")||company.name).trim(),role:String(data.get("role")||company.role).trim(),team:String(data.get("team")||"").trim(),location:String(data.get("location")||"").trim(),jd:String(data.get("jd")||"").trim(),notes:String(data.get("notes")||"").trim()}:company));setModal(null);flash("岗位资料已保存");};
  const deleteRole=()=>{if(!selected)return;const removedIdentity=companyIdentity(selected.name);const remaining=companies.filter(company=>company.id!==selected.id);const next=remaining.find(company=>companyIdentity(company.name)===removedIdentity)||remaining[0]||null;setCompanies(remaining);setSelectedId(next?.id||"");setModal(null);flash("岗位已删除");};
  const saveNode=(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);const node={id:nodeDraft.id||`node-${Date.now()}`,date:nodeDraft.date,type:String(data.get("type")||"自定义"),title:String(data.get("title")||"").trim(),time:String(data.get("time")||"").trim(),note:String(data.get("note")||"").trim()};setCompanies(current=>current.map(company=>company.id===nodeDraft.companyId?{...company,timeline:[...(company.timeline||[]).filter(item=>item.id!==node.id),node]}:company));setModal(null);flash("日程节点已保存");};
  const deleteNode=()=>{setCompanies(current=>current.map(company=>company.id===nodeDraft.companyId?{...company,timeline:(company.timeline||[]).filter(item=>item.id!==nodeDraft.id)}:company));setModal(null);flash("节点已删除");};
  const openCareerFile=async(path)=>{try{const response=await fetch("/api/career-ops/file/open",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({href:path})});if(!response.ok){const value=await response.json();throw new Error(value.error);}flash("已打开本地文件");}catch(error){flash(error.message||"无法打开文件");}};
  const importRoleFiles=async(companyId)=>{if(!companyId){flash("请先选择岗位");return;}try{const response=await fetch("/api/files/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({roleId:companyId})});const value=await response.json();if(!response.ok)throw new Error(value.error);if(value.cancelled)return;const files=Array.isArray(value.files)?value.files:[];setCompanies(current=>current.map(company=>company.id===companyId?{...company,files:[...(company.files||[]),...files]}:company));flash(`已归档 ${files.length} 个文件`);}catch(error){flash(error.message||"无法添加文件");}};
  const openStoredFile=async(path,reveal=false)=>{try{const response=await fetch("/api/files/open",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path,reveal})});const value=await response.json();if(!response.ok)throw new Error(value.error);flash(reveal?"已在 Finder 中显示":"已打开文件");}catch(error){flash(error.message||"无法打开文件");}};
  const pageProps={companies:filtered,intelligence,loopRuns,career,profile,selectedId,selectedCompany:selected,selectCompany,openAdd,openRoleEditor,openNotifications:()=>setNotifications(true),navigate:(next,id)=>{if(id)setSelectedId(id);setView(next);},openNode,openCareerFile,importRoleFiles,openStoredFile,openCareer:()=>setView("prepare")};
  return <div className="aw-app">
    <aside className="aw-sidebar">
      <button className="aw-brand" onClick={()=>setView("home")}><img src="/brand-up.png" alt="UP"/></button>
      <SearchField value={query} onChange={setQuery} placeholder="搜索公司、岗位或 JD" inputRef={searchRef}/>
      <nav>{NAV.map(([id,label,Icon])=><button key={id} className={view===id?"is-active":""} onClick={()=>setView(id)}><Icon/><span>{label}</span></button>)}</nav>
      <div className="aw-sidebar-bottom">
        <button className={view==="loop"?"is-active":""} onClick={()=>setView("loop")}><Sparkle/><span>情报 Loop</span><small>{loopRuns.runs?.[0] ? "查看日报" : intelligence.automation?.status === "active" ? "运行中" : "未启用"}</small></button>
        <button className="aw-profile" onClick={()=>setModal("profile")} aria-label="编辑个人资料"><span>{profileInitial(profile)}</span><p><strong>{profile.name||"设置个人资料"}</strong><small>{profile.title||"填写你的职位方向"}</small></p><CaretRight/></button>
      </div>
    </aside>
    <main className="aw-content">
      {view==="home"&&<HomePage {...pageProps}/>}
      {view==="roles"&&<RolesPage {...pageProps}/>}
      {view==="discovery"&&<DiscoveryPage {...pageProps}/>}
      {view==="loop"&&<LoopRunsPage {...pageProps}/>}
      {view==="schedule"&&<SchedulePage {...pageProps}/>}
      {view==="files"&&<FilesPage {...pageProps}/>}
      {view==="prepare"&&<PreparePage {...pageProps}/>}
    </main>
    {notice&&<div className="aw-toast"><Check/>{notice}</div>}
    {notifications&&<NotificationDrawer intelligence={intelligence} onClose={()=>setNotifications(false)}/>}
    {modal==="add"&&<Modal title="添加岗位" onClose={closeAdd}><form className="aw-form" onSubmit={saveCompany}><label>公司名称<input name="name" autoFocus required placeholder="例如：腾讯"/></label><label className="aw-logo-upload"><input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={selectLogo}/><span className="aw-logo-upload__preview">{logoDraft?.dataUrl?<img src={logoDraft.dataUrl} alt="待上传的公司 Logo"/>:<ImageSquare/>}</span><span className="aw-logo-upload__copy"><strong>公司 Logo</strong><small>{logoDraft?.name||"可选，支持 PNG、JPG、WebP，最大 2MB"}</small></span><span className="aw-logo-upload__button"><UploadSimple/>{logoDraft?"更换图片":"上传 Logo"}</span></label><label>岗位名称<input name="role" required placeholder="例如：AI 产品经理"/></label><div><label>团队<input name="team" placeholder="可选"/></label><label>地点<input name="location" placeholder="可选"/></label></div><label>岗位描述<textarea name="jd" rows="7" placeholder="粘贴真实 JD，可稍后补充"/></label><footer><button type="button" className="aw-outline-button" onClick={closeAdd}>取消</button><button className="aw-black-button" type="submit"><Plus/>添加岗位</button></footer></form></Modal>}
    {modal==="profile"&&<Modal title="个人资料" onClose={()=>setModal(null)}><form className="aw-form" onSubmit={saveProfile}><label>姓名<input name="name" autoFocus defaultValue={profile.name} placeholder="例如：张三"/></label><label>目标方向<input name="title" defaultValue={profile.title} placeholder="例如：AI 产品经理"/></label><label>工作地点<input name="location" defaultValue={profile.location} placeholder="可选"/></label><footer><button type="button" className="aw-outline-button" onClick={()=>setModal(null)}>取消</button><button className="aw-black-button" type="submit"><Check/>保存个人资料</button></footer></form></Modal>}
    {modal==="role"&&selected&&<Modal title={`${selected.name} · ${selected.role}`} onClose={()=>setModal(null)}><form className="aw-form" onSubmit={saveRole}><div><label>公司名称<input name="name" defaultValue={selected.name} required/></label><label>岗位名称<input name="role" defaultValue={selected.role} required/></label></div><div><label>团队<input name="team" defaultValue={selected.team}/></label><label>地点<input name="location" defaultValue={selected.location}/></label></div><label>详细 JD<textarea name="jd" rows="11" defaultValue={selected.jd} placeholder="粘贴真实职位描述"/></label><label>岗位笔记<textarea name="notes" rows="5" defaultValue={selected.notes} placeholder="记录个人判断、准备重点或联系人"/></label><footer><button type="button" className="aw-danger-button" onClick={()=>setModal("delete-role")}><Trash/>删除岗位</button><div className="aw-form-actions"><button type="button" className="aw-outline-button" onClick={()=>setModal(null)}>取消</button><button className="aw-black-button" type="submit"><Check/>保存资料</button></div></footer></form></Modal>}
    {modal==="delete-role"&&selected&&<Modal title="删除岗位" onClose={()=>setModal(null)}><div className="aw-delete-confirm"><span><Trash/></span><div><h3>确认删除“{selected.role}”？</h3><p>{companyDisplayName(selected.name)} 下的其他岗位会继续保留。当前岗位的 JD、笔记和时间轴会从工作台移除，本地归档文件不会从磁盘删除。</p></div></div><div className="aw-delete-actions"><button type="button" className="aw-outline-button" onClick={()=>setModal("role")}>返回</button><button type="button" className="aw-danger-button is-solid" onClick={deleteRole}><Trash/>确认删除岗位</button></div></Modal>}
    {modal==="node"&&<Modal title={nodeDraft?.id?"编辑日程":"新建日程"} onClose={()=>setModal(null)}><form className="aw-form" onSubmit={saveNode}><label>关联岗位<select value={nodeDraft.companyId} onChange={e=>setNodeDraft({...nodeDraft,companyId:e.target.value})}>{companies.map(company=><option value={company.id} key={company.id}>{company.name} · {company.role}</option>)}</select></label><div><label>日期<input type="date" value={nodeDraft.date} onChange={e=>setNodeDraft({...nodeDraft,date:e.target.value})}/></label><label>时间<input type="time" name="time" defaultValue={nodeDraft.time}/></label></div><label>类型<select name="type" defaultValue={nodeDraft.type}>{["投递","简历筛选","笔试","测评","一面","二面","终面","HR 面","Offer","截止日","自定义"].map(type=><option key={type}>{type}</option>)}</select></label><label>标题<input name="title" defaultValue={nodeDraft.title} placeholder="可选"/></label><label>备注<textarea name="note" defaultValue={nodeDraft.note} rows="3"/></label><footer>{nodeDraft.id?<button className="aw-danger-button" type="button" onClick={deleteNode}><Trash/>删除</button>:<span/>}<button className="aw-black-button" type="submit"><Check/>保存</button></footer></form></Modal>}
  </div>;
}
