# apps/web

Next.js 15 web app (port 3000). Customer mode: home, choose a report, details (live validation), check, the report on screen with contents, Download PDF and Print. Practitioner mode arrives in milestone 7. Talks to the API (`NEXT_PUBLIC_API_URL`, default http://localhost:8787) over HTTP only. Customer details live in sessionStorage for the tab and nowhere else.

- `pnpm --filter @kalachakra/web dev`
- `pnpm --filter @kalachakra/web test:e2e` (Playwright, desktop and phone widths, using Edge or Chrome already installed)
