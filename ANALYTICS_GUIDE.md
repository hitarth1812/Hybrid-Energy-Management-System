# HEMS Analytics Guide

## 📊 Overview

The **HEMS Analytics System** provides real-time energy consumption monitoring, intelligent insights, and actionable recommendations for optimizing building energy efficiency, reducing costs, and minimizing environmental impact.

---

## 🎯 Key Features

| Feature | Description | Purpose |
|---------|-------------|---------|
| **Real-time Monitoring** | Live energy consumption tracking | Monitor building performance instantly |
| **Trend Analysis** | Historical consumption patterns | Identify trends and seasonal variations |
| **Forecasting** | 72-hour power consumption prediction | Plan ahead and optimize operations |
| **Anomaly Detection** | Identify unusual consumption patterns | Detect equipment failures early |
| **Smart Insights** | AI-generated recommendations | Optimize efficiency automatically |
| **Carbon Tracking** | Emission monitoring and reporting | Track environmental impact |
| **Peak Heatmap** | Visualization of peak usage times | Identify load management opportunities |
| **Report Generation** | PDF export of analytics | Share insights with stakeholders |

---

## 📱 Main Components

### 1. **Energy Intelligence Dashboard** (`AnalyticsDashboard.jsx`)
Central hub for all analytics data and visualizations.

**Key Metrics Displayed:**
- Total Energy Consumed (kWh)
- Peak Load (kW)
- Average Load (kW)
- Power Factor (PF)
- Estimated Cost (₹)
- Carbon Emissions (kg CO₂)

**Granularity Options:**
- Hourly
- Daily
- Weekly
- Monthly

**Features:**
- Date range picker for custom analysis
- Download PDF reports
- Access Report Lab for ESG documentation

### 2. **KPI Cards** (`KPICard.jsx`)
Displays key performance indicators with visual emphasis.

```jsx
<KPICard 
  title="Total Energy"
  value="1,250"
  unit="kWh"
  trend="+12%"
  icon={Zap}
/>
```

**Properties:**
- `title`: Metric name
- `value`: Current value
- `unit`: Measurement unit
- `trend`: Percentage change
- `trendDirection`: 'up' or 'down'
- `icon`: Lucide React icon

### 3. **Insights Panel** (`InsightsPanel.jsx`)
AI-powered analysis providing contextual insights about energy consumption.

**Insight Types:**

| Type | Severity | Example |
|------|----------|---------|
| **Info** | Low | "Highest consumption at 14:00" |
| **Warning** | Medium | "Usage 14% above average" |
| **Critical** | High | "Power factor <0.95 - Action required" |

**Sample Insights:**
```
- Usage increased by 14% vs last week (HVAC-driven)
- Peak consumption: 14:00 (3.5 kW average)
- Night usage: 22% (slightly above 20% optimal)
- Efficiency score: 85/100 (5-day streak)
- Power factor: 0.92 (needs improvement to >0.95)
```

### 4. **Recommendations Engine** (`RecommendationsEngine.jsx`)
Actionable recommendations across three categories:

#### **Efficiency Recommendations**
Focus on operational improvements
- Example: "Install capacitor bank to improve power factor"
- Impact: ₹12,500/month savings

#### **Cost Recommendations**
Focus on financial optimization
- Example: "Shift non-essential loads to off-peak hours"
- Impact: 15% peak reduction

#### **Environmental Recommendations**
Focus on carbon footprint reduction
- Example: "Increase cooling setpoint by 1°C on weekends"
- Impact: 420 kg CO₂ saved

**Recommendation Structure:**
```jsx
{
  category: 'Efficiency|Cost|Environmental',
  text: 'Actionable recommendation text',
  impact: 'Quantified impact value',
  impactType: 'savings/mo | peak reduction | CO2 saved',
  priority: 'High | Medium | Low'
}
```

### 5. **Anomaly Alerts** (`AnomalyAlerts.jsx`)
Real-time detection of unusual consumption patterns.

**Detection Methods:**
- Statistical deviation analysis
- Pattern recognition
- Predictive comparison

**Alert Information:**
```
- Detection timestamp
- Room/Equipment identifier
- Deviation percentage
- Suspected cause
```

**Status Indicators:**
- 🔴 Critical: >30% deviation
- 🟡 Warning: 15-30% deviation
- 🟢 Normal: <15% deviation

### 6. **Carbon Intelligence** (`CarbonIntelligence.jsx`)
Environmental impact tracking and reporting.

**Features:**
- Real-time CO₂ emission calculation
- Monthly footprint tracking
- Tree offset calculation
- Emission trends over time

**Calculation:**
```
CO₂ (kg) = Energy (kWh) × Emission Factor (0.66 kg/kWh)
Trees Needed = Monthly CO₂ / 21 trees per month
```

---

## 📈 Data Visualization Components

### **TrendLineChart** (`TrendLineChart.jsx`)
Line chart showing consumption trends over time.

```
Usage Pattern:
├─ X-axis: Time (hourly/daily/weekly)
├─ Y-axis: Energy (kWh)
└─ Features: Hover tooltip, zoom, legend
```

### **ForecastChart** (`ForecastChart.jsx`)
72-hour power consumption forecast.

```
Forecast Display:
├─ Historical data (actual consumption)
├─ Forecast data (predicted consumption)
├─ Confidence interval (uncertainty band)
└─ Update frequency: Every 6 hours
```

### **PeakHeatmap** (`PeakHeatmap.jsx`)
Visualization of peak consumption times.

```
Heatmap Grid:
├─ X-axis: Hours (0-23)
├─ Y-axis: Days (Mon-Sun)
├─ Color: Intensity (low to high consumption)
└─ Use case: Identify peak shaving opportunities
```

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────┐
│           Real-time IoT Data Stream                  │
│      (Smart meters, sensors, devices)                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│           Backend API Aggregation                    │
│     (/api/analytics/, /api/energy/forecast)         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│    Data Processing & Analysis Engine                 │
│  (ML Models, Anomaly Detection, Calculations)       │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌──────────────┐
│  Analytics  │ │ Forecasts   │ │ Insights &   │
│  Dashboard  │ │ (72-hour)   │ │ Recommendations
└─────────────┘ └─────────────┘ └──────────────┘
        │              │              │
        └──────────────┴──────────────┘
                       │
                       ▼
        ┌────────────────────────────┐
        │   Frontend Display          │
        │  (Charts, Cards, Panels)    │
        └────────────────────────────┘
```

---

## 🎨 Frontend Component Hierarchy

```
AnalyticsDashboard
├── SectionHeader
│   └── Title & Filters
├── ESG Report Lab
│   └── Report Generator Links
├── KPI Grid (4 columns)
│   ├── KPICard: Total Energy
│   ├── KPICard: Peak Load
│   ├── KPICard: Average Load
│   └── KPICard: Estimated Cost
├── Charts Row 1 (2 columns)
│   ├── TrendLineChart
│   └── ForecastChart
├── Charts Row 2 (2 columns)
│   ├── PeakHeatmap
│   └── CarbonIntelligence
└── Analytics Panels Row (3 columns)
    ├── InsightsPanel
    ├── AnomalyAlerts
    └── RecommendationsEngine
```

---

## 📊 Charts & Visualizations

### **Trend Line Chart**
Shows historical energy consumption patterns.

**Configuration:**
```js
{
  xAxis: 'timestamp (hourly/daily)',
  yAxis: 'energy (kWh)',
  colors: ['#3b82f6 (primary)', '#60a5fa (secondary)'],
  height: 300px,
  interactive: true
}
```

### **Forecast Chart**
72-hour power prediction with confidence bands.

**Model Types:**
- XGBoost (primary)
- LightGBM (secondary)
- Random Forest (ensemble)

**Outputs:**
```
├─ Point forecast (expected value)
├─ P10 (10th percentile)
├─ P90 (90th percentile)
└─ Confidence interval
```

### **Peak Heatmap**
Identify when peak usage occurs.

**Use Cases:**
- Time-of-use optimization
- Load shifting planning
- Peak shaving strategy
- Capacity planning

---

## 🔌 API Endpoints

### **Analytics Data**
```bash
GET /api/analytics/?granularity=daily&date=2026-04-30
```

**Response:**
```json
{
  "total_energy": 1250.5,
  "peak_load": 45.3,
  "avg_load": 12.8,
  "power_factor": 0.92,
  "estimated_cost": 4500,
  "carbon_emissions": 825.3,
  "peak_hour": 14,
  "data_points": [...]
}
```

### **72-Hour Forecast**
```bash
GET /api/energy/forecast/?hours=72
```

**Response:**
```json
{
  "forecast": [
    {
      "timestamp": "2026-04-30T14:00:00Z",
      "predicted_power": 45.2,
      "p10": 42.1,
      "p90": 48.3
    },
    ...
  ],
  "model_used": "xgboost",
  "last_update": "2026-04-30T10:00:00Z"
}
```

### **Anomalies**
```bash
GET /api/analytics/anomalies/?building_id=1&limit=10
```

**Response:**
```json
{
  "anomalies": [
    {
      "id": 1,
      "timestamp": "2026-04-30T14:00:00Z",
      "room": "Conference Room A",
      "deviation_pct": 35.2,
      "severity": "critical",
      "reason": "HVAC malfunction suspected"
    },
    ...
  ]
}
```

---

## 📥 Data Integration

### **Smart Meter Data Sources**
- Real-time consumption (kWh)
- Power factor (PF)
- Voltage (V)
- Current (A)
- Frequency (Hz)

### **Weather Data Integration**
- Outdoor temperature
- Humidity
- Solar radiation
- Wind speed

### **Building Metadata**
- Building occupancy
- HVAC settings
- Equipment status
- Maintenance logs

---

## 🎯 Use Cases

### **1. Energy Manager Dashboard**
Monitor building energy performance in real-time.

**Actions:**
- View consumption by floor/room
- Identify peak usage times
- Respond to anomalies
- Compare against targets

### **2. Cost Optimization**
Identify and implement cost-saving strategies.

**Strategy:**
- Shift loads to off-peak hours
- Reduce power factor penalties
- Optimize equipment scheduling
- Demand response programs

### **3. Carbon Footprint Tracking**
Monitor and reduce environmental impact.

**Metrics:**
- Daily/monthly/yearly emissions
- Trees needed to offset
- Industry benchmarks
- ESG reporting

### **4. Predictive Maintenance**
Detect equipment issues before failure.

**Indicators:**
- Unusual consumption patterns
- Power factor degradation
- Load imbalances
- Efficiency decline

---

## 🔧 Customization Options

### **Dashboard Granularity**
```jsx
const [granularity, setGranularity] = useState('daily');
// Options: 'hourly', 'daily', 'weekly', 'monthly'
```

### **Date Range Selection**
```jsx
const [selectedDate, setSelectedDate] = useState(new Date());
// Supports custom range picker
```

### **Building Filter**
```jsx
const [selectedBuilding, setSelectedBuilding] = useState('all');
// Multi-building analytics support
```

---

## 📋 Export & Reporting

### **PDF Report Generation**

**Types Available:**
1. **Power Prediction Report**
   - 72-hour forecast
   - Trend analysis
   - Peak identification
   - Recommendations

2. **ESG Report**
   - Carbon emissions tracking
   - Sustainability metrics
   - Target progress
   - Compliance status

**Export API:**
```bash
# Power Report
GET /api/energy/report/?type=power

# ESG Report
GET /api/energy/esg-report/

# Both return PDF blob
```

---

## 🚀 Performance Optimization

### **Caching Strategy**
```
Real-time data: 5 min cache
Historical data: 1 hour cache
Forecasts: 6 hour refresh
```

### **Data Pagination**
```
Default: 100 records
Max: 1000 records
Sort: By timestamp (desc)
```

### **Chart Optimization**
```
Max data points displayed: 500
Aggregation for large ranges
Progressive loading
```

---

## 🔐 Security & Permissions

### **Data Access Control**
- Building-level access restrictions
- Role-based analytics visibility
- User-specific dashboards

### **Data Retention**
- Real-time: 90 days
- Aggregated: 2 years
- Reports: 5 years

---

## 📞 Support & Troubleshooting

### **Common Issues**

| Issue | Solution |
|-------|----------|
| Data not updating | Check API connection, refresh cache |
| Forecast showing zeros | Wait for 6-hour model update |
| Charts not rendering | Check browser console, verify data format |
| Export failed | Check file permissions, browser storage |

### **Debug Mode**
```jsx
// Enable debug logging in development
const DEBUG_ANALYTICS = true;
console.log('Analytics Data:', analyticsData);
```

---

## 📚 Related Documentation

- [Energy Usage Guide](./ENERGY_GUIDE.md)
- [Carbon Dashboard Guide](./CARBON_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture Overview](./ARCHITECTURE.md)

---

## 🎓 Learning Path

1. **Basics**: Understand KPIs and metrics
2. **Visualization**: Learn chart types and patterns
3. **Insights**: Interpret recommendations
4. **Advanced**: Custom dashboard creation
5. **Integration**: API usage and automation

---

**Last Updated:** April 30, 2026  
**Version:** 1.0  
**Maintained By:** ARKA Development Team
