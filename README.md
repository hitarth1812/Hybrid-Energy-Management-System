# Arka Energy Nexus

AI-powered **Hybrid Energy Management System (HEMS)** for real-time energy monitoring, ML-powered predictions, and operational efficiency optimization.

![Backend](https://img.shields.io/badge/Backend-Django%205.2.13-0C4B33?style=flat-square&logo=django)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%206.4.2-0EA5E9?style=flat-square&logo=react)
![Python](https://img.shields.io/badge/Python-3.10-3776AB?style=flat-square&logo=python)
![Database](https://img.shields.io/badge/Database-SQLite%20%2F%20PostgreSQL-336791?style=flat-square&logo=postgresql)
![ML](https://img.shields.io/badge/ML-XGBoost%20%2B%20LightGBM%20%2B%20RandomForest-FF6B35?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## 🎯 Overview

Arka Energy Nexus is a comprehensive energy management platform that helps organizations track energy consumption, predict future loads, monitor carbon emissions, and optimize operational efficiency.

### Core Capabilities

- **Real-time Energy Monitoring** — Live power consumption tracking with 6-sensor input validation
- **Dual ML Prediction Engines** — Ensemble models for power & appliance/lighting loads (72-hour forecasting)
- **Carbon Intelligence Dashboard** — Monthly trends, device breakdown, building leaderboards, and emission targets
- **Intelligent Bulk Upload** — AI-assisted (Groq LLM) spreadsheet parsing for device inventory ingestion
- **Analytics Dashboard** — Multi-granularity analysis (hourly/daily/weekly/monthly) with anomaly detection & insights
- **Smart Uploading** — 2-step validation (preview → save) with JWT authentication
- **Secure API** — REST framework with JWT token management and automatic refresh

## 📂 Workspace Structure

```
HEMS/
├── .venv/                          # Python virtual environment
├── BACKEND/
│   ├── hems_backend/               # Main Django application
│   │   ├── energy/                 # Core energy management app
│   │   │   ├── models.py           # DB schema (Building, Room, Device, etc.)
│   │   │   ├── views/              # API endpoints
│   │   │   ├── services/           # Business logic (ML, parsing, etc.)
│   │   │   ├── migrations/         # Database schema versions
│   │   │   └── tests.py
│   │   ├── hems_backend/           # Django configuration
│   │   ├── ml_models/              # ML ensembles (power + light)
│   │   ├── media/                  # Generated reports
│   │   ├── manage.py
│   │   ├── requirements.txt
│   │   ├── db.sqlite3              # Development database
│   │   ├── render-start.sh         # Production entry script
│   │   └── README.md
│   ├── scripts/
│   │   └── export_models.py        # Model export utility
│   ├── PROJECT_BLUEPRINT.md        # Detailed architecture (READ THIS)
│   └── LICENSE
├── FRONTEND/
│   └── hems_frontend/              # React + Vite application
│       ├── src/
│       │   ├── components/         # Reusable UI components
│       │   ├── pages/              # Route pages
│       │   ├── api/                # API client (hemsApi.js)
│       │   ├── hooks/              # Custom React hooks
│       │   ├── context/            # State management
│       │   ├── services/           # Frontend services
│       │   └── utils/              # Helper functions
│       ├── public/                 # Static assets
│       ├── package.json
│       ├── vite.config.js          # Dev server (proxy: :8000)
│       ├── tailwind.config.js
│       ├── vercel.json
│       └── README.md
├── README.md                       # This file
├── Procfile                        # Heroku/Railway deployment
├── render.yaml                     # Render.com deployment
└── .gitignore
```

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Django 5.2.13, Django REST Framework, ReportLab |
| **Frontend** | React, Vite 6.4.2, Tailwind CSS, Framer Motion, Recharts |
| **Database** | SQLite (dev), PostgreSQL (production) |
| **ML Models** | XGBoost, LightGBM, Random Forest (dual: power + light) |
| **Data Processing** | Pandas, NumPy, openpyxl |
| **LLM Integration** | Groq API (`mixtral-8x7b-32768`) via LangChain |
| **Python Version** | 3.10 (fixed for compatibility) |

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 16+
- Git

### 1. Clone Repository

```bash
git clone https://github.com/hitarth1812/Hybrid-Energy-Management-System.git
cd Hybrid-Energy-Management-System
```

### 2. Backend Setup

#### Windows PowerShell
```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Navigate to backend
cd BACKEND\hems_backend

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

#### macOS/Linux
```bash
# Activate virtual environment
source .venv/bin/activate

# Navigate to backend
cd BACKEND/hems_backend

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

**Backend URLs:**
- API Base: http://127.0.0.1:8000
- Admin Panel: http://127.0.0.1:8000/admin
- Health Probe: http://127.0.0.1:8000/api/health/

### 3. Frontend Setup

```bash
cd FRONTEND/hems_frontend
npm install
npm run dev
```

**Frontend URL:** http://localhost:5174

> **Note:** Vite dev server proxies API calls to `http://localhost:8000` (configured in `vite.config.js`)

## 🔐 Environment Configuration

Create `.env` file in `BACKEND/hems_backend`:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (optional — defaults to SQLite)
DATABASE_URL=postgresql://user:password@localhost:5432/hems_db

# CORS
CORS_ALLOWED_ORIGINS=http://127.0.0.1:5174,http://localhost:5174,http://localhost:3000

# LLM (REQUIRED for Smart Upload AI features)
GROQ_API_KEY=your-groq-api-key-here

# Email (optional)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

## 📊 API Endpoints Overview

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/energy/predict/` | POST | ✅ | Power consumption prediction |
| `/api/energy/predict/light/` | POST | ✅ | Appliance/lighting prediction |
| `/api/energy/predict/time/` | GET | ❌ | 72-hour forecast |
| `/api/energy/smart-upload/preview/` | POST | ✅ | Parse file preview |
| `/api/energy/smart-upload/save/` | POST | ✅ | Save to database |
| `/api/energy/carbon/dashboard/` | GET | ✅ | KPI aggregation |
| `/api/health/` | GET | ❌ | Health probe |
| `/api/auth/login/` | POST | ❌ | JWT token exchange |

**Full API documentation:** See [PROJECT_BLUEPRINT.md](BACKEND/PROJECT_BLUEPRINT.md)

## 🚀 Deployment

### Render.com
```bash
# Deployment config in render.yaml
# Auto-deploys on git push to main
```

### Heroku / Railway
```bash
# Uses Procfile for process definition
```

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check Python version
python --version  # Should be 3.10+

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Reset database
python manage.py flush
python manage.py migrate
```

### Frontend Build Issues
```bash
# Clear Vite cache
rm -rf node_modules .venv dist

# Reinstall
npm install
npm run dev
```

### API Proxy Not Working
- Verify backend running on `http://127.0.0.1:8000`
- Check `vite.config.js` proxy configuration
- Restart Vite dev server

### ML Models Missing
- Verify models in `BACKEND/hems_backend/ml_models/`
- Check `predictor.py` logs
- Random Forest fallback should activate if others fail

## 📚 Documentation

- **[PROJECT_BLUEPRINT.md](BACKEND/PROJECT_BLUEPRINT.md)** — Detailed architecture, data models, API reference
- **[BACKEND/hems_backend/README.md](BACKEND/hems_backend/README.md)** — Backend-specific setup
- **[FRONTEND/hems_frontend/README.md](FRONTEND/hems_frontend/README.md)** — Frontend-specific setup

## 📝 License

This project is licensed under the MIT License. See [LICENSE](BACKEND/LICENSE) for details.

## 👤 Author

**Hitarth Khatiwala**  
- Email: hitarthkhatiwala@gmail.com
- Phone: +91 7096235959

## 🔄 Version History

- **v4** (May 1, 2026) — Workspace cleanup, documentation consolidation
- **v3** (April 2, 2026) — Dual ML models (power + light), appliance prediction
- **v2** — Analytics dashboard, carbon intelligence
- **v1** — Initial framework, single power model
```

> **Important**: `GROQ_API_KEY` is now strictly loaded from the environment. The hardcoded fallback key was removed from `services/device_parser.py`. Smart Upload will silently skip LLM parsing if this key is not set.

## Useful Commands

```bash
# Run backend tests
cd BACKEND/hems_backend
python manage.py test

# Open database shell
python manage.py dbshell

# Create migrations
python manage.py makemigrations
python manage.py migrate
```

## API Highlights

| Endpoint | Method | Auth | Purpose |
|:---|:---|:---|:---|
| `/api/buildings/` | GET/POST | Required | Building CRUD |
| `/api/rooms/` | GET/POST | Required | Room CRUD |
| `/api/devices/` | GET/POST | Required | Device CRUD |
| `/api/carbon/dashboard/` | GET | Required | CO2 KPIs |
| `/api/carbon/targets/` | GET/POST | Required | Monthly goals |
| `/api/energy/predict/` | POST | Required | Power prediction |
| `/api/energy/predict/light/` | POST | Required | Appliance prediction |
| `/api/energy/predict/time/` | GET | Open | Temporal forecast |
| `/api/energy/smart-upload/preview/` | POST | Required | Parse spreadsheet |
| `/api/energy/smart-upload/save/` | POST | Required | Commit devices to DB |
| `/api/energy/health/` | GET | Open | Health probe |


## License

This project is licensed under the MIT License.

