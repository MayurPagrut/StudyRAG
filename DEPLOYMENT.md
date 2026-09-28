# Deployment Guide

This repository contains three services:

- `frontend/`: React, TypeScript, and Vite
- `backend/`: Node.js, Express, and TypeScript
- `Rag_project/`: FastAPI, Uvicorn, Gemini, and pgvector

The browser talks only to the Node backend. The Node backend talks to the Python RAG service. Gemini keys and database credentials stay server-side.

## 1. Create PostgreSQL + pgvector

Create one production PostgreSQL database in Supabase or Neon. The provider must support the `vector` extension.

Use the same production `DATABASE_URL` for Node and Python.

Run the Node application schema migration from `backend/`:

```powershell
npm ci
npm run migrate
```

Run the Python RAG schema setup from `Rag_project/`:

```powershell
python -m pip install -r requirements.txt
python scripts/setup_db.py
```

The setup creates the `vector` extension, Python `documents`/`chunks` tables, the 768-dimensional embedding column, and the HNSW vector index. The Node migration creates the separate `app` schema.

For Neon, use the provider's SSL-enabled connection string. The Node backend enables SSL automatically for non-local database URLs; Python receives the SSL settings through the PostgreSQL URL.

## 2. Deploy the Python RAG service on Render

Create a Render service with root directory `Rag_project`.

Build command:

```text
pip install -r requirements.txt
```

Start command:

```text
uvicorn api:app --host 0.0.0.0 --port $PORT
```

Set these environment variables:

```text
NODE_ENV=production
DATABASE_URL=<shared PostgreSQL URL>
GEMINI_API_KEY=<server-side Gemini key>
RAG_REQUIRE_SERVICE_AUTH=true
RAG_SERVICE_TOKEN=<long random service token>
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=768
LLM_MODEL=gemini-3.8-flash
TOP_K=5
HYBRID_RAG_STRONG_THRESHOLD=0.70
HYBRID_RAG_WEAK_THRESHOLD=0.52
HYBRID_MIN_RELEVANT_CHUNKS=1
HYBRID_MIN_CONTEXT_COVERAGE=0.20
CHUNK_SIZE=600
CHUNK_OVERLAP=75
```

Prefer a Render private service or private networking so this service is not reachable by browsers. The service token remains required as defense in depth. `/health` is public for health checks; query and document endpoints require `Authorization: Bearer <RAG_SERVICE_TOKEN>`.

Health check:

```text
GET https://<python-service-domain>/health
```

Expected response:

```json
{"status":"ok"}
```

## 3. Deploy the Node backend on Render

Create a Render web service with root directory `backend`.

Build command:

```text
npm ci && npm run build
```

Start command:

```text
npm start
```

Run the database migration once before serving traffic:

```text
npm run migrate
```

Set these environment variables:

```text
NODE_ENV=production
PORT=<Render-provided PORT, or leave Render to inject it>
CORS_ORIGIN=https://<your-vercel-domain>
DATABASE_URL=<same shared PostgreSQL URL>
DATABASE_SSL=true
JWT_SECRET=<long random secret, at least 32 characters>
JWT_EXPIRES_IN=7d
RAG_MODE=real
PYTHON_RAG_URL=<private/internal Python service URL>
RAG_SERVICE_TOKEN=<same token configured on Python>
RAG_TIMEOUT_MS=60000
RAG_INGEST_TIMEOUT_MS=600000
CHAT_RATE_LIMIT_WINDOW_MS=900000
CHAT_RATE_LIMIT_MAX=30
UPLOAD_RATE_LIMIT_WINDOW_MS=900000
UPLOAD_RATE_LIMIT_MAX=20
UPLOAD_DIR=/var/data/uploads
MAX_UPLOAD_MB=25
```

`RAG_SERVICE_URL` remains supported for local compatibility, but production should use `PYTHON_RAG_URL`.

Health check:

```text
GET https://<node-service-domain>/api/health
```

## 4. Persistent document storage

For this prototype, use a Render persistent disk rather than redesigning the existing upload pipeline around object storage.

Attach a persistent disk to the Node service and mount it at:

```text
/var/data
```

Set:

```text
UPLOAD_DIR=/var/data/uploads
```

The current backend writes files under `UPLOAD_DIR/<documentId>/<filename>`. The Python adapter reads that file and sends its bytes to the Python service, while the vectorized document remains in PostgreSQL.

This keeps the current upload/delete behavior intact and avoids introducing a storage SDK. A persistent disk is appropriate for a single-instance prototype. Move to Supabase Storage or S3-compatible storage before using multiple backend instances or requiring highly durable file archives.

## 5. Deploy the frontend on Vercel

Create a Vercel project rooted at `frontend/`.

Build command:

```text
npm ci && npm run build
```

Output directory:

```text
dist
```

Set this Vercel environment variable before each build:

```text
VITE_API_URL=https://<node-service-domain>/api
```

Only public configuration belongs in `VITE_` variables. Never put database URLs, JWT secrets, Gemini keys, or service tokens in the frontend environment.

`frontend/vercel.json` rewrites BrowserRouter routes to `index.html`, so direct navigation to `/app`, `/admin`, and conversation routes works after deployment.

## 6. CORS and authentication

Set `CORS_ORIGIN` to the exact Vercel origin. Multiple origins can be comma-separated:

```text
CORS_ORIGIN=https://study-desk.example,https://preview.example
```

The application uses bearer JWTs in the `Authorization` header. The deployed frontend must use HTTPS. Keep `JWT_SECRET` stable across backend restarts and instances.

Admin document routes remain protected by the existing authentication and admin middleware.

## 7. Streaming

The browser uses authenticated `fetch()` and reads the NDJSON stream from:

```text
POST /api/chat/stream
```

The Node backend streams from Python and forwards answer tokens. Keep proxy buffering disabled where the hosting configuration exposes that option. The application already sends `Content-Type: application/x-ndjson` and `Cache-Control: no-cache`.

Verify streaming after deployment rather than assuming the hosting proxy preserves flush timing.

## 8. Health and smoke checks

Run these checks after all three services are configured:

```text
GET https://<python-service-domain>/health
GET https://<node-service-domain>/api/health
```

Then verify:

1. Register and log in as a normal user.
2. Confirm normal users cannot access admin document routes.
3. Log in as an admin.
4. Upload a PDF.
5. Wait for `processing` to become `ready`.
6. Ask a document-grounded question and verify sources.
7. Ask a general question and verify LLM mode with no document sources.
8. Ask a partially covered question and verify hybrid mode.
9. Verify `/api/chat/stream` shows progressive tokens and sources at the end.
10. Delete the document and verify it is removed from the managed list and RAG index.
11. Restart the Node service and confirm stored documents remain available through PostgreSQL and the persistent disk.

## 9. Operational safeguards

Before making the application public:

- Keep the Python service private or require the service token.
- Keep Gemini and database credentials only in Render environment variables.
- Keep `CORS_ORIGIN` restricted to known frontend domains.
- Retain the chat and upload rate limits, then tune them using request metrics.
- Monitor Gemini quota, latency, and errors.
- Configure backups for PostgreSQL.
- Use a persistent disk for the current upload implementation.
- Do not commit `.env` files or generated `dist`/`node_modules` directories.

This document is a preparation guide only. It does not deploy services or create cloud resources.
