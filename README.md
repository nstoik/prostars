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

Build the dev image:

```bash
docker build --tag nstoik/prostars:dev --target dev-stage .
```

Build the production image:

```bash
docker build --tag nstoik/prostars:latest --target prod-stage .
```

Push to Docker Hub:

```bash
docker push nstoik/prostars:latest
```

---

## GCP Cloud Run Deployment

**GCP project:** `prostars-369222` · **Region:** `us-west1`

Deployments are triggered automatically via GitHub integration — every push to `main` rebuilds and redeploys.

### First deploy (one-time setup via GCP Console)

1. GCP Console → **Cloud Run** → **Create Service**
2. Choose **"Continuously deploy from a repository"** → connect GitHub → select `nstoik/prostars`
3. Branch: `main` · Build type: **Dockerfile** · Docker target: `prod-stage`
4. Service name: `prostars-new` (keeps it separate from the existing live service)
5. Region: `us-west1`
6. Under **Variables & Secrets**, add:

| Variable | Value |
|---|---|
| `GOOGLE_CREDENTIALS` | Full contents of the service account JSON (no surrounding quotes) |
| `SECRET_KEY` | A long random string |

7. Allow unauthenticated requests → **Deploy**

The service gets a `*.run.app` URL automatically. To use a custom domain, go to Cloud Run → service → **Custom domains**.

### Service account

Email: `prostars-dev@prostars-369222.iam.gserviceaccount.com`

To generate a new key: GCP Console → IAM → Service Accounts → prostars-dev → Keys → Add Key → JSON.
