import React from 'react'
import { Helmet } from 'react-helmet-async'

const ProfilePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>الملف الشخصي - سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white text-center mb-8">👤 الملف الشخصي</h1>
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 text-center text-white">
            <p className="text-xl mb-4">صفحة الملف الشخصي قيد التطوير</p>
            <p className="text-white/70">ستتمكن قريباً من إدارة معلوماتك الشخصية</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default ProfilePage