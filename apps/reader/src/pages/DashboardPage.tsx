import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@samia-tarot/ui-kit'
import { useAuth } from '../contexts/AuthContext'

interface DashboardStats {
  totalEarnings: number
  pendingPayouts: number
  activeClients: number
  completedSessions: number
  upcomingSessions: number
  rating: number
  totalReviews: number
}

const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // TODO: Implement actual API calls
        await new Promise(resolve => setTimeout(resolve, 1000))

        setStats({
          totalEarnings: 2450.75,
          pendingPayouts: 850.25,
          activeClients: 23,
          completedSessions: 145,
          upcomingSessions: 3,
          rating: 4.8,
          totalReviews: 89
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>لوحة التحكم - قراء سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900">
              مرحباً، {profile?.user_metadata?.first_name || 'قارئ'}
            </h1>
            <p className="text-gray-600 mt-2">
              إليك نظرة سريعة على أداءك اليوم
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    الأرباح الإجمالية
                  </CardTitle>
                  <span className="text-2xl">💰</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${stats?.totalEarnings.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    +12% من الشهر الماضي
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    المعلقة للسحب
                  </CardTitle>
                  <span className="text-2xl">⏳</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${stats?.pendingPayouts.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    متاح للسحب
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    العملاء النشطون
                  </CardTitle>
                  <span className="text-2xl">👥</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.activeClients}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    هذا الشهر
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    التقييم
                  </CardTitle>
                  <span className="text-2xl">⭐</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats?.rating}/5
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.totalReviews} تقييم
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>إجراءات سريعة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button className="w-full" onClick={() => window.location.href = '/schedule'}>
                      📅 إدارة المواعيد
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = '/services'}>
                      🔮 تعديل الخدمات
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = '/earnings'}>
                      💰 طلب سحب أرباح
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Sessions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>الجلسات القادمة ({stats?.upcomingSessions})</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.upcomingSessions === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl block mb-2">📅</span>
                      لا توجد جلسات مجدولة اليوم
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">سارة أحمد</h4>
                            <p className="text-sm text-gray-600">قراءة التاروت - 30 دقيقة</p>
                          </div>
                          <span className="text-sm text-green-600 font-medium">
                            14:30
                          </span>
                        </div>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">محمد علي</h4>
                            <p className="text-sm text-gray-600">استشارة روحانية - 45 دقيقة</p>
                          </div>
                          <span className="text-sm text-green-600 font-medium">
                            16:00
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full mt-4"
                    onClick={() => window.location.href = '/sessions'}
                  >
                    عرض جميع الجلسات
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DashboardPage