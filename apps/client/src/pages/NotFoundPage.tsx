import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

const NotFoundPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>الصفحة غير موجودة - سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 p-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="text-8xl mb-6">🔍</div>
          <h1 className="text-4xl font-bold text-white mb-4">404</h1>
          <p className="text-xl text-white mb-2">الصفحة غير موجودة</p>
          <p className="text-white/70 mb-8">عذراً، الصفحة التي تبحث عنها غير موجودة</p>

          <Link
            to="/"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </>
  )
}

export default NotFoundPage