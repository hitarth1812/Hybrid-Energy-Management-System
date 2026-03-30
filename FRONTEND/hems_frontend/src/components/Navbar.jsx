import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  const isActive = (path) =>
    location.pathname === path ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-gray-900'

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              H
            </div>
            <span className="text-xl font-bold text-gray-900">HEMS</span>
          </div>

          <div className="flex gap-8">
            <Link to="/" className={`pb-4 font-medium transition ${isActive('/')}`}>
              Dashboard
            </Link>
            <Link to="/devices" className={`pb-4 font-medium transition ${isActive('/devices')}`}>
              Devices
            </Link>
            <Link to="/energy" className={`pb-4 font-medium transition ${isActive('/energy')}`}>
              Energy Usage
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
