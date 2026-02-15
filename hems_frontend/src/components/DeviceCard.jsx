export default function DeviceCard({ device }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{device.device_type}</h3>
          <p className="text-sm text-gray-500">{device.room} - {device.building}</p>
        </div>
        <span className="bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-full text-sm font-medium">
          {device.quantity} unit{device.quantity > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Power Rating:</span>
          <span className="font-semibold text-gray-900">{device.watt_rating}W</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Daily Usage:</span>
          <span className="font-semibold text-gray-900">{device.hours_used_per_day}h</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Daily Consumption:</span>
          <span className="font-semibold text-green-600">
            {((device.watt_rating * device.hours_used_per_day) / 1000).toFixed(2)} kWh
          </span>
        </div>
      </div>
    </div>
  )
}
