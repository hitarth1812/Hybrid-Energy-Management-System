# Arka Energy Nexus — Hybrid Energy Management System

> An AI-powered, full-stack platform for campus-level energy monitoring, carbon intelligence, and ESG compliance reporting.

![Tech Stack](https://img.shields.io/badge/Backend-Django%205.2-green?style=flat-square&logo=django)
![Tech Stack](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-blue?style=flat-square&logo=react)
![Tech Stack](https://img.shields.io/badge/Styling-Tailwind%20CSS-cyan?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [API Overview](#api-overview)
- [Core Workflows](#core-workflows)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Arka Energy Nexus** is a comprehensive Home / Campus Energy Management System (HEMS) that helps organisations track, analyse, and reduce their carbon footprint. It combines an intelligent Django REST API with a cinematic React UI built around glassmorphism design principles.

The system ingests device data from Excel audit sheets via an AI-powered parser, logs daily usage, projects CO₂ emissions at room / floor / building scope, and auto-generates multi-page PDF ESG compliance reports — all in real time.

---

## Key Features

| Feature | Description |
|---|---|
| **Carbon Dashboard** | KPI tiles, monthly trend bar charts, device breakdown pie charts, and building leaderboards |
| **Carbon Calculator** | Real-time emission estimator scoped to Room, Floor, or Building over any duration (1 hour → 1 year) |
| **Intelligent Upload** | AI-powered Excel parser (`LangChain + Groq`) that detects merged cells, maps device types, allows preview & inline edits before saving |
| **Usage Log Form** | Cascading Building → Room → Device selector with live CO₂ preview before submission |
| **Carbon Target Manager** | Set monthly CO₂ budgets per building; auto-calculates actual vs target status |
| **ESG Report Generation** | On-demand 5-page PDF reports generated with `reportlab`; stored and downloadable |
| **Device Hierarchy** | Full CRUD for Buildings → Rooms → Devices → Brands / Categories |
| **Immersive UI** | Glassmorphism, 3D floating cards, Framer Motion transitions, Glowing Globe landing page |

---

## Architecture

```mermaid
graph TD
    subgraph "Frontend (React + Vite)"
        UI[Sidebar / Navigation]
        CD[Carbon Dashboard]
        CC[Carbon Calculator]
        IU[Intelligent Upload]
        UL[Usage Log Form]
        CT[Target Manager]
        ER[ESG Report Page]
        ID[Immersive Dashboard]
    end

    subgraph "Backend (Django REST Framework)"
        API[REST API Endpoints]
        PAR[Device Parser / AI]
        RPT[PDF Report Generator]
        CAL[Carbon Calc Logic]
    end

    subgraph "Database (SQLite / PostgreSQL)"
        MDL[Building · Room · Device]
        CLM[UsageLog · CarbonTarget · ESGReport]
    end

    UI & CD & CC & IU & UL & CT & ER & ID --> API
    API --> MDL & CLM
    API --> PAR & RPT & CAL
```

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| Django 5.2 + DRF | REST API, ORM, Admin |
| pandas + openpyxl | Excel parsing & data wrangling |
| LangChain + Groq | AI-assisted device field extraction |
| reportlab | PDF ESG report generation |
| django-filter | Advanced query filtering |
| django-cors-headers | Cross-origin support for the React dev server |
| SQLite (dev) / PostgreSQL (prod) | Database |

### Frontend
| Package | Purpose |
|---|---|
| React 18 + Vite | SPA framework & build tool |
| Tailwind CSS | Utility-first styling |
| Framer Motion | Animations & transitions |
| Recharts | Charts (bar, pie, line) |
| Radix UI | Accessible headless components |
| Axios | HTTP client |
| React Router DOM 7 | Client-side routing |

---

## Project Structure

```
HEMS/
├── hems_backend/               # Django project root
│   ├── energy/                 # Main Django app
│   │   ├── models.py           # Building, Room, Device, UsageLog, CarbonTarget, ESGReport
│   │   ├── serializers.py      # DRF serializers
│   │   ├── viewsets.py         # CRUD viewsets
│   │   ├── urls.py             # URL router
│   │   ├── views/              # Business logic modules
│   │   │   ├── dashboard.py    # Carbon KPI aggregation
│   │   │   ├── calculator.py   # Emission estimation by scope
│   │   │   ├── report.py       # PDF generation
│   │   │   ├── usage.py        # Usage log endpoints
│   │   │   ├── smart_upload.py # Bulk import handler
│   │   │   └── target.py       # Carbon target CRUD
│   │   └── services/
│   │       ├── device_parser.py    # AI Excel parser
│   │       └── normalization.py    # Brand / field normalisation
│   └── hems_backend/           # Django settings & WSGI
│
├── hems_frontend/              # React + Vite project
│   └── src/
│       ├── pages/              # Full-page views
│       ├── components/         # Reusable UI components
│       ├── context/            # React state context
│       ├── services/           # Axios API layer
│       └── utils/              # Helpers
│
└── venv_backend/               # Python virtual environment (not committed)
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+
- Git

---

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/hitarth1812/Hybrid-Energy-Management-System.git
cd Hybrid-Energy-Management-System

# 2. Create and activate a virtual environment
python -m venv venv_backend
# Windows
venv_backend\Scripts\activate
# macOS / Linux
source venv_backend/bin/activate

# 3. Install Python dependencies
pip install -r hems_backend/requirements.txt

# 4. Apply database migrations
cd hems_backend
python manage.py migrate

# 5. (Optional) Create a superuser for the Django Admin
python manage.py createsuperuser

# 6. Start the development server
python manage.py runserver
```

Backend runs at **http://localhost:8000**  
Admin panel at **http://localhost:8000/admin**

---

### Frontend Setup

```bash
# From the project root
cd hems_frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend runs at **http://localhost:5173**

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/buildings/` | List or create buildings |
| `GET/POST` | `/api/rooms/` | List or create rooms |
| `GET/POST` | `/api/devices/` | List or create devices |
| `GET` | `/api/carbon/dashboard/` | Aggregated carbon KPIs |
| `POST` | `/api/carbon/calculator/` | Estimate emissions by scope |
| `GET/POST` | `/api/carbon/usage-logs/` | Log device usage hours |
| `GET/POST` | `/api/carbon/targets/` | Manage monthly CO₂ targets |
| `POST` | `/api/smart-upload/preview/` | Parse & preview Excel upload |
| `POST` | `/api/smart-upload/commit/` | Save parsed devices to DB |
| `POST` | `/api/carbon/reports/generate/` | Generate a new PDF ESG report |
| `GET` | `/api/carbon/reports/` | List existing ESG reports |

---

## Core Workflows

### Carbon Emission Formula

$$CO_2\text{ (kg)} = \frac{\text{Watts} \times \text{Hours}}{1000} \times 0.82$$

> Emission factor: **0.82 kg CO₂ / kWh**  
> Tree offset: **≈ 21 kg CO₂ / tree / year** (standard ESG metric)

### Smart Bulk Upload Flow

1. User drops an Excel energy audit sheet onto the **Intelligent Upload** page.
2. `services/device_parser.py` uses `pandas` + LangChain/Groq to detect headers, parse merged cells, and map device types.
3. A structured preview table is returned — users can correct wattages or names inline.
4. On confirmation, `views/smart_upload.py` persists the validated device list, auto-creating the Building → Room hierarchy.

### ESG Report Flow

1. User triggers report generation from the **ESG Report** page.
2. `views/report.py` queries all usage logs, aggregates emissions, and builds a 5-page PDF with `reportlab`.
3. The PDF is stored under `media/esg_reports/` and a download link is returned.

---

## Environment Variables

Create a `.env` file inside `hems_backend/` with the following keys:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3   # or postgres://user:pass@host/db
GROQ_API_KEY=your-groq-api-key      # Required for AI-powered upload parsing
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m "feat: add your feature"`.
4. Push to the branch: `git push origin feature/your-feature`.
5. Open a Pull Request.

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">Built with ⚡ by <strong>Hitarth Khatiwala</strong></p>
