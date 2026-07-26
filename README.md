# up

`up` is a privacy-first desktop workspace for managing job applications, interview timelines, and source-backed job intelligence.

The public release starts completely empty. It contains no companies, positions, JD text, notes, timeline nodes, intelligence results, personal paths, or profile data.

## Acknowledgements / 致谢

> **up is an independent visual companion built on and integrated with
> [career-ops](https://github.com/santifer/career-ops).**
>
> **特别感谢 [@santifer](https://github.com/santifer) 创建并开源
> career-ops。up 使用了 career-ops 提供的开源求职工作流、运行模式和本地数据契约，
> 在这些能力之上制作了桌面可视化界面，并继续加入适合个人秋招使用的新功能。**

career-ops provides the underlying job-search capabilities that `up` invokes,
including role evaluation, opportunity scanning, tailored CV and cover-letter
workflows, application preparation, tracking, follow-up, and interview
preparation. `up` connects to a separately installed local copy of career-ops
and makes those workflows easier to see and operate from a desktop interface.

This project adds its own:

- Visual Career Ops action entry points inside a macOS desktop app
- Company-centered position, JD, status, and intelligence workspace
- Editable application Gantt timeline and a separate sourced public-process timeline
- Source-linked recruiting intelligence, experience research, and update center
- Local-first data handling, visual company presets, and a human confirmation boundary

`up` is a community project maintained independently by
[@differance-dfhs](https://github.com/differance-dfhs). It is not an official
career-ops release and does not claim endorsement, sponsorship, or affiliation
with career-ops or its maintainer. The upstream project remains available under
its own MIT license and trademark policy. See
[Third-party notices](THIRD_PARTY_NOTICES.md).

## What it does

- Company-centered overview with circular company clusters and role switching
- Safe deletion for either the current role or an entire company cluster
- Directly editable Gantt timeline
- Separate public recruiting-process timeline with exact official dates, evidence-based historical ranges, and confidence labels
- Application progress derived from dated nodes
- Position-level JD and notes
- Intelligence reader for market opportunities and source-linked interview preparation
- Expandable interview experience library organized by background, process, interview round, question, answer, and original post
- Autumn-recruiting full-time opportunity filter that excludes internships and unverified social-recruiting roles
- In-app Loop update center with unread indicators and a retained change feed
- Optional daily Codex Loop integration

## Install on macOS

Download the latest `.dmg` from [GitHub Releases](https://github.com/differance-dfhs/up/releases), open it, and drag `up` to Applications.

The current local package is built for Apple Silicon. The release workflow also supports Intel builds.

Because the app is distributed without an Apple Developer ID signature, macOS may require: right-click the app, choose Open, then confirm once.

## Privacy

- All workspace data is stored locally.
- The app does not include analytics, accounts, or a remote database.
- Installed data lives in `~/Library/Application Support/up/data`.
- The GitHub repository contains only empty JSON templates.
- Codex integration is opt-in and must be created by the user.

## Connect Codex

1. Install and open `up`.
2. Copy the automation prompt from [docs/codex-loop-prompt.md](docs/codex-loop-prompt.md).
3. Ask Codex to create the daily 22:30 automation.
4. Use `~/Library/Application Support/up/data` as `{{UP_DATA_DIR}}`.

Before each run, Codex reads the latest positions from `workspace.json`. It searches official sources and publicly accessible experience posts, including relevant Xiaohongshu posts from current and earlier cohorts. It writes sourced opportunities and structured interview preparation to `intelligence.json`. The workbench checks for updates while it is open.

## Development

```bash
npm install
npm run dev
```

Build and validate:

```bash
npm run build
npm run test:sites
```

If you are deploying through OpenAI Sites and have a local
`.openai/hosting.json`, prepare the Sites bundle with:

```bash
npm run build:sites
```

Build a macOS Apple Silicon installer:

```bash
npm run desktop:dist
```

Build an Intel installer:

```bash
npm run desktop:dist:x64
```

## Data format

- `data/workspace.json`: local companies, positions, JD, notes, and timeline nodes
- `data/intelligence.json`: Codex-generated opportunities and position briefs

The committed versions of both files are intentionally empty.

## License

[MIT](LICENSE)

Third-party font and trademark notices are documented in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
