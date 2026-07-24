import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  ClipboardText,
  ClockCounterClockwise,
  House,
  MagnifyingGlass,
  NewspaperClipping,
  Plus,
  Sparkle,
  Trash,
  UserCircle,
  X,
} from "@phosphor-icons/react";

const COMPANY_PRESETS = [
  { id: "bytedance", name: "字节跳动", aliases: ["字节跳动", "字节", "bytedance"], logoUrl: "/logos/preset-bytedance.svg", mark: "字" },
  { id: "alibaba", name: "阿里", aliases: ["阿里", "阿里巴巴", "alibaba", "淘天"], logoUrl: "/logos/preset-alibaba.svg", mark: "阿" },
  { id: "tencent", name: "腾讯", aliases: ["腾讯", "tencent"], logoUrl: "/logos/preset-tencent.png", mark: "腾" },
  { id: "xiaohongshu", name: "小红书", aliases: ["小红书", "xiaohongshu", "rednote"], logoUrl: "/logos/preset-xiaohongshu.svg", mark: "红" },
  { id: "pinduoduo", name: "拼多多", aliases: ["拼多多", "pinduoduo", "pdd"], logoUrl: "/logos/preset-pinduoduo.jpg", logoFit: "cover", mark: "拼" },
  { id: "jd", name: "京东", aliases: ["京东", "jingdong", "jd", "jd.com"], logoUrl: "/logos/preset-jd.png", logoFit: "cover", mark: "京" },
  { id: "baidu", name: "百度", aliases: ["百度", "baidu"], logoUrl: "/logos/preset-baidu.svg", mark: "百" },
  { id: "deepseek", name: "DeepSeek", aliases: ["deepseek", "深度求索"], logoUrl: "/logos/preset-deepseek.svg", mark: "D" },
  { id: "kimi", name: "Kimi", aliases: ["kimi", "月之暗面", "moonshot", "moonshotai"], logoUrl: "/logos/preset-kimi.svg", mark: "K" },
  { id: "minimax", name: "MiniMax", aliases: ["minimax", "稀宇", "稀宇科技"], logoUrl: "/logos/preset-minimax.svg", mark: "M" },
  { id: "zhipu", name: "智谱", aliases: ["智谱", "智谱ai", "智谱华章", "zhipu", "z.ai", "glm"], logoUrl: "/logos/preset-zhipu.jpg", logoFit: "cover", mark: "智" },
  { id: "kuaishou", name: "快手", aliases: ["快手", "kuaishou"], logoUrl: "/logos/preset-kuaishou.svg", mark: "快" },
];

const NODE_TYPES = ["投递", "笔试", "一面", "二面", "三面", "HR 面", "Offer", "截止日", "自定义"];
const NAV_ITEMS = [
  ["overview", "总览", House],
  ["timeline", "时间轴", ClockCounterClockwise],
  ["intelligence", "情报台", NewspaperClipping],
];

const INITIAL_COMPANIES = [];

const EMPTY_INTELLIGENCE = {
  generatedAt: null,
  opportunities: [],
  roleBriefs: {},
  automation: {
    name: "秋招情报 Loop",
    schedule: "每天 12:00",
    status: "not_configured",
  },
};

function normalizeCompanyName(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function matchCompanyPreset(value) {
  const normalized = normalizeCompanyName(value);
  if (!normalized) return null;
  return COMPANY_PRESETS.find((preset) => preset.aliases.some((alias) => {
    const normalizedAlias = normalizeCompanyName(alias);
    return normalized === normalizedAlias || normalized.includes(normalizedAlias);
  })) || null;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function formatMonthDay(value) {
  const date = typeof value === "string" ? parseDateKey(value) : value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatFullDate(value) {
  const date = typeof value === "string" ? parseDateKey(value) : value;
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function latestNode(company) {
  return [...(company.timeline || [])].sort((a, b) => a.date.localeCompare(b.date)).at(-1) || null;
}

function deriveStatus(company) {
  const node = latestNode(company);
  if (!node) return "待开始";
  if (node.type === "Offer") return "已完成";
  return node.type;
}

function CompanyMark({ company, compact = false }) {
  return (
    <span
      className={`company-mark company-mark--${company.tone || "preset"} ${company.logoFit === "cover" ? "company-mark--cover" : ""} ${compact ? "company-mark--compact" : ""}`}
      aria-hidden="true"
    >
      {company.logoUrl ? (
        <>
          <img
            src={company.logoUrl}
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.nextElementSibling.style.display = "inline";
            }}
          />
          <span className="company-mark__fallback">{company.mark}</span>
        </>
      ) : company.mark}
    </span>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const handler = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal ${wide ? "modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭"><X /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function CompanyRail({ companies, selectedId, onSelect, onAdd }) {
  const railRef = useRef(null);
  return (
    <section className="company-rail-wrap" aria-label="岗位导航">
      <button
        className="rail-arrow"
        onClick={() => railRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
        aria-label="向前查看"
      >
        <CaretLeft />
      </button>
      <div className="company-rail" ref={railRef} role="tablist">
        {companies.map((company) => (
          <button
            className={`company-tab ${company.id === selectedId ? "is-selected" : ""}`}
            key={company.id}
            onClick={() => onSelect(company.id)}
            role="tab"
            aria-selected={company.id === selectedId}
          >
            <CompanyMark company={company} />
            <span>{company.team || company.name}</span>
          </button>
        ))}
        <button className="company-tab company-tab--add" onClick={onAdd}>
          <span className="company-mark"><Plus /></span>
          <span>添加岗位</span>
        </button>
      </div>
      <button
        className="rail-arrow"
        onClick={() => railRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
        aria-label="向后查看"
      >
        <CaretRight />
      </button>
    </section>
  );
}

function MiniTimeline({ company, onEdit }) {
  const nodes = [...(company.timeline || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!nodes.length) {
    return (
      <button className="timeline-empty" onClick={onEdit}>
        <CalendarBlank />
        <span><strong>还没有时间节点</strong><small>点击日期，设置投递、面试或结果</small></span>
        <ArrowRight />
      </button>
    );
  }

  return (
    <div className="mini-timeline">
      <span className="mini-timeline__line" />
      {nodes.map((node) => (
        <button key={node.id} onClick={onEdit}>
          <span className="mini-timeline__dot" />
          <strong>{node.type}</strong>
          <small>{formatMonthDay(node.date)}{node.time ? ` ${node.time}` : ""}</small>
        </button>
      ))}
      <button className="mini-timeline__add" onClick={onEdit}><Plus /> 添加节点</button>
    </div>
  );
}

function Overview({
  companies,
  selected,
  selectedId,
  intelligence,
  onSelect,
  onAdd,
  onOpenTimeline,
  onEditJd,
  onOpenIntel,
}) {
  if (!selected) {
    return (
      <main className="page overview-page">
        <div className="page-heading">
          <div>
            <h1>秋招总览</h1>
            <p>从第一个岗位开始，建立你的秋招时间轴。</p>
          </div>
          <span className="summary-count">0<small>个岗位</small></span>
        </div>
        <CompanyRail companies={[]} selectedId="" onSelect={onSelect} onAdd={onAdd} />
        <section className="first-run">
          <span className="first-run__icon"><Plus /></span>
          <h2>添加第一个岗位</h2>
          <p>选择公司、填写岗位名称，然后在时间轴上直接设置投递和面试节点。</p>
          <button className="primary-button" onClick={onAdd}><Plus /> 添加岗位</button>
        </section>
      </main>
    );
  }

  const companyBrief = intelligence.roleBriefs?.[selected.id];
  const currentNode = latestNode(selected);
  const nextNode = [...(selected.timeline || [])]
    .filter((node) => parseDateKey(node.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <main className="page overview-page">
      <div className="page-heading">
        <div>
          <h1>秋招总览</h1>
          <p>选择一家公司，直接管理岗位、时间和准备信息。</p>
        </div>
        <span className="summary-count">{companies.length}<small>个岗位</small></span>
      </div>

      <CompanyRail companies={companies} selectedId={selectedId} onSelect={onSelect} onAdd={onAdd} />

      <section className="company-focus">
        <header className="company-focus__header">
          <div className="company-focus__identity">
            <CompanyMark company={selected} />
            <div>
              <div className="company-title-line">
                <h2>{selected.name}</h2>
                <span className="status-label">{deriveStatus(selected)}</span>
              </div>
              <p>
                {selected.team}
                <span />
                {selected.role}
                {selected.location && <><span />{selected.location}</>}
              </p>
            </div>
          </div>
          <div className="company-focus__actions">
            <button className="secondary-button" onClick={onEditJd}><ClipboardText /> {selected.jd ? "编辑 JD" : "粘贴 JD"}</button>
            <button className="primary-button" onClick={onOpenTimeline}><Plus /> 添加节点</button>
          </div>
        </header>

        <div className="company-status-strip">
          <div>
            <span>当前进度</span>
            <strong>{currentNode ? currentNode.type : "待开始"}</strong>
          </div>
          <div>
            <span>下一节点</span>
            <strong>{nextNode ? `${formatMonthDay(nextNode.date)} ${nextNode.type}` : "未设置"}</strong>
          </div>
          <div>
            <span>岗位信息</span>
            <strong>{selected.jd ? "JD 已保存" : "等待补充 JD"}</strong>
          </div>
          <div>
            <span>情报更新</span>
            <strong>{companyBrief?.updatedAt ? formatMonthDay(companyBrief.updatedAt.slice(0, 10)) : "等待首次运行"}</strong>
          </div>
        </div>

        <section className="focus-section">
          <div className="section-heading">
            <div>
              <h3>投递时间轴</h3>
              <p>所有进度都从日期节点自动生成。</p>
            </div>
            <button className="text-button" onClick={onOpenTimeline}>打开时间轴 <ArrowRight /></button>
          </div>
          <MiniTimeline company={selected} onEdit={onOpenTimeline} />
        </section>

        <div className="focus-columns">
          <section className="focus-section focus-section--info">
            <div className="section-heading">
              <div>
                <h3>岗位资料</h3>
                <p>这里保留面试准备需要的最少信息。</p>
              </div>
            </div>
            <button className="info-row" onClick={onEditJd}>
              <span>岗位 JD</span>
              <strong>{selected.jd ? "已保存，点击查看" : "未填写"}</strong>
              <ArrowRight />
            </button>
            <div className="info-row info-row--static">
              <span>个人备注</span>
              <strong>{selected.notes || "未填写"}</strong>
            </div>
          </section>

          <section className="focus-section focus-section--intel">
            <div className="section-heading">
              <div>
                <h3>面试情报</h3>
                <p>每天 12:00 由 Codex 根据当前岗位更新。</p>
              </div>
              <span className="loop-state"><Check weight="bold" /> Loop 已连接</span>
            </div>
            {companyBrief ? (
              <button className="intel-preview" onClick={onOpenIntel}>
                <strong>{companyBrief.summary}</strong>
                <span>{companyBrief.signals?.[0] || "查看完整面试准备信息"}</span>
                <small>查看完整情报 <ArrowRight /></small>
              </button>
            ) : (
              <button className="intel-empty" onClick={onOpenIntel}>
                <Sparkle />
                <span><strong>等待首次情报更新</strong><small>新增岗位会在下一次运行前自动同步</small></span>
                <ArrowRight />
              </button>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function TimelineView({ companies, selectedIds, onToggleCompany, weekStart, onWeekChange, onToday, onCell }) {
  const days = Array.from({ length: 14 }, (_, index) => addDays(weekStart, index));
  const shown = companies.filter((company) => selectedIds.includes(company.id));
  const todayKey = toDateKey(new Date());

  return (
    <main className="page timeline-page">
      <div className="page-heading page-heading--timeline">
        <div>
          <h1>时间轴</h1>
          <p>点击任意一天，直接设置投递或面试节点。</p>
        </div>
        <div className="date-controls">
          <button className="icon-button bordered" onClick={() => onWeekChange(-14)} aria-label="前两周"><CaretLeft /></button>
          <button className="secondary-button" onClick={onToday}>今天</button>
          <button className="icon-button bordered" onClick={() => onWeekChange(14)} aria-label="后两周"><CaretRight /></button>
        </div>
      </div>

      <section className="project-filter">
        <span>显示岗位</span>
        <div>
          {companies.map((company) => (
            <label key={company.id} className={selectedIds.includes(company.id) ? "is-checked" : ""}>
              <input
                type="checkbox"
                checked={selectedIds.includes(company.id)}
                onChange={() => onToggleCompany(company.id)}
              />
              <CompanyMark company={company} compact />
              <span>{company.team}</span>
              <Check weight="bold" />
            </label>
          ))}
        </div>
      </section>

      <section className="gantt-shell">
        <div className="gantt-scroll">
          <div className="gantt" style={{ "--day-count": days.length }}>
            <div className="gantt-corner">
              <strong>岗位</strong>
              <span>{formatMonthDay(days[0])} - {formatMonthDay(days.at(-1))}</span>
            </div>
            <div className="gantt-dates">
              {days.map((day) => {
                const key = toDateKey(day);
                return (
                  <div className={key === todayKey ? "is-today" : ""} key={key}>
                    <span>{["日", "一", "二", "三", "四", "五", "六"][day.getDay()]}</span>
                    <strong>{day.getDate()}</strong>
                  </div>
                );
              })}
            </div>

            {shown.map((company) => {
              const nodes = [...(company.timeline || [])].sort((a, b) => a.date.localeCompare(b.date));
              const visibleIndexes = nodes
                .map((node) => ({ node, index: days.findIndex((day) => toDateKey(day) === node.date) }))
                .filter((item) => item.index >= 0);
              const first = visibleIndexes[0]?.index;
              const last = visibleIndexes.at(-1)?.index;
              return (
                <div className="gantt-row" key={company.id}>
                  <div className="gantt-project">
                    <CompanyMark company={company} compact />
                    <span><strong>{company.team}</strong><small>{company.role}</small></span>
                    <em>{deriveStatus(company)}</em>
                  </div>
                  <div className="gantt-track">
                    {first !== undefined && (
                      <span
                        className="gantt-line"
                        style={{ "--line-start": first + 1, "--line-span": Math.max(1, last - first + 1) }}
                      />
                    )}
                    {days.map((day, index) => {
                      const date = toDateKey(day);
                      const node = nodes.find((item) => item.date === date);
                      return (
                        <button
                          className={`${date === todayKey ? "is-today" : ""} ${node ? "has-node" : ""}`}
                          key={date}
                          onClick={() => onCell(company.id, date, node || null)}
                          aria-label={`${company.name}${formatFullDate(day)}${node ? node.type : "添加节点"}`}
                        >
                          {node ? (
                            <span className="gantt-node">
                              <i />
                              <strong>{node.type}</strong>
                              {node.time && <small>{node.time}</small>}
                            </span>
                          ) : <span className="cell-add"><Plus /></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {!shown.length && (
              <div className="gantt-empty">
                <CalendarBlank />
                <span><strong>选择至少一个岗位</strong><small>勾选上方岗位后即可开始编辑时间轴</small></span>
              </div>
            )}
          </div>
        </div>
        <footer className="gantt-help">
          <span><i /> 已设置节点</span>
          <span>点击空白日期添加</span>
          <span>点击已有节点编辑</span>
        </footer>
      </section>
    </main>
  );
}

function IntelligenceView({ companies, selectedId, intelligence, onSelect, onAdd, onOpenItem }) {
  const [tab, setTab] = useState("roles");
  const brief = intelligence.roleBriefs?.[selectedId];
  const selected = companies.find((company) => company.id === selectedId) || companies[0] || null;
  const lastUpdate = intelligence.generatedAt
    ? new Date(intelligence.generatedAt).toLocaleString("zh-CN", { hour12: false })
    : "等待首次运行";

  return (
    <main className="page intelligence-page">
      <div className="page-heading">
        <div>
          <h1>情报台</h1>
          <p>每天收集 AI 产品岗位机会，以及已添加岗位的面试信息。</p>
        </div>
        <div className="loop-summary">
          <span className="loop-state"><Check weight="bold" /> 每天 12:00</span>
          <small>最近更新：{lastUpdate}</small>
        </div>
      </div>

      <div className="intel-tabs" role="tablist">
        <button className={tab === "roles" ? "is-active" : ""} onClick={() => setTab("roles")}>我的岗位</button>
        <button className={tab === "market" ? "is-active" : ""} onClick={() => setTab("market")}>市场机会</button>
      </div>

      {tab === "roles" ? (
        <>
          <CompanyRail companies={companies} selectedId={selectedId} onSelect={onSelect} onAdd={onAdd} />
          <section className="intel-reader">
            {selected && (
              <header>
                <div className="intel-reader__title">
                  <CompanyMark company={selected} compact />
                  <div><h2>{selected.name} · {selected.team}</h2><p>{selected.role}</p></div>
                </div>
                <span>{selected.jd ? "已读取岗位 JD" : "等待补充岗位 JD"}</span>
              </header>
            )}
            {selected && brief ? (
              <div className="brief-content">
                <section>
                  <h3>今日判断</h3>
                  <p>{brief.summary}</p>
                </section>
                <section>
                  <h3>面试信号</h3>
                  <div className="plain-list">
                    {(brief.signals || []).map((signal) => <p key={signal}>{signal}</p>)}
                  </div>
                </section>
                <section>
                  <h3>准备问题</h3>
                  <div className="plain-list">
                    {(brief.questions || []).map((question) => <p key={question}>{question}</p>)}
                  </div>
                </section>
                <button className="primary-button" onClick={() => onOpenItem(brief)}>查看来源与完整情报 <ArrowRight /></button>
              </div>
            ) : selected ? (
              <div className="reader-empty">
                <NewspaperClipping />
                <h2>还没有这条岗位的情报</h2>
                <p>Codex 会在下一次运行前读取最新岗位和 JD，再把有来源的信息写回这里。</p>
                <span>下一次：每天 12:00</span>
              </div>
            ) : (
              <div className="reader-empty">
                <Plus />
                <h2>还没有岗位</h2>
                <p>添加岗位后，Codex Loop 才能为它收集面试信息。</p>
                <button className="primary-button" onClick={onAdd}><Plus /> 添加岗位</button>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="opportunity-reader">
          {(intelligence.opportunities || []).length ? (
            intelligence.opportunities.map((item) => (
              <button key={item.id} onClick={() => onOpenItem(item)}>
                <span>{item.company}</span>
                <h2>{item.title || item.role}</h2>
                <p>{item.summary}</p>
                <small>{item.location || "地点未注明"} <ArrowRight /></small>
              </button>
            ))
          ) : (
            <div className="reader-empty">
              <MagnifyingGlass />
              <h2>等待首次市场扫描</h2>
              <p>每天只保留有可靠来源的 AI 产品经理机会，不用构造岗位填满页面。</p>
              <span>下一次：每天 12:00</span>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export function App() {
  const [companies, setCompanies] = useState(INITIAL_COMPANIES);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [intelligence, setIntelligence] = useState(EMPTY_INTELLIGENCE);
  const [selectedTimelineIds, setSelectedTimelineIds] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [nodeDraft, setNodeDraft] = useState(null);
  const [intelDetail, setIntelDetail] = useState(null);
  const [companyDraft, setCompanyDraft] = useState({ company: "", team: "", role: "", location: "", presetId: "" });
  const searchRef = useRef(null);
  const noticeTimerRef = useRef(null);

  const visibleCompanies = useMemo(
    () => companies.filter((company) => `${company.name}${company.team}${company.role}${company.jd}`.toLowerCase().includes(query.toLowerCase())),
    [companies, query],
  );
  const selected = companies.find((company) => company.id === selectedId) || companies[0];
  const selectedPreset = COMPANY_PRESETS.find((preset) => preset.id === companyDraft.presetId) || null;

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [workspaceResponse, intelligenceResponse] = await Promise.all([
          fetch("/api/workspace"),
          fetch("/api/intelligence"),
        ]);
        if (workspaceResponse.ok) {
          const workspace = await workspaceResponse.json();
          if (active && Array.isArray(workspace.companies)) {
            setCompanies(workspace.companies);
            setSelectedId(workspace.companies[0]?.id || "");
            setSelectedTimelineIds(workspace.companies.map((company) => company.id));
          }
        } else {
          throw new Error("workspace unavailable");
        }
        if (intelligenceResponse.ok && active) setIntelligence(await intelligenceResponse.json());
      } catch {
        const local = window.localStorage.getItem("up-workspace");
        if (local && active) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed.companies)) {
              setCompanies(parsed.companies);
              setSelectedId(parsed.companies[0]?.id || "");
              setSelectedTimelineIds(parsed.companies.map((company) => company.id));
            }
          } catch {
            // Keep the safe initial state.
          }
        }
      } finally {
        if (active) setHydrated(true);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refresh = () => {
      fetch("/api/intelligence")
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((value) => setIntelligence(value))
        .catch(() => {});
    };
    const timer = window.setInterval(refresh, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return undefined;
    const payload = { version: 1, updatedAt: new Date().toISOString(), companies };
    window.localStorage.setItem("up-workspace", JSON.stringify(payload));
    const timer = window.setTimeout(() => {
      fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }, 240);
    return () => window.clearTimeout(timer);
  }, [companies, hydrated]);

  function showNotice(message) {
    window.clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 3500);
  }

  function chooseCompany(id) {
    setSelectedId(id);
    if (!selectedTimelineIds.includes(id)) setSelectedTimelineIds((current) => [...current, id]);
  }

  function openAddModal() {
    setCompanyDraft({ company: "", team: "", role: "", location: "", presetId: "" });
    setModal("add");
  }

  function addCompany(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("company") || "").trim();
    const team = String(data.get("team") || "").trim();
    const role = String(data.get("role") || "").trim();
    if (!name || !role) return;
    const preset = COMPANY_PRESETS.find((item) => item.id === data.get("preset")) || matchCompanyPreset(name);
    const company = {
      id: `position-${Date.now()}`,
      name,
      team: team || name,
      role,
      location: String(data.get("location") || "").trim(),
      status: "待开始",
      mark: preset?.mark || name.slice(0, 1),
      tone: preset ? "preset" : "custom",
      logoUrl: preset?.logoUrl,
      logoFit: preset?.logoFit,
      presetId: preset?.id || "",
      jd: "",
      notes: "",
      timeline: [],
    };
    setCompanies((current) => [...current, company]);
    setSelectedId(company.id);
    setSelectedTimelineIds((current) => [...current, company.id]);
    setModal(null);
    showNotice(`${company.team}已添加，情报 Loop 会自动同步`);
  }

  function saveJd(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const jd = String(data.get("jd") || "").trim();
    const notes = String(data.get("notes") || "").trim();
    setCompanies((current) => current.map((company) => company.id === selectedId ? { ...company, jd, notes } : company));
    setModal(null);
    showNotice("岗位资料已保存");
  }

  function openTimelineCell(companyId, date, node) {
    setNodeDraft({
      companyId,
      date,
      id: node?.id || "",
      type: node?.type || "一面",
      title: node?.title || "",
      time: node?.time || "",
      note: node?.note || "",
    });
    setModal("node");
  }

  function saveNode(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextNode = {
      id: nodeDraft.id || `node-${Date.now()}`,
      date: nodeDraft.date,
      type: String(data.get("type") || "自定义"),
      title: String(data.get("title") || "").trim(),
      time: String(data.get("time") || "").trim(),
      note: String(data.get("note") || "").trim(),
    };
    setCompanies((current) => current.map((company) => {
      if (company.id !== nodeDraft.companyId) return company;
      const withoutCurrent = (company.timeline || []).filter((node) => node.id !== nextNode.id && node.date !== nextNode.date);
      return { ...company, timeline: [...withoutCurrent, nextNode] };
    }));
    setModal(null);
    showNotice(`${formatMonthDay(nextNode.date)} ${nextNode.type}已设置`);
  }

  function deleteNode() {
    if (!nodeDraft?.id) return;
    setCompanies((current) => current.map((company) => company.id === nodeDraft.companyId
      ? { ...company, timeline: (company.timeline || []).filter((node) => node.id !== nodeDraft.id) }
      : company));
    setModal(null);
    showNotice("节点已删除");
  }

  function toggleTimelineCompany(id) {
    setSelectedTimelineIds((current) => current.includes(id)
      ? current.filter((companyId) => companyId !== id)
      : [...current, id]);
  }

  function goToTimeline() {
    setView("timeline");
    setSelectedTimelineIds((current) => current.includes(selectedId) ? current : [...current, selectedId]);
  }

  const pageContent = view === "timeline" ? (
    <TimelineView
      companies={visibleCompanies}
      selectedIds={selectedTimelineIds}
      onToggleCompany={toggleTimelineCompany}
      weekStart={weekStart}
      onWeekChange={(amount) => setWeekStart((current) => addDays(current, amount))}
      onToday={() => setWeekStart(startOfWeek(new Date()))}
      onCell={openTimelineCell}
    />
  ) : view === "intelligence" ? (
    <IntelligenceView
      companies={visibleCompanies.length ? visibleCompanies : companies}
      selectedId={selectedId}
      intelligence={intelligence}
      onSelect={chooseCompany}
      onAdd={openAddModal}
      onOpenItem={setIntelDetail}
    />
  ) : (
    <Overview
      companies={visibleCompanies.length ? visibleCompanies : companies}
      selected={selected}
      selectedId={selectedId}
      intelligence={intelligence}
      onSelect={chooseCompany}
      onAdd={openAddModal}
      onOpenTimeline={goToTimeline}
      onEditJd={() => setModal("jd")}
      onOpenIntel={() => setView("intelligence")}
    />
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("overview")} aria-label="返回 up 总览">up</button>
        <nav>
          {NAV_ITEMS.map(([id, label, Icon]) => (
            <button className={view === id ? "is-active" : ""} key={id} onClick={() => setView(id)}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-loop">
          <span><Sparkle /></span>
          <div>
            <strong>情报 Loop</strong>
            <small>{intelligence.automation?.status === "active" ? "每天 12:00" : "等待配置"}</small>
          </div>
          {intelligence.automation?.status === "active" ? <Check weight="bold" /> : <CaretRight />}
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <label className="search">
            <MagnifyingGlass />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索公司、岗位或 JD"
            />
            <kbd>⌘K</kbd>
          </label>
          <div className="topbar-actions">
            <button className="primary-button" onClick={openAddModal}><Plus /> 添加岗位</button>
            <button className="icon-button" aria-label="通知"><Bell /></button>
            <button className="profile" aria-label="账户"><UserCircle /></button>
          </div>
        </header>

        {pageContent}

        <footer className="statusbar">
          <span><Check weight="bold" /> 本地已保存</span>
          <span className="statusbar__spacer" />
          <span>情报 Loop 每天 12:00</span>
          <span>{companies.length} 个岗位</span>
        </footer>
      </div>

      {notice && <div className="toast" role="status"><Check weight="bold" /> {notice}</div>}

      {modal === "add" && (
        <Modal title="添加岗位" onClose={() => setModal(null)} wide>
          <form className="add-form" onSubmit={addCompany}>
            <fieldset className="company-picker">
              <legend>选择公司</legend>
              <div className="company-picker__grid">
                {COMPANY_PRESETS.map((preset) => (
                  <button
                    className={preset.id === companyDraft.presetId ? "is-selected" : ""}
                    type="button"
                    key={preset.id}
                    onClick={() => setCompanyDraft((current) => ({ ...current, company: preset.name, presetId: preset.id }))}
                    aria-pressed={preset.id === companyDraft.presetId}
                  >
                    <CompanyMark company={{ ...preset, tone: "preset" }} compact />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <input type="hidden" name="preset" value={companyDraft.presetId} />
            <div className="form-grid">
              <label>
                公司名称
                <input
                  name="company"
                  value={companyDraft.company}
                  onChange={(event) => {
                    const company = event.target.value;
                    const preset = matchCompanyPreset(company);
                    setCompanyDraft((current) => ({ ...current, company, presetId: preset?.id || "" }));
                  }}
                  placeholder="输入公司名称"
                  autoFocus
                  required
                />
              </label>
              <label>
                业务团队
                <input name="team" value={companyDraft.team} onChange={(event) => setCompanyDraft((current) => ({ ...current, team: event.target.value }))} placeholder="例如：智能助手团队" />
              </label>
              <label>
                岗位名称
                <input name="role" value={companyDraft.role} onChange={(event) => setCompanyDraft((current) => ({ ...current, role: event.target.value }))} placeholder="输入真实岗位名称" required />
              </label>
              <label>
                地点
                <input name="location" value={companyDraft.location} onChange={(event) => setCompanyDraft((current) => ({ ...current, location: event.target.value }))} placeholder="可留空" />
              </label>
            </div>
            <div className="form-note">
              {selectedPreset ? <CompanyMark company={{ ...selectedPreset, tone: "preset" }} compact /> : <Sparkle />}
              <span>{selectedPreset ? `已匹配 ${selectedPreset.name} 图标` : "新增后会自动进入每天的情报搜索范围"}</span>
            </div>
            <div className="modal__footer">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>取消</button>
              <button className="primary-button" type="submit">添加岗位 <ArrowRight /></button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "jd" && (
        <Modal title={`${selected.name} · ${selected.role}`} onClose={() => setModal(null)}>
          <form className="jd-form" onSubmit={saveJd}>
            <label>
              岗位 JD
              <textarea name="jd" defaultValue={selected.jd} placeholder="粘贴真实职位描述" autoFocus />
            </label>
            <label>
              个人备注
              <textarea className="textarea-small" name="notes" defaultValue={selected.notes} placeholder="记录联系人、准备重点或其他信息" />
            </label>
            <div className="form-note"><Sparkle /> 保存后，下一次情报 Loop 会读取最新内容。</div>
            <div className="modal__footer">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>取消</button>
              <button className="primary-button" type="submit">保存资料 <ArrowRight /></button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "node" && nodeDraft && (
        <Modal title={`${formatFullDate(nodeDraft.date)} · 设置节点`} onClose={() => setModal(null)}>
          <form className="node-form" onSubmit={saveNode}>
            <label>
              节点类型
              <select name="type" defaultValue={nodeDraft.type}>
                {NODE_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <div className="form-grid">
              <label>
                节点名称
                <input name="title" defaultValue={nodeDraft.title} placeholder="例如：业务一面" />
              </label>
              <label>
                时间
                <input name="time" type="time" defaultValue={nodeDraft.time} />
              </label>
            </div>
            <label>
              备注
              <textarea className="textarea-small" name="note" defaultValue={nodeDraft.note} placeholder="面试官、会议链接、准备重点等" />
            </label>
            <div className="modal__footer modal__footer--split">
              {nodeDraft.id ? <button type="button" className="danger-button" onClick={deleteNode}><Trash /> 删除</button> : <span />}
              <div>
                <button type="button" className="secondary-button" onClick={() => setModal(null)}>取消</button>
                <button className="primary-button" type="submit">保存节点 <ArrowRight /></button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {intelDetail && (
        <Modal title={intelDetail.title || intelDetail.role || "完整情报"} onClose={() => setIntelDetail(null)}>
          <article className="intel-detail">
            {intelDetail.company && <span>{intelDetail.company}</span>}
            <p>{intelDetail.summary}</p>
            {(intelDetail.signals || []).map((item) => <p key={item}>{item}</p>)}
            {(intelDetail.questions || []).map((item) => <p key={item}>{item}</p>)}
            {(intelDetail.sources || []).map((source) => (
              <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title || source.source || source.url} <ArrowRight /></a>
            ))}
            {intelDetail.url && <a href={intelDetail.url} target="_blank" rel="noreferrer">打开来源 <ArrowRight /></a>}
          </article>
        </Modal>
      )}
    </div>
  );
}
