# BONASO Data Portal - Frontend

## Quickstart
### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Configure environment
Create `frontend/.env` with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Start development server
```bash
npm run dev
```
Open `http://localhost:3000`.

## Architecture
The frontend is a Next.js App Router project:
- `app/` routes for dashboard modules.
- `components/` reusable UI.
- `lib/api/` API client + services.
- `lib/hooks/` SWR hooks.
- `styles/` global styles.

## UI
### Dashboard
Overview stats, active projects, alerts.

### Organizations
List coordinators with sub-grantee dropdowns. Organization detail shows indicators and users.
Layouts are responsive with stacked action buttons on small screens.

### Projects
Project detail shows organizations, deadlines, and indicator-based tasks.
Create dialogs and forms are responsive.

### Indicators
Manage indicator definitions and view where assigned.
Summary stats and create dialogs are responsive.
Categories: HIV Prevention, Non-Communicable Diseases, Events.

### Aggregates
Add aggregate entries, matrix view (KP x Sex x Age), import/export.
Tables are horizontally scrollable on small screens.

### Reports & Analysis
Indicator trend dashboards with multi-indicator charts, chart type selection, and saved charts.
Reports forms, filters, and dialogs are responsive.

### Respondents & Interactions
Respondent profile and interaction tracking. Filters/actions stack on small screens.

### Events
Event tracking with indicators and participants. Create dialogs are responsive.
## API
All data is read/write via the Django backend at `NEXT_PUBLIC_API_URL`.
Services live in `lib/api/services/` and hooks in `lib/hooks/use-api.ts`.

## Data Model
The frontend mirrors backend entities: Organization, Project, Indicator, Aggregate, User, etc.
Relations are resolved client-side using IDs from the API.

## Deployment
1. Set production API URL:
```
NEXT_PUBLIC_API_URL=https://your-api-domain/api
```
2. Build:
```bash
npm run build
```
3. Start:
```bash
npm run start
```

## Troubleshooting
- **401 errors**: re-authenticate; token expired.
- **CORS issues**: add frontend origin to backend `CORS_ALLOWED_ORIGINS`.
- **API not reachable**: confirm `NEXT_PUBLIC_API_URL` and backend running.

## Offline Mode (PWA)
The frontend now supports installable offline usage with a service worker.

### What works offline
- Cached pages and static assets.
- Previously requested `GET /api/*` responses from cache.
- Offline fallback screen at `/offline/` when navigation data is unavailable.
- `POST/PUT/PATCH/DELETE` requests are queued locally and replayed when connectivity returns.
- Sync audit log (queued/synced/dropped/failed) is stored locally and viewable from the sync widget.

### What does not work offline
- Login, token refresh, and password/auth mutations.
- First-time API `GET` requests that were never loaded before.

### How to validate
1. Build and start production:
```bash
npm run build
npm run start
```
2. Open the app in a browser and navigate through pages to warm caches.
3. Disable network in browser devtools and create/edit/delete a record.
4. Confirm the pending-sync badge increases.
5. Re-enable network and confirm queued mutations are replayed automatically.

### Development mode note
Service worker registration is disabled by default in `npm run dev`.
Set `NEXT_PUBLIC_ENABLE_SW=true` if you need to test service worker behavior in development.
Set `NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS=true` only when deploying behind Vercel Insights endpoints (for non-Vercel hosts leave it unset to avoid loading `/_vercel/insights/script.js`).

