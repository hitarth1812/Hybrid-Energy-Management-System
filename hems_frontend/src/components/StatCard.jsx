export default function StatCard({ icon: Icon, label, value, unit = '', color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  }

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{label}</p>
          <p className="text-3xl font-bold mt-2">
            {typeof value === 'number' ? value.toFixed(2) : value}
            {unit && <span className="text-lg ml-1">{unit}</span>}
          </p>
        </div>
        {Icon && <Icon className="w-12 h-12 opacity-20" />}
      </div>
    </div>
  )
}
