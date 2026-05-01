# HEMS Frontend

React + Vite UI for Arka Energy Nexus - Home Energy Management System.

## Overview

Modern, responsive web application for real-time energy monitoring, ML-powered predictions, carbon tracking, and operational insights.

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Backend running on `http://127.0.0.1:8000` (for API proxy)

### Installation

```bash
npm install
npm run dev
```

**Frontend runs on:** `http://localhost:5174`

## Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Create optimized production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/
│   ├── Sidebar.jsx              # Main navigation
│   ├── TopDragger.jsx           # Contact panel
│   ├── charts/                  # Recharts visualizations
│   ├── energy/                  # Power prediction UI
│   └── analytics/               # Analytics insights
├── pages/
│   ├── HomePage.jsx             # Hero landing
│   ├── EnergyUsage.jsx          # Power consumption monitoring
│   ├── AppliancePrediction.jsx  # Light/appliance prediction
│   ├── AnalyticsDashboard.jsx   # Multi-granularity analytics
│   ├── TimeForecast.jsx         # 72-hour forecast
│   ├── SmartUpload.jsx          # AI-assisted CSV/Excel import
│   ├── CarbonDashboard.jsx      # Carbon intelligence & calculator
│   └── CarbonTargetManager.jsx  # Emission goal tracking
├── api/
│   └── hemsApi.js               # API client with timeout handling
├── hooks/
│   ├── useAnalytics.js          # Analytics with AbortController
│   ├── useForecast.js           # 72h forecast state
│   ├── usePrediction.js         # Power prediction history
│   └── useAppliancePrediction.js # Light prediction state
├── context/
│   └── AuthContext.jsx          # JWT token management
├── services/                    # External integrations
├── utils/                       # Helpers & constants
└── App.jsx                      # Root component
```

## Key Features

### 1. Energy Monitoring
- Real-time power consumption display
- 6-sensor input validation
- 4-card result display (Load, Status, Cost, Carbon)
- Historical prediction tracking

### 2. ML Predictions
- **Power Model**: XGBoost + LightGBM + Random Forest ensemble
- **Appliance/Light Model**: Dedicated light prediction models
- **Temporal Forecasting**: 72-hour ahead predictions with time-based features

### 3. Analytics Dashboard
- Multi-granularity (hourly/daily/weekly/monthly)
- Manual date selection with automatic granularity adjustment
- Real-time KPI cards (Energy, Peak Load, Cost, Carbon)
- Trend visualization with Recharts

### 4. Carbon Intelligence
- Monthly carbon trend tracking
- Device-level breakdown
- Building leaderboards
- Carbon target management with monthly goals
- Real-time emission calculator

### 5. Smart Upload
- Drag-and-drop file import (CSV/Excel)
- AI-assisted parsing with Groq LLM
- 2-step validation (preview → save)
- Device inventory management

## Configuration

### Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_API_TIMEOUT=10000
```

### Vite Proxy Configuration

The dev server proxies API calls to backend. Configure in `vite.config.js`:

```javascript
server: {
  proxy: {
    '/api/': 'http://127.0.0.1:8000',
    '/forecast/': 'http://127.0.0.1:8000',
    '/analytics/': 'http://127.0.0.1:8000'
  }
}
```

## API Integration

All API calls go through `src/api/hemsApi.js`:

```javascript
import api from '@/api/hemsApi';

// Power prediction
const result = await api.predict(sensorData);

// Light prediction
const lightResult = await api.predictLight(sensorData);

// 72-hour forecast
const forecast = await api.getForecast(72);

// Analytics
const analytics = await api.getAnalytics('daily', selectedDate);
```

### Authentication

JWT tokens stored in `localStorage`:
- `accessToken` — Short-lived access token
- `refreshToken` — Long-lived refresh token

Automatic refresh handled in `AuthContext.jsx`.

## Styling

- **Tailwind CSS** — Utility-first styling
- **Framer Motion** — Animations & transitions
- **Recharts** — Data visualization
- **Lucide React** — Icon library
- **Radix UI** — Accessible components

## Performance

- Vite fast refresh for instant dev feedback
- Code splitting per route
- Tree-shaking for minimal bundle
- AbortController for fetch cancellation
- Timeout handling for slow API responses

## Troubleshooting

### API Proxy Not Working
```bash
# Verify backend running
curl http://127.0.0.1:8000/api/health/

# Check vite.config.js proxy settings
# Restart dev server
npm run dev
```

### Slow API Responses
- Frontend timeout: 10s (adjustable in `hemsApi.js`)
- Check backend logs for slow queries
- Use network tab in DevTools to diagnose

### Build Issues
```bash
# Clear caches
rm -rf node_modules package-lock.json dist .vite

# Reinstall
npm install
npm run build
```

## Documentation

- **[Main README](../../README.md)** — Full project overview
- **[PROJECT_BLUEPRINT.md](../../BACKEND/PROJECT_BLUEPRINT.md)** — Architecture & API reference
- **[Backend README](../../BACKEND/hems_backend/README.md)** — Backend setup

## License

MIT License - See [LICENSE](../../BACKEND/LICENSE)

## Author

Hitarth Khatiwala - hitarthkhatiwala@gmail.com
