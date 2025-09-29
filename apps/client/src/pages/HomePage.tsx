import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

const HomePage: React.FC = () => {
  const { user } = useAuth()
  const [showZodiacModal, setShowZodiacModal] = useState(false)

  // Demo zodiac data
  const todayZodiac = {
    sign: 'الأسد',
    text: 'اليوم يحمل لك طاقة إيجابية قوية. النجوم تشير إلى فرص جديدة في العمل والحب. كن مستعداً لاستقبال التغييرات الإيجابية وثق بحدسك.',
    audio_url: null,
    audio_duration_sec: 0,
    date: new Date().toISOString().split('T')[0]
  }

  return (
    <>
      <Helmet>
        <title>الرئيسية - سامية تاروت</title>
        <meta name="description" content="اكتشف برجك اليومي واحجز جلسة قراءة روحانية مع خبراء معتمدين" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 relative overflow-hidden">
        {/* Cosmic Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="stars-container">
            {[...Array(50)].map((_, i) => (
              <div key={i} className={`star star-${i % 3}`} style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }} />
            ))}
          </div>
          <div className="cosmic-dust">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="dust-particle" style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`
              }} />
            ))}
          </div>
          <div className="floating-orbs">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`orb orb-${i % 3}`} style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 8}s`
              }} />
            ))}
          </div>
        </div>

        <style>{`
          .stars-container {
            position: relative;
            width: 100%;
            height: 100%;
          }
          .star {
            position: absolute;
            background: white;
            border-radius: 50%;
            animation: twinkle linear infinite;
          }
          .star-0 { width: 2px; height: 2px; }
          .star-1 { width: 3px; height: 3px; }
          .star-2 { width: 1px; height: 1px; }

          @keyframes twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }

          .dust-particle {
            position: absolute;
            width: 1px;
            height: 1px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            animation: drift 8s linear infinite;
          }

          @keyframes drift {
            0% { transform: translateY(100vh) translateX(0) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) translateX(50px) rotate(360deg); opacity: 0; }
          }

          .orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(1px);
            animation: float 10s ease-in-out infinite;
          }
          .orb-0 {
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%);
          }
          .orb-1 {
            width: 40px;
            height: 40px;
            background: radial-gradient(circle, rgba(79, 70, 229, 0.2) 0%, transparent 70%);
          }
          .orb-2 {
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          }

          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-20px) rotate(90deg); }
            50% { transform: translateY(-10px) rotate(180deg); }
            75% { transform: translateY(-30px) rotate(270deg); }
          }
        `}</style>

        {/* Content Layer */}
        <div className="relative z-10">
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

              <div className="max-w-lg mx-auto bg-white/10 backdrop-blur rounded-xl p-6 text-center text-white cursor-pointer hover:bg-white/20 transition-colors">
                <h3 className="text-2xl font-bold mb-4">⭐ {todayZodiac.sign}</h3>
                <p className="text-white/90 leading-relaxed mb-4">
                  {todayZodiac.text}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-white/70">
                  <span>📅 {todayZodiac.date}</span>
                  <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-full transition-colors">
                    🎵 استمع
                  </button>
                </div>
              </div>
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
        </div>

      </div>
    </>
  )
}

export default HomePage