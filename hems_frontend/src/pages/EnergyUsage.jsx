import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { energyService } from '../services/api'

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

  useEffect(() => {
    fetchUsages()
  }, [])

  const fetchUsages = async () => {
    try {
      console.log('Fetching energy usages...')
      setLoading(true)
      const response = await energyService.getAll()
      console.log('Energy usages data:', response)
      setUsages(Array.isArray(response) ? response : response.results || [])
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
      await energyService.create(formData)
      setFormData({
        device: '',
        date: new Date().toISOString().split('T')[0],
        hours_used: 1,
      })
      setShowForm(false)
      fetchUsages()
    } catch (err) {
      console.error('Error adding usage:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to add usage')
    }
  }

  const handleDeleteUsage = async (id) => {
    try {
      await energyService.delete(id)
      fetchUsages()
    } catch (err) {
      console.error('Error deleting usage:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to delete usage')
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
                  <TableHead>Watts</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Energy (kWh)</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usages.map(usage => (
                  <TableRow key={usage.id}>
                    <TableCell className="font-medium">
                      {usage.device_name || `Device ${usage.device}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {usage.date}
                      </div>
                    </TableCell>
                    <TableCell>{usage.watts_used}W</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {usage.hours_used}h
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {(usage.energy_consumed || 0).toFixed(2)}
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
    </div>
  )
}
