# Backend Scaffold

This directory contains the Python backend scaffold for the DailyCam project.
It is organised to make it easy to plug in camera-integration logic that will
talk to Gemini 2.5 Flash or any other provider.

```
backend/
├── app/
│   ├── api/
│   │   ├── analytics/      # FastAPI routers grouped by domain
│   │   ├── daily_report/
│   │   ├── homecam/
│   │   ├── live_monitoring/
│   │   └── video_highlights/
│   ├── models/
│   │   ├── analytics/      # Domain models or ORM entities
│   │   ├── daily_report/
│   │   ├── homecam/
│   │   ├── live_monitoring/
│   │   └── video_highlights/
│   ├── schemas/
│   │   ├── analytics/      # Pydantic request/response schemas
│   │   ├── daily_report/
│   │   ├── homecam/
│   │   ├── live_monitoring/
│   │   └── video_highlights/
│   └── services/
│       ├── analytics/      # Business logic (e.g. analytics aggregation)
│       ├── daily_report/
│       ├── homecam/
│       ├── live_monitoring/
│       └── video_highlights/
└── pyproject.toml        # Python project configuration
```

### Next Steps

1. Install dependencies (FastAPI, Uvicorn, google-generativeai, etc.).
2. Flesh out each domain service (e.g. `app/services/homecam/service.py`, `app/services/analytics/service.py`).
3. Expose API endpoints in the corresponding routers and ensure they are included in `app/main.py`.
4. Wire the frontend to call the new backend endpoints.


