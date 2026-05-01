# HEMS Backend

Django REST Framework backend for Arka Energy Nexus - Home Energy Management System.

## Overview

Robust API server providing energy management, ML predictions, carbon tracking, and intelligent reporting.

**Framework:** Django 5.2.13  
**Python:** 3.10+  
**Database:** SQLite (dev) / PostgreSQL (production)

## Quick Start

### Prerequisites
- Python 3.10+
- pip
- Virtual environment

### Installation

#### Windows (PowerShell)
```powershell
# Activate virtual environment (from repo root)
.\.venv\Scripts\Activate.ps1

# Navigate to backend
cd BACKEND\hems_backend

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Start server
python manage.py runserver
```

#### macOS/Linux (Bash)
```bash
# Activate virtual environment
source .venv/bin/activate

# Navigate to backend
cd BACKEND/hems_backend

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Start server
python manage.py runserver
```

**Backend runs on:** `http://127.0.0.1:8000`

## Key Features

### 1. Energy Management
- Building, Room, Device hierarchy
- Usage log tracking with emissions calculation
- Real-time sensor data ingestion
- Carbon footprint computation per scope

### 2. ML Prediction
- **Dual Ensembles**: Power + Appliance/Light models
- **Algorithm**: 30% XGBoost + 40% LightGBM + 30% Random Forest
- **Coverage**: 72-hour temporal forecasting
- **Fallback**: Random Forest as robust backup

### 3. Carbon Intelligence
- Monthly trend analysis
- Device & building breakdown
- Emission target management
- PDF report generation with ReportLab

### 4. Smart Upload
- AI-assisted spreadsheet parsing (Groq LLM)
- 2-step validation (preview → save)
- Wide-format Excel support
- Bulk device inventory import

### 5. Security
- JWT authentication with token refresh
- Role-based access control (future)
- CORS whitelisting
- API rate limiting (configurable)

## Project Structure

```
hems_backend/
├── energy/                  # Core application
│   ├── models.py            # Database schema
│   ├── serializers.py       # API serialization
│   ├── views/               # API endpoints
│   │   ├── predict.py       # ML prediction endpoints
│   │   ├── dashboard.py     # Carbon KPI aggregation
│   │   ├── calculator.py    # Real-time emission calculation
│   │   ├── report.py        # PDF generation
│   │   ├── smart_upload.py  # 2-step upload flow
│   │   ├── usage.py         # Usage logging
│   │   ├── target.py        # Carbon target CRUD
│   │   ├── health.py        # Health probe
│   │   └── __init__.py      # Export hub
│   ├── viewsets.py          # CRUD ViewSets
│   ├── urls.py              # URL routing
│   ├── services/            # Business logic
│   │   ├── device_parser.py # Excel parsing + LLM
│   │   └── normalization.py # Data cleaning
│   ├── migrations/          # Database schema versions
│   ├── tests.py
│   └── management/          # Custom commands
├── hems_backend/            # Django configuration
│   ├── settings.py          # Project settings
│   ├── urls.py              # Root URL router
│   ├── wsgi.py              # WSGI entry (production)
│   ├── asgi.py              # ASGI entry (async)
│   └── celery.py            # Celery async tasks
├── ml_models/               # ML model artifacts
│   ├── predictor.py         # Model loading & ensembling
│   ├── xgb_power.json       # XGBoost power model
│   ├── lgb_power.txt        # LightGBM power model
│   ├── rf_power.joblib      # Random Forest power model
│   ├── xgb_light.json       # XGBoost light model
│   ├── lgb_light.txt        # LightGBM light model
│   └── rf_light.joblib      # Random Forest light model
├── media/                   # Generated reports
│   └── esg_reports/         # PDF storage
├── manage.py                # Django CLI
├── requirements.txt         # Python dependencies
├── db.sqlite3               # Development database
├── .env                     # Environment variables
├── .env.example             # Template
├── render-start.sh          # Render.com entry
├── render-build.sh          # Build script
└── README.md                # This file
```

## Environment Variables

Create `.env` file in this directory:

```env
# Django Core
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# Database (optional — defaults to SQLite)
DATABASE_URL=postgresql://user:password@localhost:5432/hems_db

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000

# LLM Integration (REQUIRED for Smart Upload)
GROQ_API_KEY=your-groq-api-key

# Email (optional)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Render.com (if deploying)
RENDER_EXTERNAL_URL=https://your-app.onrender.com
```

## API Endpoints

### Authentication
- `POST /api/auth/login/` — Get JWT token
- `POST /api/auth/refresh/` — Refresh access token

### Predictions
- `POST /api/energy/predict/` — Power prediction (auth required)
- `POST /api/energy/predict/light/` — Appliance prediction (auth required)
- `GET /api/energy/predict/time/` — Temporal forecast

### Data Management
- `POST /api/energy/smart-upload/preview/` — Parse file preview
- `POST /api/energy/smart-upload/save/` — Save to database
- `GET /api/energy/carbon/dashboard/` — KPI aggregation

### Monitoring
- `GET /api/health/` — Health probe (no auth)

**Full API reference:** See [PROJECT_BLUEPRINT.md](../PROJECT_BLUEPRINT.md#api-endpoint-reference)

## Database Migrations

### Create new migration
```bash
python manage.py makemigrations energy
```

### Apply migrations
```bash
python manage.py migrate
```

### Reset database (dev only)
```bash
python manage.py flush
python manage.py migrate
```

### View migration history
```bash
python manage.py showmigrations
```

## Admin Interface

Access at `http://127.0.0.1:8000/admin`

### Create superuser
```bash
python manage.py createsuperuser
# Enter username, email, password
```

## ML Models

### Model Loading
Models auto-load on server startup in `ml_models/predictor.py`:
- XGBoost models: `xgb_power.json`, `xgb_light.json`
- LightGBM models: `lgb_power.txt`, `lgb_light.txt`
- Random Forest models: `rf_power.joblib`, `rf_light.joblib`

### Ensemble Strategy
```
Prediction = 0.30 * XGBoost + 0.40 * LightGBM + 0.30 * Random Forest
```

### Fallback Logic
If primary models fail, Random Forest provides robust fallback.

### Model Retraining
```bash
# Export current models
python ../scripts/export_models.py
```

## Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test energy

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

## Deployment

### Render.com
```bash
# Configuration in render.yaml (root)
# Auto-deploys on git push to main
```

### Heroku
```bash
# Uses Procfile
git push heroku main
```

### Railway / Custom
```bash
# Uses render-start.sh
source render-start.sh
```

## Troubleshooting

### Models Not Loading
```bash
# Check model files exist
ls ml_models/

# Review logs
python manage.py check

# Test import
python -c "from ml_models.predictor import predict; print('OK')"
```

### Database Migration Errors
```bash
# Show current state
python manage.py showmigrations energy

# Rollback specific migration
python manage.py migrate energy 0001

# Reset and remigrate
python manage.py migrate energy zero
python manage.py migrate
```

### API Timeouts
- Check `/api/health/` for server status
- Review backend logs for slow queries
- Increase timeout in frontend `hemsApi.js`

### CORS Issues
```bash
# Verify CORS_ALLOWED_ORIGINS in .env
# Restart server after changes
python manage.py runserver
```

## Dependencies

### Key Libraries
- **Django 5.2.13** — Web framework
- **djangorestframework** — REST API
- **django-cors-headers** — CORS handling
- **pandas** — Data processing
- **scikit-learn** — ML utilities
- **xgboost** — Gradient boosting
- **lightgbm** — Light gradient boosting
- **reportlab** — PDF generation
- **langchain** — LLM integration
- **groq** — Groq API client

### Compatibility Notes
- Django 5.2.13 requires Python 3.10+
- LightGBM requires scikit-learn
- ReportLab requires Pillow for images

## Documentation

- **[Main README](../../README.md)** — Project overview
- **[PROJECT_BLUEPRINT.md](../PROJECT_BLUEPRINT.md)** — Architecture & detailed API
- **[Frontend README](../../FRONTEND/hems_frontend/README.md)** — Frontend setup

## License

MIT License - See [LICENSE](../LICENSE)

## Author

Hitarth Khatiwala - hitarthkhatiwala@gmail.com
