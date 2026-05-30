# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
uv sync

# Run dev server
uv run flask --app prostars.app run --debug

# Run dev server accessible on local network
uv run flask --app prostars.app run --host=0.0.0.0 --port=5000 --debug

# Build prod Docker image
docker build --target prod-stage -t prostars:local .

# Run prod container locally
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e SECRET_KEY=dev-local-key \
  -e GOOGLE_CREDENTIALS="$(cat prostars/Prostars-c02b661b2a77.json)" \
  prostars:local
```

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `GOOGLE_CREDENTIALS` — full contents of the GCP service account JSON (single line, no surrounding quotes)
- `SECRET_KEY` — any long random string

In Docker Desktop's env var UI, paste the raw JSON **without** surrounding single quotes (`{...}` not `'{...}'`). The single quotes are a shell convention stripped by dotenv but not by Docker.

## Architecture

**Request flow:** Browser → Flask route → Google Sheets via gspread → JSON response → Vue 3 app → Tabulator table

**Server-side caching:** `Flask-Caching` `SimpleCache` with 15-minute TTL. Cache is in-process (lost on restart) and per-worker. Only one gunicorn worker is used in production (`--workers 1 --threads 8`) to keep a shared cache.

**Client-side caching:** `sessionStorage` with 15-minute TTL checked in `fetchTableData()` in `stats-app.js`. Avoids repeat POST requests on tab switches within the same browser session.

**No database.** All data lives in Google Sheets. The spreadsheet/worksheet names are mapped in `_TABLE_MAP` in `app.py`.

## Adding a New Sport

1. Add entries to `_TABLE_MAP` in `prostars/app.py`:
   ```python
   "mysport": {
       "#mysport-players-table": ("SpreadsheetName", "WorksheetName", None),
   }
   ```
2. Create `prostars/templates/mysport_stats.html` extending `stats_base.html`. Define `window.PROSTARS_CONFIG` with tabs, headers, `filterItems`, `heatmapColumns`, and `leaderStats`.
3. Add a nav link in `index.html` and the landing sport card.

## Frontend Stack

- **Vue 3** (CDN, Composition API) — reactive filters, leaderboard cards, player panel. Delimiters are `[[ ]]` (not `{{ }}`) to avoid Jinja conflicts.
- **Tabulator 6** (CDN) — sortable/filterable table with frozen columns, heatmap cell coloring, row selection. Events must be registered via `table.on(...)` **after** construction, not in the constructor config.
- No jQuery. No build step. All JS/CSS loaded from CDN.

## Key Conventions in `stats-app.js`

- `headers[0]` **must always be `"#"`** — the rank column. `buildTabulatorColumns` slices it off and handles it specially.
- `fieldMap` in tab config maps display header names to actual data field names (e.g. `"+/-": "Plus_Minus"`).
- `heatmapColumns` drives cell background coloring; `leaderStats` drives the leaderboard cards above the table. They are independent.
- Pitcher vs batter detection in `playerCareer` is **hardcoded** to tab ID `'baseball-pitchers'`. If that tab ID changes, pitchers will render as batters silently.
- `filterItems` drives both the filter panel checkbox groups and `initDefaultFilters`. The default filter pre-selects the latest year and most recent season; all other dimensions default to all-selected.

## CSS Structure

`prostars/static/css/theme.css` is the main stylesheet (~1000 lines). It is organized by sections (see comments):
- CSS custom properties and sport-specific overrides (`[data-sport="baseball"]`, `[data-sport="hockey"]`)
- `--accent` and `--hero-gradient` are the two key per-sport variables
- Heatmap classes: `.cell-heat-0` (worst) through `.cell-heat-4` (best); `higherIsBetter` in config controls direction
- Tabulator overrides are all scoped to `.tabulator` and `.tabulator-row`

`custom.css` is minimal — only the `[v-cloak]` hide rule.

## Backend Column Config

`numericise_ignore` in `_TABLE_MAP` is a list of **1-based column indices** passed to `gspread.get_all_records()`. It prevents gspread from coercing those columns to numbers (used for AVG, OBP, SLG, OPS in baseball batting — columns 19–22 — and pitching rate stats — columns 10, 15–17). If the Google Sheet column order changes, these indices must be updated.

## Known Limitations

- No automated tests
- `SimpleCache` is in-process only — cache is lost on container restart and not shared across workers
- Player name is used as the unique key in the player panel; two players with the same name across different divisions will be merged
- Pitcher/batter detection in the player panel is hardcoded to the `baseball-pitchers` tab ID
