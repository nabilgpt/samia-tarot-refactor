import React from 'react'
import { Helmet } from 'react-helmet-async'

const TermsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>الشروط والأحكام - سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white text-center mb-8">📜 الشروط والأحكام</h1>
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 text-white">
            <p className="text-xl mb-4">صفحة الشروط والأحكام قيد التطوير</p>
            <p className="text-white/70">ستجد هنا قريباً جميع الشروط والأحكام الخاصة بالمنصة</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default TermsPage