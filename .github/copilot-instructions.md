<<<<<<< HEAD
<!-- Copilot / AI agent instructions for the BONASO Data Portal repo -->
# BONASO — Copilot Instructions

Purpose: give an AI coding agent the immediately useful, repo-specific knowledge
so it can make safe, accurate edits without broad guessing.

1) Big picture
- Backend: Django REST API in the `django_backend` folder. Main entrypoint: `django_backend/manage.py`.
- Frontend: Next.js app in the `frontend` folder (dev via `npm run dev`). See `frontend/package.json`.
- API base: `/api/` (see `django_backend/README.md`).

2) Key files and configuration
- Settings: `django_backend/core/settings.py` — environment-driven; default SQLite, set `USE_POSTGRES=True` to use Postgres.
- Requirements: `django_backend/requirements.txt`.
- Custom user model: `AUTH_USER_MODEL = 'users.User'` (see `django_backend/core/settings.py`).
- Environment: copy `.env.example` to `.env` and edit SECRET_KEY, DEBUG, DB_* (see `django_backend/README.md`).

3) Authentication & API patterns
- JWT auth via `djangorestframework-simplejwt` and `djoser`. Token endpoints used by frontend:
  - `POST /api/users/request-token/` (login)
  - `POST /api/users/token/refresh/` (refresh)
- Use `Authorization: Bearer <access-token>` header on authenticated requests.
- Default DRF permission: `IsAuthenticated` and pagination `PAGE_SIZE=20` (change in `django_backend/core/settings.py`).

4) Local dev workflow (concrete commands)
- Create venv, install deps, run setup (from repo root):
  ```powershell
  cd django_backend
  python -m venv venv
  venv\Scripts\activate   # Windows
  pip install -r requirements.txt
  copy .env.example .env   # edit .env
  python setup.py          # runs migrations + initial setup
  python manage.py runserver
  ```
- Frontend dev (from `frontend`):
  ```bash
  cd frontend
  npm install
  # set NEXT_PUBLIC_API_URL=http://localhost:8000/api in .env.local
  npm run dev
  ```

5) Project conventions and patterns (observed)
- App-per-domain: there is one Django app per domain area (`users`, `projects`, `respondents`, `analysis`, etc.). Add APIs inside the appropriate app and register routes in its `urls.py`.
- Serializers & routers: apps follow DRF serializer + viewset patterns (see `users/serializers.py` and other apps).
- Migrations: the project uses Django migrations; always run `python manage.py makemigrations` then `migrate` when models change.
- Static files served with WhiteNoise in production; call `python manage.py collectstatic` before deploying (see `django_backend/core/settings.py`).

6) Integration & deployment notes
- Default DB is SQLite (`db.sqlite3`) for local dev; production expects Postgres when `USE_POSTGRES=True`.
- Production static serving: `python manage.py collectstatic` + Gunicorn: `gunicorn core.wsgi:application`.

7) What to watch for when editing code
- The project uses a custom `User` model. Changing auth/user fields requires careful migration ordering and migrations testing.
- Many apps are included in `INSTALLED_APPS` — adding/removing apps requires updating `django_backend/core/settings.py` and may affect migrations.
- DRF settings (authentication, permissions, pagination, filters) are centralized in `django_backend/core/settings.py` — change there unless intentionally overriding.

8) Quick references (examples)
- API prefixes: `/api/users/`, `/api/organizations/`, `/api/manage/`, `/api/record/`, `/api/activities/`.
- Token example: `POST /api/users/request-token/` returns JSON `{ "access": "...", "refresh": "..." }`.

9) Edit rules for the AI agent
- Prefer minimal, focused changes. Run migrations locally for model changes and update tests if present.
- Preserve environment-driven behavior: when adding infra changes, update `.env.example` accordingly.
- Don't change production-sensitive defaults (e.g., `DEBUG=False`) without explicit instruction.

10) If you need more context
- Inspect `django_backend/core/settings.py`, `django_backend/manage.py`, and the app folder for the area you're editing (for example, `users/`, `projects/`).
- Ask the maintainer for deploy credentials or secrets; do not guess production values.

If anything above is unclear or you'd like more detailed examples (routes, serializer shapes, or a small change implemented), tell me which area to expand.
<!-- Copilot / AI agent instructions for the BONASO Data Portal repo -->
# BONASO — Copilot Instructions

Purpose: give an AI coding agent the immediately useful, repo-specific knowledge
so it can make safe, accurate edits without broad guessing.

1) Big picture
 - Backend: Django REST API in the `django_backend` folder. Main entrypoint: [manage.py](../django_backend/manage.py#L1).
 - Frontend: Next.js app in `frontend` (dev via `npm run dev`). See [frontend/package.json](../frontend/package.json#L1).
 - API base: `/api/` (see [django_backend/README.md](../django_backend/README.md#L1)).

2) Key files and configuration
 - Settings: [django_backend/core/settings.py](../django_backend/core/settings.py#L1) — environment-driven; default SQLite, set `USE_POSTGRES=True` to use Postgres.
 - Requirements: [django_backend/requirements.txt](../django_backend/requirements.txt#L1).
 - Custom user model: `AUTH_USER_MODEL = 'users.User'` (see [core/settings.py](../django_backend/core/settings.py#L1)).
 - Environment: copy `.env.example` to `.env` and edit SECRET_KEY, DEBUG, DB_* (see [django_backend/README.md](../django_backend/README.md#L1)).

3) Authentication & API patterns
 - JWT auth via `djangorestframework-simplejwt` and `djoser`. Token endpoints used by frontend:
  - `POST /api/users/request-token/` (login)
  - `POST /api/users/token/refresh/` (refresh)
 - Use `Authorization: Bearer <access-token>` header on authenticated requests.
 - Default DRF permission: `IsAuthenticated` and pagination `PAGE_SIZE=20` (change in [core/settings.py](../django_backend/core/settings.py#L1)).

4) Local dev workflow (concrete commands)
- Create venv, install deps, run setup (from repo root):
  ```powershell
  cd django_backend
  python -m venv venv
  venv\Scripts\activate   # Windows
  pip install -r requirements.txt
  copy .env.example .env   # edit .env
  python setup.py          # runs migrations + initial setup
  python manage.py runserver
  ```
- Frontend dev (from `frontend`):
  ```bash
  cd frontend
  npm install
  # set NEXT_PUBLIC_API_URL=http://localhost:8000/api in .env.local
  npm run dev
  ```

5) Project conventions and patterns (observed)
- App-per-domain: there is one Django app per domain area (`users`, `projects`, `respondents`, `analysis`, etc.). Add APIs inside the appropriate app and register routes in its `urls.py`.
- Serializers & routers: apps follow DRF serializer + viewset patterns (see `users/serializers.py` and other apps).
- Migrations: the project uses Django migrations; always run `python manage.py makemigrations` then `migrate` when models change.
- Static files served with WhiteNoise in production; call `collectstatic` before deploying (see `core/settings.py`).

6) Integration & deployment notes
- Default DB is SQLite (file `db.sqlite3`) for local dev; production expects Postgres when `USE_POSTGRES=True`.
- Production static serving: `python manage.py collectstatic` + Gunicorn: `gunicorn core.wsgi:application`.

7) What to watch for when editing code
- The project uses a custom `User` model. Changing auth/user fields requires careful migration ordering.
- Many apps are included in `INSTALLED_APPS` — adding/removing apps requires updating `core/settings.py` and may affect migrations.
- DRF settings (authentication, permissions, pagination, filters) are centralized in `core/settings.py` — change there, not per-view unless intentional.

8) Quick references (examples)
 - API root prefix: see `django_backend/README.md` — common app prefixes: `/api/users/`, `/api/organizations/`, `/api/manage/`, `/api/record/`, `/api/activities/`.
- Token example: `POST /api/users/request-token/` returns JSON `{ "access": "...", "refresh": "..." }`.

9) Edit rules for the AI agent
- Prefer minimal, focused changes. Run migrations locally for model changes and update tests if present.
- Preserve environment-driven behavior: when adding infra changes, ensure `.env.example` is updated.
- Don't change production-sensitive defaults (e.g., set `DEBUG=False`) without explicit task instruction.

10) If you need more context
- Inspect `core/settings.py`, `manage.py`, and the app folder for the area you're editing (for example, `users/`, `projects/`).
- Ask the maintainer for database credentials or deployment secrets; do not attempt to guess production values.

If anything above is unclear or you'd like more detailed examples (routes, serializer shapes, or a small change implemented), tell me which area to expand. 
=======
# BONASO — Instructions


1) Big picture
- Backend: Django REST API in the `django_backend` folder. Main entrypoint: `django_backend/manage.py`.
- Frontend: Next.js app in the `frontend` folder (dev via `npm run dev`). See `frontend/package.json`.
- API base: `/api/` (see `django_backend/README.md`).

2) Key files and configuration
- Settings: `django_backend/core/settings.py` — environment-driven; default SQLite, set `USE_POSTGRES=True` to use Postgres.
- Requirements: `django_backend/requirements.txt`.
- Custom user model: `AUTH_USER_MODEL = 'users.User'` (see `django_backend/core/settings.py`).
- Environment: copy `.env.example` to `.env` and edit SECRET_KEY, DEBUG, DB_* (see `django_backend/README.md`).

3) Authentication & API patterns
- JWT auth via `djangorestframework-simplejwt` and `djoser`. Token endpoints used by frontend:
  - `POST /api/users/request-token/` (login)
  - `POST /api/users/token/refresh/` (refresh)
- Use `Authorization: Bearer <access-token>` header on authenticated requests.
- Default DRF permission: `IsAuthenticated` and pagination `PAGE_SIZE=20` (change in `django_backend/core/settings.py`).

4) Local dev workflow (concrete commands)
- Create venv, install deps, run setup (from repo root):
  ```powershell
  cd django_backend
  python -m venv venv
  venv\Scripts\activate   # Windows
  pip install -r requirements.txt
  copy .env.example .env   # edit .env
  python setup.py          # runs migrations + initial setup
  python manage.py runserver
  ```
- Frontend dev (from `frontend`):
  ```bash
  cd frontend
  npm install
  # set NEXT_PUBLIC_API_URL=http://localhost:8000/api in .env.local
  npm run dev
  ```

5) Project conventions and patterns (observed)
- App-per-domain: there is one Django app per domain area (`users`, `projects`, `respondents`, `analysis`, etc.). Add APIs inside the appropriate app and register routes in its `urls.py`.
- Serializers & routers: apps follow DRF serializer + viewset patterns (see `users/serializers.py` and other apps).
- Migrations: the project uses Django migrations; always run `python manage.py makemigrations` then `migrate` when models change.
- Static files served with WhiteNoise in production; call `python manage.py collectstatic` before deploying (see `django_backend/core/settings.py`).

6) Integration & deployment notes
- Default DB is SQLite (`db.sqlite3`) for local dev; production expects Postgres when `USE_POSTGRES=True`.
- Production static serving: `python manage.py collectstatic` + Gunicorn: `gunicorn core.wsgi:application`.

7) What to watch for when editing code
- The project uses a custom `User` model. Changing auth/user fields requires careful migration ordering and migrations testing.
- Many apps are included in `INSTALLED_APPS` — adding/removing apps requires updating `django_backend/core/settings.py` and may affect migrations.
- DRF settings (authentication, permissions, pagination, filters) are centralized in `django_backend/core/settings.py` — change there unless intentionally overriding.

8) Quick references (examples)
- API prefixes: `/api/users/`, `/api/organizations/`, `/api/manage/`, `/api/record/`, `/api/activities/`.
- Token example: `POST /api/users/request-token/` returns JSON `{ "access": "...", "refresh": "..." }`.

9) Edit rules
- Prefer minimal, focused changes. Run migrations locally for model changes and update tests if present.
- Preserve environment-driven behavior: when adding infra changes, update `.env.example` accordingly.
- Don't change production-sensitive defaults (e.g., `DEBUG=False`) without explicit instruction.

10) If you need more context
- Inspect `django_backend/core/settings.py`, `django_backend/manage.py`, and the app folder for the area you're editing (for example, `users/`, `projects/`).
- Ask the maintainer for deploy credentials or secrets; do not guess production values.

# BONASO — Instructions

1) Big picture
 - Backend: Django REST API in the `django_backend` folder. Main entrypoint: [manage.py](../django_backend/manage.py#L1).
 - Frontend: Next.js app in `frontend` (dev via `npm run dev`). See [frontend/package.json](../frontend/package.json#L1).
 - API base: `/api/` (see [django_backend/README.md](../django_backend/README.md#L1)).

2) Key files and configuration
 - Settings: [django_backend/core/settings.py](../django_backend/core/settings.py#L1) — environment-driven; default SQLite, set `USE_POSTGRES=True` to use Postgres.
 - Requirements: [django_backend/requirements.txt](../django_backend/requirements.txt#L1).
 - Custom user model: `AUTH_USER_MODEL = 'users.User'` (see [core/settings.py](../django_backend/core/settings.py#L1)).
 - Environment: copy `.env.example` to `.env` and edit SECRET_KEY, DEBUG, DB_* (see [django_backend/README.md](../django_backend/README.md#L1)).

3) Authentication & API patterns
 - JWT auth via `djangorestframework-simplejwt` and `djoser`. Token endpoints used by frontend:
  - `POST /api/users/request-token/` (login)
  - `POST /api/users/token/refresh/` (refresh)
 - Use `Authorization: Bearer <access-token>` header on authenticated requests.
 - Default DRF permission: `IsAuthenticated` and pagination `PAGE_SIZE=20` (change in [core/settings.py](../django_backend/core/settings.py#L1)).

4) Local dev workflow (concrete commands)
- Create venv, install deps, run setup (from repo root):
  ```powershell
  cd django_backend
  python -m venv venv
  venv\Scripts\activate   # Windows
  pip install -r requirements.txt
  copy .env.example .env   # edit .env
  python setup.py          # runs migrations + initial setup
  python manage.py runserver
  ```
- Frontend dev (from `frontend`):
  ```bash
  cd frontend
  npm install
  # set NEXT_PUBLIC_API_URL=http://localhost:8000/api in .env.local
  npm run dev
  ```

5) Project conventions and patterns (observed)
- App-per-domain: there is one Django app per domain area (`users`, `projects`, `respondents`, `analysis`, etc.). Add APIs inside the appropriate app and register routes in its `urls.py`.
- Serializers & routers: apps follow DRF serializer + viewset patterns (see `users/serializers.py` and other apps).
- Migrations: the project uses Django migrations; always run `python manage.py makemigrations` then `migrate` when models change.
- Static files served with WhiteNoise in production; call `collectstatic` before deploying (see `core/settings.py`).

6) Integration & deployment notes
- Default DB is SQLite (file `db.sqlite3`) for local dev; production expects Postgres when `USE_POSTGRES=True`.
- Production static serving: `python manage.py collectstatic` + Gunicorn: `gunicorn core.wsgi:application`.

7) What to watch for when editing code
- The project uses a custom `User` model. Changing auth/user fields requires careful migration ordering.
- Many apps are included in `INSTALLED_APPS` — adding/removing apps requires updating `core/settings.py` and may affect migrations.
- DRF settings (authentication, permissions, pagination, filters) are centralized in `core/settings.py` — change there, not per-view unless intentional.

8) Quick references (examples)
 - API root prefix: see `django_backend/README.md` — common app prefixes: `/api/users/`, `/api/organizations/`, `/api/manage/`, `/api/record/`, `/api/activities/`.
- Token example: `POST /api/users/request-token/` returns JSON `{ "access": "...", "refresh": "..." }`.

9) Edit rules
- Prefer minimal, focused changes. Run migrations locally for model changes and update tests if present.
- Preserve environment-driven behavior: when adding infra changes, ensure `.env.example` is updated.
- Don't change production-sensitive defaults (e.g., set `DEBUG=False`) without explicit task instruction.

10) If you need more context
- Inspect `core/settings.py`, `manage.py`, and the app folder for the area you're editing (for example, `users/`, `projects/`).
- Ask the maintainer for database credentials or deployment secrets; do not attempt to guess production values.

If anything above is unclear or you'd like more detailed examples (routes, serializer shapes, or a small change implemented), tell me which area to expand. 
>>>>>>> 451c1fb9bc9f31afc239b246328e477163f1bad8
