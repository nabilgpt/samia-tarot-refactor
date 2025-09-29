import React from 'react'
import { Outlet } from 'react-router-dom'

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-purple-900/90 backdrop-blur-md border-t border-white/10 z-50">
        <div className="flex justify-around py-2">
          <button className="flex flex-col items-center px-4 py-2 text-white">
            <span className="text-2xl mb-1">🏠</span>
            <span className="text-xs">الرئيسية</span>
          </button>
          <button className="flex flex-col items-center px-4 py-2 text-white/60">
            <span className="text-2xl mb-1">🔍</span>
            <span className="text-xs">استكشاف</span>
          </button>
          <button className="flex flex-col items-center px-4 py-2 text-white/60">
            <span className="text-2xl mb-1">📅</span>
            <span className="text-xs">جلساتي</span>
          </button>
          <button className="flex flex-col items-center px-4 py-2 text-white/60">
            <span className="text-2xl mb-1">💰</span>
            <span className="text-xs">المحفظة</span>
          </button>
          <button className="flex flex-col items-center px-4 py-2 text-white/60">
            <span className="text-2xl mb-1">👤</span>
            <span className="text-xs">حسابي</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default Layout