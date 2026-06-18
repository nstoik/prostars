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
  -e GOOGLE_CREDENTIALS="$(cat /path/to/service-account.json)" \
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
- Pitcher vs batter detection in `lifetimeData` and `playerLifetime` is **hardcoded** to tab ID `'baseball-pitchers'`. If that tab ID changes, pitchers will aggregate as batters silently.
- `filterItems` drives both the filter panel checkbox groups and `initDefaultFilters`. The default filter pre-selects the latest year and most recent season; all other dimensions default to all-selected.
- `defaultHiddenColumns` and `mobileHiddenColumns` in tab config set the initial column visibility; `getHiddenColumns(tab)` merges them based on screen width.
- `leaderGamesField` and `leaderMinGamesPct` in tab config enable the min-games qualifier on leaderboard cards (e.g. `leaderMinGamesPct: 0.5` requires ≥ 50% of the max games played).

### Lifetime table

Adding `lifetimeHeaders` to a tab config enables the Season/Lifetime toggle for that tab. Additional optional fields:

- `lifetimeHeaders` — column list for lifetime view (must start with `"#"`)
- `lifetimeDefaultSort` — overrides `defaultSort` in lifetime mode
- `lifetimeLeaderStats` — overrides `leaderStats` for lifetime leaderboard cards

`LIFETIME_SKIP` (module-level constant, currently `['Year']`) lists filter dimensions excluded from lifetime mode. Lifetime data is grouped by `r.Name` and aggregated via `aggregateBatterRows` / `aggregatePitcherRows`.

## CSS Structure

`prostars/static/css/theme.css` is the main stylesheet (~1000 lines). It is organized by sections (see comments):
- CSS custom properties and sport-specific overrides (`[data-sport="baseball"]`, `[data-sport="hockey"]`)
- `--accent` and `--hero-gradient` are the two key per-sport variables
- Heatmap classes: `.cell-heat-0` (worst) through `.cell-heat-9` (best); `higherIsBetter` in config controls direction. All green for baseball, all blue for hockey.
- Tabulator overrides are all scoped to `.tabulator` and `.tabulator-row`
- Player panel lifetime grid uses `.pp-lifetime-grid`

`custom.css` is minimal — only the `[v-cloak]` hide rule.

## Backend Column Config

`numericise_ignore` in `_TABLE_MAP` is a list of **1-based column indices** passed to `gspread.get_all_records()`. It prevents gspread from coercing those columns to numbers (used for AVG, OBP, SLG, OPS in baseball batting — columns 19–22 — and pitching rate stats — columns 10, 15–17). If the Google Sheet column order changes, these indices must be updated.

## Player Name Canonicalization

`_NAME_MAP` in `app.py` translates historical player names to their current name (e.g. after a marriage name change). It is applied once after `fetch_all`, before the result is cached, so the frontend always sees the canonical name and player panel aggregation works correctly across all seasons. The Google Sheet is never modified.

To add a mapping:
```python
_NAME_MAP: dict[str, str] = {
    "Old Name": "Current Name",
}
```

## GCP Cloud Run Deployment

**GCP project:** `prostars-369222` · **Region:** `us-west1`

The new version runs as a **separate Cloud Run service** alongside the existing one. The existing service handles `www.theprostars.ca`; the new service gets its own `*.run.app` URL until ready to swap.

### First deploy (via GCP Console)

1. GCP Console → **Cloud Run** → **Create Service**
2. Choose **"Continuously deploy from a repository"** → connect GitHub → select `nstoik/prostars`
3. Branch: `main` · Build type: **Dockerfile** · Target: `prod-stage`
4. Service name: `prostars-new` (keeps it separate from the existing service)
5. Region: `us-west1`
6. Under **Variables & Secrets**, add:
   - `GOOGLE_CREDENTIALS` — full contents of the service account JSON (no surrounding quotes)
   - `SECRET_KEY` — any long random string
7. Allow unauthenticated requests → **Deploy**

After this, every push to `main` automatically rebuilds and redeploys.

### Swapping to production

When ready to point `www.theprostars.ca` at the new service:
1. Cloud Run → new service → **Custom domains** → map `www.theprostars.ca`
2. Update DNS records as instructed (Cloud Run provides the CNAME/A records)
3. Delete or stop the old service once traffic is confirmed healthy
4. Delete the old `prostars-1215` GCP project from the personal account (GCP Console → IAM & Admin → Settings → Shut down project)

### Service account

Service account email: `prostars-dev@prostars-369222.iam.gserviceaccount.com`
The key is stored in `.env` locally. To generate a new key: GCP Console → IAM → Service Accounts → prostars-dev → Keys → Add Key.

## Known Limitations

- No automated tests
- `SimpleCache` is in-process only — cache is lost on container restart and not shared across workers
- Player name is used as the unique key in the player panel; two players with the same name across different divisions will be merged
- Pitcher/batter detection in the player panel is hardcoded to the `baseball-pitchers` tab ID
