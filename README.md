# Prostars Website

Baseball and hockey league stats — Flask + Vue 3, deployed to GCP Cloud Run.

---

## Local Development (Dev Container)

Open the project in VSCode and reopen in the dev container. On first build it runs `uv sync` automatically to install dependencies.

To start the development server:

```bash
uv run flask --app prostars.app run --debug
```

The app runs at `http://127.0.0.1:5000`.

---

## Player Name Mapping

If a player's name changes (e.g. marriage), add an entry to `_NAME_MAP` in `prostars/app.py`:

```python
_NAME_MAP: dict[str, str] = {
    "Old Name": "Current Name",
}
```

The mapping is applied when data is fetched from Google Sheets, before caching. The sheet itself is never modified.

---

## Google Sheets Credentials

The app reads stats from two Google Sheets (`baseball_stats`, `Hockey_Stats`) using a GCP service account. Credentials are passed via the `GOOGLE_CREDENTIALS` environment variable — never committed to source control.

### One-time GCP setup (per environment)

Do this in the GCP project that will run the app (business project for prod, personal/dev project for dev — or both in the same project once consolidated).

**1. Enable required APIs**
- GCP Console → APIs & Services → Library
- Enable **Google Sheets API**
- Enable **Google Drive API**

**2. Create a service account**
- GCP Console → IAM & Admin → Service Accounts → Create Service Account
- Name: `prostars-dev` (or `prostars-prod` for production)
- Description: "Prostars read-only Sheets access"
- Skip the IAM role grant step (access is controlled at the sheet level)
- Click Done

**3. Create and download a JSON key**
- Click the new service account → Keys tab → Add Key → Create new key → JSON
- Download the file — its contents become the `GOOGLE_CREDENTIALS` value

**4. Share the spreadsheets with the service account**
- Open each spreadsheet (`baseball_stats`, `Hockey_Stats`) in Google Drive
- Share → paste the service account email (e.g. `prostars-dev@your-project.iam.gserviceaccount.com`)
- Set to **Viewer**, uncheck "Notify people" → Share

### Local `.env` setup

Create a `.env` file in the project root (already in `.gitignore`):

```bash
# Paste the full contents of the downloaded JSON key on a single line
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"prostars-dev@....iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

SECRET_KEY=any-long-random-string-for-local-dev
```

Or generate it from the downloaded JSON file:

```bash
echo "GOOGLE_CREDENTIALS=$(cat /path/to/downloaded-key.json | tr -d '\n')" >> .env
echo "SECRET_KEY=local-dev-secret" >> .env
```

Restart Flask and the app will pick up the credentials automatically.

---

## Dependencies

Dependencies are managed with [uv](https://docs.astral.sh/uv/). See `pyproject.toml`.

```bash
uv sync          # install all deps (including dev)
uv sync --no-dev # install production deps only
uv add <package> # add a new dependency
```

---

## Docker

Build locally for testing:

```bash
docker build --target prod-stage -t prostars:local .
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e SECRET_KEY=dev-local-key \
  -e GOOGLE_CREDENTIALS="$(cat /path/to/service-account.json)" \
  prostars:local
```

Production deployments are handled automatically via GitHub → Cloud Run CI. No manual image push needed.

---

## GCP Cloud Run Deployment

**GCP project:** `prostars-369222` · **Region:** `us-west1`

Deployments are triggered automatically — every push to the connected branch rebuilds and redeploys.

### Services

| Service | Branch | URL |
|---------|--------|-----|
| `prostars-new` | `main` | `theprostars.ca`, `www.theprostars.ca` |
| `prostars-dev` | `dev` | `dev.theprostars.ca` |

### First deploy (one-time setup via GCP Console)

1. GCP Console → **Cloud Run** → **Create Service**
2. Choose **"Continuously deploy from a repository"** → connect GitHub → select `nstoik/prostars`
3. Branch: `main` or `dev` · Build type: **Dockerfile**
4. Region: `us-west1`
5. Under **Variables & Secrets** → **Secrets** section, click **Reference a Secret** for each:

| Variable | Secret | Version |
|---|---|---|
| `GOOGLE_CREDENTIALS` | `GOOGLE_CREDENTIALS` (use `prostars-prod` SA key) | `latest` |
| `SECRET_KEY` | `SECRET_KEY` | `latest` |

   Set **Reference method** to **"Exposed as environment variable"** for each, with the environment variable name matching the table above.

6. **Grant the service's runtime service account access to each secret** (easy to miss — without this the deploy succeeds but the container fails to start):
   - Secret Manager → select the secret → **Permissions** tab → **Grant Access**
   - Principal: the service's runtime SA (see service's **Security** tab; typically `prostars-prod@prostars-369222.iam.gserviceaccount.com`)
   - Role: **Secret Manager Secret Accessor**

7. Allow unauthenticated requests → **Deploy**
8. **Set Artifact Registry cleanup policy** (prevents accumulating old images and hitting the 0.5 GB free tier):
   - Artifact Registry → select the repository created for this service → Edit → Cleanup policies → Add policy
   - Type: **Keep most recent versions** · Count: `3` → Save

The service gets a `*.run.app` URL automatically. To use a custom domain, go to Cloud Run → service → **Custom domains**.

### Service accounts

**Sheets access — local dev** (`prostars-dev@prostars-369222.iam.gserviceaccount.com`)
Used for local development only. Credentials stored in `.env` as `GOOGLE_CREDENTIALS`.
To generate a new key: GCP Console → IAM → Service Accounts → prostars-dev → Keys → Add Key → JSON.

**Sheets access — production** (`prostars-prod@prostars-369222.iam.gserviceaccount.com`)
Used by Cloud Run services. Credentials stored in Secret Manager as `GOOGLE_CREDENTIALS`.

**Cloud Build** (`cloud-build@prostars-369222.iam.gserviceaccount.com`)
Required because newer GCP projects do not create the legacy Cloud Build SA automatically.

One-time setup:
1. IAM & Admin → Service Accounts → Create → name: `cloud-build`
2. IAM & Admin → IAM → Grant Access → principal: `cloud-build@prostars-369222.iam.gserviceaccount.com`
   - Role: `Editor`
   - Role: `Service Account User`
3. Cloud Build → Triggers → find the trigger → Edit → set **Service account** to `cloud-build@...` → Save → Run

