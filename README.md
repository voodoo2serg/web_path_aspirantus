# web_path_aspirantus

Lightweight Path client UI for `route_package` tier (Epic 10, T100).

## Screens

1. Мой путь — progress, tasks, 1m/3m horizons
2. Тема — read-only topic + definitions
3. Статьи — 3 journal recs + ~60% draft
4. Диссертация — scaffold ~60%
5. Сопровождение — Companion feed
6. Документы — science foundation + methodology

## Run locally

Serve static files (any static server) and point API:

```html
<!-- js/config.js or localStorage -->
path_api_base = http://localhost:8000/api/v1
```

Demo login: `demo@aspirantus.local` / `demo-change-me`

## Deploy

Copy to nginx root (e.g. `/opt/web_path_aspirantus`) and set meta or `localStorage`:

- `path_api_base` → `http://213.171.9.30:8002/api/v1`
- `path_pro_url` → portal Pro URL
