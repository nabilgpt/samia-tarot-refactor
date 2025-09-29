import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { ZodiacCard, ZodiacModal, useZodiacDaily } from '@samia-tarot/zodiac'
import { LoadingSpinner } from '@samia-tarot/ui-kit'
import { useAuth } from '../contexts/AuthContext'

const HomePage: React.FC = () => {
  const { user } = useAuth()
  const [showZodiacModal, setShowZodiacModal] = useState(false)

  const {
    data: todayZodiac,
    loading,
    error,
    refetch
  } = useZodiacDaily({
    userId: user?.id,
    language: 'ar' // TODO: Get from user preferences
  })

  const handleZodiacCardClick = () => {
    setShowZodiacModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            خطأ في تحميل البرج اليومي
          </h2>
          <p className="text-gray-600 mb-4">
            يرجى المحاولة مرة أخرى
          </p>
          <button
            onClick={refetch}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>الرئيسية - سامية تاروت</title>
        <meta name="description" content="اكتشف برجك اليومي واحجز جلسة قراءة روحانية مع خبراء معتمدين" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900">
        {/* Header */}
        <div className="pt-8 pb-6 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-white mb-8"
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                أهلاً وسهلاً، {user?.user_metadata?.first_name || 'عزيزي العميل'}
              </h1>
              <p className="text-purple-200 text-lg">
                اكتشف ما يخبئه لك اليوم في عالم الأبراج
              </p>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Today's Zodiac */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-white text-center mb-6">
                برجك اليوم
              </h2>

              {todayZodiac ? (
                <div className="max-w-lg mx-auto">
                  <ZodiacCard
                    sign={todayZodiac.sign}
                    textContent={todayZodiac.text}
                    hasAudio={!!todayZodiac.audio_url}
                    audioDuration={todayZodiac.audio_duration_sec}
                    date={todayZodiac.date}
                    onClick={handleZodiacCardClick}
                  />
                </div>
              ) : (
                <div className="max-w-lg mx-auto bg-white/10 backdrop-blur rounded-lg p-8 text-center text-white">
                  <p className="mb-4">لم يتم العثور على برج اليوم</p>
                  <p className="text-sm text-purple-200">
                    يرجى التأكد من تحديث معلومات برجك في الملف الشخصي
                  </p>
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {/* Explore Readers */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur rounded-lg p-6 text-center text-white cursor-pointer hover:bg-white/20 transition-colors"
                onClick={() => window.location.href = '/explore'}
              >
                <div className="text-4xl mb-4">🔮</div>
                <h3 className="text-lg font-semibold mb-2">
                  استكشف القراء
                </h3>
                <p className="text-purple-200 text-sm">
                  تصفح القراء المتاحين واحجز جلستك
                </p>
              </motion.div>

              {/* My Sessions */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur rounded-lg p-6 text-center text-white cursor-pointer hover:bg-white/20 transition-colors"
                onClick={() => window.location.href = '/sessions'}
              >
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">
                  جلساتي
                </h3>
                <p className="text-purple-200 text-sm">
                  تابع حجوزاتك وجلساتك السابقة
                </p>
              </motion.div>

              {/* Wallet */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur rounded-lg p-6 text-center text-white cursor-pointer hover:bg-white/20 transition-colors"
                onClick={() => window.location.href = '/wallet'}
              >
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-lg font-semibold mb-2">
                  المحفظة
                </h3>
                <p className="text-purple-200 text-sm">
                  إدارة رصيدك ونقاط المكافآت
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Zodiac Modal */}
        {todayZodiac && (
          <ZodiacModal
            isOpen={showZodiacModal}
            onClose={() => setShowZodiacModal(false)}
            zodiacData={todayZodiac}
            language="ar"
          />
        )}
      </div>
    </>
  )
}

export default HomePage