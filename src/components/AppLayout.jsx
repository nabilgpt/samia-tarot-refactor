import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Subtle cosmic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />

      <Navigation />

      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  )
}