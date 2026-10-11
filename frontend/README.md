# SwasthyaConnect frontend

Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS 4). Full setup and deployment: see the root `README.md`.

```bash
npm install
npm run dev      # http://localhost:3000, proxies /api to BACKEND_URL (default http://127.0.0.1:8000)
npm run lint
npm run build
```

## Layout

| Path | Contents |
| --- | --- |
| `src/app/(auth)` | Patient and doctor sign-in / registration |
| `src/app/(patient)` | Dashboard, screening, records, pharmacies, doctors, appointments, profile |
| `src/app/(clinician)` | Doctor case queue, appointments, availability |
| `src/app/(admin)` | Administration |
| `src/features/<domain>` | Feature components (screening, pharmacy, doctor, records...) |
| `src/components/ui`, `layout`, `shared` | Reusable UI, the app shell, cross-feature pieces |
| `src/services` | The only code that calls the API (one file per domain) |
| `src/lib` | API client (token refresh, error handling), auth storage, i18n (English/Hindi), formatting |
| `src/types`, `src/constants`, `src/hooks` | Shared types, symptom questions, data hooks |
| `src/middleware.ts` | Page redirects by role (UX only; the API enforces authorisation) |
