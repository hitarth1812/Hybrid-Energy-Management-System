# AI Agent Coding Guidelines for HEMS Backend

## Project Overview
**HEMS Backend** is a Django REST API for Home Energy Management System that tracks energy consumption across devices and calculates carbon emissions.

**Tech Stack:** Django 5.2, PostgreSQL, Python  
**Database:** `hems_db` on PostgreSQL (localhost:5432)  
**Key Module:** `energy` app - all core logic

---

## Architecture & Component Structure

### Data Model Flow
```
Device → EnergyUsage → (energy_consumed auto-calculated on save)
Appliance → Usage → Emission → (CO2 calculation)
```

**Key Models** ([energy/models.py](energy/models.py)):
- **Device**: Building/room devices with power ratings and usage hours
- **EnergyUsage**: Per-device energy consumption tracking (auto-calculates kWh from watts × hours)
- **Appliance/Usage/Emission**: Alternative appliance-tracking flow for seasonal analysis

### Critical Design Patterns

1. **Auto-calculation on Save**: `EnergyUsage.save()` auto-computes `energy_consumed` from watts × hours → kWh. Never bypass with `update()`.
2. **Validation in `clean()`**: Hours bounds (0-24), future date rejection, power > 0. Always call `full_clean()` before saving in views.
3. **PostgreSQL Database**: Switch from SQLite in [settings.py](hems_backend/settings.py#L73-L81) - uses credentials hardcoded for dev.

---

## Developer Workflows

### Run Server
```bash
python manage.py runserver
```

### Database Migrations
```bash
python manage.py migrate  # Apply all pending migrations
python manage.py makemigrations energy  # Create new migration for app changes
```

### Load Device Data
[views.py](energy/views.py) includes CSV upload function: `upload_devices(file_path)` expects columns: `building, room, device_type, quantity, watt_rating, hours_used_per_day`

### Testing
```bash
python manage.py test
```
Tests located in [energy/tests.py](energy/tests.py) - run before commits.

---

## Project-Specific Conventions

### Emission Calculations
- **Factor**: 0.82 kg CO₂ per kWh (hardcoded in services)
- **Formula**: `co2 = energy_kwh × 0.82`
- Located in [services.py](energy/services.py) `calculate_emission(power_w, hours, factor)`

### CSV Processing
Uses pandas for bulk device import. File schema must match Device model fields exactly (see [views.py](energy/views.py) import logic).

### Admin Integration
Django admin enabled but no custom `AdminSite` - use default [admin.py](energy/admin.py).

---

## URL Routes & Integration Points

**Current Routes** ([urls.py](hems_backend/urls.py)):
- `admin/` - Django admin only

**Integration Gap**: No API endpoints defined yet - add to `energy/urls.py` (create file) and include in main URLs.

**Frontend Integration**: Expects REST endpoints for:
- Device CRUD
- Energy usage reporting  
- Emission analytics

---

## Critical Dependencies & Setup

- **PostgreSQL 13+** required - connection at `localhost:5432` with creds in settings
- **pandas** for CSV import
- Django built-in admin/ORM (no DRF yet)
- **No API framework** - plan for Django REST Framework if REST endpoints needed

### Before Making Changes
1. Ensure PostgreSQL is running and `hems_db` exists
2. Run migrations: `python manage.py migrate`
3. Test data loads: `python manage.py shell` → verify Device records

---

## Common Pitfalls & Guardrails

⚠️ **Do NOT:**
- Use `.update()` on EnergyUsage - bypasses auto-calculation
- Skip `full_clean()` validation in views
- Modify hardcoded CO₂ factor (0.82) without config file
- Commit settings.py with production secrets

✅ **Always:**
- Call `model.full_clean()` before `.save()`
- Use `related_name='energy_usages'` in ForeignKey queries
- Keep date validations (no future dates allowed)
- Test CSV imports with sample files first

---

# HEMS Frontend Guidelines

## Project Overview
**HEMS Frontend** is a React + Vite application providing device management, energy tracking, and emission analytics for the HEMS system.

**Tech Stack:** React 18, Vite, Tailwind CSS, Recharts  
**State Management:** Context API  
**API Client:** Axios with dedicated service layer

---

## Frontend Architecture

### Folder Structure
```
hems_frontend/
├── src/
│   ├── components/      # Reusable UI (Navbar, DeviceCard, StatCard)
│   ├── pages/          # Route pages (Dashboard, Devices, EnergyUsage)
│   ├── services/       # API layer (api.js with device/energy endpoints)
│   ├── context/        # State management (DeviceContext)
│   ├── utils/          # Helper functions
│   ├── App.jsx         # Main router
│   └── main.jsx        # Entry point
└── vite.config.js
```

### Page Responsibilities
- **Dashboard** (`pages/Dashboard.jsx`): Stats cards, charts (LineChart, PieChart), energy/emission analytics
- **Devices** (`pages/Devices.jsx`): CRUD operations, device listing, add device form
- **Energy Usage** (`pages/EnergyUsage.jsx`): Log consumption data, display usage history table

---

## Key Conventions

### API Service Layer
Located in [services/api.js](hems_frontend/src/services/api.js) - all backend calls go through here.
```javascript
// Example usage in components
import { deviceService } from '../services/api'
const response = await deviceService.getAll()
```

**Endpoints mapped:**
- `deviceService.getAll()`, `create()`, `update()`, `delete()`
- `energyService.getAll()`, `getByDevice()`, `create()`
- `analyticsService.getEmissionStats()`, `getEnergyStats()`

### State Management
[DeviceContext](hems_frontend/src/context/DeviceContext.jsx) uses useReducer for device state. Dispatch actions:
```javascript
const { devices, loading, addDevice, updateDevice, deleteDevice } = useDeviceContext()
```

### Styling
Tailwind CSS exclusively - no CSS files in components. Color scheme: `primary: #10b981` (green), `secondary: #3b82f6` (blue).

---

## Developer Workflows

### Start Dev Server
```bash
cd hems_frontend
npm install
npm run dev
```
Frontend: `http://localhost:5173`, proxies to Django backend at `http://localhost:8000`

### Build
```bash
npm run build      # Creates dist/
npm run preview    # Preview production build locally
```

### Testing API Responses
Use browser DevTools Network tab or add `console.log()` in catch blocks. All errors auto-logged.

---

## Common Patterns

### Form Handling
```javascript
const [formData, setFormData] = useState({ field: value })
const handleInputChange = (e) => {
  const { name, value } = e.target
  setFormData(prev => ({ ...prev, [name]: value }))
}
```

### Async Data Loading
```javascript
useEffect(() => {
  fetchData()
}, [])

const fetchData = async () => {
  try {
    setLoading(true)
    const response = await apiService.getAll()
    setData(response.data)
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

---

## Integration with Backend

### CORS Setup
Backend (Django) must enable CORS - add `django-cors-headers` and configure in [settings.py](hems_backend/settings.py):
```python
CORS_ALLOWED_ORIGINS = ['http://localhost:5173']
```

### Required API Endpoints
Backend must implement REST routes (using DRF or Django views):
- `GET/POST /api/devices/`
- `GET/POST /api/energy-usages/`
- `GET /api/analytics/emissions/`, `energy/`, `devices/`

---

## Common Pitfalls

⚠️ **Do NOT:**
- Bypass API service layer - always use [services/api.js](hems_frontend/src/services/api.js)
- Mix Tailwind classes with custom CSS
- Hardcode API URLs (use proxy in vite.config.js)
- Forget error handling in async functions

✅ **Always:**
- Use DeviceContext for shared device state
- Set loading/error states before/after API calls
- Format numbers with `.toFixed(2)` for currency/decimals
- Test forms with sample data first
