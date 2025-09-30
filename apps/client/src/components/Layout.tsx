import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Navigation from './Navigation'

const Layout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/', icon: '🏠', label: 'الرئيسية' },
    { path: '/explore', icon: '🔍', label: 'استكشاف' },
    { path: '/sessions', icon: '📅', label: 'جلساتي' },
    { path: '/wallet', icon: '💰', label: 'المحفظة' },
    { path: '/profile', icon: '👤', label: 'حسابي' }
  ]

  return (
    <div className="min-h-screen">
      {/* New Accessible Navigation */}
      <Navigation />

      {/* Main Content with top padding for navbar */}
      <main className="pt-16 pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-purple-900/90 backdrop-blur-md border-t border-white/10 z-50" aria-label="Bottom">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center px-4 py-2 transition-colors ${
                  isActive ? 'text-white' : 'text-white/60 hover:text-white/80'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-2xl mb-1" aria-hidden="true">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default Layout