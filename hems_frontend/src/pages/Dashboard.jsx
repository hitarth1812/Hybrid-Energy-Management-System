import { Zap, Leaf, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import GlassContainer from '../components/GlassContainer'

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Overview of your campus energy metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassContainer className="p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-blue-400">Total Energy Consumed</h3>
            <Zap className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">125.5 kWh</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">+12% from last month</p>
          </div>
        </GlassContainer>

        <GlassContainer className="p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-green-400">CO2 Emissions Saved</h3>
            <Leaf className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">42.3 kg</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Equivalent to 5 trees</p>
          </div>
        </GlassContainer>

        <GlassContainer className="p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-purple-400">Active Devices</h3>
            <Activity className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">8</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 currently running</p>
          </div>
        </GlassContainer>
      </div>
    </div>
  )
}
