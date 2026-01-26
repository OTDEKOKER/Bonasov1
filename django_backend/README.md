# BONASO Data Portal - Django Backend

A Django REST Framework backend for the BONASO Data Portal system.

## Quick Start

### 1. Create Virtual Environment

```bash
cd django_backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy example env file
copy .env.example .env  # Windows
cp .env.example .env    # Mac/Linux

# Edit .env and set your SECRET_KEY
```

### 4. Run Setup

```bash
python setup.py
```

Or manually:
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 5. Start Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## API Endpoints

| App | Base URL | Description |
|-----|----------|-------------|
| Auth | `/api/users/` | JWT authentication, login, logout |
| Organizations | `/api/organizations/` | Organization management |
| Users | `/api/users/` | User management |
| Indicators | `/api/indicators/` | Indicators & assessments |
| Projects | `/api/manage/` | Projects, tasks, deadlines |
| Respondents | `/api/record/` | Respondent data & interactions |
| Events | `/api/activities/` | Event management |
| Social | `/api/social/` | Social media posts |
| Aggregates | `/api/aggregates/` | Aggregate data |
| Flags | `/api/flags/` | Data quality flags |
| Analysis | `/api/analysis/` | Reports & analytics |
| Profiles | `/api/profiles/` | User profiles |
| Uploads | `/api/uploads/` | File uploads |
| Messages | `/api/messages/` | Internal messaging |

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Login
```bash
POST /api/users/request-token/
{
    "username": "your_username",
    "password": "your_password"
}
```

Response:
```json
{
    "access": "eyJ...",
    "refresh": "eyJ..."
}
```

### Using the Token
Include the access token in the Authorization header:
```
Authorization: Bearer eyJ...
```

### Refresh Token
```bash
POST /api/users/token/refresh/
{
    "refresh": "eyJ..."
}
```

## Project Structure

```
django_backend/
├── core/                 # Project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── users/                # User management & auth
├── organizations/        # Organization hierarchy
├── indicators/           # Indicators & assessments
├── projects/             # Projects, tasks, deadlines
├── respondents/          # Respondent data
├── events/               # Events & participants
├── social/               # Social media tracking
├── aggregates/           # Aggregate data entry
├── flags/                # Data quality flags
├── analysis/             # Reports & analytics
├── profiles/             # User profiles & settings
├── uploads/              # File management
├── messaging/            # Internal messaging
├── manage.py
└── requirements.txt
```

## Connecting to Frontend

1. Start the Django backend on port 8000
2. In your Next.js frontend, create `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```
3. Start the frontend with `npm run dev`

## Production Deployment

1. Set `DEBUG=False` in `.env`
2. Configure PostgreSQL database
3. Set proper `ALLOWED_HOSTS`
4. Run `python manage.py collectstatic`
5. Use Gunicorn: `gunicorn core.wsgi:application`
