# Render Deployment Files for MONEYVERSE 2.0

This directory is ready for Single-URL deployment on Render:

- `build.sh`: Builds both the Vite/React frontend and Python FastAPI backend dependencies.
- `render.yaml`: Blueprint configuration for Render web services.
- `Procfile`: Start command for Render.
- `requirements.txt`: Points to `backend/requirements.txt`.

### Render Web Service Settings:
- **Root Directory**: `moneyverse_2.0`
- **Build Command**: `./build.sh`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT --app-dir backend`
- **Environment Variables**:
  - `PYTHON_VERSION`: `3.11.9`
  - `NODE_VERSION`: `20.11.0`
  - `CORS_ORIGINS`: `*`
  - `DATABASE_URL`: *(Optional)* PostgreSQL connection string
  - `OLLAMA_BASE_URL`: *(Optional)* Remote Ollama server URL
