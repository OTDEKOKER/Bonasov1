# Proposed Fix Tasks from Codebase Review

## 1) Typo fix task: rename `reuseables` to `reusables`
**Issue found:** A shared components directory is named `components/reuseables`, and many imports repeat this misspelling. This makes navigation/search less intuitive and can confuse new contributors expecting `reusable` naming.  
**Evidence:** Directory and imports use `reuseables` in multiple files.

**Proposed task:**
- Rename `frontend/components/reuseables/` to `frontend/components/reusables/`.
- Update all `@/components/reuseables/...` imports.
- Run lint/build to ensure no broken paths remain.

**Acceptance criteria:**
- No path in the repo contains `components/reuseables`.
- Type-check/lint/build pass after import updates.

---

## 2) Bug fix task: preserve valid falsy payloads in API client
**Issue found:** `api.post`, `api.put`, and `api.patch` only serialize the body when `body` is truthy (`body ? JSON.stringify(body) : undefined`). This drops valid falsy payloads like `0`, `false`, or empty string and can send the wrong request body.

**Proposed task:**
- Change serialization guards to `body !== undefined` (or `body != null`, depending on API expectations) so falsy values are still sent.
- Keep `undefined` as “no body”.

**Acceptance criteria:**
- `api.post('/x', false)` sends `"false"`.
- `api.post('/x', 0)` sends `"0"`.
- `api.post('/x', undefined)` sends no body.

---

## 3) Documentation discrepancy task: remove machine-specific absolute paths in setup docs
**Issue found:** Setup docs include Windows machine-specific absolute paths (for example `c:\Projects\django_backend` and `C:\Users\...\Bonasov1\frontend`) that do not match this repository layout and are not portable.

**Proposed task:**
- Replace absolute paths with repo-relative instructions (for example `cd frontend` and a backend path that reflects the actual backend location or explicit external dependency note).
- Add one short note clarifying expected mono-repo vs separate backend checkout.

**Acceptance criteria:**
- Quickstart commands are copy/paste runnable on any machine after cloning.
- No user-specific filesystem paths remain in root/frontend README quickstart sections.

---

## 4) Test improvement task: add coverage for API client request-body and offline/refresh behavior
**Issue found:** There are no obvious automated tests in the frontend for API client behavior, despite non-trivial logic in auth refresh and offline queueing paths.

**Proposed task:**
- Add unit tests around `frontend/lib/api/client.ts` to cover:
  - request body serialization edge cases (truthy/falsy/undefined),
  - 401 + token refresh retry flow,
  - offline mutation queue fallback for mutation methods.
- Mock `fetch`, `localStorage`, and queue helpers.

**Acceptance criteria:**
- Test suite includes at least one failing case for current falsy-body behavior, then passes after fix.
- Tests verify refresh retry and offline queue decisions for mutation/non-mutation endpoints.
