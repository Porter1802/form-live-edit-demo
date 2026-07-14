# Form Live-Edit Demo

A proof-of-concept multi-step form that composes into a professional,
legally-numbered report preview with a **collaborative inline edit mode**.
Built and run as a single Docker image on one configurable port.

See [`spec.md`](./spec.md) for requirements and [`PLAN.md`](./PLAN.md) for the
build plan this implements.

## Features

- **6-step breadcrumb form** — Basic Details, Core Details, Financials, FTEs,
  Location, Extra Details — with every field type and constraint from the spec
  (max lengths, dropdowns, conditional Election Commitment, reorderable
  Recommendations, year-range-driven Financial/FTE tables with Totals).
- **Autosave + explicit Save + Ctrl/Cmd-S**, and `Alt+←/→` to move between steps.
- **Live report preview** — all fields composed into one professional document
  with **flat, continuous legal paragraph numbering** (headings excluded, user
  lists sit outside the numbering). Dollars shown in `$` millions with 3
  decimals (negatives red & in parentheses, zero as `..`); FTEs to 1 decimal.
  Incomplete fields are flagged in **red** so the preview is useful early.
- **Inline collaborative edit mode** (the centerpiece) — toggle edit mode in the
  preview and fix typos or change dropdowns in place. Edits write back to the
  underlying source field and the preview re-derives its formatted view. Complex
  tables (Recommendations, Financial, FTE) open in a pop-up editor.
- **Real-time collaboration** — server-backed Yjs sync, invented usernames,
  presence avatars and remote cursors/selections. Open the same project in two
  tabs to see it.
- **Word export** — faithful `.docx` with the numbering, tables, images and the
  same dollar/FTE formatting.
- **AI Word-form import** — upload a `.docx`, have it parsed by a configurable
  Claude endpoint into the form's fields, then **validate and confirm** before
  anything is saved. Structured, schema-constrained extraction is snapped onto
  the reference data (departments, financial years, LGAs, Approve/Note) by a
  deterministic coercion layer, and every field shows a matched / check /
  not-mapped / empty status. **Read [`docs/SECURITY-RISK-ASSESSMENT.md`](./docs/SECURITY-RISK-ASSESSMENT.md)
  before using this with real government data** — document contents are sent to
  the configured AI endpoint.

## Architecture

A single Node service serves everything on one port: the built React SPA, the
REST API (`/api/projects…`), and the collaboration WebSocket (`/collab`), which
shares the same `http.Server`. State lives in SQLite (`better-sqlite3`): a
denormalised `projects` list plus persisted Yjs document updates.

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite + TypeScript, TipTap (ProseMirror) rich text |
| Collaboration | Yjs + `y-websocket` + `y-protocols/awareness` |
| Backend | Node + TypeScript, Express, `ws` |
| Persistence | SQLite (`better-sqlite3`) |
| Word export | `docx` |
| Packaging | Multi-stage Dockerfile |

The shared `common/` module holds the data model, reference data, dollar/FTE
formatting and the deterministic report composition + numbering pass, so the
live preview and the Word export can never disagree.

## Run with Docker

```bash
# Build
docker build -t form-live-edit .

# Run on the default port 3000
docker run -p 3000:3000 -v "$PWD/data:/app/data" form-live-edit

# Run on a custom port — the PORT env var drives what the app listens on
docker run -e PORT=8080 -p 8080:8080 -v "$PWD/data:/app/data" form-live-edit
```

Or with Compose (override the port with `PORT=8080 docker compose up`):

```bash
docker compose up --build
```

Then open <http://localhost:3000> (or your chosen port). SQLite data persists in
the mounted `./data` volume.

## Local development

```bash
npm install
# terminal 1 — API + collab server on :3000
npm run dev:server
# terminal 2 — Vite dev server on :5173 (proxies /api and /collab to :3000)
npm run dev:frontend
```

Or build and run exactly like production:

```bash
npm run build     # builds the SPA into server/public and bundles the server
npm start         # node server/dist/index.cjs
```

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `PORT` | `3000` | Port the server listens on (HTTP + API + WebSocket). |
| `DATA_DIR` | `./data` | Directory for the SQLite database file. |
| `STATIC_DIR` | `<bundle>/../public` | Built SPA directory to serve. |
| `ANTHROPIC_API_KEY` | _(unset)_ | Enables the AI Word-form import. Server-side only. When unset, the import feature runs in **demo mode** — uploading any `.docx` loads canned sample data (the file is not read or sent anywhere) so the upload → validate → confirm flow can be walked through without an API key. |
| `ANTHROPIC_BASE_URL` | Anthropic API | Point at an approved onshore / IRAP-assessed gateway. **Only taken from server config, never from the request** (endpoint allow-listing). |
| `AI_MODEL` | `claude-opus-4-8` | Model used for extraction. A smaller model (e.g. Haiku) is a reasonable choice for this task. |
| `AI_EFFORT` | `low` | Reasoning effort for extraction (`low`…`max`). Low favours speed and repeatability. |
| `MAX_UPLOAD_BYTES` | `10485760` | Upload size cap for `.docx` files (10 MB). |
| `AI_MAX_SOURCE_CHARS` | `60000` | Max characters of document text sent to the model (cost/DoS guard). |

### AI Word-form import — flow & controls

Upload from the landing page (**⬆ Upload Word form** → new project) or from inside
a project (**⬆ Import from Word** → fills the current project). The flow is
**upload → processing → validate → confirm**; nothing is written until you
confirm. On confirm, the parsed values are applied to the collaborative document
just like normal edits, so autosave, live preview and Word export all pick them
up.

**Demo mode (no API key):** when `ANTHROPIC_API_KEY` is not set, the flow still
works — pick any `.docx` and the form is filled with realistic sample data
instead of a real extraction. The upload is accepted and validated as a `.docx`
but its contents are never read or sent anywhere. The upload and validate screens
are clearly labelled as a demo, and the sample data deliberately exercises every
status badge (matched / check / empty) so you can see how the validate step
behaves. Set the API key for real AI extraction.

Hardening baked in (see the risk assessment for the full picture): the AI
endpoint is configured only from server-side env vars; uploads are memory-only,
size-capped and `.docx`-restricted; the model is instructed to treat the document
strictly as data (prompt-injection separation) and constrained to a JSON schema;
all AI/extracted HTML is server-side sanitised to a strict allow-list; and the
human validate/confirm step is mandatory.
