import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '@samia-tarot/ui-kit'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface SystemOverview {
  totalPlatformRevenue: number
  totalUsers: number
  totalReaders: number
  systemHealth: number
  activeAlerts: number
  pendingPayouts: number
  serverUptime: number
}

const OverviewPage: React.FC = () => {
  const [overview, setOverview] = useState<SystemOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const platformData = [
    { date: '1 يونيو', revenue: 28500, users: 2100, sessions: 420 },
    { date: '2 يونيو', revenue: 31200, users: 2150, sessions: 485 },
    { date: '3 يونيو', revenue: 29800, users: 2180, sessions: 445 },
    { date: '4 يونيو', revenue: 34500, users: 2220, sessions: 520 },
    { date: '5 يونيو', revenue: 32100, users: 2250, sessions: 495 },
    { date: '6 يونيو', revenue: 36800, users: 2285, sessions: 565 },
    { date: '7 يونيو', revenue: 38200, users: 2320, sessions: 580 }
  ]

  const roleDistribution = [
    { name: 'العملاء', value: 2785, color: '#3b82f6' },
    { name: 'القراء', value: 45, color: '#10b981' },
    { name: 'المراقبون', value: 8, color: '#f59e0b' },
    { name: 'الإدارة', value: 12, color: '#8b5cf6' }
  ]

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))

        setOverview({
          totalPlatformRevenue: 847250,
          totalUsers: 2850,
          totalReaders: 45,
          systemHealth: 99.8,
          activeAlerts: 3,
          pendingPayouts: 125400,
          serverUptime: 99.95
        })
      } catch (error) {
        console.error('Error fetching system overview:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
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
        <title>نظرة عامة - الإدارة العليا سامية تاروت</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900">نظرة عامة على المنصة</h1>
            <p className="text-gray-600 mt-2">مراقبة شاملة للنظام والعمليات</p>
          </motion.div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">إيرادات المنصة</CardTitle>
                  <span className="text-2xl">💎</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">${overview?.totalPlatformRevenue.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">إجمالي الإيرادات</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">صحة النظام</CardTitle>
                  <span className="text-2xl">🎯</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{overview?.systemHealth}%</div>
                  <p className="text-xs text-gray-500 mt-1">أداء ممتاز</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">التنبيهات النشطة</CardTitle>
                  <span className="text-2xl">🚨</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{overview?.activeAlerts}</div>
                  <p className="text-xs text-gray-500 mt-1">تحتاج انتباه</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">مدفوعات معلقة</CardTitle>
                  <span className="text-2xl">⏳</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">${overview?.pendingPayouts.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">تحتاج موافقة</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Platform Growth */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle>نمو المنصة (آخر 7 أيام)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={platformData}>
                      <defs>
                        <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#revenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* User Distribution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>توزيع المستخدمين</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {roleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>حالة الخوادم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <div>
                          <h4 className="font-medium">خادم التطبيقات</h4>
                          <p className="text-sm text-gray-600">مستقر - {overview?.serverUptime}% وقت التشغيل</p>
                        </div>
                      </div>
                      <span className="text-green-600 font-bold">✓</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <div>
                          <h4 className="font-medium">قاعدة البيانات</h4>
                          <p className="text-sm text-gray-600">أداء طبيعي - زمن الاستجابة 45ms</p>
                        </div>
                      </div>
                      <span className="text-green-600 font-bold">✓</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                        <div>
                          <h4 className="font-medium">نظام المدفوعات</h4>
                          <p className="text-sm text-gray-600">حمولة عالية - مراقبة مستمرة</p>
                        </div>
                      </div>
                      <span className="text-yellow-600 font-bold">⚠</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>إجراءات فورية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" onClick={() => window.location.href = '/system-alerts'}>
                      🚨 مراجعة التنبيهات الحرجة
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/payout-approvals'}>
                      💰 موافقة المدفوعات المعلقة
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/user-reports'}>
                      👥 مراجعة تقارير المستخدمين
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/system-config'}>
                      ⚙️ إعدادات النظام
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/backup-status'}>
                      💾 حالة النسخ الاحتياطي
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}

export default OverviewPage