import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import api, { energyService } from '../services/api'
import { predictPower } from '../api/predictPower'

export default function EnergyUsage() {
  const [usages, setUsages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    device: '',
    date: new Date().toISOString().split('T')[0],
    hours_used: 1,
  })
  const [sensor, setSensor] = useState({
    power: 0,
    power_factor: 0.9,
    VLN: 230,
    VLL: 400,
    current: 0,
    frequency: 50,
  })
  const [prediction, setPrediction] = useState(null)
  const [computedPayload, setComputedPayload] = useState(null)
  const [predictError, setPredictError] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [forecastDate, setForecastDate] = useState(new Date().toISOString().split('T')[0])
  const [forecastData, setForecastData] = useState([])
  const [forecastError, setForecastError] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [manualDay, setManualDay] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  })
  const [monthDate, setMonthDate] = useState(new Date().toISOString().slice(0, 7))
  const [monthlyForecastData, setMonthlyForecastData] = useState([])
  const [monthlyForecastError, setMonthlyForecastError] = useState(null)
  const [monthlyForecastLoading, setMonthlyForecastLoading] = useState(false)
  const [manualMonth, setManualMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  })
  const [forecastMode, setForecastMode] = useState('day')

  useEffect(() => {
    fetchUsages()
  }, [])

  const fetchUsages = async () => {
    try {
      console.log('Fetching energy usages...')
      setLoading(true)
      const response = await api.get('/api/usage/logs/')
      console.log('Energy usages data:', response)
      setUsages(response.data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching usages:', err)
      setError(err.message || 'Failed to fetch energy usages')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hours_used' ? parseFloat(value) : value,
    }))
  }

  const handleAddUsage = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/usage/log/', {
        device_id: formData.device,
        date: formData.date,
        hours_used: formData.hours_used,
      })
      setFormData({
        device: '',
        date: new Date().toISOString().split('T')[0],
        hours_used: 1,
      })
      setShowForm(false)
      fetchUsages()
    } catch (err) {
      console.error('Error adding usage:', err)
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to add usage')
    }
  }

  const handleDeleteUsage = async (id) => {
    setError('Delete is not supported for usage logs in the current API.')
  }

  const buildFeatures = (sensorInput) => {
    const now = new Date()
    const hour = now.getHours()
    const dow = now.getDay()
    const kva = sensorInput.power_factor > 0 ? sensorInput.power / sensorInput.power_factor : 0
    const kvar = Math.sqrt(Math.max(kva ** 2 - sensorInput.power ** 2, 0))

    return {
      hour,
      day_of_week: dow,
      is_weekend: dow >= 5 ? 1 : 0,
      month: now.getMonth() + 1,
      power_lag_1: sensorInput.power,
      power_lag_5: sensorInput.power,
      power_lag_10: sensorInput.power,
      rolling_mean_5: sensorInput.power,
      rolling_std_5: 2.0, // Default estimate
    }
  }

  const handlePredict = async () => {
    setPredictError(null)
    setPrediction(null)

    const derived = buildFeatures(sensor)
    const payload = {
      power: sensor.power,
      power_factor: sensor.power_factor,
      VLN: sensor.VLN,
      VLL: sensor.VLL,
      current: sensor.current,
      frequency: sensor.frequency,
      ...derived,
    }

    setComputedPayload(payload)

    try {
      setPredicting(true)
      const res = await api.post('/api/predict/', payload)
      setPrediction(res.data)
    } catch (err) {
      setPredictError(err.response?.data?.error || err.message || 'Prediction failed')
    } finally {
      setPredicting(false)
    }
  }

  const fetchTimeForecast = async (dateTime) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const url = `${apiBase}/api/predict/time/?datetime=${encodeURIComponent(dateTime)}`
    const response = await fetch(url)
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || `Forecast failed for ${dateTime}`)
    }
    return response.json()
  }

  const handleForecast = async () => {
    setForecastError(null)
    setForecastLoading(true)
    setForecastData([])

    try {
      const requests = Array.from({ length: 24 }, (_, hour) => {
        const hourStr = String(hour).padStart(2, '0')
        const dtStr = `${forecastDate}T${hourStr}:00:00`
        return fetchTimeForecast(dtStr).then((data) => ({
          hour,
          predicted_power_kw: data.predicted_power_kw,
          predicted_co2_kg: data.predicted_co2_kg,
        }))
      })

      const results = await Promise.all(requests)
      setForecastData(results)
    } catch (err) {
      setForecastError(err.message || 'Failed to fetch forecast data')
    } finally {
      setForecastLoading(false)
    }
  }

  const updateForecastDateFromManual = (next) => {
    const year = Number(next.year) || new Date().getFullYear()
    const month = Math.min(Math.max(Number(next.month) || 1, 1), 12)
    const day = Math.min(Math.max(Number(next.day) || 1, 1), 31)
    const monthStr = String(month).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    setForecastDate(`${year}-${monthStr}-${dayStr}`)
  }

  const updateMonthDateFromManual = (next) => {
    const year = Number(next.year) || new Date().getFullYear()
    const month = Math.min(Math.max(Number(next.month) || 1, 1), 12)
    const monthStr = String(month).padStart(2, '0')
    setMonthDate(`${year}-${monthStr}`)
  }

  const handleMonthlyForecast = async () => {
    setMonthlyForecastError(null)
    setMonthlyForecastLoading(true)
    setMonthlyForecastData([])

    try {
      const [year, month] = monthDate.split('-').map(Number)
      const daysInMonth = new Date(year, month, 0).getDate()

      const requests = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1
        const dayStr = String(day).padStart(2, '0')
        const monthStr = String(month).padStart(2, '0')
        const dtStr = `${year}-${monthStr}-${dayStr}T12:00:00`
        return fetchTimeForecast(dtStr).then((data) => ({
          day,
          predicted_power_kw: data.predicted_power_kw,
          predicted_co2_kg: data.predicted_co2_kg,
        }))
      })

      const results = await Promise.all(requests)
      setMonthlyForecastData(results)
    } catch (err) {
      setMonthlyForecastError(err.message || 'Failed to fetch monthly forecast')
    } finally {
      setMonthlyForecastLoading(false)
    }
  }


  console.log('Energy Usage page render - loading:', loading, 'usages:', usages.length, 'error:', error)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading energy usages...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Energy Usage</h1>
          <p className="text-gray-500 dark:text-gray-400">Track consumption per device.</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button>+ Log Usage</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Log Energy Usage</DialogTitle>
              <DialogDescription>
                Record energy usage for a specific device.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUsage} className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="device">Device ID</Label>
                <Input
                  id="device"
                  name="device"
                  type="number"
                  value={formData.device}
                  onChange={handleInputChange}
                  placeholder="Device ID"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours_used">Hours Used</Label>
                <Input
                  id="hours_used"
                  name="hours_used"
                  type="number"
                  value={formData.hours_used}
                  onChange={handleInputChange}
                  min="0"
                  max="24"
                  step="0.5"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Log Usage</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 text-destructive">
          {error}
        </div>
      )}

      {usages.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          No energy usages recorded yet.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Energy Usage Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Energy (kWh)</TableHead>
                  <TableHead>CO2 (kg)</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usages.map(usage => (
                  <TableRow key={usage.id}>
                    <TableCell className="font-medium">
                      {usage.device_name || `Device ${usage.device}`}
                    </TableCell>
                    <TableCell>{usage.room || '—'}</TableCell>
                    <TableCell>{usage.building || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {usage.date}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {usage.hours_used}h
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {(usage.energy_kwh || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-500">
                      {(usage.carbon_kg || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUsage(usage.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Predict Power Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sensor_power">power (kW)</Label>
              <Input
                id="sensor_power"
                type="number"
                step="0.01"
                value={sensor.power}
                onChange={(e) => setSensor(prev => ({ ...prev, power: parseFloat(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sensor_pf">power_factor (0-1)</Label>
              <Input
                id="sensor_pf"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={sensor.power_factor}
                onChange={(e) => setSensor(prev => ({ ...prev, power_factor: parseFloat(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sensor_vln">VLN (V)</Label>
              <Input
                id="sensor_vln"
                type="number"
                step="0.1"
                value={sensor.VLN}
                onChange={(e) => setSensor(prev => ({ ...prev, VLN: parseFloat(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sensor_vll">VLL (V)</Label>
              <Input
                id="sensor_vll"
                type="number"
                step="0.1"
                value={sensor.VLL}
                onChange={(e) => setSensor(prev => ({ ...prev, VLL: parseFloat(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sensor_current">current (A)</Label>
              <Input
                id="sensor_current"
                type="number"
                step="0.01"
                value={sensor.current}
                onChange={(e) => setSensor(prev => ({ ...prev, current: parseFloat(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sensor_freq">frequency (Hz)</Label>
              <Input
                id="sensor_freq"
                type="number"
                step="0.01"
                value={sensor.frequency}
                onChange={(e) => setSensor(prev => ({ ...prev, frequency: parseFloat(e.target.value || 0) }))}
              />
            </div>
          </div>

          {predictError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
              {predictError}
            </div>
          )}

          {prediction && (() => {
            const diff = Math.abs(prediction.xgb_kw - prediction.lgb_kw)
            const confidence = diff < 1 ? 'High' : diff < 3 ? 'Medium' : 'Low'

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-xs text-muted-foreground">Predicted Power</div>
                  <div className="text-2xl font-semibold">⚡ {prediction.predicted_power_kw} kW</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-xs text-muted-foreground">Predicted CO2</div>
                  <div className="text-2xl font-semibold">🌿 {prediction.predicted_co2_kg} kg</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-xs text-muted-foreground">XGBoost</div>
                  <div className="text-xl font-semibold">📊 {prediction.xgb_kw} kW</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-xs text-muted-foreground">LightGBM</div>
                  <div className="text-xl font-semibold">📊 {prediction.lgb_kw} kW</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4 md:col-span-2">
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="text-xl font-semibold">🎯 {confidence}</div>
                </div>
              </div>
            )
          })()}

          <details className="rounded-lg border border-border bg-muted/20 p-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Computed Features
            </summary>
            <pre className="mt-3 text-xs whitespace-pre-wrap break-words text-muted-foreground">
              {computedPayload ? JSON.stringify(computedPayload, null, 2) : 'Run a prediction to view payload.'}
            </pre>
          </details>

          <Button onClick={handlePredict} disabled={predicting}>
            {predicting ? 'Predicting...' : 'Run Prediction'}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Forecast Curve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={forecastMode === 'day' ? 'default' : 'outline'}
                onClick={() => setForecastMode('day')}
              >
                Day
              </Button>
              <Button
                type="button"
                variant={forecastMode === 'month' ? 'default' : 'outline'}
                onClick={() => setForecastMode('month')}
              >
                Month
              </Button>
            </div>

            {forecastMode === 'day' ? (
              <div className="space-y-2">
                <Label htmlFor="forecast_date">Date</Label>
                <Input
                  id="forecast_date"
                  type="date"
                  value={forecastDate}
                  onChange={(e) => {
                    setForecastDate(e.target.value)
                    const [year, month, day] = e.target.value.split('-').map(Number)
                    setManualDay({ year, month, day })
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="forecast_month">Month</Label>
                <Input
                  id="forecast_month"
                  type="month"
                  value={monthDate}
                  onChange={(e) => {
                    setMonthDate(e.target.value)
                    const [year, month] = e.target.value.split('-').map(Number)
                    setManualMonth({ year, month })
                  }}
                />
              </div>
            )}

            {forecastMode === 'day' ? (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-2">
                  <Label htmlFor="manual_day">Day</Label>
                  <Input
                    id="manual_day"
                    type="number"
                    min="1"
                    max="31"
                    value={manualDay.day}
                    onChange={(e) => {
                      const next = { ...manualDay, day: e.target.value }
                      setManualDay(next)
                      updateForecastDateFromManual(next)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual_month">Month</Label>
                  <Input
                    id="manual_month"
                    type="number"
                    min="1"
                    max="12"
                    value={manualDay.month}
                    onChange={(e) => {
                      const next = { ...manualDay, month: e.target.value }
                      setManualDay(next)
                      updateForecastDateFromManual(next)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual_year">Year</Label>
                  <Input
                    id="manual_year"
                    type="number"
                    min="2000"
                    max="2100"
                    value={manualDay.year}
                    onChange={(e) => {
                      const next = { ...manualDay, year: e.target.value }
                      setManualDay(next)
                      updateForecastDateFromManual(next)
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-2">
                  <Label htmlFor="manual_month_only">Month</Label>
                  <Input
                    id="manual_month_only"
                    type="number"
                    min="1"
                    max="12"
                    value={manualMonth.month}
                    onChange={(e) => {
                      const next = { ...manualMonth, month: e.target.value }
                      setManualMonth(next)
                      updateMonthDateFromManual(next)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual_year_only">Year</Label>
                  <Input
                    id="manual_year_only"
                    type="number"
                    min="2000"
                    max="2100"
                    value={manualMonth.year}
                    onChange={(e) => {
                      const next = { ...manualMonth, year: e.target.value }
                      setManualMonth(next)
                      updateMonthDateFromManual(next)
                    }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={forecastMode === 'day' ? handleForecast : handleMonthlyForecast}
              disabled={forecastMode === 'day' ? forecastLoading : monthlyForecastLoading}
            >
              {forecastMode === 'day'
                ? (forecastLoading ? 'Loading...' : 'Run Day Forecast')
                : (monthlyForecastLoading ? 'Loading...' : 'Run Month Forecast')}
            </Button>
          </div>

          {(forecastMode === 'day' ? forecastError : monthlyForecastError) && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
              {forecastMode === 'day' ? forecastError : monthlyForecastError}
            </div>
          )}

          {forecastMode === 'day' && forecastData.length > 0 && (
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="hour" stroke="#94a3b8" tickFormatter={(v) => `${v}:00`} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                  <Area
                    type="monotone"
                    dataKey="predicted_power_kw"
                    stroke="#22c55e"
                    fill="url(#forecastPower)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {forecastMode === 'month' && monthlyForecastData.length > 0 && (
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyForecastData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastMonth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="day" stroke="#94a3b8" tickFormatter={(v) => `Day ${v}`} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                  <Area
                    type="monotone"
                    dataKey="predicted_power_kw"
                    stroke="#38bdf8"
                    fill="url(#forecastMonth)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
