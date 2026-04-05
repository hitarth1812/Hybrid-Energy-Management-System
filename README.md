# Arka Energy Nexus

AI-powered Hybrid Energy Management System for energy monitoring, ML-powered prediction, and operational efficiency.

![Backend](https://img.shields.io/badge/Backend-Django%20%2B%20DRF-0C4B33?style=flat-square&logo=django)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-0EA5E9?style=flat-square&logo=react)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-336791?style=flat-square&logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## Overview

Arka Energy Nexus helps organizations track energy usage andestimate emissions from a single platform.

Main capabilities:
- Carbon dashboard with KPI-level visibility
- Building, room, and device-level energy accounting
- Intelligent bulk upload with AI-assisted Groq LLM parsing
- Carbon target management
- ML-powered power prediction (XGBoost + LightGBM + Random Forest ensemble)
- Electrical appliance/lighting prediction using dedicated light ML models
- Analytics dashboard with manual date inspection and granularity switching
- JWT authentication with automatic token refresh

## Repository Structure

This repository is now organized into three root-level entries:

```text
HEMS/
├── BACKEND/
│   ├── hems_backend/      # Main Django backend (manage.py lives here)
│   ├── arka_backend/      # Supporting backend workspace
│   ├── venv_backend/      # Local virtual env (development)
│   └── ...
├── FRONTEND/
│   ├── hems_frontend/     # React + Vite frontend
│   └── package-lock.json
└── README.md
```

## Tech Stack

- Backend: Django, Django REST Framework, ReportLab, Pandas, LangChain
- Frontend: React, Vite, Tailwind CSS, Framer Motion, Recharts
- Database: PostgreSQL (primary), SQLite (fallback/dev)
- ML: XGBoost + LightGBM + Random Forest (dual families: power + light/appliance)
- LLM: Groq `mixtral-8x7b-32768` for unstructured spreadsheet parsing

## Quick Start

### 1. Clone

```bash
git clone https://github.com/hitarth1812/Hybrid-Energy-Management-System.git
cd Hybrid-Energy-Management-System
```

### 2. Backend Setup

```bash
cd BACKEND/hems_backend

# If using existing venv in this repo (Windows)
..\venv_backend\Scripts\activate

# Or create your own venv
# python -m venv .venv
# .venv\Scripts\activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend URLs:
- API: http://127.0.0.1:8000
- Admin: http://127.0.0.1:8000/admin

### 3. Frontend Setup

```bash
cd FRONTEND/hems_frontend
npm install
npm run dev
```

Frontend URL:
- App: http://127.0.0.1:5173

## Environment Configuration

Create a `.env` file inside `BACKEND/hems_backend` and define values similar to:

```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://postgres:password@localhost:5432/hems_db
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
GROQ_API_KEY=your-groq-api-key   # Required — no hardcoded fallback
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

