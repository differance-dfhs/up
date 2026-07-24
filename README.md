# up

`up` is a privacy-first desktop workspace for managing job applications, interview timelines, and source-backed job intelligence.

The public release starts completely empty. It contains no companies, positions, JD text, notes, timeline nodes, intelligence results, personal paths, or profile data.

## What it does

- Company-centered overview with circular company navigation
- Directly editable Gantt timeline
- Application progress derived from dated nodes
- Position-level JD and notes
- Intelligence reader for market opportunities and interview preparation
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
3. Ask Codex to create the daily 12:00 automation.
4. Use `~/Library/Application Support/up/data` as `{{UP_DATA_DIR}}`.

Before each run, Codex reads the latest positions from `workspace.json`. It writes sourced opportunities and interview preparation to `intelligence.json`. The workbench checks for updates while it is open.

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
