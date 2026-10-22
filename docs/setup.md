# Setup Instructions

These steps describe the current local development workflow on Windows PowerShell. Use the versions and dependency pins in the repository's own dependency files as the source of truth.

## Prerequisites

Install Git, a Python version supported by the existing analyzer (the development environment has used Python 3.8), Node.js with npm, and Docker Desktop with Docker Compose enabled. Some legacy analyzer or PDF dependencies may require OS-specific libraries.

## 1. Clone the repository

If you do not already have a working copy:

```powershell
git clone https://github.com/Brenisdone/GDPR-Analyzer.git
cd GDPR-Analyzer
```

If you already have the project locally, use its existing directory instead of cloning over it.

## 2. Create or activate the Python environment

If the existing environment works, activate it from the repository root:

```powershell
.\venv\Scripts\Activate.ps1
```

If you need to create a new one, use a supported Python installation. For Python 3.8:

```powershell
py -3.8 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

Install dependencies declared by the repository first, for example through its `requirements.txt` if one is provided. The API requires FastAPI, Uvicorn, SQLAlchemy, psycopg, and Pydantic settings; if they are not already included in the project's dependency file, install them in the activated environment:

```powershell
python -m pip install fastapi "uvicorn[standard]" sqlalchemy "psycopg[binary]" pydantic-settings
```

Avoid upgrading legacy analyzer dependencies indiscriminately: version changes may break the original scanner or report generation. PDF generation may depend on native libraries that are not automatically available on Windows.

## 3. Configure environment variables

Create a .env file in the repository root, alongside compose.yaml:

```powershell
POSTGRES_PASSWORD=your-local-database-password
DATABASE_URL=postgresql+psycopg://gdpr_user:your-local-database-password@127.0.0.1:5432/gdpr_analyzer
```

Use the same password in both variables and ensure the database username, database name, and port match compose.yaml. URL-encode special characters in the password if necessary.

Docker Compose reads .env for variable substitution, while the API loads DATABASE_URL through python-dotenv in api/database.py. Ensure the Compose PostgreSQL service references ${POSTGRES_PASSWORD}.

Keep .env out of version control by adding it to .gitignore. An optional .env.example can document the required variables using placeholder values.

## 4. Install npm dependencies

From the frontend folder, install the frontend dependencies:

```powershell
npm install --prefix frontend
```

## 5. Start the application

From the frontend folder, with the Python virtual environment activated, run:

```powershell
npm run dev
```

This starts the backend and frontend concurrently. The backend script starts PostgreSQL through Docker Compose before launching FastAPI with Uvicorn's reload mode. The frontend script starts the React + Vite development server.

The available npm scripts are:
| Command | Purpose |
|---|---|
|npm run db	| Start PostgreSQL using Docker Compose |
|npm run backend |	Start the database service and FastAPI |
|npm run frontend |	Start the React + Vite frontend |
|npm run dev | Start the backend and frontend together |

Keep the development terminal open while using the application.

Verify the API health endpoint at `http://127.0.0.1:8000/api/health` and open the interactive API reference at `http://127.0.0.1:8000/docs`. Open the local URL shown by Vite, normally `http://localhost:5173`.

Confirm that frontend/vite.config.js proxies /api requests to `http://127.0.0.1:8000`.

PostgreSQL continues running in Docker after the application processes are stopped. To stop PostgreSQL without deleting its stored data:

```powershell
docker compose stop postgres
```

Open the local URL shown by Vite, normally `http://localhost:5173`. Confirm `frontend/vite.config.js` proxies `/api` to `http://127.0.0.1:8000`.

## 6. Test the integrated workflow

1. Open the dashboard in your browser.
2. Submit a public site you own or are authorized to assess.
3. Wait for the API request to complete.
4. Review the overall grade, each assessment module, transmission-security details, and history.
5. Open a historical scan to confirm persistence.
6. Download the JSON and PDF reports for the same scan and compare them with the dashboard's data.

Do not interpret an empty findings collection as proof that no cookies or tracking technologies exist; the analyzer's detection coverage and error behavior determine what an empty field means.

## Useful commands

```powershell
# Start the entire application
npm run dev

# Start only PostgreSQL
npm run db

# Start the backend, including PostgreSQL
npm run backend

# Start only the frontend
npm run frontend

# Inspect PostgreSQL status and logs
docker compose ps
docker compose logs -f postgres

# Stop PostgreSQL without deleting stored data
docker compose stop postgres

# Check local Git changes
git status --short
```

Avoid `docker compose down -v` unless you intentionally want to delete the database volume and all data stored in it.

## Troubleshooting

- **API cannot reach PostgreSQL:** check container health, port mapping, database name, username, and `DATABASE_URL`. Make sure the password used by the database container is the same one in the connection string.
- **Frontend cannot reach API:** confirm that both servers are running and inspect `frontend/vite.config.js` for the `/api` proxy.
- **A target scan fails:** check the API terminal traceback and confirm the target is publicly reachable. Some sites block automated requests, use bot defenses, or rely on JavaScript to populate content.
- **PDF report generation fails:** inspect the traceback and the report library's native dependency requirements before reinstalling packages or changing versions.
- **Package installation fails:** confirm the active Python version and use the repository's pinned dependencies where available.
