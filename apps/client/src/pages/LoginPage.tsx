import React from 'react'
import { Helmet } from 'react-helmet-async'

const LoginPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>تسجيل الدخول - سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔮</div>
            <h1 className="text-3xl font-bold text-white mb-2">تسجيل الدخول</h1>
            <p className="text-white/70">مرحباً بك في منصة سامية تاروت</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
            <p className="text-center mb-4">صفحة تسجيل الدخول قيد التطوير</p>
            <p className="text-center text-white/70 text-sm">للعرض التوضيحي، يمكنك الوصول مباشرة للتطبيق</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default LoginPage