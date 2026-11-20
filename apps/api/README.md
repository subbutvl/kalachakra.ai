# apps/api

Thin Hono API on Node (phase 1 spec, section 7). It validates input, calls the engine and returns
JSON. It holds no state, listens on 127.0.0.1:8787, allows only the web app's origin
(`WEB_ORIGIN`, default http://localhost:3000), and logs only method, path, status and timing.

```sh
pnpm --filter @kalachakra/api dev     # or pnpm dev from the root
```

- Interactive docs: http://localhost:8787/docs (OpenAPI at `/openapi.json`)
- Every request may carry `rule_profile` (an id or an inline custom profile), `as_of` (defaults to
  today in India), `audience` and `language`.
- Errors always look like `{"error": {"code": "invalid_date", "field": "person.dob", "message": "..."}}`.
- `/v1/report` and `/v1/report/pdf` answer 501 until the report builder arrives in milestone 5.

Settings: `API_HOST`, `API_PORT`, `WEB_ORIGIN`, `API_QUIET=1` (no request logs).
