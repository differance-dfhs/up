# Codex Loop prompt

Create a daily automation that runs at 12:00 local time.

Before every run, read the latest workspace from:

`{{UP_DATA_DIR}}/workspace.json`

Use the companies, teams, roles, locations, JD text, notes, and timeline nodes in that file as the complete current scope. Never reuse a company or role that is no longer present.

Complete two live-research tasks:

1. Find current, source-backed AI product management opportunities. Prefer official company career pages and official announcements. Do not claim that a role is open when its status cannot be verified.
2. For every role in the workspace, collect relevant official company updates, role requirements, public interview experiences, and practical preparation signals. Public posts may be used only when they are accessible without bypassing login or access controls. Do not retain personal identifiers from post authors.

Write the result atomically to:

`{{UP_DATA_DIR}}/intelligence.json`

Use this JSON structure:

```json
{
  "generatedAt": "ISO timestamp",
  "opportunities": [
    {
      "id": "stable id",
      "company": "company",
      "title": "role",
      "role": "role",
      "location": "location or not specified",
      "summary": "why it matters",
      "url": "primary source URL",
      "source": "source name",
      "publishedAt": "date or null",
      "tags": ["AI product"]
    }
  ],
  "roleBriefs": {
    "workspace company id": {
      "companyId": "workspace company id",
      "updatedAt": "ISO timestamp",
      "summary": "most important current judgment",
      "signals": ["three to six interview signals"],
      "questions": ["three to six preparation questions"],
      "sources": [
        {
          "title": "source title",
          "url": "source URL",
          "source": "platform",
          "kind": "official or experience",
          "publishedAt": "date or null"
        }
      ]
    }
  },
  "automation": {
    "name": "秋招情报 Loop",
    "schedule": "每天 12:00",
    "status": "active"
  }
}
```

Keep only verified information. Do not create sample companies, fake roles, invented dates, or fabricated interview experiences. Validate the JSON before replacing the existing file.

For the macOS app, replace `{{UP_DATA_DIR}}` with:

`~/Library/Application Support/up/data`

For local development, replace it with the absolute path to this repository's `data` directory.
