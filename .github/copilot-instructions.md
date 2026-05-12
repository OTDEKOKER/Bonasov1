<!-- Copilot / AI agent instructions for the BONASO Data Portal repo -->
# BONASO — Copilot Instructions

Purpose: give an AI coding agent the immediately useful, repo-specific knowledge so it can make safe, accurate edits without broad guessing.

## 1) Big picture
- Backend: Django REST API in the `django_backend` folder. Main entrypoint: `django_backend/manage.py`.
- Frontend: Next.js app in the `frontend` folder (dev via `npm run dev`). See `frontend/package.json`.
- API base: `/api/` (see `django_backend/README.md`).

## 2) Key files and configuration
- Settings: `django_backend/core/settings.py` — environment-driven; default SQLite, set `USE_POSTGRES=True` to use Postgres.
- Requirements: `django_backend/requirements.txt`.
- Custom user model: `AUTH_USER_MODEL = 'users.User'`.
- Environment: copy `.env.example` to `.env` and edit `SECRET_KEY`, `DEBUG`, and `DB_*` values.

## 3) Authentication and API patterns
- JWT auth via `djangorestframework-simplejwt` and `djoser`.
- Token endpoints used by the frontend:
  - `POST /api/users/request-token/` for login
  - `POST /api/users/token/refresh/` for refresh
- Use `Authorization: Bearer <access-token>` on authenticated requests.
- Default DRF permission is `IsAuthenticated` and pagination is `PAGE_SIZE=20`.

## 4) Local development workflow
### Backend
```powershell
cd django_backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env   # edit .env
python setup.py          # runs migrations + initial setup
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
# set NEXT_PUBLIC_API_URL=http://localhost:8000/api in .env.local
npm run dev
```

## 5) Project conventions and patterns
- App-per-domain structure: apps such as `users`, `projects`, `respondents`, and `analysis` own their APIs and routes.
- Apps generally follow DRF serializer and viewset patterns.
- When models change, run `python manage.py makemigrations` and `python manage.py migrate`.
- Static files are served with WhiteNoise in production; run `python manage.py collectstatic` before deploying.

## 6) Integration and deployment notes
- Default local database is SQLite (`db.sqlite3`).
- Production expects Postgres when `USE_POSTGRES=True`.
- Production backend serving uses:
  - `python manage.py collectstatic`
  - `gunicorn core.wsgi:application`

## 7) What to watch for when editing code
- The project uses a custom `User` model, so auth or user field changes need careful migration ordering.
- Many apps are registered in `INSTALLED_APPS`; adding or removing apps may affect migrations and startup.
- DRF settings such as authentication, permissions, pagination, and filters are centralized in `django_backend/core/settings.py`.

## 8) Quick references
- Common API prefixes include:
  - `/api/users/`
  - `/api/organizations/`
  - `/api/manage/`
  - `/api/record/`
  - `/api/activities/`
- Example token response from `POST /api/users/request-token/`:
  ```json
  { "access": "...", "refresh": "..." }
  ```

## 9) Edit rules for AI agents
- Prefer minimal, focused changes.
- Run migrations locally for model changes and update tests if present.
- Preserve environment-driven behavior.
- When infra-related settings change, update `.env.example` accordingly.
- Do not change production-sensitive defaults without explicit instruction.

## 10) If more context is needed
- Inspect `django_backend/core/settings.py`, `django_backend/manage.py`, and the relevant app folder.
- Ask the maintainer for deployment credentials or secrets rather than guessing them.
