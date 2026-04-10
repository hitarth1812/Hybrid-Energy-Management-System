import React, { useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import GlassContainer from '../components/GlassContainer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const getDefaultDateTime = () => {
  const now = new Date()
  const pad = (val) => String(val).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

const TimeForecast = () => {
  const [dateTime, setDateTime] = useState(getDefaultDateTime())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handlePredict = async () => {
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const url = `${apiBase}/api/predict/time/?datetime=${encodeURIComponent(dateTime)}`
      
      const token = localStorage.getItem('access_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await fetch(url, { headers })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to fetch forecast')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch forecast')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      <GlassContainer className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Time Forecast</h1>
            <p className="text-sm text-white/60">Predict power usage for a specific date and time.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="forecast_datetime" className="text-white/80">Date &amp; Time</Label>
            <Input
              id="forecast_datetime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="bg-white/10 border-white/10 text-white"
            />
          </div>
          <Button onClick={handlePredict} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {loading ? 'Predicting...' : 'Predict'}
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">Predicted Power</div>
              <div className="text-2xl font-semibold text-white">⚡ {result.predicted_power_kw} kW</div>
              {result.p10_kw && result.p90_kw && (
                <div className="text-xs text-white/40 mt-1">
                  Interval: {result.p10_kw} kW - {result.p90_kw} kW
                </div>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">Predicted CO2</div>
              <div className="text-2xl font-semibold text-white">🌿 {result.predicted_co2_kg} kg</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">Day Type</div>
              <div className="text-xl font-semibold text-white">📅 {result.day_type}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">Load Level</div>
              <div className="text-xl font-semibold text-white">📊 {result.load_level}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <div className="text-xs text-white/50">Confidence</div>
              <div className="text-xl font-semibold text-white">
                🎯 {result.confidence} 
                <span className="text-sm font-normal text-white/50 ml-2">
                  (Spread: {result.interval_width} kW)
                </span>
              </div>
            </div>
          </div>
        )}
      </GlassContainer>
    </div>
  )
}

export default TimeForecast
