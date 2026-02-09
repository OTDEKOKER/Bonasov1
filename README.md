# BONASO Data Portal

BONASO Data Portal is a web system for managing organizations, projects, indicators, aggregate reporting, and analytics dashboards. It includes:
- **Frontend**: Next.js app in `frontend/`
- **Backend**: Django REST API in `c:\Projects\django_backend`

This document provides **high‑level module documentation** for the main components and how they work together.

## Quickstart

### Backend (Django)
1. Open a terminal and go to `c:\Projects\django_backend`.
2. Create and activate a virtual environment.
3. Install dependencies and run migrations.
4. Start the server:
```bash
python manage.py runserver 0.0.0.0:8000
```

### Frontend (Next.js)
1. Open a terminal and go to `frontend/`.
2. Install dependencies:
```bash
npm install
```
3. Create `.env` with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```
4. Start the frontend:
```bash
npm run dev
```

## Architecture

The system is organized around **Organizations**, **Projects**, and **Indicators**.
- Organizations can have **parent/child** relationships (coordinators and sub‑grantees).
- Projects contain **Tasks** and **Deadlines**.
- **Tasks** are **Indicators**; indicators can be shared across multiple organizations.
- Aggregate reporting captures indicator values per organization and period.
- Dashboards visualize indicators across time and organizations.

## UI

### Dashboard
**Purpose**: Overview of system activity and key stats.  
**Key capabilities**:
- Summary counts (respondents, projects, assessments, indicators).
- Recent activity.
**Backend endpoints**:
- `GET /api/analysis/dashboard/overview/`

### Organizations
**Purpose**: Manage organizations and hierarchies.  
**Key capabilities**:
- Create/update organizations.
- Assign parent organizations (coordinator/sub‑grantee).
- View organization details, indicators, users, and related activity.
**Backend endpoints**:
- `GET /api/organizations/`
- `GET /api/organizations/:id/`

### Projects
**Purpose**: Manage projects and their participating organizations.  
**Key capabilities**:
- Create/update projects.
- Assign organizations to projects.
- View project tasks and deadlines.
- Tasks are indicator‑based.
**Backend endpoints**:
- `GET /api/manage/projects/`
- `GET /api/manage/projects/:id/`

### Tasks (Indicators as Tasks)
**Purpose**: Track indicator work items under projects.  
**Key capabilities**:
- Tasks displayed as indicators.
- Due dates aligned to project end date.
**Backend endpoints**:
- `GET /api/manage/tasks/`

### Deadlines
**Purpose**: Track project deadlines.  
**Key capabilities**:
- Add deadlines per project.
- View upcoming deadlines on dashboards.
**Backend endpoints**:
- `GET /api/manage/deadlines/`

### Indicators
**Purpose**: Define metrics that are tracked by organizations/projects.  
**Key capabilities**:
- Create indicators and assign to organizations.
- Link indicators to projects as tasks.
- Indicators may be collected through aggregate data or assessments.
**Backend endpoints**:
- `GET /api/indicators/`
- `GET /api/indicators/categories/`

### Aggregates
**Purpose**: Capture periodic totals for indicators (including disaggregation).  
**Key capabilities**:
- Add aggregate entries per org/project/indicator and period.
- Import/export data from Excel.
- Display matrix views (KP x Sex x Age).
**Backend endpoints**:
- `GET /api/aggregates/`
- `POST /api/aggregates/bulk/`

### Reports
**Purpose**: Generate and manage reports.  
**Key capabilities**:
- Create reports for indicators/projects/custom.
- Download report outputs.
- Save report configuration for reuse.
**Backend endpoints**:
- `GET /api/analysis/reports/`
- `POST /api/analysis/reports/`
- `GET /api/analysis/reports/:id/download/`

### Analysis Dashboards
**Purpose**: Explore indicator trends and comparisons.  
**Key capabilities**:
- Multi‑indicator trend comparison.
- Filters by organization, project, and period.
- Chart types: line, bar, area, pie.
- Save charts per user and allow sharing.
**Backend endpoints**:
- `GET /api/analysis/trends/:indicator_id/`
- `GET /api/analysis/trends/?indicator_ids=1,2,...`

### Respondents & Interactions
**Purpose**: Capture individual respondent data and interactions.  
**Key capabilities**:
- Register respondents.
- Record interactions and services.
**Backend endpoints**:
- `GET /api/record/respondents/`
- `GET /api/record/interactions/`

### Events
**Purpose**: Track events (commemorations, trainings, activities).  
**Key capabilities**:
- Create events, log participants.
- Link event indicators where applicable.
**Backend endpoints**:
- `GET /api/activities/events/`

### Social
**Purpose**: Track social media or outreach activities.  
**Backend endpoints**:
- `GET /api/social/posts/`

### Flags
**Purpose**: Data quality and follow‑up tracking.  
**Backend endpoints**:
- `GET /api/flags/`
- `POST /api/flags/run-checks/`

### Users & Auth
**Purpose**: User accounts and roles.  
**Key capabilities**:
- JWT login.
- Role‑based access (admin vs org user).
- Assign users to organizations.
**Backend endpoints**:
- `POST /api/users/request-token/`
- `GET /api/users/`
- `GET /api/users/me/`

### Profiles, Uploads, Messaging
**Purpose**: Supporting modules for user settings, file uploads, and internal messages.  
**Backend endpoints**:
- `GET /api/profiles/`
- `GET /api/uploads/`
- `GET /api/messages/`

## Data Flow (High‑Level)
1. **Organizations** are created with parent/child structure.
2. **Indicators** are created and assigned to organizations.
3. **Projects** are created and organizations assigned.
4. **Tasks** appear as indicators for the project organizations.
5. **Aggregates** or **Assessments** capture indicator values.
6. **Dashboards** read aggregate data and show trend charts.

## API
### Authentication
- `POST /api/users/request-token/` for login
- `POST /api/users/token/refresh/` to refresh access tokens
- `GET /api/users/me/` for current user

### Organizations
- `GET /api/organizations/`
- `GET /api/organizations/:id/`

### Projects, Tasks, Deadlines
- `GET /api/manage/projects/`
- `GET /api/manage/projects/:id/`
- `GET /api/manage/tasks/`
- `GET /api/manage/deadlines/`

### Indicators
- `GET /api/indicators/`
- `GET /api/indicators/categories/`

### Aggregates
- `GET /api/aggregates/`
- `POST /api/aggregates/bulk/`

### Analysis and Reports
- `GET /api/analysis/dashboard/overview/`
- `GET /api/analysis/trends/:indicator_id/`
- `GET /api/analysis/trends/?indicator_ids=1,2,...`
- `GET /api/analysis/reports/`
- `POST /api/analysis/reports/`
- `GET /api/analysis/reports/:id/download/`

### Respondents and Interactions
- `GET /api/record/respondents/`
- `GET /api/record/interactions/`

### Events
- `GET /api/activities/events/`

### Social, Flags, Messages
- `GET /api/social/posts/`
- `GET /api/flags/`
- `POST /api/flags/run-checks/`
- `GET /api/messages/`

## Data Model
### Core Entities
- **Organization**: Can be a coordinator or sub‑grantee. Supports parent/child structure.
- **Project**: Contains participating organizations, tasks, and deadlines.
- **Indicator**: Metric definition; indicators can be assigned to multiple organizations.
- **Aggregate**: Time‑bounded data entry for an indicator, optionally disaggregated.
- **User**: System user with roles and optional organization assignment.

### Relationships
- Organization ⟶ Organization: parent/child for hierarchy.
- Project ⟶ Organization: many‑to‑many (participating orgs).
- Indicator ⟶ Organization: many‑to‑many.
- Aggregate ⟶ Indicator: many‑to‑one.
- Aggregate ⟶ Organization: many‑to‑one.
- Aggregate ⟶ Project: many‑to‑one.

## Deployment
### Backend
1. Set `DEBUG=False` in `.env`
2. Configure PostgreSQL settings
3. Set `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
4. Run:
```bash
python manage.py migrate
python manage.py collectstatic
```
5. Run with Gunicorn:
```bash
gunicorn core.wsgi:application
```

### Frontend
1. Set `NEXT_PUBLIC_API_URL` to your production API
2. Build:
```bash
npm run build
```
3. Start:
```bash
npm run start
```

## Environment
Key variables:
- Backend: `.env` in `c:\Projects\django_backend`
- Frontend: `frontend/.env`

Frontend requires:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Troubleshooting
Common issues:
- **401 Unauthorized**: Token expired. Log in again.
- **No organizations**: Ensure correct API URL and login token. Check `/api/organizations/`.
- **DisallowedHost**: Add new IP to `ALLOWED_HOSTS` in backend `.env`.
- **CORS errors**: Update `CORS_ALLOWED_ORIGINS` in backend `.env`.

## Ownership of Changes
This documentation is intentionally **high‑level** and meant to be updated as modules evolve. If you want full API specs or per‑component UI docs, we can expand module by module.
