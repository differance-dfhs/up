# Design QA

- Source visual truth:
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-59154765-47f5-4b56-be02-0e41e65645f9.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-913d9d1e-dfe1-442a-bf17-22cb4587584c.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-c64c5eb3-886b-4ec9-bbbc-ac6c1884909b.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-c9f3f18c-c78c-419b-a961-f73545c4e69d.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-ec1c497d-f493-4b67-a79c-565da856c8cd.png`
  - QQ official App Store artwork for app id `444934666` (512 × 512)
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-56813252-ab4c-4cd4-95a8-4cceff575e2f.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-da5f743e-6dd8-4293-a921-36402369dfb7.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-ec3e322d-8e71-48be-bec5-d979c063554b.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-621530e5-05af-4d14-908c-4b4517436b09.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-b86b61ba-f510-405f-b806-27eec6c9cd72.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-3ecad9cb-14ab-46c1-8380-456ba7b54219.png`
  - `/var/folders/sk/kbfyhqcn5h39l3tbs4qqrdz40000gn/T/codex-clipboard-76bd1c2c-de9c-4921-8373-26c078981b58.png`
- Implementation screenshot: not captured because the in-app browser was blocked from accessing the local preview
- States: 市场机会品牌分组列表、应用与侧栏品牌图标、岗位列表公司图标、分阶段面试经验库、Loop 更新中心、公开招聘流程时间轴及时间区间、首页公司簇、删除确认

**Implemented**

- 市场机会从卡片网格改为按品牌分组的表格式列表：左侧固定品牌区，右侧逐行展示该品牌的不同岗位机会。
- 应用图标采用用户选定的黑色造型 `up`，背景处理为纯白；侧栏品牌标识同步使用同一套造型。
- Electron 静态资源响应补充明确的 MIME 类型，SVG 图标以 `image/svg+xml` 返回，修复部分公司图标空白。
- 对仍出现空白的品牌图执行稳健处理：阿里、百度、DeepSeek、Kimi、快手、小红书和智谱均转为 512px 透明 PNG，运行时预设不再依赖 SVG 渲染。
- 腾讯预设改用 QQ 当前官方 App 图标中的企鹅头像，并以 cover 模式填满圆形公司头像。
- 腾讯最终图标改为用户指定的蓝底扁平企鹅；源图四边各内裁 12px 后重采样至 512px，使蓝色圆底在头像蒙版内形成约 2% overscan，不显示周边白色空隙。
- 智谱图标的外部白色描边改为与 `Z` 周围一致的 `#2D2D2D`；智谱头像容器同时使用相同底色，因此圆角外侧不再露出白边。
- 修复头像组件合并预设时遗漏 `backgroundColor` 的问题；智谱 PNG 的透明圆角现在由与 `Z` 周围一致的 `#2D2D2D` 承托，不再透出默认白底。
- 准备问题升级为两层展开结构：先按背景、流程和面试轮次展开，再展开具体问题；每条结构化答案在原位显示对应帖子链接与年份。
- 市场机会在读取层过滤为明确的秋招/校招全职岗位，实习、社招和未确认校招身份的条目不进入可见分组。
- 顶部铃铛升级为带未读数量的右侧更新中心，展示 Loop 的同步、机会、面经、来源与流程变化。
- 投递时间轴下方新增独立的公开招聘流程时间轴，区分官方日期与经验整理；无证据时显示等待下一轮 Loop 的空状态。
- 公开招聘流程时间轴增加证据分级：官网日期、招聘方职位页、多帖经验归纳和单帖候选人记录；同时显示高/中/低可信度。京东 TET 已补充 2027 届网申窗口和往届各阶段的大致区间。
- 首页岗位导航按公司聚合为公司簇；同一公司有多个岗位时，簇下方显示岗位切换条。
- 首页公司详情增加删除入口；多岗位公司可选择只删除当前岗位或删除整家公司，单岗位公司仍需二次确认。
- 生产构建完成，构建产物中已确认包含品牌图、公司 SVG/PNG、分组列表样式及 22:30 同步文案。

**Findings**

- [P1] Browser-rendered comparison is unavailable
  - Location: 上述界面状态
  - Evidence: source visuals and generated image assets were inspected successfully, source checks and production build passed, but the in-app browser rejected the local preview before an implementation screenshot could be captured.
  - Impact: typography, spacing, clipping, image sharpness and final rendered alignment cannot receive a same-state pixel comparison.
  - Fix: inspect the installed application directly after packaging.

**Asset Inspection**

- `build/icon.png`: 1024 × 1024 RGB，纯白底、黑色造型标识。
- `public/brand-up.png`: 透明背景的紧凑品牌字标，用于应用内侧栏。
- 公司标识资源在生产目录中齐全；SVG 响应类型已在桌面端协议层修正。
- 七个透明 PNG 品牌图已在白底联系表中检查，内容、颜色、透明边缘和裁切均正常。
- QQ 企鹅源图为 512 × 512 PNG；黑白企鹅、黄色嘴脚与红围巾均清晰可见。
- 用户指定企鹅的构图、颜色、比例与扁平风格保持不变；处理后的蓝色背景覆盖圆形头像全部可见区域。
- 智谱白色 `Z` 的几何、位置和比例保持不变，只有外描边与透明区域的承托底色发生变化。
- 面经界面只展示 Loop 实际写入的证据；旧版 `signals/questions` 继续兼容，并提示等待下一轮升级。

**Follow-up Polish**

- No additional source-level issue identified.

final result: blocked
